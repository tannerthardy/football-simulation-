// The default's first 0.3 s (Integration, 2026-11-18; reads only). Staged zone throws. Underneath and deep zone defenders
// within 8 yd of the true ball's catchable track at the release. Per tick from his arm read (loading/release belief)
// to release + 0.3 s: the behavior's request, the command after containment / coverage orientation / open-to-ball, and
// his actual velocity, each as speed and closing toward the true ball line (yd/s); his tags. Then per man: (a) late
// request (the request first closes >= 1.5 yd/s more than 0.1 s after the release), (b) momentum (the request closes in
// time but his body does not until later), (c) bounded (the final command closes >= 1 yd/s less than the request).
// usage: node --import tsx out/first03.mts seeds [examples]
const W = process.cwd(), seeds = Number(process.argv[2] ?? 1), NEX = Number(process.argv[3] ?? 0);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { isDeepZone } = await import(`${W}/src/playbook/alignment.ts`);
const { releaseBelief } = await import(`${W}/src/sim/release-belief.ts`);
type P = { x: number; y: number };
const near = (p: P, a: P, b: P): P => { const ux = b.x - a.x, uy = b.y - a.y, L = ux * ux + uy * uy || 1, k = Math.max(0, Math.min(1, ((p.x - a.x) * ux + (p.y - a.y) * uy) / L)); return { x: a.x + ux * k, y: a.y + uy * k }; };
const men: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const log = new Map<any, any[]>();
        const dec = sim.decide.bind(sim);
        sim.decide = (i: number, t: number) => {
          const a = sim.agents[i];
          if (a.team !== 'D' || !a.behavior?.zone) return dec(i, t);
          const b = a.behavior, own = Object.prototype.hasOwnProperty.call(b, 'update'), u = b.update; let req: any = null;
          b.update = (...args: any[]) => (req = u.apply(b, args));
          try { dec(i, t); } finally { if (own) b.update = u; else delete b.update; }
          (log.get(a) ?? log.set(a, []).get(a)!).push({ t, req: req?.vel ? { ...req.vel } : null, fin: sim.cmds[i]?.vel ? { ...sim.cmds[i].vel } : null, tags: [...a.tags] });
        };
        let rel: number | null = null; const actual = new Map<any, any[]>();
        const tick = sim.tick.bind(sim);
        sim.tick = () => { const t = sim.t; tick(); if (rel === null && sim.ball?.kind === 'air') rel = t; for (const d of sim.defense) if (d.behavior?.zone) (actual.get(d) ?? actual.set(d, []).get(d)!).push({ t, pos: { ...d.pos }, vel: { ...d.vel } }); };
        try { sim.run(); } catch { continue; }
        if (rel === null || !sim.ballPath?.length) continue;
        const qb = sim.ballPath[0], end = sim.ballPath[sim.ballPath.length - 1];
        for (const [d, L] of log) {
          const zone = d.behavior?.zone as string; const deep = isDeepZone(zone);
          const A = actual.get(d) ?? []; const at = (t: number) => A.find((s) => Math.abs(s.t - t) < 1e-6);
          const r0 = at(rel); if (!r0) continue;
          const track = sim.ballPath.filter((p: any) => p.z <= d.profile.maxCatchHeight);
          const dTrack = Math.min(...track.map((p: any) => Math.hypot(p.x - r0.pos.x, p.y - r0.pos.y)));
          if (!(dTrack <= 8)) continue;
          const rb = releaseBelief(sim, d); const armAt = Math.min(rb.loadingAt ?? Infinity, rb.releasedAt ?? Infinity, rel);
          const rows = L.filter((s) => s.t >= armAt - 1e-6 && s.t <= rel! + 0.3 + 1e-6).map((s) => {
            const a = at(s.t); if (!a) return null;
            const np = near(a.pos, qb, end), dx = np.x - a.pos.x, dy = np.y - a.pos.y, dn = Math.hypot(dx, dy) || 1, ux = dx / dn, uy = dy / dn;
            const cl = (v: any) => v ? v.x * ux + v.y * uy : NaN, sp = (v: any) => v ? Math.hypot(v.x, v.y) : NaN;
            const dir = sim.attackDir(sim.offense[0].team);
            return { k: +(s.t - rel!).toFixed(2), reqC: cl(s.req), finC: cl(s.fin), actC: cl(a.vel), reqS: sp(s.req), actS: sp(a.vel), deepV: a.vel.x * dir, tags: s.tags.filter((x: string) => /break|bite|load|drop|onBall|flight|stop|ball|plant|zone-|hold|gate/.test(x)) };
          }).filter(Boolean) as any[];
          if (!rows.length) continue;
          const firstReq = rows.find((r) => r.reqC >= 1.5)?.k ?? null, firstAct = rows.find((r) => r.actC >= 1.5)?.k ?? null;
          const bounded = rows.some((r) => r.k >= -0.05 && r.k <= 0.3 && r.reqC - r.finC >= 1.0);
          const cls = firstReq === null ? 'no-request' : firstReq > 0.1 + 1e-9 ? '(a) late request' : bounded ? '(c) bounded' : (firstAct === null || firstAct - firstReq > 0.1 + 1e-9) ? '(b) momentum' : 'on time';
          const at0 = rows.find((r) => Math.abs(r.k) < 1e-6);
          men.push({ key: `${concept}/${coverage}/${formation}/${seed}/${flip}`, slot: d.slot, zone, deep, armAt: +(armAt - rel).toFixed(2), firstReq, firstAct, cls, deepV0: at0?.deepV ?? NaN, rows });
        }
      }
for (const deep of [false, true]) {
  const M = men.filter((m) => m.deep === deep), c = new Map<string, number>(); for (const m of M) c.set(m.cls, (c.get(m.cls) ?? 0) + 1);
  const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
  console.log(`${deep ? 'DEEP' : 'UNDER'} n ${M.length} | ${[...c].map(([k, v]) => `${k} ${v} (${(100 * v / M.length).toFixed(0)}%)`).join(', ')}`);
  console.log(`   arm read (s from release) ${q(M.map(m => m.armAt))} | first request closing >=1.5 ${q(M.map(m => m.firstReq ?? NaN))} | first actual ${q(M.map(m => m.firstAct ?? NaN))} | downfield speed at release ${q(M.map(m => m.deepV0))} yd/s`);
  const tagc = new Map<string, number>(); for (const m of M) { const r = m.rows.find((r: any) => Math.abs(r.k) < 1e-6); for (const t of new Set<string>(r?.tags ?? [])) tagc.set(t, (tagc.get(t) ?? 0) + 1); }
  console.log(`   tags at the release: ${[...tagc].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  const pick = M.filter((m: any) => m.cls !== "on time"); for (const m of pick.filter((_: any, i: number) => i % Math.max(1, Math.floor(pick.length / (deep ? Math.ceil(NEX / 2) : NEX))) === 0).slice(0, deep ? Math.ceil(NEX / 2) : NEX)) {
    console.log(`  ${m.key} ${m.slot} ${m.zone} arm ${m.armAt} -> ${m.cls}`);
    for (const r of m.rows.filter((_: any, i: number) => i % 2 === 0)) console.log(`     ${r.k >= 0 ? '+' : ''}${r.k.toFixed(2)} req ${r.reqS.toFixed(1)} (close ${r.reqC.toFixed(1)}) fin close ${r.finC.toFixed(1)} | act ${r.actS.toFixed(1)} (close ${r.actC.toFixed(1)}, downfield ${r.deepV.toFixed(1)}) ${r.tags.join(',')}`);
  }
}
// Split: what the request points at in the first 0.15 s after the release, and what the body did.
for (const deep of [false, true]) {
  const M = men.filter((m) => m.deep === deep);
  const reqAt = (m: any) => m.rows.find((r: any) => r.k >= 0.04 && r.k <= 0.16 && r.reqS >= 3);
  const wrong = M.filter((m) => { const r = reqAt(m); return r && r.reqC < -1; }), right = M.filter((m) => { const r = reqAt(m); return r && r.reqC >= 1.5; }), slow = M.filter((m) => !reqAt(m));
  const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(2)).join('/') : '-'; };
  const a25 = (m: any) => m.rows.find((r: any) => r.k >= 0.24 && r.k <= 0.26)?.actC ?? NaN;
  const dropping = right.filter((m) => m.rows[0].deepV >= 1), still = right.filter((m) => m.rows[0].deepV < 1);
  const tagged = (L: any[], t: string) => L.filter((m) => reqAt(m)?.tags.includes(t)).length;
  console.log(`${deep ? 'DEEP' : 'UNDER'} n ${M.length}: request at +0.05..0.15 toward the line ${right.length}, away from it ${wrong.length} (shoulder-break ${tagged(wrong, 'shoulder-break')}), no running request ${slow.length}`);
  console.log(`   toward, dropping at the arm read (>=1 yd/s deeper) ${dropping.length}: actual closing at +0.25 ${q(dropping.map(a25))} | not dropping ${still.length}: ${q(still.map(a25))} | away: ${q(wrong.map(a25))} | no request: ${q(slow.map(a25))}`);
}

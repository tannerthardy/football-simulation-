// The zone first arriver before the throw, closers vs non-closers (Integration, after cue_onset.py). Staged: every
// pass concept but screens vs the zone calls, two formations, seeds, both flips. Completions caught 0-12 yd by the
// thrown-to receiver. First arriver = the defender nearest the target at the catch (cue_onset's operator); underneath
// when 2-9 yd off at the snap. Closer: his closing on the target (velocity along the line to him) above +0.5 yd/s at
// the throw. At -0.25 s and at the throw: his technique label, requested and achieved speed, requested and achieved
// closing on the target, and whether another receiver is nearer to him than the target.
//   node --import tsx scripts/diag/defense/closer-census.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover3_match', 'cover4', 'cover6', 'tampa2'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team); const req = new Map<any, any>(); const hist: any[] = [];
        let tThrow = -1, thr: any = null, C: any = null, snap: Map<any, number> | null = null;
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          if (!snap) snap = new Map(sim.defense.map((d: any) => [d, (d.pos.x - sim.los) * dir]));
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (tThrow < 0) {
            hist.push({ t: sim.t, o: new Map(sim.offense.map((o: any) => [o, { ...o.pos }])), d: new Map(sim.defense.map((d: any) => { const r = req.get(d); return [d, { pos: { ...d.pos }, vel: { ...d.vel }, rv: r?.vel ? { ...r.vel } : null, label: (r && facingTechnique(r)?.label) ?? '-', cls: d.behavior?.constructor?.name ?? '-' }]; })) });
            while (hist.length && sim.t - hist[0].t > 0.4) hist.shift();
          }
          if (tThrow < 0 && sim.ball.kind === 'air') { tThrow = sim.t; thr = sim.ball.target; }
          if (thr && !C && sim.catchAt >= 0 && sim.ball.kind === 'held') {
            C = sim.ball.carrier; const depth = (C.pos.x - sim.los) * dir;
            if (C !== thr || depth < 0 || depth > 12) { C = 'skip'; return; }
            const first = sim.defense.reduce((b: any, d: any) => (!b || Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y) < Math.hypot(b.pos.x - C.pos.x, b.pos.y - C.pos.y) ? d : b), null);
            const at = (off: number) => { const h = hist.reduce((b: any, x: any) => (!b || Math.abs(x.t - (tThrow + off)) < Math.abs(b.t - (tThrow + off)) ? x : b), null); if (!h) return null;
              const s = h.d.get(first), tp = h.o.get(thr); const lx = tp.x - s.pos.x, ly = tp.y - s.pos.y, L = Math.hypot(lx, ly) || 1;
              const other = [...h.o.entries()].some(([o, p]: any) => o !== thr && o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) && Math.hypot(p.x - s.pos.x, p.y - s.pos.y) < L);
              return { label: `${s.cls}:${s.label}`, got: Math.hypot(s.vel.x, s.vel.y), req: s.rv ? Math.hypot(s.rv.x, s.rv.y) : NaN, cl: (s.vel.x * lx + s.vel.y * ly) / L, rcl: s.rv ? (s.rv.x * lx + s.rv.y * ly) / L : NaN, other }; };
            const d0 = snap.get(first) ?? 0;
            if (d0 >= 2) rows.push({ layer: d0 < 9 ? 'underneath' : 'deep', m25: at(-0.25), m0: at(0) });
          }
        };
        sim.run();
      }
const q = (v: number[], p = 0.5) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(p * (a.length - 1))].toFixed(2) : '-'; };
for (const layer of ['underneath', 'deep']) {
  const R = rows.filter((r) => r.layer === layer && r.m0 && r.m25); if (!R.length) continue;
  const closer = (r: any) => r.m0.cl > 0.5;
  console.log(`${layer}: n ${R.length}, closers at the throw ${(R.filter(closer).length / R.length).toFixed(2)}`);
  for (const [lab, S] of [['closers', R.filter(closer)], ['non-closers', R.filter((r) => !closer(r))]] as const) {
    const m = S.map((r: any) => r.m25);
    console.log(`  ${lab.padEnd(12)} n ${String(S.length).padStart(4)} | at -0.25 s: speed requested ${q(m.map((x: any) => x.req))} achieved ${q(m.map((x: any) => x.got))} | closing requested ${q(m.map((x: any) => x.rcl))} achieved ${q(m.map((x: any) => x.cl))} | another receiver nearer ${(m.filter((x: any) => x.other).length / Math.max(1, m.length)).toFixed(2)}`);
    const by: Record<string, any[]> = {}; for (const x of m) (by[x.label] ??= []).push(x);
    for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 7))
      console.log(`      ${k.padEnd(36)} ${(v.length / m.length).toFixed(2)} | speed req ${q(v.map((x) => x.req))} got ${q(v.map((x) => x.got))} | closing req ${q(v.map((x) => x.rcl))} got ${q(v.map((x) => x.cl))} | other nearer ${(v.filter((x) => x.other).length / v.length).toFixed(2)}`);
  }
}

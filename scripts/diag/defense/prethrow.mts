// First arriver before the throw (Integration, after Tools' rally.py NFL column). Staged as rally.mts: every pass
// concept but screens vs zone and man calls; completions caught 0-12 yd past the line. The first defender to come within
// 1 yd of the carrier after the catch; at -0.5 / -0.25 / 0 s relative to the throw: his speed, his closing rate on the
// eventual target (velocity along the line to him), his distance to him; split by whether the QB's eyes (truth) and
// his own picture of them (seenQbEyes) were on the eventual target; and what his controller was doing (technique label,
// behavior class, pass known).
//   node --import tsx scripts/diag/defense/prethrow.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { seenQbEyes, knowsPass } = await import(`${W}/src/sim/behaviors/defense.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const OFFS = [-0.5, -0.25, 0];
const out: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover1', 'cover2', 'cover3', 'cover3_match', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const req = new Map<any, any>(); const hist: any[] = []; let thr: any = null, tThrow = -1, C: any = null; const arrive = new Map<any, number>();
        const dir = sim.attackDir(sim.offense[0].team);
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (!thr && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb) {
            hist.push({ t: sim.t, eyes: sim.qbEyes, o: new Map(sim.offense.map((o: any) => [o, { ...o.pos }])), d: new Map(sim.defense.map((d: any) => { const r = req.get(d); return [d, { pos: { ...d.pos }, vel: { ...d.vel }, seen: seenQbEyes(d, sim),
              label: (r && facingTechnique(r)?.label) ?? '-', cls: d.behavior?.constructor?.name ?? '-', pass: knowsPass(sim, d) }]; })) });
            while (hist.length && sim.t - hist[0].t > 0.7) hist.shift();
          }
          if (!thr && sim.ball.kind === 'air') { thr = sim.ball.target; tThrow = sim.t; }
          if (thr && !C && sim.catchAt >= 0 && sim.ball.kind === 'held') { C = sim.ball.carrier; const depth = (C.pos.x - sim.los) * dir; if (depth < 0 || depth > 12 || C !== thr) C = 'skip'; }
          if (C && C !== 'skip' && sim.ball.kind === 'held' && sim.ball.carrier === C)
            for (const d of sim.defense) if (!arrive.has(d) && Math.hypot(C.pos.x - d.pos.x, C.pos.y - d.pos.y) < 1) arrive.set(d, sim.t);
        };
        sim.run();
        if (!C || C === 'skip' || !sim.stats.completed || !arrive.size) continue;
        const first = [...arrive.entries()].sort((a, b) => a[1] - b[1])[0][0];
        const row: any = { concept, coverage, cls: null, m: {} };
        for (const off of OFFS) {
          const h = hist.reduce((b: any, x: any) => (!b || Math.abs(x.t - (tThrow + off)) < Math.abs(b.t - (tThrow + off)) ? x : b), null);
          if (!h || Math.abs(h.t - (tThrow + off)) > 0.06) continue;
          const s = h.d.get(first); if (!s) continue;
          const tp = h.o.get(thr); const lx = tp.x - s.pos.x, ly = tp.y - s.pos.y, L = Math.hypot(lx, ly) || 1;
          row.m[off] = { sp: Math.hypot(s.vel.x, s.vel.y), close: (s.vel.x * lx + s.vel.y * ly) / L, dist: L, eyesOn: h.eyes === thr, seenOn: s.seen === thr, label: s.label, cls: s.cls, pass: s.pass };
        }
        row.first = first; row.thr = thr; out.push(row);
      }
const q = (v: number[], p: number) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(p * (a.length - 1))].toFixed(1) : '-'; };
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : '-';
console.log(`short completions (0-12 yd, caught by the target) with a first arriver: ${out.length}`);
const line = (lab: string, R: any[], off: number) => { const M = R.map((r) => r.m[off]).filter(Boolean); if (!M.length) return;
  console.log(`  ${lab.padEnd(34)} t${String(off).padStart(5)} n ${String(M.length).padStart(4)} | dist p50 ${q(M.map((m: any) => m.dist), .5)} | speed mean ${mean(M.map((m: any) => m.sp))} p50 ${q(M.map((m: any) => m.sp), .5)} | closing mean ${mean(M.map((m: any) => m.close))} p50 ${q(M.map((m: any) => m.close), .5)}`); };
for (const off of [-0.5, -0.25, 0]) {
  line('all', out, off);
  line('QB eyes on the target (truth)', out.filter((r) => r.m[off]?.eyesOn), off);
  line('QB eyes elsewhere (truth)', out.filter((r) => r.m[off] && !r.m[off].eyesOn), off);
  line('his picture: eyes on the target', out.filter((r) => r.m[off]?.seenOn), off);
  line('his picture: eyes elsewhere / none', out.filter((r) => r.m[off] && !r.m[off].seenOn), off);
  for (const cls of ['ZoneCoverage', 'CoverageDefender']) line(`  ${cls}`, out.filter((r) => r.m[off]?.cls === cls), off);
}
for (const off of [-0.5, -0.25, 0]) {
  const M = out.map((r) => r.m[off]).filter(Boolean); const by: Record<string, any[]> = {};
  for (const m of M) (by[`${m.cls}:${m.label}`] ??= []).push(m);
  console.log(`what he was doing at t ${off} (top labels; share, speed mean, closing mean, his picture eyes-on-target share, pass known share):`);
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1].length - a[1].length).slice(0, 10))
    console.log(`    ${k.padEnd(40)} ${(v.length / M.length).toFixed(2)} sp ${mean(v.map((m) => m.sp))} close ${mean(v.map((m) => m.close))} seenOn ${(v.filter((m) => m.seenOn).length / v.length).toFixed(2)} pass ${(v.filter((m) => m.pass).length / v.length).toFixed(2)}`);
}

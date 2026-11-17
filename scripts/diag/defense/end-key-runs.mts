// END_KEY's run-game check (Integration): real zone runs toward and away from each end, END_KEY on vs off. Per concept:
// yards p50 / mean, 10+ share, where the run ends up (bounced outside the toward-side end / cut back across the away
// side / inside), and each end's depth past the line and distance outside his tackle at 1.0 / 1.5 s.
//   END_KEY=0|2 node --import tsx scripts/diag/defense/end-key-runs.mts [seeds]
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 6);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const med = (v: number[]) => { const a = v.filter(Number.isFinite).sort((x, y) => x - y); return a.length ? a[Math.floor(a.length / 2)].toFixed(2) : '-'; };
for (const concept of (process.env.RUNS ?? 'oz_weak,oz_strong,iz_weak,iz_strong').split(',')) {
  const rows: any[] = [];
  for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const formation of ['gun_doubles_11', 'ace_11']) for (let seed = 1; seed <= seeds; seed++) for (const roster of [3, 7]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), by = sim.ballY;
    const ends = ['DE_W', 'DE_S'].map((s) => sim.defense.find((d: any) => d.slot === s)).filter(Boolean);
    const tk: Record<string, any> = {}; const tick = sim.tick.bind(sim); let cross: any = null;
    sim.tick = () => { tick(); if (!cross && sim.carrier && sim.carrier !== sim.qb && (sim.carrier.pos.x - sim.los) * dir > 1) { const dw = ends.find((e: any) => e.slot === 'DE_W'); const sw = Math.sign(dw.pos.y - by) || 1; cross = { outW: (sim.carrier.pos.y - dw.pos.y) * sw, lat: (sim.carrier.pos.y - by) * sw }; } for (const t of [1.0, 1.5]) if (Math.abs(sim.t - t) < 0.026) for (const e of ends) {
      const side = Math.sign(e.pos.y - by) || 1;
      const tackle = sim.offense.filter((o: any) => /^(LT|RT)$/.test(o.slot)).sort((p: any, q: any) => Math.abs(p.pos.y - e.pos.y) - Math.abs(q.pos.y - e.pos.y))[0];
      tk[`${e.slot}${t}`] = { dep: (e.pos.x - sim.los) * dir, off: (e.pos.y - tackle.pos.y) * side }; } };
    const res = sim.run();
    const yards = (res?.yards ?? sim.result?.yards ?? NaN);
    rows.push({ yards, tk, cross });
  }
  const Y = rows.map((r) => r.yards).filter(Number.isFinite);
  console.log(`${concept}: n ${Y.length} | yards p50 ${med(Y)} mean ${(Y.reduce((a, b) => a + b, 0) / Math.max(1, Y.length)).toFixed(2)} | 10+ ${(Y.filter((y) => y >= 10).length / Math.max(1, Y.length)).toFixed(3)} | <=0 ${(Y.filter((y) => y <= 0).length / Math.max(1, Y.length)).toFixed(3)}`);
  const C = rows.filter((r) => r.cross); const big = C.filter((r) => r.yards >= 10);
  console.log(`   where the carrier crosses the line (+ = toward DE_W's side): outside DE_W ${C.filter((r) => r.cross.outW > 0).length}/${C.length}, 10+ runs outside DE_W ${big.filter((r) => r.cross.outW > 0).length}/${big.length}, lateral p50 ${med(C.map((r) => r.cross.lat))}`);
  for (const e of ['DE_W', 'DE_S']) console.log(`   ${e}: depth 1.0/1.5 ${med(rows.map((r) => r.tk[e + '1']?.dep))}/${med(rows.map((r) => r.tk[e + '1.5']?.dep))} | outside his tackle ${med(rows.map((r) => r.tk[e + '1']?.off))}/${med(rows.map((r) => r.tk[e + '1.5']?.off))}`);
}

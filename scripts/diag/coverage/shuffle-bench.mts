// node --import tsx scripts/diag/coverage/shuffle-bench.mts
// Bench: an underneath LB from rest at his drop, asked for 3.5 yd/s lateral (and 5.0) for 1 s: square to the QB (facing
// fixed toward the line) vs allowed to open (facing = travel). Lateral speed achieved at 0.2 / 0.4 / 0.8 s.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
for (const ask of [3.5, 5.0]) for (const mode of ['square', 'open', 'ahead']) for (const slot of ['LB_M', 'LB_W', 'NB']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'drive', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  const a = sim.defense.find((d: any) => d.slot === slot); if (!a) continue;
  const up = sim.attackDir('O'); let t0 = -1; const rows: number[] = [];
  const face = Math.atan2(0, -up); // toward the line of scrimmage
  const bench = { kind: 'bench', update: (ag: any, s: any) => {
    if (s.t < a.snapReadyAt + 0.3) return { vel: { x: 0, y: 0 }, facing: face };
    if (t0 < 0) t0 = s.t;
    return mode === 'ahead' ? { vel: { x: -up * ask, y: 0 }, facing: face, effort: 1 } : { vel: { x: 0, y: ask }, facing: mode === 'square' ? face : undefined, effort: 1 };
  } };
  const keep = () => { if (a.behavior !== bench) a.behavior = bench as any; for (const q of sim.offense) if (q !== sim.qb && q.behavior?.kind !== 'idle') q.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any; };
  for (const q of sim.offense) if (q !== sim.qb) q.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  const tick = sim.tick.bind(sim);
  sim.tick = () => { keep(); tick(); if (t0 >= 0) for (const m of [0.2, 0.4, 0.8]) if (rows.length < 3 && Math.abs(sim.t - t0 - m) < sim.dt / 2) rows.push(mode === 'ahead' ? -up * a.vel.x : a.vel.y); };
  while (sim.t < (t0 < 0 ? 5 : t0 + 0.85) && sim.phase === 'live') sim.tick();
  console.log(`ask ${ask} ${mode.padEnd(6)} ${slot.padEnd(4)} (${a.player.position}, vmax ${a.profile.vmax.toFixed(1)}): lateral at 0.2/0.4/0.8 s ${rows.map(r => r.toFixed(2)).join(' / ')}`);
}

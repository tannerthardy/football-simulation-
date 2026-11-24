const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
for (const [cov, press] of [['cover1', true], ['cover3', false]] as const) for (const seed of [1, 2]) {
  const setup: any = nativeTraceSetup({ concept: 'mesh', coverage: cov, seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  const sim: any = new PlaySim(setup);
  const tb = sim.throwBall.bind(sim); sim.throwBall = () => undefined;
  const num = sim.offAlign.numbering; const S2 = sim.slot(num.S2), W2 = sim.slot(num.W2);
  const rows: string[] = []; let snap: number | null = null; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') snap = sim.t;
    if (snap !== null) { const t = sim.t - snap; for (const tt of [0.5, 1.0, 1.5, 2.0, 2.5]) if (Math.abs(t - tt) < 0.026) rows.push(`${tt}: S2(${S2.slot}) x${(S2.pos.x - sim.los).toFixed(1)} y${S2.pos.y.toFixed(1)} v${Math.hypot(S2.vel.x, S2.vel.y).toFixed(1)} | W2(${W2.slot}) x${(W2.pos.x - sim.los).toFixed(1)} y${W2.pos.y.toFixed(1)} v${Math.hypot(W2.vel.x, W2.vel.y).toFixed(1)}`); }
    if (sim.t > 4) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  const jams = (sim.events as any[]).filter((e) => e.type === 'jam').map((e) => `${sim.agents[e.a]?.slot}->${sim.agents[e.b]?.slot}@${(e.t - (snap ?? 0)).toFixed(2)}`);
  console.log(`== ${cov} seed ${seed} jams ${jams.join(',')}`); console.log(rows.filter((r, i, a) => a.indexOf(r) === i).join('\n'));
}

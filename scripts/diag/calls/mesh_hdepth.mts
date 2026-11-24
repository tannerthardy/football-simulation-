const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const out: string[] = [];
for (const seed of [1, 2, 3]) {
  const setup: any = nativeTraceSetup({ concept: 'mesh', coverage: process.argv[2], seed, roster: 3, formation: 'gun_doubles_11', flip: false });
  const sim: any = new PlaySim(setup); sim.throwBall = () => undefined;
  const H = sim.slot(sim.offAlign.numbering.W2); let snap: number | null = null; let d25 = NaN; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') snap = sim.t; if (snap !== null && Math.abs(sim.t - snap - 2.5) < 0.026) d25 = H.pos.x - sim.los; if (sim.t > 3.5) sim.phase = 'dead'; };
  try { sim.run(); } catch {}
  out.push(d25.toFixed(2));
}
console.log(process.argv[2], process.env.FLAGX ?? 'default', 'H depth @2.5:', out.join(' '));

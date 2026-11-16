const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { paFakeSide } = await import(`${W}/src/sim/pa-look.ts`);
for (const concept of ['pa_flood', 'pa_post_dig', 'pa_shot']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed: 1, roster: 3, formation: 'gun_doubles_11' }));
  const rb = sim.offense.find((o: any) => o.slot === 'RB'), dw = sim.defense.find((d: any) => d.slot === 'DE_W'), ds = sim.defense.find((d: any) => d.slot === 'DE_S');
  const s0 = { rb: rb.pos.y, ball: sim.ballY, dw: dw.pos.y, ds: ds.pos.y, strong: sim.offAlign.strongSign };
  let rb8 = NaN; const tk = sim.tick.bind(sim); sim.tick = () => { tk(); if (Math.abs(sim.t - 0.8) < 0.026) rb8 = rb.pos.y; };
  sim.run();
  console.log(concept, JSON.stringify({ ...s0, rb08: rb8, fakeSide: paFakeSide.get(sim) }));
}

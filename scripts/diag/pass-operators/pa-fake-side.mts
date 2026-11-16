// One staged PA play: ball, QB, RB and his fake point, paFakeSide, both ends and both tackles, and which tackle reaches /
// hinges (Integration / Defense check, 2026-11-16: DE_W is the fake-side end in gun_doubles).
// usage: PA_HINGE=1 CONCEPT_DROPS=1 QB_FOOTWORK=1 node --import tsx scripts/diag/pass-operators/pa-fake-side.mts
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { paFakeSide } = await import(`${W}/src/sim/pa-look.ts`);
for (const concept of ['pa_flood', 'pa_shot']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept, seed: 6, roster: 19, formation: 'gun_doubles_11', flip: false }));
  const de = sim.defense.find((d: any) => d.slot === 'DE_W'), ds = sim.defense.find((d: any) => d.slot === 'DE_S');
  const rb = sim.slot('RB'), qb = sim.qb, lt = sim.slot('LT'), rt = sim.slot('RT');
  console.log(`${concept}: ballY ${sim.ballY.toFixed(2)} strongSign ${sim.offAlign.strongSign} | QB y ${qb.pos.y.toFixed(2)} RB y ${rb.pos.y.toFixed(2)} (RB behaviour ${rb.behavior.kind}, fake point y ${rb.behavior.mesh?.y?.toFixed(2)}) | paFakeSide ${paFakeSide.get(sim)} | DE_W y ${de.pos.y.toFixed(2)} DE_S y ${ds.pos.y.toFixed(2)} | LT y ${lt.pos.y.toFixed(2)} RT y ${rt.pos.y.toFixed(2)}`);
  for (let i = 0; i < 20; i++) sim.tick();
  console.log(`  at ${sim.t.toFixed(2)} s: LT tags ${[...lt.tags].filter((x: string) => /pa-/.test(x))} RT tags ${[...rt.tags].filter((x: string) => /pa-/.test(x))} | RB y ${rb.pos.y.toFixed(2)}`);
}

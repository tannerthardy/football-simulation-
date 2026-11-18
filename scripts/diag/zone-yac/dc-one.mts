const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const [coverage, concept, formation, seed, slot, T] = process.argv.slice(2);
const setup: any = nativeTraceSetup({ coverage, concept, seed: +seed, roster: +seed, formation, flip: +seed % 2 === 0 });
const dry: any = new PlaySim(setup); for (let i = 0; i < 400 && (dry.snapAt ?? -1) < 0; i++) dry.tick();
const sim: any = new PlaySim({ ...setup, stagedThrow: { at: (dry.snapAt ?? 0) + +T, slot } });
sim.run(); console.log('caught', sim.stats.completed, sim.events.filter((e: any) => /pbu|deflect|intercept|incomplete/.test(e.type)).map((e: any) => e.type + '@' + e.t?.toFixed?.(2)));

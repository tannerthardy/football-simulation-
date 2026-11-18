const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
let comp = 0, n = 0; const labs = new Map<string, number>(), kinds = new Map<string, number>();
for (const concept of ['stick', 'flood', 'mesh', 'curl_flat', 'drive']) for (const coverage of ['cover3', 'cover2', 'cover4']) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  for (const d of sim.defense) kinds.set(d.behavior?.constructor?.name, (kinds.get(d.behavior?.constructor?.name) ?? 0) + 1);
  const dec = sim.decide.bind(sim);
  sim.decide = (i: number, t: number) => { dec(i, t); const a = sim.agents[i]; if (a.behavior?.constructor?.name === 'UnderneathLadder') { const l = facingTechnique(sim.cmds[i] ?? {})?.label ?? '-'; labs.set(l, (labs.get(l) ?? 0) + 1); } };
  const res = sim.run(); n++; if (res.stats.completed) comp++;
}
console.log('behaviors', JSON.stringify([...kinds])); console.log('ladder labels', JSON.stringify([...labs])); console.log('plays', n, 'complete', comp);

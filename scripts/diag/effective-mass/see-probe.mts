// What does sim.see return for an opponent a free-running player never fixated? Staged pass play; each tick the inside receiver asks for the strong end, the nearest defender, and the QB asks for the nearest rusher. Print picture vs truth.
const R = process.cwd();
const { Rng } = await import(`${R}/src/core/rng.ts`); const { generateTeam, pickDefense, pickOffense } = await import(`${R}/src/league/team.ts`);
const { PASS_BY_ID } = await import(`${R}/src/playbook/concepts.ts`); const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(`${R}/src/playbook/defense.ts`);
const { FORMATION_BY_ID } = await import(`${R}/src/playbook/formations.ts`); const { PlaySim } = await import(`${R}/src/sim/playsim.ts`);
const offense = generateTeam(new Rng(101), 'O', 'DTO', { strength: .55 }), defense = generateTeam(new Rng(102), 'D', 'DTD', { strength: .55 });
const concept = process.env.CONCEPT ?? 'stick', seed = Number(process.env.SEED ?? 2);
const sim: any = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
  offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'c3' }, los: 35, ballY: 26.65, firstDownX: 45, seed } as never);
const recv = sim.offense.filter((a: any) => ['X', 'Z', 'Y', 'H'].includes(a.slot)); const rushers = sim.defense.filter((d: any) => ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot));
const tick = sim.tick.bind(sim); let nextPrint = 0.5;
sim.tick = () => { tick();
  if (sim.phase !== 'live' || sim.t < nextPrint) return; nextPrint += 0.4;
  const lines: string[] = [];
  for (const o of [...recv.slice(0, 2), sim.qb]) { const best = rushers.map((d: any) => ({ d, true: Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) })).sort((a: any, b: any) => a.true - b.true)[0];
    const p = sim.see(o, best.d); const pd = Math.hypot(p.pos.x - o.pos.x, p.pos.y - o.pos.y), err = Math.hypot(p.pos.x - best.d.pos.x, p.pos.y - best.d.pos.y);
    lines.push(`${o.slot}->${best.d.slot}: true ${best.true.toFixed(1)} yd, pictured ${pd.toFixed(1)} yd (error ${err.toFixed(1)} yd, age ${(p.age ?? 0).toFixed(2)} s, speed ${Math.hypot(p.vel.x, p.vel.y).toFixed(1)} vs ${Math.hypot(best.d.vel.x, best.d.vel.y).toFixed(1)})`); }
  console.log(`t ${sim.t.toFixed(2)}  ` + lines.join(' | ')); };
sim.run();

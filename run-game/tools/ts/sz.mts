process.env.FRONT_ALIGN = process.argv[2] ?? '1';
const { CENTER_Y } = await import('/home/user/fs-develop/src/core/field.js');
const { Rng } = await import('/home/user/fs-develop/src/core/rng.js');
const { generateTeam, pickDefense, pickOffense } = await import('/home/user/fs-develop/src/league/team.js');
const { RUN_BY_ID } = await import('/home/user/fs-develop/src/playbook/concepts.js');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('/home/user/fs-develop/src/playbook/defense.js');
const { FORMATION_BY_ID } = await import('/home/user/fs-develop/src/playbook/formations.js');
const { PlaySim } = await import('/home/user/fs-develop/src/sim/playsim.js');
const { RunBlocker } = await import('/home/user/fs-develop/src/sim/behaviors/blocking.js');
const off = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 }), def = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
const sim = new PlaySim({ offense: pickOffense(off, '12'), defense: pickDefense(def, 'base43'), offCall: { formation: FORMATION_BY_ID.gun_wing_12, flip: true, kind: 'run', run: RUN_BY_ID.split_zone, label: 's' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'o' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11 });
const s = sim.offAlign.strongSign;
for (const d of sim.defense.filter(a => /^(DE|DT|LB_S)/.test(a.slot))) console.log(d.slot, ((d.pos.y - CENTER_Y) * s).toFixed(2), (d.pos.x - 40).toFixed(2));
for (const b of sim.offense.filter(b => b.behavior instanceof RunBlocker)) { const p = (b.behavior as any).plan; console.log(' ', b.slot, ((b.pos.y - CENTER_Y) * s).toFixed(2), p.kind, p.pullRole ?? '', p.target?.slot ?? '-'); }

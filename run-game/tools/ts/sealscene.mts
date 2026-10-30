const root = process.cwd();
const { CENTER_Y } = await import(root + '/src/core/field.ts');
const { Rng } = await import(root + '/src/core/rng.ts');
const { generateTeam, pickDefense, pickOffense } = await import(root + '/src/league/team.ts');
const { RUN_BY_ID } = await import(root + '/src/playbook/concepts.ts');
const { COVERAGE_BY_ID, FRONT_BY_ID } = await import(root + '/src/playbook/defense.ts');
const { FORMATION_BY_ID } = await import(root + '/src/playbook/formations.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const { goTo } = await import(root + '/src/sim/behaviors/common.ts');
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const side = Number(process.argv[2] ?? 1);
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const formation = FORMATION_BY_ID.ace_11;
const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
  offCall: { formation, flip: side > 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'x' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11 });
for (const a of sim.agents) { a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 }; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) }; }
sim.t = 1; sim.world.time = 1;
const primary = sim.slot('C'), helper = sim.slot('LG'), defender = sim.slot('DT_W'), backer = sim.slot('LB_W'), rb = sim.slot('RB');
primary.body.pos = { x: 40, y: CENTER_Y - side * .4 }; helper.body.pos = { x: 40, y: CENTER_Y + side * .4 };
defender.body.pos = { x: 40.75, y: CENTER_Y }; backer.body.pos = { x: 42, y: CENTER_Y - side * 1.2 };
rb.body.pos = { x: 34, y: CENTER_Y }; sim.qb.body.pos = { x: 36, y: CENTER_Y - side * 2 };
primary.body.facing = helper.body.facing = 0; defender.body.facing = Math.PI;
const combination: any = { members: [primary, helper], defender, backer, released: false, secureSince: -1, nextRead: 0, soloKind: 'drive' };
for (const [i, a] of combination.members.entries()) a.behavior = new RunBlocker({ kind: i === 0 ? 'drive' : 'combo', target: defender, drive: { x: 1, y: 0 }, combination });
const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
observe();
const e = sim.engage(primary, defender, 'run', { x: 1, y: 0 }); sim.engage(helper, defender, 'run', { x: 1, y: 0 });
backer.body.pos = { x: 42, y: CENTER_Y + side * 1.2 }; backer.body.facing = Math.PI;
backer.behavior = { kind: 'idle', update: () => goTo(backer, { x: 38, y: CENTER_Y + side * 2.2 }, { speed: .5 }) };
rb.body.pos = { x: 34, y: CENTER_Y + side * 2.2 };
rb.behavior = { kind: 'idle', update: () => goTo(rb, { x: 48, y: CENTER_Y + side * 2.2 }, { speed: .65 }) };
sim.ball = { kind: 'held', carrier: rb }; observe();
let rel = -1, loadAt = -1;
const f = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);
while (sim.phase === 'live' && sim.t < 3.6) {
  sim.tick();
  if (rel < 0 && combination.released) rel = +sim.t.toFixed(2);
  const he = helper.engagement, load = he?.defender === backer ? Math.hypot(he.hands?.normalForce ?? 0, he.hands?.tangentForce ?? 0) : 0;
  if (loadAt < 0 && load > 1) loadAt = +sim.t.toFixed(2);
  const k = Math.round(sim.t * 20);
  if (k % 4 === 0) {
    const pi = sim.intents[primary.idx], hi = sim.intents[helper.idx];
    console.log(`t${sim.t.toFixed(2)} rel=${combination.released} keeper(C) y-off from DT ${f((primary.pos.y - defender.pos.y) * side)} req.vy ${f((pi?.vel.y ?? 0) * side)} got.vy ${f(primary.vel.y * side)} | helper(LG) on ${he?.defender.slot ?? '-'} load ${load.toFixed(0)} req ${f(hi?.vel.x ?? 0)},${f((hi?.vel.y ?? 0) * side)} pos-off-LB ${f(helper.pos.x - backer.pos.x)},${f((helper.pos.y - backer.pos.y) * side)} | rb.x ${rb.pos.x.toFixed(1)}`);
  }
  if (rb.pos.x > backer.pos.x + backer.profile.radius) break;
}
console.log(`released ${rel}, helper load on LB ${loadAt}, DT keeper joint ${primary.engagement?.defender === defender}, wraps ${sim.events.filter((x: any) => x.type === 'tackle_wrap').map((x: any) => sim.agents[x.a].slot + '@' + x.t).join(',')}`);

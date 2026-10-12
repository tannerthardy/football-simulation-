/** Print one panel rep tick by tick (diagnostic). */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { RushMove } from '../../../src/sim/agent.js';
import { rushScripts } from '../../../src/sim/engagement.js';
import { handCount, pairOf } from '../../../src/sim/hand-pair.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const script = (process.argv[2] ?? 'club,spin,speed').split(',') as RushMove[], seed = Number(process.argv[3] ?? 1000);
const offense = generateTeam(new Rng(51), 'Panel O', 'PO', { strength: .55 });
const defense = generateTeam(new Rng(52), 'Panel D', 'PD', { strength: .55 });
const formation = FORMATION_BY_ID.ace_11;
const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
  offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'panel' },
  defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'panel' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
const T = sim.slot('RT')!, qb = sim.qb;
const R = [...sim.defense].filter((d) => d.slot.startsWith('DE')).sort((p, q) => Math.abs(p.pos.y - T.pos.y) - Math.abs(q.pos.y - T.pos.y))[0];
const side = Math.sign(T.pos.y - CENTER_Y) || 1;
for (const a of sim.agents) { if (a === T || a === R) continue; a.body.pos = { x: 80 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 }; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; }
qb.body.pos = { x: 33, y: CENTER_Y };
T.body.pos = { x: 38.4, y: CENTER_Y + side * 3.2 }; T.body.vel = { x: -1, y: side * .3 }; T.body.facing = Math.atan2(side, 1) * .5;
R.body.pos = { x: 39.25, y: CENTER_Y + side * 4.0 }; R.body.vel = { x: -4.5, y: -side * .2 }; R.body.facing = Math.PI;
sim.t = sim.world.time = .6;
for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
const e = sim.engage(T, R, 'pass', null)!; rushScripts.set(e, [...script]);
console.log('side', side, 'T', T.slot, 'R', R.slot, 'phi0', e.phi.toFixed(2), 'move0', e.move, 'next', e.nextMoveAt.toFixed(2));
const tick = sim as unknown as { tick(): void };
let n = 0;
while (sim.phase === 'live' && sim.t < 3) {
  const ev = sim.events.length; tick.tick();
  const en = R.engagement, st = en ? pairOf(en) : undefined;
  const news = sim.events.slice(ev).filter((x) => x.type !== 'read').map((x) => x.type + (x.note ? `(${x.note})` : '')).join(' ');
  if (n++ % 2 === 0 || news) console.log(`t=${sim.t.toFixed(2)} R(${(R.pos.x - 40).toFixed(2)},${((R.pos.y - CENTER_Y) * side).toFixed(2)}) f${R.facing.toFixed(2)} v${Math.hypot(R.vel.x, R.vel.y).toFixed(1)} T(${(T.pos.x - 40).toFixed(2)},${((T.pos.y - CENTER_Y) * side).toFixed(2)}) ${en ? `eng same=${en === e} move=${en.move} ok=${en.moveOk} phi=${en.phi.toFixed(2)} ctl=${en.control.toFixed(2)}${st ? ` hands=${handCount(st)}(${st.inside.on ? 'I' : '-'}${st.outside.on ? 'O' : '-'})` : ''} N=${(en.hands?.normalForce ?? 0).toFixed(0)}` : 'free'} dQB ${Math.hypot(R.pos.x - qb.pos.x, R.pos.y - qb.pos.y).toFixed(2)} ${news}`);
}

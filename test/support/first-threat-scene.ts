/** Minimal acquired-picture fixture, not a restoration of historical G1-P024.
 * Ordinary roster/capacities/controllers; no physics or perception substitutes.
 */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { RunBlocker } from '../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../src/sim/playsim.js';

export function firstThreatScene(kind: 'lead' | 'climb' = 'lead', side = 1) {
  const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
  const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '21'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.i_pro_21, flip: side < 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'first-threat fixture' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 7 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx * 2, y: 4 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
  }
  const actor = sim.slot(kind === 'climb' ? 'RT' : 'F')!, rb = sim.slot('RB')!, original = sim.slot('FS')!, threat = sim.slot('LB_M')!, mate = sim.slot('LG')!;
  actor.body.pos = { x: 40.5, y: CENTER_Y + side * .4 };
  actor.body.facing = 0;
  rb.body.pos = { x: 37, y: CENTER_Y };
  rb.body.vel = { x: 5, y: 0 };
  original.body.pos = { x: 49, y: CENTER_Y + side * 7 };
  original.body.vel = { x: 1, y: 0 };
  threat.body.pos = { x: 42.5, y: CENTER_Y - side };
  threat.body.vel = { x: -2, y: 0 };
  sim.qb.body.pos = { x: 34, y: CENTER_Y + side * 3 };
  sim.ball = { kind: 'held', carrier: rb };
  sim.t = sim.world.time = 1.8;
  const controller = new RunBlocker({ kind, target: original, drive: { x: 1, y: 0 } });
  actor.behavior = controller;
  const acquire = () => { for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, rb.idx); };
  acquire();
  return { sim, actor, rb, original, threat, mate, controller, acquire,
    command: () => controller.update(actor, sim) };
}

/** Same actual geometry and contact-creation draws in both arms. The observer
 * has not yet acquired the teammate's move or whether these hands remain.
 */
export function unseenContact(f: ReturnType<typeof firstThreatScene>, retained: boolean, target = f.threat) {
  f.mate.body.pos = { x: target.pos.x - .65, y: target.pos.y };
  f.mate.body.facing = 0;
  const e = f.sim.engage(f.mate, target, 'run', { x: 1, y: 0 });
  if (!e) throw new Error('first-threat fixture must acquire ordinary teammate contact');
  if (!retained) f.sim.disengage(e);
  return e;
}

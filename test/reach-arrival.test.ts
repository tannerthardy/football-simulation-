/** REACH_ARRIVAL: with hands that take time (REACH_TIME), the wait for a better shot judges where the hands land. A set
 * defender and a carrier crossing at 7 yd/s: at 1.0 yd he gets a hold, at 1.5 yd no reach (it would not meet). */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { REACH_ARRIVAL, REACH_TIME } from '../src/sim/tackle.js';

function cross(offset: number) {
  const sim: any = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'D'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'cross' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cross' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 });
  const c = sim.slot('RB')!, d = sim.slot('LB_M')!;
  for (const a of sim.agents) { a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  c.downUntil = d.downUntil = -1;
  const dir = sim.attackDir(c.team);
  d.body.pos = { x: 41, y: CENTER_Y }; d.body.facing = dir > 0 ? Math.PI : 0;
  c.body.pos = { x: 41 - offset * dir, y: CENTER_Y - 6 }; c.body.vel = { x: 0, y: 7 }; c.body.facing = Math.PI / 2;
  sim.t = sim.world.time = 1.2; sim.ball = { kind: 'held', carrier: c }; sim.handoffAt = 0;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, c.idx);
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents: any, dt: number) => { intents[c.idx] = { ...intents[c.idx], vel: { x: 0, y: 7 }, facing: Math.PI / 2 }; intents[d.idx] = { ...intents[d.idx], vel: { x: 0, y: 0 } }; return step(intents, dt); };
  for (let k = 0; k < 30 && sim.phase === 'live' && !sim.bond; k++) sim.tick();
  return { held: !!sim.bond?.tacklers.includes(d), reached: sim.events.some((e: any) => e.a === d.idx && (e.type === 'missed_tackle' || e.type === 'tackle_wrap')) };
}

describe.runIf(REACH_ARRIVAL && REACH_TIME)('REACH_ARRIVAL', () => {
  it('a set defender holds a 7 yd/s crosser passing at 1.0 yd', () => {
    expect(cross(1.0).held).toBe(true);
  });
  it('and takes no reach at one passing at 1.5 yd, beyond his arm', () => {
    expect(cross(1.5).reached).toBe(false);
  });
});

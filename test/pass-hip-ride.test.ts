import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World, type HandJoint, type Intent } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { createEngagement, syncJoints, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

/** Constructed loaded outside-hand state. This tests the geometry contract,
 * not an ordinary play or a claimed success rate. The load is solved by World,
 * never assigned to a force field to make the retention condition true. */
function stage(side = -1, control = .6, loaded = true) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: side > 0, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'loaded outside hand' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.wide9, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'loaded outside hand' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const b = sim.slot('RT')!, d = sim.slot('DE_S')!;
  for (const a of sim.agents) if (a !== b && a !== d && a !== sim.qb) {
    a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.downUntil = 99;
  }
  sim.qb.body.pos = { x: 33, y: CENTER_Y };
  b.body.pos = { x: 36.5, y: CENTER_Y + side * 3 };
  d.body.pos = { x: 36, y: CENTER_Y + side * 3.4 };
  b.body.vel = { x: -1, y: 0 }; d.body.vel = { x: -3, y: -side };
  b.body.facing = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x);
  d.body.facing = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
  b.passSet = { depth: 3.5, outside: side, laneY: b.pos.y };
  sim.t = .8;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const e = createEngagement(sim, b, d, 'pass', null)!;
  expect(e).toBeTruthy(); e.control = control; e.move = 'bull'; e.moveOk = false; e.nextMoveAt = Infinity;
  syncJoints(sim, e);
  if (loaded) {
    const held = sim.agents.map(a => ({ vel: { ...a.vel }, facing: a.body.facing }));
    sim.world.step(held, sim.dt); sim.t += sim.dt;
    expect(e.hands!.normalForce).toBeGreaterThan(0);
  }
  return { sim, b, d, e };
}

describe('an outside pass hand is released by executable contact, not QB-relative hip angle alone', () => {
  it.each([-1, 1])('keeps a blocker-owned loaded hand in front and within its span, side %s', side => {
    const { sim, b, d, e } = stage(side);
    const hands = e.hands!, before = structuredClone(sim.agents.map(a => a.body));
    const dice = vi.spyOn(sim, 'dice');
    updateEngagements(sim);
    expect(Math.abs(e.phi)).toBeGreaterThanOrEqual(1);
    expect(sim.engagements).toContain(e);
    expect(e.hands).toBe(hands);
    expect(hands.actor).toBe(b.body);
    expect(e.holding).toBe(false);
    expect(dice.mock.calls.some(([kind]) => kind === 'hold')).toBe(false);
    expect(sim.agents.map(a => a.body)).toEqual(before);
    // Equal commands and starting bodies: the retained hand must actually
    // deflect the rusher outside. The causal control omits only the hand;
    // both Worlds keep ordinary torso collisions, feet and capacities.
    const run = (withHand: boolean) => {
      const bodies = structuredClone(sim.agents.map(a => a.body));
      const world = new World(bodies, { substeps: 12 }); world.time = sim.t;
      let joint: HandJoint | undefined;
      if (withHand) {
        joint = { ...hands, a: bodies[b.idx], b: bodies[d.idx], actor: bodies[b.idx] };
        world.joints.push(joint);
      }
      const report = world.step(sim.intents as Intent[], sim.dt);
      return { pos: bodies[d.idx].pos, joint, report };
    };
    const held = run(true), free = run(false);
    expect(held.joint!.normalForce).toBeGreaterThan(0);
    expect(side * (held.pos.y - free.pos.y)).toBeGreaterThan(0);
    expect(Math.abs(held.report.work.residual)).toBeLessThan(1e-8);
    expect(held.report.maxPenetration).toBeLessThan(.2);
    dice.mockRestore();
  });

  it('releases a defender-owned hand even when that hand was strongly loaded', () => {
    const { sim, e } = stage(-1, -.6);
    expect(e.hands!.actor).toBe(e.defender.body);
    updateEngagements(sim);
    expect(Math.abs(e.phi)).toBeGreaterThanOrEqual(1);
    expect(sim.engagements).not.toContain(e);
  });

  it.each(['unloaded', 'outside span', 'behind torso', 'inside counter', 'cleared hands'] as const)
    ('does not carry stale load into a legal ride: %s', condition => {
      const { sim, b, d, e } = stage(-1, .6, condition !== 'unloaded');
      if (condition === 'outside span') {
        const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, dist = Math.hypot(dx, dy);
        const length = e.hands!.extension + .1;
        d.body.pos = { x: b.pos.x + dx / dist * length, y: b.pos.y + dy / dist * length };
      } else if (condition === 'behind torso') b.body.facing += Math.PI;
      else if (condition === 'inside counter') {
        d.body.pos.y = b.pos.y + .4;
        b.body.facing = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x);
      } else if (condition === 'cleared hands') {
        e.move = 'swim'; e.moveOk = true; e.moveUntil = sim.t + .3;
      }
      updateEngagements(sim);
      expect(Math.abs(e.phi)).toBeGreaterThanOrEqual(1);
      // A separate illegal holding attempt is still possible under the
      // existing law. It must never be reclassified as legal retained hands.
      expect(!sim.engagements.includes(e) || e.holding).toBe(true);
    });
});

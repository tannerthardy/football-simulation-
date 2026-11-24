import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import type { GraspJoint } from '../src/physics/world.js';
import { PlaySim } from '../src/sim/playsim.js';
import { contactQuality } from '../src/sim/tackle-window.js';
import { tryTackles } from '../src/sim/tackle.js';
import { tackleNow } from './helpers/tackle-now.js';
import { reachTo } from '../src/sim/tackle-reach.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

function stage(side = 1) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'reachable constrained tackle' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'reachable constrained tackle' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83 });
  const carrier = sim.slot('Z')!, defender = sim.slot('FS')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
  }
  carrier.downUntil = defender.downUntil = -1;
  defender.body.pos = { x: 50, y: CENTER_Y }; defender.body.vel = { x: 6, y: 0 };
  defender.body.facing = 0;
  carrier.body.vel = { x: 4, y: 0 }; carrier.body.facing = 0;
  sim.t = sim.world.time = 2;
  sim.ball = { kind: 'held', carrier }; sim.catchAt = 0;
  sim.intents[defender.idx] = { vel: { x: 0, y: 0 }, facing: 0 };
  const body = carrier.profile.radius + defender.profile.radius;
  function picture() {
    for (let k = 0; k < 24; k++) {
      const lag = (23 - k) * sim.dt;
      sim.perception.record(sim.agents.map(a => ({
        pos: { x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
        vel: a.vel, facing: a.facing, stance: a.stance, pose: a.pose,
      })));
    }
  }
  function withinReach(arms = reachTo(defender, carrier, 1)) {
    // Extended but physically reachable now. Ideal straight motion predicts
    // torso contact soon, although the current constraint has not disappeared.
    const distance = arms - .03;
    carrier.body.pos = { x: defender.pos.x + distance, y: defender.pos.y + side * .01 };
    const q = contactQuality(Math.hypot(distance, .01), body, arms);
    expect(q).toBeLessThan(.85 - .15 * defender.r('tackling'));
    expect(contactQuality(Math.hypot(distance - .6, .01), body, arms)).toBeGreaterThan(q + .1);
    picture();
  }
  return { sim, carrier, defender, body, picture, withinReach };
}

describe('waiting requires a supported acquired-picture forecast', () => {
  it.each([-1, 1])('takes a reachable grab while working off a real block, side=%s', side => {
    const f = stage(side), blocker = f.sim.slot('C')!;
    blocker.downUntil = -1;
    blocker.body.pos = { x: f.defender.pos.x, y: CENTER_Y - side * .7 };
    const engagement = f.sim.engage(blocker, f.defender, 'run', { x: 1, y: 0 })!;
    expect(engagement).toBeTruthy(); expect(engagement.hands).toBeTruthy();
    engagement.win = .8;
    f.withinReach(reachTo(f.defender, f.carrier, .4));
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    const chance = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(false);
    try {
      tackleNow(f.sim);
      expect(preview).not.toHaveBeenCalled();
      expect(f.sim.bond?.tacklers).toContain(f.defender);
      // A free-arm grab keeps the block (ONE_ARM_HOLD): one arm on the runner.
      expect(f.defender.engagement).toBe(engagement); expect(blocker.engagement).toBe(engagement);
      expect(f.sim.bond?.oneArm?.has(f.defender)).toBe(true);
      expect(f.sim.events.some(e => e.type === 'tackle_wrap' && e.a === f.defender.idx)).toBe(true);
    } finally { preview.mockRestore(); chance.mockRestore(); }
  });

  it.each(['joint', 'foot', 'strike', 'lean', 'load', 'free', 'dive', 'lunge', 'missing command'] as const)(
    'does not resurrect ideal-motion waiting when the forecast excludes %s', kind => {
      const f = stage(), support = f.defender.body.support!;
      if (kind === 'joint') {
        f.sim.world.joints.push({ kind: 'grasp', a: f.defender.body, b: f.sim.slot('SS')!.body,
          hold: .8, reach: 1, capacity: 200, legs: 0, pull: 0 } as GraspJoint);
      } else if (kind === 'foot') support.foot = newVirtualFoot(f.defender.pos);
      else if (kind === 'strike') support.strike = { x: .1, y: 0 };
      else if (kind === 'lean') support.lean = { x: 100, y: 0 };
      else if (kind === 'load') support.load = { x: 100, y: 0 };
      else if (kind === 'free') f.sim.intents[f.defender.idx].free = true;
      else if (kind === 'dive') f.sim.intents[f.defender.idx].dive = { x: 1, y: 0 };
      else if (kind === 'lunge') f.sim.intents[f.defender.idx].lunge = { x: 1, y: 0 };
      else delete f.sim.intents[f.defender.idx];
      f.withinReach();
      const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
      const chance = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(false);
      try {
        tackleNow(f.sim);
        expect(preview).not.toHaveBeenCalled();
        expect(f.sim.bond?.tacklers).toContain(f.defender);
      } finally { preview.mockRestore(); chance.mockRestore(); }
    });

  it('does not wait through a felt body collision for ideal future contact', () => {
    const f = stage(), peer = f.sim.slot('SS')!;
    peer.body.pos = { x: f.defender.pos.x, y: f.defender.pos.y + .3 };
    f.carrier.body.pos = { x: 60, y: CENTER_Y };
    f.sim.lastStep = f.sim.world.step(f.sim.agents.map(() => ({ vel: { x: 0, y: 0 }, free: true })), f.sim.dt);
    f.sim.t = f.sim.world.time;
    expect(f.sim.lastStep.contacts.some(c => c.i === f.defender.idx || c.j === f.defender.idx)).toBe(true);
    f.carrier.body.vel = { x: 4, y: 0 }; f.defender.body.vel = { x: 6, y: 0 };
    f.withinReach();
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    const chance = vi.spyOn(f.sim.rng, 'chance').mockReturnValue(false);
    try {
      tackleNow(f.sim);
      expect(preview).not.toHaveBeenCalled(); expect(f.sim.bond?.tacklers).toContain(f.defender);
    } finally { preview.mockRestore(); chance.mockRestore(); }
  });

  it('still waits for supported incoming contact from the actual held standing command', () => {
    const f = stage();
    f.defender.body.pos = { x: 51.4, y: CENTER_Y }; f.defender.body.vel = { x: 0, y: 0 };
    f.defender.body.facing = Math.PI;
    f.carrier.body.pos = { x: 50, y: CENTER_Y }; f.carrier.body.vel = { x: 8, y: 0 };
    f.sim.intents[f.defender.idx] = { vel: { x: 0, y: 0 }, facing: Math.PI }; f.picture();
    const chance = vi.spyOn(f.sim.rng, 'chance');
    const behavior = vi.spyOn(f.defender.behavior, 'update');
    try {
      tackleNow(f.sim);
      expect(f.sim.bond).toBeNull(); expect(f.defender.nextTackleAt).toBe(0);
      expect(chance).not.toHaveBeenCalled(); expect(behavior).not.toHaveBeenCalled();
    } finally { chance.mockRestore(); behavior.mockRestore(); }
  });
});

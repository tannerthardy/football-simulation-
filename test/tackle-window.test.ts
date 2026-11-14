import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { criticalDeviation, supportParams } from '../src/physics/support.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import { World, type GraspJoint, type Intent } from '../src/physics/world.js';
import type { Engagement } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { tryTackles } from '../src/sim/tackle.js';
import { previewTackleWindow } from '../src/sim/tackle-window.js';

function stage(side = 1, record = false) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83, record, recordLevel: 'full' });
  const c = sim.slot('Z')!, d = sim.slot('FS')!;
  c.body.pos = { x: 51.2, y: CENTER_Y - side * .6 }; c.body.vel = { x: 6, y: 0 }; c.body.facing = 0;
  d.body.pos = { x: 50, y: CENTER_Y }; d.body.vel = { x: 7, y: -side * 3 }; d.body.facing = side * -.4;
  sim.t = 2; sim.world.time = 2;
  const seen: Perceived = { pos: { ...c.pos }, vel: { ...c.vel }, stance: null, facing: 0, age: .2 };
  const command: Intent = { vel: { x: 6, y: side * 1 }, facing: .15 * side, cutSkill: .9, posture: .5 };
  const body = c.profile.radius + d.profile.radius, arms = body + d.profile.reach;
  return { sim, c, d, seen, command, body, arms };
}

function passingStage(side = 1, carrying?: boolean, record = false) {
  const setup = stage(side, record), { sim, c, d, arms } = setup;
  for (const a of sim.agents) if (a !== c && a !== d) {
    a.downUntil = 99; a.body.pos = { x: 5, y: a.idx * 2 };
  }
  const scale = (arms + .1) / Math.hypot(1.2, 1);
  c.body.pos = { x: d.pos.x + 1.2 * scale, y: d.pos.y - side * scale };
  d.body.vel = { x: 3.5, y: -side * 3 }; c.body.vel = { x: 6.5, y: -side * .5 };
  d.body.facing = Math.atan2(d.vel.y, d.vel.x);
  setup.command = { vel: { ...d.vel }, facing: d.facing };
  sim.intents[d.idx] = setup.command;
  sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
  for (let k = 0; k < 24; k++) {
    const lag = (23 - k) * sim.dt;
    sim.perception.record(sim.agents.map(a => ({ pos: {
      x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
      vel: a.vel, facing: a.facing, pose: a.pose })),
    carrying === true ? c.idx : carrying === false ? null : undefined);
  }
  return setup;
}

// Independent ordinary World execution is the contract. No separate turning,
// braking or support approximation is used to construct the expected result.
function ordinaryWindow(setup: ReturnType<typeof stage>, now = 2) {
  const { d, seen, command, body, arms } = setup;
  const predicted = structuredClone(d.body), world = new World([predicted]);
  world.time = now;
  let closest = Math.hypot(seen.pos.x - d.pos.x, seen.pos.y - d.pos.y), closestAt = 0, lastT = 0;
  const quality = (distance: number) => Math.max(0, Math.min(1,
    1 - (distance - body - .25) / Math.max(.2, arms - body - .25)));
  const currentQuality = quality(closest);
  for (let k = 0; k < 6; k++) {
    world.step([command], .05);
    if (predicted.support!.state !== 'up') break;
    const t = (k + 1) * .05;
    lastT = t;
    const distance = Math.hypot(seen.pos.x + seen.vel.x * t - predicted.pos.x,
      seen.pos.y + seen.vel.y * t - predicted.pos.y);
    if (distance < closest) { closest = distance; closestAt = t; }
  }
  return { currentQuality, futureQuality: quality(closest), closest, closestAt, reached: closestAt < lastT - 1e-9 };
}

describe('attainable tackle opportunity', () => {
  it.each([-1, 1])('takes a passing last reach without promising a standing wrap, side %s', side => {
    const { sim, c, d, body, arms, command } = passingStage(side, true, true);
    const seen = sim.see(d, c);
    const window = previewTackleWindow(d, seen, command, body, arms, sim.world.time)!;
    expect(window.closestAt).toBe(0);
    expect(window.closest).toBeGreaterThan(arms);
    expect(window.closest).toBeLessThan(arms + .45);
    const dive = vi.spyOn(sim, 'diveAt');
    const rolls = vi.spyOn(sim.rng, 'chance').mockReturnValue(false);
    try {
      tryTackles(sim);
      expect(dive).toHaveBeenCalledOnce();
      expect(sim.bond?.tacklers).toContain(d);
      const hold = sim.bond!.holds!.get(d)!;
      expect(hold.origin).toContain('lunge');
      expect(hold.capacity).toBeGreaterThan(0);
      expect(hold.capacity).toBeLessThan(supportParams(d.profile).armForce);
      // Acquisition does not claim a successful tackle or a body impact.
      expect(hold.force ?? 0).toBe(0);
      expect(sim.outcome).toBeNull();
      expect(sim.trace.data!.decisions.find(row => row.a === d.idx)?.chose).toBe('take last reach');
    } finally { dive.mockRestore(); rolls.mockRestore(); }
  });

  it.each([false, undefined])('does not upgrade a last reach before acquiring possession: %s', carrying => {
    // Passing geometry is identical; the physical selector knows the actual
    // carrier, but the new decision must not borrow that hidden possession.
    const { sim, c, d } = passingStage(1, carrying, true);
    expect(sim.see(d, c).carrying).toBe(carrying ?? null);
    const dive = vi.spyOn(sim, 'diveAt'), draw = vi.spyOn(sim.rng, 'chance');
    try {
      tryTackles(sim);
      expect(dive).not.toHaveBeenCalled();
      expect(draw).not.toHaveBeenCalled();
      expect(sim.bond).toBeNull();
      const choice = sim.trace.data!.decisions.find(row => row.a === d.idx)!;
      expect(choice.chose).toBe('keep feet moving');
      expect(choice.detail).toContain('possession unconfirmed');
    } finally { dive.mockRestore(); draw.mockRestore(); }
  });

  it.each(['ordinary', 'fatigued', 'recovering'] as const)('matches ordinary World decision samples for %s movement', (state) => {
    const setup = stage(), s = setup.d.body.support!;
    if (state === 'fatigued') { setup.d.body.energy = .2; setup.d.body.sprintLoad = 7; }
    if (state === 'recovering') { s.xi = { x: .17, y: -.11 }; s.out = .06; }
    expect(previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2))
      .toEqual(ordinaryWindow(setup));
  });

  it('uses the held achievable command rather than an ideal straight-line closest pass', () => {
    const setup = stage();
    // Momentum alone heads toward a close passing hip. The committed command
    // is braking, so continued constant velocity predicts a different window.
    setup.command = { vel: { x: 0, y: 0 }, facing: setup.d.facing, posture: .6 };
    const result = previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)!;
    expect(result).toEqual(ordinaryWindow(setup));
    const dx = setup.seen.pos.x - setup.d.pos.x, dy = setup.seen.pos.y - setup.d.pos.y;
    const vx = setup.seen.vel.x - setup.d.vel.x, vy = setup.seen.vel.y - setup.d.vel.y;
    const t = Math.max(0, Math.min(.3, -(dx * vx + dy * vy) / (vx * vx + vy * vy)));
    const ideal = Math.hypot(dx + vx * t, dy + vy * t);
    expect(Math.abs(result.closest - ideal)).toBeGreaterThan(.01);
  });

  it('keeps an escaping faster carrier as negative evidence for waiting', () => {
    const setup = stage();
    setup.d.body.vel = { x: 4, y: 0 }; setup.d.body.facing = 0;
    setup.seen = { ...setup.seen, pos: { x: 51.5, y: CENTER_Y }, vel: { x: 9, y: 0 } };
    setup.command = { vel: { x: 8, y: 0 }, facing: 0 };
    const result = previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)!;
    expect(result.closestAt).toBe(0); expect(result.futureQuality).toBe(result.currentQuality);
  });

  it('does not credit a hip that passes only between future decision samples', () => {
    const setup = stage();
    setup.d.body.vel = { x: 0, y: 0 }; setup.d.body.facing = 0;
    setup.command = { vel: { x: 0, y: 0 }, facing: 0 };
    setup.seen = { ...setup.seen, pos: { x: 50.6, y: CENTER_Y }, vel: { x: -24, y: 0 } };
    // The observed hip reaches his torso at .025 s and is already just as far
    // away at the next .05 s choice. A continuous minimum would wrongly wait.
    const result = previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)!;
    expect(result.closest).toBeCloseTo(.6, 10); expect(result.closestAt).toBe(0);
  });

  it('treats loss of support as negative forecast evidence without reverting to ideal motion', () => {
    const setup = stage(), s = setup.d.body.support!;
    const critical = criticalDeviation(supportParams(setup.d.profile), s.posture, 0, 1);
    s.xi = { x: critical * 1.1, y: 0 }; s.out = .15;
    const samples = MovementPreview.previewFreeMovement(setup.d.body, setup.command, 2, 6);
    expect(samples[0].support).not.toBe('up');
    const result = previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)!;
    expect(result).toEqual(ordinaryWindow(setup));
    expect(result.closestAt).toBe(0); expect(result.futureQuality).toBe(result.currentQuality);
  });

  it.each(['missing command', 'free', 'dive', 'lunge', 'engaged', 'scenario down', 'falling', 'down', 'rising',
    'held support', 'strike', 'lean', 'load'] as const)('excludes unsupported forecast: %s', (kind) => {
    const setup = stage(), s = setup.d.body.support!;
    let command: Intent | undefined = setup.command;
    if (kind === 'missing command') command = undefined;
    else if (kind === 'free') command = { ...setup.command, free: true };
    else if (kind === 'dive') command = { ...setup.command, dive: { x: 1, y: 0 } };
    else if (kind === 'lunge') command = { ...setup.command, lunge: { x: 1, y: 0 } };
    else if (kind === 'engaged') setup.d.engagement = {} as Engagement;
    else if (kind === 'scenario down') setup.d.downUntil = 3;
    else if (kind === 'falling' || kind === 'down' || kind === 'rising') s.state = kind;
    else if (kind === 'held support') s.foot = newVirtualFoot(setup.d.pos);
    else if (kind === 'strike') s.strike = { x: .1, y: 0 };
    else if (kind === 'lean') s.lean = { x: 1, y: 0 };
    else s.load = { x: 1, y: 0 };
    expect(previewTackleWindow(setup.d, setup.seen, command, setup.body, setup.arms, 2)).toBeNull();
  });

  it('uses only the supplied delayed observation after the unseen runner changes', () => {
    const setup = stage();
    const first = previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2);
    setup.c.body.pos = { x: 80, y: 5 }; setup.c.body.vel = { x: 0, y: -8 }; setup.c.body.facing = -Math.PI / 2;
    expect(previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)).toEqual(first);
  });

  it('does not mutate bodies, profiles, intent, perceptions or RNG; returned values do not alias the source', () => {
    const setup = stage();
    const bodies = structuredClone(setup.sim.agents.map(a => a.body));
    const perception = structuredClone(setup.sim.perception), seen = structuredClone(setup.seen);
    const command = structuredClone(setup.command), rng = JSON.stringify(setup.sim.rng);
    const draw = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const first = previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)!;
      const expected = { ...first }; first.closest += 99;
      expect(previewTackleWindow(setup.d, setup.seen, setup.command, setup.body, setup.arms, 2)).toEqual(expected);
      expect(setup.sim.agents.map(a => a.body)).toEqual(bodies);
      expect(structuredClone(setup.sim.perception)).toEqual(perception);
      expect(setup.seen).toEqual(seen); expect(setup.command).toEqual(command);
      expect(JSON.stringify(setup.sim.rng)).toBe(rng); expect(draw).not.toHaveBeenCalled();
    } finally { draw.mockRestore(); }
  });

  it('mirrors prediction and recovery without favoring a field side', () => {
    const a = stage(-1), b = stage(1);
    a.d.body.support!.xi = { x: .17, y: .1 }; b.d.body.support!.xi = { x: .17, y: -.1 };
    a.d.body.support!.out = b.d.body.support!.out = .06;
    const left = previewTackleWindow(a.d, a.seen, a.command, a.body, a.arms, 2)!;
    const right = previewTackleWindow(b.d, b.seen, b.command, b.body, b.arms, 2)!;
    for (const key of ['currentQuality', 'futureQuality', 'closest', 'closestAt'] as const)
      expect(left[key]).toBeCloseTo(right[key], 10);
  });

  it('excludes a pending upper-body grip before support registers force', () => {
    const { sim, c, d, body, arms } = stage();
    for (const a of sim.agents) if (a !== c && a !== d) {
      a.downUntil = 99; a.body.pos = { x: 5, y: a.idx * 2 };
    }
    // Contact remains physically reachable. The ownership record, not a force
    // or held-foot scalar, prevents the free forecast from running.
    c.body.pos = { x: d.pos.x + (body + arms) / 2, y: d.pos.y };
    c.body.vel = { x: 4, y: 0 }; d.body.vel = { x: 6, y: 0 }; d.body.facing = 0;
    sim.ball = { kind: 'held', carrier: c }; sim.catchAt = 0;
    sim.intents[d.idx] = { vel: { x: 6, y: 0 } };
    const other = sim.slot('NB')!;
    sim.world.joints.push({ kind: 'grasp', a: d.body, b: other.body, hold: .8, reach: 1,
      capacity: 200, legs: 0, pull: 0 } as GraspJoint);
    expect(d.body.support!.foot).toBeUndefined(); expect(d.body.support!.load).toEqual({ x: 0, y: 0 });
    const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try { tryTackles(sim); expect(preview).not.toHaveBeenCalled(); }
    finally { preview.mockRestore(); }
  });
});

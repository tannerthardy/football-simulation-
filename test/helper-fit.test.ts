import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import { supportParams } from '../src/physics/support.js';
import type { Intent, StepReport } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { axisOf, contactControl, helperSupport, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** A real two-player engagement. Bodies begin within actual hand reach;
 * profiles, first hands, support, and achieved movement remain native. */
function fixture(options: { side?: number; wrong?: boolean; type?: 'run' | 'pass'; axis?: Vec2;
  depth?: number; lateral?: number } = {}) {
  const { side = 1, wrong = true, type = 'run', axis = { x: -1, y: 0 } } = options;
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: type === 'run'
      ? { formation, flip: side > 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'helper fit' }
      : { formation, flip: side > 0, kind: 'pass', pass: PASS_BY_ID.comebacks, label: 'pass helper control' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = sim.world.time = 1;
  const owner = sim.slot('C')!, helper = sim.slot('LG')!, defender = sim.slot('DT_W')!;
  const lat = { x: -axis.y, y: axis.x };
  defender.body.pos = { x: 40.85, y: CENTER_Y };
  owner.body.pos = { x: defender.pos.x + axis.x * .85, y: defender.pos.y + axis.y * .85 };
  const depth = options.depth ?? (wrong ? -.35 : .80), lateral = options.lateral ?? .65;
  helper.body.pos = { x: defender.pos.x + axis.x * depth + lat.x * side * lateral,
    y: defender.pos.y + axis.y * depth + lat.y * side * lateral };
  owner.body.facing = helper.body.facing = Math.atan2(-axis.y, -axis.x);
  defender.body.facing = Math.atan2(axis.y, axis.x);
  sim.qb.body.pos = { x: 35, y: CENTER_Y }; sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  observe();
  const engagement = sim.engage(owner, defender, type, { x: 1, y: 0 }, { axis, sealTarget: 0 })!;
  expect(engagement).not.toBeNull();
  expect(sim.engage(helper, defender, type, { x: 1, y: 0 })).toBe(engagement);
  return { sim, owner, helper, defender, engagement, observe, side };
}

type Fixture = ReturnType<typeof fixture>;

function request(f: Fixture) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  updateEngagements(f.sim, intents);
  return intents;
}

function limits(f: Fixture, report: StepReport, dt: number) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of [f.owner, f.helper, f.defender]) {
    const i = a.idx;
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    // The World's own bound: traction of the weight on his cleats (PAD_LEVERAGE
    // adds what a man pressed down gains and removes what a lifted one loses).
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[i] + 1e-8);
  }
}

function step(f: Fixture, dt = .05) {
  const intents = request(f), report = f.sim.world.step(intents, dt);
  limits(f, report, dt);
  f.sim.t += dt;
  f.sim.perception.record(f.sim.agents);
  return { intents, report };
}

/** Existing useful-helper command is the compatibility control. It is not
 * the desired result for a helper standing beyond the defender. */
function oldHelperCommand(f: Fixture): Intent {
  const e = f.engagement, axis = axisOf(f.sim, e), lat = { x: -axis.y, y: axis.x };
  const side = Math.sign((f.helper.pos.x-f.owner.pos.x)*lat.x+(f.helper.pos.y-f.owner.pos.y)*lat.y) || e.side;
  const width = (f.owner.profile.radius+f.defender.profile.radius)*.95;
  const drive = e.type === 'run' ? { x: e.drive!.x*2.2, y: e.drive!.y*2.2 }
    : { x: -axis.x*.5, y: -axis.y*.5 };
  return { vel: { x: drive.x+(f.owner.pos.x+lat.x*width*side-f.helper.pos.x)*3,
    y: drive.y+(f.owner.pos.y+lat.y*width*side-f.helper.pos.y)*3 },
  facing: Math.atan2(f.defender.pos.y-f.helper.pos.y,f.defender.pos.x-f.helper.pos.x), push: 1, posture: .75 };
}

describe('joined helpers replace unusable feet through bounded physical movement', () => {
  it.each([-1, 1])('turns a wrong-side acquisition into actual useful contact, side %s', side => {
    const f = fixture({ side }), hand = f.engagement.helperHands!.get(f.helper)!;
    expect(helperSupport(f.sim, f.engagement, f.helper)).toBe(0);
    step(f);
    const trace: unknown[] = [];
    expect(f.engagement.helperHands!.get(f.helper)).toBe(hand);
    let usefulLoad = false, bestSupport = 0;
    for (let k = 0; k < 20 && f.helper.engagement === f.engagement; k++) {
      const { report } = step(f), support = helperSupport(f.sim, f.engagement, f.helper);
      trace.push({ t: f.sim.t, support, push: hand.push, impulse: report.armImpulse[f.helper.idx],
        pos: f.helper.pos, state: f.helper.body.support?.state });
      bestSupport = Math.max(bestSupport, support);
      usefulLoad ||= support > .10 && hand.push > 0 && report.armImpulse[f.helper.idx] > 0;
    }
    expect(bestSupport, JSON.stringify(trace)).toBeGreaterThan(.10);
    expect(usefulLoad, JSON.stringify(trace)).toBe(true);
    expect(f.helper.body.support!.state).toBe('up');
  });

  it.each([-1, 1])('preserves the ordinary initially useful helper command, side %s', side => {
    const f = fixture({ side, wrong: false });
    const expected = oldHelperCommand(f), intents = request(f);
    expect(intents[f.helper.idx]).toEqual(expected);
  });

  it('uses first hand acquisition as immediate contact evidence, then uses delayed vision on later reads', () => {
    const f = fixture({ wrong: false, depth: .5, lateral: .5 });
    const hand = f.engagement.helperHands!.get(f.helper)!;
    expect(Math.hypot(f.helper.pos.x-f.defender.pos.x, f.helper.pos.y-f.defender.pos.y))
      .toBeLessThanOrEqual(hand.extension);
    const stale = f.sim.agents.map(a => ({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing }));
    stale[f.defender.idx].pos.x = f.helper.pos.x - 1;
    for (let k = 0; k < 24; k++) f.sim.perception.record(stale);
    expect(request(f)[f.helper.idx]).toEqual(oldHelperCommand(f));
    // No World step means there is no sustained load to supply proprioception.
    // At the next decision the old picture remains the only remote body cue.
    f.sim.t += f.helper.mind.decisionInterval;
    expect(request(f)[f.helper.idx]).not.toEqual(oldHelperCommand(f));
  });

  it('does not invent immediate touch from an acquired but still extended reach', () => {
    const f = fixture({ wrong: false }), hand = f.engagement.helperHands!.get(f.helper)!;
    expect(Math.hypot(f.helper.pos.x-f.defender.pos.x, f.helper.pos.y-f.defender.pos.y))
      .toBeGreaterThan(hand.extension);
    const stale = f.sim.agents.map(a => ({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing }));
    stale[f.defender.idx].pos.x = f.helper.pos.x - 1;
    for (let k = 0; k < 24; k++) f.sim.perception.record(stale);
    expect(request(f)[f.helper.idx]).not.toEqual(oldHelperCommand(f));
  });

  it('leaves pass helper requests and their observation count unchanged', () => {
    const f = fixture({ type: 'pass', wrong: false });
    const expected = oldHelperCommand(f), see = vi.spyOn(f.sim, 'see');
    const intents = request(f);
    expect(f.engagement.type).toBe('pass');
    expect(intents[f.helper.idx]).toEqual(expected);
    expect(see.mock.calls.filter(([observer]) => observer === f.helper)).toHaveLength(0);
  });

  it('does not consume another random draw when an unusable helper needs to replace his feet', () => {
    // Match actual hand acquisition before comparing movement reads. A helper
    // still reaching at air correctly has not sampled his own punch yet.
    const useful = fixture({ wrong: false, depth: .35 }), wrong = fixture();
    expect(contactControl(useful.engagement, useful.helper)).not.toBeNull();
    expect(contactControl(useful.engagement, useful.helper))
      .toBe(contactControl(wrong.engagement, wrong.helper));
    expect(structuredClone(useful.sim.rng)).toEqual(structuredClone(wrong.sim.rng));
    request(useful); request(wrong);
    expect(structuredClone(useful.sim.rng)).toEqual(structuredClone(wrong.sim.rng));
  });

  it('keeps actual loaded hands working when an older visual picture suggests a bad surface', () => {
    const f = fixture({ wrong: false });
    const hand = f.engagement.helperHands!.get(f.helper)!;
    for (let k = 0; k < 10 && !(hand.normalForce || hand.tangentForce); k++) step(f);
    expect(Math.abs(hand.normalForce ?? 0) + Math.abs(hand.tangentForce ?? 0)).toBeGreaterThan(0);
    // Controlled stale visual input, without changing the live bodies or
    // replacing the force produced by the preceding physical solve.
    const stale = f.sim.agents.map(a => ({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing }));
    stale[f.defender.idx].pos.x = f.helper.pos.x - 1;
    for (let k = 0; k < 24; k++) f.sim.perception.record(stale);
    const expected = oldHelperCommand(f), see = vi.spyOn(f.sim, 'see');
    const before = f.sim.agents.map(a => structuredClone(a.body));
    expect(request(f)[f.helper.idx]).toEqual(expected);
    expect(see.mock.calls.filter(([a]) => a === f.helper)).toHaveLength(0);
    expect(f.engagement.helperHands!.get(f.helper)).toBe(hand);
    expect(f.sim.agents.map(a => a.body)).toEqual(before);
    step(f);
  });

  it('holds the consumed picture for a decision beat and cannot retarget from unseen current bodies', () => {
    const fixed = fixture(), unseen = fixture();
    const reads = vi.spyOn(unseen.sim, 'see');
    const initial = request(fixed)[fixed.helper.idx];
    expect(request(unseen)[unseen.helper.idx]).toEqual(initial);
    expect(reads.mock.calls.filter(([a]) => a === unseen.helper)).toHaveLength(2);
    unseen.owner.body.pos.y += .15; unseen.defender.body.pos.y += .08;
    fixed.sim.t += .01; unseen.sim.t += .01;
    expect(request(unseen)[unseen.helper.idx]).toEqual(request(fixed)[fixed.helper.idx]);
    expect(reads.mock.calls.filter(([a]) => a === unseen.helper)).toHaveLength(2);
    // Even a fresh decision cannot obtain a cue that has never been recorded.
    fixed.sim.t += fixed.helper.mind.decisionInterval;
    unseen.sim.t += unseen.helper.mind.decisionInterval;
    expect(request(unseen)[unseen.helper.idx]).toEqual(request(fixed)[fixed.helper.idx]);
    expect(reads.mock.calls.filter(([a]) => a === unseen.helper)).toHaveLength(4);
    unseen.observe();
    fixed.sim.t += fixed.helper.mind.decisionInterval;
    unseen.sim.t += unseen.helper.mind.decisionInterval;
    expect(request(unseen)[unseen.helper.idx]).not.toEqual(request(fixed)[fixed.helper.idx]);
  });

  it('uses the acquired contact surface when that surface differs from the displacement direction', () => {
    const f = fixture({ axis: { x: 0, y: -1 } });
    const old = oldHelperCommand(f), actual = request(f)[f.helper.idx];
    expect(f.engagement.drive).toEqual({ x: 1, y: 0 });
    expect(axisOf(f.sim, f.engagement)).toEqual({ x: 0, y: -1 });
    expect(actual).not.toEqual(old);
    // Replacing feet must make a real request back toward this surface,
    // rather than continuing the unrelated downfield drive.
    expect(actual.vel.y).toBeLessThan(0);
    const hand = f.engagement.helperHands!.get(f.helper)!;
    step(f);
    expect(f.engagement.helperHands!.get(f.helper)).toBe(hand);
  });

  it('does not retain a previous rep landmark after hands break and the helper acquires again', () => {
    const f = fixture();
    request(f);
    const old = f.engagement;
    f.sim.disengage(old);
    f.owner.body.pos.y += .20; f.defender.body.pos.y += .20;
    f.observe();
    const next = f.sim.engage(f.owner, f.defender, 'run', { x: 1, y: 0 })!;
    expect(next).not.toBe(old);
    expect(f.sim.engage(f.helper, f.defender, 'run', { x: 1, y: 0 })).toBe(next);
    const actual = request(f)[f.helper.idx];
    const fresh = fixture();
    fresh.sim.disengage(fresh.engagement);
    fresh.owner.body.pos.y += .20; fresh.defender.body.pos.y += .20;
    fresh.observe();
    const freshRep = fresh.sim.engage(fresh.owner, fresh.defender, 'run', { x: 1, y: 0 })!;
    expect(fresh.sim.engage(fresh.helper, fresh.defender, 'run', { x: 1, y: 0 })).toBe(freshRep);
    const expected = request(fresh)[fresh.helper.idx];
    expect(actual).toEqual(expected);
  });
});

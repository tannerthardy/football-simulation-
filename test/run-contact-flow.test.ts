import { afterEach, describe, expect, it, vi } from 'vitest';
import { contactCommands, contactFixture } from '../scripts/diag/run-contact-technique.js';
import { CENTER_Y } from '../src/core/field.js';
import { supportParams } from '../src/physics/support.js';
import type { Intent, StepReport } from '../src/physics/world.js';
import type { Agent } from '../src/sim/agent.js';
import { axisOf, contactControl, promoteContact, traits } from '../src/sim/engagement.js';
import type { Perceived } from '../src/sim/perception.js';
import type { RunFitJob } from '../src/sim/run-fits.js';

afterEach(() => vi.restoreAllMocks());

function picture(a: Agent, flow = 0): Perceived {
  return { pos: { ...a.pos }, vel: { x: 0, y: flow }, facing: a.facing, pose: 'up', stance: 'low', age: .25 };
}

/** Native hands and physical capabilities; controlled personally acquired
 * pictures isolate what the defender knows from hidden OL intentions. */
function fixture(technique: RunFitJob['technique'] = 'control', side = 1, read: 'run' | 'unsure' = 'run') {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side, seed: 11 });
  f.engagement.surfaceAxis = { x: -1, y: 0 };
  f.engagement.drive = { x: 1, y: 0 };
  f.engagement.sealTarget = 0;
  f.engagement.nextMoveAt = Infinity;
  f.defender.runFit = { gap: 'B', side, kind: 'interior', technique, edge: 'box', pace: 'stack' };
  f.defender.recog!.read = read;
  // Establish contact with a real solve, without running the policy under test.
  const warm: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  warm[f.blocker.idx] = { vel: { x: 1, y: 0 }, facing: f.blocker.facing, push: 1, posture: .85 };
  warm[f.defender.idx] = { vel: { x: 0, y: 0 }, facing: f.defender.facing, push: 1, posture: .85 };
  const report = f.sim.world.step(warm, f.sim.dt);
  expect(Math.hypot(f.engagement.hands!.normalForce ?? 0, f.engagement.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
  expect(report.armImpulse[f.blocker.idx] + report.armImpulse[f.defender.idx]).toBeGreaterThan(0);
  f.sim.t = f.sim.world.time = 1.5;
  const pictures = new Map<Agent, Perceived>([[f.blocker, picture(f.blocker)]]);
  const runner: Perceived = { pos: { x: 35, y: CENTER_Y }, vel: { x: 0, y: 0 }, facing: 0, pose: 'up', stance: null, age: .25 };
  const original = f.sim.see.bind(f.sim);
  vi.spyOn(f.sim, 'see').mockImplementation((observer, target, ...rest) => {
    if (observer === f.defender) {
      const held = pictures.get(target);
      if (held) return structuredClone(held);
      if (target === f.sim.qb || target.slot === 'RB') return { ...structuredClone(runner), carrying: target === f.sim.carrier };
    }
    return original(observer, target, ...rest);
  });
  return { ...f, side, pictures, runner };
}
type Fixture = ReturnType<typeof fixture>;
const command = (f: Fixture) => contactCommands(f)[f.defender.idx];
const bodies = (f: ReturnType<typeof contactFixture>) => f.sim.agents.map(a => structuredClone(a.body));
function nextRead(f: Fixture) { f.sim.t += f.defender.mind.decisionInterval + .01; }

function limits(f: Fixture, report: StepReport) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    const i = a.idx;
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[i] + 1e-8);
    expect([a.pos.x, a.pos.y, a.vel.x, a.vel.y, a.facing, a.body.support!.xi.x, a.body.support!.xi.y].every(Number.isFinite)).toBe(true);
  }
}
function step(f: Fixture) {
  const intents = contactCommands(f);
  f.sim.world.time = f.sim.t;
  const report = f.sim.world.step(intents, f.sim.dt);
  limits(f, report);
  f.sim.t += f.sim.dt;
  return { intents, report };
}

describe('engaged run fits follow acquired contact flow through bounded movement', () => {
  it.each(['attack', 'control', 'lag'] as const)('does not learn a private OL drive from the same loaded %s contact', technique => {
    const a = fixture(technique), b = fixture(technique);
    expect(bodies(a)).toEqual(bodies(b));
    expect(a.engagement.surfaceAxis).toEqual(b.engagement.surfaceAxis);
    b.engagement.drive = { x: .6, y: -.8 };
    expect(command(a)).toEqual(command(b));
    expect(a.sim.rng.nextU32()).toBe(b.sim.rng.nextU32());
    expect(a.defender.profile).toEqual(b.defender.profile);
  });

  it('does not turn unseen live blocker velocity into a newly acquired flow cue', () => {
    const a = fixture(), b = fixture();
    b.blocker.body.vel.y = 5;
    expect(a.pictures.get(a.blocker)).toEqual(b.pictures.get(b.blocker));
    expect(command(a)).toEqual(command(b));
    nextRead(a); nextRead(b);
    expect(command(a)).toEqual(command(b));
  });

  it('an unloaded extended first reach uses its acquired picture, without granting immediate touch of unseen blocker position', () => {
    const build = (hiddenY: number) => {
      const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, seed: 11 });
      f.sim.disengage(f.engagement);
      f.sim.t = f.sim.world.time = 1.5;
      f.defender.runFit = { gap: 'B', side: 1, kind: 'interior', technique: 'control', edge: 'box', pace: 'stack' };
      f.defender.recog!.read = 'run';
      f.blocker.body.pos = { x: f.defender.pos.x - f.blocker.profile.radius - f.defender.profile.radius - .35, y: CENTER_Y + hiddenY };
      const held: Perceived = { pos: { x: 40, y: CENTER_Y }, vel: { x: 0, y: .5 }, facing: 0, pose: 'up', stance: 'low', age: .25 };
      const original = f.sim.see.bind(f.sim);
      vi.spyOn(f.sim, 'see').mockImplementation((observer, target, ...rest) => {
        if (observer === f.defender && target === f.blocker) return structuredClone(held);
        if (observer === f.defender && (target === f.sim.qb || target.slot === 'RB'))
          return { ...structuredClone(held), pos: { x: 35, y: CENTER_Y }, vel: { x: 0, y: 0 }, carrying: target === f.sim.carrier };
        return original(observer, target, ...rest);
      });
      const engagement = f.sim.engage(f.blocker, f.defender, 'run', { x: 1, y: 0 }, { axis: { x: -1, y: 0 }, sealTarget: 0 })!;
      expect(engagement).not.toBeNull(); engagement.nextMoveAt = Infinity;
      expect(Math.hypot(f.blocker.pos.x - f.defender.pos.x, f.blocker.pos.y - f.defender.pos.y))
        .toBeGreaterThan(engagement.hands!.extension);
      expect(engagement.hands!.normalForce ?? 0).toBe(0); expect(engagement.hands!.tangentForce ?? 0).toBe(0);
      return { ...f, engagement };
    };
    const a = build(-.1), b = build(.1), beforeA = bodies(a), beforeB = bodies(b);
    expect(contactCommands(a)[a.defender.idx].vel).toEqual(contactCommands(b)[b.defender.idx].vel);
    expect(bodies(a)).toEqual(beforeA); expect(bodies(b)).toEqual(beforeB);
  });

  it('answers a changed observed flow at the next decision, holding the preceding action within the beat', () => {
    const f = fixture();
    f.pictures.get(f.blocker)!.vel.y = 1.2;
    const first = command(f);
    f.pictures.get(f.blocker)!.vel.y = -1.2;
    f.sim.t += .01;
    expect(command(f).vel).toEqual(first.vel);
    nextRead(f);
    expect(command(f).vel.y).toBeLessThan(first.vel.y);
  });

  it('holds the selected fit and its acquired flow when a runner first declares during that decision beat', () => {
    const fixed = fixture(), declared = fixture();
    for (const f of [fixed, declared]) f.pictures.get(f.blocker)!.vel.y = 1.2;
    expect(command(declared)).toEqual(command(fixed));
    declared.runner.pos = { x: 39, y: CENTER_Y - 3 };
    fixed.sim.t += .01; declared.sim.t += .01;
    expect(command(declared).vel).toEqual(command(fixed).vel);
    nextRead(fixed); nextRead(declared);
    expect(command(declared).vel.y).toBeLessThan(command(fixed).vel.y);
  });

  it('after choosing a declared runner, does not retain competing blocker-flow feedforward', () => {
    const leftFlow = fixture(), rightFlow = fixture();
    leftFlow.pictures.get(leftFlow.blocker)!.vel.y = -1.2;
    rightFlow.pictures.get(rightFlow.blocker)!.vel.y = 1.2;
    for (const f of [leftFlow, rightFlow]) f.runner.pos = { x: 39, y: CENTER_Y - .5 };
    expect(command(leftFlow)).toEqual(command(rightFlow));
  });

  it('carries its gap-side shoulder with a loaded blocker rather than a stationary formation landmark', () => {
    const f = fixture();
    const first = command(f), before = bodies(f);
    // The old remote picture stays fixed; existing hand load supplies local
    // contact position when the next foot-placement action is selected.
    f.blocker.body.pos.y += .25;
    nextRead(f);
    const requested = command(f);
    expect(requested.vel.y).toBeGreaterThan(first.vel.y);
    before[f.blocker.idx].pos.y += .25;
    expect(bodies(f)).toEqual(before);
  });

  it.each(['attack', 'control', 'lag'] as const)('mirrors the same loaded %s fit across ballY', technique => {
    const left = fixture(technique, -1), right = fixture(technique, 1);
    left.pictures.get(left.blocker)!.vel.y = -1;
    right.pictures.get(right.blocker)!.vel.y = 1;
    const a = command(left), b = command(right);
    expect(a.vel.x).toBeCloseTo(b.vel.x, 12);
    expect(a.vel.y).toBeCloseTo(-b.vel.y, 12);
    expect(a.push).toBe(b.push); expect(a.posture).toBe(b.posture);
  });

  it('keeps attack penetration distinct from control and lag without giving either stronger bodies', () => {
    const attack = fixture('attack'), control = fixture('control'), lag = fixture('lag');
    const requested = [attack, control, lag].map(command);
    expect(requested[0].vel.x).toBeLessThan(requested[1].vel.x);
    expect(requested[0].vel.x).toBeLessThan(requested[2].vel.x);
    expect(attack.capacities).toEqual(control.capacities);
    expect(control.capacities).toEqual(lag.capacities);
    for (const f of [attack, control, lag]) {
      const before = { ...f.defender.pos };
      const { report } = step(f);
      expect(report.armImpulse[f.blocker.idx] + report.armImpulse[f.defender.idx]).toBeGreaterThan(0);
      expect(Math.hypot(f.defender.pos.x - before.x, f.defender.pos.y - before.y)).toBeGreaterThan(0);
    }
  });

  it.each(['control', 'lag'] as const)('a displaced %s defender requests recovery without teleporting or acquiring an unlimited anchor', technique => {
    const f = fixture(technique);
    command(f); const remembered = f.defender.pos.x;
    f.defender.body.pos.x += .35;
    const before = bodies(f), requested = command(f);
    expect(requested.vel.x).toBeLessThan(0);
    expect(Math.abs(requested.vel.x)).toBeLessThan(f.defender.profile.vmax);
    expect(bodies(f)).toEqual(before);
    step(f);
    expect(f.defender.pos.x).toBeGreaterThan(remembered);
    expect(f.defender.engagement).toBe(f.engagement);
  });

  it('a real loaded double can displace a control defender while his recovery remains an executable finite request', () => {
    const f = fixture('control'), helper = f.sim.slot('LG')!;
    command(f); const depth = f.defender.pos.x;
    helper.body.pos = { x: f.defender.pos.x - .7, y: f.defender.pos.y + .5 };
    helper.body.vel = { x: 0, y: 0 }; helper.body.facing = f.blocker.facing;
    expect(f.sim.engage(helper, f.defender, 'run', { x: 1, y: 0 })).toBe(f.engagement);
    expect(contactControl(f.engagement, helper)).not.toBeNull();
    const profiles = f.sim.agents.map(a => structuredClone(a.profile));
    let loadedDouble = false, recovery = false, displacement = 0;
    for (let tick = 0; tick < 20 && f.defender.engagement === f.engagement; tick++) {
      const { intents } = step(f), hands = f.engagement.helperHands!.get(helper)!;
      loadedDouble ||= Math.hypot(f.engagement.hands!.normalForce ?? 0, f.engagement.hands!.tangentForce ?? 0) > 0
        && Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0) > 0;
      displacement = Math.max(displacement, f.defender.pos.x - depth);
      recovery ||= f.defender.pos.x > depth + .02 && intents[f.defender.idx].vel.x < 0;
      expect(Math.abs(intents[f.defender.idx].vel.x)).toBeLessThan(f.defender.profile.vmax);
    }
    expect(loadedDouble).toBe(true);
    expect(displacement).toBeGreaterThan(.02);
    expect(recovery).toBe(true);
    expect(f.sim.agents.map(a => a.profile)).toEqual(profiles);
  });

  it.each([-1, 1])('lags recognised lateral flow on the backside while box and spill keep their installed shoulders, side %s', side => {
    const lag = fixture('lag', side), unsure = fixture('lag', side, 'unsure');
    const box = fixture('lag', side), spill = fixture('lag', side);
    for (const f of [lag, unsure, box, spill]) f.pictures.get(f.blocker)!.vel.y = side;
    for (const f of [box, spill]) Object.assign(f.defender.runFit!, { gap: 'C', kind: 'edge' });
    spill.defender.runFit!.edge = 'spill';
    // The blocker is seen flowing at 1 yd/s. Lagging is relative to him: NFL
    // backside DL flow with the play in the first second (80% faster than
    // 0.5 yd/s toward it, 6% against it) while keeping their blocker's
    // backside shoulder (74% behind him at 1.0 s; scripts/diag/dl_lag.py).
    // Lag and spill work to the trailing shoulder, slower than the flow they
    // read; an unsure fit and a box edge go with it.
    const lagV = command(lag).vel.y * side, unsureV = command(unsure).vel.y * side;
    const boxV = command(box).vel.y * side, spillV = command(spill).vel.y * side;
    expect(lagV).toBeLessThan(1); expect(unsureV).toBeGreaterThan(1); expect(lagV).toBeLessThan(unsureV);
    expect(spillV).toBeLessThan(1); expect(boxV).toBeGreaterThan(1); expect(spillV).toBeLessThan(boxV);
    expect(box.engagement.side).toBe(-side); expect(spill.engagement.side).toBe(side);
  });

  it.each([-1, 1])('an edge plays a runner he saw flow away cutting back inside him, not one flowing at him, side %s', side => {
    const cut = fixture('control', side), front = fixture('control', side);
    for (const f of [cut, front]) {
      Object.assign(f.defender.runFit!, { gap: 'C', kind: 'edge', edge: 'box' });
      f.runner.pos = { x: 39, y: f.defender.pos.y - side * 2 };
    }
    cut.runner.vel = { x: 1, y: -side * 2 };
    front.runner.vel = { x: 1, y: side * 2 };
    command(cut); command(front);
    nextRead(cut); nextRead(front);
    cut.runner.vel = { x: 1, y: side * 2 };
    command(cut); command(front);
    expect(cut.defender.tags.has('edge-cutback')).toBe(true);
    expect(front.defender.tags.has('edge-cutback')).toBe(false);
  });

  it('promotion retains the defender\'s old depth but replaces the departing blocker\'s acquired flow', () => {
    const f = fixture('control'), keeper = f.sim.slot('LG')!;
    f.pictures.get(f.blocker)!.vel.y = 1.2;
    const old = command(f);
    keeper.body.pos = { x: f.blocker.pos.x + .08, y: f.blocker.pos.y + .05 };
    keeper.body.vel = { x: 0, y: -1.2 }; keeper.body.facing = f.blocker.facing;
    f.pictures.set(keeper, picture(keeper, -1.2));
    expect(f.sim.engage(keeper, f.defender, 'run', { x: 1, y: 0 })).toBe(f.engagement);
    expect(contactControl(f.engagement, keeper)).not.toBeNull();
    f.defender.body.pos.x += .20;
    f.sim.t += .01; // Ownership changes before the old decision beat expires.
    const before = bodies(f);
    expect(promoteContact(f.engagement, keeper)).toBe(true);
    const next = command(f);
    expect(next.vel.x).toBeLessThan(0);
    expect(next.vel.y).toBeLessThan(old.vel.y);
    expect(bodies(f)).toEqual(before);
    expect(f.engagement.hands!.a).toBe(keeper.body);
  });

  it.each(['force', 'alley', 'unassigned'] as const)('preserves the existing %s contact request and observation boundary', kind => {
    const f = fixture('control');
    if (kind === 'unassigned') f.defender.runFit = undefined;
    else f.defender.runFit!.kind = kind;
    f.engagement.drive = { x: .6, y: .8 };
    f.pictures.get(f.blocker)!.vel.y = -4;
    const requested = command(f), axis = axisOf(f.sim, f.engagement), lat = { x: -axis.y, y: axis.x };
    // Compatibility operator for jobs deliberately outside this installation.
    // It retains the old drive-relative stack request, not the new flow policy.
    const work = traits(f.defender, 'run').lateral * (.2 + .25 * f.defender.r('blockShedding'));
    expect(requested.vel).toEqual({
      x: -f.engagement.drive.x * 1.5 + lat.x * f.engagement.side * work,
      y: -f.engagement.drive.y * 1.5 + lat.y * f.engagement.side * work,
    });
    expect(f.engagement.side).toBe(kind === 'unassigned' ? f.side : -f.side);
    expect(vi.mocked(f.sim.see).mock.calls.some(([observer, target]) => observer === f.defender && target === f.blocker)).toBe(false);
    step(f);
  });

  it('keeps pass-contact commands and execution independent of the new run-fit flow policy', () => {
    const a = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, seed: 11 });
    const b = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, seed: 11 });
    for (const f of [a, b]) { f.sim.t = 1.5; f.engagement.nextMoveAt = Infinity; }
    b.defender.runFit = { gap: 'B', side: 1, kind: 'interior', technique: 'lag', edge: 'box', pace: 'stack' };
    b.engagement.drive = { x: .6, y: .8 }; b.engagement.surfaceAxis = { x: 0, y: -1 };
    const reads = vi.spyOn(b.sim, 'see');
    const before = bodies(a), first = contactCommands(a), second = contactCommands(b);
    expect(second).toEqual(first);
    expect(reads.mock.calls.some(([observer, target]) => observer === b.defender && target === b.blocker)).toBe(false);
    expect(bodies(a)).toEqual(before); expect(bodies(b)).toEqual(before);
    const ra = a.sim.world.step(first, a.sim.dt), rb = b.sim.world.step(second, b.sim.dt);
    expect(rb).toEqual(ra); expect(bodies(b)).toEqual(bodies(a));
  });
});

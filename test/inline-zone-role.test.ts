import { describe, expect, it } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { clamp, norm } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World, type Intent } from '../src/physics/world.js';
import { newSupport, supportParams } from '../src/physics/support.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { isZoneLineBlocker, playSideSign, RunBlocker, type Combination,
  type RunBlockKind, type RunBlockPlan } from '../src/sim/behaviors/blocking.js';
import { runThrough } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { installTeammateExpectations } from '../src/sim/teammate-calls.js';
import { TEAMMATE_INFORMATION_LIMITS as LIMITS, TeammateInformation,
  type TeammatePicture } from '../src/sim/teammate-information.js';

const offense = generateTeam(new Rng(31), 'Inline zone offense', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Inline zone defense', 'D', { strength: .55 });

function stage(concept = 'wz_strong', flip = false, detached = false, pass = false) {
  const formation = detached ? FORMATION_BY_ID.gun_wing_12 : FORMATION_BY_ID.ace_12;
  return new PlaySim({ offense: pickOffense(offense, '12'), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: pass ? 'pass' : 'run',
      run: pass ? undefined : RUN_BY_ID[concept], pass: pass ? PASS_BY_ID.smash : undefined,
      label: 'Inline zone role mechanism' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
}

/** A consumed opponent picture, not a claim of a fresh visual acquisition.
 * Only the TE controller runs. No simulation body is moved by this helper. */
function fixture(side = 1, kind: RunBlockKind = 'reach') {
  // Balanced Ace's strong-side tie-break survives a formation flip. Select
  // play direction explicitly for the positive-y opposing geometry.
  const sim = stage(side > 0 ? 'wz_weak' : 'wz_strong'), blocker = sim.slot('Y')!, defender = sim.slot('DE_S')!;
  const drive = norm({ x: 1, y: side * 1.8 });
  const behavior = new RunBlocker({ kind, target: defender, drive });
  blocker.behavior = behavior;
  blocker.body.pos = { x: 40, y: CENTER_Y };
  blocker.body.vel = { x: 0, y: 0 };
  blocker.body.facing = 0;
  blocker.body.support = newSupport(.3);
  const bodyContact = blocker.profile.radius + defender.profile.radius;
  const contact = bodyContact + .1 + blocker.player.measurables.armIn / 36 * .45;
  defender.body.pos = { x: 40 + contact + .1, y: CENTER_Y };
  defender.body.vel = { x: 0, y: 0 };
  let picture: Perceived = { pos: { ...defender.pos }, vel: { ...defender.vel },
    stance: 'low', facing: Math.PI, pose: 'up', age: .2 };
  sim.see = (observer, target) => {
    expect(observer).toBe(blocker); expect(target).toBe(defender);
    return structuredClone(picture);
  };
  sim.t = sim.world.time = .5;
  return { sim, blocker, defender, behavior, drive, bodyContact, contact,
    setPicture(next: Perceived) { picture = structuredClone(next); }, picture: () => structuredClone(picture) };
}

/** The old attached-TE reach request: sprint through the delayed half-man
 * landmark. Both counterfactuals start with the same real .3 posture. */
function oldRaw(f: ReturnType<typeof fixture>): Intent {
  const seen = f.picture(), error = f.blocker.mind.placementError * (1 - .5 * f.blocker.r('runBlock'));
  return runThrough(f.blocker, { x: seen.pos.x - .3,
    y: clamp(seen.pos.y + f.drive.y * .6 + error, .5, FIELD_WIDTH - .5) });
}

function execute(source: ReturnType<typeof fixture>['blocker']['body'], command: Intent, ticks = 6) {
  const body = structuredClone(source), world = new World([body]);
  world.time = .5;
  const start = { ...body.pos };
  for (let k = 0; k < ticks; k++) {
    const report = world.step([command], .05);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(report.armImpulse).toEqual([0]);
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
      .toBeLessThanOrEqual(supportParams(body.profile).traction * .05 + 1e-8);
    expect(report.supportMotorWork[0]).toBeLessThanOrEqual(report.supportMotorWorkLimit[0] + 1e-8);
  }
  return { body, dx: body.pos.x - start.x, dy: body.pos.y - start.y };
}

function available(p: TeammatePicture) {
  if (p.source === 'unavailable') throw new Error('Expected installed picture');
  return p;
}

describe('attached stretch role uses line technique through unchanged movement', () => {
  it.each([-1, 1])('gains lateral COM ground from the same opening state, side=%s', side => {
    const f = fixture(side);
    // A head-up front is an ordinary covered opening, not a guaranteed fit.
    f.defender.body.pos.x = 41.3;
    f.setPicture({ ...f.picture(), pos: { ...f.defender.pos } });
    f.sim.t = f.blocker.mind.snapDelay + .05;
    const body = structuredClone(f.blocker.body), rng = structuredClone(f.sim.rng), raw = oldRaw(f);
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(f.blocker.body).toEqual(body);
    expect(f.sim.rng).toEqual(rng);
    expect(body.support!.posture).toBe(.3);
    expect(command.posture).toBe(.7);
    expect(command.vel.y * side).toBeGreaterThan(raw.vel.y * side);
    const old = execute(body, raw), corrected = execute(body, command);
    expect(corrected.dy * side).toBeGreaterThan(old.dy * side);
    expect(corrected.dy * side).toBeGreaterThan(0);
    expect(corrected.body.support!.state).toBe('up');
    expect(f.blocker.engagement).toBeNull();
    // Posture is an ordinary finite request, never an initialization reset.
    const one = execute(body, command, 1);
    expect(one.body.support!.posture).toBeGreaterThan(.3);
    expect(one.body.support!.posture).toBeLessThan(.7);
  });

  it.each([-1, 1])('collects an acquired inward slant instead of imposing play-side travel, side=%s', side => {
    const f = fixture(side);
    // The defender has crossed the TE's inside shoulder. There is no helper
    // to manufacture a takeover, and this picture does not authorize a seal.
    f.defender.body.pos = { x: 40, y: CENTER_Y - side * (f.contact + .1) };
    f.defender.body.vel = { x: -.5, y: -side * 2 };
    f.setPicture({ ...f.picture(), pos: { ...f.defender.pos }, vel: { ...f.defender.vel } });
    const before = structuredClone(f.blocker.body);
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(f.blocker.body).toEqual(before);
    expect(f.blocker.engagement).toBeNull();
    expect(f.behavior.zoneRead?.seen.vel.y).toBe(-side * 2);
    expect(command.vel.y * side).toBeLessThanOrEqual(0);
    const result = execute(before, command, 4);
    expect(result.dy * side).toBeLessThanOrEqual(1e-10);
    expect(f.sim.world.joints).toHaveLength(0);
    expect(f.sim.events.some(e => e.type === 'block_contact')).toBe(false);
  });

  it('does not replace an active double or a foreign hand constraint with a solo zone fit', () => {
    for (const activeCombo of [true, false]) {
      const f = fixture(), helper = f.sim.slot('RT')!;
      if (activeCombo) {
        const combination: Combination = { members: [f.blocker, helper], defender: f.defender,
          backer: f.sim.slot('LB_S')!, released: false, secureSince: -1, nextRead: 1, soloKind: 'reach' };
        f.behavior.plan.combination = combination;
      } else {
        f.sim.world.joints.push({ kind: 'hands', a: f.blocker.body, b: helper.body,
          extension: 1, push: 0, hold: 0, steer: 0 });
      }
      const joints = [...f.sim.world.joints], drive = { ...f.behavior.plan.drive };
      f.behavior.update(f.blocker, f.sim);
      expect(f.behavior.zoneRead).toBeNull();
      expect(f.behavior.plan.drive).toEqual(drive);
      expect(f.sim.world.joints).toEqual(joints);
      expect(f.blocker.engagement).toBeNull();
    }
  });
});

describe('line eligibility follows the installed run role', () => {
  it.each(['drive', 'reach', 'down', 'combo', 'cutoff'] as const)('includes an attached stretch %s only', kind => {
    const sim = stage(), a = sim.slot('Y')!;
    const plan: RunBlockPlan = { kind, target: sim.slot('DE_S')!, drive: { x: 1, y: -1 } };
    expect(isZoneLineBlocker(a, sim, plan)).toBe(true);
    expect(isZoneLineBlocker(sim.slot('LT')!, sim, { ...plan, kind: 'climb' })).toBe(true);
    const inside = stage('iz_strong');
    expect(isZoneLineBlocker(inside.slot('Y')!, inside, plan)).toBe(false);
    const detached = stage('wz_strong', false, true);
    expect(isZoneLineBlocker(detached.slot('H')!, detached, plan)).toBe(false);
  });

  it.each(['pull', 'lead', 'stalk', 'climb', 'draw'] as const)('preserves the %s job rather than attaching line technique to TE identity', kind => {
    const f = fixture(1, kind);
    // Existing reserved/climb controllers own these requests, including any
    // posture they already request. Attaching the same actor must not change
    // that command or supply a new zone read/called lateral track.
    expect(isZoneLineBlocker(f.blocker, f.sim, f.behavior.plan)).toBe(false);
    const detached = fixture(1, kind);
    detached.sim.offAlign.spots.Y.inline = false;
    const original = detached.behavior.update(detached.blocker, detached.sim);
    const command = f.behavior.update(f.blocker, f.sim) as Intent;
    expect(command).toEqual(original);
    expect(f.behavior.zoneRead).toBeNull();
    expect(installTeammateExpectations(f.sim).get(f.blocker.idx)?.label).toBe('installed alignment landmark');
  });

  it('keeps detached split-zone slice and ordinary inline pass duties outside the role', () => {
    const slice = stage('split_zone', false, true), h = slice.slot('H')!;
    expect(slice.offAlign.spots.H.inline).toBe(false);
    expect(h.behavior).toBeInstanceOf(RunBlocker);
    expect(isZoneLineBlocker(h, slice, (h.behavior as RunBlocker).plan)).toBe(false);
    expect(installTeammateExpectations(slice).get(h.idx)?.label).toBe('installed alignment landmark');
    const pass = stage('wz_strong', false, false, true), y = pass.slot('Y')!;
    expect(y.behavior).not.toBeInstanceOf(RunBlocker);
    expect(y.body.support!.posture).toBe(.3);
    expect(installTeammateExpectations(pass).get(y.idx)?.label).toBe('installed alignment landmark');
  });
});

describe('installed attached-zone motion distinguishes requested speed from achieved COM', () => {
  it('starts at rest, previews ordinary nominal motion and expires on the existing clock', () => {
    const sim = stage(), a = sim.slot('RT')!, y = sim.slot('Y')!;
    const body = structuredClone(y.body), rng = structuredClone(sim.rng);
    const calls = installTeammateExpectations(sim), call = calls.get(y.idx)!;
    expect(call.label).toBe('installed nominal zone track');
    expect(y.body).toEqual(body); expect(sim.rng).toEqual(rng);
    expect(y.body.support!.posture).toBe(.3);
    const info = new TeammateInformation(sim.agents, calls);
    const zero = available(info.query(a.idx, y.idx, 0, sim.dt));
    expect(zero.pos).toEqual(sim.offAlign.spots.Y.pos);
    expect(zero.vel).toEqual({ x: 0, y: 0 });
    const first = available(info.query(a.idx, y.idx, .05, sim.dt));
    const p = playSideSign(sim, sim.offCall.run!);
    expect(first.source).toBe('called');
    expect(first.vel.y * p).toBeGreaterThan(0);
    expect(first.vel.y * p).toBeLessThan(call.velocity.y * p);
    expect((first.pos.y - call.origin.y) * p).toBeLessThan(call.velocity.y * p * .05);
    expect(first.forecast?.validFor).toBeCloseTo(LIMITS.zoneExpectation - .05);
    const nominal = structuredClone(y.body);
    nominal.pos = { ...call.origin }; nominal.vel = { x: 0, y: 0 }; nominal.facing = 0;
    nominal.energy = 1; nominal.support = newSupport(.3);
    const world = new World([nominal], { handContact: sim.world.handContact });
    world.step([{ vel: { ...call.velocity }, posture: .7 }], .05);
    expect(first.pos).toEqual(nominal.pos); expect(first.vel).toEqual(nominal.vel);
    expect(info.query(a.idx, y.idx, LIMITS.zoneExpectation, sim.dt).source).toBe('called');
    expect(info.query(a.idx, y.idx, LIMITS.zoneExpectation + .05, sim.dt)).toEqual({ source: 'unavailable' });
  });

  it('copies public installation independently of later hidden bodies, jobs, input mutation and RNG', () => {
    const sim = stage(), observer = sim.slot('RT')!, y = sim.slot('Y')!;
    const calls = installTeammateExpectations(sim), info = new TeammateInformation(sim.agents, calls);
    const expected = info.query(observer.idx, y.idx, .25, sim.dt);
    const rng = structuredClone(sim.rng);
    y.body.pos = { x: 10, y: 2 }; y.body.vel = { x: -9, y: 6 };
    y.body.facing = 2; y.body.energy = .2; y.body.support!.posture = .1;
    y.behavior = { kind: 'hidden reassignment', update: () => { throw new Error('Private controller queried'); },
      calledMotion: () => { throw new Error('Private intention queried'); } };
    const input = calls.get(y.idx)!;
    input.origin.x = 999; input.velocity.y = 999; input.until = 999;
    if (input.trajectory?.[1]) input.trajectory[1].pos.y = 999;
    expect(info.query(observer.idx, y.idx, .25, sim.dt)).toEqual(expected);
    expect(info.query(observer.idx, y.idx, .65, sim.dt)).toEqual({ source: 'unavailable' });
    expect(sim.rng).toEqual(rng);
  });

  it('does not read a partner\'s hidden lateral body position to select a stretch half', () => {
    for (const early of [true, false]) {
      const normal = fixture(1, 'combo'), hidden = fixture(1, 'combo');
      for (const f of [normal, hidden]) {
        const partner = f.sim.slot('RT')!;
        f.behavior.plan.combination = { members: [partner, f.blocker], defender: f.defender,
          backer: f.sim.slot('LB_S')!, released: false, secureSince: -1, nextRead: 1, soloKind: 'reach' };
        if (early) {
          f.sim.t = f.blocker.mind.snapDelay + .05;
          f.defender.body.pos.x = 41.3;
          f.setPicture({ ...f.picture(), pos: { ...f.defender.pos } });
        }
      }
      hidden.sim.slot('RT')!.body.pos.y = normal.blocker.pos.y + 30;
      normal.sim.slot('RT')!.body.pos.y = normal.blocker.pos.y - 30;
      expect(hidden.behavior.update(hidden.blocker, hidden.sim))
        .toEqual(normal.behavior.update(normal.blocker, normal.sim));
    }
  });
});

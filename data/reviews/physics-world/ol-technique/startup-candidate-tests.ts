import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm } from '../src/core/vec.js';
import { World, type Intent } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, readCombination, type Combination, type RunBlockKind } from '../src/sim/behaviors/blocking.js';
import { runThrough } from '../src/sim/behaviors/common.js';
import { releaseJoints } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Controller fixtures retain ordinary profiles, delayed vision and real hands. */
function stage() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'technique' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 };
    a.body.vel = { x: 0, y: 0 };
  }
  sim.t = 1;
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  return { sim, observe };
}

function shared(kind: RunBlockKind = 'reach') {
  const f = stage(), owner = f.sim.slot('C')!, helper = f.sim.slot('LG')!;
  const defender = f.sim.slot('DT_W')!, backer = f.sim.slot('LB_W')!;
  owner.body.pos = { x: 40, y: CENTER_Y - .25 };
  helper.body.pos = { x: 40, y: CENTER_Y + .25 };
  defender.body.pos = { x: 40.8, y: CENTER_Y };
  backer.body.pos = { x: 43, y: CENTER_Y + .5 };
  const combination: Combination = { members: [owner, helper], defender, backer,
    released: false, secureSince: -1, nextRead: 0 };
  const drive = norm({ x: 1, y: .6 });
  const ownerBehavior = new RunBlocker({ kind, target: defender, drive: { ...drive }, combination });
  const helperBehavior = new RunBlocker({ kind: 'combo', target: defender, climbTo: backer,
    drive: { ...drive }, combination });
  owner.behavior = ownerBehavior; helper.behavior = helperBehavior;
  f.observe();
  return { ...f, owner, helper, defender, backer, combination, ownerBehavior, helperBehavior };
}

function earnRelease(f: ReturnType<typeof shared>) {
  const e = f.sim.engage(f.helper, f.defender, 'run', { x: 1, y: 0 })!;
  expect(e).not.toBeNull();
  f.ownerBehavior.update(f.owner, f.sim);
  expect(f.owner.engagement).toBe(e);
  e.control = .8; e.baseB = .9; e.phi = 0;
  f.sim.t = 1.2; f.observe();
  readCombination(f.owner, f.sim, f.combination);
  f.sim.t += f.owner.mind.decisionInterval + .16; f.observe();
  const joints = [...f.sim.world.joints];
  readCombination(f.owner, f.sim, f.combination);
  expect(f.combination.released).toBe(true);
  expect(f.owner.tags.has('combo-climb')).toBe(true);
  expect(e.blocker).toBe(f.helper);
  return { e, joints };
}

/** An independent physical advance, not a controller teleport or contact win. */
function move(body: ReturnType<typeof stage>['sim']['agents'][number]['body'], command: Intent) {
  const copy = structuredClone(body), start = { ...copy.pos }, world = new World([copy]);
  world.time = 1;
  for (let k = 0; k < 8; k++) {
    const report = world.step([command], .05);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(report.armImpulse).toEqual([0]);
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
      .toBeLessThanOrEqual(supportParams(copy.profile).traction * .05 + 1e-8);
    expect(report.supportMotorWork[0]).toBeLessThanOrEqual(report.supportMotorWorkLimit[0] + 1e-8);
  }
  expect(copy.pos).not.toEqual(start);
  return copy;
}

describe('installed entry footwork follows the job and the observed shade', () => {
  it('steps toward the observed down-block shade rather than along the displacement vector', () => {
    const f = stage(), blocker = f.sim.slot('RG')!, defender = f.sim.slot('DT_S')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    defender.body.pos = { x: 42.2, y: CENTER_Y + .7 };
    blocker.behavior = new RunBlocker({ kind: 'down', target: defender, drive: norm({ x: 1, y: -1 }) });
    f.observe();
    // A new crossing step is not instantly visible to a lineman. The entry
    // follows the sampled positive shade even though the actual shade is left.
    defender.body.pos.y = CENTER_Y - .7;
    f.sim.perception.record(f.sim.agents);
    expect(f.sim.see(blocker, defender).pos.y).toBe(CENTER_Y + .7);
    f.sim.t = blocker.mind.snapDelay + .01;
    const command = blocker.behavior.update(blocker, f.sim) as Intent;
    expect(command.vel.x).toBeGreaterThan(0);
    expect(command.vel.y).toBeGreaterThan(0);
    expect(command.posture).toBe(.7);
    const moved = move(blocker.body, command);
    expect(moved.pos.y).toBeGreaterThan(CENTER_Y);
    expect(moved.support!.state).toBe('up');
  });

  it('closes a Duo helper inside while the covered owner gains vertical ground', () => {
    const f = shared('drive');
    f.sim.offCall.run = RUN_BY_ID.duo;
    f.ownerBehavior.plan.drive = { x: 1, y: 0 };
    f.helperBehavior.plan.drive = { x: 1, y: 0 };
    f.owner.body.pos = { x: 40, y: CENTER_Y };
    f.helper.body.pos = { x: 40, y: CENTER_Y + 1 };
    f.defender.body.pos = { x: 42, y: CENTER_Y };
    f.observe();
    f.sim.t = Math.max(f.owner.mind.snapDelay, f.helper.mind.snapDelay) + .01;
    const owner = f.ownerBehavior.update(f.owner, f.sim) as Intent;
    const helper = f.helperBehavior.update(f.helper, f.sim) as Intent;
    expect(owner.vel.x).toBeGreaterThan(0);
    expect(owner.vel.y).toBe(0);
    expect(helper.vel.x).toBeGreaterThan(0);
    expect(helper.vel.y).toBeLessThan(0);
    expect(f.combination.released).toBe(false);
    expect(move(f.helper.body, helper).pos.y).toBeLessThan(f.helper.pos.y);
  });

  it('mirrors a reach depth-and-width entry through the same World capabilities', () => {
    const reach = (side: number) => {
      const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('DT_S')!;
      f.sim.offCall.run = RUN_BY_ID.oz_strong;
      blocker.body.pos = { x: 40, y: CENTER_Y };
      defender.body.pos = { x: 41.4, y: CENTER_Y + side * 1.2 };
      blocker.behavior = new RunBlocker({ kind: 'reach', target: defender,
        drive: norm({ x: 1, y: side * 1.1 }) });
      f.observe(); f.sim.t = blocker.mind.snapDelay + .01;
      const command = blocker.behavior.update(blocker, f.sim) as Intent;
      expect(command.vel.x).toBeLessThan(0);
      expect(command.vel.y * side).toBeGreaterThan(0);
      const body = move(blocker.body, command);
      expect(body.pos.x).toBeLessThan(40);
      expect((body.pos.y - CENTER_Y) * side).toBeGreaterThan(0);
      expect(body.support!.state).toBe('up');
      return { command, body };
    };
    const right = reach(1), left = reach(-1);
    expect(right.command.vel.x).toBeCloseTo(left.command.vel.x, 10);
    expect(right.command.vel.y).toBeCloseTo(-left.command.vel.y, 10);
    expect(right.body.pos.x).toBeCloseTo(left.body.pos.x, 10);
    expect(right.body.pos.y + left.body.pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(right.body.vel.y).toBeCloseTo(-left.body.vel.y, 10);
  });

  it('responds to real nearby contact during the entry rather than finishing a scripted foot path', () => {
    const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('DT_S')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    defender.body.pos = { x: 40.8, y: CENTER_Y };
    blocker.behavior = new RunBlocker({ kind: 'drive', target: defender, drive: { x: 1, y: 0 } });
    f.observe(); f.sim.t = blocker.mind.snapDelay + .01;
    const command = blocker.behavior.update(blocker, f.sim);
    const e = blocker.engagement!;
    expect(e).not.toBeNull();
    const hands = e.hands;
    expect(command.vel).toEqual({ x: 0, y: 0 });
    expect(blocker.engagement).toBe(e);
    expect(defender.engagement).toBe(e);
    expect(f.sim.world.joints).toContain(hands);
  });

  it('leaves the entry after physically reaching its landmark before the startup bound', () => {
    const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('DT_S')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    blocker.body.vel = { x: 2, y: 0 };
    defender.body.pos = { x: 44, y: CENTER_Y };
    blocker.behavior = new RunBlocker({ kind: 'drive', target: defender, drive: { x: 1, y: 0 } });
    f.observe(); f.sim.t = blocker.mind.snapDelay + .05;
    const entry = blocker.behavior.update(blocker, f.sim) as Intent;
    const world = new World([blocker.body]);
    world.time = f.sim.t;
    // A player already gaining ground can reach his short installed step
    // early. His body advances through the solver, not by setting a waypoint.
    for (let k = 0; k < 2; k++) {
      const report = world.step([entry], .05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      expect(report.armImpulse).toEqual([0]);
      expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
        .toBeLessThanOrEqual(supportParams(blocker.profile).traction * .05 + 1e-8);
    }
    f.sim.t += .1; f.observe();
    expect(f.sim.t).toBeLessThan(blocker.mind.snapDelay + .24);
    const next = blocker.behavior.update(blocker, f.sim) as Intent;
    expect(next.vel.x).toBeGreaterThan(entry.vel.x * 2);
    expect(blocker.body.support!.state).toBe('up');
    expect(blocker.engagement).toBeNull();
  });

  it('keeps the snap response before any entry request', () => {
    const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('DT_S')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    defender.body.pos = { x: 42, y: CENTER_Y };
    blocker.behavior = new RunBlocker({ kind: 'reach', target: defender, drive: norm({ x: 1, y: 1 }) });
    f.observe(); f.sim.t = -1e-6;
    const body = structuredClone(blocker.body);
    expect(blocker.behavior.update(blocker, f.sim).vel).toEqual({ x: 0, y: 0 });
    expect(blocker.body).toEqual(body);
    expect(blocker.engagement).toBeNull();
  });
});

describe('an earned double becomes two coherent individual blocking jobs', () => {
  it.each(['drive', 'reach', 'down', 'cutoff'] as RunBlockKind[])(
    'keeps actual hands while restoring the helper keeper to %s', kind => {
      const f = shared(kind), { e, joints } = earnRelease(f);
      expect(f.helperBehavior.plan.kind).toBe(kind);
      expect(f.helperBehavior.target).toBe(f.defender);
      expect(f.ownerBehavior.plan.kind).toBe('climb');
      expect(f.ownerBehavior.target).toBe(f.backer);
      for (const b of [f.ownerBehavior, f.helperBehavior]) {
        expect(b.plan.combination).toBeUndefined();
        expect(b.plan.climbTo).toBeUndefined();
      }
      expect(f.helper.engagement).toBe(e);
      expect(f.defender.engagement).toBe(e);
      expect(f.sim.world.joints).toEqual(joints);
      expect(f.sim.events.filter(event => event.type === 'block_climb')).toHaveLength(1);
      expect(f.sim.events.some(event => event.type === 'block_abandon')).toBe(false);
      // When the real block later ends, the keeper has no former-partner
      // shoulder. It must execute the same request and movement as a solo rep.
      releaseJoints(f.sim, e);
      f.helper.engagement = null; f.defender.engagement = null;
      f.defender.body.pos = { x: 42, y: CENTER_Y + .5 }; f.observe();
      const command = f.helperBehavior.update(f.helper, f.sim) as Intent;
      const ordinary = new RunBlocker({ kind, target: f.defender, drive: { ...f.helperBehavior.plan.drive } });
      const sameCommand = ordinary.update(f.helper, f.sim) as Intent;
      expect(command).toEqual(sameCommand);
      expect(move(f.helper.body, command)).toEqual(move(f.helper.body, sameCommand));
    });

  it('classifies each later new-work approach after a teammate cancelled the old double', () => {
    const f = shared();
    f.defender.body.support!.state = 'down';
    f.observe();
    f.ownerBehavior.update(f.owner, f.sim);
    expect(f.combination.released).toBe(true);
    expect(f.helperBehavior.plan.combination).toBeUndefined();
    // The helper did not select work during its partner's read. Its own next
    // read must recognize a backer approach, rather than inherit a reach fit.
    f.helperBehavior.update(f.helper, f.sim);
    expect(f.helperBehavior.target).toBe(f.backer);
    expect(f.helperBehavior.plan.kind).toBe('climb');
    expect(f.helperBehavior.plan.drive).toEqual({ x: 1, y: 0 });
    expect(f.sim.events.some(event => event.type === 'block_climb')).toBe(false);
  });
});

describe('new work uses the depth the blocker actually saw', () => {
  it.each([
    ['DT_S', 43, 41.5, 'climb'],
    ['LB_W', 41.5, 43, 'reach'],
  ] as const)('reads %s at %s yards, despite its current location at %s', (slot, sampledX, currentX, kind) => {
    const f = stage(), blocker = f.sim.slot('C')!, old = f.sim.slot('DT_W')!, next = f.sim.slot(slot)!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    old.body.support!.state = 'down';
    next.body.pos = { x: sampledX, y: CENTER_Y };
    blocker.behavior = new RunBlocker({ kind: 'reach', target: old, drive: norm({ x: 1, y: .6 }) });
    f.observe();
    next.body.pos = { x: currentX, y: CENTER_Y };
    f.sim.perception.record(f.sim.agents);
    const seen = f.sim.see(blocker, next);
    expect(seen.age).toBeGreaterThan(0);
    expect(seen.pos.x).toBe(sampledX);
    expect(next.pos.x).not.toBe(seen.pos.x);
    const originalBody = structuredClone(blocker.body);
    const command = blocker.behavior.update(blocker, f.sim) as Intent;
    expect((blocker.behavior as RunBlocker).target).toBe(next);
    expect((blocker.behavior as RunBlocker).plan.kind).toBe(kind);
    expect(blocker.engagement).toBeNull();
    expect(blocker.body).toEqual(originalBody);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(blocker.profile.vmax + 1e-8);
  });

  it('returns from a climb to a first-level fit when newly selected work is a visible front threat', () => {
    const f = stage(), blocker = f.sim.slot('C')!, old = f.sim.slot('LB_W')!, next = f.sim.slot('DT_S')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    old.body.support!.state = 'down';
    next.body.pos = { x: 41.5, y: CENTER_Y };
    blocker.behavior = new RunBlocker({ kind: 'climb', target: old, drive: { x: 1, y: 0 } });
    f.observe();
    blocker.behavior.update(blocker, f.sim);
    expect((blocker.behavior as RunBlocker).target).toBe(next);
    expect((blocker.behavior as RunBlocker).plan.kind).toBe('drive');
  });

  it.each(['kick', 'trap'] as const)('preserves a puller\'s reserved %s job while finding replacement work', role => {
    const f = stage(), blocker = f.sim.slot('LG')!, old = f.sim.slot('DE_S')!, next = f.sim.slot('LB_W')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    old.body.support!.state = 'down';
    next.body.pos = { x: 43, y: CENTER_Y + .5 };
    const drive = norm({ x: .4, y: 1 });
    blocker.behavior = new RunBlocker({ kind: 'pull', pullRole: role, pullPath: [], target: old, drive });
    f.observe();
    blocker.behavior.update(blocker, f.sim);
    const plan = (blocker.behavior as RunBlocker).plan;
    expect(plan.target).toBe(next);
    expect(plan.kind).toBe('pull');
    expect(plan.pullRole).toBe(role);
    expect(plan.drive).toEqual(drive);
  });
});

describe('second-level footwork arrives under control through ordinary physics', () => {
  it.each(['climb', 'lead', 'wrap'] as const)('brakes a %s approach before a stationary defender', job => {
    const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('LB_W')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    blocker.body.vel = { x: 3, y: 0 };
    blocker.body.facing = 0;
    defender.body.pos = { x: 42.1, y: CENTER_Y };
    blocker.behavior = new RunBlocker(job === 'wrap'
      ? { kind: 'pull', pullRole: 'lead', pullPath: [], target: defender, drive: { x: 1, y: 0 } }
      : { kind: job, target: defender, drive: { x: 1, y: 0 } });
    f.observe();
    const physicalBefore = structuredClone(blocker.body);
    const command = blocker.behavior.update(blocker, f.sim) as Intent;
    expect(blocker.engagement).toBeNull();
    expect(blocker.body).toEqual(physicalBefore);
    expect(command.vel.x).toBeGreaterThan(0);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThan(blocker.profile.vmax);
    const seen = f.sim.see(blocker, defender);
    const error = blocker.mind.placementError * (1 - .5 * blocker.r('runBlock'));
    const sprint = runThrough(blocker, { x: seen.pos.x, y: seen.pos.y + error });
    const candidate = move(blocker.body, command), oldSprint = move(blocker.body, sprint);
    expect(candidate.pos.x).toBeLessThan(oldSprint.pos.x);
    expect(Math.hypot(candidate.vel.x, candidate.vel.y)).toBeLessThan(Math.hypot(oldSprint.vel.x, oldSprint.vel.y));
    expect(candidate.support!.state).toBe('up');
  });

  it.each([-1, 1])('tracks an observed crossing backer to side %s without snapping the body', side => {
    const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('LB_W')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    defender.body.pos = { x: 42.2, y: CENTER_Y };
    defender.body.vel = { x: 0, y: side * 2 };
    blocker.behavior = new RunBlocker({ kind: 'climb', target: defender, drive: { x: 1, y: 0 } });
    f.observe();
    const command = blocker.behavior.update(blocker, f.sim) as Intent;
    expect(command.vel.y * side).toBeGreaterThan(0);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(blocker.profile.vmax + 1e-8);
    expect(blocker.engagement).toBeNull();
    const moved = move(blocker.body, command);
    expect((moved.pos.y - CENTER_Y) * side).toBeGreaterThan(0);
    expect(moved.support!.state).toBe('up');
  });

  it('does not create hands when a delayed reachable image hides an actually remote defender', () => {
    const f = stage(), blocker = f.sim.slot('C')!, defender = f.sim.slot('LB_W')!;
    blocker.body.pos = { x: 40, y: CENTER_Y };
    defender.body.pos = { x: 41, y: CENTER_Y };
    blocker.behavior = new RunBlocker({ kind: 'climb', target: defender, drive: { x: 1, y: 0 } });
    f.observe();
    defender.body.pos.x = 45;
    f.sim.perception.record(f.sim.agents);
    expect(f.sim.see(blocker, defender).pos.x).toBe(41);
    blocker.behavior.update(blocker, f.sim);
    expect(blocker.engagement).toBeNull();
    expect(defender.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
    expect(f.sim.events.some(event => event.type === 'block_contact')).toBe(false);
  });
});

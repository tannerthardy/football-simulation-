import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm } from '../src/core/vec.js';
import { supportParams } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, readCombination, type Combination } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** A rule read in an ordinary PlaySim, with real delayed vision and contacts. */
function fixture() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'combination retarget' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const owner = sim.slot('C')!, helper = sim.slot('LG')!;
  const defender = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 10 };
    a.body.vel = { x: 0, y: 0 };
  }
  owner.body.pos = { x: 40, y: CENTER_Y - .25 };
  helper.body.pos = { x: 40, y: CENTER_Y + .25 };
  defender.body.pos = { x: 40.8, y: CENTER_Y };
  backer.body.pos = { x: 44, y: CENTER_Y + .5 };
  const combination: Combination = { members: [owner, helper], defender, backer,
    released: false, secureSince: -1, nextRead: 0 };
  const ownerBehavior = new RunBlocker({ kind: 'reach', target: defender, drive: { x: 1, y: .6 }, combination });
  const helperBehavior = new RunBlocker({ kind: 'combo', target: defender, climbTo: backer,
    drive: { x: 1, y: .6 }, combination });
  owner.behavior = ownerBehavior;
  helper.behavior = helperBehavior;
  sim.t = 1;
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  observe();
  return { sim, owner, helper, defender, backer, combination, ownerBehavior, helperBehavior, observe };
}

describe('combination responsibility after an ordinary work search', () => {
  it.each(['owner', 'helper'] as const)('ends the obsolete shared job when the %s reads first', first => {
    const f = fixture();
    f.defender.body.support!.state = 'down';
    f.observe();
    const order = first === 'owner' ? [f.owner, f.helper] : [f.helper, f.owner];
    const physicalBefore = f.sim.agents.map(a => structuredClone(a.body));
    order[0].behavior.update(order[0], f.sim);
    expect((order[0].behavior as RunBlocker).target).toBe(f.backer);
    // Cancel the shared job atomically, before the other member's next read.
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.combination === undefined).toBe(true);
    expect(f.combination.released).toBe(true);
    expect(f.helperBehavior.plan.kind).not.toBe('combo');
    expect(f.helperBehavior.plan.climbTo).toBeUndefined();
    order[1].behavior.update(order[1], f.sim);
    expect(f.ownerBehavior.target).toBe(f.backer);
    expect(f.helperBehavior.target).toBe(f.backer);
    // Finding new work is not an earned climb or a physical displacement.
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
    expect(f.owner.tags.has('combo-climb')).toBe(false);
    expect(f.helper.tags.has('combo-climb')).toBe(false);
    expect(f.sim.agents.map(a => a.body)).toEqual(physicalBefore);
  });

  it.each(['owner', 'helper'] as const)('cancels stale ownership even if the %s finds no available defender', first => {
    const f = fixture();
    f.defender.body.support!.state = 'down';
    f.backer.body.pos.x = 60;
    f.observe();
    const a = first === 'owner' ? f.owner : f.helper;
    a.behavior.update(a, f.sim);
    expect((a.behavior as RunBlocker).target).toBeNull();
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.kind).not.toBe('combo');
    expect(f.combination.released).toBe(true);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it('keeps a valid unengaged double when the original defender is still available', () => {
    const f = fixture();
    f.defender.body.pos.x = 42;
    f.observe();
    f.ownerBehavior.update(f.owner, f.sim);
    f.helperBehavior.update(f.helper, f.sim);
    expect(f.ownerBehavior.target).toBe(f.defender);
    expect(f.helperBehavior.target).toBe(f.defender);
    expect(f.ownerBehavior.plan.combination).toBe(f.combination);
    expect(f.helperBehavior.plan.combination).toBe(f.combination);
    expect(f.combination.released).toBe(false);
    expect(f.helperBehavior.plan.kind).toBe('combo');
  });

  it.each(['owner', 'helper'] as const)('preserves the actual live double when the %s makes first contact', first => {
    const f = fixture(), a = first === 'owner' ? f.owner : f.helper;
    const other = first === 'owner' ? f.helper : f.owner;
    const e = f.sim.engage(a, f.defender, 'run', { x: 1, y: .6 })!;
    expect(e).not.toBeNull();
    other.behavior.update(other, f.sim);
    expect(other.engagement).toBe(e);
    const joints = [...f.sim.world.joints];
    a.behavior.update(a, f.sim);
    expect(f.owner.engagement).toBe(e);
    expect(f.helper.engagement).toBe(e);
    expect(f.defender.engagement).toBe(e);
    expect(f.combination.released).toBe(false);
    expect(f.ownerBehavior.plan.combination).toBe(f.combination);
    expect(f.helperBehavior.plan.combination).toBe(f.combination);
    expect(f.sim.world.joints).toEqual(joints);
  });

  it('leaves an outsider\'s actual block intact while abandoning the obsolete assignment', () => {
    const f = fixture(), outsider = f.sim.slot('RG')!;
    outsider.body.pos = { x: 40, y: CENTER_Y };
    const e = f.sim.engage(outsider, f.defender, 'run', { x: 1, y: 0 })!;
    f.observe();
    f.ownerBehavior.update(f.owner, f.sim);
    expect(f.ownerBehavior.target).toBe(f.backer);
    expect(f.combination.released).toBe(true);
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.combination === undefined).toBe(true);
    expect(outsider.engagement).toBe(e);
    expect(f.defender.engagement).toBe(e);
    expect(e.blocker).toBe(outsider);
    expect(e.helpers).toEqual([]);
    expect(f.owner.engagement).toBeNull();
  });

  it('does not erase a newer combination assigned to the former partner', () => {
    const f = fixture(), newOwner = f.sim.slot('RG')!, newDefender = f.sim.slot('DT_S')!;
    const replacement: Combination = { members: [newOwner, f.helper], defender: newDefender,
      backer: f.backer, released: false, secureSince: -1, nextRead: 0 };
    const replacementBehavior = new RunBlocker({ kind: 'combo', target: newDefender,
      drive: { x: 1, y: 0 }, combination: replacement });
    f.helper.behavior = replacementBehavior;
    f.defender.body.support!.state = 'down';
    f.observe();
    f.ownerBehavior.update(f.owner, f.sim);
    expect(f.ownerBehavior.target).toBe(f.backer);
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.combination.released).toBe(true);
    expect(replacementBehavior.plan.combination).toBe(replacement);
    expect(replacementBehavior.plan.kind).toBe('combo');
    expect(replacementBehavior.target).toBe(newDefender);
    expect(replacement.released).toBe(false);
  });

  it('preserves a real earned climb and the remaining blocker\'s contact', () => {
    const f = fixture();
    f.backer.body.pos = { x: 43, y: CENTER_Y + .5 };
    const e = f.sim.engage(f.helper, f.defender, 'run', { x: 1, y: 0 })!;
    f.ownerBehavior.update(f.owner, f.sim);
    e.control = .8; e.baseB = .9; e.phi = 0;
    f.sim.t = 1.2;
    f.observe();
    readCombination(f.owner, f.sim, f.combination);
    f.sim.t = 1.2 + f.owner.mind.decisionInterval + .16;
    f.observe();
    readCombination(f.owner, f.sim, f.combination);
    expect(f.combination.released).toBe(true);
    const climber = [f.owner, f.helper].find(a => a.engagement === null)!;
    const keeper = climber === f.owner ? f.helper : f.owner;
    const behavior = climber.behavior as RunBlocker;
    expect(behavior.plan.kind).toBe('climb');
    expect(behavior.target).toBe(f.backer);
    const joints = [...f.sim.world.joints];
    behavior.update(climber, f.sim);
    expect(behavior.plan.kind).toBe('climb');
    expect(behavior.target).toBe(f.backer);
    expect(climber.tags.has('combo-climb')).toBe(true);
    expect(keeper.engagement).toBe(e);
    expect(f.defender.engagement).toBe(e);
    expect(f.sim.events.filter(event => event.type === 'block_climb')).toHaveLength(1);
    expect(f.sim.world.joints).toEqual(joints);
  });

  it('preserves shared responsibility between work reads and cancels on the actual retarget', () => {
    const f = fixture();
    f.defender.body.pos.x = 42;
    f.ownerBehavior.plan.target = null;
    f.observe();
    f.ownerBehavior.update(f.owner, f.sim);
    expect(f.ownerBehavior.target).toBe(f.defender);
    expect(f.ownerBehavior.plan.combination).toBe(f.combination);
    f.defender.body.support!.state = 'down';
    f.sim.t += .5 * f.owner.mind.decisionInterval;
    f.observe();
    f.ownerBehavior.update(f.owner, f.sim);
    expect(f.ownerBehavior.target).toBe(f.defender);
    expect(f.combination.released).toBe(false);
    expect(f.helperBehavior.plan.kind).toBe('combo');
    f.sim.t += f.owner.mind.decisionInterval;
    f.ownerBehavior.update(f.owner, f.sim);
    expect(f.ownerBehavior.target).toBe(f.backer);
    expect(f.combination.released).toBe(true);
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.combination === undefined).toBe(true);
  });

  it('collects penetration without leaving the former helper technique or awarding a climb', () => {
    const f = fixture(), threat = f.sim.slot('DT_S')!;
    threat.body.pos = { x: 39.6, y: f.helper.pos.y };
    f.observe();
    f.helperBehavior.update(f.helper, f.sim);
    expect(f.helperBehavior.target).toBe(threat);
    expect(f.helperBehavior.plan.kind).toBe('drive');
    expect(f.combination.released).toBe(true);
    expect(f.helperBehavior.plan.combination === undefined).toBe(true);
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.climbTo).toBeUndefined();
    expect(f.ownerBehavior.plan.kind).toBe('reach');
    expect(f.ownerBehavior.target).toBe(f.defender);
    expect(f.sim.events.some(e => e.type === 'block_collect')).toBe(true);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it('keeps the covered partner\'s real contact when the helper collects another penetrating defender', () => {
    const f = fixture(), threat = f.sim.slot('DT_S')!;
    const e = f.sim.engage(f.owner, f.defender, 'run', { x: 1, y: .6 })!;
    expect(e).not.toBeNull();
    const hands = e.hands!, before = structuredClone(hands);
    const control = { control: e.control, phi: e.phi, baseB: e.baseB, baseD: e.baseD };
    threat.body.pos = { x: 39.6, y: f.helper.pos.y };
    f.observe();
    f.helperBehavior.update(f.helper, f.sim);
    expect(f.helperBehavior.target).toBe(threat);
    expect(f.helperBehavior.plan.kind).toBe('drive');
    expect(f.combination.released).toBe(true);
    expect(f.ownerBehavior.plan.combination === undefined).toBe(true);
    expect(f.helperBehavior.plan.combination === undefined).toBe(true);
    expect(f.ownerBehavior.target).toBe(f.defender);
    expect(f.ownerBehavior.plan.kind).toBe('reach');
    expect(f.owner.engagement).toBe(e);
    expect(f.defender.engagement).toBe(e);
    expect(e.blocker).toBe(f.owner);
    expect(e.defender).toBe(f.defender);
    expect(e.helpers).toEqual([]);
    expect(e.hands).toBe(hands);
    expect(f.sim.world.joints).toContain(hands);
    expect(hands).toEqual(before);
    expect({ control: e.control, phi: e.phi, baseB: e.baseB, baseD: e.baseD }).toEqual(control);
    const command = f.ownerBehavior.update(f.owner, f.sim);
    expect(command.vel).toEqual({ x: 0, y: 0 });
    expect(f.owner.engagement).toBe(e);
    expect(f.defender.engagement).toBe(e);
    expect(e.hands).toBe(hands);
    expect(f.sim.world.joints).toContain(hands);
    expect(hands).toEqual(before);
    expect(f.sim.events.some(event => event.type === 'block_climb')).toBe(false);
    expect(f.owner.tags.has('combo-climb')).toBe(false);
    expect(f.helper.tags.has('combo-climb')).toBe(false);
  });

  it.each([
    ['owner', 'reach'], ['helper', 'reach'], ['owner', 'down'], ['helper', 'down'],
  ] as const)('restores the %s\'s standalone %s fit and actual bounded movement', (member, technique) => {
    const stage = (shared: boolean) => {
      const f = fixture(), a = member === 'owner' ? f.owner : f.helper;
      const newDefender = f.sim.slot('DT_S')!, drive = norm({ x: 1, y: 1.8 });
      f.defender.body.support!.state = 'down';
      f.backer.body.pos.x = 60;
      newDefender.body.pos = { x: 42, y: CENTER_Y + 1.1 };
      f.ownerBehavior.plan.kind = technique;
      f.ownerBehavior.plan.drive = { ...drive };
      f.helperBehavior.plan.drive = { ...drive };
      if (!shared) a.behavior = new RunBlocker({ kind: technique, target: newDefender, drive });
      f.observe();
      const command = a.behavior.update(a, f.sim) as Intent;
      expect((a.behavior as RunBlocker).target).toBe(newDefender);
      expect((a.behavior as RunBlocker).plan.kind).toBe(technique);
      const body = structuredClone(a.body), before = { ...body.pos }, world = new World([body]);
      world.time = f.sim.t;
      for (let k = 0; k < 8; k++) {
        const report = world.step([command], .05);
        expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
        expect(report.armImpulse).toEqual([0]);
        expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
          .toBeLessThanOrEqual(report.groundImpulseLimit[0] + 1e-8);
      }
      expect(body.pos.x).toBeGreaterThan(before.x);
      expect(body.support!.state).toBe('up');
      return { command, body };
    };
    // The cancelled partnership must not alter the shoulder landmark,
    // acceleration, traction, or posture of the same standalone technique.
    expect(stage(true)).toEqual(stage(false));
  });
});

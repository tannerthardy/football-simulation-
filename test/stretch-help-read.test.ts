import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { newSupport } from '../src/physics/support.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import type { HandJoint, Intent } from '../src/physics/world.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { stretchHelpOpportunity, type StretchHelpPicture } from '../src/sim/stretch-help.js';

const packet = JSON.parse(readFileSync(new URL('../data/reviews/current/stretch-help-state.json', import.meta.url), 'utf8'));
type Fixture = typeof packet.cases[number];

function picture(f: Fixture): StretchHelpPicture {
  return { pos: { ...f.ownBody.pos }, radius: f.ownBody.profile.radius, homeY: f.homeY,
    playSide: f.playSide, side: f.side, owner: structuredClone(f.teammates[f.owner.idx]),
    ownerRadius: f.owner.radius, ownerReach: f.owner.reach,
    down: structuredClone(f.perceived[f.defender.idx]), defenderRadius: f.defender.radius, horizon: .3 };
}
function mirror(p: StretchHelpPicture): StretchHelpPicture {
  const reflect = (v: { x: number; y: number }) => ({ x: v.x, y: -v.y });
  const owner = p.owner;
  if (owner.source === 'unavailable') throw new Error('Mirror needs an acquired owner');
  return { ...p, pos: reflect(p.pos), homeY: -p.homeY, playSide: -p.playSide, side: -p.side,
    owner: { ...owner, pos: reflect(owner.pos), vel: reflect(owner.vel) },
    down: { pos: reflect(p.down.pos), vel: reflect(p.down.vel) } };
}

/** A controller fixture, not a native late restart. Only the helper updates.
 * Existing assignment scans are parked so unknown private engagement ledgers
 * cannot manufacture new perceptions. The independent helper read is due.
 */
function stage(source: Fixture) {
  const f = structuredClone(source), formation = FORMATION_BY_ID.ace_12;
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), '12'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: f.input.flip, kind: 'run', run: RUN_BY_ID.wz_strong, label: f.id },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'saved Over' },
    los: 40, ballY: 26.666666666666668, firstDownX: 50, seed: 3,
  });
  sim.t = sim.world.time = f.entry;
  const helper = sim.agents[packet.actor.idx], owner = sim.agents[f.owner.idx];
  const defender = sim.agents[f.defender.idx], backer = sim.agents[f.backer.idx];
  helper.body = structuredClone(f.ownBody); helper.body.support!.since = -Infinity;
  const combo: Combination = { members: [owner, helper], defender, backer, released: false,
    secureSince: -1, nextRead: f.entry + 1, soloKind: 'reach',
    stretchHelp: { homeY: f.homeY, side: f.side }, stretchNextRead: f.entry };
  owner.behavior = new RunBlocker({ kind: 'reach', target: defender, drive: { ...f.drive }, combination: combo });
  const behavior = new RunBlocker({ kind: 'combo', target: defender, climbTo: backer,
    drive: { ...f.drive }, combination: combo });
  helper.behavior = behavior;
  for (const [key, value] of Object.entries(f.ownBehaviorBefore)) Reflect.set(behavior, key, structuredClone(value));
  Reflect.set(behavior, 'nextRuleRead', Infinity);
  const queries: string[] = [];
  sim.see = (observer, target) => {
    expect(observer).toBe(helper);
    const seen = f.perceived[target.idx];
    if (!seen) throw new Error(`No acquired fixture picture for ${target.slot}`);
    queries.push(`seen:${target.idx}`);
    return structuredClone(seen);
  };
  sim.teammateInformation = (observer, target) => {
    expect(observer).toBe(helper);
    const seen = f.teammates[target.idx];
    if (!seen) throw new Error(`No acquired teammate fixture picture for ${target.slot}`);
    queries.push(`teammate:${target.idx}`);
    return structuredClone(seen);
  };
  return { f, sim, helper, owner, defender, backer, combo, behavior, queries };
}

describe('the acquired outside-zone near-gap read', () => {
  it.each(packet.cases)('$id recognizes the saved away-moving surface after actual own progress', (f: Fixture) => {
    const p = picture(f), before = structuredClone(p);
    expect(stretchHelpOpportunity(p)).toBe(true);
    expect(stretchHelpOpportunity(mirror(p))).toBe(true);
    expect(p).toEqual(before);
  });

  it.each(packet.cases)('$id keeps an into-helper-gap slant in both physical directions', (f: Fixture) => {
    const p = picture(f);
    p.down.vel.y = -p.down.vel.y;
    expect(stretchHelpOpportunity(p)).toBe(false);
    expect(stretchHelpOpportunity(mirror(p))).toBe(false);
  });

  it.each(['unavailable', 'called', 'stale', 'no own progress', 'stationary knee', 'owner gone'] as const)(
    'does not infer an opportunity from %s', kind => {
      const p = picture(packet.cases[0]);
      if (kind === 'unavailable') p.owner = { source: 'unavailable' };
      if (kind === 'called' && p.owner.source !== 'unavailable') p.owner = { ...p.owner, source: 'called', label: 'alignment only' };
      if (kind === 'stale' && p.owner.source !== 'unavailable') p.owner.age = 1.01;
      if (kind === 'no own progress') p.pos.y = p.homeY;
      if (kind === 'stationary knee') p.down.vel = { x: 0, y: 0 };
      if (kind === 'owner gone' && p.owner.source !== 'unavailable') p.owner.pos.x -= 4;
      expect(stretchHelpOpportunity(p)).toBe(false);
    });
});

describe('the helper executes his own conditional stretch read', () => {
  it.each(packet.cases)('$id changes only his unjoined job after the saved .75s read', (source: Fixture) => {
    const s = stage(source), before = structuredClone(s.helper.body), ownerBefore = structuredClone(s.owner.body);
    const ownerBehavior = s.owner.behavior as RunBlocker, ownerPlan = ownerBehavior.plan;
    const rng = structuredClone(s.sim.rng), inputs = structuredClone({ perceived: s.f.perceived, teammates: s.f.teammates });
    const hands: HandJoint = { kind: 'hands', a: s.owner.body, b: s.defender.body,
      extension: .9, push: 300, hold: 20, steer: 100, normalForce: 10, tangentForce: 5 };
    s.sim.world.joints.push(hands);
    const jointBefore = structuredClone(hands);
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    const previews = vi.spyOn(MovementPreview, 'previewFreeMovement');
    try {
      const command = s.behavior.update(s.helper, s.sim);
      expect(s.behavior.plan.kind).toBe('climb');
      expect(s.behavior.plan.target).toBe(s.backer);
      expect(s.behavior.plan.combination).toBeUndefined();
      expect(s.combo.released).toBe(false);
      expect(s.owner.behavior).toBe(ownerBehavior);
      expect(ownerBehavior.plan).toBe(ownerPlan);
      expect(ownerPlan.target).toBe(s.defender);
      expect(ownerPlan.combination).toBe(s.combo);
      expect(s.helper.tags.has('combo-stretch-climb')).toBe(true);
      expect(s.sim.events.some(e => e.type === 'block_climb' && e.a === s.helper.idx && e.b === s.backer.idx)).toBe(true);
      expect(Number.isFinite(Math.hypot(command.vel.x, command.vel.y))).toBe(true);
      const lastOwnPreview = previews.mock.calls.filter(([body]) => body === s.helper.body).at(-1);
      expect(lastOwnPreview?.[1]).toEqual(command);
      expect(s.helper.engagement).toBeNull();
      expect(s.helper.body).toEqual(before);
      expect(s.owner.body).toEqual(ownerBefore);
      expect(hands).toEqual(jointBefore);
      expect(s.sim.world.joints).toContain(hands);
      expect({ perceived: s.f.perceived, teammates: s.f.teammates }).toEqual(inputs);
      expect(structuredClone(s.sim.rng)).toEqual(rng);
      expect(draws).not.toHaveBeenCalled();
    } finally { draws.mockRestore(); previews.mockRestore(); }
  });

  it.each(packet.cases)('$id waits when an acquired teammate obstructs the achievable departure', (source: Fixture) => {
    const s = stage(source);
    s.f.teammates[5] = { ...s.f.teammates[5], source: 'observed',
      pos: { x: 40.45, y: 23.1 }, vel: { x: 0, y: 0 } };
    s.behavior.update(s.helper, s.sim);
    expect(s.combo.released).toBe(false);
    expect(s.behavior.plan.kind).toBe('combo');
    expect(s.helper.tags.has('combo-stretch-climb')).toBe(false);
  });

  it('reads a backer scraping across the play side rather than requiring a fixed arrival distance', () => {
    const s = stage(packet.cases[0]);
    s.f.perceived[s.backer.idx] = { ...s.f.perceived[s.backer.idx],
      pos: { x: 45, y: 25 }, vel: { x: 0, y: -3 } };
    s.behavior.update(s.helper, s.sim);
    expect(s.behavior.plan.kind).toBe('climb');
    expect(s.behavior.plan.combination).toBeUndefined();
    expect(s.combo.released).toBe(false);
    expect(s.behavior.plan.target).toBe(s.backer);
  });

  it('keeps near-level work when the acquired backer is distant and moving away from the play', () => {
    const s = stage(packet.cases[0]);
    s.f.perceived[s.backer.idx] = { ...s.f.perceived[s.backer.idx],
      pos: { x: 48, y: 27 }, vel: { x: 1, y: 2 } };
    s.behavior.update(s.helper, s.sim);
    expect(s.combo.released).toBe(false);
    expect(s.behavior.plan.kind).toBe('combo');
  });

  it.each(['own joint', 'own load', 'own foot'] as const)('does not call an unjoined departure with %s', kind => {
    const s = stage(packet.cases[0]);
    if (kind === 'own joint') s.sim.world.joints.push({ kind: 'grasp', a: s.owner.body,
      b: s.helper.body, reach: 1, capacity: 200, legs: .4, hold: .8 });
    if (kind === 'own load') s.helper.body.support!.load = { x: 100, y: 0 };
    if (kind === 'own foot') s.helper.body.support!.foot = newVirtualFoot(s.helper.pos);
    s.behavior.update(s.helper, s.sim);
    expect(s.combo.released).toBe(false);
    expect(s.behavior.plan.kind).toBe('combo');
  });

  it('ignores hidden owner/defender state while preserving copied pictures, query history and randomness', () => {
    const run = (hidden: boolean) => {
      const s = stage(packet.cases[0]);
      if (hidden) {
        for (const a of [s.owner, s.defender]) {
          a.body.pos = { x: 80, y: 3 }; a.body.vel = { x: 9, y: -9 }; a.body.facing = 2;
          a.body.energy = .01; a.body.support = newSupport(); a.body.support.state = 'down';
          a.body.support.lean = { x: 1000, y: -1000 };
          a.behavior = { kind: 'hidden changed job', update: () => ({ vel: { x: 0, y: 0 } }) };
          a.engagement = { control: -100, hands: { normalForce: 100000, tangentForce: -100000 } } as never;
        }
      }
      const rng = structuredClone(s.sim.rng), body = structuredClone(s.helper.body);
      const command: Intent = s.behavior.update(s.helper, s.sim);
      expect(s.helper.body).toEqual(body);
      expect(structuredClone(s.sim.rng)).toEqual(rng);
      return { command, queries: s.queries, kind: s.behavior.plan.kind,
        target: s.behavior.plan.target?.idx, released: s.combo.released };
    };
    expect(run(true)).toEqual(run(false));
  });
});

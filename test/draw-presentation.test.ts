import { describe, vi, expect, it } from 'vitest';
// FRONT_ALIGN moves the front off its installed spots; this scene is staged on them.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Intent } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { RunConcept } from '../src/playbook/types.js';
import { prepareJoinedCombinations, RunBlocker } from '../src/sim/behaviors/blocking.js';
import { goTo } from '../src/sim/behaviors/common.js';
import { updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

function setup(flip = false, run: RunConcept = RUN_BY_ID.draw) {
  const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
  const formation = FORMATION_BY_ID[run.scheme === 'splitZone' ? 'gun_wing_12' : 'gun_doubles_11'];
  return new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run, label: 'presentation' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
}

function observe(sim: PlaySim, n = 24) {
  for (let k = 0; k < n; k++) sim.perception.record(sim.agents);
}

function local(flip = true) {
  const sim = setup(flip), blocker = sim.slot('C')!, backer = sim.slot('LB_M')!, intruder = sim.slot('DT_S')!;
  const behavior = blocker.behavior as RunBlocker;
  expect(behavior.plan.kind).toBe('climb');
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx * 3, y: 3 };
    a.body.vel = { x: 0, y: 0 };
  }
  blocker.body.pos = { x: 39.1, y: CENTER_Y };
  backer.body.pos = { x: 45, y: CENTER_Y };
  behavior.plan.target = backer;
  sim.t = .4; sim.world.time = .4;
  return { sim, blocker, behavior, backer, intruder };
}

describe('Draw presentation belongs to the installed line, separately from its work', () => {
  it.each([false, true])('keeps the native helper/climber in pass presentation, flip %s', flip => {
    const sim = setup(flip);
    sim.t = .05;
    const helpers = sim.offense.filter(a => a.behavior instanceof RunBlocker && ['combo', 'climb'].includes(a.behavior.plan.kind));
    expect(helpers.length).toBeGreaterThan(0);
    for (const a of helpers) {
      const behavior = a.behavior as RunBlocker, kind = behavior.plan.kind, target = behavior.target;
      const before = structuredClone(a.body);
      const command = behavior.update(a, sim);
      expect(a.stance).toBe('high');
      expect(command.vel.x).toBeLessThan(0);
      expect(command.posture).toBeUndefined();
      expect(behavior.plan.kind).toBe(kind);
      expect(behavior.target).toBe(target);
      expect(a.engagement).toBeNull();
      expect(a.body).toEqual(before);
    }
  });

  it.each([false, true].flatMap(flip => (['draw', 'qbDraw'] as const).map(scheme => ({ flip, scheme }))))(
    'preserves work through $scheme presentation then executes it, flip $flip', ({ flip, scheme }) => {
      const sim = setup(flip, scheme === 'draw' ? RUN_BY_ID.draw : { ...RUN_BY_ID.draw, id: 'test-qb-draw', scheme });
      const helper = sim.slot('LG')!, behavior = helper.behavior as RunBlocker;
      const originalKind = behavior.plan.kind, originalTarget = behavior.target;
      sim.t = .5;
      behavior.update(helper, sim);
      expect(helper.stance).toBe('high');
      expect(behavior.plan.kind).toBe(originalKind);
      expect(behavior.target).toBe(originalTarget);
      sim.t = 1;
      const body = structuredClone(helper.body), command = behavior.update(helper, sim);
      expect(helper.stance).toBe('low');
      expect(command.vel.x).toBeGreaterThan(0);
      expect(behavior.target).toBe(originalTarget);
      expect(helper.body).toEqual(body);
    });

  it.each([false, true].flatMap(flip => [.05, .5, .99].map(t => ({ flip, t }))))(
    'retains every existing covered-owner request at $t, flip $flip', ({ flip, t }) => {
      const sim = setup(flip); sim.t = t;
      const owners = sim.offense.filter(a => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'draw');
      expect(owners.length).toBeGreaterThan(0);
      for (const a of owners) {
        const expected = goTo(a, { x: sim.los - 1.2, y: a.pos.y }, { speed: .6, facing: 0 });
        expect(a.behavior.update(a, sim)).toEqual(expected);
        expect(a.stance).toBe('high');
      }
    });

  it.each(['iz_strong', 'oz_strong', 'wz_strong', 'duo', 'power', 'counter', 'trap', 'split_zone'])(
    'does not install a Draw delay on %s', run => {
      const sim = setup(false, RUN_BY_ID[run]), center = sim.slot('C')!, behavior = center.behavior as RunBlocker;
      expect(behavior.plan.presentation).toBeUndefined();
      sim.t = .15;
      const command = behavior.update(center, sim);
      expect(center.stance).toBe('low');
      expect(command.vel.x).toBeGreaterThan(0);
      expect(command.posture).toBe(.7);
    });

  it.each([false, true])('retains presentation after losing the original double, flip %s', flip => {
    const sim = setup(flip), helper = sim.slot('LG')!, behavior = helper.behavior as RunBlocker;
    const combo = behavior.plan.combination!;
    expect(combo).toBeDefined();
    for (const a of sim.agents) a.body.pos = { x: 75 + a.idx * 3, y: 3 };
    helper.body.pos = { x: 39.4, y: CENTER_Y };
    combo.defender.body.support!.state = 'down';
    combo.backer!.body.pos = { x: 43, y: CENTER_Y };
    observe(sim); sim.t = .5;
    const command = behavior.update(helper, sim);
    expect(combo.released).toBe(true);
    expect(behavior.plan.combination).toBeUndefined();
    expect(behavior.plan.target).toBe(combo.backer);
    expect(helper.stance).toBe('high');
    expect(command.vel.x).toBeLessThan(0);
    expect(helper.engagement).toBeNull();
  });

  it('keeps secured hands through the presentation instead of climbing early', () => {
    const sim = setup(false), owner = sim.slot('C')!, helper = sim.slot('LG')!;
    const combo = (helper.behavior as RunBlocker).plan.combination!;
    for (const a of sim.agents) a.body.pos = { x: 75 + a.idx * 3, y: 3 };
    owner.body.pos = { x: 39.1, y: CENTER_Y - .25 };
    helper.body.pos = { x: 39.1, y: CENTER_Y + .25 };
    combo.defender.body.pos = { x: 39.7, y: CENTER_Y };
    combo.backer!.body.pos = { x: 42, y: CENTER_Y + .25 };
    sim.t = .4; observe(sim);
    const engagement = sim.engage(owner, combo.defender, 'run', { x: 1, y: 0 })!;
    expect(engagement).not.toBeNull();
    expect(sim.engage(helper, combo.defender, 'run', { x: 1, y: 0 })).toBe(engagement);
    // Hold an independently qualified secured geometry; do not require the
    // engine to grant a physical win while testing the installed departure.
    engagement.control = .8; engagement.baseB = .9; engagement.phi = 0;
    const joints = [...sim.world.joints];
    for (const t of [.4, .7, .95]) {
      sim.t = t; observe(sim); prepareJoinedCombinations(sim);
      helper.behavior.update(helper, sim);
      expect(combo.released).toBe(false);
      expect(helper.engagement).toBe(engagement);
      expect(owner.engagement).toBe(engagement);
      expect(sim.world.joints).toEqual(joints);
      expect(helper.tags.has('combo-climb')).toBe(false);
    }
    sim.t = 1; observe(sim); prepareJoinedCombinations(sim);
    sim.t = 1.25; observe(sim); prepareJoinedCombinations(sim);
    expect(combo.released).toBe(true);
    expect(sim.events.some(e => e.type === 'block_climb')).toBe(true);
  });
});

describe('Draw presentation keeps physical contact and fallible emergency collection', () => {
  it.each([-1, 1])('collects a personally visible intrusion with real hands, side %s', side => {
    const f = local();
    f.intruder.body.pos = { x: 39.7, y: CENTER_Y + side * .3 };
    observe(f.sim);
    const before = structuredClone(f.blocker.body);
    const command = f.behavior.update(f.blocker, f.sim);
    expect(f.behavior.target).toBe(f.intruder);
    expect(f.behavior.plan.kind).toBe('drive');
    expect(f.blocker.stance).toBe('low');
    expect(f.blocker.engagement).not.toBeNull();
    expect(f.blocker.engagement?.defender).toBe(f.intruder);
    expect(f.blocker.body).toEqual(before);
    const hands = f.blocker.engagement!.hands;
    expect(f.sim.world.joints).toContain(hands);
    const intents: Intent[] = f.sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
    intents[f.blocker.idx] = command;
    updateEngagements(f.sim, intents);
    const report = f.sim.world.step(intents, f.sim.dt);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    // The defender may win the first hands; acquisition does not grant the
    // blocker force ownership or a guaranteed successful emergency block.
    expect(report.armImpulse[f.blocker.idx] + report.armImpulse[f.intruder.idx]).toBeGreaterThan(0);
    for (const a of [f.blocker, f.intruder]) {
      expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
      expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
    }
  });

  it('does not recognize hidden penetration before its delayed picture', () => {
    const f = local();
    f.intruder.body.pos = { x: 41, y: CENTER_Y };
    observe(f.sim);
    f.intruder.body.pos.x = 39.7;
    observe(f.sim, 1);
    const command = f.behavior.update(f.blocker, f.sim);
    expect(f.behavior.target).toBe(f.backer);
    expect(f.blocker.stance).toBe('high');
    expect(command.vel.x).toBeLessThan(0);
    expect(f.blocker.engagement).toBeNull();
  });

  it('does not invent hands for a stale intrusion that is actually out of reach', () => {
    const f = local();
    f.intruder.body.pos = { x: 39.7, y: CENTER_Y + .3 };
    observe(f.sim);
    f.intruder.body.pos.x = 44;
    observe(f.sim, 1);
    f.behavior.update(f.blocker, f.sim);
    expect(f.behavior.target).toBe(f.intruder);
    expect(f.blocker.engagement).toBeNull();
    expect(f.sim.world.joints).toHaveLength(0);
  });

  it('keeps an acquired emergency contact while the presentation phase is still active', () => {
    const f = local();
    f.intruder.body.pos = { x: 39.7, y: CENTER_Y + .3 };
    observe(f.sim);
    f.behavior.update(f.blocker, f.sim);
    const engagement = f.blocker.engagement!, hands = engagement.hands;
    expect(engagement).not.toBeNull();
    const body = structuredClone(f.blocker.body);
    f.sim.t = .45;
    const command = f.behavior.update(f.blocker, f.sim);
    expect(command.vel).toEqual({ x: 0, y: 0 });
    expect(f.blocker.engagement).toBe(engagement);
    expect(f.sim.world.joints).toContain(hands);
    expect(f.blocker.body).toEqual(body);
  });
});

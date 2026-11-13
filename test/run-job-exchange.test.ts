import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm } from '../src/core/vec.js';
import { supportParams } from '../src/physics/support.js';
import type { Intent, StepReport } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, type Combination, type RunBlockKind } from '../src/sim/behaviors/blocking.js';
import { updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Only the initial geometry and installed responsibilities are controlled.
 * Observations, generated capabilities, hands and subsequent movement are
 * the native simulation's; no controller or physical result is stubbed. */
function fixture(side = 1, kinds: [RunBlockKind, RunBlockKind] = ['drive', 'reach'], distinctEyes = false) {
  const formation = FORMATION_BY_ID.ace_11;
  const personnel = pickOffense(offense, formation.personnel);
  if (distinctEyes) {
    personnel.C = { ...personnel.C, ratings: { ...personnel.C.ratings, awareness: 99, playRecognition: 99 } };
    personnel.LG = { ...personnel.LG, ratings: { ...personnel.LG.ratings, awareness: 1, playRecognition: 1 } };
  }
  const sim = new PlaySim({
    offense: personnel, defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side > 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'assignment exchange' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = 1; sim.world.time = 1;
  const a = sim.slot('C')!, b = sim.slot('LG')!, originalA = sim.slot('DT_W')!, originalB = sim.slot('LB_W')!;
  a.body.pos = { x: 40, y: CENTER_Y - side * .65 };
  b.body.pos = { x: 40, y: CENTER_Y + side * .65 };
  a.body.facing = b.body.facing = 0;
  originalA.body.pos = { x: 41.8, y: b.pos.y };
  originalB.body.pos = { x: 43, y: a.pos.y };
  originalA.body.facing = originalB.body.facing = Math.PI;
  const driveA = norm({ x: 1, y: -side * .4 }), driveB = norm({ x: 1, y: side * .6 });
  const first = new RunBlocker({ kind: kinds[0], target: originalA, drive: { ...driveA } });
  const second = new RunBlocker({ kind: kinds[1], target: originalB, drive: { ...driveB } });
  a.behavior = first; b.behavior = second;
  const observe = (n = 24) => { for (let k = 0; k < n; k++) sim.perception.record(sim.agents); };
  observe();
  return { sim, a, b, first, second, originalA, originalB, driveA, driveB, observe, side };
}

type Fixture = ReturnType<typeof fixture>;

function assertBudgets(f: Fixture, report: StepReport) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    const i = a.idx;
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[i] + 1e-8);
  }
}

function step(f: Fixture) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  for (const a of [f.a, f.b]) intents[a.idx] = a.behavior.update(a, f.sim);
  updateEngagements(f.sim, intents);
  const report = f.sim.world.step(intents, .05);
  assertBudgets(f, report);
  f.sim.t += .05;
  f.sim.perception.record(f.sim.agents);
  return report;
}

describe('adjacent crossing threats become coherent new blocking jobs', () => {
  it.each([-1, 1])('classifies both new targets before either moves, side %s', side => {
    const f = fixture(side), before = f.sim.agents.map(a => structuredClone(a.body));
    const joints = [...f.sim.world.joints];
    f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalB);
    expect(f.second.target).toBe(f.originalA);
    expect(f.first.plan.kind).toBe('climb');
    expect(f.first.plan.drive).toEqual({ x: 1, y: 0 });
    expect(f.second.plan.kind).toBe('reach');
    expect(f.second.plan.drive).toEqual(f.driveB);
    expect(f.sim.agents.map(a => a.body)).toEqual(before);
    expect(f.sim.world.joints).toEqual(joints);
    expect(f.a.engagement).toBeNull(); expect(f.b.engagement).toBeNull();
    expect(f.sim.events.filter(e => e.type === 'block_exchange')).toHaveLength(1);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it.each([-1, 1].flatMap(side => (['drive', 'reach', 'down', 'cutoff'] as RunBlockKind[])
    .map(kind => [side, kind] as const)))('retains the recipient\'s installed %s/%s after two exchanges before his first update', (side, kind) => {
    const f = fixture(side, ['drive', kind]);
    // First exchange sends the never-updated recipient to an actual deep
    // threat. A later exchange must not treat that temporary climb as his
    // original technique, nor its vertical drive as his installed direction.
    f.originalA.body.pos.x = 43;
    f.originalB.body.pos.x = 41.8; f.observe();
    f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalB);
    expect(f.first.plan.kind).toBe('drive');
    expect(f.first.plan.drive).toEqual(f.driveA);
    expect(f.second.plan.kind).toBe('climb');
    expect(f.second.plan.drive).toEqual({ x: 1, y: 0 });
    f.originalA.body.pos = { x: 43, y: f.a.pos.y };
    f.originalB.body.pos = { x: 41.8, y: f.b.pos.y };
    f.observe(); f.sim.t += f.a.mind.decisionInterval + .01;
    f.first.update(f.a, f.sim);
    expect(f.second.target).toBe(f.originalB);
    expect(f.second.plan.kind).toBe(kind);
    expect(f.second.plan.drive).toEqual(f.driveB);
    expect(f.sim.events.filter(e => e.type === 'block_exchange')).toHaveLength(2);
    f.second.update(f.b, f.sim);
    expect(f.second.plan.kind).toBe(kind);
    expect(f.second.plan.drive).toEqual(f.driveB);
  });

  it.each([-1, 1])('uses each blocker\'s own delayed picture rather than a shared depth or roster label, side %s', side => {
    const f = fixture(side, ['drive', 'reach'], true);
    // The DT was shallow in the slower recipient's history, then advanced
    // across the first/second-level boundary. The faster actor can see the
    // deeper DT. Both continue seeing lateral crossing shades.
    f.originalA.body.pos.x = 43;
    const slowLag = f.b.mind.observationDelay(f.b.profile.reactionTime);
    const fastLag = f.a.mind.observationDelay(f.a.profile.reactionTime);
    const freshFrames = Math.floor((slowLag + fastLag) / (2 * f.sim.dt));
    f.observe(freshFrames);
    const actorDT = f.sim.see(f.a, f.originalA), recipientDT = f.sim.see(f.b, f.originalA);
    expect(actorDT.age).toBeLessThan(recipientDT.age!);
    expect(actorDT.pos.x).toBe(43); expect(recipientDT.pos.x).toBe(41.8);
    expect(f.originalA.slot.startsWith('DT')).toBe(true);
    expect(f.originalB.slot.startsWith('LB')).toBe(true);
    const read = vi.spyOn(f.sim, 'see');
    f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalB);
    expect(f.first.plan.kind).toBe('climb');
    expect(f.second.target).toBe(f.originalA);
    expect(f.second.plan.kind).toBe('reach');
    expect(f.second.plan.drive).toEqual(f.driveB);
    expect(read.mock.calls.some(([observer, target]) => observer === f.b && target === f.originalA)).toBe(true);
    read.mockRestore();
  });

  it.each([-1, 1])('executes the exchanged surface and second-level jobs through bounded World motion, side %s', side => {
    const f = fixture(side);
    f.first.update(f.a, f.sim);
    const startA = { ...f.a.pos }, startB = { ...f.b.pos };
    let loaded = false;
    for (let k = 0; k < 18; k++) {
      const report = step(f);
      if (f.b.engagement?.defender === f.originalA && report.armImpulse[f.b.idx] > 0) loaded = true;
    }
    expect(f.a.pos.x).toBeGreaterThan(startA.x);
    expect(f.b.pos.x).toBeGreaterThan(startB.x);
    expect(f.first.plan.kind).toBe('climb');
    expect(f.second.plan.kind).toBe('reach');
    expect(loaded).toBe(true);
    expect(f.b.engagement?.defender).toBe(f.originalA);
    expect(f.sim.world.joints).toContain(f.b.engagement!.hands);
    expect(f.b.engagement!.hands!.a).toBe(f.b.body);
    expect(f.b.engagement!.hands!.b).toBe(f.originalA.body);
    expect(f.sim.events.filter(e => e.type === 'block_exchange')).toHaveLength(1);
  });
});

describe('adjacent exchanges preserve installed protected responsibilities and physical contact', () => {
  it.each(['pull', 'lead', 'stalk', 'draw'] as const)('preserves a reserved %s job on either participant', kind => {
    for (const index of [0, 1]) {
      const kinds: [RunBlockKind, RunBlockKind] = ['drive', 'reach']; kinds[index] = kind;
      const f = fixture(1, kinds);
      if (kind === 'pull') {
        const plan = index ? f.second.plan : f.first.plan;
        plan.pullRole = 'kick'; plan.pullPath = [{ x: 38.5, y: CENTER_Y }];
      }
      const bodies = f.sim.agents.map(a => structuredClone(a.body));
      f.first.update(f.a, f.sim);
      expect(f.first.target).toBe(f.originalA); expect(f.second.target).toBe(f.originalB);
      expect(f.first.plan.kind).toBe(kinds[0]); expect(f.second.plan.kind).toBe(kinds[1]);
      expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
      expect(f.sim.events.some(e => e.type === 'block_exchange')).toBe(false);
    }
  });

  it.each([0, 1])('does not remotely reassign a live combination on participant %s', index => {
    const f = fixture(), plan = index ? f.second.plan : f.first.plan;
    const combo: Combination = { members: [f.a, f.b], defender: plan.target!, backer: f.sim.slot('LB_M')!,
      released: false, secureSince: -1, nextRead: 0, soloKind: 'drive' };
    plan.combination = combo;
    f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalA); expect(f.second.target).toBe(f.originalB);
    expect(plan.combination).toBe(combo); expect(combo.released).toBe(false);
    expect(f.sim.events.some(e => e.type === 'block_exchange')).toBe(false);
  });

  it.each([0, 1])('keeps real hands and targets when participant %s is engaged', index => {
    const f = fixture(), blocker = index ? f.b : f.a, target = index ? f.originalB : f.originalA;
    target.body.pos = { x: blocker.pos.x + .85, y: blocker.pos.y };
    f.observe();
    const e = f.sim.engage(blocker, target, 'run', { x: 1, y: 0 })!;
    expect(e).not.toBeNull();
    const joints = [...f.sim.world.joints], bodies = f.sim.agents.map(a => structuredClone(a.body));
    f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalA); expect(f.second.target).toBe(f.originalB);
    expect(blocker.engagement).toBe(e); expect(target.engagement).toBe(e);
    expect(f.sim.world.joints).toEqual(joints);
    expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
    expect(f.sim.events.some(e => e.type === 'block_exchange')).toBe(false);
    const report = step(f);
    expect(f.sim.world.joints).toContain(e.hands);
    expect(report.armImpulse[blocker.idx]).toBeGreaterThan(0);
  });

  it('does not remotely exchange a target whose real hands belong to another blocker', () => {
    const f = fixture(), third = f.sim.slot('Y')!;
    third.body.pos = { x: f.originalB.pos.x - .85, y: f.originalB.pos.y };
    f.observe();
    const e = f.sim.engage(third, f.originalB, 'run', { x: 1, y: 0 })!;
    expect(e).not.toBeNull();
    expect(f.a.engagement).toBeNull(); expect(f.b.engagement).toBeNull();
    const hands = e.hands, joints = [...f.sim.world.joints];
    f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalA); expect(f.second.target).toBe(f.originalB);
    expect(f.originalB.engagement).toBe(e); expect(third.engagement).toBe(e);
    expect(e.hands).toBe(hands); expect(f.sim.world.joints).toEqual(joints);
    expect(f.sim.events.some(event => event.type === 'block_exchange')).toBe(false);
  });

  it('does not exchange when only one blocker would improve his lateral fit', () => {
    const f = fixture();
    f.originalA.body.pos.y = f.a.pos.y + .1;
    f.observe(); f.first.update(f.a, f.sim);
    expect(f.first.target).toBe(f.originalA); expect(f.second.target).toBe(f.originalB);
    expect(f.sim.events.some(e => e.type === 'block_exchange')).toBe(false);
  });
});

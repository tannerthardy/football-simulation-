import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm } from '../src/core/vec.js';
import { fatigueFactor } from '../src/physics/kinematics.js';
import { availability, criticalDeviation, supportParams } from '../src/physics/support.js';
import type { Intent, StepReport } from '../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker, type Combination } from '../src/sim/behaviors/blocking.js';
import { updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });

function fixture(side = 1, firstContact: 'owner' | 'helper' = 'owner') {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: side < 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'helper check' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
  });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = sim.world.time = 1;
  const owner = sim.slot('C')!, helper = sim.slot('LG')!, defender = sim.slot('DT_W')!, backer = sim.slot('LB_W')!;
  owner.body.pos = firstContact === 'owner' ? { x: 41, y: CENTER_Y }
    : { x: 40, y: CENTER_Y + side * 1.5 };
  helper.body.pos = firstContact === 'owner' ? { x: 40, y: CENTER_Y + side * 1.5 }
    : { x: 41, y: CENTER_Y };
  defender.body.pos = { x: 41.9, y: CENTER_Y - side * .54 };
  backer.body.pos = { x: 43.2, y: helper.pos.y };
  sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  sim.qb.body.pos = { x: 36, y: CENTER_Y - side * 2 };
  owner.body.facing = helper.body.facing = 0; defender.body.facing = Math.PI;
  const drive = norm({ x: 1, y: -side * .6 });
  const combination: Combination = { members: [owner, helper], defender, backer,
    released: false, secureSince: -1, nextRead: 0, soloKind: 'drive',
    helpPolicy: { kind: 'check', homeY: helper.pos.y, side: Math.sign(helper.pos.y - owner.pos.y) || side } };
  const primary = new RunBlocker({ kind: 'drive', target: defender, drive: { ...drive }, combination });
  const uncovered = new RunBlocker({ kind: 'combo', target: defender, climbTo: backer, drive: { ...drive }, combination });
  owner.behavior = primary; helper.behavior = uncovered;
  const observe = (n = 24) => { for (let k = 0; k < n; k++) sim.perception.record(sim.agents); };
  observe();
  const engagement = sim.engage(firstContact === 'owner' ? owner : helper, defender, 'run', drive)!;
  expect(engagement).not.toBeNull();
  return { sim, owner, helper, defender, backer, primary, uncovered, combination, engagement, observe, side };
}

type Fixture = ReturnType<typeof fixture>;

function budget(f: Fixture, report: StepReport) {
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    const i = a.idx;
    expect(report.armImpulse[i]).toBeLessThanOrEqual(report.armImpulseLimit[i] + 1e-8);
    expect(report.armWork[i]).toBeLessThanOrEqual(report.armWorkLimit[i] + 1e-8);
    expect(report.supportMotorWork[i]).toBeLessThanOrEqual(report.supportMotorWorkLimit[i] + 1e-8);
    expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
      .toBeLessThanOrEqual(supportParams(a.profile).traction * .05 + 1e-8);
  }
}

function step(f: Fixture, decide = false, request?: Intent) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  if (decide) intents[f.helper.idx] = f.uncovered.update(f.helper, f.sim);
  else if (request) intents[f.helper.idx] = request;
  updateEngagements(f.sim, intents);
  const report = f.sim.world.step(intents, .05);
  budget(f, report);
  f.sim.t += .05;
  f.sim.perception.record(f.sim.agents);
  return report;
}

function loaded(side = 1) {
  const f = fixture(side);
  for (let k = 0; k < 6; k++) step(f);
  expect(f.engagement.control).toBeGreaterThan(0);
  expect(f.engagement.baseB).toBeGreaterThan(.60);
  expect(Math.abs(f.engagement.phi)).toBeLessThan(.55);
  expect(f.engagement.hands!.normalForce).toBeGreaterThan(0);
  expect(f.helper.engagement).toBeNull();
  f.observe();
  return f;
}

function readUntil(f: Fixture) {
  for (let k = 0; k < 14 && !f.combination.released && !f.helper.engagement; k++) step(f, true);
}

/** Prime a real useful check and advance its actual movement until the next
 * native decision is due. Negative controls then remove one requirement,
 * rather than passing merely because the initial stable-check dwell is short. */
function prime(f: Fixture) {
  const request = f.uncovered.update(f.helper, f.sim) as Intent;
  expect(f.combination.released).toBe(false);
  while (f.sim.t + 1e-9 < (f.combination.checkNextRead ?? f.combination.nextRead)) step(f, false, request);
  expect(f.helper.engagement).toBeNull();
  expect(f.sim.t - 1.3).toBeGreaterThan(.15);
  return f;
}

function checked(f: Fixture) { return f.helper.tags.has('combo-check-climb'); }

describe('the original inside-zone helper may check a supported owner before climbing', () => {
  it.each([-1, 1])('uses no fictitious double or primary departure, side %s', side => {
    const f = loaded(side), hands = f.engagement.hands!, ownerBody = f.owner.body;
    readUntil(f);
    expect(checked(f)).toBe(true);
    expect(f.combination.released).toBe(true);
    expect(f.helper.engagement).toBeNull();
    expect(f.engagement.blocker).toBe(f.owner);
    expect(f.engagement.helpers).toEqual([]);
    expect(f.engagement.hands).toBe(hands);
    expect(f.owner.body).toBe(ownerBody);
    expect(f.sim.world.joints).toContain(hands);
    expect(f.sim.world.joints.every(j => j.a !== f.helper.body && j.b !== f.helper.body)).toBe(true);
    expect(f.uncovered.target).toBe(f.backer);
    expect(f.uncovered.plan.kind).toBe('climb');
    expect(f.uncovered.plan.drive).toEqual({ x: 1, y: 0 });
    const x = f.helper.pos.x, report = step(f, true);
    expect(f.engagement.hands).toBe(hands);
    expect(report.armImpulse[f.owner.idx]).toBeGreaterThan(0);
    expect(f.helper.pos.x).toBeGreaterThan(x);
    expect(f.engagement.hands!.normalForce).toBeGreaterThan(0);
  });

  it('keeps the helper reading independently of his supported owner\'s ordinary earlier update', () => {
    const f = loaded();
    const eyes = vi.spyOn(f.sim, 'see');
    f.primary.update(f.owner, f.sim);
    const ownerTime = f.combination.nextRead;
    f.uncovered.update(f.helper, f.sim);
    expect(f.combination.nextRead).toBe(ownerTime);
    expect(f.combination.checkNextRead).toBeGreaterThan(f.sim.t);
    expect(eyes.mock.calls.some(([observer, target]) => observer === f.helper && target === f.owner)).toBe(true);
    expect(f.sim.see(f.helper, f.owner).age).toBeGreaterThan(0);
    eyes.mockRestore();
    expect(f.combination.released).toBe(false);
    readUntil(f); expect(checked(f)).toBe(true);
  });

  it('requires a stable helper check instead of inheriting an owner\'s historical secure time', () => {
    const f = loaded(); f.combination.secureSince = 0;
    f.uncovered.update(f.helper, f.sim);
    expect(checked(f)).toBe(false); expect(f.combination.released).toBe(false);
    readUntil(f); expect(checked(f)).toBe(true);
  });
});

describe('a check does not bypass a physical or near-level responsibility', () => {
  it.each(['down', 'unbalanced', 'missing-hands', 'foreign-hands'] as const)('rejects %s despite the owner\'s stale visible up pose', reason => {
    const f = prime(loaded()), hands = f.engagement.hands!;
    f.observe();
    expect(f.sim.see(f.helper, f.owner).pose).toBe('up');
    if (reason === 'down') f.owner.body.support!.state = 'down';
    if (reason === 'unbalanced') {
      const sp = supportParams(f.owner.profile), sup = f.owner.body.support!;
      sup.xi = { x: criticalDeviation(sp, sup.posture, 0, fatigueFactor(f.owner.body.energy)), y: 0 };
      expect(availability(sup, sp, fatigueFactor(f.owner.body.energy))).toBeLessThan(.60);
    }
    if (reason === 'missing-hands') f.sim.world.joints.splice(f.sim.world.joints.indexOf(hands), 1);
    if (reason === 'foreign-hands') {
      const other = f.sim.slot('RT')!;
      f.engagement.hands = { ...hands, a: other.body };
      f.sim.world.joints.splice(f.sim.world.joints.indexOf(hands), 1, f.engagement.hands);
    }
    // Do not advance perception: belief cannot supply physical footing/hands.
    f.uncovered.update(f.helper, f.sim);
    expect(f.sim.see(f.helper, f.owner).pose).toBe('up');
    expect(checked(f)).toBe(false); expect(f.combination.released).toBe(false);
    expect(f.engagement.blocker).toBe(f.owner); expect(f.helper.engagement).toBeNull();
  });

  it('retains assistance when the owned defender approaches the helper\'s near hip', () => {
    const f = prime(loaded());
    f.defender.body.pos.y = f.owner.pos.y + f.side * .45;
    f.defender.body.vel.y = f.side * 1.5; f.observe();
    f.uncovered.update(f.helper, f.sim);
    expect(checked(f)).toBe(false); expect(f.combination.released).toBe(false);
  });

  it('does not ignore another unengaged near-level penetrator in the helper corridor', () => {
    const f = prime(loaded()), threat = f.sim.slot('DT_S')!;
    threat.body.pos = { x: f.sim.los - .4, y: f.helper.pos.y };
    threat.body.vel = { x: -1, y: 0 }; f.observe();
    f.uncovered.update(f.helper, f.sim);
    expect(checked(f)).toBe(false);
    expect(f.uncovered.target).toBe(threat);
    expect(f.helper.tags.has('block-collect')).toBe(true);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

  it('keeps a physically restrained helper from being treated as a free climber', () => {
    const f = prime(loaded()), other = f.sim.slot('LB_M')!;
    other.body.pos = { x: f.helper.pos.x + .8, y: f.helper.pos.y };
    const grasp = { kind: 'grasp' as const, a: other.body, b: f.helper.body,
      reach: 1.1, capacity: 500, legs: .2 };
    f.sim.world.joints.push(grasp);
    f.uncovered.update(f.helper, f.sim);
    expect(checked(f)).toBe(false); expect(f.combination.released).toBe(false);
    expect(f.sim.world.joints).toContain(grasp);
  });

  it('does not send the installed covered owner uphill to manufacture optional help', () => {
    const f = fixture(1, 'helper');
    for (let k = 0; k < 6; k++) step(f);
    expect(f.engagement.blocker).toBe(f.helper);
    expect(f.engagement.hands!.a).toBe(f.helper.body);
    expect(f.engagement.hands!.normalForce).toBeGreaterThan(0);
    const hands = f.engagement.hands!;
    f.primary.update(f.owner, f.sim);
    expect(f.owner.tags.has('combo-check-climb')).toBe(false);
    expect(f.combination.released).toBe(false);
    expect(f.engagement.hands).toBe(hands);
  });
});

describe('helper decisions consume delayed visible responsibility cues', () => {
  it('does not climb through a near hip still in his picture merely because the hidden DL has moved away', () => {
    const f = prime(loaded()), actual = { ...f.defender.pos }, velocity = { ...f.defender.vel };
    f.defender.body.pos = { x: f.helper.pos.x + 1, y: f.helper.pos.y - .1 };
    f.defender.body.vel = { x: 0, y: 1 };
    f.observe();
    f.defender.body.pos = actual; f.defender.body.vel = velocity;
    const seen = f.sim.see(f.helper, f.defender);
    expect(seen.age).toBeGreaterThan(0);
    expect(seen.pos.y).not.toBe(f.defender.pos.y);
    f.uncovered.update(f.helper, f.sim);
    expect(checked(f)).toBe(false); expect(f.combination.released).toBe(false);
  });

  it('does not anticipate a filling backer whose delayed picture is still far from the helper', () => {
    const f = prime(loaded()), actual = { ...f.backer.pos };
    f.backer.body.pos = { x: 49, y: f.helper.pos.y }; f.observe();
    f.backer.body.pos = actual;
    expect(Math.hypot(f.backer.pos.x - f.helper.pos.x, f.backer.pos.y - f.helper.pos.y)).toBeLessThan(4.2);
    expect(f.sim.see(f.helper, f.backer).pos.x).toBe(49);
    expect(f.sim.see(f.helper, f.sim.slot('RB')!).pos.x).toBeLessThan(f.sim.los - 2.8);
    f.uncovered.update(f.helper, f.sim);
    expect(checked(f)).toBe(false); expect(f.combination.released).toBe(false);
  });
});

describe('optional inside-zone help respects other concepts and real double teams', () => {
  it('retains sustained help for Duo, gap schemes, stretch zone, Draw and Toss', () => {
    for (const run of ['duo', 'power', 'counter', 'trap', 'oz_strong', 'wz_strong', 'draw', 'toss']) {
      const formation = FORMATION_BY_ID.ace_11;
      const combinations = new Set<Combination>();
      for (const front of ['over', 'odd', 'tite']) {
        const structure = FRONT_BY_ID[front], personnel = structure.personnel[0];
        const sim = new PlaySim({
          offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
          offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[run], label: run },
          defCall: { personnel, front: structure, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
          los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
        });
        for (const a of sim.offense) if (a.behavior instanceof RunBlocker && a.behavior.plan.combination)
          combinations.add(a.behavior.plan.combination);
      }
      expect(combinations.size).toBeGreaterThan(0);
      for (const combo of combinations) expect(combo.helpPolicy).toBeUndefined();
    }
  });

  it('keeps an already joined genuine double on the ordinary earned-transfer path', () => {
    const f = fixture();
    f.helper.body.pos = { x: f.owner.pos.x + .05, y: f.owner.pos.y - .2 };
    const e = f.sim.engage(f.helper, f.defender, 'run', f.engagement.drive)!;
    expect(e).toBe(f.engagement);
    expect(e.helpers).toContain(f.helper);
    const hands = e.hands!, helperHands = e.helperHands!.get(f.helper)!;
    f.observe();
    for (let k = 0; k < 12 && !f.combination.released; k++) step(f, true);
    expect(checked(f)).toBe(false);
    expect(f.combination.released).toBe(true);
    expect(f.helper.tags.has('combo-climb') || f.owner.tags.has('combo-climb')).toBe(true);
    expect(e.hands === hands || e.hands === helperHands).toBe(true);
    expect(f.sim.world.joints).toContain(e.hands);
  });
});

describe('an ordinary Split Zone Tite rep establishes the same check and climb', () => {
  it('lets RT use the supported Y block without first inventing a second pair of hands', () => {
    const formation = FORMATION_BY_ID.gun_wing_12;
    const sim = new PlaySim({
      offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base34'),
      offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.split_zone, label: 'Split Zone' },
      defCall: { personnel: 'base34', front: FRONT_BY_ID.tite, coverage: COVERAGE_BY_ID.cover3,
        pressure: null, label: 'Tite Cover 3' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
    });
    const helper = sim.slot('RT')!, behavior = helper.behavior as RunBlocker;
    const combo = behavior.plan.combination!;
    expect(combo.members.map(a => a.slot)).toEqual(['Y', 'RT']);
    expect(combo.defender.slot).toBe('DE_S'); expect(combo.backer!.slot).toBe('LB_M');
    expect(combo.helpPolicy!.kind).toBe('check');
    const original = behavior.update;
    const transitions: Array<{ t: number; hands: NonNullable<Fixture['engagement']['hands']>; e: Fixture['engagement'] }> = [];
    behavior.update = function (a, s) {
      const before = !combo.released && !a.engagement ? combo.defender.engagement : null;
      const hands = before?.hands;
      const bodies = before ? s.agents.map(p => structuredClone(p.body)) : [];
      const contact = before ? { start: before.start, control: before.control, phi: before.phi,
        drive: before.drive ? { ...before.drive } : null,
        surfaceAxis: before.surfaceAxis ? { ...before.surfaceAxis } : undefined,
        sealTarget: before.sealTarget, holding: before.holding } : null;
      const command = original.call(this, a, s);
      if (before && hands && a.tags.has('combo-check-climb') && !transitions.length) {
        expect(before.blocker.slot).toBe('Y'); expect(before.helpers).toEqual([]);
        expect(hands.a).toBe(before.blocker.body); expect(hands.b).toBe(combo.defender.body);
        expect(s.world.joints).toContain(hands); expect(before.hands).toBe(hands);
        expect(hands.normalForce).toBeGreaterThan(0);
        expect({ start: before.start, control: before.control, phi: before.phi,
          drive: before.drive, surfaceAxis: before.surfaceAxis,
          sealTarget: before.sealTarget, holding: before.holding }).toEqual(contact);
        expect(s.agents.map(p => p.body)).toEqual(bodies);
        expect(a.engagement).toBeNull(); expect(this.plan.kind).toBe('climb');
        expect(this.target).toBe(combo.backer); expect(this.plan.drive).toEqual({ x: 1, y: 0 });
        expect(s.world.joints.some(j => j.a === a.body || j.b === a.body)).toBe(false);
        transitions.push({ t: s.t, hands, e: before });
      }
      return command;
    };
    while (!transitions.length && sim.t < 2 && sim.phase !== 'dead') sim.tick();
    expect(transitions).toHaveLength(1);
    const transition = transitions[0];
    expect(transition.t).toBeLessThan(1.5);
    // sim.tick has already advanced the real World after the controller read.
    expect(transition.e.hands).toBe(transition.hands);
    expect(sim.world.joints).toContain(transition.hands);
    expect(transition.hands.normalForce).toBeGreaterThan(0);
    expect(transition.e.blocker.slot).toBe('Y');
    expect(sim.events.filter(e => e.type === 'block_climb' && e.a === helper.idx)).toHaveLength(1);
  });
});

describe('optional checks preserve the later genuine double\'s decision phase', () => {
  it('keeps the native Split Zone Bear joined reads and earned transfer identical to sustained help', () => {
    const run = (optional: boolean) => {
      const formation = FORMATION_BY_ID.gun_wing_12;
      const sim = new PlaySim({
        offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'goalline'),
        offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.split_zone, label: 'Split Zone' },
        defCall: { personnel: 'goalline', front: FRONT_BY_ID.bear, coverage: COVERAGE_BY_ID.cover3,
          pressure: null, label: 'Bear Cover 3' },
        los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11,
      });
      const owner = sim.slot('C')!, helper = sim.slot('LG')!, behavior = owner.behavior as RunBlocker;
      const combo = behavior.plan.combination!;
      expect(combo.members.map(a => a.slot)).toEqual(['C', 'LG']);
      expect(combo.defender.slot).toBe('NT');
      // Remove only the optional coaching policy in the control. Both reps
      // retain identical players, initial geometry, scheme, hands and World.
      if (!optional) for (const a of sim.offense)
        if (a.behavior instanceof RunBlocker && a.behavior.plan.combination)
          delete a.behavior.plan.combination.helpPolicy;
      const original = behavior.update;
      const reads: Array<{ t: number; control: number; phi: number; released: boolean }> = [];
      behavior.update = function (a, s) {
        const e = combo.defender.engagement;
        const joined = !!e && combo.members.every(member => member.engagement === e);
        const phase = combo.nextRead, state = e ? { control: e.control, phi: e.phi } : null;
        const command = original.call(this, a, s);
        if (joined && state && combo.nextRead !== phase)
          reads.push({ t: s.t, ...state, released: combo.released });
        return command;
      };
      while (!combo.released && sim.t < 2 && sim.phase !== 'dead') sim.tick();
      expect(combo.released).toBe(true);
      expect(helper.tags.has('combo-climb')).toBe(true);
      expect(helper.tags.has('combo-check-climb')).toBe(false);
      expect(owner.engagement?.blocker).toBe(owner);
      expect(owner.engagement!.hands!.a).toBe(owner.body);
      expect(sim.world.joints).toContain(owner.engagement!.hands);
      expect(owner.engagement!.hands!.normalForce).toBeGreaterThan(0);
      return { reads, event: sim.events.find(e => e.type === 'block_climb' && e.a === helper.idx)! };
    };
    const sustained = run(false), optional = run(true);
    expect(sustained.reads.length).toBeGreaterThan(1);
    expect(optional.reads).toEqual(sustained.reads);
    expect(optional.event).toEqual(sustained.event);
  });
});

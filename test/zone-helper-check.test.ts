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
import { RunBlocker, readCombination, type Combination } from '../src/sim/behaviors/blocking.js';
import { updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;
// The helper witnesses are staged on the installed line. On OL_SPLITS's
// tracked splits the Tite scene forms a different, sound combination (RG+RT
// on the B-gap tackle, Y alone on the edge); OL_STAGGER also changes it.
// FORCE_BOUNCE moves the Split Zone Bear force, and the recorded double no
// longer releases within its 2 s window.
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
// RUN_FEEL: the blocker mirrors the defender's acquired motion; this scene is staged on true-velocity mirroring (KNOWN_PROBLEMS RUN-11, re-record by review 2).
vi.hoisted(() => { process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; process.env.FORCE_BOUNCE = '0'; process.env.FRONT_ALIGN = '0'; process.env.SNAP_REACT = '0'; process.env.RUN_FEEL = '0'; process.env.EDGE_CONTAIN = '0'; process.env.GAP_MATCH = '0'; process.env.SEAL_HOLD = '0'; });
// SEAL_HOLD keeps a loaded run blocker's caught leverage; this scene is staged on the unbounded seal correction (re-record by review 2).
// EDGE_CONTAIN bounds a blocked edge's widening to what containing the back needs; this scene is staged on unbounded widening (re-record by review 2).
// GAP_MATCH fills the front's open gaps as a set; this scene's backer fits are staged on nearest-first (re-record by review 2).

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
      .toBeLessThanOrEqual(report.groundImpulseLimit[i] + 1e-8);
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

  it('an unjoined helper who loses his footing must confirm the owner again after recovering', () => {
    const f = prime(loaded()), hands = f.engagement.hands!;
    expect(f.combination.checkSince).toBeGreaterThanOrEqual(0);
    expect(f.helper.engagement).toBeNull();
    f.helper.body.support!.state = 'down';
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.checkSince).toBe(-1);
    expect(f.combination.released).toBe(false);
    f.helper.body.support!.state = 'up';
    const recoveredAt = f.sim.t;
    readCombination(f.helper, f.sim, f.combination);
    expect(f.combination.released).toBe(false);
    expect(f.combination.checkSince).toBe(recoveredAt);
    expect(f.helper.engagement).toBeNull();
    expect(f.engagement.hands).toBe(hands);
    readUntil(f);
    expect(checked(f)).toBe(true);
    expect(f.engagement.hands).toBe(hands);
    expect(f.engagement.helpers).toEqual([]);
    expect(f.sim.world.joints).toContain(hands);
    expect(f.sim.world.joints.every(j => j.a !== f.helper.body && j.b !== f.helper.body)).toBe(true);
    expect(step(f, true).armImpulse[f.owner.idx]).toBeGreaterThan(0);
  });
});

describe('achieved torso governs an already loaded run connection', () => {
  it.each([-1, 1])('retains real hands beyond the old fixed drive frame when the torso already faces the man, side %s', side => {
    const f = loaded(side), e = f.engagement, hands = e.hands!;
    expect(e.holding).toBe(false);
    const distance = Math.hypot(f.defender.pos.x - f.owner.pos.x, f.defender.pos.y - f.owner.pos.y);
    // A controlled same-distance contact picture, not a claim that this native
    // play must turn through a particular angle before its inspection ends.
    // The old drive frame has been passed; the achieved torso is already fit.
    const bearing = Math.atan2(e.drive!.y, e.drive!.x) + side * 1.2 * Math.PI / 2;
    f.defender.body.pos = { x: f.owner.pos.x + Math.cos(bearing) * distance,
      y: f.owner.pos.y + Math.sin(bearing) * distance };
    f.owner.body.facing = bearing;
    const before = f.sim.agents.map(a => structuredClone(a.body));
    const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
    updateEngagements(f.sim, intents);
    expect(Math.abs(e.phi)).toBeGreaterThanOrEqual(1.1);
    expect(e.holding).toBe(false);
    expect(f.sim.events.some(event => event.type === 'holding_attempt' && event.a === f.owner.idx)).toBe(false);
    expect(f.sim.agents.map(a => a.body)).toEqual(before);
    expect(f.owner.engagement).toBe(e); expect(f.defender.engagement).toBe(e);
    expect(e.hands).toBe(hands); expect(f.sim.world.joints).toContain(hands);
    expect(f.sim.events.some(event => event.type === 'shed' && event.b === f.owner.idx)).toBe(false);
    const report = f.sim.world.step(intents, .05);
    budget(f, report);
    expect(Math.hypot(hands.normalForce ?? 0, hands.tangentForce ?? 0)).toBeGreaterThan(0);
    expect(f.owner.body.support!.state).toBe('up');
    const achievedBearing = Math.atan2(f.defender.pos.y - f.owner.pos.y, f.defender.pos.x - f.owner.pos.x);
    const achievedOff = Math.abs(Math.atan2(Math.sin(achievedBearing - f.owner.facing),
      Math.cos(achievedBearing - f.owner.facing)));
    expect(achievedOff / (Math.PI / 2)).toBeLessThan(1.1);
    expect(e.helpers).toEqual([]); expect(f.helper.engagement).toBeNull();
    expect(f.combination.released).toBe(false);
  });
});

describe('a check does not bypass a physical or near-level responsibility', () => {
  it.each([-1, 1])('collects a genuinely lost loaded contact instead of climbing, side %s', side => {
    const f = loaded(side), hands = f.engagement.hands!;
    // Controlled loss geometry on an already loaded pair: the defender is
    // behind the achieved torso, not merely past a fixed drive-frame angle.
    // Leave every position, capability and movement request unchanged.
    f.owner.body.facing = Math.atan2(f.defender.pos.y - f.owner.pos.y,
      f.defender.pos.x - f.owner.pos.x) + Math.PI;
    step(f);
    expect(f.owner.engagement).toBeNull(); expect(f.defender.engagement).toBeNull();
    expect(f.sim.world.joints).not.toContain(hands);
    expect(f.sim.events.some(e => e.type === 'shed' && e.b === f.owner.idx)).toBe(true);
    step(f, true);
    expect(f.combination.checkSince).toBe(-1);
    for (let k = 0; k < 40 && !f.helper.engagement; k++) step(f, true);
    const collected = f.helper.engagement;
    expect(collected?.blocker).toBe(f.helper); expect(collected?.defender).toBe(f.defender);
    for (let k = 0; k < 4; k++) step(f, true);
    expect(f.sim.world.joints).toContain(collected!.hands);
    // A real collected connection can carry lateral force without compression.
    // Require current usable reach/torso and the installed first-level side,
    // rather than treating either a joint label or a force alone as protection.
    const handsNow = collected!.hands!;
    expect(Math.hypot(handsNow.normalForce ?? 0, handsNow.tangentForce ?? 0)).toBeGreaterThan(0);
    const distance = Math.hypot(f.helper.pos.x-f.defender.pos.x, f.helper.pos.y-f.defender.pos.y);
    expect(distance).toBeLessThanOrEqual(f.helper.profile.radius+f.defender.profile.radius
      + .3*f.helper.player.measurables.armIn/36);
    const bearing = Math.atan2(f.defender.pos.y-f.helper.pos.y, f.defender.pos.x-f.helper.pos.x);
    expect(Math.abs(Math.atan2(Math.sin(bearing-f.helper.facing),Math.cos(bearing-f.helper.facing)))/(Math.PI/2)).toBeLessThan(.65);
    expect((f.defender.pos.x-f.helper.pos.x)*f.engagement.drive!.x
      +(f.defender.pos.y-f.helper.pos.y)*f.engagement.drive!.y).toBeGreaterThan(0);
    expect(f.helper.body.support!.state).toBe('up');
    expect(f.combination.released).toBe(false); expect(checked(f)).toBe(false);
    expect(f.sim.events.some(e => e.type === 'block_climb')).toBe(false);
  });

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

describe('a native Split Zone Under rep earns a supported check and climb', () => {
  it('lets RG use the supported RT block without first inventing a second pair of hands', () => {
    // CT-R1-split_zone-under-R-S3 was an input in the declared native panel.
    // Its earned check complements the old Tite witness's legitimate stay.
    // Start law (#336): on S3 the RG's sub-top-speed approach now starts at full
    // force and his hands join the double (1.05 s) before his check is stable,
    // so no check occurs; S8, same panel roster/front/side, is chosen after it.
    // With the back's own mesh start (#344) and the engaged-flow law (#347) as well, S8's RG joins the double
    // before his check is stable; S17 (one of S1, S12, S17, S20, S23-26, S32, S33 in S1-40) keeps the witness.
    const formation = FORMATION_BY_ID.gun_wing_12;
    const sim = new PlaySim({
      offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
      offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.split_zone, label: 'Split Zone' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3,
        pressure: null, label: 'Under Cover 3' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 17,
    });
    const helper = sim.slot('RG')!, behavior = helper.behavior as RunBlocker;
    const combo = behavior.plan.combination!;
    expect(combo.members.map(a => a.slot)).toEqual(['RT', 'RG']);
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
        expect(before.blocker.slot).toBe('RT'); expect(before.helpers).toEqual([]);
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
    expect(transition.e.blocker.slot).toBe('RT');
    expect(sim.events.filter(e => e.type === 'block_climb' && e.a === helper.idx)).toHaveLength(1);
  });
});

describe('the native Split Zone Tite helper reads useful first-level work', () => {
  it('waits for arriving work, then climbs while the keeper retains achieved facing and loaded hands', () => {
    const formation = FORMATION_BY_ID.gun_wing_12;
    const sim = new PlaySim({
      offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base34'),
      offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.split_zone, label: 'Split Zone' },
      defCall: { personnel: 'base34', front: FRONT_BY_ID.tite, coverage: COVERAGE_BY_ID.cover3,
        pressure: null, label: 'Tite Cover 3' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
    });
    const helper = sim.slot('RT')!, behavior = helper.behavior as RunBlocker;
    const combo = behavior.plan.combination!, owner = sim.slot('Y')!;
    expect(combo.members.map(a => a.slot)).toEqual(['Y', 'RT']);
    expect(combo.helpPolicy!.kind).toBe('check');
    // The old fixed-frame shed ended Y's useful reach despite his achieved
    // torso still facing the end. Inspect the consumed read and actual hands;
    // neither an obligatory shed nor a replacement release time is a contract.
    const original = behavior.update, originalSee = sim.see;
    let reading = false, backerPicture: ReturnType<typeof sim.see> | null = null;
    let runnerPicture: ReturnType<typeof sim.see> | null = null;
    let noArrivingWork = 0, earnedClimbs = 0, retainedWork = 0;
    sim.see = function (a, b, delayScale = 1) {
      const picture = originalSee.call(this, a, b, delayScale);
      if (reading && a === helper) {
        if (b === combo.backer) backerPicture = picture;
        if (b === this.slot('RB')) runnerPicture = picture;
      }
      return picture;
    };
    behavior.update = function (a, s) {
      const e = combo.defender.engagement;
      const due = !combo.released && !a.engagement && s.t >= (combo.checkNextRead ?? 0);
      const supported = e?.blocker === owner && e.hands && e.hands.normalForce! > 0;
      const secure = supported && e.baseB > .60 && Math.abs(e.phi) < .55;
      const heldLongEnough = s.t - (combo.checkSince ?? -1) >= .15;
      const hands = e?.hands;
      const bodies = due && secure && heldLongEnough ? s.agents.map(p => structuredClone(p.body)) : [];
      backerPicture = runnerPicture = null;
      reading = true;
      let command;
      try { command = original.call(this, a, s); } finally { reading = false; }
      if (due && secure && heldLongEnough && backerPicture && runnerPicture) {
        const backer = backerPicture as ReturnType<typeof s.see>;
        const runner = runnerPicture as ReturnType<typeof s.see>;
        const filling = Math.hypot(backer.pos.x - a.pos.x, backer.pos.y - a.pos.y) < 4.2;
        const arriving = runner.pos.x > s.los - 2.8;
        if (!filling && !arriving) {
          expect(combo.released).toBe(false); expect(this.plan.kind).toBe('combo');
          expect(e!.blocker).toBe(owner); expect(e!.helpers).toEqual([]);
          expect(s.world.joints).toContain(e!.hands); expect(a.engagement).toBeNull();
          noArrivingWork++;
        }
        if (combo.released) {
          expect(filling || arriving).toBe(true);
          expect(e!.blocker).toBe(owner); expect(e!.helpers).toEqual([]);
          expect(e!.hands).toBe(hands); expect(s.world.joints).toContain(hands);
          expect(s.agents.map(p => p.body)).toEqual(bodies);
          expect(a.engagement).toBeNull(); expect(this.plan.kind).toBe('climb');
          expect(this.target).toBe(combo.backer); expect(this.plan.drive).toEqual({ x: 1, y: 0 });
          earnedClimbs++;
        }
      }
      return command;
    };
    // This is explicitly a controller/contact inspection window, not a
    // claimed final rushing result. The normal World and all behaviors run.
    while (sim.t < 2 && sim.phase !== 'dead') {
      sim.tick();
      const e = combo.defender.engagement;
      // This native sequence must retain real work through the earned climb.
      // Crossing the historical fixed-frame boundary is tested explicitly
      // above, independent of the current motor's particular turn history.
      if (combo.released && e?.blocker === owner) {
        const toD = Math.atan2(e.defender.pos.y - owner.pos.y, e.defender.pos.x - owner.pos.x);
        const off = Math.abs(Math.atan2(Math.sin(toD - owner.facing), Math.cos(toD - owner.facing)));
        // No future turn credit: the currently achieved torso is sufficient.
        expect(off / (Math.PI / 2)).toBeLessThan(1.1);
        expect(owner.body.support!.state).toBe('up');
        expect(sim.world.joints).toContain(e.hands); expect(e.hands!.normalForce).toBeGreaterThan(0);
        expect(e.helpers).toEqual([]); retainedWork++;
      }
    }
    // On the engaged-flow law the end works down the line with Y on this seed,
    // Y loses squareness (|phi| >= .55 on every due read from 1.0 s) and the
    // helper correctly keeps the double; no seed of this constructor in 1-40
    // keeps the old release. The read contract above holds on every due read;
    // the earned climb is checked when it happens. Released-climb coverage:
    // run-execution ("releases exactly one blocker...") and
    // combination-ownership ("releases through actual shared contact...").
    if (combo.released) {
      expect(noArrivingWork).toBeGreaterThan(0); expect(retainedWork).toBeGreaterThan(0);
      expect(earnedClimbs).toBe(1);
      expect(helper.tags.has('combo-check-climb')).toBe(true);
      expect(sim.events.filter(e => e.type === 'block_climb' && e.a === helper.idx)).toHaveLength(1);
    } else {
      expect(earnedClimbs).toBe(0);
      expect(sim.events.filter(e => e.type === 'block_climb' && e.a === helper.idx)).toHaveLength(0);
    }
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
      const reads: Array<{ t: number; control: number; phi: number; released: boolean }> = [];
      while (!combo.released && sim.t < 2 && sim.phase !== 'dead') {
        const e = combo.defender.engagement;
        const joined = !!e && combo.members.every(member => member.engagement === e);
        const member = combo.members.indexOf(owner);
        const phase = combo.reads?.[member]?.readAt ?? combo.nextRead;
        const state = e ? { control: e.control, phi: e.phi } : null;
        const t = sim.t;
        sim.tick();
        const after = combo.reads?.[member]?.readAt ?? combo.nextRead;
        if (joined && state && after !== phase)
          reads.push({ t, ...state, released: combo.released });
      }
      expect(combo.released).toBe(true);
      const climbers = combo.members.filter(a => a.tags.has('combo-climb'));
      expect(climbers).toHaveLength(1);
      const climber = climbers[0], keeper = combo.members.find(a => a !== climber)!;
      expect(climber.tags.has('combo-check-climb')).toBe(false);
      expect(keeper.engagement?.blocker).toBe(keeper);
      expect(keeper.engagement!.hands!.a).toBe(keeper.body);
      expect(sim.world.joints).toContain(keeper.engagement!.hands);
      expect(keeper.engagement!.hands!.normalForce).toBeGreaterThan(0);
      return { reads, climber: climber.slot, keeper: keeper.slot,
        event: sim.events.find(e => e.type === 'block_climb' && e.a === climber.idx)! };
    };
    const sustained = run(false), optional = run(true);
    expect(sustained.reads.length).toBeGreaterThan(1);
    expect(optional.reads).toEqual(sustained.reads);
    expect(optional.climber).toBe(sustained.climber);
    expect(optional.keeper).toBe(sustained.keeper);
    expect(optional.event).toEqual(sustained.event);
  });
});

import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { PlaySim } from '../src/sim/playsim.js';
import { assessDangerousContact, baseFacts, blockFacts, gripFacts,
  observeContactLegality, recordAchievedContact, vulnerableFacts, type ContactRuleFacts } from '../src/sim/contact-legality.js';
import type { GraspJoint, HandJoint } from '../src/physics/world.js';

function block(overrides: Partial<NonNullable<ContactRuleFacts['block']>> = {},
  facts: Partial<ContactRuleFacts> = {}): ContactRuleFacts {
  return { ...baseFacts('block', false, false), region: 'above_waist', ...facts,
    block: { ...blockFacts(), ...overrides } };
}
const kinds = (facts: ContactRuleFacts) => assessDangerousContact(facts).map(f => f.kind);
const passer = (overrides: Partial<NonNullable<ContactRuleFacts['passer']>> = {}): NonNullable<ContactRuleFacts['passer']> => ({
  passingPosture: true, passReleased: true, releaseBehindLine: true, afterPossessionChange: false,
  outsidePocketMoving: false, reestablishedPassingPosture: false,
  blockedIntoContact: false, noOpportunityToAvoid: false,
  stationaryOrFading: true, becameRunnerOrBlocker: false, deliberateStrikeAfterRelease: false,
  feetOnGround: true, rollOrLunge: false, ...overrides,
});

describe('NFL2026 achieved contact rules, not contact frequency', () => {
  it('distinguishes a material back block from side/front contact and the named exceptions', () => {
    expect(kinds(block({ fromBehind: true }))).toContain('block_in_back');
    for (const exception of ['closeLine', 'personalLooseBallAttempt', 'opponentTurnedAtImminentContact', 'bothHandsOnSide'] as const) {
      expect(kinds(block({ fromBehind: true, [exception]: true })), exception).not.toContain('block_in_back');
    }
    expect(kinds(block({ fromSide: true }))).not.toContain('block_in_back');
    expect(kinds(block({ fromBehind: true }, { force: 'borderline' }))).toEqual([]);
  });
  it('does not treat an unseen defender or a hands-only push as a blindside block', () => {
    expect(kinds(block({ towardOwnEndLine: true }, { part: 'shoulder' }))).toContain('blindside_block');
    expect(kinds(block({ parallelOwnEndLine: true }, { part: 'forearm' }))).toContain('blindside_block');
    expect(kinds(block({ towardOwnEndLine: true }, { part: 'hand' }))).not.toContain('blindside_block');
    expect(kinds(block({}, { part: 'shoulder' }))).not.toContain('blindside_block');
    expect(kinds(block({ towardOwnEndLine: true, closeLine: true, ballStillCloseLine: true }, { part: 'shoulder' }))).not.toContain('blindside_block');
    expect(kinds(block({ towardOwnEndLine: true, closeLine: true }, { part: 'shoulder' }))).toContain('blindside_block');
  });
  it('applies clipping height, close-line and continuous-side exceptions', () => {
    expect(kinds(block({ fromBehind: true }, { region: 'thigh' }))).toContain('clipping');
    expect(kinds(block({ fromBehind: true, closeLine: true }, { region: 'thigh' }))).not.toContain('clipping');
    expect(kinds(block({ fromBehind: true, closeLine: true }, { region: 'knee_or_below' }))).toContain('clipping');
    expect(kinds(block({ fromBehind: true, continuousFromLegalSide: true }, { region: 'thigh' }))).not.toContain('clipping');
    expect(kinds(block({ rollsUpSideOrBackOfLeg: true }, { region: 'thigh' }))).toContain('clipping');
    expect(kinds(block({ fromBehind: true }, { region: 'thigh', victimIsRunner: true }))).not.toContain('clipping');
  });
  it('keeps peel-back separate from a low block with the near shoulder across both legs', () => {
    const f = block({ fromSide: true, towardOwnEndLine: true, initialBelowWaist: true }, { region: 'thigh' });
    expect(kinds(f)).toContain('peel_back');
    f.block!.nearShoulderCrossedFrontOfLegs = true;
    expect(kinds(f)).not.toContain('peel_back');
  });
  it('qualifies low-block phase/box restrictions without flagging a runner, catch attempt or legal slide', () => {
    const f = block({ initialBelowWaist: true, insideTightEndBox: false }, { region: 'thigh' });
    expect(kinds(f)).toContain('low_block');
    for (const field of ['slidFromAboveWaist', 'wardedIntoLowContact', 'targetAttemptingCatch'] as const) {
      expect(kinds({ ...f, block: { ...f.block!, [field]: true } }), field).not.toContain('low_block');
    }
    expect(kinds({ ...f, victimIsRunner: true })).not.toContain('low_block');
    f.block!.insideTightEndBox = true;
    expect(kinds(f)).not.toContain('low_block');
    f.block!.afterPossessionChange = true;
    expect(kinds(f)).toContain('low_block');
  });
  it.each(['engaged_high', 'still_confronting', 'lure', 'reverse'] as const)('covers chop-block ordering: %s', order => {
    const f = block({ highLowPartner: order }, { region: 'thigh' });
    expect(kinds(f)).toContain('chop_block');
    f.block!.opponentInitiatedPartnerContact = true;
    expect(kinds(f)).not.toContain('chop_block');
    f.block!.opponentInitiatedPartnerContact = false; f.block!.incidentalEscape = true;
    expect(kinds(f)).not.toContain('chop_block');
  });
  it('a wide crackback requires the prohibited low/defenseless contact, not its name', () => {
    const f = block({ withinFiveOfLine: true, towardSnapPosition: true, wideAtSnap: true });
    expect(kinds(f)).not.toContain('crackback');
    f.region = 'thigh'; expect(kinds(f)).toContain('crackback');
    f.block!.withinFiveOfLine = false; expect(kinds(f)).not.toContain('crackback');
  });
  it('uses the second step and avoidance facts, not a universal after-release timer', () => {
    const f = { ...baseFacts('tackle', true, false), passer: passer({ secondStepLandedAfterRelease: true, continuedDriveThrough: true }) };
    expect(kinds(f)).toContain('roughing_passer');
    f.passer.secondStepLandedAfterRelease = false;
    expect(kinds(f)).not.toContain('roughing_passer');
    f.passer.secondStepLandedAfterRelease = true; f.passer.continuedDriveThrough = false; f.passer.attemptingAvoidance = true;
    expect(kinds(f)).not.toContain('roughing_passer');
  });
  it('preserves outside-pocket and forced-contact low-hit exceptions, including reestablished posture', () => {
    const f = { ...baseFacts('tackle', true, true), part: 'shoulder' as const, region: 'knee_or_below' as const, passer: passer() };
    expect(kinds(f)).toContain('roughing_passer');
    f.passer.outsidePocketMoving = true; expect(kinds(f)).not.toContain('roughing_passer');
    f.passer.reestablishedPassingPosture = true; expect(kinds(f)).toContain('roughing_passer');
    f.passer.blockedIntoContact = true; f.passer.noOpportunityToAvoid = true;
    expect(kinds(f)).not.toContain('roughing_passer');
    f.passer.rollOrLunge = true; expect(kinds(f)).toContain('roughing_passer');
    expect(kinds({ ...f, part: 'hand' })).not.toContain('roughing_passer');
  });
  it('protects the passer before release and does not excuse punishing finishes within the first step', () => {
    const f = { ...baseFacts('tackle', true, true), passer: passer({ passReleased: false, violentThrowOrDriveDown: true }) };
    expect(kinds(f)).toContain('roughing_passer');
    f.passer.violentThrowOrDriveDown = false; f.passer.mostWeightLanded = true;
    expect(kinds(f)).toContain('roughing_passer');
  });
  it('preserves incidental conventional head contact and applies actual helmet contact against any opponent', () => {
    const f = { ...baseFacts('tackle', true, true), part: 'helmet' as const, region: 'head_neck' as const, vulnerable: vulnerableFacts() };
    expect(kinds(f)).toContain('illegal_helmet');
    f.vulnerable.incidentalConventionalContact = true;
    expect(kinds(f)).not.toContain('illegal_helmet');
    f.vulnerable.incidentalConventionalContact = false; f.vulnerable.defenseless = true;
    expect(kinds(f)).toContain('unnecessary_roughness');
  });
  it('mask control remains illegal even if released immediately after the pull; a touch alone is not control', () => {
    const f = { ...baseFacts('grip', true, true), grip: { ...gripFacts(), location: 'facemask' as const, controlsTwistsTurnsPushesPulls: true, releasedImmediately: true } };
    expect(kinds(f)).toContain('facemask');
    f.grip.controlsTwistsTurnsPushesPulls = false;
    expect(kinds(f)).not.toContain('facemask');
  });
  it('requires the actual collar/nameplate pull and honors pocket/close-line exception', () => {
    const f = { ...baseFacts('grip', true, true), grip: { ...gripFacts(), location: 'inside_back_side_collar' as const, pullsTowardGround: true } };
    expect(kinds(f)).toContain('horse_collar');
    f.grip.runnerInPocketOrCloseLine = true; expect(kinds(f)).not.toContain('horse_collar');
    f.grip.runnerInPocketOrCloseLine = false; f.grip.pullsTowardGround = false;
    expect(kinds(f)).not.toContain('horse_collar');
  });
  it('does not relabel an ordinary falling wrap as a hip drop without leg landing/trapping', () => {
    const f = { ...baseFacts('tackle', true, true), grip: { ...gripFacts(), wrapsOrGrabsRunner: true,
      unweightsSwivelsDropsHips: true, broughtRunnerToGround: true } };
    expect(kinds(f)).not.toContain('hip_drop');
    f.grip.landsOnOrTrapsLegAtOrBelowKnee = true;
    expect(kinds(f)).toContain('hip_drop');
  });
  it('separates running into the kicking leg from plant-leg roughing and retains kick exceptions', () => {
    const kick: NonNullable<ContactRuleFacts['kick']> = { victimIsHolder: false, actualKickFromBehindLine: true,
      kickingLegContact: true, plantLegContact: false, slidIntoKickerWithBothFeetGrounded: false, severe: false,
      incidentalAfterOrSimultaneousKickTouch: false, kickerCausedContact: false, quickKick: false,
      outsidePocketWithoutReestablishedPosture: false, duringRunBehindLine: false,
      recoveredGroundedLooseBall: false, blockedOrFouledIntoContact: false,
      teammateBlockedKickAtSameTime: false, directCauseKickBlocked: false };
    const f = { ...baseFacts('tackle', true, false), kick };
    expect(kinds(f)).toEqual(['running_into_kicker']);
    expect(assessDangerousContact(f)[0].autoFirst).toBe(false);
    kick.plantLegContact = true;
    expect(kinds(f)).toEqual(['roughing_kicker']);
    for (const field of ['incidentalAfterOrSimultaneousKickTouch', 'kickerCausedContact', 'quickKick',
      'outsidePocketWithoutReestablishedPosture', 'duringRunBehindLine', 'recoveredGroundedLooseBall',
      'blockedOrFouledIntoContact', 'teammateBlockedKickAtSameTime'] as const) {
      expect(kinds({ ...f, kick: { ...kick, [field]: true } }), field).toEqual([]);
    }
    expect(kinds({ ...f, kick: { ...kick, victimIsHolder: true } })).toEqual(['roughing_holder']);
  });
  it('prohibits actual punches/kicks while preserving the permitted palm ward', () => {
    const f = { ...baseFacts('strike', true, false), prohibitedStrike: 'punch' as const };
    expect(kinds(f)).toContain('unnecessary_roughness');
    expect(kinds({ ...f, prohibitedStrike: 'club_head', permittedPalmWardOrLooseBallAttempt: true })).toEqual([]);
    expect(kinds({ ...f, prohibitedStrike: 'club_head' })).toContain('unnecessary_roughness');
  });
});

const offense = generateTeam(new Rng(61), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(62), 'D', 'D', { strength: .55 });
function scene() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'contact rule' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, firstDownX: 50, ballY: CENTER_Y, seed: 3, record: false });
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 }; a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.qb.body.pos = { x: 37, y: CENTER_Y - 8 };
  sim.t = .5; sim.world.time = .5;
  return sim;
}
const called = (sim: PlaySim, kind: string) => sim.penalties.filter(p => p.kind === kind);

describe('real World contact → native rule caller', () => {
  it.each([false, true])('retains first delivered geometry and calls only the back block, legalFront=%s', legalFront => {
    const sim = scene(), actor = sim.slot('X')!, victim = sim.slot('CB_S')!;
    actor.body.pos = { x: 44, y: CENTER_Y }; actor.body.facing = 0;
    victim.body.pos = { x: 44 + actor.profile.radius + victim.profile.radius - .02, y: CENTER_Y };
    victim.body.facing = legalFront ? Math.PI : 0;
    actor.body.vel = { x: 4, y: 0 };
    const rep = sim.engage(actor, victim, 'run', { x: 1, y: 0 }); expect(rep).not.toBeNull();
    rep!.control = .8;
    sim.tick();
    const contact = sim.lastStep!.contacts.find(c => [c.i, c.j].includes(actor.idx) && [c.i, c.j].includes(victim.idx));
    expect(contact?.first?.time).toBeGreaterThanOrEqual(.5);
    expect(contact?.first?.intervalEnd).toBeLessThanOrEqual(.55);
    expect(contact!.first!.velocityI.x).toBeGreaterThan(0);
    expect(called(sim, 'block_in_back')).toHaveLength(legalFront ? 0 : 1);
    expect(sim.frames).toEqual([]);
  });
  it('preserves the close-line exception for the same achieved back contact', () => {
    const sim = scene(), actor = sim.slot('X')!, victim = sim.slot('CB_S')!;
    sim.qb.body.pos.y = CENTER_Y; // Ball remains in the actual close-line area.
    actor.body.pos = { x: 40.2, y: CENTER_Y }; actor.body.facing = 0;
    victim.body.pos = { x: actor.pos.x + actor.profile.radius + victim.profile.radius - .02, y: CENTER_Y };
    victim.body.facing = 0; actor.body.vel = { x: 4, y: 0 };
    const rep = sim.engage(actor, victim, 'run', { x: 1, y: 0 }); expect(rep).not.toBeNull(); rep!.control = .8;
    sim.tick(); expect(sim.lastStep!.contacts.length).toBeGreaterThan(0);
    expect(called(sim, 'block_in_back')).toEqual([]);
  });
  it('calls an actual deliberate postrelease strike; a request before release stays a control', () => {
    const sim = scene(), rusher = sim.slot('CB_S')!;
    rusher.body.pos = { x: 35.9, y: sim.qb.pos.y };
    sim.throwBall(sim.qb, sim.slot('Z')!, { x: 15, y: 0, z: 5 }, { x: 55, y: sim.qb.pos.y, z: 1.5 }, sim.t + 1.2);
    sim.tick(); // Establishes chronological release before the new request.
    sim.world.strike(rusher.body, sim.qb.body, { x: 100, y: 0 });
    sim.tick();
    expect(sim.lastStep!.strikes).toHaveLength(1);
    expect(called(sim, 'roughing_passer')).toHaveLength(1);

    const control = scene(), defender = control.slot('CB_S')!;
    defender.body.pos = { x: 35.9, y: control.qb.pos.y };
    control.world.strike(defender.body, control.qb.body, { x: 100, y: 0 });
    control.throwBall(control.qb, control.slot('Z')!, { x: 15, y: 0, z: 5 }, { x: 55, y: control.qb.pos.y, z: 1.5 }, control.t + 1.2);
    control.tick();
    expect(control.lastStep!.strikes).toHaveLength(1);
    expect(called(control, 'roughing_passer')).toEqual([]);
  });
  it('an unreachable strike and a tiny achieved dose cannot become roughing', () => {
    for (const [x, impulse] of [[30, 100], [35.9, .1]]) {
      const sim = scene(), rusher = sim.slot('CB_S')!;
      rusher.body.pos = { x, y: sim.qb.pos.y };
      sim.throwBall(sim.qb, sim.slot('Z')!, { x: 15, y: 0, z: 5 }, { x: 55, y: sim.qb.pos.y, z: 1.5 }, sim.t + 1.2);
      sim.tick(); sim.world.strike(rusher.body, sim.qb.body, { x: impulse, y: 0 }); sim.tick();
      expect(called(sim, 'roughing_passer')).toEqual([]);
    }
  });
  it.each([false, true])('requires the target already outside when the new strike is requested, alreadyOut=%s', alreadyOut => {
    const sim = scene(), actor = sim.slot('CB_S')!, target = sim.slot('X')!;
    target.body.pos = { x: 44, y: alreadyOut ? -.3 : .03 };
    actor.body.pos = { x: 44, y: target.pos.y + 1 };
    actor.body.facing = -Math.PI / 2;
    target.body.vel = { x: 0, y: -2 };
    sim.world.strike(actor.body, target.body, { x: 0, y: -100 });
    sim.tick();
    const source = sim.lastStep!.strikes[0];
    expect(source).toBeDefined();
    expect(source.first!.time).toBeCloseTo(source.requestedAt!, 8);
    expect(source.first!.positionJ.y < 0).toBe(alreadyOut);
    expect(target.pos.y).toBeLessThan(0); // Control crosses only after request.
    expect(called(sim, 'unnecessary_roughness')).toHaveLength(alreadyOut ? 1 : 0);
  });
  it('an actual head-height helmet strike is distinct from a false helmet label on torso-height force', () => {
    for (const [headHeight, bodyRange] of [[false, true], [true, true], [true, false]]) {
      const sim = scene(), actor = sim.slot('CB_S')!, target = sim.slot('X')!;
      actor.body.pos = { x: 44, y: CENTER_Y };
      target.body.pos = { x: 44 + (bodyRange ? actor.profile.radius + target.profile.radius - .02 : 1.1), y: CENTER_Y };
      const height = Math.min(actor.profile.heightYd, target.profile.heightYd) * (headHeight ? .9 : .55);
      sim.world.strike(actor.body, target.body, { x: 100, y: 0 }, height,
        { actorPart: 'helmet', targetRegion: 'head_neck' });
      sim.tick(); expect(sim.lastStep!.strikes).toHaveLength(1);
      expect(called(sim, 'illegal_helmet')).toHaveLength(headHeight && bodyRange ? 1 : 0);
    }
  });
  it('binds a facemask grip to actual achieved head-height force and rejects torso relabeling', () => {
    for (const headHeight of [false, true]) {
      const sim = scene(), actor = sim.slot('CB_S')!, target = sim.slot('X')!;
      actor.body.pos = { x: 44, y: CENTER_Y }; target.body.pos = { x: 45, y: CENTER_Y };
      target.body.vel = { x: 4, y: 0 };
      const joint: GraspJoint = { kind: 'grasp', a: actor.body, b: target.body, reach: 1.4,
        capacity: 1000, legs: 0, pull: 1, hold: .9,
        height: Math.min(actor.profile.heightYd, target.profile.heightYd) * (headHeight ? .9 : .55),
        contactAnatomy: { actorPart: 'hand', targetRegion: 'head_neck', gripLocation: 'facemask' } };
      sim.world.joints.push(joint); sim.tick();
      expect(joint.force).toBeGreaterThan(0);
      expect(called(sim, 'facemask')).toHaveLength(headHeight ? 1 : 0);
    }
  });
  it('a textual foul and an unexecuted physical source cannot enter the called ledger', () => {
    const sim = scene(), actor = sim.slot('CB_S')!, victim = sim.qb;
    const fake = { i: actor.idx, j: victim.idx, impulse: { x: 1000, y: 0 }, work: 1 };
    sim.tick();
    const facts = { ...baseFacts('strike', true, false), passer: passer({ deliberateStrikeAfterRelease: true }) };
    recordAchievedContact(sim, sim.lastStep!, { actor, victim, source: fake, facts, time: sim.t, spot: victim.pos });
    expect(called(sim, 'roughing_passer')).toEqual([]);
  });
  it.each([false, true])('head-height hand force requires an actual forward thrust, forward=%s', forward => {
    const sim = scene(), actor = sim.slot('CB_S')!, target = sim.slot('X')!;
    actor.body.pos = { x: 44, y: CENTER_Y }; target.body.pos = { x: 45.1, y: CENTER_Y };
    actor.body.facing = 0;
    const height = Math.min(actor.profile.heightYd, target.profile.heightYd) * .9;
    sim.world.strike(actor.body, target.body, forward ? { x: 100, y: 0 } : { x: 0, y: 100 }, height,
      { actorPart: 'hand', targetRegion: 'head_neck' });
    sim.tick(); expect(sim.lastStep!.strikes).toHaveLength(1);
    expect(called(sim, 'illegal_hands')).toHaveLength(forward ? 1 : 0);
  });
  it('does not turn a continuing high contact that slides low into an initial low-block foul', () => {
    const sim = scene(), actor = sim.slot('X')!, target = sim.slot('CB_S')!;
    actor.body.pos = { x: 44, y: CENTER_Y + 8 }; target.body.pos = { x: 44.8, y: CENTER_Y + 8 };
    actor.body.facing = 0; target.body.facing = Math.PI;
    const rep = sim.engage(actor, target, 'run', { x: 1, y: 0 }); expect(rep).not.toBeNull();
    sim.world.joints = sim.world.joints.filter(j => j !== rep!.hands);
    const source: HandJoint = { kind: 'hands', a: actor.body, b: target.body, actor: actor.body,
      extension: 1, push: 1000, hold: 0, steer: 0, height: target.profile.heightYd * .6,
      contactAnatomy: { actorPart: 'hand', targetRegion: 'thigh' } };
    rep!.hands = source; sim.world.joints.push(source);
    // Isolate the two physical contact heights from the ordinary controller,
    // which replaces a technique's hand height on every decision tick.
    const advance = () => {
      const report = sim.world.step(sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), sim.dt);
      observeContactLegality(sim, report, sim.t); sim.t += sim.dt;
    };
    advance(); expect(source.normalForce).toBeGreaterThan(0);
    source.height = target.profile.heightYd * .4;
    advance(); expect(source.normalForce).toBeGreaterThan(0);
    expect(called(sim, 'low_block')).toEqual([]);
  });
  it('does not attribute a self-initiated dive fall to a simultaneously loaded collar grip', () => {
    const sim = scene(), actor = sim.slot('CB_S')!, target = sim.slot('X')!;
    actor.body.pos = { x: 44, y: CENTER_Y }; target.body.pos = { x: 45, y: CENTER_Y };
    target.body.facing = 0; actor.nextTackleAt = 100;
    sim.ball = { kind: 'held', carrier: target };
    const source: GraspJoint = { kind: 'grasp', a: actor.body, b: target.body, reach: 1.4,
      capacity: 1000, legs: 0, pull: 1, hold: .9, height: target.profile.heightYd * .65,
      contactAnatomy: { actorPart: 'hand', targetRegion: 'above_waist', gripLocation: 'inside_back_side_collar' } };
    sim.world.joints.push(source); sim.diveAt(target, { x: 1, y: 0 });
    sim.tick();
    expect(sim.lastStep!.falls).toContain(target.idx);
    expect(target.body.support!.cause).toBe('dive');
    expect(called(sim, 'horse_collar')).toEqual([]);
  });
  it.each([false, true])('does not infer a hip-drop finish from an executed wrap/swivel/dive and lower-leg restraint, trap=%s', trap => {
    const sim = scene(), holder = sim.slot('DT_S')!, runner = sim.slot('X')!;
    const torso = holder.profile.radius + runner.profile.radius;
    holder.body.pos = { x: 44, y: CENTER_Y }; runner.body.pos = { x: 45, y: CENTER_Y };
    holder.body.facing = 0; runner.body.facing = 0;
    holder.body.vel = { x: 2, y: 0 }; runner.body.vel = { x: 4, y: 0 };
    sim.ball = { kind: 'held', carrier: runner };
    const wrap: GraspJoint = { kind: 'grasp', a: holder.body, b: runner.body, reach: torso + holder.profile.reach,
      capacity: 500, legs: 0, pull: 0, hold: .9, height: runner.profile.heightYd * .65,
      contactAnatomy: { actorPart: 'hand', targetRegion: 'above_waist', gripLocation: 'other' } };
    sim.world.joints.push(wrap);
    let attemptEscape = false;
    const advance = (facing = Math.PI / 2, dive = false) => {
      sim.intents = sim.agents.map(a => ({ vel: { x: a === runner ? attemptEscape ? 7 : 4 : a === holder ? 2 : 0, y: 0 }, facing: a === holder ? facing : a.facing, ...(a === runner ? { push: 1 } : {}),
        ...(a === holder && dive ? { dive: { x: 0, y: .001 } } : {}) }));
      const report = sim.world.step(sim.intents, sim.dt);
      observeContactLegality(sim, report, sim.t); sim.t += sim.dt;
      return report;
    };
    advance(0);
    expect(wrap.force).toBeGreaterThan(0);
    wrap.hold = Math.hypot(holder.pos.x - runner.pos.x, holder.pos.y - runner.pos.y);
    for (let i = 0; i < 6; i++) advance();
    expect(holder.body.support!.state).toBe('up');
    expect(Math.abs(holder.facing)).toBeGreaterThan(Math.PI / 4);
    advance(Math.PI / 2, true);
    expect(holder.body.support!.cause).toBe('dive');
    expect(holder.body.support!.state).toBe('falling');
    let legTrap: GraspJoint | undefined;
    attemptEscape = true;
    if (trap) {
      const distance = Math.hypot(holder.pos.x - runner.pos.x, holder.pos.y - runner.pos.y);
      legTrap = { kind: 'grasp', a: holder.body, b: runner.body, reach: torso + holder.profile.reach,
        ground: torso + holder.profile.reach, capacity: 3000, legs: 1, pull: 0,
        hold: Math.max(.05, distance - .25), height: runner.profile.heightYd * .15,
        contactAnatomy: { actorPart: 'leg', targetRegion: 'knee_or_below' } };
      sim.world.joints.push(legTrap);
    }
    for (let i = 0; i < 20 && !called(sim, 'hip_drop').length; i++) advance();
    if (trap) expect(legTrap!.force).toBeGreaterThan(0);
    // Actual loaded leg restraint is not a certified landing or down. With
    // the trap binding his escape stride the runner may go down from his own
    // legs; that is still not a hip-drop finish.
    if (!trap) expect(runner.body.support!.state).toBe('up');
    else expect(runner.body.support!.state === 'up' || runner.body.support!.cause === 'legs').toBe(true);
    expect(called(sim, 'hip_drop')).toEqual([]);
  });
});

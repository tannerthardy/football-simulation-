/** NFL-2026 Rule12 contact rulings. Physics supplies the achieved act;
 * neither a requested technique nor a nearby body establishes a foul.
 * General torso records deliberately do not invent helmet/grip anatomy. */
import { angleDiff, type Vec2 } from '../core/vec.js';
import { FIELD_LENGTH, FIELD_WIDTH } from '../core/field.js';
import { padHeightAt, supportParams } from '../physics/support.js';
import type { ContactAnatomy, ContactRecord, GraspJoint, HandJoint, StepReport, StrikeRecord } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import type { PenaltyCall } from './types.js';

export type ContactFoulKind = 'block_in_back' | 'blindside_block' | 'clipping' | 'peel_back'
  | 'low_block' | 'chop_block' | 'crackback' | 'roughing_passer' | 'unnecessary_roughness'
  | 'illegal_helmet' | 'facemask' | 'horse_collar' | 'hip_drop' | 'tripping' | 'illegal_hands'
  | 'roughing_kicker' | 'running_into_kicker' | 'roughing_holder';
export type ContactPart = 'hand' | 'forearm' | 'shoulder' | 'helmet' | 'chest' | 'leg' | 'unknown';
export type ContactRegion = 'head_neck' | 'above_waist' | 'thigh' | 'knee_or_below' | 'unknown';

/** Explicit facts are supplied only when that element is represented. Unknown
 * is not false: predicates require the decisive exception to be excluded. */
export interface ContactRuleFacts {
  action: 'block' | 'strike' | 'tackle' | 'grip';
  actorIsDefense: boolean;
  initiated: boolean;
  force: 'clear' | 'borderline' | 'incidental';
  part: ContactPart;
  region: ContactRegion;
  victimIsRunner: boolean;
  block?: {
    fromBehind: boolean; fromSide: boolean;
    towardOwnEndLine: boolean; parallelOwnEndLine: boolean;
    closeLine: boolean; ballStillCloseLine: boolean;
    personalLooseBallAttempt: boolean; opponentTurnedAtImminentContact: boolean;
    bothHandsOnSide: boolean; continuousFromLegalSide: boolean;
    initialBelowWaist: boolean; targetFeetOnGround: boolean; targetAttemptingCatch: boolean;
    slidFromAboveWaist: boolean; wardedIntoLowContact: boolean;
    insideTightEndBox: boolean; afterPossessionChange: boolean; duringKick: boolean;
    clipDistantLineOpponentWithFlowAway: boolean; rollsUpSideOrBackOfLeg: boolean;
    nearShoulderCrossedFrontOfLegs: boolean;
    highLowPartner: 'none' | 'engaged_high' | 'still_confronting' | 'lure' | 'reverse';
    partnerIsOffense: boolean; opponentInitiatedPartnerContact: boolean; incidentalEscape: boolean;
    withinFiveOfLine: boolean; towardSnapPosition: boolean;
    wideAtSnap: boolean; backfieldMovedWide: boolean; backfieldMotionAtSnap: boolean;
  };
  passer?: {
    passingPosture: boolean; passReleased: boolean;
    releaseBehindLine: boolean; afterPossessionChange: boolean;
    outsidePocketMoving: boolean; reestablishedPassingPosture: boolean;
    secondStepLandedAfterRelease?: boolean;
    attemptingAvoidance?: boolean; continuedDriveThrough?: boolean;
    blockedIntoContact: boolean; noOpportunityToAvoid: boolean;
    stationaryOrFading: boolean; becameRunnerOrBlocker: boolean;
    deliberateStrikeAfterRelease: boolean;
    violentThrowOrDriveDown?: boolean; mostWeightLanded?: boolean;
    feetOnGround: boolean; rollOrLunge: boolean;
  };
  vulnerable?: {
    defenseless: boolean; headLowered: boolean; incidentalConventionalContact: boolean;
    launchedForwardUpward: boolean;
    alreadyOnGround: boolean; outOfBounds: boolean;
    forwardProgressStopped: boolean; slidOrGaveUp: boolean;
    avoidableDeliberateContact: boolean;
  };
  grip?: {
    location: 'facemask' | 'helmet_opening' | 'inside_back_side_collar' | 'nameplate_or_above' | 'other';
    controlsTwistsTurnsPushesPulls: boolean; releasedImmediately: boolean;
    pullsTowardGround: boolean; kneesBuckled: boolean;
    runnerInPocketOrCloseLine: boolean;
    wrapsOrGrabsRunner: boolean; unweightsSwivelsDropsHips: boolean;
    landsOnOrTrapsLegAtOrBelowKnee: boolean; broughtRunnerToGround: boolean;
  };
  legUsedToTrip?: boolean;
  handsThrustAboveFrameDirectOrProlonged?: boolean;
  prohibitedStrike?: 'punch' | 'kick' | 'knee' | 'club_head' | 'leg_whip' | 'unnecessary_forearm';
  permittedPalmWardOrLooseBallAttempt?: boolean;
  kick?: {
    victimIsHolder: boolean; actualKickFromBehindLine: boolean;
    kickingLegContact: boolean; plantLegContact: boolean;
    slidIntoKickerWithBothFeetGrounded: boolean; severe: boolean;
    incidentalAfterOrSimultaneousKickTouch: boolean;
    kickerCausedContact: boolean; quickKick: boolean;
    outsidePocketWithoutReestablishedPosture: boolean;
    duringRunBehindLine: boolean; recoveredGroundedLooseBall: boolean;
    blockedOrFouledIntoContact: boolean;
    teammateBlockedKickAtSameTime: boolean; directCauseKickBlocked: boolean;
  };
}

export interface ContactViolation { kind: ContactFoulKind; rule: string; reason: string; autoFirst: boolean }

/** Deterministic legal assessment, separate from future referee visibility.
 * Borderline force/restriction is deliberately not promoted to a called act. */
export function assessDangerousContact(f: ContactRuleFacts): ContactViolation[] {
  const out: ContactViolation[] = [];
  if (!f.initiated || f.force !== 'clear') return out;
  const add = (kind: ContactFoulKind, rule: string, reason: string, autoFirst = f.actorIsDefense): void => {
    if (!out.some(o => o.kind === kind)) out.push({ kind, rule, reason, autoFirst });
  };
  const low = f.region === 'thigh' || f.region === 'knee_or_below';
  const b = f.block;
  if (f.action === 'block' && b && !f.victimIsRunner) {
    if (f.region === 'above_waist' && b.fromBehind && !b.closeLine
      && !b.personalLooseBallAttempt && !b.opponentTurnedAtImminentContact
      && !b.bothHandsOnSide && !f.actorIsDefense) {
      add('block_in_back', '12-1-3(b)', 'achieved material block from behind above the waist');
    }
    if (low && !b.opponentTurnedAtImminentContact
      && !b.continuousFromLegalSide && (b.fromBehind && (!b.closeLine
        || f.region === 'knee_or_below' || b.clipDistantLineOpponentWithFlowAway)
        || b.rollsUpSideOrBackOfLeg)) {
      add('clipping', '12-2-1', 'prohibited low contact from behind or roll-up');
    }
    if (low && b.initialBelowWaist && b.towardOwnEndLine && (b.fromBehind || b.fromSide)
      && !b.nearShoulderCrossedFrontOfLegs && !f.actorIsDefense) {
      add('peel_back', '12-2-2', 'initiated side/behind low block toward own end line');
    }
    if (low && b.initialBelowWaist && b.targetFeetOnGround && !b.targetAttemptingCatch && !b.slidFromAboveWaist
      && !b.wardedIntoLowContact && (b.afterPossessionChange || b.duringKick || !b.insideTightEndBox)) {
      add('low_block', '12-2-4', 'initial low block in a prohibited phase or area');
    }
    if (low && b.highLowPartner !== 'none' && b.partnerIsOffense && !f.actorIsDefense
      && !b.opponentInitiatedPartnerContact && !b.incidentalEscape) {
      add('chop_block', '12-2-5', 'offensive high/low combination, including lure or reverse order');
    }
    const crackback = !f.actorIsDefense && b.withinFiveOfLine && b.towardSnapPosition
      && (b.wideAtSnap || b.backfieldMovedWide || b.backfieldMotionAtSnap);
    if (crackback && (low || prohibitedDefenselessContact(f))) {
      add('crackback', '12-2-6', 'prohibited low or defenseless contact on a crackback');
    }
    if ((b.towardOwnEndLine || b.parallelOwnEndLine)
      && ['helmet', 'forearm', 'shoulder'].includes(f.part)
      && !(b.closeLine && b.ballStillCloseLine)) {
      add('blindside_block', '12-2-7', 'forcible initiated helmet/forearm/shoulder block toward or parallel to own end line');
    }
  }
  const p = f.passer;
  if (p?.passingPosture && p.releaseBehindLine) {
    const pocketProtections = !p.outsidePocketMoving || p.reestablishedPassingPosture;
    const forcedUnavoidable = p.blockedIntoContact && p.noOpportunityToAvoid;
    if ((!forcedUnavoidable && pocketProtections && p.secondStepLandedAfterRelease
      && (p.continuedDriveThrough || p.attemptingAvoidance === false))
      || p.violentThrowOrDriveDown || p.mostWeightLanded
      || (f.region === 'head_neck' && f.part !== 'unknown')
      || (f.part === 'helmet' && f.vulnerable?.headLowered)
      || (pocketProtections && p.feetOnGround && f.region === 'knee_or_below'
        && ['helmet', 'shoulder', 'chest', 'forearm'].includes(f.part)
        && (!forcedUnavoidable || p.rollOrLunge))
      || (p.passReleased && p.stationaryOrFading && !p.becameRunnerOrBlocker
        && p.deliberateStrikeAfterRelease && !forcedUnavoidable)) {
      add('roughing_passer', '12-2-11', 'prohibited achieved contact against a protected passer', true);
    }
  }
  const v = f.vulnerable;
  if (v) {
    if (v.avoidableDeliberateContact && (v.alreadyOnGround || v.outOfBounds
      || v.forwardProgressStopped || v.slidOrGaveUp)) {
      add('unnecessary_roughness', '12-2-8', 'avoidable deliberate contact on a grounded, out-of-bounds or stopped/giving-up player');
    }
    if (v.defenseless && prohibitedDefenselessContact(f)) {
      add('unnecessary_roughness', '12-2-9', 'prohibited contact against a defenseless opponent', true);
    }
    if (!v.incidentalConventionalContact && f.part === 'helmet'
      && (v.headLowered || f.region === 'head_neck')) {
      add('illegal_helmet', '12-2-10', 'forcible lowered-head helmet use or helmet contact to head/neck');
    }
  }
  const g = f.grip;
  if (g) {
    if (['facemask', 'helmet_opening'].includes(g.location)
      && g.controlsTwistsTurnsPushesPulls) {
      add('facemask', '12-2-15', 'achieved control/twist/turn/push/pull of mask or helmet opening');
    }
    if (f.victimIsRunner && ['inside_back_side_collar', 'nameplate_or_above'].includes(g.location)
      && (g.pullsTowardGround || g.kneesBuckled) && !g.runnerInPocketOrCloseLine) {
      add('horse_collar', '12-2-16', 'prohibited collar/nameplate grip pulling runner toward ground', true);
    }
    if (f.victimIsRunner && g.wrapsOrGrabsRunner && g.unweightsSwivelsDropsHips
      && g.landsOnOrTrapsLegAtOrBelowKnee && g.broughtRunnerToGround) {
      add('hip_drop', '12-2-18', 'wrap/grab with unweighting swivel/drop and lower-leg landing/trapping finish', true);
    }
  }
  if (f.legUsedToTrip) add('tripping', '12-2-14(c)', 'leg or foot used to trip an opponent');
  if (f.prohibitedStrike && !(f.prohibitedStrike === 'club_head' && f.permittedPalmWardOrLooseBallAttempt)) {
    add('unnecessary_roughness', '12-2-14', `prohibited achieved ${f.prohibitedStrike}`);
  }
  if (f.part === 'hand' && f.region === 'head_neck' && f.handsThrustAboveFrameDirectOrProlonged) {
    add('illegal_hands', f.actorIsDefense ? '12-1-7' : '12-1-3(a)', 'forcible direct/prolonged hand thrust above the frame');
  }
  const k = f.kick;
  if (k && !k.incidentalAfterOrSimultaneousKickTouch && !k.blockedOrFouledIntoContact
    && !k.recoveredGroundedLooseBall && !(k.teammateBlockedKickAtSameTime && !k.directCauseKickBlocked)) {
    if (k.victimIsHolder) {
      add('roughing_holder', '12-2-13', 'forcible holder contact without a qualified exception', true);
    } else if (k.actualKickFromBehindLine && !k.kickerCausedContact && !k.quickKick
      && !k.outsidePocketWithoutReestablishedPosture && !k.duringRunBehindLine) {
      if (k.plantLegContact || k.slidIntoKickerWithBothFeetGrounded && k.severe) {
        add('roughing_kicker', '12-2-12', 'plant-leg contact or severe sliding contact with grounded kicker', true);
      } else if (k.kickingLegContact || k.slidIntoKickerWithBothFeetGrounded) {
        add('running_into_kicker', '12-2-12', 'non-roughing kicking-leg or sliding contact', false);
      }
    }
  }
  return out;
}

function prohibitedDefenselessContact(f: ContactRuleFacts): boolean {
  const v = f.vulnerable;
  return !!v && !v.incidentalConventionalContact && ((f.region === 'head_neck'
    && ['helmet', 'forearm', 'shoulder'].includes(f.part))
    || (f.part === 'helmet' && (v.headLowered || v.launchedForwardUpward)));
}

type DeliveredSource = ContactRecord | StrikeRecord | HandJoint | GraspJoint;
export interface AchievedRuleContact {
  actor: Agent; victim: Agent; source: DeliveredSource;
  facts: ContactRuleFacts; time: number; spot: Vec2;
  hipDropFinish?: { upperWrap: GraspJoint; legTrap: GraspJoint };
}

/** One conservative materiality gate for reduced native records: a clear
 * delivered dose capable of changing victim speed by >=0.2yd/s. This is an
 * explicit judgment proxy, not an NFL numerical threshold; lesser/ambiguous
 * contact is not called by these automatic branches. */
export function clearlyMaterialImpulse(impulse: number, victim: Agent): boolean {
  return Number.isFinite(impulse) && impulse >= victim.profile.massKg * .2;
}

/** Shared caller for executed anatomical techniques. The source must be an
 * actual delivered report row or a loaded native joint, never a requested
 * contact label. Technique-specific geometry/region facts remain required. */
export function recordAchievedContact(sim: PlaySim, report: StepReport, act: AchievedRuleContact): void {
  if (act.actor === act.victim || act.actor.team === act.victim.team) return;
  let impulse = 0;
  const source = act.source;
  if ('i' in source) {
    if ('work' in source) {
      if (!report.strikes.includes(source) || source.i !== act.actor.idx || source.j !== act.victim.idx) return;
      impulse = Math.hypot(source.impulse.x, source.impulse.y);
    } else {
      if (!report.contacts.includes(source) || ![source.i, source.j].includes(act.actor.idx)
        || ![source.i, source.j].includes(act.victim.idx)) return;
      impulse = source.impulse;
    }
  } else {
    if (!sim.world.joints.includes(source) || ![source.a, source.b].includes(act.actor.body)
      || ![source.a, source.b].includes(act.victim.body)) return;
    const responsible = source.kind === 'grasp' ? source.a
      : act.facts.grip ? source.holder ?? source.a : source.actor ?? source.a;
    if (act.actor.body !== responsible) return;
    impulse = source.kind === 'hands' ? Math.hypot(source.normalForce ?? 0, source.tangentForce ?? 0) * sim.dt
      : source.broken ? 0 : (source.force ?? 0) * sim.dt;
  }
  if (!clearlyMaterialImpulse(impulse, act.victim)) return;
  const hipDrop = !!act.hipDropFinish && qualifiedHipDropFinish(sim, report, act);
  if (act.hipDropFinish && !hipDrop) return;
  if (!anatomyMatches(hipDrop ? { ...act, facts: { ...act.facts, grip: undefined } } : act)) return;
  for (const violation of assessDangerousContact(act.facts)) {
    // The reduced World has no generic lower-body landing-on-leg record.
    // Only the separately qualified two-receipt trapping sequence can prove
    // this finish; its positive native football witness remains unproven.
    if (violation.kind === 'hip_drop' && !hipDrop) {
      sim.ruleLimitations.add('12-2-18: lower-body landing/trapping receipt is not represented by a generic fall or grasp');
      continue;
    }
    const id = `contact:${violation.kind}:${act.actor.idx}:${act.victim.idx}`;
    sim.recordFoul({ id, kind: violation.kind as PenaltyCall['kind'], against: act.actor.team,
      playerId: act.actor.player.id, yards: violation.kind === 'running_into_kicker' ? 5
        : violation.kind === 'block_in_back' ? 10
        : violation.kind === 'illegal_hands' ? act.actor.team === 'D' ? 5 : 10 : 15,
      autoFirst: violation.autoFirst, spotX: act.spot.x, t: act.time,
      rule: violation.rule, reason: violation.reason },
    { source: 'native', rule: violation.rule, action: act.facts.action,
      victimId: act.victim.player.id, facts: { impulse, part: act.facts.part,
        region: act.facts.region, initiated: act.facts.initiated, force: act.facts.force,
        judgment: 'clearly material achieved contact; borderline/unknown is not called' } });
  }
}

/** Reduced anatomy is an explicit contact-patch chart, not a full skeleton.
 * It moves with the same pad-height posture model used to apply the force.
 * Merely attaching a head/collar label to a torso-height force is rejected. */
export function contactRegionAtHeight(victim: Agent, height: number): ContactRegion {
  const stature = victim.profile.heightYd;
  const pads = padHeightAt(supportParams(victim.profile), victim.body.support?.posture ?? 0);
  const crouch = pads / (.67 * stature);
  if (height < 0 || height > pads + .33 * stature + 1e-8) return 'unknown';
  // The engine's pad height is an upper-torso load proxy, not the neck.
  // Keep explicit uncertainty bands around anatomical boundaries.
  const waist = .55 * stature * crouch, knee = .28 * stature * crouch;
  const neck = pads + .15 * stature;
  if (height >= neck + .025 * stature) return 'head_neck';
  if (height >= waist + .03 * stature && height <= neck - .025 * stature) return 'above_waist';
  if (height < knee - .02 * stature) return 'knee_or_below';
  if (height > knee + .02 * stature && height < waist - .03 * stature) return 'thigh';
  return 'unknown';
}

function anatomyMatches(act: AchievedRuleContact): boolean {
  const source = act.source;
  if ('i' in source && !('work' in source)) {
    // Native collision rows are torso contacts. They cannot prove helmet,
    // limb, mask or collar contact by accepting a caller's textual label.
    return act.facts.part === 'unknown' && act.facts.region === 'above_waist' && !act.facts.grip;
  }
  const anatomy = source.contactAnatomy;
  if (!anatomy) return act.facts.part === 'unknown' && act.facts.region === 'unknown' && !act.facts.grip;
  const height = 'i' in source ? source.first?.height : source.achievedContactHeight;
  if (height === undefined || anatomy.actorPart !== act.facts.part || anatomy.targetRegion !== act.facts.region
    || contactRegionAtHeight(act.victim, height) !== anatomy.targetRegion) return false;
  const actorPads = padHeightAt(supportParams(act.actor.profile), act.actor.body.support?.posture ?? 0);
  const stature = act.actor.profile.heightYd;
  const first = 'i' in source ? source.first : source.firstApplied;
  if (!first) return false;
  const distance = Math.hypot(first.positionJ.x - first.positionI.x, first.positionJ.y - first.positionI.y);
  const torsoReach = act.actor.profile.radius + act.victim.profile.radius;
  const armGap = Math.max(0, distance - torsoReach);
  const shoulder = actorPads + .13 * stature;
  const armReach = Math.hypot(armGap, height - shoulder);
  const validPart = anatomy.actorPart === 'hand' || anatomy.actorPart === 'forearm'
    ? armReach <= act.actor.profile.reach * (anatomy.actorPart === 'forearm' ? .7 : 1)
    : anatomy.actorPart === 'helmet' ? height >= actorPads + .18 * stature && distance <= torsoReach
      : anatomy.actorPart === 'shoulder' ? Math.abs(height - shoulder) <= .045 * stature && distance <= torsoReach
        : anatomy.actorPart === 'chest' ? height >= actorPads - .12 * stature && height <= actorPads + .105 * stature && distance <= torsoReach
          : height <= actorPads - .17 * stature
            && Math.hypot(armGap, height - .55 * stature) <= .55 * stature;
  if (!validPart) return false;
  if (act.facts.grip) {
    if ('i' in source || anatomy.actorPart !== 'hand'
      || anatomy.gripLocation !== act.facts.grip.location) return false;
    if (act.facts.grip.location === 'facemask' || act.facts.grip.location === 'helmet_opening') {
      if (anatomy.targetRegion !== 'head_neck') return false;
    } else if (act.facts.grip.location !== 'other') {
      if (anatomy.targetRegion !== 'above_waist') return false;
      const dx = act.actor.pos.x - act.victim.pos.x, dy = act.actor.pos.y - act.victim.pos.y;
      // Back/side collar and nameplate are not reachable as a front patch.
      if (dx * Math.cos(act.victim.facing) + dy * Math.sin(act.victim.facing) > 0) return false;
    }
  }
  return true;
}

interface ContactHistory {
  pairs: Set<string>;
  previousFacing: Map<number, number>;
  closeLineGone: boolean;
  wideBackfield: Set<number>;
  passers: Map<number, { releaseT: number; releaseX: number }>;
  initialRegions: Map<string, ContactRegion>;
  firstSeen: Map<GraspJoint, number>;
  wraps: Map<GraspJoint, { time: number; facing: number; actuatedSwivel: boolean }>;
  unweights: Map<number, number>;
}
const histories = new WeakMap<PlaySim, ContactHistory>();

/** Run after World and before the whistle. This delivers two native branches
 * that the current reduced body model can actually establish: clear new torso
 * back-blocks, and deliberate achieved strikes against an out-of-play passer
 * or already-grounded player. Other anatomy predicates require executing
 * techniques to provide the achieved part/grip/landing facts above. */
export function observeContactLegality(sim: PlaySim, report: StepReport, intervalStart: number): void {
  let history = histories.get(sim);
  if (!history) { history = { pairs: new Set(), previousFacing: new Map(), closeLineGone: false,
    wideBackfield: new Set(), passers: new Map(), initialRegions: new Map(), firstSeen: new Map(),
    wraps: new Map(), unweights: new Map() }; histories.set(sim, history); }
  for (const joint of sim.world.joints) if (joint.kind === 'grasp' && !history.firstSeen.has(joint)) {
    history.firstSeen.set(joint, intervalStart);
  }
  if (sim.ball.kind === 'air') history.passers.set(sim.ball.thrower.idx,
    { releaseT: sim.ball.releaseT, releaseX: sim.ball.releaseX });
  const left = sim.offAlign.spots.LT, right = sim.offAlign.spots.RT;
  const tackleLeft = sim.slot('LT'), tackleRight = sim.slot('RT');
  const lowY = Math.min(left.pos.y - (tackleLeft?.profile.radius ?? .4), right.pos.y - (tackleRight?.profile.radius ?? .4));
  const highY = Math.max(left.pos.y + (tackleLeft?.profile.radius ?? .4), right.pos.y + (tackleRight?.profile.radius ?? .4));
  const ball = sim.ballPos();
  if (ball.y < lowY || ball.y > highY || ball.x > sim.los + 3) history.closeLineGone = true;
  const closeLine = (x: number, y: number): boolean => !history!.closeLineGone && x <= sim.los + 3 && y >= lowY && y <= highY;
  for (const agent of sim.offense) if (sim.offAlign.spots[agent.slot]?.backfield
    && (agent.pos.y < lowY - 2 || agent.pos.y > highY + 2)) history.wideBackfield.add(agent.idx);

  for (const contact of report.contacts) {
    const first = contact.first;
    if (!first) continue;
    const a = sim.agents[contact.i], b = sim.agents[contact.j];
    if (!a || !b || a.team === b.team) continue;
    const pair = `${Math.min(a.idx, b.idx)}:${Math.max(a.idx, b.idx)}`;
    for (const victim of [a, b]) {
      const key = `${pair}:${victim.idx}`;
      if (!history.initialRegions.has(key)) history.initialRegions.set(key, contactRegionAtHeight(victim, first.height));
    }
    const initial = !history.pairs.has(pair);
    history.pairs.add(pair);
    if (!initial) continue;
    for (const [actor, victim] of [[a, b], [b, a]]) {
      if (actor.team !== sim.possession || sim.carrier === actor || sim.carrier === victim) continue;
      const rep = actor.engagement;
      if (!rep || rep.defender !== victim || rep.blocker !== actor && !rep.helpers.includes(actor)) continue;
      const x = actor === a ? first.positionI : first.positionJ;
      const y = actor === a ? first.positionJ : first.positionI;
      const actorV = actor === a ? first.velocityI : first.velocityJ;
      const targetFacing = actor === a ? first.facingJ : first.facingI;
      const targetOldFacing = history.previousFacing.get(victim.idx);
      // A newly facing-away target may have turned as contact became imminent.
      if (targetOldFacing !== undefined && Math.abs(angleDiff(targetOldFacing, targetFacing)) > Math.PI / 6) continue;
      const dx = y.x - x.x, dy = y.y - x.y, distance = Math.hypot(dx, dy) || 1;
      const approach = (actorV.x * dx + actorV.y * dy) / distance;
      if (approach < .5) continue; // No attribution to a body backed into him.
      const behind = ((x.x - y.x) * Math.cos(targetFacing) + (x.y - y.y) * Math.sin(targetFacing)) / distance < -.7;
      if (!behind) continue;
      if (contactRegionAtHeight(victim, first.height) !== 'above_waist') continue;
      const f = baseFacts('block', false, false);
      f.part = 'unknown'; f.region = 'above_waist';
      f.block = blockFacts();
      f.block.fromBehind = true;
      f.block.closeLine = closeLine(y.x, y.y);
      f.block.ballStillCloseLine = !history.closeLineGone;
      // Loose-ball personal recovery is a real exception, not a block flag.
      f.block.personalLooseBallAttempt = sim.ball.kind === 'loose';
      recordAchievedContact(sim, report, { actor, victim, source: contact, facts: f,
        time: first.time, spot: { ...y } });
    }
  }

  for (const strike of report.strikes) {
    const actor = sim.agents[strike.i], victim = sim.agents[strike.j], first = strike.first;
    if (!actor || !victim || !first || actor.team === victim.team) continue;
    const rep = actor.engagement;
    const blocking = !!rep && rep.defender === victim && (rep.blocker === actor || rep.helpers.includes(actor));
    const f = baseFacts(blocking ? 'block' : 'strike', actor.team !== sim.possession, sim.carrier === victim);
    applyAnatomy(f, strike.contactAnatomy);
    if (strike.contactAnatomy?.handShape === 'fist' && f.part === 'hand') f.prohibitedStrike = 'punch';
    if (f.part === 'leg') f.prohibitedStrike = 'kick';
    const dose = Math.hypot(strike.impulse.x, strike.impulse.y);
    if (f.part === 'hand' && f.region === 'head_neck' && dose > 0
      && (strike.impulse.x * first.normal.x + strike.impulse.y * first.normal.y) / dose > .8
      && Math.cos(actor.facing) * first.normal.x + Math.sin(actor.facing) * first.normal.y > .8) {
      f.handsThrustAboveFrameDirectOrProlonged = true;
    }
    const targetSupport = first.supportJ;
    // The first achieved snapshot can establish the request-time boundary
    // only when no simulation time elapsed since the request. A player who
    // crosses later in this interval does not prove avoidable late contact.
    const alreadyOutAtRequest = strike.requestedAt !== undefined
      && Math.abs(first.time - strike.requestedAt) <= 1e-8
      && (first.positionJ.x <= 0 || first.positionJ.x >= FIELD_LENGTH
        || first.positionJ.y <= 0 || first.positionJ.y >= FIELD_WIDTH);
    if (targetSupport === 'down' || alreadyOutAtRequest) {
      f.vulnerable = vulnerableFacts(); f.vulnerable.alreadyOnGround = targetSupport === 'down';
      f.vulnerable.outOfBounds = alreadyOutAtRequest;
      f.vulnerable.avoidableDeliberateContact = !forcedInto(sim, report, actor, victim);
    }
    const released = history.passers.get(victim.idx);
    if (released && released.releaseX <= sim.los
      && strike.requestedAt !== undefined && strike.requestedAt > released.releaseT + 1e-9
      && first.positionJ.x <= sim.los && !victim.engagement
      && sim.carrier !== victim && sim.possession === victim.team
      && Math.hypot(first.velocityJ.x, first.velocityJ.y) < .5) {
      f.passer = { passingPosture: true, passReleased: true, releaseBehindLine: true,
        afterPossessionChange: sim.segments.some(s => s.team === 'D'),
        outsidePocketMoving: false, reestablishedPassingPosture: false,
        blockedIntoContact: forcedInto(sim, report, actor, victim), noOpportunityToAvoid: true,
        stationaryOrFading: true, becameRunnerOrBlocker: false,
        deliberateStrikeAfterRelease: true, feetOnGround: targetSupport === 'up', rollOrLunge: false };
    }
    const pair = `${Math.min(actor.idx, victim.idx)}:${Math.max(actor.idx, victim.idx)}`;
    const initialKey = `${pair}:${victim.idx}`;
    if (!history.initialRegions.has(initialKey)) history.initialRegions.set(initialKey, contactRegionAtHeight(victim, first.height));
    if (blocking && strike.contactAnatomy) {
      f.block = nativeBlockFacts(sim, actor, victim,
        first.positionI, first.positionJ, first.facingJ, first.velocityI, first.supportJ === 'up',
        closeLine(first.positionJ.x, first.positionJ.y), !history.closeLineGone,
        history.wideBackfield.has(actor.idx));
      f.block.initialBelowWaist = ['thigh', 'knee_or_below'].includes(history.initialRegions.get(initialKey)!);
      f.block.slidFromAboveWaist = !f.block.initialBelowWaist;
    }
    if (f.passer || f.vulnerable || strike.contactAnatomy) recordAchievedContact(sim, report, { actor, victim, source: strike,
      facts: f, time: first.time, spot: { ...first.positionJ } });
  }
  for (const source of sim.world.joints) {
    if (!source.contactAnatomy || source.kind === 'grasp' && source.broken) continue;
    const actorBody = source.kind === 'hands'
      ? source.contactAnatomy.gripLocation ? source.holder ?? source.a : source.actor ?? source.a : source.a;
    const actor = sim.agents.find(a => a.body === actorBody);
    const victim = sim.agents.find(a => a.body === (actorBody === source.a ? source.b : source.a));
    if (!actor || !victim || actor.team === victim.team) continue;
    const rep = actor.engagement;
    const blocking = !!rep && rep.defender === victim && (rep.blocker === actor || rep.helpers.includes(actor));
    const f = baseFacts(blocking ? 'block' : 'grip', actor.team !== sim.possession, sim.carrier === victim);
    applyAnatomy(f, source.contactAnatomy);
    const normal = source.normalForce ?? 0;
    const pair = `${Math.min(actor.idx, victim.idx)}:${Math.max(actor.idx, victim.idx)}`;
    const initialKey = `${pair}:${victim.idx}`;
    if (!history.initialRegions.has(initialKey) && source.achievedContactHeight !== undefined
      && Math.abs(normal) > 0) history.initialRegions.set(initialKey, contactRegionAtHeight(victim, source.achievedContactHeight));
    if (source.contactAnatomy.gripLocation) {
      f.grip = gripFacts(); f.grip.location = source.contactAnatomy.gripLocation;
      f.grip.controlsTwistsTurnsPushesPulls = normal < 0;
      f.grip.wrapsOrGrabsRunner = true;
      f.grip.pullsTowardGround = normal < 0 && report.falls.includes(victim.idx)
        && ['contact', 'legs'].includes(victim.body.support?.cause ?? '')
        && !forcedVictim(sim, report, source, victim);
      f.grip.runnerInPocketOrCloseLine = closeLine(victim.pos.x, victim.pos.y)
        || victim.pos.x <= sim.los && victim.pos.y >= lowY && victim.pos.y <= highY;
    }
    if (blocking) {
      f.block = nativeBlockFacts(sim, actor, victim, actor.pos, victim.pos,
        victim.facing, actor.vel, victim.body.support?.state === 'up',
        closeLine(victim.pos.x, victim.pos.y), !history.closeLineGone, history.wideBackfield.has(actor.idx));
      f.block.initialBelowWaist = ['thigh', 'knee_or_below'].includes(history.initialRegions.get(initialKey) ?? 'unknown');
      f.block.slidFromAboveWaist = history.initialRegions.get(initialKey) === 'above_waist';
    }
    recordAchievedContact(sim, report, { actor, victim, source, facts: f, time: intervalStart,
      spot: { ...victim.pos } });
  }
  // Initial hands can establish a continuous legal block before the first
  // torso contact. A later body collision cannot erase that origin.
  for (const joint of sim.world.joints) if (joint.kind === 'hands'
    && Math.hypot(joint.normalForce ?? 0, joint.tangentForce ?? 0) > 0) {
    const i = sim.world.indexOf(joint.a), j = sim.world.indexOf(joint.b);
    history.pairs.add(`${Math.min(i, j)}:${Math.max(i, j)}`);
  }
  observeHipDropFinish(sim, report, history, intervalStart);
  for (const agent of sim.agents) history.previousFacing.set(agent.idx, agent.facing);
}

/** The lower receipt is an explicitly executed leg-to-leg trapping constraint,
 * not an ordinary hands-on-legs grasp. It must be acquired after a deliberate
 * off-feet action and an actuated swivel, while the original arm wrap survives.
 * This reuses the existing lower support coupling; it creates no extra force. */
function observeHipDropFinish(sim: PlaySim, report: StepReport, history: ContactHistory, intervalStart: number): void {
  for (const source of sim.world.joints) {
    if (source.kind !== 'grasp' || source.broken || source.contactAnatomy?.actorPart !== 'hand'
      || source.contactAnatomy.targetRegion !== 'above_waist' || source.contactAnatomy.gripLocation !== 'other') continue;
    const actor = sim.agents.find(a => a.body === source.a), victim = sim.agents.find(a => a.body === source.b);
    if (!actor || !victim || sim.carrier !== victim || !source.firstApplied) continue;
    if (!history.wraps.has(source) && source.firstApplied.supportI === 'up'
      && clearlyMaterialImpulse((source.force ?? 0) * sim.dt, victim)) {
      const facts = baseFacts('grip', actor.team !== sim.possession, true);
      facts.part = 'hand'; facts.region = 'above_waist';
      if (anatomyMatches({ actor, victim, source, facts, time: intervalStart, spot: victim.pos })) {
        history.wraps.set(source, { time: source.firstApplied.time, facing: source.firstApplied.facingI, actuatedSwivel: false });
      }
    }
    const wrap = history.wraps.get(source), desiredFacing = sim.intents[actor.idx]?.facing;
    if (wrap && actor.body.support?.state === 'up' && desiredFacing !== undefined
      && Math.abs(angleDiff(wrap.facing, desiredFacing)) >= Math.PI / 4
      && report.groundYawWork[actor.idx] > 0) wrap.actuatedSwivel = true;
  }
  for (const i of report.falls) {
    const actor = sim.agents[i];
    if (actor?.body.support?.cause === 'dive' && sim.intents[i]?.dive) history.unweights.set(i, actor.body.support.since);
  }
  for (const legTrap of sim.world.joints) {
    if (legTrap.kind !== 'grasp' || legTrap.broken || legTrap.contactAnatomy?.actorPart !== 'leg'
      || legTrap.contactAnatomy.targetRegion !== 'knee_or_below' || legTrap.legs <= 0) continue;
    const actor = sim.agents.find(a => a.body === legTrap.a), victim = sim.agents.find(a => a.body === legTrap.b);
    if (!actor || !victim || sim.carrier !== victim) continue;
    const upperWrap = [...history.wraps.keys()].find(w => w.a === legTrap.a && w.b === legTrap.b && !w.broken);
    if (!upperWrap) continue;
    const facts = baseFacts('tackle', actor.team !== sim.possession, true);
    facts.part = 'leg'; facts.region = 'knee_or_below';
    facts.grip = { ...gripFacts(), wrapsOrGrabsRunner: true, unweightsSwivelsDropsHips: true,
      landsOnOrTrapsLegAtOrBelowKnee: true, broughtRunnerToGround: true };
    recordAchievedContact(sim, report, { actor, victim, source: legTrap, facts, time: intervalStart,
      spot: { ...victim.pos }, hipDropFinish: { upperWrap, legTrap } });
  }
}

function qualifiedHipDropFinish(sim: PlaySim, report: StepReport, act: AchievedRuleContact): boolean {
  const finish = act.hipDropFinish, history = histories.get(sim);
  if (!finish || !history || act.source !== finish.legTrap || act.facts.grip?.location !== 'other') return false;
  const { upperWrap, legTrap } = finish;
  const wrap = history.wraps.get(upperWrap), unweighted = history.unweights.get(act.actor.idx);
  const trapStart = history.firstSeen.get(legTrap);
  if (!wrap || unweighted === undefined || trapStart === undefined || !wrap.actuatedSwivel
    || !(wrap.time < unweighted && trapStart > unweighted)) return false;
  if (!sim.world.joints.includes(upperWrap) || !sim.world.joints.includes(legTrap)
    || upperWrap.broken || legTrap.broken || upperWrap.a !== act.actor.body || upperWrap.b !== act.victim.body
    || legTrap.a !== act.actor.body || legTrap.b !== act.victim.body || legTrap.legs <= 0
    || legTrap.contactAnatomy?.actorPart !== 'leg' || legTrap.contactAnatomy.targetRegion !== 'knee_or_below'
    || (legTrap.force ?? 0) <= 0) return false;
  const holder = act.actor.body.support, runner = act.victim.body.support;
  if (holder?.state !== 'down' || runner?.state !== 'down' || runner.cause !== 'legs'
    || runner.since < trapStart || Math.abs(angleDiff(wrap.facing, act.actor.facing)) < Math.PI / 4) return false;
  return !report.contacts.some(c => [c.i, c.j].includes(act.victim.idx) && ![c.i, c.j].includes(act.actor.idx)
    && c.impulse > 0);
}

function applyAnatomy(f: ContactRuleFacts, anatomy?: Readonly<ContactAnatomy>): void {
  if (anatomy) {
    f.part = anatomy.actorPart; f.region = anatomy.targetRegion;
    if (f.part === 'helmet') f.vulnerable = vulnerableFacts();
  }
}
function nativeBlockFacts(sim: PlaySim, actor: Agent, victim: Agent, actorPos: Vec2, targetPos: Vec2,
  facing: number, velocity: Vec2, targetGrounded: boolean, closeLine: boolean,
  ballStillCloseLine: boolean, movedWide: boolean): NonNullable<ContactRuleFacts['block']> {
  const f = blockFacts();
  const dx = actorPos.x - targetPos.x, dy = actorPos.y - targetPos.y;
  const dot = (dx * Math.cos(facing) + dy * Math.sin(facing)) / (Math.hypot(dx, dy) || 1);
  f.fromBehind = dot < -.7; f.fromSide = Math.abs(dot) <= .7;
  f.towardOwnEndLine = velocity.x * sim.attackDir(actor.team) < -.1;
  f.parallelOwnEndLine = Math.abs(velocity.x) <= .1 && Math.abs(velocity.y) > .5;
  f.closeLine = closeLine; f.ballStillCloseLine = ballStillCloseLine;
  f.personalLooseBallAttempt = sim.ball.kind === 'loose';
  f.initialBelowWaist = true; f.targetFeetOnGround = targetGrounded;
  f.targetAttemptingCatch = ['track_ball', 'catch'].includes(victim.behavior.kind);
  f.afterPossessionChange = sim.segments.some(s => s.team === 'D');
  const left = sim.offAlign.spots.LT.pos.y, right = sim.offAlign.spots.RT.pos.y;
  f.insideTightEndBox = Math.abs(targetPos.x - sim.los) <= 5
    && targetPos.y >= Math.min(left, right) - 2 && targetPos.y <= Math.max(left, right) + 2;
  const snap = sim.offAlign.spots[actor.slot];
  f.withinFiveOfLine = Math.abs(targetPos.x - sim.los) <= 5;
  f.towardSnapPosition = velocity.y * (sim.ballY - actorPos.y) > 0;
  f.wideAtSnap = !!snap && !snap.backfield && (snap.pos.y < Math.min(left, right) - 2 || snap.pos.y > Math.max(left, right) + 2);
  f.backfieldMovedWide = movedWide;
  return f;
}
function forcedVictim(sim: PlaySim, report: StepReport, source: HandJoint | GraspJoint, victim: Agent): boolean {
  return report.contacts.some(c => [c.i, c.j].includes(victim.idx) && c.impulse > 0)
    || sim.world.joints.some(j => j !== source && (j.a === victim.body || j.b === victim.body));
}

function forcedInto(sim: PlaySim, report: StepReport, actor: Agent, victim: Agent): boolean {
  return report.contacts.some(c => (c.i === actor.idx || c.j === actor.idx)
    && ![c.i, c.j].includes(victim.idx) && c.impulse > 0)
    || sim.world.joints.some(j => j.a === actor.body && j.b !== victim.body || j.b === actor.body && j.a !== victim.body);
}

export function baseFacts(action: ContactRuleFacts['action'], actorIsDefense: boolean, victimIsRunner: boolean): ContactRuleFacts {
  return { action, actorIsDefense, victimIsRunner, initiated: true, force: 'clear', part: 'unknown', region: 'unknown' };
}
export function blockFacts(): NonNullable<ContactRuleFacts['block']> {
  return { fromBehind: false, fromSide: false, towardOwnEndLine: false, parallelOwnEndLine: false,
    closeLine: false, ballStillCloseLine: false, personalLooseBallAttempt: false,
    opponentTurnedAtImminentContact: false, bothHandsOnSide: false, continuousFromLegalSide: false,
    initialBelowWaist: false, targetFeetOnGround: true, targetAttemptingCatch: false, slidFromAboveWaist: false, wardedIntoLowContact: false,
    insideTightEndBox: true, afterPossessionChange: false, duringKick: false,
    clipDistantLineOpponentWithFlowAway: false, rollsUpSideOrBackOfLeg: false, nearShoulderCrossedFrontOfLegs: false,
    highLowPartner: 'none', partnerIsOffense: true, opponentInitiatedPartnerContact: false, incidentalEscape: false,
    withinFiveOfLine: false, towardSnapPosition: false, wideAtSnap: false, backfieldMovedWide: false, backfieldMotionAtSnap: false };
}
export function gripFacts(): NonNullable<ContactRuleFacts['grip']> {
  return { location: 'other', controlsTwistsTurnsPushesPulls: false, releasedImmediately: false,
    pullsTowardGround: false, kneesBuckled: false, runnerInPocketOrCloseLine: false,
    wrapsOrGrabsRunner: false, unweightsSwivelsDropsHips: false,
    landsOnOrTrapsLegAtOrBelowKnee: false, broughtRunnerToGround: false };
}
export function vulnerableFacts(): NonNullable<ContactRuleFacts['vulnerable']> {
  return { defenseless: false, headLowered: false, incidentalConventionalContact: false,
    launchedForwardUpward: false, alreadyOnGround: false, outOfBounds: false,
    forwardProgressStopped: false, slidOrGaveUp: false, avoidableDeliberateContact: false };
}

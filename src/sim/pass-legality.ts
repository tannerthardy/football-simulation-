/** NFL-2026 Rule 8 predicates and native timeline for passing legality.
 * Officials consume achieved facts; this module never changes player knowledge,
 * physical capacity, execution probability or an already delivered trajectory. */
import { FIELD_WIDTH, OWN_GOAL_X } from '../core/field.js';
import type { Vec2, Vec3 } from '../core/vec.js';
import { bodyRadius } from '../physics/bodyshape.js';
import { timeToReach } from '../physics/reach.js';
import type { StepReport } from '../physics/world.js';
import type { Agent, TeamSide } from './agent.js';
import type { PlaySim } from './playsim.js';
import type { BallState } from './types.js';

/** Two 8-2-1 facts. A realistic chance of completion: an eligible receiver
 * in the pass's direction who, from where he was at the release, could reach
 * the landing point before the ball lands. And a pass altered by contact: the
 * passer is in a defender's grasp at the release, which the throw itself
 * feels (GROUNDING_FACTS=0: only a receiver within reach of the ball's path
 * counts and contact is never recorded, so a missed or wrapped-up throw under
 * pressure is grounding). */
const GROUNDING_FACTS = process.env.GROUNDING_FACTS !== '0';

export interface GroundingFacts {
  forwardPass: boolean;
  fromBehindLine: boolean;
  afterPossessionChange: boolean;
  pressured: boolean | null;
  receiverInDirectionAndVicinity: boolean | null;
  passerEverOutsidePocket: boolean;
  looseBallLeftPocket: boolean;
  landsAtOrBeyondLine: boolean | null;
  contactAlteredPass: boolean;
  passMotionOriginallyTowardEligible: boolean;
  contactCausedShortfall?: boolean;
  tFormationSnapReceiver: boolean;
  immediateContinuousSpike: boolean;
  delayedSpike: boolean;
  releaseX: number;
  los: number;
  entireBodyAndBallInOwnEndZone: boolean;
}

export interface GroundingRuling {
  kind: 'intentional_grounding';
  rule: '8-2-1';
  reason: 'no_eligible_receiver_under_pressure' | 'delayed_spike';
  enforcement: 'previous' | 'spot';
  yards: number;
  lossDown: true;
  safety: boolean;
}

export type GroundingAssessment = GroundingRuling | null | { kind: 'unresolved'; rule: '8-2-1'; missing: string };

/** The pocket exception is persistent, and only the legal immediate T-snap
 * spike is exempt. A delayed spike is prohibited even without pressure. */
export function assessGrounding(f: GroundingFacts): GroundingAssessment {
  if (!f.forwardPass || !f.fromBehindLine || f.afterPossessionChange) return null;
  if (f.tFormationSnapReceiver && f.immediateContinuousSpike && !f.delayedSpike) return null;
  if (!f.delayedSpike) {
    if (f.pressured === false || f.receiverInDirectionAndVicinity === true) return null;
    if (f.contactAlteredPass && f.passMotionOriginallyTowardEligible) return null;
    const outside = f.passerEverOutsidePocket || f.looseBallLeftPocket;
    if (outside && (f.landsAtOrBeyondLine === true || (f.contactAlteredPass && f.contactCausedShortfall))) return null;
    if (f.pressured === null || f.receiverInDirectionAndVicinity === null || (outside && f.landsAtOrBeyondLine === null)) {
      return { kind: 'unresolved', rule: '8-2-1', missing: 'current pressure, receiver vicinity or ball landing' };
    }
  }
  const behind = f.los - f.releaseX;
  const useSpot = behind > 10 || behind > (f.los - OWN_GOAL_X) / 2;
  return { kind: 'intentional_grounding', rule: '8-2-1',
    reason: f.delayedSpike ? 'delayed_spike' : 'no_eligible_receiver_under_pressure',
    enforcement: useSpot ? 'spot' : 'previous', yards: useSpot ? 0 : 10,
    lossDown: true, safety: f.entireBodyAndBallInOwnEndZone };
}

export interface IllegalTouchFacts {
  forwardPass: boolean;
  fromBehindLine: boolean;
  afterPossessionChange: boolean;
  team: TeamSide;
  originallyEligible: boolean | null;
  firstTouch: boolean;
  intentional: boolean;
  caught: boolean;
  priorEligibleOrDefensiveTouch: boolean;
  outOfBoundsBeforeTouch: boolean;
  reestablishedInBounds: boolean;
  forcedOutByFoulAndImmediatelyReturned?: boolean;
}

export type IllegalTouchRuling =
  | { kind: 'illegal_touching'; rule: '8-1-8'; reason: 'originally_ineligible' | 'returned_from_out_of_bounds';
    enforcement: 'previous'; yards: number; lossDown: boolean }
  | { kind: 'incomplete'; rule: '8-1-4'; reason: 'not_reestablished_inbounds' }
  | { kind: 'unresolved'; rule: '8-1-8'; missing: string };

export function assessIllegalTouch(f: IllegalTouchFacts): IllegalTouchRuling | null {
  if (!f.forwardPass || !f.fromBehindLine || f.afterPossessionChange || f.team === 'D') return null;
  if (f.outOfBoundsBeforeTouch && !f.reestablishedInBounds) {
    return { kind: 'incomplete', rule: '8-1-4', reason: 'not_reestablished_inbounds' };
  }
  if (f.priorEligibleOrDefensiveTouch) return null;
  if (f.originallyEligible === null) return { kind: 'unresolved', rule: '8-1-8', missing: 'snap eligibility' };
  if (!f.originallyEligible && (f.caught || (f.firstTouch && f.intentional))) {
    return { kind: 'illegal_touching', rule: '8-1-8', reason: 'originally_ineligible',
      enforcement: 'previous', yards: 5, lossDown: false };
  }
  if (f.originallyEligible && f.outOfBoundsBeforeTouch && !f.forcedOutByFoulAndImmediatelyReturned
    && (f.firstTouch || f.caught)) {
    return { kind: 'illegal_touching', rule: '8-1-8', reason: 'returned_from_out_of_bounds',
      enforcement: 'previous', yards: 0, lossDown: true };
  }
  return null;
}

export interface DownfieldFacts {
  legalForwardPass: boolean;
  originallyEligible: boolean | null;
  entireBodyDepth: number;
  initialContactWithinOneYard: boolean;
  continuousInitialContact: boolean;
  advancedAfterBreakingContactDownfield: boolean;
}

export function assessIneligibleDownfield(f: DownfieldFacts): {
  kind: 'ineligible_downfield'; rule: '8-3-1'; enforcement: 'previous'; yards: 5; lossDown: false;
} | null {
  if (!f.legalForwardPass || f.originallyEligible !== false || f.entireBodyDepth <= 1) return null;
  if (f.initialContactWithinOneYard && (f.continuousInitialContact || !f.advancedAfterBreakingContactDownfield)) return null;
  return { kind: 'ineligible_downfield', rule: '8-3-1', enforcement: 'previous', yards: 5, lossDown: false };
}

export interface ForwardHandingFacts {
  forward: boolean;
  afterPossessionChange: boolean;
  receiverBehindLine: boolean | null;
  receiverEligible: boolean | null;
}

export function assessForwardHanding(f: ForwardHandingFacts): {
  kind: 'illegal_handoff'; rule: '8-7-4'; reason: string; enforcement: 'previous' | 'spot'; yards: 5; lossDown: boolean;
} | { kind: 'unresolved'; rule: '8-7-4'; missing: string } | null {
  if (!f.forward) return null;
  if (f.afterPossessionChange) return { kind: 'illegal_handoff', rule: '8-7-4', reason: 'after_change_of_possession', enforcement: 'spot', yards: 5, lossDown: false };
  if (f.receiverBehindLine === null) return { kind: 'unresolved', rule: '8-7-4', missing: 'receiver line position' };
  if (!f.receiverBehindLine) return { kind: 'illegal_handoff', rule: '8-7-4', reason: 'beyond_line', enforcement: 'spot', yards: 5, lossDown: true };
  if (f.receiverEligible === null) return { kind: 'unresolved', rule: '8-7-4', missing: 'receiver eligibility' };
  return f.receiverEligible ? null : { kind: 'illegal_handoff', rule: '8-7-4', reason: 'ineligible_receiver', enforcement: 'previous', yards: 5, lossDown: true };
}

interface ChargeHistory {
  firstContact: boolean;
  initialWithinOne: boolean;
  continuous: boolean;
  lastBackX: number;
  lastContact: boolean;
  violation?: { t: number; x: number };
}
interface PassTrace {
  passer: Agent;
  release: Vec3;
  t: number;
  fromBehindLine: boolean;
  afterPossessionChange: boolean;
  frontXAtRelease: number;
  v0: Vec3;
  pressured: boolean;
  pressureBasis: GroundingPressure['basis'];
  pressureActor?: string;
  outside: boolean;
  originalDirectionEligible: boolean;
  vicinity: boolean;
  /** Eligible receivers in the pass's direction, as they were at the release. */
  receiversAtRelease: Array<{ a: Agent; pos: Vec2; vel: Vec2 }>;
  contactAltered: boolean;
  spike?: 'immediate' | 'delayed';
  finished: boolean;
}
interface NativeHistory {
  outsidePocket: boolean;
  looseOutsidePocket: boolean;
  out: Set<string>;
  charges: Map<string, ChargeHistory>;
  pass?: PassTrace;
  passForward?: boolean;
  touched: boolean;
}
const histories = new WeakMap<PlaySim, NativeHistory>();
const history = (sim: PlaySim): NativeHistory => {
  let h = histories.get(sim);
  if (!h) { h = { outsidePocket: false, looseOutsidePocket: false, out: new Set(), charges: new Map(), touched: false }; histories.set(sim, h); }
  return h;
};
type NativeSim = PlaySim & { snapEligibility?: ReadonlyMap<string, { eligible: boolean | null }> };
const eligible = (sim: PlaySim, a: Agent): boolean | null => a.team === 'D' ? true
  : (sim as NativeSim).snapEligibility?.get(a.player.id)?.eligible ?? null;
const backX = (a: Agent): number => a.pos.x - bodyRadius(a.body, 1, 0);
const pocket = (sim: PlaySim): [number, number] => {
  const lt = sim.offAlign.spots.LT?.pos.y ?? sim.ballY + 2.6;
  const rt = sim.offAlign.spots.RT?.pos.y ?? sim.ballY - 2.6;
  return [Math.min(lt, rt) - (sim.slot('RT')?.profile.radius ?? 0),
    Math.max(lt, rt) + (sim.slot('LT')?.profile.radius ?? 0)];
};

/** Called every achieved interval, even without film. Contact continuity is
 * physical report/joint state, not an assignment or a blocker win label. */
export function observePassLegality(sim: PlaySim, report: StepReport, intervalStart: number,
  startPositions: readonly Readonly<Vec2>[]): void {
  const h = history(sim), [low, high] = pocket(sim), b = sim.ballPos();
  if (h.pass && sim.ball.kind === 'air' && sim.ball.releaseT === h.pass.t) {
    const p = h.pass;
    p.vicinity ||= sim.offense.some(a => eligible(sim, a) === true &&
      (a.pos.x - p.release.x) * p.v0.x + (a.pos.y - p.release.y) * p.v0.y > 0 &&
      Math.hypot(a.pos.x - b.x, a.pos.y - b.y) <= a.profile.reach + a.profile.radius);
  }
  if (sim.ball.kind === 'held') {
    const a = sim.ball.carrier, extent = bodyRadius(a.body, 0, 1);
    if (a === sim.qb && (a.pos.y - extent < low || a.pos.y + extent > high || b.y < low || b.y > high)) h.outsidePocket = true;
  } else if (sim.ball.kind === 'loose' && (b.y < low || b.y > high)) h.looseOutsidePocket = true;
  for (const a of sim.offense) {
    const lateral = bodyRadius(a.body, 0, 1);
    if (a.pos.y - lateral <= 0 || a.pos.y + lateral >= FIELD_WIDTH) h.out.add(a.player.id);
    if (sim.throwAt >= 0 || eligible(sim, a) !== false) continue;
    const touching = report.contacts.some(c => c.impulse > 0 && ((c.i === a.idx && sim.agents[c.j]?.team === 'D')
      || (c.j === a.idx && sim.agents[c.i]?.team === 'D')))
      || sim.world.joints.some(j => (j.a === a.body || j.b === a.body) &&
        sim.agents.some(d => d.team === 'D' && (j.a === d.body || j.b === d.body)));
    const floor = backX(a), prevFloor = (startPositions[a.idx]?.x ?? a.pos.x) - bodyRadius(a.body, 1, 0);
    let state = h.charges.get(a.player.id);
    if (!state) { state = { firstContact: false, initialWithinOne: false, continuous: false, lastBackX: prevFloor, lastContact: false }; h.charges.set(a.player.id, state); }
    if (touching && !state.firstContact) {
      state.firstContact = true; state.initialWithinOne = Math.max(floor, prevFloor) <= sim.los + 1;
      state.continuous = state.initialWithinOne;
    }
    if (!touching && state.lastContact) state.continuous = false;
    const advancedAfterBreak = !state.continuous && floor > state.lastBackX + 1e-9;
    const foul = assessIneligibleDownfield({ legalForwardPass: true, originallyEligible: false,
      entireBodyDepth: floor - sim.los,
      initialContactWithinOneYard: state.initialWithinOne, continuousInitialContact: state.continuous && touching,
      advancedAfterBreakingContactDownfield: advancedAfterBreak || !state.initialWithinOne });
    if (foul && !state.violation) state.violation = { t: intervalStart + sim.dt, x: a.pos.x };
    state.lastBackX = floor; state.lastContact = touching;
  }
}

/** Explicit reduced officiating judgment for imminent non-contact pressure.
 * These are the existing controller's urgency bounds, not NFL rule distances.
 * Reusing current physical reach avoids treating an old pressure flag as proof. */
export const GROUNDING_PRESSURE_JUDGMENT = Object.freeze({ distance: 2.5, reachSeconds: .7 });
export interface GroundingPressure {
  pressured: boolean;
  basis: 'delivered_contact' | 'active_grasp' | 'current_pressure_event' | 'unblocked_physical_reach' | 'none';
  actorId?: string;
}

export function currentGroundingPressure(sim: PlaySim, passer: Agent): GroundingPressure {
  const grasp = sim.world.joints.find(j => j.kind === 'grasp' && j.b === passer.body && !j.broken);
  if (grasp) return { pressured: true, basis: 'active_grasp',
    actorId: sim.agents.find(a => a.body === grasp.a)?.player.id };
  const contact = sim.lastStep?.contacts.find(c => c.impulse > 0 && ((c.i === passer.idx && sim.agents[c.j]?.team !== passer.team)
    || (c.j === passer.idx && sim.agents[c.i]?.team !== passer.team)));
  if (contact) return { pressured: true, basis: 'delivered_contact',
    actorId: sim.agents[contact.i === passer.idx ? contact.j : contact.i]?.player.id };
  for (const d of sim.opponents(passer)) {
    if (d.isDown(sim.t) || d.engagement) continue;
    const dx = passer.pos.x - d.pos.x, dy = passer.pos.y - d.pos.y, dist2 = dx * dx + dy * dy;
    if (dist2 > GROUNDING_PRESSURE_JUDGMENT.distance ** 2) continue;
    const blocked = sim.agents.some(a => {
      if (a === d || a === passer) return false;
      const fraction = ((a.pos.x - d.pos.x) * dx + (a.pos.y - d.pos.y) * dy) / Math.max(dist2, 1e-9);
      if (fraction <= 0 || fraction >= 1) return false;
      return Math.hypot(a.pos.x - d.pos.x - fraction * dx, a.pos.y - d.pos.y - fraction * dy)
        < a.profile.radius + d.profile.radius;
    });
    if (blocked || timeToReach({ pos: d.pos, vel: d.vel, profile: d.profile, speedScale: d.speedScale },
      passer.pos, d.profile.reach + passer.profile.radius) > GROUNDING_PRESSURE_JUDGMENT.reachSeconds) continue;
    const currentEvent = sim.events.some(e => e.type === 'pressure' && e.a === d.idx && e.b === passer.idx
      && Math.abs(e.t - sim.t) <= sim.dt / 2 + 1e-9);
    return { pressured: true, basis: currentEvent ? 'current_pressure_event' : 'unblocked_physical_reach', actorId: d.player.id };
  }
  return { pressured: false, basis: 'none' };
}

/** The passer is in a defender's grasp: the tackle bond holds him with grip. */
const heldAtRelease = (sim: PlaySim, passer: Agent): boolean => {
  const bond = sim.bond;
  return !!bond && bond.carrier === passer && bond.tacklers.some(d => (bond.grip?.get(d) ?? 1) > 0);
};

/** Capture the throw on the native action boundary before ball state changes. */
export function capturePassLegality(sim: PlaySim, passer: Agent, release: Vec3, v0: Vec3,
  options: { spike?: 'immediate' | 'delayed'; contactAlteredPass?: boolean } = {}): void {
  const h = history(sim);
  // A backward throw does not create grounding, eligibility or downfield laws.
  if (v0.x * (passer.team === 'O' ? 1 : -1) <= 0) { h.pass = undefined; h.passForward = false; h.touched = false; return; }
  h.passForward = true;
  const [low, high] = pocket(sim), extent = bodyRadius(passer.body, 0, 1);
  if (passer.pos.y - extent < low || passer.pos.y + extent > high || release.y < low || release.y > high) h.outsidePocket = true;
  const pressure = currentGroundingPressure(sim, passer);
  const ahead = sim.offense.filter(a => eligible(sim, a) === true &&
    (a.pos.x - release.x) * v0.x + (a.pos.y - release.y) * v0.y > 0);
  const towardEligible = ahead.length > 0;
  h.pass = { passer, release: { ...release }, t: sim.t, fromBehindLine: backX(passer) <= sim.los || release.x <= sim.los,
    afterPossessionChange: passer.team === 'D' || sim.segments.some(s => s.team === 'D'),
    frontXAtRelease: passer.pos.x + bodyRadius(passer.body, 1, 0), v0: { ...v0 },
    pressured: pressure.pressured, pressureBasis: pressure.basis, pressureActor: pressure.actorId, outside: h.outsidePocket || h.looseOutsidePocket,
    originalDirectionEligible: towardEligible, vicinity: false,
    receiversAtRelease: ahead.map(a => ({ a, pos: { ...a.pos }, vel: { ...a.vel } })),
    contactAltered: options.contactAlteredPass ?? (GROUNDING_FACTS && heldAtRelease(sim, passer)),
    spike: options.spike, finished: false };
  h.touched = false;
  const legalPass = sim.penalties.every(p => p.kind !== 'illegal_forward_pass' || p.t !== sim.t);
  if (legalPass && passer.team === 'O' && h.pass.fromBehindLine) {
    for (const [id, state] of h.charges) if (state.violation) {
      sim.recordFoul({ kind: 'ineligible_downfield', against: 'O', playerId: id, yards: 5, autoFirst: false,
        spotX: state.violation.x, t: state.violation.t, rule: '8-3-1', enforcement: 'previous', phase: 'live' },
      { source: 'native', rule: '8-3-1', action: 'ineligible_advance_before_pass', facts: { bodyBeyondOneYard: true } });
    }
  }
}

/** Grounding is a terminal trajectory ruling, not an intended-target lookup.
 * Native vicinity is the declared capability-scaled planar vicinity model;
 * no provider route, private future assignment or completion roll is used. */
export function finishPassLegality(sim: PlaySim, ball: Extract<BallState, { kind: 'air' }>, terminal: Vec3,
  firstTouchAgent?: Agent): void {
  const h = history(sim), p = h.pass;
  if (!p || p.finished || p.t !== ball.releaseT || p.passer !== ball.thrower) return;
  if (firstTouchAgent?.team === 'O' && eligible(sim, firstTouchAgent) === true) p.vicinity = true;
  // The measured receiver location is at the same native endpoint as the ball.
  p.vicinity ||= sim.offense.some(a => eligible(sim, a) === true &&
    Math.hypot(a.pos.x - terminal.x, a.pos.y - terminal.y) <= a.profile.reach + a.profile.radius);
  const flight = sim.t - p.t;
  const chance = p.receiversAtRelease.some(r => timeToReach({ pos: r.pos, vel: r.vel, profile: r.a.profile,
    speedScale: r.a.speedScale }, terminal, r.a.profile.reach + r.a.profile.radius) <= flight);
  const vicinity = p.vicinity || GROUNDING_FACTS && chance;
  const ruling = assessGrounding({ forwardPass: true, fromBehindLine: p.fromBehindLine,
    afterPossessionChange: p.afterPossessionChange,
    pressured: p.pressured, receiverInDirectionAndVicinity: !vicinity && firstTouchAgent ? null : vicinity,
    passerEverOutsidePocket: p.outside, looseBallLeftPocket: h.looseOutsidePocket,
    landsAtOrBeyondLine: firstTouchAgent ? null : terminal.x >= sim.los, contactAlteredPass: p.contactAltered,
    passMotionOriginallyTowardEligible: p.originalDirectionEligible,
    tFormationSnapReceiver: p.passer === sim.qb && sim.offCall.formation.qb === 'under',
    immediateContinuousSpike: p.spike === 'immediate', delayedSpike: p.spike === 'delayed',
    releaseX: p.release.x, los: sim.los,
    entireBodyAndBallInOwnEndZone: p.frontXAtRelease <= OWN_GOAL_X && p.release.x <= OWN_GOAL_X });
  p.finished = true;
  if (ruling?.kind === 'unresolved') { sim.ruleLimitations.add(`${ruling.rule}: ${ruling.missing}`); return; }
  if (!ruling) return;
  const boundarySpot = !ruling.safety && p.release.x <= OWN_GOAL_X
    ? Math.max(p.release.x, p.frontXAtRelease) : undefined;
  if (boundarySpot !== undefined) sim.ruleLimitations.add(
    '8-2-1/14-4-5: straddling-goal boundary placement convention uses field-most reduced torso/ball extent; not exact NFL anatomical spotting');
  sim.recordFoul({ kind: ruling.kind, against: 'O', playerId: p.passer.player.id, yards: ruling.yards,
    autoFirst: false, spotX: p.release.x, t: p.t, rule: ruling.rule, reason: ruling.reason,
    enforcement: ruling.enforcement, lossDown: true, penaltySafety: ruling.safety, phase: 'live',
    ...(boundarySpot !== undefined ? { basicSpotX: boundarySpot } : {}) },
  { source: 'native', rule: ruling.rule, action: ruling.reason, facts: {
    releaseX: p.release.x, currentPressure: p.pressured, pressureBasis: p.pressureBasis, pressureActor: p.pressureActor ?? null,
    pressureJudgmentDistance: GROUNDING_PRESSURE_JUDGMENT.distance,
    pressureJudgmentSeconds: GROUNDING_PRESSURE_JUDGMENT.reachSeconds, outsidePocket: p.outside,
    receiverInVicinity: p.vicinity, receiverCouldReachLanding: chance, contactAltered: p.contactAltered, flightTime: flight,
    terminalX: terminal.x, safety: ruling.safety,
    fieldMostReleaseExtent: Math.max(p.release.x, p.frontXAtRelease),
    boundaryPlacementConvention: boundarySpot !== undefined ? 'field-most reduced torso/ball extent' : null } });
}

/** Called before the first actual intentional ball touch/collection mutates
 * possession. Illegal ineligible catches remain live; unreestablished touches
 * are incomplete instead, per8-1-4. */
export function assessNativePassTouch(sim: PlaySim, a: Agent, caught = true, intentional = true): IllegalTouchRuling | null {
  if (sim.ball.kind !== 'air') return null;
  const ball = sim.ball, h = history(sim), p = h.pass;
  const matchingTrace = p?.t === ball.releaseT && p.passer === ball.thrower ? p : undefined;
  const wasOut = h.out.has(a.player.id), extent = bodyRadius(a.body, 0, 1);
  const ruling = assessIllegalTouch({ forwardPass: h.passForward ?? (ball.flight.vel.x * (ball.thrower.team === 'O' ? 1 : -1) > 0),
    fromBehindLine: matchingTrace?.fromBehindLine ?? (ball.releaseX <= sim.los),
    afterPossessionChange: matchingTrace?.afterPossessionChange ?? (ball.thrower.team === 'D'),
    team: a.team, originallyEligible: eligible(sim, a), firstTouch: !h.touched,
    intentional, caught, priorEligibleOrDefensiveTouch: h.touched,
    outOfBoundsBeforeTouch: wasOut, reestablishedInBounds: a.pos.y - extent > 0 && a.pos.y + extent < FIELD_WIDTH });
  if (a.team === 'D' || (eligible(sim, a) === true && ruling?.kind !== 'incomplete'
    && !(ruling?.kind === 'illegal_touching' && ruling.reason === 'returned_from_out_of_bounds'))) h.touched = true;
  if (ruling?.kind === 'illegal_touching') sim.recordFoul({ kind: ruling.kind, against: 'O',
    playerId: a.player.id, yards: ruling.yards, autoFirst: false, t: sim.t, rule: ruling.rule,
    reason: ruling.reason, enforcement: 'previous', lossDown: ruling.lossDown, phase: 'live' },
  { source: 'native', rule: ruling.rule, action: ruling.reason, facts: { caught, intentional, wasOut } });
  else if (ruling?.kind === 'unresolved') sim.ruleLimitations.add(`${ruling.rule}: ${ruling.missing}`);
  return ruling;
}

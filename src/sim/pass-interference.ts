/** Native NFL 2026 pass-contact adjudication. Clear achieved branches are
 * called; unresolved attention, anatomy, ordering and borderline materiality
 * remain uncalled evidence. This is not a claim that every PI act or referee
 * judgment is represented. State is independent of optional telemetry. */
import { bodyRadius } from '../physics/bodyshape.js';
import { timeToReach } from '../physics/reach.js';
import { HOLDING_JUDGMENT, holdingRestriction } from './contact-holding.js';
import type { Vec2 } from '../core/vec.js';
import type { HandJoint, StepReport } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

const RECEIVING_SLOTS = new Set(['X', 'Z', 'Y', 'H', 'F', 'RB']);
const FORCE_EPSILON = 1e-6; // Existing World/block-contact numerical resolution.

interface PrethrowBlock {
  actor: Agent;
  defender: Agent;
  intervalStart: number;
  intervalEnd: number;
  spotX: number;
  actorBackX: number;
  defenderBackX: number;
  normalForce: number;
  tangentForce: number;
  locationMargin: number;
}

const pending = new WeakMap<PlaySim, Map<string, PrethrowBlock>>();
// Initial-line contact can remain legal for an ineligible player as it moves
// downfield (8-3-1). Installed skill slots alone do not prove numbering/covered
// eligibility. Preserve unknown/ineligible initial-line contact conservatively;
// a receiver whose frozen snap eligibility is known true has no such exception. Joint replacement is not proof that body contact
// broke. Keep the possible exception sticky for that actor/defender pair for
// this play; proving separation can broaden this deliberately narrow branch.
const possibleInitialLinePairs = new WeakMap<PlaySim, Set<string>>();

const pairId = (actor: Agent, defender: Agent): string => `${actor.idx}:${defender.idx}`;
function possibleInitialChargeException(sim: PlaySim, actor: Agent, defender: Agent): boolean {
  return sim.snapEligibility.get(actor.player.id)?.eligible !== true
    && possibleInitialLinePairs.get(sim)?.has(pairId(actor, defender)) === true;
}


/** A conservative location test: every represented torso point on both
 * players lies beyond the one-yard line, so an unresolved torso contact
 * point cannot move the act across that legal boundary. */
function torsoBackX(a: Agent): number {
  return a.pos.x - bodyRadius(a.body, 1, 0);
}

function intervalLocation(actor: Agent, defender: Agent, boundary: number,
  starts: readonly Readonly<Vec2>[]): {
    clear: boolean; actorBackX: number; defenderBackX: number; margin: number;
  } | null {
  const actorStart = starts[actor.idx], defenderStart = starts[defender.idx];
  if (!actorStart || !defenderStart) return null;
  const actorTravel = Math.hypot(actor.pos.x - actorStart.x, actor.pos.y - actorStart.y);
  const defenderTravel = Math.hypot(defender.pos.x - defenderStart.x, defender.pos.y - defenderStart.y);
  const actorBackX = torsoBackX(actor), defenderBackX = torsoBackX(defender);
  // The maximum represented torso radius is 1.12×its unsqueezed radius.
  // Keep a full observed-translation band at both endpoints instead of
  // applying the law to an end-of-tick center alone.
  const margin = Math.max(actorTravel, defenderTravel);
  const actorFloor = Math.min(actorBackX, actorStart.x - actor.profile.radius * 1.12) - margin;
  const defenderFloor = Math.min(defenderBackX, defenderStart.x - defender.profile.radius * 1.12) - margin;
  return { actorBackX, defenderBackX, margin,
    clear: actorTravel <= actor.profile.radius && defenderTravel <= defender.profile.radius
      && actorFloor > boundary && defenderFloor > boundary };
}

/** Read the just-achieved World interval, before the engagement can release.
 * Body proximity, an engagement request and a defender-controlled joint do
 * not establish the offensive blocking act delivered by this predicate. */
export function observePrethrowBlocks(sim: PlaySim, report: StepReport, intervalStart: number,
  startPositions: readonly Readonly<Vec2>[]): void {
  if (sim.phase !== 'live' || sim.throwAt >= 0 || sim.segments.some(s => s.team === 'D')) return;

  const intervalEnd = intervalStart + sim.dt;
  const boundary = sim.los + 1;
  let initialLine = possibleInitialLinePairs.get(sim);
  const rememberPossibleInitialLine = (actor: Agent, defender: Agent): void => {
    initialLine ??= new Set();
    initialLine.add(pairId(actor, defender));
    possibleInitialLinePairs.set(sim, initialLine);
  };
  // The first contact can be a torso collision before hands are acquired.
  // Record that history even with no engagement, or during a backward pitch.
  for (const contact of report.contacts) {
    const a = sim.agents[contact.i], b = sim.agents[contact.j];
    if (!a || !b || a.team === b.team) continue;
    const actor = a.team === 'O' ? a : b, defender = a.team === 'D' ? a : b;
    if (RECEIVING_SLOTS.has(actor.slot)
      && !intervalLocation(actor, defender, boundary, startPositions)?.clear) {
      rememberPossibleInitialLine(actor, defender);
    }
  }
  const canRetainBlock = sim.ball.kind === 'held' && sim.ball.carrier.team === 'O';
  let acts = pending.get(sim);
  for (const rep of sim.engagements) {
    if (rep.defender.team !== 'D') continue;
    const members: Array<[Agent, HandJoint | undefined]> = [
      [rep.blocker, rep.hands],
      ...rep.helpers.map(a => [a, rep.helperHands?.get(a)] as [Agent, HandJoint | undefined]),
    ];
    for (const [actor, hands] of members) {
      // The installed receiving-slot subset cannot accidentally penalize a
      // legal ineligible lineman's continuous initial-charge block. Full snap
      // numbering/reporting/alignment eligibility remains a separate rule.
      if (actor.team !== 'O' || !RECEIVING_SLOTS.has(actor.slot) || !hands
        || !sim.world.joints.includes(hands)) continue;
      const normalForce = hands.normalForce ?? 0, tangentForce = hands.tangentForce ?? 0;
      if (!Number.isFinite(normalForce) || !Number.isFinite(tangentForce)) continue;
      const loaded = Math.hypot(normalForce, tangentForce) > FORCE_EPSILON;
      const torsoContact = report.contacts.some(c => (c.i === actor.idx && c.j === rep.defender.idx)
        || (c.j === actor.idx && c.i === rep.defender.idx));
      if (!loaded && !torsoContact) continue;
      // This first branch is deliberately limited to a slow, clearly
      // downfield held block. A fast/boundary-crossing interval needs native
      // substep contact location rather than invented ordering/location.
      const location = intervalLocation(actor, rep.defender, boundary, startPositions);
      if (!location?.clear) rememberPossibleInitialLine(actor, rep.defender);
      if (!canRetainBlock || !loaded || !location?.clear || possibleInitialChargeException(sim, actor, rep.defender)) continue;
      const { actorBackX, defenderBackX, margin: locationMargin } = location;
      const appliedArmImpulse = report.armImpulse[actor.idx];
      if ((hands.actor ?? hands.a) !== actor.body || !Number.isFinite(appliedArmImpulse)
        || appliedArmImpulse <= FORCE_EPSILON) continue;

      acts ??= new Map();
      const id = pairId(actor, rep.defender);
      // Preserve the earliest definite act, rather than moving its timestamp
      // up to the eventual release during a continuously loaded block.
      if (!acts.has(id)) acts.set(id, { actor, defender: rep.defender, intervalStart,
        intervalEnd, spotX: rep.defender.pos.x, actorBackX, defenderBackX,
        normalForce, tangentForce, locationMargin });
    }
  }
  if (acts) pending.set(sim, acts);
}

/** Resolve retained acts only once a qualifying forward pass actually exists.
 * A backward pitch, no-throw run or same unresolved contact/release interval
 * cannot be converted into OPI. Positive initial forward velocity is the
 * supported unequivocal forward-pass definition (8-1-1(a)). */
export function assessPrethrowBlocksOnPass(sim: PlaySim, passer: Agent, releaseX: number,
  releaseT: number, forwardVelocityX: number): void {
  const acts = pending.get(sim);
  if (!acts || passer.team !== 'O' || sim.segments.some(s => s.team === 'D')
    || !(forwardVelocityX > 0) || !Number.isFinite(releaseX)
    || !Number.isFinite(releaseT) || (releaseX > sim.los
    && passer.pos.x - bodyRadius(passer.body, 1, 0) > sim.los)) return;

  for (const act of acts.values()) {
    if (possibleInitialChargeException(sim, act.actor, act.defender)) continue;
    // World reports only interval-aggregated load. If that interval ends at
    // release, its ordering is not clear enough to call this prethrow branch.
    if (!(act.intervalEnd < releaseT - 1e-9)) continue;
    sim.recordFoul({
      id: `opi:prethrow:${act.actor.idx}:${act.defender.idx}`,
      kind: 'opi', against: 'O', playerId: act.actor.player.id,
      yards: 10, autoFirst: false, spotX: act.spotX, t: act.intervalEnd,
      rule: '8-5-4(a)', reason: 'achieved downfield block clearly before forward pass',
    }, {
      source: 'native', rule: '8-5-4(a)', action: 'prethrow_downfield_block',
      victimId: act.defender.player.id,
      facts: { intervalStart: act.intervalStart, intervalEnd: act.intervalEnd,
        releaseT, releaseX, forwardVelocityX, blockerTorsoBackX: act.actorBackX,
        defenderTorsoBackX: act.defenderBackX, boundaryX: sim.los + 1,
        normalForce: act.normalForce, tangentForce: act.tangentForce,
        locationMargin: act.locationMargin,
        coverage: 'slow, clearly downfield receiving-slot active-hand block; not general OPI' },
    });
  }
}

/** Pass contact is judged from achieved contact, not from a coverage error or
 * proximity. These are deliberately clear branches of the NFL 2026 rules:
 * unknown attention, an ambiguous initiating player, contact/touch ordering,
 * and small changes of catch opportunity stay uncalled. Referee sight lines
 * are not modeled by this deterministic rules layer. */
export interface PassContactStart {
  pos: Vec2;
  vel: Vec2;
  facing: number;
  /** Acquired ball action, explicit competing task, or unknown. Facing alone
   * cannot establish that a player is playing (or not playing) the ball. */
  playingBall: boolean | null;
}
interface ContactHistory { seen: boolean; separated: boolean; withinFive: boolean }
interface PendingPassContact {
  actor: Agent;
  victim: Agent;
  t: number;
  end: number;
  spotX: number;
  kind: 'dpi' | 'opi';
  rule: string;
  action: string;
  clear: boolean;
  facts: Record<string, string | number | boolean | null>;
  possessionTeam: 'O' | 'D';
  possessionChanges: number;
}
interface GrabOrigin {
  t: number; lastEnd: number; beforeSlack: number; relativeVelocity: Vec2;
  restriction: ReturnType<typeof holdingRestriction> & {};
  opposingDeltaV: number; actorIdx: number; victimIdx: number;
}
interface PassContactState {
  restrictionsEnded: boolean;
  qualifies: boolean;
  releaseT: number;
  touchT: number;
  history: Map<string, ContactHistory>;
  queue: PendingPassContact[];
  grabs: Map<HandJoint, GrabOrigin>;
}
const passStates = new WeakMap<PlaySim, PassContactState>();
function passState(sim: PlaySim): PassContactState {
  let state = passStates.get(sim);
  if (!state) {
    state = { restrictionsEnded: false, qualifies: false, releaseT: Infinity,
      touchT: Infinity, history: new Map(), queue: [], grabs: new Map() };
    passStates.set(sim, state);
  }
  return state;
}

function ballAttention(a: Agent, sim: PlaySim): boolean | null {
  if (a.tags.has('onBall') || sim.incidentalCatchReadiness.query(a, sim.t)) return true;
  // These are explicit non-ball tasks, not an inference from an absent tag.
  if (a.engagement || ['run-block', 'downfield-block', 'pass-pro', 'rush', 'blitz', 'run-fit', 'pursuit']
    .includes(a.behavior.kind)) return false;
  return null;
}

/** Always capture, even in an interval with no contact: leaving the pocket,
 * handing off and pitching end illegal-contact restrictions permanently. */
export function capturePassContactStarts(sim: PlaySim): PassContactStart[] {
  const state = passState(sim);
  endRestrictionsIfRequired(sim, state);
  return sim.agents.map(a => ({ pos: { ...a.pos }, vel: { ...a.vel }, facing: a.facing,
    playingBall: ballAttention(a, sim) }));
}

function endRestrictionsIfRequired(sim: PlaySim, state: PassContactState): void {
  const qb = sim.qb;
  const lt = sim.offAlign.spots.LT, rt = sim.offAlign.spots.RT;
  const left = sim.slot('LT'), right = sim.slot('RT');
  if (!lt || !rt || !left || !right) {
    // A nonstandard missing-tackle pocket cannot be certified by guessing.
    state.restrictionsEnded = true;
    sim.ruleLimitations.add('illegal-contact pocket bounds unknown in missing-tackle alignment');
  } else {
    const minY = Math.min(lt.pos.y - left.profile.radius, rt.pos.y - right.profile.radius);
    const maxY = Math.max(lt.pos.y + left.profile.radius, rt.pos.y + right.profile.radius);
    if (sim.ball.kind !== 'held' || sim.ball.carrier !== qb || sim.handoffAt >= 0
      || sim.throwAt >= 0 || qb.pos.y - bodyRadius(qb.body, 0, 1) < minY
      || qb.pos.y + bodyRadius(qb.body, 0, 1) > maxY
      || qb.pos.x + bodyRadius(qb.body, 1, 0) > sim.los
      || qb.pos.x - bodyRadius(qb.body, 1, 0) < 0) state.restrictionsEnded = true;
  }
}

/** Called from the actual release, before BallState is replaced. An illegal
 * second pass can still qualify for PI; the actual forward/behind-line facts
 * matter rather than the pass play's intended label. */
export function notePassRelease(sim: PlaySim, passer: Agent, releaseX: number,
  releaseT: number, forwardVelocityX: number): void {
  const state = passState(sim);
  state.restrictionsEnded = true;
  state.qualifies = passer.team === 'O' && forwardVelocityX > 0
    && Number.isFinite(releaseX)
    && !(releaseX > sim.los && passer.pos.x - bodyRadius(passer.body, 1, 0) > sim.los);
  state.releaseT = releaseT;
  state.touchT = Infinity;
  state.grabs.clear();
}

/** Actual touch (including an unsuccessful native catch attempt), not merely
 * arrival at the intended point. Same-controller-interval ordering remains
 * unresolved unless the delivered contact row is wholly before the touch. */
export function notePassTouch(sim: PlaySim, t: number): void {
  const state = passState(sim);
  state.touchT = Math.min(state.touchT, t);
}

function knownEligible(sim: PlaySim, a: Agent): boolean {
  if (a.team === 'D') return true;
  return sim.snapEligibility.get(a.player.id)?.eligible === true;
}

function unresolved(sim: PlaySim, actor: Agent, victim: Agent,
  kind: 'dpi' | 'opi' | 'illegal_contact', rule: string, action: string, t: number,
  facts: Record<string, string | number | boolean | null>): void {
  const id = `unresolved:${kind}:${action}:${actor.idx}:${victim.idx}`;
  if (sim.foulRecords.some(r => r.id === id)) return;
  sim.foulRecords.push({ id, t, kind, playerId: actor.player.id, called: false,
    assessment: 'unresolved', evidence: { source: 'native', rule, action,
      victimId: victim.player.id, facts } });
}

/** The first actually delivered hand row supplies location even for running
 * players. Missing historical hand snapshots retain the older slow far-field
 * fallback; an installed joint or endpoint proximity is not a contact. */
function handLocation(hands: HandJoint, actor: Agent, victim: Agent, boundary: number,
  starts: readonly PassContactStart[]): ReturnType<typeof intervalLocation> {
  const first = hands.firstApplied;
  if (!first) return intervalLocation(actor, victim, boundary, starts.map(s => s.pos));
  const actorAt = hands.a === actor.body ? first.positionI : first.positionJ;
  const victimAt = hands.a === victim.body ? first.positionI : first.positionJ;
  const actorBackX = actorAt.x - actor.profile.radius * 1.12;
  const defenderBackX = victimAt.x - victim.profile.radius * 1.12;
  return { clear: actorBackX > boundary && defenderBackX > boundary,
    actorBackX, defenderBackX, margin: 0 };
}

function achievedHandForce(hands: HandJoint): number {
  const n = hands.normalForce ?? 0, t = hands.tangentForce ?? 0;
  return Number.isFinite(n) && Number.isFinite(t) ? Math.hypot(n, t) : 0;
}

/** Best native sprint/reorientation estimate across the actual remaining
 * ballistic path. This is an opportunity screen, not a catch outcome draw.
 * A whole controller interval of margin on both sides is required below;
 * values in that band are explicitly an unresolved judgment. */
function catchSlack(sim: PlaySim, a: Agent, pos: Vec2, vel: Vec2, t: number,
  fullHeight = false, availableAt = t): number {
  const top = fullHeight || a.team === 'O' ? a.profile.maxCatchHeight
    : a.profile.reactReach + .5 * (a.profile.maxCatchHeight - a.profile.reactReach);
  let best = Infinity;
  for (const point of sim.ballPath) {
    if (point.t < availableAt || point.z < .1 || point.z > top
      || point.x < 0 || point.x > 120 || point.y < 0 || point.y > 160 / 3) continue;
    const reach = a.profile.reach + .3;
    best = Math.min(best, timeToReach({ pos, vel, profile: a.profile }, point, reach) - (point.t - availableAt));
  }
  return best;
}

function hasOtherContact(sim: PlaySim, report: StepReport, actor: Agent, victim: Agent): boolean {
  return sim.world.joints.some(j => {
    const involved = j.a === actor.body || j.b === actor.body || j.a === victim.body || j.b === victim.body;
    const samePair = (j.a === actor.body && j.b === victim.body) || (j.a === victim.body && j.b === actor.body);
    const loaded = j.kind === 'hands' ? achievedHandForce(j) : Math.abs(j.force ?? 0);
    return involved && !samePair && loaded > FORCE_EPSILON;
  }) || report.strikes.some(s => Math.hypot(s.impulse.x, s.impulse.y) > FORCE_EPSILON
    && ((s.i === actor.idx && s.j !== victim.idx) || (s.j === actor.idx && s.i !== victim.idx)
      || (s.i === victim.idx && s.j !== actor.idx) || (s.j === victim.idx && s.i !== actor.idx)))
    || report.contacts.some(c => c.impulse > FORCE_EPSILON
    && ((c.i === actor.idx && c.j !== victim.idx) || (c.j === actor.idx && c.i !== victim.idx)
      || (c.i === victim.idx && c.j !== actor.idx) || (c.j === victim.idx && c.i !== actor.idx)));
}

/** Observe before engagement release and before resolving the ball. Flush
 * after ball resolution so a same-interval first touch cannot create PI. */
export function observePassContacts(sim: PlaySim, report: StepReport, intervalStart: number,
  starts: readonly PassContactStart[]): void {
  if (sim.phase !== 'live') return;
  const state = passState(sim), intervalEnd = intervalStart + sim.dt;
  // If an endpoint proves pocket exit in this World interval, do not guess
  // that a contact row preceded the exit. The restriction stays ended.
  endRestrictionsIfRequired(sim, state);
  const restricted = !state.restrictionsEnded && sim.ball.kind === 'held' && sim.ball.carrier === sim.qb;
  const inflight = state.qualifies && sim.ball.kind === 'air' && intervalStart >= state.releaseT && intervalStart < state.touchT;

  // Definite physical separation, not releasing/replacing a hand joint,
  // establishes a break in otherwise legal continuous contact.
  for (const [id, history] of state.history) {
    const [d, r] = id.split(':').map(Number), defender = sim.agents[d], receiver = sim.agents[r];
    if (!defender || !receiver || !starts[d] || !starts[r]) continue;
    const gap = Math.hypot(starts[d].pos.x - starts[r].pos.x, starts[d].pos.y - starts[r].pos.y);
    const joint = sim.world.joints.some(j => (j.a === defender.body && j.b === receiver.body)
      || (j.b === defender.body && j.a === receiver.body));
    const travel = Math.hypot(defender.pos.x - starts[d].pos.x, defender.pos.y - starts[d].pos.y)
      + Math.hypot(receiver.pos.x - starts[r].pos.x, receiver.pos.y - starts[r].pos.y);
    if (!joint && gap - travel > (defender.profile.radius + receiver.profile.radius) * 1.12
      && !report.contacts.some(c => (c.i === d && c.j === r) || (c.i === r && c.j === d))) history.separated = true;
  }

  for (const contact of report.contacts) {
    if (!(contact.impulse > FORCE_EPSILON)) continue;
    const i = sim.agents[contact.i], j = sim.agents[contact.j], first = contact.first;
    if (!i || !j || i.team === j.team) continue;
    const defender = i.team === 'D' ? i : j, receiver = i.team === 'O' ? i : j;
    const id = pairId(defender, receiver), history = state.history.get(id);
    if (!first) {
      if (inflight) unresolved(sim, defender, receiver, 'dpi', '8-5-1', 'contact_origin_unknown', intervalStart,
        { impulse: contact.impulse, reason: 'historical report has no native contact origin' });
      continue;
    }
    const pD = defender === i ? first.positionI : first.positionJ;
    const pR = receiver === i ? first.positionI : first.positionJ;
    const vD = defender === i ? first.velocityI : first.velocityJ;
    const vR = receiver === i ? first.velocityI : first.velocityJ;
    const rFace = receiver === i ? first.chestI ?? first.facingI : first.chestJ ?? first.facingJ; // chest: a receiver looking back is not turning his back
    const n = defender === i ? first.normal : { x: -first.normal.x, y: -first.normal.y };
    const initiatesD = vD.x * n.x + vD.y * n.y > FORCE_EPSILON
      && vR.x * n.x + vR.y * n.y >= -FORCE_EPSILON;
    if (restricted && knownEligible(sim, receiver) && !receiver.engagement && initiatesD) {
      const request = sim.intents[receiver.idx]?.vel;
      const evading = !!request && request.x * n.x + request.y * n.y > FORCE_EPSILON;
      const back = (pD.x - pR.x) * Math.cos(rFace) + (pD.y - pR.y) * Math.sin(rFace) < -receiver.profile.radius;
      const beyondFive = pR.x - receiver.profile.radius * 1.12 > sim.los + 5
        && pD.x - defender.profile.radius * 1.12 > sim.los + 5;
      const withinFive = pR.x - receiver.profile.radius * 1.12 >= sim.los
        && pR.x + receiver.profile.radius * 1.12 < sim.los + 5;
      if ((beyondFive && evading) || (withinFive && (back || history?.separated))) {
        callIllegalContact(sim, defender, receiver, first.time, pR.x,
          beyondFive ? '8-4-3' : '8-4-2', beyondFive ? 'initiated_contact_against_evading_receiver'
            : back ? 'initial_contact_from_back' : 'recontact_after_proven_separation',
          { impulse: contact.impulse, receiverX: pR.x, defenderX: pD.x,
            evading, fromBack: back, separated: history?.separated ?? false });
      }
    }
    state.history.set(id, { seen: true, separated: false,
      withinFive: history?.withinFive === true || pR.x + receiver.profile.radius * 1.12 < sim.los + 5 });

    if (!inflight || first.time < state.releaseT || first.time >= state.touchT) continue;
    // Inspect both teams under the same restrictions and equal-rights rule.
    for (const actor of [i, j]) {
      const victim = actor === i ? j : i;
      if (!knownEligible(sim, victim)) continue;
      const aPos = actor === i ? first.positionI : first.positionJ;
      const vPos = victim === i ? first.positionI : first.positionJ;
      const aVel = actor === i ? first.velocityI : first.velocityJ;
      const vVel = victim === i ? first.velocityI : first.velocityJ;
      const vFacing = victim === i ? first.chestI ?? first.facingI : first.chestJ ?? first.facingJ;
      const toward = actor === i ? first.normal : { x: -first.normal.x, y: -first.normal.y };
      if (Math.min(aPos.x - actor.profile.radius * 1.12, vPos.x - victim.profile.radius * 1.12) <= sim.los + 1) continue;
      const aPlaying = starts[actor.idx]?.playingBall ?? null, vPlaying = starts[victim.idx]?.playingBall ?? null;
      const initiates = aVel.x * toward.x + aVel.y * toward.y > FORCE_EPSILON
        && vVel.x * toward.x + vVel.y * toward.y >= -FORCE_EPSILON;
      const throughBack = (aPos.x - vPos.x) * Math.cos(vFacing)
        + (aPos.y - vPos.y) * Math.sin(vFacing) < -victim.profile.radius;
      if (!initiates || hasOtherContact(sim, report, actor, victim)) continue;
      // Both competing for the ball may make incidental contact. A clear
      // through-the-back restriction is different; matching body paths alone
      // cannot prove a shove, hook, arm grab or playing through the back.
      if (aPlaying === false && vPlaying === false) continue;
      const before = catchSlack(sim, victim, vPos, vVel, first.time);
      const after = catchSlack(sim, victim, victim.pos, victim.vel, intervalEnd, false,
        intervalEnd + (victim.isDown(intervalEnd) ? victim.timeUntilUp(intervalEnd) : 0));
      const generous = catchSlack(sim, victim, vPos, vVel, first.time, true);
      if (generous > sim.dt) continue; // Clearly outside even the generous opportunity screen.
      const ownKnockdown = report.falls.includes(victim.idx)
        && (victim === i ? first.supportI : first.supportJ) === 'up';
      const material = before < -sim.dt && after > sim.dt;
      const provedAct = (aPlaying === false && vPlaying === true)
        || (throughBack && ownKnockdown && vPlaying === true);
      const kind = actor.team === 'D' ? 'dpi' : 'opi';
      const facts = { impulse: contact.impulse, contactTime: first.time, contactEnd: first.intervalEnd,
        actorPlayingBall: aPlaying, victimPlayingBall: vPlaying, beforeCatchSlack: finiteFact(before),
        afterCatchSlack: finiteFact(after), throughBack, knockdown: ownKnockdown,
        judgmentMarginSeconds: sim.dt, actorX: aPos.x, victimX: vPos.x,
        reason: material && provedAct ? 'clear achieved restriction of catch opportunity'
          : 'incidental/materiality/ball-action boundary unresolved; no flag' };
      if (aPlaying === true && vPlaying === true && !ownKnockdown) continue;
      if (!material && before >= 0) continue;
      state.queue.push({ actor, victim, t: first.time, end: intervalEnd,
        spotX: vPos.x, kind, rule: throughBack ? '8-5-2(b)' : '8-5-2(a)',
        action: throughBack ? 'through_back_catch_restriction' : 'non_ball_contact_restriction',
        clear: material && provedAct, facts, possessionTeam: sim.possession, possessionChanges: passPossessionChanges(sim) });
    }
  }

  // A native strike is an achieved deliberate opponent-directed shove;
  // unlike incidental body contact, playing the ball does not legalize a
  // push-off which creates separation and clearly restricts a catch (8-5-2g).
  // No head/shoulder/arm anatomy is inferred from the generic strike record.
  if (inflight) for (const strike of report.strikes) {
    const actor = sim.agents[strike.i], victim = sim.agents[strike.j], first = strike.first;
    if (!actor || !victim || actor.team === victim.team || !first || !knownEligible(sim, victim)
      || first.time < state.releaseT || first.time >= state.touchT || hasOtherContact(sim, report, actor, victim)) continue;
    if (Math.min(first.positionI.x - actor.profile.radius * 1.12,
      first.positionJ.x - victim.profile.radius * 1.12) <= sim.los + 1) continue;
    const axis = first.normal;
    const shoveImpulse = strike.impulse.x * axis.x + strike.impulse.y * axis.y;
    if (!(shoveImpulse > FORCE_EPSILON)) continue;
    const initialGap = (first.positionJ.x - first.positionI.x) * axis.x
      + (first.positionJ.y - first.positionI.y) * axis.y;
    const relativeSpeed = (first.velocityJ.x - first.velocityI.x) * axis.x
      + (first.velocityJ.y - first.velocityI.y) * axis.y;
    const actualGap = (victim.pos.x - actor.pos.x) * axis.x + (victim.pos.y - actor.pos.y) * axis.y;
    const extraSeparation = actualGap - initialGap - relativeSpeed * (intervalEnd - first.time);
    if (!(extraSeparation > FORCE_EPSILON)) continue;
    const before = catchSlack(sim, victim, first.positionJ, first.velocityJ, first.time);
    if (catchSlack(sim, victim, first.positionJ, first.velocityJ, first.time, true) > sim.dt) continue;
    const after = catchSlack(sim, victim, victim.pos, victim.vel, intervalEnd, false,
      intervalEnd + (victim.isDown(intervalEnd) ? victim.timeUntilUp(intervalEnd) : 0));
    const playing = starts[victim.idx]?.playingBall ?? null;
    const material = before < -sim.dt && after > sim.dt && playing === true;
    const facts = { shoveImpulse, impulseX: strike.impulse.x, impulseY: strike.impulse.y,
      work: strike.work, extraSeparation, contactTime: first.time, contactEnd: first.intervalEnd,
      beforeCatchSlack: finiteFact(before), afterCatchSlack: finiteFact(after), victimPlayingBall: playing,
      judgmentMarginSeconds: sim.dt, reason: material ? 'achieved push-off creates separation and restricts catch opportunity'
        : 'shove/contact materiality unresolved; no PI flag' };
    state.queue.push({ actor, victim, t: first.time, end: intervalEnd, spotX: first.positionJ.x,
      kind: actor.team === 'D' ? 'dpi' : 'opi', rule: '8-5-2(g)', action: 'achieved_push_off_catch_restriction',
      clear: material, facts, possessionTeam: sim.possession, possessionChanges: passPossessionChanges(sim) });
  }

  // Active hand contact: legal press remains legal, but its actual continued
  // force beyond five is not excused by the fact that the jam began legally.
  for (const hands of sim.world.joints) {
    if (hands.kind !== 'hands' || achievedHandForce(hands) <= FORCE_EPSILON) continue;
    const actor = sim.agents.find(a => a.body === (hands.actor ?? hands.a));
    const victim = sim.agents.find(a => a.body === (actor?.body === hands.a ? hands.b : hands.a));
    if (!actor || !victim || actor.team === victim.team) continue;
    if (actor.team === 'D' && victim.team === 'O' && restricted && knownEligible(sim, victim)
      && report.armImpulse[actor.idx] > FORCE_EPSILON
      && !victim.engagement) {
      const id = pairId(actor, victim), history = state.history.get(id);
      const location = handLocation(hands, actor, victim, sim.los + 5, starts);
      const request = sim.intents[victim.idx]?.vel;
      const dx = victim.pos.x - actor.pos.x, dy = victim.pos.y - actor.pos.y;
      const escaping = !!request && request.x * dx + request.y * dy > FORCE_EPSILON;
      const rStart = starts[victim.idx]?.pos, dStart = starts[actor.idx]?.pos;
      const clearlyPassed = !!rStart && !!dStart
        && Math.min(victim.pos.x, rStart.x) - victim.profile.radius * 1.12
          > Math.max(actor.pos.x, dStart.x) + actor.profile.radius * 1.12;
      const withinFive = Math.min(victim.pos.x, rStart?.x ?? -Infinity) - victim.profile.radius * 1.12 >= sim.los
        && Math.max(victim.pos.x, rStart?.x ?? Infinity) + victim.profile.radius * 1.12 < sim.los + 5;
      if (withinFive && clearlyPassed && history?.seen) {
        callIllegalContact(sim, actor, victim, intervalStart, victim.pos.x, '8-4-2',
          'maintained_active_hand_contact_after_receiver_passed_even',
          { normalForce: hands.normalForce ?? 0, tangentForce: hands.tangentForce ?? 0,
            receiverX: victim.pos.x, defenderX: actor.pos.x });
      }
      if (location?.clear && (history?.withinFive || escaping)) {
        callIllegalContact(sim, actor, victim, intervalStart, victim.pos.x, '8-4-3',
          history?.withinFive ? 'continued_active_hand_contact_beyond_five' : 'active_hand_contact_against_evading_receiver',
          { normalForce: hands.normalForce ?? 0, tangentForce: hands.tangentForce ?? 0,
            escaping, continuousFromFive: history?.withinFive ?? false });
      }
      state.history.set(id, { seen: true, separated: false,
        withinFive: history?.withinFive === true || victim.pos.x + victim.profile.radius * 1.12 < sim.los + 5 });
    }
    // A delivered tensile grab is different from an incidental hand touch.
    // Reuse the same physical restriction measurement as general holding;
    // PI additionally needs a qualified airborne pass, downfield location and
    // a catch opportunity and a clear, measured involuntary restriction of
    // catch movement. A receiver can still make a catch despite a DPI foul.
    const holder = sim.agents.find(a => a.body === (hands.holder ?? hands.a));
    const held = sim.agents.find(a => a.body === (holder?.body === hands.a ? hands.b : hands.a));
    if (inflight && holder && held && holder.team !== held.team && knownEligible(sim, held)
      && !held.engagement && starts[holder.idx] && starts[held.idx]) {
      const holderStart = starts[holder.idx], heldStart = starts[held.idx];
      const restriction = holdingRestriction(hands, holder, held,
        { ...holderStart, desired: sim.intents[holder.idx]?.vel ?? holderStart.vel },
        { ...heldStart, desired: sim.intents[held.idx]?.vel ?? heldStart.vel }, sim.dt, report);
      const location = handLocation(hands, holder, held, sim.los + 1, starts);
      if (location?.clear && !hasOtherContact(sim, report, holder, held)) {
        let origin = state.grabs.get(hands);
        if (origin && (intervalStart > origin.lastEnd + 1e-9 || origin.actorIdx !== holder.idx || origin.victimIdx !== held.idx)) { state.grabs.delete(hands); origin = undefined; }
        const before = catchSlack(sim, held, heldStart.pos, heldStart.vel, intervalStart);
        if (!origin && restriction && before < -sim.dt) {
          origin = { t: intervalStart, lastEnd: intervalStart, beforeSlack: before, restriction, opposingDeltaV: 0, actorIdx: holder.idx, victimIdx: held.idx,
            relativeVelocity: { x: heldStart.vel.x - holderStart.vel.x, y: heldStart.vel.y - holderStart.vel.y } };
          state.grabs.set(hands, origin);
        }
        if (origin) {
          const desiredHeld = sim.intents[held.idx]?.vel ?? heldStart.vel;
          const desiredHolder = sim.intents[holder.idx]?.vel ?? holderStart.vel;
          const relative = origin.relativeVelocity, speed = Math.hypot(relative.x, relative.y);
          const maintainsEscape = speed > FORCE_EPSILON && ((desiredHeld.x - desiredHolder.x) * relative.x
            + (desiredHeld.y - desiredHolder.y) * relative.y) / speed >= speed - FORCE_EPSILON;
          if (!maintainsEscape || !((hands.normalForce ?? 0) < -FORCE_EPSILON)) {
            state.grabs.delete(hands);
          } else {
            origin.lastEnd = intervalEnd;
            origin.opposingDeltaV += restriction?.opposingDeltaV ?? 0;
            const endEscape = ((held.vel.x - holder.vel.x) * relative.x
              + (held.vel.y - holder.vel.y) * relative.y) / speed;
            const observedSlowdown = speed - endEscape;
            const clearRestriction = origin.opposingDeltaV >= HOLDING_JUDGMENT.minimumOpposingDeltaV
              && observedSlowdown >= HOLDING_JUDGMENT.minimumObservedSlowdown
              && observedSlowdown / speed >= HOLDING_JUDGMENT.minimumEscapeFractionLost;
            const after = catchSlack(sim, held, held.pos, held.vel, intervalEnd, false,
              intervalEnd + (held.isDown(intervalEnd) ? held.timeUntilUp(intervalEnd) : 0));
            const clear = clearRestriction;
            state.queue.push({ actor: holder, victim: held, t: intervalStart, end: intervalEnd,
              spotX: held.pos.x, kind: holder.team === 'D' ? 'dpi' : 'opi', rule: '8-5-1',
              action: 'achieved_grab_catch_restriction', clear,
              facts: { ...origin.restriction, grabBeganT: origin.t, cumulativeOpposingDeltaV: origin.opposingDeltaV,
                cumulativeObservedSlowdown: observedSlowdown, cumulativeFractionLost: observedSlowdown / speed,
                beforeCatchSlack: finiteFact(origin.beforeSlack), afterCatchSlack: finiteFact(after),
                judgmentMarginSeconds: sim.dt, reason: clear ? 'sustained achieved cloth restriction materially hinders catch movement'
                  : 'catch restriction or materiality is borderline; no PI flag' },
              possessionTeam: sim.possession, possessionChanges: passPossessionChanges(sim) });
          }
        } else if (restriction && before < 0) {
          unresolved(sim, holder, held, holder.team === 'D' ? 'dpi' : 'opi', '8-5-1',
            'achieved_grab_materiality_boundary', intervalStart,
            { ...restriction, beforeCatchSlack: finiteFact(before), reason: 'no clear pre-grab catch window/materiality' });
        }
      }
    }

    if (actor.team !== 'O' || !inflight || report.armImpulse[actor.idx] <= FORCE_EPSILON
      || (hands.actor ?? hands.a) !== actor.body
      || possibleInitialChargeException(sim, actor, victim)) continue;
    // 8-5-4(b) requires a block, not any loaded hand touch. The engagement's
    // blocking task plus achieved actor-supplied arm load is that act here.
    const rep = actor.engagement;
    if (!rep || rep.defender !== victim || !knownEligible(sim, actor)) continue;
    if (rep.start <= state.releaseT && sim.foulRecords.some(r => r.called && r.kind === 'opi'
      && r.playerId === actor.player.id && r.evidence.victimId === victim.player.id
      && r.evidence.action === 'prethrow_downfield_block')) continue;
    const location = handLocation(hands, actor, victim, sim.los + 1, starts);
    if (!location?.clear || sim.ball.kind !== 'air' || !sim.ball.target) continue;
    const target = sim.ball.target;
    // A tight, represented vicinity branch: the target's catch envelope
    // intersects a participant at the delivered block interval. Remote picks
    // need a broader but justified vicinity judgment, not an invented radius.
    const first = hands.firstApplied;
    const actorAt = first ? hands.a === actor.body ? first.positionI : first.positionJ : actor.pos;
    const victimAt = first ? hands.a === victim.body ? first.positionI : first.positionJ : victim.pos;
    const targetStart = starts[target.idx]?.pos;
    const targetTravel = targetStart ? Math.hypot(target.pos.x - targetStart.x, target.pos.y - targetStart.y) : Infinity;
    const vicinity = target === actor || target === victim || !!targetStart
      && targetTravel <= target.profile.radius && Math.min(
        Math.max(Math.hypot(targetStart.x - actorAt.x, targetStart.y - actorAt.y),
          Math.hypot(target.pos.x - actorAt.x, target.pos.y - actorAt.y)),
        Math.max(Math.hypot(targetStart.x - victimAt.x, targetStart.y - victimAt.y),
          Math.hypot(target.pos.x - victimAt.x, target.pos.y - victimAt.y))) + targetTravel <= target.profile.reach;
    if (!vicinity) continue;
    state.queue.push({ actor, victim, t: intervalStart, end: intervalEnd, spotX: victim.pos.x,
      kind: 'opi', rule: '8-5-4(b)', action: 'inflight_downfield_block_near_target', clear: true,
      facts: { intervalStart, intervalEnd, normalForce: hands.normalForce ?? 0,
        tangentForce: hands.tangentForce ?? 0, targetId: target.player.id,
        targetDistance: Math.min(Math.hypot(target.pos.x - actor.pos.x, target.pos.y - actor.pos.y),
          Math.hypot(target.pos.x - victim.pos.x, target.pos.y - victim.pos.y)),
        catchabilityException: 'offensive downfield blocking is not excused by uncatchable pass' },
      possessionTeam: sim.possession, possessionChanges: passPossessionChanges(sim) });
  }
}

function passPossessionChanges(sim: PlaySim): number {
  return sim.segments.reduce((n, s, i, ss) => n + Number(s.team !== (i ? ss[i - 1].team : 'O')), 0);
}
function finiteFact(n: number): number | null { return Number.isFinite(n) ? n : null; }
/** OFFICIATE (on by default; OFFICIATE=0 turns it off; estimated, C14 officiating): an
 * illegal-contact call needs contact that changed the receiver's motion, seen
 * by an official. Off, every clear initiated contact past five yards against a
 * receiver moving away was flagged: 3.3 calls per 100 pass plays on the panel
 * against the NFL's 0.42 per 100 passes (nflverse 2022), while our bodies meet
 * receivers downfield before the throw on 32-38% of passes (NFL 13%). On, the
 * contact's effect is the change in the receiver's velocity it delivered (body
 * impulse, or hand force over the interval, over his mass), summed per pair
 * over the play; the chance it is flagged rises from nothing at 0.3 yd/s to
 * the seen rate (0.6: officials' position, the angle, the miss rate) at 1.8
 * yd/s and above. Each pair draws one threshold for the play, so continued
 * contact is judged on its growing effect, not re-rolled every tick. Contact
 * that is let go is recorded as uncalled evidence. Fitted only against the
 * NFL flag rates per pass; the contact itself is not tuned here. */
const OFFICIATE = process.env.OFFICIATE !== '0';
const OFFICIATE_MIN = 0.3, OFFICIATE_SPAN = 1.5, OFFICIATE_SEEN = 0.6;
const officiated = new WeakMap<PlaySim, Map<string, { dv: number; u: number }>>();
/** OFFICIATE: the chance a contact that changed the receiver's velocity by dv
 * (yd/s, summed over the play for the pair) is flagged. */
export function officiateChance(dv: number): number {
  return Math.min(1, Math.max(0, (dv - OFFICIATE_MIN) / OFFICIATE_SPAN)) * OFFICIATE_SEEN;
}

function callIllegalContact(sim: PlaySim, actor: Agent, victim: Agent, t: number, spotX: number,
  rule: string, action: string, facts: Record<string, string | number | boolean | null>): void {
  if (OFFICIATE) {
    const m = victim.profile.massKg;
    const impulse = typeof facts.impulse === 'number' ? facts.impulse : null;
    const force = Math.hypot(Number(facts.normalForce ?? 0), Number(facts.tangentForce ?? 0));
    const dv = (impulse !== null ? impulse / m : force * sim.dt / m) * 1.0936;
    let byPair = officiated.get(sim);
    if (!byPair) { byPair = new Map(); officiated.set(sim, byPair); }
    const key = pairId(actor, victim);
    let rec = byPair.get(key);
    if (!rec) { rec = { dv: 0, u: sim.dice('official', actor, victim).next() }; byPair.set(key, rec); }
    rec.dv += Number.isFinite(dv) ? dv : 0;
    const pCall = officiateChance(rec.dv);
    if (!(rec.u < pCall)) {
      unresolved(sim, actor, victim, 'illegal_contact', rule, `${action}_let_go`, t,
        { ...facts, effectYdPerS: rec.dv, pCall });
      return;
    }
  }
  sim.recordFoul({ id: `illegal-contact:${actor.idx}:${victim.idx}`, kind: 'illegal_contact',
    against: 'D', playerId: actor.player.id, yards: 5, autoFirst: true, spotX, t, rule,
    reason: action, phase: 'live', playPhase: 'pass', possessionTeam: sim.possession,
    possessionChanges: passPossessionChanges(sim),
    enforcement: 'previous' }, { source: 'native', rule, action, victimId: victim.player.id, facts });
}

export function flushPassContacts(sim: PlaySim): void {
  const state = passStates.get(sim);
  if (!state) return;
  for (const act of state.queue) {
    if (!(act.end < state.touchT - 1e-9)) {
      unresolved(sim, act.actor, act.victim, act.kind, act.rule, 'contact_first_touch_order', act.t,
        { ...act.facts, firstTouchT: state.touchT, reason: 'contact row is not proved wholly before first touch' });
      continue;
    }
    if (!act.clear) {
      unresolved(sim, act.actor, act.victim, act.kind, act.rule, act.action, act.t, act.facts);
      continue;
    }
    sim.recordFoul({ id: `${act.kind}:flight:${act.actor.idx}:${act.victim.idx}`,
      kind: act.kind, against: act.actor.team, playerId: act.actor.player.id,
      yards: act.kind === 'dpi' ? 0 : 10, autoFirst: act.kind === 'dpi', spotX: act.spotX,
      t: act.t, rule: act.rule, reason: act.action, enforcement: act.kind === 'dpi' ? 'spot' : 'previous',
      phase: 'live', playPhase: 'pass', possessionTeam: act.possessionTeam, possessionChanges: act.possessionChanges },
    { source: 'native', rule: act.rule, action: act.action, victimId: act.victim.player.id, facts: act.facts });
  }
  state.queue = [];
}

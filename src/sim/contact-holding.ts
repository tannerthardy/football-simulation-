/** NFL 2026 12-1-2/3/5/6: achieved illegal restraint, not a selected grab.
 *
 * The clear-call standard below is an explicit officiating judgment margin,
 * not a new physical law or a target foul rate. A cloth label, positive hold
 * capacity, elapsed block time or tensile force alone cannot pass it. The
 * victim must actually be escaping or deliver real propulsive impulse, keep
 * requesting that movement, and measurably lose speed or achieved drive while
 * the delivered grab opposes that path.
 * Borderline achieved restraint remains evidence rather than an automatic flag.
 */
import type { Vec2 } from '../core/vec.js';
import type { Body } from '../physics/kinematics.js';
import { OPEN_HANDS, type HandJoint, type Joint, type StepReport } from '../physics/world.js';
import type { Agent, Engagement, TeamSide } from './agent.js';
import type { PlaySim } from './playsim.js';
import type { FoulRecord } from './types.js';
import { axisOf, PAST_ALONG_PATH, pastAlongPath } from './engagement.js';
import { officiateChance } from './pass-interference.js';

/** 12-1-3(c) restricts grabbing an opponent, not blocking one. While the
 * blocker is still between the defender and where he is going (|phi| < 1 on
 * the rep's own axis, the line the engagement already uses for "beaten at the
 * hip"), a grip on him is the block itself; it becomes a hold once he has
 * leverage past the blocker, or when it takes his feet (HOLD_LEVERAGE=0: any
 * achieved restriction of a defender moving off the block is a hold). */
const HOLD_LEVERAGE = process.env.HOLD_LEVERAGE !== '0';

/** HOLD_CALL (off; HOLD_CALL=1 turns it on; estimated, officiating): the
 * offence's hold is judged in three stages, not by which exemption fires first.
 * Committed: a clear restraint (the margins below) of a man who has left the
 * blocker's frame (HOLD_LEVERAGE's test, now checked before the point-of-attack
 * and double-team no-calls) or whose feet the grip took. Material: the
 * restrained man had a real path to the ball and the restraint was against it
 * -- he was at the point of attack, or he would have been the next defender to
 * the ball (his distance over his top speed no longer than that of every
 * standing defender nobody is blocking), he was asking to go toward it, and he
 * was not still inside a double team. Called: material and seen. The
 * official's look is the PI model's (OFFICIATE): the restraint's accumulated
 * effect on the man's velocity (opposing impulse over his mass, which grows
 * with its duration) ramps the chance from nothing at 0.3 yd/s to the seen
 * rate 0.6 at 1.8 yd/s, one draw per pair per play; traffic hides it -- each
 * other body within two body widths (1.5 yd) of the man divides the chance
 * (1 / (1 + n)). Committed and material acts that are not called are kept as
 * uncalled evidence. Off, every clear restraint that survives the exemptions
 * is called. Not fitted. */
const HOLD_CALL = process.env.HOLD_CALL === '1';
export const HOLD_TRAFFIC_RADIUS = 1.5;

/** Where the holder stands relative to the victim's line to his goal, in
 * quarter turns: 0 squarely in his way, ±1 beside him at the hip, beyond 1
 * behind him. The same measure as the engagement's phi, for any holder. */
function holderPhi(sim: PlaySim, h: HoldStart): number | null {
  if (!h.rep) return null;
  const axis = axisOf(sim, h.rep);
  const dx = h.actorStart.pos.x - h.victimStart.pos.x, dy = h.actorStart.pos.y - h.victimStart.pos.y;
  const len = Math.hypot(dx, dy);
  if (!(len > 1e-6)) return null;
  const bx = dx / len, by = dy / len;
  return Math.atan2(-(bx * -axis.y + by * axis.x), bx * axis.x + by * axis.y) / (Math.PI / 2);
}

/** Clear judgment margin in native velocity units; not a referee error roll. */
export const HOLDING_JUDGMENT = Object.freeze({
  minimumEscapeSpeed: .5,
  minimumOpposingDeltaV: .15,
  minimumObservedSlowdown: .1,
  minimumEscapeFractionLost: .1,
  minimumAchievedDriveDeltaV: .15,
});

interface BodyStart { pos: Vec2; vel: Vec2; desired: Vec2;
  support?: { state: string; deviation: number; contact: number; legs: number; overspeed: number } }
interface HoldStart {
  joint: Joint; actor: Agent; victim: Agent; rep?: Engagement;
  actorStart: BodyStart; victimStart: BodyStart;
}

export interface HoldingIntervalStart {
  t: number;
  holds: HoldStart[];
  carrier: Agent | null;
  beingTackled: boolean;
  looseRecoveryAttempt: Set<number>;
  looseFlight?: object;
  closeLine: boolean;
  pocketMinY: number;
  pocketMaxY: number;
  passBeyondLine: boolean;
  defenseTouchedPassException: boolean;
  fakeRunners: Set<Agent>;
  possessionTeam: TeamSide;
  possessionChanges: number;
  possessionSpotX: number;
  playPhase?: 'pass' | 'run' | 'loose_ball';
}

export interface AchievedHoldingRestriction {
  escapeSpeed: number;
  observedSlowdown: number;
  opposingDeltaV: number;
  fractionLost: number;
  normalForce: number;
  restrictiveForceX: number;
  restrictiveForceY: number;
  achievedDriveDeltaV: number;
  judgment: 'clear' | 'borderline';
}

interface PlayMemory { closeLineEnded: boolean; pending?: HoldingIntervalStart }
const memory = new WeakMap<PlaySim, PlayMemory>();
const heldActs = new WeakMap<Joint, string>();
interface RestrictionHistory {
  actor: Agent; victim: Agent; start: number; end: number;
  escapeSpeed: number; opposingDeltaV: number; observedSlowdown: number;
  achievedDriveDeltaV: number; intervals: number;
}
const restrictions = new WeakMap<Joint, RestrictionHistory>();
interface HoldCausality { actor: Agent; victim: Agent; neutralOrigin: boolean; contaminated: boolean; tookFeet: boolean }
const causality = new WeakMap<Joint, HoldCausality>();
const groundedLooseFlights = new WeakSet<object>();
const crossedPassFlights = new WeakSet<object>();
const forwardPassFlights = new WeakMap<object, boolean>();

const copy = (v: Vec2): Vec2 => ({ x: v.x, y: v.y });
const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
const minus = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });

/** Call immediately before the same World.step whose report is observed. */
export function captureHoldingStart(sim: PlaySim): HoldingIntervalStart {
  let state = memory.get(sim);
  if (!state) { state = { closeLineEnded: false }; memory.set(sim, state); }
  const left = sim.offAlign.spots.LT, right = sim.offAlign.spots.RT;
  const lt = sim.slot('LT'), rt = sim.slot('RT');
  const minY = Math.min(left?.pos.y ?? sim.ballY - 3, right?.pos.y ?? sim.ballY + 3)
    - Math.max(lt?.profile.radius ?? 0, rt?.profile.radius ?? 0);
  const maxY = Math.max(left?.pos.y ?? sim.ballY - 3, right?.pos.y ?? sim.ballY + 3)
    + Math.max(lt?.profile.radius ?? 0, rt?.profile.radius ?? 0);
  const ball = sim.ballPos();
  // The capture hook runs after controller release and before this flight's
  // first World/ball interval. Later wind/deflection or an intended point
  // cannot rewrite the actual launch direction for this exception.
  if (sim.ball.kind === 'air' && Math.abs(sim.ball.releaseT - sim.t) < 1e-9) {
    forwardPassFlights.set(sim.ball.flight, sim.ball.flight.vel.x * sim.attackDir(sim.ball.thrower.team) > 0);
  }
  if (sim.ball.kind === 'air' && ball.x > sim.los) crossedPassFlights.add(sim.ball.flight);
  if (ball.x > sim.los + 3 || ball.y < minY || ball.y > maxY) state.closeLineEnded = true;
  const byBody = new Map<Body, Agent>(sim.agents.map(a => [a.body, a]));
  const bodyStart = (a: Agent): BodyStart => ({ pos: copy(a.pos), vel: copy(a.vel),
    desired: copy(sim.intents[a.idx]?.vel ?? a.vel), support: a.body.support ? {
      state: a.body.support.state, deviation: Math.hypot(a.body.support.xi.x, a.body.support.xi.y),
      contact: a.body.support.causes?.contact ?? 0, legs: a.body.support.causes?.legs ?? 0,
      overspeed: a.body.support.causes?.overspeed ?? 0 } : undefined });
  const holds: HoldStart[] = [];
  for (const joint of sim.world.joints) {
    if (joint.kind === 'grasp' && joint.broken) continue;
    const holderBody = joint.kind === 'hands' ? joint.holder ?? joint.a : joint.a;
    const victimBody = holderBody === joint.a ? joint.b : joint.a;
    const actor = byBody.get(holderBody), victim = byBody.get(victimBody);
    if (!actor || !victim || actor.team === victim.team) continue;
    if (joint.kind === 'hands' && !(joint.hold > 0) && !(OPEN_HANDS && joint.grip)) continue;
    const rep = sim.engagements.find(e => e.hands === joint || [...(e.helperHands?.values() ?? [])].includes(joint as HandJoint))
      ?? (actor.engagement?.defender === victim ? actor.engagement : undefined);
    const actorStart = bodyStart(actor), victimStart = bodyStart(victim);
    holds.push({ joint, actor, victim, rep, actorStart, victimStart });
    const oldCause = causality.get(joint), support = victimStart.support;
    if (!oldCause || oldCause.actor !== actor || oldCause.victim !== victim) {
      causality.set(joint, { actor, victim, neutralOrigin: !!support && support.state === 'up'
        && support.deviation < 1e-6 && support.contact + support.legs + support.overspeed < 1e-6,
      contaminated: false, tookFeet: false });
    }
  }
  const looseRecoveryAttempt = new Set<number>();
  // Current techniques use FumbleScramble for personal recovery. Do not infer
  // this exception merely because a loose ball happens to exist elsewhere.
  if (sim.ball.kind === 'loose') {
    if (sim.ball.flight.pos.z <= .05) groundedLooseFlights.add(sim.ball.flight);
    for (const a of sim.agents) if (a.behavior.kind === 'scramble-ball') looseRecoveryAttempt.add(a.idx);
  }
  const start: HoldingIntervalStart = { t: sim.t, holds, carrier: sim.carrier,
    beingTackled: !!sim.bond, looseRecoveryAttempt,
    looseFlight: sim.ball.kind === 'loose' ? sim.ball.flight : undefined,
    closeLine: !state.closeLineEnded,
    pocketMinY: minY, pocketMaxY: maxY,
    passBeyondLine: sim.ball.kind === 'air' && forwardPassFlights.get(sim.ball.flight) === true
      && sim.throwAt >= 0 && sim.ball.intended.x > sim.los,
    defenseTouchedPassException: sim.ball.kind === 'air' && forwardPassFlights.get(sim.ball.flight) === true && sim.ball.deflected
      && crossedPassFlights.has(sim.ball.flight),
    fakeRunners: new Set(sim.presentedFakeRunners ?? []),
    possessionTeam: sim.possession,
    possessionChanges: sim.segments.reduce((n, s, i, ss) => n + Number(s.team !== (i ? ss[i - 1].team : 'O')), 0),
    possessionSpotX: sim.segments.at(-1)?.startX ?? sim.los,
    playPhase: sim.ball.kind === 'loose' || sim.ball.kind === 'pitch' ? 'loose_ball'
      : sim.ball.kind === 'air' ? 'pass' : sim.catchAt >= 0 || sim.possession === 'D' ? 'run' : undefined };
  state.pending = start;
  return start;
}

/** Native physical restriction shared with rule-specific pass adjudication.
 * Ordinary compressive steering cannot be mistaken for a tensile grab.
 * This uses achieved relative speed and delivered impulse, not a free-motion
 * World clone or the defender's hidden assignment. */
export function holdingRestriction(joint: Joint, actor: Agent, victim: Agent,
  actorStart: BodyStart, victimStart: BodyStart, dt: number, report: StepReport): AchievedHoldingRestriction | null {
  if (!(dt > 0) || joint.kind === 'hands' && !(report.armImpulse[actor.idx] > 1e-6)) return null;
  const separation = minus(victimStart.pos, actorStart.pos), length = Math.hypot(separation.x, separation.y);
  if (!(length > 1e-6)) return null;
  const relative = minus(victimStart.vel, actorStart.vel);
  const initialSpeed = Math.hypot(relative.x, relative.y);
  const requested = minus(victimStart.desired, actorStart.desired);
  let travel: Vec2, escapeSpeed: number, achievedDriveDeltaV = 0;
  if (initialSpeed >= HOLDING_JUDGMENT.minimumEscapeSpeed) {
    travel = { x: relative.x / initialSpeed, y: relative.y / initialSpeed };
    escapeSpeed = initialSpeed;
    if (dot(requested, travel) < escapeSpeed - 1e-6) return null; // chosen braking
  } else {
    const requestedSpeed = Math.hypot(requested.x, requested.y);
    if (requestedSpeed < HOLDING_JUDGMENT.minimumEscapeSpeed) return null;
    travel = { x: requested.x / requestedSpeed, y: requested.y / requestedSpeed };
    const vg = report.groundImpulse[victim.idx], ag = report.groundImpulse[actor.idx];
    if (!vg || !ag) return null;
    achievedDriveDeltaV = dot({ x: vg.x / victim.profile.massKg - ag.x / actor.profile.massKg,
      y: vg.y / victim.profile.massKg - ag.y / actor.profile.massKg }, travel);
    // A request by a motionless player cannot prove restraint. Actual World
    // propulsion opposed by the actual grab can: both delivered impulses are
    // present, and the achieved path falls short of that delivered drive.
    if (achievedDriveDeltaV < HOLDING_JUDGMENT.minimumAchievedDriveDeltaV) return null;
    escapeSpeed = dot(relative, travel) + achievedDriveDeltaV;
    if (escapeSpeed <= 1e-6) return null;
  }
  let normalForce: number;
  let force: Vec2;
  if (joint.kind === 'hands') {
    normalForce = joint.normalForce ?? 0;
    // Native vectors preserve the actual rotating substep frame. Tangential
    // steering belongs to its muscular actor; it is not automatically the
    // cloth holder's action when the two players control different channels.
    if (!joint.normalForceOnB) return null;
    const sign = joint.b === victim.body ? 1 : -1;
    const tangent = (joint.actor ?? joint.a) === actor.body ? joint.tangentForceOnB : undefined;
    force = { x: sign * (joint.normalForceOnB.x + (tangent?.x ?? 0)),
      y: sign * (joint.normalForceOnB.y + (tangent?.y ?? 0)) };
  }
  else {
    // Grasp.force is unsigned total load; it cannot prove a pull. Native
    // signed channels include active reels at their actual delivery axes.
    normalForce = joint.normalForce ?? 0;
    if (!joint.normalForceOnB || !joint.tangentForceOnB) return null;
    force = { x: joint.normalForceOnB.x + joint.tangentForceOnB.x,
      y: joint.normalForceOnB.y + joint.tangentForceOnB.y };
  }
  // OPEN_HANDS: a grip can restrain by dragging along his path as well as by
  // pulling; the same achieved-restraint margins (and HOLD_LEVERAGE's frame)
  // judge it. Open hands cannot drag (the World bounds them by friction).
  if (!(normalForce < -1e-6) && !(OPEN_HANDS && joint.kind === 'hands' && joint.grip)) return null;
  const endRelative = minus(victim.vel, actor.vel);
  const observedSlowdown = escapeSpeed - dot(endRelative, travel);
  if (!(observedSlowdown > 1e-6)) return null;
  // Tension points toward the holder whichever endpoint owns it. World
  // exposes mean normal force and the actual shared arm-impulse budget.
  // A grasp's passive structural restraint is already limited by its native
  // grip capacity and need not spend active arm work. Hand forces additionally
  // carry the active arm-impulse receipt. Do not erase a real passive tackle.
  const deliveredImpulse = joint.kind === 'hands' ? report.armImpulse[actor.idx] : Math.hypot(force.x, force.y) * dt;
  const opposingDeltaV = Math.min(Math.max(0, -dot(force, travel)) * dt,
    deliveredImpulse) / victim.profile.massKg;
  if (!(opposingDeltaV > 1e-6)) return null;
  const fractionLost = observedSlowdown / escapeSpeed;
  const clear = opposingDeltaV >= HOLDING_JUDGMENT.minimumOpposingDeltaV
    && observedSlowdown >= HOLDING_JUDGMENT.minimumObservedSlowdown
    && fractionLost >= HOLDING_JUDGMENT.minimumEscapeFractionLost;
  return { escapeSpeed, observedSlowdown, opposingDeltaV, fractionLost, normalForce,
    restrictiveForceX: force.x, restrictiveForceY: force.y, achievedDriveDeltaV,
    judgment: clear ? 'clear' : 'borderline' };
}

function inCloseLine(sim: PlaySim, start: HoldingIntervalStart, p: Vec2): boolean {
  return start.closeLine && p.x <= sim.los + 3 && p.y >= start.pocketMinY && p.y <= start.pocketMaxY;
}

function atPointOfAttack(sim: PlaySim, start: HoldingIntervalStart, h: HoldStart): boolean {
  const ballNow = sim.ballPos();
  const stillCloseLine = ballNow.x <= sim.los + 3 && ballNow.y >= start.pocketMinY && ballNow.y <= start.pocketMaxY;
  if (stillCloseLine && inCloseLine(sim, start, h.victimStart.pos)) return true;
  const carrier = start.carrier;
  if (!carrier) return false;
  const range = h.victim.profile.reach + carrier.profile.radius;
  return Math.hypot(carrier.pos.x - h.victim.pos.x, carrier.pos.y - h.victim.pos.y) <= range;
}

/** A clear escape beyond both outside edges defeats the double-team no-call
 * exception. Ambiguous between-blocker/split geometry remains a no-call. */
function outsideDouble(h: HoldStart, report: StepReport, carrier: Agent | null): boolean {
  const e = h.rep;
  if (!e?.helpers.length) return true;
  const axis = e.drive ?? { x: 1, y: 0 }, mag = Math.hypot(axis.x, axis.y) || 1;
  const lat = { x: -axis.y / mag, y: axis.x / mag };
  // A helper assignment alone is not a double-team block. Preserve the
  // exception only when at least two blockers actually carried hand/body load
  // against this defender in the observed interval.
  const blockers = [e.blocker, ...e.helpers].filter(b => {
    const j = b === e.blocker ? e.hands : e.helperHands?.get(b);
    return Math.hypot(j?.normalForce ?? 0, j?.tangentForce ?? 0) > 1e-6
      || report.contacts.some(c => c.impulse > 1e-6
        && (c.i === b.idx && c.j === h.victim.idx || c.j === b.idx && c.i === h.victim.idx));
  });
  if (blockers.length < 2) return true;
  const low = Math.min(...blockers.map(b => dot(b.pos, lat) - b.profile.radius));
  const high = Math.max(...blockers.map(b => dot(b.pos, lat) + b.profile.radius));
  const where = dot(h.victim.pos, lat);
  if (where + h.victim.profile.radius < low || where - h.victim.profile.radius > high) return true;
  // A defender can defeat a double through its middle. Actual bodies on
  // opposite sides and clearly behind him toward the runner establish the
  // split; a planned climb/release or a control summary cannot establish it.
  if (carrier) {
    const toBall = minus(carrier.pos, h.victim.pos), distance = Math.hypot(toBall.x, toBall.y);
    if (distance > 1e-6) {
      const forward = { x: toBall.x / distance, y: toBall.y / distance };
      const side = { x: -forward.y, y: forward.x };
      const offsets = blockers.map(b => dot(minus(b.pos, h.victim.pos), side));
      const straddles = Math.min(...offsets) < -h.victim.profile.radius * .25
        && Math.max(...offsets) > h.victim.profile.radius * .25;
      if (straddles && blockers.every(b => dot(minus(h.victim.pos, b.pos), forward)
        > b.profile.radius + h.victim.profile.radius)) return true;
    }
  }
  return false;
}

/** A contact-caused loss of support can defeat the rip/double no-call only
 * when the native load history isolates this blocker. Mixed prior contact,
 * another live joint, a strike, dive or overspeed leaves causation unresolved.
 * This tracks delivered-source provenance; it does not rerun a hypothetical
 * World or infer a prohibited action from a generic fall. */
function updateHoldCausality(sim: PlaySim, report: StepReport, h: HoldStart): boolean {
  const c = causality.get(h.joint);
  if (!c) return false;
  const support = h.victim.body.support;
  const otherLoad = report.contacts.some(x => x.impulse > 1e-6 && [x.i, x.j].includes(h.victim.idx))
    || report.strikes.some(x => x.j === h.victim.idx && Math.hypot(x.impulse.x, x.impulse.y) > 1e-6)
    || sim.world.joints.some(j => j !== h.joint && (j.a === h.victim.body || j.b === h.victim.body)
      && (j.kind === 'hands' ? Math.hypot(j.normalForce ?? 0, j.tangentForce ?? 0) : j.force ?? 0) > 1e-6);
  const ownLegHold = h.joint.kind === 'grasp' && h.joint.legs > 0;
  if (otherLoad || (support?.causes?.overspeed ?? 0) > 1e-6
    || !ownLegHold && (support?.causes?.legs ?? 0) > 1e-6
    || support?.cause === 'dive') c.contaminated = true;
  if (c.neutralOrigin && !c.contaminated && report.falls.includes(h.victim.idx)
    && (support?.cause === 'contact' || ownLegHold && support?.cause === 'legs')
    && ((h.joint.normalForce ?? 0) < -1e-6 || (h.joint.kind === 'grasp' && (h.joint.strideForce ?? 0) > 1e-6))) c.tookFeet = true;
  return c.tookFeet;
}

/** Observe after ball/tackle/whistle resolution for simultaneous no-call notes.
 * It may run after the live phase ended; it adjudicates the saved live interval. */
export function observeHolding(sim: PlaySim, report: StepReport,
  supplied?: HoldingIntervalStart): void {
  const state = memory.get(sim), start = supplied ?? state?.pending;
  if (!start) return;
  if (state) delete state.pending;
  if (sim.ball.kind === 'loose' && sim.ball.flight.pos.z <= .05) groundedLooseFlights.add(sim.ball.flight);
  for (const h of start.holds) {
    const tookFeet = updateHoldCausality(sim, report, h);
    const r = holdingRestriction(h.joint, h.actor, h.victim, h.actorStart, h.victimStart, sim.dt, report);
    if (!r) { restrictions.delete(h.joint); continue; }
    const against = h.actor.team;
    const offense = against === start.possessionTeam;
    const rule = offense ? '12-1-3(c)' : '12-1-6(a)';
    const kind = offense ? 'holding' : 'defensive_holding';
    const runnerException = h.actor === start.carrier || h.victim === start.carrier;
    const groundLooseException = !!start.looseFlight && groundedLooseFlights.has(start.looseFlight)
      && start.looseRecoveryAttempt.has(h.actor.idx);
    const simultaneous = start.beingTackled || !!sim.bond || sim.events.some(e =>
      e.t >= start.t - 1e-6 && e.t <= start.t + sim.dt + 1e-6
      && (e.type === 'tackle' || e.type === 'out_of_bounds') && e.a !== undefined
      && sim.agents[e.a]?.team === start.possessionTeam);
    const warding = h.victim.engagement?.defender === h.actor
      || h.victim.engagement?.helpers.includes(h.victim) && h.victim.engagement.defender === h.actor;
    // An installed fake does not make someone a runner. Only an actually
    // performed presentation/carry-out action earns 12-1-6(a)'s protection.
    const fakeRunner = !offense && start.fakeRunners.has(h.victim)
      && h.victimStart.pos.x < sim.los && h.victimStart.pos.y >= start.pocketMinY
      && h.victimStart.pos.y <= start.pocketMaxY;
    const rip = !!h.rep && h.rep.move === 'rip' && h.rep.moveOk && start.t < h.rep.moveUntil && !tookFeet;
    const alreadyFalling = h.victim.body.support?.state !== 'up'
      && !report.falls.includes(h.victim.idx) && !tookFeet;
    const phi = offense && HOLD_LEVERAGE && !tookFeet ? holderPhi(sim, h) : null;
    // PAST_ALONG_PATH: the officials' 'beaten' is the same definition as the rep's and the grip's -- past along the
    // man's own path of travel (the leverage when he is barely moving).
    const stillInFront = phi !== null && (PAST_ALONG_PATH
      ? !pastAlongPath(h.actorStart, { pos: h.victimStart.pos, vel: h.victimStart.vel }, Math.abs(phi))
      : Math.abs(phi) < 1);
    const exemption = runnerException ? 'runner' : groundLooseException ? 'personal_ground_loose_ball_attempt'
      : offense && simultaneous ? 'simultaneous_runner_tackle_or_boundary'
        : offense && start.passBeyondLine ? 'after_downfield_forward_release'
        : offense && HOLD_CALL && rip ? 'defensive_rip_exception'
        : offense && HOLD_CALL && alreadyFalling ? 'opponent_already_falling'
        : offense && HOLD_CALL && stillInFront ? 'blocker_still_in_front_of_opponent'
        : offense && HOLD_CALL ? null
          : offense && !atPointOfAttack(sim, start, h) ? 'away_from_point_of_attack'
            : offense && !tookFeet && !outsideDouble(h, report, start.carrier) ? 'double_team_without_clear_split_or_outside_escape'
              : offense && rip ? 'defensive_rip_exception'
                : offense && alreadyFalling ? 'opponent_already_falling'
                  : stillInFront ? 'blocker_still_in_front_of_opponent'
                  : !offense && start.defenseTouchedPassException ? 'touched_forward_pass_across_neutral_zone'
                    : !offense && warding ? 'warding_or_defending_block'
                    : fakeRunner ? 'performed_fake_runner_in_pocket' : null;
    // A grip while a qualifying pass is airborne belongs to PI when the same
    // act has already met that rule's stronger ball/catch opportunity elements.
    const dpiSameAct = !offense && sim.penalties.some(p => p.kind === 'dpi'
      && p.playerId === h.actor.player.id && p.t !== undefined
      && p.t >= start.t - 1e-6 && p.t <= start.t + sim.dt + 1e-6);
    let id = heldActs.get(h.joint);
    if (!id) { id = `native-holding:${h.actor.idx}:${h.victim.idx}:${start.t}`; heldActs.set(h.joint, id); }
    if (exemption || dpiSameAct) {
      restrictions.delete(h.joint);
      // These conservative negative branches do not certify the unrepresented
      // countercondition (feet taken, prevented rise or distant point-of-attack
      // causality). Preserve that uncertainty instead of calling it legal.
      if (exemption && ['away_from_point_of_attack', 'double_team_without_clear_split_or_outside_escape',
        'defensive_rip_exception', 'opponent_already_falling', 'blocker_still_in_front_of_opponent'].includes(exemption)
        && !sim.foulRecords.some(f => f.id === id && f.called)) {
        const record: FoulRecord = { id, t: start.t + sim.dt, kind, playerId: h.actor.player.id,
          called: false, assessment: 'unresolved', evidence: { source: 'native', rule,
            action: 'achieved_grab_exception_unresolved', victimId: h.victim.player.id,
            facts: { exception: exemption, tookFeet, holderPhi: phi, escapeSpeed: r.escapeSpeed,
              opposingDeltaV: r.opposingDeltaV, observedSlowdown: r.observedSlowdown,
              judgment: 'exception countercondition lacks clear native proof; no automatic flag' } } };
        const old = sim.foulRecords.findIndex(f => f.id === id);
        if (old < 0) sim.foulRecords.push(record); else sim.foulRecords[old] = record;
      }
      continue;
    }
    let history = restrictions.get(h.joint);
    if (!history || history.actor !== h.actor || history.victim !== h.victim
      || Math.abs(history.end - start.t) > 1e-6) {
      history = { actor: h.actor, victim: h.victim, start: start.t, end: start.t,
        escapeSpeed: r.escapeSpeed, opposingDeltaV: 0, observedSlowdown: 0,
        achievedDriveDeltaV: 0, intervals: 0 };
    }
    // Materiality belongs to one continuous achieved act. Integrate actual
    // restrictive impulse/path loss, never mere duration; a release, unloaded
    // interval or changed voluntary movement resets this receipt.
    history.end = start.t + sim.dt; history.intervals++;
    history.opposingDeltaV += r.opposingDeltaV;
    history.observedSlowdown += r.observedSlowdown;
    history.achievedDriveDeltaV += r.achievedDriveDeltaV;
    restrictions.set(h.joint, history);
    const fractionLost = history.observedSlowdown / history.escapeSpeed;
    const judgment = history.opposingDeltaV >= HOLDING_JUDGMENT.minimumOpposingDeltaV
      && history.observedSlowdown >= HOLDING_JUDGMENT.minimumObservedSlowdown
      && fractionLost >= HOLDING_JUDGMENT.minimumEscapeFractionLost ? 'clear' : 'borderline';
    const evidence = { source: 'native' as const, rule, action: 'achieved_grab_restriction',
      victimId: h.victim.player.id, facts: { intervalStart: history.start, intervalEnd: history.end,
        escapeSpeed: history.escapeSpeed, observedSlowdown: history.observedSlowdown,
        opposingDeltaV: history.opposingDeltaV, fractionLost,
        normalForce: r.normalForce, restrictiveForceX: r.restrictiveForceX,
        restrictiveForceY: r.restrictiveForceY, achievedDriveDeltaV: history.achievedDriveDeltaV,
        intervals: history.intervals, judgment, feetTakenByIsolatedGrab: tookFeet,
        minimumOpposingDeltaV: HOLDING_JUDGMENT.minimumOpposingDeltaV,
        minimumObservedSlowdown: HOLDING_JUDGMENT.minimumObservedSlowdown,
        minimumEscapeFractionLost: HOLDING_JUDGMENT.minimumEscapeFractionLost,
        minimumAchievedDriveDeltaV: HOLDING_JUDGMENT.minimumAchievedDriveDeltaV } };
    if (judgment === 'borderline') {
      const old = sim.foulRecords.findIndex(f => f.id === id);
      const record: FoulRecord = { id, t: history.end, kind, playerId: h.actor.player.id,
        called: false, assessment: 'unresolved' as const, evidence };
      if (old < 0) sim.foulRecords.push(record);
      else if (!sim.foulRecords[old].called) sim.foulRecords[old] = record;
      continue;
    }
    if (sim.penalties.some(p => p.id === id)) continue;
    if (offense && HOLD_CALL) {
      const stage = holdStage(sim, start, h, report, history.opposingDeltaV);
      if (stage.stage !== 'called') {
        const old = sim.foulRecords.findIndex(f => f.id === id);
        const record: FoulRecord = { id, t: history.end, kind, playerId: h.actor.player.id,
          called: false, assessment: 'unresolved' as const,
          evidence: { ...evidence, action: `hold_${stage.stage}`, facts: { ...evidence.facts, ...stage.facts } } };
        if (old < 0) sim.foulRecords.push(record); else sim.foulRecords[old] = record;
        continue;
      }
      Object.assign(evidence.facts, stage.facts, { holdStage: 'called' });
    }
    sim.recordFoul({ id, kind, against, playerId: h.actor.player.id,
      yards: offense ? 10 : 5, autoFirst: !offense, spotX: h.actorStart.pos.x,
      t: start.t + sim.dt, rule, reason: 'achieved grab materially restricted continuing escape',
      phase: 'live', possessionTeam: start.possessionTeam,
      possessionChanges: start.possessionChanges, possessionSpotX: start.possessionSpotX,
      playPhase: start.playPhase }, evidence);
    sim.event(offense ? 'holding' : 'defensive_holding', h.actor, h.victim, rule);
  }
}

const holdLooks = new WeakMap<PlaySim, Map<string, number>>();

/** HOLD_CALL: how far a committed hold goes -- committed only, material
 * (a real path to the ball, restrained against it), or called (material and
 * seen). `effect` is the act's accumulated opposing velocity change (m/s). */
export function holdStage(sim: PlaySim, start: HoldingIntervalStart, h: HoldStart, report: StepReport, effect: number):
  { stage: 'committed' | 'material' | 'called'; facts: Record<string, number | boolean | string | null> } {
  const v = h.victim, ball = start.carrier;
  const poa = atPointOfAttack(sim, start, h);
  const notDouble = outsideDouble(h, report, start.carrier);
  let tMan: number | null = null, tFree: number | null = null, toward = false;
  if (ball) {
    const to = minus(ball.pos, h.victimStart.pos), d = Math.hypot(to.x, to.y);
    tMan = d / Math.max(1e-6, v.profile.vmax);
    toward = d > 1e-6 && dot(h.victimStart.desired, to) > 0;
    const blocked = new Set(sim.engagements.map(e => e.defender));
    for (const o of sim.opponents(h.actor)) {
      if (o === v || blocked.has(o) || (o.body.support && o.body.support.state !== 'up')) continue;
      const t = Math.hypot(ball.pos.x - o.pos.x, ball.pos.y - o.pos.y) / Math.max(1e-6, o.profile.vmax);
      if (tFree === null || t < tFree) tFree = t;
    }
  }
  const next = tMan !== null && (tFree === null || tMan <= tFree);
  const material = (poa || next) && toward && notDouble;
  const traffic = sim.agents.filter(a => a !== v && a !== h.actor
    && Math.hypot(a.pos.x - v.pos.x, a.pos.y - v.pos.y) <= HOLD_TRAFFIC_RADIUS).length;
  const effectYdPerS = effect * 1.0936;
  const pSeen = officiateChance(effectYdPerS) / (1 + traffic);
  let looks = holdLooks.get(sim);
  if (!looks) { looks = new Map(); holdLooks.set(sim, looks); }
  const key = `${h.actor.idx}>${v.idx}`;
  let u = looks.get(key);
  if (u === undefined) { u = sim.dice('official-hold', h.actor, v).next(); looks.set(key, u); }
  const facts = { holdStage: !material ? 'committed' : u < pSeen ? 'called' : 'material',
    holdPointOfAttack: poa, holdNextToBall: next, holdTowardBall: toward, holdOutsideDouble: notDouble,
    holdManToBall: tMan, holdFreeToBall: tFree, holdTraffic: traffic, holdEffectYdPerS: effectYdPerS, holdPSeen: pSeen };
  return { stage: facts.holdStage as 'committed' | 'material' | 'called', facts };
}

/**
 * Trench model: blocking engagements as technical reps on shared physics.
 *
 * A rep keeps a small state that line coaches would recognize:
 *
 *   control  — hand position. +1: the blocker's hands are inside and latched
 *              (he steers the defender); −1: the defender controls the blocker
 *              (hands inside on his chest, or the blocker's hands knocked away).
 *   phi      — the defender's angular progress around the blocker relative to
 *              the line he must stay on (QB for pass pro, drive axis for runs),
 *              in units of 90°: 0 = square, ±1 = hip to hip (beaten). It is
 *              measured from where the bodies actually are, every tick.
 *   base     — each player's balance, read from his body (physics/support.ts).
 *              It belongs to the player, not to this rep.
 *
 * The rep does not move anybody. Each tick it publishes, for the blocker,
 * the defender and any helper:
 *
 *   - a movement intent: where each player is trying to go, his facing, his
 *     pad level, and whether he leans into the contact with his legs;
 *   - a hand joint (physics/world.ts): the arms' working distance and the
 *     bounded push, hold and steering force the current hand fight allows.
 *
 * The physics world turns those into motion with the same contact, traction
 * and support rules every other player obeys: who gets pushed back, who
 * mirrors fast enough, who loses his base. Rush moves are choices made from
 * the state of the rep, with execution uncertainty, and their effects are
 * physical actions — a strike to the chest, a snatch that pulls the blocker
 * off balance, hands cleared for a moment so the rusher's own feet carry him
 * past — never a jump in leverage or a prescribed speed.
 */
import { clamp, logistic, norm, sub, type Vec2 } from '../core/vec.js';
import { G } from '../core/units.js';
import { gaitLag, fatigueFactor, movingArrivalVelocity } from '../physics/kinematics.js';
import { availability, supportParams } from '../physics/support.js';
import { gapY } from '../playbook/alignment.js';
import { zoneLikeScheme } from '../playbook/types.js';
import { CF_FLOW } from './counterfactual.js';
import { connectionGap, contactMotion } from './contact-motion.js';
import { lineFlow, linePicture, liveGapY } from './live-gaps.js';
import { requestToCover } from './motion-plan.js';
import { runContactObservers } from './run-contact-observer.js';
import type { HandJoint, Intent } from '../physics/world.js';
import type { Agent, Engagement, RunContactSurface, RushMove } from './agent.js';
import type { PlaySim } from './playsim.js';

// ------------------------------------------------------------ traits

export interface TrenchTraits {
  /** Pad height when bent at the knees (yd). */
  pad: number;
  /** 0–1 flexibility to play low / bend the edge. */
  bend: number;
  /** 0–1 quickness and precision of the hands. */
  hands: number;
  /** Arm length in inches. */
  arm: number;
  /** Lateral quickness while engaged / in a set (yd/s). */
  lateral: number;
  /** 0–1 footwork technique (set, mirror, re-anchor). */
  feet: number;
  /** 0–1 balance / base recovery. */
  balance: number;
  /** 0–1 recognition of what the opponent is doing. */
  read: number;
}

const cache = new WeakMap<Agent, TrenchTraits>();
const runCache = new WeakMap<Agent, TrenchTraits>();

/** The body/drill traits are shared. Hands and feet use the technique of the
 * actual rep; knowing a pass set is not the same skill as sustaining a run fit.
 * The default remains the pass technique used by pre-contact protection.
 */
/** Experimental (DL_FLATTEN=1, off): an attacking lineman whose blocker steps
 * across his face (a reach or zone step: the man on him, as he sees him, moving across
 * faster than 1 yd/s and more across than at him) flattens on
 * the line at the depth he met him, instead of driving upfield at 1.5 yd/s
 * past the play ("flatten the guard on the L.O.S. and keep outside
 * leverage", Bucs; "push & press", Allen; "do not run outside", Michigan).
 * Upfield penetration against zone opens the cutback and the cut-up behind
 * him: ours finish 1.61 yd upfield on single-blocked outside zone at 2.5 s,
 * tracked linemen 0.62. A vertical drive block keeps the attack. */
const DL_FLATTEN = process.env.DL_FLATTEN === '1';
/** Experimental (DL_ANCHOR=1, off): an engaged run defender who is doubled,
 * or is being driven back by a real load, sits into his stance: pads down to
 * get under the drive ("stay low", "drop the pressure leg"; Bucs, Kuchar,
 * Shurmur). It only matters where pad level has a physical path
 * (PAD_LEVERAGE); a blocker already anchors the same way when driven. */
const DL_ANCHOR = process.env.DL_ANCHOR === '1';
function drivenBack(d: Agent): boolean {
  const felt = d.body.support?.felt; if (!felt) return false;
  const load = Math.hypot(felt.x, felt.y);
  return load > 0.25 * d.profile.massKg * G && (d.vel.x * felt.x + d.vel.y * felt.y) / load > 0.15;
}

export function traits(a: Agent, type: 'pass' | 'run' = 'pass'): TrenchTraits {
  const common = commonTraits(a);
  if (type === 'pass' || a.team !== 'O') return common;
  let run = runCache.get(a);
  if (!run) {
    const cone = clamp((8.0 - a.player.measurables.threeCone) / 1.3, 0, 1);
    run = { ...common,
      hands: 0.65 * a.r('handTechnique') + 0.35 * a.r('runBlock'),
      feet: 0.6 * a.r('runBlock') + 0.2 * a.r('balance') + 0.2 * cone,
    };
    runCache.set(a, run);
  }
  return run;
}

function commonTraits(a: Agent): TrenchTraits {
  let t = cache.get(a);
  if (t) return t;
  const m = a.player.measurables;
  const cone = clamp((8.0 - m.threeCone) / 1.3, 0, 1);
  const shuttle = clamp((4.9 - m.shuttle) / 0.9, 0, 1);
  const isOff = a.team === 'O';
  const tech = isOff ? 0.5 * a.r('passBlock') + 0.5 * a.r('runBlock') : 0.4 * a.r('passRushFinesse') + 0.3 * a.r('blockShedding') + 0.3 * a.r('passRushPower');
  const bend = clamp(0.45 * cone + 0.25 * shuttle + 0.3 * tech - (m.heightIn - 76) * 0.02, 0, 1);
  const pad = (m.heightIn / 36) * 0.5 * (1.12 - 0.24 * bend);
  const hands = isOff ? 0.65 * a.r('handTechnique') + 0.35 * a.r('passBlock') : 0.6 * a.r('passRushFinesse') + 0.4 * a.r('blockShedding');
  const lateral = a.profile.vmax * a.profile.shuffle * (0.55 + 0.45 * (0.5 * cone + 0.5 * shuttle));
  const feet = isOff ? 0.6 * a.r('passBlock') + 0.2 * a.r('balance') + 0.2 * cone : 0.5 * a.r('passRushFinesse') + 0.3 * cone + 0.2 * a.r('balance');
  t = {
    pad,
    bend,
    hands,
    arm: m.armIn,
    lateral,
    feet,
    balance: a.r('balance'),
    read: 0.6 * a.r('awareness') + 0.4 * a.r(isOff ? 'handTechnique' : 'playRecognition'),
  };
  cache.set(a, t);
  return t;
}

// ------------------------------------------------------------ geometry

/** Reference contact surface, normally against the displacement intention. */
export function axisOf(sim: PlaySim, e: Engagement): Vec2 {
  if (e.type === 'pass') return norm(sub(sim.qb.pos, e.defender.pos));
  if (e.surfaceAxis) return e.surfaceAxis;
  const d = e.drive ?? norm(sub(e.defender.pos, e.blocker.pos));
  return { x: -d.x, y: -d.y };
}

const latOf = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** Set relative to the visible launch point, leaving space to step up.
 * Tackles gain more depth to intersect an edge arc; the interior stays in
 * front. This is a protection technique choice, not an elapsed-snap gate.
 */
export function passSetDepth(sim: PlaySim, b: Agent): number {
  const tackle = b.slot === 'LT' || b.slot === 'RT';
  const clearance = tackle ? 2.8 : 3.8;
  return Math.max(tackle ? 1.4 : 1, sim.los - sim.qb.pos.x - clearance);
}

/** Signed phi from current positions (blocker relative to the defender). */
function measurePhi(axis: Vec2, d: Agent, b: Agent): number {
  const bd = norm(sub(b.pos, d.pos));
  const lat = latOf(axis);
  // B = D + (axis cosφ − lat sinφ)·sep  ⇒  φ = atan2(−bd·lat, bd·axis)
  return Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2);
}

/** DOWN_SEAL: the hole's side along lat for the owner of a gap-scheme down
 * block (the play is called; the hole is the play side), else 0. */
function downBlockHoleSide(sim: PlaySim, e: Engagement, lat: Vec2): number {
  const run = sim.offCall.run;
  if (e.type !== 'run' || e.surfaceAxis || !run || zoneLikeScheme(run.scheme)) return 0;
  const plan = (e.blocker.behavior as { plan?: { kind?: string; target?: Agent | null } }).plan;
  if (plan?.kind !== 'down' || plan.target !== e.defender) return 0;
  const ps = run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  return Math.sign(lat.y * ps) || 1;
}

/** CUTOFF_SEAL: the drive line of a solo backside cutoff taken from his
 * man's play-side front, or null when this rep is not one. */
function cutoffDrive(sim: PlaySim, blocker: Agent, defender: Agent): Vec2 | null {
  const plan = (blocker.behavior as { plan?: { kind?: string; target?: Agent | null; combination?: unknown } }).plan;
  const run = sim.offCall.run;
  // Zone cutoffs keep their own contact frames (zone reads, installed walls).
  if (!run || zoneLikeScheme(run.scheme) || plan?.kind !== 'cutoff' || plan.target !== defender || plan.combination) return null;
  const ps = run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  return { x: sim.attackDir(blocker.team) * Math.cos(Math.PI / 6), y: -ps * Math.sin(Math.PI / 6) };
}

/** Balance available to a player's technique, from his body. */
function baseOf(a: Agent): number {
  const sup = a.body.support;
  if (!sup) return 1;
  return availability(sup, supportParams(a.profile), fatigueFactor(a.body.energy));
}

// ------------------------------------------------------------ creation

export function createEngagement(sim: PlaySim, blocker: Agent, defender: Agent, type: 'pass' | 'run', drive: Vec2 | null, surface?: RunContactSurface): Engagement | null {
  const t = sim.t;
  if (sim.bond && [sim.bond.carrier, ...sim.bond.tacklers].some((a) => a === blocker || a === defender)) return null;
  if (blocker.engagement) return blocker.engagement;
  if ((blocker.shedBy.get(defender) ?? -1) > t) return null;
  if (defender.isDown(t) || blocker.isDown(t)) return null;
  if (!inBlockReach(blocker, defender, type)) return null;
  // BLOCK_FRONT: a run block is taken on the defender's front or side. Hands
  // that arrive on his back (a block in the back) start no rep; the bodies
  // still collide in the World.
  if (BLOCK_FRONT && type === 'run') {
    const toB = Math.atan2(blocker.pos.y - defender.pos.y, blocker.pos.x - defender.pos.x);
    if (Math.abs(Math.atan2(Math.sin(toB - defender.facing), Math.cos(toB - defender.facing))) > BLOCK_FRONT_ANGLE) return null;
  }
  const existing = defender.engagement;
  if (existing) {
    // Second blocker: double team.
    if (existing.helpers.length < 1 && existing.blocker !== blocker) {
      existing.helpers.push(blocker);
      helperSince.set(blocker, t);
      blocker.engagement = existing;
      syncJoints(sim, existing);
      const hands = existing.helperHands!.get(blocker)!;
      if (Math.hypot(blocker.pos.x-defender.pos.x,blocker.pos.y-defender.pos.y) <= hands.extension)
        helperTouches.set(blocker, { rep: existing, at: t, pos: { ...defender.pos } });
      return existing;
    }
    return null;
  }

  // CUTOFF_SEAL: a backside cutoff walls his man off from the play. The rep
  // is taken from the man's play-side front (30 deg play side of head-up) and
  // drives him away from the play, so that front is the rep's axis: a blocker
  // who gets there is winning the rep, one still beside or behind him is not.
  const cutoffFront = CUTOFF_SEAL && type === 'run' && !surface ? cutoffDrive(sim, blocker, defender) : null;
  if (cutoffFront) drive = cutoffFront;
  const rng = sim.rng;
  const tb = traits(blocker, type);
  const td = traits(defender, type);
  const e: Engagement = {
    blocker,
    defender,
    helpers: [],
    start: t,
    type,
    win: 0,
    control: 0,
    phi: 0,
    side: 1,
    baseB: baseOf(blocker),
    baseD: baseOf(defender),
    move: 'bull',
    moveUntil: t,
    moveOk: false,
    nextMoveAt: t + rng.range(0.35, 0.6),
    pushBoost: 0,
    drive,
    sealTarget: 0,
    repEdge: rng.normal(0, 0.08),
    holding: false,
  };
  // This is the installed shoulder, never inferred from the actual arrival.
  // Existing hands and joining helpers returned above keep their acquired frame.
  if (type === 'run' && surface) {
    e.surfaceAxis = { ...surface.axis };
    e.sealTarget = surface.sealTarget;
  }
  const axis = axisOf(sim, e);
  const lat = latOf(axis);
  e.phi = clamp(measurePhi(axis, defender, blocker), -0.95, 0.95);

  // Working side: edge rushers work outside; interior/run defenders toward
  // their gap / the ball; a defender who is already beside the blocker keeps
  // working that way.
  let pref: Vec2;
  if (type === 'pass') {
    const out = Math.sign(defender.pos.y - sim.ballY) || 1;
    const isEdge = Math.abs(defender.pos.y - sim.ballY) > 3.0;
    pref = isEdge ? { x: 0, y: out } : { x: 0, y: Math.sign(defender.pos.y - blocker.pos.y) || out };
  } else pref = sub(runContactRead(sim, e).aim, defender.pos);
  e.side = Math.sign(pref.x * lat.x + pref.y * lat.y) || 1;
  if (Math.abs(e.phi) > 0.3) e.side = Math.sign(e.phi);

  // Punch exchange. Longer arms land first and keep the opponent off the body.
  const armEdge = (tb.arm - td.arm) / 3; // +1 per 3" advantage
  const punchB = tb.hands + 0.12 * armEdge + rng.normal(0, 0.18) + e.repEdge;
  if (type === 'pass') {
    const plan = planMove(sim, e, defender, blocker);
    e.move = plan;
    if (plan === 'swim' || plan === 'club' || plan === 'rip' || plan === 'speed') {
      // Swipe/chop the punch: a miss leaves the blocker reaching at air.
      const swipe = td.hands + 0.15 * td.bend + rng.normal(0, 0.18);
      if (swipe - punchB > 0.18) {
        e.control = -0.5;
        e.moveOk = true;
        e.moveUntil = t + 0.3;
        e.nextMoveAt = t + 0.2;
        lunge(sim, blocker, defender, 0.5);
      } else e.control = clamp(0.35 + (punchB - swipe), -0.2, 0.9);
    } else {
      // Power: strike for the chest.
      const strike = 0.5 * td.hands + 0.5 * defender.r('passRushPower') - 0.12 * armEdge + rng.normal(0, 0.18);
      e.control = clamp(punchB - strike, -0.8, 0.8);
    }
  } else {
    // Run: get-off and first hands. Offensive linemen know the snap count.
    const strike = 0.5 * td.hands + 0.5 * defender.r('strength') - 0.12 * armEdge + rng.normal(0, 0.18);
    e.control = HAND_FIGHT ? firstHands(blocker, defender, tb, td, rng) : clamp(punchB - strike + 0.1, -0.8, 0.8);
    e.move = 'shed';
    // Reach blocks want the defender sealed on the backside. A sealed
    // cutoff's front is already the rep's axis.
    if (drive && !surface && !cutoffFront) e.sealTarget = clamp(-0.45 * Math.abs(drive.y), -0.5, 0) * e.side;
  }
  blocker.engagement = e;
  defender.engagement = e;
  sim.engagements.push(e);
  syncJoints(sim, e);
  return e;
}

const helperSince = new WeakMap<Agent, number>();
// The local point acquired by new hands, not a continuously fresh visual fix.
const helperTouches = new WeakMap<Agent, { rep: Engagement; at: number; pos: Vec2 }>();
export function inBlockReach(b: Agent, d: Agent, type: 'run' | 'pass'): boolean {
  const range = b.profile.radius + d.profile.radius + .1 + b.player.measurables.armIn / 36 * (type === 'run' ? .45 : .85);
  return Math.hypot(b.pos.x-d.pos.x,b.pos.y-d.pos.y) <= range;
}

/** Functional contact, direction of force and time to establish a base. */
export function helperSupport(sim: PlaySim, e: Engagement, h: Agent): number {
  if (h.isDown(sim.t) || !inBlockReach(h,e.defender,e.type)) return 0;
  const axis = axisOf(sim,e), toward = norm(sub(h.pos,e.defender.pos));
  const angle = clamp(toward.x*axis.x+toward.y*axis.y,0,1);
  const established = clamp((sim.t-(helperSince.get(h) ?? e.start))/.15,0,1);
  return angle * established * fatigueFactor(h.body.energy);
}

// ------------------------------------------------------------ hands

/** Arm force a player can put through his hands, kg·yd/s². */
function armForce(a: Agent): number {
  return supportParams(a.profile).armForce;
}

// A joining blocker earns his own hands. The state belongs to the acquired
// physical contact, rather than to whichever blocker currently owns the rep.
// Primary reps retain their existing control/RNG law; pass helpers retain the
// older behavior until their separate technique is addressed.
interface RunHandControl { control: number; }
const runHands = new WeakMap<HandJoint, RunHandControl>();

/** Acquired hand position, never inferred from how much force a joint carries.
 * The caller still checks that this joint is live and that the body can support
 * the proposed work. A stale object reference alone establishes neither.
 */
export function contactControl(e: Engagement, member: Agent): number | null {
  if (member === e.blocker) return e.control;
  if (e.type !== 'run' || !e.helpers.includes(member)) return null;
  const joint = e.helperHands?.get(member);
  return joint?.a === member.body && joint.b === e.defender.body
    ? runHands.get(joint)?.control ?? null : null;
}

/** Transfer the keeper's acquired contact without moving bodies or changing
 * any joint capacity/load. The controller handles the departing player's job;
 * the next ordinary sync removes that player's old physical contact.
 */
export function promoteContact(e: Engagement, keeper: Agent): boolean {
  if (keeper === e.blocker) return true;
  const joint = e.helperHands?.get(keeper), control = contactControl(e, keeper);
  if (!joint || control === null) return false;
  e.blocker = keeper;
  e.hands = joint;
  e.control = control;
  e.helpers = e.helpers.filter(h => h !== keeper);
  e.helperHands!.delete(keeper);
  // A cloth grab by the departed primary is not the keeper's acquired hold.
  e.holding = false;
  // Nor did a move which cleared that primary's hands clear the keeper's
  // independent contact. Existing physical strikes and body state remain.
  e.moveOk = false;
  return true;
}

/** The same working-distance and bounded arm law for either run blocker. */
function setContactHands(joint: HandJoint, b: Agent, d: Agent, type: 'pass' | 'run', c: number, holding: boolean): void {
  const tb = traits(b, type), td = traits(d, type);
  const sep = b.profile.radius + d.profile.radius;
  const reach = (c >= 0 ? tb.arm : td.arm) / 36;
  joint.actor = c >= 0 ? b.body : d.body;
  joint.extension = sep + reach * 0.3 * (0.5 + 0.5 * Math.abs(c));
  joint.push = (c >= 0 ? armForce(b) : armForce(d)) * (0.35 + 0.65 * Math.abs(c));
  joint.hold = holding ? armForce(b) * 1.2 : c > 0.3 ? armForce(b) * 0.25 * c : 0;
  joint.steer = c >= 0 ? armForce(b) * (0.15 + 0.55 * c) : armForce(d) * (0.15 + 0.4 * -c);
}

function setRunHelperHands(sim: PlaySim, e: Engagement, h: Agent, joint: HandJoint): void {
  if (h.isDown(sim.t) || !inBlockReach(h, e.defender, 'run')) {
    runHands.delete(joint);
    joint.push = joint.hold = joint.steer = 0;
    return;
  }
  let state = runHands.get(joint);
  if (!state) {
    const d = e.defender, tb = traits(h, 'run'), td = traits(d, 'run');
    // A punch can extend to the longest working distance already represented
    // by the shared hand law. Range permits an exchange; it does not win one.
    const workingReach = h.profile.radius + d.profile.radius + tb.arm / 36 * 0.3;
    const touching = Math.hypot(h.pos.x-d.pos.x, h.pos.y-d.pos.y) <= workingReach;
    if (!touching) {
      // Reaching toward a contact is not acquired inside hands. In particular
      // an unacquired joint cannot steer through air or hold an opponent.
      joint.extension = workingReach;
      joint.push = joint.hold = joint.steer = 0;
      return;
    }
    const armEdge = (tb.arm-td.arm)/3;
    const repEdge = sim.rng.normal(0, 0.08);
    const punch = tb.hands + 0.12*armEdge + sim.rng.normal(0, 0.18) + repEdge;
    const strike = 0.5*td.hands + 0.5*d.r('strength') - 0.12*armEdge + sim.rng.normal(0, 0.18);
    state = { control: clamp(punch-strike+0.1, -0.8, 0.8) };
    runHands.set(joint, state);
    helperTouches.set(h, { rep: e, at: sim.t, pos: { ...d.pos } });
  }
  setContactHands(joint, h, e.defender, 'run', state.control, false);
}

function advanceRunHelperHands(sim: PlaySim, e: Engagement): void {
  const td = traits(e.defender, 'run');
  for (const h of e.helpers) {
    const joint = e.helperHands?.get(h), state = joint && runHands.get(joint);
    if (!state) continue;
    const tb = traits(h, 'run');
    state.control = clamp(state.control + sim.dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + sim.rng.normal(0, 0.25)), -1, 1);
  }
}

/**
 * Keep the world's hand joints in step with the rep: one for the blocker,
 * one per helper. A joint is the hand fight's physical consequence — working
 * distance, bounded push, hold and steering — set every tick from control.
 */
export function syncJoints(sim: PlaySim, e: Engagement): void {
  const world = sim.world;
  const want = new Map<Agent, HandJoint>();
  const make = (b: Agent, existing?: HandJoint): HandJoint =>
    existing ?? { kind: 'hands', a: b.body, b: e.defender.body, extension: 1, push: 0, hold: 0, steer: 0 };
  e.hands = make(e.blocker, e.hands && e.hands.a === e.blocker.body ? e.hands : undefined);
  want.set(e.blocker, e.hands);
  const helpers = (e.helperHands ??= new Map());
  for (const h of e.helpers) want.set(h, make(h, helpers.get(h)));
  for (const [h, j] of [...helpers]) if (!e.helpers.includes(h)) { helpers.delete(h); world.joints = world.joints.filter((x) => x !== j); }
  for (const h of e.helpers) helpers.set(h, want.get(h)!);
  const mine = new Set(want.values());
  world.joints = world.joints.filter((j) => j.kind !== 'hands' || j.b !== e.defender.body || mine.has(j));
  for (const j of mine) if (!world.joints.includes(j)) world.joints.push(j);
  setHands(sim, e);
}

function setHands(sim: PlaySim, e: Engagement): void {
  const b = e.blocker, d = e.defender;
  const t = sim.t;
  const inMove = t < e.moveUntil && e.moveOk;
  // Inside hands lock out at the controlling player's arm length; neither in
  // control, the hands meet in the middle.
  const hands = e.hands!;
  // Latched hands can hold and steer; a defender in control steers the
  // blocker off his line just as well.
  setContactHands(hands, b, d, e.type, e.control, e.holding);
  // A landed finesse move has the hands off for its window.
  if (inMove && e.move !== 'bull' && e.move !== 'longarm') {
    hands.steer *= 0.1;
    if (e.move === 'spin' || e.move === 'swim') hands.push *= 0.2;
  }
  for (const h of e.helpers) {
    const j = e.helperHands?.get(h);
    if (!j) continue;
    if (e.type === 'run') { setRunHelperHands(sim, e, h, j); continue; }
    const support = helperSupport(sim, e, h);
    j.extension = h.profile.radius + d.profile.radius + traits(h, e.type).arm / 36 * 0.2;
    j.push = armForce(h) * 0.8 * support;
    j.steer = armForce(h) * 0.4 * support;
    j.hold = 0;
  }
}

/**
 * Mirror by feel: the sideways load the blocker's hands carry last step,
 * as a lateral velocity cue along `lat`. A defender working across pulls the
 * blocker's hands with him well before his body is visibly past; the
 * blocker's feet answer that pull (proprioception, not prediction).
 */
function felt(e: Engagement, lat: Vec2): number {
  const j = e.hands;
  if (!j || !j.tangentForce) return 0;
  const b = e.blocker, d = e.defender;
  const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, l = Math.hypot(dx, dy) || 1;
  // Tangential force on the defender is along perp(b→d); the blocker feels the opposite.
  const tx = -dy / l, ty = dx / l;
  const onBlocker = -(tx * lat.x + ty * lat.y) * j.tangentForce;
  return onBlocker / b.profile.massKg * 0.3;
}

/** Remove a rep's joints from the world (disengage). */
export function releaseJoints(sim: PlaySim, e: Engagement): void {
  const gone = new Set<HandJoint>([...(e.hands ? [e.hands] : []), ...(e.helperHands?.values() ?? [])]);
  for (const joint of gone) runHands.delete(joint);
  sim.world.joints = sim.world.joints.filter((j) => !gone.has(j as HandJoint));
}

/** A player who reached at air: his lean goes with his arms. */
function lunge(sim: PlaySim, a: Agent, toward: Agent, amount: number): void {
  const sup = a.body.support;
  if (!sup) return;
  const dir = norm(sub(toward.pos, a.pos));
  const force = supportParams(a.profile).pushForce * amount;
  sup.lean = { x: sup.lean.x + dir.x * force, y: sup.lean.y + dir.y * force };
  void sim;
}

// ------------------------------------------------------------ moves

/** Pre-contact rush plan from the rusher's tools and alignment. */
function planMove(sim: PlaySim, e: Engagement, d: Agent, b: Agent): RushMove {
  const td = traits(d);
  const power = d.r('passRushPower');
  const fin = d.r('passRushFinesse');
  const isEdge = Math.abs(d.pos.y - sim.ballY) > 3.0;
  const burst = clamp((1.75 - d.player.measurables.tenSplit) / 0.3, 0, 1);
  const massEdge = (d.profile.massKg - b.profile.massKg) / 60;
  const w: Array<[RushMove, number]> = [
    ['bull', 0.3 + power * 1.0 + massEdge],
    ['longarm', 0.1 + power * 0.6 + (td.arm - 33) * 0.12],
    ['speed', isEdge ? 0.2 + burst * 1.1 + td.bend * 0.6 : 0],
    ['swim', 0.15 + fin * 0.8],
    ['rip', 0.15 + fin * 0.6 + td.bend * 0.3],
    ['club', 0.1 + fin * 0.4 + power * 0.3],
  ];
  if (Math.abs(e.phi) > 0.35) w.push(['dip', 0.8 + td.bend]);
  // Contact executes the approach plan. Previously a speed arc could turn
  // into an unrelated bull rep the instant the tackle landed his hands.
  const approach = d.behavior.kind === 'rush' && 'plan' in d.behavior ? d.behavior.plan : undefined;
  const fits = (move: RushMove) => approach === 'speed' ? move === 'speed' || move === 'dip'
    : approach === 'power' ? move === 'bull' || move === 'longarm'
    : approach === 'finesse' ? move === 'swim' || move === 'rip' || move === 'club' : true;
  const planned = w.filter(([move]) => fits(move));
  return sim.rng.weighted(
    planned.map((x) => x[0]),
    planned.map((x) => Math.max(0, x[1])),
  );
}

/** Choose the next move from the state of the rep. */
function chooseMove(sim: PlaySim, e: Engagement): RushMove {
  const d = e.defender;
  const td = traits(d);
  const power = d.r('passRushPower');
  const fin = d.r('passRushFinesse');
  const w: Array<[RushMove, number]> = [
    ['bull', 0.2 + power * 0.9 + (e.control < 0 ? 0.4 : 0)],
    ['longarm', 0.1 + power * 0.5 + (td.arm - 33) * 0.1],
    ['rip', 0.1 + fin * 0.5 + (e.control > 0.3 ? 0.6 : 0)],
    ['club', 0.1 + fin * 0.3 + power * 0.2 + (e.control > 0.3 ? 0.4 : 0)],
    ['swim', 0.1 + fin * 0.6 + (e.baseB < 0.6 ? 0.6 : 0)],
    ['snatch', 0.05 + power * 0.3 + (e.baseB < 0.55 ? 0.9 : 0)],
  ];
  // Even with the blocker on the working side: finish with dip-and-bend.
  if (e.phi * e.side > 0.4) w.push(['dip', 1.0 + td.bend * 1.5]);
  // Blocker over-set (rusher is inside his leverage): inside counter.
  if (e.phi * e.side < -0.15 || (e.type === 'pass' && e.blocker.vel.x < -2 && e.phi * e.side < 0.1)) w.push(['spin', 0.4 + fin * 1.2], ['swim', 0.4 + fin * 0.6]);
  return sim.rng.weighted(
    w.map((x) => x[0]),
    w.map((x) => Math.max(0.01, x[1])),
  );
}

/**
 * Resolve the defender's move against the blocker's counters. Success and
 * failure are physical actions on the two bodies and their hands.
 */
function resolveMove(sim: PlaySim, e: Engagement, axis: Vec2): void {
  const t = sim.t;
  const rng = sim.rng;
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  const fin = d.r('passRushFinesse');
  const pow = d.r('passRushPower');
  const counter = 0.45 * tb.hands + 0.25 * tb.read + 0.3 * tb.feet;
  const baseBonus = (0.6 - e.baseB) * 1.2;
  const doubled = e.helpers.length > 0 ? -1.4 : 0;
  let skill: number;
  let bonus = baseBonus + doubled;
  switch (e.move) {
    case 'bull':
      skill = 0.6 * pow + 0.4 * d.r('strength');
      bonus += (d.profile.massKg - b.profile.massKg) / 70 + (traits(b).pad - td.pad) * 1.5;
      break;
    case 'longarm':
      skill = 0.6 * pow + 0.4 * d.r('strength');
      bonus += (td.arm - tb.arm) * 0.12;
      break;
    case 'speed':
    case 'dip':
      skill = 0.45 * fin + 0.55 * td.bend;
      bonus += e.phi * e.side * 1.2 + (td.lateral - tb.lateral) * 0.25;
      break;
    case 'spin':
      skill = 0.7 * fin + 0.3 * clamp((7.4 - d.player.measurables.threeCone) / 0.9, 0, 1);
      bonus += -e.phi * e.side * 1.5 - 0.4; // high risk unless he's over-set
      break;
    case 'swim':
    case 'club':
      skill = 0.75 * fin + 0.25 * pow;
      bonus += (d.player.measurables.heightIn - b.player.measurables.heightIn) * 0.03 + (td.arm - tb.arm) * 0.05;
      break;
    case 'rip':
      skill = 0.7 * fin + 0.3 * td.bend;
      bonus += (tb.pad - td.pad) * 1.2;
      break;
    case 'snatch':
      skill = 0.5 * pow + 0.5 * fin;
      bonus += (0.5 - e.baseB) * 2;
      break;
    default:
      skill = 0.5;
  }
  const p = logistic(-2.1 + 3.4 * (skill - counter) + bonus + e.control * -0.6);
  const ok = rng.chance(p);
  e.moveUntil = t + 0.3;
  e.moveOk = ok;
  const lat = latOf(axis);
  const mb = b.profile.massKg, md = d.profile.massKg;
  const world = sim.world;
  if (ok) {
    switch (e.move) {
      case 'bull':
        // Hips through the chest: a strike that drives the blocker back.
        e.pushBoost = 0.6;
        world.strike(d.body, b.body, { x: axis.x * mb * 0.9, y: axis.y * mb * 0.9 });
        e.control = Math.min(e.control, -0.3);
        break;
      case 'longarm':
        e.pushBoost = 0.45;
        world.strike(d.body, b.body, { x: axis.x * mb * 0.6, y: axis.y * mb * 0.6 });
        e.control = -0.6;
        break;
      case 'speed':
      case 'dip':
        // Hands avoided, hips turned: his own feet carry him around.
        e.control = Math.min(e.control, 0);
        break;
      case 'spin':
        e.side = -e.side;
        e.control = Math.min(e.control, -0.2);
        break;
      case 'swim':
      case 'club': {
        // The club knocks the blocker's arm and shoulder across his body.
        if (e.move === 'club') world.strike(d.body, b.body, { x: -lat.x * e.side * mb * 0.7, y: -lat.y * e.side * mb * 0.7 });
        e.control = -0.4;
        break;
      }
      case 'rip':
        e.control = Math.min(e.control - 0.6, -0.2);
        break;
      case 'snatch':
        // Pull the blocker's arm through: he is yanked forward, off his base.
        world.strike(d.body, b.body, { x: (-axis.x * 1.1 + lat.x * e.side * 0.5) * mb, y: (-axis.y * 1.1 + lat.y * e.side * 0.5) * mb });
        e.control = Math.min(e.control, -0.2);
        break;
      default:
        break;
    }
  } else {
    // Failed move: the blocker latches and punches a rusher who has exposed
    // his chest.
    e.control = Math.min(1, e.control + 0.35);
    const punch = (e.move === 'spin' ? 0.9 : 0.45) * (0.5 + 0.5 * tb.hands);
    world.strike(b.body, d.body, { x: -axis.x * md * punch, y: -axis.y * md * punch });
  }
  e.nextMoveAt = t + (e.move === 'bull' || e.move === 'longarm' ? 0.75 : 0.55) + rng.range(0, 0.45);
}

// ------------------------------------------------------------ update

/** Anchor braces along the drive line and keeps lateral work (ANCHOR_SPLIT=0 off). */
const ANCHOR_SPLIT = process.env.ANCHOR_SPLIT !== '0';

/** Stretch reaches stay connected rather than drive (STRETCH_REACH=0 off). */
const STRETCH_REACH = process.env.STRETCH_REACH !== '0';
/** Trial: retain the held solo reach's track intention through contact. */
const RUN_CONTACT_TRACK = process.env.RUN_CONTACT_TRACK === '1';
/** Experimental (DL_FEEL=1, off): an engaged defender's lateral flow cue is
 * the blocker's motion felt through the hands each tick while touching (the
 * same haptic channel as his position), not the visual sample held for a
 * decision beat. */
const DL_FEEL = process.env.DL_FEEL === '1';
/** Experimental (BLOCK_FRONT=1, off): a run block starts only with the
 * blocker in front of or beside the defender's chest (within
 * BLOCK_FRONT_ANGLE of the way the defender's body faces). Downfield, a block
 * in the back is illegal and does not hold a man who keeps running. */
const BLOCK_FRONT = process.env.BLOCK_FRONT === '1', BLOCK_FRONT_ANGLE = 110 * Math.PI / 180;
/** Experimental (STRETCH_FLAT=1, off): a reach blocker plays flat. Matching
 * an attacking defender's normal motion asks his feet to retreat, so the
 * defender walks into the backfield without load. He gives no ground on
 * purpose; only felt force takes it, and the anchor answers that. */
const STRETCH_FLAT = process.env.STRETCH_FLAT === '1';
/** Shoulder speed is a complete component; set 0 to reproduce the comparison baseline. */
const RUN_CONTACT_COMPONENTS = process.env.RUN_CONTACT_COMPONENTS !== '0';
/** CUTOFF_SEAL=1 (default off): on gap schemes a solo backside cutoff takes
 * his rep from his man's play-side front (30 deg play side of head-up),
 * driving him away from the play, instead of the cutoff's installed drive,
 * whose seal side always lay backside: the pair drifted away from the play
 * (-0.6 yd at +1 s; tracked cutoff reps +0.9 toward it). See
 * docs/reviews/run-offense.md. */
const CUTOFF_SEAL = process.env.CUTOFF_SEAL === '1';
/** DOWN_SEAL=1 (default off): the owner of a gap-scheme down block reads his
 * man's motion from his own picture (not the man's true velocity), answers
 * only motion toward the hole and works to the man's hole side. Mirroring the
 * man's motion either way chased the motion his own push made: down-blocked
 * pairs washed 1.0-1.1 yd backside in a second, where tracked down blocks are
 * a stalemate (+0.2/-0.1), with the center 1.6 yd backside at 1.5 s
 * (tracking 0.4). See docs/reviews/run-offense.md. */
const DOWN_SEAL = process.env.DOWN_SEAL === '1';
/** DOWN_SEAL's offset of the blocker toward the hole, as a seal angle (the
 * installed down block's magnitude, 0.45 x the 45 deg drive's lateral). */
const DOWN_SEAL_TARGET = 0.45 * Math.SQRT1_2;

/** Engaged run fits plan their flow with their own body (DL_FLOW=0: proportional follow). */
const DL_FLOW = process.env.DL_FLOW !== '0';
/** Experimental (BACK_CHASE=1, off): a first-level defender the ball has gone
 * away from pursues down the line instead of holding his shoulder on the
 * blocker. Flow is declared from his own picture of the runner (developed
 * lateral speed, or the back's first step from his public alignment); he
 * aims a yard behind the ball's projected lateral position (cutback-ready),
 * keeps the depth he holds, and never pursues against the flow. Lag/cutback
 * duties keep their landmark. Requests only: blocker, contact and World
 * decide what is achieved. */
const BACK_CHASE = process.env.BACK_CHASE === '1', CHASE_TRAIL = 1, CHASE_STEP = .3;
/** Experimental (SHED_PURSUE=1, off): once the runner a blocked defender sees
 * is past the line, he works off the block toward the ball wherever the ball
 * is, not only when it is within close range: the ball has left his gap and
 * everyone pursues. Only the decision to work off changes; the hand fight,
 * his feet and the blocker's body still decide whether he gets free. When
 * the rep ends because the runner has passed him, the same blocker cannot
 * re-latch him at once (the shed window); bodies still collide. */
const SHED_PURSUE = process.env.SHED_PURSUE === '1';
/** Experimental (RUN_LATERAL=1, off): in a run rep, lateral requests are
 * bounded by the body's own square lateral speed (vmax x shuffle, which the
 * World applies by facing), not by the pass-protection mirror trait that also
 * discounts agility. Zone linemen run the line with their hips open; the
 * World still decides what facing, traction and contact allow. */
const RUN_LATERAL = process.env.RUN_LATERAL === '1';
const runLateral = (a: Agent, trait: number) => RUN_LATERAL ? Math.max(trait, a.profile.vmax * a.profile.shuffle) : trait;
/** Experimental (RUN_HANDS=1, off): run blockers drive committed defenders off their body. */
const RUN_HANDS = process.env.RUN_HANDS === '1';
/** Experimental (DL_HANDS=1, off): a shedding defender in control of the hands works past with them. */
const DL_HANDS = process.env.DL_HANDS === '1';
/** Experimental (PASS_SINK=1, off): pass blockers sink their hips under a heavy load. */
const PASS_SINK = process.env.PASS_SINK === '1';
/** Experimental (DL_FIGHT=1, off): a defender driven sideways fights pressure. */
const DL_FIGHT = process.env.DL_FIGHT === '1';

/** Run release measured against the blocker's torso (LEVER_FACING=0: fixed frame). */
const LEVER_FACING = process.env.LEVER_FACING !== '0';

/** A run shed is a decision executed by the body (SHED_PHYSICAL=0: rolled outcome). */
const SHED_PHYSICAL = process.env.SHED_PHYSICAL !== '0';
/** Experimental (SHED_AWAY=1, off): once the carrying runner a blocked
 * defender sees is past the line and on the far side of him from his blocker,
 * there is no blocker's face to work across: he asks for his own pursuit
 * (his behavior's request) instead of the rep's work-off. Contact and the
 * hands still decide whether he gets away. */
const SHED_AWAY = process.env.SHED_AWAY === '1';

/** A defender working off a run block: until when, and toward which side of
 * the surface frame (the ball side when he decided). */
const runSheds = new WeakMap<Engagement, { until: number; side: number; runner?: boolean }>();

/** Run-blocker anchoring against a felt drive (RUN_ANCHOR=0 disables, for A/B). */
const ANCHOR = process.env.RUN_ANCHOR !== '0';

/** Test hook: a fixed move sequence for a rep (identical across arms). */
export const rushScripts = new WeakMap<Engagement, RushMove[]>();

export function updateEngagements(sim: PlaySim, intents: Intent[] = sim.intents): void {
  const t = sim.t;
  for (const e of [...sim.engagements]) {
    const b = e.blocker;
    const d = e.defender;
    if (b.isDown(t) || d.isDown(t)) {
      if (e.type === 'run') runContactObservers.get(sim)?.(e, 'end', { reason: 'body down' });
      sim.disengage(e);
      continue;
    }
    if (e.type === 'pass' && sim.throwAt >= 0 && t - sim.throwAt > 0.35) {
      sim.disengage(e);
      continue;
    }
    // Pass pro converts to run blocking once the QB hands off / scrambles.
    if (e.type === 'pass' && (!sim.isPass || (sim.carrier !== null && sim.carrier !== sim.qb) || sim.scrambled)) e.type = 'run';
    const c = sim.carrier;
    if (e.type === 'run' && c && c.team !== d.team) {
      const past = (sim.see(d, c).pos.x - d.pos.x) * sim.attackDir(c.team);
      if (past > 2.5 && t - e.start > 0.4) {
        runContactObservers.get(sim)?.(e, 'end', { reason: 'runner passed defender', past });
        sim.disengage(e);
        // SHED_PURSUE: he is off this block to pursue. The blocker's body can
        // still be in his way (World contact), but his hands cannot re-latch
        // the man on the next tick, the same window as a shed.
        if (SHED_PURSUE) b.shedBy.set(d, t + 0.6);
        continue;
      }
    }
    // Contact that has come apart (a bump, a spin away) ends the rep.
    const apart = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - (b.profile.radius + d.profile.radius);
    // An isolated run contact cannot steer through air beyond either full
    // arm. Preserve the existing pass and shared-helper contact lifecycle.
    const grace = e.type === 'run' && !e.helpers.length ? 0 : 0.35;
    if (apart > Math.max(traits(b).arm, traits(d).arm) / 36 + grace) {
      if (e.type === 'run') runContactObservers.get(sim)?.(e, 'end', { reason: 'separation', apart });
      sim.disengage(e);
      continue;
    }
    syncJoints(sim, e);
    e.baseB = baseOf(b);
    e.baseD = baseOf(d);
    if (e.type === 'pass') stepPassRep(sim, e, intents);
    else stepRunRep(sim, e, intents);
  }
}

function stepPassRep(sim: PlaySim, e: Engagement, intents: Intent[]): void {
  const t = sim.t;
  const dt = sim.dt;
  const rng = sim.rng;
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  const axis = axisOf(sim, e);
  const lat = latOf(axis);
  // Leverage is where the bodies are, relative to the QB, every tick.
  e.phi = measurePhi(axis, d, b);
  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);
  if (Math.abs(e.phi) >= 1) {
    if (tryHold(sim, e)) return;
    beat(sim, e, axis, lat, false, 'turned the corner');
    return;
  }
  if (b.body.support?.state !== 'up') b.tags.add('anchor-lost');

  // ---- moves at decision points
  if (t >= e.nextMoveAt) {
    const scripted = rushScripts.get(e);
    e.move = scripted?.length ? scripted.shift()! : t - e.start < 0.1 ? e.move : chooseMove(sim, e);
    resolveMove(sim, e, axis);
  }
  const inMove = t < e.moveUntil && e.moveOk;
  const stalled = t < e.moveUntil && !e.moveOk;
  e.pushBoost = Math.max(0, e.pushBoost - dt * 1.2);
  // Hand fight drifts toward the better hands; arm length keeps you off the body.
  e.control = clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);
  setHands(sim, e);

  const sep = b.profile.radius + d.profile.radius;
  const qb = sim.qb.pos;
  // ---- the rusher: to the QB, around the working side or through the man.
  const power = e.move === 'bull' || e.move === 'longarm';
  const bend = inMove && (e.move === 'speed' || e.move === 'dip' || e.move === 'rip');
  const turned = e.phi * e.side > 0.5;
  const corner = { x: b.pos.x + lat.x * e.side * (sep + 0.45) + axis.x * 0.35, y: b.pos.y + lat.y * e.side * (sep + 0.45) + axis.y * 0.35 };
  const aim = power || turned ? qb : corner;
  const toAim = norm(sub(aim, d.pos));
  const rush = d.profile.vmax * (power ? 0.55 : 0.8 + 0.15 * td.bend) * (stalled ? 0.6 : 1);
  intents[d.idx] = {
    vel: { x: toAim.x * rush, y: toAim.y * rush },
    facing: Math.atan2(qb.y - d.pos.y, qb.x - d.pos.x),
    push: power ? 1 : inMove ? 0.35 : 0.75,
    posture: bend ? 0.95 : 0.75,
    cutSkill: 0.8 + 0.5 * td.bend,
  };

  // ---- the blocker: stay between him and the QB, give ground to set depth,
  // then anchor. Mirror with the feet; the hands steer what they control.
  const front = { x: d.pos.x + axis.x * (sep + 0.15), y: d.pos.y + axis.y * (sep + 0.15) };
  const intent = b.passSet;
  if (intent && intent.outside !== 0 && (d.pos.y - b.pos.y) * intent.outside > 0.15) {
    // Work an outside rush wide of the launch lane.
    front.y += clamp((intent.laneY - front.y) * 0.5, -0.4, 0.4);
  }
  const lead = 0.15 + 0.15 * tb.read;
  const offLat = (front.x + d.vel.x * lead - b.pos.x) * lat.x + (front.y + d.vel.y * lead - b.pos.y) * lat.y;
  const dLat = d.vel.x * lat.x + d.vel.y * lat.y;
  const mirror = tb.lateral * (0.75 + 0.35 * tb.feet) * (e.helpers.length ? 1.3 : 1);
  const vLat = clamp(dLat + felt(e, lat) * (0.6 + 0.6 * tb.feet) + offLat * (3 + 3 * tb.feet), -mirror, mirror);
  const depth = sim.los - b.pos.x;
  const setDepth = b.passSet?.depth ?? passSetDepth(sim, b);
  const kick = depth < setDepth ? Math.min(b.profile.vmax * b.profile.backpedal * (0.75 + 0.25 * tb.feet), (setDepth - depth) / 0.55) : 0;
  // PASS_SINK (experimental, off): under a heavy load he sinks his hips
  // rather than leaning his chest over his feet: a lower centre of mass
  // carries the same push with less forward lean (more balance margin), at
  // the gait's cost of a lower pad level.
  const feltLoad = b.body.support?.felt;
  const heavy = !!feltLoad && Math.hypot(feltLoad.x, feltLoad.y) > 0.3 * b.profile.massKg * G;
  intents[b.idx] = {
    vel: { x: lat.x * vLat - kick, y: lat.y * vLat },
    facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x),
    push: 1,
    posture: PASS_SINK && heavy ? 0.95 : 0.6,
    cutSkill: 0.85 + 0.3 * tb.feet,
  };
  helperIntents(sim, e, intents, axis);
}

/** The installed fit survives contact. Body/contact geometry is felt locally;
 * the runner's location is a delayed picture, never the offensive call.
 * This shares the free-fit declaration boundary, not a new strength rule.
 * Ball-holder identity remains the engine's existing public interface; this
 * does not claim a complete model of seeing possession through congestion.
 */
interface RunStackRead {
  owner: Agent;
  fit: string;
  depth: number;
  shoulder: number;
  nextRead: number;
  flow: number;
  contacted: boolean;
  /** DL_FIGHT: the lateral point he holds while driven sideways, and until when. */
  hold?: { y: number; until: number };
}
const runStacks = new WeakMap<Engagement, RunStackRead>();
const runTargets = new WeakMap<Engagement, { aim: Vec2; runner: boolean; flow?: number }>();

function runContactRead(sim: PlaySim, e: Engagement) {
  const d = e.defender, b = e.blocker, job = d.runFit;
  const back = sim.slot('RB');
  let backPicture: ReturnType<PlaySim['see']> | null = null;
  let acquired: { target: Agent; cue: ReturnType<PlaySim['see']> } | null = null;
  if (job?.kind !== 'interior' && job?.kind !== 'edge') {
    // Contact support looks into the installed backfield. A new work-off
    // decision cannot learn a give/keep from the hidden live holder identity.
    const qbPicture = sim.see(d, sim.qb);
    backPicture = back ? sim.see(d, back) : null;
    if (qbPicture.carrying === true && backPicture?.carrying !== true)
      acquired = { target: sim.qb, cue: qbPicture };
    else if (back && backPicture?.carrying === true && qbPicture.carrying !== true)
      acquired = { target: back, cue: backPicture };
  }
  const carrier = acquired?.target ?? sim.carrier;
  const enemy = carrier && carrier.team !== d.team ? carrier : null;
  const carrierCue = acquired?.cue ?? (enemy ? sim.see(d, enemy) : null);
  // Read through the mesh instead of working toward a stationary QB. This
  // uses only the observed depth; a QB draw/scramble can declare at the surface.
  const meshBack = !!(enemy === sim.qb && carrierCue && carrierCue.pos.x < sim.los - 1.6 && back);
  const runnerCue = meshBack ? backPicture ?? sim.see(d, back!) : carrierCue;
  const advanced = !!(enemy && carrierCue &&
    (carrierCue.pos.x - sim.los) * sim.attackDir(enemy.team) > 2);
  const reading = d.recog?.read === 'run' || advanced;
  const declared = !!(reading && runnerCue && runnerCue.pos.x > sim.los - 1.6);
  const edge = job?.kind === 'edge' || job?.kind === 'force';
  const fit = job ? `${job.kind}:${job.gap}:${job.side}:${job.edge}:${job.technique}` : 'unassigned';
  let stack: RunStackRead | undefined;
  let blockerY = b.pos.y;
  // Narrow installation: first-level gap/edge fits. Stalked support players,
  // inserts and unassigned pass-converted contacts retain their old policy.
  if (job && (job.kind === 'interior' || job.kind === 'edge')) {
    stack = runStacks.get(e);
    const picture = sim.see(d, b);
    const touch = !!(e.hands?.normalForce || e.hands?.tangentForce);
    const local = touch ? b.pos : picture.pos;
    blockerY = local.y;
    // A contact episode remembers our own depth, not a displacement allowance.
    // Keeper promotion changes the opponent picture, not the point we defend.
    if (!stack || stack.owner !== b || stack.fit !== fit) {
      const sep = b.profile.radius + d.profile.radius;
      stack = { owner: b, fit, depth: stack?.depth ?? d.pos.x,
        shoulder: edge ? job.side * (job.edge === 'spill' ? -.45 : .65)
          : clamp(liveGapY(sim, d, job.gap, job.side) - local.y, -sep * .65, sep * .65),
        nextRead: -Infinity, flow: 0, contacted: stack?.contacted ?? false };
      runStacks.set(e, stack);
    }
    // Reaching is not touching. Only the first transmitted hand load installs
    // the useful contact depth; a keeper change cannot move that memory back.
    if (touch && !stack.contacted) {
      stack.depth = d.pos.x;
      stack.contacted = true;
    }
    // Motion is a personally acquired cue held for an ordinary decision beat.
    // Touch supplies local position/load, never the OL's private drive.
    // DL_FEEL: with hands on, the blocker's motion is felt through the
    // contact every tick, like his position; the visual sample stays for
    // the held decision beat otherwise.
    if (DL_FEEL && touch) stack.flow = b.vel.y;
    if (sim.t >= stack.nextRead) {
      if (!(DL_FEEL && touch)) stack.flow = picture.vel.y;
      if (!edge && job.technique === 'lag' && reading && Math.abs(stack.flow) > .8)
        stack.shoulder = -Math.sign(stack.flow) * (b.profile.radius + d.profile.radius) * .65;
      stack.nextRead = sim.t + d.mind.decisionInterval;
    }
  }
  // Preserve the box/spill shoulder until the runner is beyond the surface,
  // just as the free fit does. The touching blocker's position is haptic.
  const y = stack ? blockerY + stack.shoulder : job ? edge
    ? b.pos.y + job.side * (job.edge === 'spill' ? -.45 : .65)
    : gapY(sim.offAlign, job.gap, job.side) : b.pos.y;
  let desired = { x: d.pos.x, y };
  if (declared && (!edge || advanced)) desired = { ...runnerCue!.pos };
  else if (!job && runnerCue && reading) desired = { ...runnerCue.pos };
  let flow: number | undefined;
  if (stack && job!.kind === 'interior' && job!.technique !== 'lag' && d.recog?.read === 'run' && back) {
    // The runner has left this first-level fit laterally. Work along the
    // line with inside-out leverage instead of recentering on an obsolete
    // blocker shoulder. Possession comes from acquired backfield pictures;
    // the live holder, offensive call and private blocker work are not keys.
    const qbSeen = sim.see(d, sim.qb), backSeen = backPicture ?? sim.see(d, back);
    const horizon = 2 * d.mind.decisionInterval;
    const fresh = (age: number | undefined) => age !== undefined && Number.isFinite(age)
      && age >= 0 && age <= d.profile.reactionTime + horizon;
    const trail = d.profile.radius + back.profile.radius + d.profile.reach * .65;
    const side = Math.sign(backSeen.vel.y);
    if (backSeen.carrying === true && qbSeen.carrying === false
      && fresh(backSeen.age) && fresh(qbSeen.age) && Math.abs(backSeen.vel.y) > 1.5
      && backSeen.pos.x <= sim.los - 1.6
      && (backSeen.pos.y - d.pos.y) * side > trail) {
      // The movement planner advances this held point with `flow` once.
      desired = { x: d.pos.x, y: backSeen.pos.y - side * trail };
      flow = backSeen.vel.y;
    }
  }
  let chasing = false;
  if (BACK_CHASE && flow === undefined && stack && job!.technique !== 'lag' && reading && runnerCue && !declared) {
    // The ball's flow from the runner he sees. A back's first step from his
    // alignment shows it before it is fast; a QB keeper needs real speed.
    const isBack = meshBack || (!!back && enemy === back);
    const home = isBack ? sim.offAlign.spots[back!.slot]?.pos : undefined;
    const step = home ? runnerCue.pos.y - home.y : 0;
    const f = Math.abs(runnerCue.vel.y) > 1.5 ? Math.sign(runnerCue.vel.y) : Math.abs(step) > CHASE_STEP ? Math.sign(step) : 0;
    if (f && (d.pos.y - runnerCue.pos.y) * f < -CHASE_TRAIL) {
      const trail = runnerCue.pos.y + runnerCue.vel.y * 2 * d.mind.decisionInterval - f * CHASE_TRAIL;
      if ((trail - desired.y) * f > 0) { desired = { x: d.pos.x, y: trail }; chasing = true; }
    }
  }
  const aim = d.mind.aim(stack ? `run-contact:${b.idx}:${fit}` : `run-contact:${b.idx}`, desired, sim.t);
  // The selected target mode belongs to the same held decision as its aim.
  // A newly seen declaration cannot drop flow feedforward midway through it.
  // Support contacts hold the selected target mode too. A safety's acquired
  // runner aim must not keep being treated as an undeclared force landmark.
  if (runTargets.get(e)?.aim !== aim)
    runTargets.set(e, { aim, runner: flow === undefined && declared && (!edge || advanced), flow });
  // A close observed back can threaten a penetrating lineman deep behind
  // the surface; shedding must not wait for the free-fit declaration depth.
  // A standing deep QB is still a mesh key, not a run target. An observed
  // advanced carrier supplies urgency even after an original pass read.
  const threat = reading && carrierCue &&
    (enemy !== sim.qb || carrierCue.pos.x > sim.los - 1.6) ? carrierCue : null;
  return { aim, reading, threat, declared: runTargets.get(e)!.runner,
    flow: runTargets.get(e)!.flow, stack, acquiredBackfield: !!acquired, chasing };
}

/** RUN_HANDS (experimental, off; needs HAND_MOTOR=1 to act): a blocker who
 * controls the hands pushes a defender further the way he has committed when
 * that way takes him off the blocker's body: running wide of him (drag hand)
 * or ducking inside him (slingshot). A man working across the blocker's face
 * is only braked (passive steer). Felt through the hands: relative motion at
 * the contact, not a picture of the play. */
function runHandDrive(sim: PlaySim, e: Engagement): void {
  const j = e.hands;
  if (!j) return;
  j.drive = 0;
  if (e.control < 0 || j.actor !== e.blocker.body) return;
  const b = e.blocker, d = e.defender;
  // Arms spent sideways are not holding a man out of the backfield: while
  // he feels himself driven back he keeps them on stopping him.
  const felt = b.body.support?.felt, up = sim.attackDir(b.team);
  if (felt && -felt.x * up > 0.25 * b.profile.massKg * G) return;
  const other = j.b === d.body ? d : b, self = other === d ? b : d;
  const dx = other.pos.x - self.pos.x, dy = other.pos.y - self.pos.y, L = Math.hypot(dx, dy) || 1;
  const tx = -dy / L, ty = dx / L;
  const vt = (other.vel.x - self.vel.x) * tx + (other.vel.y - self.vel.y) * ty;
  if (Math.abs(vt) < 0.5) return;
  // Which side of the blocker's chest the defender is on, and whether his
  // relative motion takes him further to that side.
  const right = { x: Math.sin(b.facing), y: -Math.cos(b.facing) };
  const off = (d.pos.x - b.pos.x) * right.x + (d.pos.y - b.pos.y) * right.y;
  const dTan = other === d ? vt : -vt;
  const moving = dTan * (tx * right.x + ty * right.y);
  if (Math.abs(off) < 0.05 || off * moving <= 0) return;
  // Only a man committed across the blocker: one driving straight through
  // him is fought with the feet and chest, not helped past a shoulder.
  // His own motion decides it, not the blocker's step.
  const along = d.vel.x * Math.cos(b.facing) + d.vel.y * Math.sin(b.facing);
  if (Math.abs(along) > Math.abs(d.vel.x * right.x + d.vel.y * right.y)) return;
  j.drive = Math.sign(vt) * Math.min(3, Math.abs(vt) + 1);
}

/** Experimental (HAND_FIGHT=1, off): the run hand fight from bodies, not a ratings walk. */
const HAND_FIGHT = process.env.HAND_FIGHT === '1';

/** Upper-body leverage a player brings to the hand fight now: his balance
 * margin (support availability), how square he is to the man, his pad level
 * and his arm strength after fatigue. Ratings enter only through the body. */
function handLeverage(a: Agent, other: Agent): number {
  const sup = a.body.support;
  if (!sup || sup.state !== 'up') return 0;
  const sp = supportParams(a.profile), fat = fatigueFactor(a.body.energy);
  const toO = Math.atan2(other.pos.y - a.pos.y, other.pos.x - a.pos.x);
  const off = Math.abs(Math.atan2(Math.sin(toO - a.facing), Math.cos(toO - a.facing)));
  return availability(sup, sp, fat) * Math.max(0, Math.cos(off)) * (0.75 + 0.5 * sup.posture) * sp.armForce * fat;
}

/** Who lands hands first: arm reach against the closing gap, then a punch
 * whose speed and timing spread come from hand skill. Blockers know the count. */
function firstHands(b: Agent, d: Agent, tb: TrenchTraits, td: TrenchTraits, rng: PlaySim['rng']): number {
  const sep = b.profile.radius + d.profile.radius;
  const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, dist = Math.hypot(dx, dy) || 1;
  const closing = Math.max(0.5, ((b.vel.x - d.vel.x) * dx + (b.vel.y - d.vel.y) * dy) / dist);
  const land = (t: TrenchTraits) => (dist - (sep + t.arm / 36 * 0.3)) / closing
    + 0.1 / (0.7 + 0.6 * t.hands) + rng.normal(0, 0.03 * (1.2 - t.hands));
  return clamp((land(td) - (land(tb) - 0.02)) / 0.08, -0.8, 0.8);
}

/** Control relaxes toward the share of upper-body leverage each side has now,
 * at a rate set by the gaining player's hand skill (how fast he re-fits). */
function handFight(e: Engagement, tb: TrenchTraits, td: TrenchTraits, dt: number, rng: PlaySim['rng']): number {
  const lb = handLeverage(e.blocker, e.defender), ld = handLeverage(e.defender, e.blocker);
  const target = lb + ld > 1e-9 ? (lb - ld) / (lb + ld) : 0;
  const tau = 0.25 + 0.5 * (1 - (target > e.control ? tb.hands : td.hands));
  return clamp(e.control + (target - e.control) * (1 - Math.exp(-dt / tau)) + rng.normal(0, 0.25) * dt, -1, 1);
}

function stepRunRep(sim: PlaySim, e: Engagement, intents: Intent[]): void {
  const t = sim.t;
  const dt = sim.dt;
  const rng = sim.rng;
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b, e.type);
  const td = traits(d, e.type);
  const axis = axisOf(sim, e); // defender toward the intended contact surface
  const lat = latOf(axis);
  const read = runContactRead(sim, e);
  const supportRunner = SHED_PHYSICAL && !read.stack && read.acquiredBackfield
    && read.declared && read.threat?.carrying === true;
  e.phi = measurePhi(axis, d, b);
  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);

  // The defender keeps the called fit/shoulder and can answer a declared
  // runner at his next decision. The blocker still seeks his seal surface.
  const toAim = sub(read.aim, d.pos);
  const preferred = toAim.x * lat.x + toAim.y * lat.y;
  if (Math.abs(preferred) > .1) e.side = Math.sign(preferred);
  e.control = HAND_FIGHT ? handFight(e, tb, td, dt, rng)
    : clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);
  advanceRunHelperHands(sim, e);

  // Shed attempts once the ball carrier threatens his area — not the QB
  // standing at the mesh before the handoff.
  if (read.threat) {
    const dc = Math.hypot(read.threat.pos.x - d.pos.x, read.threat.pos.y - d.pos.y);
    // A support player who has personally declared the carrying runner must
    // work free toward him even when the block keeps him outside close range.
    // First-level stack/shoulder and uncertain possession retain the old gate.
    const pursue = SHED_PURSUE && read.threat.carrying === true
      && (read.threat.pos.x - sim.los) * sim.attackDir(b.team) > 0;
    // #169: acquiring hands does not restart already justified support.
    const ready = t >= e.nextMoveAt || (supportRunner && !runSheds.has(e));
    if (ready && (dc < 3.5 || supportRunner || pursue)) {
      // Shedding toward the ball is hard if the blocker has sealed you away from it.
      const toBall = sub(read.threat.pos, d.pos);
      const ballSide = Math.sign(toBall.x * lat.x + toBall.y * lat.y);
      if (SHED_PHYSICAL) {
        // He decides to get off the block toward the ball he sees. Whether he
        // does is physical: the hand fight (who controls the hands), his feet
        // and the blocker's body decide it through the release geometry
        // below, not a roll.
        // Once his blocker is behind the already selected runner approach,
        // continuing across the old surface is no longer the exit objective.
        // Loaded hands supply the local body position; an extended, unloaded
        // reach supplies only this observer's acquired blocker picture.
        let runner = false;
        if (supportRunner) {
          const loaded = Math.hypot(e.hands?.normalForce ?? 0, e.hands?.tangentForce ?? 0) > 0;
          const blocker = loaded ? b.pos : sim.see(d, b).pos;
          if ((blocker.x - d.pos.x) * toAim.x + (blocker.y - d.pos.y) * toAim.y < 0)
            runner = true;
        }
        runSheds.set(e, { until: t + d.mind.decisionInterval * 2, side: ballSide || e.side, runner });
        e.nextMoveAt = t + d.mind.decisionInterval * 2;
        d.tags.add('shed-attempt');
      } else {
        const sealed = -e.phi * ballSide; // >0: blocker is between you and the ball laterally
        const skill = 0.6 * d.r('blockShedding') + 0.4 * d.r('strength');
        const sustain = 0.5 * b.r('runBlock') + 0.3 * tb.hands + 0.2 * b.r('strength');
        const p = logistic(-2.0 + 3.4 * (skill - sustain) - 1.2 * e.control - 1.3 * sealed + (d.profile.massKg - b.profile.massKg) / 120 - (e.helpers.length ? 1.2 : 0) + (1 - e.baseB) * 1.5);
        if (rng.chance(p)) {
          if (!tryHold(sim, e)) beat(sim, e, axis, lat, true, 'shed');
          return;
        }
        e.control = Math.min(1, e.control + 0.2);
        e.nextMoveAt = t + 0.4 + rng.range(0, 0.3);
      }
    }
  }
  const shed = runSheds.get(e);
  const shedding = !!shed && t < shed.until;
  // A blocker's hands and chest work in front of him: he loses the man when
  // the defender is behind his shoulders relative to where his torso actually
  // faces (World limits how fast he can turn). Running alongside a reached
  // defender is not a lost block. LEVER_FACING=0 restores the fixed frame.
  // He can still bring his chest back to the man within this step, at his
  // own turn rate; only an angle beyond that is a lost block.
  const toD = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x);
  const off = Math.abs(Math.atan2(Math.sin(toD - b.facing), Math.cos(toD - b.facing)));
  const behind = LEVER_FACING ? Math.max(0, off - b.profile.turnRate * dt) / (Math.PI / 2) : Math.abs(e.phi);
  runContactObservers.get(sim)?.(e, 'geometry', { axis, lat, drive: e.drive, phi: e.phi,
    off, behind, support: b.body.support, facing: b.facing, toD, baseB: e.baseB, baseD: e.baseD });
  if (b.body.support?.state !== 'up' || behind >= 1.1) {
    if (!tryHold(sim, e)) beat(sim, e, axis, lat, true, b.body.support?.state !== 'up' ? 'blocker off his feet' : 'leverage');
    return;
  }
  setHands(sim, e);
  if (e.hands && (RUN_HANDS || DL_HANDS)) e.hands.drive = 0;
  if (RUN_HANDS) runHandDrive(sim, e);
  // DL_HANDS (experimental, off; needs HAND_MOTOR=1): a defender who controls
  // the hands while getting off toward the ball works himself past the
  // blocker's ball-side shoulder with them (rip, push-pull), not only his feet.
  if (DL_HANDS && shedding && e.hands && e.control < 0 && e.hands.actor === d.body) {
    const j = e.hands, self = j.a === b.body ? b : d, other = self === b ? d : b;
    const L = Math.hypot(other.pos.x - self.pos.x, other.pos.y - self.pos.y) || 1;
    const tx = -(other.pos.y - self.pos.y) / L, ty = (other.pos.x - self.pos.x) / L;
    // Wanted motion of the defender toward the ball side, as motion of b past a.
    const want = (lat.x * tx + lat.y * ty) * shed!.side * (other === d ? 1 : -1);
    j.drive = Math.sign(want) * 2;
  }
  // Feet request displacement along the drive line; contact geometry and the
  // lateral fit use the surface frame. These can differ in a stretch-zone rep.
  // Actual hand normal, ground traction and work remain physical constraints.
  const drive = e.drive ?? { x: -axis.x, y: -axis.y };
  const sep = b.profile.radius + d.profile.radius;
  // DOWN_SEAL: a gap down block reads his man from his own picture and keeps
  // him out of the hole: he answers motion toward the hole and works to the
  // man's hole side, but does not chase motion away from it (the motion his
  // own push makes). hole: the hole's side along lat, or 0.
  const hole = DOWN_SEAL ? downBlockHoleSide(sim, e, lat) : 0;
  const dVel = hole ? sim.see(b, d).vel : d.vel;
  const dLat = dVel.x * lat.x + dVel.y * lat.y;
  // Seal target as a lateral offset of the blocker from the defender, where
  // the defender is heading in a beat.
  const lead = 0.15 + 0.15 * tb.read;
  const offset = (b.pos.x - d.pos.x - dVel.x * lead) * lat.x + (b.pos.y - d.pos.y - dVel.y * lead) * lat.y;
  const wantOffset = hole ? hole * Math.sin(DOWN_SEAL_TARGET * Math.PI / 2) * sep : -Math.sin(e.sealTarget * Math.PI / 2) * sep;
  const mirror = runLateral(b, tb.lateral * (0.75 + 0.35 * tb.feet)) * (e.helpers.length ? 1.3 : 1);
  const feltCue = felt(e, lat), feedback = feltCue * (0.6 + 0.6 * tb.feet);
  const correction = (wantOffset - offset) * (3 + 3 * tb.feet);
  const follow = hole ? hole * Math.max(0, dLat * hole) : dLat;
  const seal = clamp(follow + feedback + correction, -mirror, mirror);
  // Anchor against felt lost depth. A stretch keeps its shoulder footwork;
  // drive blocks reduce it. Locomotion and lean share one physical budget.
  // On a stretch play the reach is a race for the playside shoulder, not a
  // vertical drive: forward work only keeps him connected (matches the
  // defender's own forward motion and closes separation), leaving the shared
  // traction budget to the lateral race. Drive blocks keep their downhill drive.
  const run = sim.offCall.run;
  const stretch = STRETCH_REACH && !!e.surfaceAxis && (run?.scheme === 'outsideZone' || run?.scheme === 'wideZone');
  const along = (v: Vec2) => v.x * drive.x + v.y * drive.y;
  const closingDirection = RUN_CONTACT_COMPONENTS ? contactMotion(drive, lat, 1, 0) : drive;
  const gap = connectionGap({ x: d.pos.x - b.pos.x, y: d.pos.y - b.pos.y }, sep, closingDirection);
  let forward = stretch ? clamp(along(d.vel) + gap * 3, -1, 2.4) : 2.4;
  if (!stretch) {
    // Full drive assumes the man is ahead on the installed drive line.
    // Once level or past, carry the existing connection instead of running
    // away from it. Seal work, anchoring and World still govern the rep.
    const ahead = (d.pos.x - b.pos.x) * drive.x + (d.pos.y - b.pos.y) * drive.y;
    const w = clamp(ahead / (0.5 * sep), 0, 1);
    forward = w * 2.4 + (1 - w) * clamp(along(d.vel) + gap * 3, -1, 2.4);
  }
  // A stretch never fights the flow: ahead of the man, he does not step back
  // to a fixed seal offset; he at least matches the defender's play-side
  // speed (beat him to the shoulder, or run him past the hole).
  let lateral = seal;
  const contactTrack = RUN_CONTACT_TRACK && stretch ? b.behavior.contactMotion?.(b) : null;
  const runoffWork = RUN_CONTACT_COMPONENTS && stretch ? b.behavior.contactMotion?.(b, 'runoff') : null;
  if (stretch && run) {
    const toPlay = lat.y * (run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign);
    if (Math.abs(toPlay) > .5) {
      lateral = Math.max(seal * toPlay, dLat * toPlay) * toPlay;
      if (contactTrack) {
        const track = contactTrack.x * lat.x + contactTrack.y * lat.y;
        lateral = Math.max(lateral * toPlay, Math.min(mirror, track * toPlay)) * toPlay;
      }
      if (runoffWork) {
        // The component frame removes the drive's tangent to avoid double
        // counting. Keep the chosen solo-runoff work explicitly, rather than
        // reducing it to defender co-flow after the shoulder offset settles.
        // Project once, retain the existing bound, and let spacing/body/contact
        // execution decide which movement and protection can be achieved.
        const side = Math.sign(toPlay), work = runoffWork.x * lat.x + runoffWork.y * lat.y;
        lateral = Math.max(lateral * side, Math.min(mirror, work * side)) * side;
      }
    }
  }
  let blockVel: Vec2;
  if (RUN_CONTACT_COMPONENTS && stretch) {
    // Follow motion across the contact surface in that same normal frame.
    // Projecting the defender onto a diagonal drive aliases shoulder flow
    // into depth work, then attenuates true normal motion a second time.
    // Keep the existing projected closure and bounds: a tangential drive
    // earns no extra normal request, and no angle division is needed.
    const driveNormal = -(drive.x * axis.x + drive.y * axis.y);
    const defenderNormal = -(d.vel.x * axis.x + d.vel.y * axis.y);
    const normal = clamp(defenderNormal + driveNormal * gap * 3,
      Math.min(-driveNormal, 2.4 * driveNormal), Math.max(-driveNormal, 2.4 * driveNormal));
    blockVel = { x: -axis.x * normal + lat.x * lateral, y: -axis.y * normal + lat.y * lateral };
  } else blockVel = { x: drive.x * forward + lat.x * lateral, y: drive.y * forward + lat.y * lateral };
  if (STRETCH_FLAT && stretch && blockVel.x * sim.attackDir(b.team) < 0) blockVel = { x: 0, y: blockVel.y };
  const preAnchor = blockVel;
  let anchored = false;
  // Anchor against the normal threat only (lost depth), and keep the
  // lateral work otherwise (a
  // defender's flow is not a reason to stop working sideways). ANCHOR_SPLIT=0
  // restores bracing along the whole felt load with the seal cut to 30%.
  const feltLoad = b.body.support?.felt;
  if (ANCHOR && feltLoad) {
    const load = Math.hypot(feltLoad.x, feltLoad.y);
    if (ANCHOR_SPLIT) {
      // The normal threat is lost depth: load and motion toward his own
      // backfield. Then he braces upfield. A stretch retains its shoulder
      // work; a vertical drive reduces it. Both spend the same World budget.
      // Flowing across him without lost depth is lateral co-flow.
      const up = sim.attackDir(b.team);
      const backLoad = -feltLoad.x * up, drivenBack = -b.vel.x * up;
      if (backLoad > 0.25 * b.profile.massKg * G && drivenBack > 0.15) {
        anchored = true;
        const shoulderWork = lateral * (stretch ? 1 : 0.3);
        blockVel = { x: up * 2.4 + lat.x * shoulderWork, y: lat.y * shoulderWork };
      }
    } else {
      const driven = load > 1e-6 ? (b.vel.x * feltLoad.x + b.vel.y * feltLoad.y) / load : 0;
      if (load > 0.25 * b.profile.massKg * G && driven > 0.15) {
        anchored = true;
        const ux = -feltLoad.x / load, uy = -feltLoad.y / load;
        blockVel = { x: ux * 2.4 + lat.x * seal * 0.3, y: uy * 2.4 + lat.y * seal * 0.3 };
      }
    }
  }
  intents[b.idx] = {
    vel: blockVel,
    facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x),
    push: 1,
    posture: 0.85,
    cutSkill: 0.8 + 0.3 * tb.feet,
  };
  runContactObservers.get(sim)?.(e, 'movement', { axis, lat, drive, stretch, forward,
    // `forward` is retained for older diagnostic readers. Component-mode
    // normal work is the emitted command, not that legacy drive projection.
    legacyDriveRequest: forward, normalRequest: -(blockVel.x * axis.x + blockVel.y * axis.y),
    dLat, feltCue, feedback, correction, mirror, offset, wantOffset, seal,
    sealWithoutFeel: clamp(dLat + correction, -mirror, mirror), contactTrack, runoffWork, lateral, preAnchor,
    anchored, command: intents[b.idx], blockerPos: b.pos, defenderPos: d.pos,
    blockerVel: b.vel, defenderVel: d.vel, facing: b.facing, support: b.body.support,
    defensiveAim: read.aim, reading: read.reading, declared: read.declared,
    heldFlow: read.stack?.flow, heldTargetFlow: read.flow, fit: d.runFit });
  // Follow acquired flow while preserving the chosen shoulder. Control/lag
  // replace feet toward their remembered contact depth; attack retains useful
  // forward intent. These are finite requests, not stronger ground support.
  // A declared runner can redirect the fit on the existing decision cadence.
  const work = td.lateral * (0.2 + 0.25 * d.r('blockShedding')) * (read.reading ? 1 : 0.3);
  const legacy = { x: -drive.x * 1.5 + lat.x * e.side * work, y: -drive.y * 1.5 + lat.y * e.side * work };
  // DL_FLATTEN: against a reach or zone step (the blocker's held flow across
  // his face) an attacking lineman flattens on the line instead of driving on.
  // He sees the man on him step across rather than come at him.
  const blockerSeen = DL_FLATTEN && d.runFit?.technique === 'attack' ? sim.see(d, b) : null;
  const zoneStep = !!blockerSeen && Math.abs(blockerSeen.vel.y) > 1
    && Math.abs(blockerSeen.vel.y) > Math.abs(blockerSeen.vel.x);
  const recover = d.runFit?.technique !== 'attack' || read.chasing || zoneStep;
  const depth = read.declared ? clamp((read.aim.x - d.pos.x) * 3, -1.5, 1.5)
    : read.stack && recover ? clamp((read.stack.depth - d.pos.x) * 3, -1.5, 1.5)
      : -sim.attackDir(b.team) * 1.5;
  // Keep the shoulder where it will need to be: the held flow cue carries it
  // forward over a short horizon, and the request is planned with his own
  // acceleration (the law the zone blockers plan with), so a lineman who is
  // being reached works laterally to keep his gap instead of lagging it.
  // DL_FLOW=0 restores the proportional follow.
  const held = read.declared || read.chasing ? 0 : read.flow ?? read.stack?.flow ?? 0, horizon = 2 * d.mind.decisionInterval;
  const flow = clamp(DL_FLOW
    ? requestToCover(gaitLag(d.profile), read.aim.y + held * horizon - d.pos.y, horizon, d.vel.y)
    : held + (read.aim.y - d.pos.y) * 3, -runLateral(d, td.lateral), runLateral(d, td.lateral));
  // DL_FIGHT (experimental, off): fight pressure with pressure. A defender
  // who feels himself driven sideways holds the point where the push began
  // and leans into it, instead of following the blocker's flow off his gap.
  // The lateral twin of the blocker's lost-depth anchor; the decision is held
  // for a decision beat, then renewed while the push lasts.
  let lateralFlow = flow;
  if (DL_FIGHT && read.stack && !read.declared) {
    const st = read.stack, push = d.body.support?.felt?.y ?? 0;
    // A push toward where he sees the ball heading (a reach running him
    // wide) costs him nothing; one driving him away from it (a down block,
    // a seal) washes him out of the play. He reads the back he can see.
    const carrier = sim.carrier && sim.carrier.team !== d.team ? sim.carrier : null;
    const back = sim.slot('RB');
    const ball = carrier && carrier === sim.qb && sim.handoffAt < 0 && back ? back : carrier;
    const cue = ball ? sim.see(d, ball) : null;
    const toBall = cue ? cue.pos.y + cue.vel.y * d.mind.decisionInterval - d.pos.y : 0;
    const away = Math.abs(toBall) > .5 && push * toBall < 0;
    if (away && Math.abs(push) > 0.25 * d.profile.massKg * G && push * d.vel.y > 0 && Math.abs(d.vel.y) > 0.15) {
      st.hold = { y: st.hold && t < st.hold.until ? st.hold.y : d.pos.y, until: t + d.mind.decisionInterval };
    }
    // Only when his ordinary request would go with the push: working across
    // a reach to keep leverage already fights it.
    if (st.hold && t < st.hold.until) {
      if (flow * push > 0) {
        lateralFlow = clamp(requestToCover(gaitLag(d.profile), st.hold.y - d.pos.y, horizon, d.vel.y), -td.lateral, td.lateral);
        d.tags.add('fight-pressure');
      }
    } else delete st.hold;
  }
  // Working off: across the blocker's ball-side shoulder at full lateral
  // effort, pressing into him rather than backing out.
  // The contact technique does not own a second, older runner waypoint.
  // Follow the existing read's held objective as it legitimately refreshes;
  // lost/contradictory acquisition retains the ordinary across-face response.
  const exitAim = shedding && shed!.runner && supportRunner ? read.aim : undefined;
  const exit = exitAim ? norm(sub(exitAim, d.pos)) : null;
  const workOff = shedding ? exit
    ? { x: exit.x * Math.hypot(td.lateral, .6), y: exit.y * Math.hypot(td.lateral, .6) }
    : { x: lat.x * shed!.side * td.lateral + axis.x * .6, y: lat.y * shed!.side * td.lateral + axis.y * .6 } : null;
  // Diagnostic counterfactual defenses (docs/reviews/counterfactual-defense.md).
  let cf: Vec2 | null = null;
  if (CF_FLOW && !read.declared) {
    const home = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.pos.y ?? d.pos.y;
    const f = lineFlow(linePicture(sim, d)), dir = Math.abs(f) > .5 ? Math.sign(f) : 0;
    const y = CF_FLOW === 'over' && dir ? dir * td.lateral
      : clamp(requestToCover(gaitLag(d.profile), home - d.pos.y, horizon, d.vel.y), -td.lateral, td.lateral);
    cf = { x: depth, y };
  }
  // The behavior's own request is still in place before the rep sets it.
  const own = SHED_AWAY ? intents[d.idx]?.vel : undefined;
  if (own && read.threat?.carrying === true && (read.threat.pos.x - sim.los) * sim.attackDir(b.team) > 0
    && Math.hypot(own.x, own.y) > 1) {
    const toR = Math.atan2(read.threat.pos.y - d.pos.y, read.threat.pos.x - d.pos.x);
    const toB = Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x);
    if (Math.abs(Math.atan2(Math.sin(toR - toB), Math.cos(toR - toB))) > Math.PI / 2) {
      d.tags.add('shed-away');
      helperIntents(sim, e, intents, axis);
      return;
    }
  }
  intents[d.idx] = {
    vel: workOff ?? cf ?? (read.stack ? { x: depth, y: lateralFlow } : legacy),
    facing: Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x),
    push: 1,
    posture: DL_ANCHOR && (e.helpers.length > 0 || drivenBack(d)) ? 1 : 0.85,
    cutSkill: 0.8 + 0.4 * td.bend,
  };
  runContactObservers.get(sim)?.(e, 'defender-movement', { reading: read.reading,
    declared: read.declared, supportRunner, defensiveAim: read.aim,
    exitAim, workOff, command: intents[d.idx] });
  helperIntents(sim, e, intents, axis);
}

interface HelperFitRead {
  rep: Engagement;
  owner: Agent;
  side: number;
  nextRead: number;
  recovery: boolean;
  goal: Vec2;
  defender: Vec2;
}
const helperFits = new WeakMap<Agent, HelperFitRead>();

/** A joined helper cannot drive through the defender to replace his feet.
 * Retain one personally observed foot landmark for the ordinary decision
 * beat. The acquired surface is known work; the two bodies are delayed visual
 * pictures. This requests movement only, leaving actual hands/support intact.
 */
function helperFit(sim: PlaySim, e: Engagement, h: Agent, axis: Vec2): Intent | null {
  const hands = e.helperHands?.get(h);
  // Sustained hand load is immediate proprioception. Do not retreat from a
  // useful working block because an older visual picture extrapolates
  // elsewhere. Feeling load on the far side is not a usable run surface;
  // keep replacing feet using the retained visual landmark in that case.
  if (hands?.normalForce || hands?.tangentForce) {
    const contact = norm(sub(h.pos, e.defender.pos));
    if (contact.x*axis.x + contact.y*axis.y > 0) return null;
  }
  let read = helperFits.get(h);
  if (!read || read.rep !== e || read.owner !== e.blocker || sim.t >= read.nextRead) {
    const owner = sim.see(h, e.blocker), visual = sim.see(h, e.defender);
    const touch = helperTouches.get(h);
    const defender = touch?.rep === e && touch.at === sim.t
      ? { ...visual, pos: touch.pos } : visual;
    const lat = latOf(axis);
    const side = read?.rep === e && read.owner === e.blocker ? read.side
      : Math.sign((h.pos.x-owner.pos.x)*lat.x+(h.pos.y-owner.pos.y)*lat.y) || e.side;
    const width = (h.profile.radius+e.blocker.profile.radius)*.95;
    const hip = { x: owner.pos.x+lat.x*width*side, y: owner.pos.y+lat.y*width*side };
    const offset = sub(hip, defender.pos), relative = sub(h.pos, defender.pos);
    const depth = offset.x*axis.x+offset.y*axis.y;
    const recovery = depth <= 0 || relative.x*axis.x+relative.y*axis.y <= 0;
    let goal = hip;
    if (recovery) {
      const contact = h.profile.radius+e.defender.profile.radius;
      // Keep a neighboring lane while replacing feet on the useful surface.
      // No actual body, contact axis or hand extension is projected here.
      const replace = Math.max(0, .5*contact-depth);
      let fit = { x: offset.x+axis.x*replace, y: offset.y+axis.y*replace };
      const length = Math.hypot(fit.x,fit.y), clearance = contact+.15;
      if (length < clearance) fit = { x: fit.x*clearance/length, y: fit.y*clearance/length };
      const dx = fit.x-relative.x, dy = fit.y-relative.y;
      const along = clamp(-(relative.x*dx+relative.y*dy)/Math.max(1e-12,dx*dx+dy*dy),0,1);
      if (Math.hypot(relative.x+along*dx,relative.y+along*dy) < contact) {
        const distance = Math.hypot(relative.x,relative.y);
        if (distance > 1e-9) {
          const cross = relative.x*fit.y-relative.y*fit.x;
          // Antipodal feet still have a known joining side to work around.
          const angle = (Math.sign(cross)||-side)*Math.min(.35,Math.acos(clamp(
            (relative.x*fit.x+relative.y*fit.y)/(distance*Math.hypot(fit.x,fit.y)),-1,1)));
          const radius = Math.max(clearance,(distance+clearance)/2);
          fit = { x:(relative.x*Math.cos(angle)-relative.y*Math.sin(angle))*radius/distance,
            y:(relative.x*Math.sin(angle)+relative.y*Math.cos(angle))*radius/distance };
        }
      }
      goal = { x:defender.pos.x+fit.x, y:defender.pos.y+fit.y+h.mind.placementError };
    }
    read = { rep:e, owner:e.blocker, side, nextRead:sim.t+h.mind.decisionInterval, recovery,
      goal, defender:{...defender.pos} };
    helperFits.set(h,read);
  }
  if (!read.recovery) return null;
  // A foot landmark is held for this beat. Chasing its stale extrapolated
  // velocity would add a second prediction on top of the visual picture.
  return { vel:movingArrivalVelocity(h.body,read.goal,{x:0,y:0},h.profile.vmax,.1,0,1,baseOf(h)),
    facing:Math.atan2(read.defender.y-h.pos.y,read.defender.x-h.pos.x), push:1, posture:.75 };
}

/** Useful helpers drive normally; an unusable run surface first needs feet. */
function helperIntents(sim: PlaySim, e: Engagement, intents: Intent[], axis: Vec2): void {
  const b = e.blocker, d = e.defender;
  const lat = latOf(axis);
  const sep = b.profile.radius + d.profile.radius;
  for (const h of e.helpers) {
    const recovery = e.type === 'run' ? helperFit(sim,e,h,axis) : null;
    if (recovery) { intents[h.idx] = recovery; continue; }
    const hs = Math.sign((h.pos.x - b.pos.x) * lat.x + (h.pos.y - b.pos.y) * lat.y) || e.side;
    const spot = { x: b.pos.x + lat.x * sep * 0.95 * hs, y: b.pos.y + lat.y * sep * 0.95 * hs };
    const toSpot = sub(spot, h.pos);
    const direction = e.drive ?? { x: -axis.x, y: -axis.y };
    const drive = e.type === 'run' ? { x: direction.x * 2.2, y: direction.y * 2.2 } : { x: -axis.x * 0.5, y: -axis.y * 0.5 };
    intents[h.idx] = {
      vel: { x: drive.x + toSpot.x * 3, y: drive.y + toSpot.y * 3 },
      facing: Math.atan2(d.pos.y - h.pos.y, d.pos.x - h.pos.x),
      push: 1,
      posture: 0.75,
    };
  }
}

// Retired visibility decisions are consumed for execution-stream compatibility
// but never become official calls. Actual World restraint is adjudicated by
// contact-holding.ts after the interval and simultaneous no-call facts exist.
const legacyHoldVisible = new WeakSet<PlaySim>();

/** A beaten blocker may attempt a cloth grab. This changes the bounded hand
 * technique, not the official ruling. Only achieved illegal restraint is a foul. */
function tryHold(sim: PlaySim, e: Engagement): boolean {
  if (e.holding) return false;
  const b = e.blocker;
  // Only possible with hands on him.
  if (e.control < -0.4) return false;
  const pHold = (0.04 + 0.13 * (1 - b.r('discipline'))) * (e.type === 'pass' ? 1 : 0.6);
  if (!sim.rng.chance(pHold)) return false;
  e.holding = true;
  b.tags.add('held');
  setHands(sim, e);
  const id = `legacy-hold:${b.idx}:${e.defender.idx}:${sim.t}`;
  const evidence = { source: 'legacy' as const, rule: '12-1-3(c)',
    action: 'selected_holding_mode', victimId: e.defender.player.id,
    facts: { selectedTechnique: true, achievedRestrictionQualified: false, control: e.control } };
  sim.foulRecords.push({ id, t: sim.t, kind: 'holding', playerId: b.player.id,
    called: false, assessment: 'unresolved', evidence });
  sim.event('holding_attempt', b, e.defender, 'legacy technique choice; achieved legal elements unqualified');
  // Preserve the historical draw until the first formerly visible attempt;
  // do not pretend that this sampled bit proves achieved NFL illegality.
  const visible = 0.35 + 0.35 * Math.min(1, Math.abs(e.phi) + (1 - e.baseB));
  const legacyCall = [sim.penalty, ...sim.penalties].some(p => p?.kind === 'holding'
    && !p.id?.startsWith('native-holding:'));
  if (!legacyCall && !legacyHoldVisible.has(sim) && sim.rng.chance(visible)) legacyHoldVisible.add(sim);
  return true;
}

/** Defender wins: the hands come apart. Run sheds throw the blocker aside. */
function beat(sim: PlaySim, e: Engagement, axis: Vec2, lat: Vec2, run = false, why = ''): void {
  const d = e.defender;
  const b = e.blocker;
  if (run) runContactObservers.get(sim)?.(e, 'end', { reason: why });
  sim.disengage(e);
  // Hands need a moment to refit before he can grab the same man again.
  b.shedBy.set(d, sim.t + 0.6);
  if (run) {
    const s = Math.sign(e.phi) || e.side;
    const mb = b.profile.massKg;
    sim.world.strike(d.body, b.body, { x: -lat.x * s * mb * 0.6 - axis.x * mb * 0.2, y: -lat.y * s * mb * 0.6 - axis.y * mb * 0.2 });
  }
  d.tags.add('shed');
  sim.event('shed', d, b, `${run ? 'run' : 'pass'}: ${why}`);
}

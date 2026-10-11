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
import { fatigueFactor, movingArrivalVelocity } from '../physics/kinematics.js';
import { gapY } from '../playbook/alignment.js';
import { availability, supportParams } from '../physics/support.js';
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
  const existing = defender.engagement;
  if (existing) {
    // Second blocker: double team.
    if (existing.helpers.length < 1 && existing.blocker !== blocker) {
      existing.helpers.push(blocker);
      helperSince.set(blocker, t);
      blocker.engagement = existing;
      syncJoints(sim, existing);
      return existing;
    }
    return null;
  }

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
    e.control = clamp(punchB - strike + 0.1, -0.8, 0.8);
    e.move = 'shed';
    // Reach blocks want the defender sealed on the backside.
    if (drive && !surface) e.sealTarget = clamp(-0.45 * Math.abs(drive.y), -0.5, 0) * e.side;
  }
  blocker.engagement = e;
  defender.engagement = e;
  sim.engagements.push(e);
  syncJoints(sim, e);
  return e;
}

const helperSince = new WeakMap<Agent, number>();
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
  const tb = traits(b, e.type), td = traits(d, e.type);
  const sep = b.profile.radius + d.profile.radius;
  const t = sim.t;
  const inMove = t < e.moveUntil && e.moveOk;
  const c = e.control;
  // Inside hands lock out at the controlling player's arm length; neither in
  // control, the hands meet in the middle.
  const reach = (c >= 0 ? tb.arm : td.arm) / 36;
  const hands = e.hands!;
  hands.actor = c >= 0 ? b.body : d.body;
  hands.extension = sep + reach * 0.3 * (0.5 + 0.5 * Math.abs(c));
  hands.push = (c >= 0 ? armForce(b) : armForce(d)) * (0.35 + 0.65 * Math.abs(c));
  // Latched hands can hold and steer; a defender in control steers the
  // blocker off his line just as well.
  hands.hold = e.holding ? armForce(b) * 1.2 : c > 0.3 ? armForce(b) * 0.25 * c : 0;
  hands.steer = c >= 0 ? armForce(b) * (0.15 + 0.55 * c) : armForce(d) * (0.15 + 0.4 * -c);
  // A landed finesse move has the hands off for its window.
  if (inMove && e.move !== 'bull' && e.move !== 'longarm') {
    hands.steer *= 0.1;
    if (e.move === 'spin' || e.move === 'swim') hands.push *= 0.2;
  }
  for (const h of e.helpers) {
    const j = e.helperHands?.get(h);
    if (!j) continue;
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

export function updateEngagements(sim: PlaySim, intents: Intent[] = sim.intents): void {
  const t = sim.t;
  for (const e of [...sim.engagements]) {
    const b = e.blocker;
    const d = e.defender;
    if (b.isDown(t) || d.isDown(t)) {
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
        sim.disengage(e);
        continue;
      }
    }
    // Contact that has come apart (a bump, a spin away) ends the rep.
    const apart = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - (b.profile.radius + d.profile.radius);
    if (apart > Math.max(traits(b).arm, traits(d).arm) / 36 + 0.35) {
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
    e.move = t - e.start < 0.1 ? e.move : chooseMove(sim, e);
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
  intents[b.idx] = {
    vel: { x: lat.x * vLat - kick, y: lat.y * vLat },
    facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x),
    push: 1,
    posture: 0.6,
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
function runContactRead(sim: PlaySim, e: Engagement) {
  const d = e.defender, b = e.blocker, job = d.runFit;
  const carrier = sim.carrier;
  const enemy = carrier && carrier.team !== d.team ? carrier : null;
  const carrierCue = enemy ? sim.see(d, enemy) : null;
  // Read through the mesh instead of working toward a stationary QB. This
  // uses only the observed depth; a QB draw/scramble can declare at the surface.
  const back = sim.slot('RB');
  const runnerCue = enemy === sim.qb && carrierCue && carrierCue.pos.x < sim.los - 1.6 && back
    ? sim.see(d, back) : carrierCue;
  const advanced = !!(enemy && carrierCue &&
    (carrierCue.pos.x - sim.los) * sim.attackDir(enemy.team) > 2);
  const reading = d.recog?.read === 'run' || advanced;
  const declared = !!(reading && runnerCue && runnerCue.pos.x > sim.los - 1.6);
  const edge = job?.kind === 'edge' || job?.kind === 'force';
  // Preserve the box/spill shoulder until the runner is beyond the surface,
  // just as the free fit does. The touching blocker's position is haptic.
  const y = job ? edge ? b.pos.y + job.side * (job.edge === 'spill' ? -.45 : .65)
    : gapY(sim.offAlign, job.gap, job.side) : b.pos.y;
  let desired = { x: d.pos.x, y };
  if (declared && (!edge || advanced)) desired = { ...runnerCue!.pos };
  else if (!job && runnerCue && reading) desired = { ...runnerCue.pos };
  const aim = d.mind.aim(`run-contact:${b.idx}`, desired, sim.t);
  // A close observed back can threaten a penetrating lineman deep behind
  // the surface; shedding must not wait for the free-fit declaration depth.
  // A standing deep QB is still a mesh key, not a run target. An observed
  // advanced carrier supplies urgency even after an original pass read.
  const threat = reading && carrierCue &&
    (enemy !== sim.qb || carrierCue.pos.x > sim.los - 1.6) ? carrierCue : null;
  return { aim, reading, threat };
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
  e.phi = measurePhi(axis, d, b);
  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);

  // The defender keeps the called fit/shoulder and can answer a declared
  // runner at his next decision. The blocker still seeks his seal surface.
  const toAim = sub(read.aim, d.pos);
  const preferred = toAim.x * lat.x + toAim.y * lat.y;
  if (Math.abs(preferred) > .1) e.side = Math.sign(preferred);
  e.control = clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);

  // Shed attempts once the ball carrier threatens his area — not the QB
  // standing at the mesh before the handoff.
  if (read.threat && t >= e.nextMoveAt) {
    const dc = Math.hypot(read.threat.pos.x - d.pos.x, read.threat.pos.y - d.pos.y);
    if (dc < 3.5) {
      // Shedding toward the ball is hard if the blocker has sealed you away from it.
      const toBall = sub(read.threat.pos, d.pos);
      const ballSide = Math.sign(toBall.x * lat.x + toBall.y * lat.y);
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
  if (b.body.support?.state !== 'up' || Math.abs(e.phi) >= 1.1) {
    if (!tryHold(sim, e)) beat(sim, e, axis, lat, true, b.body.support?.state !== 'up' ? 'blocker off his feet' : 'leverage');
    return;
  }
  setHands(sim, e);
  // Feet request displacement along the drive line; contact geometry and the
  // lateral fit use the surface frame. These can differ in a stretch-zone rep.
  // Actual hand normal, ground traction and work remain physical constraints.
  const drive = e.drive ?? { x: -axis.x, y: -axis.y };
  const sep = b.profile.radius + d.profile.radius;
  const dLat = d.vel.x * lat.x + d.vel.y * lat.y;
  // Seal target as a lateral offset of the blocker from the defender, where
  // the defender is heading in a beat.
  const lead = 0.15 + 0.15 * tb.read;
  const offset = (b.pos.x - d.pos.x - d.vel.x * lead) * lat.x + (b.pos.y - d.pos.y - d.vel.y * lead) * lat.y;
  const wantOffset = -Math.sin(e.sealTarget * Math.PI / 2) * sep;
  const mirror = tb.lateral * (0.75 + 0.35 * tb.feet) * (e.helpers.length ? 1.3 : 1);
  const seal = clamp(dLat + felt(e, lat) * (0.6 + 0.6 * tb.feet) + (wantOffset - offset) * (3 + 3 * tb.feet), -mirror, mirror);
  intents[b.idx] = {
    vel: { x: drive.x * 2.4 + lat.x * seal, y: drive.y * 2.4 + lat.y * seal },
    facing: Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x),
    push: 1,
    posture: 0.85,
    cutSkill: 0.8 + 0.3 * tb.feet,
  };
  // Engaged, a defender stacks the block and keeps his gap leverage; he
  // escapes sideways by winning a shed with his hands, not by running out of
  // a blocker's grip.
  const work = td.lateral * (0.2 + 0.25 * d.r('blockShedding')) * (read.reading ? 1 : 0.3);
  intents[d.idx] = {
    vel: { x: -drive.x * 1.5 + lat.x * e.side * work, y: -drive.y * 1.5 + lat.y * e.side * work },
    facing: Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x),
    push: 1,
    posture: 0.85,
    cutSkill: 0.8 + 0.4 * td.bend,
  };
  helperIntents(sim, e, intents, axis);
}

interface HelperFitRead {
  rep: Engagement;
  side: number;
  nextRead: number;
  recovery: boolean;
  goal: Vec2;
  velocity: Vec2;
  defender: Vec2;
}
const helperFits = new WeakMap<Agent, HelperFitRead>();

/** A joined helper cannot drive through the defender to replace his feet.
 * Retain one personally observed foot landmark for the ordinary decision
 * beat. The acquired surface is known work; the two bodies are delayed visual
 * pictures. This requests movement only, leaving actual hands/support intact.
 */
function helperFit(sim: PlaySim, e: Engagement, h: Agent, axis: Vec2): Intent | null {
  let read = helperFits.get(h);
  if (!read || read.rep !== e || sim.t >= read.nextRead) {
    const owner = sim.see(h, e.blocker), defender = sim.see(h, e.defender);
    const lat = latOf(axis);
    const side = read?.rep === e ? read.side
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
    read = { rep:e, side, nextRead:sim.t+h.mind.decisionInterval, recovery,
      goal, velocity:{...defender.vel}, defender:{...defender.pos} };
    helperFits.set(h,read);
  }
  if (!read.recovery) return null;
  return { vel:movingArrivalVelocity(h.body,read.goal,read.velocity,h.profile.vmax,.1,0,1,baseOf(h)),
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

/** A beaten blocker may grab. Returns true if he held (and keeps the block). */
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
  // Officials see the obvious ones.
  const visible = 0.35 + 0.35 * Math.min(1, Math.abs(e.phi) + (1 - e.baseB));
  if (!sim.penalty && sim.rng.chance(visible)) {
    sim.penalty = { kind: 'holding', against: 'O', playerId: b.player.id, yards: 10, autoFirst: false, spotX: b.pos.x };
    sim.event('holding', b, e.defender);
  }
  return true;
}

/** Defender wins: the hands come apart. Run sheds throw the blocker aside. */
function beat(sim: PlaySim, e: Engagement, axis: Vec2, lat: Vec2, run = false, why = ''): void {
  const d = e.defender;
  const b = e.blocker;
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

/**
 * Trench model: blocking engagements as physical, technical reps.
 *
 * Every block tracks a small state that line coaches would recognize:
 *
 *   control  — hand position. +1: the blocker's hands are inside and latched
 *              (he steers the defender); −1: the defender controls the blocker
 *              (hands inside on his chest, or the blocker's hands knocked away).
 *   phi      — the defender's angular progress around the blocker relative to
 *              the line he must stay on (QB for pass pro, drive axis for runs),
 *              in units of 90°: 0 = square, ±1 = hip to hip (beaten).
 *   base     — each player's balance (0–1). Lunging at a missed punch,
 *              over-setting, being driven or yanked all cost base; it recovers
 *              with balance and footwork. A blocker with no base is beaten.
 *   pad level— leverage from height, bend (ankle/hip flexibility) and fatigue;
 *              the low man wins the push. Losing the push stands you up.
 *
 * Contact: the rusher's momentum converts to power (speed-to-power) against
 * the blocker's anchor; the punch exchange (hand technique, arm length,
 * timing, a swipe/chop that makes the blocker miss) sets initial control.
 *
 * Each tick: a lateral battle (defender's lateral burst vs. the blocker's
 * mirror — footwork × base × control) moves phi; a push battle (power ×
 * leverage × base × control) moves the pair. At decision points the defender
 * picks a move *from the state* — inside counter vs. an over-set, snatch vs.
 * a lunging blocker, rip/club vs. latched hands, dip-and-bend once he's even,
 * bull/long-arm vs. a high-pad or light blocker — and its success depends on
 * the matching skills, physical traits (arm length, bend, agility, strength)
 * and the blocker's recognition and counters.
 */
import { clamp, logistic, norm, sub, type Vec2 } from '../core/vec.js';
import { fatigueFactor } from '../physics/kinematics.js';
import type { Agent, Engagement, RushMove } from './agent.js';
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

export function traits(a: Agent): TrenchTraits {
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

/** Engagement axis: unit vector from the defender toward the protected point. */
function axisOf(sim: PlaySim, e: Engagement): Vec2 {
  if (e.type === 'pass') return norm(sub(sim.qb.pos, e.defender.pos));
  const d = e.drive ?? norm(sub(e.defender.pos, e.blocker.pos));
  return { x: -d.x, y: -d.y };
}

const latOf = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** Signed phi from current positions (blocker relative to the defender). */
function measurePhi(axis: Vec2, d: Agent, b: Agent): number {
  const bd = norm(sub(b.pos, d.pos));
  const lat = latOf(axis);
  // B = D + (axis cosφ − lat sinφ)·sep  ⇒  φ = atan2(−bd·lat, bd·axis)
  return Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2);
}

// ------------------------------------------------------------ creation

export function createEngagement(sim: PlaySim, blocker: Agent, defender: Agent, type: 'pass' | 'run', drive: Vec2 | null): Engagement | null {
  const t = sim.t;
  if (blocker.engagement) return blocker.engagement;
  if ((blocker.shedBy.get(defender) ?? -1) > t) return null;
  if (defender.isDown(t) || blocker.isDown(t)) return null;
  const existing = defender.engagement;
  if (existing) {
    // Second blocker: double team.
    if (existing.helpers.length < 1 && existing.blocker !== blocker) {
      existing.helpers.push(blocker);
      blocker.engagement = existing;
      return existing;
    }
    return null;
  }

  const rng = sim.rng;
  const tb = traits(blocker);
  const td = traits(defender);
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
    baseB: 1,
    baseD: 1,
    impulse: 0,
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
  const axis = axisOf(sim, e);
  const lat = latOf(axis);
  e.phi = clamp(measurePhi(axis, defender, blocker), -0.95, 0.95);

  // Working side: edge rushers work outside; interior/run defenders toward
  // their gap / the ball; a defender who is already beside the blocker keeps
  // working that way.
  let pref: Vec2;
  const c = sim.carrier;
  if (type === 'pass') {
    const out = Math.sign(defender.pos.y - sim.ballY) || 1;
    const isEdge = Math.abs(defender.pos.y - sim.ballY) > 3.0;
    pref = isEdge ? { x: 0, y: out } : { x: 0, y: Math.sign(defender.pos.y - blocker.pos.y) || out };
  } else if (c && c.team !== defender.team) pref = sub(c.pos, defender.pos);
  else pref = { x: 0, y: Math.sign(defender.pos.y - blocker.pos.y) || 1 };
  e.side = Math.sign(pref.x * lat.x + pref.y * lat.y) || 1;
  if (Math.abs(e.phi) > 0.3) e.side = Math.sign(e.phi);

  // Speed-to-power: closing momentum at contact. A blocker giving ground
  // (setting back) absorbs part of it.
  const closingD = Math.max(0, defender.vel.x * axis.x + defender.vel.y * axis.y);
  const closingB = Math.max(0, -(blocker.vel.x * axis.x + blocker.vel.y * axis.y));
  const md = defender.profile.massKg;
  const mb = blocker.profile.massKg;
  e.impulse = clamp((md * closingD - mb * closingB * 0.5) / (md + mb), 0, 3.5);

  // Punch exchange. Longer arms land first and keep the opponent off the body.
  const armEdge = (tb.arm - td.arm) / 3; // +1 per 3" advantage
  const punchB = tb.hands + 0.12 * armEdge + rng.normal(0, 0.18) + e.repEdge;
  if (type === 'pass') {
    const plan = planMove(sim, e, defender, blocker);
    e.move = plan;
    if (plan === 'swim' || plan === 'club' || plan === 'rip' || plan === 'speed') {
      // Swipe/chop the punch: a miss makes the blocker lunge.
      const swipe = td.hands + 0.15 * td.bend + rng.normal(0, 0.18);
      if (swipe - punchB > 0.18) {
        e.control = -0.5;
        e.baseB -= 0.3;
        e.phi += e.side * 0.25;
        e.nextMoveAt = t + 0.2;
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
    if (drive) e.sealTarget = clamp(-0.45 * Math.abs(drive.y), -0.5, 0) * e.side;
  }
  blocker.engagement = e;
  defender.engagement = e;
  sim.engagements.push(e);
  return e;
}

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
  return sim.rng.weighted(
    w.map((x) => x[0]),
    w.map((x) => Math.max(0, x[1])),
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

// ------------------------------------------------------------ update

export function updateEngagements(sim: PlaySim): void {
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
    if (e.type === 'pass' && (!sim.isPass || sim.carrier !== sim.qb || sim.scrambled)) e.type = 'run';
    const c = sim.carrier;
    if (e.type === 'run' && c && c.team !== d.team) {
      const past = (c.pos.x - d.pos.x) * sim.attackDir(c.team);
      if (past > 2.5 && t - e.start > 0.4) {
        sim.disengage(e);
        continue;
      }
    }
    if (e.type === 'pass') stepPassRep(sim, e);
    else stepRunRep(sim, e);
  }
}

function forces(e: Engagement, pushBoost: number): { fd: number; fb: number; lev: number } {
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  // Pad level rises as players tire and when they are being driven.
  const padB = tb.pad * (1 + 0.08 * (1 - b.body.energy) + 0.1 * (1 - e.baseB));
  const padD = td.pad * (1 + 0.08 * (1 - d.body.energy) + 0.1 * (1 - e.baseD));
  const lev = clamp((padB - padD) * 2.2, -0.3, 0.3); // + favors defender
  const pass = e.type === 'pass';
  const techD = pass ? 0.65 * d.r('passRushPower') + 0.35 * d.r('strength') : 0.55 * d.r('blockShedding') + 0.45 * d.r('strength');
  const techB = pass ? 0.45 * b.r('passBlock') + 0.35 * b.r('strength') + 0.2 * tb.feet : 0.5 * b.r('runBlock') + 0.5 * b.r('strength');
  const fd = d.profile.power * (0.65 + 0.7 * techD) * fatigueFactor(d.body.energy) * (1 + lev) * (0.5 + 0.5 * e.baseD) * (1 + 0.3 * Math.max(0, -e.control)) * pushBoost;
  let fb = b.profile.power * (0.65 + 0.7 * techB) * fatigueFactor(b.body.energy) * (1 - lev) * (0.4 + 0.6 * e.baseB) * (1 + 0.3 * Math.max(0, e.control)) * (1 + e.repEdge);
  for (const h of e.helpers) fb += h.profile.power * (0.45 + 0.4 * h.r(pass ? 'passBlock' : 'runBlock'));
  return { fd, fb, lev };
}

function stepPassRep(sim: PlaySim, e: Engagement): void {
  const t = sim.t;
  const dt = sim.dt;
  const rng = sim.rng;
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  const axis = axisOf(sim, e);
  const lat = latOf(axis);
  const doubled = e.helpers.length > 0;
  const inMove = t < e.moveUntil && e.moveOk;
  // Nobody holds a block forever: past ~2 s the blocker's feet and hands wear
  // down, he can't re-anchor as well, and the rusher keeps collapsing the pocket.
  const wear = repWear(sim, e);

  // ---- moves at decision points
  if (t >= e.nextMoveAt) {
    e.move = t - e.start < 0.1 ? e.move : chooseMove(sim, e);
    resolveMove(sim, e);
  }

  // ---- push battle along the axis toward the QB
  const moveFactor = moveFactorOf(e.move, inMove);
  const { fd, fb, lev } = forces(e, moveFactor * (1 + 0.35 * e.pushBoost));
  const mass = d.profile.massKg + b.profile.massKg + e.helpers.reduce((s, h) => s + h.profile.massKg, 0);
  // Pass blockers sit down into their anchor: a set blocker gives ground only
  // to a real power advantage.
  let vAxis = (6 * (fd - fb * 1.08)) / mass + e.impulse;
  // Pass blockers give ground; they don't drive rushers back upfield.
  // Pass sets give ground to set depth before anchoring, so the pocket forms
  // a few yards deep; after that the rush keeps compressing it as the blocker tires.
  const isT = b.slot === 'LT' || b.slot === 'RT';
  const belowSet = sim.los - b.pos.x < (isT ? 2.6 : 1.6);
  vAxis = clamp(vAxis, belowSet ? 0.7 : 0.12 + 0.55 * wear, 2.8);
  e.impulse *= Math.exp(-dt / 0.22);
  e.pushBoost = Math.max(0, e.pushBoost - dt * 1.2);

  // Being driven costs the blocker his base; a stalemate lets him re-anchor.
  if (vAxis > 0.9) e.baseB -= dt * 0.45 * (vAxis - 0.9) * (1.2 - tb.balance);
  e.baseB += dt * (0.25 + 0.55 * tb.feet) * (1 - e.baseB) * (vAxis < 0.6 ? 1 : 0.3) * (1 - 0.6 * wear);
  e.baseB -= dt * 0.12 * wear;
  e.baseD += dt * (0.4 + 0.5 * td.balance) * (1 - e.baseD);

  // ---- lateral battle: rusher works his side, blocker mirrors back to square
  const wantsSide = e.move === 'bull' || e.move === 'longarm' ? 0.2 : 1;
  const stalled = t < e.moveUntil && !e.moveOk;
  // Once engaged, lateral progress needs the hands: a rusher whose hands are
  // controlled can't just run around the blocker.
  const freeHands = 0.22 + 0.4 * Math.max(0, -e.control) + (inMove ? 0.45 : 0);
  const rLat = td.lateral * wantsSide * freeHands * (0.8 + 0.4 * td.bend) * (0.5 + 0.5 * e.baseD) * (stalled ? 0.3 : 1);
  const mirror = tb.lateral * (0.45 + 0.35 * tb.feet) * (0.35 + 0.65 * e.baseB) * (1 + 0.35 * Math.max(0, e.control)) * (doubled ? 1.8 : 1) * (1 + e.repEdge) * (1 - 0.45 * wear);
  const sep = b.profile.radius + d.profile.radius;
  const quarter = (Math.PI / 2) * sep;
  // The blocker slides to square up (saturating at his mirror speed).
  const restore = -Math.sign(e.phi) * Math.min(1, Math.abs(e.phi) * 4);
  e.phi += (dt * (rLat * e.side + mirror * restore)) / quarter;
  // Hand fight drifts toward the better hands; arm length keeps you off the body.
  e.control = clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);

  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);

  // ---- outcomes
  if (Math.abs(e.phi) >= 1 || e.baseB <= 0.05) {
    if (tryHold(sim, e)) return;
    beat(sim, e, axis, lat);
    return;
  }
  movePair(sim, e, axis, lat, smoothV(sim, e, vAxis), sep);
  const exert = 0.03 * dt;
  d.body.energy = Math.max(0, d.body.energy - exert);
  b.body.energy = Math.max(0, b.body.energy - exert);
  void lev;
}

/** 0 early in the rep → 1 once the blocker has been holding up for ~4.5 s. */
function repWear(sim: PlaySim, e: Engagement): number {
  const stamina = 0.5 * e.blocker.r('stamina') + 0.5 * e.blocker.body.energy;
  return clamp((sim.t - e.start - 1.6 - 0.6 * stamina) / 2.5, 0, 1);
}

function moveFactorOf(m: RushMove, active: boolean): number {
  switch (m) {
    case 'bull':
      return active ? 1.15 : 1.05;
    case 'longarm':
      return active ? 1.1 : 1.0;
    case 'speed':
    case 'dip':
      return 0.45;
    case 'spin':
      return 0.4;
    default:
      return 0.75;
  }
}

/** Resolve the defender's move against the blocker's counters. */
function resolveMove(sim: PlaySim, e: Engagement): void {
  const t = sim.t;
  const rng = sim.rng;
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  const fin = d.r('passRushFinesse');
  const pow = d.r('passRushPower');
  const counter = (0.45 * tb.hands + 0.25 * tb.read + 0.3 * tb.feet) * (1 - 0.35 * repWear(sim, e));
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
  if (ok) {
    switch (e.move) {
      case 'bull':
        e.pushBoost = 0.6;
        e.baseB -= 0.25;
        e.control = Math.min(e.control, -0.3);
        break;
      case 'longarm':
        e.pushBoost = 0.45;
        e.baseB -= 0.15;
        e.control = -0.6;
        break;
      case 'speed':
      case 'dip':
        e.phi += e.side * (0.35 + 0.25 * rng.next());
        e.control = Math.min(e.control, 0);
        break;
      case 'spin':
        e.side = -e.side;
        e.phi = e.side * (0.6 + 0.3 * rng.next());
        e.baseB -= 0.2;
        break;
      case 'swim':
      case 'club':
        e.phi += e.side * (0.3 + 0.2 * rng.next());
        e.control = -0.4;
        e.baseB -= 0.12;
        break;
      case 'rip':
        e.phi += e.side * (0.28 + 0.2 * rng.next());
        e.control = Math.min(e.control - 0.6, -0.2);
        break;
      case 'snatch':
        e.baseB -= 0.5;
        e.phi += e.side * 0.3;
        break;
      default:
        break;
    }
  } else {
    // Failed move: blocker latches, rusher loses momentum and some balance.
    e.control = Math.min(1, e.control + 0.35);
    e.phi *= 0.6;
    e.baseD -= e.move === 'spin' ? 0.35 : 0.12;
  }
  e.nextMoveAt = t + (e.move === 'bull' || e.move === 'longarm' ? 0.75 : 0.55) + rng.range(0, 0.45);
}

function stepRunRep(sim: PlaySim, e: Engagement): void {
  const t = sim.t;
  const dt = sim.dt;
  const rng = sim.rng;
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  const axis = axisOf(sim, e); // from defender back toward the blocker (against the drive)
  const lat = latOf(axis);
  const c = sim.carrier;

  // Push battle along the blocker's drive: positive = defender driven back.
  const { fd, fb } = forces(e, 1);
  const mass = d.profile.massKg + b.profile.massKg + e.helpers.reduce((s, h) => s + h.profile.massKg, 0);
  // Run blocks: offensive linemen fire out on the snap count (small edge);
  // displacement is gradual — most reps are a yard of movement either way.
  let vDrive = (5 * (fb * 1.05 - fd)) / mass;
  vDrive = clamp(vDrive, -1.6, 2.4);
  if (vDrive > 0.8) e.baseD -= dt * 0.35 * (vDrive - 0.8) * (1.2 - td.balance);
  if (vDrive < -0.8) e.baseB -= dt * 0.35 * (-vDrive - 0.8) * (1.2 - tb.balance);
  e.baseB += dt * (0.3 + 0.5 * tb.feet) * (1 - e.baseB);
  e.baseD += dt * (0.3 + 0.5 * td.balance) * (1 - e.baseD);

  // Lateral: the defender works toward the ball; the blocker works to his
  // seal target (reach) or square (drive).
  if (c && c.team !== d.team) {
    const toBall = sub(c.pos, d.pos);
    const s = Math.sign(toBall.x * lat.x + toBall.y * lat.y);
    if (s !== 0 && Math.abs(toBall.y) > 0.8) e.side = s;
  }
  const rLat = td.lateral * (0.6 + 0.4 * d.r('blockShedding')) * (1 + 0.4 * Math.max(0, -e.control)) * (0.4 + 0.6 * e.baseD) * (d.fooledUntil > t ? 0.3 : 1);
  const bLat = tb.lateral * (0.5 + 0.6 * b.r('runBlock')) * (1 + 0.4 * Math.max(0, e.control)) * (0.4 + 0.6 * e.baseB) * (e.helpers.length ? 1.6 : 1);
  const sep = b.profile.radius + d.profile.radius;
  const quarter = (Math.PI / 2) * sep;
  const err = e.sealTarget - e.phi;
  e.phi += (dt * (rLat * e.side * 0.8 + bLat * clamp(err * 3, -1, 1))) / quarter;
  e.control = clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);
  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);

  // Shed attempts once the ball carrier threatens his area.
  if (c && c.team !== d.team && t >= e.nextMoveAt) {
    const dc = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    if (dc < 4.5) {
      // Shedding toward the ball is hard if the blocker has sealed you away from it.
      const toBall = sub(c.pos, d.pos);
      const ballSide = Math.sign(toBall.x * lat.x + toBall.y * lat.y);
      const sealed = -e.phi * ballSide; // >0: blocker is between you and the ball laterally
      const skill = 0.6 * d.r('blockShedding') + 0.4 * d.r('strength');
      const sustain = 0.5 * b.r('runBlock') + 0.3 * tb.hands + 0.2 * b.r('strength');
      const p = logistic(-1.4 + 3.4 * (skill - sustain) - 1.2 * e.control - 1.3 * sealed + (d.profile.massKg - b.profile.massKg) / 120 - (e.helpers.length ? 1.2 : 0) + (1 - e.baseB) * 1.5);
      if (rng.chance(p)) {
        if (!tryHold(sim, e)) beat(sim, e, axis, lat, true);
        return;
      }
      e.control = Math.min(1, e.control + 0.2);
      e.nextMoveAt = t + 0.4 + rng.range(0, 0.3);
    }
  }
  if (e.baseB <= 0.05 || Math.abs(e.phi) >= 1.1) {
    if (!tryHold(sim, e)) beat(sim, e, axis, lat, true);
    return;
  }
  movePair(sim, e, axis, lat, smoothV(sim, e, -vDrive), sep);
}

/** Move both bodies: pair translates along the axis; blocker sits at angle phi. */
const pairVel = new WeakMap<Engagement, number>();

/** Two big bodies locked together don't change speed instantly. */
function smoothV(sim: PlaySim, e: Engagement, v: number): number {
  const prev = pairVel.get(e) ?? 0;
  const next = prev + (v - prev) * Math.min(1, sim.dt / 0.3);
  pairVel.set(e, next);
  return next;
}

function movePair(sim: PlaySim, e: Engagement, axis: Vec2, lat: Vec2, vAxis: number, sep: number): void {
  const dt = sim.dt;
  const b = e.blocker;
  const d = e.defender;
  const vx = axis.x * vAxis;
  const vy = axis.y * vAxis;
  d.body.pos = { x: d.pos.x + vx * dt, y: d.pos.y + vy * dt };
  d.body.vel = { x: vx, y: vy };
  const ph = clamp(e.phi, -1.2, 1.2) * (Math.PI / 2);
  const off = { x: axis.x * Math.cos(ph) - lat.x * Math.sin(ph), y: axis.y * Math.cos(ph) - lat.y * Math.sin(ph) };
  const target = { x: d.pos.x + off.x * sep, y: d.pos.y + off.y * sep };
  // Blocker slides to his spot at a finite rate (no teleporting).
  const mx = target.x - b.pos.x;
  const my = target.y - b.pos.y;
  const ml = Math.hypot(mx, my);
  const maxStep = (Math.abs(vAxis) + 3.5) * dt;
  const k = ml > maxStep ? maxStep / ml : 1;
  b.body.pos = { x: b.pos.x + mx * k, y: b.pos.y + my * k };
  b.body.vel = { x: vx + (mx * k) / dt * 0.3, y: vy + (my * k) / dt * 0.3 };
  b.body.facing = Math.atan2(-off.y, -off.x);
  d.body.facing = Math.atan2(axis.y, axis.x);
  for (const h of e.helpers) {
    // A helper stays on the side he came from and works to his hip at a
    // human rate.
    const hs = Math.sign((h.pos.x - b.pos.x) * lat.x + (h.pos.y - b.pos.y) * lat.y) || Math.sign(e.phi || e.side) || 1;
    const spot = { x: b.pos.x + lat.x * sep * 0.95 * hs, y: b.pos.y + lat.y * sep * 0.95 * hs };
    const hx = spot.x - h.pos.x;
    const hy = spot.y - h.pos.y;
    const hl = Math.hypot(hx, hy);
    const hk = hl > maxStep ? maxStep / hl : 1;
    h.body.pos = { x: h.pos.x + hx * hk, y: h.pos.y + hy * hk };
    h.body.vel = { x: vx + (hx * hk) / dt * 0.3, y: vy + (hy * hk) / dt * 0.3 };
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
  e.phi *= 0.6;
  e.baseB = Math.max(e.baseB, 0.4);
  b.tags.add('held');
  // Officials see the obvious ones.
  const visible = 0.35 + 0.35 * Math.min(1, Math.abs(e.phi) + (1 - e.baseB));
  if (!sim.penalty && sim.rng.chance(visible)) {
    sim.penalty = { kind: 'holding', against: 'O', playerId: b.player.id, yards: 10, autoFirst: false };
    sim.event('holding', b, e.defender);
  }
  return true;
}

/** Defender wins: disengage with momentum around the blocker. */
function beat(sim: PlaySim, e: Engagement, axis: Vec2, lat: Vec2, run = false): void {
  const d = e.defender;
  const b = e.blocker;
  sim.disengage(e);
  b.shedBy.set(d, sim.t + 0.9);
  b.slowUntil = sim.t + 0.4;
  b.slowFactor = 0.4;
  if (e.baseB <= 0.05) {
    // Jacked back / thrown: the blocker goes down.
    b.downUntil = sim.t + 0.6;
  }
  const s = Math.sign(e.phi) || e.side;
  const dir = norm({ x: axis.x + lat.x * s * 0.6, y: axis.y + lat.y * s * 0.6 });
  d.body.vel = { x: dir.x * 3, y: dir.y * 3 };
  d.tags.add('shed');
  sim.event('shed', d, b, run ? 'off the block' : e.move);
}

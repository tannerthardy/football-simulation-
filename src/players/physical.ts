/**
 * Converts measurables + ratings into the kinematic body the physics uses.
 *
 * Sprint model: v(t) = V(1 − e^(−t/τ)), d(t) = V(t − τ(1 − e^(−t/τ))).
 * Equivalent force law a_drive(v) = (V − v)/τ. V and τ are solved from the
 * player's 10-yard split and 40 time.
 */
import { clamp } from '../core/vec.js';
import { inchesToYards, lbToKg } from '../core/units.js';
import type { Player, Position } from './types.js';
import { r01 } from './types.js';

export interface PhysicalProfile {
  /** Top speed, yd/s. */
  vmax: number;
  /** Sprint time constant, s. */
  tau: number;
  /** Max braking deceleration, yd/s². */
  brake: number;
  /** Max lateral (centripetal) acceleration — cutting ability, yd/s². */
  lateral: number;
  /** Max facing rotation rate, rad/s. */
  turnRate: number;
  /** Speed multiplier when moving backwards relative to facing. */
  backpedal: number;
  /** Speed multiplier when moving sideways relative to facing. */
  shuffle: number;
  massKg: number;
  heightYd: number;
  /** Collision radius, yd. */
  radius: number;
  /** Horizontal reach from body center (catch / tackle radius), yd. */
  reach: number;
  /** Highest point the player can catch the ball with a timed leap, yd. */
  maxCatchHeight: number;
  /** Hands-up height without a timed jump (reacting to a ball overhead), yd. */
  reactReach: number;
  /** Perception delay, s. */
  reactionTime: number;
  /** Functional push force in "body-weight-g" units, used by engagements. */
  power: number;
  /** Two-arm press capacity, kg lifted: the one-rep bench max implied by the
   * combine's 225 lb reps (Epley). Absent without a bench measure; the support
   * model then falls back to its arm-force mapping. */
  press?: number;
  /**
   * Support and contact capacities (see physics/support.ts). Optional so a
   * hand-built test profile still works; the support model derives
   * conservative fallbacks from mass, height and power when they are absent.
   */
  /** 0–1 balance rating: base width and stepping recovery. */
  balance?: number;
  /** 0–1 ability to play low (ankle/hip flexibility from agility drills). */
  bend?: number;
  /** Recovery stepping speed, yd/s: how fast the feet can be re-placed under a displaced body. */
  stepSpeed?: number;
  /** Seconds to get up once on the ground and stopped. */
  getUp?: number;
}

export interface SprintParams {
  vmax: number;
  tau: number;
}

export function sprintDistance(t: number, vmax: number, tau: number): number {
  return vmax * (t - tau * (1 - Math.exp(-t / tau)));
}

/**
 * Solve V and τ such that the sprint model covers 10 yd at `tenSplit` and
 * 40 yd at `forty`. The ratio d(T40)/d(T10) is monotonic increasing in τ.
 */
export function solveSprint(tenSplit: number, forty: number): SprintParams {
  const ratio = (tau: number) =>
    (forty - tau * (1 - Math.exp(-forty / tau))) / (tenSplit - tau * (1 - Math.exp(-tenSplit / tau)));
  let lo = 0.05;
  let hi = 3.0;
  // Infeasible combos (split too slow for the 40) degrade gracefully to the bounds.
  if (ratio(lo) > 4) return fromTau(lo);
  if (ratio(hi) < 4) return fromTau(hi);
  for (let i = 0; i < 60; i++) {
    const mid = 0.5 * (lo + hi);
    if (ratio(mid) < 4) lo = mid;
    else hi = mid;
  }
  return fromTau(0.5 * (lo + hi));

  function fromTau(tau: number): SprintParams {
    const vmax = 10 / (tenSplit - tau * (1 - Math.exp(-tenSplit / tau)));
    return { vmax, tau };
  }
}

/** PEDAL_CAP (on by default; PEDAL_CAP=0 turns it off): for defensive
 * backs and linebackers the backpedal is the slowest way to cover ground
 * backward: the facing cap falls from his side-on value to his backpedal
 * value past 90 deg instead of rising (the curve stays monotonic from
 * forward to backpedal). His backpedal is his own side-on cap times the
 * position's tracked backpedal / side-on ratio, spread by his coverage skill
 * (+-0.06): a fluid corner pedals faster than a stiff one, always below his
 * side-on. The ratio, not the tracked fraction of forward speed, because the
 * tracked fractions are of each player's pre-throw top speed, not his true
 * top speed (our vmax): within a player the ratio cancels that denominator,
 * and in yd/s it lands on the tracked pedal (CB 4.9 vs NFL p95 4.5, S 5.1 vs
 * 5.3, LB 4.4 vs 4.1), where the direct fraction overshot (CB 5.8) and flattened
 * every S and LB against his side-on cap.
 * The build-up follows through (1 - v / cap); no separate acceleration term.
 * NFL envelope, dropbacks snap to release (BDB 2025 weeks 1-2, nflgait.py),
 * p95 speed by the angle between body and travel as a fraction of his own
 * pre-throw top forward speed: CB 0.74 side-on, 0.56 backpedal (ratio .76);
 * S 0.83 / 0.71 (.86; .82 for safeties 10+ yd deep, so not deep drifting
 * misbinned as pedal); off-ball LB 0.73 / 0.58 (.79). Ours before: CB 0.63
 * side-on, 0.75 backpedal (S 0.61 / 0.70, LB 0.59 / 0.61). Chosen speeds,
 * envelope by p95, relative to pre-throw top speed: the shape is the
 * evidence, the level is estimated. Offensive players are unchanged. */
const PEDAL_CAP = process.env.PEDAL_CAP !== '0';
/** PEDAL_CAP: backpedal / side-on cap by position (NFL p95 ratio, nflgait.py). */
const PEDAL_RATIO: Partial<Record<Position, number>> = { CB: 0.76, S: 0.84, LB: 0.79 };

/** Position-typical backpedal/shuffle technique baselines. */
const MOVEMENT_TECHNIQUE: Partial<Record<Position, { backpedal: number; shuffle: number }>> = {
  CB: { backpedal: 0.72, shuffle: 0.62 },
  S: { backpedal: 0.68, shuffle: 0.6 },
  LB: { backpedal: 0.6, shuffle: 0.58 },
  // Kick-slide: tackles are the best backward-lateral movers on the line.
  OT: { backpedal: 0.62, shuffle: 0.6 },
  OG: { backpedal: 0.52, shuffle: 0.55 },
  C: { backpedal: 0.52, shuffle: 0.55 },
  QB: { backpedal: 0.55, shuffle: 0.5 },
};

/** In-game burst: multiplies the sprint time constant (larger = gentler
 * acceleration). Set so free-running players (routes, coverage drops) match
 * the per-play peak accelerations of 2022–2023 NGS tracking measured the
 * same way (scripts/kinematics-compare.ts: WR/TE/RB/CB/S/LB p50 within
 * about 0.6 yd/s²). */
export const GAME_BURST = 2.2;
/** In-game braking/cutting relative to peak plant forces. */
export const GAME_CUT = 0.55;

/** A combine sprint (10-yd split, 40) carried into pads at a body weight: top speed and burst time constant. */
export function inPadsSprint(tenSplit: number, forty: number, weightLb: number): SprintParams {
  const sprint = solveSprint(tenSplit, forty);
  // The 40 is run in shorts on a track. In pads, doing football things,
  // players reach less of that top speed, and big men far less: tracking data
  // puts in-game maxima near 20 mph for receivers and ~15–16 for linemen.
  // Initial burst (top speed / tau) is kept.
  const gameSpeed = clamp(0.95 - 0.0008 * Math.max(0, weightLb - 195), 0.84, 0.95);
  // In-game bursts build more gradually than a combine start: tracking data
  // shows per-play peak accelerations of ~4–5 yd/s², far below what a
  // track-start model gives.
  return { vmax: sprint.vmax * gameSpeed, tau: sprint.tau * gameSpeed * GAME_BURST };
}

export function derivePhysical(p: Player): PhysicalProfile {
  const m = p.measurables;
  const r = p.ratings;
  const { vmax, tau } = inPadsSprint(m.tenSplit, m.forty, m.weightLb);

  const agilitySkill = r01((r.balance + r.elusiveness * 0.5 + r.routeRunning * 0.5) / 2);
  // Short shuttle ~3.95 elite → ~4.8 slow; 3-cone ~6.55 elite → ~8.0 slow.
  const shuttleScore = clamp((4.85 - m.shuttle) / 0.9, 0, 1.2);
  const coneScore = clamp((8.05 - m.threeCone) / 1.5, 0, 1.2);
  const balance = r01(r.balance);

  // Plant-and-cut forces: elite change-of-direction athletes briefly exceed 1.3 g.
  // Sustained braking and cutting over a step or two (instantaneous plant
  // forces are higher, but this is what moves the body between frames).
  const brake = clamp(8.0 + 5.0 * shuttleScore + 1.2 * balance, 7, 15) * GAME_CUT;
  const lateral = clamp(7.5 + 5.5 * coneScore + 1.0 * balance + 0.8 * agilitySkill, 7, 16) * GAME_CUT;
  const turnRate = clamp(5.5 + 5.0 * (0.6 * coneScore + 0.4 * shuttleScore), 4.5, 12);

  const tech = MOVEMENT_TECHNIQUE[p.position] ?? { backpedal: 0.55, shuffle: 0.52 };
  const isOL = p.position === 'OT' || p.position === 'OG' || p.position === 'C';
  const moveSkill = isOL ? r01(r.passBlock) : r01(Math.max(r.manCoverage, r.zoneCoverage));
  const shuffle = clamp(tech.shuffle + 0.06 * (coneScore - 0.5), 0.4, 0.7);
  const pedalRatio = PEDAL_CAP ? PEDAL_RATIO[p.position] : undefined;
  const backpedal = pedalRatio === undefined ? clamp(tech.backpedal + 0.1 * (moveSkill - 0.5), 0.4, 0.8)
    : clamp(shuffle * (pedalRatio + 0.12 * (moveSkill - 0.5)), 0.3, 0.97 * shuffle);

  const massKg = lbToKg(m.weightLb);
  const heightYd = inchesToYards(m.heightIn);
  const radius = clamp(0.24 + (m.weightLb - 180) / 1100, 0.22, 0.42);
  const reach = 0.25 + inchesToYards(m.armIn) * 0.85;
  // Standing reach ≈ 1.33 × height; in-game leaping uses ~80% of combine vertical.
  const maxCatchHeight = inchesToYards(m.heightIn * 1.33 + m.vertical * 0.8);
  const reactReach = inchesToYards(m.heightIn * 1.33 + m.vertical * 0.3);

  const recog = r01(0.65 * r.playRecognition + 0.35 * r.awareness);
  const reactionTime = clamp(0.4 - 0.24 * recog, 0.14, 0.42);

  // Functional strength: bench reps and the strength rating, scaled by mass.
  const strength = r01(0.7 * r.strength + 0.3 * clamp(m.bench * 2.4, 1, 100));
  const power = massKg * (0.55 + 0.75 * strength);
  // Press: the bench max those reps imply, 225 lb x (1 + reps / 30).
  const press = m.bench > 0 ? lbToKg(225) * (1 + m.bench / 30) : undefined;

  // Support: change-of-direction drills measure how quickly the feet can be
  // re-placed; the balance rating covers what drills do not (base width,
  // body control). Heavier bodies step and rise more slowly. These are model
  // mappings, not measured recovery times.
  const agility = clamp(0.5 * coneScore + 0.5 * shuttleScore, 0, 1);
  const bend = clamp(0.5 * coneScore + 0.3 * shuttleScore + 0.2 * balance - (m.heightIn - 74) * 0.02, 0, 1);
  const stepSpeed = clamp(2.6 + 1.4 * agility + 0.6 * balance - 0.004 * (m.weightLb - 200), 2.3, 4.8);
  const getUp = clamp(0.75 + 0.35 * (1 - agility) + 0.0015 * (m.weightLb - 200), 0.6, 1.4);

  return {
    vmax,
    tau,
    brake,
    lateral,
    turnRate,
    backpedal,
    shuffle,
    massKg,
    heightYd,
    radius,
    reach,
    maxCatchHeight,
    reactReach,
    reactionTime,
    power,
    press,
    balance,
    bend,
    stepSpeed,
    getUp,
  };
}

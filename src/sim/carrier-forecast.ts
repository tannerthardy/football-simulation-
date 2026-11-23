/** CARRIER_ACCEL (experimental, off; CARRIER_ACCEL=1 turns it on): one shared forecast of a ball carrier's run, used by
 * every pursuit stage (pursuitPoint's meeting spot and its held spot, OPEN_FIELD's on-top point, and chase's close
 * gather), built only from what the defender sees.
 *
 * Why (docs/reviews/2026-11-23-pursuit-diagnosis.md): every stage forecast the carrier at his seen current speed. Our
 * receivers catch nearly standing (outside catches p50 1.9 -> 3.5 -> 4.2 yd/s at +0.5 / +1.0 s; NFL 5.3 -> 5.0 -> 4.9), so
 * the pursuer committed to a carrier speed of p50 2.2 yd/s against an actual 4.1 at +0.5 s. Our first defender, when beaten
 * or missed on outside catches, lost him to an old angle (29%) or an overrun (26%), against 5% / 2% in the NFL, where the
 * miss mostly comes after reaching contact range (61%).
 *
 * The football: a carrier below running speed, with the ball, facing his line of travel, is about to accelerate along
 * it. A defender expects that from the carrier he sees, not from the carrier's rating: he believes a generic ball
 * carrier's top speed and burst. A carrier who is standing or turning could still go either way, so the anticipated
 * acceleration is weighted by how committed his heading looks. A standing carrier is forecast where he stands, and the
 * pursuer's own leverage shade (unchanged) keeps him on his side. That weight is continuous in the seen speed and in the
 * angle between the carrier's facing and his travel: there is no mode switch (commit-to-a-decision rule).
 *
 * Stated choices (not fitted):
 *  - BELIEF: how a ball carrier is believed to run after the catch, the same for every carrier: he settles toward 5.8
 *    yd/s (BDB 2025, all completions, p50 of the carrier's top speed over the play, pursuit operator) with a 2.4 s time
 *    constant (the same rows: catches under 3 yd/s go 2.0 -> 3.3 yd/s over the first second). Checked against +0.5 s:
 *    2.7 forecast vs 2.6 tracked; from a 4.8 yd/s catch, 5.0 / 5.2 forecast at +0.5 / +1.0 s vs 4.7 / 4.7 tracked. A
 *    combine receiver's sprint (attempt 1: 9.8 yd/s, 1.3 s) forecast 2.0 -> 6.2 yd/s in a second. Real carriers
 *    after a catch run at a cruising speed and read the field; they do not sprint flat out. A carrier above the belief
 *    keeps his own speed.
 *  - COMMIT_SPEED: 1 yd/s. Below a walking pace a body's velocity says little about where he is going. The heading
 *    weight rises linearly from standing to this speed.
 *  - The heading weight also takes the cosine of the angle between his facing and his seen travel, floored at 0. A
 *    receiver still facing the quarterback after the catch has not chosen his line. The facing is the one the defender
 *    holds: it is replaced only when the seen facing differs from it by more than FACING_MARGIN (attempt 1 read the raw
 *    seen facing, and its tick-to-tick noise moved the aim: coverage reversed re-aims 0.395 -> 0.449/s, mode switches
 *    0.026 -> 0.048/s on the dither panel). The hold is per defender and per carrier (commit-to-a-decision rule).
 *  - Open grass is not modelled: the forecast does not slow him for bodies ahead (the pursuer's own approach is what
 *    takes that grass away). The path is clamped to the field as before. */
import { clamp, type Vec2 } from '../core/vec.js';
import type { Perceived } from './perception.js';

export const CARRIER_ACCEL = process.env.CARRIER_ACCEL === '1';
/** A generic ball carrier's in-pads top speed (yd/s) and burst time constant (s), as a defender believes it. */
export const BELIEF = { vmax: 5.8, tau: 2.4 };
/** Seen speed (yd/s) at which his heading counts as fully his. */
const COMMIT_SPEED = 1;
/** A seen facing replaces the held one only past this change (rad; stated choice: 30 deg, beyond a stride's torso swing). */
const FACING_MARGIN = Math.PI / 6;
const heldFacing = new WeakMap<object, { target: object; facing: number }>();

export interface CarrierRun {
  /** Unit heading (his seen travel; +x when he is standing). */
  heading: Vec2;
  /** Seen speed (yd/s). */
  speed: number;
  /** 0..1: how far the defender expects him to accelerate along that heading. */
  commit: number;
}

/** The defender's read of the carrier's run, from one picture. */
export function carrierRun(seen: Perceived, observer?: object, target?: object): CarrierRun {
  const sp = Math.hypot(seen.vel.x, seen.vel.y);
  const heading = sp > 1e-6 ? { x: seen.vel.x / sp, y: seen.vel.y / sp } : { x: 1, y: 0 };
  let facing = seen.facing;
  if (observer && target) {
    const held = heldFacing.get(observer);
    if (held && held.target === target && Math.abs(Math.atan2(Math.sin(seen.facing - held.facing), Math.cos(seen.facing - held.facing))) <= FACING_MARGIN) facing = held.facing;
    else heldFacing.set(observer, { target, facing });
  }
  const facingAlong = Math.max(0, Math.cos(facing) * heading.x + Math.sin(facing) * heading.y);
  const commit = seen.carrying === true ? clamp(sp / COMMIT_SPEED, 0, 1) * facingAlong : 0;
  return { heading, speed: sp, commit };
}

/** Distance along his heading after t s: his seen speed, plus the committed share of the believed acceleration to the
 * believed top speed (none once he runs at or above it). */
export function runDistance(r: CarrierRun, t: number): number {
  const cruise = r.speed * t;
  const { vmax, tau } = BELIEF;
  if (r.commit <= 0 || r.speed >= vmax) return cruise;
  const accel = vmax * t - (vmax - r.speed) * tau * (1 - Math.exp(-t / tau));
  return cruise + r.commit * (accel - cruise);
}

/** His forecast speed along the heading after t s (the derivative of runDistance). */
export function runSpeed(r: CarrierRun, t: number): number {
  const { vmax, tau } = BELIEF;
  if (r.commit <= 0 || r.speed >= vmax) return r.speed;
  return r.speed + r.commit * (vmax - r.speed) * (1 - Math.exp(-t / tau));
}

/** The time at which he has run `d` yd along the heading (runDistance is increasing), up to `horizon`. */
export function runTime(r: CarrierRun, d: number, horizon: number): number {
  if (d <= 0) return 0;
  if (runDistance(r, horizon) < d) return Infinity;
  let lo = 0, hi = horizon;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (runDistance(r, m) < d) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

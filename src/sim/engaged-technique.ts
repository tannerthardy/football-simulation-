/**
 * ENGAGED_TECHNIQUE (default off): an engaged run blocker's feet follow the
 * technique his own job calls for, chosen by his controller from what he
 * sees, instead of one installed rep law for every job.
 *
 * Until now every engaged run blocker requested the same forward drive
 * (2.4 yd/s, a survivor of the pre-physics rep law, where it was the scripted
 * drive speed) along the drive line fixed at contact, plus a mirror of the
 * man's lateral motion. Leg force already comes from World: the requested
 * speed only bounds how fast he will drive a man he is beating, and its
 * direction says where he is trying to take him. Those two are the job's.
 *
 *  - drive: take the man back along the drive line, as fast as his own legs
 *    carry a man (a share of his own top speed), keeping square on him.
 *  - wall: a climber on a backer, with the runner in his pictures. First get
 *    to the man's ball-side shoulder (shuffle with him while he is getting
 *    across), then drive him away from the ball. A sideways push from head-up
 *    only slides off the man (drill D3), so the push needs that shoulder.
 *
 * Contact law, hands, sheds and anchoring are unchanged: World decides what
 * the requested work achieves against the man's own.
 */
import type { Vec2 } from '../core/vec.js';

export const ENGAGED_TECHNIQUE = process.env.ENGAGED_TECHNIQUE === '1';
/** ENGAGED_DEFENDER (default off): an engaged defender off the first-level
 * stack read (box backers, unassigned men) moves on his own controller's
 * request; the contact (hands, bodies, World) decides how far he gets. The
 * rep law no longer authors his feet. Defender behaviour is Defense's: this
 * is the neutral hook. */
export const ENGAGED_DEFENDER = process.env.ENGAGED_DEFENDER === '1';

export type EngagedGoal =
  | { kind: 'drive' }
  /** away: field lateral sign to take the man (away from the ball). */
  | { kind: 'wall'; away: number }
  /** flow: field lateral sign the man is running; take him where he is going. */
  | { kind: 'runWith'; flow: number };

/** Run-with footwork: a backer flowing hard across, with the runner behind
 * his flow, is run past the hole. The blocker keeps his body on the man and
 * goes with his flow at least as fast as the man does (never against it),
 * keeping connected along the contact line. */
export function runWithFeet(lat: Vec2, flow: number, dv: Vec2, seal: number, lateral: number, along: number, gap: number, pace: number):
  { lateral: number; forward: number } {
  const flowLat = Math.sign(lat.y * flow) || 0;
  const manLat = dv.x * lat.x + dv.y * lat.y;
  const go = Math.max(seal * flowLat, manLat * flowLat, 0);
  return { lateral: flowLat * Math.min(go, lateral * 1.5), forward: Math.max(-1, Math.min(pace, along + gap * 3)) };
}

/** Fastest a blocker drives a man he is beating: what his legs give while
 * loaded, a share of his own top speed (an average lineman ~2.4 yd/s, the
 * old constant; quicker or slower men differ). */
export function drivePace(vmax: number): number {
  return 0.4 * vmax;
}

export interface WallInputs {
  /** Engagement lateral axis (perpendicular to the drive/contact axis). */
  lat: Vec2;
  /** Drive direction of the rep (unit). */
  drive: Vec2;
  /** Blocker minus defender position. */
  rel: Vec2;
  /** Defender's seen velocity. */
  dv: Vec2;
  sep: number;
  /** The blocker's capped ordinary seal request along lat (mirror + correction). */
  seal: number;
  /** His lateral shuffle capability (yd/s). */
  lateral: number;
  away: number;
  gap: number;
  /** His drive pace (drivePace). */
  pace: number;
}

/** Wall footwork, in the engagement's lateral frame: returns the lateral and
 * forward requests. */
export function wallFeet(w: WallInputs): { lateral: number; forward: number } {
  // The lat axis component pointing away from the ball, across the field.
  const awayLat = Math.sign(w.lat.y * w.away) || 0;
  // He is on the ball-side shoulder when he is between the man and the ball.
  const ballSide = -(w.rel.x * w.lat.x + w.rel.y * w.lat.y) * awayLat;
  const onShoulder = ballSide >= .3 * w.sep;
  const along = w.dv.x * w.drive.x + w.dv.y * w.drive.y;
  // Stay connected along the contact line without running through him.
  const forward = Math.max(-1, Math.min(w.pace, along + w.gap * 3));
  if (!onShoulder) {
    // Getting there: shuffle with the man toward the ball side (the
    // ordinary seal), never away from it while he is still across.
    const toward = w.seal * awayLat < 0;
    return { lateral: toward ? w.seal : 0, forward };
  }
  // On the shoulder: drive him off the ball, the man's own work against him.
  return { lateral: awayLat * Math.min(w.lateral, .5 * w.lateral + 1), forward };
}

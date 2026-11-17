/**
 * ENGAGED_TECHNIQUE (on by default; ENGAGED_TECHNIQUE=0 turns it off): an engaged run blocker's feet follow the
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

export const ENGAGED_TECHNIQUE = process.env.ENGAGED_TECHNIQUE !== '0';
/** REACH_CARRY (on by default; REACH_CARRY=0 turns it off): a racing reach who has the man's play-side
 * shoulder keeps running at his own race pace and carries the man on his
 * hands, rather than shadowing the man's own lateral speed. Not past the
 * shoulder: a blocker already well across still comes back to it. */
export const REACH_CARRY = process.env.REACH_CARRY !== '0';
/** ENGAGED_DEFENDER (on by default; ENGAGED_DEFENDER=0 turns it off): an engaged defender off the first-level
 * stack read (box backers, unassigned men) moves on his own controller's
 * request; the contact (hands, bodies, World) decides how far he gets. The
 * rep law no longer authors his feet. Defender behaviour is Defense's: this
 * is the neutral hook. */
export const ENGAGED_DEFENDER = process.env.ENGAGED_DEFENDER !== '0';
/** REACH_TECHNIQUE (on by default; REACH_TECHNIQUE=0 turns it off): a zone reach blocker races for his man's
 * play-side shoulder from contact at his own lateral speed, never mirroring
 * away from the play; on the shoulder he holds it and goes at least with the
 * man's flow. With the hands his (control) he steers across the man's face
 * (acts through HAND_MOTOR's arm work) while the man is still on his hands
 * and his own feet are under him. Without it a reach blocker only
 * mirrored his man: a lineman who held still was never reached (outside zone:
 * blocker lateral 0.02 yd from 0.4 to 1.2 s, across his face 9-23%). */
export const REACH_TECHNIQUE = process.env.REACH_TECHNIQUE !== '0';
/** REACH_RACE (on by default; REACH_RACE=0 turns it off): the reach is a race for the man's play-side shoulder, not
 * a mirror of him. Behind the shoulder the blocker opens his hips toward the
 * play (up to 45 degrees off the man) and runs; his lateral request is his
 * open-hip running speed, not his square shuffle. On the shoulder he squares,
 * holds it and goes at least as fast as the man. Physics (facing-dependent
 * speed, traction, the man on his hands, directional leg drive) decides what
 * he achieves and what the open hips cost him. */
export const REACH_RACE = process.env.REACH_RACE !== '0';
/** DOUBLE_TRACK (on by default; DOUBLE_TRACK=0 turns it off): on a stretch call both members of a double keep
 * stepping the zone track with their hands on the man (the play's track
 * tempo, toward the play), instead of mirroring him and holding a spot beside
 * each other. The partner on the man's backside half covers the inside, so
 * the pair can keep stepping without running past him; the man is carried or
 * has to fight it, and the World decides which. */
export const DOUBLE_TRACK = process.env.DOUBLE_TRACK !== '0';
/** Track tempo as a share of vmax (the call's track, blocking.ts zoneFlow). */
export const TRACK_TEMPO = 0.45;
/** How far the racing reach blocker opens his hips off the man (rad). */
export const REACH_RACE_OPEN = Math.PI / 4;

export type EngagedGoal =
  | { kind: 'drive' }
  /** away: field lateral sign to take the man (away from the ball). */
  | { kind: 'wall'; away: number }
  /** flow: field lateral sign the man is running; take him where he is going. */
  | { kind: 'runWith'; flow: number }
  /** side: field lateral sign of the play side, the shoulder he races for. */
  | { kind: 'reach'; side: number };

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

/** Reach footwork in the engagement's lateral frame: not yet on the man's
 * play-side shoulder, work for it at his own shuffle speed; on it, hold it and
 * go at least with the man's flow. Forward work only keeps him connected. */
export function reachFeet(lat: Vec2, side: number, rel: Vec2, dv: Vec2, sep: number, seal: number, lateral: number, along: number, gap: number, race = 0, brake = 0):
  { lateral: number; forward: number; onShoulder: boolean } {
  const playLat = Math.sign(lat.y * side) || 0;
  const across = (rel.x * lat.x + rel.y * lat.y) * playLat;
  const onShoulder = across >= .3 * sep;
  const manLat = (dv.x * lat.x + dv.y * lat.y) * playLat;
  const forward = Math.max(-1, Math.min(2.4, along + gap * 3));
  // REACH_RACE: his pace is the man's own lateral speed plus what still
  // closes the distance to the shoulder (.45 sep across) so that he arrives
  // there level with the man, under a braking budget he can actually use
  // (`brake`, his own braking with a man on his hands):
  // far behind he runs flat out; near it he is going no faster than the man;
  // past it he comes back. A flat full-speed race ran straight through the
  // shoulder and off the man (separations with the blocker outside 19 -> 64).
  if (race) {
    const deficit = .45 * sep - across;
    const close = Math.sign(deficit) * Math.sqrt(2 * brake * Math.abs(deficit));
    const pace = REACH_CARRY && onShoulder && deficit > -.3 * sep ? Math.max(manLat + close, race) : manLat + close;
    return { lateral: playLat * Math.max(-race, Math.min(race, pace)), forward, onShoulder };
  }
  // On the shoulder he seals: square on the man, between him and the
  // sideline. He goes where the man goes, back inside too, and holds the
  // shoulder (running on past it frees the man behind him).
  if (onShoulder) {
    const hold = (.45 * sep - across) * 3;
    return { lateral: playLat * Math.max(-lateral, Math.min(lateral, manLat + hold)), forward, onShoulder };
  }
  return { lateral: playLat * lateral, forward, onShoulder };
}

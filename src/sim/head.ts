/** HEAD (experimental, off; HEAD=1): one head per player (docs/reviews/2026-11-13-perception-proposal.md section 13,
 * agreed with Coverage 2026-11-14). `Agent.head` is where his eyes point (rad, field frame). It is recorded in the
 * perception record each tick, so what he could see at a past moment is judged from where his head was then.
 *
 * His technique, as coached, names one want a tick (`want`): a body or a point, with a reason ('qb', 'ball', the
 * receiver he trails, ...). Ball tracking and the release belief ask through it, and do not turn a head of their own.
 * The head turns toward the want at GAZE's rate, within the neck range of his body facing; with no want it relaxes to
 * his body facing. The neck's range narrows with his speed (`neckRange`). A target nearly behind him is reached over the shoulder the head is already turned to, never by
 * the short way through the front (Coverage's `sideOf`, ball-estimate.ts). Turning further than the neck range is a
 * body turn, which the existing kinematics charge to his running; nothing is added here.
 *
 * The passer's head is QB_BODY_SEEN's, set by his controller, until the QB lane moves it to `want`. */
import type { Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { shouldersOf, TRUNK_RANGE } from '../physics/kinematics.js';
import { ZONE_EYES, zoneEyesFor, zoneEyesTarget } from './zone-eyes.js';

export const HEAD = process.env.HEAD === '1';
/** HEAD_FOLLOW (default on since engine-93; HEAD_FOLLOW=0 restores; Coverage C14, 2026-11-24, an information leak under
 * the user's standing rule): with HEAD off, stepHeads turned only zone-eyed defenders' heads and skipped the passer, so a
 * player whose head nobody drove kept the head he last had while his body turned under it: a match defender converted
 * to man, a zone defender handed to pursuit or a return, the passer once he blocks or pursues after the throw.
 * Perception reads that recorded head (release-evidence's sawAt, the ball estimator), so he saw the passer or the ball
 * through a head up to 180 deg off his body (scripts/diag/coverage/head-audit.mts, one game: man defenders 815 of
 * 15,451 ticks past 145 deg; the neck allows 45-90 off the body, 145 with the trunk's twist for zone eyes). On, a head
 * nobody turns relaxes to his body facing at the head rate within the neck range (this file's stated model), and the
 * passer's head, while a passer's controller runs him, is held within the neck plus the trunk's twist of his body. A man defender's look
 * (his man's hip, then back for the ball) is a later technique; here his head simply follows his body. */
export const HEAD_FOLLOW = process.env.HEAD_FOLLOW !== '0';
/** Head turn rate (rad/s) and the view cone about the head: GAZE's. */
export const HEAD_RATE = 6;
export const HEAD_CONE = Math.PI / 2;
/** The neck's range off body facing, one function for every look (agreed with Coverage, 2026-11-14): 90 deg standing,
 * narrowing linearly in his own speed share to 45 deg at top speed. Standing is anatomy (cervical rotation about 70-80
 * deg a side, plus the eyes, with the target near central vision); the sprint value and the linear shape are stated
 * choices (at a sprint the trunk counter-rotates and the shoulders stay square, so looking back takes the shoulders),
 * with a sensitivity read at 60 deg. A look beyond it is a body turn, priced by the facing kinematics; no speed or catch
 * term is added here. */
export const NECK_STAND = Math.PI / 2;
export const NECK_SPRINT = (45 * Math.PI) / 180;
/** Kept for callers of the old constant: the standing range. */
export const NECK = NECK_STAND;
export function neckRange(a: Agent): number {
  const v = Math.hypot(a.body.vel.x, a.body.vel.y), vmax = a.profile.vmax || 1;
  return NECK_STAND - (NECK_STAND - NECK_SPRINT) * Math.min(1, v / vmax);
}
/** Beyond this off his body, a target is behind him: reached over the shoulder he is already turned to. */
const BEHIND = (150 * Math.PI) / 180;

type Target = Agent | Vec2;
interface Want { target: Target; reason: string; t: number }
const wants = new WeakMap<Agent, Want>();
/** Each change of want's reason, in order: what he was looking for, and since when. */
const history = new WeakMap<Agent, { reason: string; since: number }[]>();

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const isAgent = (t: Target): t is Agent => (t as Agent).idx !== undefined;

/** His technique's want this tick. The last call in a tick wins: a technique names one. */
export function want(sim: PlaySim, a: Agent, target: Target, reason: string): void {
  wants.set(a, { target, reason, t: sim.t });
  const h = history.get(a) ?? [];
  if (!h.length || h[h.length - 1].reason !== reason) { h.push({ reason, since: sim.t }); if (h.length > 64) h.shift(); }
  history.set(a, h);
}

/** What he was looking for at time `t` (the reason and since when), or null before any want. */
export function wantAt(a: Agent, t: number): { reason: string; since: number } | null {
  const h = history.get(a);
  if (!h) return null;
  for (let i = h.length - 1; i >= 0; i--) if (h[i].since <= t + 1e-9) return h[i];
  return null;
}

/** The turn (rad, relative to body facing) toward a target `rel` off his body, given where his head already points
 * (`headRel`): the short way, except for a target behind him, which goes over the shoulder already turned to. */
export function sideOf(rel: number, headRel: number, who?: object): number {
  // LOOK_SIDE_HOLD: a target near dead behind him is reached over one shoulder, chosen once and held. Without the hold, a
  // target within 0.2 rad of straight behind (`headRel` near 0) took the raw sign of `rel`, which flips at +-pi, so the
  // look, and the turn priced off its side (lookJoints), swung to the other shoulder between ticks. The side is kept per
  // man until the target is well forward again (EXIT) and a head clearly turned the other way (over HEAD_PICK) still decides.
  if (Math.abs(rel) <= BEHIND) { if (who && Math.abs(rel) < BEHIND_EXIT) lastSide.delete(who); return rel; }
  const prev = who ? lastSide.get(who) : undefined;
  const side = Math.abs(headRel) >= 0.2 ? Math.sign(headRel) : (prev ?? (Math.sign(rel) || 1));
  if (who) lastSide.set(who, side);
  return Math.sign(rel) === side ? rel : side * (2 * Math.PI - Math.abs(rel));
}
const BEHIND_EXIT = (130 * Math.PI) / 180;
const lastSide = new WeakMap<object, number>();

/** Turn every head for this tick (before the perception record). */
export function stepHeads(sim: PlaySim): void {
  if (!HEAD && !ZONE_EYES) return;
  const step = HEAD_RATE * sim.dt;
  for (const a of sim.agents) {
    if (a === sim.qb) {
      // HEAD_FOLLOW: the passer's head is his controller's while it drives it; once it does not (after the throw he
      // blocks, pursues or carries), it relaxes to his body like anyone's. Either way it is never further off his body
      // than the neck and the trunk's twist allow (a body that turns inside a tick does not leave his eyes behind him).
      if (HEAD_FOLLOW && a.head !== null && a.head !== undefined) {
        // Driven while a passer's controller runs him (any qb-* behaviour, the mesh, the PA fake: they set his head each
        // tick); once he blocks, pursues, carries or chases a loose ball, nothing does.
        const k = (a.behavior as { kind?: string } | undefined)?.kind ?? '';
        const driven = k.startsWith('qb') || k === 'mesh' || k === 'pa-fake';
        a.head = driven ? bodyBound(a, a.head) : turnHead(a, a.head, a.body.facing, step, a.body.facing);
      }
      continue;
    }
    // ZONE_EYES: a zone defender's head turns with HEAD off too, on his shoulders (the neck sits on the trunk).
    const zone = zoneEyesFor(a);
    if (!HEAD && !zone) {
      // HEAD_FOLLOW: an undriven head relaxes to his body facing, within the neck range (never frozen while he turns).
      if (HEAD_FOLLOW && a.head !== null && a.head !== undefined) a.head = turnHead(a, a.head, a.body.facing, step, a.body.facing);
      continue;
    }
    const facing = a.body.facing;
    let head = a.head ?? facing;
    const w = wants.get(a);
    let toward = zone ? shouldersOf(a.body) : facing;
    if (w && w.t >= sim.t - sim.dt - 1e-9) {
      // Where he believes the target is: his own picture of a body, or the point he was given.
      const p = isAgent(w.target) ? (zone ? sim.see(a, w.target).pos : sim.perception.perceive(w.target.idx, a.profile.reactionTime).pos) : w.target;
      toward = Math.atan2(p.y - a.pos.y, p.x - a.pos.x);
    } else if (zone) {
      // ZONE_EYES: nothing else asks; the taught sequence (his key, then the passer), where his own picture has him.
      const t = zoneEyesTarget(a, sim);
      if (t) { const p = sim.see(a, t).pos; toward = Math.atan2(p.y - a.pos.y, p.x - a.pos.x); }
    }
    a.head = turnHead(a, head, toward, step, zone ? shouldersOf(a.body) : facing);
  }
}

/** HEAD_FOLLOW: a head no further off his body facing than the neck's range plus the trunk's twist (the furthest any look
 * reaches: zone eyes turn the neck off the shoulders). */
function bodyBound(a: Agent, head: number): number {
  const lim = neckRange(a) + TRUNK_RANGE, off = angDiff(head, a.body.facing);
  return a.body.facing + Math.max(-lim, Math.min(lim, off));
}

/** The one head turn: from `head` toward the bearing `toward` (rad, field frame) by at most `step` rad, within the
 * neck's range off `base` (his body facing; ZONE_EYES: his shoulders), over the shoulder for a target behind him.
 * stepHeads turns every head with it; the QB lane turns the passer's with it (QB_HEAD). */
export function turnHead(a: Agent, head: number, toward: number, step: number, base = a.body.facing): number {
  const facing = base, neck = neckRange(a);
  const lim = facing + Math.max(-neck, Math.min(neck, sideOf(angDiff(toward, facing), angDiff(head, facing), a)));
  head = head + Math.max(-step, Math.min(step, angDiff(lim, head)));
  return facing + Math.max(-neck, Math.min(neck, angDiff(head, facing)));
}

/** Whether `bearing` (rad, field frame) is inside the cone of a head pointing `head`. */
export function inHeadCone(head: number, bearing: number): boolean {
  return Math.abs(angDiff(bearing, head)) <= HEAD_CONE;
}

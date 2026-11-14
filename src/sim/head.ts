/** HEAD (experimental, off; HEAD=1): one head per player (docs/reviews/2026-11-13-perception-proposal.md section 13,
 * agreed with Coverage 2026-11-14). `Agent.head` is where his eyes point (rad, field frame). It is recorded in the
 * perception record each tick, so what he could see at a past moment is judged from where his head was then.
 *
 * His technique, as coached, names one want a tick (`want`): a body or a point, with a reason ('qb', 'ball', the
 * receiver he trails, ...). Ball tracking and the release belief ask through it, and do not turn a head of their own.
 * The head turns toward the want at GAZE's rate, within the neck range of his body facing; with no want it relaxes to
 * his body facing. A target nearly behind him is reached over the shoulder the head is already turned to, never by
 * the short way through the front (Coverage's `sideOf`, ball-estimate.ts). Turning further than the neck range is a
 * body turn, which the existing kinematics charge to his running; nothing is added here.
 *
 * The passer's head is QB_BODY_SEEN's, set by his controller, until the QB lane moves it to `want`. */
import type { Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export const HEAD = process.env.HEAD === '1';
/** Head turn rate (rad/s), neck range off body facing, and the view cone about the head: GAZE's. */
export const HEAD_RATE = 6;
export const NECK = Math.PI / 2;
export const HEAD_CONE = Math.PI / 2;
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
export function sideOf(rel: number, headRel: number): number {
  if (Math.abs(rel) <= BEHIND || Math.abs(headRel) < 0.2) return rel;
  const side = Math.sign(headRel);
  return Math.sign(rel) === side ? rel : side * (2 * Math.PI - Math.abs(rel));
}

/** Turn every head for this tick (before the perception record). */
export function stepHeads(sim: PlaySim): void {
  if (!HEAD) return;
  const step = HEAD_RATE * sim.dt;
  for (const a of sim.agents) {
    if (a === sim.qb) continue;
    const facing = a.body.facing;
    let head = a.head ?? facing;
    const w = wants.get(a);
    let toward = facing;
    if (w && w.t >= sim.t - sim.dt - 1e-9) {
      // Where he believes the target is: his own picture of a body, or the point he was given.
      const p = isAgent(w.target) ? sim.perception.perceive(w.target.idx, a.profile.reactionTime).pos : w.target;
      toward = Math.atan2(p.y - a.pos.y, p.x - a.pos.x);
    }
    const lim = facing + Math.max(-NECK, Math.min(NECK, sideOf(angDiff(toward, facing), angDiff(head, facing))));
    head = head + Math.max(-step, Math.min(step, angDiff(lim, head)));
    head = facing + Math.max(-NECK, Math.min(NECK, angDiff(head, facing)));
    a.head = head;
  }
}

/** Whether `bearing` (rad, field frame) is inside the cone of a head pointing `head`. */
export function inHeadCone(head: number, bearing: number): boolean {
  return Math.abs(angDiff(bearing, head)) <= HEAD_CONE;
}

/** CATCH_CHOICE (experimental, off; CATCH_CHOICE=1 turns it on): where on the ball's path a receiver plays it.
 *
 * The default TrackBall takes the earliest reachable point (the first sample under 0.92 of his catch height) and paces
 * to arrive there on time: on forced go balls he could reach the QB's aim in stride 96% of the time yet braked from
 * 8.3 to 6.7 yd/s and took it 0.16 s early, about a yard above his chest (forced-meet.ts, engine-44). That is the high
 * point as a default, not a choice.
 *
 * Here the candidates are the reachable segment of the path he is tracking: from that earliest point (the high point,
 * or coming back to a short ball) to the latest point he can still get to with the ball at or above his shoulders (in
 * stride). On it he plays the latest point the nearest defenders, as he sees them, cannot reach before the ball does
 * by at least CHOICE_CUSHION; if no point is safe, the point with the best margin over them (which is usually the
 * earliest: go up and get it). The middle of the segment is just as available as its ends. His read of those margins
 * carries one judgment error per throw, larger with poorer ball tracking. Nothing here awards a catch: the costs are
 * the existing ones (an over-the-shoulder ball at speed, a high ball, a low ball; braking gives up separation). */
import { timeToReach } from '../physics/reach.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import type { Vec2 } from '../core/vec.js';
import { FIELD_WIDTH } from '../core/field.js';

export const CATCH_CHOICE = process.env.CATCH_CHOICE !== '0';
/** He wants the ball to beat the defender to the point by this much (s) before he trusts a later point. */
export const CHOICE_CUSHION = 0.1;
/** The lowest ball he plans to catch in stride, as a share of his height: his hands carried at his shoulders while
 * he runs (estimated). A lower ball means reaching down out of his stride; he plays it only by coming back to it. */
export const CHOICE_SHOULDER = 0.82;

export interface CatchChoice { p: Vec2; t: number; z: number; margin: number; latest: boolean; earliest: boolean }

/** The point on the remaining path he plays, or null when no point is reachable (the caller falls back to catchSpot). */
export function chooseCatchPoint(a: Agent, sim: PlaySim, judge: number): CatchChoice | null {
  const top = a.profile.maxCatchHeight * 0.92;
  const reachable: { p: Vec2; t: number; z: number }[] = [];
  for (const s of sim.ballPath) {
    if (s.t < sim.t) continue;
    if (s.z > top) { if (reachable.length) break; continue; }
    if (s.z < CHOICE_SHOULDER * a.profile.heightYd) break;
    if (s.y < 0.3 || s.y > FIELD_WIDTH - 0.3) continue;
    const p = { x: s.x, y: s.y };
    if (timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, p, a.profile.reach * 0.8) <= s.t - sim.t) reachable.push({ p, t: s.t, z: s.z });
  }
  if (!reachable.length) return null;
  // The defenders who matter: the two nearest to him, as he sees them.
  const seen = sim.opponents(a).filter((d) => !d.isDown(sim.t)).map((d) => ({ d, s: sim.see(a, d) }))
    .sort((u, v) => Math.hypot(u.s.pos.x - a.pos.x, u.s.pos.y - a.pos.y) - Math.hypot(v.s.pos.x - a.pos.x, v.s.pos.y - a.pos.y)).slice(0, 2);
  const margin = (c: { p: Vec2; t: number }): number => {
    let m = Infinity;
    for (const { d, s } of seen) {
      const td = timeToReach({ pos: s.pos, vel: s.vel, profile: d.profile, speedScale: d.speedScale }, c.p, d.profile.reach + 0.3);
      m = Math.min(m, td - (c.t - sim.t));
    }
    return m + judge;
  };
  let best: CatchChoice | null = null, safest: CatchChoice | null = null;
  for (let i = 0; i < reachable.length; i++) {
    const c = reachable[i], m = margin(c);
    const choice = { ...c, margin: m, latest: i === reachable.length - 1, earliest: i === 0 };
    if (m >= CHOICE_CUSHION) best = choice; // later safe points replace earlier ones: he keeps his stride as long as it is safe
    if (!safest || m > safest.margin) safest = choice;
  }
  return best ?? safest;
}

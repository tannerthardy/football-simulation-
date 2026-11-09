/**
 * Blocking in space: whom to block and where to meet him, from what the
 * blocker sees (docs/football-handbook/screens.md, "the most dangerous man").
 *
 * A blocker in space is not assigned a man; he is assigned a ball carrier to
 * protect. The coaching rule is "block the man who can make the play, from
 * where you can get to him": never pass a threat to block a man who cannot
 * reach the ball, and never chase a man you cannot get in front of.
 *
 *  1. Lane. Where the carrier will run: the catch point (or the carrier),
 *     then on along his motion and upfield.
 *  2. Threat. For each defender he sees, the earliest time that defender can
 *     reach the lane and where (the same intercept estimate a pursuer uses on
 *     the carrier). A man who cannot reach the lane before the carrier passes
 *     is no threat, however close he is.
 *  3. Fit. Where the blocker can get onto that defender's track to the lane
 *     before the defender passes it. The slack between his arrival and the
 *     defender's is how sure the block is.
 *  4. Matching. Threats in order of urgency, each to the blocker with the
 *     most slack on him; a threat nobody can fit is left for the carrier to
 *     beat. Every blocker solves this from his own picture and takes his own
 *     row: nobody reads another player's assignment, only where teammates
 *     are and whom they are already on.
 *
 * Nothing here moves a body or decides a block; it chooses a man and a
 * meeting point. The run engagement decides what happens at contact.
 */
import { clamp, norm, type Vec2 } from '../../core/vec.js';
import { FIELD_WIDTH } from '../../core/field.js';
import { interceptPoint, type Mover } from '../../physics/reach.js';
import type { Agent } from '../agent.js';
import type { Perceived } from '../perception.js';
import type { PlaySim } from '../playsim.js';

/** How far ahead the blocker forecasts (s). */
const HORIZON = 3;
/** Tackle reach: a defender within this of the lane can make the play. */
const TACKLE_REACH = 1.2;
/** Meet him at least this long before he reaches the lane (s). */
const AHEAD = 0.2;
/**
 * A blocker who gets there this late (s) still gets a body on the man as he
 * arrives: in the way, if not square. Later than that he is chasing.
 */
export const LATE = 0.25;

/** The carrier's expected path from now: position at time t (s from now). */
export type Lane = (t: number) => Vec2;

/**
 * A lane that starts at `from` once the carrier is there (`delay` s from now),
 * then runs along `heading` at a carrier's running speed, accelerating from
 * `speed0`.
 */
export function laneFrom(from: Vec2, heading: Vec2, delay: number, speed0: number): Lane {
  const u = norm(heading);
  // A carrier in traffic: NFL screen carriers are at about 5 yd/s a second
  // after the catch (screen_reference.py positional YAC), not at top speed.
  const v1 = 5.5, tau = 0.8;
  return (t: number) => {
    const s = Math.max(0, t - delay);
    const d = v1 * s - (v1 - Math.min(speed0, v1)) * tau * (1 - Math.exp(-s / tau));
    return { x: from.x + u.x * d, y: clamp(from.y + u.y * d, 0.5, FIELD_WIDTH - 0.5) };
  };
}

/**
 * The lane as `observer` sees it. Before the catch: the designed catch point,
 * reached when the ball arrives, then upfield. After it: from where he sees
 * the carrier, along his motion bent upfield.
 */
export function carrierLane(sim: PlaySim, observer: Agent, spot: Vec2): Lane {
  const dir = sim.attackDir(observer.team);
  const c = sim.carrier;
  if (c && c.team === observer.team && c !== sim.qb) {
    const s = sim.see(observer, c);
    const sp = Math.hypot(s.vel.x, s.vel.y);
    return laneFrom(s.pos, { x: s.vel.x + dir * 3, y: s.vel.y }, 0, sp);
  }
  // The ball's remaining flight (he sees it in the air), or a nominal throw
  // and flight before it is out.
  const delay = sim.ball.kind === 'air' ? Math.max(0, sim.ball.arrivalT - sim.t) : 0.6;
  return laneFrom(spot, { x: dir, y: 0 }, delay, 0);
}

export interface Threat {
  d: Agent;
  seen: Perceived;
  /** When he can reach the lane (s from now). */
  t: number;
  /** Where on the lane. */
  at: Vec2;
}

const moverOf = (a: Agent, s?: Perceived): Mover =>
  ({ pos: s ? s.pos : a.pos, vel: s ? s.vel : a.vel, profile: a.profile, speedScale: a.speedScale });

/** When and where `d`, as `observer` sees him, can reach the lane; null if not before the horizon. */
export function threatOf(sim: PlaySim, observer: Agent, d: Agent, lane: Lane, seen = sim.see(observer, d)): Threat | null {
  const ip = interceptPoint(moverOf(d, seen), lane, { horizon: HORIZON, step: 0.1, radius: TACKLE_REACH });
  if (ip.estimate.status !== 'estimated-feasible') return null;
  return { d, seen, t: ip.t, at: ip.point };
}

export interface Fit {
  /** Where to meet him on his track to the lane. */
  point: Vec2;
  /** Spare time (s): how much earlier the blocker can be there than he must. Negative: he cannot fit. */
  slack: number;
}

/**
 * Where blocker `b` can get onto the threat's track to the lane. The track is
 * a straight run from where he is seen to where he meets the lane. The
 * blocker takes the meeting point halfway between the earliest he can reach
 * the track and the last moment before the defender gets to the lane: early
 * enough to set, late enough not to run past the ball to block a man far away.
 */
export function fitOn(b: Agent, th: Threat): Fit {
  const from = th.seen.pos, to = th.at, T = Math.max(0.1, th.t);
  const track = (s: number): Vec2 => {
    const k = Math.min(1, s / T);
    return { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
  };
  const latest = Math.max(0, T - AHEAD);
  const contact = b.profile.radius + th.d.profile.radius;
  const ip = interceptPoint(moverOf(b), track, { horizon: latest, step: 0.05, radius: contact });
  if (ip.estimate.status !== 'estimated-feasible') {
    // He cannot beat the defender to the lane; the best he can do is late.
    return { point: track(latest), slack: -(ip.estimate.arrivalTime ?? Infinity) + latest };
  }
  const meet = ip.t + 0.5 * (latest - ip.t);
  return { point: track(meet), slack: latest - ip.t };
}

export interface Candidate {
  /** A blocker who can still take a man: not engaged, on his feet. */
  b: Agent;
  /** Seconds of slack he gives up to take a man outside his job's area (by threat). */
  bias: (th: Threat) => number;
  /** He is already on this man (within a few yards and closing): keep him. */
  on?: Agent | null;
}

/**
 * Match threats to blockers: most urgent threat first, to the free blocker
 * with the most slack on him (less his job bias). A blocker already on a man
 * keeps him. A threat nobody can fit (even late, in the way) is skipped.
 * Returns each blocker's man and fit.
 */
export function matchThreats(threats: Threat[], blockers: Candidate[]): Map<Agent, { th: Threat; fit: Fit }> {
  const out = new Map<Agent, { th: Threat; fit: Fit }>();
  const free = new Set(blockers);
  const left = [...threats].sort((p, q) => p.t - q.t);
  for (const c of blockers) {
    const th = c.on && left.find(x => x.d === c.on);
    if (!th) continue;
    out.set(c.b, { th, fit: fitOn(c.b, th) });
    free.delete(c);
    left.splice(left.indexOf(th), 1);
  }
  for (const th of left) {
    if (!free.size) break;
    let best: { c: Candidate; fit: Fit; score: number } | null = null;
    for (const c of free) {
      const fit = fitOn(c.b, th);
      if (fit.slack <= -LATE) continue;
      const score = fit.slack - c.bias(th);
      if (!best || score > best.score) best = { c, fit, score };
    }
    if (!best) continue;
    out.set(best.c.b, { th, fit: best.fit });
    free.delete(best.c);
  }
  return out;
}

/**
 * The earliest point where blocker `b` can get his body onto the defender's
 * run to `goal` (the carrier, or where he meets the carrier's lane) before
 * the defender passes it. The defender is taken to run straight at the goal
 * at the larger of his seen speed and a pursuit pace. Null when the blocker
 * cannot get there first.
 */
export function meetOnTrack(b: Agent, d: Agent, seen: Perceived, goal: Vec2): Vec2 | null {
  const L = Math.hypot(goal.x - seen.pos.x, goal.y - seen.pos.y);
  if (L < 0.5) return null;
  const ux = (goal.x - seen.pos.x) / L, uy = (goal.y - seen.pos.y) / L;
  const v = Math.max(4.5, seen.vel.x * ux + seen.vel.y * uy);
  const T = L / v;
  const track = (s: number): Vec2 => {
    const k = Math.min(L, v * s);
    return { x: seen.pos.x + ux * k, y: seen.pos.y + uy * k };
  };
  const ip = interceptPoint(moverOf(b), track, { horizon: T, step: 0.05, radius: b.profile.radius + d.profile.radius });
  return ip.estimate.status === 'estimated-feasible' ? ip.point : null;
}

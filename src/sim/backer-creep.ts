/**
 * BACKER_CREEP (experimental, off): box backers creeping into the snap.
 *
 * NFL box linebackers (2022 tracking, 1.6-7 yd deep within 6 yd of the
 * centre of the line): in the last 0.1 s before the snap 37-38% are moving
 * faster than 0.5 yd/s, on runs and dropbacks alike, and of those about 60%
 * downhill (median +0.4 yd/s); they stand 0.1-0.4 yd closer than the rest.
 * It is the backer timing the cadence and walking into his read step, not a
 * reaction to the play. Ours stood still until the snap and then held for
 * the snap response (about 0.2 s).
 *
 * A backer who creeps chooses to, from his anticipation, a fraction of a
 * second before the snap; he walks downhill at a creep pace and, having timed
 * the count to do it, is already moving when the ball is snapped (his start
 * is the snap, not the snap plus a visual response). The cost is real: he is
 * closer to the line and moving forward when a pass shows, and a hard count
 * still catches him (he is not on the line, so it is not a penalty, only
 * ground given). Called blitzers keep their own creep (BLITZ_CREEP).
 */
import type { Rng } from '../core/rng.js';
import type { Agent } from './agent.js';

export const BACKER_CREEP = process.env.BACKER_CREEP !== '0';
/** Chance a box backer creeps: base plus his anticipation (avg about 0.4). */
const CREEP_BASE = 0.2, CREEP_ANTICIPATION = 0.4;
/** Seconds before the snap he starts, and his creep pace (yd/s). */
const CREEP_START: [number, number] = [0.3, 0.6], CREEP_PACE: [number, number] = [0.4, 0.8];

export interface CreepPlan { start: number; pace: number }
/** A backer's creep pace (yd/s), kept after the snap: until his read he keeps walking into it. */
export const creepPace = new WeakMap<Agent, number>();

/** Box backer: a linebacker off the ball (2.5-7 yd) within 6 yd of the ball, not a called blitzer. */
export function planBackerCreeps(defense: readonly Agent[], los: number, ballY: number,
  isBlitzer: (a: Agent) => boolean, rng: Rng): Map<Agent, CreepPlan> {
  const plans = new Map<Agent, CreepPlan>();
  for (const a of defense) {
    if (!/^LB/.test(a.slot) || isBlitzer(a)) continue;
    const depth = a.pos.x - los;
    if (depth < 2.5 || depth > 7 || Math.abs(a.pos.y - ballY) > 6) continue;
    if (!rng.chance(CREEP_BASE + CREEP_ANTICIPATION * a.r('anticipation'))) continue;
    const plan = { start: rng.range(...CREEP_START), pace: rng.range(...CREEP_PACE) };
    plans.set(a, plan); creepPace.set(a, plan.pace);
  }
  return plans;
}

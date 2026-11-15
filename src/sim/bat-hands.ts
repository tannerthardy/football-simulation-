/** BAT_HANDS (experimental, off; BAT_HANDS=1): a pass batted at the line is the rusher's hands meeting the ball
 * (docs/reviews/2026-11-15-bat-at-the-line.md; Integration, 2026-11-15). Off, a defender in the bat window rolled
 * pBat (0.04 engaged / 0.12 free, x facing, x recognition) whatever his hands were doing.
 *
 * - **Hands up on reading the throw.** A rusher raises his hands when he sees the QB's throwing motion (the QB's arm
 *   loading or delivering, from the perception record at his sight delay, 0.12 + 0.12 x (1 - his recognition)), with
 *   the QB in his view cone, and he is not close enough to hit him (beyond the bodies plus his reach). He keeps them
 *   up until the ball is past him. The hands travel from his shoulders to his raised reach at ARM_SPEED: the level
 *   (0..1) is the share of that travel made.
 * - **The cost.** Hands going up are hands not rushing. His request is scaled down with the level (speed by
 *   1 - 0.7 x level, push by 1 - level), engaged or free; an engaged man's hands come off the blocker to go up, so a
 *   blocker who keeps him busy keeps the lane clean, as taught.
 * - **The contact** (catching.ts): in the first 0.4 s of flight, a ball whose path passes through his raised hands
 *   (horizontally within his body plus a hand, 0.25 yd; vertically below the top of his hands at their level) is
 *   tipped, once, by geometry. Where it goes comes from the contact: its speed cut, its part into the hands reversed,
 *   popping up.
 * Ratings set how early he reads (recognition) and his envelope (height, arm length, vertical): never the bat. A pump
 * fake that gets his hands up is the honest consequence, not modelled now. */
import { ARM_SPEED } from '../physics/actuation.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import { inHeadCone } from './head.js';
import type { PlaySim } from './playsim.js';
import { bodyHeight, SHOULDER } from './sight.js';

export const BAT_HANDS = process.env.BAT_HANDS === '1';
const level = new WeakMap<Agent, number>();
/** How long after he saw the arm deliver he keeps his hands up if the ball has not yet passed him (s). The ball
 * reaches the line within about 0.2 s of its release. */
const HOLD_UP = 0.6;
const upSince = new WeakMap<Agent, number>();

/** His hands' level, 0 (at his shoulders or on a blocker) to 1 (raised to his reach). */
export function handsLevel(a: Agent): number { return level.get(a) ?? 0; }
/** The top of his hands at their level (yd). */
export function handsTop(a: Agent): number {
  const sh = bodyHeight(a, SHOULDER);
  return sh + handsLevel(a) * Math.max(0, a.profile.reactReach - sh);
}

/** One tick: who raises his hands, how far they have gone, and what it costs his request. */
export function stepBatHands(sim: PlaySim, intents: Intent[]): void {
  if (!BAT_HANDS || !sim.qb) return;
  const qb = sim.qb;
  for (const d of sim.defense) {
    const kind = d.behavior.kind;
    if (kind !== 'rush' && kind !== 'blitz' && !d.engagement) { level.delete(d); continue; }
    if (d.isDown(sim.t)) { level.set(d, 0); continue; }
    const delay = (0.12 + 0.12 * (1 - d.r('playRecognition'))) / Math.max(0.1, d.profile.reactionTime);
    const seen = sim.see(d, qb, delay);
    const bearing = Math.atan2(seen.pos.y - d.pos.y, seen.pos.x - d.pos.x);
    const reachQb = d.profile.radius + qb.profile.radius + d.profile.reach;
    const throwing = (seen.arm === 'load' || seen.arm === 'deliver') && inHeadCone(d.head ?? d.body.facing, bearing)
      && Math.hypot(seen.pos.x - d.pos.x, seen.pos.y - d.pos.y) > reachQb;
    if (throwing) upSince.set(d, sim.t);
    // The ball past him (its flight beyond him toward the receiver): his hands come down.
    const past = sim.ball.kind === 'air' && (sim.ball.flight.pos.x - d.pos.x) * sim.attackDir(qb.team) > 0.5;
    const want = !past && sim.t - (upSince.get(d) ?? -Infinity) <= HOLD_UP;
    const travel = Math.max(0.3, d.profile.reactReach - bodyHeight(d, SHOULDER));
    const prev = level.get(d) ?? 0, step = ARM_SPEED * sim.dt / travel;
    const now = want ? Math.min(1, prev + step) : Math.max(0, prev - step);
    level.set(d, now);
    if (now > 0) {
      d.tags.add('hands-up');
      const it = intents[d.idx];
      if (it) intents[d.idx] = { ...it, vel: { x: it.vel.x * (1 - 0.7 * now), y: it.vel.y * (1 - 0.7 * now) }, push: (it.push ?? 1) * (1 - now) };
    }
  }
}

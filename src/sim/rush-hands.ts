/** RUSH_RELEASE, step 2 (release-belief.ts): a pass batted at the line is the rusher's raised hands meeting the ball, by
 * geometry (Flex's BAT_HANDS geometry, docs/reviews/2026-11-15-bat-at-the-line.md, with the raise decision replaced).
 * Off, a defender in the bat window rolled pBat (0.04 engaged / 0.12 free, x facing, x recognition) whatever his hands
 * were doing; BAT_HANDS raised every rusher's hands on the windup and batted three times the NFL's rate per crossing.
 *
 * - **Hands up only if he chose it**: his held pull-up (`rushRelease` in behaviors/defense.ts: on the passer's set he
 *   sees, or the load, he judged he cannot get to the passer before the ball leaves as he expects it). They come down
 *   once he believes it thrown.
 * - **Engaged, his hands are on the blocker first**: before they can rise they come back off him, one arm's length at
 *   HAND_TRAVEL. Hands off the man are hands not driving him: his push in the rep is scaled by (1 - level). That is his
 *   own request; the hands joint and its press / liftFelt accounting are the engagement's and are not touched.
 * - **They travel**: from his shoulders (or from the blocker, plus the arm's length back) to his reaction reach (height
 *    x 1.33 + 0.3 x vertical) at HAND_TRAVEL (Tools, the unloaded hand's speed), up and down; the level (0..1) is the share of that travel made.
 * - **The contact** (catching.ts `defenderPlay`): in the bat window, a ball through his raised hands (within his body
 *   plus a hand, 0.25 yd, of his centre; between his shoulders and the top of his hands) is tipped, once; one below
 *   his shoulders on his body comes off it; over or wide, nothing.
 * Ratings set how early he reads the load (his delay) and his envelope (height, arms, vertical): never the bat. */
import { HAND_TRAVEL } from '../physics/actuation.js';
import type { Agent } from './agent.js';
import type { Intent } from '../physics/world.js';
import type { PlaySim } from './playsim.js';
import { RUSH_RELEASE } from './release-belief.js';
import { bodyHeight, SHOULDER } from './sight.js';

/** Whether his decision on the load wants his hands up now (set by `rushRelease`). */
export const handsWanted = new WeakMap<Agent, boolean>();
const level = new WeakMap<Agent, number>();
/** The part of his travel spent bringing his hands back off a blocker (yd; 0 when they started free). */
const offBlocker = new WeakMap<Agent, number>();

const lift = (a: Agent) => Math.max(0.3, a.profile.reactReach - bodyHeight(a, SHOULDER));
/** His hands' level, 0 (at his shoulders or on a blocker) to 1 (raised to his reaction reach). */
export function handsLevel(a: Agent): number { return level.get(a) ?? 0; }
/** How far his hands have risen above his shoulders, as a share of the lift (0 while still coming off a blocker). */
function raised(a: Agent): number {
  const off = offBlocker.get(a) ?? 0, total = off + lift(a);
  return Math.max(0, (handsLevel(a) * total - off) / lift(a));
}
/** The top of his hands at their level (yd); at his shoulders until they are up off a blocker. */
export function handsTop(a: Agent): number {
  return bodyHeight(a, SHOULDER) + raised(a) * lift(a);
}
/** Whether his hands are above his shoulders (in the lane). */
export function handsRaised(a: Agent): boolean { return raised(a) > 0; }

/** One tick, after the engagements: each defender's hands toward where his decision lets them be, and what hands off
 * the man cost his push. */
export function stepRushHands(sim: PlaySim, intents: Intent[]): void {
  if (!RUSH_RELEASE) return;
  for (const d of sim.defense) {
    const prev = level.get(d) ?? 0;
    const kind = d.behavior?.kind, rushing = kind === 'rush' || kind === 'blitz';
    const want = rushing && handsWanted.get(d) === true && !d.isDown(sim.t);
    if (!want && prev === 0) continue;
    // A raise from rest starts where his hands are: on the man he is engaged with (an arm's length to come back), or free.
    if (prev === 0) offBlocker.set(d, d.engagement ? d.player.measurables.armIn / 36 : 0);
    const total = (offBlocker.get(d) ?? 0) + lift(d), step = HAND_TRAVEL * sim.dt / total;
    const now = want ? Math.min(1, prev + step) : Math.max(0, prev - step);
    level.set(d, now);
    if (now > 0) d.tags.add('hands-up');
    const it = intents[d.idx];
    if (now > 0 && d.engagement && it) intents[d.idx] = { ...it, push: (it.push ?? 1) * (1 - now) };
  }
}

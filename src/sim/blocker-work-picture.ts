/** A free blocker's reference for useful work, from his own delivered pictures.
 * This is neither a global possession query nor a future runner-path forecast.
 */
import type { Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export interface BlockerWorkPicture {
  at: number;
  nextRead: number;
  carrier: number | null;
  source: 'acquired' | 'installed';
  pos: Vec2;
  vel: Vec2;
}

export function readBlockerWorkPicture(a: Agent, sim: PlaySim): BlockerWorkPicture {
  let best: { idx: number; age: number; pos: Vec2; vel: Vec2 } | null = null;
  for (const mate of sim.offense) {
    const seen = sim.see(a, mate);
    if (!seen.carrying) continue;
    const age = seen.age ?? Infinity;
    // Independently delayed pictures can disagree at an exchange. Use the
    // freshest positive evidence, with stable installed identity as a tie.
    if (!best || age < best.age || (age === best.age && mate.idx < best.idx))
      best = { idx: mate.idx, age, pos: { ...seen.pos }, vel: { ...seen.vel } };
  }
  return {
    at: sim.t, nextRead: sim.t + a.mind.decisionInterval,
    carrier: best?.idx ?? null, source: best ? 'acquired' : 'installed',
    pos: best?.pos ?? { x: sim.los, y: sim.ballY },
    vel: best?.vel ?? { x: 0, y: 0 },
  };
}

/** The delivered picture is already dead-reckoned through observation age.
 * Advance only the time held since acquisition, bounded by the normal beat.
 */
export function blockerWorkPoint(read: BlockerWorkPicture, now: number): Vec2 {
  const dt = Math.max(0, Math.min(now, read.nextRead) - read.at);
  return { x: read.pos.x + read.vel.x * dt, y: read.pos.y + read.vel.y * dt };
}

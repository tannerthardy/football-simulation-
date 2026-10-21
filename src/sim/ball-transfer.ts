/** A handoff reaches the receiver's torso; a distant toss is a ball flight. */
import type { Agent } from './agent.js';

export function handoffReach(from: Agent, to: Agent): number {
  return from.profile.reach + to.profile.radius;
}

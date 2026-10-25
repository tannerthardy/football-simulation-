/** Optional observation of values already consumed by the contact controller.
 * No additional perceptions, random draws, or World previews. */
import type { PlaySim } from './playsim.js';
import type { Engagement } from './agent.js';

export const runContactObservers = new WeakMap<PlaySim,
  (rep: Engagement, phase: string, data: Record<string, unknown>) => void>();

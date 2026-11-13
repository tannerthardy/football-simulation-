/** Opt-in diagnostic sink. Never asks for a new perception or consumes RNG.
 * Callers pass the values they already used; the default has no observer. */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export interface RunReadObservation {
  phase: string;
  t: number;
  actor: number;
  [key: string]: unknown;
}
export const runReadObservers = new WeakMap<PlaySim, (event: RunReadObservation) => void>();
export function observeRunRead(sim: PlaySim, a: Agent, phase: string, data: Record<string, unknown>): void {
  runReadObservers.get(sim)?.({ phase, t: sim.t, actor: a.idx, ...data });
}

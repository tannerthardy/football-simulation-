/** Opt-in command attribution. Callers supply values already computed by the
 * live controller; this module never senses, predicts, or consumes RNG.
 * Detached payloads prevent an evidence sink from editing the live command.
 */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export interface CommandObservation {
  t: number;
  actor: number;
  behavior: string;
  stage: string;
  [key: string]: unknown;
}
interface Registration {
  sim: PlaySim;
  sink: (event: CommandObservation) => void;
}
const observers = new WeakMap<Agent, Registration>();

/** Register only the actors of interest. Removal does not affect a later
 * registration. No observer is installed in ordinary play. */
export function observeCommands(sim: PlaySim, actors: readonly Agent[],
  sink: (event: CommandObservation) => void): () => void {
  const registration = { sim, sink };
  for (const a of actors) observers.set(a, registration);
  return () => {
    for (const a of actors) if (observers.get(a) === registration) observers.delete(a);
  };
}

export function observeCommand(a: Agent, stage: string, data: Record<string, unknown>): void {
  const registration = observers.get(a);
  if (registration) registration.sink({ t: registration.sim.t, actor: a.idx,
    behavior: a.behavior.kind, stage, ...structuredClone(data) });
}

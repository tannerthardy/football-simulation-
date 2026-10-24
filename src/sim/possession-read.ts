/** Decision evidence, separate from authoritative possession in PlaySim.
 * Known opponents are queried through the observer's existing delayed channel;
 * the current holder never selects which body gets observed. This channel
 * models latency, not gaze/occlusion, and does not certify a catch from flight. */
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

export interface PossessionRead { target: Agent; cue: Perceived }
type FlightSample = PlaySim['ballPath'][number];
const flights = new WeakMap<Agent, { acquiredAt: number; path: FlightSample[];
  opportunity?: { receiver: Agent; t: number } }>();

/** Called only after the existing throw-recognition gate. Copy the acquired
 * trajectory, never an intended receiver or a private catch result. */
export function acquireFlight(a: Agent, sim: PlaySim): FlightSample[] {
  const path = sim.ballPath.map(p => ({ ...p }));
  flights.set(a, { acquiredAt: sim.t, path });
  return path;
}

/** A forecast remains a possibility until its own ground endpoint. There is
 * no extension of body history and no claim that a receiver caught it. */
export function rememberedFlight(a: Agent, t: number): FlightSample[] | null {
  const path = flights.get(a)?.path;
  return path?.length && t <= path[path.length - 1].t ? path : null;
}

export function hasObservedFlight(a: Agent): boolean { return flights.has(a); }

/** The first catch opportunity on an acquired trajectory is a hypothesis,
 * not the real catcher's identity. A visible tip replaces it with the path. */
export function rememberCatchOpportunity(a: Agent, opportunity: { receiver: Agent; t: number } | null): void {
  const flight = flights.get(a);
  if (flight) flight.opportunity = opportunity ? { receiver: opportunity.receiver, t: opportunity.t } : undefined;
}

export function anticipatedCatcher(a: Agent, sim: PlaySim): PossessionRead | null {
  const opportunity = flights.get(a)?.opportunity;
  if (!opportunity || sim.t < opportunity.t || !rememberedFlight(a, sim.t)) return null;
  const cue = sim.see(a, opportunity.receiver);
  // An empty image from before the opportunity says nothing about its result.
  // Newer empty evidence refutes this hypothesis; unknown stays unknown.
  if (cue.carrying === false && cue.age !== undefined && sim.t - cue.age > opportunity.t) return null;
  return { target: opportunity.receiver, cue };
}

export function observedHolder(a: Agent, sim: PlaySim): PossessionRead | null {
  let newest: PossessionRead | null = null;
  let ambiguous = false;
  let unknownTime = false;
  const flight = flights.get(a);
  for (const target of sim.opponents(a)) {
    const cue = sim.see(a, target);
    if (cue.carrying !== true) continue;
    if (cue.age === undefined) { unknownTime = true; continue; }
    // The observer subsequently saw an unheld ball in flight. An earlier
    // held-body image (or one with unknown time) cannot undo that evidence.
    if (flight && sim.t - cue.age <= flight.acquiredAt) continue;
    if (!newest) { newest = { target, cue }; continue; }
    // Peripheral/key pictures can have different timestamps. An earlier QB
    // image must not outweigh a later acquired exchange. Incomparable or
    // equally recent affirmative pictures leave identity unresolved.
    if (cue.age < newest.cue.age!) { newest = { target, cue }; ambiguous = false; }
    else if (cue.age === newest.cue.age) ambiguous = true;
  }
  return ambiguous || unknownTime ? null : newest;
}

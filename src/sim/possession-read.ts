/** Decision evidence, separate from authoritative possession in PlaySim.
 * Known opponents are queried through the observer's existing delayed channel;
 * the current holder never selects which body gets observed. This channel
 * models latency, not gaze/occlusion, and does not certify a catch from flight. */
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import { BALL_EST } from './ball-estimate.js';

export interface PossessionRead { target: Agent; cue: Perceived }
type FlightSample = PlaySim['ballPath'][number];
const flights = new WeakMap<Agent, { acquiredAt: number; path: FlightSample[];
  opportunity?: { receiver: Agent; t: number }; resolved?: boolean }>();

/** Called only after the existing throw-recognition gate. Copy the acquired
 * trajectory, never an intended receiver or a private catch result. */
export function acquireFlight(a: Agent, sim: PlaySim): FlightSample[] {
  // BALL_EST: his own estimate from the ball he has seen (empty until he has two samples), not the true path.
  const path = BALL_EST ? sim.ballEstimates.estimate(a, sim).map(p => ({ ...p })) : sim.ballPath.map(p => ({ ...p }));
  if (BALL_EST && !path.length) return path;
  flights.set(a, { acquiredAt: sim.t, path });
  return path;
}

/** A forecast remains a possibility until its own ground endpoint. There is
 * no extension of body history and no claim that a receiver caught it. */
export function rememberedFlight(a: Agent, t: number): FlightSample[] | null {
  const flight = flights.get(a), path = flight && !flight.resolved ? flight.path : null;
  return path?.length && t <= path[path.length - 1].t ? path : null;
}

export function hasObservedFlight(a: Agent): boolean { return flights.has(a); }

/** HONEST_READS: has the flight he saw reached, in his own estimate, the catch
 * opportunity he recorded on it (or its end, without one)? His stand-in for
 * the ball no longer being in the air. */
export function flightLanded(a: Agent, t: number): boolean {
  const flight = flights.get(a);
  if (!flight) return false;
  return t >= (flight.opportunity?.t ?? flight.path.at(-1)?.t ?? -Infinity);
}

/** Once a defender sees the pass, his job is to find/play the ball until a
 * newer cue or the whistle. The trajectory can end without answering who
 * caught it. Retain the last acquired landing area, not a fictitious flight
 * or an unconfirmed receiver's continuing route. */
export function unresolvedBallArea(a: Agent): { x: number; y: number } | null {
  const flight = flights.get(a);
  const last = flight && !flight.resolved ? flight.path.at(-1) : null;
  return last ? { x: last.x, y: last.y } : null;
}

/** The first catch opportunity on an acquired trajectory is a hypothesis,
 * not the real catcher's identity. A visible tip replaces it with the path. */
export function rememberCatchOpportunity(a: Agent, opportunity: { receiver: Agent; t: number } | null): void {
  const flight = flights.get(a);
  if (flight) flight.opportunity = opportunity ? { receiver: opportunity.receiver, t: opportunity.t } : undefined;
}

/** The receiver this observer last judged the ball to be arriving at on his acquired flight, if any (his own
 * hypothesis; refuted by a newer empty picture, superseded by an acquired holder). */
export function catchOpportunity(a: Agent): { receiver: Agent; t: number } | null {
  return flights.get(a)?.opportunity ?? null;
}

export function anticipatedCatcher(a: Agent, sim: PlaySim): PossessionRead | null {
  const opportunity = flights.get(a)?.opportunity;
  if (!opportunity || sim.t < opportunity.t || !rememberedFlight(a, sim.t)) return null;
  const cue = sim.see(a, opportunity.receiver);
  // An empty image from before the opportunity says nothing about its result.
  // Newer empty evidence refutes this hypothesis; unknown stays unknown.
  if (cue.carrying === false && cue.age !== undefined && sim.t - cue.age > opportunity.t) {
    flights.get(a)!.opportunity = undefined;
    return null;
  }
  return { target: opportunity.receiver, cue };
}

/** `blocker`: the man on him, whose body he feels rather than reads for the ball. */
export function observedHolder(a: Agent, sim: PlaySim, blocker?: Agent): PossessionRead | null {
  let newest: PossessionRead | null = null;
  let ambiguous = false;
  let unknownTime = false;
  const flight = flights.get(a);
  for (const target of sim.opponents(a)) {
    if (target === blocker) continue;
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
  const read = ambiguous || unknownTime ? null : newest;
  // A newer acquired holder supersedes this flight hypothesis. Losing that
  // body picture later cannot resurrect the older possible catch.
  if (read && flight) flight.resolved = true;
  return read;
}

// A QB who leaves the pocket as a runner, from this defender's own delayed
// QB picture. Rollouts and scrambles look alike for a beat; this is the
// visible cue, never the QB's private decision to run.
const QB_RUN_SPEED = 2.5;   // yd/s toward the line
const QB_BOX_MARGIN = 1.5;  // yd outside the pictured tackles
const QB_POCKET_FRONT = 1;  // yd behind the pictured tackles still counts as the front
const QB_LOS_FRONT = 2;     // yd behind the line: the deepest the front can be
const QB_BOX_SPEED = 1;     // yd/s downfield while outside the box
const QB_SETTLED_SPEED = .5;
const QB_SETTLE_TIME = .3;
const qbRuns = new WeakMap<Agent, { settledSince: number | null }>();

/** Does this defender's own picture show the QB running with the ball? Once
 * seen it holds until the picture shows him settled (scramble drill reset)
 * or no longer carrying (thrown or handed off). */
export function qbRunning(a: Agent, sim: PlaySim): boolean {
  const cue = sim.see(a, sim.qb), latch = qbRuns.get(a);
  if (cue.carrying === false) { qbRuns.delete(a); return false; }
  if (cue.carrying !== true) return !!latch; // Unknown neither starts nor ends it.
  const up = cue.vel.x;
  if (latch) {
    if (up >= QB_SETTLED_SPEED) { latch.settledSince = null; return true; }
    latch.settledSince ??= sim.t;
    if (sim.t - latch.settledSince < QB_SETTLE_TIME) return true;
    qbRuns.delete(a);
    return false;
  }
  // Speed alone is not runner evidence: a QB climbing away from a rush can
  // move just as fast inside the pocket. He must be at its front (the
  // shallower of the pictured tackles' depth and the line) or outside the
  // tackles and moving downfield.
  let running = false;
  if (up > QB_BOX_SPEED) {
    const lt = sim.slot('LT'), rt = sim.slot('RT');
    const tackles = lt && rt ? [sim.see(a, lt).pos, sim.see(a, rt).pos] : null;
    // Tackles driven back move the pocket, not the line: the front is never
    // deeper than QB_LOS_FRONT behind the line of scrimmage.
    const front = Math.max(sim.los - QB_LOS_FRONT,
      (tackles ? Math.min(tackles[0].x, tackles[1].x) : sim.los) - QB_POCKET_FRONT);
    const outside = !!tackles && (cue.pos.y < Math.min(tackles[0].y, tackles[1].y) - QB_BOX_MARGIN
      || cue.pos.y > Math.max(tackles[0].y, tackles[1].y) + QB_BOX_MARGIN);
    running = outside || (up > QB_RUN_SPEED && cue.pos.x >= front);
  }
  if (running) qbRuns.set(a, { settledSince: null });
  return running;
}

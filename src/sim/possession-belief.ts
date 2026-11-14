/** PRESENTED_POSSESSION (experimental, off; PRESENTED_POSSESSION=1 turns it on): who an opponent believes has the ball
 * at a mesh, step 1 of the presented-possession spec (docs/reviews/2026-11-14-presented-possession-spec.md).
 *
 * Today every picture's `carrying` is the true holder, delayed (`perception.record(..., sim.carrier.idx)`), so no fake
 * can be believed. With this flag, an opponent's picture of the two mesh bodies (the QB and the back meeting him) shows
 * possession as his own belief:
 *  - A mesh starts in his picture when he sees a backfield runner within handoff reach of the QB, moving (over
 *    MESH_SPEED; a back setting beside the QB in protection is not a mesh), behind the line, within MESH_WINDOW s of
 *    the snap. Until then nothing changes (plain dropbacks are unchanged by construction).
 *  - From then, both bodies show `carrying: null` (unknown) until he resolves who has it. Every consumer already reads
 *    null as "not confirmed" (the spec's consumer table): he holds his pre-mesh fit and takes no carrier action.
 *  - He resolves it from what he sees: a mesh body's hands and ball area (HAND_HEIGHT) in his view (body facing, within
 *    VIEW_HALF), inside SIGHT_RANGE, and with a clear line of sight at the moment that sample shows (#714's lineOfSight,
 *    bodies placed where the perception record had them). Each such sighting shows that body with or without the ball
 *    at that moment. The sample already carries his reaction delay (his observation delay is the recognition channel's
 *    0.25-0.3 s), so he commits on his first clear sighting; he leaves an answer only after EXIT_HOLD s of sightings that
 *    contradict it (the exit on the far side of the entry: the commitment rule). Skill acts on what the cues show and how
 *    he weights them (step 2's presentation), not on an extra wait.
 *  - Once the ball is no longer held by a mesh body (thrown, pitched, loose), his picture falls back to the ordinary
 *    record: those transitions have their own channels (sawThrow, the flight estimate, loose-ball recognition).
 * Not in this step (spec steps 2-3): presentation (carry posture, the QB's hands and gaze), the non-carrier tackle. */
import type { Agent } from './agent.js';
import { handoffReach } from './ball-transfer.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import { lineOfSight } from './sight.js';

export const PRESENTED_POSSESSION = process.env.PRESENTED_POSSESSION === '1';
/** Height of the hands and ball at a carry or a mesh (yd; model choice, a forearm across the belly). */
const HAND_HEIGHT = 1.1;
/** Picture-distance margin beyond handoff reach that still reads as a mesh (yd; choice). */
const MESH_MARGIN = 0.3;
/** The runner's seen speed for a mesh (yd/s; choice: a set protector is not a mesh). */
const MESH_SPEED = 2;
/** A mesh is a backfield exchange: within this long after the snap (s; choice). */
const MESH_WINDOW = 2.5;
/** Beyond this a ball in a hand is not resolved by sight (yd; choice). */
const SIGHT_RANGE = 20;
/** Body-facing view half-angle (rad); GAZE replaces it when on. */
const VIEW_HALF = Math.PI / 2;
/** Contradicting sightings needed to leave a committed answer (s; choice: two decision ticks). */
const EXIT_HOLD = 0.1;

type Answer = number; // index of the body seen holding the ball, or -1: neither mesh body has it
interface Belief { mesh: [number, number] | null; resolved: Answer | undefined; pending: { a: Answer; held: number } | null; at: number }

const beliefs = new WeakMap<PlaySim, Map<number, Belief>>();

function beliefOf(sim: PlaySim, observer: Agent): Belief {
  let m = beliefs.get(sim);
  if (!m) { m = new Map(); beliefs.set(sim, m); }
  let b = m.get(observer.idx);
  if (!b) { b = { mesh: null, resolved: undefined, pending: null, at: -1 }; m.set(observer.idx, b); }
  return b;
}

function inView(observer: Agent, p: { x: number; y: number }): boolean {
  const dx = p.x - observer.pos.x, dy = p.y - observer.pos.y;
  if (Math.hypot(dx, dy) > SIGHT_RANGE) return false;
  let d = Math.atan2(dy, dx) - observer.facing;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return Math.abs(d) <= VIEW_HALF;
}

function update(sim: PlaySim, observer: Agent, delay: number): Belief {
  const b = beliefOf(sim, observer);
  if (b.at === sim.t) return b;
  b.at = sim.t;
  const qb = sim.qb;
  if (!b.mesh) {
    if (!qb || sim.t > MESH_WINDOW) return b;
    const q = sim.perception.perceive(qb.idx, delay);
    for (const o of sim.offense) {
      if (o === qb) continue;
      const p = sim.perception.perceive(o.idx, delay);
      if (Math.hypot(p.vel.x, p.vel.y) < MESH_SPEED) continue;
      const behind = (p.pos.x - sim.los) * sim.attackDir('O') < 0.5;
      if (behind && Math.hypot(p.pos.x - q.pos.x, p.pos.y - q.pos.y) <= handoffReach(qb, o) + MESH_MARGIN) {
        b.mesh = [qb.idx, o.idx];
        break;
      }
    }
    if (!b.mesh) return b;
  }
  // Sightings: each mesh body whose hands are in his view and in a clear line at the moment his picture shows.
  const posOf = (a: Agent) => sim.perception.recorded(a.idx, delay)?.pos ?? null;
  let answer: Answer | null = null;
  for (const i of b.mesh) {
    const body = sim.agents[i], pic = sim.perception.perceive(i, delay);
    if (pic.carrying === null || pic.carrying === undefined || !inView(observer, pic.pos)) continue;
    if (!lineOfSight(sim.agents, observer, body, HAND_HEIGHT, posOf)) continue;
    if (pic.carrying) { answer = i; break; }
    // Seen empty: the other mesh body has it (or nobody does, once both are seen empty).
    answer = answer === null ? (b.mesh[0] === i ? b.mesh[1] : b.mesh[0]) : -1;
  }
  if (answer === null) return b;
  if (b.resolved === undefined) { b.resolved = answer; b.pending = null; return b; }
  if (answer === b.resolved) { b.pending = null; return b; }
  if (b.pending && b.pending.a === answer) b.pending.held += sim.dt;
  else b.pending = { a: answer, held: sim.dt };
  if (b.pending.held + 1e-9 >= EXIT_HOLD) { b.resolved = answer; b.pending = null; }
  return b;
}

/** The possession `observer` believes `target` shows, given the delayed picture `seen` (with `delay`). */
export function presentedCarrying(sim: PlaySim, observer: Agent, target: Agent, seen: Perceived, delay: number): Perceived {
  if (!PRESENTED_POSSESSION || observer.team === target.team || sim.phase !== 'live') return seen;
  const b = update(sim, observer, delay);
  if (!b.mesh || !b.mesh.includes(target.idx)) return seen;
  // Once neither mesh body holds the ball, the ordinary record stands (throw, pitch and loose ball have their channels).
  const holder = sim.ball.kind === 'held' ? sim.ball.carrier.idx : -2;
  if (!b.mesh.includes(holder)) return seen;
  const carrying = b.resolved === undefined ? null : b.resolved === target.idx;
  return carrying === seen.carrying ? seen : { ...seen, carrying };
}

/** Diagnostic: an observer's mesh belief (test and witness use). */
export function meshBelief(sim: PlaySim, observer: Agent): { mesh: [number, number] | null; resolved: number | undefined } {
  const b = beliefs.get(sim)?.get(observer.idx);
  return { mesh: b?.mesh ?? null, resolved: b?.resolved };
}

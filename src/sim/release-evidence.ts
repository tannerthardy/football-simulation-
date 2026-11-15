/** The release candidate's evidence (presented possession step 1b, #713; Rules + Coaching's half, the store is
 * Defense's): what one observer saw of the passer's arm and of the ball this tick, as cues. No weights here; the store
 * decides how much each moves his belief that the ball is gone.
 *
 * - motion:  in his picture the arm went from set to loading (QB_BODY_SEEN's `arm`).
 * - through: loading to delivering: the arm coming through. A pump is a 'through' with no ball after it.
 * - pulled:  loading or delivering back to set with the ball still in his hands (the pump's pull-down): strong
 *            evidence against a release.
 * - ball:    the ball in flight. Decisive.
 *
 * The arm cues come through his sighting of the passer; the ball is its own percept, at his own delay. Every cue is
 * judged at the moment its sample shows: he saw it only if it was in view then (within 1.8 rad of his
 * recorded body facing, or the cone of his recorded head under HEAD) and nothing stood across the line by
 * `lineOfSight`'s heights (the arm and the ball in hand at the passer's shoulder, the ball in flight at its own
 * height). Nothing seen is no cue: absence is not evidence. The arm comes through his ordinary `see()` of the passer,
 * so his delay and every perception rule apply; skill enters only there. */
import type { Vec3 } from '../core/vec.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { bodyHeight, lineOfSight, SHOULDER } from './sight.js';

export type ReleaseCue =
  | { kind: 'motion' | 'through' | 'pulled'; at: number }
  | { kind: 'ball'; at: number; pos: Vec3 };

type Arm = 'set' | 'load' | 'deliver';
interface Memo { arm: Arm | null; at: number }
/** Per sim: the ball's flight, one sample a tick (it is not in the perception record), and each observer's last seen arm. */
const flights = new WeakMap<PlaySim, { t: number; pos: Vec3; vel: Vec3 }[]>();
const lastArm = new WeakMap<PlaySim, Map<number, Memo>>();

const angDiff = (a: number, b: number) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
/** A recorded head's view cone (HEAD's, +-90 deg); without a head, the body-facing bound (1.8 rad). */
const HEAD_CONE = Math.PI / 2;

function recordBall(sim: PlaySim): { t: number; pos: Vec3; vel: Vec3 }[] {
  let h = flights.get(sim);
  if (!h) { h = []; flights.set(sim, h); }
  if (sim.ball.kind === 'air' && (!h.length || h[h.length - 1].t < sim.t - 1e-9))
    h.push({ t: sim.t, pos: { ...sim.ball.flight.pos }, vel: { ...sim.ball.flight.vel } });
  while (h.length > 64) h.shift();
  return h;
}

/** Whether `observer` had a clear, in-view line to a point `back` ticks ago (recorded positions, facing and head). */
export function sawAt(sim: PlaySim, observer: Agent, back: number, target: Agent | { pos: { x: number; y: number } }, height: number): boolean {
  const ro = sim.perception.recorded(observer.idx, back * sim.dt);
  if (!ro) return false;
  const tp = 'idx' in target ? sim.perception.recorded((target as Agent).idx, back * sim.dt)?.pos : target.pos;
  if (!tp) return false;
  const brg = Math.atan2(tp.y - ro.pos.y, tp.x - ro.pos.x);
  const head = sim.perception.perceive(observer.idx, back * sim.dt).head;
  const inView = head !== null && head !== undefined && observer !== sim.qb ? Math.abs(angDiff(brg, head)) <= HEAD_CONE
    : Math.abs(angDiff(brg, ro.facing)) <= 1.8;
  if (!inView) return false;
  const point = 'idx' in target ? (target as Agent)
    : ({ pos: tp, profile: { radius: 0, heightYd: height / 0.936 }, body: { support: { state: 'up', posture: 0 } } } as unknown as Agent);
  const posOf = (a: Agent) => a === point && !('idx' in target) ? tp : sim.perception.recorded(a.idx, back * sim.dt)?.pos ?? null;
  return lineOfSight(sim.agents, observer, point, height, posOf);
}

/** This tick's release cues for `observer` (a defender), each at the sim time its sample shows. */
export function releaseEvidence(sim: PlaySim, observer: Agent): ReleaseCue[] {
  const flight = recordBall(sim), qb = sim.qb, out: ReleaseCue[] = [];
  if (!qb || observer.team === qb.team) return out;
  const seen = sim.see(observer, qb), age = seen.age ?? 0, back = Math.round(age / sim.dt), at = sim.t - age;
  let memo = lastArm.get(sim);
  if (!memo) { memo = new Map(); lastArm.set(sim, memo); }
  const prev = memo.get(observer.idx);
  // The arm and the ball in hand: at the passer's shoulder, at the sample's moment.
  if (seen.arm && sawAt(sim, observer, back, qb, bodyHeight(qb, SHOULDER))) {
    const was = prev?.arm ?? null, now = seen.arm as Arm;
    if (was && was !== now) {
      if (was === 'set' && now !== 'set') out.push({ kind: 'motion', at });
      if (now === 'deliver' && was !== 'deliver') out.push({ kind: 'through', at });
      if (now === 'set' && seen.carrying !== false) out.push({ kind: 'pulled', at });
    }
    memo.set(observer.idx, { arm: now, at });
  }
  // The ball in flight is its own percept, not part of his sighting of the passer: the ball as it was his own
  // perception delay ago (the base delay of his `see()`; no keys, since a ball in the air is not a man he is reading),
  // seen if it was in his view and nothing stood across the line then. Timed on the passer's sighting, a defender who
  // had lost the passer behind bodies looked for the ball before the throw and could not see one in front of him.
  // (BALL_EST bit 32 replaces this with his estimator's own sample through his head.)
  const ballDelay = observer.mind.observationDelay(observer.profile.reactionTime);
  const ballBack = Math.round(ballDelay / sim.dt), ballAt = sim.t - ballBack * sim.dt;
  const b = flight.find((f) => Math.abs(f.t - ballAt) < sim.dt / 2);
  if (b && sawAt(sim, observer, ballBack, { pos: { x: b.pos.x, y: b.pos.y } }, b.pos.z)) out.push({ kind: 'ball', at: ballAt, pos: b.pos });
  return out;
}

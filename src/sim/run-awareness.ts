/** Coaching knowledge selects a look; it never supplies a live runner point.
 * The opt-in pilot is limited to zone OL and their installed near-line key.
 * Numerical windows/cones are explicit coarse assumptions, not NFL gaze data.
 */
import { angleDiff, clamp, closestOnSegment, type Vec2 } from '../core/vec.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import { RunnerToMesh } from './assign.js';
import { RunBlocker } from './behaviors/blocking.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';
import type { TeammateInformation } from './teammate-information.js';

export type RunAwarenessMode = 'off' | 'primary' | 'glance';
export const RUN_ATTENTION_LIMITS = Object.freeze({
  gazeYaw: 100 * Math.PI / 180,
  glanceHalfAngle: 25 * Math.PI / 180,
  movementHorizon: .30,
  laneHalfWidth: .70,
  laneGrowth: .25,
  timingSlack: .60,
  prediction: .30,
});

interface InstalledLane {
  runner: number;
  mesh: Vec2;
  press: Vec2;
  meshTime: number;
  tempo: number;
}
export type PlayerRunKnowledge = {
  team: 'O';
  role: string;
  scheme: string | null;
  lane: InstalledLane | null;
} | { team: 'D'; role: string; fit: Agent['runFit'] };

/** A spatial/timing range, not an estimated achieved position or possession. */
export interface ExpectedRunLane extends InstalledLane {
  halfWidth: number;
  arrival: { earliest: number; latest: number };
  lookPoint: Vec2;
}
export interface RunVisualAttention {
  bearing: number;
  halfAngle: number;
  maximumBodyAngle: number;
}
interface PrimarySample {
  picture: Perceived;
  sampledAt: number;
  availableAt: number;
}
interface BlockerAttention {
  key: number;
  seen: PrimarySample;
  pending: PrimarySample[];
  nextReadAt: number;
  choice: 'primary' | 'lane';
  lookPoint: Vec2 | null;
  reason: string;
}

const copy = <T>(value: T): T => structuredClone(value);

export class RunAwareness {
  private readonly knowledge = new Map<number, PlayerRunKnowledge>();
  private readonly blockers = new Map<number, BlockerAttention>();
  private lastPrepareAt = -Infinity;

  constructor(sim: PlaySim, readonly mode: RunAwarenessMode) {
    const back = sim.slot('RB');
    const job = back?.behavior;
    const lane: InstalledLane | null = sim.offCall.kind === 'run' && back && job instanceof RunnerToMesh
      ? { runner: back.idx, mesh: { ...job.mesh }, press: { ...job.aim }, meshTime: job.meshTime,
        tempo: back.profile.vmax * .55 } : null;
    for (const a of sim.agents) {
      if (a.team === 'D') {
        // Their own fit is installed; the offensive concept/lane is private.
        this.knowledge.set(a.idx, { team: 'D', role: sim.defAlign.spots[a.slot as keyof typeof sim.defAlign.spots]!.role.kind,
          fit: a.runFit ? copy(a.runFit) : undefined });
        continue;
      }
      this.knowledge.set(a.idx, { team: 'O', role: a.behavior instanceof RunBlocker ? a.behavior.plan.kind : a.behavior.kind,
        scheme: sim.offCall.run?.scheme ?? null, lane: lane ? copy(lane) : null });
      if (mode === 'off' || !lane || !['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)
        || !['outsideZone', 'wideZone'].includes(sim.offCall.run!.scheme)
        || !(a.behavior instanceof RunBlocker)
        || !['drive', 'reach', 'cutoff', 'combo'].includes(a.behavior.plan.kind)) continue;
      const target = a.behavior.plan.target;
      if (!target) continue;
      // Existing staged presentation is a pre-snap sensing opportunity. Seed
      // only a presented key inside this observer's field; use the delayed
      // history when the defense is moving, rather than its hidden current pose.
      const seen = sim.perception.perceive(target.idx, a.mind.observationDelay(a.profile.reactionTime));
      const age = seen.age ?? 0;
      const samplePos = { x: seen.pos.x - seen.vel.x * age, y: seen.pos.y - seen.vel.y * age };
      if (!this.inField(a, samplePos, 100 * Math.PI / 180)) continue;
      this.blockers.set(a.idx, { key: target.idx, seen: { picture: { ...copy(seen), pos: samplePos },
        sampledAt: -age, availableAt: 0 }, pending: [], nextReadAt: 0, choice: 'primary',
        lookPoint: null, reason: 'installed near-line key acquired before snap' });
    }
  }

  installed(observer: Agent): PlayerRunKnowledge | null {
    const known = this.knowledge.get(observer.idx);
    return known ? copy(known) : null;
  }

  expectedLane(observer: Agent, now: number): ExpectedRunLane | null {
    const known = this.knowledge.get(observer.idx);
    if (known?.team !== 'O' || !known.lane) return null;
    const lane = known.lane;
    const nearest = closestOnSegment(observer.pos, lane.mesh, lane.press);
    const distance = Math.hypot(nearest.point.x - lane.mesh.x, nearest.point.y - lane.mesh.y);
    const length = Math.hypot(lane.press.x - lane.mesh.x, lane.press.y - lane.mesh.y);
    // Look upstream of the crossing, where the rehearsed runner would arrive.
    // No live handoff, ball holder, cut or runner coordinates enter this range.
    const fraction = Math.max(0, nearest.t - 1.0 / Math.max(1e-9, length));
    return { ...copy(lane), halfWidth: RUN_ATTENTION_LIMITS.laneHalfWidth
      + RUN_ATTENTION_LIMITS.laneGrowth * Math.max(0, now - lane.meshTime),
      arrival: { earliest: lane.meshTime + distance / (lane.tempo * 1.4),
        latest: lane.meshTime + RUN_ATTENTION_LIMITS.timingSlack + distance / (lane.tempo * .6) },
      lookPoint: { x: lane.mesh.x + (lane.press.x - lane.mesh.x) * fraction,
        y: lane.mesh.y + (lane.press.y - lane.mesh.y) * fraction } };
  }

  /** Once per real boundary. Last request/achieved motion are personally
   * available; this tick's still-unchosen controller request is not.
   */
  prepare(agents: readonly Agent[], previous: readonly Intent[], peers: TeammateInformation, now: number, dt: number): void {
    if (now <= this.lastPrepareAt) return;
    this.lastPrepareAt = now;
    for (const a of agents) {
      const state = this.blockers.get(a.idx);
      if (!state) continue;
      if (now + 1e-9 >= state.nextReadAt) {
        state.nextReadAt = now + a.mind.decisionInterval;
        const lane = this.expectedLane(a, now);
        const request = previous[a.idx]?.vel ?? a.vel;
        const next = { x: a.pos.x + request.x * RUN_ATTENTION_LIMITS.movementHorizon,
          y: a.pos.y + request.y * RUN_ATTENTION_LIMITS.movementHorizon };
        const distance = (point: Vec2) => {
          const near = closestOnSegment(point, lane!.mesh, lane!.press).point;
          return Math.hypot(point.x - near.x, point.y - near.y);
        };
        const peer = lane ? peers.query(a.idx, lane.runner, now, dt) : { source: 'unavailable' as const };
        const fresh = peer.source === 'tactile' || (peer.source === 'observed' && peer.age <= .30 + 1e-9);
        const ownBlock = a.engagement?.defender.idx === state.key;
        const crossing = lane && distance(next) <= lane.halfWidth + a.profile.radius
          && (distance(next) < distance(a.pos) - .05 || distance(a.pos) <= lane.halfWidth + a.profile.radius);
        const window = lane && now + a.profile.reactionTime >= lane.arrival.earliest && now <= lane.arrival.latest;
        if (this.mode === 'glance' && state.choice !== 'lane' && ownBlock && !a.isDown(now)
          && a.mind.focus >= .4 && Math.hypot(request.x, request.y) >= 1 && crossing && window && !fresh) {
          state.choice = 'lane';
          state.lookPoint = peer.source === 'observed' || peer.source === 'remembered' ? { ...peer.pos } : lane!.lookPoint;
          state.reason = 'own movement may cross installed runner lane; acquire traffic';
        } else {
          state.choice = 'primary'; state.lookPoint = null;
          state.reason = fresh ? 'acquired runner picture available; return to block key'
            : 'retain block key or return after a lane check';
        }
      }
      // A deliberate glance spends this visual opportunity. Existing pending
      // primary pictures may arrive, and received block loads stay physical.
      const target = agents[state.key];
      if (state.choice === 'primary' && !a.isDown(now)
        && this.inField(a, target.pos, 75 * Math.PI / 180)) {
        const delay = a.mind.observationDelay(a.profile.reactionTime);
        state.pending.push({ picture: { pos: { ...target.pos }, vel: { ...target.vel },
          stance: target.stance, facing: target.facing, pose: target.pose, carrying: null },
          sampledAt: now, availableAt: now + Math.ceil((delay - 1e-9) / dt) * dt });
      }
      const waiting: PrimarySample[] = [];
      for (const sample of state.pending) {
        if (sample.availableAt <= now + 1e-9) {
          if (sample.sampledAt > state.seen.sampledAt) state.seen = sample;
        } else waiting.push(sample);
      }
      state.pending = waiting;
    }
  }

  visualAttention(observer: Agent): RunVisualAttention | null {
    const state = this.blockers.get(observer.idx);
    if (state?.choice !== 'lane' || !state.lookPoint) return null;
    const desired = Math.atan2(state.lookPoint.y - observer.pos.y, state.lookPoint.x - observer.pos.x);
    // Re-clamp even during a held decision beat as the torso physically turns.
    const bearing = observer.facing + clamp(angleDiff(observer.facing, desired),
      -RUN_ATTENTION_LIMITS.gazeYaw, RUN_ATTENTION_LIMITS.gazeYaw);
    return { bearing, halfAngle: RUN_ATTENTION_LIMITS.glanceHalfAngle,
      maximumBodyAngle: RUN_ATTENTION_LIMITS.gazeYaw + RUN_ATTENTION_LIMITS.glanceHalfAngle };
  }

  primaryPicture(observer: Agent, target: Agent, now: number): Perceived | null {
    const state = this.blockers.get(observer.idx);
    if (!state || state.key !== target.idx) return null; // This key is outside the pilot.
    const age = Math.max(0, now - state.seen.sampledAt), predicted = Math.min(age, RUN_ATTENTION_LIMITS.prediction);
    const sample = state.seen.picture;
    return { ...copy(sample), pos: { x: sample.pos.x + sample.vel.x * predicted,
      y: sample.pos.y + sample.vel.y * predicted },
      // Retain the last observed velocity, not a claim the unseen key stopped.
      // `age` describes this sample; position extrapolation remains bounded.
      vel: { ...sample.vel }, age };
  }

  recorded(observer: Agent) {
    const state = this.blockers.get(observer.idx);
    return state ? { key: state.key, choice: state.choice, lookPoint: state.lookPoint ? { ...state.lookPoint } : null,
      reason: state.reason, nextReadAt: state.nextReadAt, sampledAt: state.seen.sampledAt,
      availableAt: state.seen.availableAt, queuedSamples: state.pending.length,
      gaze: this.visualAttention(observer) } : null;
  }

  private inField(observer: Agent, pos: Vec2, halfAngle: number): boolean {
    const dx = pos.x - observer.pos.x, dy = pos.y - observer.pos.y;
    return Math.hypot(dx, dy) <= 25 && Math.abs(angleDiff(observer.facing, Math.atan2(dy, dx))) <= halfAngle;
  }
}

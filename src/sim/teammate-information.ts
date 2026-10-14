/** Observer-owned teammate information. Sensing writes; queries only read.
 * These coarse limits are declared model assumptions, not measured gaze or
 * NFL calibration. No live target state or randomness is consulted by query.
 */
import type { Vec2 } from '../core/vec.js';
import type { Agent } from './agent.js';

export const TEAMMATE_INFORMATION_LIMITS = Object.freeze({
  visualRange: 25,
  fieldHalfAngle: 100 * Math.PI / 180,
  occupiedHalfAngle: 75 * Math.PI / 180,
  prediction: .30,
  memory: 1.00,
  tactile: .10,
  zoneExpectation: .60,
});

/** A rehearsed nominal track, installed once from alignment and the call.
 * Availability ends on its installed clock, never on a private live branch.
 */
export interface InstalledTeammateExpectation {
  origin: Vec2;
  velocity: Vec2;
  startsAt: number;
  until: number;
  label: string;
}

export type TeammatePicture = {
  source: 'observed' | 'remembered' | 'called' | 'tactile';
  pos: Vec2;
  vel: Vec2;
  sampledAt: number;
  availableAt: number;
  age: number;
  predictedFor: number;
  label?: string;
} | { source: 'unavailable' };

interface Sighting {
  pos: Vec2;
  vel: Vec2;
  sampledAt: number;
  availableAt: number;
}
interface ObserverState {
  seen: Map<number, Sighting>;
  pending: Map<number, Sighting[]>;
  touch: Map<number, Sighting>;
  calls: Map<number, InstalledTeammateExpectation>;
}

export class TeammateInformation {
  private readonly observers = new Map<number, ObserverState>();
  private lastSenseAt = -Infinity;

  constructor(agents: readonly Agent[], calls: ReadonlyMap<number, InstalledTeammateExpectation>) {
    for (const a of agents) {
      const installed = new Map<number, InstalledTeammateExpectation>();
      for (const b of agents) if (b !== a && b.team === a.team) {
        const call = calls.get(b.idx);
        if (call) installed.set(b.idx, { ...call, origin: { ...call.origin }, velocity: { ...call.velocity } });
      }
      this.observers.set(a.idx, { seen: new Map(), pending: new Map(), touch: new Map(), calls: installed });
    }
  }

  /** One opportunity per simulation boundary, independent of consumers and
   * recording. Facing defines a coarse field of regard, not an eye direction.
   * An occupied blocker/tackler has a narrower peripheral opportunity. We do
   * not yet model occlusion or deliberate head scans. Latency belongs to the
   * acquired sample; losing sight cannot fetch a newer historical snapshot.
   */
  sense(agents: readonly Agent[], now: number, dt: number): void {
    if (now <= this.lastSenseAt) return;
    this.lastSenseAt = now;
    for (const a of agents) {
      const state = this.observers.get(a.idx)!;
      for (const b of agents) {
        if (b === a || b.team !== a.team) continue;
        const queue = state.pending.get(b.idx) ?? [];
        const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y;
        const angle = Math.abs(Math.atan2(Math.sin(Math.atan2(dy, dx) - a.facing),
          Math.cos(Math.atan2(dy, dx) - a.facing)));
        const halfAngle = a.engagement ? TEAMMATE_INFORMATION_LIMITS.occupiedHalfAngle
          : TEAMMATE_INFORMATION_LIMITS.fieldHalfAngle;
        if (!a.isDown(now) && Math.hypot(dx, dy) <= TEAMMATE_INFORMATION_LIMITS.visualRange && angle <= halfAngle) {
          const peripheral = a.eyes && !a.eyes.keys.includes(b) ? a.eyes.peripheral : 0;
          const delay = a.mind.observationDelay(a.profile.reactionTime) + peripheral;
          // Quantize delivery upward, so a sub-tick delay cannot arrive early.
          const availableAt = now + Math.ceil((delay - 1e-9) / dt) * dt;
          queue.push({ pos: { ...b.pos }, vel: { ...b.vel }, sampledAt: now, availableAt });
        }
        const waiting: Sighting[] = [];
        for (const sample of queue) {
          if (sample.availableAt <= now + 1e-9) {
            if (sample.sampledAt > (state.seen.get(b.idx)?.sampledAt ?? -Infinity)) state.seen.set(b.idx, sample);
          } else waiting.push(sample);
        }
        state.pending.set(b.idx, waiting);
      }
    }
  }

  /** Local cue from an actual resolved teammate impact. The caller supplies
   * a contact-distance bearing and the observer's velocity, not the target's
   * remote COM/velocity. It cannot reveal subsequent movement or intentions.
   */
  touched(observer: number, target: number, pos: Vec2, ownVelocity: Vec2, now: number): void {
    const state = this.observers.get(observer);
    if (!state || now <= (state.touch.get(target)?.sampledAt ?? -Infinity)) return;
    state.touch.set(target, { pos: { ...pos }, vel: { ...ownVelocity }, sampledAt: now, availableAt: now });
  }

  query(observer: number, target: number, now: number, dt: number): TeammatePicture {
    const state = this.observers.get(observer);
    if (!state) return { source: 'unavailable' };
    const touch = state.touch.get(target);
    if (touch && now + 1e-9 >= touch.availableAt && now - touch.sampledAt <= TEAMMATE_INFORMATION_LIMITS.tactile + 1e-9)
      return this.picture(touch, now, 'tactile');
    const seen = state.seen.get(target);
    if (seen && now + 1e-9 >= seen.availableAt && now - seen.sampledAt <= TEAMMATE_INFORMATION_LIMITS.memory + 1e-9)
      return this.picture(seen, now, now - seen.availableAt <= dt + 1e-9 ? 'observed' : 'remembered');
    const call = state.calls.get(target);
    if (call && now + 1e-9 >= call.startsAt && now <= call.until + 1e-9) {
      const elapsed = Math.max(0, Math.min(now, call.until) - call.startsAt);
      return { source: 'called', pos: { x: call.origin.x + call.velocity.x * elapsed,
        y: call.origin.y + call.velocity.y * elapsed }, vel: { ...call.velocity },
        sampledAt: call.startsAt, availableAt: call.startsAt, age: elapsed, predictedFor: elapsed, label: call.label };
    }
    return { source: 'unavailable' };
  }

  private picture(sample: Sighting, now: number, source: 'observed' | 'remembered' | 'tactile'): TeammatePicture {
    const age = Math.max(0, now - sample.sampledAt);
    const predictedFor = Math.min(age, TEAMMATE_INFORMATION_LIMITS.prediction);
    return { source, pos: { x: sample.pos.x + sample.vel.x * predictedFor,
      y: sample.pos.y + sample.vel.y * predictedFor },
      // Beyond the prediction horizon we know a location, not current speed.
      vel: age <= TEAMMATE_INFORMATION_LIMITS.prediction + 1e-9 ? { ...sample.vel } : { x: 0, y: 0 },
      sampledAt: sample.sampledAt, availableAt: sample.availableAt, age, predictedFor };
  }
}

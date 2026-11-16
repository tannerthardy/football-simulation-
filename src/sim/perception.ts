/**
 * Delayed perception. The world is snapshotted every tick; when an agent
 * looks at an opponent it sees that opponent's state `delay` seconds ago,
 * dead-reckoned forward with the stale velocity. When a receiver plants and
 * breaks, the defender keeps "seeing" the old stem for his reaction time —
 * separation emerges from route sharpness vs. reaction time vs. agility.
 */
import type { Vec2 } from '../core/vec.js';

export const HISTORY = 24;
const STRIDE = 16;

/** Coarse visible body pose, separate from pad-level technique or capability. */
export type VisiblePose = 'up' | 'down' | 'rising';

export interface Perceived {
  pos: Vec2;
  vel: Vec2;
  stance: 'high' | 'low' | null;
  facing: number;
  /** Sampled with the same latency as position; absent/null means unknown. */
  pose?: VisiblePose | null;
  /** Held possession sampled with position/pose; absent/null means unknown.
   * This delayed channel does not model gaze, occlusion or ball-flight reads. */
  carrying?: boolean | null;
  /** Age of the sampled visual state before constant-velocity prediction. */
  age?: number;
  /** QB_BODY_SEEN: his visible throwing motion, sampled with the same latency. */
  arm?: 'set' | 'load' | 'deliver';
  /** QB_BODY_SEEN: his visible head direction (rad), or null where not modelled. */
  head?: number | null;
  /** The ball holder's visible carry posture (up to throw, or tucked), or null where not shown. */
  carryPosture?: 'up' | 'tucked' | null;
  /** Seen contact: the opponents (agent indices) he is in contact with, strongest first, at most two. */
  contactWith?: number[];
  /** Seen contact: an opponent is holding him. */
  held?: boolean;
  /** SIGHT_STALE: this picture is older than the observer's own delay, a belief about a man he cannot see, not a sighting. */
  stale?: boolean;
  /** SIGHT_STALE: how far (yd) the man may be from `pos`; grows with the time since he was last seen. */
  spread?: number;
}

export class PerceptionBuffer {
  private readonly n: number;
  private readonly data: Float64Array;
  private head = -1;
  private count = 0;
  /** Records taken so far, uncapped: a tick's identity for anything that keeps its own history (SIGHT_PURE). */
  stamp = 0;

  constructor(
    private readonly agents: number,
    private readonly dt: number,
  ) {
    this.n = agents;
    this.data = new Float64Array(HISTORY * agents * STRIDE);
  }

  /** Omitted possession is unknown. Null records a known unheld ball; an
   * index records that holder and known non-possession for the other bodies. */
  record(states: ReadonlyArray<{ pos: Vec2; vel: Vec2; stance?: 'high' | 'low' | null; facing?: number; pose?: VisiblePose | null; arm?: 'set' | 'load' | 'deliver'; head?: number | null; carryPosture?: 'up' | 'tucked' | null; contactWith?: number[]; held?: boolean; body?: { support?: { state: string; posture?: number } } }>, heldCarrierIndex?: number | null): void {
    this.head = (this.head + 1) % HISTORY;
    this.count = Math.min(HISTORY, this.count + 1);
    this.stamp++;
    const base = this.head * this.n * STRIDE;
    for (let i = 0; i < this.n; i++) {
      const s = states[i];
      const o = base + i * STRIDE;
      this.data[o] = s.pos.x;
      this.data[o + 1] = s.pos.y;
      this.data[o + 2] = s.vel.x;
      this.data[o + 3] = s.vel.y;
      this.data[o + 4] = s.stance === 'high' ? 1 : s.stance === 'low' ? -1 : 0;
      this.data[o + 5] = s.facing ?? 0;
      this.data[o + 6] = s.pose === 'up' ? 1 : s.pose === 'down' ? -1 : s.pose === 'rising' ? 2 : 0;
      this.data[o + 7] = heldCarrierIndex === undefined ? 0 : heldCarrierIndex === i ? 1 : -1;
      this.data[o + 8] = s.arm === 'load' ? 1 : s.arm === 'deliver' ? 2 : 0;
      this.data[o + 9] = s.head ?? NaN;
      this.data[o + 10] = s.carryPosture === 'up' ? 1 : s.carryPosture === 'tucked' ? -1 : 0;
      this.data[o + 11] = s.contactWith?.[0] ?? -1;
      this.data[o + 12] = s.contactWith?.[1] ?? -1;
      this.data[o + 13] = s.held ? 1 : 0;
      const sup = s.body?.support;
      this.data[o + 14] = sup?.posture ?? 0.2;
      this.data[o + 15] = sup && sup.state !== 'up' ? 0 : 1;
    }
  }

  /** State of agent `i` as perceived with `delay` seconds of latency. */
  perceive(i: number, delay: number): Perceived {
    if (!this.count) throw new Error('Perception requires an initial snapshot');
    const back = Math.min(this.count - 1, Math.max(0, Math.round(delay / this.dt)));
    const idx = (this.head - back + HISTORY) % HISTORY;
    const o = idx * this.n * STRIDE + i * STRIDE;
    const x = this.data[o];
    const y = this.data[o + 1];
    const vx = this.data[o + 2];
    const vy = this.data[o + 3];
    const lag = back * this.dt;
    const stance = this.data[o + 4];
    const pose = this.data[o + 6];
    const carrying = this.data[o + 7];
    const arm = this.data[o + 8], head = this.data[o + 9], posture = this.data[o + 10];
    const c0 = this.data[o + 11], c1 = this.data[o + 12], held = this.data[o + 13] > 0;
    return { pos: { x: x + vx * lag, y: y + vy * lag }, vel: { x: vx, y: vy },
      stance: stance > 0 ? 'high' : stance < 0 ? 'low' : null, facing: this.data[o + 5], age: lag,
      pose: pose === 1 ? 'up' : pose === -1 ? 'down' : pose === 2 ? 'rising' : null,
      carrying: carrying > 0 ? true : carrying < 0 ? false : null,
      arm: arm === 1 ? 'load' : arm === 2 ? 'deliver' : 'set', head: Number.isNaN(head) ? null : head,
      carryPosture: posture > 0 ? 'up' : posture < 0 ? 'tucked' : null,
      contactWith: c0 < 0 ? [] : c1 < 0 ? [c0] : [c0, c1], held };
  }

  /** Where agent `i` was and which way he faced `delay` seconds ago, as
   * recorded and without prediction; null beyond the kept history. For a
   * body's own recent past, such as whether his eyes were on someone. */
  recorded(i: number, delay: number): { pos: Vec2; facing: number; pose: { up: boolean; posture: number } } | null {
    const back = Math.max(0, Math.round(delay / this.dt));
    if (back >= this.count) return null;
    const o = ((this.head - back + HISTORY) % HISTORY) * this.n * STRIDE + i * STRIDE;
    return { pos: { x: this.data[o], y: this.data[o + 1] }, facing: this.data[o + 5], pose: { up: this.data[o + 15] > 0, posture: this.data[o + 14] } };
  }
}

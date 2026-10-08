/**
 * Delayed perception. The world is snapshotted every tick; when an agent
 * looks at an opponent it sees that opponent's state `delay` seconds ago,
 * dead-reckoned forward with the stale velocity. When a receiver plants and
 * breaks, the defender keeps "seeing" the old stem for his reaction time —
 * separation emerges from route sharpness vs. reaction time vs. agility.
 */
import type { Vec2 } from '../core/vec.js';

const HISTORY = 24;

export interface Perceived {
  pos: Vec2;
  vel: Vec2;
}

export class PerceptionBuffer {
  private readonly n: number;
  private readonly data: Float64Array;
  private head = -1;
  private count = 0;

  constructor(
    private readonly agents: number,
    private readonly dt: number,
  ) {
    this.n = agents;
    this.data = new Float64Array(HISTORY * agents * 4);
  }

  record(states: ReadonlyArray<{ pos: Vec2; vel: Vec2 }>): void {
    this.head = (this.head + 1) % HISTORY;
    this.count = Math.min(HISTORY, this.count + 1);
    const base = this.head * this.n * 4;
    for (let i = 0; i < this.n; i++) {
      const s = states[i];
      const o = base + i * 4;
      this.data[o] = s.pos.x;
      this.data[o + 1] = s.pos.y;
      this.data[o + 2] = s.vel.x;
      this.data[o + 3] = s.vel.y;
    }
  }

  /** State of agent `i` as perceived with `delay` seconds of latency. */
  perceive(i: number, delay: number): Perceived {
    const back = Math.min(this.count - 1, Math.max(0, Math.round(delay / this.dt)));
    const idx = (this.head - back + HISTORY) % HISTORY;
    const o = idx * this.n * 4 + i * 4;
    const x = this.data[o];
    const y = this.data[o + 1];
    const vx = this.data[o + 2];
    const vy = this.data[o + 3];
    const lag = back * this.dt;
    return { pos: { x: x + vx * lag, y: y + vy * lag }, vel: { x: vx, y: vy } };
  }
}

/** Bounded visual acquisition for incidental offensive catches. This does not
 * assign a route or chase the hidden intended target. Sensing writes once at
 * the tick boundary; the catch resolver and diagnostics only read.
 */
import type { Vec3 } from '../core/vec.js';
import type { BallFlight } from '../physics/ball.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { shouldersOf } from '../physics/kinematics.js';

/** Same coarse over-shoulder field as the existing catch-facing test. Body
 * facing approximates visual attention; occlusion/head turns remain unmodeled.
 * The half-second age bound is an assumption, not an NFL-fitted parameter.
 */
export const INCIDENTAL_FLIGHT_MAX_AGE = .5;

export interface AcquiredCatchFlight {
  sampledAt: number;
  availableAt: number;
  pos: Vec3;
  vel: Vec3;
}

export class IncidentalCatchReadiness {
  private flight: BallFlight | null = null;
  private lastSenseAt = -Infinity;
  private readonly pending = new Map<number, AcquiredCatchFlight[]>();
  private readonly seen = new Map<number, AcquiredCatchFlight>();

  sense(sim: PlaySim): void {
    if (sim.t <= this.lastSenseAt) return;
    this.lastSenseAt = sim.t;
    const ball = sim.ball;
    const flight = ball.kind === 'air' ? ball.flight : null;
    if (flight !== this.flight) {
      this.pending.clear();
      this.seen.clear();
      this.flight = flight;
    }
    if (!flight) return;
    for (const a of sim.offense) {
      const queue = this.pending.get(a.idx) ?? [];
      const dx = flight.pos.x - a.pos.x, dy = flight.pos.y - a.pos.y;
      const distance = Math.hypot(dx, dy);
      const front = shouldersOf(a.body);
      const facing = (Math.cos(front) * dx + Math.sin(front) * dy) / Math.max(1e-9, distance);
      if (!a.isDown(sim.t) && facing > -.35) {
        // Reuse targeted TrackBall's acquisition scale, including this mind's
        // current attention latency. No extra per-tick execution draw.
        const delay = a.mind.observationDelay(.08 + .25 * (1 - a.r('ballTracking')));
        queue.push({ sampledAt: sim.t, availableAt: sim.t + Math.ceil((delay - 1e-9) / sim.dt) * sim.dt,
          pos: { ...flight.pos }, vel: { ...flight.vel } });
      }
      const waiting: AcquiredCatchFlight[] = [];
      for (const sample of queue) {
        if (sample.availableAt <= sim.t + 1e-9) this.seen.set(a.idx, sample);
        else waiting.push(sample);
      }
      this.pending.set(a.idx, waiting);
    }
  }

  /** No fallback to the ball, a live target, tags or installed assignment. */
  query(a: Agent, now: number): AcquiredCatchFlight | null {
    const sample = this.seen.get(a.idx);
    if (!sample || now + 1e-9 < sample.availableAt || now - sample.sampledAt > INCIDENTAL_FLIGHT_MAX_AGE + 1e-9) return null;
    return { ...sample, pos: { ...sample.pos }, vel: { ...sample.vel } };
  }
}

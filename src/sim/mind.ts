/**
 * A compact execution model, not a simulation of thoughts. A snap starts with
 * coherent readiness/urgency/precision; workload changes attention during it.
 * Behaviors retain their football jobs, but reassess on a finite cadence.
 * All variation uses an agent-local stream, never a new coin flip per tick.
 */
import { Rng } from '../core/rng.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { r01, type Player } from '../players/types.js';

export class SnapMind {
  readonly alignmentError: number;
  readonly executionError: number;
  readonly snapDelay: number;
  readonly urgencyBias: number;
  readonly lapseStart: number;
  readonly lapseEnd: number;
  focus = 1;
  stress = 0;
  private readonly readiness: number;
  private readonly composure: number;
  private readonly discipline: number;
  private readonly recognition: number;
  private readonly reaction: number;
  private readonly aims = new Map<string, { pos: Vec2; until: number }>();
  private readonly aimTargets = new Map<string, number | null>();
  private readonly judgments = new Map<string, number>();

  constructor(player: Player, private readonly rng: Rng, energy = 1) {
    const r = player.ratings;
    const consistency = r01(r.consistency);
    this.composure = r01(r.composure);
    this.discipline = r01(r.discipline);
    this.recognition = r01(r.playRecognition);
    this.reaction = 0.4 - 0.24 * (0.65 * this.recognition + 0.35 * r01(r.awareness));
    this.readiness = clamp(0.94 + rng.normal(0, 0.04 + 0.14 * (1 - consistency)), 0.45, 1);
    this.alignmentError = rng.normalClamped(0, 0.025 + 0.16 * (1 - this.discipline) + 0.10 * (1 - consistency), -0.65, 0.65);
    this.executionError = rng.normalClamped(0, 0.06 + 0.32 * (1 - consistency), -0.75, 0.75);
    this.snapDelay = clamp(0.015 + (1 - this.readiness) * 0.12 + rng.normal(0, 0.012), 0, 0.10);
    // Low discipline and anticipation can produce an early, aggressive fit.
    this.urgencyBias = clamp(0.3 * (1 - this.discipline) + 0.2 * r01(r.anticipation) + rng.normal(0, 0.13 * (1 - consistency)), -0.3, 0.55);
    const lapse = rng.chance(0.02 + 0.16 * (1 - this.discipline) + 0.14 * (1 - consistency));
    this.lapseStart = lapse ? rng.range(0.10, 0.45) : Infinity;
    this.lapseEnd = lapse ? this.lapseStart + rng.range(0.20, 0.55) : Infinity;
    this.update(0, 0, energy, 0);
  }

  /** Local workload is visible congestion/contact; no opponent assignment input. */
  update(t: number, dt: number, energy: number, workload: number): void {
    const target = clamp(workload, 0, 1);
    this.stress += (target - this.stress) * (1 - Math.exp(-dt / 0.30));
    const lapse = t >= this.lapseStart && t < this.lapseEnd;
    this.focus = clamp(this.readiness - 0.18 * (1 - energy) - 0.28 * this.stress * (1 - this.composure) - (lapse ? 0.40 : 0), 0.25, 1);
  }

  get urgency(): number {
    return clamp(0.5 + this.urgencyBias + 0.18 * this.stress * (1 - this.composure), 0.1, 0.95);
  }

  observationDelay(base: number): number {
    return base + 0.12 * (1 - this.focus) + 0.06 * this.stress * (1 - this.composure);
  }

  get decisionInterval(): number {
    return 0.07 + this.reaction * 0.45 + 0.12 * (1 - this.focus) + 0.06 * this.stress * (1 - this.composure);
  }

  /** Looking into the backfield can obscure the guard key for a whole beat. */
  keyAttention(t: number): number {
    return t >= this.lapseStart && t < this.lapseEnd ? 0.35 : 0.8 + 0.2 * this.focus;
  }

  /** Register the play-local target index selected by existing policy, even when
   * its next branch does not consume an aim. One current owner per job prevents
   * A→B→A from reviving A's obsolete action. This makes no new target decision. */
  setAimTarget(job: string, target: number | null): void {
    if (this.aimTargets.get(job) === target) return;
    this.aimTargets.set(job, target);
    this.aims.delete(job);
  }

  /** Hold an action long enough to execute it; changed cues for the same
   * target affect the next read. Targeted callers register selection above. */
  aim(job: string, desired: Vec2, t: number): Vec2 {
    const previous = this.aims.get(job);
    if (previous && t < previous.until) return previous.pos;
    const pos = { ...desired };
    this.aims.set(job, { pos, until: t + this.decisionInterval });
    return pos;
  }

  /** Coherent placement error grows under load, rather than jittering each frame. */
  get placementError(): number {
    return this.executionError * (0.4 + 0.6 * (1 - this.focus) + 0.3 * this.stress);
  }

  /** Stable error in an opponent's capability estimate, shared across options. */
  judgment(key: string): number {
    let error = this.judgments.get(key);
    if (error === undefined) {
      error = this.rng.fork(`judgment:${key}`).normal(0, 1);
      this.judgments.set(key, error);
    }
    return error * (1 + 0.5 * (1 - this.focus));
  }
}

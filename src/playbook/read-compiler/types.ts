/**
 * Read-plan compiler (docs/research/2026-11-11-qb-read-compiler-design.md). Phase 0 diagnostics
 * (docs/reviews/2026-11-11-read-compiler-phase0.md); Phase 1: with READ_PLAN, QBPass runs the chosen plan
 * (src/playbook/read-compiler/runtime.ts), otherwise `concept.progression`.
 */
import type { ReceiverRef } from '../types.js';

/** One eligible receiver's planned route, sampled from the engine with no defenders in play. */
export interface RouteDescriptor {
  ref: ReceiverRef;
  slot: string;
  routeId: string;
  /** Alignment at the snap: yards behind the line (+) and lateral offset from the ball toward his own side (+). */
  startDepth: number;
  startWidth: number;
  side: 'S' | 'W' | 'B';
  family: string;
  /** Planned trajectory from the snap, 0.1 s steps: x yards past the line, y offset from the ball (+ toward strength). */
  trajectory: Array<{ t: number; x: number; y: number; speed: number }>;
  /** First planned break (heading turn over 35 deg at speed, or a settle), if any. */
  breakT: number | null;
  breakAt: { x: number; y: number } | null;
  /** When he is a throw: ready (route declared and the QB can be set), best, last (a settled route dies, a go runs on). */
  window: { ready: number; best: number; last: number };
  /** Depth band at his ready time and his lateral travel across the formation. */
  depthAtReady: number;
  crossesField: boolean;
  isBack: boolean;
  /** The back's assignment is a check-release (concept.back 'check'): he checks protection, then is the check-down. */
  checkRelease: boolean;
  /** His route ends settled (a hitch, hook, stick, curl or sit: nearly stopped at the end of the horizon). */
  settles: boolean;
}

export type MotifKind = 'vertical_high_low' | 'horizontal_stretch' | 'flood' | 'triangle' | 'cross_post' | 'levels'
  | 'mesh' | 'smash' | 'seams' | 'isolation' | 'back_outlet' | 'clearout' | 'clear_void';

export interface Motif {
  kind: MotifKind;
  refs: ReceiverRef[];
  /** The underneath or deep role the pair stresses, named generically. */
  role?: string;
  confidence: number;
  why: string;
}

export type PlanStyle = 'pure' | 'pure_with_alert' | 'half_field' | 'defender_key' | 'triangle' | 'vertical_peek';

export interface ReadStep { ref: ReceiverRef; rhythm: 'drop' | 'hitch1' | 'hitch2' | 'late'; window: [number, number] }

export interface Candidate {
  style: PlanStyle;
  /** The pure order (or the default branch for a key/half-field plan). */
  order: ReadStep[];
  outlet: ReceiverRef | null;
  alert?: ReceiverRef;
  /** A defender key: the defender between `low` and `high` (role named generically) is read at `cueBy`; if he
   * plays the high route (sinks, carries it) the throw is `low`, if he plays the low one (squats, jumps it) it is
   * `high`. `onCue`/`otherwise` are the same pair, kept for the Phase 0 audit. */
  key?: { role: string; onCue: ReceiverRef; otherwise: ReceiverRef; cueBy: number; low?: ReceiverRef; high?: ReceiverRef };
  /** A triangle: three routes read as one picture, top-down. A vertical peek uses the same field for its verticals
   * (one look at them as a picture, then the back). */
  triangle?: ReceiverRef[];
  halves?: { strong: ReceiverRef[]; weak: ReceiverRef[] };
  valid: boolean;
  hardFailures: string[];
  warnings: string[];
  score: number;
  rationale: string[];
}

export interface CompiledPlay {
  conceptId: string;
  formation: string;
  flip: boolean;
  qbSetAt: number;
  routes: RouteDescriptor[];
  excluded: Array<{ ref: string; why: string }>;
  motifs: Motif[];
  candidates: Candidate[];
  chosen: Candidate | null;
  bypass?: string;
}

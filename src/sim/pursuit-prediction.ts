/** Already computed pursuit witnesses, copied only for a selected diagnostic actor. */
import type { Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { InterceptPrediction } from '../physics/reach.js';
import type { Perceived } from './perception.js';

export type PursuitPredictionRecord = {
  kind: 'intercept';
  prediction: InterceptPrediction;
  estimateAppliesTo: 'sampled-point-before-bias-and-leverage';
  steeringPointEstimate: 'not-evaluated';
  pursuer: { position: Vec2; velocity: Vec2; speedScale: number;
    capacity: { vmax: number; tau: number; brake: number; lateral: number } };
  observed: Perceived;
  older: Perceived;
  forecast: { model: 'fixed-observed-heading-relaxing-speed'; heading: Vec2; initialSpeed: number;
    acceleration: number; speedLimit: number; targetBrake: number; targetSprintTau: number;
    relaxedSpeed: number; relaxationTime: number; lateralBoundary: [number, number] };
  timeBias: number;
  biasedTime: number;
  forecastPoint: Vec2;
  leverage: number;
  steeringPoint: Vec2;
} | {
  kind: 'chase';
  planner: 'used' | 'bypassed-close-gather';
  requestedHorizon: number;
  observed: Perceived;
  distance: number;
  contact: number;
  offset: number;
  gather: number;
  /** TKL-2 effort read behind the sprint request (absent on the close-gather bypass). */
  effortRead?: PursuitEffortRead;
  /** These helper requests may still be superseded by the controller or later pipeline stages. */
  requests: Array<{ stage: 'intercept-sprint' | 'approach-and-gather' | 'around-bodies' | 'close-gather' | 'held-tackle'; command: MoveCommand }>;
};

/** Why a pursuer sprints or paces, from his own pictures (TKL-2). */
export interface PursuitEffortRead {
  /** Full-effort intercept over the read horizon (time for the runner to reach the goal, 3–8 s). */
  horizon: number;
  feasible: boolean;
  /** Runner-path time of his own full-effort intercept; null when none is feasible. */
  interceptTime: number | null;
  /** Unblocked, standing teammates whose pictures intercept strictly earlier (counted up to 2;
   * not counted, 0, when he has no feasible intercept and holds no sprint). */
  betterPlaced: number;
  /** What the read alone asks for, before hysteresis. */
  wants: 'sprint' | 'pace';
  /** Held decision after hysteresis. */
  mode: 'sprint' | 'pace';
  effort: number;
}

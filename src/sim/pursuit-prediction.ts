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
  forecast: { model: 'fixed-observed-heading-relaxing-speed' | 'carrier-accel-believed-burst'; heading: Vec2; initialSpeed: number;
    acceleration: number; speedLimit: number; targetBrake: number; targetSprintTau: number;
    relaxedSpeed: number; relaxationTime: number; lateralBoundary: [number, number];
    /** CARRIER_ACCEL: the forecast's carrier speed 0.5 s and 1.0 s ahead, and its heading commitment (0..1). */
    speedAhead?: [number, number]; commit?: number };
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
  /** These helper requests may still be superseded by the controller or later pipeline stages. */
  requests: Array<{ stage: 'intercept-sprint' | 'approach-and-gather' | 'around-bodies' | 'close-gather' | 'held-tackle'; command: MoveCommand }>;
};

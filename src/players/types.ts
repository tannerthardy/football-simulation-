/**
 * Player data model. Measurables are physical ground truth (they drive the
 * kinematic body); ratings (1–100) describe skill and mind.
 */

export type Position =
  | 'QB'
  | 'RB'
  | 'FB'
  | 'WR'
  | 'TE'
  | 'OT'
  | 'OG'
  | 'C'
  | 'EDGE'
  | 'DT'
  | 'LB'
  | 'CB'
  | 'S'
  | 'K'
  | 'P';

export const OFFENSIVE_POSITIONS: readonly Position[] = ['QB', 'RB', 'FB', 'WR', 'TE', 'OT', 'OG', 'C'];
export const DEFENSIVE_POSITIONS: readonly Position[] = ['EDGE', 'DT', 'LB', 'CB', 'S'];
export const SPECIALIST_POSITIONS: readonly Position[] = ['K', 'P'];
export const ALL_POSITIONS: readonly Position[] = [...OFFENSIVE_POSITIONS, ...DEFENSIVE_POSITIONS, ...SPECIALIST_POSITIONS];

export interface Measurables {
  heightIn: number;
  weightLb: number;
  armIn: number;
  handIn: number;
  /** 40-yard dash, seconds. */
  forty: number;
  /** 10-yard split, seconds. */
  tenSplit: number;
  /** 20-yard short shuttle, seconds. */
  shuttle: number;
  threeCone: number;
  /** Vertical jump, inches. */
  vertical: number;
  /** Broad jump, inches. */
  broad: number;
  /** 225 lb bench reps. */
  bench: number;
}

export const RATING_KEYS = [
  // physical (non-measurable)
  'strength',
  'stamina',
  'balance',
  'toughness',
  // passing
  'throwPower',
  'accShort',
  'accMid',
  'accDeep',
  'release',
  'throwOnRun',
  'touch',
  'pocketPresence',
  // ball carrier
  'vision',
  'elusiveness',
  'breakTackle',
  'ballSecurity',
  'patience',
  // receiving
  'routeRunning',
  'releaseVsPress',
  'hands',
  'contestedCatch',
  'ballTracking',
  // blocking
  'passBlock',
  'runBlock',
  'handTechnique',
  'leadBlock',
  // defense
  'passRushPower',
  'passRushFinesse',
  'blockShedding',
  'tackling',
  'hitPower',
  'pursuit',
  'manCoverage',
  'zoneCoverage',
  'press',
  'ballSkills',
  // kicking
  'kickPower',
  'kickAccuracy',
  'puntPower',
  'puntAccuracy',
  // mental
  'awareness',
  'playRecognition',
  'decisionMaking',
  'composure',
  'discipline',
  'anticipation',
  'consistency',
  'workRate',
] as const;

export type RatingKey = (typeof RATING_KEYS)[number];
export type Ratings = Record<RatingKey, number>;

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  jersey: number;
  position: Position;
  age: number;
  /** Years in the league. */
  experience: number;
  measurables: Measurables;
  ratings: Ratings;
  /** 0–1 comfort at positions other than the primary one. */
  familiarity: Partial<Record<Position, number>>;
  /** Archetype the generator used; informational. */
  archetype: string;
}

export const fullName = (p: Player): string => `${p.firstName} ${p.lastName}`;
export const shortName = (p: Player): string => `${p.firstName[0]}.${p.lastName}`;

export function familiarityAt(p: Player, pos: Position): number {
  if (p.position === pos) return 1;
  return p.familiarity[pos] ?? 0.35;
}

/** Normalize a 1–100 rating to 0–1. */
export const r01 = (rating: number): number => Math.max(0, Math.min(1, (rating - 1) / 98));

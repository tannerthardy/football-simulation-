/**
 * The composed pass call (CALL_COMPOSE, experimental, off; docs/reviews/2026-11-24-call-composition.md, approved by the
 * user 2026-11-24). A real call is built from parts, not one name. Coryell, the West Coast and Erhardt-Perkins all put
 * the same pieces in the same order: formation, motion, protection, the routes (a half-field concept per side or one
 * full-field concept), tags, the back's job, the drop, the snap count, and optionally an alert or a kill.
 *
 * Step 1 (this file's first use) holds only the data: the 32 pool concepts as compositions that compile to exactly
 * today's `PassConcept`. Protection, alerts, kills and the snap count are declared for the later steps and not yet
 * read.
 */
import type { DropType, PassConcept, ReceiverRef } from '../types.js';

/** One side's concept: routes on receiver numbers, outside-in, so it runs from any formation. A half is the
 * concept's own receivers. An extra receiver on that side gets his route from a tag. */
export interface HalfConcept {
  id: string;
  name: string;
  routes: Partial<Record<1 | 2 | 3 | 4, string>>;
}

/** A concept that reads across the field by design (mesh, the crossers, four verticals, the play-action shots).
 * Its two sides only make sense together. */
export interface FullConcept {
  id: string;
  name: string;
  strong: Partial<Record<1 | 2 | 3 | 4, string>>;
  weak: Partial<Record<1 | 2 | 3 | 4, string>>;
}

/** A tag replaces (or supplies) one receiver's route: "Mesh Z Post", or the #3 a two-man half leaves out. */
export interface Tag {
  who: ReceiverRef;
  route: string;
}

/** The back's job, one choice: in protection, or released (with his release word) on a route. Step 1 reproduces
 * today's three cases: 'block' = stay; 'check' with no route = today's check (block, then the engine's release);
 * 'check' with a route = an assigned back route, released when the protection count allows (BACK_RELEASE).
 * 'slow' and 'scat' are step 2's. */
export type BackJob = { stay: true } | { release: 'check' | 'slow' | 'scat'; route?: string };

/** The protection as a called piece (step 2). The back's word lives in `BackJob`. */
export interface ProtectionCall {
  family: 'half_slide' | 'full_slide' | 'man' | 'jet' | 'max';
  slide?: 'strong' | 'weak';
  te?: 'stay' | 'check' | 'release';
}

/** A pre-snap condition in QB_V2's alert vocabulary (`AlertCond`: shell, press, cushion, leverage, boxAtLeast).
 * Typed here as opaque until src/sim/qbv2/plan.ts is on develop (step 3). A kill's rule uses the same vocabulary, so
 * Flex's pre-snap module evaluates both with one evaluator. */
export type PreSnapCond = Record<string, unknown>;
export type KillRule = PreSnapCond | PreSnapCond[];

/** The 32 pool concepts as compositions. The fields beyond routes and back are carried as today's concept has
 * them. In step 3, the read order comes from the halves' plans instead of `progression`. */
export interface Composition {
  id: string;
  name: string;
  family: PassConcept['family'];
  drop: DropType;
  routes: { strong: string; weak: string } | { full: string };
  tags?: Tag[];
  back: BackJob;
  teBlock?: boolean;
  progression: ReceiverRef[];
  beats: string[];
  needs?: PassConcept['needs'];
  backThree?: string;
  fake?: string;
  read?: string;
  minReceivers?: number;
}

/** The full call (steps 2-4). Declared now so the shape is fixed, but not yet built by the play-caller. */
export interface PassCall {
  formation: string;
  motion?: string;
  protection?: ProtectionCall;
  routes: { strong: string; weak: string } | { full: string };
  tags?: Tag[];
  back: BackJob;
  drop: 'derived' | DropType;
  snap?: number;
  alert?: { half: 'strong' | 'weak'; read: number; when: PreSnapCond | PreSnapCond[] };
  kill?: { other: string; rule: KillRule };
  fake?: string;
}

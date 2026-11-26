/**
 * Call description, step 1 (Rules + Coaching, 2026-11-25; Integration's grammar plan): a per-player description of a
 * call — who / where / what / when — carrying today's football and nothing more. Shaped by what the sim reads today
 * (docs/reviews/2026-11-25-name-branch-inventory.md, finding 1), not by an idealised design. Data only: nothing in the
 * sim imports it yet. The presets (formations, fronts, coverages, pressures, concepts) lower into it and back
 * (`describe.ts`, `lower.ts`); `test/ir-roundtrip.test.ts` proves the alignments they produce are identical.
 *
 * Names live in separate namespaces (one word, several meanings: `under` is a front, a release class and a match mode).
 * A name the description still needs because its football lives in code is an opaque `Ref` — carried, never
 * interpreted here. The list of those is the map for the later steps.
 */
import type {
  CoverageFamily, CoverageRole, DefPersonnelId, DefSlot, FormationKey, FrontAlignment, Gap, PassConcept, PersonnelId,
  QBAlignment, ReceiverRef, RunConcept, Shell, SkillSlot, SlotAlignment, UnderSeat, Coverage, Pressure,
} from '../types.js';
import type { DEF_PERSONNEL } from '../types.js';

/** A body's position as today's personnel tables name it (types.ts DEF_PERSONNEL; the type itself is not exported). */
type Position = NonNullable<(typeof DEF_PERSONNEL)[DefPersonnelId][DefSlot]>;

/** A name whose meaning lives somewhere else, in its own namespace. */
export type Namespace =
  | 'formation' | 'front' | 'front-family' | 'coverage' | 'coverage-family' | 'pressure' | 'concept'
  | 'route' | 'run-scheme' | 'drop' | 'pass-family';
export interface Ref<N extends Namespace = Namespace> { readonly ns: N; readonly id: string }
export const ref = <N extends Namespace>(ns: N, id: string): Ref<N> => ({ ns, id });

// ------------------------------------------------------------------ offense

/** One offensive skill player. `who`: his slot (the body is the personnel's). `where`: today's slot alignment (the
 * side relative to the call, the split kind and the depth behind the line); alignment.ts turns it into a spot. */
export interface OffPlayer {
  who: { slot: SkillSlot };
  where: SlotAlignment;
}

/** The offensive formation as players. The line is not described per player: its spots are today's fixed splits
 * (alignment.ts BASE_LINE, olDepth), read from no call data. */
export interface OffenseDescription {
  preset: Ref<'formation'>;
  name: string;
  personnel: PersonnelId;
  qb: { where: { alignment: QBAlignment } };
  players: OffPlayer[];
  tags: string[];
}

/** What a receiver does on a pass: a route by reference to the route table (its geometry), on his number. */
export interface RouteJob { who: ReceiverRef; route: Ref<'route'> }

/** A pass call as players. The back's job is a route, or `block` / `check` as today's data writes it. */
export interface PassDescription {
  preset: Ref<'concept'>;
  name: string;
  /** Behind a name: the quick, dropback, play-action and screen families each select code (drop rules, read compiler). */
  family: Ref<'pass-family'>;
  /** Behind a name: footwork and timing per drop live in sim/called-drop.ts and qb.ts. */
  drop: Ref<'drop'>;
  routes: RouteJob[];
  back: { job: 'block' | 'check' } | { job: 'route'; route: Ref<'route'> };
  /** Every other field of today's concept, carried as data (progression, needs, beats, the read line, screen, fake, …). */
  rest: Omit<PassConcept, 'id' | 'name' | 'family' | 'drop' | 'strong' | 'weak' | 'back'>;
}

/** A run call. The blocking and the back's path are chosen in code by the scheme's name (blocking.ts, assign.ts). */
export interface RunDescription {
  preset: Ref<'concept'>;
  name: string;
  scheme: Ref<'run-scheme'>;
  rest: Omit<RunConcept, 'id' | 'name' | 'scheme'>;
}

// ------------------------------------------------------------------ defense

/** One defender. `where`: his front spot (technique, side, depth) when the front places him; otherwise the coverage
 * places him (by his role, in alignment.ts). `what`: his coverage role, a run fit, and his pressure job. */
export interface DefPlayer {
  who: { slot: DefSlot; position: Position | undefined };
  where?: FrontAlignment;
  fit?: NonNullable<import('../types.js').Front['fits']>[DefSlot];
  what: {
    /** Today's coverage role: a zone by id (its technique is behind the zone's name, sim/behaviors/defense.ts), man on a
     * numbered receiver, blitz, rush or spy. */
    coverage?: CoverageRole;
    /** The pressure's job for him: an extra rusher's gap, or a lineman's drop. */
    pressure?: { rush: { gap: Gap; side: 'S' | 'W' } } | { drop: UnderSeat };
  };
}

/** Call-level coverage fields the sim reads (the roles are per player). The underneath seats are an ordered list:
 * which remaining defender takes which seat is decided in alignment.ts, not in data. */
export interface CoverageCall {
  preset: Ref<'coverage'>;
  name: string;
  shell: Shell;
  man: boolean;
  press: boolean;
  look?: Shell;
  family?: Ref<'coverage-family'>;
  underneath: UnderSeat[];
  checks?: Partial<Record<FormationKey, string[]>>;
  structureChecks?: Coverage['structureChecks'];
  needs?: DefSlot[];
  note?: string;
  /** Roles of slots this personnel does not field (kept so a preset round-trips; no player carries them). */
  offField: Partial<Record<DefSlot, CoverageRole>>;
}

export interface PressureCall {
  preset: Ref<'pressure'>;
  name: string;
  rushers?: number;
  maxRushers?: Pressure['maxRushers'];
  coverages: string[];
  coverage?: string;
  flag?: string;
  /** Jobs of slots this personnel does not field. */
  offField: { blitzers: Pressure['blitzers']; droppers: NonNullable<Pressure['droppers']> };
}

export interface FrontCall {
  preset: Ref<'front'>;
  name: string;
  personnel: DefPersonnelId[];
  /** Spots and fits of slots this personnel does not field. */
  offField: { slots: import('../types.js').Front['slots']; fits: NonNullable<import('../types.js').Front['fits']> };
}

/** Conditional placements a front carries, each a typed condition on the observed offense (step 1b):
 * - `samOnTE`: on a "Sam on" call, the Sam walks onto the line on the outside shoulder of an attached end on the front's
 *   strength (not against a wing, and not when a detached #2 makes him the apex);
 * - `samOverEnd`: against an attached end on the front's strength, the Sam is head-up on a wing at the end's depth, else
 *   on the end's outside shoulder at his own depth (unless he is already the apex);
 * - `samBearEnd`: against an attached end on the front's strength, the Sam is on the line in a 9 technique. */
export type FrontRule = 'samOnTE' | 'samOverEnd' | 'samBearEnd';

/** Off-ball backers' spots by how many there are: `[u, depth]` weak to strong, `u` in gap units from the ball (1 = the
 * centre-guard split, 2 = the tackle, 3 = the end man), depth past the line. */
export type SecondLevel = Partial<Record<1 | 2 | 3, ReadonlyArray<readonly [number, number]>>>;

/** A defensive call as players, plus the call-level fields the sim reads (inventory finding 1). */
export interface DefenseDescription {
  personnel: DefPersonnelId;
  players: DefPlayer[];
  /** Alignment data today's code keyed by name (step 1b): the sub package, the second level's spots, the front's
   * conditional placements. */
  alignment: { subPackage: boolean; secondLevel?: SecondLevel; frontRules: FrontRule[] };
  front: FrontCall;
  coverage: CoverageCall;
  pressure: PressureCall | null;
  /** The disguise's look, described the same way (its roles per slot). */
  shown?: { coverage: CoverageCall; roles: Partial<Record<DefSlot, CoverageRole>> };
  /** The remaining call-level fields, carried unchanged (zone style, flat threat, drop start, run policy, edge, strength,
   * mug, Sam on, DL game, gap exchange, front stem, creep, check picks, Zeus, label). */
  call: Omit<import('../types.js').DefensivePlayCall, 'personnel' | 'front' | 'coverage' | 'pressure' | 'shown'>;
}

export type { CoverageFamily };

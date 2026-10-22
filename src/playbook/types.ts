/**
 * Playbook vocabulary. Offense attacks +x; from the offense's point of view
 * LEFT is +y and RIGHT is −y.
 */
import type { Position } from '../players/types.js';

// ---------------------------------------------------------------- offense

export type SkillSlot = 'X' | 'Z' | 'Y' | 'H' | 'F' | 'RB';
export type OLSlot = 'LT' | 'LG' | 'C' | 'RG' | 'RT';
export type OffSlot = 'QB' | SkillSlot | OLSlot;

export const OL_SLOTS: readonly OLSlot[] = ['LT', 'LG', 'C', 'RG', 'RT'];
export const SKILL_SLOTS: readonly SkillSlot[] = ['X', 'Z', 'Y', 'H', 'F', 'RB'];

export type PersonnelId = '10' | '11' | '12' | '13' | '21' | '22';

export type Side = 'L' | 'R';
export const sideSign = (s: Side): number => (s === 'L' ? 1 : -1);
export const flipSide = (s: Side): Side => (s === 'L' ? 'R' : 'L');

/**
 * Horizontal alignment of a skill player:
 *  wide   — outside the numbers (boundary) / bottom of the numbers (field)
 *  slot   — between the tackle and the widest receiver
 *  slot2  — inner slot (#3 in trips)
 *  inline — attached tight end
 *  wing   — just outside and behind the tight end / tackle
 *  number — explicit yards from the ball
 */
export type Split = 'wide' | 'slot' | 'slot2' | 'inline' | 'wing' | 'core' | number;

export interface SlotAlignment {
  side: Side | 'C';
  split: Split;
  /** Yards behind the line of scrimmage (0.6 ≈ on the line, 1.2 off). */
  depth: number;
}

export type QBAlignment = 'under' | 'gun' | 'pistol';

export interface Formation {
  id: string;
  name: string;
  personnel: PersonnelId;
  qb: QBAlignment;
  slots: Partial<Record<SkillSlot, SlotAlignment>>;
  tags: string[];
}

// Routes -------------------------------------------------------------------

/**
 * A route waypoint in the receiver frame: `d` = yards beyond the LOS,
 * `l` = yards lateral from the receiver's alignment (+ = toward his sideline,
 * i.e. "outside"). `s` = speed fraction when passing the point (break speed).
 */
export interface RoutePoint {
  d: number;
  l: number;
  s?: number;
}

export type RouteEnd = 'continue' | 'settle' | 'sitVsZone';

export interface RouteDef {
  id: string;
  points: RoutePoint[];
  end: RouteEnd;
  /** Converts against man coverage (e.g. stick → out-breaking). */
  vsMan?: RoutePoint[];
  /** Typical target depth for the QB's timing (yards beyond LOS). */
  depth: number;
  /** Route family for defensive anticipation. */
  family: 'quick' | 'intermediate' | 'deep' | 'flat' | 'cross' | 'back';
}

export type ReceiverRef = `S${1 | 2 | 3 | 4}` | `W${1 | 2 | 3 | 4}` | 'B' | 'B2';

export type PassAssignment = { route: string } | { block: 'pass' } | { chip: string };

export type DropType = 'quick' | 'gun3' | 'gun5' | 'five' | 'seven' | 'pa' | 'boot';

export interface PassConcept {
  id: string;
  name: string;
  family: 'quick' | 'dropback' | 'playaction' | 'screen';
  drop: DropType;
  strong: Partial<Record<1 | 2 | 3 | 4, string>>;
  weak: Partial<Record<1 | 2 | 3 | 4, string>>;
  /** Back assignment: a route id, or 'block' (scan/protect), or 'check' (block then release). */
  back: string;
  /** Inline TEs stay in to block. */
  teBlock?: boolean;
  progression: ReceiverRef[];
  /** Which fronts/coverages it is designed to beat (for the play caller). */
  beats: string[];
  /** Personnel/formation requirements. */
  minReceivers?: number;
  /** Play-action fake attached. */
  fake?: string;
}

export type RunScheme = 'insideZone' | 'outsideZone' | 'wideZone' | 'splitZone' | 'power' | 'counter' | 'duo' | 'trap' | 'draw' | 'toss' | 'qbDraw';

export interface RunConcept {
  id: string;
  name: string;
  scheme: RunScheme;
  /** Run toward the formation's strength or away from it. */
  direction: 'strong' | 'weak';
  /** Initial aiming point: gap relative to playside OL. */
  aim: 'A' | 'B' | 'C' | 'D' | 'edge';
  /** Handoff mesh time after snap (s). */
  meshTime: number;
  /** Gap pulls: BSG kicks/leads, BST wraps; explicit Counter H tag uses an off-ball H. */
  pullers: Array<'BSG' | 'BST' | 'H'>;
  beats: string[];
}

export interface OffensivePlayCall {
  formation: Formation;
  flip: boolean;
  kind: 'pass' | 'run';
  pass?: PassConcept;
  run?: RunConcept;
  /** Display label. */
  label: string;
}

// ---------------------------------------------------------------- defense

export type DefSlot =
  | 'DE_S'
  | 'DE_W'
  | 'DT_S'
  | 'DT_W'
  | 'NT'
  | 'LB_S'
  | 'LB_M'
  | 'LB_W'
  | 'CB_S'
  | 'CB_W'
  | 'NB'
  | 'DB'
  | 'FS'
  | 'SS';

export type DefPersonnelId = 'base43' | 'base34' | 'nickel' | 'dime' | 'goalline' | 'heavy';

export type Technique = '0' | '1' | '2i' | '2' | '3' | '4i' | '4' | '5' | '6' | '7' | '9' | 'w9';

export interface FrontAlignment {
  tech: Technique;
  /** Relative to offensive strength. */
  side: 'S' | 'W';
  /** Yards beyond the LOS. */
  depth: number;
}

export interface Front {
  id: string;
  name: string;
  personnel: DefPersonnelId[];
  slots: Partial<Record<DefSlot, FrontAlignment>>;
  /** Technique location alone does not determine the run responsibility. */
  fits?: Partial<Record<DefSlot, { gap: Gap; side: 'S' | 'W'; technique?: 'attack' | 'control' | 'lag' }>>;
}

export type ZoneId =
  | 'deep_third_s'
  | 'deep_third_w'
  | 'deep_mid'
  | 'deep_half_s'
  | 'deep_half_w'
  | 'quarter_s_out'
  | 'quarter_s_in'
  | 'quarter_w_in'
  | 'quarter_w_out'
  | 'flat_s'
  | 'flat_w'
  | 'curl_flat_s'
  | 'curl_flat_w'
  | 'hook_s'
  | 'hook_w'
  | 'hook_mid'
  | 'tampa_mid'
  | 'robber'
  /** Low hole ("rat"): 5–7 yards in the middle, cutting crossers. */
  | 'hole'
  /** Curl (no flat): 10–12 yards over the slot, inverted/Tampa curl players. */
  | 'curl_s'
  | 'curl_w';

export type Gap = 'A' | 'B' | 'C' | 'D';

/**
 * Pattern-match rules: how a defender's job changes with the releases of the
 * receivers he keys (see src/sim/coverage/rules.ts). The zone on the role is
 * his nominal landmark (alignment, run fits, the QB's coverage picture).
 */
export type MatchRule =
  | 'c3_corner'
  | 'c3_curl_flat'
  | 'c3_seam'
  | 'c3_hook'
  | 'mike_3'
  | 'q_corner_mod'
  | 'q_corner_meg'
  | 'q_safety'
  | 'q_apex'
  | 'palms_corner'
  | 'palms_safety'
  | 'cloud_corner'
  | 'sink_corner'
  | 'c2_hook'
  | 'tampa_mike'
  | 'poach_safety'
  | 'stubbie_safety'
  | 'invert_safety'
  | 'rat'
  | 'robber';

export type ManLeverage = 'inside' | 'outside' | 'head';

export type CoverageRole =
  | {
      kind: 'zone';
      zone: ZoneId;
      rule?: MatchRule;
      style?: ZoneStyle;
      /** Pre-snap depth (yards) when the call sets it: a rotating safety cheats down, an inverted corner presses to bail. */
      depth?: number;
    }
  | {
      kind: 'man';
      prefer?: ReceiverRef[];
      /** Shoulder he plays (default inside, toward help). */
      lev?: ManLeverage;
      /** Low-hip trail under the receiver (deep help over the top). */
      trail?: boolean;
      /** Stay on top of the receiver (a deep player in a bracket). */
      overTop?: boolean;
      /** Independently protect this receiver's vertical; no assumed deep helper. */
      protectDepth?: boolean;
      /** May double a receiver another defender already has (bracket). */
      double?: boolean;
      /** Press regardless of the call's default technique. */
      press?: boolean;
    }
  | { kind: 'blitz'; gap: Gap; side: 'S' | 'W' }
  | { kind: 'rush' }
  | { kind: 'spy' };

export type Shell = 'one-high' | 'two-high' | 'zero';

/** PFF-style coverage families (what the coverage is, not every detail of how). */
export type CoverageFamily = 'cover0' | 'cover1' | 'cover2' | 'tampa2' | 'cover2man' | 'cover3' | 'cover4' | 'cover6' | 'prevent';

/** Receiver distribution a coverage can check against. */
export type FormationKey = '2x2' | '3x1' | '2x1' | '3x2' | '4x1' | 'empty' | 'heavy';

/** An underneath seat: a zone, optionally with a match rule or style. */
export type UnderSeat = ZoneId | { zone: ZoneId; rule?: MatchRule; style?: ZoneStyle };

export interface Coverage {
  id: string;
  name: string;
  shell: Shell;
  man: boolean;
  /** Explicit roles for named slots (deep players, corners). */
  roles: Partial<Record<DefSlot, CoverageRole>>;
  /** Underneath seats filled by remaining non-rushers, in priority order. */
  underneath: UnderSeat[];
  /** Corner technique. */
  press: boolean;
  /** Pre-snap shell when it differs from the post-snap structure (rotations from two-high). */
  look?: Shell;
  /** Family for identification, scouting and NFL frequencies. */
  family?: CoverageFamily;
  /** Formation checks: the call becomes one of these against that distribution. */
  checks?: Partial<Record<FormationKey, string[]>>;
  /** One line: what it is and what it takes away. */
  note?: string;
}

export interface Pressure {
  id: string;
  name: string;
  /** Extra rushers: slot → gap. */
  blitzers: Partial<Record<DefSlot, { gap: Gap; side: 'S' | 'W' }>>;
  /** Defensive linemen who drop into coverage instead of rushing. */
  droppers?: Partial<Record<DefSlot, ZoneId>>;
  /** Compatible coverages. */
  coverages: string[];
}

/**
 * How zone defenders play their zones. `spot`: drop to a landmark and play
 * the quarterback's eyes and arm, no route matching ("spot drop", "country"
 * zone). `match`: pattern-match zone — carry verticals through the zone and
 * pick up whoever enters it.
 */
export type ZoneStyle = 'spot' | 'match';

export interface DefensivePlayCall {
  personnel: DefPersonnelId;
  front: Front;
  coverage: Coverage;
  pressure: Pressure | null;
  /** Zone technique for zone defenders (default `match`). */
  zoneStyle?: ZoneStyle;
  /**
   * Disguise: the coverage the secondary *shows* pre-snap. DBs align in this
   * look and rotate to the real coverage at the snap (absent = no disguise).
   */
  shown?: Coverage;
  /** Explicit run policy; support availability still comes from coverage. */
  runPolicy?: { edge: 'box' | 'spill'; linebacker: 'plug' | 'stack' };
  /** FRONT_ALIGN: an explicit edge call for the end men (tight on the end or
   * a tackle's ghost, an outside shade, or wide); absent = the installs'
   * rules from the look. */
  edge?: 'tight' | 'base' | 'wide';
  /** Called end spike / linebacker scrape exchanges both responsibilities. */
  gapExchange?: { edge: 'DE_S' | 'DE_W'; backer: 'LB_S' | 'LB_M' | 'LB_W' };
  /** Show another compatible front, then move at a finite rate before snap. */
  frontStem?: { from: Front; secondsBeforeSnap: number };
  /** A pressure player walks toward his called gap, possibly still moving at snap. */
  creep?: { slot: DefSlot; secondsBeforeSnap: number };
  /** Which of the coverage's formation checks this coordinator prefers (index). */
  checkPick?: number;
  /** Zeus: the offensive slot this zone call doubles; resolved to Cover 8 / Stuff / Quads by his alignment. */
  zeus?: SkillSlot;
  label: string;
}

export const DEF_PERSONNEL: Record<DefPersonnelId, Partial<Record<DefSlot, Position>>> = {
  base43: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', LB_S: 'LB', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', FS: 'S', SS: 'S' },
  base34: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', NT: 'DT', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', FS: 'S', SS: 'S' },
  nickel: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', NB: 'CB', FS: 'S', SS: 'S' },
  dime: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', LB_M: 'LB', CB_S: 'CB', CB_W: 'CB', NB: 'CB', DB: 'CB', FS: 'S', SS: 'S' },
  goalline: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', NT: 'DT', LB_S: 'LB', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', SS: 'S' },
  // Short yardage away from the goal line (SHORT_PACKAGE): five down, two backers, a safety deep.
  heavy: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', NT: 'DT', LB_S: 'LB', LB_M: 'LB', CB_S: 'CB', CB_W: 'CB', FS: 'S', SS: 'S' },
};

export const OFF_PERSONNEL: Record<PersonnelId, Partial<Record<SkillSlot, Position>>> = {
  '10': { RB: 'RB', X: 'WR', Z: 'WR', H: 'WR', Y: 'WR' },
  '11': { RB: 'RB', X: 'WR', Z: 'WR', H: 'WR', Y: 'TE' },
  '12': { RB: 'RB', X: 'WR', Z: 'WR', Y: 'TE', H: 'TE' },
  '13': { RB: 'RB', X: 'WR', Y: 'TE', H: 'TE', F: 'TE' },
  '21': { RB: 'RB', X: 'WR', Z: 'WR', Y: 'TE', F: 'FB' },
  '22': { RB: 'RB', X: 'WR', Y: 'TE', H: 'TE', F: 'FB' },
};

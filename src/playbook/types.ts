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

export type RunScheme = 'insideZone' | 'outsideZone' | 'power' | 'counter' | 'duo' | 'trap' | 'draw' | 'toss' | 'qbDraw';

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
  /** Backside guard / tackle pulls (gap schemes): BSG kicks out or leads, BST leads. */
  pullers: Array<'BSG' | 'BST'>;
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

export type DefPersonnelId = 'base43' | 'base34' | 'nickel' | 'dime' | 'goalline';

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
  | 'robber';

export type Gap = 'A' | 'B' | 'C' | 'D';

export type CoverageRole =
  | { kind: 'zone'; zone: ZoneId }
  | { kind: 'man'; prefer?: ReceiverRef[] }
  | { kind: 'blitz'; gap: Gap; side: 'S' | 'W' }
  | { kind: 'rush' }
  | { kind: 'spy' };

export type Shell = 'one-high' | 'two-high' | 'zero';

export interface Coverage {
  id: string;
  name: string;
  shell: Shell;
  man: boolean;
  /** Explicit roles for named slots (deep players, corners). */
  roles: Partial<Record<DefSlot, CoverageRole>>;
  /** Underneath zones filled by remaining non-rushers, in priority order. */
  underneath: ZoneId[];
  /** Corner technique. */
  press: boolean;
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

export interface DefensivePlayCall {
  personnel: DefPersonnelId;
  front: Front;
  coverage: Coverage;
  pressure: Pressure | null;
  /**
   * Disguise: the coverage the secondary *shows* pre-snap. DBs align in this
   * look and rotate to the real coverage at the snap (absent = no disguise).
   */
  shown?: Coverage;
  label: string;
}

export const DEF_PERSONNEL: Record<DefPersonnelId, Partial<Record<DefSlot, Position>>> = {
  base43: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', LB_S: 'LB', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', FS: 'S', SS: 'S' },
  base34: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', NT: 'DT', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', FS: 'S', SS: 'S' },
  nickel: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', NB: 'CB', FS: 'S', SS: 'S' },
  dime: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', LB_M: 'LB', CB_S: 'CB', CB_W: 'CB', NB: 'CB', DB: 'CB', FS: 'S', SS: 'S' },
  goalline: { DE_S: 'EDGE', DE_W: 'EDGE', DT_S: 'DT', DT_W: 'DT', NT: 'DT', LB_S: 'LB', LB_M: 'LB', LB_W: 'LB', CB_S: 'CB', CB_W: 'CB', SS: 'S' },
};

export const OFF_PERSONNEL: Record<PersonnelId, Partial<Record<SkillSlot, Position>>> = {
  '10': { RB: 'RB', X: 'WR', Z: 'WR', H: 'WR', Y: 'WR' },
  '11': { RB: 'RB', X: 'WR', Z: 'WR', H: 'WR', Y: 'TE' },
  '12': { RB: 'RB', X: 'WR', Z: 'WR', Y: 'TE', H: 'TE' },
  '13': { RB: 'RB', X: 'WR', Y: 'TE', H: 'TE', F: 'TE' },
  '21': { RB: 'RB', X: 'WR', Z: 'WR', Y: 'TE', F: 'FB' },
  '22': { RB: 'RB', X: 'WR', Y: 'TE', H: 'TE', F: 'FB' },
};

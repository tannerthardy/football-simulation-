/**
 * Structured offensive formations (docs/FORMATION_CATALOG_PLAN.md, phase 1).
 *
 * A formation is stored as structure: personnel by role, the QB's alignment,
 * a set family, and each skill player's side, spot and line status. The
 * `Formation` the engine aligns is compiled from it, and labels are rendered
 * from it. Never parse a label back into a formation.
 *
 * Written right-handed: strength to the offense's right (side 'R'), as in
 * formations.ts. A play call may flip it.
 */
import type { Formation, PersonnelId, QBAlignment, SkillSlot, SlotAlignment, Split } from './types.js';

/** On the line / off it, yards behind the ball (formations.ts conventions). */
export const ON = 0.6;
export const OFF = 1.2;
// A wing is 0.7 yd deeper than the attached end beside him (2022 tracking:
// end 1.02, wing 1.73 behind the ball at the snap; the inline end is 1.19 here).
export const WING = 1.9;
// Representative offset-gun run alignment: 2.3 yd beside the 5 yd-deep QB
// and 0.5 yd behind him. Empty and pistol use their own placements.
export const GUN_RB_SPLIT = 2.3;
export const GUN_RB_DEPTH = 5.5;

export type Role = 'WR' | 'TE' | 'RB' | 'FB';
export type SpecSide = 'strong' | 'weak' | 'middle';

/** Named backfield spots, so a back's placement is structure, not a number. */
export const BACK_SPOTS = {
  /** Gun offset beside the QB. */
  gunOffset: { split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
  /** Single back behind an under-centre QB. */
  singleUnder: { split: 0, depth: 6.8 },
  /** Single back behind a pistol QB. */
  pistol: { split: 0, depth: 7.2 },
  /** I formation: fullback, then tailback. */
  iFullback: { split: 0, depth: 4.3 },
  iTailback: { split: 0, depth: 7.0 },
  /** Offset I fullback (strong or weak by side). */
  offsetFullback: { split: 1.5, depth: 4.2 },
} as const;
export type BackSpot = keyof typeof BACK_SPOTS;

export type PlayerSpec = {
  slot: SkillSlot;
  role: Role;
  side: SpecSide;
} & (
  /** A receiver or end: named spot (or explicit yards from the ball), on or off the line. */
  | { at: Exclude<Split, 'core'>; line: boolean; depth?: number; back?: never }
  /** A back at a named backfield spot. */
  | { back: BackSpot; at?: never; line?: never; depth?: never }
);

export type SetFamily = 'Doubles' | 'Trips' | 'Trey' | 'Bunch' | 'Empty' | 'Ace' | 'Spread'
  | 'Twin TE' | 'Wing' | 'Pro' | 'Twins' | 'Offset I' | 'Jumbo';

export interface FormationSpec {
  id: string;
  /** The human name (Madden-style); labels are rendered separately. */
  name: string;
  qb: QBAlignment;
  family: SetFamily;
  tags: string[];
  /** Skill players in slot order (the compiled slot order). */
  players: PlayerSpec[];
}

export interface PersonnelCount { RB: number; FB: number; TE: number; WR: number }

export function personnelCount(spec: FormationSpec): PersonnelCount {
  const n: PersonnelCount = { RB: 0, FB: 0, TE: 0, WR: 0 };
  for (const p of spec.players) n[p.role]++;
  return n;
}

/** NFL personnel digits: backs (RB + FB), then tight ends. */
export function personnelId(spec: FormationSpec): string {
  const n = personnelCount(spec);
  return `${n.RB + n.FB}${n.TE}`;
}

const SIDE: Record<SpecSide, SlotAlignment['side']> = { strong: 'R', weak: 'L', middle: 'C' };

function slotOf(p: PlayerSpec): SlotAlignment {
  if (p.back !== undefined) {
    const b = BACK_SPOTS[p.back];
    return { side: SIDE[p.side], split: b.split, depth: b.depth };
  }
  return { side: SIDE[p.side], split: p.at, depth: p.depth ?? (p.at === 'wing' ? WING : p.line ? ON : OFF) };
}

/** The engine's formation, with the same keys in the same order as a literal. */
export function compileFormation(spec: FormationSpec): Formation {
  const slots: Formation['slots'] = {};
  for (const p of spec.players) slots[p.slot] = slotOf(p);
  return { id: spec.id, name: spec.name, personnel: personnelId(spec) as PersonnelId, qb: spec.qb, tags: [...spec.tags], slots };
}

// ------------------------------------------------------------------ labels

const isBack = (p: PlayerSpec) => p.back !== undefined;
const attached = (p: PlayerSpec) => !isBack(p) && (p.at === 'inline' || p.at === 'wing');

/** Eligible receivers aligned on each side (backs excluded): "3x1". */
export function distribution(spec: FormationSpec): { strong: number; weak: number } {
  const count = (side: SpecSide) => spec.players.filter(p => !isBack(p) && p.side === side).length;
  return { strong: count('strong'), weak: count('weak') };
}

const QB_WORD: Record<QBAlignment, string> = { under: 'Under', gun: 'Gun', pistol: 'Pistol' };
const SIDE_WORD = (side: SpecSide, dir: 'Rt' | 'Lt') => side === 'middle' ? '' : side === 'strong' ? 'strong' : 'weak';

/**
 * One grammar for every formation:
 *   `<personnel> <QB> <family> <dist> <Rt|Lt>[, <surface>][, <backs>]`
 * e.g. "11 Gun Trey 3x1 Rt, Y attached, RB offset weak".
 */
export function formationLabel(spec: FormationSpec, flip = false): string {
  const dir = flip ? 'Lt' : 'Rt';
  const d = distribution(spec);
  const head = `${personnelId(spec)} ${QB_WORD[spec.qb]} ${spec.family} ${d.strong}x${d.weak} ${dir}`;
  const surface = spec.players.filter(attached).map(p => `${p.slot} ${p.at === 'wing' ? 'wing' : 'attached'}${p.side === 'weak' ? ' weak' : ''}`);
  const backs = spec.players.filter(isBack).map(p => {
    const spot = p.back === 'gunOffset' ? 'offset' : p.back === 'offsetFullback' ? 'offset' : p.back === 'iFullback' ? 'I' : p.back === 'iTailback' ? 'I deep' : 'behind';
    const side = SIDE_WORD(p.side, dir);
    return `${p.slot} ${spot}${side ? ' ' + side : ''}`;
  });
  return [head, surface.join(' + '), backs.join(' + ')].filter(Boolean).join(', ');
}

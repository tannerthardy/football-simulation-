/**
 * Offensive formations, written right-handed (strength to the offense's
 * right, −y). Play calls may flip them. Each is stored as structure
 * (formation-spec.ts) and compiled to the engine's Formation; depths: 0.6 ≈
 * on the line, 1.2 off.
 */
import type { Formation, SkillSlot } from './types.js';
import { compileFormation, type BackSpot, type FormationSpec, type PlayerSpec, type SpecSide } from './formation-spec.js';

const W = (slot: SkillSlot, side: SpecSide, at: PlayerSpec['at'], line: boolean, depth?: number): PlayerSpec =>
  ({ slot, role: 'WR', side, at: at!, line, ...(depth === undefined ? {} : { depth }) });
const T = (slot: SkillSlot, side: SpecSide, at: PlayerSpec['at'], line: boolean, depth?: number): PlayerSpec =>
  ({ slot, role: 'TE', side, at: at!, line, ...(depth === undefined ? {} : { depth }) });
const B = (slot: SkillSlot, role: 'RB' | 'FB', side: SpecSide, back: BackSpot): PlayerSpec => ({ slot, role, side, back });

export const FORMATION_SPECS: FormationSpec[] = [
  // ---------------------------------------------------------------- 11
  { id: 'gun_doubles_11', name: 'Gun Doubles', qb: 'gun', family: 'Doubles', tags: ['spread', '2x2'], players: [
    W('X', 'weak', 'wide', true), W('H', 'weak', 'slot', false), W('Z', 'strong', 'wide', false),
    T('Y', 'strong', 'inline', true), B('RB', 'RB', 'weak', 'gunOffset')] },
  { id: 'gun_trips_11', name: 'Gun Trips', qb: 'gun', family: 'Trips', tags: ['spread', '3x1', 'trips'], players: [
    W('X', 'weak', 'wide', true), W('Z', 'strong', 'wide', true), W('H', 'strong', 'slot', false),
    T('Y', 'strong', 'slot2', false), B('RB', 'RB', 'weak', 'gunOffset')] },
  { id: 'gun_trey_11', name: 'Gun Trey (TE attached)', qb: 'gun', family: 'Trey', tags: ['3x1', 'trips'], players: [
    W('X', 'weak', 'wide', true), W('Z', 'strong', 'wide', false), W('H', 'strong', 'slot', false),
    T('Y', 'strong', 'inline', true), B('RB', 'RB', 'weak', 'gunOffset')] },
  { id: 'gun_bunch_11', name: 'Gun Bunch', qb: 'gun', family: 'Bunch', tags: ['3x1', 'bunch'], players: [
    W('X', 'weak', 'wide', true), T('Y', 'strong', 7.5, true), W('Z', 'strong', 9, false, 1.7),
    W('H', 'strong', 6.2, false, 1.9), B('RB', 'RB', 'weak', 'gunOffset')] },
  { id: 'gun_empty_11', name: 'Gun Empty', qb: 'gun', family: 'Empty', tags: ['spread', 'empty', '3x2'], players: [
    W('X', 'weak', 'wide', true), W('H', 'weak', 'slot', false), W('Z', 'strong', 'wide', true),
    T('Y', 'strong', 'slot', false), { slot: 'RB', role: 'RB', side: 'strong', at: 'slot2', line: false }] },
  { id: 'ace_11', name: 'Singleback Ace', qb: 'under', family: 'Ace', tags: ['pro', '2x2'], players: [
    W('X', 'weak', 'wide', true), W('H', 'weak', 'slot', false), T('Y', 'strong', 'inline', true),
    W('Z', 'strong', 'wide', false), B('RB', 'RB', 'middle', 'singleUnder')] },
  { id: 'pistol_11', name: 'Pistol Doubles', qb: 'pistol', family: 'Doubles', tags: ['pistol', '2x2'], players: [
    W('X', 'weak', 'wide', true), W('H', 'weak', 'slot', false), T('Y', 'strong', 'inline', true),
    W('Z', 'strong', 'wide', false), B('RB', 'RB', 'middle', 'pistol')] },
  { id: 'ace_trips_11', name: 'Singleback Trips', qb: 'under', family: 'Trey', tags: ['pro', '3x1', 'trips'], players: [
    W('X', 'weak', 'wide', true), W('Z', 'strong', 'wide', false), W('H', 'strong', 'slot', false),
    T('Y', 'strong', 'inline', true), B('RB', 'RB', 'middle', 'singleUnder')] },
  // ---------------------------------------------------------------- 10
  { id: 'gun_spread_10', name: 'Gun Spread', qb: 'gun', family: 'Spread', tags: ['spread', '2x2', 'four-wide'], players: [
    W('X', 'weak', 'wide', true), W('Y', 'weak', 'slot', false), W('Z', 'strong', 'wide', true),
    W('H', 'strong', 'slot', false), B('RB', 'RB', 'weak', 'gunOffset')] },
  { id: 'gun_trips_10', name: 'Gun Trips Open', qb: 'gun', family: 'Trips', tags: ['spread', '3x1', 'trips', 'four-wide'], players: [
    W('X', 'weak', 'wide', true), W('Z', 'strong', 'wide', true), W('H', 'strong', 'slot', false),
    W('Y', 'strong', 'slot2', false), B('RB', 'RB', 'weak', 'gunOffset')] },
  // ---------------------------------------------------------------- 12
  // With two attached on-line ends, the exterior receivers must be off the
  // line so they do not cover either eligible TE (also applies to 22/13).
  { id: 'ace_12', name: 'Singleback Twin TE', qb: 'under', family: 'Twin TE', tags: ['pro', 'heavy'], players: [
    W('X', 'weak', 'wide', false), T('H', 'weak', 'inline', true), T('Y', 'strong', 'inline', true),
    W('Z', 'strong', 'wide', false), B('RB', 'RB', 'middle', 'singleUnder')] },
  { id: 'gun_wing_12', name: 'Gun Wing', qb: 'gun', family: 'Wing', tags: ['heavy'], players: [
    W('X', 'weak', 'wide', true), T('Y', 'strong', 'inline', true), T('H', 'strong', 'wing', false),
    W('Z', 'strong', 'wide', false), B('RB', 'RB', 'weak', 'gunOffset')] },
  { id: 'pistol_12', name: 'Pistol Twin TE', qb: 'pistol', family: 'Twin TE', tags: ['pistol', 'heavy'], players: [
    W('X', 'weak', 'wide', false), T('H', 'weak', 'inline', true), T('Y', 'strong', 'inline', true),
    W('Z', 'strong', 'wide', false), B('RB', 'RB', 'middle', 'pistol')] },
  // ---------------------------------------------------------------- 21
  { id: 'i_pro_21', name: 'I-Form Pro', qb: 'under', family: 'Pro', tags: ['pro', 'heavy', 'i-form'], players: [
    W('X', 'weak', 'wide', true), T('Y', 'strong', 'inline', true), W('Z', 'strong', 'wide', false),
    B('F', 'FB', 'middle', 'iFullback'), B('RB', 'RB', 'middle', 'iTailback')] },
  { id: 'i_twins_21', name: 'I-Form Twins', qb: 'under', family: 'Twins', tags: ['pro', 'i-form'], players: [
    W('X', 'weak', 'wide', true), W('Z', 'weak', 'slot', false), T('Y', 'strong', 'inline', true),
    B('F', 'FB', 'middle', 'iFullback'), B('RB', 'RB', 'middle', 'iTailback')] },
  { id: 'offset_i_21', name: 'Strong Offset I', qb: 'under', family: 'Offset I', tags: ['pro', 'heavy', 'i-form'], players: [
    W('X', 'weak', 'wide', true), T('Y', 'strong', 'inline', true), W('Z', 'strong', 'wide', false),
    B('F', 'FB', 'strong', 'offsetFullback'), B('RB', 'RB', 'middle', 'iTailback')] },
  // ---------------------------------------------------------------- 22 / 13
  { id: 'i_jumbo_22', name: 'I-Form Jumbo', qb: 'under', family: 'Jumbo', tags: ['heavy', 'i-form', 'short-yardage'], players: [
    W('X', 'weak', 'wide', false), T('H', 'weak', 'inline', true), T('Y', 'strong', 'inline', true),
    B('F', 'FB', 'middle', 'iFullback'), B('RB', 'RB', 'middle', 'iTailback')] },
  { id: 'heavy_13', name: 'Heavy Wing', qb: 'under', family: 'Wing', tags: ['heavy', 'short-yardage'], players: [
    W('X', 'weak', 9, false), T('H', 'weak', 'inline', true), T('Y', 'strong', 'inline', true),
    T('F', 'strong', 'wing', false), B('RB', 'RB', 'middle', 'singleUnder')] },
];

export const FORMATIONS: Formation[] = FORMATION_SPECS.map(compileFormation);
export const FORMATION_SPEC_BY_ID: Record<string, FormationSpec> = Object.fromEntries(FORMATION_SPECS.map((f) => [f.id, f]));

export const FORMATION_BY_ID: Record<string, Formation> = Object.fromEntries(FORMATIONS.map((f) => [f.id, f]));

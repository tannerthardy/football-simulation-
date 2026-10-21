/**
 * Offensive formations, written right-handed (strength to the offense's
 * right, −y). Play calls may flip them. Depth: 0.6 ≈ on the line, 1.2 off.
 */
import type { Formation } from './types.js';

const ON = 0.6;
const OFF = 1.2;
// Representative offset-gun run alignment: 2.3 yd beside the 5 yd-deep QB
// and 0.5 yd behind him. Empty and pistol use their own placements.
const GUN_RB_SPLIT = 2.3;
const GUN_RB_DEPTH = 5.5;

export const FORMATIONS: Formation[] = [
  // ---------------------------------------------------------------- 11
  {
    id: 'gun_doubles_11', name: 'Gun Doubles', personnel: '11', qb: 'gun', tags: ['spread', '2x2'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 'wide', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_trips_11', name: 'Gun Trips', personnel: '11', qb: 'gun', tags: ['spread', '3x1', 'trips'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Z: { side: 'R', split: 'wide', depth: ON },
      H: { side: 'R', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'slot2', depth: OFF },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_trey_11', name: 'Gun Trey (TE attached)', personnel: '11', qb: 'gun', tags: ['3x1', 'trips'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      H: { side: 'R', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_bunch_11', name: 'Gun Bunch', personnel: '11', qb: 'gun', tags: ['3x1', 'bunch'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 7.5, depth: ON },
      Z: { side: 'R', split: 9, depth: 1.7 },
      H: { side: 'R', split: 6.2, depth: 1.9 },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_empty_11', name: 'Gun Empty', personnel: '11', qb: 'gun', tags: ['spread', 'empty', '3x2'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'slot', depth: OFF },
      RB: { side: 'R', split: 'slot2', depth: OFF },
    },
  },
  {
    id: 'ace_11', name: 'Singleback Ace', personnel: '11', qb: 'under', tags: ['pro', '2x2'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'C', split: 0, depth: 6.8 },
    },
  },
  {
    id: 'pistol_11', name: 'Pistol Doubles', personnel: '11', qb: 'pistol', tags: ['pistol', '2x2'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'C', split: 0, depth: 7.2 },
    },
  },
  {
    id: 'ace_trips_11', name: 'Singleback Trips', personnel: '11', qb: 'under', tags: ['pro', '3x1', 'trips'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      H: { side: 'R', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      RB: { side: 'C', split: 0, depth: 6.8 },
    },
  },
  // ---------------------------------------------------------------- 10
  {
    id: 'gun_spread_10', name: 'Gun Spread', personnel: '10', qb: 'gun', tags: ['spread', '2x2', 'four-wide'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 'wide', depth: ON },
      H: { side: 'R', split: 'slot', depth: OFF },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_trips_10', name: 'Gun Trips Open', personnel: '10', qb: 'gun', tags: ['spread', '3x1', 'trips', 'four-wide'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Z: { side: 'R', split: 'wide', depth: ON },
      H: { side: 'R', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'slot2', depth: OFF },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  // ---------------------------------------------------------------- 12
  // With two attached on-line ends, the exterior receivers must be off the
  // line so they do not cover either eligible TE (also applies to 22/13).
  {
    id: 'ace_12', name: 'Singleback Twin TE', personnel: '12', qb: 'under', tags: ['pro', 'heavy'],
    slots: {
      X: { side: 'L', split: 'wide', depth: OFF },
      H: { side: 'L', split: 'inline', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'C', split: 0, depth: 6.8 },
    },
  },
  {
    id: 'gun_wing_12', name: 'Gun Wing', personnel: '12', qb: 'gun', tags: ['heavy'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      H: { side: 'R', split: 'wing', depth: 1.4 },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'pistol_12', name: 'Pistol Twin TE', personnel: '12', qb: 'pistol', tags: ['pistol', 'heavy'],
    slots: {
      X: { side: 'L', split: 'wide', depth: OFF },
      H: { side: 'L', split: 'inline', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'C', split: 0, depth: 7.2 },
    },
  },
  // ---------------------------------------------------------------- 21
  {
    id: 'i_pro_21', name: 'I-Form Pro', personnel: '21', qb: 'under', tags: ['pro', 'heavy', 'i-form'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      F: { side: 'C', split: 0, depth: 4.3 },
      RB: { side: 'C', split: 0, depth: 7.0 },
    },
  },
  {
    id: 'i_twins_21', name: 'I-Form Twins', personnel: '21', qb: 'under', tags: ['pro', 'i-form'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Z: { side: 'L', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      F: { side: 'C', split: 0, depth: 4.3 },
      RB: { side: 'C', split: 0, depth: 7.0 },
    },
  },
  {
    id: 'offset_i_21', name: 'Strong Offset I', personnel: '21', qb: 'under', tags: ['pro', 'heavy', 'i-form'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      F: { side: 'R', split: 1.5, depth: 4.2 },
      RB: { side: 'C', split: 0, depth: 7.0 },
    },
  },
  // ---------------------------------------------------------------- 22 / 13
  {
    id: 'i_jumbo_22', name: 'I-Form Jumbo', personnel: '22', qb: 'under', tags: ['heavy', 'i-form', 'short-yardage'],
    slots: {
      X: { side: 'L', split: 'wide', depth: OFF },
      H: { side: 'L', split: 'inline', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      F: { side: 'C', split: 0, depth: 4.3 },
      RB: { side: 'C', split: 0, depth: 7.0 },
    },
  },
  {
    id: 'heavy_13', name: 'Heavy Wing', personnel: '13', qb: 'under', tags: ['heavy', 'short-yardage'],
    slots: {
      X: { side: 'L', split: 9, depth: OFF },
      H: { side: 'L', split: 'inline', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      F: { side: 'R', split: 'wing', depth: 1.4 },
      RB: { side: 'C', split: 0, depth: 6.8 },
    },
  },
];

export const FORMATION_BY_ID: Record<string, Formation> = Object.fromEntries(FORMATIONS.map((f) => [f.id, f]));

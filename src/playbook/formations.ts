/**
 * Offensive formations, written right-handed (strength to the offense's
 * right, −y). Play calls may flip them. Depth: 0.6 ≈ on the line, 1.2 off.
 */
import type { Formation } from './types.js';

const ON = 0.6;
const OFF = 1.2;
// A wing is 0.7 yd deeper than the attached end beside him: median depths
// behind the ball at the snap, end 1.02 and wing 1.73, for the 1,001 off-line
// players 0.3-4.0 yd outside a single attached TE (2022 tracking, weeks 1-6;
// nfl_wing.py's wide cohort, which also holds flexed players at 3-4 yd; the
// lateral width uses the narrower cohort, see wingOf). The inline end is 1.19
// here, so the wing is 1.9.
const WING = 1.9;
// Representative offset-gun run alignment: 2.3 yd beside the 5 yd-deep QB
// and 0.5 yd behind him. Empty and pistol use their own placements.
const GUN_RB_SPLIT = 2.3;
const GUN_RB_DEPTH = 5.5;
/** BACKFIELD_DEPTH (default off): the QB and tailback at their tracked snap
 * depths (2022 all-22 run snaps): gun QB 4.5 and offset back 5.0 (installed
 * 5.0/5.5), pistol QB 4.6 (4.0), under-center tailback 7.3 (6.8). A back's
 * depth is his runway to take the ball at speed. */
export const BACKFIELD_DEPTH = process.env.BACKFIELD_DEPTH !== '0';
export const GUN_QB_DEPTH = BACKFIELD_DEPTH ? 4.5 : 5.0;
export const PISTOL_QB_DEPTH = BACKFIELD_DEPTH ? 4.6 : 4.0;
/** Extra depth for an under-center tailback (installed 6.8-7.2). */
export const UNDER_TAILBACK_EXTRA = BACKFIELD_DEPTH ? 0.5 : 0;
// Split-back gun: a back on each side of the QB, about level with him. In
// 2022 tracking (weeks 1-9, 291 shotgun snaps with one back on each side of
// the QB), backs set a median 2.45 yd beside the QB and 0.16 yd deeper than
// him; a TE back sets 0.95 yd shallower than an RB back (3.9 against 4.9 yd
// off the ball). Depths here hang off the sim's 5.0 yd gun QB.
const SPLIT_BACK = 2.45;
const SPLIT_DEPTH = 5.2;
const SPLIT_TE_DEPTH = SPLIT_DEPTH - 0.95;

/** OFF_VARIETY (experimental, off; OFF_VARIETY=1 turns it on): playbook variety the NFL shows and our offense did not
 * (docs/reviews/2026-11-18-offense-variety.md): the playcaller may call the formations below, the smash corner at 8-9 yd,
 * and calls 10 personnel near its NFL share (playcaller.ts). Off, the formation list, the routes and the weights are as
 * before, so the game stream is unchanged.
 * - gun_flex_11: 11 personnel 2x2 with the Y flexed out as a detached #2 (two detached #2s: 11.3% of NFL snaps, BDB 2025
 *   week 1; ours came only from 10 personnel).
 * - gun_stack_11: 2x2 with a receiver stack to the right (16.9% of NFL snaps): the point man (Z) on the line at a 10 yd
 *   split, the stacked man (Y) 2.2 yd deep behind him at the same split. As taught, the point man releases first and
 *   the stacked man releases free off his hip (Coaches Insider, stacking receivers; Viqtory Sports, stem and stack);
 *   the mandatory inside release some concepts give the point man is not installed: each runs his route's release.
 * - gun_doubles_tight_11: 2x2 with a reduced #1 (8 yd from the ball) to the left. */
export const OFF_VARIETY = process.env.OFF_VARIETY === '1';

const BASE_FORMATIONS: Formation[] = [
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
  // Split backs, 11: the second back is the slot receiver (the most common
  // 2022 split-back gun look) or the tight end (Y-off).
  {
    id: 'gun_split_11', name: 'Gun Split', personnel: '11', qb: 'gun', tags: ['split-backs'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'L', split: SPLIT_BACK, depth: SPLIT_DEPTH },
      H: { side: 'R', split: SPLIT_BACK, depth: SPLIT_DEPTH },
    },
  },
  {
    id: 'gun_split_yoff_11', name: 'Gun Split Y-Off', personnel: '11', qb: 'gun', tags: ['split-backs'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 'wide', depth: ON },
      RB: { side: 'L', split: SPLIT_BACK, depth: SPLIT_DEPTH },
      Y: { side: 'R', split: SPLIT_BACK, depth: SPLIT_TE_DEPTH },
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
      H: { side: 'R', split: 'wing', depth: WING },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_split_12', name: 'Gun Split Close', personnel: '12', qb: 'gun', tags: ['split-backs', 'heavy'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'L', split: SPLIT_BACK, depth: SPLIT_DEPTH },
      H: { side: 'R', split: SPLIT_BACK, depth: SPLIT_TE_DEPTH },
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
  {
    id: 'gun_split_21', name: 'Gun Split Pro', personnel: '21', qb: 'gun', tags: ['split-backs', 'pro'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'inline', depth: ON },
      Z: { side: 'R', split: 'wide', depth: OFF },
      RB: { side: 'L', split: SPLIT_BACK, depth: SPLIT_DEPTH },
      F: { side: 'R', split: SPLIT_BACK, depth: SPLIT_DEPTH },
    },
  },
  {
    id: 'gun_split_twins_21', name: 'Gun Split Twins', personnel: '21', qb: 'gun', tags: ['split-backs'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      Z: { side: 'L', split: 'slot', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      RB: { side: 'L', split: SPLIT_BACK, depth: SPLIT_DEPTH },
      F: { side: 'R', split: SPLIT_BACK, depth: SPLIT_DEPTH },
    },
  },
  // ---------------------------------------------------------------- 20
  {
    id: 'gun_split_20', name: 'Gun Split Backs', personnel: '20', qb: 'gun', tags: ['split-backs', 'spread'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 'wide', depth: ON },
      RB: { side: 'L', split: SPLIT_BACK, depth: SPLIT_DEPTH },
      F: { side: 'R', split: SPLIT_BACK, depth: SPLIT_DEPTH },
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
      F: { side: 'R', split: 'wing', depth: WING },
      RB: { side: 'C', split: 0, depth: 6.8 },
    },
  },
];

const VARIETY_FORMATIONS: Formation[] = [
  {
    id: 'gun_flex_11', name: 'Gun Flex Doubles', personnel: '11', qb: 'gun', tags: ['spread', '2x2'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 'wide', depth: ON },
      Y: { side: 'R', split: 'slot', depth: OFF },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_stack_11', name: 'Gun Stack Doubles', personnel: '11', qb: 'gun', tags: ['spread', '2x2', 'stack'],
    slots: {
      X: { side: 'L', split: 'wide', depth: ON },
      H: { side: 'L', split: 'slot', depth: OFF },
      Z: { side: 'R', split: 10, depth: ON },
      Y: { side: 'R', split: 10, depth: ON + 2.2 },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
  {
    id: 'gun_doubles_tight_11', name: 'Gun Doubles Tight', personnel: '11', qb: 'gun', tags: ['spread', '2x2', 'reduced'],
    slots: {
      X: { side: 'L', split: 8, depth: ON },
      // The slot inside the reduced X (the default slot sits between the tackle and a full-width X, outside him).
      H: { side: 'L', split: 5, depth: OFF },
      // Seven on the line: the X and the inline Y are the ends, so the Z is off the ball.
      Z: { side: 'R', split: 'wide', depth: OFF },
      Y: { side: 'R', split: 'inline', depth: ON },
      RB: { side: 'L', split: GUN_RB_SPLIT, depth: GUN_RB_DEPTH },
    },
  },
];
export const FORMATIONS: Formation[] = OFF_VARIETY ? [...BASE_FORMATIONS, ...VARIETY_FORMATIONS] : BASE_FORMATIONS;

export const FORMATION_BY_ID: Record<string, Formation> = Object.fromEntries(FORMATIONS.map((f) => [f.id, f]));

/**
 * Defensive fronts (technique alignments relative to offensive strength),
 * coverages and pressures.
 */
import type { Coverage, Front, Pressure } from './types.js';

const DL = 0.9; // DL depth off the ball
const LB = 4.6;

export const FRONTS: Front[] = [
  {
    id: 'over', name: '4-3 Over', personnel: ['base43', 'nickel', 'dime'],
    slots: {
      DE_S: { tech: '6', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      DT_W: { tech: '1', side: 'W', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      LB_S: { tech: '7', side: 'S', depth: LB - 0.5 },
      LB_M: { tech: '1', side: 'S', depth: LB + 0.4 },
      LB_W: { tech: '3', side: 'W', depth: LB },
    },
  },
  {
    id: 'under', name: '4-3 Under', personnel: ['base43', 'nickel'],
    slots: {
      DE_S: { tech: '5', side: 'S', depth: DL },
      DT_S: { tech: '1', side: 'S', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_S: { tech: '9', side: 'S', depth: 1.0 },
      LB_M: { tech: '3', side: 'S', depth: LB + 0.3 },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    id: 'wide9', name: 'Wide-9 Nickel', personnel: ['nickel', 'dime'],
    slots: {
      DE_S: { tech: 'w9', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      DT_W: { tech: '2i', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '2', side: 'S', depth: LB + 0.3 },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    id: 'tite', name: '3-4 Tite', personnel: ['base34'],
    fits: { DT_S: { gap: 'B', side: 'S', technique: 'control' }, DT_W: { gap: 'B', side: 'W', technique: 'control' }, NT: { gap: 'A', side: 'W', technique: 'lag' } },
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '4i', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '4i', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '3', side: 'S', depth: LB },
      LB_W: { tech: '3', side: 'W', depth: LB },
    },
  },
  {
    id: 'odd', name: '3-4 Odd', personnel: ['base34'],
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '5', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '5', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '2', side: 'S', depth: LB },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  // FRONT_MENU (on, =0 turns it off; called only under it, game/playcaller.ts):
  // the families 2022 tracking shows that the menu above lacks
  // (scripts/diag/align/deflook.py). An even front puts both tackles in the B
  // gaps (8% of nickel early downs, about 20% on third down); the 3-4 teams'
  // base fronts are the bear, a nose and two 3 techniques (about 45%), and
  // the tite (about 20%), not the 5-0-5 odd (1-2%); their Under puts the nose
  // on the weak shade and the strong end over the tackle.
  {
    id: 'even', name: '4-3 Even', personnel: ['base43', 'nickel', 'dime'],
    // The tackles own the B gaps, so the backers own the A gaps.
    fits: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    slots: {
      DE_S: { tech: '5', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      LB_S: { tech: '9', side: 'S', depth: LB - 0.5 },
      LB_M: { tech: '3', side: 'S', depth: LB + 0.2 },
      LB_W: { tech: '3', side: 'W', depth: LB + 0.2 },
    },
  },
  {
    id: 'bear34', name: '3-4 Bear', personnel: ['base34'],
    // A, B and the edge are covered on the line: the Mike owns the strong C
    // gap, the Will the weak A the nose leaves.
    fits: { NT: { gap: 'A', side: 'S' }, LB_M: { gap: 'C', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    slots: {
      DE_S: { tech: 'w9', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '4', side: 'S', depth: LB },
      LB_W: { tech: '2i', side: 'W', depth: LB },
    },
  },
  {
    id: 'under34', name: '3-4 Under', personnel: ['base34'],
    // Nose weak A, weak 3 B, strong end C, Sam D: the Mike takes the strong
    // B gap and the Will the strong A.
    fits: { LB_M: { gap: 'B', side: 'S' }, LB_W: { gap: 'A', side: 'S' } },
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '5', side: 'S', depth: DL },
      NT: { tech: '1', side: 'W', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: 'w9', side: 'W', depth: DL },
      LB_M: { tech: '3', side: 'S', depth: LB },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    id: 'bear', name: 'Bear (goal line)', personnel: ['goalline', 'heavy'],
    slots: {
      DE_S: { tech: '6', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      LB_S: { tech: '9', side: 'S', depth: 2.5 },
      LB_M: { tech: '2', side: 'S', depth: 3.5 },
      LB_W: { tech: '4', side: 'W', depth: 3.5 },
    },
  },
];

export { COVERAGES, COVERAGE_BY_ID } from './coverages.js';

export const PRESSURES: Pressure[] = [
  {
    id: 'mike_a', name: 'Mike A-Gap', blitzers: { LB_M: { gap: 'A', side: 'S' } },
    coverages: ['cover1', 'cover3', 'cover0'],
  },
  {
    id: 'will_b', name: 'Will B-Gap', blitzers: { LB_W: { gap: 'B', side: 'W' } },
    coverages: ['cover1', 'cover3'],
  },
  {
    id: 'double_a', name: 'Double-A Mug', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    // Six rushers leave five markers; a Cover 1 post would require a twelfth
    // player. A simulated-pressure/drop package can restore that later.
    coverages: ['cover0'],
  },
  {
    id: 'nickel_edge', name: 'Nickel Edge', blitzers: { NB: { gap: 'D', side: 'S' } },
    coverages: ['cover1', 'cover3'],
  },
  {
    // Ringo/Lucky "Freeze" (HNFL-064): the dropped end is a seam/flat
    // player (match #2 out and up, carry the seam, deliver inside).
    id: 'fire_zone', name: 'Fire Zone (SS + Will, DE drops)', blitzers: { SS: { gap: 'C', side: 'S' }, LB_W: { gap: 'B', side: 'W' } },
    droppers: { DE_W: { zone: 'curl_flat_w', rule: 'c3_seam' } },
    coverages: ['cover3'], rushers: 5,
  },
  // Simulated pressures: four rushers, one from an unexpected spot, a
  // lineman dropping into a coverage job (fangio-system.md E5).
  {
    // Whip (HNFL-060): the Will comes off the weak edge; the strong end
    // drops as a bonus hook between #2 and #3, behind weak-rotation Cover 3.
    id: 'whip', name: 'Whip (Will edge, end drops)', blitzers: { LB_W: { gap: 'C', side: 'W' } },
    droppers: { DE_S: { zone: 'hook_s', rule: 'bonus_hook' } },
    coverages: ['cover3'], rushers: 4,
  },
  {
    // Slug (HNFL-057): the nickel off the strong edge; the weak end drops
    // as the seam/flat player on weak #2; fire-zone three deep behind it.
    id: 'slug', name: 'Slug (nickel edge, end drops)', blitzers: { NB: { gap: 'D', side: 'S' } },
    droppers: { DE_W: { zone: 'curl_flat_w', rule: 'c3_seam' } },
    coverages: ['cover3'], rushers: 4,
  },
  {
    // Sting/Wasp (HNFL-242): the Mike through the A gap; the weak end drops
    // as the quarter-flat apex behind Quads.
    id: 'sting', name: 'Sting (Mike A, end drops)', blitzers: { LB_M: { gap: 'A', side: 'W' } },
    droppers: { DE_W: { zone: 'curl_flat_w', rule: 'q_apex' } },
    coverages: ['cover4'], rushers: 4,
  },
  {
    id: 'zero_6', name: 'Zero Blitz', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'B', side: 'W' } },
    coverages: ['cover0'],
  },
  {
    // Deuce (HNFL-302/372/373): a five-man zone pressure from the two-high
    // shell, two deep and four under. The Mike adds to the four-man front;
    // the called two-high coverage becomes Deuce (`coverage`). On by default (DEUCE=0 turns it off):
    // it fills blitz rolls on two-high calls that had no compatible pressure,
    // which raises the five-man rate; PRESSURE_CALL scales it by the shell.
    id: 'deuce', name: 'Deuce (Mike A, 2-deep 4-under)', blitzers: { LB_M: { gap: 'A', side: 'S' } },
    coverages: ['cover4', 'cover6', 'cover2'], coverage: 'deuce', rushers: 5, flag: 'DEUCE',
  },
];

export const FRONT_BY_ID: Record<string, Front> = Object.fromEntries(FRONTS.map((f) => [f.id, f]));
/** Fronts the caller uses only under FRONT_MENU (game/playcaller.ts). */
export const MENU_FRONTS: ReadonlySet<string> = new Set(['even', 'bear34', 'under34']);
export const PRESSURE_BY_ID: Record<string, Pressure> = Object.fromEntries(PRESSURES.map((p) => [p.id, p]));

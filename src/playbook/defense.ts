/**
 * Defensive fronts (technique alignments relative to offensive strength),
 * coverages and pressures.
 */
import type { Coverage, Front, Pressure } from './types.js';

const DL = 0.9; // DL depth off the ball
const LB = 4.6;

const ALL_FRONTS: Front[] = [
  {
    id: 'over', name: '4-3 Over', personnel: ['base43', 'nickel', 'dime'],
    // FIT_TE_GAP: the end head-up on the TE plays C; the Sam outside him has D.
    ...(process.env.FIT_TE_GAP !== '0' ? { fits: { LB_S: { gap: 'D' as const, side: 'S' as const } } } : {}),
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
  // NICKEL_FRONTS (experimental, off): sub-package fronts. Shares come from
  // 2022 snap frames classified by interior shape (scripts/diag/align/nfronts.py).
  {
    // Penny (5-1): the Tite interior (4i, 0, 4i) with both edges on the line,
    // the Will walked up as the weak edge (he rushes on zone calls), the Mike
    // the lone backer. Staley/Fangio tree; NFL nickel 5-1 4-6% of snaps.
    id: 'penny', name: 'Penny (5-1, Tite)', personnel: ['nickel'],
    fits: { DT_S: { gap: 'B', side: 'S', technique: 'control' }, DE_W: { gap: 'B', side: 'W', technique: 'control' }, DT_W: { gap: 'A', side: 'W', technique: 'lag' } },
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '4i', side: 'S', depth: DL },
      DT_W: { tech: '0', side: 'S', depth: DL },
      DE_W: { tech: '4i', side: 'W', depth: DL },
      LB_W: { tech: 'w9', side: 'W', depth: 1.0 },
      LB_M: { tech: '1', side: 'W', depth: LB },
    },
  },
  {
    // Penny Bear (5-1): the bear interior (3, 0, 3: centre and both guards
    // covered) with both edges on the line. NFL nickel bear 6% early, 12% in
    // short yardage; the modern mug fronts grew out of it.
    id: 'penny_bear', name: 'Penny Bear (5-1, 3-0-3)', personnel: ['nickel'],
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '3', side: 'S', depth: DL },
      DT_W: { tech: '0', side: 'S', depth: DL },
      DE_W: { tech: '3', side: 'W', depth: DL },
      LB_W: { tech: 'w9', side: 'W', depth: 1.0 },
      LB_M: { tech: '1', side: 'S', depth: LB },
    },
  },
  {
    // Mint: the Tite interior (4i, 0, 4i) with one edge, to the strength, and
    // two off-ball backers; the weak C gap is the bubble a backer fills.
    id: 'mint', name: 'Mint (4i-0-4i, two backers)', personnel: ['nickel'],
    fits: { DT_S: { gap: 'B', side: 'S', technique: 'control' }, DE_W: { gap: 'B', side: 'W', technique: 'control' }, DT_W: { gap: 'A', side: 'W', technique: 'lag' } },
    slots: {
      DE_S: { tech: '9', side: 'S', depth: DL },
      DT_S: { tech: '4i', side: 'S', depth: DL },
      DT_W: { tech: '0', side: 'S', depth: DL },
      DE_W: { tech: '4i', side: 'W', depth: DL },
      LB_M: { tech: '2', side: 'S', depth: LB },
      LB_W: { tech: '5', side: 'W', depth: LB },
    },
  },
  {
    // Okie (5-0-5) three down: a nose and two 5 techniques on the ball, the
    // fourth lineman a stand-up rover over the weak B gap who drops on 3rd and
    // long (a three-man rush) and rushes otherwise. NFL nose-only three-down
    // fronts: dime 11% early, 21% on 3rd and long; nickel 5%.
    id: 'okie', name: 'Okie 3-Down (5-0-5, rover)', personnel: ['nickel', 'dime'],
    slots: {
      DE_S: { tech: '5', side: 'S', depth: DL },
      DT_S: { tech: '0', side: 'S', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      DT_W: { tech: '3', side: 'W', depth: 2.6, rover: true },
      LB_M: { tech: '2', side: 'S', depth: LB + 0.3 },
      LB_W: { tech: '2', side: 'W', depth: LB },
    },
  },
  {
    // 3-3 Stack (3-3-5): a nose and two 5 techniques, the three backers stacked
    // straight behind them at 4.5 yd (the Sam behind the strong end, the Mike
    // behind the nose, the Will behind the weak end). College staple; rare in
    // the NFL, so it is a small share of nickel calls.
    id: 'stack33', name: '3-3 Stack', personnel: ['stack335'],
    slots: {
      DE_S: { tech: '5', side: 'S', depth: DL },
      NT: { tech: '0', side: 'S', depth: DL },
      DE_W: { tech: '5', side: 'W', depth: DL },
      LB_S: { tech: '5', side: 'S', depth: 4.5 },
      LB_M: { tech: '0', side: 'S', depth: 4.5 },
      LB_W: { tech: '5', side: 'W', depth: 4.5 },
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
/** NICKEL_FRONTS (experimental, off): the sub-package three- and five-man fronts join the catalog only under the flag. */
const NICKEL_FRONTS = process.env.NICKEL_FRONTS !== '0';
export const FRONTS: Front[] = ALL_FRONTS.filter((f) => NICKEL_FRONTS || !['penny', 'penny_bear', 'mint', 'okie', 'stack33'].includes(f.id));

export { COVERAGES, COVERAGE_BY_ID } from './coverages.js';

export const PRESSURES: Pressure[] = [
  // maxRushers (RUSH_PROMISE): a single added rusher behind three-deep is a
  // five-man zone pressure with three under. Where the front already rushes an
  // extra man (an on-line Sam, a 3-4's fifth lineman, Penny's Will) the call
  // would become six rush and two curl-flat players with no one in the middle,
  // by accident. A designed three-deep, two-under six-man pressure (two hot
  // droppers) is a separate, future install (docs/PARKED.md).
  {
    id: 'mike_a', name: 'Mike A-Gap', blitzers: { LB_M: { gap: 'A', side: 'S' } },
    coverages: ['cover1', 'cover3', 'cover0'], maxRushers: { cover3: 5 },
  },
  {
    id: 'will_b', name: 'Will B-Gap', blitzers: { LB_W: { gap: 'B', side: 'W' } },
    coverages: ['cover1', 'cover3'], maxRushers: { cover3: 5 },
  },
  {
    id: 'double_a', name: 'Double-A Mug', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    // Six rushers leave five markers; a Cover 1 post would require a twelfth
    // player. A simulated-pressure/drop package can restore that later.
    coverages: ['cover0'],
  },
  {
    id: 'nickel_edge', name: 'Nickel Edge', blitzers: { NB: { gap: 'D', side: 'S' } },
    coverages: ['cover1', 'cover3'], maxRushers: { cover3: 5 },
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
  // MUG_PRESSURES (experimental, off): the mug package. A call that mugs
  // backers in the A gaps also says who of them comes, picked at the shares
  // 2022 tracking shows on nickel dropbacks with a double mug at the snap
  // (scripts/diag/align/mugrush.py, n 173): no mugger rushes 42%, one 32%,
  // both 25%; a lineman drops 14%; total rush 4 / 5 / 6+ 49 / 24 / 22%. Single
  // mug (n 341): the mugger rushes half the time. The bail is no pressure.
  {
    // One comes: the Mike through his A gap, the Will bails to his seat.
    id: 'mug_one', name: 'Mug One (Mike A, Will bails)', blitzers: { LB_M: { gap: 'A', side: 'S' } },
    coverages: ['cover1', 'cover3', 'cover2man', 'cover0', 'cover4', 'cover6', 'cover2'], rushers: 5, flag: 'MUG_PRESSURES',
  },
  {
    // Simulated pressure: the Mike comes, the weak end drops into the hook
    // the Mike vacated; four rush, the protection set for six.
    id: 'mug_sim', name: 'Mug Sim (Mike A, end drops)', blitzers: { LB_M: { gap: 'A', side: 'S' } },
    droppers: { DE_W: { zone: 'hook_w', rule: 'bonus_hook' } },
    coverages: ['cover3', 'cover1', 'cover4', 'cover6', 'cover2'], rushers: 4, flag: 'MUG_PRESSURES',
  },
  {
    // Fire zone from the double mug: both backers through the A gaps, the
    // weak end drops as the seam/flat player; three deep, three under.
    id: 'mug_fire', name: 'Mug Fire (both A, end drops)', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    droppers: { DE_W: { zone: 'curl_flat_w', rule: 'c3_seam' } },
    coverages: ['cover3', 'cover1', 'cover4', 'cover6', 'cover2', 'cover2man', 'cover0'], coverage: 'cover3', rushers: 5, flag: 'MUG_PRESSURES',
  },
  {
    // Both come: six rush, zero behind (the Vikings' double A).
    id: 'mug_both', name: 'Mug Both (double A, zero)', blitzers: { LB_M: { gap: 'A', side: 'S' }, LB_W: { gap: 'A', side: 'W' } },
    coverages: ['cover0', 'cover1', 'cover3', 'cover2man', 'cover4', 'cover6', 'cover2'], coverage: 'cover0', flag: 'MUG_PRESSURES',
  },
];

export const FRONT_BY_ID: Record<string, Front> = Object.fromEntries(FRONTS.map((f) => [f.id, f]));
/** Fronts the caller uses only under FRONT_MENU (game/playcaller.ts). */
export const MENU_FRONTS: ReadonlySet<string> = new Set(['even', 'bear34', 'under34']);
/** NICKEL_FRONTS: the three- and five-man sub-package fronts, called only under that flag. */
export const NICKEL_FRONT_IDS: ReadonlySet<string> = new Set(['penny', 'penny_bear', 'mint', 'okie', 'stack33']);
export const PRESSURE_BY_ID: Record<string, Pressure> = Object.fromEntries(PRESSURES.map((p) => [p.id, p]));

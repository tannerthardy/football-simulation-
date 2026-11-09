/**
 * Coverage catalog. Each call names, for the slots it controls, a landmark
 * zone and (for pattern-match seats) the rule that moves the defender off it,
 * or a man assignment with its technique. Remaining defenders fill the
 * underneath seats in order. Families follow PFF's charting so frequencies
 * can be compared with the NFL (scripts/data/bdb2025_defense_calls.py); the
 * rules and their thresholds are in src/sim/coverage/rules.ts and follow the
 * coverage-mechanics reference (docs/references, chs. 5–15).
 *
 * Strength-relative: `_s` = toward the formation's strength (the side with
 * more receivers), `_w` = away. Field/boundary versions of split-field calls
 * are chosen by the coordinator (e.g. Cover 6 vs. Cover 6 reversed).
 */
import { DEF_PERSONNEL, type Coverage, type CoverageRole, type DefensivePlayCall, type DefSlot, type FormationKey, type MatchRule, type ZoneId } from './types.js';
import type { OffenseAlignment } from './alignment.js';
import { formationStructure, type FormationStructure } from './structure.js';

const z = (zone: ZoneId, rule?: MatchRule, depth?: number): CoverageRole => ({ kind: 'zone', zone, ...(rule ? { rule } : {}), ...(depth !== undefined ? { depth } : {}) });
const seat = (zone: ZoneId, rule: MatchRule) => ({ zone, rule });

/** Cover 9 shell: Tight 1/3 corners, the nickel-away safety rotates down to seam/flat, the other spins to the post. */
const NINE_DEEP = {
  CB_S: z('deep_third_s', 'c3_corner'),
  CB_W: z('deep_third_w', 'c3_corner'),
  SS: z('deep_mid'),
  // Shown 11 yd deep: tracked one-high calls disguised as two-high show the
  // rotator at 11.1 (p25-p75 10.0-12.6) beside a 14.1 post (BDB 2025, PFF
  // assignment; docs/reviews/2026-11-09-coverage-spacing.md). At 9 he gave
  // the rotation away.
  FS: z('curl_flat_w', 'c3_seam', 11),
};

// Quarters pieces shared by several calls.
/** Quarters structure checks (HNFL-194 Sub Quads menu): Box vs bunch, Book/Read vs empty. Trips keep the distribution checks. */
const QUARTERS_CHECKS = [
  { when: ['bunch_strong'], to: ['cover4_box'] },
  { when: ['empty_3x2'], to: ['cover4_book_read'] },
] satisfies Coverage['structureChecks'];
const QUARTERS_S = {
  CB_S: z('quarter_s_out', 'q_corner_mod'),
  SS: z('quarter_s_in', 'q_safety'),
};
const QUARTERS_W = {
  CB_W: z('quarter_w_out', 'q_corner_mod'),
  FS: z('quarter_w_in', 'q_safety'),
};

export const COVERAGES: Coverage[] = [
  // ------------------------------------------------------------ zero / one-high man
  {
    id: 'cover0', name: 'Cover 0', family: 'cover0', shell: 'zero', man: true, press: true,
    note: 'All eligible matchups, no deep help; pressure must leave enough man defenders.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'man', prefer: ['S3', 'W2', 'S2'] },
      FS: { kind: 'man', prefer: ['W2', 'S3', 'B'] },
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: { kind: 'man', prefer: ['B', 'B2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'cover1', name: 'Cover 1 (Man-Free)', family: 'cover1', shell: 'one-high', man: true, press: true,
    note: 'Press man with a post safety; the spare backer plays robber.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'man', prefer: ['S3', 'S2', 'W2'] },
      FS: z('deep_mid'),
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: z('robber'),
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
    structureChecks: [{ when: ['bunch_strong'], to: ['cover1_banjo'] }],
  },
  {
    id: 'cover1_lurk', name: 'Cover 1 Lurk', family: 'cover1', shell: 'one-high', man: true, press: false,
    note: 'The two-high tree\'s Cover 1 (HNFL-240/209): corners man #1 from outside leverage, the weak safety comes down on weak #2, the other spins to the post, the Will has the back and the Mike lurks in the low hole.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], lev: 'outside' },
      CB_W: { kind: 'man', prefer: ['W1'], lev: 'outside' },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      FS: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: z('deep_mid'),
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
      LB_M: z('hole', 'rat'),
    },
    underneath: [],
    structureChecks: [{ when: ['trips'], to: ['cover1_lurk_trips'] }, { when: ['bunch_strong'], to: ['cover1_banjo'] }],
    needs: ['FS', 'SS'],
  },
  {
    id: 'cover1_lurk_trips', name: 'Cover 1 Lurk (vs trips)', family: 'cover1', shell: 'one-high', man: true, press: false,
    note: 'Vs 3x1 the nickel-side safety comes down on #3 and the weak safety spins to the post (HNFL-240).',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], lev: 'outside' },
      CB_W: { kind: 'man', prefer: ['W1'], lev: 'outside' },
      NB: { kind: 'man', prefer: ['S2'] },
      SS: { kind: 'man', prefer: ['S3', 'S2'] },
      FS: z('deep_mid'),
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
      LB_M: z('hole', 'rat'),
    },
    underneath: [],
    needs: ['FS', 'SS'],
  },
  {
    id: 'cover1_banjo', name: 'Cover 1 Banjo (vs bunch)', family: 'cover1', shell: 'one-high', man: false, press: false,
    note: 'Man-free vs bunch: the nickel locks the point, the corner and strong safety banjo #1 and #3 by release (first out / the other); a rat in the hole.',
    roles: {
      CB_S: z('flat_s', 'banjo_out'),
      SS: z('curl_flat_s', 'banjo_in'),
      NB: { kind: 'man', prefer: ['S2'], press: true },
      CB_W: { kind: 'man', prefer: ['W1'] },
      FS: z('deep_mid'),
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [seat('hole', 'rat')],
  },
  {
    id: 'cover1_off', name: 'Cover 1 Off', family: 'cover1', shell: 'one-high', man: true, press: false,
    note: 'Off-man with inside leverage to the post; a rat sits in the low hole to cut crossers.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'man', prefer: ['S3', 'S2', 'W2'] },
      FS: z('deep_mid'),
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [seat('hole', 'rat')],
    structureChecks: [{ when: ['bunch_strong'], to: ['cover1_banjo'] }],
  },
  {
    id: 'cover1_robber', name: 'Cover 1 Robber', family: 'cover1', shell: 'one-high', man: true, press: true,
    note: 'The strong safety drops from depth to rob digs and curls; backers take the back and TE.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: z('robber', 'robber'),
      FS: z('deep_mid'),
      LB_S: { kind: 'man', prefer: ['S3', 'S2', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [seat('hole', 'rat')],
    structureChecks: [{ when: ['bunch_strong'], to: ['cover1_banjo'] }],
  },
  {
    id: 'cover1_double', name: 'Cover 1 Double', family: 'cover1', shell: 'one-high', man: true, press: false,
    note: 'Man-free with a bracket on the weak #1: the corner plays outside, a safety inside.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'], lev: 'outside' },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: { kind: 'man', prefer: ['W1'], double: true, lev: 'inside' },
      FS: z('deep_mid'),
      LB_S: { kind: 'man', prefer: ['S3', 'S2', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'cover2man', name: '2-Man', family: 'cover2man', shell: 'two-high', man: true, press: true,
    note: 'Trail man underneath with two deep halves capping everything.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], trail: true },
      CB_W: { kind: 'man', prefer: ['W1'], trail: true },
      NB: { kind: 'man', prefer: ['S2', 'W2'], trail: true },
      DB: { kind: 'man', prefer: ['W2', 'S3'], trail: true },
      SS: z('deep_half_s'),
      FS: z('deep_half_w'),
      LB_S: { kind: 'man', prefer: ['S3', 'S2', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  // Two-deep man ("Hands" family, HNFL-074/206/208/261): man underneath with
  // two safeties; Pounder plays the safeties as inside quarters keying #2 to
  // #1 to double whichever goes vertical, Fist (2-Man) as deep halves.
  {
    id: 'pounder', name: 'Pounder (man under, quarters safeties)', family: 'cover2man', shell: 'two-high', man: true, press: false,
    note: 'Man underneath with inside leverage; both safeties play inside quarters keying #2 to #1 for a double on the vertical.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: z('quarter_s_in', 'q_safety'),
      FS: z('quarter_w_in', 'q_safety'),
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'finger', name: 'Finger (2-Man strong, Pounder weak)', family: 'cover2man', shell: 'two-high', man: true, press: false,
    note: 'Trail man under a deep half to the strength; man with an inside-quarter safety keying #2 to #1 away.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], trail: true },
      CB_W: { kind: 'man', prefer: ['W1'] },
      NB: { kind: 'man', prefer: ['S2', 'W2'], trail: true },
      DB: { kind: 'man', prefer: ['W2', 'S3'] },
      SS: z('deep_half_s'),
      FS: z('quarter_w_in', 'q_safety'),
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  {
    id: 'rolex', name: 'Rolex (Pounder strong, 2-Man weak)', family: 'cover2man', shell: 'two-high', man: true, press: false,
    note: 'Man with an inside-quarter safety to the strength; trail man under a deep half away ("safety rolls to X").',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'] },
      CB_W: { kind: 'man', prefer: ['W1'], trail: true },
      NB: { kind: 'man', prefer: ['S2', 'W2'] },
      DB: { kind: 'man', prefer: ['W2', 'S3'], trail: true },
      SS: z('quarter_s_in', 'q_safety'),
      FS: z('deep_half_w'),
      LB_S: { kind: 'man', prefer: ['S3', 'B'] },
      LB_M: { kind: 'man', prefer: ['S3', 'B', 'W2'] },
      LB_W: { kind: 'man', prefer: ['B', 'W2'] },
    },
    underneath: [],
  },
  // ------------------------------------------------------------ cover 3
  {
    id: 'cover3', name: 'Cover 3 (Sky)', family: 'cover3', shell: 'one-high', man: false, press: false,
    note: 'Three deep, four under; the strong safety rolls down to curl-flat and force.',
    roles: {
      CB_S: z('deep_third_s'),
      CB_W: z('deep_third_w'),
      FS: z('deep_mid'),
    },
    underneath: ['curl_flat_s', 'curl_flat_w', 'hook_s', 'hook_w', 'hook_mid'],
    checks: { '3x1': ['cover3_trips'] },
  },
  {
    id: 'cover3_trips', name: 'Cover 3 (vs trips)', family: 'cover3', shell: 'one-high', man: false, press: false,
    note: 'Vs 3x1 the Mike pushes to the middle hook toward the trips side and walls a vertical #3 from it; the weak curl-flat stays home, so the backside hook goes unfilled. Same spot-zone technique as Sky.',
    roles: {
      CB_S: z('deep_third_s'),
      CB_W: z('deep_third_w'),
      FS: z('deep_mid'),
      LB_M: z('hook_mid'),
    },
    underneath: ['curl_flat_s', 'hook_s', 'curl_flat_w', 'hook_w'],
  },
  {
    id: 'cover3_match', name: 'Cover 3 Match (Rip/Liz)', family: 'cover3', shell: 'one-high', man: false, press: false,
    note: 'Curl-flat players match #2 vertical to 12, corners carry #1 deep and zone off unders, hooks carry #3.',
    roles: {
      CB_S: z('deep_third_s', 'c3_corner'),
      CB_W: z('deep_third_w', 'c3_corner'),
      FS: z('deep_mid'),
    },
    underneath: [seat('curl_flat_s', 'c3_curl_flat'), seat('curl_flat_w', 'c3_curl_flat'), seat('hook_s', 'c3_hook'), seat('hook_w', 'c3_hook'), seat('hook_mid', 'mike_3')],
    checks: { '3x1': ['cover3_mable'] },
    structureChecks: [{ when: ['bunch_strong'], to: ['cover3_clue'] }],
  },
  {
    id: 'cover3_clue', name: 'Cover 3 Clue (vs bunch)', family: 'cover3', shell: 'one-high', man: false, press: false,
    note: 'Bunch side zoned off (HNFL-203/204): the corner plays Clue 1/3 keying #2 to #1, the curl-flat and hook drop to spots; the backside stays match.',
    roles: {
      CB_S: z('deep_third_s', 'clue_corner'),
      CB_W: z('deep_third_w', 'c3_corner'),
      FS: z('deep_mid'),
    },
    underneath: [{ zone: 'curl_flat_s', style: 'spot' }, { zone: 'hook_s', style: 'spot' }, seat('curl_flat_w', 'c3_curl_flat'), seat('hook_w', 'c3_hook'), seat('hook_mid', 'mike_3')],
  },
  {
    id: 'cover3_seam', name: 'Cover 3 Seam', family: 'cover3', shell: 'one-high', man: false, press: false,
    note: 'Curl-flat players carry #2 up the seam all the way — four deep against four verticals.',
    roles: {
      CB_S: z('deep_third_s', 'c3_corner'),
      CB_W: z('deep_third_w', 'c3_corner'),
      FS: z('deep_mid'),
    },
    underneath: [seat('curl_flat_s', 'c3_seam'), seat('curl_flat_w', 'c3_seam'), seat('hook_s', 'c3_hook'), seat('hook_w', 'c3_hook'), seat('hook_mid', 'mike_3')],
  },
  {
    id: 'cover3_buzz', name: 'Cover 3 Buzz', family: 'cover3', shell: 'one-high', look: 'two-high', man: false, press: false,
    note: 'From two high, the strong safety buzzes to the hook/curl inside; the overhang takes curl-flat.',
    roles: {
      CB_S: z('deep_third_s', 'c3_corner'),
      CB_W: z('deep_third_w', 'c3_corner'),
      FS: z('deep_mid'),
      SS: z('hook_s', 'c3_hook', 11), // the buzz safety shows at the tracked rotator depth (see NINE_DEEP)
    },
    underneath: [seat('curl_flat_s', 'c3_curl_flat'), seat('curl_flat_w', 'c3_curl_flat'), seat('hook_mid', 'mike_3'), 'hook_w'],
  },
  {
    id: 'cover3_cloud', name: 'Cover 3 Cloud', family: 'cover3', shell: 'one-high', look: 'two-high', man: false, press: false,
    note: 'Strong corner squats in the flat (cloud), the strong safety rotates over him to the deep third.',
    roles: {
      CB_S: z('flat_s', 'cloud_corner', 5),
      SS: z('deep_third_s', 'c3_corner', 11),
      FS: z('deep_mid'),
      CB_W: z('deep_third_w', 'c3_corner'),
    },
    underneath: [seat('hook_s', 'c3_hook'), seat('curl_flat_w', 'c3_curl_flat'), seat('hook_mid', 'mike_3'), 'hook_w'],
  },
  {
    id: 'cover3_mable', name: 'Cover 3 Mable (vs trips)', family: 'cover3', shell: 'one-high', man: false, press: false,
    note: 'Backside corner locks X; the trips side plays match with the post safety relating to #3.',
    roles: {
      CB_S: z('deep_third_s', 'c3_corner'),
      CB_W: { kind: 'man', prefer: ['W1'], lev: 'inside', protectDepth: true },
      FS: z('deep_mid'),
    },
    underneath: [seat('curl_flat_s', 'c3_curl_flat'), seat('hook_s', 'c3_hook'), seat('hook_mid', 'mike_3'), 'hook_w', 'curl_flat_w'],
  },
  {
    id: 'cover9', name: 'Cover 9 (weak rotation)', family: 'cover3', shell: 'one-high', look: 'two-high', man: false, press: false,
    note: 'Fangio\'s weak-rotation Cover 3 from two high: the weak safety spins down as a seam-flat player, the strong safety takes the middle, the slot side carries #2 vertical.',
    roles: NINE_DEEP,
    underneath: [seat('curl_flat_s', 'c3_seam'), seat('hook_s', 'c3_hook'), seat('hook_w', 'c3_hook'), seat('hook_mid', 'mike_3')],
    structureChecks: [
      { when: ['bunch_strong'], to: ['cover9_clue'] },
      { when: ['stack_strong'], to: ['cover9_clue'] },
      { when: ['empty_3x2'], to: ['cover9_grab'] },
      { when: ['trips'], to: ['cover9_strap'] },
    ],
  },
  {
    id: 'cover9_strap', name: 'Cover 9 Strap (vs x1)', family: 'cover3', shell: 'one-high', look: 'two-high', man: false, press: false,
    note: 'Weak rotation vs trips/x1 (HNFL-056/203): nickel seam/flat on #2, a #3 receiver hook carries #3 up or over, the Mike is a bonus hook relating to #3 underneath, the rotating safety plays seam/flat on the back.',
    roles: NINE_DEEP,
    underneath: [seat('curl_flat_s', 'c3_seam'), seat('hook_s', 'three_rec_hook'), seat('hook_mid', 'bonus_hook'), seat('hook_w', 'c3_hook')],
  },
  {
    id: 'cover9_clue', name: 'Cover 9 Clue (vs bunch/stack)', family: 'cover3', shell: 'one-high', look: 'two-high', man: false, press: false,
    note: 'Weak rotation with the bunch/stack side zoned off: the corner plays Clue 1/3 keying #2 to #1, the curl-flat and hook drop to spots (HNFL-056/204).',
    roles: { ...NINE_DEEP, CB_S: z('deep_third_s', 'clue_corner') },
    underneath: [{ zone: 'curl_flat_s', style: 'spot' }, { zone: 'hook_s', style: 'spot' }, seat('hook_mid', 'bonus_hook'), seat('hook_w', 'c3_hook')],
  },
  {
    id: 'cover9_grab', name: 'Cover 9 Grab (vs empty)', family: 'cover3', shell: 'one-high', look: 'two-high', man: false, press: false,
    note: 'Empty 3x2 (HNFL-054/063 "Grab"): rotation becomes Buzz. The weak overhang is seam/flat on weak #2 and the rotating safety becomes the #3 receiver hook on the final #3 up or over.',
    roles: { ...NINE_DEEP, FS: z('hook_s', 'three_rec_hook', 11) },
    underneath: [seat('curl_flat_s', 'c3_seam'), seat('curl_flat_w', 'c3_seam'), seat('hook_mid', 'bonus_hook'), 'hook_w'],
  },
  // ------------------------------------------------------------ two-deep zone
  {
    id: 'cover2', name: 'Cover 2', family: 'cover2', shell: 'two-high', man: false, press: false,
    note: 'Squat corners reroute #1 and sit in the flats; two deep halves; three hooks.',
    roles: {
      CB_S: z('flat_s'),
      CB_W: z('flat_w'),
      SS: z('deep_half_s'),
      FS: z('deep_half_w'),
    },
    underneath: ['hook_s', 'hook_w', 'hook_mid', 'curl_flat_s', 'curl_flat_w'],
  },
  {
    id: 'cover2_match', name: 'Cover 2 Match', family: 'cover2', shell: 'two-high', man: false, press: false,
    note: 'Corners take the first flat threat or sink under #1 to 13 (trap the hole shot); hooks wall #2 to 12.',
    roles: {
      CB_S: z('flat_s', 'sink_corner'),
      CB_W: z('flat_w', 'sink_corner'),
      SS: z('deep_half_s'),
      FS: z('deep_half_w'),
    },
    underneath: [seat('hook_s', 'c2_hook'), seat('hook_w', 'c2_hook'), seat('hook_mid', 'mike_3'), 'curl_flat_s', 'curl_flat_w'],
    structureChecks: [{ when: ['trips'], to: ['cover2_wild'] }],
  },
  {
    id: 'cover2_wild', name: 'Cover 2 Match Wild (vs trips)', family: 'cover2', shell: 'two-high', man: false, press: false,
    note: 'Halves vs trips: the middle hook becomes a vertical hook and carries #3 up the middle between the halves; apexes wall #2.',
    roles: {
      CB_S: z('flat_s', 'sink_corner'),
      CB_W: z('flat_w', 'sink_corner'),
      SS: z('deep_half_s'),
      FS: z('deep_half_w'),
    },
    underneath: [seat('hook_s', 'c2_hook'), seat('hook_w', 'c2_hook'), seat('hook_mid', 'vertical_hook'), 'curl_flat_s', 'curl_flat_w'],
  },
  {
    id: 'cover2_invert', name: 'Inverted Cover 2', family: 'cover2', shell: 'two-high', man: false, press: false,
    note: 'Safeties show a quarters look over the hashes and drive to the flats; soft corners bail to the deep halves.',
    roles: {
      CB_S: z('deep_half_s', undefined, 7),
      CB_W: z('deep_half_w', undefined, 7),
      SS: z('flat_s', 'cloud_corner', 10),
      FS: z('flat_w', 'cloud_corner', 10),
    },
    underneath: [seat('hook_s', 'c2_hook'), seat('hook_w', 'c2_hook'), seat('hook_mid', 'mike_3'), 'curl_flat_s', 'curl_flat_w'],
  },
  {
    id: 'tampa2', name: 'Tampa 2', family: 'tampa2', shell: 'two-high', man: false, press: false,
    note: 'Cover 2 with the Mike running the middle pipe; outside backers wall the seams.',
    roles: {
      CB_S: z('flat_s', 'sink_corner'),
      CB_W: z('flat_w', 'sink_corner'),
      SS: z('deep_half_s'),
      FS: z('deep_half_w'),
      LB_M: z('tampa_mid', 'tampa_mike'),
    },
    underneath: [seat('hook_s', 'c2_hook'), seat('hook_w', 'c2_hook'), 'curl_flat_s', 'curl_flat_w'],
  },
  // Deuce (HNFL-302/373): the coverage behind the five-man Deuce pressure.
  // Soft-squat corners key #2 to #1 (trap #2's quick flat, otherwise stay on
  // top of #1), apexes wall and match #2 (quarter flat with #3 to them,
  // vertical curl with #3 away), halves safeties prioritize #2 deep.
  {
    id: 'deuce', name: 'Deuce (2-deep, 4-under zone pressure)', family: 'cover2', shell: 'two-high', man: false, press: false,
    note: 'Behind a five-man rush: soft-squat corners trap #2\'s quick flat or stay on top of #1; apexes wall #2; halves safeties take #2 deep, else #1.',
    roles: {
      CB_S: z('flat_s', 'palms_corner'),
      CB_W: z('flat_w', 'palms_corner'),
      SS: z('deep_half_s', 'palms_safety'),
      FS: z('deep_half_w', 'palms_safety'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('curl_flat_w', 'q_apex')],
    structureChecks: [{ when: ['trips'], to: ['deuce_dot'] }],
  },
  {
    id: 'deuce_dot', name: 'Deuce DOT (vs trips)', family: 'cover2', shell: 'two-high', man: false, press: false,
    note: 'Deuce vs 3x1: the trips side plays Deuce; the backside apex drops off #3 (DOT) with no vertical carry and the backside corner squats on the lone #1 (Smack).',
    roles: {
      CB_S: z('flat_s', 'palms_corner'),
      CB_W: z('flat_w', 'sink_corner'),
      SS: z('deep_half_s', 'palms_safety'),
      FS: z('deep_half_w'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('hook_w', 'bonus_hook')],
  },
  // ------------------------------------------------------------ quarters
  {
    id: 'cover4', name: 'Quarters (MOD)', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Corners MOD on #1; safeties read #2 (vertical: carry; out/under: help #1); apexes wall #2.',
    roles: { ...QUARTERS_S, ...QUARTERS_W },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('curl_flat_w', 'q_apex'), seat('hook_mid', 'mike_3'), 'hook_s', 'hook_w'],
    checks: { '3x1': ['cover4_poach', 'cover4_stubbie'] },
    structureChecks: QUARTERS_CHECKS,
  },
  {
    id: 'cover4_meg', name: 'Quarters MEG', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Corners man #1 everywhere he goes; safeties read #2.',
    roles: {
      CB_S: z('quarter_s_out', 'q_corner_meg'),
      CB_W: z('quarter_w_out', 'q_corner_meg'),
      SS: z('quarter_s_in', 'q_safety'),
      FS: z('quarter_w_in', 'q_safety'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('curl_flat_w', 'q_apex'), seat('hook_mid', 'mike_3'), 'hook_s', 'hook_w'],
    checks: { '3x1': ['cover4_poach'] },
    structureChecks: QUARTERS_CHECKS,
  },
  {
    id: 'cover4_palms', name: 'Palms (2-Read)', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Corner traps #2\'s quick out while the safety takes #1 over the top; #2 vertical goes to the safety.',
    roles: {
      CB_S: z('quarter_s_out', 'palms_corner'),
      CB_W: z('quarter_w_out', 'palms_corner'),
      SS: z('quarter_s_in', 'palms_safety'),
      FS: z('quarter_w_in', 'palms_safety'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('curl_flat_w', 'q_apex'), seat('hook_mid', 'mike_3'), 'hook_s', 'hook_w'],
    checks: { '3x1': ['cover4_stubbie'] },
    structureChecks: QUARTERS_CHECKS,
  },
  {
    id: 'cover4_box', name: 'Quarters Box (vs bunch)', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Zone pickups on the bunch: corner the outermost vertical, safety the innermost, nickel the first out, hook the first in; quarters on the backside X.',
    roles: {
      CB_S: z('quarter_s_out', 'box_out_deep'),
      SS: z('quarter_s_in', 'box_in_deep'),
      ...QUARTERS_W,
    },
    underneath: [seat('curl_flat_s', 'box_out_low'), seat('hook_s', 'box_in_low'), seat('hook_mid', 'mike_3'), 'hook_w', 'curl_flat_w'],
  },
  {
    id: 'cover4_book_read', name: 'Quarters Book/Read (vs empty)', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Empty 3x2: Book to the three (corner MEG, nickel MUSH, read hook, 3/2 safety) and Read (Palms 2-read) to the two.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], lev: 'outside', protectDepth: true },
      SS: z('quarter_s_in', 'stubbie_safety'),
      CB_W: z('quarter_w_out', 'palms_corner'),
      FS: z('quarter_w_in', 'palms_safety'),
    },
    underneath: [seat('curl_flat_s', 'mush'), seat('hook_s', 'read_hook'), seat('curl_flat_w', 'q_apex'), seat('hook_mid', 'mike_3'), 'hook_w'],
  },
  {
    id: 'cover4_poach', name: 'Quarters Poach/Trix (vs trips)', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Backside corner solos X; the backside safety keys #3 to X: overtakes #3 vertical or squeezes X; the hook matches #3 underneath with no carry.',
    roles: {
      CB_S: z('quarter_s_out', 'q_corner_mod'),
      SS: z('quarter_s_in', 'q_safety'),
      CB_W: { kind: 'man', prefer: ['W1'], lev: 'inside', protectDepth: true },
      FS: z('quarter_w_in', 'poach_safety'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('hook_s', 'read_hook'), seat('hook_mid', 'mike_3'), 'hook_w', 'curl_flat_w'],
  },
  {
    id: 'cover4_stubbie', name: 'Quarters Stubbie (vs trips)', family: 'cover4', shell: 'two-high', man: false, press: false,
    note: 'Trips corner MEGs #1; nickel MUSH on #2, hook reads #3 (no carry), safety 3/2 read; backside plays quarters on X.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], lev: 'outside', protectDepth: true },
      SS: z('quarter_s_in', 'stubbie_safety'),
      ...QUARTERS_W,
    },
    underneath: [seat('curl_flat_s', 'mush'), seat('hook_s', 'read_hook'), seat('hook_mid', 'mike_3'), 'hook_w', 'curl_flat_w'],
  },
  {
    id: 'cover6', name: 'Cover 6 / Stuff (quarters strong, half weak)', family: 'cover6', shell: 'two-high', man: false, press: false,
    note: 'Quarter-quarter-half: quarters rules to the strength, a cloud corner and half safety away.',
    roles: {
      ...QUARTERS_S,
      CB_W: z('flat_w', 'sink_corner'),
      FS: z('deep_half_w'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('hook_mid', 'mike_3'), seat('hook_w', 'c2_hook'), 'hook_s'],
    structureChecks: [{ when: ['bunch_strong'], to: ['cover4_box'] }, { when: ['close_23'], to: ['cover6_area'] }, { when: ['trips'], to: ['cover6_book'] }],
  },
  {
    id: 'cover6_area', name: 'Cover 6 Area (vs trips exchanges)', family: 'cover6', shell: 'two-high', man: false, press: false,
    note: 'Trips with #2/#3 close: soft quarters corner with China, triangle pickups over #2/#3 (nickel outermost underneath, hook innermost, Topper safety on the one that goes deep); Wild on the backside X (HNFL-073/052/195).',
    roles: {
      CB_S: z('quarter_s_out', 'q_corner_mod'),
      SS: z('quarter_s_in', 'topper'),
      CB_W: z('flat_w', 'sink_corner'),
      FS: z('deep_half_w'),
    },
    underneath: [seat('curl_flat_s', 'area_flat'), seat('hook_s', 'area_hook'), seat('hook_w', 'c2_hook'), 'hook_mid'],
  },
  {
    id: 'cover6_book', name: 'Cover 6 Book (vs trips)', family: 'cover6', shell: 'two-high', man: false, press: false,
    note: 'Quarters side vs trips plays Book (corner MEG, nickel MUSH, read hook, 3/2 safety); cloud and half safety on the backside X.',
    roles: {
      CB_S: { kind: 'man', prefer: ['S1'], lev: 'outside', protectDepth: true },
      SS: z('quarter_s_in', 'stubbie_safety'),
      CB_W: z('flat_w', 'sink_corner'),
      FS: z('deep_half_w'),
    },
    underneath: [seat('curl_flat_s', 'mush'), seat('hook_s', 'read_hook'), seat('hook_mid', 'mike_3'), seat('hook_w', 'c2_hook')],
  },
  {
    id: 'cover6_rev', name: 'Cover 8 (half strong, quarters weak)', family: 'cover6', shell: 'two-high', man: false, press: false,
    note: 'Fangio\'s Cover 8: cloud corner under and half safety over to the strength — a natural double on #1 — quarters away.',
    roles: {
      CB_S: z('flat_s', 'sink_corner'),
      SS: z('deep_half_s'),
      ...QUARTERS_W,
    },
    underneath: [seat('curl_flat_w', 'q_apex'), seat('hook_mid', 'mike_3'), seat('hook_s', 'c2_hook'), 'hook_w'],
    structureChecks: [{ when: ['trips'], to: ['cover8_trix'] }],
  },
  {
    id: 'cover8_trix', name: 'Cover 8 Trix (vs trips)', family: 'cover6', shell: 'two-high', man: false, press: false,
    note: 'Halves to the trips with a squat corner and a vertical-curl nickel; the backside safety keys #3 to X and overtakes #3, so the Mike has no vertical; tight 1/4 on X (HNFL-195/325/336).',
    roles: {
      CB_S: z('flat_s', 'sink_corner'),
      SS: z('deep_half_s'),
      FS: z('quarter_w_in', 'poach_safety'),
      CB_W: z('quarter_w_out', 'q_corner_mod'),
    },
    underneath: [seat('curl_s', 'c2_hook'), seat('hook_s', 'read_hook'), seat('curl_flat_w', 'c3_seam'), 'hook_mid'],
  },
  {
    id: 'split_quarters_2man', name: 'Quarters / 2-Man split', family: 'cover6', shell: 'two-high', man: false, press: false,
    note: 'Split field: quarters to the strength, trail man with a half safety over the top on the backside.',
    roles: {
      ...QUARTERS_S,
      CB_W: { kind: 'man', prefer: ['W1'], trail: true },
      FS: z('deep_half_w'),
    },
    underneath: [seat('curl_flat_s', 'q_apex'), seat('hook_mid', 'mike_3'), 'hook_w', 'hook_s'],
  },
];

/**
 * Hands-family bunch answers (HNFL-074 Mini Fist / Mini Pounder): the nickel
 * locks the point, the corner and the midpoint (Mike) banjo #1 and #3 by
 * release, and both safeties keep their call (halves or inside quarters), so
 * the man pair is never rubbed off by crossing releases. Built from each call
 * so the backside and the safeties stay exactly as called.
 */
for (const id of ['cover2man', 'pounder', 'finger', 'rolex']) {
  const base = COVERAGES.find(c => c.id === id)!;
  const mini: Coverage = {
    id: `${id}_banjo`, name: `${base.name.split(' (')[0]} Banjo (vs bunch)`, family: base.family, shell: base.shell, man: false, press: false,
    note: 'Vs bunch: nickel locks the point, corner and Mike banjo #1/#3 (first out / the other); backside man and safeties as called.',
    roles: {
      CB_S: z('flat_s', 'banjo_out'),
      LB_M: z('hook_s', 'banjo_in'),
      NB: { kind: 'man', prefer: ['S2'], press: true },
      CB_W: base.roles.CB_W, LB_W: base.roles.LB_W, SS: base.roles.SS, FS: base.roles.FS,
    },
    underneath: [],
  };
  COVERAGES.push(mini);
  base.structureChecks = [{ when: ['bunch_strong'], to: [mini.id] }];
}

export const COVERAGE_BY_ID: Record<string, Coverage> = Object.fromEntries(COVERAGES.map((c) => [c.id, c]));

/** One representative call per family: what a quarterback tries to identify. */
export const FAMILY_REPRESENTATIVE: Record<string, string> = {
  cover0: 'cover0', cover1: 'cover1', cover2: 'cover2', tampa2: 'tampa2', cover2man: 'cover2man',
  cover3: 'cover3', cover4: 'cover4', cover6: 'cover6',
};

export const familyOf = (c: Coverage): string => c.family ?? c.id;

/**
 * Apply the coverage's formation check, if it has one for this distribution:
 * the called coverage becomes its check (the coordinator's preference index
 * picks among several). The shown look is kept.
 */
export function applyCheck(call: DefensivePlayCall, key: FormationKey): DefensivePlayCall {
  return checkTo(call, call.coverage.checks?.[key], key);
}

/**
 * The secondary's pre-snap check against the structure it sees: the first
 * structure check whose tags are all present, else the plain distribution
 * check. A check is a whole installed call, so every defender's job comes
 * from one coherent coverage.
 */
export function checkCall(call: DefensivePlayCall, structure: FormationStructure): DefensivePlayCall {
  for (const c of call.coverage.structureChecks ?? [])
    if (c.when.every(t => structure.tags.includes(t))) return checkTo(call, c.to, c.when.join('+'));
  return applyCheck(call, structure.key);
}

function checkTo(call: DefensivePlayCall, options: string[] | undefined, when: string): DefensivePlayCall {
  if (!options?.length) return call;
  const preferred = call.checkPrefer?.find(id => options.includes(id) && checkInstallable(call, COVERAGE_BY_ID[id]));
  const to = COVERAGE_BY_ID[preferred ?? options[Math.min(options.length - 1, call.checkPick ?? 0)]];
  if (!to || to.id === call.coverage.id || !checkInstallable(call, to)) return call;
  return { ...call, coverage: to, check: { from: call.coverage.id, when }, label: `${call.label} → ${to.name}` };
}


/** A check names its players: they must be on the field and not already
 * spent by the call's pressure, or the call stays as it was. */
function checkInstallable(call: DefensivePlayCall, to: Coverage): boolean {
  const spent = new Set([...Object.keys(call.pressure?.blitzers ?? {}), ...Object.keys(call.pressure?.droppers ?? {})]);
  return (Object.keys(to.roles) as DefSlot[]).every(slot => !!DEF_PERSONNEL[call.personnel][slot] && !spent.has(slot));
}

/**
 * Zeus (Fangio nickel tag "Zeus + jersey"): a zone call that doubles one
 * receiver without extra bodies, resolved by where he lines up — Cover 8 when
 * he is #1 to the strength (squat corner under, half safety over), Stuff
 * (Cover 6) when he is the lone weak #1, Quads (quarters: apex and #2-keying
 * safety bracket him) when he is inside.
 */
export function resolveZeus(call: DefensivePlayCall, ref: string | undefined, weakCount: number): DefensivePlayCall {
  void weakCount;
  const to = ref === 'S1' ? 'cover6_rev' : ref === 'W1' ? 'cover6' : 'cover4';
  const cov = COVERAGE_BY_ID[to];
  return { ...call, coverage: cov, label: `${call.label} (Zeus → ${cov.name})` };
}

/**
 * The coverage the secondary installs against an offensive alignment: Zeus
 * resolved by where the tagged receiver stands (Cover 8 on a strong #1,
 * Stuff on the backside #1, Quads inside), then the structure check of the
 * resolved call (Cover 8 vs trips is Trix; Stuff vs trips is Book;
 * MatchQuarters Zeus/HNFL-261).
 */
export function installCoverage(call: DefensivePlayCall, off: OffenseAlignment): DefensivePlayCall {
  // A zone pressure that brings its own coverage (Deuce) replaces the called
  // shell's coverage outright; it has its own structure checks, not Zeus.
  const own = call.pressure?.coverage ? COVERAGE_BY_ID[call.pressure.coverage] : undefined;
  if (own) return checkCall({ ...call, coverage: own, zeus: undefined }, formationStructure(off));
  const zeus = call.zeus;
  const resolved = zeus ? resolveZeus(call, off.refOf[zeus], Math.min(off.counts.S, off.counts.W)) : call;
  return checkCall(resolved, formationStructure(off));
}

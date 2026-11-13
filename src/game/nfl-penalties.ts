/** NFL 2026 nominal penalties. Rule 14 supplies spot, phase and election rules.
 * These are consequences of an established violation, never a detector or a
 * probability of whether an otherwise legal football action should be flagged.
 */
import type { PenaltyCall } from '../sim/types.js';

export interface NFLPenaltyDefinition {
  yards: number;
  defensiveYards?: number;
  spot: 'previous' | 'basic' | 'spot' | 'succeeding';
  defensiveFirst: boolean;
  offensiveLossDown?: boolean;
  personal?: boolean;
  conduct?: boolean;
  preSnap?: boolean;
  deadBall?: boolean;
  /** Rule 6's placement election is owned by kick-rules, not nominal yardage. */
  specializedKickAward?: boolean;
  rule: string;
}

const previous = (yards: number, rule: string, defensiveFirst = false): NFLPenaltyDefinition =>
  ({ yards, spot: 'previous', defensiveFirst, rule });
const personal = (rule: string): NFLPenaltyDefinition =>
  ({ yards: 15, spot: 'basic', defensiveFirst: true, personal: true, rule });

export const NFL_2026_PENALTIES: Readonly<Record<PenaltyCall['kind'], NFLPenaltyDefinition>> = {
  holding: { yards: 10, spot: 'basic', defensiveFirst: false, rule: '12-1-3' },
  defensive_holding: { yards: 5, spot: 'basic', defensiveFirst: true, rule: '12-1-6' },
  illegal_contact: previous(5, '8-4-1', true),
  dpi: { yards: 0, spot: 'spot', defensiveFirst: true, rule: '8-5' },
  opi: previous(10, '8-5'),
  illegal_forward_pass: { ...previous(5, '8-1-2'), offensiveLossDown: true },
  illegal_backward_pass: { yards: 5, spot: 'basic', defensiveFirst: false, offensiveLossDown: true, rule: '8-7-2' },
  intentional_grounding: { ...previous(10, '8-2-1'), offensiveLossDown: true },
  ineligible_downfield: previous(5, '8-3-1'),
  illegal_touching: previous(5, '8-1-8'),
  illegal_handoff: { ...previous(5, '8-7-4'), offensiveLossDown: true },
  block_in_back: { yards: 10, spot: 'basic', defensiveFirst: true, rule: '12-1-3' },
  blindside_block: personal('12-2-7'),
  clipping: personal('12-2-1'),
  peel_back: personal('12-2-2'),
  low_block: personal('12-2-4'),
  chop_block: personal('12-2-5'),
  crackback: personal('12-2-6'),
  roughing_passer: personal('12-2-11'),
  roughing_kicker: { ...personal('12-2-12'), spot: 'previous' },
  roughing_holder: { ...personal('12-2-13'), spot: 'previous' },
  running_into_kicker: previous(5, '12-2-12'),
  personal_foul: personal('12-2'),
  unnecessary_roughness: personal('12-2-8'),
  illegal_helmet: personal('12-2-10'),
  facemask: personal('12-2-15'),
  horse_collar: personal('12-2-16'),
  hip_drop: personal('12-2-18'),
  tripping: personal('12-2-14'),
  illegal_hands: { yards: 10, defensiveYards: 5, spot: 'basic', defensiveFirst: true, rule: '12-1-2,12-1-3,12-1-6' },
  illegal_bat: { yards: 10, spot: 'basic', defensiveFirst: true, offensiveLossDown: true, rule: '12-5-1' },
  illegal_kick: { yards: 10, spot: 'basic', defensiveFirst: true, offensiveLossDown: true, rule: '12-5-2' },
  assisting_runner: { yards: 10, spot: 'basic', defensiveFirst: false, rule: '12-1-4' },
  interlocking_interference: { yards: 10, spot: 'basic', defensiveFirst: false, rule: '12-1-4' },
  illegal_teammate_assistance: { yards: 10, spot: 'basic', defensiveFirst: false, rule: '12-1-4(c)' },
  false_start: { ...previous(5, '7-4-2'), preSnap: true },
  illegal_snap: { ...previous(5, '7-6-3/4'), preSnap: true },
  offside: previous(5, '7-4-5'),
  encroachment: { ...previous(5, '7-4-3'), preSnap: true },
  neutral_zone_infraction: { ...previous(5, '7-4-4'), preSnap: true },
  illegal_formation: previous(5, '7-5'),
  illegal_motion: previous(5, '7-4-8'),
  illegal_shift: previous(5, '7-4-7'),
  illegal_substitution: { ...previous(5, '5-2'), preSnap: true },
  too_many_players: previous(5, '5-1-1,5-2'),
  delay_of_game: { ...previous(5, '4-6'), preSnap: true },
  disconcerting_signals: { ...previous(15, '12-3-1(i)', true), preSnap: true, conduct: true },
  unsportsmanlike_conduct: { yards: 15, spot: 'succeeding', defensiveFirst: true, conduct: true, rule: '12-3-1' },
  taunting: { yards: 15, spot: 'succeeding', defensiveFirst: true, conduct: true, deadBall: true, rule: '12-3-1(c),14-4-9' },
  disqualification: { yards: 15, spot: 'succeeding', defensiveFirst: true, conduct: true, rule: '12-3-1,12-4' },
  illegal_free_kick: previous(5, '6-1'),
  free_kick_out_of_bounds: { ...previous(0, '6-2-4'), specializedKickAward: true },
  free_kick_short: { ...previous(0, '6-2-4'), specializedKickAward: true },
  kick_catch_interference: { yards: 15, spot: 'spot', defensiveFirst: false, rule: '10-1-1' },
  fair_catch_interference: { yards: 15, spot: 'spot', defensiveFirst: false, rule: '10-1-1' },
  invalid_fair_catch_signal: { yards: 5, spot: 'spot', defensiveFirst: false, rule: '10-2-3' },
  illegal_block_after_signal: { yards: 15, spot: 'spot', defensiveFirst: false, personal: true, rule: '10-2-2' },
  illegal_block: { yards: 10, spot: 'basic', defensiveFirst: false, rule: '12-1-3' },
};

export function nflPenaltyDefinition(call: PenaltyCall): NFLPenaltyDefinition {
  return NFL_2026_PENALTIES[call.kind];
}

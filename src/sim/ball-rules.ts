/** NFL-2026 Rule 8 ball rulings on facts the caller has actually established.
 * These functions do not decide who acquired the ball, execute a technique,
 * infer full-body release position, or consume an execution/referee draw. */
import { OWN_GOAL_X, OPP_GOAL_X } from '../core/field.js';
import type { TeamSide } from './agent.js';

const other = (team: TeamSide): TeamSide => team === 'O' ? 'D' : 'O';
const direction = (team: TeamSide): number => team === 'O' ? 1 : -1;

export interface FumbleRecoveryFacts {
  /** A dropped backward pass remains a backward pass, not a fumble. */
  kind: 'fumble' | 'backward_pass';
  fumblerId: string;
  fumblerTeam: TeamSide;
  recovererId: string;
  recovererTeam: TeamSide;
  fumbleX: number;
  recoveryX: number;
  down: number;
  afterTwoMinuteWarning: boolean;
  isTry: boolean;
  /** Any prior change during the down, not merely whether teams now differ. */
  possessionChangedBeforeFumble: boolean;
}

export type FumbleRecoveryRuling =
  | { mayAdvance: true }
  | { mayAdvance: false; deadBallX: number; rule: '8-7-5' | '8-7-6' };

/** A teammate's prohibited advance ends at recovery, without moving his body.
 * The ball spot is the fumble/recovery spot less favorable to the recovering
 * team. Opponents and the actual fumbler retain their ordinary rights. */
export function fumbleRecovery(f: FumbleRecoveryFacts): FumbleRecoveryRuling {
  if (f.kind === 'backward_pass' || f.recovererTeam !== f.fumblerTeam || f.recovererId === f.fumblerId) {
    return { mayAdvance: true };
  }
  const lateOrTry = f.afterTwoMinuteWarning || f.isTry;
  // Fourth-down restrictions apply to Team A before its first possession loss.
  // Late-half/Try restrictions apply to either team, including after a change.
  const fourthDown = f.down === 4 && f.fumblerTeam === 'O' && !f.possessionChangedBeforeFumble;
  if (!lateOrTry && !fourthDown) return { mayAdvance: true };
  const dir = direction(f.fumblerTeam);
  const deadBallX = dir * f.recoveryX < dir * f.fumbleX ? f.recoveryX : f.fumbleX;
  return { mayAdvance: false, deadBallX, rule: lateOrTry ? '8-7-6' : '8-7-5' };
}

export interface ForwardPassFacts {
  previousForwardPasses: number;
  possessionChangedBeforePass: boolean;
  /** Confirmed from the represented release geometry, not just passer center. */
  fromBehindLine?: boolean;
  /** True if the ball had crossed the LOS before this attempted forward pass. */
  ballPreviouslyBeyondLine?: boolean;
}

export interface IllegalForwardPassRuling {
  rule: '8-1-2';
  reason: 'second_forward_pass' | 'after_change_of_possession' | 'returned_behind_line';
  enforcement: 'previous' | 'spot';
  lossDown: boolean;
}

/** Evaluate an actual forward pass, not a backward pitch or merely its aim.
 * Beyond-line release/grounding branches require other facts and are omitted. */
export function assessForwardPass(f: ForwardPassFacts): IllegalForwardPassRuling | null {
  // Rule 8-1-2 penalty(c) differs from the second-pass penalty: no loss of down.
  if (f.possessionChangedBeforePass) {
    return { rule: '8-1-2', reason: 'after_change_of_possession', enforcement: 'spot', lossDown: false };
  }
  if (f.fromBehindLine !== true) return null;
  if (f.previousForwardPasses > 0) {
    return { rule: '8-1-2', reason: 'second_forward_pass', enforcement: 'previous', lossDown: true };
  }
  if (f.ballPreviouslyBeyondLine) {
    return { rule: '8-1-2', reason: 'returned_behind_line', enforcement: 'previous', lossDown: true };
  }
  return null;
}

export interface FumbleBoundaryFacts {
  fumbleX: number;
  outX: number;
  lastPossessionTeam: TeamSide;
  /** Who supplied the impetus taking the ball into the end zone, when known. */
  impetusTeam?: TeamSide;
  /** End-zone cases must exclude the Rule 11 momentum exception explicitly. */
  momentumExceptionExcluded?: boolean;
}

export type FumbleBoundaryRuling =
  | { kind: 'spot'; spotX: number; possession: TeamSide; rule: '8-7-3' }
  | { kind: 'safety'; scoringTeam: TeamSide; rule: '8-7-3' }
  | { kind: 'touchback'; possession: TeamSide; spotX: number; rule: '8-7-3' }
  | { kind: 'unresolved'; rule: '8-7-3'; missing: 'impetus_or_momentum' };

/** Only a true fumble: backward passes have a distinct out-of-bounds rule.
 * The caller supplies the ball's real boundary point, not a clamped center. */
export function fumbleOutOfBounds(f: FumbleBoundaryFacts): FumbleBoundaryRuling {
  const startsInField = f.fumbleX > OWN_GOAL_X && f.fumbleX < OPP_GOAL_X;
  const endsInField = f.outX > OWN_GOAL_X && f.outX < OPP_GOAL_X;
  const dir = direction(f.lastPossessionTeam);
  if (startsInField && endsInField) {
    return { kind: 'spot', possession: f.lastPossessionTeam,
      spotX: dir * f.outX > dir * f.fumbleX ? f.fumbleX : f.outX, rule: '8-7-3' };
  }
  if (f.impetusTeam === undefined || f.momentumExceptionExcluded !== true) {
    return { kind: 'unresolved', rule: '8-7-3', missing: 'impetus_or_momentum' };
  }
  // A fumble from one's own end zone that exits in the field still invokes
  // the end-zone impetus rule (8-7-3, item 3(c)). Otherwise use the end zone
  // where the loose ball becomes dead, including its goal-line boundary.
  const zoneTeam: TeamSide = endsInField
    ? f.fumbleX <= OWN_GOAL_X ? 'O' : 'D'
    : f.outX <= OWN_GOAL_X ? 'O' : 'D';
  if (f.impetusTeam === zoneTeam) {
    return { kind: 'safety', scoringTeam: other(zoneTeam), rule: '8-7-3' };
  }
  return { kind: 'touchback', possession: zoneTeam,
    spotX: zoneTeam === 'O' ? OWN_GOAL_X + 20 : OPP_GOAL_X - 20, rule: '8-7-3' };
}

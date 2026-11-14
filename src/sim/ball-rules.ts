/** NFL-2026 Rule 8 ball rulings on facts the caller has actually established.
 * These functions do not decide who acquired the ball, execute a technique,
 * infer full-body release position, or consume an execution/referee draw. */
import { FIELD_WIDTH, OWN_GOAL_X, OPP_GOAL_X } from '../core/field.js';
import type { TeamSide } from './agent.js';
import type { Vec2, Vec3 } from '../core/vec.js';

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

export interface RestrictedEndZoneRecoveryFacts {
  /** The fumbling and recovering team, dead in the end zone it defends. */
  team: TeamSide;
  fumbleX: number;
  /** Loose-ball facts for a fumble from inside the end zone. */
  impetusTeam?: TeamSide;
  momentumExceptionExcluded?: boolean;
  momentumSpotX?: number;
}

export type RestrictedEndZoneRecoveryRuling =
  | { kind: 'spot'; spotX: number; rule: '11-5-1' }
  | { kind: 'safety'; scoringTeam: TeamSide; rule: '11-5-1' }
  | { kind: 'touchback'; spotX: number; rule: '11-6-1' }
  | { kind: 'unresolved'; missing: 'impetus_or_momentum' };

/** 8-7-5(c)/8-7-6(c) kill a restricted teammate recovery at the fumble spot,
 * or the recovery spot if behind it. When that spot is in the team's own end
 * zone the ball is dead there in its possession: a safety on its own impetus
 * (11-5-1(b)), a touchback on the opponent's (11-6-1), or the acquisition
 * spot under the momentum exception (11-5-1 exception 2). A fumble from the
 * field supplies its own impetus; no bat, kick or at-rest muff is represented
 * (11-5-1 Note 2). */
export function restrictedRecoveryInOwnEndZone(f: RestrictedEndZoneRecoveryFacts): RestrictedEndZoneRecoveryRuling {
  const fromField = f.fumbleX > OWN_GOAL_X && f.fumbleX < OPP_GOAL_X;
  if (!fromField && f.momentumSpotX !== undefined
    && f.momentumSpotX > OWN_GOAL_X && f.momentumSpotX < OPP_GOAL_X) {
    return { kind: 'spot', spotX: momentumDeadBallSpot(f.momentumSpotX, f.team), rule: '11-5-1' };
  }
  const impetusTeam = fromField ? f.team : f.impetusTeam;
  if (impetusTeam === undefined || !fromField && f.momentumExceptionExcluded !== true) {
    return { kind: 'unresolved', missing: 'impetus_or_momentum' };
  }
  if (impetusTeam === f.team) return { kind: 'safety', scoringTeam: other(f.team), rule: '11-5-1' };
  return { kind: 'touchback', spotX: f.team === 'O' ? OWN_GOAL_X + 20 : OPP_GOAL_X - 20, rule: '11-6-1' };
}

export interface ForwardPassFacts {
  previousForwardPasses: number;
  possessionChangedBeforePass: boolean;
  /** Confirmed from the represented release geometry, not just passer center. */
  fromBehindLine?: boolean;
  /** True if the ball had crossed the LOS before this attempted forward pass. */
  ballPreviouslyBeyondLine?: boolean;
  /** Both facts must be achieved release geometry, not passer-center alone. */
  entireBodyBeyondLine?: boolean;
  ballBeyondLine?: boolean;
}

export interface IllegalForwardPassRuling {
  rule: '8-1-2';
  reason: 'second_forward_pass' | 'after_change_of_possession' | 'returned_behind_line' | 'beyond_line';
  enforcement: 'previous' | 'spot';
  lossDown: boolean;
}

/** Evaluate an actual forward pass, not a backward pitch or merely its aim.
 * Full-body and ball release extents are supplied explicitly by the model. */
export function assessForwardPass(f: ForwardPassFacts): IllegalForwardPassRuling | null {
  // Rule 8-1-2 penalty(c) differs from the second-pass penalty: no loss of down.
  if (f.possessionChangedBeforePass) {
    return { rule: '8-1-2', reason: 'after_change_of_possession', enforcement: 'spot', lossDown: false };
  }
  if (f.entireBodyBeyondLine === true && f.ballBeyondLine === true) {
    return { rule: '8-1-2', reason: 'beyond_line', enforcement: 'spot', lossDown: true };
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
  /** Actual field acquisition point while original momentum remained unbroken. */
  momentumSpotX?: number;
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
  const ownEndOrigin = f.lastPossessionTeam === 'O' ? f.fumbleX <= OWN_GOAL_X : f.fumbleX >= OPP_GOAL_X;
  const deadInOwnEnd = f.lastPossessionTeam === 'O' ? f.outX <= OWN_GOAL_X : f.outX >= OPP_GOAL_X;
  if (ownEndOrigin && deadInOwnEnd && f.momentumSpotX !== undefined
    && f.momentumSpotX > OWN_GOAL_X && f.momentumSpotX < OPP_GOAL_X) {
    return { kind: 'spot', possession: f.lastPossessionTeam, spotX: momentumDeadBallSpot(f.momentumSpotX, f.lastPossessionTeam), rule: '8-7-3' };
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


export interface LooseBallBoundaryStep {
  /** Last outward crossing, retained while the loose ball remains airborne. */
  exit?: Vec2;
  outside: boolean;
  dead: boolean;
}

/** Rule 3-20-3/4: an airborne loose ball may leave and re-enter the boundary.
 * The plane crossing establishes a potential spot, not a whistle. Actual
 * outside ground/person contact makes it dead. The caller supplies achieved
 * contact, not a proximity guess. No ball-radius/foot anatomy is invented. */
export function looseBallBoundaryStep(previousExit: Readonly<Vec2> | undefined,
  from: Readonly<Vec3>, to: Readonly<Vec3>, actualOutsideContact: boolean): LooseBallBoundaryStep {
  const inside = (p: Readonly<Vec3>): boolean => p.x > 0 && p.x < 120 && p.y > 0 && p.y < FIELD_WIDTH;
  if (inside(to)) return { outside: false, dead: false };
  let exit = previousExit ? { ...previousExit } : undefined;
  if (inside(from)) {
    let fraction = 1;
    for (const [a, b, lo, hi] of [[from.x, to.x, 0, 120], [from.y, to.y, 0, FIELD_WIDTH]]) {
      if (b <= lo && b < a) fraction = Math.min(fraction, (lo - a) / (b - a));
      if (b >= hi && b > a) fraction = Math.min(fraction, (hi - a) / (b - a));
    }
    exit = { x: from.x + (to.x - from.x) * fraction, y: from.y + (to.y - from.y) * fraction };
  }
  return { outside: true, dead: actualOutsideContact, ...(exit ? { exit } : {}) };
}


/** Rule11-5-1 exception2(d): a momentum acquisition inside the one-yard
 * line is put at the one; the 2026 rule has no five-yard acquisition limit. */
export function momentumDeadBallSpot(acquisitionX: number, team: TeamSide): number {
  return team === 'O' ? Math.max(acquisitionX, OWN_GOAL_X + 1) : Math.min(acquisitionX, OPP_GOAL_X - 1);
}

export interface PasserLossFacts {
  /** When the ball left his control. */
  lossAt: number;
  /** When his arm began its intentional forward movement (sim.deliveryAt);
   * null if it never did. */
  forwardAt: number | null;
  /** Whether he still had control of the ball when the arm started forward. */
  controlAtForward: boolean;
  /** Losing it while bringing an aborted throw back toward his body. */
  tucking: boolean;
  /** A dead-ball whistle (in the grasp) blown before the loss. */
  whistledAt?: number | null;
}

export type PasserLossRuling = 'pass' | 'fumble' | 'dead';

/** Rule 8-1-1 (Passer Losing Ball, as rewritten in 2013): a pass begins with
 * intentional forward movement of the arm while he controls the ball, wherever
 * the ball then goes; a loss before it, an empty hand, or a loss while tucking
 * the ball back to his body is a fumble. A whistle already blown ends the down
 * first. Keyed to the arm (sim.deliveryAt), not to the ball's velocity. */
export function passerLoss(f: PasserLossFacts): PasserLossRuling {
  if (f.whistledAt != null && f.whistledAt <= f.lossAt) return 'dead';
  if (f.tucking) return 'fumble';
  if (f.forwardAt === null || f.lossAt < f.forwardAt) return 'fumble';
  return f.controlAtForward ? 'pass' : 'fumble';
}

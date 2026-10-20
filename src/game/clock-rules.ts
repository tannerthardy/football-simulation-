/** NFL-2026 Rules4-3,4-7,4-8. Legal clock consequences are independent of
 * coaching policy and of how many yards a foul happens to cost. */
import type { PenaltyCall, PlayResult } from '../sim/types.js';

export interface FoulClockContext {
  quarter: number;
  clock: number;
  afterTwoMinuteWarning: boolean;
  wasRunning: boolean;
  /** Whether the physical ending would restart the clock absent the foul. */
  wouldRunAfterPlay?: boolean;
  postseason?: boolean;
  startDown?: number;
  startDistance?: number;
  yardageDeclined?: boolean;
  calls: readonly PenaltyCall[];
  acceptedIndices: readonly number[];
  offset: boolean;
  replayDown: boolean;
  result: PlayResult;
  offenseTimeouts: number;
  useTimeout?: boolean;
  declineRunoff?: boolean;
  /** Rule4-7-1Item2: offense elects the snap after a defensive conserving act. */
  offenseElectsSnap?: boolean;
}

export interface FoulClockRuling {
  runoff: number;
  timeoutCharged: boolean;
  restart: 'snap' | 'ready';
  playClock: 25 | 30 | 40;
  untimedDown: boolean;
  rule: string;
}

const phaseOf = (p: PenaltyCall): NonNullable<PenaltyCall['phase']> => p.phase ?? 'live';
const live = (p: PenaltyCall): boolean => phaseOf(p) === 'live';
const conservesTime = (p: PenaltyCall, c: FoulClockContext): boolean => {
  if (['intentional_grounding', 'illegal_forward_pass', 'illegal_backward_pass'].includes(p.kind)) return true;
  if (['illegal_bat', 'illegal_kick'].includes(p.kind)) return p.causedBallOutOfBounds === true;
  // A stopped clock is not conserved a second time. The context supplies
  // whether time was actually in for these dead-ball acts.
  return !live(p) && (c.wouldRunAfterPlay ?? c.wasRunning);
};
const personal = (p: PenaltyCall): boolean => p.personalFoul === true || [
  'roughing_passer', 'roughing_kicker', 'personal_foul', 'unnecessary_roughness',
  'illegal_helmet', 'blindside_block', 'clipping', 'peel_back', 'low_block',
  'chop_block', 'crackback', 'facemask', 'horse_collar', 'hip_drop', 'tripping',
  'unsportsmanlike_conduct', 'taunting',
].includes(p.kind);

export function resolveFoulClock(c: FoulClockContext): FoulClockRuling {
  const accepted = c.acceptedIndices.map(i => c.calls[i]).filter((p): p is PenaltyCall => !!p);
  const late = (c.quarter === 2 && c.afterTwoMinuteWarning) || (c.quarter >= 4 && c.clock <= 300);
  let restart: FoulClockRuling['restart'] = (c.wouldRunAfterPlay ?? c.wasRunning) && !late ? 'ready' : 'snap';
  let runoff = 0, timeoutCharged = false;
  let playClock: FoulClockRuling['playClock'] = 25;
  let rule = '4-3-2(e)';
  const possessor = (p: PenaltyCall): 'O' | 'D' => p.possessionTeam ?? ((p.possessionChanges ?? 0) % 2 ? 'D' : 'O');
  if (accepted.some(p => p.against === possessor(p) && phaseOf(p) === 'pre_snap')
    && (c.quarter === 4 || (c.quarter >= 5 && !c.postseason))) restart = 'snap';
  if (c.afterTwoMinuteWarning && c.wasRunning && !c.offset && !c.yardageDeclined) {
    const offenseConserving = accepted.some(p => p.against === possessor(p) && conservesTime(p, c));
    const defenseConserving = accepted.some(p => p.against !== possessor(p) && conservesTime(p, c));
    if (offenseConserving) {
      rule = '4-7-1';
      if (c.useTimeout && c.offenseTimeouts > 0) {
        timeoutCharged = true; restart = 'snap';
      } else if (!c.declineRunoff) {
        runoff = Math.min(10, c.clock); playClock = 30; restart = 'ready';
      } else restart = 'snap';
    } else if (defenseConserving) {
      rule = '4-7-1Item2'; playClock = 40;
      restart = c.offenseElectsSnap === false ? 'ready' : 'snap';
    }
  }
  // A first/third period double foul does not itself extend the period.
  // Clean-hands and major/minor dispositions that do not replay are excluded.
  const liveOffsetExtension = c.offset && c.replayDown
    && (c.quarter === 2 || c.quarter >= 4)
    && c.calls.some(p => p.against === 'D' && live(p));
  const defensiveExtension = accepted.some(p => p.against !== possessor(p) && live(p));
  const offensePersonalException = accepted.some(p => p.against === 'O' && live(p)
    && personal(p) && (p.possessionChanges ?? 0) === 0)
    // 4-8-2(b)(4) concerns an interception/recovery during the down,
    // even if the original offense subsequently regains the ball. The final
    // turnover flag alone cannot describe that possession history.
    && (c.result.turnover || c.result.segments.some(s => s.team === 'D') || c.result.score?.kind === 'safety'
      || (c.startDown === 4 && c.result.yards < (c.startDistance ?? Infinity) && !c.result.score));
  const untimedDown = c.clock === 0 && runoff === 0
    && (liveOffsetExtension || defensiveExtension || offensePersonalException);
  if (untimedDown) restart = 'snap';
  return { runoff, timeoutCharged, restart, playClock, untimedDown,
    rule: untimedDown ? '4-8-2' : rule };
}

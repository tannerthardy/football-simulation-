/** Pure NFL-2026 Rule 14 adjudication. Detectors establish the act and phase;
 * this module enumerates legal elections without changing the physical tape.
 * Coordinate x always belongs to the original offense's frame, including returns.
 */
import { OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import type { PenaltyCall, PlayResult } from '../sim/types.js';
import type { TeamSide } from '../sim/agent.js';
import { nflPenaltyDefinition } from './nfl-penalties.js';

export interface LivePenaltyContext {
  calls: readonly PenaltyCall[];
  los: number;
  startDown: number;
  startDistance: number;
  result: PlayResult;
  isTry?: boolean;
  endOfHalf?: boolean;
  /** Physical x of a legally awarded kick touchback; ordinary scrimmage is 20. */
  touchbackSpotX?: number;
}

export interface PenaltyCarryover {
  target: 'try' | 'kickoff';
  against: TeamSide;
  yards: number;
  callIndices: number[];
}

export interface LivePenaltyOption {
  id: string;
  kind: 'decline' | 'enforce' | 'offset';
  callIndices: number[];
  spotX: number;
  yards: number;
  possession: TeamSide;
  nextDown: number;
  nextDistance: number;
  autoFirst: boolean;
  lossDown: boolean;
  replayDown: boolean;
  safety: boolean;
  safetyTeam?: TeamSide;
  nullifiesPlay: boolean;
  preserveBeforeChangeOfPossession: boolean;
  /** Dead-ball enforcement and scoring carryover retain the legal physical play. */
  preservesPlay?: boolean;
  carryover?: PenaltyCarryover[];
  disqualifiedPlayerIds?: string[];
  enforcementSpots?: { callIndex: number; fromX: number; toX: number }[];
  acceptedWithoutDistance?: boolean;
  tryDisposition?: 'retry' | 'failed' | 'stands';
  tryScore?: { team: TeamSide; points: 1 | 2 } | null;
}

export interface LivePenaltyResolution {
  status: 'none' | 'resolved' | 'unsupported';
  options: LivePenaltyOption[];
  recommendedId?: string;
  reason?: string;
}

type Phase = NonNullable<PenaltyCall['phase']>;
const EPS = 1e-6;
const other = (team: TeamSide): TeamSide => team === 'O' ? 'D' : 'O';
const direction = (team: TeamSide): number => team === 'O' ? 1 : -1;
const ownGoal = (team: TeamSide): number => team === 'O' ? OWN_GOAL_X : OPP_GOAL_X;
const opponentGoal = (team: TeamSide): number => ownGoal(other(team));
const distanceToScore = (team: TeamSide, x: number): number => Math.max(0, direction(team) * (opponentGoal(team) - x));
const inOwnEndZone = (team: TeamSide, x: number): boolean => direction(team) * (x - ownGoal(team)) <= 0;
const clampField = (x: number): number => Math.max(OWN_GOAL_X, Math.min(OPP_GOAL_X, x));
const unsupported = (reason: string): LivePenaltyResolution => ({ status: 'unsupported', options: [], reason });

function changes(result: PlayResult): number {
  let team: TeamSide = 'O', n = 0;
  for (const segment of result.segments) if (segment.team !== team) { n++; team = segment.team; }
  return Math.max(n, result.turnover ? 1 : 0);
}

/** Old receipts lack stamps. Their original offensive/pass fouls are pre-COP;
 * native return calls carry the actual possessionChanges/possessionTeam. */
function changeAt(call: PenaltyCall): number {
  return call.possessionChanges ?? (call.reason === 'after_change_of_possession' ? 1 : 0);
}

function teamAt(call: PenaltyCall): TeamSide {
  return call.possessionTeam ?? (changeAt(call) % 2 ? 'D' : 'O');
}

function phaseOf(call: PenaltyCall, ctx: LivePenaltyContext): Phase {
  if (call.foulAgainstOfficial) return 'between_downs';
  if (call.phase) return call.phase;
  const spec = nflPenaltyDefinition(call);
  if (spec.deadBall) return 'dead_ball';
  if (spec.preSnap || (call.t !== undefined && call.t < 0)) return 'pre_snap';
  if (call.t !== undefined && call.t > ctx.result.duration + EPS) return 'dead_ball';
  return 'live';
}

function personal(call: PenaltyCall): boolean {
  const spec = nflPenaltyDefinition(call);
  return !!(call.personalFoul || spec.personal || spec.conduct);
}

function phaseSegments(ctx: LivePenaltyContext, phase: number) {
  let current: TeamSide = 'O', n = 0;
  return ctx.result.segments.filter(segment => {
    if (segment.team !== current) { n++; current = segment.team; }
    return n === phase;
  });
}

function gainSpot(ctx: LivePenaltyContext, phase: number): number {
  return phaseSegments(ctx, phase)[0]?.startX ?? ctx.los;
}

function declineOption(ctx: LivePenaltyContext): LivePenaltyOption {
  const r = ctx.result;
  const noSnap = ctx.calls.some(c => phaseOf(c, ctx) === 'pre_snap')
    && ctx.calls.every(c => phaseOf(c, ctx) === 'pre_snap' || phaseOf(c, ctx) === 'between_downs');
  if (noSnap) return { id: 'decline', kind: 'decline', callIndices: [], spotX: ctx.los, yards: 0,
    possession: 'O', nextDown: ctx.startDown, nextDistance: ctx.startDistance,
    autoFirst: false, lossDown: false, replayDown: true, safety: false,
    nullifiesPlay: true, preserveBeforeChangeOfPossession: false };
  const newSeries = changes(r) > 0;
  const spotX = r.outcome === 'incomplete' ? ctx.los : r.endX;
  const converted = !newSeries && r.outcome !== 'incomplete' && spotX >= ctx.los + ctx.startDistance - EPS;
  const downsTurnover = !newSeries && ctx.startDown === 4 && !converted && !r.score;
  const possession = downsTurnover ? 'D' : r.possession;
  return {
    id: 'decline', kind: 'decline', callIndices: [], spotX, yards: 0, possession,
    nextDown: converted || newSeries || downsTurnover ? 1 : ctx.startDown + 1,
    nextDistance: converted || newSeries || downsTurnover ? Math.min(10, distanceToScore(possession, spotX))
      : ctx.los + ctx.startDistance - spotX,
    autoFirst: false, lossDown: false, replayDown: false, safety: false,
    nullifiesPlay: false, preserveBeforeChangeOfPossession: false,
  };
}

function moved(fromX: number, against: TeamSide, yards: number): { spotX: number; yards: number } {
  const from = clampField(fromX);
  const available = Math.max(0, direction(against) * (from - ownGoal(against)));
  const actual = Math.min(yards, available / 2);
  return { spotX: from - direction(against) * actual, yards: actual };
}

function baseOption(ctx: LivePenaltyContext, call: PenaltyCall, i: number,
  fromX: number, spotX: number, yards: number, possession: TeamSide,
  autoFirst: boolean, lossDown: boolean, safety = false): LivePenaltyOption {
  const post = changeAt(call) > 0;
  const converted = !safety && (autoFirst || (!post && spotX >= ctx.los + ctx.startDistance - EPS));
  const fourth = !post && lossDown && ctx.startDown === 4 && !converted;
  const finalPossession = fourth ? other(possession) : possession;
  return {
    id: `enforce:${i}`, kind: 'enforce', callIndices: [i], spotX, yards,
    possession: finalPossession,
    nextDown: post || converted || fourth ? 1 : ctx.startDown + Number(lossDown),
    nextDistance: post || converted || fourth ? Math.min(10, distanceToScore(finalPossession, spotX))
      : ctx.los + ctx.startDistance - spotX,
    autoFirst, lossDown, replayDown: !post && !lossDown && !converted, safety,
    ...(safety ? { safetyTeam: other(possession) } : {}),
    nullifiesPlay: true, preserveBeforeChangeOfPossession: post,
    enforcementSpots: [{ callIndex: i, fromX, toX: spotX }],
  };
}

function nominal(call: PenaltyCall, spec = nflPenaltyDefinition(call)): number {
  return call.against !== teamAt(call) ? spec.defensiveYards ?? spec.yards : spec.yards;
}

/** 14-3-5/6: the end of this run, never a subsequent opponent's return.
 * Explicit playPhase distinguishes a post-catch run from the pass phase. */
function basicSpot(ctx: LivePenaltyContext, call: PenaltyCall): number {
  if (call.basicSpotX !== undefined) return call.basicSpotX;
  return phaseSegments(ctx, changeAt(call)).at(-1)?.endX ?? ctx.result.endX;
}

function passing(ctx: LivePenaltyContext, call: PenaltyCall): boolean {
  return call.playPhase === 'pass' || (call.playPhase === undefined && changeAt(call) === 0 && ctx.result.stats.attempted);
}

function runningFrom(ctx: LivePenaltyContext, call: PenaltyCall, possession: TeamSide): number {
  const foulX = call.spotX ?? ctx.los;
  const basic = basicSpot(ctx, call);
  const offenseFoul = call.against === possession;
  if (changeAt(call) === 0 && (basic < ctx.los || offenseFoul && foulX < ctx.los)) return ctx.los;
  return offenseFoul && direction(possession) * (foulX - basic) < 0 ? foulX : basic;
}

function deadBallOption(ctx: LivePenaltyContext, call: PenaltyCall, i: number,
  previous: LivePenaltyOption, phase: Phase): LivePenaltyOption {
  const spec = nflPenaltyDefinition(call);
  const fromX = previous.spotX;
  const penalty = moved(fromX, call.against, nominal(call));
  const possession = previous.possession;
  const defensiveFirst = call.against !== possession && spec.defensiveFirst;
  const reached = direction(possession) * (penalty.spotX - fromX) >= previous.nextDistance - EPS;
  // A continuing-action dead-ball foul establishes a new chain AFTER
  // enforcement. A between-downs foul retains the already established chain.
  const newlyEstablished = phase === 'dead_ball' && previous.nextDown === 1;
  const first = defensiveFirst || reached || newlyEstablished;
  return {
    ...previous, id: `enforce:${i}`, kind: 'enforce', callIndices: [i],
    spotX: penalty.spotX, yards: penalty.yards, nextDown: first ? 1 : previous.nextDown,
    nextDistance: first ? Math.min(10, distanceToScore(possession, penalty.spotX))
      : previous.nextDistance - direction(possession) * (penalty.spotX - fromX),
    autoFirst: defensiveFirst, lossDown: false, replayDown: false,
    safety: false, nullifiesPlay: false, preservesPlay: true,
    enforcementSpots: [{ callIndex: i, fromX, toX: penalty.spotX }],
  };
}

function enforcedOption(ctx: LivePenaltyContext, call: PenaltyCall, i: number): LivePenaltyOption | string {
  const spec = nflPenaltyDefinition(call);
  const foulX = call.spotX ?? ctx.los;
  const phase = phaseOf(call, ctx);
  const stamp = changeAt(call);
  const possessor = teamAt(call);
  if (!Number.isFinite(foulX) || !Number.isFinite(call.basicSpotX ?? ctx.los)) return 'A foul has no finite enforcement spot.';
  if (!Number.isInteger(stamp) || stamp < 0 || stamp > changes(ctx.result)) return 'The foul possession-change stamp contradicts the physical possession history.';
  if (call.possessionTeam && call.possessionTeam !== (stamp % 2 ? 'D' : 'O')) return 'The foul possession team contradicts its possession-change stamp.';
  if ((call.kind === 'dpi' || call.kind === 'illegal_contact') && call.against !== 'D') return 'The defensive pass call names the original offense.';
  if (call.kind === 'holding' && call.against !== possessor) return 'An offensive-holding call names a defender at the time of the act.';
  if (call.kind === 'defensive_holding' && call.against === possessor) return 'A defensive-holding call names the possessing team at the time of the act.';
  if (call.kind === 'opi' && call.against !== 'O') return 'An OPI call must name the original passing offense.';
  if (phase === 'dead_ball' || phase === 'between_downs') return deadBallOption(ctx, call, i, declineOption(ctx), phase);

  const defenseFoul = call.against !== possessor;
  const autoFirst = defenseFoul && spec.defensiveFirst;
  let lossDown = !stamp && !defenseFoul && (call.lossDown ?? spec.offensiveLossDown ?? false);
  let fromX: number;
  // A pre-snap foul leaves the ball dead at the previous spot, in the field.
  // There is no run, so a player aligned in his end zone cannot make the
  // enforcement spot a goal-line spot (14-2-1, 14-2-2(b)).
  const preSnap = phase === 'pre_snap';
  // 8-2-1(c)'s whole-body-and-ball exception belongs to grounding alone.
  // For second/returned-behind illegal passes, 8-6/14-4-5 Note1 instead
  // identifies the spot of the pass behind the passer's goal as the safety.
  let safety = !preSnap && !defenseFoul && (call.kind === 'intentional_grounding'
    ? call.penaltySafety ?? inOwnEndZone(possessor, foulX) : inOwnEndZone(possessor, foulX));
  if (call.kind === 'illegal_touching' && (call.reason === 'eligible_out_of_bounds' || call.lossDown)) lossDown = !stamp;
  if ((call.kind === 'illegal_bat' || call.kind === 'illegal_kick') && call.playPhase === 'kick' && foulX > ctx.los) lossDown = false;
  if (call.kind === 'dpi') {
    if (foulX < ctx.los - EPS) return 'A DPI spot cannot precede the line of scrimmage.';
    const spotX = foulX >= OPP_GOAL_X
      ? ctx.los >= OPP_GOAL_X - 2 ? (ctx.los + OPP_GOAL_X) / 2 : OPP_GOAL_X - 1 : foulX;
    return baseOption(ctx, call, i, ctx.los, spotX, spotX - ctx.los, 'O', true, false);
  }
  if (call.kind === 'intentional_grounding') {
    // 8-2-1/14-4-5(a): half-distance must not make grounding advantageous.
    const ten = moved(ctx.los, 'O', 10).spotX;
    const releaseSpot = call.basicSpotX ?? foulX;
    if (!safety && releaseSpot <= OWN_GOAL_X) return 'Non-safety grounding with the release center behind the goal requires the legal forward-most release spot.';
    const spotX = safety ? OWN_GOAL_X : Math.min(releaseSpot, ten);
    return baseOption(ctx, call, i, ctx.los, spotX, safety ? 0 : ctx.los - spotX, possessor, false, true, safety);
  }
  const passOrHandoffSpot = (call.kind === 'illegal_forward_pass' || call.kind === 'illegal_handoff')
    && (stamp > 0 || call.reason === 'beyond_line');
  const mode = passOrHandoffSpot ? 'spot' : call.enforcement ?? spec.spot;
  if (phase === 'pre_snap') fromX = ctx.los;
  else if (mode === 'spot') fromX = foulX;
  else if (mode === 'previous') fromX = ctx.los;
  else if (mode === 'succeeding') fromX = ctx.result.outcome === 'incomplete' ? ctx.los : ctx.result.endX;
  else if (passing(ctx, call) || call.playPhase === 'kick') fromX = ctx.los;
  else fromX = runningFrom(ctx, call, possessor);

  if (!stamp && call.against === 'O' && personal(call) && passing(ctx, call)
    && !changes(ctx.result) && ctx.result.yards < ctx.startDistance - EPS) {
    fromX = ctx.result.outcome === 'incomplete' ? ctx.los : ctx.result.endX;
  }

  // 14-4-4: do not invent impetus or a momentum exception when decisive.
  // A later return/regain belongs to another run and cannot supply end-zone
  // impetus facts for this earlier phase's foul (14-3-5,14-4-3/4).
  const deadInOwnEnd = stamp > 0 && inOwnEndZone(possessor, basicSpot(ctx, call));
  if (deadInOwnEnd) {
    if (call.momentumSpotX !== undefined) {
      const basic = call.momentumSpotX;
      fromX = !defenseFoul && direction(possessor) * (foulX - basic) < 0 && !inOwnEndZone(possessor, foulX) ? foulX : basic;
      safety = false;
    } else {
      if (!call.impetusTeam) return 'Post-possession end-zone enforcement requires the impetus team or a momentum spot.';
      const touchback = ctx.touchbackSpotX ?? ownGoal(possessor) + direction(possessor) * 20;
      if (defenseFoul) {
        fromX = call.impetusTeam === possessor ? ownGoal(possessor) : touchback;
        safety = false;
      } else if (call.impetusTeam === possessor) safety = true;
      else if (inOwnEndZone(possessor, foulX)) {
        if (call.attemptedAdvance === undefined) return 'An end-zone return foul requires whether the receiving team attempted to advance.';
        safety = call.attemptedAdvance;
        if (!safety) fromX = touchback;
      } else {
        fromX = direction(possessor) * (foulX - touchback) < 0 ? foulX : touchback;
        safety = false;
      }
    }
  }
  if (!preSnap && !stamp && !defenseFoul && !passing(ctx, call) && inOwnEndZone(possessor, basicSpot(ctx, call))) safety = true;
  const amount = call.kind === 'illegal_touching' && lossDown ? 0 : nominal(call);
  const penalty = safety ? { spotX: ownGoal(possessor), yards: 0 } : moved(fromX, call.against, amount);
  return baseOption(ctx, call, i, fromX, penalty.spotX, penalty.yards, possessor, autoFirst, lossDown, safety);
}

function offsetOption(ctx: LivePenaltyContext, indices: number[], succeeding = false): LivePenaltyOption {
  if (succeeding) return { ...declineOption(ctx), id: 'offset', kind: 'offset', callIndices: indices,
    nullifiesPlay: false, preservesPlay: true };
  return { id: 'offset', kind: 'offset', callIndices: indices, spotX: ctx.los, yards: 0,
    possession: 'O', nextDown: ctx.startDown, nextDistance: ctx.startDistance,
    autoFirst: false, lossDown: false, replayDown: true, safety: false,
    nullifiesPlay: true, preserveBeforeChangeOfPossession: false };
}

function postPossessionOffset(ctx: LivePenaltyContext, indices: number[]): LivePenaltyOption | string {
  const last = changes(ctx.result);
  const final = ctx.result.possession;
  const own = indices.filter(i => ctx.calls[i].against === final);
  if (own.some(i => changeAt(ctx.calls[i]) < last)) return offsetOption(ctx, indices);
  const options: LivePenaltyOption[] = [];
  for (const i of own) {
    const option = enforcedOption(ctx, ctx.calls[i], i);
    if (typeof option === 'string') return option;
    options.push(option);
  }
  const choice = options.sort((a, b) => direction(final) * (a.spotX - b.spotX))[0];
  if (!choice) return 'A double foul has no penalty against the team last in possession.';
  const bothAfter = indices.some(i => ctx.calls[i].against !== final && changeAt(ctx.calls[i]) >= last);
  const originalPersonal = indices.some(i => ctx.calls[i].against === 'O' && changeAt(ctx.calls[i]) === 0 && personal(ctx.calls[i]));
  // 14-5-3 and 14-5-2 exception 3: offset at the FROM spot of the
  // possessing team's foul, without also assessing its penalty yardage.
  if (bothAfter || originalPersonal) {
    let spotX = choice.enforcementSpots?.[0].fromX ?? choice.spotX;
    if (choice.safety) spotX = ownGoal(final) + direction(final);
    return { ...choice, id: 'offset', kind: 'offset', callIndices: indices,
      spotX, yards: 0, nextDown: 1, nextDistance: Math.min(10, distanceToScore(final, spotX)),
      safety: false, safetyTeam: undefined, replayDown: false,
      enforcementSpots: [], preserveBeforeChangeOfPossession: true };
  }
  if (choice.safety) return offsetOption(ctx, indices);
  return { ...choice, id: 'clean-hands', callIndices: indices, nextDown: 1,
    nextDistance: Math.min(10, distanceToScore(final, choice.spotX)), replayDown: false };
}

/** A personal foul cannot be made free by throwing an interception:
 * 14-2-4/14-4-3/5 permit the takeaway plus dead-ball enforcement. */
function personalOptions(ctx: LivePenaltyContext, call: PenaltyCall, i: number): LivePenaltyOption[] {
  if (!personal(call) || phaseOf(call, ctx) === 'pre_snap') return [];
  const r = ctx.result, stamp = changeAt(call);
  const options: LivePenaltyOption[] = [];
  if (call.against !== r.possession && !r.score) {
    const attach = deadBallOption(ctx, call, i, declineOption(ctx), 'dead_ball');
    options.push({ ...attach, id: `dead-ball:${i}`, preserveBeforeChangeOfPossession: changes(r) > 0 });
  }
  if (call.against === 'O' && stamp === 0 && changes(r) > 1) {
    const fromX = gainSpot(ctx, 1), penalty = moved(fromX, 'O', nominal(call));
    options.push({ ...baseOption(ctx, { ...call, possessionChanges: 1, possessionTeam: 'D' }, i,
      fromX, penalty.spotX, penalty.yards, 'D', false, false), id: `retain-takeaway:${i}` });
  }
  if (r.score && (r.score.team !== call.against || ['dead_ball', 'between_downs'].includes(phaseOf(call, ctx)))) {
    options.push({ ...declineOption(ctx), id: `carryover:${i}`, kind: 'enforce', callIndices: [i],
      preservesPlay: true, nullifiesPlay: false,
      carryover: [{ target: ctx.isTry || r.score.kind === 'safety' ? 'kickoff' : 'try',
        against: call.against, yards: nominal(call), callIndices: [i] }] });
  }
  return options;
}

function distanceDeclined(option: LivePenaltyOption, ctx: LivePenaltyContext, call: PenaltyCall): LivePenaltyOption | undefined {
  if (!option.yards || option.safety || option.carryover?.length || option.kind !== 'enforce') return;
  const fromX = option.enforcementSpots?.[0].fromX;
  if (fromX === undefined) return;
  const phase = phaseOf(call, ctx);
  const bare = phase === 'dead_ball' || phase === 'between_downs'
    ? { ...declineOption(ctx), kind: 'enforce' as const, callIndices: option.callIndices,
      autoFirst: option.autoFirst, preservesPlay: true }
    : baseOption(ctx, call, option.callIndices[0], fromX, fromX, 0, teamAt(call), option.autoFirst, option.lossDown);
  return { ...bare, id: `${option.id}:distance-declined`, yards: 0, acceptedWithoutDistance: true };
}

/** Ordinary coaching policy is separate from the legal options. */
function recommended(ctx: LivePenaltyContext, options: LivePenaltyOption[]): string {
  if (options.length === 1) return options[0].id;
  const r = ctx.result;
  const accepted = options.filter(o => o.kind !== 'decline' && !o.acceptedWithoutDistance);
  const carryover = accepted.find(o => o.carryover?.length);
  if (carryover) return carryover.id;
  const primary = accepted[0]?.callIndices[0] ?? 0;
  const opposing = ctx.calls[primary].against, beneficiary = other(opposing);
  const raw = options.find(o => o.kind === 'decline') ?? declineOption(ctx);
  if (r.score?.team === beneficiary) return raw.id;
  const keepTakeaway = accepted.filter(o => o.possession === beneficiary);
  if (raw.possession === beneficiary && !keepTakeaway.length) return raw.id;
  const ordered = [...(keepTakeaway.length ? keepTakeaway : accepted)].sort((a, b) =>
    Number(b.safety && b.safetyTeam === beneficiary) - Number(a.safety && a.safetyTeam === beneficiary)
    || Number(b.possession === beneficiary) - Number(a.possession === beneficiary)
    || direction(beneficiary) * (b.spotX - a.spotX)
    || (beneficiary === 'D' ? b.nextDown - a.nextDown : a.nextDown - b.nextDown));
  const best = ordered[0];
  if (!best) return raw.id;
  if (best.safety || best.possession === beneficiary && raw.possession !== beneficiary) return best.id;
  if (opposing === 'O') {
    if (r.score?.team === 'D') return raw.id;
    if (r.turnover && best.possession !== 'D') return raw.id;
    if (r.score?.team === 'O' || best.lossDown) return best.id;
    if (!raw.replayDown && changes(r) === 0 && ctx.startDown >= 3 && r.yards < ctx.startDistance - EPS && !best.preservesPlay) return raw.id;
    return raw.spotX - best.spotX > (best.preservesPlay ? EPS : 2) ? best.id : raw.id;
  }
  if (r.score?.team === 'O') return raw.id;
  if (raw.possession === 'D' && best.possession === 'O') return best.id;
  const converted = !changes(r) && r.outcome !== 'incomplete' && r.yards >= ctx.startDistance - EPS;
  return converted && raw.spotX >= best.spotX - EPS && !best.preservesPlay ? raw.id : best.id;
}

function mainResolution(ctx: LivePenaltyContext, indices: number[]): LivePenaltyResolution {
  if (!indices.length) return { status: 'resolved', options: [declineOption(ctx)], recommendedId: 'decline' };
  const sides = new Set(indices.map(i => ctx.calls[i].against));
  if (sides.size > 1) {
    const r = ctx.result;
    // 14-4-9 Item 3 exception 2: a scoring team's ONLY fouls are after
    // the score. Disregard the opponent's non-personal live foul.
    if (r.score) {
      const scoring = indices.filter(i => ctx.calls[i].against === r.score!.team);
      const opponents = indices.filter(i => ctx.calls[i].against !== r.score!.team);
      if (scoring.every(i => phaseOf(ctx.calls[i], ctx) === 'dead_ball')) {
        if (opponents.some(i => personal(ctx.calls[i]))) {
          const offset = offsetOption(ctx, indices, true);
          return { status: 'resolved', options: [offset], recommendedId: offset.id };
        }
        const options = scoring.map(i => ({ ...declineOption(ctx), id: `carryover:${i}`,
          kind: 'enforce' as const, callIndices: [i], preservesPlay: true,
          carryover: [{ target: r.score!.kind === 'TD' ? 'try' as const : 'kickoff' as const,
            against: ctx.calls[i].against, yards: nominal(ctx.calls[i]), callIndices: [i] }] }));
        return { status: 'resolved', options, recommendedId: options[0].id };
      }
    }
    // Clean-hands end-of-half exception. The defense's only foul is a
    // continuing-action personal foul; an ordinary offensive foul is ignored.
    if (ctx.endOfHalf) {
      const defensive = indices.filter(i => ctx.calls[i].against === 'D');
      const offensive = indices.filter(i => ctx.calls[i].against === 'O');
      if (defensive.every(i => phaseOf(ctx.calls[i], ctx) === 'dead_ball' && personal(ctx.calls[i]))) {
        if (offensive.some(i => personal(ctx.calls[i]))) {
          const offset = offsetOption(ctx, indices, true);
          return { status: 'resolved', options: [offset], recommendedId: offset.id };
        }
        const options = defensive.map(i => ({ ...declineOption(ctx), id: `carryover:${i}`,
          kind: 'enforce' as const, callIndices: [i], preservesPlay: true,
          carryover: [{ target: 'kickoff' as const, against: ctx.calls[i].against,
            yards: nominal(ctx.calls[i]), callIndices: [i] }] }));
        return { status: 'resolved', options, recommendedId: options[0].id };
      }
    }
    if (changes(ctx.result)) {
      const offset = postPossessionOffset(ctx, indices);
      if (typeof offset === 'string') return unsupported(offset);
      return { status: 'resolved', options: [offset], recommendedId: offset.id };
    }
    const allDead = indices.every(i => ['dead_ball', 'between_downs'].includes(phaseOf(ctx.calls[i], ctx)));
    if (allDead) {
      const offset = offsetOption(ctx, indices, true);
      return { status: 'resolved', options: [offset], recommendedId: offset.id };
    }
    const majors = indices.filter(i => nominal(ctx.calls[i]) === 15);
    if (majors.length) {
      const majorTeam = ctx.calls[majors[0]].against;
      const minor = indices.filter(i => ctx.calls[i].against !== majorTeam);
      if (majors.every(i => ctx.calls[i].against === majorTeam) && minor.every(i => {
        const c = ctx.calls[i], d = nflPenaltyDefinition(c);
        return nominal(c) === 5 && !d.defensiveFirst && !c.autoFirst && !c.lossDown
          && !d.offensiveLossDown && c.kind !== 'intentional_grounding' && c.enforcement !== 'spot';
      })) {
        const options: LivePenaltyOption[] = [];
        for (const i of majors) {
          const option = enforcedOption(ctx, { ...ctx.calls[i], enforcement: 'previous' }, i);
          if (typeof option === 'string') return unsupported(option);
          options.push({ ...option, id: `major:${i}`, callIndices: [i] });
        }
        return { status: 'resolved', options, recommendedId: options[0].id };
      }
    }
    const offset = offsetOption(ctx, indices);
    return { status: 'resolved', options: [offset], recommendedId: offset.id };
  }
  const options: LivePenaltyOption[] = [declineOption(ctx)];
  for (const i of indices) {
    const call = ctx.calls[i], option = enforcedOption(ctx, call, i);
    if (typeof option === 'string') return unsupported(option);
    options.push(option, ...personalOptions(ctx, call, i));
    if (ctx.endOfHalf && phaseOf(call, ctx) === 'dead_ball' && personal(call) && !ctx.result.score) {
      options.push({ ...declineOption(ctx), id: `carryover:${i}`, kind: 'enforce', callIndices: [i],
        preservesPlay: true, carryover: [{ target: 'kickoff', against: call.against,
          yards: nominal(call), callIndices: [i] }] });
    }
    const without = distanceDeclined(option, ctx, call);
    if (without) options.push(without);
  }
  // 14-1-3 exception 2: the SAME act may be both DPI and a personal foul.
  // Independent coincident flags do not justify adding both distances.
  for (const dpiIndex of indices.filter(i => ctx.calls[i].kind === 'dpi')) {
    const dpi = ctx.calls[dpiIndex];
    for (const i of indices.filter(i => i !== dpiIndex && personal(ctx.calls[i])
      && (!!dpi.id && ctx.calls[i].pairedWith === dpi.id || !!ctx.calls[i].id && dpi.pairedWith === ctx.calls[i].id))) {
      const first = options.find(o => o.id === `enforce:${dpiIndex}`)!;
      const extra = moved(first.spotX, ctx.calls[i].against, nominal(ctx.calls[i]));
      options.push({ ...first, id: `paired:${dpiIndex}:${i}`, callIndices: [dpiIndex, i],
        spotX: extra.spotX, yards: first.yards + extra.yards,
        nextDistance: Math.min(10, distanceToScore('O', extra.spotX)),
        enforcementSpots: [...first.enforcementSpots!, { callIndex: i, fromX: first.spotX, toX: extra.spotX }] });
    }
  }
  return { status: 'resolved', options, recommendedId: recommended(ctx, options) };
}

function resolveScrimmagePenalties(ctx: LivePenaltyContext): LivePenaltyResolution {
  if (!ctx.calls.length) return { status: 'none', options: [] };
  if (!Number.isFinite(ctx.los) || ctx.los <= OWN_GOAL_X || ctx.los >= OPP_GOAL_X
    || !Number.isInteger(ctx.startDown) || ctx.startDown < 1 || ctx.startDown > 4
    || !Number.isFinite(ctx.startDistance) || ctx.startDistance <= 0) return unsupported('Invalid previous-spot/down/distance context.');
  for (const call of ctx.calls) {
    if (!nflPenaltyDefinition(call)) return unsupported(`No NFL-2026 definition for ${call.kind}.`);
    if (nflPenaltyDefinition(call).specializedKickAward) return unsupported('Rule 6 kick-placement elections must use the specialized kick-rules legal options.');
    if (!Number.isFinite(call.spotX ?? ctx.los) || !Number.isFinite(call.t ?? 0)) return unsupported('A called foul contains non-finite spot/time facts.');
    const possession = teamAt(call), stamp = changeAt(call);
    if (!Number.isInteger(stamp) || stamp < 0 || stamp > changes(ctx.result)) return unsupported('The foul possession-change stamp contradicts the physical possession history.');
    if (call.possessionTeam && call.possessionTeam !== (stamp % 2 ? 'D' : 'O')) return unsupported('The foul possession team contradicts its possession-change stamp.');
    if (call.kind === 'holding' && call.against !== possession) return unsupported('An offensive-holding call names a defender at the time of the act.');
    if (call.kind === 'defensive_holding' && call.against === possession) return unsupported('A defensive-holding call names the possessing team at the time of the act.');
    if ((call.kind === 'dpi' || call.kind === 'illegal_contact') && call.against !== 'D') return unsupported('The defensive pass call names the original offense.');
    if (call.kind === 'opi' && call.against !== 'O') return unsupported('An OPI call must name the original passing offense.');
  }
  const separate: number[] = [], main: number[] = [];
  ctx.calls.forEach((call, i) => (phaseOf(call, ctx) === 'between_downs' ? separate : main).push(i));
  let resolution = mainResolution(ctx, main);
  if (resolution.status !== 'resolved') return resolution;
  separate.sort((a, b) => (ctx.calls[a].t ?? 0) - (ctx.calls[b].t ?? 0));
  for (const i of separate) {
    const call = ctx.calls[i], next: LivePenaltyOption[] = [];
    for (const previous of resolution.options) {
      next.push(previous);
      const applied = deadBallOption(ctx, call, i, previous, 'between_downs');
      const carry = !previous.nullifiesPlay && !!(ctx.result.score || ctx.endOfHalf && personal(call));
      next.push({ ...(carry ? previous : applied), id: `${previous.id}+between:${i}`, kind: 'enforce',
        callIndices: [...previous.callIndices, i], yards: previous.yards + applied.yards,
        nullifiesPlay: previous.nullifiesPlay, preservesPlay: carry || previous.preservesPlay,
        lossDown: previous.lossDown, replayDown: previous.replayDown,
        ...(carry ? { carryover: [...(previous.carryover ?? []), {
          target: ctx.result.score?.kind === 'TD' ? 'try' as const : 'kickoff' as const,
          against: call.against, yards: nominal(call), callIndices: [i] }] } : {}),
        enforcementSpots: [...(previous.enforcementSpots ?? []), ...(carry ? [] : applied.enforcementSpots ?? [])] });
    }
    const prior = resolution.options.find(o => o.id === resolution.recommendedId)!;
    const added = next.find(o => o.id === `${prior.id}+between:${i}`)!;
    resolution = { status: 'resolved', options: next,
      recommendedId: call.against !== prior.possession || added.spotX !== prior.spotX ? added.id : prior.id };
  }
  const disqualified = ctx.calls.filter(c => c.disqualify || c.kind === 'disqualification').map(c => c.playerId);
  if (disqualified.length) resolution.options = resolution.options.map(o => ({ ...o, disqualifiedPlayerIds: [...new Set(disqualified)] }));
  return resolution;
}

/** Rule 11-3-3 has its own possession-change and carryover rules. Ordinary
 * clean-hands enforcement must not manufacture another two-point attempt. */
export function resolveTryPenalties(ctx: LivePenaltyContext): LivePenaltyResolution {
  const context = { ...ctx, isTry: true };
  const rawScore: LivePenaltyOption['tryScore'] = ctx.result.score
    ? { team: ctx.result.score.team, points: ctx.result.score.kind === 'TD' ? 2 : 1 } : null;
  const hasChange = changes(ctx.result) > 0;
  const inDown = ctx.calls.map((_, i) => i).filter(i => phaseOf(ctx.calls[i], ctx) !== 'between_downs');
  const bothTeams = new Set(inDown.map(i => ctx.calls[i].against)).size > 1;
  if (bothTeams && hasChange) {
    // 11-3-3 Item 6: a B foul before the FIRST COP requires a retry;
    // an A pre-COP foul or two post-COP fouls ends the Try unsuccessfully.
    const retry = inDown.some(i => ctx.calls[i].against === 'D' && changeAt(ctx.calls[i]) === 0);
    const option = { ...offsetOption(ctx, inDown), replayDown: retry,
      tryDisposition: retry ? 'retry' as const : 'failed' as const, tryScore: null,
      disqualifiedPlayerIds: [...new Set(ctx.calls.filter(c => c.disqualify || c.kind === 'disqualification').map(c => c.playerId))] };
    return { status: 'resolved', options: [option], recommendedId: option.id };
  }
  const core = resolveScrimmagePenalties(context);
  if (core.status !== 'resolved') return core;
  const options: LivePenaltyOption[] = [];
  for (const ordinary of core.options) {
    const selectedCalls = ordinary.callIndices.map(i => ctx.calls[i]);
    let option: LivePenaltyOption = { ...ordinary, tryDisposition: rawScore ? 'stands' : 'failed', tryScore: rawScore };
    if (ordinary.kind === 'decline') {
      options.push(ordinary.replayDown ? { ...option, tryDisposition: 'retry', tryScore: null } : option);
      continue;
    }
    if (ordinary.safety) {
      options.push({ ...option, tryDisposition: 'stands', tryScore: { team: ordinary.safetyTeam ?? 'D', points: 1 } });
      continue;
    }
    if (ordinary.carryover?.length) {
      options.push({ ...option, carryover: ordinary.carryover.map(c => ({ ...c, target: 'kickoff' })),
        tryDisposition: rawScore ? 'stands' : 'failed', tryScore: rawScore });
      continue;
    }
    if (ordinary.kind === 'offset') {
      const afterTry = ordinary.preservesPlay;
      options.push({ ...option, tryDisposition: afterTry ? rawScore ? 'stands' : 'failed' : 'retry',
        tryScore: afterTry ? rawScore : null });
      continue;
    }
    const primary = selectedCalls[0];
    if (!primary) { options.push(option); continue; }
    const phase = phaseOf(primary, ctx), stamp = changeAt(primary);
    const preSnap = phase === 'pre_snap';
    const afterDown = phase === 'dead_ball' || phase === 'between_downs';
    if (preSnap) option = { ...option, tryDisposition: 'retry', tryScore: null };
    else if (afterDown) {
      option = { ...option, tryDisposition: rawScore ? 'stands' : 'failed', tryScore: rawScore,
        nullifiesPlay: false, preservesPlay: true,
        carryover: selectedCalls.map((c, n) => ({ target: 'kickoff', against: c.against,
          yards: nominal(c), callIndices: [ordinary.callIndices[n]] })) };
    } else if (primary.against === 'O') {
      if (ordinary.lossDown && stamp === 0) option = { ...option, tryDisposition: 'failed', tryScore: null };
      else if (rawScore?.team === 'O') option = { ...option, tryDisposition: 'retry', tryScore: null };
      else if (stamp > 0 || personal(primary)) {
        option = { ...option, tryDisposition: rawScore ? 'stands' : 'failed', tryScore: rawScore,
          nullifiesPlay: false, preservesPlay: true,
          carryover: [{ target: 'kickoff', against: 'O', yards: nominal(primary), callIndices: ordinary.callIndices }] };
      } else option = { ...option, tryDisposition: 'failed', tryScore: null };
    } else {
      if (rawScore?.team === 'O') {
        if (primary.kind === 'dpi') option = { ...option, tryDisposition: 'retry', tryScore: null };
        else option = { ...option, tryDisposition: 'stands', tryScore: rawScore,
          nullifiesPlay: false, preservesPlay: true,
          carryover: [{ target: 'kickoff', against: 'D', yards: nominal(primary), callIndices: ordinary.callIndices }] };
      } else if (stamp === 0) option = { ...option, tryDisposition: 'retry', tryScore: null };
      else if (rawScore?.team === 'D') option = { ...option, tryDisposition: 'failed', tryScore: null };
      else option = { ...option, tryDisposition: 'failed', tryScore: null, nullifiesPlay: false, preservesPlay: true,
        carryover: [{ target: 'kickoff', against: 'D', yards: nominal(primary), callIndices: ordinary.callIndices }] };
    }
    if (bothTeams && !hasChange && !ordinary.preservesPlay && !ordinary.carryover?.length) option = {
      ...option, tryDisposition: 'retry', tryScore: null, replayDown: true,
      preservesPlay: false, nullifiesPlay: true, carryover: undefined,
    };
    options.push(option);
    if (primary.against === 'D' && preSnap) options.push({ ...option, id: `${option.id}:kickoff`, spotX: ctx.los,
      yards: 0, carryover: [{ target: 'kickoff', against: 'D', yards: nominal(primary), callIndices: ordinary.callIndices }] });
  }
  // A defense may decline distance on a failed Try but still demand a retry
  // (11-3-3 Item 4(c)); distance-declined options above preserve that election.
  let recommendedId = core.recommendedId;
  const defenseScore = rawScore?.team === 'D';
  const carry = options.find(o => o.carryover?.length && (!defenseScore || o.tryScore?.team === 'D'));
  if (defenseScore && ctx.calls.every(c => c.against === 'O')) recommendedId = carry?.id ?? 'decline';
  else if (defenseScore) {
    const ownPoint = options.find(o => o.tryScore?.team === 'O');
    const retry = options.find(o => o.tryDisposition === 'retry');
    const erased = options.find(o => o.kind !== 'decline' && o.tryScore === null);
    recommendedId = ownPoint?.id ?? retry?.id ?? erased?.id ?? 'decline';
  }
  else {
    const safety = options.find(o => o.safety && o.tryScore?.team === 'D');
    const loss = options.find(o => o.lossDown && o.callIndices.some(i => ctx.calls[i].against === 'O'));
    const retry = options.find(o => o.tryDisposition === 'retry' && o.callIndices.some(i => ctx.calls[i].against === 'D'));
    if (safety) recommendedId = safety.id;
    else if (loss) recommendedId = loss.id;
    else if (carry) recommendedId = carry.id;
    else if (retry && rawScore?.team !== 'O') recommendedId = retry.id;
    else if (!rawScore && ctx.calls.every(c => c.against === 'O')) recommendedId = 'decline';
  }
  if (!options.some(o => o.id === recommendedId)) recommendedId = options[0]?.id;
  return { status: 'resolved', options, recommendedId };
}

export function resolveLivePenalties(ctx: LivePenaltyContext): LivePenaltyResolution {
  return ctx.isTry ? resolveTryPenalties(ctx) : resolveScrimmagePenalties(ctx);
}

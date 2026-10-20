/**
 * Pure NFL-2026 enforcement for the delivered live scrimmage foul families.
 *
 * This consumes called fouls, not proximity or a referee visibility roll.
 * The detector owns the rule's elements; this module owns the legal choices.
 * Rule 14-1-3 requires retaining same-team alternatives until one is selected.
 * Unsupported phase combinations are explicit, never silently declined.
 */
import { OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import type { PenaltyCall, PlayResult } from '../sim/types.js';

export interface LivePenaltyContext {
  calls: readonly PenaltyCall[];
  los: number;
  startDown: number;
  startDistance: number;
  result: PlayResult;
}

export interface LivePenaltyOption {
  id: string;
  kind: 'decline' | 'enforce' | 'offset';
  /** Entries in context.calls. Same-team accepted alternatives contain one. */
  callIndices: number[];
  /** Physical play-frame x; the original offense attacks increasing x. */
  spotX: number;
  /** Distance enforced, not the net change from the previous snap spot. */
  yards: number;
  possession: 'O' | 'D';
  nextDown: number;
  nextDistance: number;
  autoFirst: boolean;
  lossDown: boolean;
  replayDown: boolean;
  safety: boolean;
  nullifiesPlay: boolean;
  /** A return foul does not erase the preceding interception/fumble. */
  preserveBeforeChangeOfPossession: boolean;
}

export interface LivePenaltyResolution {
  status: 'none' | 'resolved' | 'unsupported';
  options: LivePenaltyOption[];
  recommendedId?: string;
  reason?: string;
}

const unsupported = (reason: string): LivePenaltyResolution => ({ status: 'unsupported', options: [], reason });

function possessionChanges(result: PlayResult): number {
  let side: 'O' | 'D' = 'O', n = 0;
  for (const segment of result.segments) {
    if (segment.team !== side) { n++; side = segment.team; }
  }
  // Scripted older results may not contain segments. A recorded turnover is
  // still sufficient to refuse a supposed no-change double-foul resolution.
  return Math.max(n, result.turnover ? 1 : 0);
}

function declineOption(ctx: LivePenaltyContext): LivePenaltyOption {
  const r = ctx.result;
  const converted = !r.turnover && r.outcome !== 'incomplete' && r.yards >= ctx.startDistance - 1e-6;
  const newSeries = possessionChanges(r) > 0;
  const downsTurnover = !newSeries && ctx.startDown === 4 && !converted && !r.score;
  const spotX = r.outcome === 'incomplete' ? ctx.los : r.endX;
  const possession = downsTurnover ? 'D' : r.possession;
  return {
    id: 'decline', kind: 'decline', callIndices: [], spotX, yards: 0,
    possession, nextDown: converted || newSeries || downsTurnover ? 1 : ctx.startDown + 1,
    nextDistance: newSeries || downsTurnover ? Math.min(10, possession === 'D' ? spotX - OWN_GOAL_X : OPP_GOAL_X - spotX)
      : converted ? Math.min(10, OPP_GOAL_X - spotX) : ctx.startDistance - (r.outcome === 'incomplete' ? 0 : r.yards),
    autoFirst: false, lossDown: false, replayDown: false, safety: false,
    nullifiesPlay: false, preserveBeforeChangeOfPossession: false,
  };
}

function enforcedOption(ctx: LivePenaltyContext, p: PenaltyCall, i: number): LivePenaltyOption | string {
  const { los, startDown, startDistance, result: r } = ctx;
  const kind: string = p.kind;
  const foulX = p.spotX ?? los;
  if (!Number.isFinite(foulX)) return 'The foul has no finite enforcement spot.';
  const afterChange = kind === 'illegal_forward_pass' && p.reason === 'after_change_of_possession';
  if (afterChange) {
    if (possessionChanges(r) !== 1 || p.against !== 'D') {
      return 'After-possession forward-pass enforcement currently supports one original-offense-to-defense change.';
    }
    // 8-1-2(c), 14-1-2 Item 6: five from the release, no loss of down,
    // and a new series for the team possessing at the foul. If the other
    // team catches that illegal pass, it may instead decline and keep it.
    if (foulX >= OPP_GOAL_X) return 'An after-possession foul in the returner\'s end zone requires impetus/momentum facts.';
    if (foulX <= OWN_GOAL_X) return 'An after-possession foul beyond the returner\'s scoring plane requires score-phase facts.';
    const yards = Math.min(5, (OPP_GOAL_X - foulX) / 2);
    const spotX = foulX + yards;
    return {
      id: `enforce:${i}`, kind: 'enforce', callIndices: [i], spotX, yards,
      possession: 'D', nextDown: 1, nextDistance: Math.min(10, spotX - OWN_GOAL_X),
      autoFirst: false, lossDown: false, replayDown: false, safety: false,
      nullifiesPlay: true, preserveBeforeChangeOfPossession: true,
    };
  }
  if (p.against !== (kind === 'dpi' ? 'D' : 'O')) return 'Unsupported foul/team combination.';

  let fromX: number, spotX: number, yards: number;
  let autoFirst = false, lossDown = false, safety = false;
  if (kind === 'dpi') {
    // 8-5 Penalty: this is a spot foul, not a capped distance penalty.
    // The special defensive-end-zone placement overrides ordinary half-distance.
    spotX = foulX >= OPP_GOAL_X
      ? los >= OPP_GOAL_X - 2 ? (los + OPP_GOAL_X) / 2 : OPP_GOAL_X - 1
      : foulX;
    if (spotX < los) return 'DPI spot behind the previous spot is outside the qualified detector contract.';
    yards = spotX - los;
    autoFirst = true;
  } else if (kind === 'holding' || kind === 'opi' || kind === 'illegal_forward_pass') {
    if (kind === 'holding') {
      // Existing accepted holding behavior: pass plays use previous spot;
      // running enforcement uses three-and-one and behind-LOS exceptions.
      const firstChange = r.segments.findIndex(segment => segment.team === 'D');
      const runEndX = firstChange > 0 ? r.segments[firstChange - 1].endX : r.endX;
      const basic = r.stats.attempted ? los : Math.max(los, Math.min(OPP_GOAL_X, runEndX));
      fromX = r.stats.attempted ? los : Math.max(los, Math.min(basic, foulX));
    } else if (kind === 'opi') {
      fromX = los;
    } else {
      // The producer declares previous versus release spot from 8-1-2(a/b).
      fromX = p.enforcement === 'spot' ? foulX : los;
      lossDown = p.lossDown ?? true;
    }
    safety = foulX <= OWN_GOAL_X;
    yards = safety ? 0 : Math.min(kind === 'illegal_forward_pass' ? 5 : 10, (fromX - OWN_GOAL_X) / 2);
    spotX = safety ? OWN_GOAL_X : fromX - yards;
  } else {
    return `Unsupported live foul kind: ${kind}.`;
  }
  const converted = !safety && (autoFirst || spotX >= los + startDistance - 1e-6);
  const fourthDownLoss = lossDown && startDown === 4 && !converted;
  const possession = fourthDownLoss ? 'D' : 'O';
  return {
    id: `enforce:${i}`, kind: 'enforce', callIndices: [i], spotX, yards,
    possession, nextDown: converted || fourthDownLoss ? 1 : startDown + (lossDown ? 1 : 0),
    nextDistance: fourthDownLoss ? Math.min(10, spotX - OWN_GOAL_X)
      : converted ? Math.min(10, OPP_GOAL_X - spotX) : los + startDistance - spotX,
    autoFirst, lossDown, replayDown: !lossDown && !converted, safety,
    nullifiesPlay: true, preserveBeforeChangeOfPossession: false,
  };
}

/** Ordinary policy; legal option calculation is independent of this choice. */
function recommended(ctx: LivePenaltyContext, options: LivePenaltyOption[]): string {
  const { result: r, startDown, startDistance, los } = ctx;
  const enforce = options.filter(o => o.kind === 'enforce');
  const against = ctx.calls[0].against;
  const gain = r.outcome === 'incomplete' ? 0 : r.yards;
  const afterChange = enforce.find(o => o.preserveBeforeChangeOfPossession);
  if (afterChange) return r.possession === 'O' || r.score?.team === 'O' ? 'decline' : afterChange.id;

  if (against === 'O') {
    if (r.turnover || r.score?.team === 'D') return 'decline';
    const ordered = [...enforce].sort((a, b) => Number(b.safety) - Number(a.safety)
      || Number(b.possession === 'D') - Number(a.possession === 'D')
      || a.spotX - b.spotX || b.nextDown - a.nextDown);
    const best = ordered[0];
    if (!best) return 'decline';
    if (r.score?.team === 'O' || best.safety || best.lossDown) return best.id;
    // Retain the accepted holding/ordinary offensive-foul choice convention.
    if (possessionChanges(r) === 0 && startDown >= 3 && gain < startDistance - 1e-6) return 'decline';
    return los + gain - best.spotX > 2 ? best.id : 'decline';
  }
  if (r.score?.team === 'O') return 'decline';
  const best = [...enforce].sort((a, b) => b.spotX - a.spotX)[0];
  if (!best) return 'decline';
  const converted = !r.turnover && r.outcome !== 'incomplete' && gain >= startDistance - 1e-6;
  return converted && los + gain >= best.spotX - 1e-6 ? 'decline' : best.id;
}

export function resolveLivePenalties(ctx: LivePenaltyContext): LivePenaltyResolution {
  if (!ctx.calls.length) return { status: 'none', options: [] };
  if (!Number.isFinite(ctx.los) || ctx.los <= OWN_GOAL_X || ctx.los >= OPP_GOAL_X
    || !Number.isInteger(ctx.startDown) || ctx.startDown < 1 || ctx.startDown > 4
    || !Number.isFinite(ctx.startDistance) || ctx.startDistance <= 0) {
    return unsupported('Invalid previous-spot/down/distance context.');
  }
  const teams = new Set(ctx.calls.map(c => c.against));
  const changeCount = possessionChanges(ctx.result);
  for (const call of ctx.calls) {
    const expectedTeam = call.kind === 'dpi'
      || (call.kind === 'illegal_forward_pass' && call.reason === 'after_change_of_possession') ? 'D' : 'O';
    if (call.against !== expectedTeam) return unsupported('Unsupported foul/team combination.');
  }
  if (teams.size > 1) {
    if (changeCount) return unsupported('Double fouls with a possession change require clean-hands/phase adjudication.');
    // Delivered kinds contain no 15-vs-5, personal-foul or dead-ball exceptions.
    if (ctx.calls.some(c => !['holding', 'opi', 'dpi', 'illegal_forward_pass'].includes(c.kind))) {
      return unsupported('This double-foul family has unqualified offset exceptions.');
    }
    if (ctx.calls.some(c => c.t !== undefined && (c.t < 0 || c.t > ctx.result.duration + 1e-6))) {
      return unsupported('Dead-ball/between-downs fouls require separate enforcement.');
    }
    const option: LivePenaltyOption = {
      id: 'offset', kind: 'offset', callIndices: ctx.calls.map((_, i) => i),
      spotX: ctx.los, yards: 0, possession: 'O', nextDown: ctx.startDown,
      nextDistance: ctx.startDistance, autoFirst: false, lossDown: false,
      replayDown: true, safety: false, nullifiesPlay: true, preserveBeforeChangeOfPossession: false,
    };
    return { status: 'resolved', options: [option], recommendedId: option.id };
  }
  const allOriginalOffenseBeforeChange = ctx.calls.every(c => c.against === 'O'
    && (c.possessionChanges === 0 || c.kind === 'opi'));
  if ((changeCount > 1 || (changeCount && ctx.calls.length > 1)) && !allOriginalOffenseBeforeChange) {
    return unsupported('Multiple fouls/possession changes require explicit foul-phase adjudication.');
  }
  const options: LivePenaltyOption[] = [declineOption(ctx)];
  for (const [i, call] of ctx.calls.entries()) {
    if (call.t !== undefined && (call.t < 0 || call.t > ctx.result.duration + 1e-6)) {
      return unsupported('Dead-ball/between-downs fouls require separate enforcement.');
    }
    const option = enforcedOption(ctx, call, i);
    if (typeof option === 'string') return unsupported(option);
    options.push(option);
  }
  return { status: 'resolved', options, recommendedId: recommended(ctx, options) };
}

/** Official statistical credit is distinct from a raw physical ending and from
 * enforcement. NFL GSIS Guide for Statisticians, pp6,8,11,13,17:
 * https://www.nflgsis.com/gsis/documentation/stadiumguides/guide_for_statisticians.pdf
 * A loss of down can charge an attempt despite nullifying the physical ending;
 * a spot-enforced rush can retain yards without a third-down attempt. */
import type { CarrierSegment, PenaltyCall, PlayResult, PlayStats } from '../sim/types.js';
import { OPP_GOAL_X } from '../core/field.js';
import type { LivePenaltyOption } from './penalty-enforcement.js';

export type OfficialStatsTreatment = 'none' | 'physical' | 'before_change_of_possession'
  | 'loss_of_down' | 'to_enforcement_spot';

/** Serialized beside the raw log. Never substitute raw post-foul stats when a
 * statistical prefix was selected. Older logs have no such explicit view. */
export interface OfficialPlayCredit {
  treatment: OfficialStatsTreatment;
  playCharged: boolean;
  downAttempt: boolean;
  converted: boolean;
  kind?: PlayResult['kind'];
  yards?: number;
  stats?: PlayStats;
  segments?: CarrierSegment[];
  limitations?: string[];
}

export interface OfficialStatContext {
  result: PlayResult;
  calls: readonly PenaltyCall[];
  selected?: LivePenaltyOption;
  los: number;
  startDistance: number;
}
export interface OfficialStatRuling {
  credit: OfficialPlayCredit;
  /** Only this result may enter the box; the caller retains the raw tape. */
  result?: PlayResult;
}

const physicalConversion = (r: PlayResult, distance: number): boolean =>
  r.score?.kind === 'TD' && r.score.team === 'O'
  || (!r.turnover && !r.score && r.outcome !== 'incomplete'
    && Math.round(r.yards * 10) / 10 >= distance - 1e-6);

function credited(treatment: OfficialStatsTreatment, result: PlayResult,
  downAttempt: boolean, converted: boolean, los: number): OfficialStatRuling {
  // GSIS 2025 pp32–33: on a reception followed by an opponent recovery,
  // passing/receiving credit includes any loose-ball loss to that recovery,
  // but no forward loose-ball gain. The return's END is not the recovery.
  // Bound this repair to a direct receiver -> opponent chain; own recoveries,
  // missing recovery locations and multi-carrier allocation retain their view.
  const caughtAt = result.segments.findIndex(s => s.team === 'O' && s.how === 'catch');
  const caught = result.segments[caughtAt], recovery = result.segments[caughtAt + 1];
  if (result.kind === 'pass' && result.stats.completed && result.turnover
    && caught?.end === 'fumble' && caught.carrier === result.stats.receiver
    && recovery?.team === 'D' && recovery.how === 'recovery'
    && result.segments.length === caughtAt + 2 && Number.isFinite(recovery.startX)
    && recovery.startX < caught.endX) {
    const offenseYards = Math.round((recovery.startX - los) * 100) / 100;
    result = { ...result, offenseYards, stats: { ...result.stats,
      yac: recovery.startX - caught.startX } };
  }
  // NFL YAC = receiving yards - completed air yards; air is measured from
  // LOS to the catch, not from the QB. For an end-zone reception, statistical
  // catch depth ends at the goal line, just as receiving yardage does. Keep
  // the physical catch segment and intended airYards intact. Using credited
  // yardage here also preserves the existing hundredth-yard TD rounding.
  const catchSegment = result.kind === 'pass' && result.stats.completed
    && result.segments.find(s => s.team === 'O' && s.how === 'catch');
  if (result.score?.kind === 'TD' && result.score.team === 'O'
    && catchSegment && catchSegment.startX >= OPP_GOAL_X) {
    result = { ...result, stats: { ...result.stats,
      completedAirYards: result.offenseYards, yac: 0 } };
  }
  return { result, credit: { treatment, playCharged: true, downAttempt, converted,
    kind: result.kind, yards: result.offenseYards, stats: result.stats, segments: result.segments } };
}
function none(downAttempt = false, limitations?: string[]): OfficialStatRuling {
  return { credit: { treatment: 'none', playCharged: false, downAttempt, converted: false,
    ...(limitations ? { limitations } : {}) } };
}

/** Clear post-foul catches, takeaways and defensive finishes rather than
 * partially rolling raw stats back after they have entered the box. */
function emptyStats(raw: PlayStats, fields: Partial<PlayStats> = {}): PlayStats {
  return { tacklers: [], completed: false, attempted: false, sacked: false,
    scramble: false, throwaway: false, pressured: raw.pressured,
    brokenTackles: 0, missedTackles: 0, missedTacklesBy: {}, dropped: false,
    fumbles: [], qbRead: raw.qbRead, ...fields };
}

function incompleteAttempt(c: OfficialStatContext, call: PenaltyCall): PlayResult {
  const raw = c.result;
  const passer = call.kind === 'intentional_grounding' ? call.playerId : raw.stats.passer;
  return { ...raw, kind: 'pass', outcome: 'incomplete', possession: 'O', turnover: false,
    endX: c.los, yards: 0, offenseYards: 0, score: null, segments: [],
    stats: emptyStats(raw.stats, { attempted: true, passer, throwaway: true }) };
}

/** Snapshot of the actual legal action before an illegal forward release.
 * No second illegal pass attempt is invented. A preceding legal reception
 * remains passing; otherwise the actual carrier has a rush to release. */
function releasePrefix(c: OfficialStatContext, call: PenaltyCall): PlayResult | undefined {
  const raw = c.result, x = call.spotX;
  if (x === undefined) return undefined;
  const snap = raw.statsBeforeIllegalPass;
  const source = raw.segmentsBeforeIllegalPass;
  if (!snap || !source || source.some(s => s.team === 'D')) return undefined;
  const segments = source.map(s => ({ ...s }));
  const last = segments.at(-1);
  if (!last || last.carrier !== call.playerId) return undefined;
  last.endX = x; last.end = 'dead';
  const yards = Math.round((x - c.los) * 100) / 100;
  const receiving = snap.attempted && snap.completed && segments.some(s => s.how === 'catch');
  const stats = receiving ? { ...snap, tacklers: [], missedTacklesBy: { ...(snap.missedTacklesBy ?? {}) },
    dropped: false, interceptedBy: undefined, passDefendedBy: undefined, returnYards: undefined }
    : emptyStats(snap, { rusher: call.playerId, scramble: raw.kind === 'pass' });
  if (receiving) {
    const catchX = segments.find(s => s.how === 'catch')!.startX;
    stats.yac = x - catchX;
  }
  return { ...raw, kind: receiving ? 'pass' : raw.kind, outcome: 'tackle', possession: 'O',
    turnover: false, endX: x, yards, offenseYards: yards, score: null, segments, stats };
}

/** Ordinary single-carrier runs have an unambiguous statistical prefix. The
 * native possession ledger handles more involved return/fumble chains; do not
 * infer their partial allocation from the final runner alone. */
function runPrefix(c: OfficialStatContext, x: number, rusher?: string,
  preserveBackwardFumble = false): PlayResult | undefined {
  const raw = c.result;
  if (!rusher || raw.stats.attempted || raw.stats.completed || raw.stats.sacked
    || raw.segments.some(s => s.team === 'D') || raw.turnover) return undefined;
  if (!preserveBackwardFumble && (raw.stats.fumbledBy || raw.stats.fumbles?.length)) return undefined;
  const yards = Math.round((x - c.los) * 100) / 100;
  const stats = emptyStats(raw.stats, { rusher, scramble: raw.stats.scramble,
    ...(preserveBackwardFumble ? {
      fumbles: raw.stats.fumbles?.map(f => ({ ...f })), fumbledBy: raw.stats.fumbledBy,
      fumbleLost: raw.stats.fumbleLost, fumbleRecoveredBy: raw.stats.fumbleRecoveredBy,
    } : {}) });
  const segments = raw.segments.map(s => ({ ...s }));
  if (segments.length) { segments[segments.length - 1].endX = x; segments[segments.length - 1].end = 'dead'; }
  return { ...raw, kind: raw.kind === 'pass' && raw.stats.scramble ? 'pass' : 'run',
    outcome: 'tackle', possession: 'O', turnover: false, endX: x, yards, offenseYards: yards,
    score: null, segments, stats };
}

/** The retained acquisition may follow the foul: a pre-INT offensive personal
 * foul can be enforced while preserving D's subsequent takeaway. */
function retainedAcquisitionPhase(c: OfficialStatContext, call?: PenaltyCall): number {
  const stamp = call?.possessionChanges ?? 1, possession = c.selected!.possession;
  const snapshot = c.result.possessionSnapshots?.find(s => s.changes >= stamp && s.possession === possession);
  if (snapshot) return snapshot.changes;
  let team = 'O', phase = 0;
  for (const segment of c.result.segments) {
    if (segment.team !== team) { phase++; team = segment.team; }
    if (phase >= stamp && team === possession) return phase;
  }
  return stamp;
}

function beforePossessionFoul(c: OfficialStatContext): OfficialStatRuling {
  const raw = c.result, option = c.selected!;
  const calls = option.callIndices.map(i => c.calls[i]).filter((p): p is PenaltyCall => !!p);
  if (calls.some(p => p.kind === 'illegal_forward_pass') && raw.statsBeforeIllegalPass && raw.segmentsBeforeIllegalPass)
    return credited('before_change_of_possession', { ...raw, score: null, possession: option.possession,
      turnover: option.possession === 'D', segments: raw.segmentsBeforeIllegalPass,
      stats: raw.statsBeforeIllegalPass }, true, false, c.los);

  const call = calls[0], phase = retainedAcquisitionPhase(c, call);
  const snapshot = raw.possessionSnapshots?.find(s => s.changes === phase);
  let team = 'O', changes = 0;
  const segments: CarrierSegment[] = [];
  for (const segment of snapshot?.segments ?? raw.segments) {
    if (segment.team !== team) { changes++; team = segment.team; }
    if (changes > phase) break;
    segments.push({ ...segment });
  }
  const ending = segments.at(-1);
  const fromX = option.enforcementSpots?.[0]?.fromX ?? option.spotX;
  if (ending) { ending.end = 'dead'; if (fromX !== undefined) ending.endX = fromX; }
  const fumbles = snapshot ? (snapshot.stats.fumbles ?? []).map(f => ({ ...f }))
    : (raw.stats.fumbles ?? []).filter(f => f.t !== undefined && call?.t !== undefined && f.t <= call.t)
    .map(f => {
      const at = segments.findIndex(s => s.carrier === f.playerId && s.end === 'fumble');
      const recovery = at >= 0 ? segments[at + 1] : undefined;
      return { ...f, lost: !!recovery && recovery.team !== f.team,
        recoveredBy: recovery?.how === 'recovery' ? recovery.carrier : undefined };
    });
  // GSIS p8 2(B): an achieved fumble beyond enforcement is still a fumble,
  // although the nullified subsequent recovery cannot become a giveaway.
  team = 'O'; changes = 0;
  for (const segment of raw.segments) {
    if (segment.team !== team) { changes++; team = segment.team; }
    if (changes !== phase || segment.end !== 'fumble' || fromX === undefined
      || (segment.endX - fromX) * (segment.team === 'O' ? 1 : -1) < -1e-6) continue;
    const native = raw.stats.fumbles?.find(f => f.playerId === segment.carrier && f.team === segment.team
      && !fumbles.some(prior => prior.playerId === f.playerId && prior.t === f.t));
    if (native) fumbles.push({ ...native, lost: false, recoveredBy: undefined });
  }
  const lastFumble = fumbles.at(-1), interception = segments.find(s => s.how === 'interception');
  const base = snapshot?.stats ?? raw.stats;
  const stats: PlayStats = { ...base, tacklers: [], sackedBy: undefined, passDefendedBy: undefined,
    interceptedBy: interception?.carrier, fumbles,
    fumbledBy: lastFumble?.playerId, fumbleLost: lastFumble?.lost,
    fumbleRecoveredBy: lastFumble?.recoveredBy,
    brokenTackles: snapshot?.stats.brokenTackles ?? 0,
    missedTackles: snapshot?.stats.missedTackles ?? 0,
    missedTacklesBy: { ...(snapshot?.stats.missedTacklesBy ?? {}) },
    returnYards: ending ? Math.max(0, (ending.endX - ending.startX) * (ending.team === 'O' ? 1 : -1)) : 0 };
  const firstD = segments.findIndex(s => s.team === 'D');
  const offensiveEnding = firstD > 0 ? segments[firstD - 1] : undefined;
  const offenseYards = offensiveEnding?.end === 'fumble'
    ? Math.round((offensiveEnding.endX - c.los) * 100) / 100 : 0;
  const ruling = credited('before_change_of_possession', { ...raw, score: null,
    possession: option.possession, turnover: option.possession === 'D',
    offenseYards, segments, stats }, true, false, c.los);
  if (raw.stats.missedTackles > (snapshot?.stats.missedTackles ?? 0))
    ruling.credit.limitations = ['Return-foul counters retain the acquisition checkpoint; later return-phase misses lack a foul-time checkpoint and are not credited.'];
  return ruling;
}

export function deriveOfficialPlayStats(c: OfficialStatContext): OfficialStatRuling {
  const { result: raw, selected: option } = c;
  if (!option || option.kind === 'decline' || option.preservesPlay)
    return credited('physical', raw, true, physicalConversion(raw, c.startDistance), c.los);
  if (option.preserveBeforeChangeOfPossession) return beforePossessionFoul(c);
  if (option.kind === 'offset') return none();
  const calls = option.callIndices.map(i => c.calls[i]).filter((p): p is PenaltyCall => !!p);
  if (option.lossDown) {
    const incomplete = calls.find(p => p.kind === 'intentional_grounding'
      || p.kind === 'illegal_touching' && (p.reason === 'returned_from_out_of_bounds' || p.reason === 'eligible_out_of_bounds'));
    if (incomplete) return credited('loss_of_down', incompleteAttempt(c, incomplete), true, false, c.los);
    const pass = calls.find(p => p.kind === 'illegal_forward_pass' && p.reason === 'beyond_line');
    if (pass) {
      const prefix = releasePrefix(c, pass);
      if (prefix) return credited('loss_of_down', prefix, true,
        option.possession === 'O' && option.nextDown === 1 && prefix.offenseYards >= c.startDistance, c.los);
    }
    const backward = calls.find(p => p.kind === 'illegal_backward_pass');
    if (backward) {
      // pp11,17: missed backward exchange stays in the originating rushing
      // category, to the actual ending, with its statistical fumble retained.
      const prefix = runPrefix(c, raw.endX, raw.stats.rusher ?? backward.playerId, true);
      if (prefix) return credited('loss_of_down', prefix, true, false, c.los);
    }
    return none(true, ['Official allocation of this loss-of-down action is not represented; the consumed down remains charged.']);
  }
  const first = option.enforcementSpots?.[0];
  if (first && first.fromX > c.los + 1e-6) {
    const call = c.calls[first.callIndex];
    // DPI is always a wholly penalty play, even though enforced at its spot.
    if (call && call.kind !== 'dpi' && call.playPhase !== 'pass') {
      const prefix = runPrefix(c, first.fromX, raw.stats.rusher);
      if (prefix) {
        const downAttempt = !(call.against === 'O' && option.replayDown);
        const converted = downAttempt && option.possession === 'O'
          && option.nextDown === 1 && prefix.offenseYards >= c.startDistance;
        return credited('to_enforcement_spot', prefix, downAttempt, converted, c.los);
      }
    }
  }
  return none();
}

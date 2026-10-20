/** NFL 2026 Rules 6, 9, 10 and 11 on represented kick events.
 * All event spots are measured from the RECEIVING team's goal, unless explicitly
 * named kickSpot/scrimmageSpot. No probability of committing a foul is added.
 * Source: https://operations.nfl.com/rules-officiating/2026-nfl-rulebook
 */
export type KickTeam = 'kicking' | 'receiving';
export interface KickFoul {
  kind: 'illegal_free_kick' | 'free_kick_out_of_bounds' | 'free_kick_short'
    | 'illegal_touching' | 'illegal_formation' | 'offside' | 'unsportsmanlike_conduct'
    | 'kick_catch_interference' | 'fair_catch_interference' | 'invalid_fair_catch_signal'
    | 'illegal_block_after_signal' | 'unnecessary_roughness' | 'illegal_block';
  against: KickTeam;
  rule: string;
  /** Zero denotes a special possession/spot option, not a zero-yard foul roll. */
  yards: 0 | 5 | 10 | 15;
  /** Receiving-team coordinates, including for a previous-spot penalty. */
  spot: number;
  enforcement: 'previous' | 'spot' | 'dead_ball' | 'special';
  /** Rule9-5: an attempt-to-block-kick foul is excluded from PSK. */
  attemptToBlockKick?: boolean;
  /** A15-yard nonpersonal kick-interference foul is not automatically roughness. */
  personal?: boolean;
  autoFirst?: boolean;
}
export interface KickOption {
  kind: 'first_touch' | 'dead_spot' | 'free_kick_award' | 'illegal_touch_award' | 'replay'
    | 'enforce_spot' | 'enforce_dead_ball' | 'decline';
  possession: KickTeam;
  /** Own-goal coordinates of the team receiving possession. */
  yardline: number;
  /** For replay options only: kicking team's next kick origin. */
  kickSpot?: number;
  foulIndex?: number;
  yards?: number;
}
export interface KickRuling {
  possession: KickTeam;
  /** Own-goal coordinates of possession; never silently changes coordinate frame. */
  yardline: number;
  touchback: boolean;
  touchdown?: KickTeam;
  fieldGoal?: KickTeam;
  /** The team awarded the safety. */
  safety?: KickTeam;
  deadOnRecovery: boolean;
  advancePermitted: boolean;
  newSeries: boolean;
  fairCatch: boolean;
  fairCatchKickAvailable: boolean;
  fouls: KickFoul[];
  options: KickOption[];
  reason: string;
  /** A required factual distinction that the caller has not represented. */
  unresolved: string[];
  retryKickFrom?: number;
  automaticFirstDown?: boolean;
  foulDispositions?: { index: number; accepted: boolean; offset: boolean; yards: number }[];
  /** Opponent personal/unsportsmanlike foul during a score:14-2-3. */
  carryover?: { index: number; against: KickTeam; yards: number; on: 'try' | 'free_kick' }[];
}
export interface KickTerminal {
  /** out_of_bounds/rest/posts describe the still-loose kick; use possession
   * for the ending of a possessed return (including a runner out of bounds). */
  kind: 'possession' | 'out_of_bounds' | 'posts' | 'rest';
  yardline: number;
  possession?: KickTeam | 'simultaneous';
  /** Where the kick was caught/recovered, before any legal return. */
  recoveryYardline?: number;
  /** A receiving player possessed the kick before a later return fumble. */
  receiverPossessed?: boolean;
  /** Receiver brought the ball back into his end zone after entering the field. */
  returnedIntoOwnEndzone?: boolean;
  /** True only for a catch completed before the ball touches the ground. */
  caughtInAir?: boolean;
}
export interface FairCatchFacts {
  kick: 'free' | 'scrimmage';
  crossedLine?: boolean;
  signal: 'none' | 'valid' | 'invalid';
  signalYardline: number;
  signalBehindLine?: boolean;
  catcherIsSignaler?: boolean;
  caughtInAir?: boolean;
  kickingTeamTouched?: boolean;
  electsNotToAdvance?: boolean;
  catchYardline?: number;
  interference?: {
    yardline: number;
    airborneOpportunity: boolean;
    clearlyUncatchable?: boolean;
    blockedIntoReceiver?: boolean;
    resultOfFoul?: boolean;
    /** Valid-signal muff remains airborne, with a reasonable catch opportunity. */
    afterMuffBeforeGround?: boolean;
    unnecessaryRoughness?: boolean;
  };
  signalerBlockedBeforeAnotherPlayerTouched?: { yardline: number };
  unnecessaryContactAfterFairCatch?: boolean;
  /** Onside invalid signals/blocks are previous-spot enforcement. */
  onside?: boolean;
  kickSpot?: number;
  endzoneTouchbackSpot?: 20 | 35;
}
export interface FairCatchAssessment {
  deadAtCatch: boolean;
  fairCatch: boolean;
  fairCatchAwarded: boolean;
  awardYardline?: number;
  advancePermitted: boolean;
  fouls: KickFoul[];
}

/** 10-1,10-2: a signal is not itself a catch, nor perpetual immunity. */
export function assessFairCatch(f: FairCatchFacts): FairCatchAssessment {
  const signal = f.signalBehindLine || (f.kick === 'scrimmage' && f.crossedLine === false)
    ? 'none' : f.signal;
  const fouls: KickFoul[] = [];
  const previousSpot = 100 - (f.kickSpot ?? 35);
  const previous = (spot: number) => !!f.onside || (f.kick === 'free' && spot <= 0);
  if (signal === 'invalid') fouls.push({ kind: 'invalid_fair_catch_signal', against: 'receiving',
    rule: '10-2-2 Item 2', yards: 5, spot: previous(f.signalYardline) ? previousSpot : f.signalYardline,
    enforcement: previous(f.signalYardline) ? 'previous' : 'spot' });
  if (signal !== 'none' && f.signalerBlockedBeforeAnotherPlayerTouched) {
    const spot = f.signalerBlockedBeforeAnotherPlayerTouched.yardline;
    fouls.push({ kind: 'illegal_block_after_signal', against: 'receiving', rule: '10-2-2 Item 5',
      yards: 15, spot: previous(spot) ? previousSpot : spot, enforcement: previous(spot) ? 'previous' : 'spot' });
  }
  const i = f.interference;
  const interference = !!i && i.airborneOpportunity && !i.clearlyUncatchable
    && !i.blockedIntoReceiver && !i.resultOfFoul
    && (f.kick === 'free' || f.crossedLine === true);
  // A fair-catch muff is awarded at the interference spot; the 15 is added only
  // for unnecessary roughness (10-2-2 Item 3), unlike ordinary interference.
  const muffAward = interference && signal === 'valid' && !!i.afterMuffBeforeGround;
  const fairCatchAwarded = interference && signal === 'valid';
  if (interference && (!muffAward || i.unnecessaryRoughness)) fouls.push({
    kind: signal === 'valid' ? 'fair_catch_interference' : 'kick_catch_interference', against: 'kicking',
    rule: muffAward ? '10-2-2 Item 3' : '10-1-1', yards: 15, spot: i.yardline, enforcement: 'spot',
    personal: !!i.unnecessaryRoughness,
  });
  const caughtBySignaler = signal === 'valid' && f.catcherIsSignaler === true && f.caughtInAir === true;
  const fairCatch = fairCatchAwarded || (caughtBySignaler && (!f.kickingTeamTouched || !!f.electsNotToAdvance));
  const deadAtCatch = fairCatch || (signal !== 'none' && !f.kickingTeamTouched);
  if (fairCatch && f.unnecessaryContactAfterFairCatch) fouls.push({ kind: 'unnecessary_roughness',
    against: 'kicking', rule: '10-2-3(c)', yards: 15,
    spot: f.catchYardline ?? f.signalYardline, enforcement: 'dead_ball' });
  return { deadAtCatch, fairCatch, fairCatchAwarded, awardYardline: fairCatchAwarded ? i?.yardline : undefined,
    advancePermitted: !deadAtCatch, fouls };
}

function base(possession: KickTeam, receivingSpot: number, reason: string): KickRuling {
  return { possession, yardline: possession === 'receiving' ? receivingSpot : 100 - receivingSpot,
    touchback: false, deadOnRecovery: false, advancePermitted: true, newSeries: true,
    fairCatch: false, fairCatchKickAvailable: false, fouls: [], options: [], reason, unresolved: [] };
}
function touchback(spot: number, reason: string): KickRuling {
  return { ...base('receiving', spot, reason), touchback: true, deadOnRecovery: true, advancePermitted: false };
}
function attachFairCatch(r: KickRuling, f: FairCatchFacts | undefined): KickRuling {
  if (!f) return r;
  const fc = assessFairCatch(f);
  r.fouls.push(...fc.fouls);
  r.fairCatch = fc.fairCatch;
  r.fairCatchKickAvailable = fc.fairCatch;
  if (fc.fairCatchAwarded) {
    r.possession = 'receiving'; r.yardline = (fc.awardYardline ?? 1) <= 0 ? 20 : fc.awardYardline!;
    r.touchback = (fc.awardYardline ?? 1) <= 0;
    delete r.touchdown; delete r.safety;
  }
  if (fc.deadAtCatch && r.possession === 'receiving') {
    r.deadOnRecovery = true; r.advancePermitted = false;
    delete r.touchdown; delete r.safety;
    if (!fc.fairCatchAwarded && f.catchYardline !== undefined) {
      r.yardline = f.catchYardline <= 0 ? f.endzoneTouchbackSpot ?? 20 : f.catchYardline;
      r.touchback = f.catchYardline <= 0;
    }
  }
  return r;
}
export interface FreeKickFacts {
  kind: 'kickoff' | 'safety' | 'onside';
  /** Kicking team's own yardline; defaults35, or20 for a safety kick. */
  kickSpot?: number;
  /** Required for an onside kick; any quarter/score is legal in 2026. */
  declaredOnside?: boolean;
  declarationBeforePlayClock?: boolean;
  safetyOnside?: boolean;
  firstContact?: { by: 'ground' | KickTeam; yardline: number };
  landingZoneTouched?: boolean;
  receiverTouched?: boolean;
  reachedReceivingRestrainingLine?: boolean;
  onsideUntouchedBeyondSetup?: boolean;
  lastTouch?: KickTeam;
  kickingToucherWentOutOfBounds?: boolean;
  kickingToucherReestablished?: boolean;
  terminal: KickTerminal;
  fairCatch?: FairCatchFacts;
  /** Formation facts come from an actual supplied setup, not a random flag. */
  formation?: { legal?: boolean; against?: KickTeam; offside?: boolean };
  /** Additional established kick-phase fouls, never probability-generated. */
  fouls?: readonly KickFoul[];
}

type KickEnforcementContext = {
  free: boolean;
  origin: number;
  terminal: KickTerminal;
  /** Before a special award/first-touch election changed the dead-ball spot. */
  actual: KickRuling;
  onsideIllegalTouch?: boolean;
};
function copyRuling(r: KickRuling): KickRuling {
  return { ...r, fouls: [...r.fouls], options: [...r.options], unresolved: [...r.unresolved] };
}
function resetScore(r: KickRuling): void { delete r.touchdown; delete r.fieldGoal; delete r.safety; r.touchback = false; }
function receivingSpot(r: KickRuling): number { return r.possession === 'receiving' ? r.yardline : 100 - r.yardline; }
function distancePenalty(spot: number, foul: KickFoul): { spot: number; yards: number } {
  const clamped = Math.max(0, Math.min(100, spot));
  const yards = Math.min(foul.yards, (foul.against === 'kicking' ? 100 - clamped : clamped) / 2);
  return { spot: clamped + (foul.against === 'kicking' ? yards : -yards), yards };
}

/** 6-3,9-5,14: retain source-backed alternatives and make a deterministic,
 * explicit captain choice. Default prefers a retained possession to a re-kick;
 * a scoring/possession benefit is retained by declining the opponent's foul.
 * This policy is not a new football law or an optimized coaching strategy. */
function adjudicateKickFouls(result: KickRuling, c: KickEnforcementContext): KickRuling {
  const r = result;
  const dispositions = r.fouls.map((_, index) => ({ index, accepted: false, offset: false, yards: 0 }));
  r.foulDispositions = dispositions;
  if (!r.fouls.length) return r;
  let indices = r.fouls.map((_, n) => n);
  const teamIndices = (team: KickTeam) => indices.filter(n => r.fouls[n].against === team);
  const both = teamIndices('kicking').length > 0 && teamIndices('receiving').length > 0;
  const receivingKeeps = c.actual.possession === 'receiving' && c.terminal.possession !== 'kicking';
  const personal = (f: KickFoul) => f.kind === 'unnecessary_roughness' || f.kind === 'unsportsmanlike_conduct'
    || f.kind === 'illegal_block_after_signal' || !!f.personal;
  const actualChange = !!c.terminal.receiverPossessed || (c.terminal.kind === 'possession'
    && (c.terminal.possession === 'receiving' || c.terminal.possession === 'simultaneous'));
  let forcedPrevious = false;
  if (both) {
    if (indices.every(n => r.fouls[n].enforcement === 'dead_ball')) {
      for (const d of dispositions) { d.accepted = true; d.offset = true; }
      r.reason = 'opposing dead-ball kick fouls offset at succeeding spot';
      return r;
    }
    const majorK = teamIndices('kicking').some(n => r.fouls[n].yards === 15);
    const majorR = teamIndices('receiving').some(n => r.fouls[n].yards === 15);
    const minor = (team: KickTeam) => teamIndices(team).every(n => r.fouls[n].yards === 5
      && r.fouls[n].enforcement === 'previous');
    if (!actualChange && majorK && minor('receiving')) { indices = teamIndices('kicking'); forcedPrevious = true; }
    else if (!actualChange && majorR && minor('kicking')) { indices = teamIndices('receiving'); forcedPrevious = true; }
    else if (!c.free && receivingKeeps && teamIndices('receiving').every(n => !r.fouls[n].attemptToBlockKick)) {
      //9-5-1(4),14-5-2: eligible receiving fouls during a crossed scrimmage
      //kick are post-possession. R can keep with its penalty, declining K's.
      if (teamIndices('kicking').some(n => personal(r.fouls[n]))) {
        const receiving = teamIndices('receiving');
        const end = c.terminal.recoveryYardline ?? c.terminal.yardline;
        const spots = receiving.map(n => {
          const f = r.fouls[n];
          return f.enforcement === 'dead_ball' ? receivingSpot(c.actual)
            : f.kind === 'invalid_fair_catch_signal' || f.kind === 'illegal_block_after_signal'
              ? f.spot : Math.min(end <= 0 ? 20 : end, f.spot <= 0 ? 20 : f.spot);
        });
        for (const d of dispositions) { d.accepted = true; d.offset = true; }
        resetScore(r); r.possession = 'receiving'; r.yardline = Math.max(1, Math.min(...spots));
        r.reason = 'personal-foul double offset; receivers retain at own enforcement spot';
        r.options.push({ kind: 'replay', possession: 'kicking', yardline: c.origin, kickSpot: c.origin });
        return r;
      }
      indices = teamIndices('receiving');
      r.options.push({ kind: 'replay', possession: 'kicking', yardline: c.origin, kickSpot: c.origin });
    } else {
      for (const d of dispositions) { d.accepted = true; d.offset = true; }
      const replay = base('kicking', 100 - c.origin, 'offsetting kick fouls; replay');
      resetScore(r); delete r.carryover; delete r.retryKickFrom;
      Object.assign(r, replay, { fouls: result.fouls, options: result.options,
        foulDispositions: dispositions, retryKickFrom: c.origin });
      r.options.push({ kind: 'replay', possession: 'kicking', yardline: c.origin, kickSpot: c.origin });
      return r;
    }
  }
  const against = r.fouls[indices[0]].against;
  const offended: KickTeam = against === 'kicking' ? 'receiving' : 'kicking';
  const scoreForOffended = r.touchdown === offended || r.fieldGoal === offended || r.safety === offended;
  const candidates: { ruling: KickRuling; index: number; yards: number; retry: boolean }[] = [];
  for (const n of indices) {
    const foul = r.fouls[n];
    if (forcedPrevious) {
      const moved = distancePenalty(100 - c.origin, foul);
      const retryOrigin = 100 - moved.spot;
      const replay = base('kicking', 100 - retryOrigin, '15 versus5 kick foul; replay from previous spot');
      replay.retryKickFrom = retryOrigin;
      candidates.push({ ruling: replay, index: n, yards: moved.yards, retry: true });
      r.options.push({ kind: 'replay', possession: 'kicking', yardline: retryOrigin,
        kickSpot: retryOrigin, foulIndex: n, yards: moved.yards });
      continue;
    }
    if (scoreForOffended) {
      //14-2-3: score plus opponent personal foul on Try/succeeding free kick.
      if (personal(foul)) {
        const scoring = copyRuling(r);
        scoring.carryover = [{ index: n, against, yards: foul.yards, on: r.touchdown ? 'try' : 'free_kick' }];
        candidates.push({ ruling: scoring, index: n, yards: foul.yards, retry: false });
      }
      continue;
    }
    if (foul.enforcement === 'special' || foul.rule === '6-1-6(k)') {
      candidates.push({ ruling: copyRuling(r), index: n, yards: foul.yards, retry: false });
      continue;
    }
    if (foul.kind === 'illegal_touching' && c.onsideIllegalTouch && foul.against === 'kicking') {
      const spot = foul.spot;
      const award = base('receiving', spot, 'receivers elect illegal-onside-touch award');
      award.deadOnRecovery = true; award.advancePermitted = false;
      candidates.push({ ruling: award, index: n, yards: 0, retry: false });
    }
    const raw = copyRuling(c.actual);
    raw.fairCatch = r.fairCatch; raw.fairCatchKickAvailable = r.fairCatchKickAvailable;
    const actualReceivingSpot = receivingSpot(raw);
    const applyAt = (spot: number, kind: 'enforce_spot' | 'enforce_dead_ball') => {
      const next = copyRuling(raw);
      //A kick-phase penalty against the returners cancels their return score;
      //a post-score personal foul is represented separately as carryover.
      resetScore(next);
      const goalAdjusted = spot <= 0 ? (r.touchback ? r.yardline : (foul.against === 'receiving' ? 20 : 0)) : spot;
      const d = distancePenalty(goalAdjusted, foul);
      const catchInterference = foul.kind === 'fair_catch_interference' || foul.kind === 'kick_catch_interference';
      next.possession = catchInterference ? 'receiving' : raw.possession;
      next.yardline = next.possession === 'receiving' ? d.spot : 100 - d.spot;
      next.deadOnRecovery = true; next.advancePermitted = false; next.newSeries = true;
      next.reason = `accepted ${foul.kind}`;
      candidates.push({ ruling: next, index: n, yards: d.yards, retry: false });
      r.options.push({ kind, possession: next.possession, yardline: next.yardline, foulIndex: n, yards: d.yards });
    };
    const endOfKick = c.terminal.recoveryYardline ?? c.terminal.yardline;
    const specialSpot = foul.kind === 'invalid_fair_catch_signal' || foul.kind === 'illegal_block_after_signal'
      || foul.kind === 'fair_catch_interference' || foul.kind === 'kick_catch_interference';
    const postScrimmage = !c.free && foul.against === 'receiving' && receivingKeeps
      && endOfKick < 100 - c.origin && !foul.attemptToBlockKick && !specialSpot
      && foul.enforcement !== 'dead_ball';
    if (postScrimmage) {
      //9-5-1(4),14-4-8: the return cannot erase a kick-phase foul. The
      //least beneficial of end-of-kick/foul spots is the PSK basic spot.
      applyAt(Math.min(endOfKick <= 0 ? 20 : endOfKick, foul.spot <= 0 ? 20 : foul.spot), 'enforce_spot');
      continue;
    }
    if (foul.enforcement === 'spot' || foul.enforcement === 'dead_ball') {
      applyAt(foul.enforcement === 'spot' ? foul.spot : actualReceivingSpot,
        foul.enforcement === 'spot' ? 'enforce_spot' : 'enforce_dead_ball');
      if (!both && (personal(foul) || foul.kind === 'kick_catch_interference' || foul.kind === 'fair_catch_interference')
        && c.actual.possession === offended && foul.enforcement !== 'dead_ball')
        applyAt(actualReceivingSpot, 'enforce_dead_ball');
    } else {
      const moved = distancePenalty(100 - c.origin, foul);
      const retryOrigin = 100 - moved.spot;
      const replay = base('kicking', 100 - retryOrigin, `accepted ${foul.kind}; replay kick`);
      replay.retryKickFrom = retryOrigin;
      replay.fairCatch = false; replay.fairCatchKickAvailable = false;
      candidates.push({ ruling: replay, index: n, yards: moved.yards, retry: true });
      r.options.push({ kind: 'replay', possession: 'kicking', yardline: retryOrigin,
        kickSpot: retryOrigin, foulIndex: n, yards: moved.yards });
      //6-3(a,d): signal/block fouls designated previous-spot in the end zone
      //or onside kick do not acquire an ordinary dead-spot election.
      if (receivingKeeps && (c.free ? !specialSpot : foul.against === 'kicking'))
        applyAt(actualReceivingSpot, 'enforce_dead_ball');
      else if (!both && personal(foul) && c.actual.possession === offended)
        applyAt(actualReceivingSpot, 'enforce_dead_ball');
      if (foul.kind === 'illegal_touching' && !c.free && foul.spot < 5) {
        const award = touchback(20, 'receivers elect illegal-touch touchback');
        candidates.push({ ruling: award, index: n, yards: 0, retry: false });
        r.options.push({ kind: 'dead_spot', possession: 'receiving', yardline: 20, foulIndex: n });
      }
    }
  }
  r.options.push({ kind: 'decline', possession: r.possession, yardline: r.yardline });
  //A current opponent score cannot survive acceptance. Possession by the
  //offended team is retained by decline unless the same possession gains yards.
  const retained = candidates.filter(x => !x.retry);
  let chosen: typeof candidates[number] | undefined;
  if (forcedPrevious) chosen = candidates.filter(x => x.retry).sort((a, b) => b.yards - a.yards)[0];
  else if (scoreForOffended) chosen = retained.find(x => !!x.ruling.carryover);
  else if (c.actual.possession === offended && !r.safety) {
    chosen = retained.filter(x => x.ruling.possession === offended
      && x.ruling.yardline >= r.yardline)
      .sort((a, b) => b.ruling.yardline - a.ruling.yardline)[0];
  } else if (retained.length) {
    chosen = retained.sort((a, b) => {
      const value = (x: typeof a) => x.ruling.possession === offended
        ? 1000 + x.ruling.yardline : -x.ruling.yardline;
      return value(b) - value(a);
    })[0];
  } else chosen = candidates.filter(x => x.retry).sort((a, b) => b.yards - a.yards)[0];
  if (chosen) {
    const allFouls = r.fouls, options = r.options;
    const unresolved = r.unresolved.filter(x => !x.includes('enforcement selection') && !x.includes('previous-spot enforcement'));
    dispositions[chosen.index].accepted = true; dispositions[chosen.index].yards = chosen.yards;
    resetScore(r); delete r.carryover; delete r.retryKickFrom;
    Object.assign(r, chosen.ruling, { fouls: allFouls, options, unresolved, foulDispositions: dispositions });
    const selectedFoul = allFouls[chosen.index];
    if (!c.free && r.retryKickFrom !== undefined && selectedFoul.against === 'receiving'
      && (selectedFoul.autoFirst || personal(selectedFoul))) r.automaticFirstDown = true;
  }
  return r;
}

/** Rule6: receiving coordinates allow the origin penalty to move independently
 * of the fixed dynamic-kickoff landing/setup zones. */
export function assessFreeKick(f: FreeKickFacts): KickRuling {
  const safety = f.kind === 'safety' || !!f.safetyOnside;
  const origin = f.kickSpot ?? (safety ? 20 : 35);
  const t = f.terminal;
  const onside = f.kind === 'onside';
  const kickoffFrom50 = f.kind === 'kickoff' && origin === 50;
  const landingZoneTouched = !!f.landingZoneTouched || (f.firstContact !== undefined
    && f.firstContact.by !== 'kicking' && f.firstContact.yardline > 0 && f.firstContact.yardline <= 20);
  const short = !onside && f.firstContact !== undefined && f.firstContact.yardline > 20;
  const out = t.kind === 'out_of_bounds' && t.yardline > 0 && t.yardline < 100
    && f.lastTouch !== 'receiving';
  const freeAward = (spot: number, kind: 'free_kick_out_of_bounds' | 'free_kick_short') => {
    const prescribed = 100 - origin - (safety ? 30 : 25);
    const r = base('receiving', Math.max(spot, prescribed), kind === 'free_kick_short'
      ? 'free kick first touched short of landing zone' : 'free kick out of bounds');
    r.deadOnRecovery = true; r.advancePermitted = false;
    r.options.push({ kind: 'free_kick_award', possession: 'receiving', yardline: prescribed },
      { kind: 'dead_spot', possession: 'receiving', yardline: spot });
    r.fouls.push({ kind, against: 'kicking', rule: '6-2-4', yards: 0, spot, enforcement: 'special' });
    return r;
  };
  let r: KickRuling;
  if (short) r = freeAward(f.firstContact!.yardline, 'free_kick_short');
  else if (out || (f.kickingToucherWentOutOfBounds && f.kickingToucherReestablished === false))
    r = freeAward(t.yardline, 'free_kick_out_of_bounds');
  else if (onside && f.onsideUntouchedBeyondSetup) {
    r = base('receiving', 100 - origin - 15, 'untouched onside beyond setup zone');
    r.deadOnRecovery = true; r.advancePermitted = false;
    r.fouls.push({ kind: 'unsportsmanlike_conduct', against: 'kicking', rule: '6-1-6(k)',
      yards: 15, spot: 100 - origin, enforcement: 'previous' });
  } else if (t.kind === 'posts' || (t.yardline <= 0 && t.kind === 'out_of_bounds' && !t.returnedIntoOwnEndzone)
    || (t.kind === 'possession' && t.possession !== 'kicking' && t.yardline <= 0 && !t.returnedIntoOwnEndzone)) {
    r = touchback(kickoffFrom50 || landingZoneTouched ? 20 : 35, 'free kick touchback');
  } else if (t.kind === 'rest') {
    r = base('receiving', t.yardline <= 0 ? 1 : t.yardline, 'kick at rest with no recovery attempt');
    r.deadOnRecovery = true; r.advancePermitted = false;
  } else {
    const possessor = t.possession === 'kicking' ? 'kicking' : 'receiving';
    const recoverySpot = t.recoveryYardline ?? t.yardline;
    r = base(possessor, t.yardline, 'free kick possession');
    if (possessor === 'kicking' && !t.receiverPossessed) {
      const receiverTouched = !!f.receiverTouched || f.firstContact?.by === 'receiving';
      const legal = onside ? receiverTouched || !!f.reachedReceivingRestrainingLine
        || recoverySpot <= 100 - origin - 10
        : landingZoneTouched || receiverTouched || (f.firstContact?.by === 'ground' && f.firstContact.yardline <= 20);
      const eligible = legal && !(f.kickingToucherWentOutOfBounds && !receiverTouched);
      r.deadOnRecovery = true; r.advancePermitted = false;
      r.yardline = 100 - recoverySpot;
      if (!eligible) {
        r.possession = 'receiving'; r.yardline = recoverySpot;
        r.reason = 'illegal kicking-team recovery';
        r.fouls.push({ kind: 'illegal_touching', against: 'kicking', rule: onside ? '6-2-5 Item 1' : '6-1-4(c),6-2-5 Item 2',
          yards: 5, spot: recoverySpot, enforcement: 'previous' });
        const retryOrigin = origin - Math.min(5, origin / 2);
        r.options.push({ kind: 'replay', possession: 'kicking', yardline: retryOrigin, kickSpot: retryOrigin });
        if (onside) r.options.push({ kind: 'illegal_touch_award', possession: 'receiving', yardline: recoverySpot });
        else r.unresolved.push('illegal non-onside recovery requires enforcement selection');
      } else if (recoverySpot <= 0) r.touchdown = 'kicking';
    } else if (possessor === 'receiving') {
      if (t.yardline >= 100) r.touchdown = 'receiving';
      else if (t.yardline <= 0 && t.returnedIntoOwnEndzone) r.safety = 'kicking';
    } else if (t.yardline <= 0) r.touchdown = 'kicking';
  }
  if (onside && (f.declaredOnside !== true || f.declarationBeforePlayClock === false)) {
    r.fouls.push({ kind: 'illegal_free_kick', against: 'kicking', rule: '6-1-1(c),6-1-6',
      yards: 5, spot: 100 - origin, enforcement: 'previous' });
    r.unresolved.push('undeclared onside requires previous-spot enforcement');
  }
  if (f.formation?.legal === false || f.formation?.offside) r.fouls.push({
    kind: f.formation.offside ? 'offside' : 'illegal_formation', against: f.formation.against ?? 'kicking',
    rule: onside ? '6-1-6' : '6-1-3', yards: 5, spot: 100 - origin, enforcement: 'previous' });
  if (t.kind === 'out_of_bounds') { r.deadOnRecovery = true; r.advancePermitted = false; }
  r.fouls.push(...(f.fouls ?? []));
  const actual = copyRuling(r);
  if (short || out) actual.yardline = short ? f.firstContact!.yardline : t.yardline;
  if (onside && f.onsideUntouchedBeyondSetup) actual.yardline = t.yardline;
  if (r.reason === 'illegal kicking-team recovery') {
    actual.possession = 'kicking'; actual.yardline = 100 - (t.recoveryYardline ?? t.yardline);
  }
  const fc = f.fairCatch ? { ...f.fairCatch,
    catchYardline: f.fairCatch.catchYardline ?? t.recoveryYardline ?? t.yardline,
    endzoneTouchbackSpot: (kickoffFrom50 || landingZoneTouched ? 20 : 35) as 20 | 35,
  } : undefined;
  attachFairCatch(r, fc);
  attachFairCatch(actual, fc);
  return adjudicateKickFouls(r, { free: true, origin, terminal: t, actual,
    onsideIllegalTouch: onside && r.fouls.some(x => x.kind === 'illegal_touching') });
}

export interface ScrimmageKickFacts {
  /** Kicking team's own yardline at snap. */
  scrimmageSpot: number;
  terminal: KickTerminal;
  /** Explicit deflection/block fact; it does not itself determine recovery. */
  kickBlocked?: boolean;
  /** Actual successful kick through the goal; foul enforcement may negate it. */
  fieldGoalGood?: boolean;
  receiverTouchedBeyondLine?: boolean;
  receiverTouched?: boolean;
  /** Touches forced by a block, bat, illegal kick, or near-line block attempt do
   * not count as a receiver touch (9-2-2); caller excludes those explicitly. */
  firstKickingTouches?: readonly { yardline: number; jumpedFromYardline?: number }[];
  groundTouchedInReceivingEndzone?: boolean;
  kickingTouchWhileOnReceivingGoal?: boolean;
  kickingToucherWentOutOfBounds?: boolean;
  kickingToucherReestablished?: boolean;
  touchedByKickingPlayerWhoNeverWentOut?: boolean;
  kickHitsOwnPosts?: boolean;
  fairCatch?: FairCatchFacts;
  /** A missed FG's actual placekick spot in K-own coordinates. */
  missedFieldGoalSpot?: number;
  /** Fair-catch kickers cannot possess an untouched kick, even behind the line. */
  fairCatchKick?: boolean;
  fouls?: readonly KickFoul[];
}

/** Rule9,11-4-2/3. First touching is an option/violation, not a five-yard flag. */
export function assessScrimmageKick(f: ScrimmageKickFacts): KickRuling {
  const t = f.terminal, line = 100 - f.scrimmageSpot;
  const recovered = t.recoveryYardline ?? t.yardline;
  const receiverTouched = !!f.receiverTouchedBeyondLine || (recovered < line
    && t.kind === 'possession' && (t.possession === 'receiving' || t.possession === 'simultaneous' || !!t.receiverPossessed));
  const missedAward = f.missedFieldGoalSpot !== undefined && !receiverTouched && recovered < line;
  let r: KickRuling;
  if (f.fieldGoalGood) {
    r = base('kicking', line, 'successful field goal'); r.fieldGoal = 'kicking';
    r.deadOnRecovery = true; r.advancePermitted = false;
  } else if (f.kickHitsOwnPosts) {
    r = base('receiving', 100, 'kick touches kicking-team goal structure'); r.safety = 'receiving';
  } else if (missedAward) {
    r = base('receiving', Math.max(20, 100 - f.missedFieldGoalSpot!), 'untouched missed field goal');
    r.deadOnRecovery = true; r.advancePermitted = false;
  } else if ((!receiverTouched && (f.groundTouchedInReceivingEndzone || f.kickingTouchWhileOnReceivingGoal))
    || t.kind === 'posts' || (t.kind === 'out_of_bounds' && t.yardline <= 0 && !t.returnedIntoOwnEndzone)
    || (t.kind === 'possession' && t.possession !== 'kicking' && t.yardline <= 0 && !t.returnedIntoOwnEndzone)) {
    r = touchback(20, 'scrimmage kick touchback');
  } else if (t.kind === 'out_of_bounds' && t.yardline <= 0 && t.returnedIntoOwnEndzone) {
    r = base('receiving', t.yardline, 'receiver carried ball back out of bounds in own end zone');
    r.safety = 'kicking'; r.deadOnRecovery = true; r.advancePermitted = false;
  } else if (t.kind === 'rest' || t.kind === 'out_of_bounds') {
    r = base('receiving', t.yardline <= 0 ? 1 : t.yardline, 'scrimmage kick dead without possession');
    r.deadOnRecovery = true; r.advancePermitted = false;
  } else if (t.possession === 'kicking' && !t.receiverPossessed) {
    const beyond = recovered < line;
    const kCanOwn = (receiverTouched || !beyond) && (!f.fairCatchKick || receiverTouched || !!f.receiverTouched);
    r = base(kCanOwn ? 'kicking' : 'receiving', recovered,
      beyond ? 'kicking recovery beyond line' : 'kicking recovery behind line');
    r.deadOnRecovery = beyond || !!f.fairCatchKick;
    r.advancePermitted = !r.deadOnRecovery;
    r.newSeries = receiverTouched;
    if (kCanOwn && !r.deadOnRecovery) {
      r.yardline = 100 - t.yardline;
      if (t.yardline <= 0) r.touchdown = 'kicking';
    } else if (kCanOwn && recovered <= 0) r.touchdown = 'kicking';
    if (!kCanOwn) { r.newSeries = true; r.deadOnRecovery = true; r.advancePermitted = false; }
  } else {
    const possessor = t.possession === 'kicking' ? 'kicking' : 'receiving';
    r = base(possessor, t.yardline, 'receiving possession and return');
    if (possessor === 'receiving' && t.yardline >= 100) r.touchdown = 'receiving';
    if (possessor === 'receiving' && t.yardline <= 0 && t.returnedIntoOwnEndzone) r.safety = 'kicking';
    if (possessor === 'kicking' && t.yardline <= 0) r.touchdown = 'kicking';
  }
  const actual = copyRuling(r);
  // These are ordered qualifying FIRST touches before receivers touched beyond
  // the line, not arbitrary K touches after a muff. Their option survives a
  // later receiver touch/return/fumble unless an accepted live-ball penalty
  // discards it (9-2-2), which the enforcement caller must decide.
  if (!missedAward) for (const touch of f.firstKickingTouches ?? []) {
    if (touch.yardline >= line) continue;
    const spot = touch.yardline <= 0 && touch.jumpedFromYardline !== undefined
      ? Math.max(1, touch.jumpedFromYardline) : touch.yardline;
    if (spot > 0) r.options.push({ kind: 'first_touch', possession: 'receiving', yardline: spot });
  }
  if (r.options.length && r.touchdown !== 'receiving') {
    const best = Math.max(...r.options.map(o => o.yardline));
    if (r.possession === 'kicking' || r.safety === 'kicking' || best > r.yardline) {
      r.possession = 'receiving'; r.yardline = best; r.newSeries = true;
      r.touchback = false; delete r.touchdown; delete r.safety;
      r.deadOnRecovery = true; r.advancePermitted = false;
      r.reason = 'receiving team elects first-touch spot';
    }
  }
  if (f.kickingToucherWentOutOfBounds && recovered < line && !receiverTouched
    && !f.touchedByKickingPlayerWhoNeverWentOut) {
    if (f.kickingToucherReestablished === false) {
      r = base('receiving', recovered, 'out-of-bounds kicker touches kick');
      r.deadOnRecovery = true; r.advancePermitted = false;
    } else if (f.kickingToucherReestablished === true) {
      r.fouls.push({ kind: 'illegal_touching', against: 'kicking', rule: '9-2-3', yards: 5,
        spot: recovered, enforcement: 'previous' });
      if (recovered < 5) r.options.push({ kind: 'dead_spot', possession: 'receiving', yardline: 20 });
    } else r.unresolved.push('kicking toucher reestablishment inbounds unknown');
  }
  r.fouls.push(...(f.fouls ?? []));
  const fc = f.fairCatch ? { ...f.fairCatch,
    catchYardline: f.fairCatch.catchYardline ?? t.recoveryYardline ?? t.yardline,
    signalBehindLine: !!f.fairCatch.signalBehindLine || f.fairCatch.signalYardline > line,
  } : undefined;
  attachFairCatch(r, fc); attachFairCatch(actual, fc);
  return adjudicateKickFouls(r, { free: false, origin: f.scrimmageSpot, terminal: t, actual });
}

/** 10-2-4/5,11-4-3: an invalid signal or another receiver's catch grants no kick. */
export function fairCatchKickEligibility(f: {
  fairCatchMadeOrAwarded: boolean;
  fairCatchInterference?: boolean;
  interveningScrimmageDown?: boolean;
  periodExpired?: boolean;
}): { allowed: boolean; maySnap: boolean; mayExtendPeriod: boolean } {
  const allowed = f.fairCatchMadeOrAwarded && !f.interveningScrimmageDown;
  return { allowed, maySnap: allowed && (!f.periodExpired || !!f.fairCatchInterference),
    mayExtendPeriod: allowed && !!f.periodExpired };
}

/** Rule6-2's distinct temporal blocking gates. Other Rule12 restrictions still
 * apply once a block is permitted; permission here never legalizes holding. */
export function freeKickBlockPermitted(f: {
  kind: FreeKickFacts['kind']; team: KickTeam; kickSpot: number; blockYardline: number;
  landedOrTouchedInLandingZone?: boolean; legallyTouched?: boolean; ballGrounded?: boolean;
  receiverActivelyObstructingRecovery?: boolean;
}): boolean {
  if (f.kind !== 'onside') return !!f.landedOrTouchedInLandingZone;
  const beyondOrigin = 100 - f.blockYardline - f.kickSpot;
  if (beyondOrigin > 15) return true;
  if (f.team === 'receiving') return !!f.legallyTouched || !!f.ballGrounded;
  if (f.receiverActivelyObstructingRecovery) return true;
  return !!f.legallyTouched || (beyondOrigin >= 10 && !!f.ballGrounded);
}

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam } from '../src/league/team.js';
import { kickoff, punt, kickFairCatch } from '../src/game/specialteams.js';
import { assessFreeKick, assessScrimmageKick, assessFairCatch, fairCatchKickEligibility,
  freeKickBlockPermitted, type FreeKickFacts, type ScrimmageKickFacts } from '../src/game/kick-rules.js';

const free = (extra: Partial<FreeKickFacts> = {}): FreeKickFacts => ({ kind: 'kickoff',
  terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: 5, yardline: 28 }, ...extra });
const scrimmage = (extra: Partial<ScrimmageKickFacts> = {}): ScrimmageKickFacts => ({ scrimmageSpot: 40,
  terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: 15, yardline: 25 }, ...extra });

describe('2026 dynamic free-kick awards', () => {
  it('keeps an ordinary legal return and its direction', () => {
    expect(assessFreeKick(free())).toMatchObject({ possession: 'receiving', yardline: 28,
      touchback: false, advancePermitted: true, fouls: [] });
  });
  it.each(['kickoff', 'safety'] as const)('direct end-zone %s touchback is35, not25', kind => {
    expect(assessFreeKick(free({ kind, terminal: { kind: 'possession', possession: 'receiving', yardline: -2 } })))
      .toMatchObject({ yardline: 35, touchback: true });
  });
  it('distinguishes a landing-zone bounce into the end zone (20)', () => {
    expect(assessFreeKick(free({ landingZoneTouched: true,
      terminal: { kind: 'out_of_bounds', yardline: -2 } }))).toMatchObject({ touchback: true, yardline: 20 });
    expect(assessFreeKick(free({ firstContact: { by: 'ground', yardline: 5 },
      terminal: { kind: 'out_of_bounds', yardline: -2 } }))).toMatchObject({ touchback: true, yardline: 20 });
  });
  it('uses20 for a touchback on a kickoff from50', () => {
    expect(assessFreeKick(free({ kickSpot: 50,
      terminal: { kind: 'posts', yardline: -10 } }))).toMatchObject({ touchback: true, yardline: 20 });
  });
  it('does not turn a returner retreating from the field into a touchback', () => {
    expect(assessFreeKick(free({ terminal: { kind: 'possession', possession: 'receiving',
      yardline: -1, recoveryYardline: 1, returnedIntoOwnEndzone: true } })))
      .toMatchObject({ touchback: false, safety: 'kicking' });
  });
  it.each([
    { kickSpot: 35, kind: 'kickoff', expected: 40 },
    { kickSpot: 20, kind: 'safety', expected: 50 },
    { kickSpot: 50, kind: 'kickoff', expected: 25 },
  ] as const)('moves short-kick award with $kind origin$kickSpot', ({ kickSpot, kind, expected }) => {
    const r = assessFreeKick(free({ kind, kickSpot, firstContact: { by: 'ground', yardline: 21 },
      terminal: { kind: 'rest', yardline: 21 } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: expected });
    expect(r.fouls).toEqual([expect.objectContaining({ kind: 'free_kick_short', yards: 0, enforcement: 'special' })]);
  });
  it('offers the short/OOB spot if that is more beneficial than prescribed award', () => {
    expect(assessFreeKick(free({ terminal: { kind: 'out_of_bounds', yardline: 46 } }))).toMatchObject({ yardline: 46 });
    expect(assessFreeKick(free({ lastTouch: 'receiving', terminal: { kind: 'out_of_bounds', yardline: 12 } })))
      .toMatchObject({ yardline: 12, fouls: [] });
  });
  it('awards simultaneous free-kick possession to receivers', () => {
    expect(assessFreeKick(free({ landingZoneTouched: true,
      terminal: { kind: 'possession', possession: 'simultaneous', yardline: 8 } })))
      .toMatchObject({ possession: 'receiving', yardline: 8 });
  });
  it('allows legal kicking recovery after landing but never advance of the kick', () => {
    expect(assessFreeKick(free({ landingZoneTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 8, yardline: 2 } })))
      .toMatchObject({ possession: 'kicking', yardline: 92, deadOnRecovery: true, advancePermitted: false });
  });
  it('scores legal kicking-team end-zone recovery, distinct from a receiver touchback', () => {
    expect(assessFreeKick(free({ landingZoneTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: -1 } })))
      .toMatchObject({ possession: 'kicking', touchdown: 'kicking', touchback: false });
  });
  it('does not apply kick-recovery advance ban to a later return fumble', () => {
    expect(assessFreeKick(free({ receiverTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', receiverPossessed: true,
        recoveryYardline: 30, yardline: 10 } }))).toMatchObject({ possession: 'kicking', yardline: 90, advancePermitted: true });
  });
  it('does not invent a touchback for an unattempted resting live ball in the end zone', () => {
    expect(assessFreeKick(free({ terminal: { kind: 'rest', yardline: -1 } })))
      .toMatchObject({ possession: 'receiving', yardline: 1, touchback: false });
  });
});

describe('declared onside kicks and blocking gates', () => {
  const onside = (extra: Partial<FreeKickFacts> = {}): FreeKickFacts => free({ kind: 'onside',
    declaredOnside: true, declarationBeforePlayClock: true, kickSpot: 35,
    reachedReceivingRestrainingLine: true,
    terminal: { kind: 'possession', possession: 'kicking', yardline: 55 }, ...extra });
  it('allows a declared onside in any quarter and awards actual origin+10', () => {
    expect(assessFreeKick(onside())).toMatchObject({ possession: 'kicking', yardline: 45, fouls: [], advancePermitted: false });
    expect(assessFreeKick(onside({ kickSpot: 20, safetyOnside: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 70 } })))
      .toMatchObject({ possession: 'kicking', yardline: 30 });
  });
  it('does not grant surprise-onside legality', () => {
    expect(assessFreeKick(onside({ declaredOnside: false })).fouls)
      .toContainEqual(expect.objectContaining({ kind: 'illegal_free_kick', rule: '6-1-1(c),6-1-6' }));
  });
  it('gives receiver spot option and5yd replay for early K touching', () => {
    const r = assessFreeKick(onside({ reachedReceivingRestrainingLine: false,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 58 } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 58 });
    expect(r.options).toContainEqual({ kind: 'replay', possession: 'kicking', yardline: 30, kickSpot: 30 });
    expect(r.options).toContainEqual({ kind: 'illegal_touch_award', possession: 'receiving', yardline: 58 });
  });
  it('permits K recovery before10 when receivers touched first', () => {
    expect(assessFreeKick(onside({ reachedReceivingRestrainingLine: false, receiverTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 58 } })))
      .toMatchObject({ possession: 'kicking', yardline: 42, fouls: [] });
  });
  it('enforces untouched overshoot from kick origin, not a randomly sampled midfield spot', () => {
    const r = assessFreeKick(onside({ onsideUntouchedBeyondSetup: true,
      terminal: { kind: 'rest', yardline: 39 } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 50 });
    expect(r.fouls).toContainEqual(expect.objectContaining({ rule: '6-1-6(k)', yards: 15, spot: 65 }));
  });
  it('restricts a K who went out even if forced out, but receiver touch restores rights', () => {
    const f = onside({ kickingToucherWentOutOfBounds: true, kickingToucherReestablished: true });
    expect(assessFreeKick(f).fouls).toContainEqual(expect.objectContaining({ kind: 'illegal_touching' }));
    expect(assessFreeKick({ ...f, receiverTouched: true }).fouls).toEqual([]);
  });
  it('keeps the ten/fifteen-yard onside blocking distinctions', () => {
    const b = { kind: 'onside' as const, team: 'kicking' as const, kickSpot: 35, blockYardline: 60, ballGrounded: true };
    expect(freeKickBlockPermitted(b)).toBe(false);
    expect(freeKickBlockPermitted({ ...b, blockYardline: 54 })).toBe(true);
    expect(freeKickBlockPermitted({ ...b, team: 'receiving' })).toBe(true);
    expect(freeKickBlockPermitted({ ...b, ballGrounded: false, blockYardline: 49 })).toBe(true);
  });
  it('does not allow early ordinary kickoff blocking just because it was kicked', () => {
    const b = { kind: 'kickoff' as const, team: 'receiving' as const, kickSpot: 35, blockYardline: 30 };
    expect(freeKickBlockPermitted(b)).toBe(false);
    expect(freeKickBlockPermitted({ ...b, landedOrTouchedInLandingZone: true })).toBe(true);
  });
});

describe('punt ownership, return rights and first touching', () => {
  it('keeps a receiver return and gives simultaneous possession to receivers', () => {
    expect(assessScrimmageKick(scrimmage())).toMatchObject({ possession: 'receiving', yardline: 25, advancePermitted: true });
    expect(assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'simultaneous', yardline: 15 } })))
      .toMatchObject({ possession: 'receiving' });
  });
  it('first touching is an optional spot, not an automatic5yd penalty', () => {
    const r = assessScrimmageKick(scrimmage({ firstKickingTouches: [{ yardline: 30 }] }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 30, fouls: [] });
    expect(r.options).toContainEqual({ kind: 'first_touch', possession: 'receiving', yardline: 30 });
  });
  it('preserves a better real receiver return rather than erase it with first touch', () => {
    expect(assessScrimmageKick(scrimmage({ firstKickingTouches: [{ yardline: 10 }] })))
      .toMatchObject({ yardline: 25 });
  });
  it('retains earlier first-touch insurance after a later muff/K recovery', () => {
    expect(assessScrimmageKick(scrimmage({ firstKickingTouches: [{ yardline: 30 }], receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 10 } })))
      .toMatchObject({ possession: 'receiving', yardline: 30 });
  });
  it('allows untouched K recovery behind LOS to advance without automatic new series', () => {
    expect(assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'kicking',
      recoveryYardline: 65, yardline: 50 } })))
      .toMatchObject({ possession: 'kicking', yardline: 50, advancePermitted: true, deadOnRecovery: false, newSeries: false });
  });
  it('prevents K advance beyond LOS after a muff but awards K first down', () => {
    expect(assessScrimmageKick(scrimmage({ receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 20, yardline: 5 } })))
      .toMatchObject({ possession: 'kicking', yardline: 80, advancePermitted: false, newSeries: true });
  });
  it('awards untouched downed punt to receivers and legal muff end-zone recovery TD to K', () => {
    expect(assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'kicking', yardline: 5 } })))
      .toMatchObject({ possession: 'receiving', yardline: 5 });
    expect(assessScrimmageKick(scrimmage({ receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: -1 } })))
      .toMatchObject({ possession: 'kicking', touchdown: 'kicking' });
  });
  it('deadens an untouched punt when it touches ground in EZ, but permits airborne catch return', () => {
    expect(assessScrimmageKick(scrimmage({ groundTouchedInReceivingEndzone: true,
      terminal: { kind: 'rest', yardline: -1 } }))).toMatchObject({ touchback: true, yardline: 20 });
    expect(assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: -1, yardline: 15, caughtInAir: true } }))).toMatchObject({ touchback: false, yardline: 15 });
  });
  it('offers a better first-touch spot instead of an eventual touchback', () => {
    expect(assessScrimmageKick(scrimmage({ firstKickingTouches: [{ yardline: 31 }],
      groundTouchedInReceivingEndzone: true, terminal: { kind: 'rest', yardline: -1 } })))
      .toMatchObject({ possession: 'receiving', yardline: 31, touchback: false });
  });
  it('spots an airborne first touch over EZ at jump point, never inside1', () => {
    const r = assessScrimmageKick(scrimmage({ firstKickingTouches: [{ yardline: -1, jumpedFromYardline: .2 }],
      terminal: { kind: 'possession', possession: 'receiving', yardline: .1 } }));
    expect(r).toMatchObject({ yardline: 1 });
  });
  it('retains untouched missed-field-goal spot, with minimum20', () => {
    expect(assessScrimmageKick(scrimmage({ missedFieldGoalSpot: 58, terminal: { kind: 'rest', yardline: 10 } })))
      .toMatchObject({ possession: 'receiving', yardline: 42 });
    expect(assessScrimmageKick(scrimmage({ missedFieldGoalSpot: 88, terminal: { kind: 'rest', yardline: 10 } })))
      .toMatchObject({ yardline: 20 });
    expect(assessScrimmageKick(scrimmage({ missedFieldGoalSpot: 58, receiverTouchedBeyondLine: true })))
      .toMatchObject({ yardline: 25 });
    expect(assessScrimmageKick(scrimmage({ missedFieldGoalSpot: 58 })))
      .toMatchObject({ yardline: 25 }); // actual R catch is itself a represented touch
  });
  it('does not let fair-catch kickers recover their untouched kick even behind line', () => {
    expect(assessScrimmageKick(scrimmage({ fairCatchKick: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 65, yardline: 65 } })))
      .toMatchObject({ possession: 'receiving', advancePermitted: false });
  });
  it('restores OOB-kicker rights after an eligible K teammate touched, without invented flag', () => {
    expect(assessScrimmageKick(scrimmage({ kickingToucherWentOutOfBounds: true,
      kickingToucherReestablished: true, touchedByKickingPlayerWhoNeverWentOut: true })).fouls).toEqual([]);
  });
  it('offers illegal-touch touchback only inside5, not exactly on5', () => {
    const f = scrimmage({ kickingToucherWentOutOfBounds: true, kickingToucherReestablished: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 5 } });
    const on5 = assessScrimmageKick(f);
    expect(on5.options.some(x => x.kind === 'dead_spot' && x.yardline === 20)).toBe(false);
    const inside5 = assessScrimmageKick({ ...f, terminal: { kind: 'possession', possession: 'kicking', yardline: 4.9 } });
    expect(inside5).toMatchObject({ possession: 'receiving', yardline: 20 });
  });
});

describe('fair catch signals, interference and next-kick entitlement', () => {
  const fc = { kick: 'scrimmage' as const, crossedLine: true, signal: 'valid' as const,
    signalYardline: 20, catcherIsSignaler: true, caughtInAir: true, catchYardline: 20 };
  it('makes a valid signaler catch dead and gives a fair-catch kick', () => {
    expect(assessFairCatch(fc)).toMatchObject({ deadAtCatch: true, fairCatch: true, advancePermitted: false });
    expect(assessScrimmageKick(scrimmage({ fairCatch: fc })))
      .toMatchObject({ fairCatch: true, fairCatchKickAvailable: true, yardline: 20 });
  });
  it('deaden teammate catch or grounded recovery but grants no fair catch', () => {
    expect(assessFairCatch({ ...fc, catcherIsSignaler: false })).toMatchObject({ deadAtCatch: true, fairCatch: false });
    expect(assessFairCatch({ ...fc, caughtInAir: false })).toMatchObject({ deadAtCatch: true, fairCatch: false });
  });
  it('invalid signals stop advance but do not create a fair-catch kick', () => {
    const r = assessFairCatch({ ...fc, signal: 'invalid' });
    expect(r).toMatchObject({ deadAtCatch: true, fairCatch: false });
    expect(r.fouls).toContainEqual(expect.objectContaining({ kind: 'invalid_fair_catch_signal', yards: 5 }));
  });
  it('ignores a signal behind scrimmage line', () => {
    expect(assessFairCatch({ ...fc, signal: 'invalid', signalBehindLine: true }))
      .toMatchObject({ deadAtCatch: false, fairCatch: false, advancePermitted: true, fouls: [] });
  });
  it('allows advance after a K touch; valid signaler may instead elect fair catch', () => {
    expect(assessFairCatch({ ...fc, kickingTeamTouched: true })).toMatchObject({ advancePermitted: true, fairCatch: false });
    expect(assessFairCatch({ ...fc, kickingTeamTouched: true, electsNotToAdvance: true }))
      .toMatchObject({ advancePermitted: false, fairCatch: true });
  });
  it('protects an unsignaled airborne catch opportunity and excludes blocked-into/uncatchable', () => {
    const f = { ...fc, signal: 'none' as const, interference: { yardline: 18, airborneOpportunity: true } };
    expect(assessFairCatch(f).fouls).toContainEqual(expect.objectContaining({ kind: 'kick_catch_interference', yards: 15 }));
    expect(assessFairCatch({ ...f, interference: { ...f.interference, blockedIntoReceiver: true } }).fouls).toEqual([]);
    expect(assessFairCatch({ ...f, interference: { ...f.interference, clearlyUncatchable: true } }).fouls).toEqual([]);
  });
  it('awards fair catch for interference even without a catch', () => {
    const r = assessFairCatch({ ...fc, caughtInAir: false,
      interference: { yardline: 18, airborneOpportunity: true } });
    expect(r).toMatchObject({ fairCatch: true, fairCatchAwarded: true, awardYardline: 18 });
    expect(r.fouls).toContainEqual(expect.objectContaining({ kind: 'fair_catch_interference', yards: 15 }));
  });
  it('muff-before-ground fair-catch interference awards catch, adds15 only for roughness', () => {
    const f = { ...fc, interference: { yardline: 18, airborneOpportunity: true, afterMuffBeforeGround: true } };
    expect(assessFairCatch(f)).toMatchObject({ fairCatchAwarded: true, awardYardline: 18, fouls: [] });
    expect(assessFairCatch({ ...f, interference: { ...f.interference, unnecessaryRoughness: true } }).fouls)
      .toContainEqual(expect.objectContaining({ yards: 15 }));
  });
  it('treats blocking by the signaler before another touch as a15yd foul', () => {
    expect(assessFairCatch({ ...fc, signalerBlockedBeforeAnotherPlayerTouched: { yardline: 22 } }).fouls)
      .toContainEqual(expect.objectContaining({ kind: 'illegal_block_after_signal', yards: 15, spot: 22 }));
  });
  it('allows expired-period fair-catch kick but snap only after interference award', () => {
    expect(fairCatchKickEligibility({ fairCatchMadeOrAwarded: true, periodExpired: true }))
      .toEqual({ allowed: true, maySnap: false, mayExtendPeriod: true });
    expect(fairCatchKickEligibility({ fairCatchMadeOrAwarded: true, periodExpired: true, fairCatchInterference: true }))
      .toEqual({ allowed: true, maySnap: true, mayExtendPeriod: true });
    expect(fairCatchKickEligibility({ fairCatchMadeOrAwarded: true, interveningScrimmageDown: true }).allowed).toBe(false);
  });
});

describe('selected kick penalties and legal alternatives', () => {
  it('enforces kick-catch interference at the foul spot, not the return ending', () => {
    const r = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'kicking', yardline: 12 },
      fairCatch: { kick: 'scrimmage', crossedLine: true,
        signal: 'none', signalYardline: 15, interference: { airborneOpportunity: true, yardline: 15 } } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 30 });
    expect(r.foulDispositions).toEqual([{ index: 0, accepted: true, offset: false, yards: 15 }]);
  });
  it('also offers dead-spot interference enforcement when receivers retained a better return', () => {
    const r = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: 15, yardline: 50 }, fairCatch: { kick: 'scrimmage', crossedLine: true,
        signal: 'none', signalYardline: 15, interference: { airborneOpportunity: true, yardline: 15 } } }));
    expect(r.yardline).toBe(65);
    expect(r.options).toContainEqual(expect.objectContaining({ kind: 'enforce_spot', yardline: 30 }));
  });
  it('an invalid end-zone free-kick signal requires previous-spot replay', () => {
    const r = assessFreeKick(free({ terminal: { kind: 'possession', possession: 'receiving', yardline: -1 },
      fairCatch: { kick: 'free', signal: 'invalid', signalYardline: -1, catchYardline: -1 } }));
    expect(r.retryKickFrom).toBe(40);
    expect(r.options.filter(x => x.foulIndex === 0).every(x => x.kind !== 'enforce_dead_ball')).toBe(true);
  });
  it('enforces fair-catch interference award plus15 and retains kick entitlement', () => {
    const r = assessScrimmageKick(scrimmage({ fairCatch: { kick: 'scrimmage', crossedLine: true,
      signal: 'valid', signalYardline: 15, interference: { airborneOpportunity: true, yardline: 15 } } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 30, fairCatchKickAvailable: true });
  });
  it('deletes an illegal post-signal touchdown and enforces invalid signal at signal spot', () => {
    const r = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: 15, yardline: 100 }, fairCatch: { kick: 'scrimmage', crossedLine: true,
        signal: 'invalid', signalYardline: 15, catchYardline: 15 } }));
    expect(r).toMatchObject({ yardline: 10, fairCatchKickAvailable: false, advancePermitted: false });
    expect(r.touchdown).toBeUndefined();
  });
  it('applies half distance to a receiver signal foul near own goal', () => {
    const r = assessScrimmageKick(scrimmage({ fairCatch: { kick: 'scrimmage', crossedLine: true,
      signal: 'invalid', signalYardline: 4, catchYardline: 4 } }));
    expect(r.yardline).toBe(2); expect(r.foulDispositions?.[0].yards).toBe(2);
  });
  it('uses20 then15 for fair-catch interference awarded in end zone', () => {
    const r = assessFreeKick(free({ fairCatch: { kick: 'free', signal: 'valid', signalYardline: -1,
      interference: { airborneOpportunity: true, yardline: -1 } } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 35, fairCatchKickAvailable: true });
  });
  it('enforces a K formation foul at dead spot when R retains, preserving re-kick election', () => {
    const r = assessFreeKick(free({ formation: { legal: false } }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 33 });
    expect(r.options).toContainEqual(expect.objectContaining({ kind: 'replay', kickSpot: 30 }));
    expect(r.retryKickFrom).toBeUndefined();
  });
  it('requires re-kick rather than keep an illegally recovered non-onside kick', () => {
    const r = assessFreeKick(free({ terminal: { kind: 'possession', possession: 'kicking', yardline: 5 } }));
    expect(r).toMatchObject({ possession: 'kicking', retryKickFrom: 30 });
    expect(r.unresolved).toEqual([]);
  });
  it('offsets opposing free-kick formation fouls and re-kicks from original origin', () => {
    const r = assessFreeKick(free({ formation: { legal: false }, fouls: [{ kind: 'illegal_formation',
      against: 'receiving', rule: '6-1-3', yards: 5, spot: 65, enforcement: 'previous' }] }));
    expect(r.retryKickFrom).toBe(35);
    expect(r.foulDispositions?.every(x => x.accepted && x.offset)).toBe(true);
  });
  it('does not apply no-COP15vs5 exception after R actually possessed the kick', () => {
    const r = assessFreeKick(free({ formation: { legal: false }, fouls: [{ kind: 'unnecessary_roughness',
      against: 'receiving', rule: '12-2-8', yards: 15, spot: 25, enforcement: 'spot' }] }));
    expect(r.retryKickFrom).toBe(35);
    expect(r.foulDispositions?.every(x => x.offset)).toBe(true);
  });
  it('does enforce15vs5 previous-spot replay when K recovers and there was no COP', () => {
    const r = assessFreeKick(free({ landingZoneTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 5 },
      formation: { legal: false }, fouls: [{ kind: 'unnecessary_roughness', against: 'receiving',
        rule: '12-2-8', yards: 15, spot: 10, enforcement: 'spot' }] }));
    expect(r.retryKickFrom).toBe(50);
    expect(r.foulDispositions).toEqual([{ index: 0, accepted: false, offset: false, yards: 0 },
      { index: 1, accepted: true, offset: false, yards: 15 }]);
  });
  it('personal K foul plus RPSK foul offsets at own enforcement spot without charging R yardage', () => {
    const r = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: 15, yardline: 40 }, fouls: [
        { kind: 'unnecessary_roughness', against: 'kicking', rule: '12-2-8', yards: 15, spot: 20, enforcement: 'spot' },
        { kind: 'illegal_block', against: 'receiving', rule: '12-1-3', yards: 10, spot: 30, enforcement: 'previous' },
      ] }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 15 });
    expect(r.foulDispositions?.every(x => x.offset && x.yards === 0)).toBe(true);
  });
  it('opposing dead-ball fouls offset at succeeding spot without replay', () => {
    const r = assessScrimmageKick(scrimmage({ fouls: [
      { kind: 'unnecessary_roughness', against: 'kicking', rule: '12-2-8', yards: 15, spot: 25, enforcement: 'dead_ball' },
      { kind: 'unnecessary_roughness', against: 'receiving', rule: '12-2-8', yards: 15, spot: 25, enforcement: 'dead_ball' },
    ] }));
    expect(r.yardline).toBe(25); expect(r.retryKickFrom).toBeUndefined();
    expect(r.foulDispositions?.every(x => x.offset)).toBe(true);
  });
  it('enforces one multiple foul, preserving short-kick award instead of adding5', () => {
    const r = assessFreeKick(free({ firstContact: { by: 'ground', yardline: 21 },
      terminal: { kind: 'rest', yardline: 21 }, formation: { legal: false } }));
    expect(r.yardline).toBe(40);
    expect(r.foulDispositions?.filter(x => x.accepted)).toHaveLength(1);
  });
  it('declines an ordinary K foul to retain a receiver return touchdown', () => {
    const r = assessFreeKick(free({ terminal: { kind: 'possession', possession: 'receiving', yardline: 100 },
      formation: { legal: false } }));
    expect(r.touchdown).toBe('receiving'); expect(r.foulDispositions?.[0].accepted).toBe(false);
  });
  it('preserves a return TD and carries opponent personal foul to Try', () => {
    const r = assessFreeKick(free({ terminal: { kind: 'possession', possession: 'receiving', yardline: 100 },
      fouls: [{ kind: 'unnecessary_roughness', against: 'kicking', rule: '12-2-8', yards: 15,
        spot: 80, enforcement: 'spot' }] }));
    expect(r.touchdown).toBe('receiving');
    expect(r.carryover).toEqual([{ index: 0, against: 'kicking', yards: 15, on: 'try' }]);
  });
  it('does not invent personal-foul carryover from ordinary kick-catch interference', () => {
    const r = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: 15, yardline: 100 }, fairCatch: { kick: 'scrimmage', crossedLine: true,
        signal: 'none', signalYardline: 15, interference: { airborneOpportunity: true, yardline: 15 } } }));
    expect(r.touchdown).toBe('receiving'); expect(r.carryover).toBeUndefined();
    expect(r.foulDispositions?.[0].accepted).toBe(false);
  });
  it('PSK uses end-of-kick/foul minimum, excluding the later return', () => {
    const r = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: 15, yardline: 40 }, fouls: [{ kind: 'illegal_block', against: 'receiving',
        rule: '12-1-3', yards: 10, spot: 30, enforcement: 'previous' }] }));
    expect(r).toMatchObject({ possession: 'receiving', yardline: 7.5 });
    expect(r.options.some(x => x.kind === 'replay')).toBe(false);
    const explicitlySpotted = assessScrimmageKick(scrimmage({ terminal: { kind: 'possession', possession: 'receiving',
      recoveryYardline: 15, yardline: 40 }, fouls: [{ kind: 'illegal_block', against: 'receiving',
        rule: '12-1-3', yards: 10, spot: 30, enforcement: 'spot' }] }));
    expect(explicitlySpotted.yardline).toBe(7.5);
  });
  it('attempt-to-block-kick receiver foul keeps previous-spot enforcement', () => {
    const r = assessScrimmageKick(scrimmage({ fouls: [{ kind: 'illegal_block', against: 'receiving',
      rule: '9-5-1', yards: 10, spot: 65, enforcement: 'previous', attemptToBlockKick: true }] }));
    expect(r.options).toContainEqual(expect.objectContaining({ kind: 'replay', kickSpot: 50 }));
    expect(r.retryKickFrom).toBe(50);
    expect(r.options.filter(x => x.foulIndex === 0).some(x => x.kind === 'enforce_dead_ball')).toBe(false);
  });
  it('does not mistake a receiver retreating OOB behind own goal for a touchback', () => {
    const t = { kind: 'out_of_bounds' as const, yardline: -1, returnedIntoOwnEndzone: true };
    expect(assessFreeKick(free({ terminal: t }))).toMatchObject({ safety: 'kicking', touchback: false });
    expect(assessScrimmageKick(scrimmage({ terminal: t }))).toMatchObject({ safety: 'kicking', touchback: false });
  });
});

describe('native abstract kick paths use the same deterministic laws', () => {
  const a = generateTeam(new Rng(311), 'A', 'A'), b = generateTeam(new Rng(312), 'B', 'B');
  it('routes event touchbacks/short safety kicks through corrected laws', () => {
    expect(kickoff(new Rng(1), a, b, { event: free({ kickSpot: 50,
      terminal: { kind: 'posts', yardline: -10 } }) })).toMatchObject({ touchback: true, yardline: 20 });
    expect(kickoff(new Rng(1), a, b, { event: free({ kind: 'safety', kickSpot: 20,
      firstContact: { by: 'ground', yardline: 22 }, terminal: { kind: 'rest', yardline: 22 } }) }))
      .toMatchObject({ possession: 'receiving', yardline: 50 });
  });
  it('moves the existing onside event with a penalty-adjusted kick origin', () => {
    const r = kickoff(new Rng(1), a, b, { onside: true, kickSpot: 40 });
    expect(r.yardline).toBe(50);
    expect(r.rules.fouls).toEqual([]);
  });
  it('routes represented punt muff recovery without illegal K advance', () => {
    const r = punt(new Rng(1), a, b, 40, { event: scrimmage({ receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 20, yardline: 1 } }) });
    expect(r).toMatchObject({ possession: 'kicking', yardline: 80, muffLost: true });
    expect(r.rules.advancePermitted).toBe(false);
  });
  it('fair-catch kick uses actual kick spot to posts and rejects no entitlement', () => {
    const k = a.roster.find(p => p.position === 'K')!;
    expect(() => kickFairCatch(new Rng(1), k, 50, { fairCatchMadeOrAwarded: false })).toThrow('entitlement');
    const r = kickFairCatch(new Rng(1), k, 50, { fairCatchMadeOrAwarded: true });
    expect(r.distance).toBe(60); expect(r.blocked).toBe(false);
  });
  it('ordinary seeded kickoff/punt results remain deterministic and correctly framed', () => {
    const k1 = kickoff(new Rng('legal-kick-control'), a, b), k2 = kickoff(new Rng('legal-kick-control'), a, b);
    expect(k1).toEqual(k2); expect(k1.yardline).toBeGreaterThanOrEqual(1);
    const p1 = punt(new Rng('legal-punt-control'), a, b, 40), p2 = punt(new Rng('legal-punt-control'), a, b, 40);
    expect(p1).toEqual(p2); expect(p1.yardline).toBeGreaterThanOrEqual(1);
    expect(p1.rules.fouls).toEqual([]);
  });
});

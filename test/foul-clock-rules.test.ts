import { describe, expect, it } from 'vitest';
import { resolveFoulClock, type FoulClockContext } from '../src/game/clock-rules.js';
import type { PenaltyCall, PlayResult } from '../src/sim/types.js';

const play: PlayResult = { outcome: 'incomplete', possession: 'O', turnover: false,
  endX: 60, endY: 26, yards: 0, offenseYards: 0, segments: [], score: null,
  duration: 3, clockStops: true, kind: 'pass', events: [], stats: {
    tacklers: [], completed: false, attempted: true, sacked: false, scramble: false,
    throwaway: false, pressured: false, brokenTackles: 0, missedTackles: 0, dropped: false,
  } };
const foul = (kind: PenaltyCall['kind'], extra: Partial<PenaltyCall> = {}): PenaltyCall => ({
  kind, against: 'O', playerId: 'actor', yards: 5, autoFirst: false,
  phase: 'live', possessionChanges: 0, ...extra,
});
const context = (extra: Partial<FoulClockContext> = {}): FoulClockContext => ({
  quarter: 4, clock: 18, afterTwoMinuteWarning: true, wasRunning: true,
  calls: [foul('intentional_grounding')], acceptedIndices: [0], offset: false,
  replayDown: false, result: play, offenseTimeouts: 0, ...extra,
});

describe('NFL2026 foul clock choices', () => {
  it('runs ten seconds for accepted grounding while time is in after the warning', () => {
    expect(resolveFoulClock(context())).toMatchObject({ runoff: 10, restart: 'ready', playClock: 30 });
  });
  it('allows a remaining timeout instead of the runoff and restarts on the snap', () => {
    expect(resolveFoulClock(context({ offenseTimeouts: 1, useTimeout: true })))
      .toMatchObject({ runoff: 0, timeoutCharged: true, restart: 'snap', playClock: 25 });
  });
  it('does not charge a nonexistent timeout or manufacture time when fewer than ten seconds remain', () => {
    expect(resolveFoulClock(context({ clock: 7, useTimeout: true })))
      .toMatchObject({ runoff: 7, timeoutCharged: false, untimedDown: false });
  });
  it('lets the defense decline only the runoff while accepting distance', () => {
    expect(resolveFoulClock(context({ declineRunoff: true }))).toMatchObject({ runoff: 0, restart: 'snap' });
  });
  it('declining the yardage also declines the runoff', () => {
    expect(resolveFoulClock(context({ acceptedIndices: [] }))).toMatchObject({ runoff: 0, restart: 'snap' });
  });
  it('does not treat ordinary live holding as an automatic time-conserving foul', () => {
    expect(resolveFoulClock(context({ calls: [foul('holding')] }))).toMatchObject({ runoff: 0, restart: 'snap' });
  });
  it('does not run time off an already stopped clock for a presnap foul', () => {
    expect(resolveFoulClock(context({ calls: [foul('false_start', { phase: 'pre_snap' })], wasRunning: false })))
      .toMatchObject({ runoff: 0, restart: 'snap' });
  });
  it('uses a ten-second runoff for a presnap clock-stopping foul while time is in', () => {
    expect(resolveFoulClock(context({ calls: [foul('false_start', { phase: 'pre_snap' })] }))).toMatchObject({ runoff: 10 });
  });
  it('does not impose the late-half runoff before the warning', () => {
    expect(resolveFoulClock(context({ afterTwoMinuteWarning: false, clock: 240, quarter: 2 })))
      .toMatchObject({ runoff: 0, restart: 'ready' });
  });
  it('gives the offense the snap choice after defensive time conservation', () => {
    expect(resolveFoulClock(context({ calls: [foul('delay_of_game', { against: 'D', phase: 'dead_ball' })] })))
      .toMatchObject({ runoff: 0, restart: 'snap', playClock: 40 });
  });
  it('extends an expired period for an accepted live defensive foul', () => {
    expect(resolveFoulClock(context({ clock: 0, calls: [foul('defensive_holding', { against: 'D' })] })))
      .toMatchObject({ untimedDown: true, restart: 'snap' });
  });
  it('does not extend for an ordinary offensive or dead-ball defensive foul', () => {
    expect(resolveFoulClock(context({ clock: 0, calls: [foul('opi')] })).untimedDown).toBe(false);
    expect(resolveFoulClock(context({ clock: 0, calls: [foul('taunting', { against: 'D', phase: 'dead_ball' })] })).untimedDown).toBe(false);
  });
  it('extends a half for live offsets, with first/third and clean-hands controls', () => {
    const calls = [foul('holding'), foul('defensive_holding', { against: 'D' })];
    expect(resolveFoulClock(context({ clock: 0, calls, acceptedIndices: [], offset: true, replayDown: true })).untimedDown).toBe(true);
    expect(resolveFoulClock(context({ clock: 0, calls, acceptedIndices: [], offset: true, replayDown: true, quarter: 3 })).untimedDown).toBe(false);
    expect(resolveFoulClock(context({ clock: 0, calls, acceptedIndices: [], offset: true, replayDown: false })).untimedDown).toBe(false);
  });
  it('does not invent a runoff for conduct after an already-stopped incomplete pass', () => {
    expect(resolveFoulClock(context({ calls: [foul('taunting', { phase: 'dead_ball' })],
      wouldRunAfterPlay: false })).runoff).toBe(0);
  });
  it('restarts on the snap for an offensive presnap foul anywhere in the fourth quarter', () => {
    expect(resolveFoulClock(context({ quarter: 4, clock: 650, afterTwoMinuteWarning: false,
      calls: [foul('false_start', { phase: 'pre_snap' })] })).restart).toBe('snap');
  });
  it('declining distance also declines the conserving-time runoff', () => {
    expect(resolveFoulClock(context({ yardageDeclined: true })).runoff).toBe(0);
  });
  it('extends for a defensive foul against a returner, using the teams at the act', () => {
    expect(resolveFoulClock(context({ clock: 0,
      calls: [foul('defensive_holding', { against: 'O', possessionTeam: 'D', possessionChanges: 1 })],
      result: { ...play, possession: 'D', turnover: true } })).untimedDown).toBe(true);
  });
  it('includes the fourth-down offensive personal-foul extension exception', () => {
    expect(resolveFoulClock(context({ clock: 0, startDown: 4, startDistance: 8,
      calls: [foul('personal_foul')], result: { ...play, yards: 2 } })).untimedDown).toBe(true);
  });
  it('requires actual out-of-bounds causation for an illegal bat runoff', () => {
    expect(resolveFoulClock(context({ calls: [foul('illegal_bat')] })).runoff).toBe(0);
    expect(resolveFoulClock(context({ calls: [foul('illegal_bat', { causedBallOutOfBounds: true })] })).runoff).toBe(10);
  });
});

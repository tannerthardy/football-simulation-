import { describe, expect, it } from 'vitest';
import { resolveLivePenalties, type LivePenaltyContext, type LivePenaltyOption } from '../src/game/penalty-enforcement.js';
import type { PenaltyCall, PlayResult } from '../src/sim/types.js';

function result(p: Partial<PlayResult> = {}): PlayResult {
  return {
    outcome: 'tackle', possession: 'O', turnover: false, endX: 65, endY: 20,
    yards: 5, offenseYards: 5, segments: [], score: null, duration: 5,
    clockStops: false, kind: 'run', events: [],
    stats: { attempted: false, completed: false, sacked: false, scramble: false,
      throwaway: false, pressured: false, tacklers: [], brokenTackles: 0, missedTackles: 0, dropped: false },
    ...p,
  };
}

function call(kind: PenaltyCall['kind'], p: Partial<PenaltyCall> = {}): PenaltyCall {
  return { kind, against: kind === 'dpi' ? 'D' : 'O', playerId: 'p1',
    spotX: 62, yards: kind === 'dpi' ? 0 : 10, autoFirst: kind === 'dpi', ...p };
}

function context(calls: PenaltyCall[], p: Partial<LivePenaltyContext> = {}): LivePenaltyContext {
  return { calls, los: 60, startDown: 1, startDistance: 10, result: result(), ...p };
}

function enforced(ctx: LivePenaltyContext, i = 0): LivePenaltyOption {
  const found = resolveLivePenalties(ctx);
  expect(found.status, found.reason).toBe('resolved');
  const option = found.options.find(x => x.id === `enforce:${i}`);
  expect(option).toBeDefined();
  return option!;
}

describe('NFL-2026 live foul enforcement', () => {
  it('leaves an unflagged play alone', () => {
    expect(resolveLivePenalties(context([]))).toEqual({ status: 'none', options: [] });
  });

  it('keeps the previous spot floor for a behind-line run hold', () => {
    const ctx = context([call('holding', { spotX: 57 })], { result: result({ endX: 64, yards: 4 }) });
    expect(enforced(ctx)).toMatchObject({ spotX: 50, yards: 10, nextDown: 1, nextDistance: 20, replayDown: true });
  });

  it('uses a downfield running hold spot rather than erasing the legal prior advance', () => {
    const ctx = context([call('holding', { spotX: 64 })], { result: result({ endX: 85, yards: 25 }) });
    expect(enforced(ctx)).toMatchObject({ spotX: 54, yards: 10, nextDistance: 16 });
  });

  it('uses previous spot for a hold during a forward-pass play', () => {
    const r = result({ endX: 85, yards: 25 }); r.stats.attempted = true;
    expect(enforced(context([call('holding', { spotX: 64 })], { result: r })).spotX).toBe(50);
  });

  it('preserves the existing defense policy to keep its takeaway instead of a hold', () => {
    const found = resolveLivePenalties(context([call('holding')], {
      result: result({ possession: 'D', turnover: true, endX: 45, yards: 0 }),
    }));
    expect(found.recommendedId).toBe('decline');
    expect(found.options[0]).toMatchObject({ nextDown: 1, nextDistance: 10, possession: 'D' });
  });

  it('preserves the ordinary third-down stop instead of replaying it for holding', () => {
    expect(resolveLivePenalties(context([call('holding')], { startDown: 3 })).recommendedId).toBe('decline');
  });

  it('declining on fourth down keeps the downs turnover, never a fifth down', () => {
    const found = resolveLivePenalties(context([call('holding')], {
      startDown: 4, result: result({ outcome: 'incomplete', endX: 85, yards: 0 }),
    }));
    expect(found.recommendedId).toBe('decline');
    expect(found.options[0]).toMatchObject({ spotX: 60, possession: 'D', nextDown: 1, nextDistance: 10 });
  });

  it('accepts the hold that negates an offensive touchdown', () => {
    const found = resolveLivePenalties(context([call('holding')], {
      result: result({ endX: 110, yards: 50, score: { team: 'O', kind: 'TD' }, outcome: 'touchdown' }),
    }));
    expect(found.recommendedId).toBe('enforce:0');
  });

  it('retains precise half-distance and the original line to gain', () => {
    expect(enforced(context([call('opi', { spotX: 14 })], {
      los: 11, startDistance: 10, result: result({ endX: 14, yards: 3 }),
    }))).toMatchObject({ spotX: 10.5, yards: .5, nextDistance: 10.5, nextDown: 1 });
  });

  it('awards an accepted own-end-zone hold as safety rather than half-distance', () => {
    expect(enforced(context([call('holding', { spotX: 9 })], { los: 14 }))).toMatchObject({ safety: true, spotX: 10, yards: 0 });
  });

  it('OPI is ten from previous spot, independent of the downfield block location', () => {
    expect(enforced(context([call('opi', { spotX: 80 })]))).toMatchObject({ spotX: 50, yards: 10, autoFirst: false, lossDown: false });
  });

  it('DPI has no fifteen-yard cap and resets the series', () => {
    expect(enforced(context([call('dpi', { spotX: 89 })], { startDown: 3 }))).toMatchObject({
      spotX: 89, yards: 29, autoFirst: true, nextDown: 1, nextDistance: 10, replayDown: false,
    });
  });

  it('places defensive-end-zone DPI at the one when the previous spot is outside two', () => {
    expect(enforced(context([call('dpi', { spotX: 112 })], { los: 100, startDistance: 10 }))).toMatchObject({ spotX: 109, nextDistance: 1 });
  });

  it('uses half-distance for defensive-end-zone DPI inside the two', () => {
    expect(enforced(context([call('dpi', { spotX: 112 })], { los: 109, startDistance: 1 }))).toMatchObject({ spotX: 109.5, nextDistance: .5 });
  });

  it('declines DPI when the offense already scored a touchdown', () => {
    expect(resolveLivePenalties(context([call('dpi', { spotX: 85 })], {
      result: result({ outcome: 'touchdown', score: { team: 'O', kind: 'TD' }, endX: 110, yards: 50 }),
    })).recommendedId).toBe('decline');
  });

  it('retains same-team choices and never stacks an OPI and hold distance', () => {
    const found = resolveLivePenalties(context([call('holding', { spotX: 64 }), call('opi', { playerId: 'p2', spotX: 75 })], {
      result: result({ endX: 85, yards: 25 }),
    }));
    expect(found.options.map(x => [x.id, x.spotX, x.callIndices])).toEqual([
      ['decline', 85, []], ['enforce:0', 54, [0]], ['enforce:1', 50, [1]],
    ]);
    expect(found.recommendedId).toBe('enforce:1');
  });

  it('offsets supported opposing live fouls with no possession change, with no decline option', () => {
    const found = resolveLivePenalties(context([call('opi'), call('dpi', { playerId: 'd1', spotX: 80 })], { startDown: 3 }));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 60, nextDown: 3, nextDistance: 10, callIndices: [0, 1] });
    expect(found.recommendedId).toBe('offset');
  });

  it('refuses to guess clean-hands enforcement from a double foul with a turnover', () => {
    const found = resolveLivePenalties(context([call('opi'), call('dpi', { playerId: 'd1' })], {
      result: result({ turnover: true, possession: 'D' }),
    }));
    expect(found.status).toBe('unsupported');
    expect(found.options).toEqual([]);
    expect(found.reason).toMatch(/clean-hands/);
  });

  it('lets the defense keep an interception after multiple known pre-possession offensive fouls', () => {
    const found = resolveLivePenalties(context([
      call('holding', { possessionChanges: 0 }), call('opi', { playerId: 'p2' }),
    ], { startDown: 3, result: result({ turnover: true, possession: 'D', endX: 45, yards: 0 }) }));
    expect(found.status).toBe('resolved');
    expect(found.recommendedId).toBe('decline');
    expect(found.options[0]).toMatchObject({ possession: 'D', nextDown: 1, nextDistance: 10 });
    expect(found.options.filter(x => x.kind === 'enforce')).toHaveLength(2);
  });

  it('uses the pre-change fumble spot for a running-hold alternative, not the return ending', () => {
    const r = result({ turnover: true, possession: 'D', endX: 30, yards: 0,
      segments: [{ team: 'O', carrier: 'rb', how: 'snap', startX: 60, endX: 72, end: 'fumble' },
        { team: 'D', carrier: 'd1', how: 'recovery', startX: 72, endX: 30, end: 'dead' }] });
    const option = enforced(context([call('holding', { spotX: 70, possessionChanges: 0 })], { result: r }));
    expect(option).toMatchObject({ spotX: 60, yards: 10 });
  });

  it('retains pre-first-possession offensive foul options after an INT and original-offense recovery', () => {
    const r = result({ turnover: false, possession: 'O', endX: 65, yards: 5,
      segments: [{ team: 'O', carrier: 'qb', how: 'snap', startX: 60, endX: 57, end: 'pass' },
        { team: 'D', carrier: 'd1', how: 'interception', startX: 75, endX: 65, end: 'fumble' },
        { team: 'O', carrier: 'te', how: 'recovery', startX: 65, endX: 65, end: 'dead' }] });
    const found = resolveLivePenalties(context([call('opi'), call('holding', { possessionChanges: 0 })],
      { result: r, startDown: 3 }));
    expect(found.status).toBe('resolved');
    expect(found.options[0]).toMatchObject({ kind: 'decline', possession: 'O', nextDown: 1, nextDistance: 10 });
    expect(found.options[1]).toMatchObject({ kind: 'enforce', possession: 'O', nextDown: 3, nextDistance: 20 });
    expect(found.recommendedId).toBe('enforce:0');
  });

  it('a second forward pass consumes the down and backs up five from previous spot', () => {
    expect(enforced(context([call('illegal_forward_pass', { yards: 5, spotX: 57, enforcement: 'previous', lossDown: true })], {
      startDown: 3,
    }))).toMatchObject({ spotX: 55, yards: 5, nextDown: 4, nextDistance: 15, lossDown: true, replayDown: false });
  });

  it('fourth-down loss of down awards the ball after distance enforcement', () => {
    expect(enforced(context([call('illegal_forward_pass', { enforcement: 'previous', lossDown: true })], {
      startDown: 4,
    }))).toMatchObject({ spotX: 55, possession: 'D', nextDown: 1, nextDistance: 10 });
  });

  it('after-possession pass costs five at release without erasing prior possession stats', () => {
    const r = result({ possession: 'D', turnover: true, endX: 30, yards: 0,
      segments: [{ team: 'O', carrier: 'qb', how: 'snap', startX: 60, endX: 55, end: 'pass' },
        { team: 'D', carrier: 'd1', how: 'interception', startX: 75, endX: 30, end: 'dead' }] });
    const ctx = context([call('illegal_forward_pass', { against: 'D', spotX: 70, lossDown: false,
      reason: 'after_change_of_possession', enforcement: 'spot' })], { result: r });
    expect(enforced(ctx)).toMatchObject({ spotX: 75, yards: 5, possession: 'D', nextDown: 1,
      lossDown: false, preserveBeforeChangeOfPossession: true });
    expect(resolveLivePenalties(ctx).recommendedId).toBe('enforce:0');
  });

  it('separates post-possession enforcement from the still-unqualified end-zone impetus case', () => {
    const found = resolveLivePenalties(context([call('illegal_forward_pass', { against: 'D', spotX: 112,
      reason: 'after_change_of_possession', lossDown: false })], {
      result: result({ possession: 'D', turnover: true }),
    }));
    expect(found.status).toBe('unsupported');
    expect(found.reason).toMatch(/impetus/);
  });

  it('does not offset a presnap/dead-ball abstraction as if it were an ordinary live foul', () => {
    expect(resolveLivePenalties(context([call('opi'), call('offside', { against: 'D' })])).status).toBe('unsupported');
    expect(resolveLivePenalties(context([call('holding', { t: 6 })])).status).toBe('unsupported');
  });

  it('does not treat offensive-holding metadata as a qualified defensive-holding detector', () => {
    expect(resolveLivePenalties(context([call('opi'), call('holding', { against: 'D' })])).status).toBe('unsupported');
  });

  it('calculates choices without mutating the native calls or physical result', () => {
    const ctx = context([call('opi')]);
    const before = JSON.stringify(ctx);
    resolveLivePenalties(ctx);
    expect(JSON.stringify(ctx)).toBe(before);
  });
});

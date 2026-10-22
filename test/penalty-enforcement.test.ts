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
    expect(found.options.filter(x => !x.acceptedWithoutDistance).map(x => [x.id, x.spotX, x.callIndices])).toEqual([
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

  it('replays a double foul when the intercepting defense had already fouled before gaining possession', () => {
    const found = resolveLivePenalties(context([call('opi'), call('dpi', { playerId: 'd1' })], {
      result: result({ turnover: true, possession: 'D' }),
    }));
    expect(found.status).toBe('resolved');
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 60, possession: 'O', replayDown: true });
  });

  it('lets the defense keep an interception after multiple known pre-possession offensive fouls', () => {
    const found = resolveLivePenalties(context([
      call('holding', { possessionChanges: 0 }), call('opi', { playerId: 'p2' }),
    ], { startDown: 3, result: result({ turnover: true, possession: 'D', endX: 45, yards: 0 }) }));
    expect(found.status).toBe('resolved');
    expect(found.recommendedId).toBe('decline');
    expect(found.options[0]).toMatchObject({ possession: 'D', nextDown: 1, nextDistance: 10 });
    expect(found.options.filter(x => x.kind === 'enforce' && !x.acceptedWithoutDistance)).toHaveLength(2);
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

  it('requires the missing impetus fact when a post-possession ball dies in the returner end zone', () => {
    const found = resolveLivePenalties(context([call('illegal_forward_pass', { against: 'D', spotX: 112,
      reason: 'after_change_of_possession', lossDown: false })], {
      result: result({ possession: 'D', turnover: true, endX: 112 }),
    }));
    expect(found.status).toBe('unsupported');
    expect(found.reason).toMatch(/impetus/);
  });

  it('handles a free-play offside plus OPI as an ordinary live double foul', () => {
    expect(resolveLivePenalties(context([call('opi'), call('offside', { against: 'D' })])).options[0])
      .toMatchObject({ kind: 'offset', replayDown: true, spotX: 60 });
  });

  it('keeps a completed third-down stop when a later offensive dead-ball foul is enforced', () => {
    expect(enforced(context([call('unnecessary_roughness', { t: 6, spotX: 65 })], { startDown: 3 })))
      .toMatchObject({ spotX: 50, nextDown: 4, nextDistance: 20, preservesPlay: true, nullifiesPlay: false });
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

  it('defensive holding enforces five at the running basic spot and grants a first down', () => {
    expect(enforced(context([call('defensive_holding', { against: 'D', spotX: 62, playPhase: 'run' })], {
      startDown: 3, result: result({ endX: 68, yards: 8 }),
    }))).toMatchObject({ spotX: 73, yards: 5, nextDown: 1, nextDistance: 10, autoFirst: true });
  });

  it('illegal contact is five from previous spot even when the pass falls far downfield', () => {
    expect(enforced(context([call('illegal_contact', { against: 'D', spotX: 77 })], {
      startDown: 3, result: result({ outcome: 'incomplete', endX: 90, yards: 0 }),
    }))).toMatchObject({ spotX: 65, nextDown: 1, autoFirst: true });
  });

  it('adds roughing to a completed pass at the more beneficial dead-ball spot', () => {
    const r = result({ kind: 'pass', endX: 85, yards: 25 }); r.stats.attempted = true; r.stats.completed = true;
    const found = resolveLivePenalties(context([call('roughing_passer', { against: 'D', spotX: 57, playPhase: 'pass' })], { result: r }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ spotX: 97.5, yards: 12.5, nextDown: 1, preservesPlay: true, autoFirst: true });
  });

  it('a post-catch hold is a running foul, not ten yards from the pass previous spot', () => {
    const r = result({ kind: 'pass', endX: 90, yards: 30 }); r.stats.attempted = true; r.stats.completed = true;
    expect(enforced(context([call('holding', { spotX: 85, playPhase: 'run' })], { result: r })))
      .toMatchObject({ spotX: 75, yards: 10, nextDown: 1, nextDistance: 10 });
  });

  it.each(['blindside_block', 'clipping', 'peel_back', 'low_block', 'chop_block', 'crackback'] as const)
    ('%s costs fifteen with three-and-one rather than a made-up block-win penalty', kind => {
      expect(enforced(context([call(kind, { spotX: 64, yards: 999 })], { result: result({ endX: 85, yards: 25 }) })))
        .toMatchObject({ spotX: 49, yards: 15, nextDistance: 21, replayDown: true });
    });

  it.each(['facemask', 'horse_collar', 'hip_drop', 'tripping', 'illegal_helmet'] as const)
    ('defensive %s is fifteen and a first down from the running basic spot', kind => {
      expect(enforced(context([call(kind, { against: 'D', spotX: 63 })], { startDown: 3 })))
        .toMatchObject({ spotX: 80, yards: 15, autoFirst: true, nextDown: 1 });
    });

  it('a block in the back costs ten rather than the fifteen-yard dangerous-block penalties', () => {
    expect(enforced(context([call('block_in_back', { spotX: 64 })], { result: result({ endX: 85, yards: 25 }) })))
      .toMatchObject({ spotX: 54, yards: 10, autoFirst: false });
  });

  it('grounding chooses ten from previous over a shorter seven-yard loss and consumes the down', () => {
    expect(enforced(context([call('intentional_grounding', { spotX: 53 })], { startDown: 2 })))
      .toMatchObject({ spotX: 50, yards: 10, nextDown: 3, nextDistance: 20, lossDown: true });
  });

  it('grounding deeper than ten is enforced at the release', () => {
    expect(enforced(context([call('intentional_grounding', { spotX: 47 })])))
      .toMatchObject({ spotX: 47, yards: 13, lossDown: true });
  });

  it('grounding exception prevents half-distance rescuing a pass from farther behind the line', () => {
    expect(enforced(context([call('intentional_grounding', { spotX: 12 })], { los: 15 })))
      .toMatchObject({ spotX: 12, yards: 3, nextDistance: 13 });
  });

  it('grounding in the offense end zone awards a safety to the opponent', () => {
    expect(enforced(context([call('intentional_grounding', { spotX: 8 })], { los: 15 })))
      .toMatchObject({ spotX: 10, safety: true, safetyTeam: 'D', lossDown: true });
  });

  it('distinguishes ineligible touching from an eligible receiver returning after going out', () => {
    expect(enforced(context([call('illegal_touching')], { startDown: 2 })))
      .toMatchObject({ spotX: 55, yards: 5, lossDown: false, nextDown: 2 });
    expect(enforced(context([call('illegal_touching', { reason: 'eligible_out_of_bounds' })], { startDown: 2 })))
      .toMatchObject({ spotX: 60, yards: 0, lossDown: true, nextDown: 3 });
  });

  it.each(['illegal_handoff', 'illegal_bat', 'illegal_kick'] as const)
    ('%s has the required pre-possession-change loss of down', kind => {
      expect(enforced(context([call(kind)], { startDown: 4 })))
        .toMatchObject({ lossDown: true, possession: 'D', nextDown: 1 });
    });

  it.each(['false_start', 'illegal_snap', 'encroachment', 'neutral_zone_infraction', 'delay_of_game'] as const)
    ('%s preserves the unplayed down', kind => {
      expect(enforced(context([call(kind, { against: kind === 'encroachment' || kind === 'neutral_zone_infraction' ? 'D' : 'O',
        phase: 'pre_snap', spotX: 60 })], { startDown: 3 })))
        .toMatchObject({ nextDown: 3, replayDown: true, nullifiesPlay: true, lossDown: false });
    });

  it('offside earns a first down only if its five yards reach the line to gain', () => {
    expect(enforced(context([call('offside', { against: 'D' })], { startDown: 3, startDistance: 6 })))
      .toMatchObject({ spotX: 65, nextDown: 3, nextDistance: 1, autoFirst: false });
    expect(enforced(context([call('offside', { against: 'D' })], { startDown: 3, startDistance: 5 })))
      .toMatchObject({ spotX: 65, nextDown: 1, nextDistance: 10, autoFirst: false });
  });

  it('fifteen versus minor five enforces the major at previous spot without a decline election', () => {
    const found = resolveLivePenalties(context([call('chop_block', { spotX: 66 }), call('offside', { against: 'D', yards: 5, autoFirst: false })],
      { result: result({ endX: 85, yards: 25 }) }));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ id: 'major:0', spotX: 45, yards: 15, callIndices: [0] });
  });

  it('fifteen versus a five-yard automatic-first-down foul offsets instead', () => {
    const found = resolveLivePenalties(context([call('chop_block'), call('illegal_contact', { against: 'D', yards: 5 })]));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 60, replayDown: true });
  });

  it('clean hands preserves an interception after a return hold, assessing ten in the return direction', () => {
    const r = result({ possession: 'D', turnover: true, endX: 35, yards: 0,
      segments: [{ team: 'O', carrier: 'qb', how: 'snap', startX: 60, endX: 55, end: 'pass' },
        { team: 'D', carrier: 'db', how: 'interception', startX: 75, endX: 35, end: 'dead' }] });
    const found = resolveLivePenalties(context([call('opi', { possessionChanges: 0 }),
      call('holding', { against: 'D', spotX: 45, possessionChanges: 1, possessionTeam: 'D', playPhase: 'run' })], { result: r }));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ id: 'clean-hands', spotX: 55, yards: 10,
      possession: 'D', nextDown: 1, preserveBeforeChangeOfPossession: true });
  });

  it('both teams fouling after the interception offset at the possessing team foul enforcement spot', () => {
    const r = result({ possession: 'D', turnover: true, endX: 35, yards: 0 });
    const found = resolveLivePenalties(context([
      call('holding', { against: 'D', spotX: 45, possessionChanges: 1, playPhase: 'run' }),
      call('defensive_holding', { against: 'O', spotX: 40, possessionChanges: 1, playPhase: 'run' }),
    ], { result: r }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 45, possession: 'D',
      yards: 0, nextDown: 1, replayDown: false, preserveBeforeChangeOfPossession: true });
  });

  it('post-change defensive holding recognizes the original offense as the current defense', () => {
    expect(enforced(context([call('defensive_holding', { against: 'O', spotX: 50, possessionChanges: 1, playPhase: 'run' })],
      { result: result({ possession: 'D', turnover: true, endX: 35 }) })))
      .toMatchObject({ spotX: 30, yards: 5, possession: 'D', nextDown: 1, autoFirst: true });
  });

  it('post-possession end-zone advance with an end-zone foul is a safety for original offense', () => {
    expect(enforced(context([call('holding', { against: 'D', spotX: 111, possessionChanges: 1,
      impetusTeam: 'O', attemptedAdvance: true, playPhase: 'run' })],
    { result: result({ possession: 'D', turnover: true, endX: 112 }) })))
      .toMatchObject({ safety: true, safetyTeam: 'O', spotX: 110, possession: 'D' });
  });

  it('a touchback with no attempted advance enforces an end-zone return foul at the twenty', () => {
    expect(enforced(context([call('holding', { against: 'D', spotX: 111, possessionChanges: 1,
      impetusTeam: 'O', attemptedAdvance: false, playPhase: 'run' })],
    { result: result({ possession: 'D', turnover: true, endX: 112 }) })))
      .toMatchObject({ safety: false, spotX: 100, yards: 10, possession: 'D' });
  });

  it('the momentum exception keeps enforcement at the established possession spot', () => {
    expect(enforced(context([call('holding', { against: 'D', spotX: 111, possessionChanges: 1,
      momentumSpotX: 107, playPhase: 'run' })], { result: result({ possession: 'D', turnover: true, endX: 112 }) })))
      .toMatchObject({ safety: false, spotX: 108.5, yards: 1.5, possession: 'D' });
  });

  it('offensive personal foul cannot erase the interception used to escape its penalty', () => {
    const found = resolveLivePenalties(context([call('unnecessary_roughness', { possessionChanges: 0, spotX: 62 })],
      { result: result({ possession: 'D', turnover: true, endX: 45 }) }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ id: 'dead-ball:0', possession: 'D', spotX: 30, nextDown: 1, preservesPlay: true });
  });

  it('an original offensive personal foul preserves the defensive takeaway even after its return fumble', () => {
    const r = result({ possession: 'O', endX: 65,
      segments: [{ team: 'O', carrier: 'qb', how: 'snap', startX: 60, endX: 55, end: 'pass' },
        { team: 'D', carrier: 'db', how: 'interception', startX: 75, endX: 65, end: 'fumble' },
        { team: 'O', carrier: 'te', how: 'recovery', startX: 65, endX: 65, end: 'dead' }] });
    const found = resolveLivePenalties(context([call('unnecessary_roughness', { possessionChanges: 0 })], { result: r }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ id: 'retain-takeaway:0', possession: 'D', spotX: 60, nextDown: 1 });
  });

  it('defensive personal foul during a touchdown retains the score and carries fifteen onto the Try', () => {
    const found = resolveLivePenalties(context([call('roughing_passer', { against: 'D', playPhase: 'pass' })], {
      result: result({ outcome: 'touchdown', endX: 110, score: { team: 'O', kind: 'TD' } }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId)).toMatchObject({
      id: 'carryover:0', nullifiesPlay: false, preservesPlay: true,
      carryover: [{ target: 'try', against: 'D', yards: 15, callIndices: [0] }],
    });
  });

  it('personal foul during the opponent return touchdown carries to the Try without erasing return score', () => {
    const found = resolveLivePenalties(context([call('unnecessary_roughness', { against: 'O', possessionChanges: 1 })], {
      result: result({ possession: 'D', turnover: true, endX: 10, score: { team: 'D', kind: 'TD' } }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId)).toMatchObject({ preservesPlay: true,
      carryover: [{ target: 'try', against: 'O', yards: 15 }] });
  });

  it('a successful Try personal-foul election preserves the points and carries to kickoff', () => {
    const found = resolveLivePenalties(context([call('unnecessary_roughness', { against: 'D' })], {
      isTry: true, los: 108, startDistance: 2,
      result: result({ endX: 110, score: { team: 'O', kind: 'TD' }, outcome: 'touchdown' }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId)?.carryover)
      .toEqual([{ target: 'kickoff', against: 'D', yards: 15, callIndices: [0] }]);
  });

  it('dead-ball offensive taunting after achieving first down sets first and ten after enforcement', () => {
    expect(enforced(context([call('taunting', { spotX: 75 })], { result: result({ endX: 75, yards: 15 }) })))
      .toMatchObject({ spotX: 60, nextDown: 1, nextDistance: 10, preservesPlay: true, nullifiesPlay: false });
  });

  it('between-downs offensive conduct after achieving first down leaves first and twenty-five', () => {
    const found = resolveLivePenalties(context([call('unsportsmanlike_conduct', { phase: 'between_downs', t: 7 })],
      { result: result({ endX: 75, yards: 15 }) }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ spotX: 60, nextDown: 1, nextDistance: 25, nullifiesPlay: false });
  });

  it('between-downs conduct is enforced separately after the live holding election', () => {
    const found = resolveLivePenalties(context([call('holding', { spotX: 64 }),
      call('unsportsmanlike_conduct', { against: 'D', phase: 'between_downs', t: 7 })],
    { result: result({ endX: 85, yards: 25 }) }));
    expect(found.options.find(o => o.id === 'enforce:0+between:1'))
      .toMatchObject({ callIndices: [0, 1], spotX: 69, nextDown: 1, nextDistance: 10, nullifiesPlay: true });
    expect(found.options.some(o => o.kind === 'offset')).toBe(false);
  });

  it('opposing dead-ball fouls offset at the succeeding spot and the completed down counts', () => {
    const found = resolveLivePenalties(context([call('taunting'), call('taunting', { against: 'D' })], { startDown: 2 }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 65, nextDown: 3,
      nextDistance: 5, replayDown: false, nullifiesPlay: false, preservesPlay: true });
  });

  it('accepting a loss-of-down foul while declining its distance remains a legal distinct election', () => {
    const found = resolveLivePenalties(context([call('illegal_forward_pass')], { startDown: 3 }));
    expect(found.options.find(o => o.acceptedWithoutDistance)).toMatchObject({
      spotX: 60, yards: 0, nextDown: 4, lossDown: true, replayDown: false, callIndices: [0],
    });
  });

  it('DPI plus the personal foul for that same act can both be enforced, unlike independent flags', () => {
    const found = resolveLivePenalties(context([call('dpi', { id: 'dpi1', spotX: 80 }),
      call('facemask', { id: 'face1', against: 'D', pairedWith: 'dpi1', spotX: 80 })]));
    expect(found.options.find(o => o.id === 'paired:0:1'))
      .toMatchObject({ callIndices: [0, 1], spotX: 95, yards: 35, autoFirst: true });
    const separate = resolveLivePenalties(context([call('dpi', { id: 'dpi1', spotX: 80 }),
      call('facemask', { id: 'face1', against: 'D', spotX: 80 })]));
    expect(separate.options.some(o => o.callIndices.length > 1)).toBe(false);
  });

  it('disqualification survives a declined distance penalty', () => {
    const found = resolveLivePenalties(context([call('disqualification', { against: 'O', playerId: 'ejected', disqualify: true })],
      { result: result({ possession: 'D', turnover: true }) }));
    expect(found.options.every(o => o.disqualifiedPlayerIds?.includes('ejected'))).toBe(true);
  });

  it('scoring-team dead-ball taunting leaves its touchdown and carries the penalty onto the Try', () => {
    const found = resolveLivePenalties(context([call('taunting', { against: 'O' })], {
      result: result({ score: { team: 'O', kind: 'TD' }, outcome: 'touchdown', endX: 110 }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId)).toMatchObject({ preservesPlay: true,
      carryover: [{ target: 'try', against: 'O', yards: 15 }] });
  });

  it('a scorer dead-ball foul disregards the opponent ordinary live foul and preserves the touchdown', () => {
    const found = resolveLivePenalties(context([call('taunting', { against: 'O' }),
      call('illegal_contact', { against: 'D', possessionChanges: 0 })], {
      result: result({ score: { team: 'O', kind: 'TD' }, outcome: 'touchdown', endX: 110 }),
    }));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ preservesPlay: true, nullifiesPlay: false,
      carryover: [{ target: 'try', against: 'O', yards: 15, callIndices: [0] }] });
  });

  it('a scorer dead-ball personal foul and opponent live personal foul offset after the touchdown', () => {
    const found = resolveLivePenalties(context([call('taunting', { against: 'O' }),
      call('roughing_passer', { against: 'D' })], {
      result: result({ score: { team: 'O', kind: 'TD' }, outcome: 'touchdown', endX: 110 }),
    }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', preservesPlay: true, nullifiesPlay: false, replayDown: false });
  });

  it('a late defensive dead-ball personal foul leaves the ordinary offensive foul behind and carries to next kickoff', () => {
    const found = resolveLivePenalties(context([call('holding', { possessionChanges: 0 }),
      call('unnecessary_roughness', { against: 'D', phase: 'dead_ball' })], { endOfHalf: true }));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ preservesPlay: true, nullifiesPlay: false,
      carryover: [{ target: 'kickoff', against: 'D', yards: 15, callIndices: [1] }] });
  });

  it('Try OPI on a successful attempt cancels points and requires a retry', () => {
    const found = resolveLivePenalties(context([call('opi', { spotX: 109 })], {
      isTry: true, los: 108, startDistance: 2,
      result: result({ endX: 110, score: { team: 'O', kind: 'TD' }, outcome: 'touchdown' }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ tryDisposition: 'retry', tryScore: null, spotX: 98 });
  });

  it('Try OPI on an unsuccessful attempt gives the defense a decline with no free replay', () => {
    const found = resolveLivePenalties(context([call('opi', { spotX: 109 })], {
      isTry: true, los: 108, startDistance: 2, result: result({ endX: 109, yards: 1 }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ id: 'decline', tryDisposition: 'failed', tryScore: null });
  });

  it('Try selects the actual loss-of-down foul over an OPI distance penalty', () => {
    const found = resolveLivePenalties(context([call('opi', { spotX: 109 }), call('illegal_forward_pass', { spotX: 107 })], {
      isTry: true, los: 108, startDistance: 2,
      result: result({ endX: 110, score: { team: 'O', kind: 'TD' }, outcome: 'touchdown' }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ callIndices: [1], lossDown: true, tryDisposition: 'failed', tryScore: null });
  });

  it('Try own-end-zone holding can award the defense its one point even on an otherwise failed attempt', () => {
    const found = resolveLivePenalties(context([call('holding', { spotX: 8 })], {
      isTry: true, los: 108, startDistance: 2, result: result({ endX: 107, yards: -1 }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ tryDisposition: 'stands', tryScore: { team: 'D', points: 1 }, safety: true });
  });

  it('Try defensive end-zone DPI provides the one-yard retry and a distance-declined retry election', () => {
    const found = resolveLivePenalties(context([call('dpi', { spotX: 111 })], {
      isTry: true, los: 108, startDistance: 2, result: result({ outcome: 'incomplete', endX: 112, yards: 0 }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ tryDisposition: 'retry', tryScore: null, spotX: 109 });
    expect(found.options.find(o => o.acceptedWithoutDistance))
      .toMatchObject({ tryDisposition: 'retry', tryScore: null, spotX: 108 });
  });

  it('Try successful defensive ordinary foul preserves two points with kickoff carryover, but DPI has no such award', () => {
    const r = result({ outcome: 'touchdown', endX: 110, score: { team: 'O', kind: 'TD' } });
    const ordinary = resolveLivePenalties(context([call('defensive_holding', { against: 'D' })], {
      isTry: true, los: 108, startDistance: 2, result: r,
    }));
    expect(ordinary.options.find(o => o.id === ordinary.recommendedId)).toMatchObject({
      tryDisposition: 'stands', tryScore: { team: 'O', points: 2 },
      carryover: [{ target: 'kickoff', against: 'D', yards: 5 }],
    });
    const dpi = resolveLivePenalties(context([call('dpi', { spotX: 109 })], {
      isTry: true, los: 108, startDistance: 2, result: r,
    }));
    expect(dpi.options.find(o => o.id === dpi.recommendedId)).toMatchObject({ id: 'decline', tryScore: { team: 'O', points: 2 } });
    expect(dpi.options.every(o => !o.carryover?.length)).toBe(true);
  });

  it('Try an original offensive personal foul on a failed attempt carries to kickoff', () => {
    const found = resolveLivePenalties(context([call('unnecessary_roughness')], {
      isTry: true, los: 108, startDistance: 2, result: result({ endX: 107, yards: -1 }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ tryDisposition: 'failed', tryScore: null,
        carryover: [{ target: 'kickoff', against: 'O', yards: 15 }] });
  });

  it('Try the defense can keep its two-point return rather than enforce an original offensive loss-of-down foul', () => {
    const found = resolveLivePenalties(context([call('illegal_forward_pass')], {
      isTry: true, los: 108, startDistance: 2,
      result: result({ possession: 'D', turnover: true, endX: 10, score: { team: 'D', kind: 'TD' } }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ id: 'decline', tryDisposition: 'stands', tryScore: { team: 'D', points: 2 } });
  });

  it('Try the original defense cannot keep a return score after its own pre-interception foul', () => {
    const found = resolveLivePenalties(context([call('dpi', { possessionChanges: 0, spotX: 109 })], {
      isTry: true, los: 108, startDistance: 2,
      result: result({ possession: 'D', turnover: true, endX: 10, score: { team: 'D', kind: 'TD' } }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ id: 'enforce:0', tryDisposition: 'retry', tryScore: null });
  });

  it('Try a return-team hold cancels its own return score and ends the attempt', () => {
    const found = resolveLivePenalties(context([call('holding', { against: 'D', possessionChanges: 1, spotX: 50, playPhase: 'run' })], {
      isTry: true, los: 108, startDistance: 2,
      result: result({ possession: 'D', turnover: true, endX: 10, score: { team: 'D', kind: 'TD' } }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ tryDisposition: 'failed', tryScore: null, nullifiesPlay: true });
  });

  it.each([
    [0, 0, 'retry'], [1, 0, 'retry'], [0, 1, 'failed'], [1, 1, 'failed'],
  ] as const)('Try double fouls with O phase %s and D phase %s resolve as %s rather than ordinary clean hands', (oPhase, dPhase, disposition) => {
    const found = resolveLivePenalties(context([
      call('unnecessary_roughness', { against: 'O', possessionChanges: oPhase }),
      call('unnecessary_roughness', { against: 'D', possessionChanges: dPhase }),
    ], { isTry: true, los: 108, startDistance: 2,
      result: result({ possession: 'D', turnover: true, endX: 10, score: { team: 'D', kind: 'TD' } }) }));
    expect(found.options).toHaveLength(1);
    expect(found.options[0]).toMatchObject({ tryDisposition: disposition, tryScore: null });
  });

  it('declining a whistled false start cannot consume the unplayed down', () => {
    const found = resolveLivePenalties(context([call('false_start', { phase: 'pre_snap', spotX: 60 })], {
      startDown: 3, result: result({ duration: 0, endX: 60, yards: 0 }),
    }));
    expect(found.options[0]).toMatchObject({ nextDown: 3, nextDistance: 10, replayDown: true, nullifiesPlay: true });
    expect(found.options.find(o => o.id === found.recommendedId)).toMatchObject({ id: 'enforce:0', spotX: 55, nextDown: 3 });
  });

  it('half-distances a false start at the 4 even when the shotgun QB is aligned in his end zone', () => {
    // Game seed 108 (rosters seed 105): the blocked snap still records the
    // QB's snap segment at his alignment, five yards behind the ball.
    const los = 13.94;
    expect(enforced(context([call('false_start', { phase: 'pre_snap', spotX: los, yards: 5, enforcement: 'previous' })], {
      los, result: result({ outcome: 'timeout', duration: 0, endX: los, yards: 0,
        segments: [{ team: 'O', carrier: 'QB', how: 'snap', startX: los - 5, endX: los - 5, end: 'live' }] }),
    }))).toMatchObject({ safety: false, spotX: los - (los - 10) / 2, yards: (los - 10) / 2, nextDown: 1, replayDown: true });
  });

  it('a false start at the 3 is half the distance, even with a back standing in the end zone', () => {
    // The blocked snap's built result sits with a back behind the goal line.
    const option = enforced(context([call('false_start', { phase: 'pre_snap', spotX: 12.6, yards: 5 })], {
      los: 12.6, result: result({ duration: 0, endX: 5.6, yards: 0 }),
    }));
    expect(option).toMatchObject({ safety: false, nextDown: 1 });
    expect(option.spotX).toBeCloseTo(11.3);
    expect(option.nextDistance).toBeCloseTo(11.3);
  });

  it('the achieved full-body grounding assessment overrides a release-center shortcut', () => {
    expect(enforced(context([call('intentional_grounding', { spotX: 9.8, basicSpotX: 10.2, penaltySafety: false })], { los: 15 })))
      .toMatchObject({ safety: false, spotX: 10.2, lossDown: true });
    expect(enforced(context([call('intentional_grounding', { spotX: 10.2, penaltySafety: true })], { los: 15 })))
      .toMatchObject({ safety: true, safetyTeam: 'D', spotX: 10 });
  });

  it.each(['second_forward_pass', 'returned_behind_line'] as const)
    ('%s behind the passer goal is a safety even with part of his body in the field', reason => {
      expect(enforced(context([call('illegal_forward_pass', { reason, spotX: 9.8, penaltySafety: false,
        enforcement: 'previous' })], { los: 15 })))
        .toMatchObject({ safety: true, safetyTeam: 'D', spotX: 10, yards: 0, lossDown: true });
    });

  it('a field-side illegal-pass release receives its ordinary penalty regardless of a grounding-style body flag', () => {
    expect(enforced(context([call('illegal_forward_pass', { reason: 'second_forward_pass', spotX: 10.2,
      penaltySafety: true, enforcement: 'previous' })], { los: 15 })))
      .toMatchObject({ safety: false, spotX: 12.5, yards: 2.5, lossDown: true });
  });

  it('does not invent an exact no-safety grounding spot from a contradictory center-only boundary fact', () => {
    const found = resolveLivePenalties(context([call('intentional_grounding', { spotX: 9.8, penaltySafety: false })], { los: 15 }));
    expect(found.status).toBe('unsupported');
    expect(found.reason).toMatch(/release spot/);
  });

  it('a returner illegal handoff is five from its spot without loss of down or original-line dependence', () => {
    expect(enforced(context([call('illegal_handoff', { against: 'D', possessionChanges: 1, spotX: 40 })], {
      result: result({ possession: 'D', turnover: true, endX: 20 }),
    }))).toMatchObject({ spotX: 45, yards: 5, possession: 'D', nextDown: 1, lossDown: false });
  });

  it('clean-hands safety enforcement replays the previous down rather than awarding a safety', () => {
    const found = resolveLivePenalties(context([call('opi', { possessionChanges: 0 }),
      call('holding', { against: 'D', possessionChanges: 1, spotX: 111,
        impetusTeam: 'O', attemptedAdvance: true })], {
      startDown: 3, result: result({ possession: 'D', turnover: true, endX: 112 }),
    }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 60, possession: 'O', nextDown: 3,
      replayDown: true, safety: false });
  });

  it('a double post-interception foul which would normally be safety instead leaves the ball at the one', () => {
    const found = resolveLivePenalties(context([
      call('holding', { against: 'D', possessionChanges: 1, spotX: 111,
        impetusTeam: 'O', attemptedAdvance: true }),
      call('defensive_holding', { against: 'O', possessionChanges: 1, spotX: 111,
        impetusTeam: 'O', attemptedAdvance: true }),
    ], { result: result({ possession: 'D', turnover: true, endX: 112 }) }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', spotX: 109, possession: 'D', nextDown: 1,
      nextDistance: 10, replayDown: false, safety: false });
  });

  it('clean hands is tested before the LAST gain, so a team cannot wash away its earlier foul by recovering a return fumble', () => {
    const r = result({ possession: 'O', turnover: false, endX: 65,
      segments: [{ team: 'O', carrier: 'qb', how: 'snap', startX: 60, endX: 55, end: 'pass' },
        { team: 'D', carrier: 'db', how: 'interception', startX: 75, endX: 65, end: 'fumble' },
        { team: 'O', carrier: 'te', how: 'recovery', startX: 65, endX: 65, end: 'dead' }] });
    const found = resolveLivePenalties(context([call('opi', { possessionChanges: 0 }),
      call('holding', { against: 'D', possessionChanges: 1, spotX: 68 })], { result: r }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', possession: 'O', spotX: 60, replayDown: true });
  });

  it('Try no-COP fifteen-versus-five still requires a retry when the physical attempt failed', () => {
    const found = resolveLivePenalties(context([call('chop_block'),
      call('offside', { against: 'D', yards: 5, autoFirst: false })], {
      isTry: true, los: 108, startDistance: 2, result: result({ endX: 107, yards: -1 }),
    }));
    expect(found.options.find(o => o.id === found.recommendedId))
      .toMatchObject({ tryDisposition: 'retry', tryScore: null, spotX: 93, replayDown: true });
    expect(found.options.every(o => !o.carryover?.length)).toBe(true);
  });

  it('Try opposing after-down taunts do not award a fresh attempt after an unsuccessful try', () => {
    const found = resolveLivePenalties(context([call('taunting'), call('taunting', { against: 'D' })], {
      isTry: true, los: 108, startDistance: 2, result: result({ endX: 107, yards: -1 }),
    }));
    expect(found.options[0]).toMatchObject({ kind: 'offset', tryDisposition: 'failed', tryScore: null });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { BallState } from '../src/sim/types.js';
import { assessForwardPass, fumbleOutOfBounds, fumbleRecovery, passerLoss,
  looseBallBoundaryStep, restrictedRecoveryInOwnEndZone, type FumbleRecoveryFacts } from '../src/sim/ball-rules.js';

afterEach(() => vi.restoreAllMocks());

const recovery = (overrides: Partial<FumbleRecoveryFacts> = {}): FumbleRecoveryFacts => ({
  kind: 'fumble', fumblerId: 'RB', fumblerTeam: 'O', recovererId: 'TE', recovererTeam: 'O',
  fumbleX: 48, recoveryX: 53, down: 4, afterTwoMinuteWarning: false,
  isTry: false, possessionChangedBeforeFumble: false, ...overrides,
});

describe('NFL fumble recovery and advance rights', () => {
  it('kills a fourth-down teammate recovery at the forward-fumble spot', () => {
    expect(fumbleRecovery(recovery())).toEqual({ mayAdvance: false, deadBallX: 48, rule: '8-7-5' });
  });
  it('uses the actual recovery spot when the fourth-down recovery loses ground', () => {
    expect(fumbleRecovery(recovery({ recoveryX: 43 }))).toEqual({ mayAdvance: false, deadBallX: 43, rule: '8-7-5' });
  });
  it.each([1, 2, 3])('preserves ordinary same-team advance on down %i', down => {
    expect(fumbleRecovery(recovery({ down }))).toEqual({ mayAdvance: true });
  });
  it('preserves fourth-down recovery by the actual fumbler', () => {
    expect(fumbleRecovery(recovery({ recovererId: 'RB' }))).toEqual({ mayAdvance: true });
  });
  it('preserves an opponent recovery and return', () => {
    expect(fumbleRecovery(recovery({ recovererId: 'FS', recovererTeam: 'D' }))).toEqual({ mayAdvance: true });
  });
  it('does not apply fourth-down Team A limits after a prior possession change', () => {
    expect(fumbleRecovery(recovery({ possessionChangedBeforeFumble: true }))).toEqual({ mayAdvance: true });
  });
  it('does not apply fourth-down Team A limits to a return-team fumble', () => {
    expect(fumbleRecovery(recovery({ fumblerId: 'CB', fumblerTeam: 'D', recovererId: 'FS', recovererTeam: 'D' })))
      .toEqual({ mayAdvance: true });
  });
  it.each([{ afterTwoMinuteWarning: true }, { isTry: true }])('limits same-team recovery in the late/Try case %j', flags => {
    expect(fumbleRecovery(recovery({ down: 2, ...flags }))).toEqual({ mayAdvance: false, deadBallX: 48, rule: '8-7-6' });
  });
  it('applies the late-half restriction to the return team in its own direction', () => {
    expect(fumbleRecovery(recovery({ down: 2, fumblerId: 'CB', fumblerTeam: 'D', recovererId: 'FS',
      recovererTeam: 'D', fumbleX: 70, recoveryX: 63, possessionChangedBeforeFumble: true,
      afterTwoMinuteWarning: true }))).toEqual({ mayAdvance: false, deadBallX: 70, rule: '8-7-6' });
    expect(fumbleRecovery(recovery({ down: 2, fumblerId: 'CB', fumblerTeam: 'D', recovererId: 'FS',
      recovererTeam: 'D', fumbleX: 70, recoveryX: 75, possessionChangedBeforeFumble: true,
      afterTwoMinuteWarning: true }))).toEqual({ mayAdvance: false, deadBallX: 75, rule: '8-7-6' });
  });
  it('does not convert a muffed backward pass into a restricted fumble', () => {
    expect(fumbleRecovery(recovery({ kind: 'backward_pass', afterTwoMinuteWarning: true, isTry: true })))
      .toEqual({ mayAdvance: true });
  });
});

describe('restricted teammate recovery dead in its own end zone', () => {
  it('is a safety on the team own impetus, from the field or inside the end zone', () => {
    expect(restrictedRecoveryInOwnEndZone({ team: 'O', fumbleX: 12 }))
      .toEqual({ kind: 'safety', scoringTeam: 'D', rule: '11-5-1' });
    expect(restrictedRecoveryInOwnEndZone({ team: 'O', fumbleX: 7, impetusTeam: 'O', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'safety', scoringTeam: 'D', rule: '11-5-1' });
  });
  it('is a touchback on the opponent impetus', () => {
    expect(restrictedRecoveryInOwnEndZone({ team: 'D', fumbleX: 113, impetusTeam: 'O', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'touchback', spotX: 90, rule: '11-6-1' });
  });
  it('returns the ball to the field acquisition spot under the momentum exception', () => {
    expect(restrictedRecoveryInOwnEndZone({ team: 'D', fumbleX: 112, impetusTeam: 'O', momentumSpotX: 109.6 }))
      .toEqual({ kind: 'spot', spotX: 109, rule: '11-5-1' });
  });
  it('does not guess without end-zone impetus and momentum facts', () => {
    expect(restrictedRecoveryInOwnEndZone({ team: 'O', fumbleX: 7 })).toEqual({ kind: 'unresolved', missing: 'impetus_or_momentum' });
    expect(restrictedRecoveryInOwnEndZone({ team: 'O', fumbleX: 7, impetusTeam: 'O' }))
      .toEqual({ kind: 'unresolved', missing: 'impetus_or_momentum' });
  });
});

describe('illegal forward-pass facts', () => {
  it('permits the first ordinary forward pass', () => {
    expect(assessForwardPass({ previousForwardPasses: 0, possessionChangedBeforePass: false, fromBehindLine: true }))
      .toBeNull();
  });
  it('identifies a second behind-line forward pass with previous-spot loss of down', () => {
    expect(assessForwardPass({ previousForwardPasses: 1, possessionChangedBeforePass: false, fromBehindLine: true }))
      .toEqual({ rule: '8-1-2', reason: 'second_forward_pass', enforcement: 'previous', lossDown: true });
  });
  it('identifies a forward pass after COP with spot enforcement and no loss of down', () => {
    expect(assessForwardPass({ previousForwardPasses: 1, possessionChangedBeforePass: true, fromBehindLine: true }))
      .toEqual({ rule: '8-1-2', reason: 'after_change_of_possession', enforcement: 'spot', lossDown: false });
  });
  it('retains the earlier LOS crossing even if the ball returned behind it', () => {
    expect(assessForwardPass({ previousForwardPasses: 0, possessionChangedBeforePass: false,
      fromBehindLine: true, ballPreviouslyBeyondLine: true }))
      .toEqual({ rule: '8-1-2', reason: 'returned_behind_line', enforcement: 'previous', lossDown: true });
  });
  it('does not invent the unsupported beyond-line whole-body ruling', () => {
    expect(assessForwardPass({ previousForwardPasses: 0, possessionChangedBeforePass: false, fromBehindLine: false }))
      .toBeNull();
  });
});

describe('fumble boundary spots', () => {
  it('does not award forward out-of-bounds yardage to the fumbling offense', () => {
    expect(fumbleOutOfBounds({ fumbleX: 48, outX: 53, lastPossessionTeam: 'O' }))
      .toEqual({ kind: 'spot', spotX: 48, possession: 'O', rule: '8-7-3' });
  });
  it('retains a backward out-of-bounds loss', () => {
    expect(fumbleOutOfBounds({ fumbleX: 48, outX: 43, lastPossessionTeam: 'O' }))
      .toEqual({ kind: 'spot', spotX: 43, possession: 'O', rule: '8-7-3' });
  });
  it('uses the return team direction for a forward boundary fumble', () => {
    expect(fumbleOutOfBounds({ fumbleX: 70, outX: 63, lastPossessionTeam: 'D' }))
      .toEqual({ kind: 'spot', spotX: 70, possession: 'D', rule: '8-7-3' });
  });
  it('does not guess an end-zone result without impetus and momentum context', () => {
    expect(fumbleOutOfBounds({ fumbleX: 108, outX: 113, lastPossessionTeam: 'O' }))
      .toEqual({ kind: 'unresolved', rule: '8-7-3', missing: 'impetus_or_momentum' });
  });
  it('awards the defense a touchback when offense supplies end-zone impetus', () => {
    expect(fumbleOutOfBounds({ fumbleX: 108, outX: 113, lastPossessionTeam: 'O',
      impetusTeam: 'O', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'touchback', possession: 'D', spotX: 90, rule: '8-7-3' });
  });
  it('rules safety on a fumble out of the fumbling team own end zone', () => {
    expect(fumbleOutOfBounds({ fumbleX: 8, outX: 6, lastPossessionTeam: 'O',
      impetusTeam: 'O', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'safety', scoringTeam: 'D', rule: '8-7-3' });
  });
  it('does not escape a safety by fumbling from own end zone into the field', () => {
    expect(fumbleOutOfBounds({ fumbleX: 8, outX: 13, lastPossessionTeam: 'O',
      impetusTeam: 'O', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'safety', scoringTeam: 'D', rule: '8-7-3' });
  });
});

function nativeSim(rules: { down?: number; afterTwoMinuteWarning?: boolean; isTry?: boolean } = {}) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(710), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(711), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'ball rule boundary' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 712, audibles: false, ...rules });
  for (const a of sim.agents) {
    a.body.pos = { x: 15, y: 2 + a.idx }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
  }
  sim.t = sim.world.time = 2;
  return sim;
}

function recoverTeammate(sim: PlaySim) {
  const fumbler = sim.slot('RB')!, recoverer = sim.slot('Y')!;
  fumbler.body.pos = { x: 48, y: CENTER_Y };
  sim.ball = { kind: 'held', carrier: fumbler };
  sim.fumble(fumbler, null);
  // Read the method's resulting state; TS otherwise retains our earlier held
  // assignment despite fumble() mutating the discriminated union internally.
  const loose = sim.ball as BallState;
  if (loose.kind !== 'loose') throw new Error('Fumble did not produce loose ball');
  loose.since = sim.t - .3;
  loose.flight = { pos: { x: 53, y: CENTER_Y, z: .2 }, vel: { x: 0, y: 0, z: 0 }, drag: 0 };
  recoverer.body.pos = { x: 53, y: CENTER_Y }; recoverer.downUntil = -1;
  const before = { ...recoverer.pos };
  vi.spyOn(sim.rng, 'chance').mockReturnValue(true);
  (sim as unknown as { updateBall(): void }).updateBall();
  return { recoverer, before };
}

describe('native ball-rule composition', () => {
  it('whistles a fourth-down teammate recovery at the fumble spot without moving the recoverer', () => {
    const sim = nativeSim({ down: 4 });
    const { recoverer, before } = recoverTeammate(sim);
    expect(sim.phase).toBe('dead');
    expect(sim.endSpot?.x).toBe(48);
    expect(recoverer.pos).toEqual(before);
    expect(sim.stats.fumbleRecoveredBy).toBe(recoverer.player.id);
  });
  it('preserves the ordinary teammate recovery and body on second down', () => {
    const sim = nativeSim({ down: 2 });
    const { recoverer, before } = recoverTeammate(sim);
    expect(sim.phase).toBe('live');
    expect(sim.carrier).toBe(recoverer);
    expect(recoverer.pos).toEqual(before);
  });
  it.each([{ afterTwoMinuteWarning: true }, { isTry: true }])('enforces the late/Try recovery restriction %j', facts => {
    const sim = nativeSim({ down: 2, ...facts });
    recoverTeammate(sim);
    expect(sim.phase).toBe('dead');
    expect(sim.endSpot?.x).toBe(48);
  });
  it('calls the second forward pass from the real throw/possession timeline', () => {
    const sim = nativeSim({ down: 2 }), qb = sim.qb, rb = sim.slot('RB')!;
    qb.body.pos = { x: 35, y: CENTER_Y }; rb.body.pos = { x: 36, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: qb };
    sim.throwBall(qb, rb, { x: 10, y: 0, z: 2 }, { x: 36, y: CENTER_Y, z: 1 }, 2.1);
    sim.possess(rb, 'catch');
    sim.throwBall(rb, sim.slot('X')!, { x: 10, y: 0, z: 2 }, { x: 45, y: CENTER_Y, z: 1 }, 2.7);
    expect(sim.penalty).toMatchObject({ kind: 'illegal_forward_pass', against: 'O', playerId: rb.player.id,
      reason: 'second_forward_pass', enforcement: 'previous', lossDown: true });
    expect(sim.events.some(e => e.type === 'illegal_forward_pass')).toBe(true);
  });
  it('calls a forward pass after an actual interception with its distinct rule', () => {
    const sim = nativeSim({ down: 2 }), qb = sim.qb, defender = sim.slot('FS')!;
    qb.body.pos = { x: 35, y: CENTER_Y }; defender.body.pos = { x: 36, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: qb };
    sim.throwBall(qb, sim.slot('X')!, { x: 10, y: 0, z: 2 }, { x: 45, y: CENTER_Y, z: 1 }, 2.7);
    sim.possess(defender, 'interception');
    sim.throwBall(defender, sim.slot('SS')!, { x: -10, y: 0, z: 2 }, { x: 30, y: CENTER_Y, z: 1 }, 2.5);
    expect(sim.penalty).toMatchObject({ kind: 'illegal_forward_pass', against: 'D', playerId: defender.player.id,
      reason: 'after_change_of_possession', enforcement: 'spot', lossDown: false });
  });
});

/** Stage a genuine fumble, then isolate its final flight segment. No recovery,
 * bounce, tackle or clock policy is part of these boundary questions. */
function boundaryFumble(team: 'O' | 'D', fumbleX: number, start: [number, number], velocity: [number, number]) {
  const sim = nativeSim({ down: 2 }), fumbler = team === 'O' ? sim.slot('RB')! : sim.slot('FS')!;
  fumbler.body.pos = { x: fumbleX, y: CENTER_Y }; fumbler.downUntil = -1;
  sim.possession = team;
  sim.ball = { kind: 'held', carrier: fumbler };
  sim.fumble(fumbler, null);
  const loose = sim.ball as BallState;
  if (loose.kind !== 'loose') throw new Error('Missing native fumble');
  loose.flight = { pos: { x: start[0], y: start[1], z: 0 },
    vel: { x: velocity[0], y: velocity[1], z: 0 }, drag: 0 };
  const chance = vi.spyOn(sim.rng, 'chance');
  (sim as unknown as { updateBall(): void }).updateBall();
  expect(chance).not.toHaveBeenCalled();
  return sim;
}

describe('native fumble boundaries and dead-ball rulings', () => {
  it('spots a backward diagonal sideline exit at first crossing, not the post-step point', () => {
    // DT=.05: the flight moves (44.9,.2) -> (43.9,-.2), crossing y=0
    // halfway through at x=44.4. This is behind the original fumble at48.
    const sim = boundaryFumble('O', 48, [44.9, .2], [-20, -8]);
    expect(sim.outcome).toBe('oob');
    expect(sim.endSpot?.x).toBeCloseTo(44.4, 9);
    expect(sim.endSpot?.y).toBe(0);
    expect(sim.endSpot?.x).not.toBeCloseTo(43.9, 9);
    expect(sim.possession).toBe('O');
  });

  it.each([
    ['O', 48, 53, 48], ['O', 48, 43, 43],
    ['D', 70, 63, 70], ['D', 70, 75, 75],
  ] as const)('keeps the %s fumble at%s with boundary%s at its legal spot%s', (team, fumbleX, exitX, spotX) => {
    const sim = boundaryFumble(team, fumbleX, [exitX, .1], [0, -4]);
    expect(sim.phase).toBe('dead');
    expect(sim.outcome).toBe('oob');
    expect(sim.possession).toBe(team);
    expect(sim.endSpot?.x).toBe(spotX);
    expect(sim.events.filter(e => e.type === 'out_of_bounds')).toHaveLength(1);
  });

  it.each([
    ['O', 108, 113, 'D'], ['D', 12, 7, 'O'],
  ] as const)('awards the opponent a touchback for %s field-origin end-zone boundary fumble', (team, fumbleX, exitX, receivingTeam) => {
    const sim = boundaryFumble(team, fumbleX, [exitX, FIELD_WIDTH - .1], [0, 4]);
    expect(sim.phase).toBe('dead');
    expect(sim.outcome).toBe('touchback');
    expect(sim.possession).toBe(receivingTeam);
    expect(sim.stats.fumbleLost).toBe(true);
    expect(sim.buildResult().score).toBeNull();
    expect(sim.events.filter(e => e.type === 'touchback')).toHaveLength(1);
  });

  it.each([
    ['O', 12, 8, 'D'], ['D', 108, 112, 'O'],
  ] as const)('awards a safety against %s when its field-origin fumble exits its own end zone', (team, fumbleX, exitX, scoringTeam) => {
    const sim = boundaryFumble(team, fumbleX, [exitX, .1], [0, -4]);
    expect(sim.phase).toBe('dead');
    expect(sim.outcome).toBe('safety');
    expect(sim.buildResult().score).toEqual({ kind: 'safety', team: scoringTeam });
    expect(sim.events.filter(e => e.type === 'safety')).toHaveLength(1);
  });

  it('rules a restricted teammate recovery in its own end zone dead as a safety when field-origin facts establish impetus', () => {
    const sim = nativeSim({ down: 4 }), fumbler = sim.slot('RB')!, recoverer = sim.slot('Y')!;
    fumbler.body.pos = { x: 12, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: fumbler };
    sim.fumble(fumbler, null);
    recoverer.body.pos = { x: 8, y: CENTER_Y };
    sim.possess(recoverer, 'recovery');
    expect(sim.phase).toBe('dead');
    expect(sim.outcome).toBe('safety');
    expect(sim.buildResult().score).toEqual({ kind: 'safety', team: 'D' });
    expect(sim.events.filter(e => e.type === 'recovery')).toHaveLength(1);
  });

  it('rules a late fourth-down teammate recovery of an end-zone strip sack a safety on Team A impetus', () => {
    // Game seed 111 (rosters seed 109): 4th-and-25 at the A-5 with 0:49 left,
    // the shotgun QB is stripped at x=7.0 and a guard falls on it at x=7.5.
    const sim = nativeSim({ down: 4, afterTwoMinuteWarning: true }), fumbler = sim.slot('RB')!, recoverer = sim.slot('Y')!;
    fumbler.body.pos = { x: 7, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: fumbler };
    sim.fumble(fumbler, null);
    recoverer.body.pos = { x: 7.5, y: CENTER_Y };
    sim.possess(recoverer, 'recovery');
    expect(sim.phase).toBe('dead');
    expect(sim.outcome).toBe('safety');
    expect(sim.endSpot?.x).toBe(7);
    expect(recoverer.pos).toEqual({ x: 7.5, y: CENTER_Y });
    expect(sim.buildResult().score).toEqual({ kind: 'safety', team: 'D' });
    expect(sim.events.find(e => e.type === 'safety')?.note).toBe('8-7-6/11-5-1: teammate recovery dead in own end zone');
  });

  it('rules a restricted teammate recovery in the end zone a touchback when the opponent supplied the impetus', () => {
    const sim = nativeSim({ down: 2, afterTwoMinuteWarning: true }), fumbler = sim.slot('FS')!, recoverer = sim.slot('SS')!;
    fumbler.body.pos = { x: 113, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: fumbler };
    sim.possession = 'D';
    sim.fumble(fumbler, null);
    // As after an end-zone interception: the pass, not the defense, put the ball there.
    Object.assign(sim.ball, { impetusTeam: 'O', momentumExceptionExcluded: true });
    recoverer.body.pos = { x: 112, y: CENTER_Y };
    sim.possess(recoverer, 'recovery');
    expect(sim.outcome).toBe('touchback');
    expect(sim.possession).toBe('D');
    expect(sim.buildResult().score).toBeNull();
    expect(sim.stats.fumbleLost).toBeFalsy();
  });

  it('rules on the recorded impetus, without the momentum exception, and records the gap when restricted own-end-zone recovery lacks the facts', () => {
    const sim = nativeSim({ down: 4 }), fumbler = sim.slot('RB')!, recoverer = sim.slot('Y')!;
    fumbler.body.pos = { x: 8, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: fumbler };
    sim.fumble(fumbler, null);
    // A restored tape without acquisition history.
    Object.assign(sim.ball, { impetusTeam: undefined, momentumExceptionExcluded: undefined });
    recoverer.body.pos = { x: 13, y: CENTER_Y };
    sim.possess(recoverer, 'recovery');
    expect(sim.outcome).toBe('safety');
    expect(sim.buildResult().score).toEqual({ kind: 'safety', team: 'D' });
    expect([...sim.ruleLimitations]).toContain('8-7-5: end-zone recovery lacks impetus/momentum facts; ruled on recorded impetus');
  });
});


describe('full-body forward-pass boundary', () => {
  it('requires both entire body and ball beyond the line at release', () => {
    const f = { previousForwardPasses: 0, possessionChangedBeforePass: false };
    expect(assessForwardPass({ ...f, entireBodyBeyondLine: true, ballBeyondLine: true }))
      .toEqual({ rule: '8-1-2', reason: 'beyond_line', enforcement: 'spot', lossDown: true });
    expect(assessForwardPass({ ...f, entireBodyBeyondLine: false, ballBeyondLine: true, fromBehindLine: true })).toBeNull();
    expect(assessForwardPass({ ...f, entireBodyBeyondLine: true, ballBeyondLine: false, fromBehindLine: true })).toBeNull();
  });
  it('does not replace the after-possession-change penalty with loss of down', () => {
    expect(assessForwardPass({ previousForwardPasses: 0, possessionChangedBeforePass: true,
      entireBodyBeyondLine: true, ballBeyondLine: true }))
      .toMatchObject({ reason: 'after_change_of_possession', lossDown: false });
  });
  it('calls a real fully-beyond release and preserves a body straddling the line', () => {
    const sim = nativeSim(), qb = sim.qb;
    qb.body.pos = { x: 42, y: CENTER_Y }; sim.ball = { kind: 'held', carrier: qb };
    sim.throwBall(qb, sim.slot('X')!, { x: 10, y: 0, z: 2 }, { x: 50, y: CENTER_Y, z: 1 }, 3);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_forward_pass', reason: 'beyond_line' }));
    const legal = nativeSim(), passer = legal.qb;
    passer.body.pos = { x: 40, y: CENTER_Y }; legal.ball = { kind: 'held', carrier: passer };
    legal.throwBall(passer, legal.slot('X')!, { x: 10, y: 0, z: 2 }, { x: 50, y: CENTER_Y, z: 1 }, 3);
    expect(legal.penalties.some(p => p.kind === 'illegal_forward_pass')).toBe(false);
  });
});

describe('endzone-origin impetus and original momentum facts', () => {
  it('preserves an established own-endzone original-momentum exception without a five-yard limit', () => {
    expect(fumbleOutOfBounds({ fumbleX: 113, outX: 116, lastPossessionTeam: 'D',
      impetusTeam: 'O', momentumSpotX: 102 }))
      .toEqual({ kind: 'spot', possession: 'D', spotX: 102, rule: '8-7-3' });
  });
  it('does not restore the momentum spot automatically when an endzone-origin fumble exits in the field', () => {
    expect(fumbleOutOfBounds({ fumbleX: 113, outX: 108, lastPossessionTeam: 'D',
      impetusTeam: 'O', momentumSpotX: 102 }))
      .toEqual({ kind: 'unresolved', rule: '8-7-3', missing: 'impetus_or_momentum' });
  });
  it('uses the proven impetus when an endzone-origin fumble exits into the field', () => {
    expect(fumbleOutOfBounds({ fumbleX: 113, outX: 108, lastPossessionTeam: 'D',
      impetusTeam: 'O', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'touchback', possession: 'D', spotX: 90, rule: '8-7-3' });
    expect(fumbleOutOfBounds({ fumbleX: 113, outX: 108, lastPossessionTeam: 'D',
      impetusTeam: 'D', momentumExceptionExcluded: true }))
      .toEqual({ kind: 'safety', scoringTeam: 'O', rule: '8-7-3' });
  });
});

describe('airborne loose-ball boundary history', () => {
  const p = (x: number, y: number, z = 2) => ({ x, y, z });
  it('does not whistle an airborne sideline-plane crossing', () => {
    const result = looseBallBoundaryStep(undefined, p(44.9, .2), p(43.9, -.2), false);
    expect(result).toEqual({ outside: true, dead: false, exit: { x: 44.4, y: 0 } });
  });
  it('retains the crossing until actual outside ground contact', () => {
    const air = looseBallBoundaryStep(undefined, p(44.9, .2), p(43.9, -.2), false);
    const dead = looseBallBoundaryStep(air.exit, p(43.9, -.2), p(42.9, -.6, 0), true);
    expect(dead).toEqual({ outside: true, dead: true, exit: { x: 44.4, y: 0 } });
  });
  it('allows airborne reentry and replaces the old spot on a subsequent exit', () => {
    const reentered = looseBallBoundaryStep({ x: 44.4, y: 0 }, p(43.9, -.2), p(43, .2), false);
    expect(reentered).toEqual({ outside: false, dead: false });
    const next = looseBallBoundaryStep(reentered.exit, p(43, .2), p(42, -.2, 0), true);
    expect(next).toEqual({ outside: true, dead: true, exit: { x: 42.5, y: 0 } });
  });
  it('supports actual ground rolling contact and endline exits', () => {
    expect(looseBallBoundaryStep(undefined, p(119.5, 20, 0), p(120.5, 20, 0), true))
      .toEqual({ outside: true, dead: true, exit: { x: 120, y: 20 } });
  });
  it('does not fabricate an exit for a historyless ball already outside', () => {
    expect(looseBallBoundaryStep(undefined, p(40, -2), p(39, -3, 0), true))
      .toEqual({ outside: true, dead: true });
  });
});

describe('native airborne loose-ball and momentum controls', () => {
  function airborneFumble() {
    const sim = nativeSim(), rb = sim.slot('RB')!;
    rb.body.pos = { x: 48, y: CENTER_Y }; sim.ball = { kind: 'held', carrier: rb }; sim.fumble(rb, null);
    const ball = sim.ball as BallState;
    if (ball.kind !== 'loose') throw new Error('Native fumble missing');
    ball.flight = { pos: { x: 44.9, y: .2, z: 2 }, vel: { x: -20, y: -8, z: 0 }, drag: 0 };
    (sim as unknown as { updateBall(): void }).updateBall();
    return { sim, ball };
  }
  it('keeps an actual airborne sideline exit live until outside ground contact and retains its crossing spot', () => {
    const { sim, ball } = airborneFumble();
    expect(sim.phase).toBe('live'); expect(sim.ball.kind).toBe('loose');
    expect(ball.boundaryExit?.x).toBeCloseTo(44.4, 9);
    ball.flight.pos.z = .01; ball.flight.vel = { x: -20, y: -8, z: -1 };
    (sim as unknown as { updateBall(): void }).updateBall();
    expect(sim.phase).toBe('dead'); expect(sim.outcome).toBe('oob');
    expect(sim.endSpot?.x).toBeCloseTo(44.4, 9);
  });
  it('permits actual airborne reentry and discards the obsolete exit', () => {
    const { sim, ball } = airborneFumble();
    ball.flight.vel = { x: -20, y: 8, z: 0 };
    (sim as unknown as { updateBall(): void }).updateBall();
    expect(sim.phase).toBe('live'); expect(ball.flight.pos.y).toBeGreaterThan(0);
    expect(ball.boundaryExit).toBeUndefined();
  });
  function acquireDefender(acquisitionX: number, vx: number) {
    const sim = nativeSim(), qb = sim.qb, defender = sim.slot('FS')!;
    qb.body.pos = { x: 35, y: CENTER_Y }; sim.ball = { kind: 'held', carrier: qb };
    sim.throwBall(qb, sim.slot('X')!, { x: 10, y: 0, z: 2 }, { x: acquisitionX, y: CENTER_Y, z: 1 }, 3);
    defender.body.pos = { x: acquisitionX, y: CENTER_Y }; defender.body.vel = { x: vx, y: 0 }; defender.downUntil = -1;
    sim.possess(defender, 'interception');
    return { sim, defender };
  }
  it('returns an original-momentum endzone stop to the field acquisition without a five-yard cutoff', () => {
    const { sim, defender } = acquireDefender(102, 4);
    defender.body.pos.x = 112;
    sim.finishCarry('tackle', defender.pos);
    expect(sim.outcome).toBe('tackle'); expect(sim.endSpot?.x).toBe(102);
    expect(sim.buildResult().score).toBeNull();
    expect(sim.events.some(e => e.type === 'momentum')).toBe(true);
  });
  it('spots an inside-one momentum acquisition at the one-yard line', () => {
    const { sim, defender } = acquireDefender(109.6, 4);
    defender.body.pos.x = 112;
    sim.finishCarry('tackle', defender.pos);
    expect(sim.endSpot?.x).toBe(109);
    expect(sim.buildResult().score).toBeNull();
  });
  it('keeps an opponent-impetus acquisition in the endzone a touchback', () => {
    const { sim, defender } = acquireDefender(112, 0);
    sim.finishCarry('tackle', defender.pos);
    expect(sim.outcome).toBe('touchback'); expect(sim.buildResult().score).toBeNull();
  });
  it('does not preserve original momentum after actual inward commanded ground drive', () => {
    const { sim, defender } = acquireDefender(109.6, 2);
    defender.body.pos.x = 109.9;
    vi.spyOn(defender.behavior, 'update').mockReturnValue({ vel: { x: 8, y: 0 }, facing: 0 });
    sim.tick();
    expect(sim.lastStep!.groundImpulse[defender.idx].x).toBeGreaterThan(0);
    defender.body.pos.x = 112;
    sim.finishCarry('tackle', defender.pos);
    expect(sim.outcome).toBe('safety');
    expect(sim.buildResult().score).toEqual({ kind: 'safety', team: 'O' });
  });
});

describe('native backward-pitch boundary continuity', () => {
  it('retains an airborne pitch exit until actual outside ground contact', () => {
    const sim = nativeSim(), from = sim.slot('RB')!, to = sim.slot('Y')!;
    from.downUntil = to.downUntil = -1;
    from.body.pos = { x: 48, y: CENTER_Y }; to.body.pos = { x: 47, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: from }; expect(sim.pitchBall(from, to)).toBe(true);
    const pitch = sim.ball as BallState;
    if (pitch.kind !== 'pitch') throw new Error('Native pitch missing');
    pitch.flight = { pos: { x: 44.9, y: .2, z: 2 }, vel: { x: -20, y: -8, z: 0 }, drag: 0 };
    (sim as unknown as { updateBall(): void }).updateBall();
    expect(sim.phase).toBe('live'); expect(sim.ball.kind).toBe('pitch');
    expect(pitch.boundaryExit?.x).toBeCloseTo(44.4, 9);
    pitch.flight.pos.z = .01; pitch.flight.vel.z = -1;
    (sim as unknown as { updateBall(): void }).updateBall();
    expect(sim.phase).toBe('dead'); expect(sim.outcome).toBe('oob');
    expect(sim.endSpot?.x).toBeCloseTo(44.4, 9);
    expect(sim.stats.fumbles).toEqual([expect.objectContaining({ playerId: from.player.id, team: 'O', lost: false })]);
  });
  it('uses the return team\'s direction for a real backward pitch', () => {
    const sim = nativeSim(), from = sim.slot('FS')!, to = sim.slot('SS')!;
    from.downUntil = to.downUntil = -1;
    from.body.pos = { x: 70, y: CENTER_Y }; to.body.pos = { x: 72, y: CENTER_Y };
    sim.possession = 'D'; sim.ball = { kind: 'held', carrier: from };
    expect(sim.pitchBall(from, to)).toBe(true);
    const pitch = sim.ball as BallState;
    if (pitch.kind !== 'pitch') throw new Error('Native pitch missing');
    expect(pitch.flight.vel.x).toBeGreaterThan(0);
    expect(pitch.intended.x).toBe(72);
    expect(sim.penalties.some(p => p.kind === 'illegal_forward_pass')).toBe(false);
  });
});

describe('native backward-pitch contact with an out-of-bounds person', () => {
  function pitchToContact(receiverY: number) {
    const sim = nativeSim(), from = sim.slot('RB')!, target = sim.slot('Y')!, defender = sim.slot('FS')!;
    from.downUntil = target.downUntil = -1;
    from.body.pos = { x: 48, y: CENTER_Y }; target.body.pos = { x: 47, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: from }; expect(sim.pitchBall(from, target)).toBe(true);
    const pitch = sim.ball as BallState;
    if (pitch.kind !== 'pitch') throw new Error('Missing backward pitch');
    pitch.releaseT = sim.t - .2;
    pitch.flight = { pos: { x: 44.9, y: .2, z: .5 }, vel: { x: -20, y: -8, z: 0 }, drag: 0 };
    defender.downUntil = -1; defender.body.pos = { x: 44.6, y: receiverY };
    (sim as unknown as { updateBall(): void }).updateBall();
    return { sim, defender, from };
  }
  it('ends the backward pass at native ball/person contact before a later plane exit without awarding possession', () => {
    const { sim, defender, from } = pitchToContact(-.1);
    // Selected native swept-reach contact occurs at s=.42/1.16, while
    // the ball is still infield; the later geometric exit is x44.4.
    expect(sim.phase).toBe('dead'); expect(sim.outcome).toBe('oob');
    expect(sim.possession).toBe('O'); expect(sim.carrier).toBeNull();
    expect(sim.endSpot?.x).toBeCloseTo(44.9 - .42 / 1.16, 9);
    expect(sim.endSpot?.x).not.toBeCloseTo(44.4, 9);
    expect(sim.stats.fumbles).toEqual([expect.objectContaining({ playerId: from.player.id, team: 'O', lost: false })]);
    expect(sim.events.some(e => e.type === 'pitch_catch' && e.a === defender.idx)).toBe(false);
    expect(sim.events.some(e => e.type === 'recovery')).toBe(false);
  });
  it('preserves an inbounds opponent collection and its real possession change', () => {
    const { sim, defender, from } = pitchToContact(.3);
    expect(sim.phase).toBe('live'); expect(sim.possession).toBe('D'); expect(sim.carrier).toBe(defender);
    expect(sim.stats.fumbles).toEqual([expect.objectContaining({ playerId: from.player.id, team: 'O', lost: true,
      recoveredBy: defender.player.id })]);
    expect(sim.events.some(e => e.type === 'recovery' && e.a === defender.idx)).toBe(true);
  });
});

describe('passerLoss (Rule 8-1-1, passer losing ball)', () => {
  it('rules a loss during the load a fumble and one during the delivery a pass', () => {
    expect(passerLoss({ lossAt: 1.0, forwardAt: 1.2, controlAtForward: true, tucking: false })).toBe('fumble');
    expect(passerLoss({ lossAt: 1.3, forwardAt: 1.2, controlAtForward: true, tucking: false })).toBe('pass');
    expect(passerLoss({ lossAt: 1.2, forwardAt: 1.2, controlAtForward: true, tucking: false })).toBe('pass');
  });
  it('rules an empty hand, a tuck and a throw never started a fumble', () => {
    expect(passerLoss({ lossAt: 1.3, forwardAt: 1.2, controlAtForward: false, tucking: false })).toBe('fumble');
    expect(passerLoss({ lossAt: 1.3, forwardAt: 1.2, controlAtForward: true, tucking: true })).toBe('fumble');
    expect(passerLoss({ lossAt: 1.3, forwardAt: null, controlAtForward: true, tucking: false })).toBe('fumble');
  });
  it('lets a whistle blown first end the down', () => {
    expect(passerLoss({ lossAt: 1.3, forwardAt: 1.2, controlAtForward: true, tucking: false, whistledAt: 1.25 })).toBe('dead');
    expect(passerLoss({ lossAt: 1.0, forwardAt: 1.2, controlAtForward: true, tucking: false, whistledAt: 1.1 })).toBe('fumble');
  });
});

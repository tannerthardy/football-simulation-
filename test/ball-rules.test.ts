import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { BallState } from '../src/sim/types.js';
import { assessForwardPass, fumbleOutOfBounds, fumbleRecovery,
  type FumbleRecoveryFacts } from '../src/sim/ball-rules.js';

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
  loose.flight = { pos: { x: start[0], y: start[1], z: 2 },
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

  it('fails explicitly rather than authorizing an advance when restricted own-end-zone recovery lacks impetus/momentum facts', () => {
    const sim = nativeSim({ down: 4 }), fumbler = sim.slot('RB')!, recoverer = sim.slot('Y')!;
    fumbler.body.pos = { x: 8, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: fumbler };
    sim.fumble(fumbler, null);
    recoverer.body.pos = { x: 13, y: CENTER_Y };
    expect(() => sim.possess(recoverer, 'recovery')).toThrow(/Unsupported NFL 8-7-5: end-zone recovery impetus\/momentum/);
  });
});

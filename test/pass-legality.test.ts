import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { bodyRadius } from '../src/physics/bodyshape.js';
import { resolveLivePenalties } from '../src/game/penalty-enforcement.js';
import type { BallState } from '../src/sim/types.js';
import { assessGrounding, assessIllegalTouch, assessIneligibleDownfield, assessForwardHanding,
  capturePassLegality, finishPassLegality, observePassLegality, currentGroundingPressure,
  type GroundingFacts, type IllegalTouchFacts } from '../src/sim/pass-legality.js';

afterEach(() => vi.restoreAllMocks());
const grounding = (overrides: Partial<GroundingFacts> = {}): GroundingFacts => ({
  forwardPass: true, fromBehindLine: true, afterPossessionChange: false,
  pressured: true, receiverInDirectionAndVicinity: false, passerEverOutsidePocket: false,
  looseBallLeftPocket: false, landsAtOrBeyondLine: false, contactAlteredPass: false,
  passMotionOriginallyTowardEligible: false, tFormationSnapReceiver: false,
  immediateContinuousSpike: false, delayedSpike: false, releaseX: 35, los: 40,
  entireBodyAndBallInOwnEndZone: false, ...overrides,
});
const touching = (overrides: Partial<IllegalTouchFacts> = {}): IllegalTouchFacts => ({
  forwardPass: true, fromBehindLine: true, afterPossessionChange: false, team: 'O',
  originallyEligible: false, firstTouch: true, intentional: true, caught: false,
  priorEligibleOrDefensiveTouch: false, outOfBoundsBeforeTouch: false,
  reestablishedInBounds: true, ...overrides,
});

describe('2026 grounding facts and opposing legal controls', () => {
  it('calls a pressured pocket pass with no originally eligible receiver nearby', () => {
    expect(assessGrounding(grounding())).toMatchObject({ kind: 'intentional_grounding', rule: '8-2-1',
      yards: 10, enforcement: 'previous', lossDown: true, safety: false });
  });
  it.each([{ pressured: false }, { receiverInDirectionAndVicinity: true }, { forwardPass: false },
    { fromBehindLine: false }, { afterPossessionChange: true }])('preserves legal or non-applicable control %j', facts => {
    expect(assessGrounding(grounding(facts))).toBeNull();
  });
  it('uses spot enforcement more than ten yards behind the line', () => {
    expect(assessGrounding(grounding({ releaseX: 29 }))).toMatchObject({ enforcement: 'spot', yards: 0 });
  });
  it('uses spot enforcement when ten yards would exceed half the distance', () => {
    expect(assessGrounding(grounding({ los: 22, releaseX: 15 }))).toMatchObject({ enforcement: 'spot', yards: 0 });
  });
  it('identifies whole-body-and-ball own-endzone grounding as a safety', () => {
    expect(assessGrounding(grounding({ releaseX: 8, entireBodyAndBallInOwnEndZone: true })))
      .toMatchObject({ safety: true });
  });
  it.each(['passerEverOutsidePocket', 'looseBallLeftPocket'] as const)('retains the persistent %s exception', key => {
    expect(assessGrounding(grounding({ [key]: true, landsAtOrBeyondLine: true }))).toBeNull();
    expect(assessGrounding(grounding({ [key]: true, landsAtOrBeyondLine: false })))
      .toMatchObject({ kind: 'intentional_grounding' });
  });
  it('preserves significantly altered throws toward eligible receivers and outside-pocket shortfalls', () => {
    expect(assessGrounding(grounding({ contactAlteredPass: true, passMotionOriginallyTowardEligible: true }))).toBeNull();
    expect(assessGrounding(grounding({ contactAlteredPass: true, passerEverOutsidePocket: true,
      contactCausedShortfall: true }))).toBeNull();
  });
  it('permits only the immediate continuous T-snap spike, and prohibits a strategic delayed spike', () => {
    expect(assessGrounding(grounding({ tFormationSnapReceiver: true, immediateContinuousSpike: true }))).toBeNull();
    expect(assessGrounding(grounding({ tFormationSnapReceiver: false, immediateContinuousSpike: true })))
      .toMatchObject({ kind: 'intentional_grounding' });
    expect(assessGrounding(grounding({ pressured: false, delayedSpike: true })))
      .toMatchObject({ kind: 'intentional_grounding', reason: 'delayed_spike' });
  });
  it('does not convert missing pressure/trajectory facts into a flag', () => {
    expect(assessGrounding(grounding({ pressured: null }))).toMatchObject({ kind: 'unresolved' });
    expect(assessGrounding(grounding({ passerEverOutsidePocket: true, landsAtOrBeyondLine: null })))
      .toMatchObject({ kind: 'unresolved' });
  });
});

describe('eligibility, first touching and boundary status', () => {
  it('penalizes an originally ineligible first intentional touch or any catch', () => {
    expect(assessIllegalTouch(touching())).toMatchObject({ kind: 'illegal_touching', yards: 5, lossDown: false });
    expect(assessIllegalTouch(touching({ intentional: false, caught: true })))
      .toMatchObject({ kind: 'illegal_touching', yards: 5 });
  });
  it('preserves accidental ineligible muffs, eligible catches, defensive touches and subsequent eligibility', () => {
    for (const f of [{ intentional: false }, { originallyEligible: true }, { team: 'D' as const },
      { priorEligibleOrDefensiveTouch: true }, { forwardPass: false }, { fromBehindLine: false },
      { afterPossessionChange: true }]) expect(assessIllegalTouch(touching(f))).toBeNull();
  });
  it('calls returning eligible players for first touch with loss of down', () => {
    expect(assessIllegalTouch(touching({ originallyEligible: true, outOfBoundsBeforeTouch: true })))
      .toMatchObject({ kind: 'illegal_touching', reason: 'returned_from_out_of_bounds', yards: 0, lossDown: true });
  });
  it('preserves the forced-by-foul immediate-return exception', () => {
    expect(assessIllegalTouch(touching({ originallyEligible: true, outOfBoundsBeforeTouch: true,
      forcedOutByFoulAndImmediatelyReturned: true }))).toBeNull();
  });
  it('makes an unreestablished out-of-bounds touch incomplete rather than an illegal-touching flag', () => {
    expect(assessIllegalTouch(touching({ originallyEligible: true, outOfBoundsBeforeTouch: true,
      reestablishedInBounds: false }))).toMatchObject({ kind: 'incomplete', rule: '8-1-4' });
  });
  it('reports unknown snap eligibility instead of substituting a position label', () => {
    expect(assessIllegalTouch(touching({ originallyEligible: null }))).toMatchObject({ kind: 'unresolved' });
  });
});

describe('ineligible initial-charge and forward-handing laws', () => {
  const downfield = { legalForwardPass: true, originallyEligible: false, entireBodyDepth: 2,
    initialContactWithinOneYard: false, continuousInitialContact: false, advancedAfterBreakingContactDownfield: true };
  it('calls an entire-body unblocked advance and permits the one-yard boundary', () => {
    expect(assessIneligibleDownfield(downfield)).toMatchObject({ kind: 'ineligible_downfield', yards: 5 });
    expect(assessIneligibleDownfield({ ...downfield, entireBodyDepth: 1 })).toBeNull();
  });
  it('preserves continuous initial legal blocking and post-break stationary/lateral/backward work', () => {
    expect(assessIneligibleDownfield({ ...downfield, initialContactWithinOneYard: true, continuousInitialContact: true })).toBeNull();
    expect(assessIneligibleDownfield({ ...downfield, initialContactWithinOneYard: true,
      advancedAfterBreakingContactDownfield: false })).toBeNull();
    expect(assessIneligibleDownfield({ ...downfield, initialContactWithinOneYard: true }))
      .toMatchObject({ kind: 'ineligible_downfield' });
  });
  it('does not apply the downfield law to an eligible player or an illegal/no forward pass', () => {
    expect(assessIneligibleDownfield({ ...downfield, originallyEligible: true })).toBeNull();
    expect(assessIneligibleDownfield({ ...downfield, legalForwardPass: false })).toBeNull();
  });
  const handoff = { forward: true, afterPossessionChange: false, receiverBehindLine: true, receiverEligible: true };
  it('permits eligible forward handing behind the line and backward handing to anyone', () => {
    expect(assessForwardHanding(handoff)).toBeNull();
    expect(assessForwardHanding({ ...handoff, forward: false, receiverEligible: false, receiverBehindLine: false })).toBeNull();
  });
  it('distinguishes ineligible, beyond-line and post-change forward handing enforcement', () => {
    expect(assessForwardHanding({ ...handoff, receiverEligible: false }))
      .toMatchObject({ kind: 'illegal_handoff', enforcement: 'previous', lossDown: true });
    expect(assessForwardHanding({ ...handoff, receiverBehindLine: false }))
      .toMatchObject({ kind: 'illegal_handoff', enforcement: 'spot', lossDown: true });
    expect(assessForwardHanding({ ...handoff, afterPossessionChange: true }))
      .toMatchObject({ kind: 'illegal_handoff', enforcement: 'spot', lossDown: false });
  });
});

function nativeSim() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(710), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(711), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'pass law fixture' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 712, audibles: false });
  for (const a of sim.agents) { a.body.pos = { x: 15, y: 2 + a.idx }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  sim.t = sim.world.time = 2;
  sim.qb.body.pos = { x: 35, y: CENTER_Y }; sim.qb.downUntil = -1;
  return sim;
}
function release(sim: PlaySim, vx = 10) {
  sim.ball = { kind: 'held', carrier: sim.qb };
  sim.throwBall(sim.qb, null, { x: vx, y: 0, z: 0 }, { x: 37, y: CENTER_Y, z: 0 }, 3, true);
  const ball = sim.ball as BallState;
  if (ball.kind !== 'air') throw new Error('Native release missing');
  return ball;
}
function ground(sim: PlaySim) {
  const ball = sim.ball as BallState;
  if (ball.kind !== 'air') throw new Error('Native pass missing');
  ball.flight = { pos: { x: 37, y: CENTER_Y, z: .04 }, vel: { x: 0, y: 0, z: -1 }, drag: 0 };
  (sim as unknown as { updateBall(): void }).updateBall();
}
function pressured(sim: PlaySim) {
  sim.world.joints.push({ kind: 'grasp', a: sim.slot('DT_S')!.body, b: sim.qb.body,
    reach: 1, capacity: 100, legs: 0 });
}

describe('native pass-law hooks', () => {
  it('calls actual pressured pocket grounding at trajectory termination; no-contact control stays legal', () => {
    const sim = nativeSim(); pressured(sim); release(sim); ground(sim);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'intentional_grounding', against: 'O',
      phase: 'live', rule: '8-2-1', reason: 'no_eligible_receiver_under_pressure' }));
    expect(sim.outcome).toBe('incomplete');
    const legal = nativeSim(); release(legal); ground(legal);
    expect(legal.penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
  });
  it('a missed pass toward a receiver who could reach the landing spot is not grounding; one with no such receiver is', () => {
    const throwAt = (dy: number) => {
      const sim = nativeSim(), x = sim.slot('X')!; pressured(sim);
      x.downUntil = -1; x.body.pos = { x: 38.5, y: CENTER_Y + dy };
      release(sim); sim.t = sim.world.time = 3; ground(sim);
      return sim;
    };
    expect(throwAt(2.5).penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
    const far = throwAt(12);
    expect(far.penalties).toContainEqual(expect.objectContaining({ kind: 'intentional_grounding' }));
    expect(far.foulRecords.find(f => f.kind === 'intentional_grounding')?.evidence.facts)
      .toMatchObject({ receiverCouldReachLanding: false, contactAltered: false, flightTime: 1 });
  });
  it('a pass thrown from inside a defender\'s grasp toward a receiver is altered by contact, not grounding', () => {
    const sim = nativeSim(), x = sim.slot('X')!, dt = sim.slot('DT_S')!; pressured(sim);
    x.downUntil = -1; x.body.pos = { x: 38.5, y: CENTER_Y + 12 };
    sim.bond = { carrier: sim.qb, tacklers: [dt], grip: new Map([[dt, .8]]) } as unknown as typeof sim.bond;
    release(sim); sim.bond = null; sim.t = sim.world.time = 3; ground(sim);
    expect(sim.penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
  });
  it('does not call grounding merely because an actual interception interrupted a pass before its receiver', () => {
    const sim = nativeSim(); pressured(sim); release(sim);
    const defender = sim.slot('FS')!; defender.body.pos = { x: 37, y: CENTER_Y };
    sim.possess(defender, 'interception');
    expect(sim.penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
    expect(sim.ruleLimitations.has('8-2-1: current pressure, receiver vicinity or ball landing')).toBe(true);
  });
  it('calls the actual originally-ineligible catch without making the ball dead', () => {
    const sim = nativeSim(), ol = sim.slot('RG')!;
    expect(sim.snapEligibility.get(ol.player.id)?.eligible).toBe(false);
    release(sim); ol.body.pos = { x: 37, y: CENTER_Y };
    sim.possess(ol, 'catch');
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_touching', playerId: ol.player.id, yards: 5 }));
    expect(sim.phase).toBe('live'); expect(sim.carrier).toBe(ol);
  });
  it('restores collection eligibility after an actual defensive touch', () => {
    const sim = nativeSim(), ol = sim.slot('RG')!;
    release(sim); sim.touchPass(sim.slot('FS')!); sim.possess(ol, 'catch');
    expect(sim.penalties.some(p => p.kind === 'illegal_touching')).toBe(false);
    expect(sim.carrier).toBe(ol);
  });
  it('retains an observed boundary exit for a receiver who returns before catching', () => {
    const sim = nativeSim(), receiver = sim.slot('X')!;
    receiver.body.pos.y = -.1;
    const report = { contacts: [] } as unknown as Parameters<typeof observePassLegality>[1];
    observePassLegality(sim, report, sim.t, sim.agents.map(a => ({ ...a.pos })));
    receiver.body.pos = { x: 37, y: CENTER_Y }; release(sim); sim.possess(receiver, 'catch');
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_touching', yards: 0,
      reason: 'returned_from_out_of_bounds', lossDown: true }));
  });
  it("does not restore everyone else's eligibility through an illegally returning receiver's muff", () => {
    const sim = nativeSim(), receiver = sim.slot('X')!, ol = sim.slot('RG')!;
    receiver.body.pos.y = -.1;
    const report = { contacts: [] } as unknown as Parameters<typeof observePassLegality>[1];
    observePassLegality(sim, report, sim.t, sim.agents.map(a => ({ ...a.pos })));
    receiver.body.pos = { x: 37, y: CENTER_Y }; release(sim);
    sim.touchPass(receiver, false); sim.possess(ol, 'catch');
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_touching', playerId: receiver.player.id,
      reason: 'returned_from_out_of_bounds' }));
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_touching', playerId: ol.player.id,
      reason: 'originally_ineligible' }));
  });
  it('uses explicit continuous snap-spike facts; the delayed counterpart is illegal without pressure', () => {
    const immediate = nativeSim(), air = release(immediate);
    capturePassLegality(immediate, immediate.qb, air.flight.pos, air.flight.vel, { spike: 'immediate' });
    // This installed formation uses a T snap; the pure predicates separately cover non-T throws.
    finishPassLegality(immediate, air, { x: 35, y: CENTER_Y, z: 0 });
    expect(immediate.penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
    const delayed = nativeSim(), second = release(delayed);
    capturePassLegality(delayed, delayed.qb, second.flight.pos, second.flight.vel, { spike: 'delayed' });
    finishPassLegality(delayed, second, { x: 35, y: CENTER_Y, z: 0 });
    expect(delayed.penalties).toContainEqual(expect.objectContaining({ kind: 'intentional_grounding', reason: 'delayed_spike' }));
  });
  it('flushes an achieved unblocked ineligible advance only when a legal pass is released', () => {
    const sim = nativeSim(), lineman = sim.slot('RG')!;
    lineman.body.pos = { x: 43, y: CENTER_Y + 6 };
    const starts = sim.agents.map(a => ({ ...a.pos }));
    const report = sim.world.step(sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), sim.dt);
    observePassLegality(sim, report, sim.t, starts);
    expect(sim.penalties.some(p => p.kind === 'ineligible_downfield')).toBe(false);
    release(sim);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'ineligible_downfield', playerId: lineman.player.id,
      rule: '8-3-1', phase: 'live' }));
    // NFL 8-3-1 has no exception for a pass caught behind the line (a screen):
    // the advance stands as a foul when the pass is touched behind it.
    const screenSim = nativeSim(), screenLineman = screenSim.slot('RG')!;
    screenLineman.body.pos = { x: 43, y: CENTER_Y + 6 };
    const screenStarts = screenSim.agents.map(a => ({ ...a.pos }));
    const screenReport = screenSim.world.step(screenSim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), screenSim.dt);
    observePassLegality(screenSim, screenReport, screenSim.t, screenStarts);
    const short = release(screenSim);
    finishPassLegality(screenSim, short, { x: 38, y: CENTER_Y + 8, z: 1 }, screenSim.slot('RB')!);
    expect(screenSim.penalties).toContainEqual(expect.objectContaining({ kind: 'ineligible_downfield', playerId: screenLineman.player.id }));
    const run = nativeSim(), runner = run.slot('RG')!;
    runner.body.pos = { x: 43, y: CENTER_Y + 6 };
    const runReport = run.world.step(run.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing })), run.dt);
    observePassLegality(run, runReport, run.t, run.agents.map(a => ({ ...a.pos })));
    expect(run.penalties.some(p => p.kind === 'ineligible_downfield')).toBe(false);
  });
  it('calls achieved forward handing to an ineligible player and permits the backward control', () => {
    const sim = nativeSim(), ol = sim.slot('RG')!;
    ol.downUntil = -1; ol.body.pos = { x: 35.4, y: CENTER_Y }; sim.ball = { kind: 'held', carrier: sim.qb };
    expect(sim.handoff(sim.qb, ol)).toBe(true);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_handoff', reason: 'ineligible_receiver',
      enforcement: 'previous', lossDown: true }));
    const legal = nativeSim(), back = legal.slot('RG')!;
    back.downUntil = -1; back.body.pos = { x: 34.6, y: CENTER_Y }; legal.ball = { kind: 'held', carrier: legal.qb };
    expect(legal.handoff(legal.qb, back)).toBe(true);
    expect(legal.penalties.some(p => p.kind === 'illegal_handoff')).toBe(false);
  });
  it('does not invent forward-pass eligibility laws for a native backward throw', () => {
    const sim = nativeSim(); pressured(sim); release(sim, -10); sim.possess(sim.slot('RG')!, 'catch');
    expect(sim.penalties.some(p => ['illegal_touching', 'intentional_grounding', 'ineligible_downfield'].includes(p.kind))).toBe(false);
  });
});


describe('current physical grounding pressure judgment', () => {
  function approach() {
    const sim = nativeSim(), rusher = sim.slot('DT_S')!;
    rusher.downUntil = -1; rusher.body.pos = { x: 37, y: CENTER_Y }; rusher.body.vel = { x: -5, y: 0 };
    return { sim, rusher };
  }
  it('recognizes a current free approaching rusher before contact and calls the pressured throwaway', () => {
    const { sim } = approach();
    expect(currentGroundingPressure(sim, sim.qb)).toMatchObject({ pressured: true, basis: 'unblocked_physical_reach' });
    release(sim); ground(sim);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'intentional_grounding' }));
    expect(sim.foulRecords.find(f => f.kind === 'intentional_grounding')?.evidence.facts)
      .toMatchObject({ pressureBasis: 'unblocked_physical_reach', pressureJudgmentDistance: 2.5, pressureJudgmentSeconds: .7 });
  });
  it('recognizes a compatible same-interval pressure event but does not use a stale lifetime pressure flag', () => {
    const { sim, rusher } = approach(); sim.event('pressure', rusher, sim.qb);
    expect(currentGroundingPressure(sim, sim.qb)).toMatchObject({ pressured: true, basis: 'current_pressure_event' });
    sim.stats.pressured = true; rusher.body.pos.x = 45;
    expect(currentGroundingPressure(sim, sim.qb)).toEqual({ pressured: false, basis: 'none' });
  });
  it('does not call a nearby defender rapidly moving away an imminent physical threat', () => {
    const { sim, rusher } = approach(); rusher.body.vel.x = 15;
    expect(currentGroundingPressure(sim, sim.qb)).toEqual({ pressured: false, basis: 'none' });
  });
  it('does not treat a blocked straight approach or an active engagement as a free tackle path', () => {
    const { sim, rusher } = approach(), blocker = sim.slot('RG')!;
    blocker.body.pos = { x: 36, y: CENTER_Y }; blocker.downUntil = -1;
    expect(currentGroundingPressure(sim, sim.qb)).toEqual({ pressured: false, basis: 'none' });
    blocker.body.pos.x = 36.7;
    expect(sim.engage(blocker, rusher, 'pass')).not.toBeNull();
    expect(currentGroundingPressure(sim, sim.qb)).toEqual({ pressured: false, basis: 'none' });
  });
});

describe('native clock-spike action provenance', () => {
  function atSnap() {
    const sim = nativeSim(); sim.t = sim.world.time = 0;
    return sim;
  }
  function finishFlight(sim: PlaySim) {
    for (let i = 0; i < 8 && sim.phase === 'live'; i++) sim.tick();
    expect(sim.outcome).toBe('incomplete');
  }
  it('executes a ground-directed continuous first T-snap action without a grounding flag', () => {
    const sim = atSnap();
    expect(sim.offCall.formation.qb).toBe('under');
    expect(sim.spikeBall()).toBe(true);
    const ball = sim.ball as BallState;
    if (ball.kind !== 'air') throw new Error('Spike did not execute the native pass');
    expect(ball.flight.vel.x).toBeGreaterThan(0); expect(ball.flight.vel.z).toBeLessThan(0);
    finishFlight(sim);
    expect(sim.penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
    expect(sim.stats.attempted).toBe(true); expect(sim.stats.completed).toBe(false);
    expect(sim.buildResult().clockStops).toBe(true);
  });
  it('calls a strategic spike after an actually completed holding interval even without pressure', () => {
    const sim = atSnap();
    for (const a of sim.agents) vi.spyOn(a.behavior, 'update').mockReturnValue({ vel: { x: 0, y: 0 }, facing: a.facing });
    sim.tick();
    expect(currentGroundingPressure(sim, sim.qb).pressured).toBe(false);
    expect(sim.spikeBall()).toBe(true); finishFlight(sim);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'intentional_grounding', reason: 'delayed_spike',
      lossDown: true, phase: 'live' }));
  });
  it('cannot claim continuous snap possession after an actual handoff exchange even at the same timestamp', () => {
    const sim = atSnap(), rb = sim.slot('RB')!;
    rb.downUntil = -1; rb.body.pos = { x: sim.qb.pos.x + .4, y: CENTER_Y };
    expect(sim.handoff(sim.qb, rb)).toBe(true); expect(sim.handoff(rb, sim.qb)).toBe(true);
    expect(sim.t).toBe(0);
    expect(sim.spikeBall()).toBe(true); finishFlight(sim);
    expect(sim.penalties).toContainEqual(expect.objectContaining({ kind: 'intentional_grounding', reason: 'delayed_spike' }));
  });
  it('makes an explicit spike request execute the spike instead of exempting an unrelated upward pass', () => {
    const sim = atSnap();
    sim.throwBall(sim.qb, sim.slot('X')!, { x: 20, y: 0, z: 10 }, { x: 55, y: CENTER_Y, z: 1 }, 2, false, { spike: true });
    const ball = sim.ball as BallState;
    if (ball.kind !== 'air') throw new Error('Requested spike did not execute');
    expect(ball.target).toBeNull(); expect(ball.flight.vel.z).toBeLessThan(0);
    expect(ball.intended.z).toBe(0); expect(ball.intended.x - ball.flight.pos.x).toBeCloseTo(.1, 9);
    finishFlight(sim);
    expect(sim.penalties.some(p => p.kind === 'intentional_grounding')).toBe(false);
  });
});


describe('native grounding at a straddled own goal line', () => {
  it('keeps the exact no-safety predicate and explicitly declares the reduced boundary placement convention', () => {
    const sim = nativeSim();
    sim.qb.body.pos.x = 9.9; sim.qb.body.facing = Math.PI;
    const fieldExtent = sim.qb.pos.x + bodyRadius(sim.qb.body, 1, 0);
    expect(fieldExtent).toBeGreaterThan(10);
    pressured(sim); release(sim); ground(sim);
    const call = sim.penalties.find(p => p.kind === 'intentional_grounding')!;
    expect(call.spotX).toBeLessThan(10);
    expect(call.penaltySafety).toBe(false); expect(call.basicSpotX).toBe(fieldExtent);
    expect([...sim.ruleLimitations].some(s => s.includes('boundary placement convention') && s.includes('not exact NFL anatomical'))).toBe(true);
    expect(sim.foulRecords.find(f => f.kind === 'intentional_grounding')?.evidence.facts)
      .toMatchObject({ boundaryPlacementConvention: 'field-most reduced torso/ball extent', fieldMostReleaseExtent: fieldExtent });
    const result = sim.buildResult();
    const resolved = resolveLivePenalties({ calls: result.penalties!, result, los: 40, startDown: 1, startDistance: 10 });
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.options.find(o => o.id === 'enforce:0')).toMatchObject({ safety: false, spotX: fieldExtent, lossDown: true });
  });
  it('counts the goal line itself as own endzone when the whole represented body and ball are on or behind it', () => {
    const sim = nativeSim(); sim.qb.body.facing = Math.PI;
    sim.qb.body.pos.x = 10 - bodyRadius(sim.qb.body, 1, 0);
    pressured(sim); release(sim); ground(sim);
    const call = sim.penalties.find(p => p.kind === 'intentional_grounding')!;
    expect(call.penaltySafety).toBe(true); expect(call.basicSpotX).toBeUndefined();
    const result = sim.buildResult();
    const resolved = resolveLivePenalties({ calls: result.penalties!, result, los: 40, startDown: 1, startDistance: 10 });
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.options.find(o => o.id === 'enforce:0')).toMatchObject({ safety: true, safetyTeam: 'D' });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { resolveLivePenalties } from '../src/game/penalty-enforcement.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

afterEach(() => vi.restoreAllMocks());
function nativeFixture() {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(771), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(772), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'endzone foul composition' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 773, audibles: false,
  });
  for (const a of sim.agents) { a.body.pos = { x: 15, y: 2 + a.idx }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  sim.t = sim.world.time = 2;
  function intercept(x: number, vx = 0) {
    sim.qb.body.pos = { x: 35, y: CENTER_Y }; sim.ball = { kind: 'held', carrier: sim.qb };
    sim.throwBall(sim.qb, sim.slot('X')!, { x: 15, y: 0, z: 2 }, { x, y: CENTER_Y, z: 1 }, 3);
    const carrier = sim.slot('FS')!; carrier.body.pos = { x, y: CENTER_Y }; carrier.body.vel = { x: vx, y: 0 };
    carrier.downUntil = -1; sim.possess(carrier, 'interception');
    return carrier;
  }
  function calledHold(x: number) {
    const actor = sim.slot('SS')!; actor.body.pos.x = x;
    // The detector's qualified called-act contract is supplied here so this
    // test isolates native possession provenance through result/enforcement.
    sim.recordFoul({ kind: 'holding', against: 'D', playerId: actor.player.id, yards: 10,
      autoFirst: false, spotX: x, t: sim.t, rule: '12-1-3' },
    { source: 'native', rule: '12-1-3', action: 'qualified_contact_fixture', facts: { calledAct: true } });
  }
  function resolve() {
    const result = sim.buildResult();
    return { result, resolved: resolveLivePenalties({ calls: result.penalties ?? [], result,
      los: 40, startDown: 1, startDistance: 10 }) };
  }
  return { sim, intercept, calledHold, resolve };
}

describe('native endzone called-act provenance and Rule14 composition', () => {
  it('enforces a held own-endzone interception with no advance from the legal touchback spot', () => {
    const { sim, intercept, calledHold, resolve } = nativeFixture(), carrier = intercept(112);
    calledHold(112); sim.finishCarry('tackle', carrier.pos);
    const { result, resolved } = resolve();
    expect(result.outcome).toBe('touchback');
    expect(result.penalties?.[0]).toMatchObject({ possessionTeam: 'D', possessionChanges: 1,
      phase: 'live', playPhase: 'run', impetusTeam: 'O', attemptedAdvance: false });
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.options.find(o => o.id === 'enforce:0')).toMatchObject({ possession: 'D', safety: false,
      spotX: 100, enforcementSpots: [{ callIndex: 0, fromX: 90, toX: 100 }] });
  });
  it('distinguishes an actual attempt to advance before the own-endzone return foul', () => {
    const { sim, intercept, calledHold, resolve } = nativeFixture(), carrier = intercept(112);
    for (const a of sim.agents) vi.spyOn(a.behavior, 'update').mockReturnValue({ vel: { x: 0, y: 0 }, facing: a.facing });
    vi.mocked(carrier.behavior.update).mockReturnValue({ vel: { x: -4, y: 0 }, facing: Math.PI });
    sim.tick();
    expect(sim.lastStep!.groundImpulse[carrier.idx].x).toBeLessThan(0);
    calledHold(112); sim.finishCarry('tackle', carrier.pos);
    const { result, resolved } = resolve();
    expect(result.penalties?.[0]).toMatchObject({ impetusTeam: 'O', attemptedAdvance: true });
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.options.find(o => o.id === 'enforce:0')).toMatchObject({ possession: 'D', safety: true, safetyTeam: 'O' });
  });
  it('uses the one-yard momentum acquisition spot for a field foul while the original momentum remains', () => {
    const { sim, intercept, calledHold, resolve } = nativeFixture(), carrier = intercept(109.6, 4);
    carrier.body.pos.x = 112; calledHold(108); sim.finishCarry('tackle', carrier.pos);
    const { result, resolved } = resolve();
    expect(result.endX).toBe(109);
    expect(result.penalties?.[0]).toMatchObject({ momentumSpotX: 109, attemptedAdvance: false, possessionChanges: 1 });
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.options.find(o => o.id === 'enforce:0')).toMatchObject({ safety: false, spotX: 109.5,
      enforcementSpots: [{ callIndex: 0, fromX: 109, toX: 109.5 }] });
  });
  it('does not let original momentum excuse a live possessing-team foul in its own endzone', () => {
    const { sim, intercept, calledHold, resolve } = nativeFixture(), carrier = intercept(109.6, 4);
    carrier.body.pos.x = 112; calledHold(112); sim.finishCarry('tackle', carrier.pos);
    const { result, resolved } = resolve();
    expect(result.endX).toBe(109); expect(result.penalties?.[0].momentumSpotX).toBe(109);
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.options.find(o => o.id === 'enforce:0')).toMatchObject({ safety: true, safetyTeam: 'O' });
  });
  it('keeps an earlier return phase separate when the original offense later regains and scores', () => {
    const { sim, intercept, calledHold, resolve } = nativeFixture(), carrier = intercept(50);
    calledHold(50); sim.fumble(carrier, null);
    const recovery = sim.slot('X')!; recovery.body.pos = { x: 112, y: CENTER_Y };
    sim.possess(recovery, 'recovery');
    (sim as unknown as { checkWhistle(): void }).checkWhistle();
    const { result, resolved } = resolve();
    expect(result.score).toEqual({ kind: 'TD', team: 'O' });
    expect(result.penalties?.[0]).toMatchObject({ possessionTeam: 'D', possessionChanges: 1, playPhase: 'run' });
    expect(result.penalties?.[0].impetusTeam).toBeUndefined();
    expect(result.penalties?.[0].momentumSpotX).toBeUndefined();
    expect(result.penalties?.[0].attemptedAdvance).toBeUndefined();
    expect(resolved.status, resolved.reason).toBe('resolved');
    expect(resolved.recommendedId).toBe('decline');
    expect(resolved.options.find(o => o.id === 'decline')).toMatchObject({ possession: 'O', safety: false });
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent, TeamSide } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

afterEach(() => vi.restoreAllMocks());

/** Ordinary loose-ball flight/recovery code, isolated from the installation.
 * Bodies and eligible geometry are explicit; recovery itself is not injected. */
function stage(team: TeamSide = 'O', height = .2, side = 1) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: side < 0, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'recovery control' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 131, audibles: false });
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + Math.floor(a.idx / 12) * 2, y: 2 + a.idx % 12 * 4 };
    a.body.vel = { x: 0, y: 0 }; a.snapReadyAt = 0; a.downUntil = 99;
  }
  const rb = sim.slot('RB')!, recoverer = team === 'O' ? rb : sim.slot('FS')!;
  rb.body.pos = { x: 45, y: CENTER_Y + side * .4 };
  sim.ball = { kind: 'held', carrier: rb };
  sim.t = sim.world.time = 2;
  sim.fumble(rb, null);
  const loose = sim.ball as PlaySim['ball'];
  if (loose.kind !== 'loose') throw new Error('Missing loose ball');
  loose.since = 1.7;
  loose.flight = { pos: { x: 45, y: CENTER_Y + side * .4, z: height }, vel: { x: 0, y: 0, z: 0 }, drag: 0 };
  if (recoverer !== rb) rb.body.pos = { x: 15, y: 4 };
  recoverer.downUntil = -1; recoverer.body.pos = { x: 45, y: CENTER_Y + side * .4 };
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { sim, rb, recoverer };
}

function resolveLoose(sim: PlaySim): void {
  // Calls the real native ball update at the same boundary tick uses.
  (sim as unknown as { updateBall(): void }).updateBall();
}
function parkExcept(sim: PlaySim, keep: Agent[]): void {
  for (const a of sim.agents) if (!keep.includes(a)) {
    a.downUntil = 99;
    a.behavior = { kind: 'parked', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
}

describe('loose-ball possession is distinct from physical down', () => {
  it.each(['O', 'D'] as const)('an upright %s recovery stays live even after a successful execution draw', team => {
    const { sim, recoverer } = stage(team), before = structuredClone(recoverer.body);
    vi.spyOn(sim.rng, 'chance').mockReturnValue(true);
    resolveLoose(sim);
    expect(sim.carrier).toBe(recoverer);
    expect(sim.possession).toBe(team);
    expect(sim.stats.fumbleRecoveredBy).toBe(recoverer.player.id);
    expect(sim.stats.fumbleLost ?? false).toBe(team === 'D');
    expect(recoverer.body).toEqual(before);
    expect(recoverer.body.support!.state).toBe('up');
    expect(sim.phase).toBe('live');
    expect(sim.outcome).toBeNull();
    expect(sim.events.filter(e => e.type === 'recovery')).toHaveLength(1);
    expect(sim.events.some(e => e.type === 'tackle' || e.type === 'fall')).toBe(false);
  });

  it.each([[.2, .35], [.8, .12]])('a failed recovery at ball height %s preserves the acquisition probability', (height, probability) => {
    const { sim } = stage('O', height);
    const chance = vi.spyOn(sim.rng, 'chance').mockReturnValue(false);
    resolveLoose(sim);
    expect(chance).toHaveBeenCalledTimes(1);
    expect(chance).toHaveBeenCalledWith(probability);
    expect(sim.ball.kind).toBe('loose');
    expect(sim.phase).toBe('live');
    expect(sim.events.some(e => e.type === 'recovery')).toBe(false);
  });

  it('does not make an acquisition draw before the loose-ball opportunity matures', () => {
    const { sim } = stage();
    if (sim.ball.kind !== 'loose') throw new Error('Missing loose ball');
    sim.ball.since = sim.t - .1;
    const chance = vi.spyOn(sim.rng, 'chance').mockReturnValue(true);
    resolveLoose(sim);
    expect(chance).not.toHaveBeenCalled();
    expect(sim.ball.kind).toBe('loose');
  });

  it('does not make a possession draw when no upright player can reach the ball', () => {
    const { sim, recoverer } = stage(); recoverer.body.pos.x += 2;
    const chance = vi.spyOn(sim.rng, 'chance').mockReturnValue(true);
    resolveLoose(sim);
    expect(chance).not.toHaveBeenCalled();
    expect(sim.ball.kind).toBe('loose');
  });

  it.each(['falling', 'down', 'rising'] as const)('retains the current %s-player acquisition exclusion', state => {
    const { sim, recoverer } = stage();
    recoverer.body.support!.state = state; recoverer.body.support!.since = sim.t;
    const chance = vi.spyOn(sim.rng, 'chance').mockReturnValue(true);
    resolveLoose(sim);
    expect(chance).not.toHaveBeenCalled();
    expect(sim.ball.kind).toBe('loose');
    expect(sim.phase).toBe('live');
  });

  it.each([['O', -1], ['O', 1], ['D', -1], ['D', 1]] as const)(
    'a %s scoop remains physically moving before the ordinary later tackle, mirror=%s', (team, side) => {
    const { sim, recoverer } = stage(team, .2, side), dir = team === 'O' ? 1 : -1;
    // Recovery succeeds. Later miss/fumble draws fail, retaining actual grip,
    // force, foot support and fall solving rather than prescribing down.
    const chance = vi.spyOn(sim.rng, 'chance').mockReturnValueOnce(true).mockReturnValue(false);
    recoverer.body.vel = { x: dir * 3, y: 0 }; recoverer.body.facing = dir > 0 ? 0 : Math.PI;
    resolveLoose(sim);
    expect(sim.phase).toBe('live');
    const defender = sim.slot(team === 'O' ? 'FS' : 'Y')!;
    parkExcept(sim, [recoverer, defender]);
    defender.downUntil = -1; defender.body.pos = { x: 45 + dir * 2, y: recoverer.pos.y + side * .15 };
    defender.body.vel = { x: -dir, y: 0 }; defender.body.facing = dir > 0 ? Math.PI : 0;
    const acquiredAt = sim.t, originalX = recoverer.pos.x;
    while (sim.phase === 'live' && sim.t < acquiredAt + 5) sim.tick();
    expect(sim.phase).toBe('dead');
    expect(sim.outcome).toBe('tackle');
    expect(sim.t).toBeGreaterThan(acquiredAt + .15);
    expect((recoverer.pos.x - originalX) * dir).toBeGreaterThan(0);
    // Re-recorded 2026-11-17 (carrier-honest: the runner judges the FS from what he sees, not his hidden profile): the O
    // scoop runner's path changes and the whistle comes while he is still falling; the D scoop still ends down.
    // Re-recorded 2026-11-25 (Run Game, the tackle package): the file's rule is that the scoop stays live and is ended
    // by an ordinary later tackle, a solved fall, not a prescribed down (the fall / tackle / wrap events below). Whether
    // the whistle finds him still falling or already down is the tackle's timing (the package's reach and hold land a
    // tick or two differently), so either is the contract.
    expect(['falling', 'down']).toContain(recoverer.body.support!.state);
    expect(sim.events.some(e => e.type === 'tackle_wrap')).toBe(true);
    expect(sim.events.some(e => e.type === 'fall' && e.a === recoverer.idx)).toBe(true);
    expect(sim.events.some(e => e.type === 'tackle' && e.b === recoverer.idx)).toBe(true);
    expect(chance.mock.calls.length).toBeGreaterThan(1);
    if (team === 'D') {
      expect(sim.buildResult().offenseYards).toBe(5);
      expect(sim.buildResult().stats.returnYards!).toBeGreaterThan(0);
    }
  });

  it.each([-1, 1])('a defensive scoop can advance through World while offensive credit stays at the fumble, mirror=%s', side => {
    const { sim, recoverer } = stage('D', .2, side);
    vi.spyOn(sim.rng, 'chance').mockReturnValueOnce(true).mockReturnValue(false);
    recoverer.body.vel = { x: -3, y: 0 }; recoverer.body.facing = Math.PI;
    resolveLoose(sim);
    expect(sim.phase).toBe('live');
    parkExcept(sim, [recoverer]);
    const originalX = recoverer.pos.x;
    for (let k = 0; k < 8 && sim.phase === 'live'; k++) sim.tick();
    expect(sim.phase).toBe('live');
    expect(recoverer.pos.x).toBeLessThan(originalX - .5);
    expect(recoverer.body.support!.state).toBe('up');
    const r = sim.buildResult();
    expect(r.turnover).toBe(true);
    expect(r.offenseYards).toBe(5);
    expect(r.stats.returnYards!).toBeGreaterThan(.5);
    expect(r.segments.map(s => [s.team, s.how, s.end])).toEqual([
      ['O', 'snap', 'fumble'], ['D', 'recovery', 'live'],
    ]);
    expect(r.stats.fumbleRecoveredBy).toBe(recoverer.player.id);
    expect(r.stats.fumbleLost).toBe(true);
  });
});

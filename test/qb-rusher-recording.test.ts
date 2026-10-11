import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import type { MoveCommand } from '../src/physics/kinematics.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

function fixture(seed: number, run = false) {
  return new PlaySim({
    offense: pickOffense(generateTeam(new Rng(91), 'Recording offense', 'RO'), '11'),
    defense: pickDefense(generateTeam(new Rng(92), 'Recording defense', 'RD'), 'nickel'),
    seed, audibles: false,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false,
      ...(run ? { kind: 'run' as const, run: RUN_BY_ID.iz_strong }
        : { kind: 'pass' as const, pass: PASS_BY_ID.four_verts }), label: 'rusher recording' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'rusher recording' },
    los: 40, ballY: 26, firstDownX: 50,
  });
}

function observedRun(sim: PlaySim) {
  const pictures: number[][] = [], states: unknown[] = [];
  const see = sim.see.bind(sim), tick = sim.tick.bind(sim);
  const observe = vi.spyOn(sim, 'see').mockImplementation((a, b, scale = 1) => {
    pictures.push([sim.t, a.idx, b.idx, scale]);
    return see(a, b, scale);
  });
  const step = vi.spyOn(sim, 'tick').mockImplementation(() => {
    tick();
    states.push(structuredClone({ t: sim.t, worldTime: sim.world.time,
      bodies: sim.agents.map(a => ({ ...a.body, profile: undefined })),
      commands: (sim as unknown as { cmds: MoveCommand[] }).cmds, intents: sim.intents }));
  });
  const random = vi.spyOn(sim.rng, 'nextU32');
  try {
    const result = sim.run();
    return { result, pictures, states, randomCalls: random.mock.calls.length,
      randomState: { ...sim.rng } };
  } finally { observe.mockRestore(); step.mockRestore(); random.mockRestore(); }
}

describe('recording the actual rushing player', () => {
  it('records a native pass-call scramble without changing movement, observations or randomness', () => {
    // This unmodified 11-on-11 fixture naturally scrambles. No forced QB
    // phase, private transition invocation or mocked football decision.
    const recorded = fixture(0), unrecorded = fixture(0);
    Object.defineProperty(unrecorded.stats, 'rusher', {
      configurable: true, enumerable: true, get: () => undefined, set: () => {},
    });
    const actual = observedRun(recorded), control = observedRun(unrecorded);
    expect(actual.result.kind).toBe('pass');
    expect(actual.result.stats.scramble).toBe(true);
    expect(actual.result.stats.attempted).toBe(false);
    expect(actual.result.stats.rusher).toBe(recorded.qb.player.id);
    expect(actual.result.events.filter(e => e.type === 'scramble'))
      .toEqual([expect.objectContaining({ a: recorded.qb.idx })]);
    expect(actual.states).toEqual(control.states);
    expect(actual.pictures.length).toBeGreaterThan(0);
    expect(actual.pictures).toEqual(control.pictures);
    expect(actual.randomCalls).toBe(control.randomCalls);
    expect(actual.randomState).toEqual(control.randomState);
    const withoutRusher = (result: typeof actual.result) => {
      const { rusher: _rusher, ...stats } = result.stats;
      return { ...result, stats };
    };
    expect(withoutRusher(actual.result)).toEqual(withoutRusher(control.result));
  });

  it('does not label an ordinary native pass as a rush', () => {
    const sim = fixture(1), result = sim.run();
    expect(result.kind).toBe('pass');
    expect(result.stats.attempted).toBe(true);
    expect(result.stats.scramble).toBe(false);
    expect(result.stats.rusher).toBeUndefined();
  });

  it('keeps an actual handoff credited to the receiving back', () => {
    const sim = fixture(0, true), back = sim.slot('RB')!, result = sim.run();
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'handoff',
      a: sim.qb.idx, b: back.idx }));
    expect(result.stats.scramble).toBe(false);
    expect(result.stats.rusher).toBe(back.player.id);
    expect(result.stats.rusher).not.toBe(sim.qb.player.id);
  });
});

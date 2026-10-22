import { describe, expect, it, vi } from 'vitest';
// Recorded on the installed flat line (1.3 yd splits, 0.55 yd depth): its
// saved geometry, landmarks and plans are that line's. The tracked line
// (OL_ALIGN, docs/reviews/presnap.md) moves every body; pin it off here.
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
// Recorded before SNAP_REACT (on in the pinned profile) changed every
// player's start; the trace stays on the fixed get-off.
vi.hoisted(() => { process.env.SNAP_REACT = '0'; });
// PAD_LEVERAGE and DL_ANCHOR change the contact forces this recorded scene is staged on.
vi.hoisted(() => { process.env.PAD_LEVERAGE = '0'; process.env.DL_ANCHOR = '0'; });
// Recorded under the earliest-point cutoff; PASS_CORNER (on in the pinned
// profile) meets edge rushers later, where their arc has turned.
vi.hoisted(() => { process.env.PASS_CORNER = '0'; });
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import type { MoveCommand } from '../src/physics/kinematics.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { DeepCoverage } from '../src/sim/coverage-leverage.js';

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
  it('attributes an unexchanged snap from its actual segment without inventing a fumble or scramble', () => {
    const sim = fixture(0, true);
    sim.qb.body.pos.x = sim.los - 5;
    sim.t = 25;
    sim.whistle('timeout', sim.qb.pos);
    const rng = { ...sim.rng }, events = structuredClone(sim.events);
    const result = sim.buildResult();
    expect(result).toMatchObject({ kind: 'run', yards: -5, offenseYards: -5, outcome: 'timeout', duration: 25,
      stats: { rusher: sim.qb.player.id, retainedSnap: true, attempted: false, scramble: false, sacked: false } });
    expect(result.stats.fumbledBy).toBeUndefined();
    expect(result.segments).toEqual([expect.objectContaining({ team: 'O', carrier: sim.qb.player.id, how: 'snap', end: 'dead' })]);
    expect(sim.rng).toEqual(rng);
    expect(result.events).toEqual(events);
  });

  it('records achieved catch depth without replacing the intended target or aim depth', () => {
    const sim = fixture(1), qb = sim.qb, target = sim.slot('X')!, catcher = sim.slot('RB')!;
    sim.t = 1;
    sim.throwBall(qb, target, { x: 15, y: 0, z: 0 }, { x: sim.los + 7, y: 26, z: 1 }, 2);
    catcher.body.pos.x = sim.los - 4;
    sim.t = 1.2;
    sim.possess(catcher, 'catch');
    catcher.body.pos.x = sim.los + 11;
    sim.whistle('tackle', catcher.pos);
    const result = sim.buildResult();
    expect(result.stats).toMatchObject({ target: target.player.id, receiver: catcher.player.id, airYards: 7, completedAirYards: -4, yac: 15 });
    expect(result.stats.rusher).toBeUndefined();
    expect(result.offenseYards).toBe(11);
  });

  it('records a pass-call scramble under an explicit historical base-coaching response without bookkeeping effects', () => {
    // Test-only historical coaching response: keep the base coverage command
    // already computed by today's controller, bypassing only DeepCoverage's
    // optional depth choice. This is not an unmodified current-coverage play.
    // QB decisions and all 22 bodies still execute through the current engine;
    // no QB phase, scramble transition, physical law or random draw is mocked.
    const coaching = vi.spyOn(DeepCoverage.prototype, 'choose').mockImplementation(
      (_a, _seen, _cue, _receiver, _cushion, original) => original);
    try {
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
    } finally { coaching.mockRestore(); }
  });

  it.each([0, 1])('does not label an unmodified native Cover 3 pass as a rush (seed=%s)', seed => {
    const sim = fixture(seed), result = sim.run();
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
    expect(result.stats.retainedSnap).toBeUndefined();
  });
});

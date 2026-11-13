import { describe, expect, it, vi } from 'vitest';
// These bookkeeping witnesses replay plays whose scramble and run outcomes
// depend on the installed alignment; WR_ALIGN, OL_SPLITS, OL_STAGGER and
// DEF_ALIGN move those bodies and with them the QB's options. Pin the
// installed geometry (read at import).
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
// PASS_KICK's vertical set protects this recorded scramble's QB: the replay is staged on the cutoff set.
vi.hoisted(() => { process.env.WR_ALIGN = '0'; process.env.OL_SPLITS = '0'; process.env.OL_STAGGER = '0'; process.env.DEF_ALIGN = '0'; process.env.FRONT_ALIGN = '0'; process.env.SNAP_REACT = '0'; process.env.PASS_FEEL = '0'; process.env.PAD_LEVERAGE = '0'; process.env.PASS_KICK = '0'; });
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import type { MoveCommand } from '../src/physics/kinematics.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { DeepCoverage } from '../src/sim/coverage-leverage.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

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
      // Re-selected under the leg force-velocity law (PHY-1): the pocket plays out
      // differently, so seed 0's QB throws. Seeds 23 and 35 are the scrambles in seeds 0-59.
      // Re-staged for the direction-free start (#353): seed 23's QB now
      // throws; seeds 0-59 hold no pass-call scramble (0, 4, 23, 24, 35, 41
      // and 47 did before). Seed 76 is the first scramble after them (76, 140,
      // 250, 263 in 60-299). The bookkeeping witness is the same.
      // Re-staged for zone droppers settling once the QB has set (ZONE_SETTLE):
      // seed 76's QB now throws; 172 and 263 are the scrambles in 0-299.
      const recorded = fixture(172), unrecorded = fixture(172);
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

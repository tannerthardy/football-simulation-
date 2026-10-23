/**
 * The film weirdness observer only reads: a play run with it attached matches
 * the same play without it (result, RNG continuation), the pre-snap capture
 * records exactly what the physics world reported, and the plumbing around it
 * (hook composition, the per-detector event cap) does what it says.
 */
import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.MOTION = '1'; });
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { sceneSim } from '../src/lab/coverage-scene.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { World } from '../src/physics/world.js';
import { PlaySim } from '../src/sim/playsim.js';
import { composeHooks } from '../scripts/scorecard/hooks.js';
import { captureTackleOpportunities } from '../scripts/scorecard/tackles.js';
import { EVENT_CAP, capEvents, installPreSnapCapture, preSnapOf, uninstallPreSnapCapture, watchPlay, weirdObserver } from '../scripts/scorecard/weird/observe.js';
import type { WeirdEvent } from '../scripts/scorecard/weird/types.js';

const offense = pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11');
const defense = pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel');
const stage = (kind: 'pass' | 'run') => new PlaySim({ offense, defense,
  offCall: kind === 'pass'
    ? { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'control' }
    : { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'control' },
  defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'control' },
  los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83, record: false });

describe('the observer only reads', () => {
  it.each(['pass', 'run'] as const)('leaves a %s play and its RNG continuation unchanged', (kind) => {
    const control = stage(kind), observed = stage(kind);
    const obs = weirdObserver({ idPrefix: 'sc7/', game: 1 });
    const tackles = captureTackleOpportunities();
    // Both observers share the one playResult seam, in the order the worker composes them.
    expect(composeHooks(tackles.hooks, obs.hooks).playResult!(observed, 'scrimmage')).toBeUndefined();
    const expected = control.run(), actual = observed.run();
    expect(actual).toEqual(expected);
    expect(observed.rng.nextU32()).toBe(control.rng.nextU32());
    expect(actual.frames).toBeUndefined();
    expect(tackles.count(actual.stats)).toBeTypeOf('number');
  });

  it('watches every tick of the play', () => {
    const sim = stage('pass');
    const w = watchPlay(sim);
    const result = sim.run();
    const { counts } = w.result();
    expect(counts.ticks).toBeGreaterThan(20);
    expect(counts.olFrames).toBe(counts.ticks * 5);
    expect(result.stats).toBeDefined();
  });

  it('ignores special-teams and two-point snaps', () => {
    const obs = weirdObserver({ idPrefix: '', game: 1 });
    const sim = stage('pass');
    const tick = sim.tick;
    expect(obs.hooks.playResult!(sim, 'two-point')).toBeUndefined();
    expect(sim.tick).toBe(tick);
  });
});

describe('pre-snap capture', () => {
  it('logs exactly the contacts the physics world reported at negative time', () => {
    installPreSnapCapture();
    const inner = World.prototype.step;
    const raw = new WeakMap<World, number>();
    // An outer wrapper sees the same report the engine sees.
    World.prototype.step = function (this: World, ...args: Parameters<World['step']>) {
      const t = this.time;
      const report = inner.apply(this, args);
      if (t < 0) raw.set(this, (raw.get(this) ?? 0) + report.contacts.length);
      return report;
    };
    try {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const sim = sceneSim({ formation: 'gun_doubles_11', coverage: 'cover4', motion: { slot: 'H', kind: 'across' }, seed });
        const log = preSnapOf(sim.world);
        expect(log?.steps ?? 0).toBeGreaterThan(0);
        expect(log!.contacts.reduce((n, c) => n + c.list.length, 0)).toBe(raw.get(sim.world) ?? 0);
        for (const c of log!.contacts) expect(c.t).toBeLessThan(0);
      }
    } finally {
      World.prototype.step = inner;
      uninstallPreSnapCapture();
    }
  });

  it('is idempotent and restores the engine step', () => {
    const before = World.prototype.step;
    expect(installPreSnapCapture()).toBe(true);
    expect(installPreSnapCapture()).toBe(false);
    expect(World.prototype.step).not.toBe(before);
    uninstallPreSnapCapture();
    expect(World.prototype.step).toBe(before);
  });
});

describe('plumbing', () => {
  it('composeHooks runs every observer and returns the first scripted result', () => {
    const calls: string[] = [];
    const a = { playResult: () => { calls.push('a'); return undefined; } };
    const b = { playResult: () => { calls.push('b'); return { scripted: 1 } as never; }, tryChoice: () => 'two' as const };
    const c = { playResult: () => { calls.push('c'); return { scripted: 2 } as never; } };
    const hooks = composeHooks(a, b, c);
    expect(hooks.playResult!(undefined as never, 'scrimmage')).toEqual({ scripted: 1 });
    expect(calls).toEqual(['a', 'b', 'c']);
    expect(hooks.tryChoice!('home' as never)).toBe('two');
    expect(composeHooks({}, {}).playResult).toBeUndefined();
  });

  it('keeps the worst events per detector in play order and never more than the cap', () => {
    const ev = (n: number, detector: WeirdEvent['detector'], severity: number): WeirdEvent =>
      ({ detector, id: `G1-P${n}`, play: n, t0: 0, t1: 0, players: [], text: '', severity });
    const events = [...Array(40).keys()].map((n) => ev(n, 'stuck', n % 7)).concat(ev(99, 'turned', 0.1));
    const kept = capEvents(events);
    expect(kept.filter((e) => e.detector === 'stuck')).toHaveLength(EVENT_CAP);
    expect(kept.some((e) => e.detector === 'turned')).toBe(true);
    expect(kept.map((e) => e.play)).toEqual([...kept.map((e) => e.play)].sort((x, y) => x - y));
    const floor = Math.min(...kept.filter((e) => e.detector === 'stuck').map((e) => e.severity));
    const dropped = events.filter((e) => e.detector === 'stuck' && !kept.includes(e));
    expect(Math.max(...dropped.map((e) => e.severity))).toBeLessThanOrEqual(floor);
  });
});

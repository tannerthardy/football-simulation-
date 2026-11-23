import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import type { PhysicalProfile } from '../src/players/physical.js';

const profile: PhysicalProfile = { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
  vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6, shuffle: .55,
  maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25, power: 100, balance: .5,
  bend: .5, stepSpeed: 3.4, getUp: .9 };

/** A lone body at rest, hips held on +x (or turned to his travel), asked ASK yd/s `deg` degrees off his hips; returns his speed at 0.2 / 0.4 s. The flag is read at import, so each arm loads a fresh module. */
async function start(flag: '0' | '1', deg: number, opts: { loaded?: boolean; turn?: boolean; ask?: number } = {}) {
  vi.resetModules();
  process.env.DIR_START = flag;
  const { World } = await import('../src/physics/world.js');
  const { newSupport } = await import('../src/physics/support.js');
  const b: Body = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1, profile: { ...profile }, support: newSupport(0.3), loaded: opts.loaded };
  const w = new World([b]), d = deg * Math.PI / 180, ask = opts.ask ?? 5, got: number[] = [];
  for (let k = 1; k <= 8; k++) {
    (w as any).time = k * .05;
    w.step([{ vel: { x: Math.cos(d) * ask, y: Math.sin(d) * ask }, facing: opts.turn ? d : 0, effort: 1 }], .05); b.energy = 1;
    got.push(Math.hypot(b.vel.x, b.vel.y));
  }
  return { v02: got[3], v04: got[7] };
}

afterEach(() => { delete process.env.DIR_START; vi.resetModules(); });

describe('DIR_START: the start from rest depends on the angle between the push and the pelvis', () => {
  it('forward and straight-back starts are unchanged', async () => {
    for (const deg of [0, 180]) {
      const off = await start('0', deg), on = await start('1', deg);
      expect(on.v02).toBeCloseTo(off.v02, 6);
      expect(on.v04).toBeCloseTo(off.v04, 6);
    }
  });
  it('a reaction start across the pelvis is slower, near the measured ratio at 0.2 s', async () => {
    const off = await start('0', 90), on = await start('1', 90);
    expect(on.v02 / off.v02).toBeGreaterThan(.55);
    expect(on.v02 / off.v02).toBeLessThan(.8);
    expect(on.v04).toBeLessThan(off.v04);
  });
  it('as he opens his hips to his travel the start returns to the forward start', async () => {
    const fwd = await start('1', 0), turned = await start('1', 90, { turn: true }), held = await start('1', 90);
    expect(turned.v04).toBeGreaterThan(held.v04);
    expect(turned.v04 / fwd.v04).toBeGreaterThan(.85);
  });
  it('a loaded start (first step planned before it) pays no direction penalty', async () => {
    const off = await start('0', 90), loaded = await start('1', 90, { loaded: true });
    expect(loaded.v02).toBeCloseTo(off.v02, 6);
    expect(loaded.v04).toBeCloseTo(off.v04, 6);
  });
});

describe('DIR_START: one planned start per body (PlaySim)', () => {
  it('every offensive player and a rusher, blitzer or zone defender is loaded at the snap cue; a man defender is not; it ends at START_DONE or on a new assignment', async () => {
    vi.resetModules();
    process.env.DIR_START = '1';
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'slant_flat', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
    const loadedAt: Record<string, boolean> = {}, ended = new Set<number>(), kinds = new Map<number, string>();
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      for (const a of sim.agents) {
        if (a.body.loaded !== undefined && loadedAt[a.idx] === undefined) { loadedAt[a.idx] = a.body.loaded; kinds.set(a.idx, a.behavior.kind); }
        if (loadedAt[a.idx] && !a.body.loaded) ended.add(a.idx);
        if (loadedAt[a.idx] === false) expect(a.body.loaded).toBe(false);
        if (ended.has(a.idx)) expect(a.body.loaded).toBe(false); // one start only
      }
    };
    sim.run();
    for (const a of sim.agents) {
      if (a.team === 'O') expect(loadedAt[a.idx]).toBe(true);
      const k = kinds.get(a.idx);
      if (a.team === 'D' && k === 'man') expect(loadedAt[a.idx]).toBe(false);
      if (a.team === 'D' && (k === 'rush' || k === 'blitz' || k === 'zone')) expect(loadedAt[a.idx]).toBe(true);
    }
    expect(ended.size).toBeGreaterThan(8);
  });
});

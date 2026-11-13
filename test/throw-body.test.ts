/** THROW_BODY (behaviors/qb.ts; experimental, off): a hold on the passer acts on
 * the throw through what it holds. interference = heldBy x (1 - the highest
 * grasp's leg share). A hold taken in the load pins the arm with that chance
 * when the arm must come forward; a throw that comes out under a hold is an arm
 * throw to that degree (flick = max(flick, interference)). An unheld throw is
 * untouched. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** A held QB as the throw sees him: one tackler with control `held`, grasp at leg share `legs`. */
function holding(sim: any, held: number, legs: number) {
  const qb = sim.qb, d = sim.defense[0];
  const bond = { carrier: qb, tacklers: [d], control: new Map([[d, held]]), grip: new Map([[d, held]]) };
  const joints = [{ kind: 'grasp', broken: false, a: d.body, b: qb.body, legs }];
  return new Proxy(sim, { get(t: any, p: string | symbol) {
    if (p === 'bond') return bond;
    if (p === 'world') return { ...t.world, joints };
    const v = Reflect.get(t, p); return typeof v === 'function' ? v.bind(t) : v; } });
}

/** A QB in his windup on a real play, just before release, and his pending throw. */
async function windup(flag: string, seed: number) {
  vi.stubEnv('THROW_BODY', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const qbm = await import('../src/sim/behaviors/qb.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  while (sim.phase === 'live' && sim.t < 5) {
    const b: any = sim.qb.behavior;
    if (b.phase === 'windup' && b.pending && sim.t >= b.releaseAt - 2 * sim.dt) return { sim, b, qbm };
    sim.tick();
  }
  return null;
}

/** Release the pending throw through `sim` (possibly a held view) and capture the launch. */
function release(b: any, qb: any, sim: any) {
  let got: any = null; const real = sim.throwBall;
  const view = new Proxy(sim, { get(t: any, p: string | symbol) {
    if (p === 'throwBall') return (...args: any[]) => { got = { v0: args[2], intended: args[3] }; return real.apply(t, args); };
    return Reflect.get(t, p); } });
  b.release(qb, view, b.pending);
  return got;
}

describe('THROW_BODY', () => {
  it('interference is 0 unheld and rises with how firmly and how high he is held', async () => {
    const w = await windup('1', 1); expect(w).not.toBeNull();
    const { sim, qbm } = w!; const I = (h: number, l: number) => qbm.throwInterference(sim.qb, holding(sim, h, l));
    expect(qbm.throwInterference(sim.qb, sim)).toBe(0);
    expect(I(0.4, 0.3)).toBeLessThan(I(0.8, 0.3));
    expect(I(0.8, 0.8)).toBeLessThan(I(0.8, 0.2));
    expect(I(1, 0)).toBe(1); expect(I(1, 1)).toBe(0);
  });

  it('a throw released under a hold is an arm throw to that degree, with a wider miss', async () => {
    // A recording dice stream (the same draws for every arm): each normal() returns its mean
    // plus one sd, and records the sd, so the miss spread the release asks for can be compared.
    const recorded = (sim: any) => { const sds: number[] = [];
      const rng = { normal: (m: number, sd: number) => { sds.push(sd); return m + sd; }, next: () => 0.5, chance: () => false };
      return { sds, view: new Proxy(sim, { get(t: any, p: string | symbol) { if (p === 'dice') return () => rng;
        const v = Reflect.get(t, p); return typeof v === 'function' ? v.bind(t) : v; } }) }; };
    let checked = 0;
    for (const seed of [1, 2, 3]) {
      const arms = [[0, 1], [0.5, 0.5], [1, 0]].map(() => windup('1', seed));
      const ws = await Promise.all(arms); if (ws.some(w => !w)) continue;
      const sig: number[] = [], flick: number[] = [];
      for (const [k, [held, legs]] of ([[0, 1], [0.5, 0.5], [1, 0]] as const).entries()) {
        const w = ws[k]!; const before = w.b.flick;
        const base = held > 0 ? holding(w.sim, held, legs) : w.sim; const r = recorded(base);
        const I = held > 0 ? w.qbm.throwInterference(w.sim.qb, base) : 0;
        release(w.b, w.sim.qb, r.view);
        expect(w.b.flick).toBeCloseTo(Math.max(before, I), 12);
        sig.push(r.sds[2]); flick.push(w.b.flick); // the miss across the throw: dice.normal(0, sigma)
      }
      expect(sig[1]).toBeGreaterThan(sig[0]); expect(sig[2]).toBeGreaterThan(sig[1]);
      expect(flick[2]).toBe(1);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('a hold taken in the load pins the arm with a chance that rises with the hold', async () => {
    const pinned = (sim: any, held: number, legs: number, roll: boolean) => { const asked: number[] = [];
      const rng = { chance: (p: number) => { asked.push(p); return roll; }, normal: (m: number) => m, next: () => 0.5 };
      const base = holding(sim, held, legs);
      return { asked, view: new Proxy(base, { get(t: any, p: string | symbol) { if (p === 'dice') return () => rng; return Reflect.get(t, p); } }) }; };
    let checked = 0;
    for (const seed of [1, 2, 3]) {
      const ws = await Promise.all([windup('1', seed), windup('1', seed), windup('1', seed)]);
      if (ws.some(w => !w)) continue;
      const [light, firm, kept] = ws as any[];
      if (light.sim.t < light.sim.deliveryAt) continue; // the roll is at the arm's forward start
      const a = pinned(light.sim, 0.4, 0.5, true), b = pinned(firm.sim, 0.9, 0.2, true), c = pinned(kept.sim, 0.9, 0.2, false);
      // The hold is on him when the arm must come forward: the roll for this throw has not happened yet.
      for (const w of [light, firm, kept]) w.b.pinRolled = false;
      light.b.update(light.sim.qb, a.view); firm.b.update(firm.sim.qb, b.view); kept.b.update(kept.sim.qb, c.view);
      expect(a.asked[0]).toBeCloseTo(0.4 * 0.5, 12); expect(b.asked[0]).toBeCloseTo(0.9 * 0.8, 12);
      expect(light.b.phase).toBe('set'); expect(light.b.pending).toBeNull();   // pinned: the throw is abandoned
      expect(kept.b.phase).toBe('windup');                                      // not pinned: the throw goes on
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('an unheld throw is the same with the flag on and off', async () => {
    for (const seed of [1, 2, 3]) {
      const on = await windup('1', seed), off = await windup('0', seed);
      if (!on || !off) continue;
      const a = release(on.b, on.sim.qb, on.sim), b = release(off.b, off.sim.qb, off.sim);
      expect(a.v0).toEqual(b.v0);
    }
  });
});

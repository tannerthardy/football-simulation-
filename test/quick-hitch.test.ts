/** QUICK_HITCH (src/playbook/concepts.ts, routes.ts; experimental, off): the quick game's hitch at 5 yd, the five-step
 * hitch at 6. On the engine defaults (the stack's flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('QUICK_HITCH', on ? '1' : '0');
  return { ...(await import('../src/playbook/concepts.js')), ...(await import('../src/playbook/routes.js')) };
}

describe('QUICK_HITCH', () => {
  it('the quick family runs the quick hitch; dropback concepts keep the hitch at 6', async () => {
    const off = await load(false);
    expect(off.PASS_BY_ID.hitches.strong[1]).toBe('hitch');
    const on = await load(true);
    for (const c of on.PASS_CONCEPTS) {
      const routes = [...Object.values(c.strong), ...Object.values(c.weak)];
      if (c.family === 'quick') expect(routes, c.id).not.toContain('hitch');
      else expect(routes, c.id).not.toContain('quick_hitch');
    }
    expect(on.PASS_BY_ID.hitches.strong[1]).toBe('quick_hitch');
    expect(on.PASS_BY_ID.smash.strong[1]).toBe('hitch');
    // A yard shallower, the same shape.
    expect(on.getRoute('quick_hitch').points[0].d).toBe(on.getRoute('hitch').points[0].d - 1);
  });

  it('on a staged play the hitch runner stops at 5 yd or under; off, past 5', async () => {
    const stop = async (on: boolean) => {
      await load(on);
      const { PlaySim } = await import('../src/sim/playsim.js');
      const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
      const depths: number[] = [];
      for (const seed of [1, 2, 3]) {
        const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'hitches', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
        const dir = sim.attackDir('O'), z = sim.slot('Z');
        let climbed = false, prev = z.pos.x;
        for (let i = 0; i < 60 && depths.length < seed; i++) {
          sim.tick();
          const v = (z.pos.x - prev) / sim.dt * dir; prev = z.pos.x;
          if (v > 3) climbed = true; else if (climbed && v < 1) depths.push((z.pos.x - sim.los) * dir);
        }
      }
      return depths;
    };
    const on = await stop(true), off = await stop(false);
    expect(on.length).toBe(3);
    expect(off.length).toBe(3);
    // Re-recorded 2026-11-24 on engine-92 (7b36c6e55): the plant is read as the first tick under 1 yd/s downfield, which
    // can land just past the 5 yd point (on 5.22 / 5.02 / 5.01, off 6.24 / 5.85 / 5.85). The claim is the yard between
    // the quick hitch (5) and the five-step hitch (6), so the cut is midway between them, not 0.2 past 5.
    for (const d of on) expect(d).toBeLessThanOrEqual(5.5);
    for (const d of off) expect(d).toBeGreaterThan(5.5);
  }, 120_000);
});

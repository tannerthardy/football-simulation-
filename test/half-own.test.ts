/** HALF_OWN (src/sim/behaviors/defense.ts, `ZoneCoverage.zonePlay`; experimental, off): a half-field or middle-third
 * safety holds the midpoint of two verticals in his area until the throw. On the engine defaults (the stack's flags
 * stubbed on, as quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('HALF_OWN', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { ZoneCoverage } = await import('../src/sim/behaviors/defense.js');
  const { facingTechnique } = await import('../src/sim/coverage/orientation.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const out = { held: 0, droveWhileHeld: 0 };
  for (const d of sim.defense) {
    const b = d.behavior;
    if (!(b instanceof ZoneCoverage) || !b.zone.startsWith('deep_half')) continue;
    const u = b.update.bind(b);
    b.update = (...q: Parameters<typeof b.update>) => {
      d.tags.delete('half-own');
      const r = u(...q);
      if (sim.throwAt < 0 && d.tags.has('half-own')) {
        out.held++;
        if (facingTechnique(r)?.label === 'deep-drive') out.droveWhileHeld++;
      }
      return r;
    };
  }
  sim.run();
  return out;
}

describe('HALF_OWN', () => {
  it('off: no half safety holds the two-vertical midpoint by this rule', async () => {
    for (const seed of [1, 2]) expect((await run(false, seed)).held).toBe(0);
  });
  it('on: against four verticals the halves hold the midpoint and never drive down before the throw', async () => {
    let held = 0;
    for (const seed of [1, 2]) {
      const r = await run(true, seed);
      held += r.held;
      expect(r.droveWhileHeld).toBe(0);
    }
    expect(held).toBeGreaterThan(0);
  });
});

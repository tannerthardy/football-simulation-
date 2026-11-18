/** TAMPA_PIPE (src/sim/coverage/rules.ts, `tampaPipe`; experimental, off): the Tampa 2 Mike stays in the pipe instead of
 * riding smash's #2 corner stem outside the hashes. On the engine defaults (the stack's flags stubbed on, as
 * quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The Mike's largest distance (yd) from the field's middle between 2.0 s and the throw (or 4.0 s). */
async function wander(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('TAMPA_PIPE', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { FIELD_WIDTH } = await import('../src/core/field.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'tampa2', concept: 'smash', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const m = sim.defense.find((d) => (d.behavior as { rule?: string } | undefined)?.rule === 'tampa_mike')!;
  let most = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.t >= 2 && sim.t <= 4 && sim.throwAt < 0) most = Math.max(most, Math.abs(m.pos.y - FIELD_WIDTH / 2)); };
  sim.run();
  return most;
}

describe('TAMPA_PIPE', () => {
  it('against smash the Mike stays nearer the middle than when he rode the corner stem', async () => {
    let off = 0, on = 0;
    for (const seed of [1, 2, 3]) { off += await wander(false, seed); on += await wander(true, seed); }
    expect(on).toBeLessThan(off);
  });
});

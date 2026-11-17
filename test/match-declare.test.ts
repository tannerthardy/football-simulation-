/** MATCH_DECLARE (src/sim/coverage/rules.ts, `seamCurlFlatDeclared`; experimental, off): the Rip/Liz seam/curl-flat
 * player reads #2 through the declare phase, then matches #2 out to the flat instead of zoning off. On the engine
 * defaults (the stack's flags stubbed on, as quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Mean distance (yd) of the strong seam/curl-flat player to #2 running the flat, from 1.2 s to the throw. */
async function gap(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('MATCH_DECLARE', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_match', concept: 'curl_flat', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const two = sim.offense.find((r) => r.slot === sim.offAlign.numbering.S2)!;
  const d = sim.defense.find((x) => (x.behavior as { rule?: string } | undefined)?.rule === 'c3_curl_flat'
    && Math.sign(x.pos.y - sim.ballY) === Math.sign(two.pos.y - sim.ballY))!;
  let sum = 0, n = 0;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (sim.t > 1.2 && sim.throwAt < 0) { sum += Math.hypot(d.pos.x - two.pos.x, d.pos.y - two.pos.y); n++; } };
  sim.run();
  return n ? sum / n : NaN;
}

describe('MATCH_DECLARE', () => {
  it('the seam/curl-flat player stays on #2 to the flat (match #2 out) instead of zoning off', async () => {
    for (const seed of [1, 2]) {
      const off = await gap(false, seed), on = await gap(true, seed);
      expect(on, `seed ${seed}`).toBeLessThan(off);
    }
  });
});

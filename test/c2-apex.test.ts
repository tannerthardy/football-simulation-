/** C2_APEX (src/sim/coverage/rules.ts, `verticalCurlTaught`; experimental, off): the Cover 2 vertical-curl apex
 * zones the curl window when #2 goes to the flat, closing the curl by #1 behind it. On the engine
 * defaults (the stack's flags stubbed on, as quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Distance (yd) of the strong-side vertical-curl apex to #1 running the curl at the throw. */
async function gap(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('C2_APEX', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover2_match', concept: 'curl_flat', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const two = sim.offense.find((r) => r.slot === sim.offAlign.numbering.S1)!;
  const d = sim.defense.find((x) => (x.behavior as { rule?: string } | undefined)?.rule === 'c2_hook'
    && Math.sign(x.pos.y - sim.ballY) === Math.sign(two.pos.y - sim.ballY))!;
  let sum = 0, n = 0;
  const tick = sim.tick.bind(sim);
  // At the throw (or 2.5 s): where the apex stands relative to the curl.
  sim.tick = () => { tick(); if (!n && (sim.throwAt >= 0 || sim.t >= 2.5)) { sum = Math.hypot(d.pos.x - two.pos.x, d.pos.y - two.pos.y); n = 1; } };
  sim.run();
  return n ? sum / n : NaN;
}

describe('C2_APEX', () => {
  it('with #2 in the flat, the apex works toward the curl by #1 instead of the hook', async () => {
    let off = 0, on = 0;
    for (const seed of [1, 2, 3]) { off += await gap(false, seed); on += await gap(true, seed); }
    expect(on).toBeLessThan(off);
  });
});

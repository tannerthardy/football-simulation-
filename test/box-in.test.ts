/** BOX_IN (src/sim/coverage/defender.ts `passUnder`; experimental, off): the Box low inside defender
 * keeps the bunch's first in-breaker instead of walling and passing him. On the engine
 * defaults (the stack's flags stubbed on, as quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Distance (yd) of the Box low inside defender to #2 running the shallow at the throw (or 2.5 s). */
async function gap(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('BOX_IN', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover4', concept: 'mesh', seed, roster: seed, formation: 'gun_bunch_11', flip: false }));
  const two = sim.offense.find((r) => r.slot === sim.offAlign.numbering.S2)!;
  const d = sim.defense.find((x) => (x.behavior as { rule?: string } | undefined)?.rule === 'box_in_low'
   )!;
  let sum = 0, n = 0;
  const tick = sim.tick.bind(sim);
  // At the throw (or 2.5 s): where the apex stands relative to the curl.
  sim.tick = () => { tick(); if (!n && (sim.throwAt >= 0 || sim.t >= 2.5)) { sum = Math.hypot(d.pos.x - two.pos.x, d.pos.y - two.pos.y); n = 1; } };
  sim.run();
  return n ? sum / n : NaN;
}

describe('BOX_IN', () => {
  it('against mesh from bunch the Box low inside defender stays with the shallow', async () => {
    let off = 0, on = 0;
    for (const seed of [1, 2, 3]) { off += await gap(false, seed); on += await gap(true, seed); }
    expect(on).toBeLessThan(off);
  });
});

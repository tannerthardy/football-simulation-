/** bestThrowNow (behaviors/qb.ts): the read logic's answer to "what would I
 * throw now?" can be asked without committing: it never changes his read order
 * (readIdx / readStart); only advanceRead does. */
import { describe, expect, it } from 'vitest';
import { PlaySim } from '../src/sim/playsim.js';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';

describe('bestThrowNow', () => {
  it('asking it does not move his read order', () => {
    let asked = 0;
    for (const seed of [1, 2, 3, 4]) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
      while (sim.phase === 'live' && sim.t < 5 && sim.throwAt < 0) {
        sim.tick();
        const b: any = sim.qb.behavior;
        if (b.phase !== 'set') continue;
        const idx = b.readIdx, start = b.readStart;
        const bar = { thr: 0.5, maxInt: 0.05, need: 0.5, risk: 0.05, dwell: 0.6 };
        for (let k = 0; k < 3; k++) b.bestThrowNow(sim.qb, sim, 0.5, bar);
        expect(b.readIdx).toBe(idx); expect(b.readStart).toBe(start);
        asked++;
      }
    }
    expect(asked).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { G } from '../src/core/units.js';
import { PlaySim } from '../src/sim/playsim.js';
import { runContactObservers } from '../src/sim/run-contact-observer.js';

// SEAL_HOLD (on by default): a run blocker whose hands are loaded keeps the
// leverage he caught the man with instead of running to a new shoulder.
describe('a loaded run blocker keeps the leverage he caught the man with', () => {
  it('I-formation jumbo duo: the H no longer runs the strong end 3.7 yd out with his seal pinned at top speed', () => {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'duo', seed: 1, roster: 7, formation: 'i_jumbo_22', flip: false }));
    const end = sim.slot('DE_S')!;
    let loaded = 0, pinned = 0, y0: number | undefined, y1 = 0;
    runContactObservers.set(sim, (e, kind, x) => {
      if (e.defender !== end || kind !== 'movement') return;
      const m = x as { seal: number; mirror: number };
      y0 ??= end.pos.y; y1 = end.pos.y;
      const felt = e.blocker.body.support?.felt;
      if (!felt || Math.hypot(felt.x, felt.y) <= 0.1 * e.blocker.profile.massKg * G) return;
      loaded++;
      if (Math.abs(m.seal) >= m.mirror - 1e-9) pinned++;
    });
    sim.run();
    // Off: 101 loaded steps, 19 at the top lateral request, end carried 3.70 yd.
    expect(loaded).toBeGreaterThan(20);
    expect(pinned).toBe(0);
    expect((y1 - y0!) * end.runFit!.side).toBeLessThan(2);
  });
});

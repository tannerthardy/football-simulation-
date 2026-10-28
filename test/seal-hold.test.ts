import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { G } from '../src/core/units.js';
import { PlaySim } from '../src/sim/playsim.js';
import { runContactObservers } from '../src/sim/run-contact-observer.js';

// SEAL_HOLD (on by default): a run blocker whose hands are loaded keeps the
// leverage he caught the man with instead of running to a new shoulder.
describe('a loaded run blocker keeps the leverage he caught the man with', () => {
  it('I-formation jumbo duo: the H no longer runs the strong end 7.2 yd out with his seal pinned at top speed', () => {
    // Start law (#336): the unflipped play no longer carries the end out even
    // with SEAL_HOLD=0 (0.71 yd); its mirror shows the run-out, so record that.
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'duo', seed: 1, roster: 7, formation: 'i_jumbo_22', flip: true }));
    const end = sim.slot('DE_S')!;
    let loaded = 0, pinned = 0, y0: number | undefined, y1 = 0;
    runContactObservers.set(sim, (e, kind, x) => {
      if (e.defender !== end || kind !== 'movement') return;
      const m = x as { seal: number; mirror: number };
      y0 ??= end.pos.y; y1 = end.pos.y;
      const felt = e.blocker.body.support?.felt;
      if (!felt || Math.hypot(felt.x, felt.y) <= 0.1 * e.blocker.profile.massKg * G) return;
      loaded++;
      // The runaway this pins is the H carrying the end outward with his
      // seal at top speed. A seal at top speed while the end crosses inside
      // his face (engaged-flow law: the end leads the pair inside, carried
      // partly by hands and contact, and outruns H near 3.3 s) is a lost
      // race, not that runaway.
      if (Math.abs(m.seal) >= m.mirror - 1e-9 && end.vel.y * end.runFit!.side > 0) pinned++;
    });
    sim.run();
    // Off: 95 loaded steps, 47 at the top lateral request, end carried 7.24 yd.
    expect(loaded).toBeGreaterThan(20);
    expect(pinned).toBe(0);
    expect((y1 - y0!) * end.runFit!.side).toBeLessThan(2);
  });
});

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
    let loaded = 0, pinned = 0;
    runContactObservers.set(sim, (e, kind, x) => {
      if (e.defender !== end || kind !== 'movement') return;
      const m = x as { seal: number; mirror: number };
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
    // Off: 101 loaded steps, 19 at the top lateral request, end carried 3.70 yd (on develop 90daa454: 61 pinned
    // steps; with the squeeze read, 37). The end's net outward travel is no longer asserted: with the squeeze read
    // the end widens on his own request (2.45 of 2.72 yd outward while he asks outward: past his containment bound
    // the engaged-flow law still adds his held flow, KNOWN_PROBLEMS RUN-18), and the 2-yd bar had
    // passed on develop only because the old squeeze, reading the QB at the mesh, asked him 4.6 yd/s inward. Net
    // travel cannot tell his own widening from the runaway (with SEAL_HOLD off the carried end asks outward too);
    // the seal pinned at top speed while he moves outward can, and stays 0.
    expect(loaded).toBeGreaterThan(20);
    expect(pinned).toBe(0);
  });
});

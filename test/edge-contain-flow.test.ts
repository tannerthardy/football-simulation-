import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import { runContactObservers } from '../src/sim/run-contact-observer.js';

// RUN-18: an engaged edge already wider than containing the runner needs stops
// widening and holds his ground. The engaged-flow law (#347) set his target to
// where he stood but still added the flow he read, so he kept drifting outward.
describe('an engaged edge past his containment bound', () => {
  it.each([false, true])('I-formation jumbo duo (flip %s): never asks to go wider', flip => {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'duo', seed: 1, roster: 7, formation: 'i_jumbo_22', flip }));
    let past = 0, wider = 0;
    runContactObservers.set(sim, (e, kind, x) => {
      if (kind !== 'defender-movement') return;
      const d = e.defender, side = d.runFit?.side ?? 0;
      const m = x as { contain?: number; trail?: boolean; workOff?: boolean; squeeze: number; command: { vel: { y: number } } };
      // A squeeze or a move off the block is its own decision; this is the ordinary flow request.
      if (m.contain === undefined || m.trail || m.workOff || m.squeeze || !side || (d.pos.y - m.contain) * side <= 0) return;
      past++;
      if (m.command.vel.y * side > 1e-6) wider++;
    });
    sim.run();
    // Without the bound holding the read flow, 45 of 98 (flip false) and 56 of 67 (flip true) such ticks ask wider.
    expect(past).toBeGreaterThan(0);
    expect(wider).toBe(0);
  });
});

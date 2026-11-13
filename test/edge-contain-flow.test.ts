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
    // Without the bound holding the read flow, 27 of 63 (flip false) and 54 of 65 (flip true) such ticks ask wider (develop 0ab4bf39).
    expect(past).toBeGreaterThan(0);
    expect(wider).toBe(0);
  });

  it('wide zone strong (ace, seed 2): widens freely inside his bound, stops at it, and still works back inward', () => {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'wz_strong', seed: 2, roster: 7, formation: 'ace_11', flip: false }));
    const n = { inside: 0, insideWider: 0, past: 0, pastWider: 0, pastInward: 0 };
    runContactObservers.set(sim, (e, kind, x) => {
      if (kind !== 'defender-movement') return;
      const d = e.defender, side = d.runFit?.side ?? 0;
      const m = x as { contain?: number; trail?: boolean; workOff?: boolean; squeeze: number; command: { vel: { y: number } } };
      if (m.contain === undefined || m.trail || m.workOff || m.squeeze || !side) return;
      const v = m.command.vel.y * side;
      if ((d.pos.y - m.contain) * side <= 0) { n.inside++; if (v > 1e-6) n.insideWider++; }
      else { n.past++; if (v > 1e-6) n.pastWider++; if (v < -1e-6) n.pastInward++; }
    });
    sim.run();
    // The ordinary request is untouched inside the bound, and an inward one is kept past it: only the outward
    // held flow past the bound is dropped. With the bound: 37 / 37 inside ask wider; 0 of 9 past it, 7 inward.
    // (Wide zone weak, flip, seed 2 was this case until the line read squeezed its backside end from 0.75 s.)
    expect(n.inside).toBeGreaterThan(0);
    expect(n.insideWider).toBe(n.inside);
    expect(n.past).toBeGreaterThan(0);
    expect(n.pastWider).toBe(0);
    expect(n.pastInward).toBeGreaterThan(0);
  });
});

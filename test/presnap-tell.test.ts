import { describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.PRESNAP_TELL = '1'; });
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Agent } from '../src/sim/agent.js';

/** PRESNAP_TELL: a lineman's leaning set shows his first step's side; an
 * interior defender who reads it steps with it at his get-off, before the
 * man's own step is visible. Each case stages the lean and the reader's
 * recognition directly, on the same native outside-zone snap. */
function snap(lean: number | null, recognition: number) {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'oz_strong', seed: 1, roster: 7, formation: 'ace_11', flip: false }));
  const dt = sim.defense.find(d => d.slot === 'DT_S')!;
  const guard = sim.offense.filter(o => ['LG', 'RG', 'C'].includes(o.slot))
    .reduce((m, o) => Math.abs(o.pos.y - dt.pos.y) < Math.abs(m.pos.y - dt.pos.y) ? o : m);
  if (lean !== null) guard.presnapLean = lean;
  (dt.player.ratings as Record<string, number>).playRecognition = recognition;
  // Before the guard's own step can show in the tackle's picture.
  while (sim.t < 0.25 - 1e-9) sim.tick();
  return { sim, dt, guard };
}
const lateral = (a: Agent) => a.vel.y;

describe('a pre-snap lean read by the man in front', () => {
  it('the tackle steps with the guard\'s lean at his get-off, before the guard\'s step shows', () => {
    // With nothing to read, his rush lane drifts one way (0.38 yd/s here).
    const plain = Math.abs(lateral(snap(0, 99).dt));
    for (const side of [1, -1]) {
      const { dt } = snap(side, 99);
      expect(dt.tags.has('tell-step')).toBe(true);
      // Either lean turns him to that side, faster than his plain drift.
      expect(lateral(dt) * side).toBeGreaterThan(plain);
    }
  });
  it('no lean, or no recognition, gives no early step', () => {
    const plain = snap(0, 99).dt, blind = snap(1, 0).dt;
    expect(plain.tags.has('tell-step')).toBe(false);
    expect(blind.tags.has('tell-step')).toBe(false);
    expect(lateral(blind)).toBeCloseTo(lateral(plain), 9);
  });
  it('only a leaned set starts early, and never before the snap', () => {
    const { sim } = snap(null, 50);
    for (const o of sim.offense) {
      if (o.presnapLean) {
        expect(o.presnapDelay).toBeLessThan(0);
        expect(o.mind.snapDelay + o.presnapDelay).toBeGreaterThanOrEqual(0);
      } else expect(o.presnapDelay).toBe(0);
    }
  });
});

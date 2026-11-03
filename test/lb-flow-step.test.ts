import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Agent } from '../src/sim/agent.js';

/** A box backer who has not yet read run or pass is not still: he shuffles
 * square with the flow he sees (the back, or else the line), holding his
 * depth. Native cover 3 snaps in Ace; the middle backer is a zone defender who
 * is still unsure at 0.4 s. On a pass set nothing flows and he holds. */
function snap(concept: string, flip: boolean) {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed: 1, roster: 7, formation: 'ace_11', flip }));
  const mike = sim.slot('LB_M' as Agent['slot'])!, back = sim.slot('RB' as Agent['slot'])!;
  const depth0 = mike.pos.x;
  let shuffle = 0;
  while (sim.phase === 'live' && sim.t < 0.6 - 1e-9) {
    sim.tick();
    if (mike.recog?.read === 'unsure') shuffle = Math.max(shuffle, Math.abs(mike.vel.y));
    if (Math.abs(sim.t - 0.4) < 1e-9) return { sim, mike, back, vy: mike.vel.y, bvy: back.vel.y, depth: mike.pos.x - depth0, read: mike.recog?.read };
  }
  return { sim, mike, back, vy: 0, bvy: 0, depth: 0, read: mike.recog?.read, shuffle };
}

describe('a box backer moves with the flow before he has read the play', () => {
  for (const flip of [false, true]) {
    it(`on outside zone the unsure middle backer shuffles the way the back runs, at his depth (${flip ? 'flipped' : 'native'})`, () => {
      const s = snap('oz_strong', flip);
      expect(s.read).toBe('unsure');
      expect(Math.abs(s.bvy)).toBeGreaterThan(1);
      // Same side as the back's run in either direction of the play.
      expect(s.vy * Math.sign(s.bvy)).toBeGreaterThan(.2);
      // A shuffle, not a fit: he has not come downhill.
      expect(Math.abs(s.depth)).toBeLessThan(.1);
    });
    it(`on a pass set nothing flows: the unsure middle backer holds (${flip ? 'flipped' : 'native'})`, () => {
      const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'smash', seed: 1, roster: 7, formation: 'ace_11', flip }));
      const mike = sim.slot('LB_M' as Agent['slot'])!;
      let moved = 0;
      while (sim.phase === 'live' && sim.t < 0.6 - 1e-9) {
        sim.tick();
        if (mike.recog?.read === 'unsure') moved = Math.max(moved, Math.abs(mike.vel.y));
      }
      expect(moved).toBeLessThan(.05);
    });
  }
});

import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Agent } from '../src/sim/agent.js';

/** The line read (G2): a lineman reads the play from the line in front of him.
 * Each mechanism is checked on native snaps beside its opposing control: a
 * pass set or a route release is not a run step; a reach is not a down block;
 * a backside edge follows the line instead of replacing the spot. */
function play(concept: string, formation: string, seed: number, flip: boolean) {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept, seed, roster: 7, formation, flip }));
  // The play side, from the offense's own plan: the way its pullers go (none on zone).
  const pullers = sim.offense.filter(a => (a.behavior as { plan?: { kind?: string } }).plan?.kind === 'pull');
  const home = new Map(pullers.map(a => [a, a.pos.y]));
  sim.run();
  const ballSide = Math.sign(pullers.reduce((s, a) => s + a.pos.y - home.get(a)!, 0));
  return { sim, ballSide };
}
const dl = (sim: PlaySim) => sim.defense.filter(a => /^(DE|DT|NT)/.test(a.slot));
const interior = (sim: PlaySim) => dl(sim).filter(a => !a.slot.startsWith('DE'));
const edges = (sim: PlaySim) => dl(sim).filter(a => a.slot.startsWith('DE'));
const snaps = (concept: string, formation: string) =>
  [1, 2, 3].flatMap(seed => [false, true].map(flip => ({ seed, flip, ...play(concept, formation, seed, flip) })));
const tagged = (as: Agent[], tag: string) => as.filter(a => a.tags.has(tag)).length;

describe('a lineman reads the play from the line', () => {
  it('an interior lineman flat-steps on a zone step, and never on a pass set', () => {
    for (const s of snaps('oz_strong', 'ace_11')) expect(tagged(interior(s.sim), 'key-step')).toBe(interior(s.sim).length);
    for (const concept of ['curl_flat', 'four_verts', 'mesh'])
      for (const s of snaps(concept, 'gun_doubles_11')) expect(tagged(dl(s.sim), 'key-step')).toBe(0);
  });

  it('an edge squeezes a down block, not a route released inside past him', () => {
    // Inside zone's end man blocks down: one edge squeezes on every snap.
    for (const s of snaps('iz_strong', 'ace_11')) expect(tagged(edges(s.sim), 'key-squeeze')).toBeGreaterThan(0);
    // Mesh's tight end releases inside upright into his crossing route: not a down block.
    for (const s of snaps('mesh', 'gun_doubles_11')) expect(tagged(edges(s.sim), 'key-squeeze')).toBe(0);
  });

  it('a play-side edge replaces the vacated spot on counter; a backside edge on wide zone never does', () => {
    for (const s of snaps('counter', 'i_jumbo_22')) {
      const replaced = edges(s.sim).filter(a => a.tags.has('fit-replace'));
      expect(replaced.length).toBe(1);
      expect(replaced[0].runFit!.side).toBe(s.ballSide);
    }
    for (const s of snaps('wz_weak', 'ace_11')) expect(tagged(edges(s.sim), 'fit-replace')).toBe(0);
  });
});

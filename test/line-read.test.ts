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
  // When each edge first took each fit response (tags accumulate over the whole play).
  const firstFit = new Map<string, number>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const a of sim.defense) for (const tag of ['fit-replace', 'fit-box', 'fit-spill'])
      if (a.tags.has(tag) && !firstFit.has(`${a.slot}:${tag}`)) firstFit.set(`${a.slot}:${tag}`, sim.t);
  };
  sim.run();
  const ballSide = Math.sign(pullers.reduce((s, a) => s + a.pos.y - home.get(a)!, 0));
  return { sim, ballSide, firstFit };
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

  it('a play-side edge replaces the vacated spot on counter or plays the kick-out he sees; a backside edge never replaces', () => {
    // Once he sees the kick-out arriving (a non-line blocker in front of him and in range is seen on the
    // ordinary delay under a run read), he plays it instead of squeezing to the spot: on one of the six
    // snaps he boxes the kick-out throughout. Only the play-side edge ever replaces, and his response
    // opens the play. A backside edge may later box a blocker arriving at him (run-fits' local kick-out
    // response, a different duty): seed 1 unflipped, DE_S boxes F at 4.15 once #390 keeps the play alive.
    const first = (s: ReturnType<typeof play>, a: Agent) =>
      Math.min(...['fit-replace', 'fit-box', 'fit-spill'].map(tag => s.firstFit.get(`${a.slot}:${tag}`) ?? Infinity));
    for (const s of snaps('counter', 'i_jumbo_22')) {
      const playSide = edges(s.sim).filter(a => a.runFit!.side === s.ballSide);
      const backside = edges(s.sim).filter(a => a.runFit!.side !== s.ballSide);
      expect(playSide).toHaveLength(1);
      expect(first(s, playSide[0])).toBeLessThan(Infinity);
      for (const b of backside) {
        expect(b.tags.has('fit-replace')).toBe(false);
        expect(first(s, b)).toBeGreaterThan(first(s, playSide[0]));
      }
    }
    expect(snaps('counter', 'i_jumbo_22').filter(s => edges(s.sim).some(a => a.tags.has('fit-replace'))).length).toBeGreaterThanOrEqual(5);
    for (const s of snaps('wz_weak', 'ace_11')) expect(tagged(edges(s.sim), 'fit-replace')).toBe(0);
  });
});

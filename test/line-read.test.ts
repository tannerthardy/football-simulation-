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
  // How far inside the spot his gap's inside man left each free edge ever gets (+ = outside it).
  const inside = new Map<Agent, number>();
  while (sim.phase === 'live') {
    sim.tick();
    for (const e of sim.defense) {
      const job = e.runFit;
      if (!e.slot.startsWith('DE') || e.engagement || job?.kind !== 'edge' || (job.gap !== 'C' && job.gap !== 'D')) continue;
      const mid = sim.offAlign.spots.C?.pos.y ?? sim.ballY;
      const out = sim.offense.filter(o => ['LT', 'LG', 'RG', 'RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline)
        .map(o => sim.offAlign.spots[o.slot]!.pos).filter(q => (q.y - mid) * job.side > 0).sort((p, q) => (p.y - q.y) * job.side);
      const inner = job.gap === 'D' ? out.at(-1) : out[1];
      if (inner) inside.set(e, Math.min(inside.get(e) ?? Infinity, (e.pos.y - inner.y - job.side * e.profile.radius) * job.side));
    }
  }
  const ballSide = Math.sign(pullers.reduce((s, a) => s + a.pos.y - home.get(a)!, 0));
  return { sim, ballSide, inside };
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
      expect(replaced.length).toBeLessThanOrEqual(1);
      for (const a of replaced) expect(a.runFit!.side).toBe(s.ballSide);
      // Squeeze, don't chase: either the bound held him at the spot, or his
      // live gap never took him inside it (crossing pullers no longer drag it in).
      const playSide = edges(s.sim).find(a => a.runFit?.side === s.ballSide)!;
      if (!replaced.length) expect(s.inside.get(playSide)).toBeGreaterThanOrEqual(0);
    }
    for (const s of snaps('wz_weak', 'ace_11')) expect(tagged(edges(s.sim), 'fit-replace')).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { PlaySim } from '../src/sim/playsim.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import type { Agent } from '../src/sim/agent.js';

/** An attacking interior lineman penetrates his gap; a two-gap lineman holds
 * the line. On trap the play-side tackle is left unblocked on purpose: with an
 * attack technique he charges into the backfield and meets the trapper there,
 * while the same tackle on the same snap playing control holds just past the
 * line of scrimmage. Native I-pro trap snaps, the tackle the trapper is sent to. */
function trap(seed: number, flip: boolean, technique?: 'control') {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'trap', seed, roster: 7, formation: 'i_pro_21', flip }));
  sim.tick();
  const trapper = sim.offense.find(a => a.behavior instanceof RunBlocker && (a.behavior as RunBlocker).plan.pullRole === 'trap')!;
  const man = (trapper.behavior as RunBlocker).plan.target as Agent;
  if (technique) man.runFit!.technique = technique;
  while (sim.phase === 'live' && sim.t < 1.2 - 1e-9) sim.tick();
  return { man, depth: man.pos.x - sim.los };
}

describe('an attacking interior lineman penetrates his gap', () => {
  for (const [seed, flip] of [[1, false], [1, true], [2, false], [2, true]] as const) {
    it(`the trapped tackle attacks into the backfield; playing control he holds the line (seed ${seed}${flip ? ' flipped' : ''})`, () => {
      const attack = trap(seed, flip);
      expect(attack.man.runFit).toMatchObject({ kind: 'interior', technique: 'attack' });
      // Past the line of scrimmage into the offense's backfield by 1.2 s.
      expect(attack.depth).toBeLessThan(-.15);
      // The same body and snap with a two-gap technique stays on his side of the line.
      expect(trap(seed, flip, 'control').depth).toBeGreaterThan(0);
    });
  }
});

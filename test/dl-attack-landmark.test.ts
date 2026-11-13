import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Agent } from '../src/sim/agent.js';
import type { RunBlocker as RunBlockerT } from '../src/sim/behaviors/blocking.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** An attacking interior lineman penetrates his gap; a two-gap lineman holds
 * the line. On trap the play-side tackle is left unblocked on purpose: with an
 * attack technique he charges into the backfield and meets the trapper there,
 * while the same tackle on the same snap playing control holds just past the
 * line of scrimmage. Native I-pro trap snaps, the tackle the trapper is sent to.
 * ATTACK_LANDMARK is experimental and off; with it off both hold the line. */
async function trap(seed: number, flip: boolean, technique?: 'control', flag = '1') {
  vi.stubEnv('ATTACK_LANDMARK', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { RunBlocker } = await import('../src/sim/behaviors/blocking.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3_buzz', concept: 'trap', seed, roster: 7, formation: 'i_pro_21', flip }));
  sim.tick();
  const trapper = sim.offense.find(a => a.behavior instanceof RunBlocker && (a.behavior as RunBlockerT).plan.pullRole === 'trap')!;
  const man = (trapper.behavior as RunBlockerT).plan.target as Agent;
  if (technique) man.runFit!.technique = technique;
  while (sim.phase === 'live' && sim.t < 1.2 - 1e-9) sim.tick();
  return { man, depth: man.pos.x - sim.los };
}

describe('an attacking interior lineman penetrates his gap', () => {
  for (const [seed, flip] of [[1, false], [1, true], [2, false], [2, true]] as const) {
    it(`the trapped tackle attacks into the backfield; playing control he holds the line (seed ${seed}${flip ? ' flipped' : ''})`, async () => {
      const attack = await trap(seed, flip);
      expect(attack.man.runFit).toMatchObject({ kind: 'interior', technique: 'attack' });
      // Past the line of scrimmage into the offense's backfield by 1.2 s.
      expect(attack.depth).toBeLessThan(-.15);
      // The same body and snap with a two-gap technique stays on his side of the line.
      expect((await trap(seed, flip, 'control')).depth).toBeGreaterThan(0);
      // Off: the attacking tackle keeps the old hold, on his side of the line.
      expect((await trap(seed, flip, undefined, '0')).depth).toBeGreaterThan(-.15);
    });
  }
});

/** Several observers on one game: the engine has a single `playResult` seam. */
import type { GameHooks } from '../../src/game/game.js';

/**
 * Run every `playResult` observer in order and return the first scripted
 * result (`undefined` when none scripts one). Observers wrap `sim.run`/`sim.tick`
 * on the instance and return `undefined`, so they never conflict. Other hooks
 * are taken from the first set that defines them.
 */
export function composeHooks(...sets: GameHooks[]): GameHooks {
  const out: GameHooks = {};
  const setups = sets.flatMap(h => h.playSetup ? [h.playSetup] : []);
  if (setups.length) out.playSetup = (setup, context) => {
    for (const observe of setups) observe(setup, context);
  };
  const results = sets.map((h) => h.playResult).filter((f): f is NonNullable<GameHooks['playResult']> => !!f);
  if (results.length) {
    out.playResult = (sim, kind) => {
      let first: ReturnType<NonNullable<GameHooks['playResult']>>;
      for (const f of results) {
        const r = f(sim, kind);
        first ??= r;
      }
      return first;
    };
  }
  for (const key of ['preSnapFoul', 'tryChoice', 'freeKickEvent', 'scrimmageKickEvent'] as const) {
    const found = sets.find((h) => h[key]);
    if (found) (out as Record<string, unknown>)[key] = found[key];
  }
  return out;
}

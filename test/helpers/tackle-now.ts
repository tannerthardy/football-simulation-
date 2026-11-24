/** Test helper (Run Game, 2026-11-24): an attempt, carried to its result. With REACH_TIME a reach takes time (the hands
 * go out over REACH_EXTEND) and resolves on a later tick; a fixture that asks "does he get a hold here" steps the
 * clock (not the bodies: a static fixture stays static) until no reach is in flight. Flag off, this is tryTackles.
 * Pass the tackle module a test imported itself (vi.resetModules + a stubbed flag) so the same instance is used. */
import type { PlaySim } from '../../src/sim/playsim.js';
import * as Static from '../../src/sim/tackle.js';

type TackleModule = Pick<typeof Static, 'REACH_TIME' | 'reachOf' | 'tryTackles'>;
export function tackleNow(sim: PlaySim, mod: TackleModule = Static, maxTicks = 6): void {
  mod.tryTackles(sim);
  if (!mod.REACH_TIME) return;
  for (let k = 0; k < maxTicks && sim.ball.kind === 'held' && sim.agents.some(a => mod.reachOf(a)); k++) {
    sim.t += sim.dt; sim.world.time += sim.dt;
    mod.tryTackles(sim);
  }
}

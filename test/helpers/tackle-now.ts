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

/** Fixture helper: the staged scene as everyone's perceived history (each body dead-reckoned back on its current
 * velocity over the perception buffer), so a decision that reads the tackler's picture sees what the fixture set up. */
export function recordPicture(sim: PlaySim, frames = 24): void {
  for (let k = 0; k < frames; k++) {
    const lag = (frames - 1 - k) * sim.dt;
    sim.perception.record(sim.agents.map(a => ({ pos: { x: a.pos.x - a.vel.x * lag, y: a.pos.y - a.vel.y * lag },
      vel: a.vel, facing: a.facing, stance: a.stance, pose: a.pose })), sim.ball.kind === 'held' ? sim.ball.carrier.idx : undefined);
  }
}

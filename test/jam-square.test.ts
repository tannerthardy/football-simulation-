/** JAM_SQUARE (src/sim/behaviors/receiver.ts; experimental, off): a press jam's hands join and hold only while the
 * corner is square to the receiver and not running off from him. Four verticals against Cover 1 press: on, jams still
 * form at the line, and on every tick a jam is held the corner faces him within 45 deg and runs away from him at no
 * more than 1.5 yd/s. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('JAM_SQUARE', () => {
  it('holds a jam only with the corner square and not running off', async () => {
    vi.stubEnv('JAM_SQUARE', '1');
    vi.resetModules();
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    let held = 0, bad = 0;
    for (const seed of [1, 2]) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        tick();
        for (const r of sim.offense) {
          const p = r.behavior?.pressContact;
          if (!p || !sim.world.joints.includes(p.hands)) continue;
          held++;
          const d = p.corner, rx = r.pos.x - d.pos.x, ry = r.pos.y - d.pos.y, dist = Math.hypot(rx, ry) || 1;
          const face = (Math.cos(d.facing) * rx + Math.sin(d.facing) * ry) / dist, away = -(d.vel.x * rx + d.vel.y * ry) / dist;
          // One tick of grace: the check runs on the receiver's next update after the bodies move.
          if (face < Math.SQRT1_2 - 0.15 || away > 2.5) bad++;
        }
      };
      sim.run();
    }
    expect(held).toBeGreaterThan(0);
    expect(bad).toBe(0);
  }, 120000);
});

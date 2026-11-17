/** ZONE_EYES: a zone defender's head follows the taught sequence (his key in the declare phase, then the passer), and
 * his sight of a receiver goes through that head (SIGHT_COVER's head view), not every receiver at once. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('ZONE_EYES', () => {
  it('turns each zone defender\'s head to his key, then to the passer', async () => {
    vi.stubEnv('ZONE_EYES', '1');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const Z = await import('../src/sim/zone-eyes.js');
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
    const off = (d: any, t: any) => { const b = Math.atan2(t.pos.y - d.pos.y, t.pos.x - d.pos.x); return Math.abs(Math.atan2(Math.sin(d.head - b), Math.cos(d.head - b))); };
    let key = 0, qb = 0, n = 0;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.ball.kind !== 'held') return;
      for (const d of sim.defense) {
        if (!Z.zoneEyesFor(d) || d.head == null) continue;
        const t = Z.zoneEyesTarget(d, sim);
        if (!t) continue;
        if (Math.abs(sim.t - 0.6) < 1e-6) { n++; if (t !== sim.qb && off(d, t) < 0.35) key++; }
        if (Math.abs(sim.t - 1.25) < 1e-6 && t === sim.qb && off(d, t) < 0.35) qb++;
      }
    };
    sim.run();
    expect(n).toBeGreaterThan(4);
    expect(key).toBeGreaterThanOrEqual(n - 1);
    expect(qb).toBeGreaterThanOrEqual(n - 1);
  }, 60000);
});

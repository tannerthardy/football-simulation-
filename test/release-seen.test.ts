/** RELEASE_SEEN (behaviors/receiver.ts; experimental, off): a receiver releases around a defender he saw tight over
 * him at the snap, whoever that defender is, instead of only the one the defence's call made his press-man corner
 * (an assignment he cannot know). The true press-man release keeps its technique. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string, setup: { coverage: string; concept: string; formation: string; seed: number }) {
  // The release-around it extends (PRESS_MIRROR / PRESS_RELEASE) is on in the engine; the suite pins the legacy engine.
  vi.stubEnv('PRESS_MIRROR', '1'); vi.stubEnv('PRESS_RELEASE', '1');
  vi.stubEnv('RELEASE_SEEN', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const R: any = await import('../src/sim/behaviors/receiver.js');
  const releasing = new Set<any>();
  const hr = R.RouteRunner.prototype.handleRelease;
  R.RouteRunner.prototype.handleRelease = function (a: any, sim: any) { const c = hr.call(this, a, sim); if (c) releasing.add(a.slot); return c; };
  const sim: any = new PlaySim(nativeTraceSetup({ ...setup, roster: setup.seed, flip: false }));
  while (sim.phase === 'live' && sim.t < 1.0) sim.tick();
  return { releasing, pos: Object.fromEntries(sim.offense.map((o: any) => [o.slot, [+o.pos.x.toFixed(4), +o.pos.y.toFixed(4)]])) };
}

describe('RELEASE_SEEN', () => {
  it('a slot with an edge rusher tight over him at the snap releases around him only when on', async () => {
    const setup = { coverage: 'cover2', concept: 'smash', formation: 'gun_trips_11', seed: 2 };
    const off = await run('0', setup), on = await run('1', setup);
    expect(off.releasing.has('Y')).toBe(false);
    expect(on.releasing.has('Y')).toBe(true);
  });
  it('the press-man release is the same technique (on the corner as he sees him, so within 0.5 yd)', async () => {
    const setup = { coverage: 'cover1', concept: 'four_verts', formation: 'gun_doubles_11', seed: 3 };
    const off = await run('0', setup), on = await run('1', setup);
    expect(off.releasing.size).toBeGreaterThan(0);
    expect([...on.releasing].sort()).toEqual([...off.releasing].sort());
    for (const s of off.releasing) {
      const [ax, ay] = on.pos[s as string], [bx, by] = off.pos[s as string];
      expect(Math.hypot(ax - bx, ay - by)).toBeLessThan(0.5);
    }
  });
});

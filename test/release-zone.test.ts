/** RELEASE_ZONE (src/sim/behaviors/receiver.ts; experimental, off): the release around a man seen tight at the snap ends
 * at his route's first point, so a press man trailing him a little deeper no longer keeps him releasing upfield. The case
 * is mesh's high crosser against Cover 1 press (the call-theory matrix, docs/reviews/2026-11-24-call-matrix.md on
 * rules/matrix): his route flattens at 4.5-5 yd; off, he climbed past 6. A go's release is unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function depthAt(on: boolean, concept: string, coverage: string, ref: string, t: number, seed = 1): Promise<{ x: number; y: number }> {
  vi.resetModules();
  vi.stubEnv('RELEASE_ZONE', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, seed, roster: 3, formation: 'gun_doubles_11', flip: false }));
  sim.throwBall = () => undefined;
  const r = sim.slot(sim.offAlign.numbering[ref]);
  let snap: number | null = null, y0 = 0, out = { x: NaN, y: NaN };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') { snap = sim.t; y0 = r.pos.y; }
    if (snap !== null && Math.abs(sim.t - snap - t) < 0.026) out = { x: r.pos.x - sim.los, y: Math.abs(r.pos.y - y0) };
    if (sim.t > t + 0.5) sim.phase = 'dead';
  };
  sim.run();
  return out;
}

describe('RELEASE_ZONE', () => {
  it("mesh's high crosser against Cover 1 press runs his route's depth on, climbs off", async () => {
    const off = await depthAt(false, 'mesh', 'cover1', 'W2', 2.5), on = await depthAt(true, 'mesh', 'cover1', 'W2', 2.5);
    expect(off.x).toBeGreaterThan(5.8);
    expect(on.x).toBeLessThan(5.5);
  }, 60000);
  it('against zone (no man tight at the snap) nothing changes', async () => {
    const off = await depthAt(false, 'mesh', 'cover3', 'W2', 2.5), on = await depthAt(true, 'mesh', 'cover3', 'W2', 2.5);
    expect(on.x).toBeCloseTo(off.x, 5);
  }, 60000);
  it("a pressed go's release is unchanged: its first point is past the release", async () => {
    const off = await depthAt(false, 'four_verts', 'cover1', 'S1', 1.0, 2), on = await depthAt(true, 'four_verts', 'cover1', 'S1', 1.0, 2);
    expect(on.y).toBeCloseTo(off.y, 5);
    expect(on.x).toBeCloseTo(off.x, 5);
  }, 60000);
});

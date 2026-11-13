/** PRESS_RELEASE (behaviors/receiver.ts handleRelease; experimental, off;
 * with PRESS_MIRROR): a pressed receiver works around the corner from the
 * snap on his route's side, clear of the corner's body and reach. Tracked
 * pressed gos are 3.5 yd toward the sideline by 5 yd downfield. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function widthAt5(flag: string) {
  vi.stubEnv('PRESS_MIRROR', '1'); vi.stubEnv('PRESS_RELEASE', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const lat: number[] = [];
  for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const pressed = sim.offense.filter((o: any) => o.player.position === 'WR' && sim.defense.some((d: any) =>
      sim.defAlign.spots[d.slot]?.press && sim.defAlign.spots[d.slot]?.manTarget === o.slot));
    const x0 = new Map(pressed.map((o: any) => [o.idx, { ...o.pos }])); const done = new Set<number>();
    while (sim.phase === 'live' && sim.t < 3 && done.size < pressed.length) {
      sim.tick();
      for (const o of pressed) { const p0: any = x0.get(o.idx); if (!done.has(o.idx) && Math.abs(o.pos.x - p0.x) >= 5) { done.add(o.idx); lat.push(Math.abs(o.pos.y - p0.y)); } }
    }
  }
  lat.sort((a, b) => a - b);
  return { n: lat.length, p50: lat[Math.floor(lat.length / 2)] };
}

describe('PRESS_RELEASE', () => {
  it('on: pressed verticals are released wide of the corner by 5 yd', async () => {
    const off = await widthAt5('0'), on = await widthAt5('1');
    // Legacy test engine, cover1 four verts: width at 5 yd 1.06 -> 3.12 yd.
    expect(on.n).toBeGreaterThan(8);
    expect(on.p50).toBeGreaterThan(off.p50 + 1);
  });
});

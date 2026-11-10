/** PRESS_MIRROR (behaviors/defense.ts ManCoverage, behaviors/receiver.ts;
 * experimental, off): a pressing corner stays in front of the releasing
 * receiver, and the receiver releases around him rather than up the lane a
 * leverage step opened. Tracked pressed outside receivers are 0.62 yd lateral
 * by their first yard; ours went straight up (0.00). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function release(flag: string) {
  vi.stubEnv('PRESS_MIRROR', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const lat: number[] = [], speed: number[] = [];
  for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const pressed = sim.offense.filter((o: any) => o.player.position === 'WR' && sim.defense.some((d: any) =>
      sim.defAlign.spots[d.slot]?.press && sim.defAlign.spots[d.slot]?.manTarget === o.slot));
    const y0 = new Map(pressed.map((o: any) => [o.idx, o.pos.y]));
    while (sim.phase === 'live' && sim.t < 1.0 - 1e-9) sim.tick();
    for (const o of pressed) { lat.push(Math.abs(o.pos.y - (y0.get(o.idx) as number))); speed.push(Math.hypot(o.vel.x, o.vel.y)); }
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)];
  return { n: lat.length, lat: med(lat), speed: med(speed) };
}

describe('PRESS_MIRROR', () => {
  it('on: pressed receivers release around the corner (wider by 1.0 s)', async () => {
    const off = await release('0'), on = await release('1');
    // Legacy test engine, cover1 four verts: lateral at 1.0 s 0.31 -> 0.78 yd.
    expect(on.n).toBeGreaterThan(8);
    expect(on.lat).toBeGreaterThan(off.lat + 0.15);
  });
});

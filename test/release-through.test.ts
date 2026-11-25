/** RELEASE_THROUGH (behaviors/receiver.ts; experimental, off): when the route
 * takes over from a press release, stem points just ahead of him that lie back
 * across his release side are behind the release. Off, a pressed outside go
 * was steered back inside across the corner and stalled at 6-8 yd. */
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.CRAFT_HOLD = '0'; }); // engine-73: fixture recorded before CRAFT_HOLD; Rules to re-record with it on

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function verticals(flag: string) {
  vi.stubEnv('PRESS_MIRROR', '1'); vi.stubEnv('PRESS_RELEASE', '1'); vi.stubEnv('RELEASE_THROUGH', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const at: Record<string, { depth: number; speed: number; lat: number }[]> = { '1.5': [], '3.0': [] };
  for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const pairs = sim.offense.filter((o: any) => o.player.position === 'WR').map((o: any) => [o, sim.defense.find((d: any) =>
      sim.defAlign.spots[d.slot]?.press && sim.defAlign.spots[d.slot]?.manTarget === o.slot)]).filter((p: any) => p[1]);
    const x0 = new Map(pairs.map(([o]: any) => [o, { ...o.pos }]));
    for (const t of [1.5, 3.0]) {
      while (sim.phase === 'live' && sim.t + 1e-6 < t) sim.tick();
      for (const [o] of pairs) at[t.toFixed(1)].push({ depth: o.pos.x - (x0.get(o) as any).x,
        speed: Math.hypot(o.vel.x, o.vel.y), lat: Math.abs(o.pos.y - (x0.get(o) as any).y) });
    }
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)];
  return Object.fromEntries(Object.entries(at).map(([t, v]) => [t, { n: v.length, depth: med(v.map(r => r.depth)),
    speed: med(v.map(r => r.speed)), lat: med(v.map(r => r.lat)) }]));
}

describe('RELEASE_THROUGH', () => {
  it('a pressed outside go keeps running past the release instead of stalling beside the corner', async () => {
    const off = await verticals('0'), on = await verticals('1');
    expect(on['3.0'].n).toBeGreaterThan(12);
    // The release itself is unchanged.
    expect(Math.abs(on['1.5'].depth - off['1.5'].depth)).toBeLessThan(0.3);
    expect(Math.abs(on['1.5'].lat - off['1.5'].lat)).toBeLessThan(0.3);
    // Fixture, 72 WR on the default engine: 3.0 s depth 8.2 -> 14.0 yd, speed 1.6 -> 7.0 yd/s. The test engine
    // (vitest.config.ts pins the pre-promotion settings) reaches the stall later, so only 3.0 s is asserted.
    expect(off['3.0'].speed).toBeLessThan(3.5);
    expect(on['3.0'].speed).toBeGreaterThan(5.5);
    expect(on['3.0'].depth).toBeGreaterThan(off['3.0'].depth + 3);
  });
});

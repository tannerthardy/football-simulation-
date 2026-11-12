/** TACKLE_SET (engagement.ts / behaviors/blocking.ts; experimental, off): a
 * tackle sets against an edge rusher to a depth from the call -- a body width
 * short of the called drop's launch point -- and anchors there instead of
 * kicking with the rusher's depth to wherever the QB has drifted. The rule is
 * the request; whether the anchor holds is the physics (no capacity added).
 * Repro: four verticals (a five-step gun drop, the QB holds) vs Cover 2. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The engine as it runs (the reference stack), not the legacy engine the suite is pinned to.
const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string, seed: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) vi.stubEnv(k, v === 'on' ? '1' : '0');
  vi.stubEnv('TACKLE_SET', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { tackleFloor } = await import('../src/sim/engagement.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const tackles = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  const floor = tackleFloor(sim) as number;
  // Per tick while the QB holds: each tackle's depth, his requested x, whether he is past the floor.
  const rows: { x: number; req: number; t: number }[] = [];
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    const before = tackles.map((tk: any) => tk.pos.x);              // the spot this tick's request is made from
    sim.tick();
    tackles.forEach((tk: any, i: number) => rows.push({ x: before[i], req: sim.intents?.[tk.idx]?.vel.x ?? 0, t: sim.t }));
  }
  return { sim, floor, rows };
}

describe('TACKLE_SET', () => {
  it('the floor is the called drop\'s launch point plus a body width, not the QB\'s live spot', async () => {
    const { sim, floor } = await run('1', 1);
    expect(floor).toBeCloseTo(sim.los - 8.0 + 1.0, 9);            // gun5: launch 8.0 yd deep
  });

  it('at or past the floor he asks for no more depth', async () => {
    for (const seed of [1, 2, 3]) {
      const { floor, rows } = await run('1', seed);
      const at = rows.filter((r) => r.x <= floor);
      for (const r of at) expect(r.req).toBeGreaterThan(-0.05);
      const deepest = Math.min(...rows.map((r) => r.x));
      // Whether the anchor holds is the physics: report how far past the set he is carried.
      console.log(`seed ${seed}: floor ${floor.toFixed(2)}, deepest ${deepest.toFixed(2)}, ticks at the floor ${at.length}`);
    }
  });

  it('off, the old kick is unchanged (the floor does not apply)', async () => {
    const off = await run('0', 1), on = await run('1', 1);
    const deep = (rows: { x: number }[]) => Math.min(...rows.map((r) => r.x));
    expect(deep(off.rows)).toBeLessThanOrEqual(deep(on.rows) + 1e-9);
  });
});

/** APEX_LEVERAGE (rules.ts / techniques.ts; experimental, off). Fixed plays, cover4 (MOD quarters), seeds 1-4.
 * Off at 0: every defender's position on every tick is identical whether the flag module is read at 0 or not set.
 * 1: the apex walls #2's seam level rather than 0.8 yd inside (four verts: his lateral offset to #2's inside at 1.5 s
 *    shrinks). 2: with the back seen threatening the flat under him (seam-hitch, wheel back), he walls #2 from the outside
 *    (the depth hold binds after the throw on these fixtures; its read is in the game panel). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string | undefined, concept: string, at: number) {
  vi.resetModules();
  if (flag !== undefined) vi.stubEnv('APEX_LEVERAGE', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const all: number[] = [], apex: { inside: number; depth: number }[] = [];
  for (let seed = 1; seed <= 4; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover4', concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const tick = sim.tick.bind(sim);
    let t0 = -1, done = false;
    sim.tick = () => {
      tick(); if (t0 < 0) t0 = sim.t;
      for (const a of sim.defense) all.push(a.pos.x, a.pos.y);
      if (!done && sim.t - t0 >= at) {
        done = true;
        const back = sim.offense.find((o: any) => o.player?.position === 'RB');
        for (const a of sim.defense) {
          if (a.behavior?.rule !== 'q_apex') continue;
          const side = Math.sign(a.pos.y - sim.ballY) || 1;
          if ((back.pos.y - sim.ballY) * side < 0) continue;
          const two = sim.offense.filter((o: any) => ['WR', 'TE'].includes(o.player?.position) && (o.pos.y - sim.ballY) * side > 0)
            .sort((p: any, q: any) => (q.pos.y - sim.ballY) * side - (p.pos.y - sim.ballY) * side)[1];
          if (two) apex.push({ inside: (two.pos.y - a.pos.y) * side, depth: a.pos.x - sim.los });
        }
      }
    };
    sim.run();
  }
  return { all, apex };
}
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;

describe('APEX_LEVERAGE', () => {
  it('0 is the unset path on every tick', async () => {
    const unset = await run(undefined, 'four_verts', 1.5), zero = await run('0', 'four_verts', 1.5);
    expect(zero.all.length).toBeGreaterThan(1000);
    expect(zero.all).toEqual(unset.all);
  });
  it('1: level on the seam rather than inside it', async () => {
    const off = await run('0', 'four_verts', 1.5), on = await run('1', 'four_verts', 1.5);
    expect(on.apex.length).toBeGreaterThan(3);
    expect(mean(on.apex.map((e) => e.inside))).toBeLessThan(mean(off.apex.map((e) => e.inside)) - 0.3);
  });
  it('2: walls a seam from its outside once he sees the back threaten the flat under him', async () => {
    const lev = await run('1', 'seam_hitch', 2.25), flat = await run('3', 'seam_hitch', 2.25);
    expect(flat.apex.length).toBeGreaterThan(3);
    expect(mean(flat.apex.map((e) => e.inside))).toBeLessThan(mean(lev.apex.map((e) => e.inside)) - 0.4);
  });
});

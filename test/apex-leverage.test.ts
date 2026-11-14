/** APEX_LEVERAGE (rules.ts / techniques.ts; experimental, off). Fixed plays, cover4 (MOD quarters), seeds 1-4.
 * Off at 0: every defender's position on every tick is identical whether the flag module is read at 0 or not set.
 * 1: the apex walls #2's seam level rather than 0.8 yd inside (four verts: his lateral offset to #2's inside at 1.5 s
 *    shrinks). 2: with the back committed as a flat threat (staged four verts with the back's flat), he stops leading #2 and
 *    holds over the back from #2's outside (shallower at 2.5 s, and further outside, than with 1 alone). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string | undefined, concept: string, at: number) {
  vi.resetModules();
  // The unset arm must really be unset, whatever the ambient environment holds.
  if (flag !== undefined) vi.stubEnv('APEX_LEVERAGE', flag); else vi.stubEnv('APEX_LEVERAGE', undefined as unknown as string);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  // Staged: four verticals with the back's flat (No. 2 seams, the back flares).
  PASS_BY_ID.seam_flat = { ...PASS_BY_ID.four_verts, id: 'seam_flat', back: 'back_flat' };
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
  it('unset is all bits on (7) on every tick, the default since engine-62', async () => {
    const unset = await run(undefined, 'four_verts', 1.5), seven = await run('7', 'four_verts', 1.5);
    expect(seven.all.length).toBeGreaterThan(1000);
    expect(seven.all).toEqual(unset.all);
  });
  it('1: level on the seam rather than inside it', async () => {
    const off = await run('0', 'four_verts', 1.5), on = await run('1', 'four_verts', 1.5);
    expect(on.apex.length).toBeGreaterThan(3);
    expect(mean(on.apex.map((e) => e.inside))).toBeLessThan(mean(off.apex.map((e) => e.inside)) - 0.3);
  });
  it('2: with the back committed as a flat threat he stops leading the seam and holds over the back', async () => {
    const lev = await run('1', 'seam_flat', 2.5), flat = await run('3', 'seam_flat', 2.5);
    expect(flat.apex.length).toBeGreaterThan(3);
    expect(mean(flat.apex.map((e) => e.depth))).toBeLessThan(mean(lev.apex.map((e) => e.depth)) - 1.5);
    expect(mean(flat.apex.map((e) => e.inside))).toBeLessThan(mean(lev.apex.map((e) => e.inside)));
  });
});

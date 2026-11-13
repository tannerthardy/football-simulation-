/** BACK_FRONT (read-compiler/candidates.ts; experimental, off): in a compiled read plan the back is read with the
 * front (start) side at his window, before the eyes cross (docs/reviews/2026-11-11-read-compiler-phase1.md). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plan(flag: string, concept: string, formation: string) {
  vi.stubEnv('BACK_FRONT', flag); vi.stubEnv('BACK_RELEASE', '1'); vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { compile } = await import('../src/playbook/read-compiler/compile.js');
  const p = compile(PASS_BY_ID[concept], formation, false, generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 }));
  return p.chosen!.order.map((s) => s.ref);
}

describe('BACK_FRONT', () => {
  it('on: the back is read before the eyes cross to the other side', async () => {
    for (const [c, f] of [['mesh', 'gun_doubles_11'], ['y_cross', 'gun_doubles_11'], ['hitches', 'gun_doubles_11']]) {
      const order = await plan('1', c, f);
      const b = order.indexOf('B'), firstOther = order.findIndex((r) => r[0] !== order[0][0] && r !== 'B');
      expect(b, `${c}: ${order.join(' ')}`).toBeGreaterThanOrEqual(0);
      expect(b, `${c}: ${order.join(' ')}`).toBeLessThan(firstOther < 0 ? order.length : firstOther);
    }
  });

  it('off: a back releasing away is read later (hitches from 2x2: after the weak side)', async () => {
    const on = await plan('1', 'hitches', 'gun_doubles_11'), off = await plan('0', 'hitches', 'gun_doubles_11');
    expect(off.indexOf('B')).toBeGreaterThan(on.indexOf('B'));
  });
});

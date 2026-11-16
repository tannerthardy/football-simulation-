/** COMPILE_PICTURE (src/playbook/read-compiler/features.ts; experimental, off): the compiler's route sample shows the
 * receivers the parked defence, not where it lined up. On the engine defaults pa_flood's S2 (gun doubles) released round
 * a parked DE on one side only, which tipped the mirrored plan from 'pure' to 'vertical_peek'. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function sample(on: boolean) {
  vi.resetModules();
  vi.stubEnv('COMPILE_PICTURE', on ? '1' : '0');
  vi.stubEnv('PRESS_MIRROR', '1'); vi.stubEnv('RELEASE_SEEN', '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { compile } = await import('../src/playbook/read-compiler/compile.js');
  const { RouteRunner } = await import('../src/sim/behaviors/receiver.js');
  // Who each receiver released round as a man tight on him at the snap, in the sample (the defence is parked 60 yd off).
  const tight: string[] = [];
  const P = RouteRunner.prototype as unknown as { handleRelease: (...a: unknown[]) => unknown };
  const h0 = P.handleRelease;
  P.handleRelease = function (this: { tightAtSnap: { slot: string }[] | null }, ...a: unknown[]) {
    const r = h0.apply(this, a); for (const d of this.tightAtSnap ?? []) tight.push(d.slot); return r;
  };
  const run = (flip: boolean) => compile(PASS_BY_ID.pa_flood, 'gun_doubles_11', flip, generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 }));
  const plan = (p: ReturnType<typeof run>) => p.chosen && { style: p.chosen.style, order: p.chosen.order.map((s) => s.ref) };
  try { return { mirrored: plan(run(true)), straight: plan(run(false)), tight }; } finally { P.handleRelease = h0; }
}

describe('COMPILE_PICTURE', () => {
  it('on, no receiver releases round a parked defender, and the mirrored plan is the same plan', async () => {
    const on = await sample(true);
    expect(on.tight).toEqual([]);
    expect(on.mirrored).toEqual(on.straight);
  }, 60000);
  it('off, a receiver releases round a defender who is not there (the bug, kept so the flag has a reason)', async () => {
    expect((await sample(false)).tight.length).toBeGreaterThan(0);
  }, 60000);
});

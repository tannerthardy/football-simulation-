/** BACK_AS_THREE (src/game/concept-fit.ts, sim/assign.ts, read-compiler/runtime.ts; experimental, off; with
 * CONCEPT_FIT): stick, flood and pa_flood from a field with no #3 send the back to the flat as #3, out of the protection,
 * and the plan reads him where #3 is read. On the engine defaults (the stack's flags stubbed on, as craft-hold.test.ts
 * does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(on: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CONCEPT_FIT', '1');
  vi.stubEnv('BACK_AS_THREE', on ? '1' : '0');
  const fit = await import('../src/game/concept-fit.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  return { fit, PASS_BY_ID, installedPlan };
}

const doubles = new Set(['S1', 'S2', 'W1', 'W2', 'B'] as const), empty = new Set(['S1', 'S2', 'W1', 'W2', 'W3'] as const);

describe('BACK_AS_THREE', () => {
  it('stick, flood and pa_flood fit 2x2 with a back only when the back can be #3', async () => {
    const off = await load(false);
    for (const id of ['stick', 'flood', 'pa_flood']) expect(off.fit.conceptFits(off.PASS_BY_ID[id], doubles), id).toBe(false);
    const on = await load(true);
    for (const id of ['stick', 'flood', 'pa_flood']) {
      expect(on.fit.conceptFits(on.PASS_BY_ID[id], doubles), id).toBe(true);
      expect(on.fit.conceptFits(on.PASS_BY_ID[id], empty as never), id).toBe(false);
    }
    // Only the three that install it.
    expect(on.fit.conceptFits(on.PASS_BY_ID.trips_stick, doubles)).toBe(false);
  });

  it("the plan reads the back where #3 is read: stick's key on the flat defender, the stick over the back's flat", async () => {
    const { fit, PASS_BY_ID, installedPlan } = await load(true);
    const plan = installedPlan(fit.asBackThree(PASS_BY_ID.stick), 'gun_doubles_11')!;
    expect(plan.style).toBe('defender_key');
    expect(plan.key).toMatchObject({ low: 'B', high: 'S2' });
    expect(plan.outlet).toBeNull();
    // Flood keeps the key it compiles to from trips (the curl-flat defender: the out high, the flat low), declared.
    const flood = installedPlan(fit.asBackThree(PASS_BY_ID.flood), 'gun_doubles_11')!;
    expect(flood.style).toBe('defender_key');
    expect(flood.key).toMatchObject({ low: 'B', high: 'S2' });
    const pa = installedPlan(fit.asBackThree(PASS_BY_ID.pa_flood), 'ace_12')!;
    expect(pa.order.slice(0, 3)).toEqual(['S2', 'W1', 'B']);
    expect(pa.outlet).toBeNull();
  }, 120_000);

  it('on the snap the back releases to the flat on the strong side and is not a protector', async () => {
    const { fit } = await load(true);
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    for (const seed of [1, 2, 3]) {
      const setup = nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed, roster: 7, formation: 'gun_doubles_11', flip: false });
      setup.offCall = { ...setup.offCall, pass: fit.asBackThree(setup.offCall.pass!) };
      const sim: any = new PlaySim(setup);
      const rb = sim.slot('RB'), y0 = rb.pos.y, ss = sim.offAlign.strongSign;
      for (let i = 0; i < 20; i++) sim.tick();
      expect(rb.behavior.kind, `seed ${seed}`).not.toBe('pass-pro');
      expect(rb.behavior.route?.id, `seed ${seed}`).toBe('back_flat');
      expect((rb.pos.y - y0) * ss, `seed ${seed}`).toBeGreaterThan(0.5);
    }
  }, 120_000);
});

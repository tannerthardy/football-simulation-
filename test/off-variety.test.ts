/** OFF_VARIETY (playbook) and ZONE_IT (coverage), both experimental and off. Off, the playbook is as before; on, the
 * variety formations and the smash corner are callable, and quarters vs a strong-side stack installs Box. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(variety: boolean, zoneIt = false) {
  vi.resetModules();
  vi.stubEnv('OFF_VARIETY', variety ? '1' : '0');
  vi.stubEnv('ZONE_IT', zoneIt ? '1' : '0');
  return { ...(await import('../src/playbook/formations.js')), ...(await import('../src/playbook/concepts.js')),
    PlaySim: (await import('../src/sim/playsim.js')).PlaySim, nativeTraceSetup: (await import('../scripts/diag/command-trace.js')).nativeTraceSetup };
}

describe('OFF_VARIETY', () => {
  it('off: no variety formation and the deep corner in smash', async () => {
    const m = await load(false);
    expect(m.FORMATIONS.some((f) => ['gun_flex_11', 'gun_stack_11', 'gun_doubles_tight_11'].includes(f.id))).toBe(false);
    expect(m.PASS_BY_ID.smash.strong[2]).toBe('corner');
  });
  it('on: the three formations are installed and smash runs the smash corner', async () => {
    const m = await load(true);
    for (const id of ['gun_flex_11', 'gun_stack_11', 'gun_doubles_tight_11']) expect(m.FORMATION_BY_ID[id], id).toBeDefined();
    expect(m.PASS_BY_ID.smash.strong[2]).toBe('smash_corner');
  });
});

describe('ZONE_IT', () => {
  it('quarters vs the stack to the strength checks to Box only with the flag', async () => {
    // Off, QUARTERS_CHECK (on by default since engine-80) installs Palms against the two detached #2s.
    for (const zoneIt of [false, true]) {
      const m = await load(true, zoneIt);
      const sim = new m.PlaySim(m.nativeTraceSetup({ coverage: 'cover4', concept: 'smash', seed: 1, roster: 1, formation: 'gun_stack_11', flip: true }));
      if (zoneIt) expect(sim.defCall.coverage.id).toBe('cover4_box');
      else expect(sim.defCall.coverage.id).not.toBe('cover4_box');
    }
  });
});

describe('OFF_VARIETY double moves', () => {
  it('installs the sluggo, out-and-up and stutter-go concepts only with the flag, each from a staged formation', async () => {
    vi.stubEnv('OFF_VARIETY', '0'); vi.resetModules();
    const off = await import('../src/playbook/concepts.js');
    for (const id of ['sluggo_flat', 'out_up', 'stutter_go']) expect(off.PASS_BY_ID[id]).toBeUndefined();
    vi.stubEnv('OFF_VARIETY', '1'); vi.resetModules();
    const on = await import('../src/playbook/concepts.js');
    const { ROUTES } = await import('../src/playbook/routes.js');
    expect(on.PASS_BY_ID.sluggo_flat.strong[1]).toBe('sluggo');
    expect(on.PASS_BY_ID.out_up.strong[1]).toBe('out_up');
    expect(on.PASS_BY_ID.stutter_go.strong[1]).toBe('stutter_go');
    // The fake first (inside for the slant, outside for the out, a stop for the hitch), then up the field.
    expect(ROUTES.sluggo.points[1].l).toBeLessThan(0);
    expect(ROUTES.out_up.points[1].l).toBeGreaterThan(0);
    expect(ROUTES.stutter_go.points[0].s).toBeLessThan(0.5);
    for (const id of ['sluggo', 'out_up', 'stutter_go']) expect(ROUTES[id].points.at(-1)!.d).toBeGreaterThan(40);
  });
});

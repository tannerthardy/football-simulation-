/** OUTLET_LAST and PLAN_KEYS (src/playbook/read-compiler/runtime.ts; experimental, off), from the read-plan table
 * (docs/reviews/2026-11-14-read-plan-table.md):
 * - OUTLET_LAST: the back's release is the outlet, read after the field reads, never inside the order;
 * - PLAN_KEYS: drive keys the hook (dig over shallow), pa_post_dig the free safety (post over the backside dig), smash
 *   and corner_flat the corner; mesh, y_cross and pa_flood run one named install;
 * - every plan carries its rhythm: the coached step by place (set, hitch, second hitch; the outlet on the second hitch),
 *   with when each route is ready as installed. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  return (id: string, f = 'gun_doubles_11') => installedPlan(PASS_BY_ID[id], f)!;
}

describe('OUTLET_LAST / PLAN_KEYS', () => {
  it('off, the compiler places the back inside the order; on, he is read last', async () => {
    const off = await plans({ OUTLET_LAST: '0', PLAN_KEYS: '0', BACK_FRONT: '1' });
    expect(off('stick').order.indexOf('B')).toBeGreaterThanOrEqual(0);
    expect(off('stick').order.indexOf('B')).toBeLessThan(off('stick').order.length - 1);
    const on = await plans({ OUTLET_LAST: '1', PLAN_KEYS: '0', BACK_FRONT: '1' });
    for (const id of ['stick', 'flood', 'y_cross', 'levels', 'fade_flat', 'hitch_post']) {
      const p = on(id);
      expect(p.outlet).toBe('B');
      expect(p.order).not.toContain('B');
      expect(p.rhythm[p.rhythm.length - 1]).toMatchObject({ ref: 'B', step: 'hitch2' });
    }
  }, 120000);

  it('the coached keys and installs', async () => {
    const on = await plans({ OUTLET_LAST: '1', PLAN_KEYS: '1', BACK_FRONT: '1' });
    expect(on('drive').key).toMatchObject({ low: 'W2', high: 'S2', role: 'hook' });
    expect(on('drive').order.slice(0, 2)).toEqual(['S2', 'W2']);
    expect(on('pa_post_dig').key).toMatchObject({ low: 'W1', high: 'S1', role: 'deep_free_safety' });
    expect(on('smash').key).toMatchObject({ low: 'S1', high: 'S2', role: 'corner' });
    expect(on('corner_flat').key).toMatchObject({ low: 'S2', high: 'S1', role: 'corner' });
    expect(on('mesh').order.slice(0, 3)).toEqual(['S1', 'S2', 'W2']);
    expect(on('mesh').key).toBeNull();
    expect(on('y_cross').order.slice(0, 2)).toEqual(['W1', 'S2']);
    // Every key names its danger.
    expect(on('smash').key?.danger).toMatch(/safety/);
    expect(on('curl_flat').key?.danger).toMatch(/hook/);
    // PLAN_KEYS_2: the eight sourced keys that were pure orders key (stick and seam_slant need their #3, so from
    // trips); without it they stay pure orders.
    for (const id of ['slant_flat', 'quick_outs', 'fade_flat', 'double_slants', 'hitch_out']) expect(on(id).style).not.toBe('defender_key');
    const two = await plans({ OUTLET_LAST: '1', PLAN_KEYS: '1', PLAN_KEYS_2: '1', BACK_FRONT: '1' });
    for (const id of ['slant_flat', 'quick_outs', 'fade_flat', 'double_slants', 'hitch_out']) expect(two(id).style).toBe('defender_key');
    for (const id of ['stick', 'seam_slant', 'trips_stick']) expect(two(id, 'gun_trips_11').key).not.toBeNull();
  }, 120000);

  it('rhythm: read 1 on the set, read 2 on a hitch, the rest on the second hitch, with the installed ready time', async () => {
    const on = await plans({ OUTLET_LAST: '1', PLAN_KEYS: '0', BACK_FRONT: '1' });
    const r = on('slant_flat').rhythm;
    expect(r.map((x) => x.step)).toEqual(['set', 'hitch', 'hitch2', 'hitch2']);
    expect(r[1].at - r[0].at).toBeCloseTo(0.4, 6);
    for (const x of r) expect(x.onTime).toBe(x.ready <= x.at + 1e-9);
  }, 120000);
});

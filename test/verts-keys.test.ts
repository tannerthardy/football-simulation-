/** VERTS_KEYS (src/playbook/read-compiler/runtime.ts; experimental, off; with PLAN_KEYS): verts_hitch from trips reads its
 * own key (the defender over the seam: high the #2 seam, low the #3 hitch, one look on the set), then the backside
 * vertical; four_verts reads its seams before the outside gos (Gonzalez). From 2x2 verts_hitch has no #3 on the seam's
 * side and is left as compiled. On the engine defaults (the stack's flags stubbed on, as craft-hold.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plan(on: boolean, concept: string, formation: string) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('VERTS_KEYS', on ? '1' : '0');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  return installedPlan(PASS_BY_ID[concept], formation)!;
}

describe('VERTS_KEYS', () => {
  it('verts_hitch from trips: the key on the defender over the seam, seam and hitch on the set, then the backside vertical', async () => {
    const off = await plan(false, 'verts_hitch', 'gun_trips_11'), on = await plan(true, 'verts_hitch', 'gun_trips_11');
    expect(off.key).toBeNull();
    expect(on.style).toBe('defender_key');
    expect(on.key).toMatchObject({ high: 'S2', low: 'S3', role: 'deep_defender_over_vertical' });
    expect(on.order.slice(0, 3)).toEqual(['S2', 'S3', 'W1']);
    const n = (ref: string) => on.rhythm.find((r) => r.ref === ref)!.n;
    expect(n('S2')).toBe(0);
    expect(n('S3')).toBe(0);
    expect(n('W1')).toBe(1);
    // The hitch is on time on the set, within the QB lane's 0.2 s for a keyed place's low route (off it was read last,
    // on the second hitch).
    const h = on.rhythm.find((r) => r.ref === 'S3')!;
    expect(h.ready - h.at).toBeLessThanOrEqual(0.2);
    expect(off.rhythm.find((r) => r.ref === 'S3')!.n).toBe(2);
  }, 120_000);

  it('verts_hitch from 2x2 is left as compiled (no #3 on the seam side)', async () => {
    const off = await plan(false, 'verts_hitch', 'gun_doubles_11'), on = await plan(true, 'verts_hitch', 'gun_doubles_11');
    expect(on).toEqual(off);
  }, 120_000);

  it('four_verts from 2x2 reads both seams before the outside gos', async () => {
    const off = await plan(false, 'four_verts', 'gun_doubles_11'), on = await plan(true, 'four_verts', 'gun_doubles_11');
    expect(off.order.indexOf('W2')).toBeGreaterThan(off.order.indexOf('S1'));
    expect(on.order.slice(0, 2)).toEqual(['S2', 'W2']);
    expect(on.style).toBe(off.style);
  }, 120_000);
});

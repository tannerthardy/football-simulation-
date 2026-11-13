/** BACK_CHECKDOWN (read-compiler/candidates.ts; experimental, off): the back is read where the concept puts him
 * (docs/reviews/2026-11-13-back-checkdown.md). Over a panel of installed plans (concept x formation):
 * - on, a check-release back (concept.back 'check') is read after the downfield progression: last in the order;
 * - a called back route (mesh's swing, seam-hitch's wheel, hitch-post's angle) and the vertical peek (four verts:
 *   verticals, else the back) keep the order they had off;
 * - off, the check-release back sits ahead of the backside reads (his early window). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const CHECK: [string, string][] = [['hitches', 'gun_doubles_11'], ['smash', 'gun_doubles_11'], ['flood', 'gun_doubles_11'], ['fade_flat', 'gun_trips_11'], ['curl_flat', 'gun_trips_11'], ['dagger', 'gun_trips_11']];
const KEPT: [string, string][] = [['mesh', 'gun_doubles_11'], ['seam_hitch', 'gun_doubles_11'], ['hitch_post', 'gun_doubles_11'], ['four_verts', 'gun_doubles_11'], ['verts_hitch', 'gun_doubles_11']];

async function orders(flag: string, cases: [string, string][]) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('BACK_CHECKDOWN', flag);
  const { installedPlan } = await import('../src/playbook/read-compiler/runtime.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  return cases.map(([c, f]) => installedPlan(PASS_BY_ID[c], f)!.order);
}

describe('BACK_CHECKDOWN', () => {
  it('a check-release back is the check-down; called back routes and the vertical peek keep their place', async () => {
    const on = await orders('1', CHECK), off = await orders('0', CHECK);
    for (const o of on) expect(o[o.length - 1]).toBe('B');
    // Off, each had the back ahead of at least one other read.
    for (const o of off) expect(o.indexOf('B')).toBeLessThan(o.length - 1);
    const keptOn = await orders('1', KEPT), keptOff = await orders('0', KEPT);
    expect(keptOn).toEqual(keptOff);
  }, 120000);
});

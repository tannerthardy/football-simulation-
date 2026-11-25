/** CALL_COMPOSE step 1 (src/playbook/calls; docs/reviews/2026-11-24-call-composition.md §6). The gate: every
 * composition compiles to exactly today's concept (routes, drop, back, reads and the rest), so turning the flag on
 * changes nothing. Checked before the install passes (the literals) and after them (PASS_BY_ID, flag off vs on). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BASE_COMPOSITIONS, compileComposition, MENU_COMPOSITIONS } from '../src/playbook/calls/compositions.js';
import { AXES } from '../src/playbook/calls/axes.js';
import { FULL_CONCEPTS, HALF_CONCEPTS } from '../src/playbook/calls/halves.js';
import { legacyBaseConcepts, legacyMenuConcepts } from '../src/playbook/concepts.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('CALL_COMPOSE step 1', () => {
  it('the 32 pool concepts: 23 half x half and 9 full-field compositions', () => {
    const all = [...BASE_COMPOSITIONS, ...MENU_COMPOSITIONS];
    expect(all).toHaveLength(32);
    expect(all.filter((c) => 'full' in c.routes)).toHaveLength(9);
    expect(new Set(all.map((c) => c.id)).size).toBe(32);
  });

  it('each composition compiles to exactly its literal concept', () => {
    const legacy = [...legacyBaseConcepts(), ...legacyMenuConcepts()];
    const comps = [...BASE_COMPOSITIONS, ...MENU_COMPOSITIONS];
    expect(comps.map((c) => c.id)).toEqual(legacy.map((c) => c.id));
    for (let i = 0; i < legacy.length; i++) expect(compileComposition(comps[i]), legacy[i].id).toStrictEqual(legacy[i]);
  });

  it('every half and full concept is used (by a composition or, from step 2, an axis), and compiling never shares route objects with the tables', () => {
    const comps = [...BASE_COMPOSITIONS, ...MENU_COMPOSITIONS];
    const used = new Set(comps.flatMap((c) => ('full' in c.routes ? [c.routes.full] : [c.routes.strong, c.routes.weak])));
    for (const a of Object.values(AXES)) for (const o of [...(a.strong ?? []), ...(a.weak ?? [])]) used.add(o.value);
    for (const h of HALF_CONCEPTS) expect(used.has(h.id), h.id).toBe(true);
    for (const f of FULL_CONCEPTS) expect(used.has(f.id), f.id).toBe(true);
    const a = compileComposition(comps[0]);
    a.strong[1] = 'changed';
    expect(compileComposition(comps[0]).strong[1]).not.toBe('changed');
  });

  it('after the install passes (drops, quick hitch, verts drop), on and off give the same pool', async () => {
    const load = async (on: boolean) => {
      vi.resetModules();
      vi.stubEnv('CALL_COMPOSE', on ? '1' : '0');
      const m = await import('../src/playbook/concepts.js');
      return { flag: m.CALL_COMPOSE, pool: m.PASS_CONCEPTS.map((c) => JSON.parse(JSON.stringify(c))), menu: m.MENU_CONCEPTS.length };
    };
    const off = await load(false), on = await load(true);
    expect(off.flag).toBe(false);
    expect(on.flag).toBe(true);
    expect(on.pool).toStrictEqual(off.pool);
    expect(on.menu).toBe(off.menu);
  });
});

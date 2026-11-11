import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam } from '../src/league/team.js';
import { MENU_CONCEPTS, PASS_BY_ID, SCREEN_CONCEPTS } from '../src/playbook/concepts.js';
import { candidates } from '../src/playbook/read-compiler/candidates.js';
import { compile } from '../src/playbook/read-compiler/compile.js';
import { findMotifs } from '../src/playbook/read-compiler/motifs.js';
import type { PassConcept } from '../src/playbook/types.js';

/** Read-plan compiler, Phase 0 acceptance checks (docs/research/2026-11-11-qb-read-compiler-design.md §21-22, §31). */
const off = () => generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 });
const def = () => generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 });
const run = (c: PassConcept, form = 'gun_doubles_11', flip = false) => compile(c, form, flip, off(), def());
const plan = (p: ReturnType<typeof run>) => p.chosen && { style: p.chosen.style, order: p.chosen.order.map((s) => s.ref), outlet: p.chosen.outlet, alert: p.chosen.alert ?? null };
const ordinary = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];

describe('read compiler (Phase 0)', () => {
  it('every ordinary pass concept gets at least one valid plan from 2x2 and 3x1', () => {
    for (const c of ordinary) for (const form of ['gun_doubles_11', 'gun_trips_11']) {
      const p = run(c, form);
      expect(p.chosen, `${c.id} ${form}`).not.toBeNull();
      expect(p.chosen!.order.length, `${c.id} ${form}`).toBeGreaterThan(0);
    }
  });

  it('mirroring the formation mirrors the plan (the same receiver numbers in the same order)', () => {
    for (const c of ordinary.filter((_, i) => i % 3 === 0)) for (const form of ['gun_doubles_11', 'gun_trips_11', 'gun_empty_11']) {
      expect(plan(run(c, form, true)), `${c.id} ${form}`).toEqual(plan(run(c, form, false)));
    }
  });

  it('reordering the input does not change the plan: route-map key order, and the order routes reach the candidate stage', () => {
    for (const id of ['smash', 'flood', 'trips_sail', 'y_cross']) {
      const c = PASS_BY_ID[id];
      const rev = (o: Record<string, string | undefined>) => Object.fromEntries(Object.entries(o).reverse());
      const shuffled: PassConcept = { ...c, strong: rev(c.strong), weak: rev(c.weak), progression: [...c.progression].reverse() };
      expect(plan(run(shuffled, 'gun_trips_11')), id).toEqual(plan(run(c, 'gun_trips_11')));
      const p = run(c, 'gun_trips_11');
      const routes = [...p.routes].reverse();
      const again = candidates(routes, findMotifs(routes), p.qbSetAt).find((x) => x.valid)!;
      expect(again.order.map((s) => s.ref), id).toEqual(p.chosen!.order.map((s) => s.ref));
    }
  });

  it('a synthetic, unnamed concept with no progression compiles', () => {
    const c: PassConcept = { id: 'synthetic_1', name: 'synthetic', family: 'dropback', drop: 'gun5',
      strong: { 1: 'out', 2: 'post', 3: 'slant' }, weak: { 1: 'curl', 2: 'arrow' }, back: 'angle', progression: [], beats: [] };
    for (const form of ['gun_doubles_11', 'gun_trips_11']) {
      const p = run(c, form);
      expect(p.chosen, form).not.toBeNull();
      expect(p.chosen!.order.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('no blocking back or tight end is a target or the outlet', () => {
    const c: PassConcept = { ...PASS_BY_ID.slant_flat, id: 'blockers', teBlock: true, back: 'block' };
    const p = run(c, 'gun_wing_12');
    const routeRefs = new Set(p.routes.map((r) => r.ref));
    for (const s of p.chosen!.order) expect(routeRefs.has(s.ref)).toBe(true);
    expect(p.chosen!.order.some((s) => s.ref === 'B')).toBe(false);
    expect(p.chosen!.outlet).toBeNull();
    expect(p.excluded.some((e) => e.ref === 'B')).toBe(true);
  });

  it('screens bypass the generic compiler: their read is the called target', () => {
    for (const c of SCREEN_CONCEPTS) {
      const p = run(c);
      expect(p.bypass, c.id).toMatch(/^screen/);
      expect(p.chosen).toBeNull();
    }
  });

  it('is deterministic: the same play compiles to the same plan twice', () => {
    expect(plan(run(PASS_BY_ID.dagger, 'gun_trips_11'))).toEqual(plan(run(PASS_BY_ID.dagger, 'gun_trips_11')));
  });
});

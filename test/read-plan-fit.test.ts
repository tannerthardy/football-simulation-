/** routesOf / planFits (src/playbook/read-plans.ts): a call takes its QB_V2 plan only when it runs the routes the
 * plan was authored on, at every receiver the plan uses (QB lane, 2026-11-24; CALL_COMPOSE step 2's variants keep their
 * concept's id). */
import { describe, expect, it } from 'vitest';
import { PASS_BY_ID, SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { planFits, planRefs, READ_PLANS, routesOf } from '../src/playbook/read-plans.js';
import { asBackThree } from '../src/game/concept-fit.js';

const TAUGHT = new Set(['slant_flat', 'quick_outs', 'levels', 'flood', 'mesh']);

describe('read plans: the routes they were authored on', () => {
  it('every plan names the routes at each receiver it uses', () => {
    for (const p of Object.values(READ_PLANS)) {
      const r = routesOf(p);
      expect(r, p.conceptId).not.toBeNull();
      expect([...r!.keys()].sort()).toEqual(planRefs(p).sort());
    }
  });

  it('the installed concept fits its plan, except where the plan follows the taught version', () => {
    for (const p of Object.values(READ_PLANS)) {
      const id = p.conceptId.replace(/\+b3$/, '');
      const c0 = PASS_BY_ID[id] ?? SCREEN_BY_ID[id];
      const c = p.conceptId.endsWith('+b3') ? asBackThree(c0) : c0;
      const taughtDiffers = TAUGHT.has(id) && [...routesOf(p)!].some(([ref, route]) => {
        const at = ref === 'B' ? (c.back === 'block' ? null : c.back) : ((ref[0] === 'S' ? c.strong : c.weak) as any)[ref.slice(1)] ?? null;
        return at !== route;
      });
      expect(planFits(p, c), p.conceptId).toBe(!taughtDiffers);
    }
  });

  it('the taught versions fit; a clear-out where the plan throws a flat does not', () => {
    const sf = PASS_BY_ID.slant_flat;
    expect(planFits(READ_PLANS.slant_flat, { ...sf, back: 'check' })).toBe(true);
    expect(planFits(READ_PLANS.levels, { ...PASS_BY_ID.levels, strong: { ...PASS_BY_ID.levels.strong, 1: 'short_in', 2: 'dig' } })).toBe(true);
    expect(planFits(READ_PLANS.mesh, { ...PASS_BY_ID.mesh, weak: { ...PASS_BY_ID.mesh.weak, 1: 'corner' } })).toBe(true);
    // slant-flat with a slant-go backside: the plan's backside flat (W2) is now a go
    if (planRefs(READ_PLANS.slant_flat).includes('W2'))
      expect(planFits(READ_PLANS.slant_flat, { ...sf, back: 'check', weak: { 1: 'slant', 2: 'go' } })).toBe(false);
  });

  it('stick from doubles: the back-as-#3 call fits its own plan, with the flat thrown to the back', () => {
    const call = asBackThree(PASS_BY_ID.stick);
    expect(planFits(READ_PLANS['stick+b3'], call)).toBe(true);
    expect(planFits(READ_PLANS.stick, call)).toBe(false);
    expect(READ_PLANS['stick+b3'].reads[0].throws.map((t) => t.ref)).toEqual(['B', 'S2']);
  });
});

/** Read plans (src/playbook/read-plans.ts; data only, module A): each authored plan is consistent with its concept as
 * installed. Every receiver it names runs a route in the concept (the back only when he releases), its drop is the
 * concept's, steps start on the plant or the first hitch (smash: the corner read on the hitch) and do not go backward, a key's answers are among its throws, and each expected
 * read exists. Nothing in the engine reads the plans yet. */
import { describe, expect, it } from 'vitest';
import { PASS_BY_ID as PASS, SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { PLAN_DROP_DIFFERS, READ_PLANS, routesOf } from '../src/playbook/read-plans.js';
import type { ReceiverRef } from '../src/playbook/types.js';

const PASS_BY_ID = { ...PASS, ...SCREEN_BY_ID };

// The plans are the taught versions: each is checked against the routes it was authored on (routesOf: the installed
// concept with its taught setting, a CALL_COMPOSE step-2 setting where the two differ, #903).
function routed(plan: (typeof READ_PLANS)[string]): Set<ReceiverRef> {
  return new Set([...(routesOf(plan) ?? new Map())].filter(([, r]) => r !== null).map(([ref]) => ref));
}

describe('authored read plans', () => {
  for (const plan of Object.values(READ_PLANS)) {
    it(`${plan.conceptId}: consistent with the installed concept`, () => {
      const c = PASS_BY_ID[plan.conceptId.replace(/\+b3$/, '')];
      expect(c, 'concept exists').toBeTruthy();
      if (PLAN_DROP_DIFFERS[plan.conceptId.replace(/\+b3$/, '')]) expect(plan.drop).not.toBe(c.drop);
      else expect(plan.drop).toBe(c.drop);
      const has = routed(plan);
      const refs: ReceiverRef[] = [];
      let last = -1;
      expect(plan.reads.length).toBeGreaterThan(0);
      expect(plan.reads[0].step).toBeGreaterThanOrEqual(0);
      expect(plan.reads[0].step).toBeLessThanOrEqual(1);
      for (const r of plan.reads) {
        expect(r.step).toBeGreaterThanOrEqual(last); last = r.step;
        if (r.look.kind === 'receiver') refs.push(r.look.ref);
        expect(r.throws.length).toBeGreaterThan(0);
        refs.push(...r.throws.map((t) => t.ref));
        for (const k of r.keyRules ?? []) expect(r.throws.map((t) => t.ref)).toContain(k.throwTo);
        if (r.keyRules) expect(r.look.kind).toBe('key');
      }
      for (const h of plan.hot) refs.push(h.answer.ref);
      if (plan.checkdown) { refs.push(plan.checkdown.ref); expect(plan.checkdown.fromStep).toBeGreaterThanOrEqual(0); }
      for (const ref of refs) expect(has, `${ref} runs a route in ${plan.conceptId}`).toContain(ref);
      for (const i of Object.values(plan.expected ?? {})) expect(plan.reads[i as number]).toBeTruthy();
      expect(plan.source).toMatch(/read-plans\.md/);
    });
  }
});

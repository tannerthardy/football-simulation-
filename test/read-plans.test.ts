/** Read plans (src/playbook/read-plans.ts; data only, module A): each authored plan is consistent with its concept as
 * installed. Every receiver it names runs a route in the concept (the back only when he releases), its drop is the
 * concept's, steps start on the plant or the first hitch (smash: the corner read on the hitch) and do not go backward, a key's answers are among its throws, and each expected
 * read exists. Nothing in the engine reads the plans yet. */
import { describe, expect, it, vi } from 'vitest';

// The plans are the taught versions: checked against the concepts installed as taught (CONCEPT_TAUGHT, #896).
vi.stubEnv('CONCEPT_TAUGHT', '1');
const { PASS_BY_ID: PASS, SCREEN_BY_ID } = await import('../src/playbook/concepts.js');
const PASS_BY_ID = { ...PASS, ...SCREEN_BY_ID };
// After the stub: read-plans.ts imports the concepts (routesOf), so it must load with the taught installs too.
const { READ_PLANS, PLAN_DROP_DIFFERS } = await import('../src/playbook/read-plans.js');
const { asBackThree } = await import('../src/game/concept-fit.js');
// A back-as-#3 plan ('<id>+b3') is checked against its call: the concept with the back on the #3's route.
for (const id of Object.keys(READ_PLANS)) if (id.endsWith('+b3')) (PASS_BY_ID as any)[id] = asBackThree(PASS[id.slice(0, -3)]);
import type { ReceiverRef } from '../src/playbook/types.js';

function routed(id: string): Set<ReceiverRef> {
  const c = PASS_BY_ID[id];
  const s = new Set<ReceiverRef>();
  for (const [k, v] of Object.entries(c.strong)) if (v) s.add(`S${k}` as ReceiverRef);
  for (const [k, v] of Object.entries(c.weak)) if (v) s.add(`W${k}` as ReceiverRef);
  if (c.back !== 'block' || c.screen?.receiver === 'B') s.add('B');
  return s;
}

describe('authored read plans', () => {
  for (const plan of Object.values(READ_PLANS)) {
    it(`${plan.conceptId}: consistent with the installed concept`, () => {
      const c = PASS_BY_ID[plan.conceptId];
      expect(c, 'concept exists').toBeTruthy();
      if (PLAN_DROP_DIFFERS[plan.conceptId.replace(/\+b3$/, '')]) expect(plan.drop).not.toBe(c.drop);
      else expect(plan.drop).toBe(c.drop);
      const has = routed(plan.conceptId);
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

/** planFor (src/playbook/read-plans.ts; CALL_COMPOSE step 3 for the quick game): the read plan composed the way the
 * call is composed. Covers:
 * - on the authored call, the authored plan itself (the staged cells do not move);
 * - the frontside is the authored plan's on every backside half and back's job;
 * - the backside read comes from the backside half's own quick routes (a slant-flat half: its flat key; no quick
 *   route: no backside read);
 * - the back is a checkdown only when the call releases him;
 * - a frontside that does not run the plan's routes takes no plan. */
import { describe, expect, it } from 'vitest';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { HALF_CONCEPTS, HALF_BY_ID } from '../src/playbook/calls/halves.js';
import { READ_PLANS, backsideRead, planFor } from '../src/playbook/read-plans.js';
import type { PassConcept } from '../src/playbook/types.js';

const STAGED = ['quick_outs', 'slant_flat', 'stick'] as const;
const TAUGHT_BACK: Record<string, string> = { slant_flat: 'check', quick_outs: 'back_flat' };
const authored = (id: string): PassConcept => ({ ...PASS_BY_ID[id], back: TAUGHT_BACK[id] ?? PASS_BY_ID[id].back });
const withWeak = (c: PassConcept, half: string, back = c.back): PassConcept => ({ ...c, weak: { ...HALF_BY_ID[half].routes }, back });
const isFront = (r: any) => (r.look.kind === 'key' ? r.look.side !== 'W' : r.look.ref[0] !== 'W');
const twoReceiverHalves = HALF_CONCEPTS.filter((h) => Object.keys(h.routes).length <= 2).map((h) => h.id);

describe('planFor: composed read plans', () => {
  it('the authored call takes the authored plan itself (the staged cells do not move)', () => {
    for (const id of STAGED) expect(planFor(authored(id)), id).toBe(READ_PLANS[id]);
  });

  it('every backside half and back: the frontside reads, key rules and frontside hot are the authored ones', () => {
    for (const id of STAGED) for (const half of twoReceiverHalves) for (const back of ['block', 'check', 'angle']) {
      const p = planFor(withWeak(authored(id), half, back));
      expect(p, `${id} / ${half} / ${back}`).not.toBeNull();
      expect(p!.reads.filter(isFront)).toEqual(READ_PLANS[id].reads.filter(isFront));
      expect(p!.hot.filter((h) => h.side !== 'W')).toEqual(READ_PLANS[id].hot.filter((h) => h.side !== 'W'));
    }
  });

  it('the backside read is the backside half\'s own: its flat key, its first quick route, or none', () => {
    const sf = planFor(withWeak(authored('stick'), 'slant_flat'))!;
    expect(sf.reads.at(-1)).toMatchObject({ step: 1, look: { kind: 'key', role: 'flat', side: 'W' } });
    const sg = planFor(withWeak(authored('slant_flat'), 'slant_go'))!;
    expect(sg.reads.at(-1)).toMatchObject({ step: 1, look: { kind: 'receiver', ref: 'W1' }, throws: [{ ref: 'W1', timing: 'onBreak' }] });
    expect(sg.hot.find((h) => h.side === 'W')?.answer.ref).toBe('W1');
    const gh = planFor(withWeak(authored('quick_outs'), 'go_hook'))!;
    expect(gh.reads.every(isFront)).toBe(true);
    expect(gh.hot.some((h) => h.side === 'W')).toBe(false);
    expect(backsideRead({ 1: 'go', 2: 'seam' }, 1)).toBeNull();
    expect(backsideRead({ 1: 'hitch', 2: 'go' }, 1)?.throws.map((t) => t.ref)).toEqual(['W1']);
  });

  it('the side pick holds only on the authored backside: otherwise the concept is run to its called side', () => {
    expect(planFor(authored('quick_outs'))!.pick).toBe('cushion');
    expect(planFor(withWeak(authored('quick_outs'), 'slant_flat'))!.pick).toBeUndefined();
  });

  it('the back is a checkdown only when the call releases him', () => {
    for (const id of STAGED) {
      expect(planFor({ ...authored(id), back: 'block' })!.checkdown, id).toBeNull();
      expect(planFor(withWeak(authored(id), 'slant_go', 'angle'))!.checkdown?.ref, id).toBe('B');
    }
  });

  it('a frontside that does not run the plan\'s routes takes no plan', () => {
    const c = authored('slant_flat');
    expect(planFor({ ...c, strong: { ...c.strong, 1: 'go' } })).toBeNull();
    expect(planFor({ ...authored('stick'), strong: { 1: 'go', 2: 'hitch', 3: 'flat' } })).toBeNull();
  });
});

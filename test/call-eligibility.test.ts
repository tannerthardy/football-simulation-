import { describe, expect, it } from 'vitest';
import { callEligibility } from '../src/game/call-eligibility.js';
import { fieldRefs } from '../src/game/concept-fit.js';
import { FORMATION_BY_ID, FORMATIONS } from '../src/playbook/formations.js';
import type { Formation } from '../src/playbook/types.js';

const AT = { los: 35, ctx: {}, bodies: {} };
const MID = 26.67;

describe('call eligibility: who may be handed a route after motion (CALL_COMPOSE step 2)', () => {
  it('every installed formation, either way, has seven on the line and every numbered receiver eligible', () => {
    for (const f of FORMATIONS) for (const flip of [false, true]) {
      const e = callEligibility(f, flip, MID, undefined, AT);
      expect(e.problems, `${f.id} flip=${flip}`).toEqual([]);
      expect(e.onLine, f.id).toBe(7);
      expect([...e.eligible].sort(), f.id).toEqual([...e.refs].sort());
    }
  });

  it('linemen are never numbered, so no tag can hand one a route', () => {
    const e = callEligibility(FORMATION_BY_ID.gun_doubles_11, false, MID, undefined, AT);
    for (const s of ['LT', 'LG', 'C', 'RG', 'RT']) expect(e.bySlot[s].eligible, s).toBe(false);
    expect(Object.values(e.off.numbering)).not.toContain('LT');
  });

  it('a receiver set on the ball outside an attached end covers him: the end is ineligible', () => {
    const base = FORMATION_BY_ID.gun_doubles_11; // Y inline right, Z off the ball outside him
    const covered: Formation = { ...base, id: 'covered_y', slots: { ...base.slots, Z: { ...base.slots.Z!, depth: 0.6 }, H: { ...base.slots.H!, depth: 1.2 } } };
    const e = callEligibility(covered, false, MID, undefined, AT);
    const yRef = e.off.refOf.Y!;
    expect(e.bySlot.Y.covered).toBe(true);
    expect(e.eligible.has(yRef)).toBe(false);
    expect(e.eligible.has(e.off.refOf.Z!)).toBe(true);
  });

  it('a set with six on the line is reported, not silently passed', () => {
    const base = FORMATION_BY_ID.gun_doubles_11;
    const six: Formation = { ...base, id: 'six_on', slots: { ...base.slots, X: { ...base.slots.X!, depth: 1.2 } } };
    const e = callEligibility(six, false, MID, undefined, AT);
    expect(e.onLine).toBe(6);
    expect(e.problems.join(' ')).toMatch(/6 on the line/);
  });

  it('after motion the refs are the play\'s own numbering (fieldRefs), and the motion man stays eligible', () => {
    const f = FORMATION_BY_ID.gun_doubles_11;
    for (const flip of [false, true]) for (const motion of [{ slot: 'H', kind: 'across' }, { slot: 'Z', kind: 'across' }] as const) {
      const e = callEligibility(f, flip, MID, motion, AT);
      expect([...e.refs].sort()).toEqual([...fieldRefs(f, flip, MID, motion, AT)].sort());
      const ref = e.off.refOf[motion.slot];
      if (ref) expect(e.eligible.has(ref), `${motion.slot} -> ${ref}`).toBe(true);
      expect(e.problems).toEqual([]);
    }
  });
});

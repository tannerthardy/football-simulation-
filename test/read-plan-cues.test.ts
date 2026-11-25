/** Every key read answers every cue the passer can produce (Integration, 2026-11-25: a sitting apex named nothing on
 * slant-flat and his eyes left at once). Each cue is either a keyRule (the throw it names) or listed in `moveOn` (the
 * taught answer is "nothing here: the next read"), never left out. Covers the authored plans, their '+b3' versions and the
 * composed backside resets (planFor's table). The cue list is the passer's (src/sim/qbv2/drive.ts keyCue: the movement
 * cues, a sit resolved by where he sits, and `none`); a cue added there must be answered here. */
import { describe, expect, it } from 'vitest';
import { HALF_CONCEPTS } from '../src/playbook/calls/halves.js';
import { READ_PLANS, backsideRead } from '../src/playbook/read-plans.js';
import type { PlanRead } from '../src/sim/qbv2/plan.js';

const PRODUCED = ['widens', 'sinks', 'jumps', 'squats', 'none'] as const;
const unanswered = (r: PlanRead) => PRODUCED.filter((c) => !r.keyRules?.some((k) => k.cue === c) && !r.moveOn?.includes(c));

describe('key reads answer every cue the passer produces', () => {
  it('authored plans (with their back-as-#3 versions)', () => {
    for (const p of Object.values(READ_PLANS)) p.reads.forEach((r, i) => {
      if (r.look.kind !== 'key') return;
      expect(unanswered(r), `${p.conceptId} read ${i}`).toEqual([]);
      for (const c of r.moveOn ?? []) expect(r.keyRules?.some((k) => k.cue === c), `${p.conceptId} read ${i}: ${c} both named and moveOn`).toBe(false);
    });
  });
  it("planFor's composed backside resets", () => {
    for (const h of HALF_CONCEPTS) {
      const r = backsideRead(h.routes, 1);
      if (r?.look.kind === 'key') expect(unanswered(r), h.id).toEqual([]);
    }
  });
  it('a sitting slant-flat key names the flat (taught: "sits inside or sinks: the flat")', () => {
    const r = READ_PLANS.slant_flat.reads;
    expect(r[0].keyRules?.find((k) => k.cue === 'squats')?.throwTo).toBe('S2');
    expect(r[1].keyRules?.find((k) => k.cue === 'squats')?.throwTo).toBe('W2');
  });
});

/** Pre-snap structure identification for coverage checks. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../src/core/field.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { formationStructure } from '../src/playbook/structure.js';
import type { Formation } from '../src/playbook/types.js';

const of = (f: Formation | string, ballY = CENTER_Y, flip = false) =>
  formationStructure(alignOffense(typeof f === 'string' ? FORMATION_BY_ID[f] : f, flip, 40, ballY));

describe('formation structure', () => {
  it('separates open trips, closed (TE) trips and bunch', () => {
    expect(of('gun_trips_11').tags).toEqual(expect.arrayContaining(['trips_open', 'trips', 'iso_weak']));
    expect(of('gun_trey_11').tags).toContain('trips_closed');
    expect(of('gun_bunch_11').tags).toEqual(expect.arrayContaining(['bunch_strong', 'trips']));
    expect(of('gun_trips_11').tags).not.toContain('bunch_strong');
  });

  it('identifies empty, two-back and a nub side', () => {
    expect(of('gun_empty_11').tags).toContain('empty_3x2');
    expect(of('i_pro_21').tags).toEqual(expect.arrayContaining(['two_back', 'iso_weak']));
    expect(of('i_twins_21').tags).toContain('nub_weak');
    expect(of('gun_doubles_11').tags).toEqual([]);
  });

  it('finds a stack and a reduced split in lab formations', () => {
    const stack: Formation = { id: 'lab_stack', name: 'Stack', personnel: '11', qb: 'gun', tags: [], slots: {
      X: { side: 'L', split: 'wide', depth: 0.6 }, H: { side: 'L', split: 'slot', depth: 1.2 },
      Z: { side: 'R', split: 12, depth: 0.6 }, Y: { side: 'R', split: 12, depth: 2.2 }, RB: { side: 'L', split: 2.3, depth: 5.5 } } };
    const s = of(stack);
    expect(s.tags).toContain(s.strong.stack ? 'stack_strong' : 'stack_weak');
    const reduced: Formation = { ...stack, id: 'lab_reduced', slots: { ...stack.slots, Z: { side: 'R', split: 7.5, depth: 0.6 }, Y: { side: 'R', split: 'inline', depth: 0.6 } } };
    expect(of(reduced).tags.some(t => t.startsWith('reduced_'))).toBe(true);
  });

  it('names the field side from the hash and mirrors with a flip', () => {
    const left = of('gun_trips_11', HASH_LEFT_Y), right = of('gun_trips_11', HASH_RIGHT_Y);
    expect(left.strongToField).not.toBe(right.strongToField);
    expect(of('gun_trips_11', CENTER_Y).strongToField).toBeNull();
    expect(of('gun_trips_11', HASH_LEFT_Y, true).strongToField).toBe(!left.strongToField);
  });
});

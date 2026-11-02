import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { distribution, formationLabel, personnelCount } from '../src/playbook/formation-spec.js';
import { FORMATIONS, FORMATION_SPECS } from '../src/playbook/formations.js';
import type { Formation } from '../src/playbook/types.js';

// Phase 1 of docs/FORMATION_CATALOG_PLAN.md: the 18 formations are stored as
// structure and compiled. They must come out byte-identical to the literals
// they replaced (frozen in test/fixtures/formations-v1.json), and so must every
// alignment the engine makes from them.
const v1 = JSON.parse(readFileSync(new URL('./fixtures/formations-v1.json', import.meta.url), 'utf8')) as Formation[];

describe('structured formation specs', () => {
  it('compile byte-identically to the formations they replaced', () => {
    expect(JSON.stringify(FORMATIONS, null, 1)).toBe(JSON.stringify(v1, null, 1));
  });

  it('give identical alignments in all 108 looks (18 formations, both flips, three ball spots)', () => {
    for (const [i, f] of FORMATIONS.entries()) for (const flip of [false, true]) for (const ball of [HASH_LEFT_Y, 26.67, 53.33 - HASH_LEFT_Y]) {
      expect(JSON.stringify(alignOffense(f, flip, 40, ball))).toBe(JSON.stringify(alignOffense(v1[i], flip, 40, ball)));
    }
  });

  it('carry personnel by role, and the family agrees with the distribution', () => {
    const shape: Record<string, (s: number, w: number, backs: number) => boolean> = {
      Trips: (s, w) => s === 3 && w === 1, Trey: (s, w) => s === 3 && w === 1, Bunch: (s, w) => s === 3 && w === 1,
      Empty: (s, w, b) => b === 0 && s + w === 5, Doubles: (s, w) => s === 2 && w === 2, Ace: (s, w) => s === 2 && w === 2,
      Spread: (s, w) => s === 2 && w === 2,
    };
    for (const spec of FORMATION_SPECS) {
      const n = personnelCount(spec), d = distribution(spec);
      expect(n.RB + n.FB + n.TE + n.WR, spec.id).toBe(5);
      const backs = spec.players.filter(p => p.back !== undefined).length;
      if (shape[spec.family]) expect(shape[spec.family](d.strong, d.weak, backs), `${spec.id} ${spec.family} ${d.strong}x${d.weak}`).toBe(true);
    }
  });

  it('render one label grammar from structure', () => {
    const label = Object.fromEntries(FORMATION_SPECS.map(s => [s.id, formationLabel(s)]));
    expect(label.gun_trey_11).toBe('11 Gun Trey 3x1 Rt, Y attached, RB offset weak');
    expect(label.gun_wing_12).toBe('12 Gun Wing 3x1 Rt, Y attached + H wing, RB offset weak');
    expect(label.offset_i_21).toBe('21 Under Offset I 2x1 Rt, Y attached, F offset strong + RB I deep');
    expect(label.gun_empty_11).toBe('11 Gun Empty 3x2 Rt');
    expect(formationLabel(FORMATION_SPECS.find(s => s.id === 'ace_12')!, true)).toBe('12 Under Twin TE 2x2 Lt, H attached weak + Y attached, RB behind');
    expect(new Set(Object.values(label)).size).toBe(FORMATION_SPECS.length);
  });
});

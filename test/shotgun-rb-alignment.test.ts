import { vi, describe, expect, it } from 'vitest';
// Recorded on the installed flat line (1.3 yd splits, 0.55 yd depth): its
// saved geometry, landmarks and plans are that line's. The tracked line
// (OL_ALIGN, docs/reviews/presnap.md) moves every body; pin it off here.
vi.hoisted(() => { process.env.OL_ALIGN = '0'; });
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../src/core/field.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATIONS, FORMATION_BY_ID } from '../src/playbook/formations.js';

const offsetGun = FORMATIONS.filter(f => f.qb === 'gun' && typeof f.slots.RB?.split === 'number');

describe('offset shotgun back alignment', () => {
  it.each(offsetGun)('$id gives the back lateral and downhill runway on either side/hash', formation => {
    for (const flip of [false, true]) for (const ballY of [HASH_LEFT_Y, CENTER_Y, HASH_RIGHT_Y]) {
      const a = alignOffense(formation, flip, 40, ballY), qb = a.spots.QB, rb = a.spots.RB;
      expect(qb.pos.x - rb.pos.x).toBeCloseTo(.5);
      expect(rb.pos.y - qb.pos.y).toBeCloseTo(flip ? -2.3 : 2.3);
      expect(rb.backfield).toBe(true);
      expect(a.numbering.B).toBe('RB');
      expect(a.refOf.RB).toBe('B');
      expect(a.counts.S + a.counts.W).toBe(4);
    }
  });

  it('keeps the empty back in receiver numbering and pistol/under-center backs centered', () => {
    const empty = alignOffense(FORMATION_BY_ID.gun_empty_11, false, 40, CENTER_Y);
    expect(empty.spots.RB.backfield).toBe(false);
    expect(empty.numbering.B).toBeUndefined();
    expect(empty.refOf.RB).toMatch(/^[SW][123]$/);
    for (const id of ['pistol_11', 'pistol_12', 'ace_11', 'ace_12', 'i_pro_21']) {
      const f = FORMATION_BY_ID[id], a = alignOffense(f, false, 40, CENTER_Y);
      expect(a.spots.RB.pos.y).toBe(CENTER_Y);
      expect(a.spots.RB.pos.x).toBe(40 - f.slots.RB!.depth);
      expect(a.numbering.B).toBe('RB');
    }
  });

  it('preserves seven on the line and eligible ends in every installed formation', () => {
    for (const formation of FORMATIONS) for (const flip of [false, true]) {
      const a = alignOffense(formation, flip, 40, CENTER_Y);
      const eligibleOn = Object.keys(formation.slots).filter(slot => a.spots[slot].pos.x >= 39.4 - 1e-9);
      expect(eligibleOn, formation.id).toHaveLength(2); // five OL plus two ends
      for (const end of eligibleOn) {
        const endY = a.spots[end].pos.y - CENTER_Y;
        expect(eligibleOn.some(other => other !== end
          && Math.sign(a.spots[other].pos.y - CENTER_Y) === Math.sign(endY)
          && Math.abs(a.spots[other].pos.y - CENTER_Y) > Math.abs(endY)), formation.id).toBe(false);
      }
    }
  });
});

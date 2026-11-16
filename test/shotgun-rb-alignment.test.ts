import { describe, expect, it } from 'vitest';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../src/core/field.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATIONS, FORMATION_BY_ID, UNDER_TAILBACK_EXTRA } from '../src/playbook/formations.js';

const offsetGun = FORMATIONS.filter(f => f.qb === 'gun' && typeof f.slots.RB?.split === 'number' && !f.tags.includes('split-backs'));

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
      // Re-recorded on the engine defaults (2026-11-15): BACKFIELD_DEPTH puts an under-center tailback at his tracked
      // depth (installed 6.8 + 0.5 = 7.3); the pistol and gun backs keep the installed depth.
      const extra = f.qb === 'under' && f.slots.RB!.depth >= 6 ? UNDER_TAILBACK_EXTRA : 0;
      expect(a.spots.RB.pos.x).toBeCloseTo(40 - f.slots.RB!.depth - extra, 9);
      expect(a.numbering.B).toBe('RB');
    }
  });

  it('preserves seven on the line and eligible ends in every installed formation', () => {
    for (const formation of FORMATIONS) for (const flip of [false, true]) {
      const a = alignOffense(formation, flip, 40, CENTER_Y);
      // On the line as the rules read it (presnap-rules): the installed depth,
      // not the body's (OL_STAGGER stands a legal end 1.19 yd off the ball).
      const eligibleOn = Object.keys(formation.slots).filter(slot => formation.slots[slot as keyof typeof formation.slots]!.depth <= .6 + 1e-9);
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

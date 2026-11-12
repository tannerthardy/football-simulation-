import { describe, expect, it } from 'vitest';
import { boxThreats, PRO_CALL, ProtectionCoordinator } from '../src/sim/behaviors/blocking.js';

/** PRO_CALL: the protection is called at the line from the box count (src/sim/behaviors/blocking.ts). */
describe('PRO_CALL', () => {
  it('is off by default', () => {
    expect(PRO_CALL).toBe(false);
  });

  it('counts the box the offence sees: on-line men, walked-up backers, a safety in the box; not deep or wide men', () => {
    const ol = ['LT', 'LG', 'C', 'RG', 'RT'].map((slot, i) => ({ slot, pos: { x: 49.4, y: 22 + 1.5 * i } }));
    const at = (idx: number, x: number, y: number) => ({ idx, pos: { x, y } });
    const defense = [
      at(0, 50.8, 21), // edge on the line
      at(1, 50.8, 24), at(2, 50.8, 26.5), // interior line
      at(3, 52.4, 25), // walked-up Mike (2.4 yd off)
      at(4, 52.9, 29.5), // walked-up backer outside the tackle, inside +3.5
      at(5, 52.6, 33.5), // apex nickel 2.6 yd off but 5.5 yd outside the tackle
      at(6, 54.8, 25), // stacked backer 4.8 yd off
      at(7, 62, 26), // deep safety
      at(8, 51.2, 40), // pressed corner, wide
    ];
    const sim: any = { los: 50, offense: ol, defense, snapX: defense.map((d) => d.pos.x) };
    expect(boxThreats(sim).map((d: any) => d.idx)).toEqual([0, 1, 2, 3, 4]);
  });

  it("keeps the call's sets on the coordinator, empty before a call", () => {
    const c = new ProtectionCoordinator();
    expect(c.called.size).toBe(0);
    expect(c.backsIn.size).toBe(0);
  });
});

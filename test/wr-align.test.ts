/** WR_ALIGN (experimental, off): receivers align as tracked. A lone #1 keeps
 * 13.5 yd from his sideline, about 11 with others to his side; a #2 stands at
 * 0.58 of the #1's split (0.62 in trips) and a #3 at 0.40. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, FIELD_WIDTH, HASH_LEFT_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function spots(flag: string, formation: string, ballY: number) {
  vi.stubEnv('WR_ALIGN', flag);
  vi.resetModules();
  const { alignOffense } = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const a = alignOffense(FORMATION_BY_ID[formation], false, 40, ballY);
  const split = (slot: string) => Math.abs(a.spots[slot].pos.y - ballY);
  const room = (slot: string) => Math.min(a.spots[slot].pos.y, FIELD_WIDTH - a.spots[slot].pos.y);
  return { split, room };
}

describe('WR_ALIGN', () => {
  it('off: every #1 at the installed 18 yd split', async () => {
    const f = await spots('0', 'gun_doubles_11', CENTER_Y);
    expect(f.split('X')).toBeCloseTo(18, 6);
    expect(f.split('Z')).toBeCloseTo(18, 6);
  });

  it('on: a lone #1 keeps 13.5 yd from his sideline, a #1 with a slot about 11', async () => {
    const f = await spots('1', 'gun_doubles_11', HASH_LEFT_Y);
    expect(f.room('Z')).toBeCloseTo(13.5, 6); // Y is attached: Z is alone outside
    expect(f.room('X')).toBeCloseTo(11, 6);   // H is his slot
    expect(f.split('H')).toBeCloseTo(0.58 * f.split('X'), 6);
  });

  it('on: trips put #2 at 0.62 and #3 at 0.40 of the #1', async () => {
    const f = await spots('1', 'gun_trips_11', CENTER_Y);
    expect(f.split('H')).toBeCloseTo(0.62 * f.split('Z'), 6);
    expect(f.split('Y')).toBeCloseTo(0.40 * f.split('Z'), 6);
  });
});

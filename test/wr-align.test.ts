/** WR_ALIGN (experimental, off): receivers align as tracked. Without a call a
 * lone #1 keeps 13.5 yd from his sideline, about 11 with others to his side;
 * with one, his route or the run sets it. A #2 stands at 0.58 of the #1's
 * split (0.62 in trips) and a #3 at 0.40. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, FIELD_WIDTH, HASH_LEFT_Y } from '../src/core/field.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function spots(flag: string, formation: string, ballY: number, call?: 'run' | Record<'strong' | 'weak', string>) {
  vi.stubEnv('WR_ALIGN', flag);
  vi.resetModules();
  const { alignOffense } = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const ctx = call === 'run' ? { kind: 'run' as const } : call
    ? { kind: 'pass' as const, pass: { ...PASS_BY_ID.four_verts, strong: { 1: call.strong }, weak: { 1: call.weak } } } : {};
  const a = alignOffense(FORMATION_BY_ID[formation], false, 40, ballY, ctx);
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

  it('on: the #1 splits by his route, wide to run vertical or inside, reduced to break out', async () => {
    // gun_doubles_11: Z alone strong (Y inline beside him), X with the slot H weak.
    const f = await spots('1', 'gun_doubles_11', HASH_LEFT_Y, { strong: 'out', weak: 'go' });
    expect(f.room('Z')).toBeCloseTo(14.7, 6); // alone, room to break out
    expect(f.room('X')).toBeCloseTo(10, 6);   // with the slot, wide for the go
  });

  it('on: on a run the lone #1 reduces and a #1 with others stays wide', async () => {
    const f = await spots('1', 'gun_doubles_11', HASH_LEFT_Y, 'run');
    expect(f.room('Z')).toBeCloseTo(15, 6);
    expect(f.room('X')).toBeCloseTo(10.8, 6);
  });
});

/** ALIGN_SIDE / RCV_HABIT (src/playbook/alignment.ts; experimental, off). ALIGN_SIDE: the #1's room to his sideline
 * follows the side of the ball (a lone #1 on a go: 10.3 yd to the boundary, 16.5 to the field). RCV_HABIT: a receiver's
 * own room and depth habit move his spot. Off, both sides take the same room and no habit applies. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(side: boolean, habit: boolean, lone = false) {
  vi.stubEnv('ALIGN_SIDE', side ? '1' : '0'); vi.stubEnv('RCV_HABIT', habit ? '1' : '0'); vi.stubEnv('ALIGN_LONE', lone ? '1' : '0');
  vi.resetModules();
  const { alignOffense } = await import('../src/playbook/alignment.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { FIELD_WIDTH, HASH_LEFT_Y } = await import('../src/core/field.js');
  return { alignOffense, f: FORMATION_BY_ID.gun_trips_11, pass: PASS_BY_ID.four_verts, W: FIELD_WIDTH, hash: HASH_LEFT_Y };
}
const room = (y: number, W: number) => Math.min(y, W - y);

describe('ALIGN_SIDE', () => {
  it('the lone #1 keeps a plus split into the boundary and a reduced one to the field', async () => {
    const ballYs = (m: Awaited<ReturnType<typeof load>>) => [m.hash, m.W - m.hash];
    const lone = (m: Awaited<ReturnType<typeof load>>, ballY: number) =>
      room(m.alignOffense(m.f, false, 40, ballY, { kind: 'pass', pass: m.pass }).spots.X.pos.y, m.W);
    const off = await load(false, false), on = await load(true, false);
    const [b, f] = ballYs(on);
    // X is alone on his side in trips; with the ball on one hash he is to the boundary, on the other to the field.
    const offRooms = [lone(off, b), lone(off, f)].sort((p, q) => p - q), onRooms = [lone(on, b), lone(on, f)].sort((p, q) => p - q);
    expect(offRooms[1] - offRooms[0]).toBeLessThan(0.5);
    expect(onRooms[1] - onRooms[0]).toBeGreaterThan(4);
  });
  it('ALIGN_LONE: a lone #1 on a vertical sets the same split from the ball on either hash', async () => {
    const m = await load(true, false, true);
    const split = (ballY: number) => Math.abs(m.alignOffense(m.f, false, 40, ballY, { kind: 'pass', pass: m.pass }).spots.X.pos.y - ballY);
    expect(split(m.hash)).toBeCloseTo(13.5, 6);
    expect(split(m.W - m.hash)).toBeCloseTo(13.5, 6);
  });
  it('RCV_HABIT moves a detached receiver by his own habit', async () => {
    const m = await load(false, true);
    const base = m.alignOffense(m.f, false, 40, m.hash, { kind: 'pass', pass: m.pass }).spots.X.pos;
    const moved = m.alignOffense(m.f, false, 40, m.hash, { kind: 'pass', pass: m.pass, habit: { X: { room: 1, depth: 0.3 } } }).spots.X.pos;
    expect(Math.abs(moved.y - base.y)).toBeCloseTo(1, 6);
    expect(base.x - moved.x).toBeCloseTo(0.3, 6);
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** SNAP_FLIGHT (experimental, off): the gun snap's flight from the football's track, docs/reviews/2026-11-24-snap-flight.md. Read at import. */
beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const spot = { x: 0, y: 0 };

describe('snapSecured', () => {
  it('off: GUN_SNAP\'s 11.5 yd/s and 0.1 s (0.50 s at 4.6 yd), 0 for an under-center QB', async () => {
    vi.stubEnv('SNAP_FLIGHT', '0'); vi.resetModules();
    const { snapSecured } = await import('../src/sim/ball-transfer.js');
    expect(snapSecured({ x: -4.6, y: 0 }, spot)).toBeCloseTo(4.6 / 11.5 + 0.1, 12);
    expect(snapSecured({ x: -1, y: 0 }, spot)).toBe(0);
  });
  it('on: the measured flight, (d - 0.75) / 5.5 + 0.1 (0.80 s at 4.6 yd), 0 for an under-center QB', async () => {
    vi.stubEnv('SNAP_FLIGHT', '1'); vi.resetModules();
    const { snapSecured } = await import('../src/sim/ball-transfer.js');
    expect(snapSecured({ x: -4.6, y: 0 }, spot)).toBeCloseTo((4.6 - 0.75) / 5.5 + 0.1, 12);
    expect(snapSecured({ x: -4.6, y: 0 }, spot)).toBeCloseTo(0.8, 2);
    expect(snapSecured({ x: -1, y: 0 }, spot)).toBe(0);
    expect(snapSecured({ x: -7, y: 0 }, spot)).toBeGreaterThan(snapSecured({ x: -4.6, y: 0 }, spot));
  });
  it('on: the drop clock and the called pocket schedule read it', async () => {
    vi.stubEnv('SNAP_FLIGHT', '1'); vi.resetModules();
    const { plannedSnapAt } = await import('../src/sim/called-drop.js');
    expect(plannedSnapAt(true, { x: -4.6, y: 0 }, spot)).toBeCloseTo(0.8, 2);
    expect(plannedSnapAt(false, { x: -1, y: 0 }, spot)).toBe(0.1);
  });
});

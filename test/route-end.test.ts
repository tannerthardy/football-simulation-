/** ROUTE_END (src/sim/behaviors/receiver.ts; experimental, off): a settled hitch keeps working his window from his own
 * picture instead of standing, with his goal placed from his settle point (so he arrives and sits); a flat past its points
 * runs on turned to the QB. Staged hitches vs Cover 3 and Cover 1, QB held. */
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.QUICK_HITCH = '0'; }); // engine-73: fixture recorded before QUICK_HITCH; Rules to re-record with it on
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
/** Settled hitches: the farthest any one is from his route's last point at 3.5 s, and the median speed at 2.6 s. */
async function settledHitches(on: boolean, coverage: string) {
  vi.stubEnv('ROUTE_END', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sp: number[] = []; let far = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'hitches', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    sim.qb.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
    const hs = sim.offense.filter((o: any) => o.behavior?.route?.id === 'hitch');
    while (sim.phase !== 'dead' && sim.t < 2.6) sim.tick();
    for (const h of hs) if (h.behavior.settled) sp.push(Math.hypot(h.vel.x, h.vel.y));
    while (sim.phase !== 'dead' && sim.t < 3.5) sim.tick();
    for (const h of hs) if (h.behavior.settled) { const p = h.behavior.path[h.behavior.path.length - 1].p; far = Math.max(far, Math.hypot(p.x - h.pos.x, p.y - h.pos.y)); }
  }
  sp.sort((a, b) => a - b);
  return { speed: sp[Math.floor((sp.length - 1) / 2)], far, n: sp.length };
}

describe('ROUTE_END', () => {
  it('a settled hitch works his window but stays within reach of his settle point (he arrives; the goal does not move with him)', async () => {
    for (const cov of ['cover3', 'cover1']) {
      const off = await settledHitches(false, cov), on = await settledHitches(true, cov);
      console.log(`${cov}: settled ${on.n}; speed at 2.6 s p50 off ${off.speed.toFixed(2)} on ${on.speed.toFixed(2)}; farthest from the point at 3.5 s off ${off.far.toFixed(1)} on ${on.far.toFixed(1)} yd`);
      expect(on.n).toBeGreaterThan(0);
      // He may slide SETTLE_WINDOW (3 yd) in zone or SETTLE_SHIELD (1.5) against man, plus the settle's own arrival.
      expect(on.far).toBeLessThan(3.6);
      expect(on.speed).toBeLessThan(3.5);
    }
  }, 180000);
});

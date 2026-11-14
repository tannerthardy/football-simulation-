/** ROUTE_END (src/sim/behaviors/receiver.ts; experimental, off): a settled hitch keeps working his window from his own
 * picture instead of standing; a flat past its points runs on turned to the QB. Staged hitches vs Cover 3, QB held. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function hitchAt3(on: boolean) {
  vi.stubEnv('ROUTE_END', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sp: number[] = [];
  for (let seed = 1; seed <= 4; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'hitches', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    sim.qb.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
    const hs = sim.offense.filter((o: any) => o.behavior?.route?.id === 'hitch');
    while (sim.phase !== 'dead' && sim.t < 2.6) sim.tick();
    for (const h of hs) sp.push(Math.hypot(h.vel.x, h.vel.y));
  }
  sp.sort((a, b) => a - b);
  return sp[Math.floor((sp.length - 1) / 2)];
}

describe('ROUTE_END', () => {
  it('a settled hitch vs zone keeps moving at 2.6 s with the flag, well above his speed without it', async () => {
    const off = await hitchAt3(false), on = await hitchAt3(true);
    console.log(`hitch speed at 2.6 s p50: off ${off.toFixed(2)}, on ${on.toFixed(2)}`);
    // Default engine (staged, 2.5 s): 0.8 -> 2.9 yd/s; the vitest-pinned legacy engine shows less (1.6 -> 1.9).
    expect(on).toBeGreaterThan(off + 0.2);
  }, 120000);
});

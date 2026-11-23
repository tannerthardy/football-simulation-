/** PERIPH_ACUITY (src/sim/qbmind.ts; engine-92, QB lane 2026-11-23; docs/reviews/2026-11-23-turned-down-open.md): what the
 * passer sees off his gaze is less exact. On a frozen play state, the same look at the same receiver, taken by the engine's
 * QBMind (flag off) and by one with the flag on, with his gaze 5 deg off the man (the clear look in both) and 35 deg off
 * (the periphery in both, so both pictures carry the same latency):
 * 1. off, the look carries no acuity error at any angle;
 * 2. on, the picture moves off the exact one by an error that grows with the angle off his gaze, of the size the look
 *    states (sigP, sigV: his confidence in it), and the clear cone is narrower. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function mindModule(on: boolean) {
  vi.resetModules();
  vi.stubEnv('PERIPH_ACUITY', on ? '1' : '0');
  return import('../src/sim/qbmind.js');
}

describe('PERIPH_ACUITY', () => {
  it('a look off his gaze is less exact, by the error it states, growing with the angle', async () => {
    const onMod = await mindModule(true);
    const offMod = await mindModule(false);
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    expect(onMod.PERIPH_ACUITY).toBe(true);
    expect(offMod.PERIPH_ACUITY).toBe(false);
    const rows: Record<number, { err: number; sig: number }[]> = { 5: [], 35: [] };
    let offSig = 0, narrower = 0, n = 0;
    for (const coverage of ['cover1', 'cover3']) for (const concept of ['curl_flat', 'smash', 'four_verts']) for (const seed of [1, 2]) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 5, formation: 'gun_doubles_11', flip: false }));
      for (let i = 0; i < 26 && sim.phase === 'live'; i++) sim.tick(); // about 1.3 s: receivers out on their routes
      const qb = sim.qb, off = new offMod.QBMind(sim, qb), on = new onMod.QBMind(sim, qb);
      n++; if (on.clearHalf < off.clearHalf) narrower++;
      for (const r of sim.offense) {
        if (r === qb || r.behavior?.kind !== 'route') continue;
        const bearing = Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x), range = Math.hypot(r.pos.x - qb.pos.x, r.pos.y - qb.pos.y);
        if (range < 5) continue;
        for (const deg of [5, 35]) {
          const g = bearing + deg * Math.PI / 180, gaze = { x: qb.pos.x + 10 * Math.cos(g), y: qb.pos.y + 10 * Math.sin(g) };
          const a = off.receiverLook(r, gaze), b = on.receiverLook(r, gaze);
          if (!a || !b) continue;
          offSig += (a.sigP ?? 0) + (a.sigV ?? 0);
          const age = sim.t - b.sampledAt;
          rows[deg].push({ err: Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y), sig: Math.hypot(b.sigP ?? 0, (b.sigV ?? 0) * age) });
        }
      }
    }
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
    const e5 = mean(rows[5].map((r) => r.err)), e35 = mean(rows[35].map((r) => r.err)), s35 = mean(rows[35].map((r) => r.sig));
    console.log('periph-acuity', JSON.stringify({ n5: rows[5].length, n35: rows[35].length, e5: +e5.toFixed(3), e35: +e35.toFixed(3), s35: +s35.toFixed(3) }));
    // 1. Off: no acuity error is stated.
    expect(offSig).toBe(0);
    // 2. On: the clear cone is narrower, and the error grows with the angle and is the size the look states
    //    (a 2-D normal's mean length is about 1.25 sigma; a broad band, as each man's draw is his own).
    expect(narrower).toBe(n);
    expect(rows[35].length).toBeGreaterThan(20);
    expect(e35).toBeGreaterThan(3 * e5);
    expect(e35 / s35).toBeGreaterThan(0.4);
    expect(e35 / s35).toBeLessThan(2.5);
  }, 300_000);
});

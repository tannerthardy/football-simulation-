/** PA_DROP (behaviors/qb.ts, assign.ts; experimental, off): the play-action drop by alignment from tracking. From the
 * gun a mesh and a shallow set (NFL deepest 6.0 yd); under center the fake carried on the drop, with the back faking
 * on a track beside the QB rather than on his drop line. docs/reviews/2026-11-12-pa-drop.md. Over a named panel:
 * - gun play action sets shallower than the same panel's gun drop-back, and than the old play-action drop;
 * - under center, the QB is not held up behind the faking back: past 6 yd by 2.0 s on every case (NFL 7.1), and deeper
 *   at 1.5 s than with the flag off. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const CASES: [string, number][] = [['cover1', 1], ['cover2', 2], ['cover3', 3], ['cover4', 1]];

async function drop(flag: string, concept: string, formation: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('SET_SPOT', '0'); // engine-72: the under-center fake depth was recorded with the old pass set; QB lane to re-record with SET_SPOT on
  vi.stubEnv('PA_DROP', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { deepest: number; at15: number; at20: number }[] = [];
  for (const [coverage, seed] of CASES) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip }));
    const los = sim.los;
    let deepest = 0, at15 = NaN, at20 = NaN, released = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (sim.ball.kind === 'air') released = true;
      const d = los - sim.qb.pos.x;
      if (!released) deepest = Math.max(deepest, d);
      if (Number.isNaN(at15) && sim.t >= 1.5 - 1e-9) at15 = d;
      if (Number.isNaN(at20) && sim.t >= 2.0 - 1e-9) at20 = d;
    };
    sim.run();
    out.push({ deepest, at15, at20 });
  }
  return out;
}
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

describe('PA_DROP', () => {
  it('gun play action is a mesh and a shallow set', async () => {
    const paOn = await drop('1', 'pa_post_dig', 'gun_doubles_11');
    const paOff = await drop('0', 'pa_post_dig', 'gun_doubles_11');
    const dropback = await drop('1', 'dagger', 'gun_doubles_11');
    expect(med(paOn.map((r) => r.deepest))).toBeLessThan(6.6);
    expect(med(paOn.map((r) => r.deepest))).toBeLessThan(med(dropback.map((r) => r.deepest)) - 1);
    expect(med(paOn.map((r) => r.deepest))).toBeLessThan(med(paOff.map((r) => r.deepest)) - 1);
  });
  it('under center the fake is carried on the drop, beside the back, not into him', async () => {
    const on = await drop('1', 'pa_post_dig', 'ace_11'), off = await drop('0', 'pa_post_dig', 'ace_11');
    for (const r of on) expect(r.at20).toBeGreaterThan(6.0);
    expect(med(on.map((r) => r.at15))).toBeGreaterThan(med(off.map((r) => r.at15)) + 0.6);
  });
});

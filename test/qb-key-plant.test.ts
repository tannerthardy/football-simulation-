/** QB_KEY_PLANT (behaviors/qb.ts; with QB_KEY_READ): Integration's item (ii), 2026-11-18.
 * 1. On a keyed quick concept the key is read by the plant (the tick his drop ends), or, undeclared and with no lean he
 *    trusts, one re-read hitch later.
 * 2. An undeclared key gets no default: no read ends in the concept's sitter default ('sits' / 'role') while he has a
 *    picture of the key; off, some do. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function reads(flag: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('QB_RHYTHM_THROW', '1');
  vi.stubEnv('QB_KEY_PLANT', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { mode: string; at: number; plant: number; s: number | null }[] = [];
  for (const concept of ['slant_flat', 'quick_outs', 'curl_flat', 'double_slants']) for (const coverage of ['cover2', 'cover3'])
    for (const roster of [3, 7]) for (const seed of [1, 2]) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
      let plant = -1, prev: string | null = null;
      for (let i = 0; i < 300 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
        sim.tick(); const b: any = sim.qb.behavior;
        if (b?.kind !== 'qb-pass') continue;
        if (plant < 0 && prev === 'drop' && b.phase !== 'drop') plant = sim.t;
        prev = b.phase;
        if (b.keyRead && b.plan?.key) { out.push({ mode: b.keyRead.mode, at: b.keyRead.at, plant, s: b.keyRead.s }); break; }
      }
    }
  return out;
}

describe('QB_KEY_PLANT', () => {
  it('reads the key by the plant (or one re-read hitch after it), with no sitter default', async () => {
    const on = await reads('1');
    expect(on.length).toBeGreaterThanOrEqual(16);
    for (const r of on) if (r.plant >= 0) expect(r.at).toBeLessThanOrEqual(r.plant + 0.35 + 0.02);
    expect(on.filter((r) => r.s !== null && (r.mode === 'sits' || r.mode === 'role')).length).toBe(0);
    const off = await reads('0');
    expect(off.filter((r) => r.mode === 'sits' || r.mode === 'role').length).toBeGreaterThan(0);
  }, 600_000);
});

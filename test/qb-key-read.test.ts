/** QB_KEY_READ (behaviors/qb.ts; with QB_KEY_MAN): the key read as taught (docs/reviews/2026-11-16-key-man.md).
 * 1. The key man is a coverage player in his picture: from doubles a flat / curl-flat key never names a man on the
 *    line in a stance (off: the strong-side end, the second-widest man within 8 yd).
 * 2. The read follows the coverage: smash's corner key reads the corner route (high) against man and the hitch (low)
 *    against cover 3, where the corner bails (a key that reads one way in every coverage is the witness). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function keys(flag: string, concept: string, coverages: string[]) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('QB_KEY_READ', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { coverage: string; man: string | null; pos: string | null; throwTo: string | null }[] = [];
  for (const coverage of coverages) for (const roster of [3, 7, 11]) for (const seed of [1, 2]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
    let row: any = null;
    for (let i = 0; i < 300 && sim.phase === 'live' && sim.carrier === sim.qb && !row; i++) {
      sim.tick(); const b: any = sim.qb.behavior;
      if (b?.kind !== 'qb-pass' || !b.plan?.key) continue;
      if (b.keyRead) row = { coverage, man: b.plan.key.man?.slot ?? null, pos: b.plan.key.man?.player.position ?? null, throwTo: b.keyRead.throwTo };
    }
    if (row) out.push(row);
  }
  return out;
}

describe('QB_KEY_READ', () => {
  it('names a coverage player, never a man on the line, as the flat key from doubles (off: the end)', async () => {
    const C = ['cover2', 'cover3', 'cover4'];
    const on = [...await keys('1', 'curl_flat', C), ...await keys('1', 'double_outs', C), ...await keys('1', 'hitch_out', C)];
    const off = [...await keys('0', 'curl_flat', C), ...await keys('0', 'double_outs', C), ...await keys('0', 'hitch_out', C)];
    const line = (r: { man: string | null }) => !!r.man && /^(DE|DT|NT)/.test(r.man);
    expect(on.length).toBeGreaterThanOrEqual(30);
    expect(on.filter(line).length).toBe(0);
    expect(off.filter(line).length).toBeGreaterThan(off.length / 2);
  }, 600_000);
  it("reads smash's corner by the coverage: the corner route against man, the hitch against cover 3", async () => {
    const on = await keys('1', 'smash', ['cover1', 'cover2man', 'cover3']);
    const share = (c: string[]) => { const x = on.filter((r) => c.includes(r.coverage)); return x.filter((r) => r.throwTo === 'low').length / Math.max(1, x.length); };
    expect(share(['cover1', 'cover2man'])).toBeLessThanOrEqual(0.34);
    expect(share(['cover3'])).toBeGreaterThanOrEqual(0.8);
  }, 600_000);
});

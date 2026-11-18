/** QB_PEEK_CLOCK (behaviors/qb.ts): Integration's item (v), 2026-11-18. The vertical peek runs on his feet's clock: off
 * it by his second hitch (two strides after the plant) at the latest, and off it to the back (the plan's outlet), not
 * through the other side's verticals. Off: four_verts against cover2_match (seed 2, flipped) held the peek to 3.35 s. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function peek(flag: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('QB_PEEK_CLOCK', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2_match', concept: 'four_verts', seed: 2, roster: 7, formation: 'gun_doubles_11', flip: true }));
  let off: { t: number; setAt: number; stride: number; to: string | null } | null = null;
  for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === sim.qb && !off; i++) {
    sim.tick(); const b: any = sim.qb.behavior;
    if (b?.kind === 'qb-pass' && b.triDone) off = { t: sim.t, setAt: b.setAt, stride: b.stride(), to: b.reads[b.readIdx]?.slot ?? null };
  }
  return off!;
}

describe('QB_PEEK_CLOCK', () => {
  it('leaves the vertical peek by the second hitch, to the back; off it held to 3.35 s', async () => {
    const on = await peek('1'), off = await peek('0');
    // Within two ticks of the clock (the read loop is not reached on every tick of the set).
    expect(on.t).toBeLessThanOrEqual(on.setAt + 2 * on.stride + 0.1);
    expect(on.to).toBe('RB');
    expect(off.t).toBeGreaterThan(on.t + 0.5);
  }, 300_000);
});

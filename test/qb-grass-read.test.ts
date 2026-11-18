/** QB_FOOTWORK bit 8 (behaviors/qb.ts; with bits 1 and 2, on CONCEPT_DROPS): the grass read. When his first read is a
 * route into space (go, fade, corner, post, deep out), it is decided by the plant: readable (out of the collision, nobody
 * readable on its step (its release won; on a vertical also his leverage on the man over him: the vertical cue) and
 * priced worth it by the window (no geometric veto), it leaves
 * on the plant; otherwise he is on to his next read with no dwell. Staged on mesh against cover 2 and tampa 2 (the corner
 * in the hole between the cloud and the safety).
 * 1. No dwell: with it on, once he is a tick past his plant his read is never the grass read again (off: he dwells on it).
 * 2. On the plant: every grass throw with it on leaves within 0.6 s of the plant, and more corners are thrown than off.
 * docs/reviews/2026-11-15-drop-design-stage1.md (the grass read). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(fw: string) {
  vi.resetModules();
  const stack = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8'));
  const flags: Record<string, string> = stack.flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  // The reference stack's numeric settings too (the suite pins them to their legacy values).
  for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) vi.stubEnv(k, String(v.default));
  vi.stubEnv('CONCEPT_DROPS', '1'); vi.stubEnv('QB_FOOTWORK', fw);
  vi.stubEnv('QB_WINDOW_ARRIVE', '0'); // engine-83 (QB landing, pinned test-only): with arrival momentum the deep defender bailing to the corner's landing prices the corner off the plant in these scenes. QB to re-record with it on
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { dwell: number; corner: number | null; setAt: number | null }[] = [];
  for (const coverage of ['cover2', 'tampa2']) for (const roster of [3, 7, 11]) for (const seed of [1, 2, 3]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'mesh', seed, roster, formation: 'gun_doubles_11', flip: false }));
    let qb: any = null, setAt: number | null = null, dwell = 0, corner: number | null = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, ...rest: any[]) => { if (p === sim.qb && corner === null && target?.behavior?.route?.id === 'corner') corner = sim.t; return tb(p, target, ...rest); };
    for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
      sim.tick(); const b: any = sim.qb.behavior;
      if (b?.kind !== 'qb-pass') continue; qb ??= b;
      if (setAt === null && b.phase === 'set') setAt = sim.t;
      if (setAt !== null && sim.t > setAt + 0.1 + 1e-9 && b.phase === 'set' && b.readIdx === 0) dwell++;
    }
    out.push({ dwell, corner, setAt });
  }
  return out;
}

describe('QB_FOOTWORK bit 8: the grass read', () => {
  it('is decided by the plant: no dwell after it, and the corner leaves on it', async () => {
    const off = await run('3'), on = await run('11');
    expect(off.reduce((s, r) => s + r.dwell, 0)).toBeGreaterThan(0);
    expect(on.reduce((s, r) => s + r.dwell, 0)).toBe(0);
    const thrown = (rs: typeof on) => rs.filter((r) => r.corner !== null);
    expect(thrown(on).length).toBeGreaterThan(thrown(off).length);
    // A corner thrown from the drop (no set yet) leaves on its last step: on the plant by definition.
    for (const r of thrown(on)) if (r.setAt !== null) expect(r.corner! - r.setAt).toBeLessThanOrEqual(0.6);
  }, 600_000);
});

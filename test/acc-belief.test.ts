/** ACC_BELIEF (behaviors/qb.ts; experimental, off): his belief of his own accuracy prices the throw he will release
 * (the rush as it will be when the ball leaves, not scaled by pocket presence; a flick when it is on him by then).
 * docs/reviews/2026-11-12-accuracy-belief.md. Asserted over a named panel of plays whose rush reaches him: at the
 * first tick the rush is within his urgency window (pressure under 0.9 s) and before either arm has thrown (the same
 * tick and QB position in both arms), every read evaluated both ways expects more misses with it on. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PANEL: [string, string, number, boolean][] = [
  ['pa_shot', 'cover1', 2, false], ['pa_shot', 'cover1', 2, true], ['pa_shot', 'cover3', 2, false], ['pa_shot', 'cover3', 3, false],
  ['post_cross', 'cover1', 2, false], ['post_cross', 'cover3', 2, false], ['seam_hitch', 'cover1', 3, false], ['seam_hitch', 'cover3', 2, false],
  ['seam_hitch', 'cover3', 3, false], ['pa_post_dig', 'cover1', 2, true], ['pa_post_dig', 'cover3', 3, true],
];

async function panel(acc: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('DIR_START', '0'); // engine-92: fixture recorded before a start from rest cost the legs in a direction they were not loaded for; the owning lane to re-record with it on
  vi.stubEnv('ACC_BELIEF', acc);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { at: number | null; qb: number[] | null; miss: number[] }[] = [];
  for (const [concept, coverage, seed, flip] of PANEL) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
    let qb: any = null, at: number | null = null, qpos: number[] | null = null;
    const miss: number[] = [];
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (qb && at === null && qb.phase === 'set' && sim.throwAt < 0 && qb.pressure(sim.qb, sim).time < 0.9) {
        at = sim.t; qpos = [sim.qb.pos.x, sim.qb.pos.y];
        for (const r of qb.reads) { const ev = qb.evaluate(sim.qb, sim, r, 0); if (ev?.parts) miss.push(1 - ev.parts.pAcc); }
      }
    };
    sim.run();
    out.push({ at, qb: qpos, miss });
  }
  return out;
}

describe('ACC_BELIEF', () => {
  it('under the rush, the same reads are believed less accurate with it on', async () => {
    const off = await panel('0'), on = await panel('1');
    const pairs: [number, number][] = [];
    off.forEach((o, i) => {
      const n = on[i];
      if (o.at === null || n.at !== o.at || !o.qb || !n.qb || o.qb[0] !== n.qb[0] || o.qb[1] !== n.qb[1]) return;
      o.miss.forEach((m, j) => { if (n.miss[j] !== undefined) pairs.push([m, n.miss[j]]); });
    });
    expect(pairs.length).toBeGreaterThanOrEqual(10);
    const mean = (k: 0 | 1) => pairs.reduce((s, p) => s + p[k], 0) / pairs.length;
    expect(mean(1)).toBeGreaterThan(mean(0) + 0.02);
    expect(pairs.filter(([a, b]) => b >= a - 1e-9).length / pairs.length).toBeGreaterThanOrEqual(0.7);
  });
});

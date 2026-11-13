/** DROP_BELIEF (behaviors/qb.ts; experimental, off): his belief of how often a ball that reaches his receiver untouched
 * is dropped follows the observed rate by the receiver's hands (docs/reviews/2026-11-12-drop-belief.md). Asserted over
 * a named panel of plays at the first tick he is set, before either arm has thrown (the same tick and QB position in
 * both arms): every read evaluated both ways expects more drops with it on, the rest of the window unchanged, and a
 * receiver with better hands is still believed surer. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PANEL: [string, string, number, boolean][] = [
  ['pa_shot', 'cover1', 2, false], ['pa_shot', 'cover3', 3, false], ['post_cross', 'cover1', 2, false], ['post_cross', 'cover2', 2, false],
  ['seam_hitch', 'cover3', 2, false], ['seam_hitch', 'cover4', 2, false], ['quick_outs', 'cover1', 3, false], ['mesh', 'cover3', 1, false],
];

type Read = { hands: number; rating: number; pOpen: number; pAcc: number };
async function panel(flag: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('DROP_BELIEF', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: { at: number | null; qb: number[] | null; reads: Read[] }[] = [];
  for (const [concept, coverage, seed, flip] of PANEL) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip }));
    let qb: any = null, at: number | null = null, qpos: number[] | null = null;
    const reads: Read[] = [];
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (qb && at === null && qb.phase === 'set' && sim.throwAt < 0) {
        at = sim.t; qpos = [sim.qb.pos.x, sim.qb.pos.y];
        for (const r of qb.reads) {
          const ev = qb.evaluate(sim.qb, sim, r, 0);
          if (ev?.parts) reads.push({ hands: ev.parts.hands, rating: r.r('hands'), pOpen: ev.parts.pOpen, pAcc: ev.parts.pAcc });
        }
      }
    };
    sim.run();
    out.push({ at, qb: qpos, reads });
  }
  return out;
}

describe('DROP_BELIEF', () => {
  it('he expects more drops, by the receiver\'s hands, and nothing else in the window moves', async () => {
    const off = await panel('0'), on = await panel('1');
    const pairs: { off: Read; on: Read }[] = [];
    off.forEach((o, i) => {
      const n = on[i];
      if (o.at === null || n.at !== o.at || !o.qb || !n.qb || o.qb[0] !== n.qb[0] || o.qb[1] !== n.qb[1]) return;
      o.reads.forEach((r, j) => { if (n.reads[j]) pairs.push({ off: r, on: n.reads[j] }); });
    });
    expect(pairs.length).toBeGreaterThanOrEqual(20);
    for (const p of pairs) { expect(p.on.pOpen).toBe(p.off.pOpen); expect(p.on.pAcc).toBe(p.off.pAcc); }
    const drop = (r: Read) => 1 - r.hands;
    const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean(pairs.map((p) => drop(p.on)))).toBeGreaterThan(mean(pairs.map((p) => drop(p.off))) + 0.015);
    expect(pairs.filter((p) => drop(p.on) > drop(p.off)).length / pairs.length).toBeGreaterThanOrEqual(0.7);
    // Better hands, believed surer: the believed drop falls with the rating across the panel's receivers.
    const lo = pairs.filter((p) => p.on.rating < 0.65), hi = pairs.filter((p) => p.on.rating >= 0.75);
    if (lo.length >= 3 && hi.length >= 3) expect(mean(hi.map((p) => drop(p.on)))).toBeLessThan(mean(lo.map((p) => drop(p.on))));
  });
});

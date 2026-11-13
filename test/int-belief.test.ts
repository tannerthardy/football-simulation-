/** INT_BELIEF (behaviors/qb.ts; experimental, off): his interception belief is built as picks happen. A path undercut
 * is an in-flight touch that ends in a pick only some of the time; the catch-point terms (jumped route, contest) are
 * where most picks are made. docs/reviews/2026-11-12-int-belief.md. Asserted over a named panel of plays at the first
 * tick he is set, before either arm has thrown (the same tick and QB position in both arms): every read is evaluated
 * both ways, and with it on the reads whose risk is mostly at the catch point gain against the reads whose risk is
 * mostly on the path. A read with no interception terms stays at zero. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PANEL: [string, string, number, boolean][] = [
  ['pa_shot', 'cover1', 2, false], ['pa_shot', 'cover3', 2, false], ['pa_shot', 'cover3', 3, false], ['post_cross', 'cover1', 2, false],
  ['post_cross', 'cover3', 2, false], ['seam_hitch', 'cover1', 3, false], ['seam_hitch', 'cover3', 2, false], ['seam_hitch', 'cover3', 3, false],
  ['pa_post_dig', 'cover1', 2, true], ['pa_post_dig', 'cover3', 3, true], ['post_cross', 'cover2', 2, false], ['seam_hitch', 'cover4', 2, false],
];

type Read = { risk: number; path: number; catchPt: number };
async function panel(flag: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('INT_BELIEF', flag);
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
          if (ev?.parts) reads.push({ risk: ev.intRisk, path: ev.parts.intPath ?? 0, catchPt: (ev.parts.intJump ?? 0) + (ev.parts.intContest ?? 0) });
        }
      }
    };
    sim.run();
    out.push({ at, qb: qpos, reads });
  }
  return out;
}

describe('INT_BELIEF', () => {
  it('the catch point gains against the path in his interception belief', async () => {
    const off = await panel('0'), on = await panel('1');
    const pairs: { off: Read; on: Read }[] = [];
    off.forEach((o, i) => {
      const n = on[i];
      if (o.at === null || n.at !== o.at || !o.qb || !n.qb || o.qb[0] !== n.qb[0] || o.qb[1] !== n.qb[1]) return;
      o.reads.forEach((r, j) => { if (n.reads[j]) pairs.push({ off: r, on: n.reads[j] }); });
    });
    expect(pairs.length).toBeGreaterThanOrEqual(20);
    for (const p of pairs) if (p.off.risk === 0) expect(p.on.risk).toBe(0);
    const ratio = (p: { off: Read; on: Read }) => p.on.risk / p.off.risk;
    const catchPt = pairs.filter((p) => p.off.risk > 0.005 && p.off.catchPt > 2 * p.off.path);
    const path = pairs.filter((p) => p.off.risk > 0.005 && p.off.path > 2 * p.off.catchPt);
    expect(catchPt.length).toBeGreaterThanOrEqual(5);
    expect(path.length).toBeGreaterThanOrEqual(5);
    const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
    expect(med(catchPt.map(ratio))).toBeGreaterThan(1.5 * med(path.map(ratio)));
  });
});

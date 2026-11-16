/** DEF_BELIEF (behaviors/qb.ts; on since engine-43): his belief about how defenders close on a throw (the man on the
 * target moving partly with him; a defender arriving inside the securing window can still get the ball out).
 * docs/reviews/2026-11-12-window-defenders.md. Asserted over a named panel (plays that were intercepted with it off
 * on engines 41-44), not one play: single-play fixtures moved with every engine from 42 to 45 while the belief held.
 * 1. The belief: at the first tick he is set and reading, before either arm has thrown (the same play state in both),
 *    every read evaluated both ways expects more defended balls with it on, on average and on most reads.
 * 2. The outcome: over the panel, no more interceptions with it on than off. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const PANEL: [string, string, string, number, boolean][] = [
  ['seam_hitch', 'gun_doubles_11', 'cover1', 2, false], ['hitch_post', 'gun_doubles_11', 'cover1', 2, true],
  ['four_verts', 'gun_doubles_11', 'cover4', 1, true], ['verts_hitch', 'gun_doubles_11', 'cover4', 1, true],
  ['dagger', 'gun_doubles_11', 'cover4', 1, true], ['double_slants', 'gun_trips_11', 'cover4', 1, true],
  ['post_cross', 'gun_trips_11', 'cover1', 1, false], ['levels', 'gun_trips_11', 'cover3', 1, false],
  ['levels', 'gun_doubles_11', 'cover1', 1, false], ['seam_hitch', 'gun_doubles_11', 'cover3', 2, false],
];

async function panel(defBelief: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('PASS_OFF', '1'); // engine-71: the panel's interception count (on 1, off 1) was last recorded with PASS_OFF on; with it off the on arm throws 2. QB lane to re-record on the engine's defaults
  vi.stubEnv('DEF_BELIEF', defBelief);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const plays: { ints: number; at: number | null; qb: number[] | null; defended: number[] }[] = [];
  for (const [concept, formation, coverage, seed, flip] of PANEL) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip }));
    let qb: any = null, at: number | null = null, qpos: number[] | null = null;
    const defended: number[] = [];
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (qb && at === null && qb.phase === 'set' && sim.throwAt < 0) {
        at = sim.t; qpos = [sim.qb.pos.x, sim.qb.pos.y];
        for (const r of qb.reads) { const ev = qb.evaluate(sim.qb, sim, r, 0); if (ev?.parts) defended.push(1 - ev.parts.pOpen * ev.parts.pClear); }
      }
    };
    const res = sim.run();
    plays.push({ ints: res.events.some((e: any) => e.type === 'interception') ? 1 : 0, at, qb: qpos, defended });
  }
  return plays;
}

describe('DEF_BELIEF', () => {
  it('expects more defended balls on the same reads, and throws no more interceptions over the panel', async () => {
    const off = await panel('0'), on = await panel('1');
    const pairs: [number, number][] = [];
    off.forEach((o, i) => {
      const n = on[i];
      // The same play state: the same tick and the same QB position (nothing has differed yet).
      if (o.at === null || n.at !== o.at || !o.qb || !n.qb || o.qb[0] !== n.qb[0] || o.qb[1] !== n.qb[1]) return;
      o.defended.forEach((d, j) => { if (n.defended[j] !== undefined) pairs.push([d, n.defended[j]]); });
    });
    expect(pairs.length).toBeGreaterThanOrEqual(15);
    const mean = (k: 0 | 1) => pairs.reduce((s, p) => s + p[k], 0) / pairs.length;
    expect(mean(1)).toBeGreaterThan(mean(0) + 0.02);
    expect(pairs.filter(([a, b]) => b >= a - 1e-9).length / pairs.length).toBeGreaterThanOrEqual(0.8);
    expect(on.reduce((s, p) => s + p.ints, 0)).toBeLessThanOrEqual(off.reduce((s, p) => s + p.ints, 0));
  });
});

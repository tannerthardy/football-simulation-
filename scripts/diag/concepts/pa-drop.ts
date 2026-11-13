/**
 * The QB's drop in the sim, as nfl_pa_drop.py measures it: forced concepts (the three play-action concepts and
 * drop-back equivalents), gun_doubles_11 and ace_11 (under center), Cover 1-4, seeds 1-3, both flips. Depth behind
 * the snap spot at 0.5/1.0/1.5/2.0 s, the deepest before the pass and when, and the time to the pass. Passive.
 *   node --import tsx scripts/diag/concepts/pa-drop.ts
 */
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const concepts = ['pa_post_dig', 'pa_flood', 'pa_shot', 'dagger', 'flood', 'four_verts'];
const rows: Record<string, any[]> = {};
for (const concept of concepts) for (const formation of ['gun_doubles_11', 'ace_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of [1, 2, 3]) for (const flip of [false, true]) {
  let sim: any;
  try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
  const sx = sim.los, dep: Record<string, number> = {};
  let deepest = 0, deepT = 0, rel: number | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    const d = sx - sim.qb.pos.x;
    if (rel === null) { if (d > deepest) { deepest = d; deepT = sim.t; } }
    for (const T of [0.5, 1.0, 1.5, 2.0]) if (dep[T] === undefined && sim.t >= T - 1e-9) dep[T] = d;
    if (!air && sim.ball.kind === 'air' && rel === null) rel = sim.t;
  };
  const res = sim.run(), st = sim.stats;
  const out = { sack: !!st.sacked, att: !!st.attempted, cmp: !!st.completed, int: (res.events ?? []).some((e: any) => e.type === 'interception'), yards: res.yards };
  if (rel === null && !out.sack) continue;
  const key = `${formation.startsWith('gun') ? 'gun' : 'under'} ${concept.startsWith('pa_') ? 'PA' : 'no PA'}`;
  (rows[key] ??= []).push({ dep, deepest, deepT, rel: rel ?? NaN, ...out });
}
const med = (xs: number[]) => { const s = xs.filter((x) => x !== undefined).sort((a, b) => a - b); return s.length ? +s[Math.floor(s.length / 2)].toFixed(2) : null; };
for (const [k, R] of Object.entries(rows).sort()) console.log(`${k}: n ${R.length}; depth at 0.5/1.0/1.5/2.0 s ${[0.5, 1, 1.5, 2].map((T) => med(R.map((r) => r.dep[T]))).join('/')} yd; deepest ${med(R.map((r) => r.deepest))} yd at ${med(R.map((r) => r.deepT))} s; pass at ${med(R.filter((r) => !isNaN(r.rel)).map((r) => r.rel))} s; sacks ${R.filter((r) => r.sack).length}; cmp ${(R.filter((r) => r.cmp).length / Math.max(1, R.filter((r) => r.att).length)).toFixed(2)}; INT ${R.filter((r) => r.int).length}; yd/play ${(R.reduce((t, r) => t + r.yards, 0) / R.length).toFixed(2)}`);

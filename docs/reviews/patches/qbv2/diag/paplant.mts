// qb-pa-plant's panel with QB_TRACK_LOOK on, over seeds: read-1 throws with QB_FOOTWORK 3 (bits 1+2) vs 19 (+bit 16), and
// the key-at-plant check. Run once per FW value (env), the module flags read at import.
import { readFileSync } from 'node:fs';
const stack = JSON.parse(readFileSync(new URL('../wt950/config/reference-stack.json', import.meta.url), 'utf8'));
for (const [k, v] of Object.entries(stack.flags as Record<string, string>)) if (v === 'on') process.env[k] = '1';
for (const [k, v] of Object.entries(stack.numeric ?? {}) as [string, { default: number }][]) process.env[k] = String(v.default);
process.env.CONCEPT_DROPS = '1'; process.env.QB_FOOTWORK = process.env.FW!; process.env.QB_TRACK_LOOK = process.env.TL ?? '1';
const { PlaySim } = await import('../wt950/src/sim/playsim.js');
const { nativeTraceSetup } = await import('../wt950/scripts/diag/command-trace.js');
const bySeed: Record<number, number> = {}; let keyedOk = 0, keyed = 0;
for (const seed of [1, 2, 3]) for (const concept of ['pa_post_dig', 'pa_shot', 'pa_flood']) for (const coverage of ['cover1', 'cover3', 'cover4']) for (const roster of [3, 7]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster, formation: 'gun_doubles_11', flip: false }));
  let qb: any = null, first: any = null, read1 = false;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, t: any, ...r: any[]) => { if (p === sim.qb && qb && !read1 && first === null) { first = t; read1 = qb.readIdx === 0; } return tb(p, t, ...r); };
  for (let i = 0; i < 600 && sim.phase === 'live' && sim.carrier === sim.qb; i++) { sim.tick(); if (sim.qb.behavior?.kind === 'qb-pass') qb = sim.qb.behavior; }
  if (read1) bySeed[seed] = (bySeed[seed] ?? 0) + 1;
  const k = qb?.keyRead?.at ?? null, pl = qb?.plan?.key ? qb.plan.key.cueBy : null; if (k !== null && pl !== null) { keyed++; if (k >= pl - 1e-9) keyedOk++; }
}
console.log(`FW ${process.env.FW} TL ${process.env.QB_TRACK_LOOK} read-1 throws by seed ${JSON.stringify(bySeed)} keyed ${keyedOk}/${keyed}`);

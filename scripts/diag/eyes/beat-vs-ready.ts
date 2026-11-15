// [CONCEPT_DROPS=1] node --import tsx scripts/diag/eyes/beat-vs-ready.ts > rows.jsonl
// For Rules' drop marking (Integration, 2026-11-15): each read's installed beat (plan.rhythm: the step it is thrown
// on, s after the snap) against the time its route is first a throw as installed (the compiler's window.ready), for
// every concept and formation of the paired staged set (drop-staged.ts). beat_vs_ready.py flags the misfits.
import { installedPlan } from '../../../src/playbook/read-compiler/runtime.js';
import { PASS_BY_ID } from '../../../src/playbook/concepts.js';
const CONCEPTS = 'smash mesh flood drive sail_corner corner_flat trips_sail trips_outs double_outs comebacks dagger y_cross four_verts verts_hitch stick curl_flat'.split(' ');
for (const concept of CONCEPTS) for (const formation of ['gun_doubles_11', 'gun_trips_11']) {
  let p: any = null; try { p = installedPlan(PASS_BY_ID[concept], formation); } catch { /* not installable */ }
  if (!p) { console.log(JSON.stringify({ concept, formation, installed: false })); continue; }
  console.log(JSON.stringify({ concept, formation, installed: true, drop: PASS_BY_ID[concept].drop, style: p.style, set: p.rhythmSet ?? null,
    reads: p.rhythm.map((r: any, i: number) => ({ place: r.ref === p.outlet ? 'outlet' : i + 1, ref: r.ref, step: r.step, beat: r.at, ready: r.ready })) }));
}

/** Native dropback and play-action snaps (gun_doubles_11, cover3/2/1, seeds 1-8, both mirrors, downs 1/2/3 with 10 to
 * go): box LBs' downhill displacement by 0.4 / 0.9 s (the NFL clock's 0.5 / 1.0 s), share moving downhill >= 0.5 yd/s
 * by 1.0 s, and share that ever committed run. usage: (none) */
import { nativeTraceSetup } from './command-trace.js';
import { PlaySim } from '../../src/sim/playsim.js';
for (const concept of ['dagger', 'four_verts', 'mesh', 'curl_flat', 'pa_post_dig', 'pa_flood']) {
  const d5: number[] = [], d10: number[] = []; let moved = 0, ran = 0, n = 0;
  for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= 8; seed++) for (const flip of [false, true]) for (const down of [1, 2, 3]) {
    const setup: any = nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip });
    setup.down = down; setup.firstDownX = setup.los + 10; const sim: any = new PlaySim(setup); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
    const LB = sim.defense.filter((d: any) => { const x = (d.pos.x - los) * d2; return /LB/.test(d.slot) && x >= 1.6 && x <= 7 && d.behavior?.kind !== 'blitz'; });
    const tr = new Map<any, number[]>(LB.map((l: any) => [l, [(l.pos.x - los) * d2]])), runs = new Set<any>(); let k = 1; const t0 = sim.tick.bind(sim);
    sim.tick = () => { t0(); for (const l of LB) if (l.recog?.read === 'run') runs.add(l); if (k <= 12 && sim.t >= 0.1 * k - 1e-6) { for (const [l, v] of tr) v.push((l.pos.x - los) * d2); k++; } };
    sim.run();
    for (const [l, v] of tr) { if (v.length < 12) continue; n++; d5.push(v[0] - v[4]); d10.push(v[0] - v[9]); if (runs.has(l)) ran++;
      for (let f = 2; f <= 10; f++) if (-(v[f + 1] - v[f - 1]) / .2 >= .5) { moved++; break; } }
  }
  const md = (x: number[]) => [...x].sort((a, b) => a - b)[x.length >> 1].toFixed(2);
  console.log(`${concept}: LBs ${n} | downhill by 0.5/1.0 s ${md(d5)}/${md(d10)} | moving downhill by 1.0 s ${Math.round(100 * moved / n)}% | committed run ${Math.round(100 * ran / n)}%`);
}

/** DRAW_READ lab (Defense): native snaps, the same setup with the flag off and on (run in two processes, joined by id).
 * Per play: yards, box LBs' read at the throw/handoff and whether any LB flipped pass->run before the ball.
 * usage: draw-read-lab.mts <out.jsonl> [seeds] */
import { writeFileSync } from 'node:fs';
import { nativeTraceSetup } from './command-trace.js';
import { PlaySim } from '../../src/sim/playsim.js';
(PlaySim as any).recordedSingleStream = true;
const OUT = process.argv[2], SEEDS = Number(process.argv[3] ?? 6);
const CONCEPTS = (process.env.LAB_CONCEPTS ?? 'draw,slant_flat,stick,quick_outs,smash,curl_flat,mesh,four_verts,flood,dagger,y_cross,pa_post_dig,pa_flood,iz_strong,power').split(',');
const rows: string[] = [];
for (const concept of CONCEPTS) for (const formation of ['gun_doubles_11', 'gun_trips_11', 'ace_11']) for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation, flip })); } catch { continue; }
  const lbs = sim.defense.filter((d: any) => d.slot.startsWith('LB'));
  let ballAt = -1, flip2run = 0; const prev = new Map<any, string>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (ballAt >= 0) return;
    if (sim.ball.kind === 'air' || (sim.carrier && sim.carrier !== sim.qb)) { ballAt = sim.t; return; }
    for (const l of lbs) { const r = l.recog?.read; if (prev.get(l) === 'pass' && r === 'run') flip2run++; prev.set(l, r); } };
  let r: any; try { r = sim.run(); } catch { continue; }
  rows.push(JSON.stringify({ id: `${concept}|${formation}|${coverage}|${seed}|${flip}`, concept, y: r.yards, flip2run, comp: r.stats?.completed ?? null, sack: !!r.stats?.sacked }));
}
writeFileSync(OUT, rows.join('\n'));

/** SIGHT_RECOG lab: native snaps, the same setup with the flag off and on (two processes, joined by id), after
 * draw-read-lab.mts. Per play: yards; per box LB his read at the ball (throw or handoff), the first time his read is
 * committed (run or pass) and whether that first commitment was right for the call (run concepts: run; passes
 * including PA and draw-as-run: as the call). usage: recog-time.mts <out.jsonl> [seeds] */
import { writeFileSync } from 'node:fs';
import { nativeTraceSetup } from '../command-trace.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const OUT = process.argv[2], SEEDS = Number(process.argv[3] ?? 6);
const CONCEPTS = (process.env.LAB_CONCEPTS ?? 'draw,slant_flat,stick,smash,mesh,four_verts,dagger,y_cross,pa_post_dig,pa_flood,iz_strong,power').split(',');
const rows: string[] = [];
for (const concept of CONCEPTS) for (const formation of ['gun_doubles_11', 'ace_11']) for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation, flip })); } catch { continue; }
  const lbs = sim.defense.filter((d: any) => d.slot.startsWith('LB'));
  const isRun = sim.offCall.kind === 'run' || concept === 'draw';
  let ballAt = -1; const first = new Map<any, { t: number; r: string }>(), atBall = new Map<any, string>(); const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (ballAt >= 0) return;
    if (sim.ball.kind === 'air' || (sim.carrier && sim.carrier !== sim.qb)) { ballAt = sim.t; for (const l of lbs) atBall.set(l, l.recog?.read ?? 'none'); return; }
    for (const l of lbs) { const r = l.recog?.read; if ((r === 'run' || r === 'pass') && !first.has(l)) first.set(l, { t: sim.t, r }); } };
  let res: any; try { res = sim.run(); } catch { continue; }
  const lb = lbs.map((l: any) => ({ slot: l.slot, first: first.get(l)?.t ?? null, firstRead: first.get(l)?.r ?? null,
    right: first.has(l) ? (first.get(l)!.r === 'run') === isRun : null, atBall: atBall.get(l) ?? null }));
  rows.push(JSON.stringify({ id: `${concept}|${formation}|${coverage}|${seed}|${flip}`, concept, isRun, y: res.yards, ballAt, lb }));
}
writeFileSync(OUT, rows.join('\n') + '\n');
console.log(`${rows.length} plays -> ${OUT}`);

/** Native snaps of zone runs, zone play action and dropbacks, dumped in the NFL
 * run-film archive format for scripts/diag/align/readsplit.py, plus each box
 * LB's first recog.read time (sim only: `reads`, {defIndex: {run, pass}}).
 * usage: node --import tsx scripts/diag/_readfilm.mts OUT.jsonl [seeds=8] */
import { writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { nativeTraceSetup } from './command-trace.js';
const [out, seedsArg] = process.argv.slice(2); const SEEDS = Number(seedsArg ?? 8);
const groups: Array<[string[], string, string]> = [
  [['oz_strong', 'oz_weak'], 'run', 'OUTSIDE ZONE'], [['iz_strong', 'iz_weak'], 'run', 'INSIDE ZONE'],
  [['pa_post_dig', 'pa_flood', 'pa_shot'], 'pass', 'OUTSIDE ZONE'],
  [['smash', 'curl_flat', 'flood', 'dagger', 'drive', 'four_verts'], 'pass', 'NA']];
const forms = ['ace_11', 'gun_doubles_11', 'i_pro_21', 'gun_trips_11'], covs = ['cover3', 'cover2', 'cover1'];
const dgroup = (s: string) => /^(DE|DT|NT)/.test(s) ? 'DL' : /^LB/.test(s) ? 'LB' : 'DB';
const ogroup = (a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'OL' : a.slot === 'QB' ? 'QB' : a.player?.position === 'TE' ? 'TE' : a.player?.position === 'WR' ? 'WR' : 'RB';
const rows: string[] = [];
for (const [concepts, kind, concept] of groups) for (const c of concepts) for (const form of forms) for (let seed = 1; seed <= SEEDS; seed++) for (const flip of [false, true]) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: covs[seed % covs.length], concept: c, seed, roster: 7, formation: form, flip })); } catch { continue; }
  const all = [...sim.offense, ...sim.defense], dir = sim.attackDir(sim.offense[0].team), los = sim.los, t0 = sim.t;
  const players = all.map((a: any) => sim.offense.includes(a) ? { side: 'O', group: ogroup(a) } : { side: 'D', group: dgroup(a.slot) });
  const xy: number[][] = [], reads: Record<number, { run?: number; pass?: number }> = {}; let k = 0;
  try { while (sim.phase === 'live' && sim.t - t0 < 1.35) { const t = sim.t - t0;
    if (t >= k * .1 - 1e-9) { xy.push(all.flatMap((a: any) => [+((a.pos.x - los) * dir).toFixed(3), +a.pos.y.toFixed(3)])); k++; }
    sim.defense.forEach((d: any, i: number) => { const r = d.recog?.read as "run" | "pass" | undefined; if (r === "run" || r === "pass") { reads[i] ??= {}; reads[i][r] ??= +t.toFixed(2); } });
    sim.tick(); } } catch { continue; }
  if (xy.length < 14) continue;
  rows.push(JSON.stringify({ id: `${c}-${form}-${seed}-${flip}`, kind, players, dt: .1, xy, ball_y: sim.ballY, events: {}, carrier: null, cell: { concept }, reads, nOff: sim.offense.length }));
}
writeFileSync(out, rows.join('\n') + '\n'); console.log(out, rows.length);

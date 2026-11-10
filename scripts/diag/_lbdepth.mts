/** Box backers on matched zone runs: depth from the LOS and lateral travel at
 * 0 / 0.5 / 1.0 / 1.5 / 2.0 s, before first carrier contact (Run Game's lbdepth
 * definition: LB or DB 1.6-7 yd deep within 6 yd of the OL centre at the snap).
 * usage: npm run -s ref -- node --import tsx scripts/diag/_lbdepth.mts OUT.jsonl [seed...] */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const CON: Record<string, string> = { outsideZone: 'OZ', wideZone: 'OZ', insideZone: 'IZ' };
const [out, ...sa] = process.argv.slice(2); const seeds = sa.length ? sa.map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
const rows: string[] = [];
for (const seed of seeds) { let i = 0; for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const con = CON[st.offCall?.run?.scheme]; if (!con) continue;
  const sim: any = new PlaySim(st); const dir = sim.attackDir(sim.offense[0].team), los = sim.los;
  const ol = sim.offense.filter((a: any) => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot)); const cy = ol.reduce((s: number, a: any) => s + a.pos.y, 0) / 5;
  const box = sim.defense.filter((d: any) => !/^(DE|DT|NT)/.test(d.slot) && (d.pos.x - los) * dir > 1.6 && (d.pos.x - los) * dir <= 7 && Math.abs(d.pos.y - cy) <= 6);
  const y0 = box.map((d: any) => d.pos.y); const samples: Record<string, number[][]> = {}; let contact = false;
  try { while (sim.phase === 'live' && sim.t < 2.05) {
    for (const t of [0, .1, .2, .3, .4, .5, .6, .7, .8, .9, 1, 1.5, 2]) if (Math.abs(sim.t - t) < .026 && !samples[t] && !contact) samples[t] = box.map((d: any, k: number) => [+((d.pos.x - los) * dir).toFixed(2), +Math.abs(d.pos.y - y0[k]).toFixed(2), +Math.hypot(d.vel.x, d.vel.y).toFixed(2), +d.pos.y.toFixed(2), /^LB/.test(d.slot) ? 1 : 0]);
    sim.tick(); const c = sim.carrier;
    if (c && sim.handoffAt >= 0 && sim.defense.some((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 1)) contact = true;
  } } catch { continue; }
  rows.push(JSON.stringify({ id, con, samples }));
} }
writeFileSync(out, rows.join('\n') + '\n'); console.log(out, rows.length);

// SPACING_HOLD review question (Integration): of the gain-to-stuff plays, was the bend he holds the first-feasible one where a better side existed in his picture at the time he chose?
// Replays the run set with SPACING_HOLD=1 and logs every bend ENTRY (the first-feasible ordering [+.2, -.2, +.4, -.4, ...]): the chosen offset, which offsets cleared, and for the chosen and the
// opposite side at the smallest clearing magnitude the free space ahead (the distance from a 4 yd ray along the bent heading to the nearest defender, true positions: a diagnostic of what was there, not
// something the carrier is given). usage: SPACING_HOLD=1 node --import tsx scripts/diag/bend-choice-replay.mts OUT.jsonl [seed...]
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [out, ...seedArgs] = process.argv.slice(2);
const seeds = seedArgs.length ? seedArgs.map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
const rows: string[] = []; let cur: any = null; let bends: any[] = [];
const space = (a: any, vel: { x: number; y: number }, off: number): number => {
  const h = Math.atan2(vel.y, vel.x) + off; let m = 9;
  for (let s = 0.5; s <= 4.01; s += 0.5) { const x = a.pos.x + Math.cos(h) * s, y = a.pos.y + Math.sin(h) * s;
    for (const d of cur.defense) m = Math.min(m, Math.hypot(d.pos.x - x, d.pos.y - y)); }
  return m;
};
(globalThis as any).__bend = (a: any, vel: { x: number; y: number }, off: number, feas: Record<string, boolean>) => {
  if (!cur || a !== cur.carrier) return;
  const sign = Math.sign(off), mags = [0.2, 0.4, 0.6, 0.8];
  const other = mags.find(m => feas[String(-sign * m)]);
  bends.push({ t: +cur.t.toFixed(2), off, feasible: Object.entries(feas).filter(([, v]) => v).map(([k]) => +k),
    spaceChosen: +space(a, vel, off).toFixed(2), otherOff: other === undefined ? null : -sign * other, spaceOther: other === undefined ? null : +space(a, vel, -sign * other).toFixed(2) });
};
for (const seed of seeds) {
  let i = 0;
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    const id = `s${seed}-${i++}`; bends = [];
    try { const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const sim: any = new PlaySim(st); cur = sim; const r = sim.run(); rows.push(JSON.stringify({ id, yards: +r.yards.toFixed(2), bends })); }
    catch (e: any) { rows.push(JSON.stringify({ id, error: String(e?.message ?? e).slice(0, 120) })); }
  }
}
writeFileSync(out, rows.join('\n') + '\n'); console.log(rows.length, 'plays');

/** Matched-restage zone runs replayed under the current environment, dumped in
 * the NFL run-film archive's format (players side/group, xy at 0.1 s from the
 * snap with x upfield from the LOS, events handoff/first_contact, carrier,
 * ball_y, cell.concept), so one Python operator reads both.
 * usage: npm run -s ref -- node --import tsx scripts/diag/_runfilm.mts OUT.jsonl [seed...] */
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const CON: Record<string, string> = { outsideZone: 'OUTSIDE ZONE', wideZone: 'OUTSIDE ZONE', insideZone: 'INSIDE ZONE' };
const [out, ...sa] = process.argv.slice(2); const seeds = sa.length ? sa.map(Number) : [7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29];
const group = (a: any) => a.team === 'D' || /^(DE|DT|NT|LB|CB|NB|FS|SS|DB)/.test(a.slot)
  ? (/^(DE|DT|NT)/.test(a.slot) ? 'DL' : /^LB/.test(a.slot) ? 'LB' : 'DB')
  : (['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot) ? 'OL' : a.slot === 'QB' ? 'QB' : a.player?.position === 'TE' ? 'TE' : a.player?.position === 'WR' ? 'WR' : 'RB');
const rows: string[] = [];
for (const seed of seeds) { let i = 0; for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  const id = `s${seed}-${i++}`; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const con = CON[st.offCall?.run?.scheme]; if (!con) continue;
  const sim: any = new PlaySim(st); const dir = sim.attackDir(sim.offense[0].team), los = sim.los, t0 = sim.t;
  const all = [...sim.offense, ...sim.defense];
  const players = all.map((a: any) => ({ side: sim.offense.includes(a) ? 'O' : 'D', group: sim.offense.includes(a) ? group({ ...a, team: 'O' }) : group({ ...a, team: 'D' }) }));
  const xy: number[][] = []; let k = 0, first: number | null = null;
  try { while (true) { const t = sim.t - t0;
    if (t >= k * .1 - 1e-9) { xy.push(all.flatMap((a: any) => [+((a.pos.x - los) * dir).toFixed(2), +a.pos.y.toFixed(2)])); k++; }
    const c = sim.carrier; if (first === null && c && sim.handoffAt >= 0 && sim.defense.some((d: any) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 1)) first = t;
    if (sim.phase !== 'live' || t > 8) break; sim.tick(); } } catch { continue; }
  const ho = sim.events.find((e: any) => e.type === 'handoff' || e.type === 'pitch'); if (!ho) continue;
  const car = sim.agents[ho.b] ?? sim.carrier; const ci = all.indexOf(car); if (ci < 0) continue;
  rows.push(JSON.stringify({ id, kind: 'run', players, dt: .1, xy, ball_y: st.ballY, events: { handoff: +(ho.t - t0).toFixed(2), first_contact: first }, carrier: ci, cell: { concept: con } }));
} }
writeFileSync(out, rows.join('\n') + '\n'); console.log(out, rows.length);

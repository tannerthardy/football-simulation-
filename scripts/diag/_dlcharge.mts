/** Zone runs: DL within 1.6 yd of the LOS and 4 yd of the OL centre at the snap. Mean requested (final intent) and
 * achieved speed into the backfield per 0.1 s bin to 1.0 s; request split by engaged/free and by tag. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const [dir, ...seeds] = process.argv.slice(2); const B: Record<string, number[]> = {}; const T: Record<string, number> = {};
const add = (k: string, v: number) => { (B[k] ??= []).push(v); };
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los;
  const ol = ['LT', 'LG', 'C', 'RG', 'RT'].map((s: string) => sim.slot(s)); const cy = ol.reduce((a: number, o: any) => a + o.pos.y, 0) / 5;
  const dl = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && Math.abs((d.pos.x - los) * d2) <= 1.6 && Math.abs(d.pos.y - cy) <= 4);
  const t0 = sim.t;
  const tick = sim.tick.bind(sim); sim.tick = () => { tick(); const t = sim.t - t0; if (t > 1.0) return; const bin = Math.min(10, Math.ceil(t * 10 - 1e-9));
    for (const d of dl) { const r = sim.intents[sim.agents.indexOf(d)]?.vel ?? { x: 0, y: 0 };
      const req = -r.x * d2, ach = -d.vel.x * d2, k = d.engagement ? 'eng' : 'free';
      add(`req ${bin}`, req); add(`ach ${bin}`, ach); add(`req ${k} ${bin}`, req); add(`ach ${k} ${bin}`, ach); add(`n ${k} ${bin}`, 1);
      if (bin >= 4 && bin <= 6 && !d.engagement) for (const tg of d.tags) T[tg] = (T[tg] ?? 0) + 1; } };
  sim.run();
}
const m = (k: string) => B[k] ? (B[k].reduce((a, b) => a + b, 0) / B[k].length).toFixed(2) : '  - ';
const row = (lab: string, f: (b: number) => string) => console.log(lab.padEnd(18) + [2, 3, 4, 5, 6, 7, 8, 9, 10].map(b => f(b).padStart(6)).join(''));
row('t', b => (b / 10).toFixed(1)); row('request', b => m(`req ${b}`)); row('achieved', b => m(`ach ${b}`));
row('free share %', b => String(Math.round(100 * (B[`n free ${b}`]?.length ?? 0) / ((B[`n free ${b}`]?.length ?? 0) + (B[`n eng ${b}`]?.length ?? 0)))));
row('free request', b => m(`req free ${b}`)); row('free achieved', b => m(`ach free ${b}`)); row('eng request', b => m(`req eng ${b}`)); row('eng achieved', b => m(`ach eng ${b}`));
console.log('free DL tags 0.4-0.6 s:', Object.entries(T).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, v]) => `${k} ${v}`).join(', '));

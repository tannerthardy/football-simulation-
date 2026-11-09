/** OZ box backers (LB slots 2.5-7 yd deep within 4.5 yd of the OL centre at the snap), 0.5-1.5 s: lateral toward the play
 * (sign of mean OL lateral displacement) requested (final intent) vs achieved, by third (backside/middle/play side, from the
 * snap position relative to the OL centre) and by state (engaged / free) with the top tags. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const OZ = new Set(['outsideZone', 'wideZone']);
const [dir, ...seeds] = process.argv.slice(2); const R: Record<string, number[][]> = {}; const T: Record<string, number> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!OZ.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const d2 = sim.attackDir(sim.offense[0].team), los = sim.los, t0 = sim.t;
  const ol = ['LT', 'LG', 'C', 'RG', 'RT'].map((s: string) => sim.slot(s)); const y0 = ol.map((o: any) => o.pos.y); const cy = y0.reduce((a: number, b: number) => a + b, 0) / 5;
  const lbs = sim.defense.filter((d: any) => /LB/.test(d.slot) && (d.pos.x - los) * d2 >= 2.5 && (d.pos.x - los) * d2 <= 7 && Math.abs(d.pos.y - cy) <= 4.5).map((d: any) => [d, d.pos.y - cy]);
  const tick = sim.tick.bind(sim); sim.tick = () => { tick(); const t = sim.t - t0; if (t < 0.5 || t > 1.5) return;
    const ps = Math.sign(ol.reduce((a: number, o: any, i: number) => a + o.pos.y - y0[i], 0)); if (!ps) return;
    for (const [d, off] of lbs as any) { const r = sim.intents[sim.agents.indexOf(d)]?.vel ?? { x: 0, y: 0 };
      const third = off * ps > 1.5 ? 'play side' : off * ps < -1.5 ? 'backside' : 'middle';
      const state = d.engagement ? 'engaged' : 'free';
      const fr = (sim.intents[sim.agents.indexOf(d)]?.facing ?? d.facing), dirY = Math.atan2(ps, 0); const off2 = (a: number) => Math.abs(Math.atan2(Math.sin(a - dirY), Math.cos(a - dirY))) * 57.3;
      for (const k of [third, `${third} ${state}`]) (R[k] ??= []).push([r.y * ps, d.vel.y * ps, off2(d.facing), off2(fr), d.profile.vmax * d.profile.shuffle]);
      if (!d.engagement) for (const tg of d.tags) T[tg] = (T[tg] ?? 0) + 1; } };
  sim.run();
}
for (const [k, v] of Object.entries(R).sort()) { const m = (i: number) => (v.reduce((a, r) => a + r[i], 0) / v.length).toFixed(2); console.log(`${k.padEnd(20)} ticks ${String(v.length).padStart(6)}  request ${m(0)}  achieved ${m(1)}  body facing off the flow ${m(2)} deg (requested ${m(3)})  shuffle cap ${m(4)}`); }
console.log('free LB tags:', Object.entries(T).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k} ${v}`).join(', '));

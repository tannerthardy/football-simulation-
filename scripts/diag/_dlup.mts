/** OZ/WZ engaged front DL, 1.0-2.0 s: upfield request vs achieved (yd/s, + = into the backfield), split by reached / raced-not-reached / never raced and by which engaged branch tagged him. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const S: Record<string, { q: number[]; a: number[] }> = {};
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) <= 1.6 && Math.abs(d.pos.y - sim.ballY) <= 4);
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (sim.t < 1 || sim.t > 2) return;
    for (const d of DL) { if (!d.engagement) continue; const q = sim.intents[d.idx]?.vel; if (!q) continue;
      const k = d.tags.has('reached') ? 'reached' : d.tags.has('zone-run') ? 'raced' : 'never raced';
      for (const key of [k, `${k} | ${['shoot-cutoff', 'work-across', 'squeeze', 'fight-pressure', 'zone-run'].filter(t => d.tags.has(t)).join('+') || 'none'}`]) {
        (S[key] ??= { q: [], a: [] }).q.push(-q.x * d2); S[key].a.push(-d.vel.x * d2); } } };
  sim.run();
}
const md = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1]?.toFixed(2);
for (const k of Object.keys(S).sort()) console.log(`${k}: n ${S[k].q.length} upfield request ${md(S[k].q)} achieved ${md(S[k].a)}`);

/** Engaged DL tagged shoot-cutoff (BACKSIDE_SHOOT): upfield request vs achieved while engaged, the blocker's upfield
 * speed, and the blocker's own request. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: any[] = []; let tagged = 0, all = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const t0 = sim.tick.bind(sim); let k = 0;
  sim.tick = () => { const before = new Set(sim.defense.filter((d: any) => d.tags.has('shoot-cutoff'))); t0(); if (++k % 4) return;
    for (const e of sim.engagements ?? []) { const d = e.defender, b = e.blocker; if (!/^(DE|DT|NT)/.test(d.slot)) continue; all++;
      if (!d.tags.has('shoot-cutoff')) continue; tagged++;
      const di = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }, bi = sim.intents[b.idx]?.vel ?? { x: 0, y: 0 };
      R.push({ reqUp: -di.x * d2, up: -d.vel.x * d2, bUp: -b.vel.x * d2, bReqUp: -bi.x * d2, bLat: Math.abs(b.vel.y), dLat: Math.abs(d.vel.y) }); } };
  sim.run();
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`engaged DL samples ${all}, tagged shoot-cutoff ${tagged} | DL upfield req ${q(R.map(r => r.reqUp))} got ${q(R.map(r => r.up))} | blocker upfield req ${q(R.map(r => r.bReqUp))} got ${q(R.map(r => r.bUp))} (negative = blocker driven back toward his own backfield) | lateral DL ${q(R.map(r => r.dLat))} blocker ${q(R.map(r => r.bLat))}`);

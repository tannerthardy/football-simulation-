/** OZ/WZ: OL whose first lateral move (|vy| > 0.5, 10 Hz central difference) goes away from the play side: slot by
 * play-side order, his run-block plan kind, his first step command, and what the DL nearest him did. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const C = new Map<string, number>(); let tot = 0, away = 0; const per = new Map<number, number>(); let plays = 0;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/outside zone|wide zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); const Y = new Map<any, number[]>(OL.map((a: any) => [a, [a.pos.y]]));
  const cmd = new Map<any, number>(); let ho = -1, hy = 0, side = 0, k = 1; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); const c = sim.carrier; if (ho < 0 && c && c !== sim.qb) { ho = sim.t; hy = c.pos.y; } if (!side && ho >= 0 && sim.t >= ho + 1 && c) side = Math.sign(c.pos.y - hy) || 1;
    for (const o of OL) if (!cmd.has(o) && Math.abs(sim.intents[o.idx]?.vel.y ?? 0) > .5) cmd.set(o, Math.sign(sim.intents[o.idx].vel.y));
    if (k <= 10 && sim.t >= 0.1 * k - 1e-6) { for (const [a, L] of Y) L.push(a.pos.y); k++; } };
  sim.run(); if (!side) continue;
  plays++; let pa = 0;
  const order = [...OL].sort((a: any, b: any) => (Y.get(a)![0] - Y.get(b)![0]) * side);
  for (const o of OL) { const L = Y.get(o)!; let s = 0; for (let f = 1; f <= 8; f++) { const v = (L[f + 1] - L[f - 1]) / .2; if (Math.abs(v) > .5) { s = Math.sign(v) * side; break; } }
    tot++; if (s !== -1) continue; away++; pa++;
    const plan = (o.behavior as any)?.plan; const role = ['BS-T', 'BS-G', 'C', 'PS-G', 'PS-T'][order.indexOf(o)];
    const key = `${role} plan=${plan?.kind ?? o.behavior?.kind} cmd=${(cmd.get(o) ?? 0) * side}`; C.set(key, (C.get(key) ?? 0) + 1); }
  per.set(pa, (per.get(pa) ?? 0) + 1);
}
console.log(`plays ${plays} by OL-away count: ${[...per].sort((a, b) => a[0] - b[0]).map(([k, v]) => `${k}:${v}`).join(' ')}`); console.log(`OZ OL n ${tot}, first move away ${away} (${(100 * away / tot).toFixed(1)}%)`); for (const [k, v] of [...C].sort((a, b) => b[1] - a[1])) console.log(`  ${v}  ${k}`);

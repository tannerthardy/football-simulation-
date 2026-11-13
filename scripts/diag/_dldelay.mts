/** OZ/IZ DL at 0.3 s: components of his delay on the key (base sight delay, peripheral add, decision interval). usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: any[] = [];
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass || !/zone/i.test(p.call)) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team);
  const DL = sim.defense.filter((d: any) => Math.abs((d.pos.x - sim.los) * d2) < 1.6 && Math.abs(d.pos.y - sim.ballY) < 4);
  const OL = ['LT', 'LG', 'C', 'RG', 'RT'].map(s => sim.slot(s)); let done = false; const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); if (done || sim.t < 0.3) return; done = true;
    for (const d of DL) { const o = OL.reduce((b: any, x: any) => Math.abs(x.pos.y - d.pos.y) < Math.abs(b.pos.y - d.pos.y) ? x : b);
      R.push({ rt: d.profile.reactionTime, base: d.mind.observationDelay(d.profile.reactionTime * 0.5), per: d.eyes && !d.eyes.keys.includes(o) ? d.eyes.peripheral : 0, di: d.mind.decisionInterval }); } };
  sim.run();
}
const m = (k: string) => (R.reduce((s, r) => s + r[k], 0) / R.length).toFixed(3);
console.log(`n ${R.length} reactionTime ${m('rt')} sight delay ${m('base')} peripheral ${m('per')} (${(100 * R.filter(r => r.per > 0).length / R.length).toFixed(0)}% peripheral) decisionInterval ${m('di')}`);

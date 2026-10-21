// usage: drag.ts TRACE_LABEL [N] (replays the first N lab cases of a trace)
// Yards gained after first contact, split by how many holders the carrier had
// at each tick (0 = loose, 1 = one holder, 2+), and bond duration.
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { makeSim, rosters } from '../zone-lab/lab.js';
const [label, N = '300'] = process.argv.slice(2);
const rows = gunzipSync(readFileSync(`out/open-field/all/${label}.jsonl.gz`)).toString().split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(r => !r.error);
const R = rosters();
const yd = [0, 0, 0], tm = [0, 0, 0]; let plays = 0, contactPlays = 0; const after: number[] = [], whistle: number[] = [], drag1: number[] = [];
for (const r of rows.slice(0, Number(N))) {
  const [concept, dir, formation, look, roster, seed] = r.id.split('/');
  const sim = makeSim({ concept, dir, look, roster, seed: Number(seed), formation } as any, R);
  const ad = sim.attackDir('O'); let contact = -1, x0 = 0, one = 0; plays++;
  while (sim.phase === 'live' && sim.t < 20) {
    const c0 = sim.carrier, px = c0 ? c0.pos.x : 0;
    sim.tick();
    const c = sim.carrier; if (!c || c !== c0) continue;
    if (contact < 0 && sim.events.some(e => e.type === 'carrier_contact')) { contact = sim.t; x0 = c.pos.x; }
    if (contact < 0) continue;
    const n = Math.min(2, sim.bond?.tacklers.filter(d => d.body.support?.state === 'up').length ?? 0);
    const dx = (c.pos.x - px) * ad; yd[n] += dx; tm[n] += sim.dt; if (n === 1) one += dx;
  }
  if (contact >= 0) { contactPlays++; after.push((sim.buildResult().offenseYards) - (x0 - sim.los) * ad); whistle.push(sim.t - contact); drag1.push(one); }
}
const q = (v: number[], f = .5) => [...v].sort((a, b) => a - b)[Math.floor(f * (v.length - 1))].toFixed(2);
console.log(`${label} plays ${plays} contact ${contactPlays} | after contact yd by holders (0/1/2+): ${yd.map(v => (v / contactPlays).toFixed(2)).join(' / ')} per play, time ${tm.map(v => (v / contactPlays).toFixed(2)).join(' / ')} s | one-holder yd p50/p90 ${q(drag1)} ${q(drag1, .9)} | YAC p50 ${q(after)} whistle p50 ${q(whistle)}`);

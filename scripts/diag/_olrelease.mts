/** Offensive linemen leaving a block (engagement ends, ball not yet past him by 3 yd): over the next 0.5 s, request
 * steadiness and speed gained, split by what he asks for (climb vs other). Compare: requested speed vs achieved.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const rows: any[] = [];
const ang = (v: any) => Math.atan2(v.y, v.x);
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const was = new Map<any, boolean>(); const live = new Map<any, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0();
    for (const o of sim.offense) {
      if (!['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)) continue;
      const eng = !!o.engagement;
      if (was.get(o) && !eng && !live.has(o) && sim.t < 4 && !o.isDown(sim.t))
        live.set(o, { slot: o.slot, call: p.call, seed, t: sim.t, v0: Math.hypot(o.vel.x, o.vel.y), n: 0, flips: 0, zero: 0, req: 0, plan: (o.behavior as any)?.plan?.kind ?? o.behavior?.kind, reeng: false, last: undefined as number | undefined, touch: 0 });
      const w = live.get(o);
      if (w && !w.done) {
        const iv = sim.intents[o.idx]?.vel ?? { x: 0, y: 0 }, m = Math.hypot(iv.x, iv.y);
        w.n++; w.req += m; if (eng) w.reeng = true;
        if (m < 0.3) w.zero++; else { const a = ang(iv); if (w.last !== undefined) { let da = Math.abs(a - w.last) % (2 * Math.PI); if (da > Math.PI) da = 2 * Math.PI - da; if (da > Math.PI / 3) w.flips++; } w.last = a; }
        if (sim.defense.some((d: any) => Math.hypot(d.pos.x - o.pos.x, d.pos.y - o.pos.y) < d.profile.radius + o.profile.radius + 0.15)) w.touch++;
        if (sim.t >= w.t + 0.5 - 1e-9) { w.v5 = Math.hypot(o.vel.x, o.vel.y); w.done = true; rows.push(w); }
      }
      was.set(o, eng);
    }
  };
  sim.run();
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
const show = (label: string, R: any[]) => R.length && console.log(`${label.padEnd(34)} n ${String(R.length).padStart(3)} | req mean p50 ${q(R.map(w => w.req / w.n)).toFixed(1)} | speed ${q(R.map(w => w.v0)).toFixed(1)} -> +0.5s ${q(R.map(w => w.v5)).toFixed(1)} (p25 ${q(R.map(w => w.v5), .25).toFixed(1)}) | 2+ flips ${(100 * R.filter(w => w.flips > 1).length / R.length).toFixed(0)}% | zero tick ${(100 * R.filter(w => w.zero > 0).length / R.length).toFixed(0)}% | touching >half ${(100 * R.filter(w => w.touch > w.n / 2).length / R.length).toFixed(0)}% | re-engaged ${(100 * R.filter(w => w.reeng).length / R.length).toFixed(0)}%`);
show('all OL releases', rows);
for (const plan of [...new Set(rows.map(w => w.plan))]) show(`plan ${plan}`, rows.filter(w => w.plan === plan));
const free = rows.filter(w => !w.reeng && w.flips === 0 && w.zero === 0 && w.touch === 0 && w.req / w.n > 4);
show('steady, untouched, req > 4 yd/s', free);
import('node:fs').then(fs => fs.writeFileSync('out/olrelease.json', JSON.stringify(rows)));

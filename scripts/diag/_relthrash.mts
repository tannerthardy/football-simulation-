/** Request thrash after a block ends: for every defender whose engagement ends while the carrier (not QB) is within
 * 4 yd, over the next 0.5 s: share of ticks whose requested direction turns > 60 deg from the previous tick's request,
 * zero requests, speed gained. Control: unblocked defenders within 4 yd of the carrier, same window from first entry.
 * usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
type W = { bond?: boolean; reach?: boolean; src?: Record<string, number>; pb?: string; pc?: any; pf?: string; kind: string; t: number; last?: number; n: number; flips: number; zero: number; v0: number; v5?: number; beh: string; slot: string; call: string };
const done: W[] = [];
const ang = (v: any) => Math.atan2(v.y, v.x);
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const was = new Map<any, boolean>(); const live = new Map<any, W>(); const seen = new Set<any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const c = sim.carrier; if (!c || c === sim.qb) { for (const d of sim.defense) was.set(d, !!d.engagement); return; }
    for (const d of sim.defense) {
      const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y), eng = !!d.engagement;
      if (!live.has(d) && !seen.has(d) && dist < 4 && !d.isDown(sim.t)) {
        const kind = was.get(d) && !eng ? 'released' : !eng && !was.get(d) && !d.lastEngagedAt ? 'free' : '';
        if (kind) { seen.add(d); live.set(d, { kind, t: sim.t, n: 0, flips: 0, zero: 0, v0: Math.hypot(d.vel.x, d.vel.y), beh: d.behavior?.constructor?.name, slot: d.slot, call: p.call }); }
      }
      const w = live.get(d);
      if (w) {
        const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }, m = Math.hypot(iv.x, iv.y);
        if (sim.bond?.tacklers.includes(d)) w.bond = true;
        if (Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 1.0) w.reach = true;
        w.n++; if (m < 0.3) w.zero++;
        else { const a = ang(iv); if (w.last !== undefined) { let da = Math.abs(a - w.last) % (2 * Math.PI); if (da > Math.PI) da = 2 * Math.PI - da; if (da > Math.PI / 3) { w.flips++;
          const br = (d as any).dbg ?? '?', pc = w.pc, cc = (d as any).dbgChase;
          const dd = (x: number, y: number) => { let z = Math.abs(x - y) % (2 * Math.PI); return z > Math.PI ? 2 * Math.PI - z : z; };
          let why = br !== w.pb ? `branch ${w.pb}->${br}` : br === 'runFit' ? `runFit ${w.pf}->${(d as any).dbgFit}` : br !== 'live' ? `within ${br}` : !pc || !cc || pc.gatherOnly || cc.gatherOnly ? 'chase gather switch'
            : dd(cc.orig, pc.orig) > Math.PI / 3 ? 'chase intercept point' : dd(cc.chosen, pc.chosen) > Math.PI / 3 ? 'chase approach choice' : 'chase around-bodies';
          (w.src ??= {})[why] = (w.src[why] ?? 0) + 1; } } w.last = a; }
        (w as any).pf = (d as any).dbgFit; (d as any).dbgFit = undefined;
        w.pb = (d as any).dbg; w.pc = (d as any).dbgChase; (d as any).dbg = undefined; (d as any).dbgChase = undefined;
        if (sim.t >= w.t + 0.5 - 1e-9) { w.v5 = Math.hypot(d.vel.x, d.vel.y); done.push(w); live.delete(d); }
      }
      was.set(d, eng);
    }
  };
  sim.run();
}
const q = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
for (const kind of ['released', 'free']) for (const g of ['DL', 'LB', 'DB']) {
  const R = done.filter(w => w.kind === kind && (g === 'DL' ? /^(DE|DT|NT)/.test(w.slot) : g === 'LB' ? w.slot.startsWith('LB') : !/^(DE|DT|NT|LB)/.test(w.slot)));
  if (R.length < 5) continue;
  const fr = R.map(w => w.flips / Math.max(1, w.n));
  console.log(`${kind.padEnd(8)} ${g} n ${String(R.length).padStart(3)} | flip share p50 ${q(fr).toFixed(2)} p75 ${q(fr, .75).toFixed(2)} | any flip ${(100 * R.filter(w => w.flips > 0).length / R.length).toFixed(0)}% | 2+ flips ${(100 * R.filter(w => w.flips > 1).length / R.length).toFixed(0)}% | zero req ticks p50 ${q(R.map(w => w.zero)).toFixed(0)} | speed ${q(R.map(w => w.v0)).toFixed(1)} -> +0.5s ${q(R.map(w => w.v5!)).toFixed(1)} | behaviors ${[...new Set(R.map(w => w.beh))].join(',')}`);
}
{ const R = done.filter(w => w.kind === 'released' && /^(DE|DT|NT)/.test(w.slot) && !w.bond && !w.reach);
  const slow = R.filter(w => (w.v5 ?? 9) < 2), steady = slow.filter(w => w.flips === 0 && w.zero === 0);
  console.log(`released DL, never in a tackle bond or within 1 yd of the carrier: n ${R.length}, slow (<2 yd/s at +0.5) ${slow.length}, of which steady request ${steady.length}, flip ${slow.filter(w => w.flips > 0).length}, zero ${slow.filter(w => w.zero > 0).length}`); }
{ const tot: Record<string, number> = {}; for (const w of done) if (w.kind === 'released' && /^(DE|DT|NT)/.test(w.slot)) for (const [k, v] of Object.entries(w.src ?? {})) tot[k] = (tot[k] ?? 0) + v;
  console.log('released DL flip sources:', JSON.stringify(Object.entries(tot).sort((a, b) => b[1] - a[1]))); }
{ const tot: Record<string, number> = {}; for (const w of done) if (w.kind === 'free') for (const [k, v] of Object.entries(w.src ?? {})) tot[k] = (tot[k] ?? 0) + v;
  console.log('free (all) flip sources:', JSON.stringify(Object.entries(tot).sort((a, b) => b[1] - a[1]))); }
import('node:fs').then(fs => fs.writeFileSync('out/relthrash.json', JSON.stringify(done)));

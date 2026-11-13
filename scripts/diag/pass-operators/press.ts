import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const out: Record<string, number[]> = {}; let n = 0, c = 0, jam = 0;
for (const seed of ['7', '11']) for (let k = 0; k < 4; k++) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; const sim = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    const dice = sim.dice.bind(sim), made = new Set<string>();
    (sim as any).dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake) return; const cy = sim.ballY; const pairs: any[] = [];
    for (const side of [1, -1]) { const W = sim.offense.filter(o => (o as any).player.position === 'WR' && (o.pos.y - cy) * side > 0); if (!W.length) continue; const w = W.reduce((a, b) => Math.abs(a.pos.y - cy) > Math.abs(b.pos.y - cy) ? a : b);
      const cbs = sim.defense.filter(d => (d as any).player.position === 'CB'); if (!cbs.length) continue; const cb = cbs.reduce((a, b) => Math.hypot(a.pos.x - w.pos.x, a.pos.y - w.pos.y) < Math.hypot(b.pos.x - w.pos.x, b.pos.y - w.pos.y) ? a : b);
      if (Math.abs(cb.pos.x - w.pos.x) < 2.5 && Math.abs(cb.pos.y - w.pos.y) < 2) (out.off0 ??= []).push(Math.abs(cb.pos.y - w.pos.y)); if (Math.abs(cb.pos.x - w.pos.x) < 2.5 && Math.abs(cb.pos.y - w.pos.y) < 2) pairs.push({ w, cb, cy0: cb.pos.y, cx0: cb.pos.x, cbx: {} as any, gap: {} as any, y0: w.pos.y, run: 0, best: 0, v: {} as any, lat: NaN }); }
    if (!pairs.length) return; const tick = sim.tick.bind(sim);
    (sim as any).tick = () => { tick(); if (sim.t > 1.5 + 1e-9 || Math.abs(sim.t * 10 - Math.round(sim.t * 10)) > 1e-6) return;
      for (const pr of pairs) { if (Math.hypot(pr.cb.pos.x - pr.w.pos.x, pr.cb.pos.y - pr.w.pos.y) < 1.2) { pr.run++; pr.best = Math.max(pr.best, pr.run); } else pr.run = 0;
        for (const t of [0.5, 1.0]) if (Math.abs(sim.t - t) < 1e-6) pr.v[t] = Math.hypot(pr.w.vel.x, pr.w.vel.y); for (const t of [0.3, 0.6, 1.0]) if (Math.abs(sim.t - t) < 1e-6) { pr.cbx[t] = Math.abs(pr.cb.pos.x - pr.cx0); pr.gap[t] = Math.abs(pr.cb.pos.x - pr.w.pos.x); } if (Math.abs(sim.t - 0.6) < 1e-6) { (out.cblat ??= []).push(Math.abs(pr.cb.pos.y - pr.cy0)); (out.wlat6 ??= []).push(Math.abs(pr.w.pos.y - pr.y0)); (out.sep6 ??= []).push(Math.abs(pr.w.pos.y - pr.cb.pos.y)); } if (Math.abs(sim.t - 1.0) < 1e-6) pr.lat = Math.abs(pr.w.pos.y - pr.y0); } };
    const r: any = sim.run();
    for (const pr of pairs) { n++; if (pr.best >= 2) { c++; (out.dur ??= []).push(pr.best / 10); } for (const t of [0.5, 1.0]) if (pr.v[t] !== undefined) (out['v' + t] ??= []).push(pr.v[t]); if (!Number.isNaN(pr.lat)) (out.lat ??= []).push(pr.lat); for (const t of [0.3, 0.6, 1.0]) { if (pr.cbx[t] !== undefined) (out['cbx' + t] ??= []).push(pr.cbx[t]); if (pr.gap[t] !== undefined) (out['gap' + t] ??= []).push(pr.gap[t]); }
      if (r.events.some((e: any) => e.type === 'jam' && e.a === pr.cb.idx)) jam++; } }); }
const q = (v: number[] = [], x: number) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(x * (v.length - 1))].toFixed(2) : '-';
console.log(`sim pressed outside WR n ${n} | contact ${(c / n * 100).toFixed(0)}% longest p50 ${q(out.dur, .5)} s (p75 ${q(out.dur, .75)}) | jam events ${(jam / n * 100).toFixed(0)}% | WR speed at 0.5/1.0 s p50 ${q(out['v0.5'], .5)}/${q(out['v1'], .5)} | lateral at 1.0 s p50 ${q(out.lat, .5)}`);
console.log(`sim pressed CB ground given at 0.3/0.6/1.0 s p50 ${q(out['cbx0.3'], .5)}/${q(out['cbx0.6'], .5)}/${q(out['cbx1'], .5)} | depth gap CB-WR p50 ${q(out['gap0.3'], .5)}/${q(out['gap0.6'], .5)}/${q(out['gap1'], .5)}`);
console.log(`sim pressed CB lateral offset at snap p25/50/75 ${q(out.off0, .25)}/${q(out.off0, .5)}/${q(out.off0, .75)}`);
console.log(`sim at 0.6 s: CB lateral move p50 ${q(out.cblat, .5)} | WR lateral move p50 ${q(out.wlat6, .5)} | WR-CB lateral separation p50 ${q(out.sep6, .5)}`);

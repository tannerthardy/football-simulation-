// Same operator as nfl_squeeze.py on the 732 panel: plays with no man assignment ("zone"), every throw; each non-rushing
// defender (CB/S/LB) and the nearest eligible receiver within 7 yd at the release; his speed toward that receiver and
// the distance at release -0.8 .. 0 s; target vs not.
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const A: Record<string, any[]> = { target: [], 'not target': [] };
const DEF = /^(CB|SS|FS|S|ILB|OLB|MLB|LB|DB|NB)/;
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.defense.some((d: any) => (sim.defAlign.spots as any)[d.slot]?.manTarget)) continue;
    const ring: any[] = []; let t0 = -1, T: any = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; tick();
      ring.push({ t: sim.t, s: sim.agents.map((x: any) => ({ x: x.pos.x, y: x.pos.y, vx: x.vel.x, vy: x.vel.y, kind: x.behavior?.kind })) });
      if (t0 < 0 && !air && sim.ball.kind === 'air') { t0 = sim.t; T = sim.ball.target; } };
    sim.run(); if (t0 < 0 || !T) continue;
    const at = (t: number) => ring.reduce((b: any, x: any) => Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, ring[0]);
    const s0 = at(t0);
    const defs = sim.defense.filter((d: any) => DEF.test(d.player.position) && s0.s[d.idx].kind !== 'rush' && s0.s[d.idx].kind !== 'blitz');
    const recs = sim.offense.filter((o: any) => ['WR', 'TE', 'RB', 'FB'].includes(o.player.position));
    for (const d of defs) { const D0 = s0.s[d.idx];
      const near = recs.reduce((b: any, o: any) => !b || Math.hypot(s0.s[o.idx].x - D0.x, s0.s[o.idx].y - D0.y) < Math.hypot(s0.s[b.idx].x - D0.x, s0.s[b.idx].y - D0.y) ? o : b, null);
      if (!near || Math.hypot(s0.s[near.idx].x - D0.x, s0.s[near.idx].y - D0.y) > 7) continue;
      const row: any = {};
      for (const kk of [-8, -6, -4, -2, 0]) { const t = t0 + kk / 10; if (t < 0) continue; const sn = at(t); if (Math.abs(sn.t - t) > 0.03) continue;
        const q = sn.s[d.idx], r = sn.s[near.idx], L = Math.hypot(r.x - q.x, r.y - q.y) || 1;
        row[kk] = [(q.vx * (r.x - q.x) + q.vy * (r.y - q.y)) / L, L, Math.hypot(q.vx, q.vy)]; }
      A[near === T ? 'target' : 'not target'].push(row); } } }); }
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
for (const g of ['target', 'not target']) { const L = A[g];
  console.log(`sim zone ${g.padEnd(10)} n ${String(L.length).padStart(5)} | toward / distance / speed: ` + [-8, -6, -4, -2, 0].map(kk => { const v = L.filter(r => r[kk]).map(r => r[kk]);
    return `${(kk / 10).toFixed(1)}s ${q(v.map((x: any) => x[0]), .5).toFixed(2)}/${q(v.map((x: any) => x[1]), .5).toFixed(2)}/${q(v.map((x: any) => x[2]), .5).toFixed(2)}`; }).join(' | ')); }

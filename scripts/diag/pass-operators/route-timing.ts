// Same operator as nfl_timing.py on the 732 panel: targeted RouteRunner, break vs release (searched through ball arrival).
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const L: Record<string, number[][]> = {}, NB: Record<string, number> = {};
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake) continue;
    const F: any[] = []; let th = -1, ar = -1, T: any = null, RT = 'none'; const last = new Map<any, string>(); const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; for (const o of sim.offense) if (o.behavior instanceof RouteRunner) last.set(o, (o.behavior as any).route?.id ?? 'none'); tick(); const t10 = Math.round(sim.t * 10);
      if (th < 0 && !air && sim.ball.kind === 'air') { th = t10; T = sim.ball.target; RT = last.get(T) ?? (T?.behavior?.kind ?? 'none'); }
      if (th >= 0 && ar < 0 && air && sim.ball.kind !== 'air') ar = t10;
      if (Math.abs(sim.t * 10 - t10) < 1e-6) F[t10] = sim.offense.map((o: any) => ({ x: o.pos.x, y: o.pos.y })); };
    sim.run(); if (th < 0 || !T) continue;
    const rt = RT; const i = sim.offense.indexOf(T), los = sim.los;
    const g = (f: number) => F[f]?.[i]; const v = (a: number, b: number) => { const A = g(a), B = g(b); return !A || !B ? null : { x: (B.x - A.x) / ((b - a) / 10), y: (B.y - A.y) / ((b - a) / 10) }; };
    let b = -1; const end = ar >= 0 ? ar : th + 15;
    for (let f = 6; f < end; f++) { if (!g(f) || g(f).x - los < 1) continue; const st = v(f - 5, f - 2), nx = v(f, f + 2); if (!st || !nx) continue; const ss = Math.hypot(st.x, st.y); if (ss < 2) continue;
      const turn = Math.abs(Math.atan2(st.x * nx.y - st.y * nx.x, st.x * nx.x + st.y * nx.y)) * 57.3; if (turn > 30 || Math.hypot(nx.x, nx.y) < 0.65 * ss) { b = f; break; } }
    if (b < 0) { NB[rt] = (NB[rt] ?? 0) + 1; continue; }
    (L[rt] ??= []).push([(th - b) / 10, g(b).x - los, b / 10]); } }); }
const q = (v: number[], p: number) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
console.log('sim route | n with a break / without | break depth p50 | break time p50 | release - break p25/50/75 | share thrown before the break');
for (const rt of Object.keys(L).sort((a, b) => L[b].length - L[a].length)) { const X = L[rt];
  const s = (x: number) => (x >= 0 ? '+' : '') + x.toFixed(2);
  console.log(`${rt.padEnd(10)} | ${X.length} / ${NB[rt] ?? 0} | ${q(X.map(x => x[1]), .5).toFixed(1)} | ${q(X.map(x => x[2]), .5).toFixed(2)} | ${s(q(X.map(x => x[0]), .25))}/${s(q(X.map(x => x[0]), .5))}/${s(q(X.map(x => x[0]), .75))} | ${(X.filter(x => x[0] < 0).length / X.length).toFixed(2)}`); }

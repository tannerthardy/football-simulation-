// Same operator as nfl_routes.py on the 732 panel: every RouteRunner (WR/TE/RB) by route id; depth from sim.los (the ball).
import { readFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const RUN: Record<string, number> = {}, TG: Record<string, number> = {}, BR: Record<string, number[][]> = {}, TH: Record<string, any[][]> = {};
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake) continue;
    const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['WR', 'TE', 'RB', 'FB'].includes(o.player.position));
    const rid = new Map(runners.map((o: any) => [o, (o.behavior as any).route?.id ?? 'none']));
    const F: any[] = []; let th = -1, ar = -1, T: any = null, arrSpeed: number | null = null; const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; tick(); const t10 = Math.round(sim.t * 10);
      if (th < 0 && !air && sim.ball.kind === 'air') { th = t10; T = sim.ball.target; }
      if (th >= 0 && ar < 0 && air && sim.ball.kind !== 'air') { ar = t10; if (T) arrSpeed = Math.hypot(T.vel.x, T.vel.y); }
      if (Math.abs(sim.t * 10 - t10) < 1e-6) F[t10] = runners.map((o: any) => ({ x: o.pos.x, y: o.pos.y })); };
    sim.run(); const los = sim.los;
    runners.forEach((o: any, j: number) => { const rt = rid.get(o) as string; RUN[rt] = (RUN[rt] ?? 0) + 1; const tg = o === T; if (tg) TG[rt] = (TG[rt] ?? 0) + 1;
      const g = (f: number) => F[f]?.[j]; const v = (f: number, a: number, b: number) => { const A = g(f + a), B = g(f + b); return !A || !B ? null : { x: (B.x - A.x) / ((b - a) / 10), y: (B.y - A.y) / ((b - a) / 10) }; };
      let b = -1; const end = th >= 0 ? th : 60;
      for (let f = 8; f < end - 2; f++) { const v1 = v(f, -2, 0), v2 = v(f, 0, 2), v3 = v(f, 2, 4); if (!v1 || !v2 || !v3) continue; const s1 = Math.hypot(v1.x, v1.y); if (s1 < 2) continue;
        const turn = Math.abs(Math.atan2(v1.x * v2.y - v1.y * v2.x, v1.x * v2.x + v1.y * v2.y)) * 57.3; if (turn > 45 || Math.hypot(v3.x, v3.y) < 0.6 * s1) { b = f; break; } }
      if (b >= 0) (BR[rt] ??= []).push([g(b).x - los, b / 10]);
      if (tg && th >= 0 && g(th)) { const vt = v(th, -1, 1); (TH[rt] ??= []).push([g(th).x - los, vt ? vt.x : null, th / 10, b >= 0 ? (th - b) / 10 : null, arrSpeed]); } }); } }); }
const q = (v: any[], p: number) => { const s = v.filter((x: any) => x !== null && Number.isFinite(x)).sort((a: number, b: number) => a - b); return s.length ? s[Math.floor(p * (s.length - 1))] : NaN; };
const tot = Object.values(RUN).reduce((a, b) => a + b, 0), tt = Object.values(TG).reduce((a, b) => a + b, 0);
console.log(`sim routes run ${tot}, targeted ${tt}`);
for (const [rt, n] of Object.entries(RUN).sort((a, b) => b[1] - a[1])) { const B = BR[rt] ?? [], X = TH[rt] ?? [];
  const f = (x: number, d = 2) => Number.isFinite(x) ? x.toFixed(d) : 'nan';
  console.log(`${rt.padEnd(10)} | ${f(n / tot, 3)} | ${f((TG[rt] ?? 0) / Math.max(1, tt), 3)} | ${f((TG[rt] ?? 0) / n, 3)} | ${f(q(B.map(b => b[0]), .5), 1)} / ${f(q(B.map(b => b[1]), .5))} (n ${B.length}) | ${f(q(X.map(x => x[0]), .5), 1)}, ${f(q(X.map(x => x[1]), .5))}, ${f(q(X.map(x => x[2]), .5))}, ${f(q(X.map(x => x[3]), .25))}/${f(q(X.map(x => x[3]), .5))}/${f(q(X.map(x => x[3]), .75))}, ${f(q(X.map(x => x[4]), .5))} (n ${X.length})`); }

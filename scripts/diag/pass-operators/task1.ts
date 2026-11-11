// Task 1 measurement, sim side: same records as nfl_task1.py on the 732 panel (non-fake, non-screen dropbacks).
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { restoreSetup } from '../saved-play.js';
const out: string[] = [];
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any) => { if (!p.pass) return; for (let k = 0; k < 4; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake || sim.offCall.pass?.family === 'screen') continue;
    const rid = new Map<any, string>(); const F: any[] = []; const BALL: any[] = []; let th = -1, ar = -1, T: any = null, press: boolean | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const air = sim.ball.kind === 'air'; for (const o of sim.offense) if (o.behavior instanceof RouteRunner && !rid.has(o)) rid.set(o, (o.behavior as any).route?.id ?? 'none'); tick(); const t10 = Math.round(sim.t * 10);
      if (th < 0 && !air && sim.ball.kind === 'air') { th = t10; T = sim.ball.target; const q = sim.qb.pos; press = sim.defense.some((d: any) => Math.hypot(d.pos.x - q.x, d.pos.y - q.y) < 2); }
      if (th >= 0 && ar < 0 && air && sim.ball.kind !== 'air') ar = t10;
      if (Math.abs(sim.t * 10 - t10) < 1e-6) { F[t10] = sim.agents.map((x: any) => ({ x: x.pos.x, y: x.pos.y, s: Math.hypot(x.vel.x, x.vel.y) })); const b = sim.ballPos(); BALL[t10] = { x: b.x, y: b.y }; } };
    const res: any = sim.run(); const s: any = sim.stats; const los = sim.los;
    const evs = (res.events ?? []).map((e: any) => e.type);
    const g = (i: number, f: number) => F[f]?.[i];
    const disp = (i: number, a: number, b: number) => { const A = g(i, a), B = g(i, b); return !A || !B ? null : { x: B.x - A.x, y: B.y - A.y }; };
    const resu = s.interceptedBy ? 'IN' : s.completed ? 'C' : (th >= 0 ? 'I' : 'S');
    const breaks: number[] = []; const lim = ar >= 0 ? ar : (th >= 0 ? th + 15 : F.length - 1);
    for (const [o, rt] of rid) { const i = o.idx; let b = -1;
      for (let f = 6; f < lim; f++) { const A_ = g(i, f); if (!A_ || A_.x - los < 1) continue; const st = disp(i, f - 5, f - 2), nx = disp(i, f, f + 2); if (!st || !nx) continue; const ss = Math.hypot(st.x, st.y) / 0.3; if (ss < 2) continue;
        const turn = Math.abs(Math.atan2(st.x * nx.y - st.y * nx.x, st.x * nx.x + st.y * nx.y)) * 57.3; if (turn > 30 || Math.hypot(nx.x, nx.y) / 0.2 < 0.65 * ss) { b = f; break; } }
      if (b < 0) continue; const sp = (f: number) => g(i, f)?.s ?? null;
      const st = disp(i, b - 5, b - 2), af = disp(i, b, b + 4);
      const hc = st && af ? Math.abs(Math.atan2(st.x * af.y - st.y * af.x, st.x * af.x + st.y * af.y)) * 57.3 : null;
      let pk: any = null; for (let f = b - 10; f <= b; f++) { const v = sp(f); if (v !== null && (!pk || v > pk[1])) pk = [f, v]; }
      const mins = [...Array(7).keys()].map(d => sp(b - 2 + d)).filter((x): x is number => x !== null);
      const depth = g(i, b).x - los; breaks.push(depth);
      out.push(JSON.stringify({ k: 'cut', route: rt, depth, in: sp(b - 4), min: mins.length ? Math.min(...mins) : null, p4: sp(b + 4), p8: sp(b + 8), turn: hc, gear_t: pk ? (b - pk[0]) / 10 : null, gear_drop: pk && sp(b) !== null ? pk[1] - (sp(b) as number) : null })); }
    const kind = breaks.some(d => d >= 10 && d <= 15) ? 'deep-break' : breaks.length && Math.max(...breaks) <= 6 ? 'quick' : 'other';
    out.push(JSON.stringify({ k: 'play', kind, ttt: th >= 0 ? th / 10 : null, sack: !!s.sacked, press, res: resu }));
    if (th >= 0 && ar >= 0 && T && BALL[th] && BALL[ar] && g(T.idx, ar)) { const b0 = BALL[th], b1 = BALL[ar], air = Math.hypot(b1.x - b0.x, b1.y - b0.y), fl = (ar - th) / 10, tp = g(T.idx, ar);
      out.push(JSON.stringify({ k: 'throw', air, depth: tp.x - los, flight: fl, speed: fl > 0 ? air / fl : null, place: Math.hypot(b1.x - tp.x, b1.y - tp.y), press, res: resu })); }
    if (resu === 'IN' && th >= 0) { const ic = sim.defense.find((d: any) => d.player.id === s.interceptedBy);
      const defl = evs.find((t: string) => ['deflection', 'drop', 'pbu', 'tip'].includes(t)) ?? null;
      let dI = null, cI = null, nearest = null; const tp = T && ar >= 0 ? g(T.idx, ar) : null;
      if (ic && tp && g(ic.idx, th)) { const q = g(ic.idx, th); dI = Math.hypot(q.x - tp.x, q.y - tp.y); const q2 = g(ic.idx, th + 3); if (q2) cI = (dI - Math.hypot(q2.x - tp.x, q2.y - tp.y)) / 0.3; }
      if (T && g(T.idx, th)) { const tt = g(T.idx, th); const dd = sim.defense.map((d: any) => [Math.hypot(g(d.idx, th).x - tt.x, g(d.idx, th).y - tt.y), d]).sort((a: any, b: any) => a[0] - b[0]); nearest = dd[0]?.[1] === ic; }
      out.push(JSON.stringify({ k: 'int', defl: !!defl, touch: defl, events: evs.filter((t: string) => ['deflection', 'drop', 'pbu', 'tip', 'interception'].includes(t)), ic_dist_rel: dI, ic_close: cI, ic_nearest: nearest, press, depth: tp ? tp.x - los : null })); } } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);

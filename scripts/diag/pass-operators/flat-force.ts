// Forced flat throws (diagnostic; changes the play): on the matched panel (out/matched-restage/seed{7,11}.json,
// SHIFTS dice shifts), the first tick at or after set + MIN_T s that the QB has a ready read running flat, arrow or swing,
// he throws it (his own evaluate()). Rows: his predicted P / INT, nearest defender, whether the ball went to that
// receiver without a pump, the outcome, the catch geometry at the receiver's catch/miss/drop, the forecast's mode and
// the aim point vs the receiver at the planned arrival. Filter clean rows: thrownTo === idx, !pumped, depth <= 4.
//   MIN_T=0.4 [FLAGS] node --import tsx scripts/diag/pass-operators/flat-force.ts out/flat.jsonl
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
const fcNow = (B: any, r: any, s: any) => { const f = B.receiverForecasts.get(r)?.predict(s.t, 0); return f ? Math.hypot(f.x - r.pos.x, f.y - r.pos.y) : null; };
import { restoreSetup } from '../saved-play.js';
const out: string[] = []; const shifts = Number(process.env.SHIFTS ?? 4); const minT = Number(process.env.MIN_T ?? 0);
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, pi: number) => { if (!p.pass) return; for (let k = 0; k < shifts; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    if (sim.offCall.pass?.fake) continue;
    const B: any = sim.qb.behavior; const geo: any[] = []; const evf = sim.event.bind(sim);
    sim.event = (type: string, a?: any, b?: any, note?: any) => { if (forced && a && a.idx === forced.idx && ['miss','drop','catch'].includes(type) && !geo.length) { const bp = sim.ball.flight?.pos; const it = sim.ball.intended; const bv = sim.ball.flight?.vel ?? { x: 0, y: 0, z: 0 }; geo.push({ type, dh: bp ? Math.hypot(bp.x - a.pos.x, bp.y - a.pos.y) : null, z: bp?.z ?? null, rs: Math.hypot(a.vel.x, a.vel.y), bs: Math.hypot(bv.x, bv.y, bv.z), offInt: it ? Math.hypot(it.x - a.pos.x, it.y - a.pos.y) : null, offAlong: it ? (it.x - a.pos.x) * a.vel.x / (Math.hypot(a.vel.x, a.vel.y) || 1) + (it.y - a.pos.y) * a.vel.y / (Math.hypot(a.vel.x, a.vel.y) || 1) : null, rSide: Math.min(a.pos.y, 53.33 - a.pos.y), itSide: it ? Math.min(it.y, 53.33 - it.y) : null, along: (a.vel.x * bv.x + a.vel.y * bv.y) / ((Math.hypot(a.vel.x, a.vel.y) || 1) * (Math.hypot(bv.x, bv.y) || 1)), air: sim.t - sim.ball.releaseT, reach: a.profile.reach, hands: a.r('hands') }); } return evf(type, a, b, note); }; let forced: any = null, near = NaN, closing = NaN;
    const upd = B.update.bind(B); let atArr: any = null, relAt = -1;
    const tk = sim.tick.bind(sim); sim.tick = () => { const air0 = sim.ball.kind === 'air'; tk(); if (forced && !air0 && sim.ball.kind === 'air' && relAt < 0) relAt = sim.t; if (forced && forced.trk && forced.trk.length < 40) { const R = sim.agents[forced.idx]; forced.trk.push([+(sim.t - forced.t0).toFixed(2), +(R.pos.x - sim.los).toFixed(2), +R.pos.y.toFixed(2), +Math.hypot(R.vel.x, R.vel.y).toFixed(2), R.behavior?.kind]); }
      if (forced && !atArr && sim.t >= forced.tArr) { const R = sim.agents[forced.idx]; atArr = { x: R.pos.x, y: R.pos.y, vx: R.vel.x, vy: R.vel.y, t: sim.t, plannedRel: forced.t0 + forced.wind, actualRel: relAt }; } };
    B.update = (a: any, s: any) => {
      if (!forced && B.phase === 'set' && s.t >= B.setAt + minT && s.ball.kind !== 'air') {
        for (const r of B.reads) {
          if (!r || r.behavior?.kind === 'pass-pro' || !B.ready(r, s)) continue;
          if (!['flat', 'arrow', 'swing'].includes(r.behavior?.route?.id)) continue;
          const ev = B.evaluate(a, s, r, 0); if (!ev) continue;
          forced = { t0: s.t, P: ev.P, int: ev.intRisk, depth: ev.depth, wide: Math.abs(ev.point.y - s.ballY), t: s.t - B.setAt, idx: r.idx, T: ev.T,
            route: r.behavior?.route?.id ?? r.behavior?.kind };
          let best = Infinity, cl = 0; for (const d of s.defense) { const dd = Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y); if (dd < best) { best = dd; cl = ((r.pos.x - d.pos.x) * d.vel.x + (r.pos.y - d.pos.y) * d.vel.y) / (dd || 1); } }
          near = best; closing = cl;
          { const fc = B.receiverForecasts.get(r); forced.fc = fc ? { est: fc.estimate ? { m: fc.estimate.motion, prog: fc.estimate.progress, src: fc.estimate.source } : null, p05: fc.predict(s.t, 0.5), p10: fc.predict(s.t, 1.0), now: fc.predict(s.t, 0), path: fc.prior.path.map((q: any) => [q.p.x - s.los, q.p.y, q.s]) } : null; forced.trk = []; }
          forced.stale = fcNow(B, r, s); forced.r0 = { x: r.pos.x, y: r.pos.y, vx: r.vel.x, vy: r.vel.y }; forced.aim = { x: ev.point.x, y: ev.point.y }; forced.wind = B.windup(a); forced.tArr = s.t + forced.wind + ev.T; s.qbEyes = r; return B.startThrow(a, s, ev);
        }
      }
      return upd(a, s);
    };
    sim.run(); if (!forced) continue;
    const st = sim.stats; const catchEv = sim.events.find((e: any) => e.type === 'catch' && e.a === forced.idx); const R = sim.agents[forced.idx];
    out.push(JSON.stringify({ seed, pi, k, ...forced, near, closing, comp: sim.events.some((e: any) => e.type === 'catch' && e.a === forced.idx), width0: forced.wide,  intc: !!st.interceptedBy, yac: catchEv ? (sim.ballDeadSpot?.x ?? NaN) : null, gain: st.yards ?? null,
      geo: geo[0] ?? null, atArr, thrownTo: sim.events.find((e: any) => e.type === 'throw' && e.t >= forced.t0)?.b ?? null, pumped: sim.events.some((e: any) => e.type === 'pump' && e.t >= forced.t0), dead: sim.stats.endReason ?? sim.stats.result ?? null, oob: sim.events.filter((e: any) => /bound|oob|sideline/.test(e.type)).map((e: any) => e.type), allev: sim.events.filter((e: any) => e.t >= forced.t0).slice(0, 8).map((e: any) => e.type + (e.a === forced.idx ? '@R' : '')), evs: sim.events.filter((e: any) => ['drop','miss','pbu','deflection','interception','catch'].includes(e.type)).slice(0,3).map((e: any) => e.type) })); } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);

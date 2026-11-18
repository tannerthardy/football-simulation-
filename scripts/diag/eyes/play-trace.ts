// node --import tsx scripts/diag/eyes/play-trace.ts concept coverage formation seed flip(0/1) [roster=7]
// One staged pass play, passive: his read sequence (route of each read and when he came to it), the throw (target route,
// believed P and intRisk, planned flight), every defender within 7 yd of the aim at the release (slot, distance, speed and
// heading toward the aim), and the result (who intercepted, from where).
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const [concept, coverage, formation, seedS, flipS, rosterS] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage, formation, seed: Number(seedS), flip: flipS === '1', roster: Number(rosterS ?? 7) }));
const dir = sim.attackDir(sim.offense[0].team), rid = (r: any) => r?.behavior?.route?.id ?? r?.slot ?? null;
const X = (p: any) => +((p.x - sim.los) * dir).toFixed(1), Y = (p: any) => +(p.y - sim.ballY).toFixed(1);
const reads: any[] = [], evs: any[] = []; let nextEv = 0; let last: any = undefined, thr: any = null;
const tb = sim.throwBall.bind(sim);
sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
  if (p === sim.qb && !thr) {
    const b = p.behavior, rec = b?.throwRec;
    thr = { t: +sim.t.toFixed(2), away, target: rid(target), slot: target?.slot, aim: intended ? [X(intended), Y(intended)] : null, flight: +(arrivalT - sim.t).toFixed(2),
      P: rec ? +rec.P.toFixed(3) : null, iR: rec ? +rec.intRisk.toFixed(3) : null, near: intended ? sim.defense.map((d: any) => {
        const dx = intended.x - d.pos.x, dy = intended.y - d.pos.y, dist = Math.hypot(dx, dy);
        return { slot: d.slot, dist: +dist.toFixed(1), at: [X(d.pos), Y(d.pos)], v: +Math.hypot(d.vel.x, d.vel.y).toFixed(1), vToward: +((d.vel.x * dx + d.vel.y * dy) / Math.max(dist, 1e-6)).toFixed(1) };
      }).filter((n: any) => n.dist < 7).sort((a: any, b: any) => a.dist - b.dist) : null,
      recv: target ? [X(target.pos), Y(target.pos)] : null, margins: b?.marginLast ?? null,
      seen: sim.defense.filter((d: any) => intended && Math.hypot(intended.x - d.pos.x, intended.y - d.pos.y) < 7).map((d: any) => { const e = b?.mind?.estimate?.(d); return e ? { slot: d.slot, seenAt: [X(e.pos), Y(e.pos)], seenV: [+(e.vel.x * dir).toFixed(1), +e.vel.y.toFixed(1)], trueV: [+(d.vel.x * dir).toFixed(1), +d.vel.y.toFixed(1)], age: +(b.mind.pictureAge?.(d) ?? -1).toFixed(2) } : null; }) };
  }
  return tb(p, target, v0, intended, arrivalT, away, ...rest);
};
const tick = sim.tick.bind(sim); let probed = false;
let ballLog: any[] = []; sim.tick = () => { if (thr && sim.ball?.kind === 'air' && Math.round(sim.t * 100) % 5 === 0) { const cb = sim.defense.find((d: any) => d.slot === 'CB_W'); ballLog.push([+sim.t.toFixed(2), [X(sim.ball.flight.pos), Y(sim.ball.flight.pos), +sim.ball.flight.pos.z.toFixed(1), sim.ball.securing ? 'sec:' + sim.ball.securing.receiver.slot : '', +sim.ball.arrivalT.toFixed(2)], cb ? [X(cb.pos), Y(cb.pos)] : null]); } if (!probed && sim.qb.behavior?.kind === 'qb-pass') { sim.qb.behavior.marginProbe = true; probed = true; } tick(); const b = sim.qb.behavior; const cur = b?.reads?.[b.readIdx]; if (b?.kind === 'qb-pass' && cur !== last) { reads.push([+sim.t.toFixed(2), rid(cur)]); last = cur; }
  // PLAY_TRACE_EV=1: his evaluation of each route every 0.25 s once set (u = 0; evaluate may touch probe state, not dice).
  if (process.env.PLAY_TRACE_EV === '1' && b?.kind === 'qb-pass' && !thr && sim.t >= nextEv && b.reads?.length) { nextEv = sim.t + 0.25;
    evs.push([+sim.t.toFixed(2), b.reads.map((r: any) => { let e: any = null; try { e = b.ready(r, sim) ? b.evaluate(sim.qb, sim, r, 0) : null; } catch {} const f = b.receiverForecasts?.get(r), bk = f?.breakAt?.(), pb = (() => { try { return b.planBreakAt?.(r); } catch { return undefined; } })(); const dep = +((r.pos.x - sim.los) * dir).toFixed(1); return (e ? `${rid(r)} ${e.P.toFixed(2)}/${e.intRisk.toFixed(3)}` : `${rid(r)} -`) + (process.env.PLAY_TRACE_BRK === '1' ? `[d${dep} brk${bk == null ? '-' : bk.toFixed(2)} pl${pb == null ? '-' : pb.toFixed(2)} rb${r.behavior?.breakTime?.toFixed?.(2) ?? '-'}]` : ''); }).join(' | ')]); } };
const res = sim.run();
const ev = sim.events.filter((e: any) => ['interception', 'pbu', 'deflection', 'pump', 'throw_held', 'sack', 'catch'].includes(e.type)).map((e: any) => ({ t: +e.t.toFixed(2), type: e.type, by: e.a !== undefined ? sim.agents?.[e.a]?.slot ?? sim.defense.find((d: any) => d.idx === e.a)?.slot ?? e.a : undefined }));
console.log(JSON.stringify({ concept, coverage, formation, seed: Number(seedS), flip: flipS === '1', routes: sim.offense.filter((o: any) => o.behavior?.route).map((o: any) => `${o.slot}:${rid(o)}`).join(' '), reads, thr, cmp: !!res.stats.completed, int: res.stats.interceptedBy ?? null, yards: res.yards, ev, evs, ballLog, qbAt: thr ? null : null }));

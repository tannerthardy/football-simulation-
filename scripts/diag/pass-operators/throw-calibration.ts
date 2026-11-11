// window() calibration (passive): the QB's predicted P and INT risk for the throw he made vs what happened, on the
// matched panel (out/matched-restage/seed{7,11}.json, SHIFTS dice shifts). Also the target's route, the forecast mode
// (installed-route / observed-motion), its distance from the installed path, and the aim point vs the receiver at the
// planned arrival.   [FLAGS] node --import tsx scripts/diag/pass-operators/throw-calibration.ts out/calib.jsonl
import { readFileSync, writeFileSync } from 'node:fs';
import { PlaySim } from '../../../src/sim/playsim.js';
import { restoreSetup } from '../saved-play.js';
const out: string[] = []; const shifts = Number(process.env.SHIFTS ?? 4);
for (const seed of ['7', '11']) { const plays = JSON.parse(readFileSync(`out/matched-restage/seed${seed}.json`, 'utf8'));
  plays.forEach((p: any, pi: number) => { if (!p.pass) return; for (let k = 0; k < shifts; k++) { const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); for (let j = 0; j < k; j++) sim.rng.nextU32();
    const dice = sim.dice.bind(sim), made = new Set<string>();
    sim.dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b), l = `${kind}:${a?.idx}:${b?.idx}`; if (!made.has(l)) { made.add(l); for (let j = 0; j < k; j++) r.nextU32(); } return r; };
    let lastRoute = '?'; let arrT = -1; let ev: any = null, relT = -1, arrRec: any = null, r0: any = null, nearest = NaN, tgtRoute = '';
    const tick = sim.tick.bind(sim);
    sim.tick = () => { const pend = (sim.qb.behavior as any).pending; if (pend) { const fcx = (sim.qb.behavior as any).receiverForecasts?.get(pend.target); const fe = fcx?.estimate; const pr = fcx?.prior;
        let dev = null as number | null, devStart = null as number | null; if (pr) { let prev = pr.start, best = Infinity; const P = pend.target.pos; for (const q of pr.path) { const nx = q.p, dx = nx.x - prev.x, dy = nx.y - prev.y, l2 = dx*dx + dy*dy; const u = l2 ? Math.max(0, Math.min(1, ((P.x - prev.x)*dx + (P.y - prev.y)*dy) / l2)) : 0; best = Math.min(best, Math.hypot(P.x - prev.x - u*dx, P.y - prev.y - u*dy)); prev = nx; } dev = best; const sn = sim.offAlign?.spots?.[pend.target.slot]?.pos; devStart = sn ? Math.hypot(sn.x - pr.start.x, sn.y - pr.start.y) : null; } ev = { ...pend, tIdx: pend.target.idx, fm: fe?.motion ?? null, dev, devStart, motioned: !!(pend.target.tags?.has?.('motion')) }; const rb: any = sim.agents[pend.target.idx].behavior; if (rb?.route?.id) lastRoute = rb.route.id; } const air0 = sim.ball.kind === 'air'; tick();
      if (!air0 && sim.ball.kind === 'air' && relT < 0 && ev) { relT = sim.t; const R = sim.agents[ev.tIdx];
        nearest = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - R.pos.x, d.pos.y - R.pos.y)));
        tgtRoute = lastRoute !== '?' ? lastRoute : ((R.behavior as any).route?.id ?? R.behavior?.kind ?? '?'); r0 = { vx: R.vel.x, vy: R.vel.y }; }
      if (relT >= 0 && sim.ball.kind === 'air' && arrT < 0) arrT = sim.ball.arrivalT;
      if (relT >= 0 && !arrRec && (sim.ball.kind !== 'air' || sim.t >= arrT - 1e-6)) { const R = sim.agents[ev.tIdx]; arrRec = { x: R.pos.x, y: R.pos.y }; } };
    sim.run(); if (relT < 0 || !ev) continue;
    const st = sim.stats;
    out.push(JSON.stringify({ seed, pi, k, P: ev.P, int: ev.intRisk, depth: ev.depth, y: ev.point.y, wide: Math.abs(ev.point.y - sim.ballY), side: Math.min(ev.point.y, 53.33 - ev.point.y), T: ev.T,
      route: tgtRoute, fm: ev.fm, dev: ev.dev, devStart: ev.devStart, aimAlong: arrRec && r0 ? ((ev.point.x - arrRec.x) * r0.vx + (ev.point.y - arrRec.y) * r0.vy) / (Math.hypot(r0.vx, r0.vy) || 1) : null, aimOff: arrRec ? Math.hypot(ev.point.x - arrRec.x, ev.point.y - arrRec.y) : null, nearest, evs: sim.events.filter((e: any) => e.t >= relT - 0.05 && !['tackle','contact','first_contact','pressure'].includes(e.type)).slice(0, 4).map((e: any) => e.type + (e.a === ev.tIdx ? '@R' : e.a !== undefined && sim.agents[e.a]?.team !== sim.qb.team ? '@D' : '')), comp: !!st.completed, intc: !!st.interceptedBy, relT })); } }); }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length);

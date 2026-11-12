// Forced outside go throws (forced-deep.ts selection): where the receiver meets the ball against where the QB aimed it.
// Per throw: the planned arrival (the QB's aim point and time, as throwBall receives them) and the first arrival event
// (secure / catch / pbu / deflection / miss / incomplete...): time before the planned arrival, the ball's distance
// short of the aim along the throw at that moment, the receiver's speed then, and his speed and the aim's lead over his
// held-from-release spot. usage: npx tsx scripts/diag/risk/forced-meet.ts [--n 40]
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const N = Number(arg('--n', '40'));
const ARRIVE = new Set(['secure', 'catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection', 'miss']);
const rows: any[] = [];
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (let i = 1; i <= N; i++) {
  const seed = Math.ceil(i / 2), flip = i % 2 === 0;
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip }));
  const by = sim.ballY;
  const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
  const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
    return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
  let qb: any = null, forced = false, T: any = null, meet: any = null;
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (q: any, r: any, v0: any, pt: any, arr: number) => {
    if (forced && !T) T = { t: sim.t, pt: { x: pt.x, y: pt.y }, from: { x: q.pos.x, y: q.pos.y }, arr, r, rpos: { x: r.pos.x, y: r.pos.y }, rvel: { x: r.vel.x, y: r.vel.y } };
    return tb(q, r, v0, pt, arr);
  };
  const ev0 = sim.event.bind(sim);
  sim.event = (type: string, a: any, b: any, note?: string) => {
    if (T && !meet && ARRIVE.has(type)) {
      const bp = sim.ballPos(), ux = T.pt.x - T.from.x, uy = T.pt.y - T.from.y, L = Math.hypot(ux, uy) || 1;
      meet = { type, early: T.arr - sim.t, short: ((bp.x - T.pt.x) * ux + (bp.y - T.pt.y) * uy) / L, rs: Math.hypot(T.r.vel.x, T.r.vel.y) };
    }
    return ev0(type, a, b, note);
  };
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (qb && !forced && sim.throwAt < 0 && qb.phase === 'set' && sim.t >= 2.3 && sim.t <= 2.6) {
      const go = gos.find((r: any) => qb.ready(r, sim)); const ev = go ? qb.evaluate(sim.qb, sim, go, 0) : null;
      if (ev) { forced = true; qb.startThrow(sim.qb, sim, ev); }
    }
  };
  sim.run();
  if (!T || !meet) continue;
  const s0 = Math.hypot(T.rvel.x, T.rvel.y) || 1, hx = T.rpos.x + T.rvel.x * (T.arr - T.t), hy = T.rpos.y + T.rvel.y * (T.arr - T.t);
  rows.push({ coverage, ...meet, lead: ((T.pt.x - hx) * T.rvel.x + (T.pt.y - hy) * T.rvel.y) / s0, rs0: s0, vmax: T.r.profile.vmax, cmp: !!sim.stats.completed });
}
const q = (v: number[], f = .5) => { const x = [...v].sort((a, b) => a - b); return x.length ? x[Math.floor(f * (x.length - 1))].toFixed(2) : '-'; };
console.log(`forced go throws n ${rows.length}`);
for (const [lab, v] of [['all', rows], ['cover1', rows.filter(r => r.coverage === 'cover1')], ['caught', rows.filter(r => r.cmp)], ['not caught', rows.filter(r => !r.cmp)]] as const)
  console.log(`  ${lab.padEnd(10)} n ${v.length} | aim lead over held-from-release spot p50 ${q(v.map(r => r.lead))} | met the ball ${q(v.map(r => r.early))} s (p25 ${q(v.map(r => r.early), .25)} / p75 ${q(v.map(r => r.early), .75)}) before the planned arrival, ${q(v.map(r => r.short))} yd along the throw from the aim | his speed at release ${q(v.map(r => r.rs0))}, at the meeting ${q(v.map(r => r.rs))}, vmax ${q(v.map(r => r.vmax))} | first event ${JSON.stringify(v.reduce((m: any, r: any) => (m[r.type] = (m[r.type] ?? 0) + 1, m), {}))}`);

/**
 * Placement split (risk diagnosis, with Coverage's placement.py): on the forced-concept panel's throws, the ball's
 * achieved offset from the receiver, separated into the throw's own miss and what the receiver did about it.
 * - aimMiss: the ball at its planned arrival against the point he aimed at as it left his hand (the throw's miss:
 *   missSigma, the flick and the consistency draw), with its components along / across the receiver's run;
 * - lead: the receiver at the planned arrival against that point (the forecast's error);
 * - offset: placement.py's operator, the incoming flight line (the ball 0.3 s and 0.1 s before arrival) at its
 *   closest approach to the receiver at arrival, along / across his run; arrival is the tick the ball stops being in
 *   the air, else the planned arrival;
 * - tags: the QB at release (set / moving over 2.2 yd/s / hit, his urgency), the receiver at arrival (settled under
 *   2 yd/s, vertical within 35 deg of downfield, crossing otherwise), tight (nearest defender to the target < 1.5 yd at
 *   the release), the aimed distance, his sigma belief at urgency 0 and at the release's urgency.
 * One JSON row a throw. Passive.
 *   node --import tsx scripts/diag/risk/placement-split.ts [--seeds 1,2,3] > out/risk/placement-split.jsonl
 */
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2,3').split(',').map(Number);
const forms = ['gun_doubles_11', 'gun_trips_11'];
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
const P: any = QBPass.prototype, rel = P.release;
let cur: any = null;
P.release = function (a: any, sim: any, ev: any) {
  const tb = sim.throwBall;
  sim.throwBall = (q: any, r: any, v0: any, pt: any, arr: number) => {
    const dist = Math.hypot(pt.x - q.pos.x, pt.y - q.pos.y);
    const pr = this.pressure(a, sim), u = Math.max(0, Math.min(1, (0.9 - pr.time) / 0.7));
    const tight = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y))) < 1.5;
    const held = sim.defense.some((d: any) => d.engagement && Math.hypot(d.pos.x - q.pos.x, d.pos.y - q.pos.y) < 1.5);
    cur = { pt: { x: pt.x, y: pt.y }, arr, rel: sim.t, from: { x: q.pos.x, y: q.pos.y }, dist, r, u, tight,
      qbSpeed: Math.hypot(q.vel.x, q.vel.y), hit: held || (this.flick ?? 0) > 0.3, flick: this.flick ?? 0,
      sigma0: this.missSigma(a, sim, dist, 0), sigmaU: this.missSigma(a, sim, dist, u) };
    sim.throwBall = tb;
    return tb.call(sim, q, r, v0, pt, arr);
  };
  return rel.call(this, a, sim, ev);
};
const unit = (v: { x: number; y: number }) => { const s = Math.hypot(v.x, v.y); return s > 0.5 ? { x: v.x / s, y: v.y / s } : { x: 1, y: 0 }; };
for (const c of concepts) for (const formation of forms) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: c.id, seed, roster: seed, formation, flip }));
  cur = null;
  let planned: any = null, arrival: any = null;
  const trail: { t: number; b: { x: number; y: number } }[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const wasAir = sim.ball.kind === 'air';
    tick();
    if (!cur || arrival) return;
    if (sim.ball.kind === 'air') { const b = sim.ballPos(); trail.push({ t: sim.t, b: { x: b.x, y: b.y } }); }
    if (!planned && sim.t >= cur.arr - 1e-9) {
      const b = sim.ballPos(), r = cur.r;
      planned = { inAir: sim.ball.kind === 'air', ball: { x: b.x, y: b.y }, rec: { x: r.pos.x, y: r.pos.y }, vel: { x: r.vel.x, y: r.vel.y } };
    }
    if ((wasAir && sim.ball.kind !== 'air') || (planned && sim.ball.kind !== 'air')) {
      const r = cur.r;
      arrival = { t: sim.t, rec: { x: r.pos.x, y: r.pos.y }, vel: { x: r.vel.x, y: r.vel.y } };
    }
  };
  sim.run();
  if (!cur || !trail.length) continue;
  arrival ??= planned && { t: cur.arr, rec: planned.rec, vel: planned.vel };
  if (!arrival) continue;
  // Flight line 0.3 s and 0.1 s before arrival, closest approach to the receiver at arrival (placement.py).
  const at = (t: number) => trail.reduce((p, q) => (Math.abs(q.t - t) < Math.abs(p.t - t) ? q : p)).b;
  const A = at(arrival.t - 0.3), E = at(arrival.t - 0.1), R = arrival.rec;
  const L = { x: E.x - A.x, y: E.y - A.y }, LL = L.x * L.x + L.y * L.y;
  if (LL < 0.01) continue;
  const k = ((R.x - A.x) * L.x + (R.y - A.y) * L.y) / LL, C = { x: A.x + k * L.x, y: A.y + k * L.y };
  const u2 = unit(arrival.vel), off = { x: C.x - R.x, y: C.y - R.y };
  const sp = Math.hypot(arrival.vel.x, arrival.vel.y), dir = sim.attackDir(sim.offense[0].team);
  const heading = Math.abs(Math.atan2(arrival.vel.y, arrival.vel.x * dir)) * 180 / Math.PI;
  const motion = sp < 2 ? 'settled' : heading < 35 ? 'vertical' : 'crossing';
  const row: any = { concept: c.id, formation, coverage, seed, flip, dist: +cur.dist.toFixed(1), u: +cur.u.toFixed(2), tight: cur.tight,
    qb: cur.hit ? 'hit' : cur.qbSpeed > 2.2 ? 'moving' : 'set', flick: +cur.flick.toFixed(2), sigma0: +cur.sigma0.toFixed(2), sigmaU: +cur.sigmaU.toFixed(2),
    motion, recSpeed: +sp.toFixed(1),
    offset: +Math.hypot(off.x, off.y).toFixed(2), offAlong: +(off.x * u2.x + off.y * u2.y).toFixed(2), offAcross: +Math.abs(-off.x * u2.y + off.y * u2.x).toFixed(2),
    cmp: !!sim.stats.completed };
  if (planned) {
    const m = { x: planned.ball.x - cur.pt.x, y: planned.ball.y - cur.pt.y }, u1 = unit(planned.vel);
    Object.assign(row, { aimInAir: planned.inAir, aimMiss: +Math.hypot(m.x, m.y).toFixed(2), aimAlong: +(m.x * u1.x + m.y * u1.y).toFixed(2),
      aimAcross: +Math.abs(-m.x * u1.y + m.y * u1.x).toFixed(2), lead: +Math.hypot(planned.rec.x - cur.pt.x, planned.rec.y - cur.pt.y).toFixed(2) });
  }
  process.stdout.write(JSON.stringify(row) + '\n');
}

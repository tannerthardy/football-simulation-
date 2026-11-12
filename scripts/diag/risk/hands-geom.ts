// At each targeted catch resolution (receiverContest) in the forced-go harness: the hands (the ball where it meets
// the receiver's window, o.b) relative to the receiver and to the nearest trailing defender, against his standing
// reach and lunge. Run under PLAY_HANDS=1 so the decision path is live.
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';
import * as C from '../../../src/sim/catching.js';
const rows: any[] = [];
const orig = (C as any).resolveCatchOpportunities;
const P: any = PlaySim.prototype, ev0 = P.event;
P.event = function (type: string, a: any, b: any, note?: string) {
  if ((type === 'catch' || type === 'pbu' || type === 'drop' || type === 'miss') && this.__geom && !this.__geom.done) { this.__geom.result = type + (note ? ':' + note : ''); this.__geom.done = true; }
  return ev0.call(this, type, a, b, note);
};
const QB: any = QBPass.prototype;
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (let i = 1; i <= 40; i++) {
  const seed = Math.ceil(i / 2), flip = i % 2 === 0;
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation, flip }));
  let qb: any = null, forced = false;
  const by = sim.ballY;
  const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
  const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
    return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const wasAir = sim.ball.kind === 'air';
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (qb && !forced && sim.throwAt < 0 && qb.phase === 'set' && sim.t >= 2.3 && sim.t <= 2.6) {
      const go = gos.find((r: any) => qb.ready(r, sim)); const ev = go ? qb.evaluate(sim.qb, sim, go, 0) : null;
      if (ev) { forced = true; qb.startThrow(sim.qb, sim, ev); }
    }
    // the first tick a receiver has the ball in his hands (securing or held) or the flight ended near the target
    if (wasAir && sim.__geom === undefined && (sim.ball.kind !== 'air' || sim.ball.securing)) {
      const R = sim.ball.kind === 'air' ? sim.ball.securing?.receiver : sim.ball.carrier ?? null;
      if (R && R.team === 'O') {
        const bp = sim.ball.kind === 'air' ? sim.ball.flight.pos : { x: R.pos.x, y: R.pos.y };
        const S = sim.ball.kind === 'air' ? sim.ball.securing : null;
        const hands = S?.hands ? { x: R.pos.x + S.hands.x, y: R.pos.y + S.hands.y } : bp;
        const D = sim.defense.filter((d: any) => !d.isDown(sim.t)).sort((a: any, b: any) => Math.hypot(a.pos.x - R.pos.x, a.pos.y - R.pos.y) - Math.hypot(b.pos.x - R.pos.x, b.pos.y - R.pos.y))[0];
        const rs = Math.hypot(R.vel.x, R.vel.y) || 1, along = ((D.pos.x - R.pos.x) * R.vel.x + (D.pos.y - R.pos.y) * R.vel.y) / rs;
        sim.__geom = { coverage, dR: Math.hypot(D.pos.x - R.pos.x, D.pos.y - R.pos.y), dHands: Math.hypot(D.pos.x - hands.x, D.pos.y - hands.y),
          handsOff: Math.hypot(hands.x - R.pos.x, hands.y - R.pos.y), handsToward: ((hands.x - R.pos.x) * (D.pos.x - R.pos.x) + (hands.y - R.pos.y) * (D.pos.y - R.pos.y)) / (Math.hypot(D.pos.x - R.pos.x, D.pos.y - R.pos.y) || 1),
          trailing: along < -0.5, standing: D.profile.reach + 0.15, done: false };
        rows.push(sim.__geom);
      }
    }
  };
  sim.run();
}
const q = (v: number[], f = .5) => { const s = [...v].sort((a, b) => a - b); return s.length ? s[Math.floor(f * (s.length - 1))] : NaN; };
const band = rows.filter(r => r.dR >= 1 && r.dR < 2);
const tr = band.filter(r => r.trailing);
console.log(`catches resolved ${rows.length}; nearest defender 1-2 yd ${band.length}, trailing ${tr.length}`);
for (const [lab, v] of [['1-2 yd all', band], ['1-2 yd trailing', tr]] as const)
  console.log(`  ${lab}: defender to receiver p50 ${q(v.map(r => r.dR)).toFixed(2)} | hands off his centre p50 ${q(v.map(r => r.handsOff)).toFixed(2)}, toward the defender p50 ${q(v.map(r => r.handsToward)).toFixed(2)} | defender to hands p25/p50/p75 ${q(v.map(r => r.dHands), .25).toFixed(2)}/${q(v.map(r => r.dHands)).toFixed(2)}/${q(v.map(r => r.dHands), .75).toFixed(2)} vs standing reach ${q(v.map(r => r.standing)).toFixed(2)} and lunge ${(q(v.map(r => r.standing)) + 0.45).toFixed(2)} | within standing ${v.filter(r => r.dHands <= r.standing).length}, within lunge ${v.filter(r => r.dHands <= r.standing + 0.45).length} | results ${JSON.stringify(v.reduce((m: any, r: any) => (m[r.result ?? 'held'] = (m[r.result ?? 'held'] ?? 0) + 1, m), {}))}`);

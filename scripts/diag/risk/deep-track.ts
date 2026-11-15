// Coverage's receiver-tracking trace (from the QB lane's deep-forced.ts): every 0.25 s of the flight, his own estimate's
// catch spot and his goal (TrackBall's choice) against the true catch spot, his samples, the ball in his eyes' range.
// node --import tsx deep-forced.ts [seed] [games] [mode] > rows.jsonl
// What happens when he throws the open deep ball he prices out. On each pass play, once he is set: the first moment a
// receiver on a route is 12 yd or more downfield, his own evaluation has nobody on it (pOpen x pClear >= 0.6), the
// flight is 1.5 s or longer and his price is under 0.45 (so he would not throw it), the throw is started anyway and
// cannot be pulled down. One forced throw a play. Rows: his price and its parts, flight, depth, and what happened.
// mode 'ctl' forces nothing and prints the same rows for the throws he chooses to receivers 12+ yd downfield.
// Each row also has, at the ball's arrival time (or its last moment in the air): the ball against the aim point (his
// miss), the receiver against the aim and against the ball, the nearest defender to the ball; and the receiver's look:
// when after the release his body first faced the ball (within 60 degrees), and whether it did at arrival. For the
// accuracy belief's fit: what a receiver runs under, by flight time and miss, on each receiver engine (BALL_EST).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
import { fitFlight } from '../../../src/sim/ball-estimate.js';
import { imageRates } from '../../../src/sim/ball-servo.js';
const mode = process.argv[4] ?? 'force';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rec: any = null, hooked: any = null; const dir = sim.attackDir(sim.qb.team);
  const tick = sim.tick.bind(sim);
  const track = () => { if (!rec || !rec.thrown || rec.arr) return; const r = rec.r;
    if (sim.ball.kind === 'air' && rec.rel != null && sim.t - rec.rel >= (rec.nextS ?? 0) - 1e-6) {
      rec.nextS = (rec.nextS ?? 0) + 0.25; rec.ts ??= [];
      const tru = catchSpot(r, sim), est = sim.ballEstimates?.peek ? sim.ballEstimates.peek(r, sim) : [], es = est.length ? catchSpot(r, { t: sim.t, ballPath: est }) : null;
      const landAt = (path: any[]) => { for (const q of path) if (q.t >= sim.t && q.z <= 1.3) return q; return path.length ? path[path.length - 1] : null; };
      const tl = landAt(sim.ballPath ?? []), el = est.length ? landAt(est) : null;
      const trk = sim.ballEstimates?.tracks?.get(r); let ownLand: any = null, drag = sim.ball.flight.drag ?? 0;
      if (trk && trk.samples.length >= 3) { const f = fitFlight(trk.samples, 0); const vz = f.v.z, pz = f.p.z - 1.3; const tt = (vz + Math.sqrt(Math.max(0, vz * vz + 2 * 10.72 * pz))) / 10.72; ownLand = { x: f.p.x + f.v.x * tt, y: f.p.y + f.v.y * tt }; }
      const ch = r.behavior?.choice?.p ?? null, d = (p: any, q: any) => p && q ? +Math.hypot(p.x - q.x, p.y - q.y).toFixed(1) : null;
      const bp = sim.ball.flight.pos, head = r.head ?? sim.ballEstimates?.headOf?.(r) ?? r.facing;
      const off = Math.abs(((Math.atan2(bp.y - r.pos.y, bp.x - r.pos.x) - head) * 180 / Math.PI + 540) % 360 - 180);
      const toT = tru ? Math.atan2(tru.p.y - r.pos.y, tru.p.x - r.pos.x) : 0;
      rec.ts.push({ dt: +(sim.t - rec.rel).toFixed(2), landErr: d(el, tl), ownErr: d(ownLand, tl), drag, pri: sim.ballEstimates?.tracks?.get(r)?.pseudo?.length ?? null, n: sim.ballEstimates?.samplesOf?.(r) ?? null, estErr: d(es?.p, tru?.p), goalErr: d(ch, tru?.p), goalVsEst: d(ch, es?.p), rToTrue: d(r.pos, tru?.p), vTo: tru ? +(r.vel.x * Math.cos(toT) + r.vel.y * Math.sin(toT)).toFixed(1) : null, sp: +Math.hypot(r.vel.x, r.vel.y).toFixed(1), inEye: off <= 30, beh: r.behavior?.kind ?? '?', servo: !!r.tags?.has?.('ball-servo'), rates: (() => { const ir = sim.ballEstimates?.anglesOf ? imageRates(sim.ballEstimates.anglesOf(r), sim.t) : null; return ir ? { oa: +ir.optAcc.toFixed(3), br: +ir.bearingRate.toFixed(3) } : null; })() });
    }
    if (sim.ball.kind === 'air') { const bp = sim.ball.flight.pos; rec.last = { x: bp.x, y: bp.y, z: bp.z };
      const face = Math.cos(r.body.facing - Math.atan2(bp.y - r.pos.y, bp.x - r.pos.x)) > 0.5;
      if (face && rec.lookAt == null) rec.lookAt = +(sim.t - rec.rel).toFixed(2); rec.facing = face; }
    if ((sim.t >= rec.arriveAt - 1e-6 || sim.ball.kind !== 'air') && rec.last) { const b = rec.last, a = rec.aim, h = (p: any, q: any) => +Math.hypot(p.x - q.x, p.y - q.y).toFixed(1);
      rec.arr = { miss: h(b, a), recToAim: h(r.pos, a), recToBall: h(r.pos, b), ballZ: +b.z.toFixed(1), defToBall: +Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - b.x, d.pos.y - b.y))).toFixed(1), early: +(rec.arriveAt - sim.t).toFixed(2), looking: !!rec.facing, lookAt: rec.lookAt ?? null, ...(() => { const u = Math.atan2(r.vel.y, r.vel.x), dx = b.x - r.pos.x, dy = b.y - r.pos.y; return { along: +(dx * Math.cos(u) + dy * Math.sin(u)).toFixed(2), across: +(-dx * Math.sin(u) + dy * Math.cos(u)).toFixed(2) }; })() }; } };
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (mode === 'force' && b?.kind === 'qb-pass' && hooked !== b) {
      hooked = b; const upd = b.update.bind(b);
      b.update = (a: any, s: any) => {
        if (!rec && b.phase === 'set' && s.ball.kind === 'held' && s.ball.carrier === a) {
          for (const r of s.offense) {
            if (!r.behavior?.route?.id || (r.pos.x - s.los) * dir < 12) continue;
            let ev: any = null; try { ev = b.evaluate(a, s, r, 0); } catch { ev = null; }
            if (!ev || !ev.parts || ev.T < 1.5 || ev.P >= 0.45 || ev.parts.pOpen * ev.parts.pClear < 0.6) continue;
            const go = b.startThrow(a, s, ev);
            if (go) { b.pullDown = () => false; rec = { forced: true, t: +s.t.toFixed(2), route: r.behavior.route.id, depth: +((r.pos.x - s.los) * dir).toFixed(1), P: +ev.P.toFixed(3), pOpen: +ev.parts.pOpen.toFixed(2), pClear: +ev.parts.pClear.toFixed(2), pAcc: +ev.parts.pAcc.toFixed(2), int: +ev.intRisk.toFixed(3), T: +ev.T.toFixed(2), r }; return go; }
          }
        }
        return upd(a, s);
      };
    }
    tick(); track();
  };
  const tb = sim.throwBall.bind(sim);
  sim.throwBall = (qb: any, target: any, v0: any, intended: any, arrivalT: number, throwaway = false, ...rest: any[]) => {
    if (qb === sim.qb && target && !throwaway) {
      if (rec && !rec.thrown) { rec.thrown = target === rec.r; rec.air = +Math.hypot(intended.x - qb.pos.x, intended.y - qb.pos.y).toFixed(1); rec.rel = +sim.t.toFixed(2); rec.aim = { x: intended.x, y: intended.y }; rec.arriveAt = arrivalT; }
      else if (!rec && (target.pos.x - sim.los) * dir >= 12) { const tr = qb.behavior?.throwRec; rec = { forced: false, thrown: true, t: +sim.t.toFixed(2), route: target.behavior?.route?.id ?? '?', depth: +((target.pos.x - sim.los) * dir).toFixed(1), P: tr ? +tr.P.toFixed(3) : null, pOpen: tr?.parts ? +tr.parts.pOpen.toFixed(2) : null, pClear: tr?.parts ? +tr.parts.pClear.toFixed(2) : null, pAcc: tr?.parts ? +tr.parts.pAcc.toFixed(2) : null, T: +(arrivalT - sim.t).toFixed(2), air: +Math.hypot(intended.x - qb.pos.x, intended.y - qb.pos.y).toFixed(1), r: target, rel: +sim.t.toFixed(2), aim: { x: intended.x, y: intended.y }, arriveAt: arrivalT }; }
    }
    return tb(qb, target, v0, intended, arrivalT, throwaway, ...rest);
  };
  const res = orig.apply(this);
  if (rec) { const { r, aim, arriveAt, last, facing, lookAt, ...row } = rec; const ev = sim.events.filter((e: any) => ['catch', 'incomplete', 'pbu', 'interception', 'drop', 'deflection', 'miss'].includes(e.type)).map((e: any) => e.type);
    console.log(JSON.stringify({ ...row, arr: rec.arr, ts: rec.ts ?? [], cmp: !!res.stats.completed, picked: !!res.stats.interceptedBy, sacked: !!res.stats.sacked, yards: (res as any).yards ?? null, ball: ev })); }
  return res;
};
const seed = Number(process.argv[2] ?? 101);
const rng = new Rng(seed); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
for (let g = 0; g < Number(process.argv[3] ?? 8); g++) simulateGame(home, away, { seed: seed + g });

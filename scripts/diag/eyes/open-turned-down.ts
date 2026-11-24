// QB lane 2026-11-23 (the user's film: "turned down a LOT of wide open throws"; measurement only).
// League games; every dropback. Every 0.25 s (and on each read change) while he holds the ball after the snap, for every
// receiver: wide open by geometry (truth: nearest defender 4+ yd and no defender within 2 yd of the throwing lane), his
// head on him (within EYES_DEG of the bearing), where he is in the read order, the price he gives him (P, pick risk,
// against his bar), the term that sets it and the defender who closes it, the footwork gate, the pressure. Every tick:
// his head's angle to each receiver (for eyes-on timing). At each throw: the decision (windup start) and the release.
//   node --import tsx scripts/diag/eyes/open-turned-down.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { flightBreakOf } from '../../../src/sim/behaviors/defense.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const EYES_DEG = 15;
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
const segDist = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = b.x - a.x, dy = b.y - a.y, L = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / L));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};
let playNo = 0;
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  playNo++;
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const samples: any[] = [], heads: any[] = []; let relSnap: any = null; let decision: any = null, release: any = null, hooked = false, nextT = 0, lastRead: any = null;
  const tick0 = sim.tick.bind(sim);
  sim.tick = () => {
    const b0: any = sim.qb.behavior;
    if (!hooked && b0?.kind === 'qb-pass') { hooked = true;
      const st = b0.startThrow.bind(b0);
      b0.startThrow = (a: any, s: any, ev: any) => { if (!decision) decision = { t: +s.t.toFixed(2), slot: ev.target.slot, P: +ev.P.toFixed(3), iR: +ev.intRisk.toFixed(3) }; return st(a, s, ev); };
      const tb = sim.throwBall.bind(sim);
      sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => {
        if (p === sim.qb && !release && intended) relSnap = { t: sim.t, pt: { x: intended.x, y: intended.y }, defs: sim.defense.map((d: any) => ({ idx: d.idx, slot: d.slot, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y, kind: d.behavior?.kind ?? null, man: d.behavior?.target?.slot ?? null })) };
        if (p === sim.qb && !release) { const hd = sim.qb.head ?? sim.qb.body.facing, deg = (x: number) => +(Math.abs(wrap(x)) * 180 / Math.PI).toFixed(1);
          const bA = intended ? Math.atan2(intended.y - p.pos.y, intended.x - p.pos.x) : null, bR = target ? Math.atan2(target.pos.y - p.pos.y, target.pos.x - p.pos.x) : null;
          release = { t: +sim.t.toFixed(2), slot: target?.slot ?? null, away: !!away || !target, headAim: bA === null ? null : deg(hd - bA), recvAim: bA === null || bR === null ? null : deg(bR - bA), headRecv: bR === null ? null : deg(hd - bR), air: +(arrivalT - sim.t).toFixed(2) }; } return tb(p, target, v0, intended, arrivalT, away, ...rest); };
    }
    tick0();
    const b: any = sim.qb.behavior, qb = sim.qb;
    if (b?.kind !== 'qb-pass' || sim.carrier !== qb || release || !b.reads) return;
    const recv = sim.offense.filter((o: any) => o !== qb && b.receiverForecasts?.has(o));
    const head = qb.head ?? qb.body.facing;
    // Every tick: his head's angle to each receiver (truth bearing), and his phase.
    const body = qb.body.facing;
    heads.push({ t: +sim.t.toFixed(2), phase: b.phase, a: Object.fromEntries(recv.map((r: any) => [r.slot, +(Math.abs(wrap(head - Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x))) * 180 / Math.PI).toFixed(1)])),
      body: Object.fromEntries(recv.map((r: any) => [r.slot, +(Math.abs(wrap(body - Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x))) * 180 / Math.PI).toFixed(1)])) });
    const cur = b.reads[b.readIdx] ?? null;
    const due = sim.t >= nextT - 1e-9 || cur !== lastRead;
    lastRead = cur;
    if (!due || sim.t < 0.5) return;
    nextT = sim.t + 0.25;
    const u = b.barNow?.u ?? 0, need = b.barNow?.thr ?? null, risk = b.barNow?.maxInt ?? null;
    const row: any = { t: +sim.t.toFixed(2), phase: b.phase, readIdx: b.readIdx, cur: cur?.slot ?? null, u: +u.toFixed(2), need: need && +need.toFixed(3), risk: risk && +risk.toFixed(3), r: [] };
    for (const r of recv) {
      const dNear = Math.min(...sim.defense.map((d: any) => Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y)));
      const dLane = Math.min(...sim.defense.map((d: any) => segDist(d.pos, qb.pos, r.pos)));
      const open = dNear >= 4 && dLane >= 2;
      const idx = b.reads.indexOf(r);
      const ang = Math.abs(wrap(head - Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x))) * 180 / Math.PI;
      const x: any = { slot: r.slot, open, dNear: +dNear.toFixed(1), dLane: +dLane.toFixed(1), idx, ang: +ang.toFixed(0), eyes: ang <= EYES_DEG,
        order: idx < 0 ? 'not-a-read' : idx > b.readIdx ? 'ahead' : idx < b.readIdx ? 'passed' : 'current' };
      if (open) {
        let ready = false; try { ready = b.ready(r, sim); } catch { /* */ }
        x.ready = ready;
        if (ready) {
          b.marginProbe = true; let ev: any = null; try { ev = b.evaluate(qb, sim, r, u); } catch { /* */ } b.marginProbe = false;
          if (ev) {
            x.P = +ev.P.toFixed(3); x.iR = +ev.intRisk.toFixed(4);
            const parts = ev.parts ?? {}; x.parts = Object.fromEntries(Object.entries(parts).map(([k, v]: any) => [k, +(+v).toFixed(3)]));
            const terms = ['pOpen', 'pClear', 'pAcc', 'hands'].filter((k) => parts[k] !== undefined);
            x.low = terms.sort((p, q) => parts[p] - parts[q])[0] ?? null;
            const rows = (b.marginLast ?? []).slice().sort((p: any, q: any) => (q.contest + 5 * (q.iPath + q.iJump + q.iContest)) - (p.contest + 5 * (p.iPath + p.iJump + p.iContest)));
            x.closer = rows[0] ? { slot: rows[0].slot, m: rows[0].m, contest: rows[0].contest, iPath: rows[0].iPath, dTrue: +Math.hypot(sim.defense.find((d: any) => d.slot === rows[0].slot).pos.x - r.pos.x, sim.defense.find((d: any) => d.slot === rows[0].slot).pos.y - r.pos.y).toFixed(1) } : null;
          }
          let step = true; try { step = b.onStep ? b.onStep(qb, r, u, sim.t) : true; } catch { /* */ }
          x.step = step;
        }
      }
      row.r.push(x);
    }
    samples.push(row);
  };
  const res = orig.apply(this);
  const ev = sim.events as any[];
  // Interceptions by the interceptor's state (Integration, engine-93): at the release, his distance to the aim point,
  // his speed and closing speed on it, whether he made a break on this throw (FLIGHT_BREAK's flightBreakOf), and a tip.
  let intState: any = null;
  const ie = ev.find((e) => e.type === 'interception');
  if (ie && relSnap) {
    const d0 = relSnap.defs.find((x: any) => x.idx === ie.a), ag = sim.agents[ie.a];
    if (d0) {
      const dx = relSnap.pt.x - d0.x, dy = relSnap.pt.y - d0.y, L = Math.hypot(dx, dy) || 1, sp = Math.hypot(d0.vx, d0.vy);
      const fb = ag ? flightBreakOf(ag) : null;
      intState = { slot: d0.slot, kind: d0.kind, onTarget: d0.man !== null && d0.man === release?.slot, dist: +L.toFixed(1), speed: +sp.toFixed(1), closing: +((d0.vx * dx + d0.vy * dy) / L).toFixed(1),
        broke: !!fb && fb.t >= relSnap.t - 0.05, tipped: ev.some((e) => e.type === 'deflection' && e.t <= ie.t) };
    }
  }
  console.log(JSON.stringify({ seed, playNo, concept: sim.offCall?.pass?.id ?? null, family: sim.offCall?.pass?.family ?? null, cov: sim.defCall?.coverage?.id ?? null,
    decision, release, sack: ev.some((e) => e.type === 'sack'), scramble: !release && !ev.some((e) => e.type === 'sack'), cmp: !!sim.stats.completed, int: ev.some((e) => e.type === 'interception'), bat: ev.some((e) => e.type === 'deflection' && e.note === 'batted at the line'), intState, yards: res.yards, samples, heads }));
  return res;
};
for (let g = 0; g < games; g++) {
  const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s });
}

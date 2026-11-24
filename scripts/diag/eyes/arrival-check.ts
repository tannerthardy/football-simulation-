// QB lane 2026-11-24 (Integration: the window's arrival against the breaking defender, on HEAD_FOLLOW + FLIGHT_BREAK).
// Measurement only (probe build: the window keeps a row for every defender when marginProbeAll is set). League games.
// At each throw decision: the window's row for every defender (priced margin m = his priced arrival at the catch point
// minus the ball's, from the decision; his priced start blind/react; facingQB in the passer's picture), and each
// defender's truth and picture. Then, from the release: the catch point and the ball's arrival, and for each defender
// within 10 yd of the point at the decision the first time he is within his reach (+0.3) of it (his actual margin
// against the ball's arrival), when he first closes on it (1.5+ yd/s within 45 deg), and whether FLIGHT_BREAK broke him
// on this throw. Outcome: complete, intercepted, the catcher.
//   node --import tsx scripts/diag/eyes/arrival-check.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { flightBreakOf } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let dec: any = null, rel: any = null, hooked = false; const track: Record<number, any[]> = {};
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') {
      hooked = true; const st = b.startThrow.bind(b);
      b.startThrow = (a: any, s: any, ev: any) => {
        if (!dec) {
          b.marginProbe = true; b.marginProbeAll = true; try { b.evaluate(a, s, ev.target, b.barNow?.u ?? 0); } catch { /* */ } b.marginProbe = false; b.marginProbeAll = false;
          dec = { t: s.t, slot: ev.target.slot, T: ev.T, iR: ev.intRisk, P: ev.P, point: { x: ev.point.x, y: ev.point.y }, rows: b.marginLast ?? [],
            defs: s.defense.map((d: any) => { const e = b.mind.estimate(d); return { idx: d.idx, slot: d.slot, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y, kind: d.behavior?.kind ?? null,
              cover: d.behavior?.target?.slot ?? null, reach: d.profile.reach, picx: e.pos.x, picy: e.pos.y, picvx: e.vel.x, picvy: e.vel.y, age: b.mind.pictureAge(d),
              faceQB: +(Math.abs(wrap(d.body.facing - Math.atan2(a.pos.y - d.pos.y, a.pos.x - d.pos.x))) * 180 / Math.PI).toFixed(0) }; }) };
        }
        return st(a, s, ev);
      };
      const tb = sim.throwBall.bind(sim);
      sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => { if (p === sim.qb && !rel && target && intended) rel = { t: sim.t, pt: { x: intended.x, y: intended.y }, arr: arrivalT, slot: target.slot }; return tb(p, target, v0, intended, arrivalT, ...rest); };
    }
    t0();
    if (dec) for (const d of sim.defense) (track[d.idx] ??= []).push([sim.t, d.pos.x, d.pos.y, d.vel.x, d.vel.y]);
  };
  const res = orig.apply(this);
  if (dec && rel && rel.slot === dec.slot) {
    const ev = sim.events as any[], ie = ev.find((e) => e.type === 'interception');
    const defs = dec.defs.filter((d: any) => Math.hypot(d.x - rel.pt.x, d.y - rel.pt.y) <= 10).map((d: any) => {
      const row = dec.rows.find((r: any) => r.slot === d.slot) ?? null, tr = track[d.idx] ?? [];
      const reachAt = tr.find((s) => s[0] >= dec.t && Math.hypot(s[1] - rel.pt.x, s[2] - rel.pt.y) <= d.reach + 0.3);
      const leave = tr.find((s) => { if (s[0] < dec.t) return false; const ux = rel.pt.x - s[1], uy = rel.pt.y - s[2], L = Math.hypot(ux, uy) || 1, sp = Math.hypot(s[3], s[4]), vt = (s[3] * ux + s[4] * uy) / L; return vt >= 1.5 && sp > 0 && vt / sp >= 0.7; });
      const ag = sim.agents[d.idx], fb = ag ? flightBreakOf(ag) : null;
      return { slot: d.slot, kind: d.kind, covers: d.cover === dec.slot, faceQB: d.faceQB, dist: +Math.hypot(d.x - rel.pt.x, d.y - rel.pt.y).toFixed(1),
        picErr: +Math.hypot(d.picx - d.x, d.picy - d.y).toFixed(2), picAge: +d.age.toFixed(2), closeTrue: +(((rel.pt.x - d.x) * d.vx + (rel.pt.y - d.y) * d.vy) / (Math.hypot(rel.pt.x - d.x, rel.pt.y - d.y) || 1)).toFixed(2), closePic: +(((rel.pt.x - d.picx) * d.picvx + (rel.pt.y - d.picy) * d.picvy) / (Math.hypot(rel.pt.x - d.picx, rel.pt.y - d.picy) || 1)).toFixed(2), speedTrue: +Math.hypot(d.vx, d.vy).toFixed(2), speedPic: +Math.hypot(d.picvx, d.picvy).toFixed(2), priced: row ? { m: row.m, blind: row.blind, react: row.react, facingQB: row.facingQB, contest: row.contest, first: row.first, deepZone: row.deepZone, roof: row.roof, carry: row.carry, under: row.under, dTgt: row.dTgt, total: row.total, rushTerm: row.rushTerm, est: row.est, tt: row.tt, closeState: row.closeState, tied: row.tied } : null,
        actualMargin: reachAt ? +(reachAt[0] - rel.arr).toFixed(2) : null, nearAtRelease: (() => { const s0 = tr.find((s) => s[0] >= rel.t - 1e-9); return s0 ? +Math.hypot(s0[1] - rel.pt.x, s0[2] - rel.pt.y).toFixed(1) : null; })(), minDist: tr.length ? +Math.min(...tr.filter((s) => s[0] <= rel.arr + 0.1).map((s) => Math.hypot(s[1] - rel.pt.x, s[2] - rel.pt.y))).toFixed(1) : null, leaveVsRelease: leave ? +(leave[0] - rel.t).toFixed(2) : null,
        broke: !!fb && fb.t >= rel.t - 0.05, interceptor: !!ie && ie.a === d.idx };
    });
    console.log(JSON.stringify({ seed, t: +dec.t.toFixed(2), rel: +rel.t.toFixed(2), flight: +(rel.arr - rel.t).toFixed(2), cmp: !!sim.stats.completed, int: !!ie, defs }));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }); simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }

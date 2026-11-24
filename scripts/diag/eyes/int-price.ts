// QB lane 2026-11-24 (Integration, engine-93: interceptions by the interceptor's state; does the price see the break?).
// Measurement only. League games. At every throw decision (startThrow), the window's per-defender rows for the throw he
// chose (re-evaluated with the margin probe: m, the start he priced (blind, react), facingQB in his picture, contest,
// jump and path terms), the priced pick risk, and each defender's true facing to the passer. On each interception: the
// interceptor's row (or that he was not priced as a threat at all), his truth at the decision and at the release, and
// when he first turned toward the catch point after the windup.
//   node --import tsx scripts/diag/eyes/int-price.ts <seed> <games> > rows.jsonl
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
          b.marginProbe = true; let e2: any = null; try { e2 = b.evaluate(a, s, ev.target, b.barNow?.u ?? 0); } catch { /* */ } b.marginProbe = false;
          dec = { t: s.t, slot: ev.target.slot, iR: ev.intRisk, P: ev.P, point: { x: ev.point.x, y: ev.point.y }, rows: b.marginLast ?? [],
            defs: s.defense.map((d: any) => { const e = b.mind.estimate(d); return { pic: { x: e.pos.x, y: e.pos.y, vx: e.vel.x, vy: e.vel.y, age: b.mind.pictureAge(d), spread: b.mind.pictureSpread?.(d) ?? null }, idx: d.idx, slot: d.slot, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y, kind: d.behavior?.kind ?? null, cover: d.behavior?.target?.slot ?? null,
              faceQB: +(Math.abs(wrap(d.body.facing - Math.atan2(a.pos.y - d.pos.y, a.pos.x - d.pos.x))) * 180 / Math.PI).toFixed(0) }; }) };
          void e2;
        }
        return st(a, s, ev);
      };
      const tb = sim.throwBall.bind(sim);
      sim.throwBall = (p: any, target: any, v0: any, intended: any, ...rest: any[]) => { if (p === sim.qb && !rel && target) rel = { t: sim.t, pt: intended ? { x: intended.x, y: intended.y } : null }; return tb(p, target, v0, intended, ...rest); };
    }
    t0();
    if (dec && (!rel || sim.t <= rel.t + 1.5)) for (const d of sim.defense) (track[d.idx] ??= []).push([+sim.t.toFixed(2), d.pos.x, d.pos.y, d.vel.x, d.vel.y]);
  };
  const res = orig.apply(this);
  const ev = sim.events as any[], ie = ev.find((e) => e.type === 'interception');
  if (dec) {
    const out: any = { seed, t: +dec.t.toFixed(2), rel: rel ? +rel.t.toFixed(2) : null, iR: +dec.iR.toFixed(4), P: +dec.P.toFixed(3), int: !!ie };
    if (ie) {
      const d = dec.defs.find((x: any) => x.idx === ie.a), row = d ? dec.rows.find((x: any) => x.slot === d.slot) : null, ag = sim.agents[ie.a];
      const pt = rel?.pt ?? dec.point; let turn: number | null = null;
      for (const s of track[ie.a] ?? []) {
        if (s[0] < dec.t) continue;
        const ux = pt.x - s[1], uy = pt.y - s[2], L = Math.hypot(ux, uy) || 1, vt = (s[3] * ux + s[4] * uy) / L, sp = Math.hypot(s[3], s[4]);
        if (vt >= 1.5 && sp > 0 && vt / sp >= 0.7) { turn = +(s[0] - dec.t).toFixed(2); break; }
      }
      const fb = ag ? flightBreakOf(ag) : null;
      out.who = d ? { picErr: +Math.hypot(d.pic.x - d.x, d.pic.y - d.y).toFixed(2), picVelErr: +Math.hypot(d.pic.vx - d.vx, d.pic.vy - d.vy).toFixed(2), picAge: +d.pic.age.toFixed(2), picSpread: d.pic.spread, picToPoint: +Math.hypot(pt.x - d.pic.x, pt.y - d.pic.y).toFixed(1), slot: d.slot, kind: d.kind, coversTarget: d.cover === dec.slot, faceQBdeg: d.faceQB, distToPoint: +Math.hypot(pt.x - d.x, pt.y - d.y).toFixed(1),
        priced: row ? { m: row.m, blind: row.blind, react: row.react, wind: row.wind, facingQB: row.facingQB, contest: row.contest, first: row.first, iPath: row.iPath, iJump: row.iJump, iContest: row.iContest } : null,
        turnAfterDecision: turn, windup: rel ? +(rel.t - dec.t).toFixed(2) : null, brokeOnThrow: !!fb && rel !== null && fb.t >= rel.t - 0.05,
        tipped: ev.some((e) => e.type === 'deflection' && e.t <= ie.t) } : null;
    }
    console.log(JSON.stringify(out));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) {
  const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s });
}

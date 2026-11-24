// QB lane 2026-11-24 (Integration's leak control before the window-arrival build). Does the thrown receiver's coverer
// close on the spot earlier than coverers of receivers who are NOT thrown to, at the same route phase? Same operator for
// every receiver: at the passer's throw decision, each receiver on a route, his coverer = the nearest defender within
// 4 yd (DEF_BELIEF's definition), the spot = that receiver's own position at the ball's arrival time (the play's real
// arrival, so the same horizon for thrown and not thrown). Closing = the coverer's velocity toward the spot, averaged over
// the windup (decision to release) and over the first 0.3 s after the release. Route phase = decision minus the
// receiver's break (stop: under half his peak speed after the peak; others: sharpest turn > 25 deg over +-0.2 s at
// > 2 yd/s). Sight: the coverer's head (or body) within 100 deg of the passer at the decision, the only way a legitimate
// eye/load cue can reach him. The passer picks the man whose coverer is not closing, so the test is the change from
// each coverer's own baseline (closing over the 0.3 s before the decision) into the windup and after the release. Run with FLIGHT_BREAK=0 and on. Measurement only.
//   node --import tsx scripts/diag/eyes/leak-control.ts <seed> <games> > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const FAM: Record<string, string> = { hitch: 'stop', quick_hitch: 'stop', hook: 'stop', curl: 'stop', comeback: 'stop', stick: 'stop',
  quick_out: 'out', out: 'out', corner: 'out', back_out: 'out', dig: 'in', slant: 'in', short_in: 'in', post: 'in',
  cross: 'cross', shallow: 'cross', shallow_high: 'cross', mesh_under: 'cross', go: 'vertical', seam: 'vertical' };
const wrap = (x: number) => Math.atan2(Math.sin(x), Math.cos(x));
type S = [number, number, number, number, number];
function breakAt(tr: S[], fam: string, tEnd: number): number | null {
  const P = tr.filter((s) => s[0] <= tEnd + 0.3); if (P.length < 8) return null;
  const sp = P.map((s) => Math.hypot(s[3], s[4]));
  if (fam === 'stop') {
    let kp = 3; for (let k = 3; k < P.length; k++) if (sp[k] > sp[kp]) kp = k;
    for (let k = kp + 1; k < P.length; k++) if (sp[k] < 0.5 * sp[kp]) return P[k][0];
    return null;
  }
  if (fam === 'vertical') return null;
  let best = 0, kb = -1; const w = 2;
  for (let k = Math.max(3, w); k < P.length - w; k++) {
    if (sp[k - w] < 2 || sp[k + w] < 2) continue;
    const d = Math.abs(wrap(Math.atan2(P[k + w][4], P[k + w][3]) - Math.atan2(P[k - w][4], P[k - w][3])));
    if (d > best) { best = d; kb = k; }
  }
  return kb >= 0 && best > 25 * Math.PI / 180 ? P[kb][0] : null;
}
PlaySim.prototype.run = ((orig) => function (this: any) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let dec: any = null, rel: any = null, hooked = false, lastT = -1; const track: Record<number, S[]> = {};
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    const b: any = sim.qb.behavior;
    if (!hooked && b?.kind === 'qb-pass') {
      hooked = true; const st = b.startThrow.bind(b);
      b.startThrow = (a: any, s: any, ev: any) => {
        if (!dec) {
          const qb = sim.qb;
          dec = { t: s.t, target: ev.target?.idx ?? null, qb: { x: qb.pos.x, y: qb.pos.y }, head: qb.head ?? qb.body.facing,
            cov: sim.offense.map((r: any) => {
              const rid = r.behavior?.route?.id; if (!rid || r === qb) return null;
              let best: any = null, bd = 4;
              for (const d of sim.defense) { const dd = Math.hypot(d.pos.x - r.pos.x, d.pos.y - r.pos.y); if (dd <= bd) { bd = dd; best = d; } }
              if (!best) return { r: r.idx, rid, c: null };
              const look = best.head ?? best.body.facing, toQB = Math.atan2(qb.pos.y - best.pos.y, qb.pos.x - best.pos.x);
              return { r: r.idx, rid, c: best.idx, kind: best.behavior?.kind ?? null, man: best.behavior?.target === r, gap: +bd.toFixed(2),
                sees: Math.abs(wrap(look - toQB)) <= 100 * Math.PI / 180,
                qbLook: +(Math.abs(wrap((qb.head ?? qb.body.facing) - Math.atan2(r.pos.y - qb.pos.y, r.pos.x - qb.pos.x))) * 180 / Math.PI).toFixed(0) };
            }).filter(Boolean) };
        }
        return st(a, s, ev);
      };
      const tb = sim.throwBall.bind(sim);
      sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => { if (p === sim.qb && !rel && target && intended) rel = { t: sim.t, arr: arrivalT }; return tb(p, target, v0, intended, arrivalT, ...rest); };
    }
    t0();
    if (sim.t - lastT >= 0.099) { lastT = sim.t; for (const a of sim.agents) (track[a.idx] ??= []).push([sim.t, a.pos.x, a.pos.y, a.vel.x, a.vel.y]); }
  };
  const res = orig.apply(this);
  if (dec && rel && dec.target !== null) {
    const at = (tr: S[], t: number) => tr.reduce((b, s) => Math.abs(s[0] - t) < Math.abs(b[0] - t) ? s : b, tr[0]);
    const close = (tr: S[], spot: { x: number; y: number }, a: number, b: number) => {
      const W = tr.filter((s) => s[0] >= a - 1e-6 && s[0] <= b + 1e-6); if (!W.length) return null;
      return +(W.reduce((acc, s) => { const ux = spot.x - s[1], uy = spot.y - s[2], L = Math.hypot(ux, uy) || 1; return acc + (s[3] * ux + s[4] * uy) / L; }, 0) / W.length).toFixed(2);
    };
    const rows = dec.cov.map((c: any) => {
      const fam = FAM[String(c.rid).split(':').pop() as string] ?? 'other', rt = track[c.r] ?? []; if (!rt.length) return null;
      const end = at(rt, rel.arr), spot = { x: end[1], y: end[2] }, brk = breakAt(rt, fam, rel.arr);
      const row: any = { thrown: c.r === dec.target, fam, rid: c.rid, phase: brk === null ? null : +(dec.t - brk).toFixed(2), windup: +(rel.t - dec.t).toFixed(2), H: +(rel.arr - dec.t).toFixed(2), c: c.c !== null };
      if (c.c === null) return row;
      const ct = track[c.c] ?? [], c0 = at(ct, dec.t);
      return { ...row, kind: c.kind, man: c.man, gap: c.gap, sees: c.sees, qbLook: c.qbLook, dSpot: +Math.hypot(c0[1] - spot.x, c0[2] - spot.y).toFixed(1),
        closeBase: close(ct, spot, dec.t - 0.3, dec.t - 0.05), closeWind: close(ct, spot, dec.t, rel.t), closePost: close(ct, spot, rel.t, rel.t + 0.3), closeRecvWind: close(ct, { x: at(rt, rel.t)[1], y: at(rt, rel.t)[2] }, dec.t, rel.t) };
    }).filter(Boolean);
    console.log(JSON.stringify({ seed: sim.seed ?? null, dec: +dec.t.toFixed(2), rows }));
  }
  return res;
})(PlaySim.prototype.run);
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 }); simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }

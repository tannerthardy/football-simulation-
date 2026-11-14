// BALL_EST design 5 measurement: the receiver's final approach on thrown non-screen passes with the target 3+ yd
// from the nearest defender at the end. Groups: caught; "reachable but missed" (the ball's true closest-pass point was
// reachable from his state 0.5 s before it, timeToReach to his catch reach, and he did not catch it); other misses.
// (1) Throttle: his mean speed over the last 0.6 s before the closest pass as a fraction of his speed at the release
//     ("route speed"), and his speed at the pass; the miss at the closest pass split along his running direction
//     (+ = the ball passed ahead of him: late) and across it (wide), horizontal yards.
// (2) Convergence: his estimated catch spot's horizontal error from the ball's true closest-pass point at 0.6 / 0.4 /
//     0.2 / 0.1 s before the pass, split along his line of sight to the ball then (depth) and across it (lateral).
// usage: BALL_EST=1 npx tsx scripts/diag/risk/final-approach.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
import { timeToReach } from '../../../src/physics/reach.js';
import { TRACKING_REACH_BONUS } from '../../../src/sim/catching.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.ball.securing && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, b = this.ball.flight.pos;
    const S = this.__fa ?? (this.__fa = { T, hist: [], air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team) });
    const e = this.ballEstimates.peek(T, this), c = e.length ? catchSpot(T, { t: this.t, ballPath: e }) : null;
    S.hist.push({ t: this.t, pos: { ...T.pos }, vel: { ...T.vel }, b: { ...b }, spot: c ? c.p : null, path: e.length ? e.map((p: any) => ({ t: p.t, x: p.x, y: p.y })) : null });
  }
  const S = this.__fa;
  if (S && S.sep === undefined && (this.ball.kind !== 'air' || this.ball.securing)) {
    const D = this.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - S.T.pos.x, d.pos.y - S.T.pos.y) < Math.hypot(m.pos.x - S.T.pos.x, m.pos.y - S.T.pos.y) ? d : m);
    S.sep = Math.hypot(D.pos.x - S.T.pos.x, D.pos.y - S.T.pos.y);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__fa; this.__fa = undefined;
  if (!S || !(S.sep >= 3) || S.hist.length < 4) return res;
  const T = S.T, H = S.hist, reach = T.profile.reach + TRACKING_REACH_BONUS;
  let k = 0; H.forEach((h: any, i: number) => { if (Math.hypot(h.b.x - h.pos.x, h.b.y - h.pos.y) < Math.hypot(H[k].b.x - H[k].pos.x, H[k].b.y - H[k].pos.y)) k = i; });
  const c = H[k], at = (dt: number) => [...H].reverse().find((h: any) => h.t <= c.t - dt + 1e-6);
  const e5 = at(0.5);
  const reachable = e5 ? timeToReach({ pos: e5.pos, vel: e5.vel, profile: T.profile, speedScale: T.speedScale }, { x: c.b.x, y: c.b.y }, reach) <= c.t - e5.t + 1e-6 : null;
  const v0 = Math.hypot(H[0].vel.x, H[0].vel.y);
  const W = H.filter((h: any) => h.t >= c.t - 0.6 - 1e-6 && h.t <= c.t + 1e-6);
  const mean = W.reduce((a: number, h: any) => a + Math.hypot(h.vel.x, h.vel.y), 0) / Math.max(1, W.length);
  const sp = Math.hypot(c.vel.x, c.vel.y), ux = sp > 0.5 ? c.vel.x / sp : 1, uy = sp > 0.5 ? c.vel.y / sp : 0;
  const ox = c.b.x - c.pos.x, oy = c.b.y - c.pos.y;
  const conv: any = {};
  for (const dt of [0.6, 0.4, 0.2, 0.1]) {
    const h = at(dt); if (!h?.spot) continue;
    const lx = c.b.x - h.pos.x, ly = c.b.y - h.pos.y, l = Math.hypot(lx, ly) || 1;
    const ex = h.spot.x - c.b.x, ey = h.spot.y - c.b.y;
    // His estimated ball position at the true pass time (independent of which point he chose to steer to).
    const pp = h.path?.find((p: any) => p.t >= c.t - 1e-6) ?? h.path?.at(-1);
    const be = pp ? Math.hypot(pp.x - c.b.x, pp.y - c.b.y) : NaN;
    conv[dt] = { err: Math.hypot(ex, ey), depth: Math.abs((ex * lx + ey * ly) / l), lat: Math.abs((ex * -ly + ey * lx) / l), ball: be };
  }
  const cmp = !!this.stats?.completed;
  rows.push({ grp: cmp ? 'caught' : reachable ? 'reachable but missed' : 'other miss', frac: v0 > 1 ? mean / v0 : NaN, spAt: sp, v0, along: ox * ux + oy * uy, across: Math.abs(-ox * uy + oy * ux), conv, air: S.air });
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: open targets n ${rows.length}`);
for (const g of ['caught', 'reachable but missed', 'other miss']) {
  const V = rows.filter(r => r.grp === g);
  const late = V.filter(r => r.along > Math.max(0.3, r.across)).length, behind = V.filter(r => r.along < -Math.max(0.3, r.across)).length, wide = V.length - late - behind;
  console.log(`   ${g} n ${V.length} | speed last 0.6 s / release speed ${q(V.map(r => r.frac))} | speed at the pass ${q(V.map(r => r.spAt))} (release ${q(V.map(r => r.v0))}) | miss along his run ${q(V.map(r => r.along))} yd (+ ahead), across ${q(V.map(r => r.across))} | ahead (late) ${late}, behind ${behind}, wide ${wide}`);
  console.log(`      estimate's catch-spot error before the pass: ` + [0.6, 0.4, 0.2, 0.1].map(dt => `${dt} s: ${q(V.map(r => r.conv[dt]?.err))} (depth ${q(V.map(r => r.conv[dt]?.depth))}, lateral ${q(V.map(r => r.conv[dt]?.lat))})`).join(' | '));
  console.log(`      his estimated BALL position at the true pass time, error: ` + [0.6, 0.4, 0.2, 0.1].map(dt => `${dt} s: ${q(V.map(r => r.conv[dt]?.ball))}`).join(" | "));
}

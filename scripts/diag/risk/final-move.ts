// BALL_EST receiver gate, stage 2: the body not reaching a nearly right point. For open targets (3+ yd from the nearest
// defender at the flight's end; flights not deflected): per TrackBall tick, the point he steers to (his choice,
// re-read under bit 4), its distance, the time left to it, the speed that needs, the speed he asks for, the speed his
// body has, and whether the 0.5 yd brake fired (asked speed is half his current speed with time still left). At the
// ball's closest pass: his body's distance from that point. Split: caught / body short (0.6+ yd from his point) / other.
// usage: BALL_EST=7 npx tsx scripts/diag/risk/final-move.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { TrackBall } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const TB: any = TrackBall.prototype, u0 = TB.update;
TB.update = function (a: any, sim: any) {
  const cmd = u0.call(this, a, sim);
  const S = sim.__fm;
  if (S && a === S.T && sim.ball.kind === 'air' && this.choice) {
    // The point he steers to: under bit 4 his chosen moment re-read on his current estimate (read-only peek), as
    // TrackBall does; else the frozen choice.
    let p = this.choice.p;
    if ((Number(process.env.BALL_EST ?? 0) & 4) !== 0) { const est = sim.ballEstimates.peek(a, sim); const at = est.find((q: any) => q.t >= this.choice.t - 1e-6) ?? est[est.length - 1]; if (at) p = { x: at.x, y: at.y }; }
    const left = this.choice.t - sim.t, dist = Math.hypot(p.x - a.pos.x, p.y - a.pos.y);
    const ask = Math.hypot(cmd.vel.x, cmd.vel.y), have = Math.hypot(a.vel.x, a.vel.y);
    const hd = sim.ballEstimates.headOf(a), bp = sim.ball.flight.pos, bv = sim.ball.flight.vel, bl = Math.hypot(bv.x, bv.y) || 1;
    const inEye = hd !== undefined && Math.abs(Math.atan2(Math.sin(Math.atan2(bp.y - a.pos.y, bp.x - a.pos.x) - hd), Math.cos(Math.atan2(bp.y - a.pos.y, bp.x - a.pos.x) - hd))) <= Math.PI / 6;
    const est0 = sim.ballEstimates.peek(a, sim);
    if (S.fixT === undefined && this.choice.t - sim.t <= 0.4 + 1e-6) S.fixT = this.choice.t;
    const atFix = S.fixT !== undefined ? (est0.find((q: any) => q.t >= S.fixT - 1e-6) ?? est0[est0.length - 1]) : undefined;
    S.log.push({ chT: this.choice.t, fx: atFix?.x, fy: atFix?.y, inEye, ux: bv.x / bl, uy: bv.y / bl, t: sim.t, left, dist, need: dist / Math.max(0.05, left), ask, have, brake: dist < 0.5 && left > 0.1 && Math.abs(ask - 0.5 * have) < 0.05, px: p.x, py: p.y, vmax: a.profile.vmax });
  }
  return cmd;
};
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__fm && this.ball.target && !this.ball.throwaway) this.__fm = { T: this.ball.target, best: Infinity, log: [] as any[] };
  const S = this.__fm;
  if (S && this.ball.kind === 'air') {
    if (this.ball.deflected) S.deflected = true;
    const b = this.ball.flight.pos, d = Math.hypot(b.x - S.T.pos.x, b.y - S.T.pos.y);
    if (d < S.best) { S.best = d; S.tBest = this.t; S.posBest = { ...S.T.pos }; }
    let near = Infinity; for (const x of this.defense) near = Math.min(near, Math.hypot(x.pos.x - S.T.pos.x, x.pos.y - S.T.pos.y)); S.near = near;
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__fm; this.__fm = undefined;
  if (!S || S.deflected || S.near < 3 || !S.log.length || S.tBest === undefined) return res;
  const L = S.log, last = [...L].reverse().find((x: any) => x.t <= S.tBest + 1e-6) ?? L[L.length - 1];
  const at4 = [...L].reverse().find((x: any) => x.t <= S.tBest - 0.4 + 1e-6);
  const bodyOff = Math.hypot(last.px - S.posBest.x, last.py - S.posBest.y);
  const moved = at4 ? Math.hypot(last.px - at4.px, last.py - at4.py) : undefined;
  const latMove = at4 ? Math.abs(-(last.px - at4.px) * at4.uy + (last.py - at4.py) * at4.ux) : undefined;
  const aloMove = at4 ? Math.abs((last.px - at4.px) * at4.ux + (last.py - at4.py) * at4.uy) : undefined;
  // The moment moving vs the estimate moving: change in his chosen moment over the last 0.4 s; and the movement of his
  // estimate's ball position at one fixed moment (the one chosen 0.4 s out), lateral and along.
  const chMove = at4 ? Math.abs(last.chT - at4.chT) : undefined;
  const f0 = L.find((x: any) => x.fx !== undefined), f1 = [...L].reverse().find((x: any) => x.fx !== undefined && x.t <= S.tBest + 1e-6);
  const fLat = f0 && f1 ? Math.abs(-(f1.fx - f0.fx) * f0.uy + (f1.fy - f0.fy) * f0.ux) : undefined;
  const fAlo = f0 && f1 ? Math.abs((f1.fx - f0.fx) * f0.ux + (f1.fy - f0.fy) * f0.uy) : undefined;
  const w5 = L.filter((x: any) => x.t >= S.tBest - 0.5 && x.t <= S.tBest); const eyeShare = w5.length ? w5.filter((x: any) => x.inEye).length / w5.length : undefined;
  const late = L.filter((x: any) => x.t >= S.tBest - 0.5);
  rows.push({ chMove, fLat, fAlo, latMove, aloMove, eyeShare, cmp: !!this.stats?.completed, bodyOff, moved, brake: late.some((x: any) => x.brake), ratio4: at4 ? at4.ask / Math.max(0.1, at4.need) : undefined, need4: at4?.need, ask4: at4?.ask, have4: at4?.have, vmax: last.vmax, needOverMax: at4 ? at4.need / at4.vmax : undefined, dist4: at4?.dist });
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: any[]) => { v = v.filter((x) => x !== undefined && Number.isFinite(x)).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
const sh = (V: any[], f: (r: any) => boolean) => V.length ? `${(100 * V.filter(f).length / V.length).toFixed(0)}%` : '-';
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: open targets with a chosen point n ${rows.length}`);
for (const [lab, f] of [['caught', (r: any) => r.cmp], ['not caught, body short of his point (0.6+ yd)', (r: any) => !r.cmp && r.bodyOff >= 0.6], ['not caught, body on his point', (r: any) => !r.cmp && r.bodyOff < 0.6]] as const) {
  const V = rows.filter(f);
  console.log(`   ${lab}: n ${V.length} | body off his point at the closest pass ${q(V.map(r => r.bodyOff))} | his point moved in the last 0.4 s ${q(V.map(r => r.moved))} | 0.4 s out: distance ${q(V.map(r => r.dist4))}, need ${q(V.map(r => r.need4))}, asked ${q(V.map(r => r.ask4))}, has ${q(V.map(r => r.have4))} yd/s, need over his top speed ${q(V.map(r => r.needOverMax))}, asked/need ${q(V.map(r => r.ratio4))} | 0.5 yd brake fired in the last 0.5 s ${sh(V, r => r.brake)}`);
}
for (const [lab, f] of [['ball in his eyes all of the last 0.5 s', (r: any) => r.eyeShare === 1], ['ball out of his eyes some of the last 0.5 s', (r: any) => r.eyeShare !== undefined && r.eyeShare < 1]] as const) {
  const V = rows.filter(f);
  console.log(`   ${lab}: n ${V.length} | caught ${sh(V, r => r.cmp)} | his point moved in the last 0.4 s: lateral ${q(V.map(r => r.latMove))}, along ${q(V.map(r => r.aloMove))} yd | his chosen moment moved ${q(V.map(r => r.chMove))} s | his estimate at a fixed moment moved: lateral ${q(V.map(r => r.fLat))}, along ${q(V.map(r => r.fAlo))} yd`);
}
console.log(`   all: chosen moment moved ${q(rows.map(r => r.chMove))} s | estimate at a fixed moment: lateral ${q(rows.map(r => r.fLat))}, along ${q(rows.map(r => r.fAlo))} | caught ${q(rows.filter(r => r.cmp).map(r => r.fLat))} / missed ${q(rows.filter(r => !r.cmp).map(r => r.fLat))} lateral`);
console.log(`   all: point movement in the last 0.4 s lateral ${q(rows.map(r => r.latMove))}, along ${q(rows.map(r => r.aloMove))} | caught: lateral ${q(rows.filter(r => r.cmp).map(r => r.latMove))} | missed: lateral ${q(rows.filter(r => !r.cmp).map(r => r.latMove))}`);

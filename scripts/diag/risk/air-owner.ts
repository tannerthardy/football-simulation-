// Who owns the targeted receiver's feet from the throw to the catch: the share of in-flight ticks his command came from
// his route runner (route, craft and spacing holds) rather than his ball tracking; his closest pass of the ball; outcome.
// usage: [BALL_EST=... CRAFT_HOLD=0|1 SPACING_HOLD=0|1] npx tsx scripts/diag/risk/air-owner.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const RR: any = RouteRunner.prototype, rr0 = RR.update;
let routeCalled = new Set<any>();
RR.update = function (a: any, sim: any) { if (sim.ball?.kind === 'air') routeCalled.add(a); return rr0.call(this, a, sim); };
P.tick = function () {
  routeCalled = new Set();
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && this.__ao === undefined && this.ball.target && !this.ball.throwaway) this.__ao = { T: this.ball.target, rel: this.t, ticks: 0, route: 0, min: Infinity, aim: this.ball.intended ? { x: this.ball.intended.x, y: this.ball.intended.y } : null };
  const S = this.__ao;
  if (S && S.end === undefined) {
    if (this.ball.kind === 'air') {
      S.ticks++; if (routeCalled.has(S.T)) S.route++;
      const b = this.ball.flight?.pos;
      if (b && b.z >= 0.1 && b.z <= S.T.profile.maxCatchHeight) {
        const dd = Math.hypot(b.x - S.T.pos.x, b.y - S.T.pos.y);
        if (dd < S.min) { S.min = dd; S.atMin = { x: S.T.pos.x, y: S.T.pos.y }; S.seenAtMin = (this.ballEstimates?.samplesOf?.(S.T) ?? 0) > 0; }
      }
    }
    if (this.ball.kind !== 'air' || this.ball.securing) {
      let sep = Infinity; for (const d of this.defense) sep = Math.min(sep, Math.hypot(d.pos.x - S.T.pos.x, d.pos.y - S.T.pos.y));
      S.end = this.t; S.sep = sep; S.flight = this.t - S.rel;
    }
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__ao;
  if (S?.end !== undefined) rows.push({ flight: S.flight, sep: S.sep, share: S.ticks ? S.route / S.ticks : 0, min: S.min, reach: S.T.profile.reach + 0.3, cmp: !!this.stats?.completed, aimErr: S.aim && S.atMin ? Math.hypot(S.aim.x - S.atMin.x, S.aim.y - S.atMin.y) : NaN, seen: !!S.seenAtMin, route: S.T.behavior?.fallback?.route?.name ?? S.T.behavior?.route?.name ?? '?' });
  this.__ao = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.floor(v.length / 2)].toFixed(2) : '-'; };
const pc = (n: number, d: number) => d ? `${(100 * n / d).toFixed(0)}%` : '-';
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 'default'} CRAFT_HOLD=${process.env.CRAFT_HOLD ?? 'default'} SPACING_HOLD=${process.env.SPACING_HOLD ?? 'default'}: targets n ${rows.length}, complete ${pc(rows.filter(r => r.cmp).length, rows.length)}`);
for (const [a, b] of [[0, 0.9], [0.9, 1.3], [1.3, 1.8], [1.8, 9]]) {
  const V = rows.filter(r => r.flight >= a && r.flight < b), O = V.filter(r => r.sep >= 3);
  console.log(`   flight ${a}-${b} s: n ${V.length} complete ${pc(V.filter(r => r.cmp).length, V.length)} | route-owned share of air ticks p50 ${med(V.map(r => r.share))} | never in reach ${pc(V.filter(r => r.min > r.reach).length, V.length)} | closest pass p50 ${med(V.map(r => r.min))} | open 3+ caught ${pc(O.filter(r => r.cmp).length, O.length)} (n ${O.length}) | aim-to-receiver at closest pass p50 ${med(V.map(r => r.aimErr))} | never in reach: before his first sample ${V.filter(r => r.min > r.reach && !r.seen).length}, after ${V.filter(r => r.min > r.reach && r.seen).length}`);
}

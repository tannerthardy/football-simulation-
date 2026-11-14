// BALL_EST: on short throws (<10 intended air yd), why a targeted receiver never samples the ball. Each tick of the
// flight while he attends without a sample: the ball's true bearing off his head and off his body facing, his head off
// his facing (at the neck limit or not), and the QB's seen position off his facing at the release. Classified per
// throw that ends without a sample: (a) the ball beyond his head+eye reach the whole flight (geometry: he would have to
// turn his body), (b) within reach of his neck but his head pointed elsewhere (his believed ball position wrong),
// (c) within his eye range at some tick but no sample (a sampling defect), (d) the flight too short for his delay.
// usage: BALL_EST=1 npx tsx scripts/diag/risk/no-sample.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
const ad = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const deg = (a: number) => Math.abs(ad(a)) * 180 / Math.PI;
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.ball.securing && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target;
    const S = this.__ns ?? (this.__ns = { rel: this.ball.releaseT, air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team), T, ticks: [],
      qbOff: deg(Math.atan2(this.qb.pos.y - T.pos.y, this.qb.pos.x - T.pos.x) - T.facing), route: String(T.behavior?.fallback?.route?.id ?? T.behavior?.route?.id ?? '-') });
    const tr = this.ballEstimates.tracks.get(T);
    if (tr && !tr.samples.length) {
      const b = this.ball.flight.pos, brg = Math.atan2(b.y - T.pos.y, b.x - T.pos.x);
      const pk = this.ballEstimates.peek(T, this); const bel = pk.length ? Math.atan2(pk[0].y - T.pos.y, pk[0].x - T.pos.x) : NaN;
      S.ticks.push({ offBody: deg(brg - T.facing), offHead: deg(brg - tr.head), headOff: deg(tr.head - T.facing), belOff: deg(bel - brg), belBody: deg(bel - T.facing), pseudo: tr.pseudo.length });
    }
    S.n = tr ? tr.samples.length : 0; S.end = this.t - S.rel;
  } else if (this.__ns && !this.__ns.done) { this.__ns.done = true; if (this.__ns.air < 10) rows.push(this.__ns); }
  return r;
};
const b0 = P.buildResult; P.buildResult = function () { const res = b0.call(this); this.__ns = undefined; return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const N = rows.filter(r => !r.n);
const cls = (r: any) => {
  if (r.end < 0.3) return 'd: flight under 0.3 s';
  if (r.ticks.some((k: any) => k.offHead <= 30)) return 'c: in eye range, no sample';
  if (r.ticks.every((k: any) => k.offBody > 120)) return 'a: beyond head+eye reach (body turn needed)';
  return 'b: within neck reach, head elsewhere';
};
const m = new Map<string, number>(); for (const r of N) m.set(cls(r), (m.get(cls(r)) ?? 0) + 1);
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(0)).join('/'); };
console.log(`== seed ${seed}: short throws ${rows.length}, never sampled ${N.length}: ` + [...m].map(([k, n]) => `${k} ${n}`).join(' | '));
const B = N.filter(r => cls(r).startsWith('b'));
console.log(`   class b: his head off his facing (max) ${q(B.map(r => Math.max(...r.ticks.map((k: any) => k.headOff))))} deg | his believed ball off the true ball ${q(B.map(r => r.ticks[Math.floor(r.ticks.length / 2)].belOff))} | believed off his facing ${q(B.map(r => r.ticks[Math.floor(r.ticks.length / 2)].belBody))} | pseudo observations ${q(B.map(r => r.ticks[0].pseudo))}`);
console.log(`   never sampled: QB off his facing at the release ${q(N.map(r => r.qbOff))} deg | ball off his body (min over the flight) ${q(N.map(r => Math.min(...r.ticks.map((k: any) => k.offBody))))} | ball off his head (min) ${q(N.map(r => Math.min(...r.ticks.map((k: any) => k.offHead))))} | flight ${q(N.map(r => r.end * 100))} cs | routes ${[...N.reduce((m: any, r: any) => m.set(r.route, (m.get(r.route) ?? 0) + 1), new Map())].sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([k, n]: any) => `${k} ${n}`).join(', ')}`);

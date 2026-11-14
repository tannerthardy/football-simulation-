// BALL_EST: how soon after the release each side holds an estimate and a first sample of the ball, read-only (peek /
// lastSeen do not attend). Thrown non-screen passes; the target and the defender nearest him at the release; by
// intended air yards (<10 / 10+), as seconds after the release and as a fraction of the flight (release to the ball
// leaving the air or being secured).
// usage: BALL_EST=1 npx tsx scripts/diag/risk/first-est.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.ball.securing && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target;
    const S = this.__fe ?? (this.__fe = { rel: this.ball.releaseT, air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team),
      D: this.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y) < Math.hypot(m.pos.x - T.pos.x, m.pos.y - T.pos.y) ? d : m), T, est: {}, seen: {} });
    for (const [k, a] of [['r', S.T], ['d', S.D]] as const) {
      if (S.est[k] === undefined && this.ballEstimates.peek(a, this).length) S.est[k] = this.t - S.rel;
      if (S.seen[k] === undefined && this.ballEstimates.lastSeen(a)) S.seen[k] = this.t - S.rel;
    }
    S.end = this.t - S.rel;
  } else if (this.__fe && !this.__fe.done) { this.__fe.done = true; rows.push(this.__fe); }
  return r;
};
const b0 = P.buildResult; P.buildResult = function () { const res = b0.call(this); this.__fe = undefined; return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
console.log(`== seed ${seed}: thrown passes n ${rows.length}`);
for (const [lab, F] of [['short (<10 air yd)', (r: any) => r.air < 10], ['10+ air yd', (r: any) => r.air >= 10]] as const) {
  const V = rows.filter(F);
  for (const [who, k] of [['receiver', 'r'], ['defender', 'd']] as const)
    console.log(`   ${lab} ${who}: n ${V.length} | first estimate ${q(V.map(r => r.est[k]))} s (${q(V.map(r => r.est[k] / r.end))} of the flight; none ${V.filter(r => r.est[k] === undefined).length}) | first sample ${q(V.map(r => r.seen[k]))} s (none ${V.filter(r => r.seen[k] === undefined).length}) | flight ${q(V.map(r => r.end))} s`);
}

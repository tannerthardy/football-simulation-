// BALL_EST diagnosis: thrown non-screen passes where the target is 3+ yd from the nearest defender when the flight
// ends. For each: the closest the ball came to him (3-D, ball centre to his chest at 0.7 of his height) over the flight,
// his body facing off the ball's incoming direction at that moment, whether he had an estimate (and its error then),
// and the outcome. Split by outcome.
// usage: [BALL_EST=1] npx tsx scripts/diag/risk/open-miss.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const ang = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return Math.abs(a) * 180 / Math.PI; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.ball.securing && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, b = this.ball.flight.pos, S = this.__om ?? (this.__om = { T, best: Infinity, air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team) });
    const d = Math.hypot(b.x - T.pos.x, b.y - T.pos.y, b.z - T.profile.heightYd * 0.7);
    if (d < S.best) {
      S.best = d; const v = this.ball.flight.vel; S.face = ang(T.facing - Math.atan2(-v.y, -v.x));
      const e = this.ballEstimates?.estimate ? (process.env.BALL_EST === '1' ? this.ballEstimates.estimate(T, this) : null) : null;
      S.hasEst = e ? e.length > 0 : null; S.estErr = e && e.length ? Math.hypot(e[0].x - b.x, e[0].y - b.y, e[0].z - b.z) : NaN;
      S.speed = Math.hypot(T.vel.x, T.vel.y);
    }
  }
  const S = this.__om;
  if (S && S.sep === undefined && (this.ball.kind !== 'air' || this.ball.securing)) {
    const D = this.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - S.T.pos.x, d.pos.y - S.T.pos.y) < Math.hypot(m.pos.x - S.T.pos.x, m.pos.y - S.T.pos.y) ? d : m);
    S.sep = Math.hypot(D.pos.x - S.T.pos.x, D.pos.y - S.T.pos.y);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__om;
  if (S && S.sep >= 3) rows.push({ ...S, T: undefined, cmp: !!this.stats?.completed });
  this.__om = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: open targets (3+ yd at the end) n ${rows.length}, caught ${rows.filter(r => r.cmp).length}`);
for (const [lab, V] of [['caught', rows.filter(r => r.cmp)], ['not caught', rows.filter(r => !r.cmp)]] as const)
  console.log(`   ${lab} n ${V.length} | ball's closest to his chest ${q(V.map((r: any) => r.best))} yd (within 1 yd ${V.filter((r: any) => r.best < 1).length}) | his facing off the ball's line then ${q(V.map((r: any) => r.face))} deg | speed ${q(V.map((r: any) => r.speed))} | had an estimate ${V.filter((r: any) => r.hasEst).length}, its error then ${q(V.map((r: any) => r.estErr))} | air yd ${q(V.map((r: any) => r.air))}`);

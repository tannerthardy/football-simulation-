// BALL_EST check: is the estimator letting near samples win? Every tick a thrown non-screen pass is in the air
// (not being secured), for the target and for the nearest defender to him who holds an estimate: his estimate's error
// now (estimated ball position at this tick vs the true one, 3-D) binned by the true ball's range to his eyes, plus the
// age of his newest sample. Short throws (intended under 10 air yd) and longer ones apart. NOPRIOR=1 drops the
// receiver's route prior (diagnostic only: the probe empties ownRoutes).
// usage: BALL_EST=1 [NOPRIOR=1] npx tsx scripts/diag/risk/est-range.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { ownRoutes } from '../../../src/sim/ball-estimate.js';
if (process.env.NOPRIOR === '1') (ownRoutes as any).get = () => undefined;
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind !== 'air' || this.ball.securing || !this.ball.target || this.ball.throwaway) return r;
  const T = this.ball.target, b = this.ball.flight.pos, air = (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team);
  const D = this.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y) < Math.hypot(m.pos.x - T.pos.x, m.pos.y - T.pos.y) ? d : m);
  for (const [who, a] of [['receiver', T], ['defender', D]] as const) {
    const tr = this.ballEstimates.tracks.get(a); if (!tr?.fit) continue;
    const e = this.ballEstimates.pathOf(this, tr); if (!e.length) continue;
    const eye = { x: a.pos.x, y: a.pos.y, z: a.profile.heightYd * 0.93 };
    const range = Math.hypot(b.x - eye.x, b.y - eye.y, b.z - eye.z);
    const last = tr.samples.at(-1);
    rows.push({ who, short: air < 10, range, err: Math.hypot(e[0].x - b.x, e[0].y - b.y, e[0].z - b.z), age: last ? this.t - last.t : NaN, n: tr.samples.length });
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/'); };
console.log(`== seed ${seed} NOPRIOR=${process.env.NOPRIOR ?? 0}: estimate error now vs the ball's range to his eyes (ticks)`);
for (const who of ['receiver', 'defender']) for (const sh of [true, false]) {
  const V = rows.filter(r => r.who === who && r.short === sh);
  console.log(`   ${who} ${sh ? 'short (<10 air yd)' : 'longer'}: ` + [[0, 2], [2, 4], [4, 8], [8, 15], [15, 99]].map(([lo, hi]) => { const W = V.filter(r => r.range >= lo && r.range < hi); return `${lo}-${hi < 99 ? hi : '+'} yd: err ${q(W.map(r => r.err))} (n ${W.length}, samples ${q(W.map(r => r.n))}, newest ${q(W.map(r => r.age))} s)`; }).join(' | '));
}

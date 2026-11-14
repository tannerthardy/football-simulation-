// BALL_EST split: on throws with flights of 1.2 s+, for the targeted receiver at the ball's end: his samples, his
// estimate's landing error (his estimated landing at catch height vs the true one), and his own distance from his
// estimated landing (steering shortfall); also when he took his first sample (s after the release).
// usage: BALL_EST=1 npx tsx scripts/diag/risk/est-split.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
const atZ = (path: any[], z: number) => path.find((s: any) => s.z < z) ?? path.at(-1);
P.tick = function () {
  const r = t0.call(this);
  if (this.ball.kind === 'air' && !this.__es) {
    const T = this.ball.target, land = [...this.ballPath].reverse().find((s: any) => s.z > 0.5);
    this.__es = { T, rel: this.t, flight: (this.ballPath.at(-1)?.t ?? this.t) - this.t, endT: this.ballPath.at(-1)?.t, true: this.ballPath.at(-1) ?? land, first: null, last: null };
  }
  const S = this.__es;
  if (S && !S.done && S.T) {
    if (this.ball.kind === 'air' && !this.ball.securing) {
      const n = this.ballEstimates.samplesOf(S.T);
      if (n > 0 && S.first === null) S.first = this.t - S.rel;
      if (n >= 2) { const e = this.ballEstimates.estimate(S.T, this); if (e.length) S.last = e.find((p: any) => p.t >= S.endT - 1e-6) ?? e.at(-1); }
      S.n = n;
    } else if (this.ball.kind !== 'air') {
      S.done = true;
      if (S.flight >= 1.2) rows.push({ flight: S.flight, n: S.n ?? 0, first: S.first, estErr: S.last ? Math.hypot(S.last.x - S.true.x, S.last.y - S.true.y) : NaN,
        short: S.last ? Math.hypot(S.T.pos.x - S.last.x, S.T.pos.y - S.last.y) : NaN, toTrue: Math.hypot(S.T.pos.x - S.true.x, S.T.pos.y - S.true.y),
        jumps: this.ballEstimates.jumpsOf(S.T) });
    }
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== seed ${seed} flights 1.2 s+: n ${rows.length} | samples ${q(rows.map(r => r.n))} | no estimate by the end ${rows.filter(r => r.n < 2).length} | first sample ${q(rows.filter(r => r.first !== null).map(r => r.first))} s after release`);
console.log(`   his estimated landing vs true ${q(rows.map(r => r.estErr))} yd | him to his estimate ${q(rows.map(r => r.short))} | him to the true landing ${q(rows.map(r => r.toTrue))} | aim jumps > 1 yd ${q(rows.map(r => r.jumps))}`);

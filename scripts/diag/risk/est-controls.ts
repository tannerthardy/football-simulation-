// BALL_EST controls: every thrown, non-screen pass. By intended air yards (0-10 / 10-20 / 20+): attempts, completion
// rate, yards per attempt; catch rate by the target's separation from the nearest defender when the flight ends (<1 /
// 1-2 / 2-3 / 3+ yd); and the defense in the air: the nearest defender to the target, his distance at the release and
// at the flight's end (closing), and the deep side's defender speed at the end.
// usage: [BALL_EST=1] npx tsx scripts/diag/risk/est-controls.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const nearest = (sim: any, T: any) => sim.defense.reduce((b: any, d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y) < Math.hypot(b.pos.x - T.pos.x, b.pos.y - T.pos.y) ? d : b);
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && this.__ec === undefined && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, D = nearest(this, T);
    this.__ec = { T, rel: this.t, air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team), d0: Math.hypot(D.pos.x - T.pos.x, D.pos.y - T.pos.y), servo: false };
  }
  const S = this.__ec;
  if (S && S.T.tags?.has?.('ball-servo')) S.servo = true;
  if (S && S.sepEnd === undefined && (this.ball.kind !== 'air' || this.ball.securing)) {
    const D = nearest(this, S.T); S.sepEnd = Math.hypot(D.pos.x - S.T.pos.x, D.pos.y - S.T.pos.y); S.dSpeed = Math.hypot(D.vel.x, D.vel.y);
    S.flight = this.t - S.rel; const bp = this.ball.flight?.pos ?? this.ball.pos; S.recBall = bp ? Math.hypot(bp.x - S.T.pos.x, bp.y - S.T.pos.y) : NaN; S.arrDepth = bp ? (bp.x - this.los) * this.attackDir(this.offense[0].team) : NaN;
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__ec;
  if (S && S.sepEnd !== undefined) rows.push({ ...S, T: undefined, cmp: !!this.stats?.completed, yards: res.yards });
  this.__ec = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const pc = (V: any[]) => V.length ? `${(100 * V.filter(r => r.cmp).length / V.length).toFixed(0)}%` : '-';
const mean = (v: number[]) => v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1) : '-';
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: thrown non-screen passes n ${rows.length}`);
for (const [a, b] of [[-99, 10], [10, 20], [20, 99]]) {
  const V = rows.filter(r => r.air >= a && r.air < b);
  console.log(`   air ${a < 0 ? '<' : a}${b < 99 ? '-' + b : '+'} yd: n ${V.length}, complete ${pc(V)}, yds/att ${mean(V.map(r => r.yards))} | nearest defender release -> end ${q(V.map(r => r.d0))} -> ${q(V.map(r => r.sepEnd))} yd | his speed at the end ${q(V.map(r => r.dSpeed))}`);
}
console.log(`   catch rate by separation at the end: ` + [[0, 1], [1, 2], [2, 3], [3, 99]].map(([a, b]) => { const V = rows.filter(r => r.sepEnd >= a && r.sepEnd < b); return `${a}-${b < 99 ? b : '+'} yd ${pc(V)} (n ${V.length})`; }).join(' | '));
for (const [a, b] of [[0, 0.6], [0.6, 0.9], [0.9, 1.3], [1.3, 1.8], [1.8, 9]]) { const V = rows.filter(r => r.flight >= a && r.flight < b); console.log(`   flight ${a}-${b} s: n ${V.length}, complete ${pc(V)}, rec->ball ${q(V.map(r => r.recBall))}, servo engaged ${V.filter(r => r.servo).length} | open 3+ yd: ${pc(V.filter(r => r.sepEnd >= 3))} (n ${V.filter(r => r.sepEnd >= 3).length})`); }
for (const [a, b] of [[-99, 10], [10, 20], [20, 99]]) { const V = rows.filter(r => r.arrDepth >= a && r.arrDepth < b); console.log(`   arrival depth ${a < 0 ? '<' : a}${b < 99 ? '-' + b : '+'} yd: n ${V.length}, complete ${pc(V)}`); }

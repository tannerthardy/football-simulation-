// BALL_EST design 3 measurement: the receiver's final approach on thrown non-screen passes where he is 3+ yd from the
// nearest defender when the flight ends. (1) By the ball's closest horizontal pass to him: inside his catch reach (his
// reach + the 0.3 yd tracking bonus) or not, crossed with his body angle off the ball's incoming line (<45 / 45-90 /
// 90+ deg), and the catch rate in each cell. (2) 0.5 s before that closest pass: the horizontal error of his own
// estimated catch spot (catchSpot on his estimate) from the ball's true closest-pass point, and whether that true point
// was physically reachable from his state then within the 0.5 s (timeToReach to his catch reach). Air-yard split.
// usage: [BALL_EST=1] npx tsx scripts/diag/risk/approach.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
import { timeToReach } from '../../../src/physics/reach.js';
import { TRACKING_REACH_BONUS } from '../../../src/sim/catching.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const EST = process.env.BALL_EST === '1';
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
const ang = (a: number) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return Math.abs(a) * 180 / Math.PI; };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.ball.securing && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, b = this.ball.flight.pos, v = this.ball.flight.vel;
    const S = this.__ap ?? (this.__ap = { T, hist: [], air: (this.ball.intended.x - this.los) * this.attackDir(this.offense[0].team) });
    let spot = null;
    if (EST) { const e = this.ballEstimates.peek(T, this); const c = e.length ? catchSpot(T, { t: this.t, ballPath: e }) : null; spot = c ? c.p : null; }
    else { const c = catchSpot(T, this); spot = c ? c.p : null; }
    S.hist.push({ t: this.t, pos: { ...T.pos }, vel: { ...T.vel }, facing: T.facing, b: { ...b }, v: { ...v }, spot });
  }
  const S = this.__ap;
  if (S && S.sep === undefined && (this.ball.kind !== 'air' || this.ball.securing)) {
    const D = this.defense.reduce((m: any, d: any) => Math.hypot(d.pos.x - S.T.pos.x, d.pos.y - S.T.pos.y) < Math.hypot(m.pos.x - S.T.pos.x, m.pos.y - S.T.pos.y) ? d : m);
    S.sep = Math.hypot(D.pos.x - S.T.pos.x, D.pos.y - S.T.pos.y);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__ap;
  this.__ap = undefined;
  if (!S || !(S.sep >= 3) || S.hist.length < 3) return res;
  const T = S.T, reach = T.profile.reach + TRACKING_REACH_BONUS;
  let k = 0;
  S.hist.forEach((h: any, i: number) => { if (Math.hypot(h.b.x - h.pos.x, h.b.y - h.pos.y) < Math.hypot(S.hist[k].b.x - S.hist[k].pos.x, S.hist[k].b.y - S.hist[k].pos.y)) k = i; });
  const c = S.hist[k], dh = Math.hypot(c.b.x - c.pos.x, c.b.y - c.pos.y), face = ang(c.facing - Math.atan2(-c.v.y, -c.v.x));
  const e = S.hist.findLast?.((h: any) => h.t <= c.t - 0.5 + 1e-6) ?? [...S.hist].reverse().find((h: any) => h.t <= c.t - 0.5 + 1e-6);
  let err = NaN, reachable = null as boolean | null;
  if (e) {
    if (e.spot) err = Math.hypot(e.spot.x - c.b.x, e.spot.y - c.b.y);
    reachable = timeToReach({ pos: e.pos, vel: e.vel, profile: T.profile, speedScale: T.speedScale }, { x: c.b.x, y: c.b.y }, reach) <= c.t - e.t + 1e-6;
  }
  rows.push({ inReach: dh <= reach, face, cmp: !!this.stats?.completed, dh, err, reachable, air: S.air });
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
const pc = (V: any[]) => V.length ? `${V.filter(r => r.cmp).length}/${V.length} (${(100 * V.filter(r => r.cmp).length / V.length).toFixed(0)}%)` : '-';
console.log(`== seed ${seed} BALL_EST=${EST ? 1 : 0}: open targets n ${rows.length}, caught ${pc(rows)}`);
console.log('   (1) inside his catch reach at the closest pass x body angle off the ball\'s line: caught');
for (const ir of [true, false]) console.log(`      ${ir ? 'in reach ' : 'out of reach'}: ` + [[0, 45], [45, 90], [90, 181]].map(([a, b]) => `${a}-${b > 180 ? '180' : b} deg ${pc(rows.filter(r => r.inReach === ir && r.face >= a && r.face < b))}`).join(' | '));
console.log('   (2) 0.5 s before the closest pass: his estimated spot\'s error from the true point, and the true point reachable then?');
for (const [lab, F] of [['short (<10 air yd)', (r: any) => r.air < 10], ['10+ air yd', (r: any) => r.air >= 10]] as const) {
  const V = rows.filter(F);
  console.log(`      ${lab}: n ${V.length} | error ${q(V.map(r => r.err))} yd | reachable ${V.filter(r => r.reachable).length}, not ${V.filter(r => r.reachable === false).length} | caught when reachable ${pc(V.filter(r => r.reachable))}, when not ${pc(V.filter(r => r.reachable === false))} | out of reach at the pass: ${V.filter(r => !r.inReach).length} (of them reachable 0.5 s before ${V.filter(r => !r.inReach && r.reachable).length})`);
}

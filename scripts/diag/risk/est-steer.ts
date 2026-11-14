// BALL_EST check for a hidden oracle: for the targeted receiver on flights of 1.2 s+, every tick of the last 0.6 s
// in the air while TrackBall has an estimate: the angle between his velocity and the direction to his own estimated
// catch spot (catchSpot on his estimate), and to the true catch spot (catchSpot on sim.ballPath). If something steers
// him to the truth, the second angle is the smaller one where the two spots differ by 3+ yd.
// usage: BALL_EST=1 npx tsx scripts/diag/risk/est-steer.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { catchSpot } from '../../../src/sim/behaviors/receiver.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, rows: any[] = [];
const ang = (a: number, b: number) => { let d = a - b; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return Math.abs(d) * 180 / Math.PI; };
P.tick = function () {
  const r = t0.call(this);
  if (this.ball.kind !== 'air' || !this.ball.target) return r;
  const T = this.ball.target, end = this.ballPath.at(-1)?.t ?? 0;
  if (end - this.ball.releaseT < 1.2 || end - this.t > 0.6) return r;
  const est = this.ballEstimates.estimate(T, this); if (!est.length) return r;
  const se = catchSpot(T, { t: this.t, ballPath: est }), st = catchSpot(T, { t: this.t, ballPath: this.ballPath });
  const sp = Math.hypot(T.vel.x, T.vel.y); if (!se || !st || sp < 1) return r;
  const hd = Math.atan2(T.vel.y, T.vel.x);
  rows.push({ gap: Math.hypot(se.p.x - st.p.x, se.p.y - st.p.y), toEst: ang(hd, Math.atan2(se.p.y - T.pos.y, se.p.x - T.pos.x)), toTrue: ang(hd, Math.atan2(st.p.y - T.pos.y, st.p.x - T.pos.x)), dEst: Math.hypot(se.p.x - T.pos.x, se.p.y - T.pos.y) });
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 5 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(0)).join('/'); };
const D = rows.filter(r => r.gap >= 3 && r.dEst >= 1);
console.log(`== seed ${seed}: ticks ${rows.length}; where his and the true spot differ by 3+ yd: ${D.length} | heading off his estimated spot ${q(D.map(r => r.toEst))} deg | off the true spot ${q(D.map(r => r.toTrue))} deg | nearer his estimate ${D.filter(r => r.toEst < r.toTrue).length}, nearer the truth ${D.filter(r => r.toTrue < r.toEst).length}`);

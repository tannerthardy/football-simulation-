// Why a defender who believed the release from the ball never samples it (BALL_EST with defenders estimating): per
// tick in the flight, his estimator head against the ball's bearing, whether the estimator attended him this tick, his
// behaviour; per defender, the smallest ball-off-head angle in the flight and the share of ticks attended. Reads only.
// usage: BALL_EST=2049 npx tsx scripts/diag/risk/def-nosample.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 2);
const P: any = PlaySim.prototype, tick0 = P.tick, b0 = P.buildResult, out: any[] = [];
const ang = (v: number) => { let x = v; while (x > Math.PI) x -= 2 * Math.PI; while (x < -Math.PI) x += 2 * Math.PI; return Math.abs(x) * 180 / Math.PI; };
P.tick = function () {
  const r = tick0.call(this);
  if (this.offCall?.kind !== 'pass' || this.ball?.kind !== 'air' || this.ball.securing) return r;
  const E = this.ballEstimates, b = this.ball.flight.pos, M = (this.__dn ??= new Map());
  for (const d of this.defense) {
    if (releaseBelief(this, d).ballAt === undefined) continue;
    const tr = E?.tracks?.get(d), h = E?.headOf?.(d);
    const s = M.get(d.idx) ?? { role: d.behavior?.kind ?? '?', ticks: 0, attended: 0, minOff: 999, minOffBody: 999, samples: 0, range: 0, eng: 0 };
    s.ticks++;
    if (tr && this.t - tr.attendT <= this.dt + 1e-9) s.attended++;
    const brg = Math.atan2(b.y - d.pos.y, b.x - d.pos.x);
    if (h !== undefined) s.minOff = Math.min(s.minOff, ang(brg - h));
    s.minOffBody = Math.min(s.minOffBody, ang(brg - d.facing));
    s.samples = E?.samplesOf?.(d) ?? 0; s.range = Math.hypot(b.x - d.pos.x, b.y - d.pos.y);
    if (d.engagement) s.eng++;
    M.set(d.idx, s);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__dn) for (const s of this.__dn.values()) out.push(s);
  this.__dn = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length ? [0.25, 0.5, 0.75].map(f => w[Math.floor(f * (w.length - 1))].toFixed(0)).join('/') : '-'; };
for (const role of ['zone', 'man', 'rush']) for (const sampled of [true, false]) {
  const V = out.filter(s => s.role === role && (s.samples > 0) === sampled);
  if (!V.length) continue;
  console.log(`${role.padEnd(5)} ${sampled ? 'sampled' : 'never  '} n ${String(V.length).padStart(4)} | attended share p25/50/75 ${q(V.map(s => 100 * s.attended / s.ticks))}% | no track ${V.filter(s => s.minOff === 999).length} | min ball-off-head ${q(V.map(s => s.minOff).filter(x => x < 999))} deg | min ball-off-hips ${q(V.map(s => s.minOffBody))} deg | engaged ticks>0 ${V.filter(s => s.eng > 0).length}`);
}

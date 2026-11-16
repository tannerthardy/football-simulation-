// YAC on completions, and the defense at the catch: the nearest defender's distance and speed at the catch, how far
// his head (or body, if no head) points off the carrier, and the time to first contact (hit / tackle / missed tackle).
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/yac-split.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 16);
const P: any = PlaySim.prototype, ev0 = P.event, b0 = P.buildResult, rows: any[] = [];
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  if (this.offCall?.kind !== 'pass') return r;
  const S = (this.__ys ??= {});
  if (type === 'catch' && a && a.team === 'O' && S.catchX === undefined) {
    let D: any = null, dd = Infinity;
    for (const d of this.defense) { const x = Math.hypot(d.pos.x - a.pos.x, d.pos.y - a.pos.y); if (x < dd) { dd = x; D = d; } }
    const head = this.ballEstimates?.headOf?.(D) ?? D.head ?? D.facing, brg = Math.atan2(a.pos.y - D.pos.y, a.pos.x - D.pos.x);
    S.catchX = a.pos.x; S.dir = this.attackDir(a.team); S.t = this.t; S.sep = dd; S.dSpeed = Math.hypot(D.vel.x, D.vel.y);
    S.closing = ((D.vel.x) * (a.pos.x - D.pos.x) + (D.vel.y) * (a.pos.y - D.pos.y)) / Math.max(dd, 1e-6);
    S.headOff = Math.abs((((head - brg) * 180 / Math.PI) % 360 + 540) % 360 - 180);
    S.rSpeed = Math.hypot(a.vel.x, a.vel.y); S.carrier = a;
  } else if (S.catchX !== undefined && S.contact === undefined && ['hit', 'tackle', 'missed_tackle', 'tackled'].includes(type)) S.contact = this.t - S.t;
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__ys;
  if (S?.catchX !== undefined && this.stats?.completed) {
    rows.push({ yac: (res.yards ?? 0) - (S.catchX - this.los) * S.dir, sep: S.sep, dSpeed: S.dSpeed, closing: S.closing, headOff: S.headOff, rSpeed: S.rSpeed, contact: S.contact });
  }
  this.__ys = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? [0.25, 0.5, 0.75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(2)).join('/') : '-'; };
const mean = (v: number[]) => (v.filter(Number.isFinite).reduce((a, b) => a + b, 0) / Math.max(1, v.filter(Number.isFinite).length)).toFixed(2);
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: completions n ${rows.length}`);
console.log(`   YAC mean ${mean(rows.map(r => r.yac))} p25/50/75 ${q(rows.map(r => r.yac))} | 10+ YAC share ${(100 * rows.filter(r => r.yac >= 10).length / Math.max(1, rows.length)).toFixed(1)}%`);
console.log(`   nearest defender at the catch: dist ${q(rows.map(r => r.sep))} speed ${q(rows.map(r => r.dSpeed))} closing ${q(rows.map(r => r.closing))} | his head off the carrier ${q(rows.map(r => r.headOff))} deg | receiver speed ${q(rows.map(r => r.rSpeed))}`);
console.log(`   time to first contact ${q(rows.map(r => r.contact))} s (none ${rows.filter(r => r.contact === undefined).length})`);
for (const [a, b] of [[0, 1], [1, 2], [2, 3], [3, 5], [5, 99]]) { const V = rows.filter(r => r.sep >= a && r.sep < b); console.log(`   sep at catch ${a}-${b}: n ${V.length}, YAC mean ${mean(V.map(r => r.yac))}`); }

// What the catch does today: every first catch resolution on a targeted, non-screen pass (the target's 'secure' /
// 'catch' / 'drop' / 'miss', or a defender's 'pbu' / 'interception' first), with the ball's speed at that moment, the
// target's hands rating, the nearest defender, the time the ball was in the target's own eyes (BALL_EST samples x the
// perception step, when on), and whether a secured ball was then dislodged (and how). By ball speed and time-in-eyes.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/catch-today.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 23), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, ev0 = P.event, b0 = P.buildResult, rows: any[] = [];
P.event = function (type: string, a?: any, b?: any, note?: string) {
  const r = ev0.call(this, type, a, b, note);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  const T = this.ball?.target; if (!T) return r;
  const S = (this.__ct ??= { first: null, after: [] });
  const key = ['secure', 'catch', 'drop', 'miss', 'pbu', 'interception', 'incomplete'].includes(type) ? type : null;
  if (!key) return r;
  if (!S.first && key !== 'incomplete') {
    const bv = this.ball.flight?.vel; let sep = Infinity;
    for (const d of this.defense) sep = Math.min(sep, Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y));
    S.first = { type: key, by: a === T ? 'R' : a?.team ?? '?', note: note ?? '', speed: bv ? Math.hypot(bv.x, bv.y, bv.z) : NaN, hands: T.r('hands'), sep, air: this.t - (this.ball.releaseT ?? this.t), eyes: (this.ballEstimates?.samplesOf?.(T) ?? NaN) * (this.dt ?? 0.05) };
  } else if (S.first) S.after.push(key + (note ? ':' + note : ''));
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__ct;
  if (S?.first) rows.push({ ...S.first, after: S.after.join(','), cmp: !!this.stats?.completed });
  this.__ct = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const pc = (n: number, d: number) => d ? `${(100 * n / d).toFixed(0)}%` : '-';
const tab = (name: string, key: (r: any) => number, bins: number[][]) => {
  console.log(`  by ${name}:`);
  for (const [lo, hi] of bins) {
    const V = rows.filter(r => key(r) >= lo && key(r) < hi);
    const sec = V.filter(r => r.type === 'secure'), lost = sec.filter(r => !r.cmp);
    console.log(`    ${lo}-${hi}: n ${V.length} | complete ${pc(V.filter(r => r.cmp).length, V.length)} | first event: secure ${pc(sec.length, V.length)}, drop ${pc(V.filter(r => r.type === 'drop').length, V.length)}, miss ${pc(V.filter(r => r.type === 'miss').length, V.length)}, def pbu/int ${pc(V.filter(r => r.by === 'D').length, V.length)} | secured then lost ${lost.length} (${[...new Set(lost.map(r => r.after))].slice(0, 3).join(' / ')})`);
  }
};
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: first catch resolutions n ${rows.length}`);
tab('ball speed at the catch (yd/s)', r => r.speed, [[0, 14], [14, 18], [18, 22], [22, 26], [26, 99]]);
tab('nearest defender (yd)', r => r.sep, [[0, 1], [1, 2], [2, 3], [3, 99]]);
tab('hands rating', r => r.hands, [[0, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.01]]);
if (rows.some(r => Number.isFinite(r.eyes) && r.eyes > 0)) tab('time the ball was in his eyes (s)', r => r.eyes, [[0, 0.05], [0.05, 0.2], [0.2, 0.5], [0.5, 1], [1, 9]]);

// Gate guard: open targets (3+ yd from the nearest defender at the flight's end) whose ball came closest to them within
// 0.2 s of the release, so it was never coming to them. Per arm: how many, how many caught, and for each the play
// (game seed, buildResult ordinal in that game, clock), concept, target slot and route, the intended point against the
// target's position at the release, whether the flight was deflected / a throwaway, and the outcome.
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/early-pass.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
let game = 0, ordinal = 0, open = 0;
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__ep && this.ball.target && !this.ball.throwaway) {
    const T = this.ball.target, rt = T.behavior?.fallback?.route ?? T.behavior?.route;
    this.__ep = { T, rel: this.t, best: Infinity, tBest: 0, intended: { ...this.ball.intended }, tpos: { ...T.pos }, slot: T.slot, route: String(rt?.id ?? '-'), concept: String(this.offCall?.pass?.id ?? this.offCall?.pass?.concept ?? '-'), deflected: false, others: '' };
  }
  const S = this.__ep;
  if (S && this.ball.kind === 'air') {
    const b = this.ball.flight.pos, d = Math.hypot(b.x - S.T.pos.x, b.y - S.T.pos.y);
    if (d < S.best) { S.best = d; S.tBest = this.t; }
    if (this.ball.deflected) S.deflected = true;
    let near = Infinity; for (const x of this.defense) near = Math.min(near, Math.hypot(x.pos.x - S.T.pos.x, x.pos.y - S.T.pos.y)); S.near = near;
    // Who the ball actually came closest to among the offense (is the target label the intended man?).
    let bo: any = null, bd = Infinity; for (const o of this.offense) { if (o === this.qb) continue; const dd = Math.hypot(b.x - o.pos.x, b.y - o.pos.y); if (dd < bd) { bd = dd; bo = o; } }
    if (bd < 1.5 && bo !== S.T && !S.others.includes(bo.slot)) S.others += bo.slot + ' ';
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__ep; this.__ep = undefined; ordinal++;
  if (S && S.near >= 3) {
    open++;
    if (S.tBest - S.rel < 0.2) rows.push({ game: seed + game, play: ordinal, t: S.rel.toFixed(2), concept: S.concept, slot: S.slot, route: S.route, aimOff: Math.hypot(S.intended.x - S.tpos.x, S.intended.y - S.tpos.y).toFixed(1), aimDepth: (S.intended.x - S.tpos.x).toFixed(1), deflected: S.deflected, nearOthers: S.others.trim() || '-', cmp: !!this.stats?.completed, outcome: res.outcome });
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (game = 0; game < games; game++) { ordinal = 0; simulateGame(leagueSample(home, seed + game), leagueSample(away, seed + game), { seed: seed + game, record: false }); }
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: open targets ${open}; closest pass within 0.2 s of the release ${rows.length}, caught ${rows.filter(r => r.cmp).length}`);
for (const r of rows) console.log(`   game ${r.game} play #${r.play} (release ${r.t} s into the play) | ${r.concept} ${r.slot} ${r.route} | intended point ${r.aimOff} yd from him at the release (${r.aimDepth} downfield) | deflected ${r.deflected} | ball within 1.5 yd of ${r.nearOthers} | ${r.cmp ? 'caught' : 'not caught'} (${r.outcome})`);

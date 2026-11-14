// BALL_EST diagnosis: open targets (3+ yd from the nearest defender when the flight ends) that are not completed, by
// kind of miss. hands: the ball entered his catch envelope and the catch roll failed (drop / miss event; split by
// what made it hard: stretch to the edge of his reach, high, low). Otherwise the envelope was never entered: over (at
// his closest horizontal approach the ball was above his max catch height), low (below 0.1 yd), or wide (outside his
// reach at catchable height): late (the ball passed ahead of him along his run) or past (it passed behind him: he
// overran it) or across (beside his path). Also: reach-entered but no roll (eligibility or the wait rule).
// usage: [BALL_EST=...] npx tsx scripts/diag/risk/miss-kind.ts SEED GAMES
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { TRACKING_REACH_BONUS } from '../../../src/sim/catching.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, rows: any[] = [];
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.offCall?.pass?.family === 'screen') return r;
  if (this.ball.kind === 'air' && !this.__mk && this.ball.target && !this.ball.throwaway) this.__mk = { T: this.ball.target, best: Infinity, bandBest: Infinity };
  const S = this.__mk;
  if (S && this.ball.kind === 'air' && !this.ball.deflected) {
    const T = S.T, b = this.ball.flight.pos, dh = Math.hypot(b.x - T.pos.x, b.y - T.pos.y);
    const reach = T.profile.reach + TRACKING_REACH_BONUS, top = T.profile.maxCatchHeight;
    if (b.z >= 0.1 && b.z <= top) S.bandBest = Math.min(S.bandBest, dh);
    if (dh < S.best) {
      const sp = Math.hypot(T.vel.x, T.vel.y), along = sp > 0.5 ? ((b.x - T.pos.x) * T.vel.x + (b.y - T.pos.y) * T.vel.y) / sp : 0;
      S.best = dh; S.at = { z: b.z, top, reach, along, speed: sp };
    }
    let near = Infinity; for (const d of this.defense) near = Math.min(near, Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y));
    S.near = near;
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this), S = this.__mk; this.__mk = undefined;
  if (!S || !S.at || S.near < 3) return res;
  const idx = S.T.idx, ev = this.events.filter((e: any) => e.a === idx && (e.type === 'drop' || e.type === 'miss'));
  let kind: string;
  if (this.stats?.completed) kind = 'caught';
  else if (ev.length) kind = `hands (${ev[0].type})`;
  else if (S.bandBest <= S.at.reach) kind = 'entered, no roll';
  else if (S.best <= S.at.reach && S.at.z > S.at.top) kind = 'over';
  else if (S.best <= S.at.reach && S.at.z < 0.1) kind = 'low';
  else kind = Math.abs(S.at.along) < 0.5 * S.best ? 'wide: across' : S.at.along > 0 ? 'wide: late (ahead of him)' : 'wide: past (behind him)';
  rows.push({ kind, best: S.best, speed: S.at.speed });
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const q = (v: number[]) => { v = v.filter(Number.isFinite).sort((a, b) => a - b); return v.length < 3 ? '-' : [.25, .5, .75].map(f => v[Math.floor(f * (v.length - 1))].toFixed(1)).join('/'); };
console.log(`== seed ${seed} BALL_EST=${process.env.BALL_EST ?? 0}: open targets n ${rows.length}`);
const kinds = [...new Set(rows.map(r => r.kind))].sort();
for (const k of kinds) { const V = rows.filter(r => r.kind === k); console.log(`   ${k}: ${V.length} | ball's closest horizontal ${q(V.map(r => r.best))} yd | his speed then ${q(V.map(r => r.speed))}`); }

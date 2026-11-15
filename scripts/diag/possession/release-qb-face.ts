// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/<this file> SEED GAMES
// At the release: the passer's true body facing and a defender's delayed picture of it, against the bearing to the
// receiver the ball goes to (deg).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const P: any = PlaySim.prototype, t0 = P.tick; const tr: number[] = [], sn: number[] = [];
const dif = (a: number, b: number) => Math.abs(((a - b) * 180 / Math.PI + 540) % 360 - 180);
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind === 'pass' && this.ball.kind === 'air' && !this.__f && this.ball.target) {
    this.__f = true; const q = this.qb, T = this.ball.target, b = Math.atan2(T.pos.y - q.pos.y, T.pos.x - q.pos.x);
    tr.push(dif(q.body.facing, b));
    for (const d of this.defense) { const s = this.see(d, q); if (s.facing !== undefined) sn.push(dif(s.facing, Math.atan2(T.pos.y - s.pos.y, T.pos.x - s.pos.x))); }
  }
  return r;
};
const b0 = P.buildResult; P.buildResult = function () { this.__f = false; return b0.call(this); };
const rng = new Rng(11); const home = generateTeam(rng, 'I', 'IRN', { strength: .55 }), away = generateTeam(rng, 'C', 'COM', { strength: .55 });
for (let g = 0; g < 3; g++) simulateGame(leagueSample(home, 11 + g), leagueSample(away, 11 + g), { seed: 11 + g, record: false });
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(p * (v.length - 1))].toFixed(0);
console.log(`QBF throws ${tr.length}: true facing off the target p25/50/75 ${q(tr, .25)}/${q(tr, .5)}/${q(tr, .75)} deg | defenders' picture off ${q(sn, .25)}/${q(sn, .5)}/${q(sn, .75)} deg`);

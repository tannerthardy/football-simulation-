// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/<this file> SEED GAMES
// RELEASE_BELIEF shoulder break: per thrown pass, each defender who broke on the passer's shoulders (tag), his pick
// against the receiver the ball went to (diagnostic only), and the play's result.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { shoulderPickOf } from '../../../src/sim/behaviors/defense.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 8);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult;
const c = { breaks: 0, right: 0, wrong: 0, none: 0, wrongComp: 0, rightComp: 0, pumpBreaks: 0 };
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind === 'pass' && this.ball.kind === 'air' && !this.__tgt) this.__tgt = this.ball.target;
  if (this.offCall?.kind === 'pass') {
    this.__sb ??= new Map();
    // his pick as it stands at the release (the read that the ball then confirms or not)
    if (this.throwAt >= 0 && !this.__rel) { this.__rel = true; for (const d of this.defense) if (d.tags.has('shoulder-break')) this.__sb.set(d.idx, { R: shoulderPickOf(d), pre: false }); }
    if (this.throwAt < 0) for (const d of this.defense) if (d.tags.has('shoulder-break') && !this.__sb.has(d.idx)) this.__sb.set(d.idx, { R: shoulderPickOf(d), pre: true });
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__sb) for (const [, s] of this.__sb) {
    c.breaks++; if (s.pre) c.pumpBreaks++;
    if (!this.__tgt) continue;
    if (!s.R) c.none++; else if (s.R === this.__tgt) { c.right++; if (this.stats?.completed) c.rightComp++; } else { c.wrong++; if (this.stats?.completed) c.wrongComp++; }
  }
  this.__sb = undefined; this.__tgt = undefined; this.__rel = false;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
console.log('SB', JSON.stringify(c));

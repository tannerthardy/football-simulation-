// usage: npm run ref -- --flag RELEASE_BELIEF=1 -- npx tsx scripts/diag/possession/<this file> SEED GAMES
// RELEASE_BELIEF rows (flag on): pumps (bites while the ball is in the passer's hand: duration, depth he gave up
// toward the line, how it ended), defenders who never believe a thrown pass (facing the passer? a body in the line?
// role; what they do until the catch), and breakups / interceptions by whether the defender's belief preceded the ball.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { releaseBelief } from '../../../src/sim/release-belief.js';
import { lineOfSight, bodyHeight, SHOULDER } from '../../../src/sim/sight.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const P: any = PlaySim.prototype, t0 = P.tick, b0 = P.buildResult, e0 = P.event;
const bites: any[] = []; const never: any[] = []; const plays: any = { pbu: [0, 0], int: [0, 0] };
P.event = function (type: string, a: any, ...r: any[]) {
  if ((type === 'pbu' || type === 'deflection' || type === 'interception') && a?.team === 'D' && this.__st) {
    const s = this.__st.get(a.idx), pre = s?.first !== undefined && this.throwAt >= 0 && s.first <= this.throwAt + 1e-9;
    const k = type === 'interception' ? 'int' : 'pbu'; plays[k][pre ? 0 : 1]++;
  }
  return e0.call(this, type, a, ...r);
};
P.tick = function () {
  const r = t0.call(this);
  if (this.offCall?.kind !== 'pass' || this.phase !== 'live') return r;
  this.__st ??= new Map();
  const dir = this.attackDir('O'), held = this.ball.kind === 'held' && this.ball.carrier === this.qb && this.throwAt < 0;
  for (const d of this.defense) {
    const b = releaseBelief(this, d), s = this.__st.get(d.idx) ?? {};
    if (b.releasedAt !== undefined && s.first === undefined) s.first = this.t;
    // a bite: his belief has the ball out while it is still in the passer's hand
    if (held && b.releasedAt !== undefined && b.source === 'arm') { if (!s.bite) s.bite = { t: this.t, x: d.pos.x, kind: d.behavior?.kind }; }
    else if (s.bite) { bites.push({ ...s.bite, end: this.t, lost: (s.bite.x - d.pos.x) * dir, how: b.releasedAt === undefined ? 'pulled' : 'ball' }); s.bite = undefined; }
    if (this.throwAt >= 0 && !s.atRel) {
      const q = this.qb, f = Math.cos(d.body.facing - Math.atan2(q.pos.y - d.pos.y, q.pos.x - d.pos.x));
      s.atRel = { facing: f, los: lineOfSight(this.agents, d, q, bodyHeight(q, SHOULDER)), kind: d.behavior?.kind ?? '-', deep: (d.pos.x - this.los) * dir > 10 };
    }
    this.__st.set(d.idx, s);
  }
  return r;
};
P.buildResult = function () {
  const res = b0.call(this);
  if (this.__st && this.throwAt >= 0) for (const [, s] of this.__st) if (s.first === undefined && s.atRel) never.push(s.atRel);
  this.__st = undefined;
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
const med = (v: number[]) => v.length ? [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)] : NaN;
const B = bites.filter(b => b.end !== undefined);
console.log(`RB2 bites ${B.length}: duration median ${med(B.map(b => b.end - b.t)).toFixed(2)} s, depth given toward the line median ${med(B.map(b => -b.lost)).toFixed(2)} yd (positive = came downhill), ended by pull-down ${B.filter(b => b.how === 'pulled').length} / by ball ${B.filter(b => b.how === 'ball').length}; kinds ${JSON.stringify(B.reduce((o: any, b) => (o[b.kind] = (o[b.kind] ?? 0) + 1, o), {}))}`);
console.log(`RB2 never believed a thrown pass: ${never.length}; facing away from the passer (cos < 0) ${never.filter(n => n.facing < 0).length}, facing him with a body in the line ${never.filter(n => n.facing >= 0 && !n.los).length}, facing him with a clear line ${never.filter(n => n.facing >= 0 && n.los).length}; deep ${never.filter(n => n.deep).length}; kinds ${JSON.stringify(never.reduce((o: any, n) => (o[n.kind] = (o[n.kind] ?? 0) + 1, o), {}))}`);
console.log(`RB2 breakups by a defender whose belief preceded the release ${plays.pbu[0]} / after ${plays.pbu[1]}; interceptions ${plays.int[0]} / ${plays.int[1]}`);

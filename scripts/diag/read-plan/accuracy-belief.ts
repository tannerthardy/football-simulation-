/**
 * His belief of his own accuracy against the release (risk work item 1): on league-sampled games, for each started
 * throw that is released, the miss sigma he believed when he decided (missSigma at the decision's urgency u, which
 * update() scales by pocket presence) and the sigma the release used (missSigma at the release's urgency, which
 * release() does not scale, from the pressure then; times the flick and the hold), with the parts that differ: the
 * urgencies, the flick, whether he was held or moving at the release; and the outcome. The consistency draw is
 * left out of both (its mean factor is about 1). Passive.
 *   node --import tsx scripts/diag/read-plan/accuracy-belief.ts [--seed 101] [--games 8] > out/read-plan/acc-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { clamp } from '../../../src/core/vec.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const P: any = QBPass.prototype, st = P.startThrow, rel = P.release;
P.startThrow = function (a: any, sim: any, ev: any) {
  const bar = this.barNow?.t === sim.t ? this.barNow : null;
  const u = bar?.u ?? 0;
  const dist = Math.hypot(ev.point.x - a.pos.x, ev.point.y - a.pos.y);
  this.accDecision = { t: sim.t, u, urgency: bar?.urgency ?? null, dist, sigmaBelief: this.missSigma(a, sim, dist, u), P: ev.P,
    pAcc: ev.parts?.pAcc ?? null, target: ev.target };
  return st.call(this, a, sim, ev);
};
let rows: any[] = [];
P.release = function (a: any, sim: any, ev: any) {
  const D = this.accDecision;
  if (D && D.target === ev.target) {
    const p = this.receiverForecasts.get(ev.target)?.predict(sim.t, ev.T);
    const point = p ?? ev.point, dist = Math.hypot(point.x - a.pos.x, point.y - a.pos.y);
    const pressure = this.pressure(a, sim), uRel = clamp((0.9 - pressure.time) / 0.7, 0, 1);
    const sigmaRelease = this.missSigma(a, sim, dist, uRel) * (1 + 0.8 * (this.flick ?? 0));
    rows.push({ sim, rec: { tDecision: +D.t.toFixed(2), tRelease: +sim.t.toFixed(2), u: +D.u.toFixed(2), urgencyDecision: D.urgency === null ? null : +D.urgency.toFixed(2),
      urgencyRelease: +uRel.toFixed(2), pocketPresence: +a.r('pocketPresence').toFixed(2), flick: +(this.flick ?? 0).toFixed(2), moving: Math.hypot(a.vel.x, a.vel.y) > 2.2,
      sigmaBelief: +D.sigmaBelief.toFixed(3), sigmaRelease: +sigmaRelease.toFixed(3), sigmaSameUrgency: +this.missSigma(a, sim, dist, D.u).toFixed(3),
      pAccBelief: D.pAcc === null ? null : +D.pAcc.toFixed(3), pAccRelease: +Math.exp(-(sigmaRelease ** 2) / (2 * 1.35 ** 2)).toFixed(3), P: +D.P.toFixed(3), dist: +dist.toFixed(1) } });
  }
  return rel.call(this, a, sim, ev);
};
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  rows = [];
  const r = run.call(this), s = this.stats, ev = r.events ?? [];
  const outcome = s.completed ? 'catch' : ev.some((e: any) => e.type === 'interception') ? 'int' : ev.some((e: any) => e.type === 'pbu' || e.type === 'deflection') ? 'defended'
    : ev.some((e: any) => e.type === 'drop') ? 'drop' : 'ground';
  const last = rows[rows.length - 1];
  if (last && s.attempted) process.stdout.write(JSON.stringify({ ...last.rec, outcome }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });

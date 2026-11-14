/**
 * Checkdowns (Integration: behind-the-line targets). League games; at every throw he starts on a called drop-back
 * pass, the back (ref B) as the quarterback would price him at that tick: his depth past the line, whether he is a
 * ready read, and the window's P, intRisk and value; beside the throw he chose (its aimed depth, P, intRisk, value)
 * and how the play ended. Passive: the back's evaluation is a second call of the same window at the same tick.
 *   node --import tsx scripts/diag/concepts/checkdown-probe.ts [--seed 101] [--games 8] > out/concepts/cd-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const P: any = QBPass.prototype, st0 = P.startThrow;
let rec: any = null;
P.startThrow = function (a: any, sim: any, e: any) {
  if (!rec) {
    const ref = (r: any) => sim.offAlign.refOf[r.slot] ?? r.slot;
    const back = sim.offense.find((o: any) => ref(o) === 'B');
    let b: any = null;
    if (back && back !== e.target && back.behavior?.passOption) {
      const ev = this.evaluate(a, sim, back, 0);
      b = { depth: +(back.pos.x - sim.los).toFixed(2), ready: this.ready(back, sim), kind: back.behavior?.kind ?? null,
        P: ev ? +ev.P.toFixed(3) : null, intRisk: ev ? +ev.intRisk.toFixed(4) : null, value: ev ? +ev.value.toFixed(2) : null, aim: ev ? +(ev.point.x - sim.los).toFixed(1) : null };
    }
    rec = { t: +sim.t.toFixed(2), target: ref(e.target), aim: +(e.point.x - sim.los).toFixed(1), P: +e.P.toFixed(3), intRisk: +e.intRisk.toFixed(4), value: +e.value.toFixed(2), back: b };
  }
  return st0.call(this, a, sim, e);
};
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  rec = null;
  const r = run.call(this);
  if (pass && pass.family !== 'screen' && rec) process.stdout.write(JSON.stringify({ concept: pass.id, back: pass.back, down: sim.down, dist: +(sim.firstDownX - sim.los).toFixed(1),
    ...rec, cmp: !!sim.stats.completed, yards: +r.yards.toFixed(2) }) + '\n');
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });

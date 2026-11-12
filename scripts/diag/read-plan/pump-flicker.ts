/**
 * Pumps from a one-frame flicker (Integration's count): on league-sampled games (hot-games.ts's population), every pump
 * (QBPass.pullDown pulling the throw down at the plant's re-check) is recorded with the throw's planned P, the re-check
 * window's P and value on that tick, and the same window (same target, same remaining motion, re-aimed each tick) on
 * the next two ticks. A flicker: P at the re-check more than 0.3 below the planned P, and back within 0.1 of it (or
 * value >= 0) within two ticks. Passive: the window is re-evaluated, not acted on. One JSON row per pump, then a
 * summary line per dropback count.
 *   node --import tsx scripts/diag/read-plan/pump-flicker.ts [--seed 101] [--games 8] > out/read-plan/pumps-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { clamp } from '../../../src/core/vec.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { QBPass } from '../../../src/sim/behaviors/qb.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const P: any = QBPass.prototype, pd = P.pullDown;
let watch: any[] = [];
const recheck = (qb: any, a: any, sim: any, w: any) => {
  const p = qb.receiverForecasts.get(w.target)?.predict(sim.t, w.left + w.T);
  if (!p) return null;
  const pressure = qb.pressure(a, sim);
  const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1) * (0.5 + 0.5 * a.r('pocketPresence'));
  const e = qb.window(a, sim, w.target, { x: a.pos.x, y: a.pos.y, z: 2.2 }, { x: p.x, y: clamp(p.y, 2, FIELD_WIDTH - 2), z: w.z }, w.T, w.left, urgency);
  return { P: +e.P.toFixed(3), value: +e.value.toFixed(2) };
};
P.pullDown = function (a: any, sim: any, ev: any) {
  const out = pd.call(this, a, sim, ev);
  if (out) {
    const w: any = { qb: this, a, sim, target: ev.target, T: ev.T, z: ev.point.z, left: this.releaseAt - sim.t, t: sim.t, planned: ev.P, after: [] as any[] };
    w.now = recheck(this, a, sim, w);
    watch.push(w);
  }
  return out;
};
let dropbacks = 0, pumps = 0;
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, pass = sim.offCall?.kind === 'pass' ? sim.offCall.pass : null;
  if (!pass || pass.family === 'screen') return run.call(this);
  dropbacks++;
  watch = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    for (const w of watch) if (w.after.length < 2 && sim.t > w.t && sim.carrier === w.a) w.after.push(recheck(w.qb, w.a, sim, w));
  };
  const r = run.call(this);
  for (const w of watch) {
    pumps++;
    const drop = w.now ? w.planned - w.now.P : null;
    const back = w.after.some((x: any) => x && (x.P >= w.planned - 0.1 || x.value >= 0));
    process.stdout.write(JSON.stringify({ concept: pass.id, t: +w.t.toFixed(2), planned: +w.planned.toFixed(3), now: w.now, after: w.after,
      flicker: drop !== null && drop > 0.3 && back, swing: drop !== null && drop > 0.3 }) + '\n');
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });
process.stdout.write(JSON.stringify({ summary: true, seed, games, dropbacks, pumps }) + '\n');

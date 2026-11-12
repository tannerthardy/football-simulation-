/**
 * Play action's second and third levels, and where its yards come from (Integration's premium question), as
 * pa_levels_nfl.py measures them. League games; every called drop-back pass (not a screen):
 * - LBs: off-ball box defenders at the snap (3-8 yd off the line, within 6 yd of the ball); safeties: 9+ yd deep.
 *   Each group's median depth off the line at the snap, 0.5, 1.0, 1.5, 2.0, 2.5 s and at the throw; for a defender
 *   who came downhill (0.3 yd or more), when he turned back (first retreat at 0.5 yd/s or more after his deepest
 *   downhill point), and his depth at the throw against his snap depth.
 * - The throw: air yards to the aim, time to throw, completion, yards after the catch (yards minus air yards).
 *   Passive.  node --import tsx scripts/diag/concepts/pa-levels.ts [--seed 101] [--games 8] > out/concepts/lv-<seed>.jsonl
 */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const TIMES = [0.5, 1.0, 1.5, 2.0, 2.5];
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this, call = sim.offCall;
  const pass = call?.kind === 'pass' ? call.pass : null;
  if (!pass || pass.family === 'screen') return run.call(this);
  const depth = (d: any) => d.pos.x - sim.los;
  const pick = (f: (d: any) => boolean) => sim.defense.filter(f);
  const lbs = pick((d: any) => depth(d) >= 3 && depth(d) <= 8 && Math.abs(d.pos.y - sim.ballY) <= 6);
  const saf = pick((d: any) => depth(d) >= 9);
  const track = (G: any[]) => G.map((d) => ({ d, snap: depth(d), at: {} as Record<string, number>, minD: depth(d), minT: 0, turn: null as number | null, throwD: null as number | null }));
  const L = track(lbs), S = track(saf);
  let throwT: number | null = null, aim: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!air && sim.ball.kind === 'air' && throwT === null) { throwT = sim.t; aim = sim.ball.intended; for (const r of [...L, ...S]) r.throwD = depth(r.d); }
    for (const r of [...L, ...S]) {
      const dd = depth(r.d);
      for (const T of TIMES) if (r.at[T] === undefined && sim.t >= T - 1e-9) r.at[T] = dd;
      if (throwT === null) {
        if (dd < r.minD) { r.minD = dd; r.minT = sim.t; }
        if (r.turn === null && r.snap - r.minD >= 0.3 && r.d.vel.x >= 0.5) r.turn = sim.t;
      }
    }
  };
  const res = run.call(this), s = sim.stats;
  const out = (R: any[]) => R.map((r) => ({ snap: +r.snap.toFixed(2), at: Object.fromEntries(Object.entries(r.at).map(([k, v]) => [k, +(v as number).toFixed(2)])),
    bite: +(r.snap - r.minD).toFixed(2), biteT: +r.minT.toFixed(2), turn: r.turn, throwD: r.throwD === null ? null : +r.throwD.toFixed(2) }));
  process.stdout.write(JSON.stringify({ concept: pass.id, family: pass.family, pa: pass.family === 'playaction', qb: call.formation?.qb ?? null,
    lbs: out(L), saf: out(S), throwT, air: aim ? +(aim.x - sim.los).toFixed(1) : null, att: !!s.attempted, cmp: !!s.completed, sack: !!s.sacked,
    yards: +res.yards.toFixed(2) }) + '\n');
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });

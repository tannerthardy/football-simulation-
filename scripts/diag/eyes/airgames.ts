// QB lane 2026-11-18: league games; per thrown pass the air yards (intended), completion, interception.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let thr: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, away = false, ...rest: any[]) => { if (p === sim.qb && !thr) thr = away || !target ? { away: true } : { air: +((intended.x - sim.los) * sim.attackDir(sim.qb.team)).toFixed(1), P: p.behavior?.throwRec?.P ?? null, iR: p.behavior?.throwRec?.intRisk ?? null, t: +sim.t.toFixed(2) }; return tb(p, target, v0, intended, arrivalT, away, ...rest); };
  const res = orig.apply(this);
  console.log(JSON.stringify({ cov: sim.defCall?.coverage?.id, shell: sim.defCall?.coverage?.shell, thr, cmp: !!sim.stats.completed, int: sim.events.some((e: any) => e.type === 'interception'), sack: sim.events.some((e: any) => e.type === 'sack'), yards: res.yards }));
  return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });

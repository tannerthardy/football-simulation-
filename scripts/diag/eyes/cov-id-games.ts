// QB lane 2026-11-18: his coverage belief at his set against the truth, in league games (pass plays).
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { COVERAGE_BY_ID } from '../../../src/playbook/coverages.js';
const seed = Number(process.env.SEED ?? 101);
let n = 0; const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { n++; const sim: any = this; if (!sim.isPass) return orig.apply(this);
  let rec: any = null; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); const b: any = sim.qb.behavior; if (!rec && b?.kind === 'qb-pass' && b.setAt >= 0 && b.mind?.belief) { const top = Object.entries(b.mind.belief as Record<string, number>).sort((u, v) => v[1] - u[1])[0]; rec = { t: +sim.t.toFixed(2), top: top[0], p: +top[1].toFixed(3), pMan: +b.mind.pMan().toFixed(3), p1: +b.mind.pSingleHigh().toFixed(3) }; } };
  const res = orig.apply(this); const cov: any = sim.defCall?.coverage;
  if (rec) console.log(JSON.stringify({ play: n, concept: sim.offCall?.pass?.id, formation: sim.offCall?.formation?.id, motion: !!sim.offCall?.motion, dir: sim.attackDir(sim.qb.team), coverage: cov?.id, man: cov?.man, shell: cov?.shell, ...rec, int: sim.events.some((e: any) => e.type === 'interception') }));
  return res; };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });

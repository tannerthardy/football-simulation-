// QB lane 2026-11-18: his coverage belief against the truth in league games (pass plays): at 0.6, 1.1 and 1.6 s after
// the snap and at his set, the top coverage and its mass, his pMan and pSingleHigh; the truth's man / shell.
//   SEED=101 GAMES=1 node --import tsx scripts/diag/eyes/cov-id-games.ts > rows.jsonl
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const seed = Number(process.env.SEED ?? 101), games = Number(process.env.GAMES ?? 1);
let n = 0; const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { n++; const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const rec: Record<string, any> = {}; const tick0 = sim.tick.bind(sim);
  const snap = (m: any) => { const top = Object.entries(m.belief as Record<string, number>).sort((u, v) => v[1] - u[1])[0]; return { top: top[0], p: +top[1].toFixed(3), pMan: +m.pMan().toFixed(3), p1: +m.pSingleHigh().toFixed(3) }; };
  sim.tick = () => { tick0(); const m: any = sim.qbMind; const b: any = sim.qb.behavior; if (!m?.belief) return;
    for (const t of [0.3, 0.6, 1.1, 1.6]) if (!rec['t' + t] && Math.abs(sim.t - t) < 0.026) rec['t' + t] = snap(m);
    if (!rec.set && b?.kind === 'qb-pass' && b.setAt >= 0) rec.set = { at: +sim.t.toFixed(2), ...snap(m) }; };
  const res = orig.apply(this); const cov: any = sim.defCall?.coverage;
  console.log(JSON.stringify({ seed, play: n, concept: sim.offCall?.pass?.id, formation: sim.offCall?.formation?.id, coverage: cov?.id, man: cov?.man, shell: cov?.shell, ...rec,
    int: sim.events.some((e: any) => e.type === 'interception'), throwT: sim.throwAt >= 0 ? +sim.throwAt.toFixed(2) : null }));
  return res; };
for (let g = 0; g < games; g++) { const s = seed + g, rng = new Rng(s);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  simulateGame(leagueSample(home, s), leagueSample(away, s), { seed: s }); }

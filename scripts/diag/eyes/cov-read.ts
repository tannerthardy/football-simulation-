// QB lane 2026-11-18: one league play's post-snap coverage reads: at each read, his observed features [deep, mof,
// turned], each top coverage's canonical features and log-likelihood, and the belief after.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { COVERAGES } from '../../../src/playbook/coverages.js';
const seed = Number(process.env.SEED ?? 101), want = Number(process.env.PLAY ?? 35);
let n = 0; const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) { n++; const sim: any = this; if (n !== want) return orig.apply(this);
  let hooked = false; const tick0 = sim.tick.bind(sim);
  sim.tick = () => { tick0(); const m: any = sim.qb.behavior?.mind;
    if (!hooked && m) { hooked = true; const pr = m.postSnapRead.bind(m); m.postSnapRead = (w: number) => {
      const before = { ...m.belief }, obs = m.postFeaturesObserved(); console.log('memory', [...m.memory].map(([d, x]: any) => d.slot + '@' + x.t.toFixed(2) + ' depth ' + (x.pos.x - sim.los).toFixed(1)).join(' | '));
      const r = pr(w);
      const ids = [...new Set([sim.defCall.coverage.id, ...Object.entries(m.belief as Record<string, number>).sort((u, v) => v[1] - u[1]).slice(0, 3).map(([k]) => k), 'cover3', 'cover0'])];
      console.log('read t', sim.t.toFixed(2), 'w', w, 'took', r, 'obs', obs.map((x: number) => +x.toFixed(2)), 'rec', m.rec.toFixed(2), 'noise', m.noiseScale().toFixed(2));
      for (const id of ids) { const c: any = (COVERAGES as any[]).find((x) => x.id === id); const f = m.postFeaturesCanon(c, sim.t);
        console.log('   ', id, 'canon', f.map((x: number) => +x.toFixed(2)), 'prior', (before[id] ?? 0).toFixed(3), '-> post', (m.belief[id] ?? 0).toFixed(3)); }
      return r; }; } };
  return orig.apply(this); };
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
simulateGame(leagueSample(home, seed), leagueSample(away, seed), { seed });

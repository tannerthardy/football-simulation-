import { Rng } from '/home/user/fs-develop/src/core/rng.js';
import { simulateGame } from '/home/user/fs-develop/src/game/game.js';
import { generateTeam } from '/home/user/fs-develop/src/league/team.js';
const C = new Map<string, number>(); let n = 0; const life: number[] = [];
const hooks = { playResult: (sim: any) => {
  if (!sim.isPass) return sim.run();
  const dis = sim.disengage.bind(sim);
  sim.disengage = (e: any) => {
    const d = e.defender;
    if (e.type === 'pass' && /^(DT|NT)/.test(d.slot)) { const pre = sim.throwAt < 0 ? 'before throw' : 'after throw';
      const st = (new Error().stack ?? '').split('\n').slice(2, 4).map(s => s.trim().replace(/^at /, '').replace(/\(.*\/src\//, '(').replace(/\)$/, '')).join(' <- ');
      const key = `${pre} | ${st}`; C.set(key, (C.get(key) ?? 0) + 1); n++; life.push(sim.t - e.start);
    }
    return dis(e);
  };
  return sim.run(); } };
for (const seed of [101, 102]) { const rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never); }
life.sort((a, b) => a - b);
console.log(`interior pass reps ended: ${n}, rep length p50 ${life[Math.floor(life.length / 2)]?.toFixed(2)}`);
for (const [k, v] of [...C].sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`${(100 * v / n).toFixed(0)}%  ${k}`);

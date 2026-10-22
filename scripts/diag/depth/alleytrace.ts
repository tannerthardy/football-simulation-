/** Trace the nearest deep run supporter on runs reaching 20 yd (observation
 * only; flags from the environment). Every 0.2 s from the carrier 3 yd behind
 * the line until 12 yd past it: the carrier (yards past the line, lateral,
 * velocity) and the supporter (depth over the carrier, lateral gap, asked
 * and actual velocity, behavior). Deep support as depth/alleypath.py.
 * node --import tsx scripts/diag/depth/alleytrace.ts [--seed 101] [--games 2] [--plays 6] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import type { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const seed0 = Number(arg('--seed', '101')), games = Number(arg('--games', '2')), plays = Number(arg('--plays', '6'));
let shown = 0;
const f = (v: number) => v.toFixed(1).padStart(5);
const hooks = {
  playResult: (sim: PlaySim) => {
    if (sim.isPass) return sim.run();
    const dir = sim.attackDir('O');
    const deep = sim.defense.filter(d => (d.pos.x - sim.los) * dir >= 8 && Math.abs(d.pos.y - sim.ballY) <= 12);
    const lines: string[] = []; let best = 0, next = -1;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      const c = sim.carrier;
      if (!c || c.team !== 'O' || c === sim.qb || !deep.length) return;
      const past = (c.pos.x - sim.los) * dir; best = Math.max(best, past);
      if (past < -3 || past > 12 || sim.t < next) return;
      next = sim.t + .2 - 1e-9;
      const d = deep.reduce((p, q) => Math.hypot(q.pos.x - c.pos.x, q.pos.y - c.pos.y) < Math.hypot(p.pos.x - c.pos.x, p.pos.y - c.pos.y) ? q : p);
      const ask = sim.intents[d.idx]?.vel ?? { x: NaN, y: NaN }, side = Math.sign(c.pos.y - d.pos.y) || 1;
      lines.push(`t ${sim.t.toFixed(1)} back ${f(past)} vx ${f(c.vel.x * dir)} vy(away) ${f(c.vel.y * side)} | ${d.slot.padEnd(4)} ${(d.behavior?.kind ?? '?') + '/' + (d.runFit?.kind ?? '-')} deeper ${f((d.pos.x - c.pos.x) * dir)} gap ${f(Math.abs(d.pos.y - c.pos.y))} down ask/has ${f(-ask.x * dir)}/${f(-d.vel.x * dir)} across ask/has ${f(ask.y * side)}/${f(d.vel.y * side)}${d.engagement ? ' ENGAGED' : ''}`);
    };
    const r = sim.run();
    if (best >= 20 && shown < plays) { shown++; console.log(`--- run ${sim.offCall.label} vs ${sim.defCall.label}, gained ${best.toFixed(0)}`); console.log(lines.join('\n')); }
    return r;
  },
};
for (let g = 0; g < games && shown < plays; g++) {
  const seed = seed0 + g, rng = new Rng(seed);
  const home = generateTeam(rng, 'Home', 'HOM', { strength: .55 }), away = generateTeam(rng, 'Away', 'AWY', { strength: .55 });
  simulateGame(home, away, { seed, hooks } as never);
}

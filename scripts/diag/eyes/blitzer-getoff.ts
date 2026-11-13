/** Blitzer get-off in league games (as nfl_blitzer_getoff.py measures the NFL; passive): on plays with 5+ rushers at
 * 1.0 s, every non-DL defender on a rush/blitz behaviour at 1.0 s: his snap depth past the LOS, and at 0-1.2 s every
 * 0.2 s his speed, closing speed toward the QB, displacement toward the LOS from his snap spot, distance to the QB;
 * the time he first reaches 3 yd/s.
 *   node --import tsx scripts/diag/eyes/blitzer-getoff.ts [--seed 101] [--games 8] > out/eyes/getoff.jsonl */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seed = Number(arg('--seed', '101')), games = Number(arg('--games', '8'));
const DL = new Set(['DE', 'DT', 'NT', 'EDGE']);
const run = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: any) {
  const sim = this;
  if (sim.offCall?.kind !== 'pass') return run.call(this);
  const hist = new Map<any, any[]>(); const snap = new Map<any, any>(); let fast = new Map<any, number>(); let rushers: any[] | null = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!snap.size) for (const d of sim.defense) snap.set(d, { x: d.pos.x, y: d.pos.y });
    for (const d of sim.defense) {
      const sp = Math.hypot(d.vel.x, d.vel.y); if (!fast.has(d) && sp >= 3) fast.set(d, sim.t);
      const k = Math.round(sim.t / 0.2); if (Math.abs(sim.t - k * 0.2) < 1e-6 && k <= 6) {
        const Q = sim.qb.pos, dx = Q.x - d.pos.x, dy = Q.y - d.pos.y, L = Math.hypot(dx, dy) || 1, s0 = snap.get(d), dir = sim.attackDir('O');
        (hist.get(d) ?? hist.set(d, []).get(d)!).push({ t: +(k * 0.2).toFixed(1), speed: +sp.toFixed(2), close: +((d.vel.x * dx + d.vel.y * dy) / L).toFixed(2), toLos: +(-(d.pos.x - s0.x) * dir).toFixed(2), dist: +L.toFixed(2) });
      }
    }
    if (!rushers && sim.t >= 1.0) rushers = sim.defense.filter((d: any) => d.behavior?.kind === 'rush' || d.behavior?.kind === 'blitz');
  };
  const res = run.call(this);
  if (rushers && rushers.length >= 5) for (const d of rushers) {
    if (DL.has(d.player.position)) continue;
    const s0 = snap.get(d); const depth = (s0.x - sim.los) * sim.attackDir('O');
    process.stdout.write(JSON.stringify({ pos: d.player.position, depth: +depth.toFixed(2), to3: fast.get(d) ?? null, rows: hist.get(d) }) + '\n');
  }
  return res;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g });

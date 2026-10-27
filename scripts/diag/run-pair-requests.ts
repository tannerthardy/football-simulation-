/** Engaged run pairs: requests vs achieved motion of engaged run pairs, 0.6-1.8 s.
 *   node --import tsx scripts/diag/run-pair-requests.ts <seed> [games=2] | gzip > out/run/pairs-<seed>.jsonl.gz
 *   python3 -I scripts/diag/run_pair_requests.py out/run/pairs-*.jsonl.gz
 * Reads only; one JSON row per engaged run pair per tick, 0.6-1.8 s after the snap. */
import { Rng } from '../../src/core/rng.js';
import { simulateGame } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const seed = Number(process.argv[2] ?? 7), games = Number(process.argv[3] ?? 2);
const r3 = (x: number) => Math.round(x * 1000) / 1000;
let play = 0;
function watch(sim: PlaySim, id: number) {
  const s = sim as any, concept = s.offCall.run?.id;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (sim.t < 0.6 || sim.t > 1.8) return;
    const seen = new Set<any>();
    for (const a of sim.agents) {
      const e = a.engagement;
      if (!e || seen.has(e) || e.type !== 'run') continue;
      seen.add(e);
      const b = e.blocker, d = e.defender, ib = sim.intents[b.idx], id_ = sim.intents[d.idx];
      const car = sim.carrier;
      console.log(JSON.stringify([seed, id, concept, r3(sim.t), b.slot, d.slot, e.helpers.length,
        r3(ib.vel.x), r3(ib.vel.y), r3(id_.vel.x), r3(id_.vel.y), r3(b.vel.x), r3(b.vel.y), r3(d.vel.x), r3(d.vel.y),
        r3(d.pos.x - b.pos.x), r3(d.pos.y - b.pos.y), car ? r3(car.pos.y - (b.pos.y + d.pos.y) / 2) : null, car ? r3(car.vel.y) : null,
        (b.behavior as any).plan?.kind ?? b.behavior.kind, d.behavior.kind]));
    }
  };
}
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(home, away, { seed: seed + g, record: false, runOnly: true, hooks: {
  playResult(sim, kind) { if (kind === 'scrimmage' && !sim.isPass) watch(sim, play++); return undefined; } } });

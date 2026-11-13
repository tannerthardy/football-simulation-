/** Trace the second before in-game holds that break (development aid).
 *   node --import tsx scripts/diag/broken-hold-trace.ts [games] [seed] [max] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
import type { GraspJoint } from '../../src/physics/world.js';
const games = Number(process.argv[2] ?? 1);
const rng = new Rng(Number(process.argv[3] ?? 21));
const max = Number(process.argv[4] ?? 6);
let shown = 0;
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    const hist: string[][] = sim.agents.map(() => []);
    const seen = new Set<GraspJoint>();
    const start = new Map<GraspJoint, number>();
    const snap = new Map<GraspJoint, { d: string[]; c: string[] }>();
    while (sim.phase === 'live' && sim.t < 25) {
      tick.tick();
      for (const a of sim.agents) {
        const i = sim.intents[a.idx];
        const h = hist[a.idx];
        h.push(`${sim.t.toFixed(2)} ${a.slot} p(${a.pos.x.toFixed(2)},${a.pos.y.toFixed(2)}) v(${a.vel.x.toFixed(1)},${a.vel.y.toFixed(1)}) cmd(${i?.vel.x.toFixed(1)},${i?.vel.y.toFixed(1)}${i?.lunge ? ' L' + Math.hypot(i.lunge.x, i.lunge.y).toFixed(1) : ''}) ${a.body.support?.state} xi${Math.hypot(a.body.support!.xi.x, a.body.support!.xi.y).toFixed(2)}`);
        if (h.length > 16) h.shift();
      }
      for (const j of sim.world.joints) if (j.kind === 'grasp' && !start.has(j)) {
        start.set(j, sim.t);
        const d = sim.agents.find((a) => a.body === j.a)!, c = sim.agents.find((a) => a.body === j.b)!;
        snap.set(j, { d: [...hist[d.idx]], c: [...hist[c.idx]] });
      }
      for (const [j, t0] of start) {
        if (seen.has(j) || !j.broken || shown >= max) continue;
        seen.add(j);
        shown++;
        const d = sim.agents.find((a) => a.body === j.a)!, c = sim.agents.find((a) => a.body === j.b)!;
        console.log(`--- broken ${j.origin} made ${t0.toFixed(2)} broke ${sim.t.toFixed(2)} cap ${j.capacity.toFixed(0)} reach ${j.reach.toFixed(2)} legs ${j.legs.toFixed(2)}`);
        const sn = snap.get(j)!;
        void d; void c;
        for (let k = 0; k < sn.d.length; k++) console.log(`  D ${sn.d[k]}   |  C ${sn.c[k]}`);
      }
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    return sim.buildResult();
  },
};
for (let g = 0; g < games && shown < max; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);

/** Find long-YAC plays and trace defenders near the carrier after the catch (development aid). */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const rng = new Rng(Number(process.argv[2] ?? 21));
let shown = 0;
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    const lines: string[] = [];
    while (sim.phase === 'live' && sim.t < 25) {
      const n = sim.events.length;
      tick.tick();
      const c = sim.carrier;
      if (c && sim.catchAt >= 0 && c.team === 'O') {
        const near = sim.defense.filter((d) => Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y) < 4).map((d) => {
          const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
          return `${d.slot}@${dist.toFixed(1)} v${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)} ${d.body.support?.state}${d.isDown(sim.t) ? '' : ''}${d.engagement ? ' E' : ''}`;
        }).join(' | ');
        const ev = sim.events.slice(n).filter((e) => e.type !== 'read').map((e) => `${e.type}${e.note ? '(' + e.note + ')' : ''}:${e.a !== undefined ? sim.agents[e.a].slot : ''}`).join(' ');
        lines.push(`${sim.t.toFixed(2)} C ${c.slot}(${c.pos.x.toFixed(1)},${c.pos.y.toFixed(1)} v${c.vel.x.toFixed(1)},${c.vel.y.toFixed(1)} ${c.body.support?.state}) ${near} ${ev}`);
      }
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    const r = sim.buildResult();
    if ((r.stats.yac ?? 0) > 25 && shown < 2) { shown++; console.log(`--- YAC ${r.stats.yac?.toFixed(1)} outcome ${r.outcome}`); console.log(lines.slice(0, 45).join('\n')); }
    return r;
  },
};
simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);

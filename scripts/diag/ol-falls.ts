/** Trace the half second before offensive linemen fall (development aid).
 *   node --import tsx scripts/diag/ol-falls.ts [games] [seed] [max] */
import { Rng } from '../../src/core/rng.js';
import { generateTeam } from '../../src/league/team.js';
import { simulateGame } from '../../src/game/game.js';
import type { PlaySim } from '../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 1);
const rng = new Rng(Number(process.argv[3] ?? 21));
const max = Number(process.argv[4] ?? 5);
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
let shown = 0;
const causes: Record<string, number> = {};
const hooks = {
  playResult: (sim: PlaySim) => {
    const tick = sim as unknown as { tick(): void };
    const hist = new Map<number, string[]>();
    while (sim.phase === 'live' && sim.t < 25) {
      tick.tick();
      const r = sim.lastStep!;
      for (const a of sim.agents) {
        if (!OL.has(a.slot)) continue;
        const s = a.body.support!, e = a.engagement;
        const lines = hist.get(a.idx) ?? [];
        const touch = r.contacts.filter((c) => c.i === a.idx || c.j === a.idx).map((c) => `${sim.agents[c.i === a.idx ? c.j : c.i].slot}:${(c.impulse / a.profile.massKg).toFixed(2)}`).join(',');
        lines.push(`${sim.t.toFixed(2)} ${a.slot} v(${a.vel.x.toFixed(1)},${a.vel.y.toFixed(1)}) cmd(${sim.intents[a.idx]?.vel.x.toFixed(1)},${sim.intents[a.idx]?.vel.y.toFixed(1)} p${sim.intents[a.idx]?.push ?? 0}) ${s.state} xi(${s.xi.x.toFixed(2)},${s.xi.y.toFixed(2)}) lean${Math.hypot(s.lean.x, s.lean.y).toFixed(0)} felt${Math.hypot(s.felt.x, s.felt.y).toFixed(0)} ${e ? `${e.type} vs ${e.defender.slot} phi${e.phi.toFixed(2)} N${e.hands?.normalForce?.toFixed(0)} T${e.hands?.tangentForce?.toFixed(0)}` : '-'} touch[${touch}]`);
        if (lines.length > 12) lines.shift();
        hist.set(a.idx, lines);
      }
      for (const i of r.falls) {
        const a = sim.agents[i];
        if (!OL.has(a.slot)) continue;
        const cause = a.body.support?.cause ?? '?';
        const k = `${sim.isPass ? 'pass' : 'run'} ${cause}`;
        causes[k] = (causes[k] ?? 0) + 1;
        if (shown < max) { shown++; console.log(`--- ${a.slot} falls (${cause}) on a ${sim.isPass ? 'pass' : 'run'} play at t=${sim.t.toFixed(2)}`); for (const l of hist.get(i) ?? []) console.log('  ' + l); }
      }
    }
    if (sim.phase === 'live') sim.whistle('timeout', sim.qb.pos);
    return sim.buildResult();
  },
};
for (let g = 0; g < games; g++) simulateGame(generateTeam(rng, 'H', 'HHH', { strength: 0.55 }), generateTeam(rng, 'A', 'AAA', { strength: 0.55 }), { seed: rng.nextU32(), hooks } as never);
console.log(causes);

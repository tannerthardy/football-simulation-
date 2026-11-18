// node --import tsx scripts/diag/eyes/pump-count.ts [seed] [games] > rows.jsonl
// Integration / the user (2026-11-17): how often our quarterbacks pump, where, and whether it is a trait. One row per
// dropback (pass play with a QB pass behavior): pumps (the 'pump' event: pullDown at the plant, a committed throw that
// went bad on the last look), and for each pump his phase (set / out of the pocket), time, believed pressure time, and
// the play's family (play action / boot); the QB's identity and ratings. Passive.
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const orig = PlaySim.prototype.run;
PlaySim.prototype.run = function (this: PlaySim) {
  const sim: any = this; if (!sim.isPass) return orig.apply(this);
  const pumps: any[] = []; const ev0 = sim.event.bind(sim);
  sim.event = (type: string, ...rest: any[]) => {
    if (type === 'pump') { const b: any = sim.qb.behavior; let pt: number | null = null; try { pt = b.pressure(sim.qb, sim).time; } catch { /* */ }
      pumps.push({ t: +sim.t.toFixed(2), out: !!b?.out, phase: b?.phase ?? null, pressure: pt === null ? null : +Math.min(pt, 9).toFixed(2), sinceSet: b?.setAt >= 0 ? +(sim.t - b.setAt).toFixed(2) : null }); }
    return ev0(type, ...rest);
  };
  const res: any = orig.apply(this);
  const q = sim.qb.player, r = q.ratings;
  console.log(JSON.stringify({ family: sim.offCall?.pass?.family ?? null, concept: sim.offCall?.pass?.id ?? null, qb: q.id, pumps, end: +sim.t.toFixed(2),
    threw: sim.events.some((e: any) => e.type === 'throw' || e.type === 'pass'), scramble: sim.events.some((e: any) => e.type === 'scramble'),
    ratings: { decisionMaking: r.decisionMaking, anticipation: r.anticipation, composure: r.composure, throwOnRun: r.throwOnRun, awareness: r.awareness } }));
  return res;
};
const seed = Number(process.argv[2] ?? 11);
for (let s = 0; s < Number(process.argv[3] ?? 3); s++) { const rng = new Rng(seed + 100 * s); const home = generateTeam(rng, 'Home', 'HOM'), away = generateTeam(rng, 'Away', 'AWY');
  for (let g = 0; g < 3; g++) simulateGame(home, away, { seed: seed + 100 * s + g }); }

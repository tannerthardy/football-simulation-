/** Climbs off a double team (observation only, sim internals). For every
 * RunBlocker departure (plan.departure: leaving the old down man for a
 * backer), its duration until the route is clear (or the plan changes), the
 * climber's mean speed and upfield speed during it, and the distance to the
 * backer at its start and end. By concept.
 * node --import tsx scripts/diag/stretch/departure.ts [--formations ace_12,i_pro_21] [--concepts iz,oz,power,counter] [--seeds 77,71001] */
import type { Agent } from '../../../src/sim/agent.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const q = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s.length ? `${s[s.length >> 2].toFixed(2)}/${s[s.length >> 1].toFixed(2)}/${s[(3 * s.length) >> 2].toFixed(2)}` : '-'; };
const rows = new Map<string, { dur: number[]; speed: number[]; up: number[]; d0: number[]; d1: number[]; n: number }>();
const Rs = rosters();
for (const formation of list('--formations', 'ace_12,i_pro_21')) for (const concept of list('--concepts', 'iz,oz,power,counter'))
  for (const dir of ['strong', 'weak'] as const) for (const look of LOOK_SPECS.map(l => l[0]))
    for (const roster of ['pair11', 'pair31']) for (const seed of list('--seeds', '77,71001').map(Number)) {
      const sim = makeSim({ concept, dir, look, roster, seed, formation } as LabCase, Rs);
      const up = sim.attackDir('O');
      const open = new Map<Agent, { t0: number; dist: number; up: number; n: number; backer: Agent; d0: number }>();
      const row = rows.get(concept) ?? { dur: [], speed: [], up: [], d0: [], d1: [], n: 0 }; rows.set(concept, row);
      const close = (a: Agent, o: { t0: number; dist: number; up: number; n: number; backer: Agent; d0: number }) => {
        row.n++; row.dur.push(sim.t - o.t0); row.speed.push(o.dist / Math.max(1, o.n)); row.up.push(o.up / Math.max(1, o.n)); row.d0.push(o.d0);
        row.d1.push(Math.hypot(o.backer.pos.x - a.pos.x, o.backer.pos.y - a.pos.y)); open.delete(a);
      };
      while (sim.phase === 'live' && sim.t < 8) {
        sim.tick();
        for (const a of sim.offense) {
          const b = a.behavior instanceof RunBlocker ? a.behavior : null;
          const dep = b?.plan.departure;
          const o = open.get(a);
          if (dep && !o) open.set(a, { t0: sim.t, dist: 0, up: 0, n: 0, backer: dep.backer, d0: Math.hypot(dep.backer.pos.x - a.pos.x, dep.backer.pos.y - a.pos.y) });
          else if (dep && o) { o.dist += Math.hypot(a.vel.x, a.vel.y); o.up += a.vel.x * up; o.n++; }
          else if (!dep && o) close(a, o);
        }
      }
      for (const [a, o] of open) close(a, o);
    }
for (const [c, r] of rows) console.log(`${c}: departures ${r.n} | duration p25/50/75 ${q(r.dur)} s | mean speed ${q(r.speed)} yd/s, upfield ${q(r.up)} | to backer at start ${q(r.d0)} -> end ${q(r.d1)} yd`);

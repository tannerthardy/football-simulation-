/** One creaselab rep, traced: for each engaged framer at the crossing, every
 * 0.1 s over the last 1.5 s, his and his blocker's lateral velocity toward
 * the hole (requested / achieved), the hand joint's tangent force against
 * its steer limit and who acts it, each body's felt load, and the
 * controller's branch (declared, working off). Observation only.
 * node --import tsx scripts/diag/runblock/framertrace.ts CELL REP [--seed 7]
 * CELL as creaselab's cell key, e.g. ace_11:iz_strong:over:true:26.666666666666668 */
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { runContactObservers } from '../../../src/sim/run-contact-observer.js';

const [cell, repStr] = process.argv.slice(2);
const seedArg = process.argv.indexOf('--seed');
const seed = seedArg >= 0 ? Number(process.argv[seedArg + 1]) : 7;
const [form, concept, front, flipS, ballYS] = cell.split(':');
const rng = new Rng(seed);
const home = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.55 });
const away = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID[form];
const personnel = formation.personnel === '11' ? 'nickel' : 'base43';
const make = () => new PlaySim({ offense: pickOffense(home, formation.personnel), defense: pickDefense(away, personnel),
  offCall: { formation, flip: flipS === 'true', kind: 'run', run: RUN_BY_ID[concept], label: concept },
  defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
  los: 40, ballY: Number(ballYS), firstDownX: 50, seed: rng.fork(`${cell}:${repStr}`) });

type Line = string;
const lines = new Map<string, Line[]>();
type Crossing = { t: number; hole: number; framers: string[] };
let crossing: Crossing | null = null;
for (const pass of [0, 1]) {
  const sim = make();
  const last = new Map<Agent, Record<string, unknown>>(), blk = new Map<Agent, Record<string, unknown>>();
  runContactObservers.set(sim, (rep, phase, data) => {
    if (phase === 'defender-movement') last.set(rep.defender, data);
    if (phase === 'movement') blk.set(rep.defender, data);
  });
  const tick = sim.tick.bind(sim);
  let nextT = 0;
  sim.tick = () => {
    tick();
    const c = sim.carrier;
    if (pass === 0 && !crossing && c && c.team === 'O' && c !== sim.qb && (c.pos.x - sim.los) * sim.attackDir('O') >= 0) {
      const near = sim.defense.filter(d => Math.abs(d.pos.x - c.pos.x) <= 1.5 && Math.abs(d.pos.y - c.pos.y) <= 8);
      const fr = [-1, 1].map(s => near.filter(d => (d.pos.y - c.pos.y) * s > 0)
        .sort((p, q) => Math.abs(p.pos.y - c.pos.y) - Math.abs(q.pos.y - c.pos.y))[0]).filter((d): d is Agent => !!d?.engagement);
      crossing = { t: sim.t, hole: c.pos.y, framers: fr.map(d => d.slot) };
    }
    if (pass === 1 && crossing && sim.t >= nextT - 1e-9 && sim.t > crossing.t - 1.5 && sim.t <= crossing.t + 1e-9) {
      nextT = sim.t + 0.1;
      for (const slot of crossing.framers) {
        const d = sim.slot(slot)!, e = d.engagement;
        const s = Math.sign(crossing.hole - d.pos.y);
        const f2 = (x: number | undefined) => (x ?? NaN).toFixed(2).padStart(6);
        if (!e) { (lines.get(slot) ?? lines.set(slot, []).get(slot)!).push(`${sim.t.toFixed(2)} not engaged`); continue; }
        const b = e.blocker, j = e.hands, m = last.get(d), bm = blk.get(d);
        const dFelt = d.body.support?.felt, bFelt = b.body.support?.felt;
        (lines.get(slot) ?? lines.set(slot, []).get(slot)!).push(
          `${sim.t.toFixed(2)} off ${f2(Math.abs(crossing.hole - d.pos.y))} | D req ${f2((sim.intents[d.idx]?.vel.y ?? 0) * s)} got ${f2(d.vel.y * s)} reqX ${f2((sim.intents[d.idx]?.vel.x ?? 0) * -sim.attackDir('O'))} face ${f2(d.facing)}`
          + ` | B ${b.slot} req ${f2((sim.intents[b.idx]?.vel.y ?? 0) * s)} got ${f2(b.vel.y * s)} | ctl ${f2(e.control)} tan ${f2(j?.tangentForce)}/${f2(j?.steer)} actor ${j?.actor === d.body ? 'D' : 'B'}`
          + ` | feltD ${f2((dFelt?.y ?? 0) * s)} feltB ${f2((bFelt?.y ?? 0) * s)} | decl ${m?.declared ? 1 : 0} off ${m?.workOff ? 1 : 0} help ${e.helpers.length} seal ${f2(bm?.seal as number)} corr ${f2(bm?.correction as number)}`);
      }
    }
  };
  const r = sim.run();
  const at = crossing as Crossing | null;
  if (pass === 1) console.log(`${cell} rep ${repStr}: ${r.offenseYards.toFixed(1)} yd, crossed at ${at?.t.toFixed(2)} s; framers ${at?.framers.join(', ')}  (lateral values: + = toward the hole)`);
}
for (const [slot, L] of lines) { console.log(`-- ${slot}`); for (const l of L) console.log('  ' + l); }

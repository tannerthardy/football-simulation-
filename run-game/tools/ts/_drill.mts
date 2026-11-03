// Two-man engaged-block drills on an empty field. Real engagement (sim.engage) so
// stepRunRep runs; every other body parked far away. Prints, per 0.25 s, both
// players' final engaged intent (after the engagement stage) and achieved motion.
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { stand } from '../../src/sim/behaviors/common.js';
import { PlaySim } from '../../src/sim/playsim.js';

const LOS = 40, formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });
export type Arm = { name: string; drive?: { x: number; y: number }; carrier?: { x: number; y: number; vy?: number };
  setup?: (sim: any, c: any, lb: any) => void; T?: number; verbose?: boolean };
export function drill(arm: Arm) {
  const sim: any = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) {
    a.body.pos = { x: 90 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) }; a.snapReadyAt = 0;
  }
  const c = sim.slot('C'), rb = sim.slot('RB'); let lb = sim.slot('LB_M');
  const gap = c.profile.radius + lb.profile.radius;
  c.body.pos = { x: LOS + 2, y: CENTER_Y }; c.body.facing = 0;
  lb.body.pos = { x: LOS + 2 + gap + .05, y: CENTER_Y }; lb.body.facing = Math.PI;
  const cp = arm.carrier ?? { x: LOS - 6, y: CENTER_Y - 12 };
  rb.body.pos = { x: cp.x, y: cp.y }; rb.body.vel = { x: 0, y: cp.vy ?? 0 };
  rb.behavior = { kind: 'run', update: () => ({ vel: { x: 0, y: cp.vy ?? 0 }, facing: 0 }) };
  sim.ball = { kind: 'held', carrier: rb }; sim.phase = 'live'; sim.t = 2; sim.world.time = 2;
  for (let k = 0; k < 30; k++) sim.perception.record(sim.agents, rb.idx);
  arm.setup?.(sim, c, lb);
  if ((arm as any).defender) lb = sim.slot((arm as any).defender);
  if (arm.verbose) console.log('   runFit', JSON.stringify(lb.runFit), 'recog', JSON.stringify(lb.recog));
  const e = sim.engage(c, lb, 'run', arm.drive ?? { x: 1, y: 0 });
  if (!e) return { name: arm.name, error: 'no engagement' };
  if ((arm as any).after) e.wall = true;
  const c0 = { ...c.pos }, l0 = { ...lb.pos }, rows: string[] = [];
  const T = arm.T ?? 1; let ended = '';
  for (let k = 1; k <= Math.round(T / sim.dt); k++) {
    sim.tick();
    if (!c.engagement && !ended) ended = `engagement ended at ${sim.t.toFixed(2)} (${sim.events.filter((ev: any) => ev.type === 'shed').length ? 'shed' : 'other'})`;
    if (arm.verbose && k % 5 === 0) {
      const ic = sim.intents[c.idx], il = sim.intents[lb.idx];
      rows.push(`   t+${(k * sim.dt).toFixed(2)} C req(${ic.vel.x.toFixed(2)},${ic.vel.y.toFixed(2)}) v(${c.vel.x.toFixed(2)},${c.vel.y.toFixed(2)}) | LB req(${il.vel.x.toFixed(2)},${il.vel.y.toFixed(2)}) v(${lb.vel.x.toFixed(2)},${lb.vel.y.toFixed(2)}) ctrl ${e.control?.toFixed(2)}`);
    }
  }
  return { name: arm.name, C: { dx: c.pos.x - c0.x, dy: c.pos.y - c0.y }, LB: { dx: lb.pos.x - l0.x, dy: lb.pos.y - l0.y }, ended, rows,
    kg: [c.profile.massKg, lb.profile.massKg].map((m: number) => m.toFixed(0)).join('/') };
}
const f = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2);
export function show(r: any) {
  if (r.error) { console.log(r.name, r.error); return; }
  console.log(`${r.name.padEnd(44)} C (${f(r.C.dx)},${f(r.C.dy)})  LB (${f(r.LB.dx)},${f(r.LB.dy)})  kg ${r.kg} ${r.ended}`);
  for (const row of r.rows) console.log(row);
}
if (process.argv[1]?.endsWith('_drill.mts')) {
  show(drill({ name: 'D0 head-up, ball far away, no reason to move', verbose: true }));
}

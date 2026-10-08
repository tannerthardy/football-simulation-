/**
 * Open-field lab: a ball carrier at speed vs. defenders at set geometry.
 *   npx tsx scripts/open-field-lab.ts [scenario] [reps]
 * Scenarios: square (one defender 8 yd ahead), angle (defender 6 yd ahead,
 * 6 yd inside), chase (defender 2 yd behind), two (square + angle).
 */
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import { Pursuit } from '../src/sim/behaviors/defense.js';

const [scenario = 'square', repsStr = '300', seedStr = '1'] = process.argv.slice(2);
const reps = Number(repsStr);
const rng = new Rng(Number(seedStr));
const off = generateTeam(rng, 'O', 'OFF');
const def = generateTeam(rng, 'D', 'DEF');
const offense = pickOffense(off, '11');
const defense = pickDefense(def, 'nickel');
const geometry: Record<string, Array<[string, number, number]>> = {
  square: [['FS', 8, 0]],
  angle: [['FS', 6, 6]],
  chase: [['CB_S', -2, 1]],
  two: [['FS', 8, 0], ['SS', 6, 7]],
};
let yards = 0;
let tackled = 0;
let td = 0;
let missed = 0;
let broken = 0;
const dist: number[] = [];
for (let i = 0; i < reps; i++) {
  const sim = new PlaySim({
    offense, defense,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 30, ballY: 26.67, firstDownX: 40, seed: rng.nextU32(),
  });
  // Park everyone far away; set up the carrier (Z) at speed and the defenders.
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + a.idx * 0.1, y: a.idx * 2 + 1 };
    a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99;
  }
  const c = sim.slot('Z')!;
  c.downUntil = -1;
  c.body.pos = { x: 50, y: 26.67 };
  c.body.vel = { x: 7, y: 0 };
  c.body.facing = 0;
  sim.ball = { kind: 'held', carrier: c };
  sim.catchAt = 0;
  sim.catchX = 50;
  c.behavior = new BallCarrier({}, c);
  for (const [slot, dx, dy] of geometry[scenario]) {
    const d = sim.slot(slot)!;
    d.downUntil = -1;
    d.body.pos = { x: 50 + dx, y: 26.67 + dy };
    d.body.vel = { x: dx > 0 ? -2 : 7, y: 0 };
    d.body.facing = dx > 0 ? Math.PI : 0;
    d.readAt = 0;
    d.behavior = new Pursuit();
  }
  for (const a of sim.agents) if (a.downUntil === 99) a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  // Warm up perception history with the staged positions.
  for (let k = 0; k < 10; k++) sim.perception.record(sim.agents.map((a) => a.body));
  while (sim.phase === 'live' && sim.t < 12) {
    sim.tick();
    if (process.env.TRACE && i === 0 && sim.t < 2.5) {
      const d = sim.slot(geometry[scenario][0][0])!;
      console.log(`t=${sim.t.toFixed(2)} C (${c.pos.x.toFixed(1)},${c.pos.y.toFixed(1)}) v(${c.vel.x.toFixed(1)},${c.vel.y.toFixed(1)}) | D (${d.pos.x.toFixed(1)},${d.pos.y.toFixed(1)}) v(${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)}) down=${d.isDown(sim.t)} dist ${Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y).toFixed(2)}`);
    }
  }
  if (process.env.TRACE && i === 0) console.log(sim.events.map((e) => `${e.t} ${e.type} ${e.note ?? ''}`).join('\n'));
  const g = (sim.endSpot?.x ?? c.pos.x) - 50;
  yards += g;
  dist.push(g);
  if (sim.outcome === 'tackle') tackled++;
  if (sim.outcome === 'touchdown') td++;
  missed += sim.stats.missedTackles;
  broken += sim.stats.brokenTackles;
}
dist.sort((a, b) => a - b);
console.log(`${scenario}: avg gain ${(yards / reps).toFixed(1)} median ${dist[Math.floor(reps / 2)].toFixed(1)} p90 ${dist[Math.floor(reps * 0.9)].toFixed(1)} tackled ${((tackled / reps) * 100).toFixed(0)}% TD ${((td / reps) * 100).toFixed(0)}% missed/rep ${(missed / reps).toFixed(2)} broken/rep ${(broken / reps).toFixed(2)}`);

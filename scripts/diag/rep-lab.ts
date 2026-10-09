/** One-on-one block reps with everyone else parked (development aid).
 * node --import tsx scripts/diag/rep-lab.ts [reps] [type=run|pass] [driveY=0] [trace]
 * Run: the defender works toward a carrier standing 4 yd to one side; the
 * blocker drives along (1, driveY). Reports how long reps last and how they end. */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { createEngagement } from '../../src/sim/engagement.js';
const [repsS = '40', type = 'run', driveYS = '0', traceS = '0'] = process.argv.slice(2);
const reps = Number(repsS), driveY = Number(driveYS), trace = traceS === '1';
const rng = new Rng(3);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 }), def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const ends: Record<string, number> = {};
const lasted: number[] = [];
let held25 = 0, push = 0, falls = 0;
for (let r = 0; r < reps; r++) {
  const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'base43'),
    offCall: type === 'run' ? { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'lab' }
      : { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32() });
  const ol = ['LG', 'RG', 'C', 'LT', 'RT'][r % 5], dl = ['DT_S', 'DT_W', 'DE_S', 'DE_W'][r % 4];
  const b = sim.slot(ol)!, d = sim.slot(dl)!;
  for (const a of sim.agents) {
    if (a === b || a === d || a === sim.qb || (type === 'run' && a.slot === 'RB')) continue;
    a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  }
  const side = r % 2 ? 1 : -1;
  b.body.pos = { x: 39.6, y: CENTER_Y }; d.body.pos = { x: 39.6 + b.profile.radius + d.profile.radius + 0.1, y: CENTER_Y + rng.range(-0.3, 0.3) };
  b.body.facing = 0; d.body.facing = Math.PI;
  sim.t = 0.5;
  if (type === 'run') {
    const rb = sim.slot('RB')!;
    rb.body.pos = { x: 36, y: CENTER_Y + side * 4 };
    rb.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
    sim.ball = { kind: 'held', carrier: rb } as never;
    sim.qb.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
    sim.qb.body.pos = { x: 30, y: 5 };
  } else {
    sim.qb.body.pos = { x: 33, y: CENTER_Y };
    sim.qb.behavior = { kind: 'qb-hold', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as never;
  }
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const len = Math.hypot(1, driveY);
  const e = createEngagement(sim, b, d, type as 'run' | 'pass', type === 'run' ? { x: 1 / len, y: driveY / len } : null);
  if (!e) { ends['no-contact'] = (ends['no-contact'] ?? 0) + 1; continue; }
  const tick = sim as unknown as { tick(): void };
  const start = sim.t, x0 = d.pos.x;
  let end = 'held';
  while (sim.t < start + 3) {
    tick.tick();
    if (trace && r < 2) console.log(sim.t.toFixed(2), `phi ${e.phi.toFixed(2)} c ${e.control.toFixed(2)} sep ${Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y).toFixed(2)} B(${b.pos.x.toFixed(2)},${b.pos.y.toFixed(2)} v${b.vel.x.toFixed(1)},${b.vel.y.toFixed(1)} ${b.body.support!.state} a${e.baseB.toFixed(2)}) D(${d.pos.x.toFixed(2)},${d.pos.y.toFixed(2)} v${d.vel.x.toFixed(1)},${d.vel.y.toFixed(1)} ${d.body.support!.state}) hands N${e.hands?.normalForce?.toFixed(0)} T${e.hands?.tangentForce?.toFixed(0)} steer${e.hands?.steer.toFixed(0)} iB ${JSON.stringify(sim.intents[b.idx]?.vel)} iD ${JSON.stringify(sim.intents[d.idx]?.vel)} fB ${b.facing.toFixed(2)} leanB ${Math.hypot(b.body.support!.lean.x,b.body.support!.lean.y).toFixed(0)} leanD ${Math.hypot(d.body.support!.lean.x,d.body.support!.lean.y).toFixed(0)} postB ${b.body.support!.posture.toFixed(2)} postD ${d.body.support!.posture.toFixed(2)}`);
    if (!sim.engagements.includes(e)) { const ev = [...sim.events].reverse().find((x) => x.type === 'shed'); end = ev?.note ?? 'ended'; break; }
  }
  ends[end] = (ends[end] ?? 0) + 1;
  lasted.push(sim.t - start);
  if (sim.t - start >= 2.5 && end === 'held') held25++;
  push += (d.pos.x - x0) * (type === 'run' ? 1 : -1);
  falls += sim.events.filter((x) => x.type === 'fall').length;
}
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
console.log(`${type} reps ${reps}: held 2.5s ${(100 * held25 / reps).toFixed(0)}%  mean lasted ${avg(lasted).toFixed(2)}s  defender displaced ${(push / reps).toFixed(2)} yd (${type === 'run' ? 'downfield' : 'toward QB'})  falls/rep ${(falls / reps).toFixed(2)}`);
console.log(ends);

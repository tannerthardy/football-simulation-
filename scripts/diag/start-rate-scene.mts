/**
 * Start rate from rest: how fast does a free body reach speed when it asks for
 * top speed? (Defense's free OZ backer: requests ~9 yd/s facing travel and
 * reaches 0.92 at 0.5 s, 2.35 at 1.0 s; #400 climbers 1.4-2.0 at 0.3 s.)
 *
 * One player alone (everyone else parked far away, idle), at rest, live phase,
 * snap cue already passed. He asks for his vmax in a direction `turn` degrees
 * off his initial facing, and asks to face the travel direction. Reported:
 * achieved speed at 0.25/0.5/1.0/1.5 s, against the profile's own sprint law
 * v(t) = vmax (1 - exp(-t / tau)) (src/players/physical.ts), which already
 * includes the in-game burst factor fitted to NGS per-play accelerations.
 *
 * Usage: tsx scripts/diag/start-rate-scene.mts
 */
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
const TIMES = [.25, .5, 1, 1.5];

function run(slot: string, turnDeg: number) {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'IZ' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 }; a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => stand(a.facing) } as any; a.snapReadyAt = 0;
  }
  const me = sim.agents.find(a => a.slot === slot)!, rb = sim.slot('RB')!;
  const face0 = me.team === 'D' ? Math.PI : 0;
  me.body.pos = { x: LOS + 3, y: CENTER_Y - 8 }; me.body.facing = face0;
  rb.body.pos = { x: LOS - 6, y: CENTER_Y + 15 };
  const dir = face0 + turnDeg * Math.PI / 180, v = me.profile.vmax;
  me.behavior = { kind: 'sprint', update: () => ({ vel: { x: Math.cos(dir) * v, y: Math.sin(dir) * v }, facing: dir }) } as any;
  sim.ball = { kind: 'held', carrier: rb } as typeof sim.ball;
  sim.phase = 'live' as any;
  const out: number[] = [];
  for (let k = 1; k <= Math.round(1.5 / sim.dt); k++) {
    sim.tick();
    if (TIMES.some(t => Math.abs(t - k * sim.dt) < 1e-6)) out.push(Math.hypot(me.vel.x, me.vel.y));
  }
  const law = TIMES.map(t => me.profile.vmax * (1 - Math.exp(-t / me.profile.tau)));
  return { out, law, vmax: me.profile.vmax, tau: me.profile.tau, kg: me.profile.massKg, pos: me.player.position };
}

const f = (x: number) => x.toFixed(2);
for (const slot of ['LB_M', 'LB_W', 'C', 'RB'] ) for (const turn of [0, 45, 90]) {
  const r = run(slot, turn);
  console.log(`${slot.padEnd(4)} ${r.pos.padEnd(3)} ${r.kg.toFixed(0)} kg vmax ${f(r.vmax)} tau ${f(r.tau)} | turn ${String(turn).padStart(2)}° | achieved @${TIMES.join('/')} s: ${r.out.map(f).join(' ')} | sprint law: ${r.law.map(f).join(' ')} | ratio @0.5/1.0: ${f(r.out[1] / r.law[1])} ${f(r.out[2] / r.law[2])}`);
}

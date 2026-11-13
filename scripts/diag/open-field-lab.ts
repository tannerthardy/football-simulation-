/** Open-field tackling with real carrier and pursuit behaviors (development aid).
 * node --import tsx scripts/diag/open-field-lab.ts [reps] [scenario=front|side|trail|two]  */
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import type { Agent } from '../../src/sim/agent.js';
import { BallCarrier } from '../../src/sim/behaviors/carrier.js';
import { chase } from '../../src/sim/behaviors/common.js';
const [repsS = '60', scen = 'front'] = process.argv.slice(2);
const reps = Number(repsS);
const rng = new Rng(11);
const yacs: number[] = [], times: number[] = [];
let missed = 0, broken = 0, wraps = 0, td = 0, falls = 0;
for (let r = 0; r < reps; r++) {
  const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 }), def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
  const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32() });
  const c = sim.slot('Z')!;
  const ds = scen === 'two' ? [sim.slot('FS')!, sim.slot('CB_S')!] : [sim.slot(scen === 'trail' ? 'CB_S' : 'FS')!];
  for (const a of sim.agents) {
    if (a === c || ds.includes(a)) continue;
    a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  }
  const y0 = CENTER_Y + rng.range(-4, 4);
  c.body.pos = { x: 50, y: y0 }; c.body.vel = { x: 7, y: rng.range(-1, 1) }; c.body.facing = 0;
  const place = (d: typeof c, kind: string) => {
    if (kind === 'front') { d.body.pos = { x: 50 + rng.range(7, 10), y: y0 + rng.range(-3, 3) }; d.body.vel = { x: -2, y: 0 }; d.body.facing = Math.PI; }
    if (kind === 'side') { d.body.pos = { x: 50 + rng.range(3, 5), y: y0 + rng.range(5, 7) * (rng.chance(0.5) ? 1 : -1) }; d.body.vel = { x: 0, y: 0 }; }
    if (kind === 'trail') { d.body.pos = { x: 50 - rng.range(1, 2), y: y0 + rng.range(-1, 1) }; d.body.vel = { x: 6.5, y: 0 }; d.body.facing = 0; }
  };
  if (scen === 'two') { place(ds[0], 'front'); place(ds[1], 'trail'); } else place(ds[0], scen);
  sim.t = 2.5; sim.catchAt = 2.4;
  sim.ball = { kind: 'held', carrier: c } as never;
  sim.segments.push({ team: 'O', carrier: c.player.id, how: 'catch', startX: c.pos.x, endX: c.pos.x, end: 'live' });
  c.behavior = new BallCarrier({}, c);
  for (const d of ds) d.behavior = { kind: 'pursuit', update: (a: Agent, s: PlaySim) => chase(s, a, c) } as never;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const tick = sim as unknown as { tick(): void };
  const x0 = c.pos.x, t0 = sim.t;
  while (sim.phase === 'live' && sim.t < t0 + 8) tick.tick();
  const end = sim.endSpot?.x ?? c.pos.x;
  yacs.push(Math.min(end, 110) - x0); times.push(sim.t - t0);
  if (sim.outcome === 'touchdown' || end >= 109) td++;
  missed += sim.events.filter((e) => e.type === 'missed_tackle').length;
  broken += sim.events.filter((e) => e.type === 'broken_tackle').length;
  wraps += sim.events.filter((e) => e.type === 'tackle_wrap').length;
  falls += sim.events.filter((e) => e.type === 'fall').length;
}
const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
console.log(`${scen}: reps ${reps} YAC mean ${avg(yacs).toFixed(2)} median ${med(yacs).toFixed(2)} time ${avg(times).toFixed(2)}s  TD/escape ${td}  wraps/rep ${(wraps / reps).toFixed(2)} missed/rep ${(missed / reps).toFixed(2)} broken/rep ${(broken / reps).toFixed(2)} falls/rep ${(falls / reps).toFixed(2)}`);

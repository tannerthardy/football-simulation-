/**
 * Solo tackle lab: one ball carrier and one tackler, everyone else out of the
 * play, at fixed approach angles and speeds. Measures what happens from the
 * first contact to the whistle — time, yards, broken tackles — for comparison
 * with NFL tracking (designed runs: first contact to tackle 1.62 s mean, 1.35 s
 * median, 3.1 yd after contact; catches 1.24 s, 2.1 yd). Solo tackles should
 * take about as long as the NFL's mixed solo and gang tackles or a little longer.
 *   npx tsx scripts/tackle-lab.ts [reps]
 */
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const reps = Number(process.argv[2] ?? 40);
const CONTACT = new Set(['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle', 'broken_tackle']);

interface Out { n: number; wraps: number; time: number[]; yards: number[]; broken: number; missed: number }

function one(rosterSeed: number, seed: number, angleDeg: number, speed: number, out: Out): void {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(rosterSeed), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(rosterSeed + 1), 'D', 'DEF'), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'lab' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
  });
  const c = sim.slot('RB')!;
  const d = sim.defense.find((a) => a.slot === 'MLB' || a.slot.startsWith('LB'))!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + a.idx * 0.1, y: 1 + a.idx * 2 };
    a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  }
  c.downUntil = d.downUntil = -1;
  sim.t = 2;
  sim.ball = { kind: 'held', carrier: c } as never;
  const th = (angleDeg * Math.PI) / 180;
  c.body.pos = { x: 50, y: CENTER_Y };
  c.body.vel = { x: speed, y: 0 };
  // The tackler starts 3 yd away on the bearing and closes on the carrier.
  d.body.pos = { x: 50 + 3 * Math.cos(th) + speed * 0.4, y: CENTER_Y + 3 * Math.sin(th) };
  const toward = () => { const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, l = Math.hypot(dx, dy) || 1; return { x: (dx / l) * 6.5, y: (dy / l) * 6.5 }; };
  d.body.vel = toward();
  c.behavior = { kind: 'idle', update: () => ({ vel: { x: 7, y: 0 } }) } as never;
  d.behavior = { kind: 'idle', update: () => ({ vel: toward() }) } as never;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  const tick = sim as unknown as { tick(): void };
  let contactT = -1;
  let contactX = 0;
  while (sim.phase === 'live' && sim.t < 10) {
    tick.tick();
    if (contactT < 0) {
      const e = sim.events.find((x) => CONTACT.has(x.type));
      if (e) { contactT = e.t; contactX = c.pos.x; }
    }
  }
  out.n++;
  if (sim.events.some((e) => e.type === 'tackle_wrap')) out.wraps++;
  out.broken += sim.events.filter((e) => e.type === 'broken_tackle').length;
  out.missed += sim.events.filter((e) => e.type === 'missed_tackle').length;
  const tk = sim.events.find((e) => e.type === 'tackle');
  if (contactT >= 0 && tk) {
    out.time.push(tk.t - contactT);
    out.yards.push((sim.endSpot?.x ?? c.pos.x) - contactX);
  }
}

const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const q = (v: number[], p: number) => [...v].sort((a, b) => a - b)[Math.floor(p * v.length)] ?? NaN;
const summary = (v: number[]) => v.length ? `${mean(v).toFixed(2)} / ${q(v, 0.5).toFixed(2)}` : 'N/A (no downs)';
console.log('angle  speed   n  wrap%  down n  contact->down s (mean/p50)   yards after contact (mean/p50)   broken/rep  missed/rep');
const all: Out = { n: 0, wraps: 0, time: [], yards: [], broken: 0, missed: 0 };
for (const angle of [0, 45, 90, 135, 180]) {
  for (const speed of [3, 6]) {
    const o: Out = { n: 0, wraps: 0, time: [], yards: [], broken: 0, missed: 0 };
    for (let r = 0; r < reps; r++) one([7, 19, 31, 43][r % 4], 1000 + r, angle, speed, o);
    for (const k of ['time', 'yards'] as const) all[k].push(...o[k]);
    all.n += o.n; all.wraps += o.wraps; all.broken += o.broken; all.missed += o.missed;
    console.log(`${String(angle).padStart(5)}  ${String(speed).padStart(5)}  ${String(o.n).padStart(3)}  ${((100 * o.wraps) / o.n).toFixed(0).padStart(4)}  ${String(o.time.length).padStart(6)}   ${summary(o.time)}                  ${summary(o.yards)}                   ${(o.broken / o.n).toFixed(2)}        ${(o.missed / o.n).toFixed(2)}`);
  }
}
console.log(`all: downs ${all.time.length}/${all.n}, contact->down ${summary(all.time)} s, yards after contact ${summary(all.yards)}, broken ${(all.broken / all.n).toFixed(2)}, missed ${(all.missed / all.n).toFixed(2)} per rep`);

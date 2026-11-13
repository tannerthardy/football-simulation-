/** Controlled hold-the-ball reps. Copy this script and source-version.ts
 * unchanged into an archived revision for paired evidence.
 * node --import tsx scripts/pocket-motion-lab.ts [reps=24] [output=out/pocket.json]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { goTo } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
import { sourceVersion } from './source-version.js';

const reps = Number(process.argv[2] ?? 24), output = process.argv[3] ?? 'out/pocket.json';
if (!Number.isInteger(reps) || reps < 1) throw new Error('reps must be a positive integer');
const rows: Array<{ roster: number; front: string; seed: number; aliveAt25: boolean; pressureT?: number;
  firstPressureAttached?: boolean; felt: boolean; attachedPressureSeconds: number; freePressureSeconds: number;
  olDepth25?: number; blockerCompression25?: number; sacks: boolean; wins25: number; rushers: number;
  contactSamples: number; attachedSpeed: number[]; attachedTravel: number[]; stoppedTicks: number; attachedTicks: number }> = [];
for (const roster of [7, 19, 31, 43]) {
  const rng = new Rng(roster);
  const off = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
  const def = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.6 });
  for (const front of ['over', 'under', 'wide9']) for (let rep = 0; rep < reps; rep++) {
    const seed = rng.fork(`${front}:${rep}`).nextU32();
    const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: { ...PASS_BY_ID.four_verts, back: 'block' }, label: 'hold' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'hold' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    sim.qb.behavior = { kind: 'qb-hold', update: a => goTo(a, { x: 33, y: CENTER_Y }, { facing: 0, speed: 0.5 }) };
    const rushers = sim.defense.filter(d => d.behavior.kind === 'rush');
    const contact = new Map<Agent, { t: number; dx: number; dy: number; bx: number; by: number; ux: number; uy: number }>();
    const row: typeof rows[number] = { roster, front, seed, aliveAt25: false, felt: false, attachedPressureSeconds: 0,
      freePressureSeconds: 0, sacks: false, wins25: 0, rushers: rushers.length, contactSamples: 0,
      attachedSpeed: [], attachedTravel: [], stoppedTicks: 0, attachedTicks: 0 };
    while (sim.phase === 'live' && sim.t < 5) {
      // Capture incoming contact positions once. Compression is subsequent
      // blocker movement toward the QB's original set point, not set depth.
      sim.tick();
      for (const d of rushers) if (d.engagement && !contact.has(d)) {
        const b = d.engagement.blocker, dx = 33 - b.pos.x, dy = CENTER_Y - b.pos.y, length = Math.hypot(dx, dy);
        contact.set(d, { t: sim.t, dx: d.pos.x, dy: d.pos.y, bx: b.pos.x, by: b.pos.y, ux: dx / length, uy: dy / length });
      }
      if (sim.t >= 0.5) {
        const close = sim.defense.filter(d => !d.isDown(sim.t) && Math.hypot(d.pos.x - sim.qb.pos.x, d.pos.y - sim.qb.pos.y) < 2);
        if (close.length && row.pressureT === undefined) {
          row.pressureT = sim.t; row.firstPressureAttached = close.every(d => !!d.engagement);
        }
        if (close.some(d => !!d.engagement)) row.attachedPressureSeconds += sim.dt;
        if (close.some(d => !d.engagement)) row.freePressureSeconds += sim.dt;
      }
      for (const d of rushers) {
        const c = contact.get(d);
        if (!c || !d.engagement) continue;
        const age = sim.t - c.t;
        if (age >= 0.25 && age < 0.75) {
          row.attachedSpeed.push(d.speed); row.attachedTicks++;
          if (d.speed < 0.5) row.stoppedTicks++;
        }
        if (Math.abs(age - 0.75) < 1e-6) {
          row.attachedTravel.push(Math.hypot(d.pos.x - c.dx, d.pos.y - c.dy)); row.contactSamples++;
        }
      }
      if (Math.abs(sim.t - 2.5) < 1e-6) {
        row.aliveAt25 = sim.phase === 'live';
        const ol = sim.offense.filter(a => ['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot));
        row.olDepth25 = ol.reduce((s, b) => s + 40 - b.pos.x, 0) / ol.length;
        const compression = rushers.flatMap(d => {
          const c = contact.get(d), b = d.engagement?.blocker;
          return c && b ? [(b.pos.x - c.bx) * c.ux + (b.pos.y - c.by) * c.uy] : [];
        });
        if (compression.length) row.blockerCompression25 = compression.reduce((s, x) => s + x, 0) / compression.length;
      }
    }
    row.sacks = sim.stats.sacked;
    row.felt = sim.stats.pressured;
    row.wins25 = new Set(sim.events.filter(e => e.type === 'shed' && e.t <= 2.5).map(e => e.a)).size;
    rows.push(row);
  }
}
const average = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
function summarize(rs: typeof rows) {
  const speeds = rs.flatMap(r => r.attachedSpeed), travels = rs.flatMap(r => r.attachedTravel);
  return { n: rs.length, aliveAt25: rs.filter(r => r.aliveAt25).length,
    pressureBy25Pct: 100 * rs.filter(r => r.pressureT !== undefined && r.pressureT <= 2.5).length / rs.length,
    pressureBy5Pct: 100 * rs.filter(r => r.pressureT !== undefined).length / rs.length,
    firstPressureAttachedN: rs.filter(r => r.firstPressureAttached).length,
    meanPressureT: average(rs.flatMap(r => r.pressureT === undefined ? [] : [r.pressureT])),
    attachedPressureSeconds: average(rs.map(r => r.attachedPressureSeconds)), freePressureSeconds: average(rs.map(r => r.freePressureSeconds)),
    olDepth25N: rs.filter(r => r.olDepth25 !== undefined).length,
    olDepth25: average(rs.flatMap(r => r.olDepth25 === undefined ? [] : [r.olDepth25])),
    blockerCompression25: average(rs.flatMap(r => r.blockerCompression25 === undefined ? [] : [r.blockerCompression25])),
    attachedSpeedN: speeds.length, attachedSpeed: average(speeds), attachedTravel075N: travels.length, attachedTravel075: average(travels),
    stoppedAttachedPct: 100 * rs.reduce((s, r) => s + r.stoppedTicks, 0) / Math.max(1, rs.reduce((s, r) => s + r.attachedTicks, 0)),
    shedWin25Pct: 100 * rs.reduce((s, r) => s + r.wins25, 0) / rs.reduce((s, r) => s + r.rushers, 0),
    sackPct: 100 * rs.filter(r => r.sacks).length / rs.length };
}
const result = { sourceSha256: sourceVersion(), setup: { reps, rosters: [7, 19, 31, 43], fronts: ['over', 'under', 'wide9'], qbHoldUntil: 5 },
  definitions: { pressure: 'Any standing defender center within 2 yd, from 0.5 s through the hold or sack. Attached rushers count.',
    stopped: 'Attached rusher speed <0.5 yd/s, sampled 0.25–0.75 s after first contact.',
    compression: 'Blocker displacement since first contact projected toward the original QB set point, at 2.5 s; surviving engagements only.',
    caveat: 'Forced holds isolate protection. No NFL target for these contact metrics. Samples at 2.5 s exclude plays already ended; consult sample counts.' },
  summary: summarize(rows), byFront: Object.fromEntries(['over', 'under', 'wide9'].map(f => [f, summarize(rows.filter(r => r.front === f))])), rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, summary: result.summary, byFront: result.byFront }, null, 2));

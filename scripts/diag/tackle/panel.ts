/** 1v1 tackle panel (diagnostic only; tackling itself is owned by the physics
 * session). One carrier and one tackler, everyone else removed. Shared,
 * mirrored initial bodies and trajectories; the carrier holds a fixed request
 * (straight, or a late cut away from the tackler); the tackler uses the
 * production pursuit/tackle controller (`chase`, `tryTackles`).
 *
 * Every attempt is recorded with what decided it: a rolled miss (`pMiss` /
 * dive roll, an outcome dice) or a physical grip whose achieved load,
 * duration and break are measured. Plays end tackled, escaped (carrier clear
 * and separating with no live grip), or censored (time limit, sideline, goal).
 *
 * node --import tsx scripts/diag/tackle/panel.ts [--seeds 12] [--common-patch]
 *   [--substeps 12] [--out out/tackle/panel.json]
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { sourceVersion } from '../../source-version.js';
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import type { GraspJoint } from '../../../src/physics/world.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { chase } from '../../../src/sim/behaviors/common.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (n: string, f: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : f; };
const seeds = Number(arg('--seeds', '12'));
const out = arg('--out', 'out/tackle/panel.json');
const handContact = process.argv.includes('--common-patch') ? 'patch' : 'center';
const substeps = process.argv.includes('--substeps') ? Number(arg('--substeps', '12')) : undefined;

/** Bearing of the tackler from the carrier's path: 0 head-on, 180 from behind. */
export interface Cell { angle: number; speed: number; cut: boolean; difficulty: 'ordinary' | 'difficult' }
export const CELLS: Cell[] = [];
for (const angle of [0, 45, 90, 135, 180]) for (const speed of [3, 6, 8]) for (const cut of [false, true]) {
  const difficult = cut || angle >= 135 || speed >= 8;
  // A cut needs the tackler in front of him to cut away from.
  if (cut && angle >= 135) continue;
  CELLS.push({ angle, speed, cut, difficulty: difficult ? 'difficult' : 'ordinary' });
}

const offense = generateTeam(new Rng(61), 'Panel O', 'PO', { strength: .55 });
const defense = generateTeam(new Rng(62), 'Panel D', 'PD', { strength: .55 });

interface Attempt { t: number; kind: 'rolled miss' | 'rolled dive miss' | 'grip' | 'dive grip'; origin?: string;
  capacity?: number; legs?: number; peakForce?: number; meanForce?: number; heldFor?: number; broke?: boolean }

export function rep(cell: Cell, side: 1 | -1, seed: number,
  physics: { handContact?: 'center' | 'patch'; substeps?: number } = {},
  teams = { offense, defense }) {
  const sim = new PlaySim({
    offense: pickOffense(teams.offense, '11'), defense: pickDefense(teams.defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'panel' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'panel' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
    ...physics,
  });
  const c = sim.slot('RB')!, d = sim.defense.find((a) => a.slot === 'MLB' || a.slot.startsWith('LB'))!;
  for (const a of sim.agents) {
    a.body.pos = { x: 5 + a.idx * .1, y: 1 + a.idx * 2 }; a.body.vel = { x: 0, y: 0 };
    a.downUntil = 99; a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  }
  c.downUntil = d.downUntil = -1;
  sim.t = sim.world.time = 2;
  sim.ball = { kind: 'held', carrier: c } as never;
  const th = cell.angle * Math.PI / 180;
  c.body.pos = { x: 50, y: CENTER_Y }; c.body.vel = { x: cell.speed, y: 0 }; c.body.facing = 0;
  // Tackler 4 yd out on the bearing, ahead of where the carrier will be.
  d.body.pos = { x: 50 + 4 * Math.cos(th) + cell.speed * .4, y: CENTER_Y + side * 4 * Math.sin(th) };
  d.body.facing = Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x);
  d.body.vel = { x: Math.cos(d.body.facing) * 4, y: Math.sin(d.body.facing) * 4 };
  // Carrier: a fixed request. A cut breaks away from the tackler's side at 2 yd.
  let cutAt: number | null = null;
  c.behavior = { kind: 'idle', update: () => {
    const dd = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    if (cell.cut && cutAt === null && dd < 2.2) cutAt = sim.t;
    if (cutAt !== null) { const away = -Math.sign(d.pos.y - c.pos.y) || -side; return { vel: { x: cell.speed * .7, y: away * cell.speed * .7 } }; }
    return { vel: { x: cell.speed, y: 0 } };
  } } as never;
  d.behavior = { kind: 'idle', update: () => chase(sim, d, c) } as never;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);

  const attempts: Attempt[] = [];
  const seen = new Map<GraspJoint, Attempt & { sum: number; n: number }>();
  let firstContact: { t: number; x: number } | null = null, contactImpulse = 0, peakClosing = 0;
  let firstGrip: { t: number; x: number } | null = null;
  let ending: 'tackled' | 'escaped' | 'censored' = 'censored', endWhy = 'time limit';
  const tick = sim as unknown as { tick(): void };
  let ev = 0;
  while (sim.phase === 'live' && sim.t < 7) {
    tick.tick();
    for (; ev < sim.events.length; ev++) {
      const e = sim.events[ev];
      if (e.type === 'missed_tackle') attempts.push({ t: e.t, kind: e.note === 'dive' ? 'rolled dive miss' : 'rolled miss' });
      if (!firstContact && ['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle', 'broken_tackle'].includes(e.type)) firstContact = { t: e.t, x: c.pos.x };
    }
    for (const j of sim.world.joints) {
      if (j.kind !== 'grasp' || j.b !== c.body) continue;
      let a = seen.get(j);
      if (!a) {
        a = { t: sim.t, kind: j.origin === 'dive' ? 'dive grip' : 'grip', origin: j.origin, capacity: j.capacity, legs: j.legs, peakForce: 0, heldFor: 0, broke: false, sum: 0, n: 0 };
        seen.set(j, a); attempts.push(a);
        if (!firstGrip) firstGrip = { t: sim.t, x: c.pos.x };
      }
      if (!j.broken) { a.heldFor! += sim.dt; a.sum += j.force ?? 0; a.n++; a.peakForce = Math.max(a.peakForce!, j.force ?? 0); }
      a.broke = a.broke || !!j.broken;
    }
    for (const h of sim.lastStep?.contacts ?? []) if ((h.i === c.idx && h.j === d.idx) || (h.i === d.idx && h.j === c.idx)) {
      contactImpulse += h.impulse; peakClosing = Math.max(peakClosing, h.closing);
      if (!firstContact) firstContact = { t: sim.t, x: c.pos.x };
    }
    const live = sim.world.joints.some((j) => j.kind === 'grasp' && j.b === c.body && !j.broken);
    const ahead = (c.pos.x - d.pos.x), sep = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    if (!live && ahead > 0 && sep > 3 && c.vel.x - d.vel.x > 0 && sim.t > 2.3) { ending = 'escaped'; endWhy = d.isDown(sim.t) ? 'tackler on the ground' : 'beat the tackler'; break; }
  }
  if (sim.phase !== 'live') {
    const o = sim.outcome ?? 'whistle';
    if (sim.events.some((e) => e.type === 'tackle') || o === 'tackle') { ending = 'tackled'; endWhy = 'down'; }
    else { ending = 'censored'; endWhy = String(o); }
  }
  for (const a of seen.values()) { a.meanForce = a.n ? a.sum / a.n : 0; delete (a as Partial<typeof a>).sum; delete (a as Partial<typeof a>).n; }
  return { ...cell, side, seed, ending, endWhy, attempts,
    afterContact: firstContact ? (sim.endSpot?.x ?? c.pos.x) - firstContact.x : null,
    contactToEnd: firstContact ? sim.t - firstContact.t : null,
    contactImpulse, peakClosing, tacklerDown: d.isDown(sim.t),
    // Keep observed acquired holds separate from the legacy first-attempt marker
    // above, which includes misses. Neither distance is a measured NFL YAC.
    firstGrip,
    advanceAfterGrip: firstGrip ? (sim.endSpot?.x ?? c.pos.x)-firstGrip.x : null,
    finish: ending === 'tackled' ? c.body.support?.state === 'down' ? 'physical fall'
      : (sim.bond?.stalled ?? 0) >= .8 ? 'stopped progress' : 'other whistle' : ending,
    carrierState: c.body.support?.state };
}

function main() {
  const sourceBefore = sourceVersion();
  const rows: ReturnType<typeof rep>[] = [];
  for (const cell of CELLS) for (const side of [1, -1] as const) for (let s = 0; s < seeds; s++) rows.push(rep(cell, side, 3000 + s, { handContact, substeps }));
  const sourceAfter = sourceVersion();
  if (sourceBefore !== sourceAfter) throw new Error('Engine changed during tackle collection');
  mkdirSync(dirname(out), { recursive: true });
  const collectorSha256 = createHash('sha256').update(readFileSync(import.meta.filename)).digest('hex');
  writeFileSync(out, JSON.stringify({ seeds, handContact, substeps: substeps ?? 'adaptive',
    sourceBefore, sourceAfter, collectorSha256, rows }));
  const share = (v: boolean[]) => v.length ? (v.filter(Boolean).length / v.length).toFixed(2) : '-';
  console.log('angle speed cut  tackled escaped censored | attempts/rep rolled-miss share | grips: broke, mean held s, mean/peak force | yd after contact (median) | mirror: tackled L/R');
  for (const cell of CELLS) {
    const rs = rows.filter((r) => r.angle === cell.angle && r.speed === cell.speed && r.cut === cell.cut);
    const att = rs.flatMap((r) => r.attempts), grips = att.filter((a) => a.kind.includes('grip'));
    const rolled = att.filter((a) => a.kind.startsWith('rolled'));
    const yac = rs.map((r) => r.afterContact).filter((x): x is number => x !== null).sort((a, b) => a - b);
    const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
    console.log(`${String(cell.angle).padStart(5)} ${String(cell.speed).padStart(5)} ${cell.cut ? 'cut' : '   '}  ${share(rs.map((r) => r.ending === 'tackled'))}    ${share(rs.map((r) => r.ending === 'escaped'))}    ${share(rs.map((r) => r.ending === 'censored'))}    | ${(att.length / rs.length).toFixed(2)}        ${att.length ? (rolled.length / att.length).toFixed(2) : '-'}       | ${share(grips.map((g) => !!g.broke))}, ${mean(grips.map((g) => g.heldFor!)).toFixed(2)}, ${mean(grips.map((g) => g.meanForce!)).toFixed(0)}/${mean(grips.map((g) => g.peakForce!)).toFixed(0)} | ${yac.length ? yac[Math.floor(yac.length / 2)].toFixed(1) : '-'} | ${share(rs.filter((r) => r.side === 1).map((r) => r.ending === 'tackled'))}/${share(rs.filter((r) => r.side === -1).map((r) => r.ending === 'tackled'))}`);
  }
  for (const diff of ['ordinary', 'difficult'] as const) {
    const rs = rows.filter((r) => r.difficulty === diff), att = rs.flatMap((r) => r.attempts);
    const decidingMisses = rs.filter((r) => r.ending !== 'tackled' && r.attempts.length && r.attempts.every((a) => a.kind.startsWith('rolled'))).length;
    console.log(`${diff}: ${rs.length} reps, tackled ${share(rs.map((r) => r.ending === 'tackled'))}, attempts decided by a roll ${share(att.map((a) => a.kind.startsWith('rolled')))}, untackled reps whose every attempt was a rolled miss ${decidingMisses}`);
  }
  console.log('Finish reasons:', rows.reduce<Record<string,number>>((n,r) => { n[r.finish]=(n[r.finish]??0)+1; return n; },{}));
}

if (import.meta.url === `file://${process.argv[1]}`) main();

/**
 * Trench lab: pass-pro reps where the QB sets and holds the ball, to measure
 * the rep model in isolation.
 *   npx tsx scripts/trench-lab.ts [reps] [seed]
 * Reports per-rusher win rate (beat his block within 2.5 s — cf. ESPN's
 * pass-rush win rate), time to first pressure, time to sack, move mix.
 */
import { Rng } from '../src/core/rng.js';
import { CENTER_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { goTo } from '../src/sim/behaviors/common.js';

const [repsStr = '400', seedStr = '1', frontId = 'over'] = process.argv.slice(2);
const reps = Number(repsStr);
const rng = new Rng(Number(seedStr));
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.5 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.5 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const offense = pickOffense(off, '11');
const defense = pickDefense(def, 'nickel');

let shedWins = 0;
let rusherReps = 0;
let pressured25 = 0;
let pressureT = 0;
let pressureN = 0;
let sackT = 0;
let sackN = 0;
const moves: Record<string, number> = {};
let push = 0, pushN = 0, rDepth = 0, rN = 0, engagedAt25 = 0;
const sackers: Record<string, number> = {};
const unblocked: Record<string, number> = {};
const byRusher = new Map<string, { reps: number; wins: number }>();
for (let i = 0; i < reps; i++) {
  const sim = new PlaySim({
    offense, defense,
    offCall: { formation, flip: false, kind: 'pass', pass: { ...PASS_BY_ID.four_verts, back: 'block' }, label: 'lab' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID[frontId], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lab' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: rng.nextU32(),
  });
  const qb = sim.qb;
  const spot = { x: 40 - 7, y: CENTER_Y };
  qb.behavior = { kind: 'qb-hold', update: (a) => goTo(a, spot, { facing: 0, speed: 0.5 }) };
  let firstPressure = -1;
  const engagedEver = new Set<unknown>();
  while (sim.phase === 'live' && sim.t < 7) {
    sim.tick();
    for (const e of sim.engagements) engagedEver.add(e.defender);
    if (process.env.TRACE && i === Number(process.env.REP ?? 0) && Math.round(sim.t * 20) % 4 === 0) {
      const f = (sl: string) => { const a = sim.slot(sl)!; return `${sl} (${(a.pos.x - 40).toFixed(1)},${(a.pos.y - CENTER_Y).toFixed(1)}) v${a.speed.toFixed(1)} ${a.engagement ? 'E' + (a.engagement.defender === a ? `[phi ${a.engagement.phi.toFixed(2)} c ${a.engagement.control.toFixed(2)} bB ${a.engagement.baseB.toFixed(2)} ${a.engagement.move}]` : '') : ''}`; };
      console.log(`t=${sim.t.toFixed(2)} ${f('LT')} ${f('DE_W')} | ${f('RT')} ${f('DE_S')} | QB ${(qb.pos.x - 40).toFixed(1)}`);
    }
    if (Math.abs(sim.t - 2.5) < 1e-6) {
      for (const o of sim.offense) if (['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)) { push += 40 - o.pos.x; pushN++; }
      for (const d of sim.defense) if (d.behavior.kind === 'rush') { rDepth += 40 - d.pos.x; rN++; if (d.engagement) engagedAt25++; }
    }
    if (firstPressure < 0) {
      for (const d of sim.defense) if (!d.engagement && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) < 2) firstPressure = sim.t;
    }
  }
  if (firstPressure >= 0) {
    pressureT += firstPressure;
    pressureN++;
    if (firstPressure <= 2.5) pressured25++;
  }
  if (sim.stats.sacked) {
    sackT += sim.t;
    sackN++;
    for (const id of sim.stats.sackedBy ?? []) { const a = sim.agents.find((x) => x.player.id === id)!; sackers[a.slot] = (sackers[a.slot] ?? 0) + 1; }
  }
  const rushers = sim.defense.filter((d) => d.behavior.kind === 'rush');
  for (const r of rushers) {
    rusherReps++;
    if (!engagedEver.has(r)) unblocked[r.slot] = (unblocked[r.slot] ?? 0) + 1;
    const won = sim.events.some((e) => e.type === 'shed' && e.a === r.idx && e.t <= 2.5);
    if (won) shedWins++;
    const s = byRusher.get(r.slot) ?? { reps: 0, wins: 0 };
    s.reps++;
    if (won) s.wins++;
    byRusher.set(r.slot, s);
  }
  for (const e of sim.events) if (e.type === 'shed' && e.note) moves[e.note] = (moves[e.note] ?? 0) + 1;
}
console.log(`reps ${reps}: rusher win rate (≤2.5s) ${((shedWins / rusherReps) * 100).toFixed(1)}%  [NFL avg ~15%, elite ~25-30%]`);
console.log(`pressured within 2.5s ${((pressured25 / reps) * 100).toFixed(1)}%  mean time to pressure ${(pressureT / Math.max(1, pressureN)).toFixed(2)}s (${pressureN}/${reps})`);
console.log(`sacks ${sackN}/${reps}, mean time to sack ${(sackT / Math.max(1, sackN)).toFixed(2)}s  [NFL ~3.5-4.5s when QB holds]`);
console.log(`at 2.5s: OL avg depth ${(push / Math.max(1, pushN)).toFixed(2)} yd, rusher avg depth ${(rDepth / Math.max(1, rN)).toFixed(2)} yd, engaged ${((engagedAt25 / Math.max(1, rN)) * 100).toFixed(0)}%`);
console.log('sacks by', sackers, 'never blocked', unblocked);
console.log('win rate by slot', Object.fromEntries([...byRusher].map(([k, v]) => [k, `${((v.wins / v.reps) * 100).toFixed(0)}%`])));
console.log('winning moves', moves);
if (process.env.ROSTER) {
const show = (slot: string, p: { firstName: string; lastName: string; ratings: Record<string, number>; measurables: { heightIn: number; weightLb: number; armIn: number } }) => console.log(`  ${slot.padEnd(5)} ${p.firstName} ${p.lastName} ${p.measurables.heightIn}" ${p.measurables.weightLb}lb arm ${p.measurables.armIn} pass ${p.ratings.passBlock ?? ''} rushP ${p.ratings.passRushPower} rushF ${p.ratings.passRushFinesse} hands ${p.ratings.handTechnique} str ${p.ratings.strength}`);
for (const s of ['LT', 'LG', 'C', 'RG', 'RT'] as const) show(s, offense[s]);
for (const s of ['DE_S', 'DT_S', 'DT_W', 'DE_W'] as const) show(s, defense[s]!);
}

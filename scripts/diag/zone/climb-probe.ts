/** Climb chain on native stretch-zone inputs: for every lineman whose plan
 * targets a backer (direct climb or combo with a backer), when he is free to
 * climb (released / no combo), whether his held plan was attainable, whether
 * he acquires hands on the backer and loads them, and when, relative to the
 * runner's first contact. Observation only.
 * node --import tsx scripts/diag/zone/climb-probe.ts [runs=wz_strong,oz_strong]
 */
import { CENTER_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../../src/league/team.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../../src/playbook/formations.js';
import { RunBlocker } from '../../../src/sim/behaviors/blocking.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const runs = (process.argv[2] ?? 'wz_strong,oz_strong').split(',');
const OL = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
type Row = { play: string; slot: string; backer: string; kind: string; freeAt: number | null; plans: number; attainable: number;
  touchAt: number | null; loadAt: number | null; carrierContactAt: number | null; backerMadeContact: boolean };
const rows: Row[] = [];
for (const run of runs) for (const [o, d] of [[31, 32], [41, 42], [51, 52]]) for (const front of ['over', 'under']) for (const flip of [false, true]) {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(o), 'O', 'O', { strength: .55 }), FORMATION_BY_ID.ace_11.personnel),
    defense: pickDefense(generateTeam(new Rng(d), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3, pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const name = `${run} ${o}/${d} ${front}${flip ? ' flip' : ''}`;
  const track = new Map<string, Row>();
  for (const a of sim.offense) {
    if (!OL.has(a.slot) || !(a.behavior instanceof RunBlocker)) continue;
    const p = a.behavior.plan, backer = p.kind === 'climb' ? p.target : p.combination?.backer ?? null;
    if (!backer || !backer.slot.startsWith('LB')) continue;
    track.set(a.slot, { play: name, slot: a.slot, backer: backer.slot, kind: p.combination ? 'combo' : p.kind, freeAt: null, plans: 0, attainable: 0,
      touchAt: null, loadAt: null, carrierContactAt: null, backerMadeContact: false });
  }
  let lastRead = new Map<string, unknown>();
  while (sim.phase === 'live' && sim.t < 4) {
    (sim as unknown as { tick(): void }).tick();
    for (const a of sim.offense) {
      const r = track.get(a.slot); if (!r) continue;
      const beh = a.behavior as unknown as { plan: RunBlocker['plan']; climbRead?: { attainable: boolean; nextRead: number } | null };
      const p = beh.plan;
      if (r.freeAt === null && p.kind === 'climb' && !a.engagement) r.freeAt = sim.t;
      const cr = beh.climbRead;
      if (cr && lastRead.get(a.slot) !== cr) { lastRead.set(a.slot, cr); r.plans++; if (cr.attainable) r.attainable++; }
      const e = a.engagement;
      if (e && e.defender.slot === r.backer) {
        r.touchAt ??= sim.t;
        if (Math.hypot(e.hands?.normalForce ?? 0, e.hands?.tangentForce ?? 0) > 1) r.loadAt ??= sim.t;
      }
    }
    for (const ev of sim.events) if (['hit', 'tackle_wrap', 'carrier_contact', 'missed_tackle'].includes(ev.type)) {
      for (const r of track.values()) { r.carrierContactAt ??= ev.t; if (sim.agents[ev.a ?? -1]?.slot === r.backer && ev.t === r.carrierContactAt) r.backerMadeContact = true; }
    }
  }
  rows.push(...track.values());
}
const f = (x: number | null) => x === null ? '  -  ' : x.toFixed(2);
for (const r of rows) console.log(`${r.play.padEnd(26)} ${r.slot.padEnd(3)}->${r.backer.padEnd(5)} ${r.kind.padEnd(6)} free ${f(r.freeAt)} plans ${String(r.plans).padStart(2)} attainable ${String(r.attainable).padStart(2)} touch ${f(r.touchAt)} load ${f(r.loadAt)} | runner contact ${f(r.carrierContactAt)}${r.backerMadeContact ? ' BY THIS BACKER' : ''}`);
const n = rows.length, freed = rows.filter((r) => r.freeAt !== null), loaded = rows.filter((r) => r.loadAt !== null);
console.log(`\n${n} backer assignments | free to climb ${freed.length} | loaded contact ${loaded.length} | first contact by an assigned backer ${rows.filter((r) => r.backerMadeContact).length}`);
console.log(`combo never released ${rows.filter((r) => r.kind === 'combo' && r.freeAt === null).length} | freed but never touched ${freed.filter((r) => r.touchAt === null).length} (of which some plan attainable: ${freed.filter((r) => r.touchAt === null && r.attainable > 0).length})`);

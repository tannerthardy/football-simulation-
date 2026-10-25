/** Fixed route distributions with a stationary QB, to isolate field spacing.
 * node --import tsx scripts/red-zone-coverage-lab.ts [reps=8] [output=out/red-zone.json]
 * Copy unchanged with source-version.ts into an archived revision for pairing.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { END_LINE_X, HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { goTo } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
import { sourceVersion } from './source-version.js';

const reps = Number(process.argv[2] ?? 8), output = process.argv[3] ?? 'out/red-zone.json';
if (!Number.isInteger(reps) || reps < 1) throw new Error('reps must be a positive integer');
const rows: Array<{ roster: number; los: number; concept: string; coverage: string; seed: number;
  sampledSeconds: number; safetyMaxX: number; coverageOutsideSeconds: number; cornerSeparation2: number[] }> = [];
for (const roster of [7, 19, 31]) {
  const rng = new Rng(roster);
  const off = generateTeam(rng.fork('offense'), 'Offense', 'OFF', { strength: 0.6 });
  const def = generateTeam(rng.fork('defense'), 'Defense', 'DEF', { strength: 0.6 });
  for (const los of [40, 104, 108]) for (const concept of ['comebacks', 'four_verts', 'mesh'])
    for (const coverage of ['cover2:spot', 'cover2:match', 'cover1', 'cover4']) for (let rep = 0; rep < reps; rep++) {
      const [cover, style = 'match'] = coverage.split(':');
      const seed = rng.fork(`${los}:${concept}:${coverage}:${rep}`).nextU32();
      const sim = new PlaySim({ offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
        offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: { ...PASS_BY_ID[concept], back: 'block' }, label: 'hold' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID[cover], pressure: null, zoneStyle: style as 'spot' | 'match', label: 'hold' },
        los, ballY: HASH_LEFT_Y, firstDownX: Math.min(110, los + 10), seed });
      sim.qb.behavior = { kind: 'qb-hold', update: a => goTo(a, { x: los - 7, y: HASH_LEFT_Y }, { facing: 0, speed: 0.5 }) };
      const safeties = sim.defense.filter(d => d.slot === 'FS' || d.slot === 'SS');
      const row: typeof rows[number] = { roster, los, concept, coverage, seed, sampledSeconds: 0,
        safetyMaxX: Math.max(...safeties.map(d => d.pos.x)), coverageOutsideSeconds: 0, cornerSeparation2: [] };
      while (sim.phase === 'live' && sim.t < 3.5) {
        sim.tick(); row.sampledSeconds += sim.dt;
        row.safetyMaxX = Math.max(row.safetyMaxX, ...safeties.map(d => d.pos.x));
        if (sim.defense.some(d => ['man', 'zone'].includes(d.behavior.kind) && d.pos.x > END_LINE_X)) row.coverageOutsideSeconds += sim.dt;
        if (Math.abs(sim.t - 2) < 1e-6) for (const side of ['S', 'W'] as const) {
          const corner = sim.slot(`CB_${side}`), slot = sim.offAlign.numbering[`${side}1`], receiver = slot && sim.slot(slot);
          if (corner && receiver) row.cornerSeparation2.push(Math.hypot(corner.pos.x - receiver.pos.x, corner.pos.y - receiver.pos.y));
        }
      }
      rows.push(row);
    }
}
const average = (xs: number[]) => xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null;
const summarize = (rs: typeof rows) => ({ n: rs.length, safetyOutsidePlays: rs.filter(r => r.safetyMaxX > END_LINE_X).length,
  safetyMaxX: Math.max(...rs.map(r => r.safetyMaxX)), coverageOutsideSeconds: rs.reduce((s, r) => s + r.coverageOutsideSeconds, 0),
  sampledSeconds: rs.reduce((s, r) => s + r.sampledSeconds, 0),
  cornerSeparation2N: rs.flatMap(r => r.cornerSeparation2).length, cornerSeparation2: average(rs.flatMap(r => r.cornerSeparation2)) });
const result = { sourceSha256: sourceVersion(), setup: { reps, rosters: [7, 19, 31], los: [40, 104, 108], holdUntil: 3.5 },
  definitions: { outside: 'Coverage bodies beyond x=120 during fixed dropbacks, before any throw. No hard field wall.',
    separation: 'Corner to his side’s pre-snap #1 at 2 s, regardless of who is targeted; not NFL catch separation.' },
  summary: summarize(rows), byLos: Object.fromEntries([40, 104, 108].map(los => [los, summarize(rows.filter(r => r.los === los))])),
  byCoverageLowRedZone: Object.fromEntries(['cover2:spot', 'cover2:match', 'cover1', 'cover4'].map(c => [c, summarize(rows.filter(r => r.coverage === c && r.los > 100))])), rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ output, byLos: result.byLos, byCoverageLowRedZone: result.byCoverageLowRedZone }, null, 2));

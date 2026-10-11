/** Inspect actual consumed ManCoverage motion pictures and unchanged native execution.
 * Run from a frozen checkout: node --import tsx scripts/diag/late-man-entry.ts output.json
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { ManCoverage } from '../../src/sim/behaviors/defense.js';
import { RouteObservation } from '../../src/sim/coverage-read.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

const output = process.argv[2] ?? 'out/late-man-entry/native.json';
const sourceBefore = sourceVersion();
const teams = { offense: generateTeam(new Rng(31), 'Awareness offense', 'AOF', { strength: .55 }),
  defense: generateTeam(new Rng(32), 'Awareness defense', 'ADF', { strength: .55 }) };
const rows = [];
function create(coverage: string) {
  return new PlaySim({ offense: pickOffense(teams.offense, '11'), defense: pickDefense(teams.defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_trips_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts,
      label: 'gun_trips_11/four_verts' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage],
      pressure: null, zoneStyle: 'match', label: `Over ${coverage}` },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, audibles: false });
}
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const signature = (sim: PlaySim, result: unknown) => hash({ result, bodies: sim.agents.map(a => a.body),
  intents: sim.intents, minds: sim.agents.map(a => a.mind), rng: { ...sim.rng } });
for (const coverage of ['cover1', 'cover4', 'cover6']) {
  const sim = create(coverage);
  const samples: unknown[] = [];
  let active: { a: Parameters<ManCoverage['update']>[0]; sim: PlaySim; picture?: unknown } | null = null;
  const originalUpdate = ManCoverage.prototype.update;
  const originalRead = RouteObservation.prototype.read;
  RouteObservation.prototype.read = function (...args) {
    const result = originalRead.apply(this, args);
    if (active) active.picture = { input: structuredClone(args[0]), result: structuredClone(result) };
    return result;
  };
  ManCoverage.prototype.update = function (a, s) {
    active = { a, sim: s };
    try {
      const before = { position: { ...a.pos }, velocity: { ...a.vel }, facing: a.facing,
        technique: this.recordedTechnique(), receiver: this.target.slot };
      const command = originalUpdate.call(this, a, s);
      if (active.picture && s.throwAt < 0) samples.push({ t: s.t, slot: a.slot, receiver: this.target.slot,
        before, consumed: active.picture, command: structuredClone(command), techniqueAfter: this.recordedTechnique() });
      return command;
    } finally { active = null; }
  };
  let result;
  try { result = sim.run(); } finally {
    ManCoverage.prototype.update = originalUpdate;
    RouteObservation.prototype.read = originalRead;
  }
  const observedSignature = signature(sim, result);
  const plain = create(coverage), plainResult = plain.run();
  if (observedSignature !== signature(plain, plainResult)) throw new Error(`Observer changed ${coverage}`);
  rows.push({ id: `DA-R1-four_verts-${coverage}-R`, coverage, result,
    executionSha256: observedSignature, observerVerified: true, samples });
}
const sourceAfter = sourceVersion();
if (sourceAfter !== sourceBefore) throw new Error('Source changed during inspection');
const report = { schema: 'late-man-entry-native-v1', sourceBefore, sourceAfter, node: process.version,
  toolSha256: createHash('sha256').update(readFileSync('scripts/diag/late-man-entry.ts')).digest('hex'),
  cohort: { rosterSeeds: [31, 32], strength: .55, playSeed: 3, formation: 'gun_trips_11', concept: 'four_verts',
    personnel: 'nickel', front: 'over', style: 'match', flip: false, los: 40, firstDownX: 50 },
  scope: 'Three native cases selected from saved films, not outcome rates. Existing method return values only; no extra perception, decision or RNG calls. Inspection has no physical finish override.',
  definitions: { picture: 'RouteObservation.read input and returned motion picture actually consumed by ManCoverage.update.',
    command: 'Returned motor request before World execution; not an instantly achieved velocity.',
    body: 'Existing own position and velocity immediately before the original controller update.' }, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report));
console.log(JSON.stringify({ output, sourceBefore, sourceAfter,
  rows: rows.map(r => ({ id: r.id, yards: r.result.offenseYards, yac: r.result.stats.yac,
    observerVerified: r.observerVerified, firstRB: r.samples.find((s: any) => s.slot === 'LB_W' && s.receiver === 'RB') })) }, null, 2));

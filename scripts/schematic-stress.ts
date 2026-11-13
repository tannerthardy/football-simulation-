import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { SCHEMATIC_FIXTURES, SCHEMATIC_LIMITATIONS, SCHEMATIC_NUMERICAL_TOLERANCES, SCHEMATIC_STRESS_COHORT, SCHEMATIC_STRESS_SCHEMA,
  assertSchematicFinite, createSchematicTeams, runSchematicFixture, runSchematicSlice, schematicHash } from '../src/lab/schematic-stress.js';
import { sourceVersion } from './source-version.js';

const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
export function collectSchematicStress() {
  const sourceBefore = sourceVersion(), startedAt = new Date().toISOString(), start = performance.now(), teams = createSchematicTeams();
  const native = SCHEMATIC_FIXTURES.flatMap(fixture => [false, true].map(flip => runSchematicFixture(fixture, flip,
    { record: !flip && fixture.condition === 'adverse', observe: true, verifyObserver: !flip && fixture.condition === 'adverse' }, teams)));
  const slices = ['wideSurface', 'penetratingEdge'].flatMap(geometry => [0, 4].flatMap(initialSpeed => [1, -1].map(side =>
    runSchematicSlice({ seed: SCHEMATIC_STRESS_COHORT.sliceSeed, geometry: geometry as 'wideSurface' | 'penetratingEdge',
      initialSpeed, side: side as 1 | -1, substeps: SCHEMATIC_STRESS_COHORT.sliceSubsteps }, geometry === 'penetratingEdge' && initialSpeed === 4 && side === 1))));
  // Matched native families retain identities and capabilities; schematic
  // changes may alter geometry, assignments and subsequent random draw order.
  for (const family of ['split', 'counter', 'bunch', 'quad', 'long-yardage']) for (const flip of [false, true]) {
    const pair = native.filter(r => r.row.fixture.family === family && r.row.flip === flip);
    if (pair.length !== 2 || pair[0].row.snap.profileSha256 !== pair[1].row.snap.profileSha256)
      throw new Error(`Profiles changed in ${family}`);
    if (family === 'long-yardage' && pair[0].row.snap.geometrySha256 !== pair[1].row.snap.geometrySha256)
      throw new Error('Long-yardage role treatment changed snap geometry');
  }
  const sourceAfter = sourceVersion(); if (sourceBefore !== sourceAfter) throw new Error('Source changed during schematic collector');
  const rows = native.map(r => r.row), reduced = slices.map(r => r.row);
  const reducedMirrors = ['wideSurface', 'penetratingEdge'].flatMap(geometry => [0, 4].map(initialSpeed => {
    const pair = reduced.filter(r => r.input.geometry === geometry && r.input.initialSpeed === initialSpeed);
    const a = pair.find(r => r.input.side === 1)!, b = pair.find(r => r.input.side === -1)!;
    return { geometry, initialSpeed, sameProfiles: schematicHash(a.participants) === schematicHash(b.participants),
      teEndpointReflectionError: Math.hypot(a.endpoint.te.pos.x - b.endpoint.te.pos.x,
        a.endpoint.te.pos.y + b.endpoint.te.pos.y - 2 * SCHEMATIC_STRESS_COHORT.ballY),
      endEndpointReflectionError: Math.hypot(a.endpoint.end.pos.x - b.endpoint.end.pos.x,
        a.endpoint.end.pos.y + b.endpoint.end.pos.y - 2 * SCHEMATIC_STRESS_COHORT.ballY),
      sameContactClassification: a.contactClassification === b.contactClassification };
  }));
  const report = { schema: SCHEMATIC_STRESS_SCHEMA, sourceBefore, sourceAfter, startedAt, finishedAt: new Date().toISOString(),
    node: process.version, scriptSha256: fileHash('scripts/schematic-stress.ts'), labSha256: fileHash('src/lab/schematic-stress.ts'),
    sharedWorldSha256: fileHash('src/physics/world.ts'), cohort: { ...SCHEMATIC_STRESS_COHORT, rosterSha256: schematicHash(teams) },
    wallMs: performance.now() - start, limitations: SCHEMATIC_LIMITATIONS, numericalTolerances: SCHEMATIC_NUMERICAL_TOLERANCES,
    definitions: { native: 'Complete PlaySim with ordinary World/controller resolution until its whistle or physical timeout.',
      reduced: 'Two active players in existing motion-contact island; bystanders parked; staged initial velocity and analytical history; 2.5s censor.',
      initialBodies: 'JSON copies of actual native snap bodies/profiles. Initial support.since=-Infinity is serialized as null (never transitioned), not a physical value.',
      see: 'First actually consumed PlaySim.see output for each observer/target pair; every call counted, no extra read.',
      commandSamples: 'Selected native tick intents after controllers and achieved bodies after the corresponding World step.',
      bodyContacts: 'Positive delivered body impulse reported by World; native 50ms intervals, not individual substep collision counts.',
      loadedHands: 'Nonzero achieved normal/tangential hand force on ordinary primary/helper joints, separate from acquisition labels.',
      yards: 'PlaySim offenseYards before game-level penalty acceptance/enforcement; conversion requires no turnover and final endX >= firstDownX.',
      pressure: 'Existing boolean stats.pressured, not a new physical pressure definition.',
      finite: 'Physical body/support/intent/report numbers must be finite; initial support.since=-Infinity is the named never-transitioned lifecycle sentinel.',
      budgets: 'Max delivered arm impulse/work and support-motor work above the ordinary reported player-wide bounds; momentum closes after ground impulse.',
      units: 'Native kg, yd, s; force kg·yd/s², impulse kg·yd/s, planar work kg·yd²/s².' },
    summary: { nativeRows: rows.length, reducedRows: reduced.length, observerVerified: rows.filter(r => r.observerVerified).length + reduced.filter(r => r.observerVerified).length,
      nativeTimeouts: rows.filter(r => r.metrics.outcome === 'timeout').length,
      nativeOutcomes: Object.fromEntries([...new Set(rows.map(r => r.metrics.outcome))].map(outcome => [outcome, rows.filter(r => r.metrics.outcome === outcome).length])),
      maxNativeMomentumResidual: Math.max(...rows.map(r => r.invariants!.momentumResidual)),
      maxNativeWorkResidual: Math.max(...rows.map(r => r.invariants!.workResidual)),
      maxNativeArmImpulseExcess: Math.max(...rows.map(r => r.invariants!.armImpulseExcess)),
      maxNativeArmWorkExcess: Math.max(...rows.map(r => r.invariants!.armWorkExcess)),
      maxNativeMotorWorkExcess: Math.max(...rows.map(r => r.invariants!.motorWorkExcess)) }, reducedMirrors, rows, reduced };
  assertSchematicFinite(report);
  return { report, film: { schema: 'schematic-stress-film-v1', sourceBefore, sourceAfter, limitations: SCHEMATIC_LIMITATIONS,
    plays: native.flatMap(r => r.film ? [r.film] : []), reduced: slices.flatMap(r => r.recording ? [{ id: r.row.id, recording: r.recording }] : []) } };
}

function main() {
  if (process.argv.length > 3) throw new Error('Usage: schematic-stress.ts [output.json]');
  const output = process.argv[2] ?? 'out/schematic-stress/panel.json', collected = collectSchematicStress();
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(collected.report, null, 2) + '\n');
  writeFileSync(output + '.gz', gzipSync(JSON.stringify(collected.report) + '\n'));
  writeFileSync(output.replace(/\.json$/, '') + '-film.json.gz', gzipSync(JSON.stringify(collected.film) + '\n'));
  console.log(JSON.stringify({ output, source: collected.report.sourceBefore, summary: collected.report.summary,
    native: collected.report.rows.map(r => ({ id: r.id, coverage: r.snap.effectiveCoverage, rush: r.snap.rushCount,
      ...r.metrics })), reduced: collected.report.reduced.map(r => ({ id: r.id, contact: r.contactClassification,
        falls: r.falls, invariants: r.invariants })) }, null, 2));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

/** Sequential, observational comparison of the two existing World modes.
 * node --import tsx scripts/diag/football-support-review.ts [out-directory]
 * This does not implement or validate the proposed two-support-slot model.
 */
import { createHash } from 'node:crypto';
import { closeSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { sourceVersion } from '../source-version.js';

type Row = Record<string, unknown>;
type Dimensions = Record<string, readonly (string | number)[]>;
const modes = ['legacy', 'virtual-foot'] as const;
const scripts = {
  hand: 'scripts/diag/hand-convergence.ts',
  shared: 'scripts/diag/shared-capabilities.ts',
  scenarios: 'scripts/scenario-pack.ts',
} as const;
const selector = 'scripts/diag/enable-virtual-foot.ts';
const supportScript = 'scripts/diag/virtual-foot-support.ts';
const steps = [6, 12, 24, 48, 96, 192];
const tasks = ['anchor', 'double-drive', 'shed', 'absorb', 'jam'];
const variants = ['base', 'strong', 'heavy', 'wideBase'];
const repo = process.cwd();
const outputDirectory = resolve(process.argv[2] ?? 'out/football-support-review');
const sourceBefore = sourceVersion();
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const scriptPaths = [...Object.values(scripts), supportScript, selector, 'scripts/source-version.ts',
  'scripts/diag/football-support-review.ts'];
const scriptHashesBefore = Object.fromEntries(scriptPaths.map(path => [path, hash(path)]));
const portablePath = (path: string) => {
  const rel = relative(repo, path);
  return rel.startsWith('..') || isAbsolute(rel) ? path : rel;
};
mkdirSync(outputDirectory, { recursive: true });
const summaryPath = join(outputDirectory, 'summary.json');
rmSync(summaryPath, {force: true});

function requireThat(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function object(value: unknown, label: string): Row {
  requireThat(value !== null && typeof value === 'object' && !Array.isArray(value), `${label}: expected object`);
  return value as Row;
}
function number(row: Row, key: string): number {
  const value = row[key];
  requireThat(typeof value === 'number' && Number.isFinite(value), `${key}: expected finite number`);
  return value;
}
function boolean(row: Row, key: string): boolean {
  requireThat(typeof row[key] === 'boolean', `${key}: expected boolean`);
  return row[key] as boolean;
}
function rows(value: unknown, label: string): Row[] {
  requireThat(Array.isArray(value), `${label}: expected rows`);
  return value.map((row, index) => object(row, `${label}[${index}]`));
}
function falls(row: Row): string {
  requireThat(Array.isArray(row.falls) && row.falls.every(value =>
    typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))), 'invalid falls');
  return JSON.stringify([...row.falls].sort());
}
function finiteTree(value: unknown, label: string): void {
  if (typeof value === 'number') requireThat(Number.isFinite(value), `${label}: nonfinite numeric value`);
  else if (Array.isArray(value)) value.forEach((item, index) => finiteTree(item, `${label}[${index}]`));
  else if (value !== null && typeof value === 'object')
    for (const [key, item] of Object.entries(value)) finiteTree(item, `${label}.${key}`);
}
function grid(input: Row[], dimensions: Dimensions, label: string): void {
  const keys = Object.keys(dimensions);
  const expected = keys.reduce<unknown[][]>((products, key) =>
    products.flatMap(product => dimensions[key].map(value => [...product, value])), [[]]);
  requireThat(input.length === expected.length, `${label}: ${input.length} rows, expected ${expected.length}`);
  const observed = new Set(input.map(row => JSON.stringify(keys.map(key => row[key]))));
  requireThat(observed.size === input.length, `${label}: duplicate fixture`);
  for (const values of expected) requireThat(observed.has(JSON.stringify(values)), `${label}: missing ${JSON.stringify(values)}`);
}
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const max = (values: number[]) => Math.max(...values);
function optionalMaximum(input: Row[], key: string): number | null {
  const measured = input.flatMap(row => {
    requireThat(row[key] === null || (typeof row[key] === 'number' && Number.isFinite(row[key])), `${key}: missing/invalid ledger`);
    return row[key] === null ? [] : [row[key] as number];
  });
  return measured.length ? max(measured) : null;
}
function sharedSummary(report: Row) {
  const input = rows(report.rows, 'shared.rows');
  grid(input, {task: tasks, variant: variants, side: [1, -1], substeps: [6, 12, 48]}, 'shared');
  for (const row of input) {
    requireThat(boolean(row, 'finite'), 'shared: nonfinite body state');
    for (const field of ['subject', 'other']) {
      const point = object(row[field], field); number(point, 'x'); number(point, 'y');
    }
    object(row.subjectProfile, 'subjectProfile'); falls(row);
    for (const field of ['momentumError', 'overlap', 'displacementX', 'displacementY', 'otherDisplacementX']) number(row, field);
  }
  const comparison = (native: Row) => {
    const ref = input.find(row => row.task === native.task && row.variant === native.variant &&
      row.side === native.side && row.substeps === 48)!;
    const subject = object(native.subject, 'subject'), reference = object(ref.subject, 'subject');
    return {side: number(native, 'side'), subjectPositionErrorYd: Math.hypot(
      number(subject, 'x') - number(reference, 'x'), number(subject, 'y') - number(reference, 'y')),
      nativeFalls: JSON.parse(falls(native)) as (string | number)[],
      referenceFalls: JSON.parse(falls(ref)) as (string | number)[], fallSetDisagreement: falls(native) !== falls(ref)};
  };
  const native = input.filter(row => row.substeps === 12);
  const comparisons = native.map(comparison);
  const perTaskProfile = tasks.flatMap(task => variants.map(variant => {
    const pair = native.filter(row => row.task === task && row.variant === variant);
    const matched = pair.map(comparison);
    const positive = pair.find(row => row.side === 1)!, negative = pair.find(row => row.side === -1)!;
    const mirrorError = max(['subject', 'other'].flatMap(key => {
      const a = object(positive[key], key), b = object(negative[key], key);
      return [Math.abs(number(a, 'x') - number(b, 'x')), Math.abs(number(a, 'y') + number(b, 'y'))];
    }));
    return {task, profile: variant, pairedMirrors: matched,
      meanSubjectPositionErrorVs48Yd: mean(matched.map(row => row.subjectPositionErrorYd)),
      maxSubjectPositionErrorVs48Yd: max(matched.map(row => row.subjectPositionErrorYd)),
      fallSetDisagreementsVs48: matched.filter(row => row.fallSetDisagreement).length,
      maxMirrorPositionErrorYd: mirrorError, mirroredFallSetDisagreement: falls(positive) !== falls(negative)};
  }));
  return {reps: input.length, nativeSubsteps: 12, referenceSubsteps: 48, nativeReps: native.length,
    meanSubjectPositionErrorVs48Yd: mean(comparisons.map(row => row.subjectPositionErrorYd)),
    maxSubjectPositionErrorVs48Yd: max(comparisons.map(row => row.subjectPositionErrorYd)),
    fallSetDisagreementsVs48: comparisons.filter(row => row.fallSetDisagreement).length,
    maxMomentumResidualKgYdPerS: max(native.map(row => number(row, 'momentumError'))),
    maxWorkResidualKgYd2PerS2: optionalMaximum(native, 'workError'),
    maxArmImpulseFraction: optionalMaximum(native, 'armFraction'),
    maxArmWorkFraction: optionalMaximum(native, 'energyFraction'), perTaskProfile};
}
function handSummary(report: Row) {
  requireThat(report.node === process.version, 'hand: unexpected/missing child runtime');
  const redirects = rows(report.redirects, 'hand.redirects');
  grid(redirects, {seed: [3, 7, 11], rusherPower: [.7, 1, 1.4], substeps: steps}, 'hand.redirects');
  const frontals = rows(report.frontalApproaches, 'hand.frontalApproaches');
  grid(frontals, {bearing: [0], speed: [4, 7], substeps: steps}, 'hand.frontals');
  for (const row of [...redirects, ...frontals]) {
    requireThat(boolean(row, 'finite'), 'hand: nonfinite body state'); falls(row);
    number(row, 'momentumError'); number(row, 'maxPenetration');
  }
  for (const row of redirects) {number(row, 'closest'); number(row, 'carriedPast'); boolean(row, 'cornerTurned');}
  for (const row of frontals) {boolean(row, 'tackled'); number(row, 'time'); number(row, 'endX');}
  const fixtures = redirects.filter(row => row.substeps === 12).map(row => {
    const reference = redirects.find(ref => ref.substeps === 192 && ref.seed === row.seed && ref.rusherPower === row.rusherPower)!;
    return {seed: number(row, 'seed'), rusherPower: number(row, 'rusherPower'),
      closestErrorYd: Math.abs(number(row, 'closest') - number(reference, 'closest')),
      carriedPastErrorYd: Math.abs(number(row, 'carriedPast') - number(reference, 'carriedPast')),
      fallSetDisagreement: falls(row) !== falls(reference),
      cornerOutcomeDisagreement: boolean(row, 'cornerTurned') !== boolean(reference, 'cornerTurned')};
  });
  return {redirectReps: redirects.length, frontalReps: frontals.length, nativeSubsteps: 12, referenceSubsteps: 192,
    fixtures, meanClosestErrorYd: mean(fixtures.map(row => row.closestErrorYd)),
    maxClosestErrorYd: max(fixtures.map(row => row.closestErrorYd)),
    meanCarriedPastErrorYd: mean(fixtures.map(row => row.carriedPastErrorYd)),
    maxCarriedPastErrorYd: max(fixtures.map(row => row.carriedPastErrorYd)),
    fallOutcomeDisagreements: fixtures.filter(row => row.fallSetDisagreement).length,
    cornerOutcomeDisagreements: fixtures.filter(row => row.cornerOutcomeDisagreement).length,
    frontalByResolution: steps.map(substeps => ({substeps, attempts: 2,
      successes: frontals.filter(row => row.substeps === substeps && row.tackled === true).length})),
    childReportedElapsedSeconds: number(report, 'elapsedSeconds')};
}
function scenarioSummary(report: Row) {
  const dimensions: Record<string, Dimensions> = {
    approach: {side: [1, -1], bearing: [0, 30, 60, 90, 135, 180], speed: [4, 7]},
    sideways: {side: [1, -1], hitter: [2, 4, 6, 8], posture: [.2, .8]},
    redirect: {side: [1, -1], rusherPower: [.7, 1, 1.4]},
    seal: {side: [1, -1], flow: [1.5, 3, 4.5]},
    squeeze: {side: [1, -1], endPower: [.7, 1, 1.4]},
    release: {seed: [3, 5, 7, 9, 11]},
  };
  requireThat(Object.keys(report).length === Object.keys(dimensions).length, 'scenario: invalid families');
  const families = Object.fromEntries(Object.entries(dimensions).map(([family, dims]) => {
    const input = rows(report[family], `scenario.${family}`); grid(input, dims, `scenario.${family}`);
    for (const row of input) {number(row, 'momentumErr'); number(row, 'pen'); if ('falls' in row) falls(row);}
    if (!('side' in dims)) return [family, {reps: input.length, mirroredPairs: 0}];
    const maxAbsoluteDifferenceByField: Record<string, number> = {};
    const categoricalDisagreementsByField: Record<string, number> = {};
    for (const a of input.filter(row => row.side === 1)) {
      const b = input.find(row => row.side === -1 && Object.keys(dims).every(key => key === 'side' || row[key] === a[key]))!;
      for (const [key, value] of Object.entries(a)) {
        if (key in dims) continue;
        requireThat(key in b && typeof b[key] === typeof value, `scenario.${family}: missing mirror field ${key}`);
        if (typeof value === 'number') maxAbsoluteDifferenceByField[key] = Math.max(
          maxAbsoluteDifferenceByField[key] ?? 0, Math.abs(value - number(b, key)));
        else if (Array.isArray(value) || typeof value === 'boolean' || typeof value === 'string' || value === null) {
          const same = key === 'falls' ? falls(a) === falls(b) : JSON.stringify(value) === JSON.stringify(b[key]);
          categoricalDisagreementsByField[key] = (categoricalDisagreementsByField[key] ?? 0) + Number(!same);
        }
      }
    }
    return [family, {reps: input.length, mirroredPairs: input.length / 2,
      note: 'Scenario pack reports side-normalized physical values; compare those directly.',
      maxAbsoluteDifferenceByField, categoricalDisagreementsByField}];
  }));
  const approaches = rows(report.approach, 'approach');
  for (const row of approaches) boolean(row, 'tackled');
  const all = Object.keys(dimensions).flatMap(key => rows(report[key], key));
  return {reps: all.length, families, approach: {attempts: approaches.length,
    successes: approaches.filter(row => row.tackled === true).length,
    frontalAttempts: approaches.filter(row => row.bearing === 0).length,
    frontalSuccesses: approaches.filter(row => row.bearing === 0 && row.tackled === true).length},
    maxMomentumResidualKgYdPerS: max(all.map(row => number(row, 'momentumErr'))),
    maxOverlapYd: max(all.map(row => number(row, 'pen')))};
}

function stationarySummary(report: Row) {
  const input = rows(report.rows, 'stationary.rows');
  const expected = modes.flatMap(supportModel => [null, 0, 1, 50, 900].flatMap(capacity =>
    (capacity === null ? [0] : [1, 4]).flatMap(count => [12, 48, 192].map(substeps =>
      JSON.stringify([supportModel, capacity, count, substeps])))));
  requireThat(input.length === expected.length, 'stationary: missing rows');
  const observed = new Set(input.map(row => JSON.stringify([row.supportModel, row.capacity, row.count, row.substeps])));
  requireThat(observed.size === input.length && expected.every(key => observed.has(key)), 'stationary: invalid fixture grid');
  const stationaryRecoveries = input.map(row => {
    const bodies = rows(row.finalBodies, 'stationary.finalBodies');
    requireThat(bodies.length === 2, 'stationary: invalid bodies');
    const support = object(bodies[1].support, 'stationary.runner.support');
    for (const [key, value] of Object.entries({pos: bodies[1].pos, vel: bodies[1].vel, xi: support.xi})) {
      const point = object(value, `stationary.runner.${key}`); number(point, 'x'); number(point, 'y');
    }
    const ticks = rows(row.ticks, 'stationary.ticks');
    requireThat(ticks.length === 8, 'stationary: invalid tick count');
    for (const tick of ticks) {number(tick, 't'); object(tick.xi, 'stationary.tick.xi');}
    falls(row);
    for (const key of ['gripImpulse', 'motorWork', 'passiveWork', 'maxWorkError', 'maxMomentumError',
      'maxPositiveMotorFraction', 'maxSampledOffset', 'maxSampledExternalForce', 'maxSampledCommandFraction']) number(row, key);
    return {supportModel: row.supportModel, capacity: row.capacity, gripRows: row.count, substeps: row.substeps,
      integratedGripImpulseMagnitudeKgYdPerS: row.gripImpulse, motorWorkKgYd2PerS2: row.motorWork,
      passiveWorkKgYd2PerS2: row.passiveWork, falls: row.falls,
      finalRunner: {pos: bodies[1].pos, vel: bodies[1].vel, support},
      maxSampledOffsetYd: row.maxSampledOffset,
      maxSampledExternalForceKgYdPerS2: row.maxSampledExternalForce,
      maxSampledCommandFraction: row.maxSampledCommandFraction,
      maxPositiveMotorFraction: row.maxPositiveMotorFraction,
      maxMomentumResidualKgYdPerS: row.maxMomentumError,
      maxWorkResidualKgYd2PerS2: row.maxWorkError};
  });
  const synthetic = rows(report.syntheticDrift, 'syntheticDrift');
  grid(synthetic, {repetition: [1, 5, 10, 20]}, 'syntheticDrift');
  for (const row of synthetic) for (const key of ['position', 'offset', 'xi']) {
    const point = object(row[key], key); number(point, 'x'); number(point, 'y');
  }
  return {reps: input.length, durationSeconds: .4, controllerHz: 20,
    note: 'Both models explicitly selected by this script. Initial COMs are still, then free. Grip impulse is the sum of actual solved per-joint impulse magnitudes, recovered from tick-average force times dt; it is not a net vector impulse. Foot maxima are tick samples, not continuous peaks.',
    stationaryRecoveries,
    syntheticDrift: {note: 'Directly resets support deviation before each stationary recovery. No collisions, impulses or physical-hit work; lifecycle geometry diagnostic only.', rows: synthetic}};
}

const measurements: Row[] = [];
function runPanel(mode: typeof modes[number] | 'explicit-both', panel: string, script: string) {
  requireThat(sourceVersion() === sourceBefore, 'Engine source drift before subprocess');
  const rawPath = join(outputDirectory, `${panel}-${mode}.json`);
  const logPath = join(outputDirectory, `${panel}-${mode}.log`);
  rmSync(rawPath, {force: true});
  const args = ['--import', 'tsx', ...(mode === 'virtual-foot' ? ['--import', `./${selector}`] : []), script, portablePath(rawPath)];
  const fd = openSync(logPath, 'w');
  const started = performance.now();
  let child;
  try {child = spawnSync(process.execPath, args, {cwd: repo, stdio: ['ignore', fd, fd], timeout: 60_000});}
  finally {closeSync(fd);}
  const wallSeconds = (performance.now() - started) / 1000;
  requireThat(!child.error && child.status === 0 && child.signal === null,
    `${panel}/${mode}: subprocess failed (${child.error?.message ?? child.signal ?? child.status}); see ${portablePath(logPath)}`);
  const sourceAfterRun = sourceVersion();
  requireThat(sourceAfterRun === sourceBefore, `${panel}/${mode}: engine source drift`);
  const report = object(JSON.parse(readFileSync(rawPath, 'utf8')) as unknown, panel);
  finiteTree(report, panel);
  if (panel !== 'scenarios') requireThat(report.sourceSha256 === sourceBefore, `${panel}: report source mismatch`);
  const measured = panel === 'hand' ? handSummary(report) : panel === 'shared' ? sharedSummary(report)
    : panel === 'scenarios' ? scenarioSummary(report) : stationarySummary(report);
  measurements.push({mode, panel, command: {executable: process.execPath, args, cwd: repo},
    rawPath: portablePath(rawPath), rawSha256: hash(rawPath), logPath: portablePath(logPath), logSha256: hash(logPath),
    sourceBefore: sourceBefore, sourceAfter: sourceAfterRun, wallSeconds, measured});
  console.log(`${panel}/${mode}: retained ${portablePath(rawPath)} (${wallSeconds.toFixed(3)} s, descriptive only)`);
}
for (const mode of modes) for (const [panel, script] of Object.entries(scripts)) runPanel(mode, panel, script);
runPanel('explicit-both', 'stationary-support', supportScript);
const sourceAfter = sourceVersion();
const scriptHashesAfter = Object.fromEntries(scriptPaths.map(path => [path, hash(path)]));
requireThat(sourceBefore === sourceAfter, 'Engine source drift');
requireThat(JSON.stringify(scriptHashesBefore) === JSON.stringify(scriptHashesAfter), 'Diagnostic script drift');
const summary = {
  schema: 'football-support-review-v1', node: process.version, executable: process.execPath,
  sourceBefore, sourceAfter, scriptHashes: scriptHashesBefore,
  selector: {legacy: 'Existing World constructor default; no model preload.',
    virtualFoot: `Explicit --import ./${selector}; modifies only supportModel before calling the original World.step.`,
    note: 'No observer or controller wrapper is inserted by this runner. Existing script bodies, RNG and command cadence are unchanged.'},
  limitations: [
    'The virtual-foot mode is the existing experimental averaged coordinate, not the proposed two persistent support slots.',
    'Finer solver runs are numerical convergence references, not empirical football truth.',
    'Shared-capability constant-intent probes and real-technique scenario probes answer different questions.',
    'Single sequential wall timings are descriptive and include process startup; they do not establish production overhead or speedup.',
    'Known finite baseline regressions are retained as observations, not treated as execution failures.',
  ], measurements,
};
writeFileSync(summaryPath, JSON.stringify(summary, null, 2) + '\n');
console.log(`Saved ${portablePath(summaryPath)}`);

/** Closed-loop block outcomes against a refined physics reference.
 * node --import tsx scripts/diag/hand-convergence.ts [out.json] [--common-patch]
 * Roster seeds and powers are independent fixtures; technique still runs at
 * 20 Hz. The finest solver is a numerical reference, not an NFL target.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { approachTackle, redirect } from '../../src/lab/scenarios.js';
import { sourceVersion } from '../source-version.js';

const args = process.argv.slice(2), paths = args.filter(arg => !arg.startsWith('--'));
if (paths.length > 1 || args.some(arg => arg.startsWith('--') && arg !== '--common-patch')
  || args.filter(arg => arg === '--common-patch').length > 1)
  throw new Error('Usage: hand-convergence.ts [out.json] [--common-patch]');
const handContact = args.includes('--common-patch') ? 'patch' : 'center';
const sourceBefore = sourceVersion();
const steps = [6, 12, 24, 48, 96, 192];
const seeds = [3, 7, 11];
const powers = [0.7, 1, 1.4];
const referenceSteps = steps[steps.length - 1];
const started = Date.now();
const redirects = seeds.flatMap(seed => powers.flatMap(rusherPower => steps.map(substeps => ({
  seed, rusherPower, substeps, ...redirect({ seed, rusherPower, substeps, handContact }),
}))));
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const summaries = steps.slice(0, -1).map(substeps => {
  const rows = redirects.filter(row => row.substeps === substeps);
  const matched = rows.map(row => ({ row, reference: redirects.find(ref =>
    ref.substeps === referenceSteps && ref.seed === row.seed && ref.rusherPower === row.rusherPower)! }));
  const closestErrors = matched.map(({ row, reference }) => Math.abs(row.closest - reference.closest));
  const pastErrors = matched.map(({ row, reference }) => Math.abs(row.carriedPast - reference.carriedPast));
  return {
    substeps, fixtures: rows.length,
    meanClosestErrorYd: mean(closestErrors), maxClosestErrorYd: Math.max(...closestErrors),
    meanCarriedPastErrorYd: mean(pastErrors), maxCarriedPastErrorYd: Math.max(...pastErrors),
    cornerOutcomeDisagreements: matched.filter(({ row, reference }) => row.cornerTurned !== reference.cornerTurned).length,
    fallOutcomeDisagreements: matched.filter(({ row, reference }) => JSON.stringify(row.falls) !== JSON.stringify(reference.falls)).length,
    maxMomentumResidualKgYdPerS: Math.max(...rows.map(row => row.momentumError)),
    maxOverlapYd: Math.max(...rows.map(row => row.maxPenetration)),
    allFinite: rows.every(row => row.finite),
  };
});
// A frontal grasp is a useful sensitivity guard when balance geometry changes.
const frontalApproaches = [4, 7].flatMap(speed => steps.map(substeps => ({
  bearing: 0, speed, substeps, ...approachTackle({ bearing: 0, speed, substeps, handContact }),
})));
const report = {
  sourceSha256: sourceBefore, node: process.version,
  cohort: { seeds, rusherPowers: powers, substeps: steps, referenceSteps, controllerHz: 20, handContact },
  note: 'The refined solver is a convergence reference. These fixtures do not establish NFL fidelity.',
  elapsedSeconds: (Date.now() - started) / 1000,
  summaries, redirects, frontalApproaches,
};
if (sourceBefore !== sourceVersion()) throw new Error('Engine source changed during the panel');
const path = paths[0] ?? 'out/hand-convergence.json';
mkdirSync(dirname(path), { recursive: true });
writeFileSync(path, JSON.stringify(report, null, 2) + '\n');
console.table(summaries);
console.table(frontalApproaches.map(({ speed, substeps, tackled, time, endX, falls }) => ({
  speed, substeps, tackled, time, endX, falls: falls.join(', '),
})));
console.log(`Saved ${path}`);

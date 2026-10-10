/** Fixed reduced split-zone snap-momentum panel, not presnap motion validation.
 * node --import tsx scripts/diag/motion-contact-review.ts [output-directory]
 * Retains raw recorded films for independent offline export, without resimulation.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { motionContact, motionContactDt, motionContactDuration, type MotionContactInput } from '../../src/lab/motion-contact.js';
import { CENTER_Y } from '../../src/core/field.js';
import { sourceVersion } from '../source-version.js';

if (process.argv.length > 3) throw new Error('Usage: motion-contact-review.ts [output-directory]');
const output = process.argv[2] ?? 'out/motion-contact-review';
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const fileHash = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
const scriptPath = 'scripts/diag/motion-contact-review.ts';
const sourceBefore = sourceVersion(), scriptBefore = fileHash(scriptPath), startedAt = new Date().toISOString();
const inputs: MotionContactInput[] = [];
for (const seed of [7, 19]) for (const side of [1, -1] as const) for (const geometry of ['wideSurface', 'penetratingEdge'] as const)
  for (const initialSpeed of [0, 2.5, 4]) for (const substeps of [12, 24, 48])
    inputs.push({ seed, side, geometry, initialSpeed, substeps });
const negativeInputs: MotionContactInput[] = [];
for (const side of [1, -1] as const) for (const substeps of [12, 24, 48])
  negativeInputs.push({ seed: 7, side, geometry: 'initialReachNegative', initialSpeed: 8, substeps });
const filmSelected = (i: MotionContactInput) => i.seed === 7 && i.substeps === 12;
const physicalHash = (r: ReturnType<typeof motionContact>) => hash({ history: r.physicalHistory, rngNext: r.rngNext,
  firstAcquisition: r.firstAcquisition, firstContact: r.firstContact && { ...r.firstContact, before: null },
  endpoint: r.endpoint, falls: r.falls, initialContext: r.initialContext });
const rows: ReturnType<typeof motionContact>[] = [], observerChecks: unknown[] = [], plays: unknown[] = [];
for (const input of [...inputs, ...negativeInputs]) {
  const recording = filmSelected(input), row = motionContact(input, { recording });
  rows.push(row);
  if (recording) {
    const control = motionContact(input, { observe: false, recording: false });
    const observed = physicalHash(row), plain = physicalHash(control);
    const passed = observed === plain && hash(row.initialContext) === hash(control.initialContext);
    if (!passed) throw new Error(`Recording changed physical history or RNG: ${row.id}`);
    observerChecks.push({ id: row.id, passed, physicalSha256: observed, plainSha256: plain,
      initialStateSha256: hash(row.initialContext), plainInitialStateSha256: hash(control.initialContext) });
    plays.push({ id: row.id, input, selection: row.selection, negativeControl: row.negativeControl,
      initial: row.initial, initialContext: row.initialContext, participants: row.participants,
      firstContact: row.firstContact, firstAcquisition: row.firstAcquisition, endpoint: row.endpoint,
      falls: row.falls, invariants: row.invariants, classification: row.contactClassification,
      windowCensored: true, initialStateSha256: hash(row.initialContext),
      profileSha256: hash(row.participants), physicalSha256: observed, recordingVerified: true, ...row.recording });
  }
}
const find = (i: MotionContactInput) => rows.find(r => hash(r.input) === hash(i))!;
const mirrors = [...inputs, ...negativeInputs].filter(i => i.side === 1).map(i => {
  const a = find(i), b = find({ ...i, side: -1 });
  const pointError = (name: 'te' | 'end') => Math.hypot(a.endpoint[name].pos.x - b.endpoint[name].pos.x,
    a.endpoint[name].pos.y + b.endpoint[name].pos.y - 2 * CENTER_Y);
  return { a: a.id, b: b.id, maxEndpointPositionErrorYd: Math.max(pointError('te'), pointError('end')),
    acquisitionStateDisagreement: !!a.firstAcquisition !== !!b.firstAcquisition,
    contactStateDisagreement: !!a.firstContact !== !!b.firstContact,
    fallSetDisagreement: hash(a.falls.map(f => f.slot).sort()) !== hash(b.falls.map(f => f.slot).sort()) };
});
const refinements = [...inputs, ...negativeInputs].filter(i => i.substeps === 12).flatMap(i => [24, 48].map(substeps => {
  const a = find(i), b = find({ ...i, substeps });
  const pointError = (name: 'te' | 'end') => Math.hypot(a.endpoint[name].pos.x - b.endpoint[name].pos.x,
    a.endpoint[name].pos.y - b.endpoint[name].pos.y);
  return { native: a.id, reference: b.id, maxEndpointPositionErrorYd: Math.max(pointError('te'), pointError('end')),
    acquisitionStateDisagreement: !!a.firstAcquisition !== !!b.firstAcquisition,
    acquisitionTimeDifference: a.firstAcquisition && b.firstAcquisition ? Math.abs(a.firstAcquisition.t - b.firstAcquisition.t) : null,
    contactStateDisagreement: !!a.firstContact !== !!b.firstContact,
    firstLoadTimeDifference: a.firstContact && b.firstContact ? Math.abs(a.firstContact.interval[1] - b.firstContact.interval[1]) : null,
    fallSetDisagreement: hash(a.falls.map(f => f.slot).sort()) !== hash(b.falls.map(f => f.slot).sort()) };
}));
const summary = [0, 2.5, 4].map(initialSpeed => {
  const selected = rows.filter(r => !r.negativeControl && r.input.substeps === 12 && r.input.initialSpeed === initialSpeed);
  return { initialSpeed, reps: selected.length, acquisitions: selected.filter(r => r.firstAcquisition).length,
    loadedContacts: selected.filter(r => r.firstContact).length, falls: selected.reduce((n, r) => n + r.falls.length, 0),
    initialKineticEnergyRange: [Math.min(...selected.map(r => r.initial.teKineticEnergyKgYd2PerS2)),
      Math.max(...selected.map(r => r.initial.teKineticEnergyKgYd2PerS2))],
    firstLoadIntervals: selected.map(r => ({ id: r.id, interval: r.firstContact?.interval ?? null,
      handNormalImpulse: r.firstContact?.handNormalImpulse ?? null, handTangentialImpulse: r.firstContact?.handTangentialImpulse ?? null })) };
});
const sourceAfter = sourceVersion(), scriptAfter = fileHash(scriptPath);
if (sourceBefore !== sourceAfter || scriptBefore !== scriptAfter) throw new Error('Engine or tool changed during panel');
const definitions = {
  scope: 'Reduced snap-time momentum/contact witnesses, not full legal presnap motion, coverage exchange, screen, split-zone timing or football outcomes. Existing RunBlocker slice plan, RunDefender, engagement and shared World; no force/profile bonuses.',
  geometry: 'Analytical TE at LOS−1.4,+1.8 yd across field centre, end at −5.2 yd lateral (or −13.5 yd separate reach negative) and +0.3/−0.7 yd from LOS. Mirrors invert those lateral offsets. Width/depth are exploratory probes, not NFL distributions.',
  controls: 'Football controllers sampled every0.05s for2.5s at all substeps. Production snap reaction gates retained. World handles the initial TE momentum; no velocity teleport, forced engagement, down, block win or whistle.',
  initialization: '24 analytically backward constant-velocity snapshots ending at the exact staged state. No legal motion path or acceleration was simulated. Twenty bystanders parked far away with stationary consistent history, retaining formation lateral landmarks for the edge controller.',
  mirrors: 'Generated TE/end execution-error signs and parked defensive alignment scatter are explicitly mirrored as geometric offsets. Original magnitudes, skills, timing, local streams and controls are retained. This is an explicitly mirrored physical test, not a test of unmodified play-alignment error conventions.',
  initialSpeed: '0/2.5/4 yd/s in primary cohort;8yd/s only the separate far-edge negative. Exploratory inputs, not calibrated NFL presnap motion speeds. Extra initial linear KE is0.5×generated TE mass×speed² and appears in the ordinary work ledger.',
  contact: 'Acquisition is the real controller creating a reachable engagement. Loaded contact is actual nonzero World body impulse or actual hand force; contact times are50ms intervals, not exact collision timestamps. No acquisition may mean too late for this inspection window, not an NFL miss statistic.',
  impulses: 'Reported hand normal/tangent impulses equal actual mean hand forces over the50ms step times0.05s; capacities stay ordinary. World reports summed body normal impulse and closing at touch; body tangential impulse is unavailable. Endpoint relative normal/tangent speed is separately labelled and is not strike-time speed.',
  outcome: 'Every window remains censored. Displacements, falls and delayed/missing load are diagnostic observations, never credited rushing yards or a scripted kickout/tackle.',
  film: 'Predetermined14 clips:first roster, both mirrors, two primary edge depths×three initial speeds at12steps, plus two separate far-edge negatives. Raw full22-body frames, full telemetry, actual controller observations and event labels; no resimulation or outcome-based selection.',
  bookkeeping: 'Momentum includes all22 indexed bodies, explained by summed ground impulse. Work is the reduced planar World accounting including yaw, not a claim of full3D anatomical energy conservation.',
};
const report = { schema: 'motion-contact-review-v1', sourceBefore, sourceAfter, scriptBefore, scriptAfter, startedAt,
  runtime: process.version, argv: process.argv.slice(1), decisionDt: motionContactDt, durationSeconds: motionContactDuration,
  inputs, negativeInputs, inputSha256: hash(inputs), negativeInputSha256: hash(negativeInputs),
  profileSha256: hash(rows.filter(r => r.input.side === 1 && r.input.substeps === 12 && r.input.initialSpeed === 0).map(r => r.participants)),
  definitions, summary, observerChecks, mirrorChecks: mirrors, refinementChecks: refinements,
  overall: { primaryRows: inputs.length, negativeRows: negativeInputs.length, films: plays.length,
    maxMirrorEndpointErrorYd: Math.max(...mirrors.map(r => r.maxEndpointPositionErrorYd)),
    maxRefinementEndpointErrorYd: Math.max(...refinements.map(r => r.maxEndpointPositionErrorYd)),
    maxMomentumResidual: Math.max(...rows.map(r => r.invariants.momentumResidual)),
    maxWorkResidual: Math.max(...rows.map(r => r.invariants.workResidual)),
    maxMotorWorkExcess: Math.max(...rows.map(r => r.invariants.motorWorkExcess)),
    maxArmImpulseExcess: Math.max(...rows.map(r => r.invariants.armImpulseExcess)),
    maxArmWorkExcess: Math.max(...rows.map(r => r.invariants.armWorkExcess)),
    refinementContactDisagreements: refinements.filter(r => r.contactStateDisagreement).length,
    refinementFallDisagreements: refinements.filter(r => r.fallSetDisagreement).length },
  rows: rows.map(r => ({ ...r, recording: undefined, physicalSha256: physicalHash(r) })) };
function finiteTree(x: unknown, label = 'report'): void {
  if (typeof x === 'number' && !Number.isFinite(x)) throw new Error(`Nonfinite ${label}`);
  if (Array.isArray(x)) x.forEach((v, i) => finiteTree(v, `${label}[${i}]`));
  else if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) finiteTree(v, `${label}.${k}`);
}
// Generated SnapMind has intentional Infinity sentinels for no lapse; the raw
// snapshot's JSON copy records those asnull. Physical/report numbers must befinite.
finiteTree(report);
mkdirSync(output, { recursive: true });
writeFileSync(join(output, 'raw.json.gz'), gzipSync(JSON.stringify(report) + '\n', { level: 9 }));
writeFileSync(join(output, 'film.json.gz'), gzipSync(JSON.stringify({ schema: 'motion-contact-film-v1', sourceBefore,
  sourceAfter, scriptBefore, scriptAfter, inputSha256: report.inputSha256, negativeInputSha256: report.negativeInputSha256,
  profileSha256: report.profileSha256, definitions, decisionDt: motionContactDt, durationSeconds: motionContactDuration,
  observerChecks, plays }) + '\n', { level: 9 }));
writeFileSync(join(output, 'summary.json'), JSON.stringify({ ...report, rows: report.rows.map(r => ({ ...r,
  physicalHistory: undefined, frames: undefined, initialContext: undefined })) }, null, 2) + '\n');
console.log(JSON.stringify({ sourceSha256: sourceBefore, ...report.overall, summary }, null, 2));

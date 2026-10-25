/** Read saved evidence only. This tool never imports/runs the simulation. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Report, Measurement } from './roster-screen.js';

const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const bytesHash = (value: string): string => createHash('sha256').update(value).digest('hex');
const text = (value: unknown): string => String(value).replace(/[\r\n]/g, ' ').replace(/\|/g, '\\|').replace(/`/g, '\\`');
const number = (value: number | null): string => value === null ? 'n/a' : String(Number(value.toFixed(4)));
const metrics = (r: Measurement): string => `${text(r.outcome)}; ${number(r.yards)} yd; YAC ${number(r.yac)}; completed=${r.completed}`;

function checkReport(report: Report, label: string): void {
  if (report?.schemaVersion !== 1 || !['complete', 'failed', 'budget-exhausted'].includes(report.status)
    || !Number.isInteger(report.planned) || report.planned < 1 || report.planned > 32
    || !Array.isArray(report.rows) || !Array.isArray(report.skipped) || !report.provenance
    || report.rows.length + report.skipped.length > report.planned) throw new Error(`Invalid ${label} report`);
  const ids = report.rows.map(r => r.caseId);
  if (new Set([...ids, ...report.skipped]).size !== ids.length + report.skipped.length)
    throw new Error(`Duplicate/overlapping cases in ${label}`);
  if (report.status === 'complete' && (report.rows.length !== report.planned || report.skipped.length || report.error))
    throw new Error(`Incomplete ${label} marked complete`);
  for (const row of report.rows) {
    const r = row.result;
    if (typeof row.caseId !== 'string' || !row.caseId || typeof row.inputSha256 !== 'string'
      || hash(row.provenance) !== hash(report.provenance)
      || row.key !== hash({ schemaVersion: 1, caseId: row.caseId, inputSha256: row.inputSha256, provenance: report.provenance })
      || !r || hash(r) !== row.resultSha256 || typeof r.signature !== 'string' || !r.signature
      || typeof r.outcome !== 'string' || typeof r.completed !== 'boolean'
      || ![r.yards, r.missed, r.broken, r.duration].every(v => typeof v === 'number' && Number.isFinite(v))
      || !(r.yac === null || typeof r.yac === 'number' && Number.isFinite(r.yac)))
      throw new Error(`Invalid ${label} entry: ${row.caseId}`);
  }
}

export function buildReview(baseline: Report, candidate: Report,
  pins: { sourceSha256: string; flags: unknown }): string {
  checkReport(baseline, 'baseline'); checkReport(candidate, 'candidate');
  if (baseline.status !== 'complete') throw new Error('Baseline must be complete');
  if (baseline.provenance.sourceSha256 !== pins.sourceSha256 || hash(baseline.provenance.flags) !== hash(pins.flags))
    throw new Error('Baseline must use the pinned runtime and flags');
  for (const k of ['node', 'platform', 'arch', 'dependenciesSha256', 'collectorSha256', 'fixtureSha256', 'measurementVersion', 'worldDefaults'] as const)
    if (hash(baseline.provenance[k]) !== hash(candidate.provenance[k])) throw new Error(`Incompatible measurement/environment: ${k}`);
  const reference = new Map(baseline.rows.map(r => [r.caseId, r]));
  for (const id of [...candidate.rows.map(r => r.caseId), ...candidate.skipped])
    if (!reference.has(id)) throw new Error(`Missing baseline case: ${id}`);
  for (const row of candidate.rows)
    if (reference.get(row.caseId)!.inputSha256 !== row.inputSha256) throw new Error(`Changed input: ${row.caseId}`);
  // Recompute from hashed entries; do not trust a stale comparison summary.
  const changed = candidate.rows.filter(r => r.result.signature !== reference.get(r.caseId)!.result.signature);
  const blocked = candidate.status !== 'complete';
  const lines = [
    '# Behavior review worksheet', '',
    'Apply [the shared procedure](../../../docs/BEHAVIOR_REVIEW.md). Generated from saved evidence; simulations: **0**.', '',
    `Execution coverage: **${blocked ? 'BLOCKED' : 'complete; behavioral judgment pending'}** (${text(candidate.status)}).`,
    `${candidate.rows.length}/${candidate.planned} recorded; ${changed.length} changed; ${candidate.skipped.length} skipped.`,
    `Error: ${text(candidate.error ?? 'none')}. A complete run is not an improvement verdict.`, '',
    `Baseline source: ${text(baseline.provenance.sourceSha256)}.`,
    `Candidate source: ${text(candidate.provenance.sourceSha256)}.`,
    `Resolved flags changed: ${hash(baseline.provenance.flags) !== hash(candidate.provenance.flags)}.`,
    `Measurement version: ${candidate.provenance.measurementVersion}; collector: ${text(candidate.provenance.collectorSha256)}.`,
    `Baseline report content SHA256: ${hash(baseline)}.`,
    `Candidate report content SHA256: ${hash(candidate)}.`, '',
    '## Contract declared before candidate results', '',
    '- Hypothesis / target defect: TODO',
    '- Observable contract, tolerance/reference and falsifier: TODO',
    '- Failing witness / opposing contracts / legitimate allowed wins: TODO',
    '- Intended code/flag/profile differences and unchanged controls: TODO',
    '- Hard-check receipts and known baseline failures: TODO',
    '- If criteria were chosen after results, label exploratory and name the confirmation check: TODO', '',
    '## All recorded cases', '',
    'Deltas describe outcomes, not merit. Signature identity preserves execution, not correctness.',
    'YAC is conditional on completion; changed completion cohorts are not paired YAC estimates.', '',
    '| Case | Execution | Baseline | Candidate | Delta yards | Delta YAC | Profiles changed |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (const row of candidate.rows) {
    const b = reference.get(row.caseId)!.result, c = row.result;
    const profileChange = !b.initialProfilesSha256 || !c.initialProfilesSha256 ? 'unknown' : String(b.initialProfilesSha256 !== c.initialProfilesSha256);
    const deltaYac = b.yac === null || c.yac === null ? null : c.yac - b.yac;
    lines.push(`| ${text(row.caseId)} | ${c.signature === b.signature ? 'identical' : 'changed / UNREVIEWED'} | ${metrics(b)} | ${metrics(c)} | ${number(c.yards - b.yards)} | ${number(deltaYac)} | ${profileChange} |`);
  }
  lines.push('', '## Skipped / failed coverage', '',
    ...candidate.skipped.map(id => `- Skipped: ${text(id)}`),
    candidate.skipped.length ? '' : 'No explicitly skipped cases.',
    blocked ? 'Retain the error above and any failed/unrecorded case; partial evidence does not pass planned coverage.' : 'No execution failure reported.', '',
    '## Changed-case judgments', '',
    'All changed cases begin UNREVIEWED, regardless of outcome direction. Explicit common-cause grouping may cite several IDs; retain this case list.', '',
    'Verdicts: improvement, valid outcome change, regression, tradeoff, inconclusive, invalid comparison.',
    'Cite evidence for each verdict. Do not infer cause from this outcome table.', '');
  for (const row of changed) {
    const b = reference.get(row.caseId)!;
    lines.push(`### ${text(row.caseId)}`, '',
      '**Verdict: UNREVIEWED**', '',
      `Evidence keys: baseline ${text(b.key)}; candidate ${text(row.key)}.`,
      '- Actor / assigned role / first relevant divergence timestamp: TODO',
      '- Acquired cue -> choice/request -> achieved motion/load -> recovery -> outcome: TODO',
      '- Cause / feasible football rationale / trace or reference links: TODO',
      '- Falsifying check / same-state ablation / opposing-control result: TODO',
      '- Uncertainty, proxies, adverse effects and common-cause group IDs: TODO',
      '- Verdict, scope and next action (with marginal check budget if needed): TODO', '');
  }
  if (!changed.length) lines.push('No changed signatures. This comparison alone demonstrates no mechanism improvement.', '');
  lines.push('## Candidate decision', '',
    '**PENDING** — the worksheet is not an automatic promotion gate.', '',
    '- Target repair established by: TODO',
    '- Opposing controls, material changed mechanisms and all adverse cases accounted for: TODO',
    '- Supported contract failures / unresolved tradeoffs / missing evidence: TODO',
    '- Required integration checks and exact receipts: TODO',
    '- Integrate within stated scope / keep experimental / diagnose or revert, with rationale: TODO',
    '- Next cheapest discriminating check and budget, only if needed: TODO', '');
  return lines.join('\n');
}

function main(): void {
  const args = process.argv.slice(2), values: Record<string, string> = {};
  if (!args.length || args.length === 1 && args[0] === '--help') {
    console.log('Saved-result review; simulations: 0. Usage: node --import tsx scripts/roster-review.ts --baseline FILE --candidate FILE --out NEW.md'); return;
  }
  while (args.length) {
    const key = args.shift()!;
    if (!['--baseline', '--candidate', '--out'].includes(key) || values[key]) throw new Error(`Unknown/duplicate option: ${key}`);
    const value = args.shift(); if (!value || value.startsWith('--')) throw new Error(`Missing value: ${key}`);
    values[key] = value;
  }
  if (!values['--baseline'] || !values['--candidate'] || !values['--out']) throw new Error('Supply --baseline, --candidate and --out');
  const baselineBytes = readFileSync(values['--baseline'], 'utf8'), candidateBytes = readFileSync(values['--candidate'], 'utf8');
  // Evidence pins describe the historical collector, not today's flag inventory.
  const pins = JSON.parse(readFileSync('config/roster-screen-reference.json', 'utf8'));
  let review = buildReview(JSON.parse(baselineBytes), JSON.parse(candidateBytes), pins);
  // Absolute links remain usable if the worksheet is placed outside the default out/ tree.
  review = review.replace('../../../docs/BEHAVIOR_REVIEW.md', resolve('docs/BEHAVIOR_REVIEW.md'));
  review += `\nInput files (preserve these exact bytes):\n\n- ${text(resolve(values['--baseline']))}: SHA256 ${bytesHash(baselineBytes)}\n- ${text(resolve(values['--candidate']))}: SHA256 ${bytesHash(candidateBytes)}\n`;
  const out = values['--out'];
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, review, { flag: 'wx' }); // Never overwrite filled judgments or input evidence.
  console.log(`Review pending; simulations: 0; ${out}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); } catch (error) { console.error(error); process.exitCode = 1; }
}

import { afterEach, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { buildReview } from '../scripts/roster-review.js';
import type { Report } from '../scripts/roster-screen.js';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const baseline: Report = JSON.parse(readFileSync('data/reviews/current/roster-screen-baseline.json', 'utf8'));
const pins = JSON.parse(readFileSync('config/roster-screen-reference.json', 'utf8'));
function candidate(): Report {
  const c = structuredClone(baseline); c.rows = c.rows.slice(0, 3); c.planned = 3;
  c.provenance.sourceSha256 = 'candidate';
  for (const row of c.rows) row.provenance = structuredClone(c.provenance);
  return seal(c);
}
function seal(c: Report): Report {
  for (const r of c.rows) {
    r.resultSha256 = hash(r.result);
    r.key = hash({ schemaVersion: 1, caseId: r.caseId, inputSha256: r.inputSha256, provenance: r.provenance });
  }
  return c;
}
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });

describe('saved-result behavioral review has no outcome promotion rule', () => {
  it('keeps favorable, adverse and equal-yardage trajectory changes unreviewed, preserving every case', () => {
    const c = candidate(), before = hash(baseline);
    c.rows[0].result.yards -= 5; c.rows[1].result.yards += 5;
    for (const row of c.rows) row.result.signature = `new-${row.caseId}`;
    const review = buildReview(baseline, seal(c), pins);
    expect(review.match(/\*\*Verdict: UNREVIEWED\*\*/g)).toHaveLength(3);
    for (const row of c.rows) expect(review).toContain(`### ${row.caseId}`);
    expect(review).toContain('behavioral judgment pending');
    expect(review).toContain('**PENDING**'); expect(review).toContain('simulations: **0**');
    expect(hash(baseline)).toBe(before);
  });

  it('does not certify identical execution and flags changes in completion population/profile mapping', () => {
    const same = buildReview(baseline, candidate(), pins);
    expect(same).toContain('No changed signatures'); expect(same).not.toContain('**Verdict:');
    const c = candidate(); c.rows[0].result.completed = !c.rows[0].result.completed;
    // Adding a current flag must not relabel or invalidate historical evidence.
    c.provenance.flags = JSON.parse(readFileSync('config/baseline.json', 'utf8')).flags;
    for (const row of c.rows) row.provenance = structuredClone(c.provenance);
    c.rows[0].result.yac = null; c.rows[0].result.signature = 'new-completion';
    c.rows[0].result.initialProfilesSha256 = 'different-profile';
    const review = buildReview(baseline, seal(c), pins);
    expect(review).toContain('changed completion cohorts are not paired YAC estimates');
    expect(review).toContain('| n/a | true |');
    expect(review).toContain('Resolved flags changed: true.');
  });

  it('retains failed/partial evidence as blocked instead of converting it into a passing review', () => {
    const c = candidate(); c.status = 'failed'; c.error = 'Protected unchanged control regressed';
    c.skipped = c.rows.slice(1).map(r => r.caseId); c.rows = c.rows.slice(0, 1);
    const review = buildReview(baseline, c, pins);
    expect(review).toContain('**BLOCKED**'); expect(review).toContain(c.error);
    for (const id of c.skipped) expect(review).toContain(`Skipped: ${id}`);
    const incomplete = candidate(); incomplete.rows.pop();
    expect(() => buildReview(baseline, incomplete, pins)).toThrow('Incomplete candidate');
  });

  it('rejects corrupt entries, changed inputs, stale measurements and unsupported baseline pins', () => {
    const corrupt = candidate(); corrupt.rows[0].result.yards += 1;
    expect(() => buildReview(baseline, corrupt, pins)).toThrow('Invalid candidate entry');
    const input = candidate(); input.rows[0].inputSha256 = 'different-input';
    expect(() => buildReview(baseline, seal(input), pins)).toThrow('Changed input');
    const measurement = candidate(); measurement.provenance.measurementVersion++;
    for (const row of measurement.rows) row.provenance = measurement.provenance;
    expect(() => buildReview(baseline, seal(measurement), pins)).toThrow('Incompatible measurement');
    expect(() => buildReview(baseline, candidate(), { ...pins, sourceSha256: 'wrong' })).toThrow('pinned runtime');
    const missing = candidate(); missing.rows[0].caseId = 'absent';
    expect(() => buildReview(baseline, seal(missing), pins)).toThrow('Missing baseline');
    const duplicate = candidate(); duplicate.rows[1] = duplicate.rows[0];
    expect(() => buildReview(baseline, duplicate, pins)).toThrow('Duplicate');
  });

  it('CLI only reads saved results, recomputes comparisons and refuses to overwrite a filled review', () => {
    const dir = mkdtempSync(join(tmpdir(), 'roster-review-')); dirs.push(dir);
    const c = candidate(), input = join(dir, 'candidate.json'), out = join(dir, 'review.md');
    writeFileSync(input, JSON.stringify({ ...c, comparison: { changed: [{ caseId: 'invented' }] } }));
    const args = ['--import', 'tsx', 'scripts/roster-review.ts', '--baseline',
      'data/reviews/current/roster-screen-baseline.json', '--candidate', input, '--out', out];
    const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
    expect(run.status).toBe(0); expect(run.stdout).toContain('simulations: 0');
    expect(readFileSync(out, 'utf8')).not.toContain('invented');
    writeFileSync(out, 'Filled judgment');
    const repeat = spawnSync(process.execPath, args, { encoding: 'utf8' });
    expect(repeat.status).toBe(1); expect(repeat.stderr).toContain('EEXIST');
    expect(readFileSync(out, 'utf8')).toBe('Filled judgment');
    const help = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/roster-review.ts'], { encoding: 'utf8' });
    expect(help.status).toBe(0); expect(help.stdout).toContain('simulations: 0');
  });
});

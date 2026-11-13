import { describe, expect, it } from 'vitest';
import { scan } from '../scripts/diag/information-guard-scan.js';
import { INFORMATION_DEBT } from './information-guard-allowlist.js';

// Decision code reads another player's true body, assignment or intent, or the play's private
// state, only where the row is listed (with an owner and a date). See the allowlist's header.
describe('decision-code information scan (type-aware)', () => {
  const root = new URL('..', import.meta.url).pathname;
  const reads = scan(root);
  const counts = new Map<string, typeof reads>();
  for (const r of reads) {
    const k = `${r.file} ${r.rule}.${r.member}`;
    counts.set(k, [...(counts.get(k) ?? []), r]);
  }
  const listed = new Map(INFORMATION_DEBT.map(d => [`${d.file} ${d.key}`, d]));

  it('has no read of true state outside the listed debt', () => {
    const unlisted = [...counts].filter(([k]) => !listed.has(k))
      .flatMap(([, v]) => v.map(r => `${r.file}:${r.line} ${r.rule}.${r.member} <- ${r.receiver}: ${r.text}`));
    expect(unlisted, 'Read it through sim.see or something he was told. Do not add a row to pass.').toEqual([]);
  }, 180_000);

  it('keeps each listed count exact, so a repaired read lowers its row and a new one cannot hide', () => {
    const mismatch = INFORMATION_DEBT.filter(d => (counts.get(`${d.file} ${d.key}`)?.length ?? 0) !== d.reads)
      .map(d => `${d.file} ${d.key}: listed ${d.reads}, found ${counts.get(`${d.file} ${d.key}`)?.length ?? 0}`);
    expect(mismatch).toEqual([]);
  }, 180_000);

  it('names an owner, a date and a reason for every row, once', () => {
    const bad = INFORMATION_DEBT.filter(d => !d.owner || !/^\d{4}-\d{2}-\d{2}$/.test(d.since) || !d.why);
    const keys = INFORMATION_DEBT.map(d => `${d.file} ${d.key}`);
    expect(bad).toEqual([]);
    expect(keys.length).toBe(new Set(keys).size);
  });
});

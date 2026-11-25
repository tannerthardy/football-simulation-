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
  // A (file, member) may carry rows of several classes; its reads are their sum.
  const listed = new Map<string, number>();
  for (const d of INFORMATION_DEBT) listed.set(`${d.file} ${d.key}`, (listed.get(`${d.file} ${d.key}`) ?? 0) + d.reads);

  it('has no read of true state outside the listed debt', () => {
    const unlisted = [...counts].filter(([k]) => !listed.has(k))
      .flatMap(([, v]) => v.map(r => `${r.file}:${r.line} ${r.rule}.${r.member} <- ${r.receiver}: ${r.text}`));
    expect(unlisted, 'Read it through sim.see or something he was told. Do not add a row to pass.').toEqual([]);
  }, 180_000);

  it('keeps each listed count exact, so a repaired read lowers its row and a new one cannot hide', () => {
    const mismatch = [...listed].filter(([k, n]) => (counts.get(k)?.length ?? 0) !== n)
      .map(([k, n]) => `${k}: listed ${n}, found ${counts.get(k)?.length ?? 0}`);
    expect(mismatch).toEqual([]);
  }, 180_000);

  it('names a class, an owner, a date and a reason for every row, once', () => {
    const classes = new Set(['leak', 'touch', 'physics', 'officiating', 'unreviewed', 'perception', 'surfaced', 'known']);
    const bad = INFORMATION_DEBT.filter(d => !classes.has(d.class) || !d.owner || !/^\d{4}-\d{2}-\d{2}$/.test(d.since) || !d.why);
    const keys = INFORMATION_DEBT.map(d => `${d.file} ${d.key} ${d.class}`);
    expect(bad).toEqual([]);
    expect(keys.length).toBe(new Set(keys).size);
  });

  it('reports the number to drive to zero', () => {
    const total = (c: string) => INFORMATION_DEBT.filter(d => d.class === c).reduce((n, d) => n + d.reads, 0);
    const rows = (c: string) => INFORMATION_DEBT.filter(d => d.class === c).length;
    const line = ['leak', 'unreviewed', 'touch', 'physics', 'officiating', 'perception', 'surfaced', 'known']
      .map(c => `${c} ${total(c)} reads in ${rows(c)} rows`).join(' | ');
    console.info(`information debt: ${line}`);
    expect(total('leak') + total('unreviewed')).toBeGreaterThanOrEqual(0);
  });
});

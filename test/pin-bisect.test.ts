import { describe, expect, it } from 'vitest';
import { minimalPinned } from '../scripts/diag/pin-bisect.js';

const flags = Array.from({ length: 40 }, (_, i) => `F${i}`);

// A file passes when every flag it needs is pinned.
const needing = (need: string[]) => async (pinned: string[]) => need.every(f => pinned.includes(f));

describe('pin bisect', () => {
  it('finds the single flag a file needs', async () => {
    expect(await minimalPinned(flags, needing(['F17']))).toEqual(['F17']);
  });
  it('finds several flags and no others', async () => {
    expect((await minimalPinned(flags, needing(['F3', 'F29', 'F30']))).sort()).toEqual(['F29', 'F3', 'F30']);
  });
  it('returns nothing when nothing needs pinning', async () => {
    expect(await minimalPinned(flags, needing([]))).toEqual([]);
  });
  it('takes about log-many runs for one culprit', async () => {
    let runs = 0;
    await minimalPinned(flags, async p => { runs++; return p.includes('F5'); });
    expect(runs).toBeLessThan(20);
  });
});

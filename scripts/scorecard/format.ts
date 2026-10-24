/** Presentation only: counts come from saved evidence, never rounded rates. */
import type { Metric } from './metrics.js';
import type { GameRec, PlayRec } from './records.js';

// Boolean metric callbacks can map an absent legacy field to false. Check the
// recorded fields before calling them; missing evidence is not a counted zero.
const playFields: Record<string, { on: Array<keyof PlayRec>; num: Array<keyof PlayRec> }> = {
  passRate: { on: ['kind'], num: [] },
  comp: { on: ['att'], num: ['comp'] },
  sack: { on: ['kind'], num: ['sack'] },
  int: { on: ['att'], num: ['int'] },
  passTd: { on: ['att'], num: ['comp', 'td'] },
  comp20: { on: ['att'], num: ['comp', 'yards'] },
  scramble: { on: ['kind'], num: ['scramble'] },
  stuff: { on: ['kind'], num: ['yards'] },
  run10: { on: ['kind'], num: ['yards'] },
  run20to40: { on: ['kind', 'yards'], num: [] },
};

const recorded = (p: PlayRec, key: keyof PlayRec) => key === 'kind'
  ? p.kind === 'run' || p.kind === 'pass'
  : key === 'yards' ? Number.isFinite(p[key]) : typeof p[key] === 'boolean';

/** Supplement scaled rates with actual recorded events/exposure. No change to
 * evaluate(), intervals, eligibility, stored records or compatibility policy. */
export function rateCounts(m: Metric, games: GameRec[], filter?: (p: PlayRec) => boolean): string {
  if (m.scale !== 100) return '';
  let num = 0, den = 0;
  if (m.play) {
    const fields = playFields[m.id];
    if (!fields) return ' (counts unavailable)';
    for (const g of games) for (const p of g.plays) {
      if (filter && !filter(p)) continue;
      if (!fields.on.every(key => recorded(p, key))) return ' (counts unavailable)';
      if (!m.play.on(p)) continue;
      if (!fields.num.every(key => recorded(p, key))) return ' (counts unavailable)';
      num += m.play.num(p);
      den += m.play.den ? m.play.den(p) : 1;
    }
  } else if (m.game) {
    for (const g of games) { num += m.game.num(g); den += m.game.den(g); }
  } else if (m.probe) {
    for (const g of games) {
      num += g.probe[m.probe.num];
      den += g.probe[m.probe.den];
    }
  } else return ' (counts unavailable)';
  if (!Number.isSafeInteger(num) || !Number.isSafeInteger(den) || num < 0 || den < 0)
    return ' (counts unavailable)';
  return ` (${num}/${den}${den === 0 ? '; no exposure' : ''})`;
}

export function changeReading(base: number, now: number, lo: number, hi: number, qualified: boolean): string {
  if (!Number.isFinite(base) || !Number.isFinite(now)) return 'unavailable';
  if (!qualified) return 'unverified';
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return 'interval unavailable';
  return lo > 0 || hi < 0 ? '**moved**' : 'not resolved by this sample';
}

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { METRICS } from '../scripts/scorecard/metrics.js';
import { PROBES } from '../scripts/scorecard/probes.js';

interface Range { n: number; p10: number; p90: number }
interface TeamSeason {
  completion: { count: number };
  completionYards: { n: number; mean: number };
  throws: number;
  dropbackShare: { percent: number };
  designedRun: { yards: { mean: number }; explosiveThresholdYd: number; explosive: { percent: number } };
}
interface Reference {
  teamSeasonRanges: Record<string, Range>;
  teamSeasons: TeamSeason[];
}

const file = 'data/reviews/nflverse/reference.json';
const reference = JSON.parse(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')) as Reference;
const metric = (id: string) => METRICS.find((m) => m.id === id)!;
const rounded = (x: number) => Math.round(x * 100) / 100;

// Match scripts/nflverse-reference.py: linear interpolation at q * (n - 1),
// equal-weight team-seasons, then round each endpoint to two decimal places.
// Do not pool plays or use within-season play-yardage percentiles as bands.
function band(values: number[]): [number, number] {
  expect(values.length).toBeGreaterThan(1);
  expect(values.every(Number.isFinite)).toBe(true);
  const xs = [...values].sort((a, b) => a - b);
  const q = (p: number) => {
    const index = p * (xs.length - 1), lo = Math.floor(index);
    return rounded(xs[lo] + (xs[Math.min(lo + 1, xs.length - 1)] - xs[lo]) * (index - lo));
  };
  return [q(0.1), q(0.9)];
}

// This mapping locks the metric's meaning as well as its numeric endpoints:
// changing a label/key together must not silently substitute another statistic.
const direct = [
  ['comp', 'completion'],
  ['int', 'interception'],
  ['sack', 'sackPerDropback'],
  ['scramble', 'scramblePerDropback'],
  ['comp20', 'twentyYardCompletionPerThrow'],
  ['stuff', 'stuffPerDesignedRun'],
  ['yac', 'meanCompletedYAC'],
] as const;
const derived: Array<{ id: string; key: string; value: (t: TeamSeason) => number }> = [
  { id: 'passRate', key: 'teamSeasons[].dropbackShare.percent', value: (t) => t.dropbackShare.percent },
  { id: 'ypa', key: 'teamSeasons[]: completionYards.mean * completion.count / throws',
    value: (t) => t.completionYards.mean * t.completion.count / t.throws },
  { id: 'ypc', key: 'teamSeasons[].designedRun.yards.mean', value: (t) => t.designedRun.yards.mean },
  { id: 'run10', key: 'teamSeasons[].designedRun.explosive.percent', value: (t) => t.designedRun.explosive.percent },
];

// Preserve targets without a matching committed distribution. In particular,
// M1 is not merged at this base; do not bless the known-wrong penalty target.
const unsourced: Record<string, [number, number]> = {
  points: [21, 23.5], plays: [61, 65], totalYds: [320, 345], passTd: [4, 4.8],
  adot: [7.5, 8.5], ttt: [2.7, 2.9], sep: [2.8, 3.2], run20to40: [25, 35],
  ybc: [1.5, 2.3], missed: [0.11, 0.16], third: [37, 41], fg: [83, 87],
  xp: [94, 97], fumLost: [0.4, 0.7], punts: [3.5, 4.5],
};

describe('scorecard band provenance', () => {
  it('requires a source or an explicit explanation for every metric', () => {
    for (const m of METRICS) expect(m.source?.trim(), m.id).toBeTruthy();
    const sourced = [...direct.map(([id]) => id), ...derived.map(({ id }) => id)].sort();
    expect(METRICS.filter((m) => m.source?.startsWith(`${file}#`)).map((m) => m.id).sort()).toEqual(sourced);
    const classified = [...sourced, ...Object.keys(unsourced)].sort();
    expect(METRICS.filter((m) => m.band).map((m) => m.id).sort()).toEqual(classified);
    // Internal probes have no NFL band; any future band needs provenance too.
    for (const m of [...METRICS, ...PROBES.flatMap((p) => p.metrics)]) {
      if (m.band) expect(m.source?.trim(), m.id).toBeTruthy();
    }
    for (const m of METRICS.filter((m) => !m.band)) expect(m.source, m.id).toMatch(/^internal: .+/);
  });

  for (const [id, key] of direct) {
    it(`${id} matches committed teamSeasonRanges.${key}, rounded to 2dp`, () => {
      const r = reference.teamSeasonRanges[key];
      expect(r.n).toBe(reference.teamSeasons.length);
      expect(Number.isFinite(r.p10) && Number.isFinite(r.p90)).toBe(true);
      expect(metric(id).source).toBe(`${file}#teamSeasonRanges.${key} (team-season p10–p90; 2dp)`);
      expect(metric(id).band).toEqual([rounded(r.p10), rounded(r.p90)]);
    });
  }

  for (const { id, key, value } of derived) {
    it(`${id} matches equal-weight p10–p90 computed from committed ${key}`, () => {
      expect(metric(id).source).toBe(`${file}#${key} (team-season p10–p90; 2dp)`);
      expect(metric(id).band).toEqual(band(reference.teamSeasons.map(value)));
    });
  }

  it('keeps completion yards distinct from yards per attempt and the run threshold at 10 yards', () => {
    for (const t of reference.teamSeasons) {
      expect(t.throws).toBeGreaterThan(0);
      expect(t.completionYards.n).toBe(t.completion.count);
      expect(t.designedRun.explosiveThresholdYd).toBe(10);
    }
    const yc = reference.teamSeasonRanges.meanCompletionYards;
    expect(metric('ypa').band).not.toEqual([rounded(yc.p10), rounded(yc.p90)]);
  });

  it('preserves unsourced targets and makes missing provenance visible', () => {
    for (const [id, original] of Object.entries(unsourced)) {
      expect(metric(id).band, id).toEqual(original);
      expect(metric(id).source, id).toMatch(/^unsourced: .+/);
    }
    for (const id of ['points', 'plays', 'totalYds', 'third', 'fg', 'xp', 'fumLost', 'punts']) {
      expect(metric(id).source, id).toContain('waits on M1 game-layer.json');
    }
    expect(metric('adot').source).toContain('throwaways');
    expect(metric('missed').source).toContain('PFF, definition unknown');
    // #231 removed the unqualified 2.5–4 total band; penalties are compared by type.
    expect(metric('penalties').band).toBeUndefined();
    expect(metric('penalties').source).toMatch(/^internal: .+NFL_RULES/);
  });
});

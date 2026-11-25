/**
 * Scorecard metrics, splits and noise.
 *
 * Every metric is a ratio of sums over records (per play or per game), so the
 * same definition works for the whole sample, any split, and any bootstrap
 * resample. NFL bands say where football looks unrealistic. They are a
 * diagnosis, never the definition of a correct mechanism.
 *
 * To add a metric, append one entry to METRICS. To add a split, append one
 * entry to SPLITS.
 */
import type { GameLayerRec, GameRec, PlayRec } from './records.js';

export interface Metric {
  id: string;
  label: string;
  /** Multiply the ratio for display (100 for a percentage). */
  scale?: number;
  unit?: string;
  /** NFL reference band; absent for internal measures. */
  band?: [number, number];
  /** Committed file + key, or an explicit unsourced/internal explanation. */
  source?: string;
  /** Per-play metric: sum num over plays passing `on`, divided by sum den. */
  play?: { on: (p: PlayRec) => boolean; num: (p: PlayRec) => number; den?: (p: PlayRec) => number };
  /** Per-game metric. */
  game?: { num: (g: GameRec) => number; den: (g: GameRec) => number };
  /** Probe metric: sums recorded by a probe, keyed `<probe>.<name>`. */
  probe?: { num: string; den: string };
  /** Which play kind a split table shows this metric for. */
  splitKind?: 'run' | 'pass';
}

const run = (p: PlayRec) => p.kind === 'run';
const pass = (p: PlayRec) => p.kind === 'pass';
const att = (p: PlayRec) => p.att;
const yes = (b: boolean) => (b ? 1 : 0);

// Equal-weight 2022–2023 team-season p10/p90, rounded to two decimal places.
// These describe observed variation, not confidence intervals or engine targets.
// Tests resolve the committed keys; no reference data is loaded by game workers.
const nflSource = (key: string) => `data/reviews/nflverse/reference.json#${key} (team-season p10–p90; 2dp)`;

function layerMetric(id: string, label: string,
  num: (r: GameLayerRec, g: GameRec) => number, den: (r: GameLayerRec, g: GameRec) => number,
  percent = false): Metric {
  return { id, label, source: 'internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json', ...(percent ? { scale: 100, unit: '%' } : {}),
    game: { num: g => g.gameLayer ? num(g.gameLayer, g) : NaN,
      den: g => g.gameLayer ? den(g.gameLayer, g) : NaN } };
}

function kicks(r: GameLayerRec, kind: 'punt' | 'kickoff', field: 'netYards' | 'returnYards' | 'touchback'): [number, number] {
  const rows = r.kicks.filter(k => k.kind === kind);
  if (field === 'returnYards' && rows.some(k => k.returned === undefined)) return [NaN, NaN];
  const eligible = field === 'returnYards' ? rows.filter(k => k.returned) : rows;
  return [eligible.reduce((sum, k) => sum + (field === 'touchback'
    ? k.touchback === undefined ? NaN : yes(k.touchback) : k[field] ?? NaN), 0), eligible.length];
}

const fieldGoalBins = [[18, 29], [30, 39], [40, 49], [50, Infinity]] as const;
const fieldGoals = (r: GameLayerRec, lo: number, hi: number): [number, number] => {
  if (r.fieldGoals.some(k => k.distance === undefined)) return [NaN, NaN];
  const rows = r.fieldGoals.filter(k => k.distance! >= lo && k.distance! <= hi);
  return [rows.reduce((sum, k) => sum + (k.good === undefined ? NaN : yes(k.good)), 0), rows.length];
};

export const METRICS: Metric[] = [
  { id: 'points', label: 'Points / team-game', band: [21, 23.5], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.points, den: () => 2 } },
  { id: 'plays', label: 'Scrimmage plays / team-game', band: [61, 65], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.plays.length, den: () => 2 } },
  { id: 'totalYds', label: 'Total yards / team-game', band: [320, 345], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.totalYds, den: () => 2 } },
  { id: 'passRate', label: 'Pass rate (dropbacks / plays)', scale: 100, unit: '%', band: [54.43, 66.33], source: nflSource('teamSeasons[].dropbackShare.percent'), play: { on: () => true, num: (p) => yes(pass(p)) } },
  { id: 'comp', label: 'Completion %', scale: 100, unit: '%', band: [60.59, 68.09], source: nflSource('teamSeasonRanges.completion'), splitKind: 'pass', play: { on: att, num: (p) => yes(p.comp) } },
  // meanCompletionYards is yards per completion, not per attempt. Recover each
  // team-season's completed yards / throws before taking population quantiles.
  { id: 'ypa', label: 'Yards / attempt', band: [6.35, 7.89], source: nflSource('teamSeasons[]: completionYards.mean * completion.count / throws'), splitKind: 'pass', play: { on: att, num: (p) => (p.comp ? p.yards : 0) } },
  { id: 'sack', label: 'Sack rate (per dropback)', scale: 100, unit: '%', band: [4.61, 9.36], source: nflSource('teamSeasonRanges.sackPerDropback'), splitKind: 'pass', play: { on: pass, num: (p) => yes(p.sack) } },
  { id: 'int', label: 'INT rate', scale: 100, unit: '%', band: [1.47, 3.15], source: nflSource('teamSeasonRanges.interception'), splitKind: 'pass', play: { on: att, num: (p) => yes(p.int) } },
  { id: 'passTd', label: 'Pass TD rate', scale: 100, unit: '%', band: [4, 4.8], source: 'unsourced: legacy scorecard estimate; no committed TD/attempt team-season range', play: { on: att, num: (p) => yes(p.comp && p.td) } },
  { id: 'comp20', label: '20+ yd completions / att', scale: 100, unit: '%', band: [6.66, 11.08], source: nflSource('teamSeasonRanges.twentyYardCompletionPerThrow'), play: { on: att, num: (p) => yes(p.comp && p.yards >= 20) } },
  { id: 'adot', label: 'aDOT', band: [7.5, 8.5], source: 'unsourced: legacy scorecard estimate; reference throwAirYards includes throwaways excluded here', play: { on: (p) => p.air !== undefined, num: (p) => p.air ?? 0 } },
  { id: 'yac', label: 'YAC / reception', band: [4.53, 5.91], source: nflSource('teamSeasonRanges.meanCompletedYAC'), splitKind: 'pass', play: { on: (p) => p.yac !== undefined, num: (p) => p.yac ?? 0 } },
  { id: 'ttt', label: 'Time to throw (s)', band: [2.7, 2.9], source: 'unsourced: legacy scorecard estimate; no committed time-to-throw distribution', play: { on: (p) => p.ttt !== undefined, num: (p) => p.ttt ?? 0 } },
  { id: 'scramble', label: 'Scramble rate', scale: 100, unit: '%', band: [2.18, 7.32], source: nflSource('teamSeasonRanges.scramblePerDropback'), play: { on: pass, num: (p) => yes(p.scramble) } },
  { id: 'sep', label: 'Separation at catch point (yd)', band: [2.8, 3.2], source: 'unsourced: NGS 2022–24; no committed cohort or team-season aggregate', play: { on: (p) => p.sep !== undefined, num: (p) => p.sep ?? 0 } },
  { id: 'ypc', label: 'Rush yards / carry (designed runs, uncapped)', band: [3.7, 4.83], source: nflSource('teamSeasons[].designedRun.yards.mean'), splitKind: 'run', play: { on: run, num: (p) => p.yards } },
  // The paired run set (`ref:report`) caps each run at 20 yd, so a move in the long tail shows here and not there. These two rows split
  // the card's mean into the part the run set sees and the part it cannot; docs/VALIDATION.md says how to read them together.
  { id: 'ypc20', label: 'Rush yards / carry, each run capped at 20 yd', source: 'internal: the ref:report convention; no NFL band', splitKind: 'run', play: { on: run, num: (p) => Math.min(20, p.yards) } },
  { id: 'ypcTail', label: 'Rush yards / carry beyond 20 yd (the uncapped part)', source: 'internal: ypc minus ypc20; no NFL band', splitKind: 'run', play: { on: run, num: (p) => Math.max(0, p.yards - 20) } },
  // QB scrambles are logged as passes, so the rush row never counts them.
  { id: 'scrYds', label: 'QB scramble yards / scramble', source: 'internal: scrambles are pass-kind plays, not in the rush row; no NFL band', play: { on: (p) => pass(p) && p.scramble, num: (p) => p.yards } },
  { id: 'stuff', label: 'Run stuff rate (<=0)', scale: 100, unit: '%', band: [15.89, 23.54], source: nflSource('teamSeasonRanges.stuffPerDesignedRun'), splitKind: 'run', play: { on: run, num: (p) => yes(p.yards <= 0) } },
  { id: 'run10', label: '10+ yd runs', scale: 100, unit: '%', band: [7.58, 12.87], source: nflSource('teamSeasons[].designedRun.explosive.percent'), splitKind: 'run', play: { on: run, num: (p) => yes(p.yards >= 10) } },
  {
    id: 'run20to40', label: 'Runs of 20+ that reach 40', scale: 100, unit: '%', band: [25, 35], source: 'unsourced: PR #190, BDB 2022; no committed team-season distribution',
    play: { on: (p) => run(p) && p.yards >= 20, num: (p) => yes(p.yards >= 40) },
  },
  { id: 'ybc', label: 'Yards before contact (runs)', band: [1.5, 2.3], source: 'unsourced: legacy scorecard estimate; NFL cohort and contact definition unverified', play: { on: (p) => run(p) && p.ybc !== undefined, num: (p) => p.ybc ?? 0 } },
  { id: 'missed', label: 'Missed + broken tackles / play', band: [0.11, 0.16], source: 'unsourced: PFF, definition unknown', splitKind: 'run', play: { on: () => true, num: (p) => p.missed + p.broken } },
  { id: 'failedTackleOpportunities', label: 'Failed tackle opportunities / play (unique defenders)', source: 'internal: unique failed defenders per official play; no NFL comparison band', play: { on: () => true, num: (p) => p.failedTackleOpportunities ?? NaN } },
  { id: 'third', label: '3rd-down conversion', scale: 100, unit: '%', band: [37, 41], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.thirdConv, den: (g) => g.third } },
  { id: 'fg', label: 'FG %', scale: 100, unit: '%', band: [83, 87], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.fgm, den: (g) => g.fga } },
  { id: 'xp', label: 'XP %', scale: 100, unit: '%', band: [94, 97], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.xpm, den: (g) => g.xpa } },
  { id: 'fumLost', label: 'Fumbles lost / team-game', band: [0.4, 0.7], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.fumLost, den: () => 2 } },
  { id: 'punts', label: 'Punts / team-game', band: [3.5, 4.5], source: 'unsourced: legacy scorecard estimate; waits on M1 game-layer.json', game: { num: (g) => g.punts, den: () => 2 } },
  // The old 2.5–4 band was below the NFL's accepted total. An incomplete mix
  // of foul producers cannot be graded by matching a total; retain the count
  // and interval, and compare types/exposures under docs/NFL_RULES.md.
  { id: 'penalties', label: 'Accepted penalties / team-game', source: 'internal: accepted count, no qualified total band; compare types under docs/NFL_RULES.md', game: { num: (g) => g.penalties, den: () => 2 } },
  ...fieldGoalBins.map(([lo, hi]) => layerMetric(`fg${lo}`, `FG ${hi === Infinity ? '50+' : `${lo}–${hi}`} yd %`,
    r => fieldGoals(r, lo, hi)[0], r => fieldGoals(r, lo, hi)[1], true)),
  layerMetric('puntGross', 'Punt gross average (box yards)', r => r.puntGrossYards, (_r, g) => g.punts),
  layerMetric('puntNet', 'Punt net field-position average', r => kicks(r, 'punt', 'netYards')[0], r => kicks(r, 'punt', 'netYards')[1]),
  layerMetric('kickReturn', 'Kickoff return average (recorded yards)', r => kicks(r, 'kickoff', 'returnYards')[0], r => kicks(r, 'kickoff', 'returnYards')[1]),
  layerMetric('puntReturn', 'Punt return average (recorded yards)', r => kicks(r, 'punt', 'returnYards')[0], r => kicks(r, 'punt', 'returnYards')[1]),
  layerMetric('kickTouchback', 'Kickoff touchback % (regular kicks)', r => kicks(r, 'kickoff', 'touchback')[0], r => kicks(r, 'kickoff', 'touchback')[1], true),
  layerMetric('puntTouchback', 'Punt touchback %', r => kicks(r, 'punt', 'touchback')[0], r => kicks(r, 'punt', 'touchback')[1], true),
  layerMetric('fourthGo', 'Fourth-down go % (outside Q4 last 2:30)', r => r.fourthGoes, r => r.fourthOpportunities, true),
  layerMetric('fourthConversion', 'Fourth-down conversion % (all official attempts)', r => r.fourthConversions, r => r.fourthAttempts, true),
  layerMetric('twoPoint', 'Two-point attempts / TD (retries once)', r => r.twoPointChoices, r => r.touchdowns, true),
  layerMetric('drives', 'Drives / team-game (logged offensive possessions)', r => r.drives, () => 2),
  layerMetric('pointsPerDrive', 'Offensive points / drive (including Try)', r => r.drivePoints, r => r.drives),
  layerMetric('redZoneTD', 'Red-zone TD % (box trips)', r => r.redZoneTDs, r => r.redZoneTrips, true),
  layerMetric('turnovers', 'Turnovers / team-game (box)', r => r.turnovers, () => 2),
];

/** Exact accepted/enforced names, including zero in an arm with no such foul.
 * Legacy cards without the ledger stay unavailable rather than becoming zero. */
export function penaltyMetrics(games: GameRec[]): Metric[] {
  const names = [...new Set(games.flatMap(g => Object.keys(g.gameLayer?.penaltiesByType ?? {})))].sort();
  return names.map(name => layerMetric(`penalty:${name}`, `Accepted penalties / team-game: ${name}`,
    r => r.penaltiesByType[name] ?? 0, () => 2));
}

function playRatio(m: NonNullable<Metric['play']>, games: GameRec[], filter?: (p: PlayRec) => boolean): [number, number] {
  let num = 0;
  let den = 0;
  for (const g of games) {
    for (const p of g.plays) {
      if (filter && !filter(p)) continue;
      if (!m.on(p)) continue;
      num += m.num(p);
      den += m.den ? m.den(p) : 1;
    }
  }
  return [num, den];
}

/** The metric's value over these games (and plays passing `filter`), with its sample size. */
export function evaluate(m: Metric, games: GameRec[], filter?: (p: PlayRec) => boolean): { value: number; n: number } {
  let num = 0;
  let den = 0;
  if (m.play) [num, den] = playRatio(m.play, games, filter);
  else if (m.game) for (const g of games) {
    num += m.game.num(g);
    den += m.game.den(g);
  }
  else if (m.probe) for (const g of games) {
    num += g.probe[m.probe.num] ?? 0;
    den += g.probe[m.probe.den] ?? 0;
  }
  return { value: den > 0 ? (num / den) * (m.scale ?? 1) : NaN, n: den };
}

export interface Split {
  id: string;
  label: string;
  key: (p: PlayRec) => string;
}

const distBucket = (d: number) => (d <= 3 ? 'short (1-3)' : d <= 7 ? 'medium (4-7)' : 'long (8+)');
const zone = (yl: number) => (yl < 20 ? 'own 1-19' : yl < 50 ? 'own 20-49' : yl < 80 ? 'opp 50-21' : 'red zone');

export const SPLITS: Split[] = [
  { id: 'concept', label: 'Concept', key: (p) => p.concept },
  { id: 'family', label: 'Coverage family', key: (p) => p.family },
  { id: 'down', label: 'Down', key: (p) => `${p.down}` },
  { id: 'distance', label: 'Distance', key: (p) => distBucket(p.dist) },
  { id: 'zone', label: 'Field zone', key: (p) => zone(p.yl) },
  { id: 'playAction', label: 'Play action', key: (p) => (p.kind === 'run' ? 'run' : p.playAction ? 'PA' : 'no PA') },
  { id: 'personnel', label: 'Personnel', key: (p) => p.personnel },
  { id: 'quarter', label: 'Quarter', key: (p) => `Q${p.quarter}` },
  // The calls QB_V2 takes, labelled in every arm (PlayRec.qbV2Call), so the same calls compare across arms; the tag of the
  // plays V2 actually read is PlayRec.qbV2 (scripts/diag/qbv2/card-split.ts reads both).
  { id: 'qbV2', label: 'QB_V2 call', key: (p) => (p.kind === 'run' ? 'run' : p.qbV2Call ? 'V2 call' : 'other pass') },
];

/**
 * The mix of situations the designed runs are called in, as metrics so the same comparison and interval apply: how
 * often the offence runs, and the share of runs by down, distance and field zone. A defence that gives up different
 * passing yards changes when and where the offence runs, which moves the rush row without any run being defended
 * differently. Internal measures: no NFL band.
 */
const DISTANCES = ['short (1-3)', 'medium (4-7)', 'long (8+)'];
const ZONES = ['own 1-19', 'own 20-49', 'opp 50-21', 'red zone'];
export const RUN_MIX: Metric[] = [
  { id: 'mix.runShare', label: 'Run share of scrimmage plays', scale: 100, unit: '%', source: 'internal: call mix', play: { on: () => true, num: (p) => yes(run(p)) } },
  ...[1, 2, 3].map((d): Metric => ({ id: `mix.runShareDown${d}`, label: `Run share of plays on down ${d}`, scale: 100, unit: '%', source: 'internal: call mix',
    play: { on: (p) => p.down === d, num: (p) => yes(run(p)) } })),
  ...[1, 2, 3].map((d): Metric => ({ id: `mix.down${d}`, label: `Runs on down ${d} (share of runs)`, scale: 100, unit: '%', source: 'internal: run situation mix',
    play: { on: run, num: (p) => yes(p.down === d) } })),
  ...DISTANCES.map((b): Metric => ({ id: `mix.dist.${b}`, label: `Runs at distance ${b} (share of runs)`, scale: 100, unit: '%', source: 'internal: run situation mix',
    play: { on: run, num: (p) => yes(distBucket(p.dist) === b) } })),
  ...ZONES.map((z): Metric => ({ id: `mix.zone.${z}`, label: `Runs in ${z} (share of runs)`, scale: 100, unit: '%', source: 'internal: run situation mix',
    play: { on: run, num: (p) => yes(zone(p.yl) === z) } })),
];

/** Small deterministic generator for resampling, independent of the engine's streams. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const quantile = (xs: number[], q: number) => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return NaN;
  return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * (s.length - 1))))];
};

/**
 * 90% interval by resampling whole games. With `base`, resamples the
 * difference; games are paired by index when both runs share the game list.
 */
export function interval(
  m: Metric, games: GameRec[], base?: GameRec[], filter?: (p: PlayRec) => boolean, resamples = 400,
): [number, number] {
  // Missing measurements remain unavailable even if a resample omits the missing game.
  if (!Number.isFinite(evaluate(m, games, filter).value) || (base && !Number.isFinite(evaluate(m, base, filter).value))) return [NaN, NaN];
  const rand = mulberry32(0x5c0e + m.id.length * 7919);
  const paired = !!base && base.length === games.length && base.every((g, i) => g.seed === games[i].seed);
  const draw = (pool: GameRec[], idx: number[]) => idx.map((i) => pool[i]);
  const pick = (n: number) => Array.from({ length: n }, () => Math.floor(rand() * n));
  const vals: number[] = [];
  for (let b = 0; b < resamples; b++) {
    const idx = pick(games.length);
    const v = evaluate(m, draw(games, idx), filter).value;
    if (!base) {
      vals.push(v);
      continue;
    }
    const bIdx = paired ? idx : pick(base.length);
    vals.push(v - evaluate(m, draw(base, bIdx), filter).value);
  }
  return [quantile(vals, 0.05), quantile(vals, 0.95)];
}

export function status(m: Metric, v: number): 'OK' | 'HIGH' | 'LOW' | '' {
  if (!m.band || !Number.isFinite(v)) return '';
  return v < m.band[0] ? 'LOW' : v > m.band[1] ? 'HIGH' : 'OK';
}

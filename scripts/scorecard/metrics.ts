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
import type { GameRec, PlayRec } from './records.js';

export interface Metric {
  id: string;
  label: string;
  /** Multiply the ratio for display (100 for a percentage). */
  scale?: number;
  unit?: string;
  /** NFL reference band; absent for internal measures. */
  band?: [number, number];
  /** Where the band comes from. */
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

export const METRICS: Metric[] = [
  { id: 'points', label: 'Points / team-game', band: [21, 23.5], game: { num: (g) => g.points, den: () => 2 } },
  { id: 'plays', label: 'Scrimmage plays / team-game', band: [61, 65], game: { num: (g) => g.plays.length, den: () => 2 } },
  { id: 'totalYds', label: 'Total yards / team-game', band: [320, 345], game: { num: (g) => g.totalYds, den: () => 2 } },
  { id: 'passRate', label: 'Pass rate (dropbacks / plays)', scale: 100, unit: '%', band: [56, 62], play: { on: () => true, num: (p) => yes(pass(p)) } },
  { id: 'comp', label: 'Completion %', scale: 100, unit: '%', band: [63, 66], splitKind: 'pass', play: { on: att, num: (p) => yes(p.comp) } },
  { id: 'ypa', label: 'Yards / attempt', band: [6.8, 7.2], splitKind: 'pass', play: { on: att, num: (p) => (p.comp ? p.yards : 0) } },
  { id: 'sack', label: 'Sack rate (per dropback)', scale: 100, unit: '%', band: [6, 7.5], splitKind: 'pass', play: { on: pass, num: (p) => yes(p.sack) } },
  { id: 'int', label: 'INT rate', scale: 100, unit: '%', band: [2, 2.5], splitKind: 'pass', play: { on: att, num: (p) => yes(p.int) } },
  { id: 'passTd', label: 'Pass TD rate', scale: 100, unit: '%', band: [4, 4.8], play: { on: att, num: (p) => yes(p.comp && p.td) } },
  { id: 'comp20', label: '20+ yd completions / att', scale: 100, unit: '%', band: [7, 9], play: { on: att, num: (p) => yes(p.comp && p.yards >= 20) } },
  { id: 'adot', label: 'aDOT', band: [7.5, 8.5], play: { on: (p) => p.air !== undefined, num: (p) => p.air ?? 0 } },
  { id: 'yac', label: 'YAC / reception', band: [4.8, 5.6], splitKind: 'pass', play: { on: (p) => p.yac !== undefined, num: (p) => p.yac ?? 0 } },
  { id: 'ttt', label: 'Time to throw (s)', band: [2.7, 2.9], play: { on: (p) => p.ttt !== undefined, num: (p) => p.ttt ?? 0 } },
  { id: 'scramble', label: 'Scramble rate', scale: 100, unit: '%', band: [3, 5], play: { on: pass, num: (p) => yes(p.scramble) } },
  { id: 'sep', label: 'Separation at catch point (yd)', band: [2.8, 3.2], source: 'NGS 2022–24', play: { on: (p) => p.sep !== undefined, num: (p) => p.sep ?? 0 } },
  { id: 'ypc', label: 'Rush yards / carry', band: [4.1, 4.5], splitKind: 'run', play: { on: run, num: (p) => p.yards } },
  { id: 'stuff', label: 'Run stuff rate (<=0)', scale: 100, unit: '%', band: [16, 20], splitKind: 'run', play: { on: run, num: (p) => yes(p.yards <= 0) } },
  { id: 'run10', label: '10+ yd runs', scale: 100, unit: '%', band: [10, 12], splitKind: 'run', play: { on: run, num: (p) => yes(p.yards >= 10) } },
  {
    id: 'run20to40', label: 'Runs of 20+ that reach 40', scale: 100, unit: '%', band: [25, 35], source: 'PR #190, BDB 2022',
    play: { on: (p) => run(p) && p.yards >= 20, num: (p) => yes(p.yards >= 40) },
  },
  { id: 'ybc', label: 'Yards before contact (runs)', band: [1.5, 2.3], play: { on: (p) => run(p) && p.ybc !== undefined, num: (p) => p.ybc ?? 0 } },
  { id: 'missed', label: 'Missed + broken tackles / play', band: [0.11, 0.16], source: 'source unverified: PFF, definition unknown', splitKind: 'run', play: { on: () => true, num: (p) => p.missed + p.broken } },
  { id: 'failedTackleOpportunities', label: 'Failed tackle opportunities / play (unique defenders)', play: { on: () => true, num: (p) => p.failedTackleOpportunities ?? NaN } },
  { id: 'third', label: '3rd-down conversion', scale: 100, unit: '%', band: [37, 41], game: { num: (g) => g.thirdConv, den: (g) => g.third } },
  { id: 'fg', label: 'FG %', scale: 100, unit: '%', band: [83, 87], game: { num: (g) => g.fgm, den: (g) => g.fga } },
  { id: 'xp', label: 'XP %', scale: 100, unit: '%', band: [94, 97], game: { num: (g) => g.xpm, den: (g) => g.xpa } },
  { id: 'fumLost', label: 'Fumbles lost / team-game', band: [0.4, 0.7], game: { num: (g) => g.fumLost, den: () => 2 } },
  { id: 'punts', label: 'Punts / team-game', band: [3.5, 4.5], game: { num: (g) => g.punts, den: () => 2 } },
  { id: 'penalties', label: 'Penalties / team-game', band: [2.5, 4], game: { num: (g) => g.penalties, den: () => 2 } },
];

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

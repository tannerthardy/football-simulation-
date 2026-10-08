/**
 * Procedural player generation with realistic, correlated combine
 * measurables per position and archetype-shaped skill ratings.
 *
 * Latent factors: size, athleticism, agility, burst, strength. Measurables are
 * linear mixes of those plus noise, so heavier players run slower, explosive
 * players jump higher, and so on. `quality` (0–1) is overall talent.
 */
import type { Rng } from '../core/rng.js';
import { clamp } from '../core/vec.js';
import { FIRST_NAMES, LAST_NAMES } from './names.js';
import type { Measurables, Player, Position, RatingKey, Ratings } from './types.js';
import { RATING_KEYS } from './types.js';

interface MeasurableTemplate {
  h: [number, number];
  w: [number, number];
  arm: [number, number];
  hand: [number, number];
  forty: [number, number];
  shuttle: [number, number];
  cone: [number, number];
  vert: [number, number];
  broad: [number, number];
  bench: [number, number];
}

const MEAS: Record<Position, MeasurableTemplate> = {
  QB: { h: [75, 1.6], w: [220, 11], arm: [32, 0.9], hand: [9.6, 0.4], forty: [4.82, 0.14], shuttle: [4.32, 0.14], cone: [7.1, 0.2], vert: [31, 3], broad: [112, 6], bench: [0, 0] },
  RB: { h: [70.5, 1.6], w: [212, 12], arm: [31, 0.9], hand: [9.4, 0.4], forty: [4.52, 0.08], shuttle: [4.25, 0.11], cone: [7.02, 0.17], vert: [35, 3], broad: [120, 5], bench: [19, 4] },
  FB: { h: [72, 1.3], w: [245, 9], arm: [31.5, 0.8], hand: [9.5, 0.4], forty: [4.78, 0.09], shuttle: [4.38, 0.12], cone: [7.25, 0.18], vert: [32, 3], broad: [113, 5], bench: [24, 4] },
  WR: { h: [72.8, 2.2], w: [200, 13], arm: [32, 1.1], hand: [9.4, 0.4], forty: [4.48, 0.08], shuttle: [4.2, 0.1], cone: [6.95, 0.17], vert: [36, 3], broad: [122, 5], bench: [14, 4] },
  TE: { h: [76.8, 1.3], w: [250, 9], arm: [33, 0.9], hand: [9.8, 0.4], forty: [4.72, 0.11], shuttle: [4.35, 0.12], cone: [7.12, 0.18], vert: [33.5, 3], broad: [117, 5], bench: [20, 4] },
  OT: { h: [77.6, 1.2], w: [312, 9], arm: [34, 0.9], hand: [10, 0.4], forty: [5.2, 0.12], shuttle: [4.75, 0.13], cone: [7.75, 0.2], vert: [28.5, 3], broad: [103, 5], bench: [24, 4] },
  OG: { h: [76.2, 1.1], w: [315, 9], arm: [33.2, 0.9], hand: [10, 0.4], forty: [5.25, 0.12], shuttle: [4.7, 0.13], cone: [7.8, 0.2], vert: [28, 3], broad: [102, 5], bench: [27, 4] },
  C: { h: [75.2, 1.0], w: [305, 8], arm: [32.4, 0.8], hand: [9.9, 0.4], forty: [5.22, 0.12], shuttle: [4.6, 0.12], cone: [7.72, 0.2], vert: [28.5, 3], broad: [103, 5], bench: [27, 4] },
  EDGE: { h: [76, 1.3], w: [258, 12], arm: [33.6, 0.9], hand: [9.9, 0.4], forty: [4.72, 0.1], shuttle: [4.4, 0.13], cone: [7.18, 0.2], vert: [33.5, 3], broad: [118, 5], bench: [24, 4] },
  DT: { h: [75.2, 1.2], w: [305, 15], arm: [33, 0.9], hand: [10, 0.4], forty: [5.05, 0.13], shuttle: [4.6, 0.14], cone: [7.6, 0.22], vert: [29.5, 3], broad: [106, 5], bench: [28, 5] },
  LB: { h: [73.5, 1.3], w: [237, 9], arm: [32.2, 0.9], hand: [9.6, 0.4], forty: [4.64, 0.09], shuttle: [4.25, 0.11], cone: [7.05, 0.18], vert: [34.5, 3], broad: [119, 5], bench: [21, 4] },
  CB: { h: [71.6, 1.6], w: [192, 8], arm: [31.4, 0.9], hand: [9.2, 0.4], forty: [4.47, 0.07], shuttle: [4.16, 0.1], cone: [6.94, 0.15], vert: [37, 3], broad: [124, 5], bench: [14, 4] },
  S: { h: [72.2, 1.4], w: [205, 8], arm: [31.6, 0.9], hand: [9.3, 0.4], forty: [4.53, 0.07], shuttle: [4.2, 0.1], cone: [6.97, 0.16], vert: [36, 3], broad: [122, 5], bench: [16, 4] },
  K: { h: [72, 2], w: [195, 12], arm: [31, 1], hand: [9.2, 0.4], forty: [4.95, 0.15], shuttle: [4.45, 0.15], cone: [7.3, 0.2], vert: [30, 3], broad: [110, 6], bench: [8, 3] },
  P: { h: [74, 2], w: [212, 12], arm: [32, 1], hand: [9.4, 0.4], forty: [4.95, 0.15], shuttle: [4.45, 0.15], cone: [7.3, 0.2], vert: [30, 3], broad: [110, 6], bench: [8, 3] },
};

type Tier = 'core' | 'sec' | 'low';

/** Rating tiers per position; unlisted keys are 'low'. */
const TIERS: Record<Position, Partial<Record<RatingKey, Tier>>> = {
  QB: {
    throwPower: 'core', accShort: 'core', accMid: 'core', accDeep: 'core', release: 'core', throwOnRun: 'core',
    touch: 'core', pocketPresence: 'core', decisionMaking: 'core', awareness: 'core', composure: 'core',
    playRecognition: 'core', anticipation: 'core', vision: 'sec', ballSecurity: 'sec', elusiveness: 'sec', consistency: 'core',
  },
  RB: {
    vision: 'core', elusiveness: 'core', breakTackle: 'core', ballSecurity: 'core', patience: 'core', balance: 'core',
    hands: 'sec', routeRunning: 'sec', passBlock: 'sec', awareness: 'sec', ballTracking: 'sec',
  },
  FB: {
    leadBlock: 'core', runBlock: 'core', strength: 'core', passBlock: 'sec', hands: 'sec', breakTackle: 'sec',
    ballSecurity: 'sec', awareness: 'sec', balance: 'sec',
  },
  WR: {
    routeRunning: 'core', hands: 'core', releaseVsPress: 'core', ballTracking: 'core', contestedCatch: 'core',
    elusiveness: 'sec', vision: 'sec', ballSecurity: 'sec', awareness: 'sec', balance: 'sec', breakTackle: 'sec', runBlock: 'low',
  },
  TE: {
    runBlock: 'core', hands: 'core', contestedCatch: 'core', passBlock: 'sec', routeRunning: 'sec', strength: 'sec',
    releaseVsPress: 'sec', ballTracking: 'sec', breakTackle: 'sec', handTechnique: 'sec', leadBlock: 'sec', awareness: 'sec',
  },
  OT: { passBlock: 'core', runBlock: 'core', handTechnique: 'core', strength: 'core', balance: 'sec', awareness: 'sec' },
  OG: { passBlock: 'core', runBlock: 'core', handTechnique: 'core', strength: 'core', balance: 'sec', awareness: 'sec' },
  C: { passBlock: 'core', runBlock: 'core', handTechnique: 'core', strength: 'core', awareness: 'core', balance: 'sec' },
  EDGE: {
    passRushPower: 'core', passRushFinesse: 'core', blockShedding: 'core', tackling: 'core', pursuit: 'core',
    playRecognition: 'sec', strength: 'sec', hitPower: 'sec', balance: 'sec', zoneCoverage: 'low',
  },
  DT: {
    blockShedding: 'core', passRushPower: 'core', strength: 'core', tackling: 'core', passRushFinesse: 'sec',
    playRecognition: 'sec', pursuit: 'sec', balance: 'sec', hitPower: 'sec',
  },
  LB: {
    tackling: 'core', pursuit: 'core', playRecognition: 'core', blockShedding: 'core', hitPower: 'sec',
    zoneCoverage: 'sec', manCoverage: 'sec', awareness: 'core', passRushPower: 'sec', anticipation: 'sec',
  },
  CB: {
    manCoverage: 'core', zoneCoverage: 'core', press: 'core', ballSkills: 'core', playRecognition: 'core',
    anticipation: 'core', tackling: 'sec', pursuit: 'sec', awareness: 'sec', hands: 'sec',
  },
  S: {
    zoneCoverage: 'core', tackling: 'core', ballSkills: 'core', playRecognition: 'core', pursuit: 'core',
    manCoverage: 'sec', hitPower: 'sec', anticipation: 'core', awareness: 'core', hands: 'sec', blockShedding: 'sec',
  },
  K: { kickPower: 'core', kickAccuracy: 'core', composure: 'core', consistency: 'core' },
  P: { puntPower: 'core', puntAccuracy: 'core', composure: 'sec', consistency: 'core', kickPower: 'sec' },
};

/** Ratings every player has at a position-neutral level. */
const UNIVERSAL: RatingKey[] = ['stamina', 'toughness', 'discipline', 'consistency', 'workRate', 'composure', 'awareness', 'playRecognition', 'decisionMaking'];

interface Archetype {
  name: string;
  weight: number;
  /** Measurable latent shifts in SD units. */
  size?: number;
  ath?: number;
  agi?: number;
  burst?: number;
  str?: number;
  /** Rating offsets. */
  bonus?: Partial<Record<RatingKey, number>>;
}

const ARCHETYPES: Record<Position, Archetype[]> = {
  QB: [
    { name: 'Pocket Passer', weight: 3, ath: -0.6, bonus: { accShort: 4, accMid: 5, accDeep: 3, pocketPresence: 6, elusiveness: -10, throwOnRun: -4 } },
    { name: 'Dual Threat', weight: 2, ath: 1.4, agi: 1.0, size: -0.4, bonus: { elusiveness: 18, vision: 14, throwOnRun: 6, accMid: -4, accDeep: -3, pocketPresence: -4, breakTackle: 8 } },
    { name: 'Gunslinger', weight: 1, bonus: { throwPower: 9, accDeep: 4, decisionMaking: -8, composure: 3, touch: -3 } },
    { name: 'Game Manager', weight: 1, ath: -0.3, bonus: { decisionMaking: 9, accShort: 5, throwPower: -8, accDeep: -6, awareness: 4 } },
  ],
  RB: [
    { name: 'Power Back', weight: 2, size: 1.2, ath: -0.3, str: 1.0, bonus: { breakTackle: 12, elusiveness: -6, ballSecurity: 4 } },
    { name: 'Elusive Back', weight: 2, size: -0.6, agi: 1.2, burst: 0.6, bonus: { elusiveness: 12, breakTackle: -6, vision: 3 } },
    { name: 'Receiving Back', weight: 1, size: -0.4, agi: 0.6, bonus: { hands: 16, routeRunning: 16, breakTackle: -4, passBlock: 4 } },
    { name: 'Workhorse', weight: 2, bonus: { vision: 4, patience: 4, stamina: 8 } },
  ],
  FB: [{ name: 'Lead Blocker', weight: 1, str: 0.5, bonus: {} }],
  WR: [
    { name: 'Possession X', weight: 2, size: 1.2, ath: -0.3, str: 0.6, bonus: { contestedCatch: 10, releaseVsPress: 7, hands: 3, elusiveness: -4 } },
    { name: 'Deep Threat', weight: 2, size: -0.3, ath: 1.4, burst: 0.8, bonus: { ballTracking: 8, routeRunning: -3, contestedCatch: -4 } },
    { name: 'Slot', weight: 2, size: -1.0, agi: 1.3, burst: 0.5, bonus: { routeRunning: 8, elusiveness: 8, hands: 3, contestedCatch: -6, releaseVsPress: -4 } },
    { name: 'Balanced', weight: 2, bonus: {} },
  ],
  TE: [
    { name: 'Inline Blocker', weight: 2, size: 1.0, ath: -0.6, str: 0.8, bonus: { runBlock: 10, passBlock: 8, routeRunning: -8, hands: -4 } },
    { name: 'Move TE', weight: 2, size: -0.7, ath: 1.1, agi: 0.7, bonus: { routeRunning: 10, hands: 5, runBlock: -10, releaseVsPress: 4 } },
    { name: 'Complete TE', weight: 1, bonus: { runBlock: 3, hands: 3 } },
  ],
  OT: [
    { name: 'Pass Protector', weight: 2, agi: 0.8, bonus: { passBlock: 7, runBlock: -3, handTechnique: 3 } },
    { name: 'Mauler', weight: 2, size: 0.8, ath: -0.4, str: 1.0, bonus: { runBlock: 8, passBlock: -3 } },
    { name: 'Zone Athlete', weight: 1, size: -0.6, ath: 1.0, agi: 0.8, bonus: { runBlock: 3, strength: -4 } },
  ],
  OG: [
    { name: 'Mauler', weight: 3, size: 0.6, str: 1.0, bonus: { runBlock: 7, passBlock: -2 } },
    { name: 'Zone Athlete', weight: 2, size: -0.6, ath: 1.0, agi: 0.8, bonus: { runBlock: 3, strength: -5 } },
    { name: 'Technician', weight: 1, bonus: { handTechnique: 7, passBlock: 4, awareness: 4 } },
  ],
  C: [
    { name: 'Anchor', weight: 2, str: 1.0, bonus: { passBlock: 4, awareness: 3 } },
    { name: 'Zone Athlete', weight: 1, ath: 1.0, agi: 0.8, size: -0.5, bonus: { runBlock: 4, strength: -4 } },
  ],
  EDGE: [
    { name: 'Speed Rusher', weight: 3, size: -0.8, ath: 1.3, burst: 1.0, agi: 0.5, bonus: { passRushFinesse: 10, passRushPower: -6, blockShedding: -4 } },
    { name: 'Power Rusher', weight: 2, size: 0.9, str: 1.0, bonus: { passRushPower: 10, passRushFinesse: -4, blockShedding: 5 } },
    { name: 'Run Stopper', weight: 1, size: 0.8, str: 0.6, bonus: { blockShedding: 8, tackling: 5, passRushFinesse: -8, playRecognition: 4 } },
  ],
  DT: [
    { name: 'Nose Tackle', weight: 2, size: 1.4, ath: -0.6, str: 1.2, bonus: { blockShedding: 7, strength: 6, passRushFinesse: -10, passRushPower: 2 } },
    { name: '3-Tech Penetrator', weight: 2, size: -0.6, ath: 1.0, burst: 1.0, bonus: { passRushFinesse: 10, passRushPower: 2, blockShedding: -3 } },
    { name: 'Two-Gapper', weight: 1, size: 0.5, str: 0.8, bonus: { blockShedding: 6, playRecognition: 4 } },
  ],
  LB: [
    { name: 'Thumper', weight: 2, size: 0.9, str: 0.8, ath: -0.3, bonus: { blockShedding: 7, hitPower: 8, tackling: 4, manCoverage: -8, zoneCoverage: -4 } },
    { name: 'Coverage LB', weight: 2, size: -0.7, ath: 1.0, agi: 0.8, bonus: { zoneCoverage: 9, manCoverage: 9, blockShedding: -5 } },
    { name: 'Blitzer', weight: 1, burst: 1.0, bonus: { passRushPower: 12, passRushFinesse: 10, zoneCoverage: -5 } },
    { name: 'Field General', weight: 1, bonus: { playRecognition: 8, awareness: 8, anticipation: 5 } },
  ],
  CB: [
    { name: 'Press Corner', weight: 2, size: 1.0, str: 0.6, bonus: { press: 12, manCoverage: 6, zoneCoverage: -3 } },
    { name: 'Zone Corner', weight: 2, bonus: { zoneCoverage: 9, anticipation: 6, press: -6, ballSkills: 4 } },
    { name: 'Slot Corner', weight: 1, size: -1.1, agi: 1.3, bonus: { manCoverage: 4, tackling: 4, press: -4 } },
    { name: 'Speed Corner', weight: 1, ath: 1.3, burst: 0.8, bonus: { manCoverage: 4, ballSkills: -3 } },
  ],
  S: [
    { name: 'Box Safety', weight: 2, size: 1.0, str: 0.6, bonus: { tackling: 7, hitPower: 9, blockShedding: 6, zoneCoverage: -5, manCoverage: 2 } },
    { name: 'Centerfielder', weight: 2, size: -0.4, ath: 1.1, bonus: { zoneCoverage: 9, ballSkills: 8, anticipation: 6, tackling: -4, hitPower: -5 } },
    { name: 'Hybrid', weight: 1, bonus: { manCoverage: 6 } },
  ],
  K: [{ name: 'Kicker', weight: 1, bonus: {} }],
  P: [{ name: 'Punter', weight: 1, bonus: {} }],
};

const POSITION_STRENGTH_BASE: Partial<Record<Position, number>> = {
  OT: 72, OG: 76, C: 74, DT: 76, EDGE: 66, FB: 66, TE: 60, LB: 60, RB: 52, QB: 40, WR: 42, CB: 40, S: 48, K: 25, P: 28,
};

export interface GenerateOptions {
  quality?: number;
  archetype?: string;
  age?: number;
  /** Stable identity (e.g. roster-scoped `IRN-QB1`); otherwise drawn from `rng`. */
  id?: string;
}

export function generatePlayer(rng: Rng, position: Position, opts: GenerateOptions = {}): Player {
  const quality = clamp(opts.quality ?? rng.normalClamped(0.5, 0.2, 0.02, 0.98), 0, 1);
  const archetypes = ARCHETYPES[position];
  const arch =
    (opts.archetype && archetypes.find((a) => a.name === opts.archetype)) ||
    rng.weighted(
      archetypes,
      archetypes.map((a) => a.weight),
    );
  const age = opts.age ?? Math.round(rng.normalClamped(26, 3, 21, 36));
  const experience = Math.max(0, age - 22 + rng.int(-1, 0));

  const measurables = generateMeasurables(rng, position, arch, quality);
  const ratings = generateRatings(rng, position, arch, quality, measurables, experience);

  return {
    id: opts.id ?? `P${rng.nextU32().toString(36).toUpperCase()}`,
    firstName: rng.pick(FIRST_NAMES),
    lastName: rng.pick(LAST_NAMES),
    jersey: 0,
    position,
    age,
    experience,
    measurables,
    ratings,
    familiarity: defaultFamiliarity(position),
    archetype: arch.name,
  };
}

function generateMeasurables(rng: Rng, pos: Position, arch: Archetype, quality: number): Measurables {
  const t = MEAS[pos];
  const g = () => rng.gaussian();
  const athleticPosition = pos !== 'K' && pos !== 'P';
  const zSize = (arch.size ?? 0) + g();
  const zAth = (arch.ath ?? 0) + g() + (athleticPosition ? (quality - 0.5) * 0.8 : 0);
  const zAgi = (arch.agi ?? 0) + 0.5 * zAth + 0.85 * g();
  const zBurst = (arch.burst ?? 0) + 0.6 * zAth + 0.8 * g();
  const zStr = (arch.str ?? 0) + 0.4 * zSize + 0.9 * g();

  const hZ = 0.55 * zSize + 0.83 * g();
  const wZ = 0.8 * zSize + 0.6 * g();
  const heightIn = round1(t.h[0] + t.h[1] * hZ);
  const weightLb = Math.round(t.w[0] + t.w[1] * wZ);
  const armIn = round1(t.arm[0] + t.arm[1] * (0.6 * hZ + 0.8 * g()));
  const handIn = round1(t.hand[0] + t.hand[1] * (0.4 * hZ + 0.9 * g()));
  const forty = round2(clamp(t.forty[0] + t.forty[1] * (-0.85 * zAth + 0.3 * wZ + 0.3 * g()), 4.22, 5.75));
  // 10-yd split ≈ 0.343 × 40; burst shaves time off the split.
  const tenSplit = round2(clamp(0.343 * forty - 0.022 * zBurst + 0.012 * g(), 1.42, 2.0));
  const shuttle = round2(clamp(t.shuttle[0] + t.shuttle[1] * (-0.75 * zAgi + 0.3 * wZ + 0.45 * g()), 3.8, 5.3));
  const threeCone = round2(clamp(t.cone[0] + t.cone[1] * (-0.75 * zAgi + 0.3 * wZ + 0.45 * g()), 6.4, 8.6));
  const vertical = round1(clamp(t.vert[0] + t.vert[1] * (0.6 * zBurst + 0.3 * zAth - 0.2 * wZ + 0.6 * g()), 20, 46));
  const broad = Math.round(clamp(t.broad[0] + t.broad[1] * (0.6 * zBurst + 0.3 * zAth - 0.2 * wZ + 0.6 * g()), 90, 140));
  const bench = Math.max(0, Math.round(t.bench[0] + t.bench[1] * (0.75 * zStr + 0.25 * wZ + 0.5 * g())));
  return { heightIn, weightLb, armIn, handIn, forty, tenSplit, shuttle, threeCone, vertical, broad, bench };
}

function generateRatings(
  rng: Rng,
  pos: Position,
  arch: Archetype,
  quality: number,
  m: Measurables,
  experience: number,
): Ratings {
  const tiers = TIERS[pos];
  const ratings = {} as Ratings;
  for (const key of RATING_KEYS) {
    const tier: Tier = tiers[key] ?? 'low';
    let mean: number;
    let sd: number;
    if (tier === 'core') {
      mean = 42 + 46 * quality;
      sd = 6;
    } else if (tier === 'sec') {
      mean = 34 + 36 * quality;
      sd = 8;
    } else {
      mean = 22 + 12 * quality;
      sd = 8;
    }
    if (UNIVERSAL.includes(key) && tier === 'low') {
      mean = 45 + 25 * quality;
      sd = 9;
    }
    ratings[key] = rng.normal(mean, sd);
  }

  // Mental growth with experience.
  const expBonus = Math.min(10, experience * 1.4);
  ratings.awareness += expBonus;
  ratings.playRecognition += expBonus * 0.8;
  ratings.decisionMaking += expBonus * 0.6;
  ratings.composure += expBonus * 0.5;

  // Strength follows position, bench and archetype.
  const sBase = POSITION_STRENGTH_BASE[pos] ?? 50;
  ratings.strength = sBase + (m.bench - (MEAS[pos].bench[0] || 10)) * 1.3 + 10 * (quality - 0.5) + rng.normal(0, 5);
  ratings.stamina = 55 + 25 * quality + (pos === 'OT' || pos === 'OG' || pos === 'C' ? 6 : 0) - (pos === 'DT' ? 6 : 0) + rng.normal(0, 7);
  ratings.balance += (m.weightLb - 220) / 25;
  ratings.hitPower += (m.weightLb - 210) / 6;

  // Hands correlate (weakly) with hand size; throwing power with frame for QBs.
  ratings.hands += (m.handIn - 9.5) * 4;
  if (pos === 'QB') ratings.throwPower += (m.heightIn - 75) * 1.2 + (m.weightLb - 220) * 0.08;

  for (const [k, v] of Object.entries(arch.bonus ?? {})) ratings[k as RatingKey] += v as number;

  for (const key of RATING_KEYS) ratings[key] = Math.round(clamp(ratings[key], 1, 99));
  return ratings;
}

function defaultFamiliarity(pos: Position): Partial<Record<Position, number>> {
  switch (pos) {
    case 'OT':
      return { OG: 0.75, C: 0.4 };
    case 'OG':
      return { OT: 0.6, C: 0.7 };
    case 'C':
      return { OG: 0.8, OT: 0.4 };
    case 'EDGE':
      return { LB: 0.55, DT: 0.5 };
    case 'DT':
      return { EDGE: 0.55 };
    case 'LB':
      return { EDGE: 0.5, S: 0.35 };
    case 'CB':
      return { S: 0.6 };
    case 'S':
      return { CB: 0.6, LB: 0.45 };
    case 'RB':
      return { FB: 0.55, WR: 0.4 };
    case 'FB':
      return { RB: 0.6, TE: 0.55 };
    case 'TE':
      return { FB: 0.6, WR: 0.45 };
    case 'WR':
      return { RB: 0.3, TE: 0.25 };
    default:
      return {};
  }
}

const round1 = (v: number) => Math.round(v * 10) / 10;
const round2 = (v: number) => Math.round(v * 100) / 100;

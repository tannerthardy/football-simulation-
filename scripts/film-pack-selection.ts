import { Rng } from '../src/core/rng.js';
import type { WeirdEvent } from './scorecard/weird/types.js';
import type { FieldZone, FilmGroup, FilmPackManifest, FilmPackPlay } from './film-pack-types.js';

export interface SelectionPlay {
  id: string;
  game: number;
  kind: string;
  down: number;
  distance: number;
  yardline: number;
  call: string;
  defense: string;
  yards: number;
  nullified: boolean;
  filmed: boolean;
  flags: { big: boolean; sack: boolean; to: boolean };
}

export const GROUP_ORDER: FilmGroup[] = ['ordinary', 'watch-first', 'big-plays'];
export const GROUP_LABELS: Record<FilmGroup, string> = {
  ordinary: '1. Ordinary', 'watch-first': '2. Watch first', 'big-plays': '3. Big plays',
};
export const TARGETS: Record<FilmGroup, number> = { ordinary: 120, 'watch-first': 40, 'big-plays': 20 };
export const fieldZone = (yardline: number): FieldZone => yardline <= 20 ? 'own-20' : yardline >= 80 ? 'red-zone' : 'middle';
export const stratum = (p: SelectionPlay): string =>
  `${p.kind}/down-${p.down}/${p.distance <= 3 ? 'short' : p.distance <= 7 ? 'medium' : 'long'}/${fieldZone(p.yardline)}`;

/** Minimum one per cell, then allocate toward population-proportional quotas.
 * A quota smaller than the cell count expands explicitly; never omit a cell.
 * Stable lexical ties and an isolated RNG leave football randomness untouched.
 */
export function stratifiedSample<T>(items: T[], key: (item: T) => string, quota: number, rng: Rng) {
  if (!Number.isInteger(quota) || quota < 0) throw new Error('Sample quota must be a non-negative integer');
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k)!.push(item);
  }
  const cells = [...buckets].sort(([a], [b]) => a.localeCompare(b))
    .map(([k, list]) => ({ key: k, list, population: list.length, selected: 1 }));
  const target = Math.min(items.length, Math.max(quota, cells.length));
  let assigned = cells.length;
  while (assigned < target) {
    let best: typeof cells[number] | undefined;
    for (const cell of cells) {
      if (cell.selected >= cell.population) continue;
      const deficit = target * cell.population / items.length - cell.selected;
      const bestDeficit = best ? target * best.population / items.length - best.selected : -Infinity;
      if (!best || deficit > bestDeficit) best = cell;
    }
    best!.selected++;
    assigned++;
  }
  return {
    items: rng.shuffle(cells.flatMap(c => rng.shuffle(c.list.slice()).slice(0, c.selected))),
    strata: cells.map(({ key: k, population, selected }) => ({ key: k, population, selected })),
    expanded: cells.length > quota,
  };
}

function exclusion(p: SelectionPlay): string | undefined {
  if (p.kind !== 'run' && p.kind !== 'pass') return 'not-run-or-pass';
  if (p.nullified) return 'nullified';
  if (!p.filmed) return 'no-body-frames';
  if (!Number.isInteger(p.down) || p.down < 1 || p.down > 4 || !Number.isFinite(p.distance)
    || p.distance < 0 || !Number.isFinite(p.yardline) || p.yardline < 0 || p.yardline > 100
    || !Number.isFinite(p.yards)) return 'invalid-situation';
  return undefined;
}

/** Ordinary is drawn first without conditioning on flags or gains. Flagged and
 * highlight groups then use the remaining plays; shortages stay shortages.
 * Detector frequency = eligible event count (uncapped), not a defect rate.
 */
export function selectFilmPlays(population: SelectionPlay[], events: WeirdEvent[], seed: number,
  targets = TARGETS): { plays: FilmPackPlay[]; selection: FilmPackManifest['selection'] } {
  if (new Set(population.map(p => p.id)).size !== population.length) throw new Error('Duplicate input play id');
  const excluded: Record<string, number> = {};
  const eligible = population.filter(p => {
    const why = exclusion(p);
    if (why) excluded[why] = (excluded[why] ?? 0) + 1;
    return !why;
  }).sort((a, b) => a.game - b.game || a.id.localeCompare(b.id));
  const byId = new Map(eligible.map(p => [p.id, p]));
  const plays: FilmPackPlay[] = [];
  const used = new Set<string>();
  const notes = ['Eligible: non-nullified run/pass plays with at least two body frames and valid situation fields.',
    'Ordinary is sampled first, independent of outcomes/detectors; other groups use the remaining unique plays.',
    'Detector frequency is the uncapped eligible event count; frequency × severity ranks review priority, not verified errors.'];
  const add = (p: SelectionPlay, group: FilmGroup, reason: string, detector?: FilmPackPlay['detector']) => {
    if (used.has(p.id)) throw new Error(`Repeated selection: ${p.id}`);
    used.add(p.id);
    plays.push({ id: p.id, game: p.game, group, reason, stratum: stratum(p), down: p.down,
      distance: p.distance, fieldZone: fieldZone(p.yardline), kind: p.kind as 'run' | 'pass',
      call: p.call, defense: p.defense, yards: p.yards, nullified: p.nullified, part: '',
      ...(detector ? { detector } : {}) });
  };
  const ordinary = stratifiedSample(eligible, stratum, targets.ordinary, new Rng(`film-pack-v1:ordinary:${seed}`));
  for (const p of ordinary.items) add(p, 'ordinary', `Seeded proportional sample: ${stratum(p)}`);
  if (ordinary.expanded) notes.push(`${ordinary.strata.length} non-empty strata exceed ordinary quota ${targets.ordinary}; quota expanded to retain one per cell.`);
  const detectorEvents: Record<string, number> = {};
  const candidates = events.filter(e => byId.has(e.id));
  for (const e of candidates) {
    if (!Number.isFinite(e.severity) || e.severity < 0) throw new Error(`Invalid event severity: ${e.id}/${e.detector}`);
    detectorEvents[e.detector] = (detectorEvents[e.detector] ?? 0) + 1;
  }
  const ranked = candidates.map(e => ({ e, score: detectorEvents[e.detector] * e.severity }))
    .sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id)
      || a.e.detector.localeCompare(b.e.detector) || a.e.t0 - b.e.t0 || a.e.text.localeCompare(b.e.text));
  const perDetector: Record<string, number> = {};
  let watchCount = 0;
  for (const { e, score } of ranked) {
    if (watchCount >= targets['watch-first']) break;
    if (used.has(e.id) || (perDetector[e.detector] ?? 0) >= 10) continue;
    add(byId.get(e.id)!, 'watch-first', `${e.detector} @ ${e.t0}–${e.t1}s: ${e.text}`, {
      id: e.detector, text: e.text, t0: e.t0, t1: e.t1, severity: e.severity,
      frequency: detectorEvents[e.detector], rankScore: score, candidate: !!e.candidate,
    });
    perDetector[e.detector] = (perDetector[e.detector] ?? 0) + 1;
    watchCount++;
  }
  const big = eligible.filter(p => !used.has(p.id) && (p.flags.big || p.flags.sack || p.flags.to));
  for (const p of new Rng(`film-pack-v1:big:${seed}`).shuffle(big).slice(0, targets['big-plays'])) {
    add(p, 'big-plays', [p.flags.big && '20+ yard gain (including 20+ yard touchdowns)', p.flags.sack && 'Sack',
      p.flags.to && 'Turnover'].filter(Boolean).join('; '));
  }
  const counts = Object.fromEntries(GROUP_ORDER.map(g => [g, plays.filter(p => p.group === g).length])) as Record<FilmGroup, number>;
  for (const g of GROUP_ORDER) if (counts[g] < targets[g]) notes.push(`${g}: ${counts[g]} of ${targets[g]} requested; insufficient remaining unique eligible plays${g === 'watch-first' ? ' under the 10-per-detector cap' : ''}.`);
  return { plays, selection: { order: GROUP_ORDER.slice(), targets: { ...targets }, counts,
    population: { total: population.length, eligible: eligible.length, excluded },
    strata: ordinary.strata, detectorEvents: Object.fromEntries(Object.entries(detectorEvents).sort()), notes } };
}

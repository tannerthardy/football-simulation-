/**
 * Report pieces for the film weirdness detectors: the "Watch these first"
 * list, the overhead line and the events file. All read the GameRecs of a
 * saved card, so they work with `--from` too.
 */
import type { GameRec } from '../records.js';
import { DETECTORS } from './detectors.js';
import type { DetectorId, WeirdEvent } from './types.js';

/** Events shown per detector in the report. */
export const WATCH_TOP = 3;

export function hasWeird(games: GameRec[]): boolean {
  return games.some((g) => g.weird);
}

export function allEvents(games: GameRec[]): WeirdEvent[] {
  return games.flatMap((g) => g.weird?.events ?? []);
}

/** `play @ time: description`, the form the film room's suite takes. */
export function watchLine(e: WeirdEvent): string {
  const t = e.t0 < 0 ? `${e.t0.toFixed(2)} s (pre-snap)` : `${e.t0.toFixed(2)} s`;
  const rep = Number.isFinite(e.representativeT) && e.representativeT !== e.t0
    ? ` [representative detector tick ${e.representativeT!.toFixed(2)} s]` : '';
  return `${e.id} @ ${t}${rep}: ${e.text}${e.nullified ? ' [play nullified by a penalty]' : ''}`;
}

/** The worst few events per detector, most severe first. */
export function watchList(games: GameRec[], top = WATCH_TOP): Array<{ id: DetectorId; label: string; candidate: boolean; total: number; lines: string[] }> {
  const events = allEvents(games);
  return DETECTORS.map((d) => {
    const mine = events.filter((e) => e.detector === d.id);
    const worst = [...mine].sort((a, b) => b.severity - a.severity).slice(0, top);
    // Counts come from the probe sums, which are never capped.
    const total = games.reduce((s, g) => s + (g.probe[`weird.${d.id}.events`] ?? 0), 0);
    return { id: d.id, label: d.label, candidate: !!d.candidate, total, lines: worst.map(watchLine) };
  });
}

export function watchSection(arms: Array<{ name: string; games: GameRec[] }>): string[] {
  const shown = arms.filter((a) => hasWeird(a.games));
  if (!shown.length) return [];
  const out = ['', '## Watch these first', ''];
  out.push('Read the clips, not the averages: each line is a place in a simulated game that a rule flagged. A rule says where to look, never what number is right, and several of its constants are chosen, not sourced (docs/VALIDATION.md). Ids with an `sc<seed>/` prefix are this run\'s own games, not the film room\'s: the full list is in the events file next to the saved card, and `npm run weird -- <seed>` plays the film-room games so its ids match `npm run replay`.', '');
  for (const a of shown) {
    if (arms.length > 1) out.push(`### ${a.name}`, '');
    for (const w of watchList(a.games)) {
      out.push(`**${w.label}${w.candidate ? ' (candidate)' : ''}**: ${w.total} event${w.total === 1 ? '' : 's'} in ${a.games.length} games`, '');
      if (!w.lines.length) out.push('- none', '');
      else out.push(...w.lines.map((l) => `- ${l}`), '');
    }
  }
  return out;
}

/** One line for the timing section: what the detectors added, inside the elapsed time per game. */
export function overheadLine(armName: string, games: GameRec[]): string | undefined {
  const w = games.filter((g) => g.weird);
  if (!w.length) return undefined;
  const ms = w.reduce((s, g) => s + g.weird!.ms, 0) / w.length;
  const total = w.reduce((s, g) => s + g.ms, 0) / w.length;
  return `- ${armName} film weirdness detectors: ${ms.toFixed(0)} ms per game, ${((ms / Math.max(1, total)) * 100).toFixed(1)}% of the elapsed time (inside it, not extra)`;
}

export interface EventsFile {
  meta: { commit: string; date: string; seed: number; games: number; leagues: number };
  arms: Array<{ name: string; counts: Record<string, number>; events: WeirdEvent[] }>;
}

export function eventsFile(meta: EventsFile['meta'], arms: Array<{ name: string; games: GameRec[] }>): EventsFile {
  return {
    meta,
    arms: arms.filter((a) => hasWeird(a.games)).map((a) => {
      const counts: Record<string, number> = {};
      for (const g of a.games) for (const [k, v] of Object.entries(g.probe)) if (k.startsWith('weird.')) counts[k] = (counts[k] ?? 0) + v;
      return { name: a.name, counts, events: allEvents(a.games) };
    }),
  };
}

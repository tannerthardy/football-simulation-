/** Portable F1/F2 handoff. Paths are relative to the manifest directory.
 * F2 writes its own pair sidecar; it must not fill these slots by play number
 * alone. Join using source/settings/input identity as well as the replay id.
 */
export const FILM_PACK_VERSION = 'film-pack-v1';
export type FilmGroup = 'ordinary' | 'watch-first' | 'big-plays';
export type FieldZone = 'own-20' | 'middle' | 'red-zone';

export interface FilmPackPlay {
  id: string;
  game: number; // 1-based, unlike the renderer's game index
  group: FilmGroup;
  reason: string;
  stratum: string;
  down: number;
  distance: number;
  fieldZone: FieldZone;
  kind: 'run' | 'pass';
  call: string;
  defense: string;
  yards: number;
  nullified: boolean;
  detector?: { id: string; text: string; t0: number; t1: number;
    severity: number; frequency: number; rankScore: number; candidate: boolean };
  part: string;
}

export interface FilmPackManifest {
  schemaVersion: 1;
  selectionVersion: typeof FILM_PACK_VERSION;
  seed: number;
  gameCount: number;
  /** Present (true) only for a --run-only pack; absent on every default pack. */
  runOnly?: true;
  source: {
    developCommit: string;
    headCommit: string;
    engineSha256: string;
    engineDirty: boolean;
    measurementSha256: string;
    lockfileSha256: string;
    node: string;
    settings: Record<string, string | number | boolean | null>;
    inputSha256: string;
  };
  telemetry: 'light';
  selection: {
    order: FilmGroup[];
    targets: Record<FilmGroup, number>;
    counts: Record<FilmGroup, number>;
    population: { total: number; eligible: number; excluded: Record<string, number> };
    strata: Array<{ key: string; population: number; selected: number }>;
    detectorEvents: Record<string, number>;
    notes: string[];
  };
  beforeAfter: { status: 'reserved-for-F2'; targetPairs: 20; pairs: [];
    note: string };
  parts: Array<{ file: string; bytes: number; ids: string[] }>;
  plays: FilmPackPlay[];
}

/**
 * What a player believes about an opponent he has not measured: the body and skills typical of the men who play that
 * position on the field, corrected toward the man's own by how well he knows him. "Typical" is the mean over the
 * defensive starters (base and nickel groups) of a fixed sample of generated teams, on its own random stream, so no
 * game draw is touched. The mean of every generated player at a position would be a weaker man than anyone he faces.
 */
import { Rng } from '../core/rng.js';
import { generateTeam, pickDefense } from '../league/team.js';
import { derivePhysical, type PhysicalProfile } from '../players/physical.js';
import { r01, RATING_KEYS, type Player, type Position, type RatingKey } from '../players/types.js';

const TEAMS = 12;
let cache: Map<Position, { profile: PhysicalProfile; ratings: Record<RatingKey, number> }> | null = null;

function build(): NonNullable<typeof cache> {
  const rng = new Rng('typical-starters');
  const by = new Map<Position, Player[]>();
  for (let i = 0; i < TEAMS; i++) {
    const team = generateTeam(rng.fork(`team${i}`), 'Typical', 'TYP');
    const seen = new Set<string>();
    for (const group of ['base43', 'nickel'] as const) for (const p of Object.values(pickDefense(team, group))) {
      if (!p || seen.has(p.id)) continue;
      seen.add(p.id);
      (by.get(p.position) ?? by.set(p.position, []).get(p.position)!).push(p);
    }
  }
  const out = new Map<Position, { profile: PhysicalProfile; ratings: Record<RatingKey, number> }>();
  for (const [position, players] of by) {
    const sum: Record<string, number> = {}, count: Record<string, number> = {};
    const ratings = Object.fromEntries(RATING_KEYS.map((k) => [k, 0])) as Record<RatingKey, number>;
    for (const p of players) {
      for (const [k, v] of Object.entries(derivePhysical(p))) if (typeof v === 'number') { sum[k] = (sum[k] ?? 0) + v; count[k] = (count[k] ?? 0) + 1; }
      for (const k of RATING_KEYS) ratings[k] += r01(p.ratings[k]) / players.length;
    }
    out.set(position, { profile: Object.fromEntries(Object.keys(sum).map((k) => [k, sum[k] / count[k]])) as unknown as PhysicalProfile, ratings });
  }
  return out;
}

/** The typical physical profile and 0-1 ratings of a defensive starter at a position; null for a position with no
 * defensive starters in the sample (the caller then uses the man's own values). */
export function typicalAt(position: Position): { profile: PhysicalProfile; ratings: Record<RatingKey, number> } | null {
  cache ??= build();
  return cache.get(position) ?? null;
}

/** `truth` as believed by someone who knows the man to degree k (0 = only his position, 1 = exactly). */
export function believedProfile(truth: PhysicalProfile, typical: PhysicalProfile, k: number): PhysicalProfile {
  const out: Record<string, unknown> = { ...truth };
  for (const [key, t] of Object.entries(typical)) {
    const v = (truth as unknown as Record<string, unknown>)[key];
    if (typeof v === 'number' && typeof t === 'number') out[key] = t + (v - t) * k;
  }
  return out as unknown as PhysicalProfile;
}

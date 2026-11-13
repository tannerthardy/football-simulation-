/**
 * What a player believes about an opponent he has not measured: the position's typical body and skills, corrected
 * toward the man's own by how well he knows him. The typical values are the mean of a fixed sample of generated
 * players at that position (its own random stream, so no game draw is touched).
 */
import { Rng } from '../core/rng.js';
import { generatePlayer } from '../players/generator.js';
import { derivePhysical, type PhysicalProfile } from '../players/physical.js';
import { r01, RATING_KEYS, type Position, type RatingKey } from '../players/types.js';

const SAMPLE = 48;
const cache = new Map<Position, { profile: PhysicalProfile; ratings: Record<RatingKey, number> }>();

/** The typical physical profile and 0-1 ratings at a position. */
export function typicalAt(position: Position): { profile: PhysicalProfile; ratings: Record<RatingKey, number> } {
  const hit = cache.get(position);
  if (hit) return hit;
  const rng = new Rng(`typical:${position}`);
  const sum: Record<string, number> = {}, count: Record<string, number> = {};
  const ratings = Object.fromEntries(RATING_KEYS.map((k) => [k, 0])) as Record<RatingKey, number>;
  for (let i = 0; i < SAMPLE; i++) {
    const p = generatePlayer(rng, position);
    for (const [k, v] of Object.entries(derivePhysical(p))) if (typeof v === 'number') { sum[k] = (sum[k] ?? 0) + v; count[k] = (count[k] ?? 0) + 1; }
    for (const k of RATING_KEYS) ratings[k] += r01(p.ratings[k]) / SAMPLE;
  }
  const profile = Object.fromEntries(Object.keys(sum).map((k) => [k, sum[k] / count[k]])) as unknown as PhysicalProfile;
  const out = { profile, ratings };
  cache.set(position, out);
  return out;
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

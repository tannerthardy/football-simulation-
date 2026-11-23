/** TACKLE_REACH (experimental, off; TACKLE_REACH=1 turns it on): one geometric definition of a tackler's reach.
 *
 * `profile.reach` is defined in src/players/physical.ts as the horizontal reach *from the body centre* (0.25 yd of
 * shoulder offset plus 0.85 of the arm). The tackle code built its ranges as `c.radius + d.radius + d.reach`, counting
 * the tackler's own body radius (0.24-0.42 yd) a second time: a 200 lb DB started a standing attempt at about 1.55 yd
 * centre to centre, and a lunge at 2.0.
 *
 * Evidence (docs/reviews/2026-11-23-pursuit-build-addendum.md; Rules, BDB 2024 PFF labels joined to BDB 2025 tracking,
 * 16,234 attempts):
 *  - NFL attempts, made and missed, happen at a centre distance of p50 0.88 yd (p90 1.06); 87% of misses come within
 *    1.0 yd.
 *  - Ours: wraps at p50 1.38 yd, misses at p50 1.95.
 *
 * With the flag, every tackle-reach distance is measured from the tackler's centre to the carrier's surface:
 * `c.radius + d.reach × share`. That covers:
 *  - the tackle range and its contact quality;
 *  - the hold's joint;
 *  - the hold quality laws in the bond;
 *  - the pursuit planners that place the tackle window (pursuitPoint's reach, chase/run-fit contact, catch approach).
 * Torsos touching stays `c.radius + d.radius`. Not a fitted number: the body is counted once. */
import type { Agent } from './agent.js';

export const TACKLE_REACH = process.env.TACKLE_REACH === '1';

/** Centre-to-centre distance at which tackler `d` reaches carrier `c` with `share` of his reach. */
export function reachTo(d: Agent, c: Agent, share = 1): number {
  return c.profile.radius + (TACKLE_REACH ? 0 : d.profile.radius) + d.profile.reach * share;
}

/** The part of his reach beyond his own torso (what the arms add past the body): the span the hold quality laws scale
 * over. */
export function armSpan(d: Agent): number {
  return TACKLE_REACH ? d.profile.reach - d.profile.radius : d.profile.reach;
}

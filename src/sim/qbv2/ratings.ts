/**
 * QB_V2: every rating-to-parameter mapping in one place (QB lane, 2026-11-24; Integration's outside review of the passer's
 * ratings). Each parameter names its source, so a mapping can be split or re-mapped later without touching the modules.
 * Two separate inputs to module E, kept separate on purpose:
 * - how well he estimates (his look's resolve time, his picture's spread): from his processing ratings;
 * - what bar he accepts (the completion belief he needs, the risk he takes): a stated standard for now, the same for
 *   every passer. No archetype string is read, and the bar is not derived from decisionMaking: a smart passer may also
 *   be an aggressive one. Individual differences in the bar come after the standard passer is calibrated.
 */

export interface PasserRatings {
  playRecognition: number;
  decisionMaking: number;
  composure: number;
  discipline: number;
  experience: number;
}

/** How he estimates: the look's resolve time (s), from his processing (playRecognition, decisionMaking, experience),
 * slowed by felt pressure narrowing him (`narrow`, 0-1). The step clock's form. */
export function resolveTau(r: PasserRatings, narrow: number): number {
  const proc = 0.4 * r.playRecognition + 0.4 * r.decisionMaking + 0.2 * Math.min(1, r.experience / 8);
  return (0.12 + 0.36 * (1 - proc)) * (1 + 0.8 * narrow);
}

/** How sure he needs to be before he acts on a look (0-1): composure and discipline; felt rush lowers it, a calm passer's
 * less. The step clock's form. */
export function confidenceNeed(r: PasserRatings, felt: number): number {
  const calm = 0.5 * r.composure + 0.5 * r.discipline;
  return (0.3 + 0.5 * calm) * (1 - (0.8 - 0.4 * r.composure) * Math.min(1, Math.max(0, felt)));
}

/** The bar he accepts, standard for every passer for now (stated: the old controller's standard passer's values, P 0.56
 * and risk 0.0425), lowered by felt rush and by pressure narrowing him as before. */
export const BAR_P0 = 0.56;
export const BAR_RISK0 = 0.0425;
export function bar(felt: number, narrow: number): { P: number; risk: number } {
  return { P: BAR_P0 - 0.32 * felt - 0.15 * narrow, risk: BAR_RISK0 + 0.08 * felt };
}

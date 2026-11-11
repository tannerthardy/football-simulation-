/**
 * compile(): one concept from one formation and flip → its routes, motifs, candidates and the chosen plan.
 * Screens bypass the generic compiler (§10 H): their read is the called target. Phase 0: diagnostics only.
 */
import type { Team } from '../../league/team.js';
import type { PassConcept } from '../types.js';
import { candidates, DEFAULT_PROFILE, type CoachProfile } from './candidates.js';
import { sampleRoutes } from './features.js';
import { findMotifs } from './motifs.js';
import type { CompiledPlay } from './types.js';

export const COMPILER_VERSION = 'phase0-1';

export function compile(concept: PassConcept, formation: string, flip: boolean, off: Team, def: Team, profile: CoachProfile = DEFAULT_PROFILE): CompiledPlay {
  if (concept.family === 'screen' || concept.screen) {
    return { conceptId: concept.id, formation, flip, qbSetAt: 0, routes: [], excluded: [], motifs: [], candidates: [], chosen: null,
      bypass: `screen: the called target ${concept.screen?.receiver ?? concept.progression[0]}` };
  }
  const s = sampleRoutes(concept, formation, flip, off, def);
  const motifs = findMotifs(s.routes);
  const cands = candidates(s.routes, motifs, s.qbSetAt, profile);
  const chosen = cands.find((c) => c.valid) ?? null;
  return { conceptId: concept.id, formation, flip, qbSetAt: s.qbSetAt, routes: s.routes, excluded: s.excluded, motifs, candidates: cands, chosen };
}

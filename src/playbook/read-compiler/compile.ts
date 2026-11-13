/**
 * compile(): one concept from one formation and flip → its routes, motifs, candidates and the chosen plan.
 * Screens bypass the generic compiler (§10 H): their read is the called target. Phase 0: diagnostics only.
 */
import type { Team } from '../../league/team.js';
import type { PassConcept } from '../types.js';
import { candidates, DEFAULT_PROFILE, select, type CoachProfile } from './candidates.js';
import { sampleRoutes } from './features.js';
import { findMotifs } from './motifs.js';
import type { CompiledPlay } from './types.js';

export const COMPILER_VERSION = 'phase1-1';

export function compile(concept: PassConcept, formation: string, flip: boolean, off: Team, def: Team, profile: CoachProfile = DEFAULT_PROFILE): CompiledPlay {
  if (concept.family === 'screen' || concept.screen) {
    return { conceptId: concept.id, formation, flip, qbSetAt: 0, routes: [], excluded: [], motifs: [], candidates: [], chosen: null,
      bypass: `screen: the called target ${concept.screen?.receiver ?? concept.progression[0]}` };
  }
  // The installed plan is the same whichever side the formation sets to (§5): sample both orientations and
  // average each receiver's timing, keeping this orientation's trajectory for the record. The engine runs a
  // mirrored route a few hundredths differently, which otherwise tips near-ties.
  const s = sampleRoutes(concept, formation, flip, off, def);
  const m = sampleRoutes(concept, formation, !flip, off, def);
  for (const r of s.routes) {
    const o = m.routes.find((x) => x.ref === r.ref);
    if (!o) continue;
    const avg = (a: number, b: number) => +((a + b) / 2).toFixed(2);
    r.window = { ready: avg(r.window.ready, o.window.ready), best: avg(r.window.best, o.window.best), last: avg(r.window.last, o.window.last) };
    r.depthAtReady = +((r.depthAtReady + o.depthAtReady) / 2).toFixed(1);
    if (r.breakT !== null && o.breakT !== null) r.breakT = avg(r.breakT, o.breakT);
    r.settles = r.settles && o.settles;
  }
  s.qbSetAt = +((s.qbSetAt + m.qbSetAt) / 2).toFixed(2);
  const motifs = findMotifs(s.routes);
  const cands = candidates(s.routes, motifs, s.qbSetAt, profile);
  // Phase 1: the plan is chosen by the structural rules (`select`); the scored candidates stay for the audit.
  const sel = select(s.routes, motifs, s.qbSetAt, profile);
  const chosen = sel.valid ? sel : null;
  if (chosen) cands.unshift(chosen);
  return { conceptId: concept.id, formation, flip, qbSetAt: s.qbSetAt, routes: s.routes, excluded: s.excluded, motifs, candidates: cands, chosen };
}

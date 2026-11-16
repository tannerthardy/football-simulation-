/**
 * compile(): one concept from one formation and flip → its routes, motifs, candidates and the chosen plan.
 * Screens bypass the generic compiler (§10 H): their read is the called target. Phase 0: diagnostics only.
 */
import type { Team } from '../../league/team.js';
import type { PassConcept } from '../types.js';
import { candidates, DEFAULT_PROFILE, PLAN_ROLES, select, type CoachProfile } from './candidates.js';
import { sampleRoutes } from './features.js';
import { findMotifs } from './motifs.js';
import type { CompiledPlay } from './types.js';

export const COMPILER_VERSION = 'phase1-1';

/** PLAN_ROLES (experimental, off): a coached clear-out is the concept's role, not a geometric finding. In a flood or a
 * trips out / sail, the outside vertical clears for the out under it, and the out is the route the quarterback looks for
 * first ("the intermediate sideline route is the route many quarterbacks are taught to look for first ... the deep
 * layer is usually the outside receiver's vertical", Youth Football Online, Flood Passing Concepts; three levels to one
 * side, deep / intermediate / flat). The compiler found clear-outs from geometry (a vertical 12 yd or deeper at its
 * ready time over a shorter same-side route) and read a same-side pair deeper-first past a 2 yd gap; a go at 11.6-11.9
 * yd fell on both thresholds, so a 0.3 yd change in where he was at his ready time put the clear-out ahead of the out
 * (docs/reviews/2026-11-14-plan-roles.md). Declared clear-outs enter as motifs and are not read as the high of a high-low. */
/** PLAN_ROLES: the clear-outs (the clearer's route, the route he clears for), by route so that they hold in every
 * formation, from the concept's install. */
export const CLEAR_OUTS: Record<string, [string, string][]> = {
  flood: [['go', 'out']],
  trips_outs: [['go', 'out']],
  trips_sail: [['go', 'out']],
};
/** PA_TABLES (experimental, off; a repair): a play-action-tagged call (`smash+pa`, PA_CALL's tag on a dropback concept)
 * is installed from its concept's tables: its coached key, order, looks and clear-outs. Off, the tables were looked up by
 * the tagged id, missed, and the tagged call compiled from geometry alone (smash+pa had no corner key). */
export const PA_TABLES = process.env.PA_TABLES === '1';
/** The id a concept's install tables are keyed by. */
export function tableId(concept: PassConcept): string {
  return PA_TABLES ? concept.id.replace(/\+pa$/, '') : concept.id;
}
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
  if (PLAN_ROLES) for (const [clearRoute, underRoute] of CLEAR_OUTS[tableId(concept)] ?? []) {
    // Same side: the clearer and the route he clears for.
    for (const c of s.routes) for (const u of s.routes) if (c.routeId === clearRoute && u.routeId === underRoute && c.side === u.side
      && !motifs.some((m) => m.kind === 'clearout' && m.refs[0] === c.ref && m.refs[1] === u.ref))
      motifs.push({ kind: 'clearout', refs: [c.ref, u.ref], confidence: 1, why: `${c.ref} clears for ${u.ref} (declared)` });
  }
  const cands = candidates(s.routes, motifs, s.qbSetAt, profile);
  // Phase 1: the plan is chosen by the structural rules (`select`); the scored candidates stay for the audit.
  const sel = select(s.routes, motifs, s.qbSetAt, profile);
  const chosen = sel.valid ? sel : null;
  if (chosen) cands.unshift(chosen);
  return { conceptId: concept.id, formation, flip, qbSetAt: s.qbSetAt, routes: s.routes, excluded: s.excluded, motifs, candidates: cands, chosen };
}

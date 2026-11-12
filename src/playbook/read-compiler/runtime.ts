/**
 * READ_PLAN (experimental, off): the installed read plan a quarterback runs, compiled once per concept and
 * formation from the routes our engine actually runs (compile.ts) and cached for the process. The plan is the
 * coach's install, not a picture of this play's defense: it is compiled with fixed generic teams and parked
 * defenders, so it never sees the defensive call. QBPass executes it from what he sees (src/sim/behaviors/qb.ts).
 */
import { Rng } from '../../core/rng.js';
import { generateTeam, type Team } from '../../league/team.js';
import type { PassConcept, ReceiverRef } from '../types.js';
import { compile } from './compile.js';
import type { PlanStyle } from './types.js';

export const READ_PLAN = process.env.READ_PLAN !== '0';

export interface InstalledPlan {
  style: PlanStyle;
  /** Field reads in order (the start side through, then the other side). */
  order: ReceiverRef[];
  outlet: ReceiverRef | null;
  alert: ReceiverRef | null;
  /** Defender key: read the defender between `low` and `high` at `cueBy` s after the snap. */
  key: { low: ReceiverRef; high: ReceiverRef; role: string; cueBy: number } | null;
  /** Triangle: three routes read as one picture, top-down; vertical peek: the verticals as one look, then the back. */
  triangle: ReceiverRef[] | null;
}

const cache = new Map<string, InstalledPlan | null>();
let compiling = 0;
let teams: { off: Team; def: Team } | null = null;

/** True while a plan is being compiled: the sampling sim's own quarterback must not compile one in turn. */
export function compilingPlan(): boolean { return compiling > 0; }

/** The installed plan for a concept from a formation (either flip: the plan is symmetric), or null for a screen or
 * when nothing compiles. */
export function installedPlan(concept: PassConcept, formationId: string): InstalledPlan | null {
  if (concept.family === 'screen' || concept.screen) return null;
  const key = `${formationId}|${concept.id}|${concept.drop}|${JSON.stringify(concept.strong)}|${JSON.stringify(concept.weak)}|${concept.back}|${concept.teBlock ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key)!;
  teams ??= { off: generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def: generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 }) };
  compiling++;
  let plan: InstalledPlan | null = null;
  try {
    const c = compile(concept, formationId, false, teams.off, teams.def).chosen;
    if (c) {
      plan = {
        style: c.style, order: c.order.map((s) => s.ref), outlet: c.outlet, alert: c.alert ?? null,
        key: c.key?.low && c.key.high ? { low: c.key.low, high: c.key.high, role: c.key.role, cueBy: c.key.cueBy } : null,
        triangle: c.triangle ?? null,
      };
    }
  } finally {
    compiling--;
  }
  cache.set(key, plan);
  return plan;
}

/**
 * CALL_COMPOSE step 2: the axes opened (docs/reviews/2026-11-24-call-composition.md §5; approved 2026-11-24).
 *
 * Choosing a call happens in two stages:
 * 1. The play-caller picks a composition. Its base weight is its NFL share (`baseWeight`), in place of the old
 *    weight of 1 for every concept.
 * 2. `drawSetting` picks each open axis for that composition, by NFL share. The axes are:
 *    - the strong half's version (levels: outside short in or outside deep in, neither the core);
 *    - the backside half (the halves the NFL pairs with that core);
 *    - the back's job (stays in, or released on a route);
 *    - tags (mesh's #1 on the go or the corner).
 *
 * The shares are labelled defaults from NFL_CALL_SHARES (scripts/diag/routes/call_shares.py), a starting call sheet,
 * not targets.
 *
 * `variantOf` builds the PassConcept the engine runs from the pool concept and the setting, then checks it:
 * - the drop fits the primary reads;
 * - the protection covers the released routes, with a hot route on each side when fewer than six block.
 * - every player handed a route is eligible at the snap after motion (Flex's eligibility adapter).
 * A setting that fails falls back to the composition as authored. That a half's receivers are on the field after motion
 * is checked by CONCEPT_FIT at the call site.
 */
import type { Rng } from '../../core/rng.js';
import { QUICK_HITCH } from '../concepts.js';
import { getRoute } from '../routes.js';
import type { PassConcept, ReceiverRef } from '../types.js';
import { BASE_COMPOSITIONS, MENU_COMPOSITIONS } from './compositions.js';
import { HALF_BY_ID } from './halves.js';
import { NFL_CALL_SHARES as N } from './shares.js';
import type { BackJob, Composition, Tag } from './types.js';

export interface Option<T> { value: T; share: number }
export interface Axes {
  strong?: Option<string>[];
  weak?: Option<string>[];
  back?: Option<BackJob>[];
  tags?: Option<Tag[]>[];
}
export interface Setting { strong?: string; weak?: string; back?: BackJob; tags?: Tag[] }

export const COMPOSITION_BY_ID: Record<string, Composition> = Object.fromEntries([...BASE_COMPOSITIONS, ...MENU_COMPOSITIONS].map((c) => [c.id, c]));

/** An axis option below this share of its axis is not offered: the long tail of one-off pairings. */
const MIN_SHARE = 0.03;
/** Clear-out routes: a backside half's receivers on these are not read (they run off the reads). */
const CLEAR_OUT = new Set(['go', 'seam']);

function normalise<T>(opts: Option<T>[]): Option<T>[] {
  const total = opts.reduce((s, o) => s + o.share, 0);
  if (!(total > 0)) return [];
  const kept = opts.filter((o) => o.share / total >= MIN_SHARE);
  const sum = kept.reduce((s, o) => s + o.share, 0);
  return kept.map((o) => ({ value: o.value, share: o.share / sum }));
}

/** The NFL back's job as ours, for a composition. The NFL's flat is the flat route this composition gives a back:
 * the swing for mesh, the shoot for speed outs (Kratzer, "The Quick Passing Game"), or today's check (block, then out
 * to the flat as the checkdown). Empty is the formation's choice, not the call's, so it is left out. */
function backJobOf(job: string, c: Composition): BackJob | null {
  const flat = c.id === 'mesh' ? 'swing' : c.id === 'quick_outs' ? 'back_flat' : null;
  switch (job) {
    case 'stay': return { stay: true };
    case 'flat': return flat ? { release: 'check', route: flat } : { release: 'check' };
    case 'angle': return { release: 'check', route: 'angle' };
    case 'wheel': return { release: 'check', route: 'wheel' };
    case 'out': return { release: 'check', route: 'back_out' };
    case 'other': return { release: 'check' };
    default: return null;
  }
}

function backOptions(c: Composition, dist: Record<string, number> | undefined): Option<BackJob>[] | undefined {
  if (!dist) return undefined;
  const merged = new Map<string, Option<BackJob>>();
  for (const [job, share] of Object.entries(dist)) {
    const b = backJobOf(job, c);
    if (!b) continue;
    const k = JSON.stringify(b);
    merged.set(k, { value: b, share: (merged.get(k)?.share ?? 0) + share });
  }
  const out = normalise([...merged.values()]);
  return out.length > 1 ? out : undefined;
}

/** The axes open on each composition. Play action keeps its call as authored (a run fake is its own question), and
 * so do the full-field concepts other than mesh. */
function axesOf(c: Composition): Axes {
  if (c.family === 'playaction') return {};
  const a: Axes = {};
  if ('full' in c.routes) {
    if (c.id !== 'mesh') return a;
    a.back = backOptions(c, N.mesh_back);
    // Mesh's #1s: the go and the corner, the two our mesh runs (Win With The Pass: both on the corner; ours: one on the go).
    const go = N.mesh_outside.GO ?? 0, corner = N.mesh_outside.CORNER ?? 0;
    a.tags = normalise([{ value: [], share: go }, { value: [{ who: 'W1', route: 'corner' }], share: corner }]);
    return a;
  }
  const s = c.routes.strong;
  if (s === 'levels_outside_deep') {
    a.strong = normalise([
      { value: 'levels_outside_deep', share: N.core_share.levels_outside_deep ?? 0 },
      { value: 'levels_outside_short', share: N.core_share.levels_outside_short ?? 0 },
    ]);
  }
  // The backside: the two-receiver halves whose cores the NFL puts opposite this core.
  const partner = N.core_partner[s] ?? {};
  a.weak = normalise(Object.entries(partner)
    .filter(([h]) => h !== 'unmatched' && h !== 'go' && HALF_BY_ID[h] && Object.keys(HALF_BY_ID[h].routes).length <= 2)
    .map(([h, share]) => ({ value: h, share })));
  if (a.weak.length < 2) delete a.weak;
  a.back = backOptions(c, N.core_back[s]);
  return a;
}

export const AXES: Record<string, Axes> = Object.fromEntries(Object.values(COMPOSITION_BY_ID).map((c) => [c.id, axesOf(c)]));

/** The composition's NFL share: its strong half's core, or its full-field pattern. */
export function nflShare(id: string): number | undefined {
  const c = COMPOSITION_BY_ID[id];
  if (!c || c.family === 'playaction') return undefined;
  return 'full' in c.routes ? N.full_share[c.routes.full] : N.core_share[c.routes.strong];
}
const SHARES = Object.keys(COMPOSITION_BY_ID).map(nflShare).filter((v): v is number => v !== undefined);
const MEAN_SHARE = SHARES.reduce((s, v) => s + v, 0) / SHARES.length;

/** The play-caller's base weight: the NFL share relative to the mean, so the pool keeps today's scale (a mean of 1).
 * Play action keeps 1: its rate is the situation's (PA_CALL), not a dropback share. */
export function baseWeight(id: string): number {
  const v = nflShare(id);
  return v === undefined ? 1 : v / MEAN_SHARE;
}

function pick<T>(opts: Option<T>[] | undefined, rng: Rng): T | undefined {
  if (!opts?.length) return undefined;
  let r = rng.next();
  for (const o of opts) if ((r -= o.share) < 0) return o.value;
  return opts[opts.length - 1].value;
}

/** Draw each open axis by its share, in a fixed order on the caller's stream. */
export function drawSetting(id: string, rng: Rng): Setting {
  const a = AXES[id] ?? {};
  return { strong: pick(a.strong, rng), weak: pick(a.weak, rng), back: pick(a.back, rng), tags: pick(a.tags, rng) };
}

const backString = (b: BackJob): string => ('stay' in b ? 'block' : b.route ?? 'check');
const routeAt = (c: PassConcept, ref: ReceiverRef): string | undefined =>
  ref === 'B' ? (c.back === 'block' ? undefined : c.back) : ref[0] === 'S' ? c.strong[Number(ref[1]) as 1] : ref[0] === 'W' ? c.weak[Number(ref[1]) as 1] : undefined;

/** The drop fits the primary reads: a quick drop (quick, gun3) has no time for a planted break at 8 yd or deeper, and
 * a five-step none at 18 or deeper. Verticals are thrown on the drop's rhythm and the back's routes on the outlet, so
 * they do not set it. The QB lane owns the drops' times; this is the class check. */
export function dropFits(c: PassConcept): boolean {
  const limit = c.drop === 'quick' || c.drop === 'gun3' ? 8 : c.drop === 'gun5' || c.drop === 'five' ? 18 : Infinity;
  for (const ref of c.progression.slice(0, 2)) {
    const id = routeAt(c, ref);
    if (!id || ref === 'B') continue;
    const r = getRoute(id);
    if (r.family === 'deep' || r.family === 'flat' || r.family === 'back') continue;
    if (r.depth >= limit) return false;
  }
  return true;
}

/** A hot route: one that breaks short and quick enough to be thrown against an extra rusher (a sight adjust). */
const isHot = (id: string | undefined): boolean => !!id && (() => { const r = getRoute(id); return r.family === 'flat' || (r.family === 'quick' && r.depth <= 6) || r.depth <= 6; })();

/** The protection covers the released routes. Five linemen, plus the back unless he free-releases ('scat'; a check or
 * slow release stays in while his man rushes, as BACK_RELEASE's count does), plus a blocking tight end. Fewer than six
 * in protection needs a hot route on each side that has receivers. */
export function protectionFits(c: PassConcept, back: BackJob): boolean {
  const blockers = 5 + ('stay' in back || back.release !== 'scat' ? 1 : 0) + (c.teBlock ? 1 : 0);
  if (blockers >= 6) return true;
  for (const side of [c.strong, c.weak]) {
    const routes = Object.values(side);
    if (routes.length && !routes.some(isHot)) return false;
  }
  return true;
}

/** The read order with the setting's changes:
 * - a new backside half's read receivers (not its clear-outs, in number order) take the place of the authored backside
 *   reads;
 * - a back kept in protection is not read;
 * - a released back is read last if the order did not already read him.
 * The QB lane's per-half plans replace this in step 3. */
function progressionOf(base: PassConcept, newWeak: PassConcept['weak'] | null, back: string): ReceiverRef[] {
  let order = [...base.progression];
  if (newWeak) {
    const reads = Object.entries(newWeak).filter(([, r]) => r && !CLEAR_OUT.has(r)).map(([n]) => `W${n}` as ReceiverRef);
    const at = order.findIndex((r) => r[0] === 'W');
    const kept = order.filter((r) => r[0] !== 'W');
    // Everything before the first backside read is a front-side read, so the new reads go in at the same place;
    // with no backside read authored, before the back.
    const pos = at >= 0 ? at : kept.includes('B') ? kept.indexOf('B') : kept.length;
    kept.splice(pos, 0, ...(reads.length ? reads : (['W1'] as ReceiverRef[])));
    order = kept;
  }
  if (back === 'block') order = order.filter((r) => r !== 'B');
  else if (!order.includes('B')) order.push('B');
  return order;
}

/** The concept the engine runs for a composition and a setting: the pool concept (its install passes already applied)
 * with the setting's routes, back and reads. It keeps the pool concept's id, so the id-keyed install tables (the read
 * compiler's keys, CONCEPT_FIT, the learned weights) still find it. The name records the setting. Returns the pool
 * concept itself when the setting changes nothing. */
export function buildVariant(base: PassConcept, s: Setting): PassConcept {
  const c = COMPOSITION_BY_ID[base.id];
  if (!c) return base;
  const quick = (side: PassConcept['weak']) => {
    if (QUICK_HITCH && base.family === 'quick') for (const n of [1, 2, 3, 4] as const) if (side[n] === 'hitch') side[n] = 'quick_hitch';
    return side;
  };
  const parts: string[] = [];
  let strong = { ...base.strong }, weak: PassConcept['weak'] | null = null, newHalf: PassConcept['weak'] | null = null, back = base.back;
  if (s.strong && 'strong' in c.routes && s.strong !== c.routes.strong) {
    strong = quick({ ...strong, ...HALF_BY_ID[s.strong].routes });
    parts.push(HALF_BY_ID[s.strong].name);
  }
  if (s.weak && 'weak' in c.routes && s.weak !== c.routes.weak) {
    newHalf = { ...HALF_BY_ID[s.weak].routes };
    weak = quick({ ...newHalf });
    parts.push(`backside ${HALF_BY_ID[s.weak].name}`);
  }
  for (const t of s.tags ?? []) {
    const side = t.who[0] === 'S' ? strong : (weak ??= { ...base.weak });
    side[Number(t.who[1]) as 1] = t.route; parts.push(`${t.who} ${t.route}`);
  }
  if (s.back && backString(s.back) !== base.back) { back = backString(s.back); parts.push(`back ${'stay' in s.back ? 'in' : back}`); }
  if (!parts.length) return base;
  const out: PassConcept = { ...base, strong, weak: weak ?? { ...base.weak }, back, progression: progressionOf(base, newHalf, back),
    name: `${base.name} (${parts.join(', ')})` };
  return out;
}

/** Who may take a route on this call, after motion (Flex's `callEligibility`, src/game/call-eligibility.ts). */
export interface CallField { eligible: ReadonlySet<ReceiverRef>; refs: ReadonlySet<ReceiverRef>; problems: readonly string[] }

/** The formation is legal (seven on the line, every ruling resolved) and every player on the field the call hands a
 * route is eligible at the snap after motion. A ref the formation does not field runs nothing, so it is not checked. */
export function eligibilityFits(c: PassConcept, field: CallField): boolean {
  if (field.problems.length) return false;
  const routed: ReceiverRef[] = [];
  for (const n of [1, 2, 3, 4] as const) {
    if (c.strong[n]) routed.push(`S${n}`);
    if (c.weak[n]) routed.push(`W${n}`);
  }
  if (c.back !== 'block') routed.push('B');
  return routed.every((ref) => !field.refs.has(ref) || field.eligible.has(ref));
}

/** `buildVariant`, kept only if it passes the call's checks: the drop fits the primary reads; the protection covers
 * the released routes; with the field, every routed player is eligible after motion. Otherwise the composition as
 * authored. */
export function variantOf(base: PassConcept, s: Setting, field?: CallField): PassConcept {
  const out = buildVariant(base, s);
  if (out === base) return base;
  if (field && !eligibilityFits(out, field)) return base;
  return dropFits(out) && protectionFits(out, s.back ?? COMPOSITION_BY_ID[base.id].back) ? out : base;
}

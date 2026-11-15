/**
 * READ_PLAN (experimental, off): the installed read plan a quarterback runs, compiled once per concept and
 * formation from the routes our engine actually runs (compile.ts) and cached for the process. The plan is the
 * coach's install, not a picture of this play's defense: it is compiled with fixed generic teams and parked
 * defenders, so it never sees the defensive call. QBPass executes it from what he sees (src/sim/behaviors/qb.ts).
 */
import { Rng } from '../../core/rng.js';
import { generateTeam, type Team } from '../../league/team.js';
import { FORMATION_BY_ID } from '../formations.js';
import type { PassConcept, ReceiverRef } from '../types.js';
import { compile } from './compile.js';
import { DECLARED_BREAK } from './features.js';
import { PLAN_ROLES } from './candidates.js';
import type { PlanStyle } from './types.js';

export const READ_PLAN = process.env.READ_PLAN !== '0';
/** OUTLET_LAST (experimental, off; read-plan table, docs/reviews/2026-11-14-read-plan-table.md): the back's release
 * is the outlet, read last, after the field reads, not placed in the order by when he comes open (BACK_FRONT put him
 * first or second in 11 of the 32 pool concepts and third in 10, and `initPlan`'s "outlet last" then did nothing).
 * Every source that names the back puts him last (Hewitt, USA Football: "No. 1, then No. 2, then running back";
 * Gonzalez via Smart Football: the back on the second hitch). The coached exceptions run the back as a designed route
 * (slant-flat with the back in the flat, Dunn, USA Football; Walsh / Air Raid stick with the back on the shoot,
 * Ross; one mesh install with the flare first, Throw Deep); no pool concept installs those (our slant_flat back
 * blocks, stick's back checks, mesh is installed as Leach's under PLAN_KEYS), so none is exempt. */
export const OUTLET_LAST = process.env.OUTLET_LAST !== '0';
/** PLAN_KEYS (experimental, off; same table): the coached key where the compiler's geometry names another defender,
 * and one named install where the sources disagree. Each entry carries its source.
 * - drive: the hook linebacker, dig (high) over shallow (low) (Smart Football, "Shallow cross, drag and drive"); the
 *   compiler keyed the deep defender over the go.
 * - pa_post_dig: the free safety, the post (high) over the dig under it (Mills post-dig; ours runs the dig from the
 *   backside, W1, the strong #2 blocks); the compiler keyed the curl-flat on the backside dig and hook.
 * - smash, corner_flat: the corner, corner (high) over the hitch or flat (low) (Chris Brown, Smart Football: "key
 *   the cornerback"); the compiler's pair is already this one, so only the role changes (the read is geometric).
 * - mesh: Leach's install, the outside route, then the mesh crosser coming to him, then the other, then the swing
 *   (Alex Brink, Spokesman-Review); alternatives: Throw Deep's flare first, the Rams' shallow first.
 * - y_cross: deep to short, the post, then the cross, then the flat (Throw Deep; Inside the Pylon's "deep look, then
 *   the crossing route"); alternative: Leach's go and out before the cross.
 * - pa_flood: the sail, then the cross, then the flat (weak source, a dropback play-action read); alternative: the
 *   boot's flat first, low to high (DeBerry, Glazier), for a bootleg, which ours is not. */
export const PLAN_KEYS = process.env.PLAN_KEYS !== '0';
/** PLAN_KEYS_2 (experimental, off): with PLAN_KEYS, six concepts the compiler ran as pure orders key as taught:
 * slant_flat, stick, fade_flat, double_slants by their own sources; quick_outs and hitch_out by the family rule for a
 * two-receiver quick combination (the front-side flat defender, on the third step). Trips stick and seam-slant stay
 * pure progressions: no source for trips stick's alert (a keyed plan demotes it to third), and seam-slant's hook key
 * would be double slants' borrowed for a different structure. */
export const PLAN_KEYS_2 = process.env.PLAN_KEYS_2 !== '0';
const SECOND_KEYS = new Set(['slant_flat', 'stick', 'fade_flat', 'double_slants', 'quick_outs', 'hitch_out']);
/** PLAN_KEYS_3 (experimental, off): with PLAN_KEYS, the coached key holds whatever the geometry says for dagger and
 * levels. Their keys were the compiler's, derived from geometry (dagger's the deep safety, seam over dig, the coached
 * key itself; levels keyed on the hook in trips only), so a route-timing change (ROUTE_SHAPE: the dig ready on the
 * first hitch) removed them. As table entries they hold; levels from 2x2, pure on develop, is keyed too. */
export const PLAN_KEYS_3 = process.env.PLAN_KEYS_3 !== '0';
const THIRD_KEYS = new Set(['dagger', 'levels']);
/** One beat of the drop: the hitch step (the compiler's BEAT). */
const RHYTHM_BEAT = 0.4;
/** CONCEPT_DROPS: the five-step class's hitch, the NFL's set-to-release at that depth (QB lane, drop-time.py). */
const FIVE_STEP_BEAT = 0.8;
const CONCEPT_DROPS_RHYTHM = process.env.CONCEPT_DROPS === '1';
/** The coached key per concept, and the danger: the defender the coaching warns about on the answer (the window
 * check's named man; he limits where and how high the ball goes, he does not reopen the key's decision: "if the
 * cornerback sinks... throw the hitch; if he comes up... throw the corner", Brown; the corner thrown "as high as the
 * safety will allow"). Key and danger sources are in docs/reviews/2026-11-14-read-plan-table.md. */
const KEYS: Record<string, { low: ReceiverRef; high: ReceiverRef; role: string; deep: boolean; danger: string; onSet?: boolean }> = {
  // The four the compiler keyed on another defender.
  drive: { low: 'W2', high: 'S2', role: 'hook', deep: false, danger: 'the safety over the dig' },
  pa_post_dig: { low: 'W1', high: 'S1', role: 'deep_free_safety', deep: true, danger: 'the hook defender under the dig' },
  smash: { low: 'S1', high: 'S2', role: 'corner', deep: false, danger: 'the half-field safety over the corner route' },
  corner_flat: { low: 'S2', high: 'S1', role: 'corner', deep: false, danger: 'the half-field safety over the corner route' },
  // PLAN_KEYS_2: concepts the compiler ran as pure orders, with their sourced keys.
  slant_flat: { low: 'S2', high: 'S1', role: 'curl_flat', deep: false, danger: 'the hook defender inside the slant' },     // Dunn, USA Football
  stick: { low: 'S3', high: 'S2', role: 'flat', deep: false, danger: 'the Mike inside the stick' },                         // Throw Deep; Wilhite (danger: the Mike; the vertical peeked pre-snap)
  fade_flat: { low: 'S2', high: 'S1', role: 'corner', deep: false, danger: 'the half-field safety over the fade' },         // Cover 2 beater
  double_slants: { low: 'S1', high: 'S2', role: 'hook', deep: false, danger: 'the next defender inside' },                // Galina, USA Football
  // The family rule for a two-receiver quick combination, as taught: read the front-side flat defender and throw away
  // from him, on the third step (Jenkins, "The Ten Basic Quarterback Reads"; USA Football, "Basic Knowledge About
  // Reads"). The cue is the set, not the low route's ready time.
  quick_outs: { low: 'S1', high: 'S2', role: 'flat', deep: false, danger: 'the corner over the out', onSet: true },
  hitch_out: { low: 'S2', high: 'S1', role: 'flat', deep: false, danger: 'the corner over the hitch', onSet: true },
  // PLAN_KEYS_3: coached keys the compiler had only derived from geometry, made explicit so a route-timing change cannot
  // remove them (with ROUTE_SHAPE the dig is ready on the first hitch and the compiler's geometry no longer picks one).
  // Dagger: the deep safety, the seam (high) clearing for the dig (low): "confirm that the deep safety has been
  // occupied" (Weekly Spiral, Dagger Concept; FirstDown PlayBook, Dagger reads); the compiler's own key on develop.
  dagger: { low: 'S1', high: 'S2', role: 'deep_defender_over_vertical', deep: true, danger: 'the hook defender under the dig' },
  // Levels: the hook defender, the dig (high) over the in under it (low): "if he drops toward the dig, the shallow route
  // opens underneath; if he squeezes the shallow route, the dig opens behind him" (Football Nation USA, Levels Concept).
  levels: { low: 'S2', high: 'S1', role: 'hook', deep: false, danger: 'the safety over the dig' },
};
/** PLAN_ROLES: coached keys and orders for the geometric concepts that sat within a yard of a compiler threshold
 * (docs/reviews/2026-11-15-plan-orders.md, sources there). A concept taught as a one-defender high-low is keyed on
 * that defender, as PLAN_KEYS does; "analogue" marks a concept with no source of its own, declared from the nearest
 * taught concept so it is easy to revisit. */
const ROLE_KEYS: Record<string, { low: ReceiverRef; high: ReceiverRef; role: string; deep: boolean; danger: string; onSet?: boolean }> = {
  // Hitch-cross runs Drive's shallow-under-cross on the Mike: the shallow is the primary, the deeper cross the answer
  // when the Mike jumps it (Throw Deep, Drive: go peek, shallow, the deeper cross, then the back).
  hitch_cross: { low: 'W2', high: 'S2', role: 'hook', deep: false, danger: 'the safety over the cross' },
  // PA shot is a Yankee-style post over a dig, on the free safety: "If the FS plays low, he can throw the post. If he
  // sinks deep ... dig" (Throw Deep, Yankee; USA Football).
  pa_shot: { low: 'W2', high: 'S2', role: 'deep_free_safety', deep: true, danger: 'the hook defender under the dig' },
  // Analogue: double outs read as the go-out high-low on the curl-flat defender (its own read line: he drops under #1,
  // the #2 quick out; he jumps #2, the #1 out behind him).
  double_outs: { low: 'S2', high: 'S1', role: 'curl_flat', deep: false, danger: 'the corner over the out' },
  // Analogue: seam-slant read like double slants on the hook defender inside #2 (its own read line: he widens to the
  // slant, the #3 hitch; he stays inside, the #2 slant).
  seam_slant: { low: 'S3', high: 'S2', role: 'hook', deep: false, danger: 'the next defender inside the slant' },
};
/** PLAN_ROLES: a declared pure order. Analogue: comebacks keeps its authored progression (Walsh times the comeback to
 * the hitch step, "only when DB is turning and running away", and gives no order). */
const ROLE_ORDER: Record<string, ReceiverRef[]> = { comebacks: ['S1', 'W1', 'S2'] };
/** PLAN_ROLES: a half-field read whose back is read after the key pair, before the backside: curl-flat, "No. 1
 * receiver to No. 2 receiver to running back" (Hewitt, USA Football). */
const BACK_AFTER_KEY = new Set(['curl_flat']);
/** The danger on the keys the compiler already names correctly (PLAN_KEYS adds it; the key itself is unchanged). */
const DANGER: Record<string, string> = {
  curl_flat: 'the hook defender walling the curl', dagger: 'the hook defender under the dig',
  four_verts: 'the corner over the go when the safety takes the seam',
};
const INSTALL_ORDER: Record<string, ReceiverRef[]> = {
  mesh: ['S1', 'S2', 'W2'],
  y_cross: ['W1', 'S2', 'S3'],
  pa_flood: ['S2', 'W1', 'S3'],
};

export interface InstalledPlan {
  style: PlanStyle;
  /** Field reads in order (the start side through, then the other side). */
  order: ReceiverRef[];
  outlet: ReceiverRef | null;
  alert: ReceiverRef | null;
  /** Defender key: read the defender between `low` and `high` at `cueBy` s after the snap. */
  key: { low: ReceiverRef; high: ReceiverRef; role: string; cueBy: number; danger?: string } | null;
  /** Triangle: three routes read as one picture, top-down; vertical peek: the verticals as one look, then the back. */
  triangle: ReceiverRef[] | null;
  /** The rhythm each read is installed on, for the QB lane's acceptance rule (data only; nothing reads it yet). The
   * coached default by place: read 1 on the last step of the drop ('set'), read 2 on a hitch ('hitch', one beat on),
   * later reads and the outlet on the second hitch ('hitch2') (Gonzalez via Smart Football; Hewitt, USA Football).
   * `at` is that step's time after the snap (the plan's QB set plus a beat a step); `ready` is when his route is
   * first a throw as installed (the compiler's window), and `onTime` whether it is ready by its step. A read that is
   * not on time is the concept's or the drop's question, not a wait (the table's rhythm column). */
  rhythm: { ref: ReceiverRef; step: 'set' | 'hitch' | 'hitch2'; at: number; ready: number; onTime: boolean }[];
  /** The plan's QB set (s after the snap) that `rhythm`'s step times count from (data; the QB lane's QB_FOOTWORK anchors
   * the same offsets on his own set). */
  rhythmSet?: number;
  /** DECLARED_BREAK: per read, the route's declared break as installed (route time from this compile's sample of the
   * installed route, never a live play), its throw family, and the plan's anchor lead. The quarterback lane's
   * `leadFor(passer, throwFamily, route)` replaces the anchor with his own lead when a read is checked; the throwing
   * motion is theirs. Absent with the flag off. */
  reads?: { ref: ReceiverRef; breakAt: number | null; throwFamily: 'onBreak' | 'seenOpen'; anchorLead: number }[];
}

const cache = new Map<string, InstalledPlan | null>();
let compiling = 0;
let teams: { off: Team; def: Team } | null = null;

/** True while a plan is being compiled: the sampling sim's own quarterback must not compile one in turn. */
export function compilingPlan(): boolean { return compiling > 0; }

/** The installed plan for a concept from a formation (either flip: the plan is symmetric), or null for a screen, for
 * a formation that is not registered, or when nothing compiles. */
export function installedPlan(concept: PassConcept, formationId: string): InstalledPlan | null {
  if (concept.family === 'screen' || concept.screen) return null;
  // A formation built for one play (a lab or stress scene) is not in the registry the on-air rep is run from: nothing
  // was installed for it, so he runs the play without a plan.
  if (!FORMATION_BY_ID[formationId]) return null;
  const key = `${OUTLET_LAST ? 1 : 0}${PLAN_KEYS ? 1 : 0}${PLAN_ROLES ? 1 : 0}${PLAN_KEYS_2 ? 1 : 0}${PLAN_KEYS_3 ? 1 : 0}${DECLARED_BREAK ? 1 : 0}|${formationId}|${concept.id}|${concept.drop}|${JSON.stringify(concept.strong)}|${JSON.stringify(concept.weak)}|${concept.back}|${concept.teBlock ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key)!;
  teams ??= { off: generateTeam(new Rng(41), 'O', 'O', { strength: 0.6 }), def: generateTeam(new Rng(42), 'D', 'D', { strength: 0.6 }) };
  compiling++;
  let plan: InstalledPlan | null = null;
  try {
    const compiled = compile(concept, formationId, false, teams.off, teams.def), c = compiled.chosen;
    if (c) {
      plan = {
        style: c.style, order: c.order.map((s) => s.ref), outlet: c.outlet, alert: c.alert ?? null,
        key: c.key?.low && c.key.high ? { low: c.key.low, high: c.key.high, role: c.key.role, cueBy: c.key.cueBy } : null,
        triangle: c.triangle ?? null, rhythm: [],
      };
      const routes = new Map(compiled.routes.map((r) => [r.ref, r]));
      // PLAN_KEYS: the coached key, its cue at the top of the drop when the low route is first a throw (the
      // compiler's own rule: at the set, or 0.2 s before the low route is ready); the pair leads the order.
      let k = PLAN_KEYS && (PLAN_KEYS_2 || !SECOND_KEYS.has(concept.id)) && (PLAN_KEYS_3 || !THIRD_KEYS.has(concept.id)) ? KEYS[concept.id] ?? (PLAN_ROLES ? ROLE_KEYS[concept.id] : undefined) : undefined;
      // PLAN_ROLES: a key is the coached pair of routes, so it holds in every formation: its refs are resolved by the
      // routes the concept installs at them (S1 -> strong 1, W2 -> weak 2, B -> the back), preferring the same side.
      if (k && PLAN_ROLES) {
        const routeAt = (ref: string) => ref === 'B' ? concept.back : ref[0] === 'S' ? (concept.strong as any)[ref.slice(1)] : (concept.weak as any)[ref.slice(1)];
        const find = (ref: string) => { const id = routeAt(ref); const R = compiled.routes.filter((r) => r.routeId === id);
          return (R.find((r) => r.ref === ref) ?? R.find((r) => r.ref[0] === ref[0]) ?? R[0])?.ref; };
        const low = find(k.low), high = find(k.high);
        if (low && high && low !== high) k = { ...k, low: low as ReceiverRef, high: high as ReceiverRef };
      }
      const lo = k && routes.get(k.low), hi = k && routes.get(k.high);
      if (k && lo && hi) {
        const cueBy = +(k.onSet ? compiled.qbSetAt : k.deep ? Math.max(compiled.qbSetAt, lo.window.ready - 0.2) : Math.max(compiled.qbSetAt - 0.3, lo.window.ready - 0.2)).toFixed(2);
        plan = { ...plan, style: 'defender_key', key: { low: k.low, high: k.high, role: k.role, cueBy, danger: k.danger }, triangle: null,
          order: [k.high, k.low, ...plan.order.filter((r) => r !== k.high && r !== k.low)] };
      }
      if (PLAN_KEYS && plan.key && !plan.key.danger && DANGER[concept.id]) plan = { ...plan, key: { ...plan.key, danger: DANGER[concept.id] } };
      // PLAN_KEYS: one named install where the sources disagree (a pure order: his eyes go in this order).
      const io = PLAN_KEYS ? (INSTALL_ORDER[concept.id] ?? (PLAN_ROLES ? ROLE_ORDER[concept.id] : undefined))?.filter((r) => routes.has(r)) : undefined;
      if (io?.length) plan = { ...plan, style: 'pure', key: null, triangle: null, alert: null,
        order: [...io, ...plan.order.filter((r) => !io.includes(r))] };
      // OUTLET_LAST: the outlet leaves the field order; initPlan reads him after everyone else.
      if (OUTLET_LAST && plan.outlet) plan = { ...plan, order: plan.order.filter((r) => r !== plan!.outlet) };
      // PLAN_ROLES: a half-field read's back comes after the key pair, ahead of the backside.
      if (PLAN_ROLES && plan.outlet && plan.key && BACK_AFTER_KEY.has(concept.id)) {
        const front = plan.order.filter((r) => r === plan!.key!.low || r === plan!.key!.high);
        plan = { ...plan, order: [...front, plan.outlet, ...plan.order.filter((r) => !front.includes(r) && r !== plan!.outlet)] };
      }
      // The rhythm (see InstalledPlan.rhythm): the coached step by place, and when his route is ready as installed.
      // CONCEPT_DROPS: the five- and seven-step class reads its first answer on the hitch, and its hitch is the NFL's
      // set-to-release at that depth ("five and a hitch": set 2.2 s, ball out 3.0, QB lane's drop-time.py), not the
      // quick game's beat.
      const fiveStep = CONCEPT_DROPS_RHYTHM && (concept.drop === 'five' || concept.drop === 'five_deep' || concept.drop === 'seven');
      const set = compiled.qbSetAt, steps = ['set', 'hitch', 'hitch2'] as const;
      const seq = [...plan.order, ...(plan.outlet && !plan.order.includes(plan.outlet) ? [plan.outlet] : [])];
      const stepAt = (st: typeof steps[number]) => st === 'set' ? set : st === 'hitch' ? set + (fiveStep ? FIVE_STEP_BEAT : RHYTHM_BEAT)
        : set + (fiveStep ? FIVE_STEP_BEAT : RHYTHM_BEAT) + RHYTHM_BEAT;
      plan.rhythmSet = set;
      plan.rhythm = seq.map((ref, i) => {
        const step = ref === plan!.outlet ? 'hitch2' : steps[Math.min(fiveStep ? i + 1 : i, 2)];
        const at = +stepAt(step).toFixed(2);
        const ready = +(routes.get(ref)?.window.ready ?? set).toFixed(2);
        return { ref, step, at, ready, onTime: ready <= at + 1e-9 };
      });
      const decl = seq.map((ref) => ({ ref, d: routes.get(ref)?.declaredBreak })).filter((x) => x.d);
      if (decl.length) plan.reads = decl.map(({ ref, d }) => ({ ref, breakAt: d!.t, throwFamily: d!.throwFamily, anchorLead: d!.anchorLead }));
    }
  } finally {
    compiling--;
  }
  cache.set(key, plan);
  return plan;
}

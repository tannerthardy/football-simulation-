/**
 * Candidate read plans (§10) and their scoring (§11), deterministic for identical inputs. Pure progression is
 * always generated (the mandatory fallback); a pre-snap alert, a defender key and a half-field split only where
 * a motif supports them. The default profile leans pure (§17). Phase 0: nothing executes these.
 */
import type { ReceiverRef } from '../types.js';
import type { Candidate, Motif, ReadStep, RouteDescriptor } from './types.js';
import { afterBreak } from './motifs.js';
/** PLAN_ROLES (experimental, off; compile.ts CLEAR_OUTS): declared clear-outs are not read as the high of a high-low. */
export const PLAN_ROLES = process.env.PLAN_ROLES === '1';

/** A coach's preference for each plan style, added to the shared plan-quality score (log-odds-like priors; the
 * weights are engine calibration, not NFL numbers). The default leans pure (§17): an alert, key or half-field plan
 * is chosen only where the routes support it more than the prior costs. */
export interface CoachProfile { id: string; pure: number; alert: number; key: number; halfField: number; maxReads: number }
export const DEFAULT_PROFILE: CoachProfile = { id: 'pure-leaning', pure: 0, alert: -0.3, key: -0.9, halfField: -1.0, maxReads: 4 };

const rhythm = (ready: number, qbSet: number): ReadStep['rhythm'] =>
  ready <= qbSet + 0.05 ? 'drop' : ready <= qbSet + 0.4 ? 'hitch1' : ready <= qbSet + 0.8 ? 'hitch2' : 'late';
const step = (r: RouteDescriptor, qbSet: number): ReadStep => ({ ref: r.ref, rhythm: rhythm(r.window.ready, qbSet), window: [r.window.ready, r.window.last] });
/** A stable tie-break that does not depend on input order: the receiver number. */
const refKey = (r: RouteDescriptor) => r.ref;

/**
 * Pure progression: a bounded beam search over orders of up to four early reads. A read must be live when the
 * QB gets to it (its window open, not expired); a deep route that only clears for a shorter one under it is not an
 * early read; ties go to the earlier window, then the receiver number.
 *
 * Two coached rules shape it (HonestNFL, docs/reviews/2026-11-11-read-compiler-phase0.md addendum):
 * - Finish the side: the start side is read through, then the other side; the eyes do not come back (036, 035,
 *   037, 107). A look across the field first is only an alert (see `select`).
 * - The primary: within one beat of the earliest answer on the start side, a route that breaks is read before
 *   one that settles (295, 224, 143, 142: the settling route is the reset, not the start).
 */
export const BEAT = 0.4;
/** BACK_FRONT (experimental, off; BACK_FRONT=1 turns it on): the back is read with the start (front) side at his
 * window, the reset after the front side's reads, instead of on the side he releases to. Off, a back releasing to
 * the other side is read after the whole start side (often fourth or fifth), out and open but unread on about a
 * quarter of drop-backs (docs/reviews/2026-11-11-read-compiler-phase1.md). */
const BACK_FRONT = process.env.BACK_FRONT !== '0';
function pure(routes: RouteDescriptor[], motifs: Motif[], qbSet: number, maxReads: number): { order: ReadStep[]; outlet: ReceiverRef | null; warnings: string[]; score: number } {
  const warnings: string[] = [];
  const clearers = new Set(motifs.filter((m) => m.kind === 'clearout').map((m) => m.refs[0]));
  const outletR = routes.filter((r) => r.isBack && r.window.ready < 3.5).sort((a, b) => a.window.ready - b.window.ready)[0] ?? null;
  // The back is a read like any route (HonestNFL 224: stick-flat-back on one side; 107, 133: finish to the back),
  // placed by his window on the side he releases to; he is also the outlet a pressured QB comes off the plan to.
  const sideOf = new Map<RouteDescriptor, 'S' | 'W' | 'B'>(routes.map((r) => [r, r.side]));
  if (outletR) {
    const at = outletR.trajectory.reduce((b, p) => Math.abs(p.t - outletR.window.ready) < Math.abs(b.t - outletR.window.ready) ? p : b);
    // BACK_FRONT: he is read with the front side, the reset after its reads, before the eyes cross (HonestNFL 133,
    // 166, 172, 173: shallow or basic, then the back; 107: post or deep cross, shallow, then the back).
    sideOf.set(outletR, BACK_FRONT ? startSideOf(routes) : at.y >= 0 ? 'S' : 'W');
  }
  const side = (r: RouteDescriptor) => sideOf.get(r)!;
  const field = [...routes.filter((r) => !r.isBack), ...(outletR ? [outletR] : [])]
    .sort((a, b) => a.window.ready - b.window.ready || refKey(a).localeCompare(refKey(b)));
  maxReads += outletR ? 1 : 0;
  type Node = { seq: RouteDescriptor[]; t: number; cost: number };
  const LOOK = 0.35;  // a look: eyes on, decide, move on (s); crossing the field adds a reset
  const startSide = startSideOf(routes);
  const startRoutes = field.filter((r) => side(r) === startSide);
  const firstReady = Math.min(...startRoutes.map((r) => r.window.ready));
  const breakerInBeat = startRoutes.some((r) => !r.isBack && !r.settles && r.window.ready <= firstReady + BEAT);
  let beam: Node[] = [{ seq: [], t: qbSet - 0.15, cost: 0 }];
  for (let depth = 0; depth < Math.min(maxReads, field.length); depth++) {
    const next: Node[] = [];
    for (const n of beam) for (const r of field) {
      if (n.seq.includes(r)) continue;
      const prev = n.seq[n.seq.length - 1];
      // Finish the side: start there, and once the eyes leave a side they do not come back to it.
      if (!prev && startRoutes.length && side(r) !== startSide) continue;
      if (prev && side(prev) !== side(r) && n.seq.some((x) => side(x) === side(r))) continue;
      if (prev && side(prev) !== side(r) && startRoutes.some((x) => !n.seq.includes(x) && side(x) === side(prev) && x.window.last > n.t + LOOK)) continue;
      const across = prev && side(prev) !== side(r) ? 0.6 : 0;
      const at = Math.max(n.t + (prev ? LOOK : 0), r.window.ready);
      // Waiting on a route that is still developing is cheap while the eyes stay on his side (the rhythm of
      // the drop and hitch); a read reached after his window closes is dead.
      let cost = n.cost + 0.3 * Math.max(0, at - n.t - (prev ? LOOK : 0)) + across;
      if (at > r.window.last) cost += 1.5;
      if (clearers.has(r.ref) && depth < 2) cost += 0.6;               // a clear-out is not an early read
      // PLAN_ROLES: a declared clear-out is read after the route he clears for, at any depth of the order.
      if (PLAN_ROLES && motifs.some((m) => m.kind === 'clearout' && m.why.includes('declared') && m.refs[0] === r.ref && !n.seq.some((x) => x.ref === m.refs[1]))) cost += 1.0;
      if (!prev && r.window.ready > qbSet + 0.9) cost += 0.5;           // nor is a route that comes open late
      if (!prev && r.settles && breakerInBeat) cost += 1.0;             // the breaking route is the primary
      // High-low within a side (the default profile): the deeper route first, then down (§10 B: the coach's
      // ordering among feasible sequences).
      // PLAN_ROLES: a clear-out is not the high of a high-low (he clears; he is not the deep read first).
      if (prev && side(prev) === side(r) && r.depthAtReady > prev.depthAtReady + 2 && !(PLAN_ROLES && clearers.has(r.ref))) cost += 0.35;
      next.push({ seq: [...n.seq, r], t: at, cost });
    }
    if (!next.length) break;
    next.sort((a, b) => a.cost - b.cost || a.seq.map(refKey).join().localeCompare(b.seq.map(refKey).join()));
    beam = next.slice(0, 24);
  }
  const best = beam[0];
  for (const [i, r] of best.seq.entries()) {
    const at = best.seq.slice(0, i + 1).reduce((t, x, k) => Math.max(t + (k ? LOOK : 0), x.window.ready), qbSet - 0.15);
    if (at > r.window.last) warnings.push(`${r.ref} expired before the read reaches him (${at.toFixed(2)} > ${r.window.last} s)`);
  }
  return { order: best.seq.map((r) => step(r, qbSet)), outlet: outletR?.ref ?? null, warnings, score: -best.cost };
}

/** The side the read starts on: the side with more route runners (the side the concept is built to), the strength
 * on a tie. */
export function startSideOf(routes: RouteDescriptor[]): 'S' | 'W' {
  const n = (s: 'S' | 'W') => routes.filter((r) => !r.isBack && r.side === s).length;
  return n('W') > n('S') ? 'W' : 'S';
}

export function candidates(routes: RouteDescriptor[], motifs: Motif[], qbSet: number, profile: CoachProfile = DEFAULT_PROFILE): Candidate[] {
  const out: Candidate[] = [];
  const P = pure(routes, motifs, qbSet, profile.maxReads);
  const base = (style: Candidate['style']): Candidate => ({ style, order: P.order, outlet: P.outlet, valid: true, hardFailures: [], warnings: [...P.warnings], score: 0, rationale: [] });
  // A. Pure progression (mandatory).
  const pc = base('pure');
  pc.score = profile.pure + P.score;
  pc.rationale.push('rhythm-ordered pure progression');
  if (!P.order.length) { pc.valid = false; pc.hardFailures.push('no eligible receiver'); }
  out.push(pc);
  // E. Alert: an isolated quick route that is a throw before the QB is set.
  const iso = motifs.filter((m) => m.kind === 'isolation').map((m) => routes.find((r) => r.ref === m.refs[0])!);
  for (const r of iso) {
    const c = base('pure_with_alert');
    c.alert = r.ref;
    const quick = r.window.ready <= qbSet + 0.1 && r.depthAtReady < 10;
    const vert = afterBreak(r).down > 1.5 && r.depthAtReady >= 10;
    if (!quick && !vert) { c.valid = false; c.hardFailures.push(`${r.ref} isolated but neither quick (ready ${r.window.ready} s, ${r.depthAtReady} yd) nor a vertical access throw`); }
    c.score = profile.alert + P.score + (c.valid ? 0.35 : 0);
    c.rationale.push(`pre-snap alert on isolated ${r.ref} (${quick ? 'quick access' : 'vertical access'}), then the pure order`);
    out.push(c);
  }
  // C. Defender key: a high-low or horizontal stretch on one role, the cue visible before the windows close.
  for (const m of motifs.filter((m) => m.kind === 'vertical_high_low' || m.kind === 'horizontal_stretch' || m.kind === 'smash' || m.kind === 'cross_post')) {
    const [a, b] = m.refs.map((ref) => routes.find((r) => r.ref === ref)!);
    const c = base('defender_key');
    const cueBy = Math.min(a.window.ready, b.window.ready) - 0.1;
    c.key = { role: m.role ?? 'unknown', onCue: b.ref, otherwise: a.ref, cueBy: +cueBy.toFixed(2) };
    if (!m.role) { c.valid = false; c.hardFailures.push('no defender role named for the pair'); }
    if (cueBy < qbSet - 0.6) { c.valid = false; c.hardFailures.push(`cue needed at ${cueBy.toFixed(2)} s, before the QB can look (${qbSet} s)`); }
    if (Math.min(a.window.last, b.window.last) - Math.max(a.window.ready, b.window.ready) < 0.25) { c.valid = false; c.hardFailures.push('the two answers are not live together long enough to choose'); }
    c.score = profile.key + P.score + 0.4 * m.confidence;
    c.rationale.push(`${m.kind} on ${m.role}: ${m.why}`);
    out.push(c);
  }
  // D. Half-field: two independent halves, each with an early target and a supporting answer.
  const half = (s: 'S' | 'W') => routes.filter((r) => r.side === s && r.window.ready < qbSet + 0.6).sort((x, y) => x.window.ready - y.window.ready);
  const hs = half('S'), hw = half('W');
  const hc = base('half_field');
  hc.halves = { strong: hs.map((r) => r.ref), weak: hw.map((r) => r.ref) };
  if (hs.length < 2 || hw.length < 2) { hc.valid = false; hc.hardFailures.push(`a half lacks two early answers (strong ${hs.length}, weak ${hw.length})`); }
  if (hs.some((r) => r.crossesField) || hw.some((r) => r.crossesField)) hc.warnings.push('a crosser changes halves during the read');
  hc.score = profile.halfField + P.score;
  hc.rationale.push('pick a side from the pre-snap shell, then that half in order');
  out.push(hc);
  return out.sort((x, y) => Number(y.valid) - Number(x.valid) || y.score - x.score);
}

const isVertical = (r: RouteDescriptor) => { const d = afterBreak(r); return d.down > 1.5 && Math.abs(d.out) < 0.6 * d.down; };
const live = (a: RouteDescriptor, b: RouteDescriptor) => Math.min(a.window.last, b.window.last) - Math.max(a.window.ready, b.window.ready);

/**
 * Phase 1 plan selection: structural rules, no concept names and no style priors (the Phase 0 audit's scores rank
 * the remaining candidates). In order:
 * 1. Defender key. On the start side, a high-low on one defender whose low route is ready on rhythm (within a beat
 *    of the set) before the high route declares (0.5 s or more later), the high route a breaking route (not a
 *    clear-out, not a straight vertical), the two live together 0.4 s or more: by rhythm the QB would throw the low
 *    route before the high one had declared, so only a key on the defender between them keeps the high route an
 *    option. Or a clear-and-void pair (the vertical takes the deep defender, the in-breaker comes under him).
 * 2. Vertical peek: two or more verticals on the start side and a released back: one look at the verticals as a
 *    picture, then the back (001, 112).
 * 2b. Triangle: three routes on the start side read as one picture (HonestNFL 123, 340, the Tampa family, mesh).
 * 3. Alert: an isolated vertical on the other side, a yes/no look at the set before the start side (307, 141).
 * 4. Pure progression otherwise.
 */
export function select(routes: RouteDescriptor[], motifs: Motif[], qbSet: number, profile: CoachProfile = DEFAULT_PROFILE): Candidate {
  const P = pure(routes, motifs, qbSet, profile.maxReads);
  const R = new Map(routes.map((r) => [r.ref, r]));
  const side = startSideOf(routes);
  const clearers = new Set(motifs.filter((m) => m.kind === 'clearout').map((m) => m.refs[0]));
  const plan = (style: Candidate['style'], why: string): Candidate =>
    ({ style, order: P.order, outlet: P.outlet, valid: P.order.length > 0, hardFailures: P.order.length ? [] : ['no eligible receiver'], warnings: [...P.warnings], score: P.score, rationale: [why] });
  // With the plan's first reads moved to the front, the rest of the pure order after them.
  const lead = (c: Candidate, refs: ReceiverRef[]) => {
    const first = refs.map((ref) => P.order.find((s) => s.ref === ref) ?? step(R.get(ref)!, qbSet));
    c.order = [...first, ...P.order.filter((s) => !refs.includes(s.ref))];
    return c;
  };
  // 1. Key.
  type Pair = { lo: RouteDescriptor; hi: RouteDescriptor; role: string; why: string; cueBy: number };
  const pairs: Pair[] = [];
  for (const m of motifs) {
    if (m.kind !== 'vertical_high_low' && m.kind !== 'smash' && m.kind !== 'clear_void') continue;
    const lo = R.get(m.refs[0]), hi = R.get(m.refs[1]);
    if (!lo || !hi || lo.isBack || hi.isBack) continue;
    if (m.kind === 'clear_void') {
      if (hi.side !== side && lo.side !== side) continue;
      pairs.push({ lo, hi, role: m.role ?? 'deep_defender_over_vertical', why: `clear and void: ${m.why}`, cueBy: +Math.max(qbSet, lo.window.ready - 0.2).toFixed(2) });
      continue;
    }
    if (lo.side !== side || hi.side !== side || lo.crossesField) continue;
    if (lo.window.ready > qbSet + BEAT || hi.breakT === null || clearers.has(hi.ref)) continue;
    if (hi.window.ready - lo.window.ready < 0.5 || live(lo, hi) < 0.4) continue;
    // The key is read at the top of the drop, when the low route is first a throw (HonestNFL 135: gathered during
    // the drop, decided on the platform): sinking gives the low route on rhythm, squatting holds it for the high.
    pairs.push({ lo, hi, role: m.role ?? 'unknown', why: `high-low on the ${m.role}: ${m.why}`, cueBy: +Math.max(qbSet - 0.3, lo.window.ready - 0.2).toFixed(2) });
  }
  pairs.sort((a, b) => a.lo.window.ready - b.lo.window.ready || a.lo.ref.localeCompare(b.lo.ref) || a.hi.ref.localeCompare(b.hi.ref));
  if (pairs.length) {
    const k = pairs[0];
    const c = lead(plan('defender_key', k.why), [k.lo.ref, k.hi.ref]);
    c.key = { role: k.role, onCue: k.hi.ref, otherwise: k.lo.ref, cueBy: k.cueBy, low: k.lo.ref, high: k.hi.ref };
    return c;
  }
  // 2. Vertical peek: two or more verticals on the start side and a released back. The verticals are read as one
  // picture, inside-out off the deep defenders' squeeze, one look; then the back (HonestNFL 001: the seam away from
  // the rotation, the go, reset to the back; 112: verticals, else the back; 150, 327).
  const back = routes.find((r) => r.isBack && r.window.ready < 3.5);
  const verts = routes.filter((r) => !r.isBack && r.side === side && isVertical(r) && r.depthAtReady >= 10 && !r.settles)
    .sort((a, b) => Math.abs(a.startWidth) - Math.abs(b.startWidth) || refKey(a).localeCompare(refKey(b)));
  if (back && verts.length >= 2) {
    const c = lead(plan('vertical_peek', `verticals ${verts.map((r) => r.ref).join('-')} as one look, inside-out, then the back ${back.ref}`), [...verts.map((r) => r.ref), back.ref]);
    c.triangle = verts.map((r) => r.ref);
    return c;
  }
  // 3. Triangle on the start side, all three answers early enough to be one picture.
  const tri = motifs.filter((m) => m.kind === 'triangle').map((m) => m.refs.map((ref) => R.get(ref)!))
    .filter((T) => T.filter((r) => r.side === side).length >= 2 && T.every((r) => r.window.ready <= qbSet + 0.9 && !r.isBack))
    // PLAN_ROLES: a declared clear-out clears; he is not part of the picture the triangle reads top-down.
    .filter((T) => !(PLAN_ROLES && T.some((r) => motifs.some((m) => m.kind === 'clearout' && m.why.includes('declared') && m.refs[0] === r.ref))))
    .sort((a, b) => Math.max(...a.map((r) => r.window.ready)) - Math.max(...b.map((r) => r.window.ready)) || a.map(refKey).join().localeCompare(b.map(refKey).join()));
  if (tri.length) {
    // Top-down: the deepest at his window first (123, 036: corner, then the middle route, then the flat).
    const T = [...tri[0]].sort((a, b) => b.depthAtReady - a.depthAtReady || refKey(a).localeCompare(refKey(b)));
    const c = lead(plan('triangle', `triangle ${T.map((r) => r.ref).join('-')}: read as one picture, top-down`), T.map((r) => r.ref));
    c.triangle = T.map((r) => r.ref);
    return c;
  }
  // 3. Alert: an isolated vertical away from the start side.
  const iso = motifs.filter((m) => m.kind === 'isolation').map((m) => R.get(m.refs[0])!)
    .filter((r) => r.side !== side && isVertical(r) && r.depthAtReady >= 10 && !r.settles);
  if (iso.length) {
    const c = plan('pure_with_alert', `yes/no alert on the isolated vertical ${iso[0].ref}, then the start side`);
    c.alert = iso[0].ref;
    return c;
  }
  return plan('pure', 'pure progression: start side through, then the other side');
}

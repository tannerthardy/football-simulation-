/**
 * Candidate read plans (§10) and their scoring (§11), deterministic for identical inputs. Pure progression is
 * always generated (the mandatory fallback); a pre-snap alert, a defender key and a half-field split only where
 * a motif supports them. The default profile leans pure (§17). Phase 0: nothing executes these.
 */
import type { ReceiverRef } from '../types.js';
import type { Candidate, Motif, ReadStep, RouteDescriptor } from './types.js';
import { afterBreak } from './motifs.js';

export interface CoachProfile { id: string; pure: number; alert: number; key: number; halfField: number; maxReads: number }
export const DEFAULT_PROFILE: CoachProfile = { id: 'pure-leaning', pure: 1.0, alert: 0.35, key: 0.25, halfField: 0.2, maxReads: 4 };

const rhythm = (ready: number, qbSet: number): ReadStep['rhythm'] =>
  ready <= qbSet + 0.05 ? 'drop' : ready <= qbSet + 0.4 ? 'hitch1' : ready <= qbSet + 0.8 ? 'hitch2' : 'late';
const step = (r: RouteDescriptor, qbSet: number): ReadStep => ({ ref: r.ref, rhythm: rhythm(r.window.ready, qbSet), window: [r.window.ready, r.window.last] });
/** A stable tie-break that does not depend on input order: the receiver number. */
const refKey = (r: RouteDescriptor) => r.ref;

/**
 * Pure progression: a bounded beam search over orders of up to four early reads. A read must be live when the
 * QB gets to it (its window open, not expired); eye movement across the field costs time; a deep route that only
 * clears for a shorter one under it is not an early read; ties go to the earlier window, then the receiver number.
 */
function pure(routes: RouteDescriptor[], motifs: Motif[], qbSet: number, maxReads: number): { order: ReadStep[]; outlet: ReceiverRef | null; warnings: string[]; score: number } {
  const warnings: string[] = [];
  const clearers = new Set(motifs.filter((m) => m.kind === 'clearout').map((m) => m.refs[0]));
  const field = routes.filter((r) => !r.isBack).sort((a, b) => a.window.ready - b.window.ready || refKey(a).localeCompare(refKey(b)));
  const outletR = routes.filter((r) => r.isBack && r.window.ready < 3.5).sort((a, b) => a.window.ready - b.window.ready)[0] ?? null;
  type Node = { seq: RouteDescriptor[]; t: number; cost: number };
  const LOOK = 0.35;  // a look: eyes on, decide, move on (s); crossing the field adds a reset
  let beam: Node[] = [{ seq: [], t: qbSet - 0.15, cost: 0 }];
  for (let depth = 0; depth < Math.min(maxReads, field.length); depth++) {
    const next: Node[] = [];
    for (const n of beam) for (const r of field) {
      if (n.seq.includes(r)) continue;
      const prev = n.seq[n.seq.length - 1];
      const across = prev && Math.sign(prev.startWidth) !== Math.sign(r.startWidth) ? 0.2 : 0;
      const at = Math.max(n.t + (prev ? LOOK + across : 0), r.window.ready);
      let cost = n.cost + (at - n.t) + across;
      if (at > r.window.last) cost += 1.5;            // dead when reached
      if (clearers.has(r.ref) && depth < 2) cost += 0.6; // a clear-out is not an early read
      cost += 0.05 * depth * (r.window.ready - qbSet < 0 ? 0 : 1);
      next.push({ seq: [...n.seq, r], t: at, cost });
    }
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

export function candidates(routes: RouteDescriptor[], motifs: Motif[], qbSet: number, profile: CoachProfile = DEFAULT_PROFILE): Candidate[] {
  const out: Candidate[] = [];
  const P = pure(routes, motifs, qbSet, profile.maxReads);
  const base = (style: Candidate['style']): Candidate => ({ style, order: P.order, outlet: P.outlet, valid: true, hardFailures: [], warnings: [...P.warnings], score: 0, rationale: [] });
  // A. Pure progression (mandatory).
  const pc = base('pure');
  pc.score = profile.pure * (3 + P.score);
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
    c.score = profile.alert * (3 + P.score) + (c.valid ? 0.3 : 0);
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
    c.score = profile.key * (3 + P.score) + m.confidence * 0.5;
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
  hc.score = profile.halfField * (3 + P.score);
  hc.rationale.push('pick a side from the pre-snap shell, then that half in order');
  out.push(hc);
  return out.sort((x, y) => Number(y.valid) - Number(x.valid) || y.score - x.score);
}

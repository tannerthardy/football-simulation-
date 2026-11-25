/**
 * QB_V2 module C: the look (QB lane, 2026-11-24; docs/reviews/2026-11-24-qb-v2-design.md §1). One look at a time, on a
 * receiver or a key defender. A look resolves while its target is inside his clear cone:
 * res = 1 - exp(-dwell / tau), with dwell counted from when the cone took the target and resolution kept (never lost)
 * when his eyes leave: what he saw stays his. Tau is his processing as perception, given by the caller.
 */

/** What a look is on: a receiver (by its ref in the plan) or a key defender (by the coached role). */
export type LookTarget = { kind: 'receiver'; ref: string } | { kind: 'key'; role: string };

export const lookKey = (t: LookTarget): string => (t.kind === 'receiver' ? `r:${t.ref}` : `k:${t.role}`);

interface LookRecord { since: number | null; res: number; first: number | null; dueAt: number | null }

export class Looks {
  private recs = new Map<string, LookRecord>();
  /** The target his eyes are on now (null when on nothing the plan names: the drop, a scramble). */
  current: LookTarget | null = null;

  /** One tick: his eyes are on `target`; `inClear` whether his clear cone holds it now; `tau` his resolve time (s). */
  update(target: LookTarget | null, inClear: boolean, now: number, tau: number): void {
    for (const [k, r] of this.recs) if (!target || k !== lookKey(target)) r.since = null;
    this.current = target;
    if (!target) return;
    const k = lookKey(target), r = this.recs.get(k) ?? { since: null, res: 0, first: null, dueAt: null };
    this.recs.set(k, r);
    if (!inClear) { r.since = null; return; }
    if (r.since === null) r.since = now;
    if (r.first === null) r.first = now;
    r.res = Math.max(r.res, 1 - Math.exp(-(now - r.since) / Math.max(tau, 1e-3)));
  }

  /** How resolved his picture of this target is (0 to 1). */
  resolved(target: LookTarget): number { return this.recs.get(lookKey(target))?.res ?? 0; }

  /** Whether the look is resolving now (the target inside his clear cone this tick). */
  resolving(target: LookTarget): boolean { return this.recs.get(lookKey(target))?.since !== null && this.recs.has(lookKey(target)); }

  /** When the look's step came due (for a hold's bound); set once. */
  markDue(target: LookTarget, now: number): void { const r = this.recs.get(lookKey(target)); if (r && r.dueAt === null) r.dueAt = now; }
  dueAt(target: LookTarget): number | null { return this.recs.get(lookKey(target))?.dueAt ?? null; }
}

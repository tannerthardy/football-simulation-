/** The two derived views of a responsibility ledger. Both read the same records; neither adds a grade.
 * A missing fact stays null (never "failed"). docs/COMMAND_TRACE.md, "Responsibility ledger". */
import { LOAD_PRESENT, type LedgerData, type PlanState } from './responsibility-ledger.js';

export interface JobCensusRow {
  id: number;
  kind: 'combo' | 'direct';
  members: number[];
  /** The covered down defender, for combination jobs. */
  defender: number | null;
  /** The assigned second-level target the census follows. */
  backer: number;
  /** First change that released a member toward the assigned target (decision time), else null. */
  release: { t: number; actor: number } | null;
  /** First endpoint at which the members' summed hand force on the assigned target exceeded the load threshold. */
  firstMemberLoad: number | null;
  /** First carrier contact of any defender: its time and EVERY defender at that timestamp. Null if none occurred. */
  firstCarrierContact: { t: number; defenders: Array<number | null> } | null;
  /** The assigned target's own carrier-contact events (carrier_contact, hit, tackle_wrap, tackle). */
  targetCarrierContacts: Array<{ t: number; type: string }>;
  /** Null when either time is unknown. */
  loadByFirstContact: boolean | null;
  /** Factual stratum, not a success grade: L = a member loaded the assigned target; U = no member load but the
   * assigned target later contacted the carrier; ? = neither was recorded. */
  stratum: 'L' | 'U' | '?';
  /** The departing member's later responsibility changes (decision times), kept distinct. */
  responsibility: {
    actor: number | null;
    threatRereadAfterRelease: boolean;
    /** Targets the actor held, after the release, other than the assigned one, while still climbing. */
    otherClimbTargets: number[];
  };
}

/** The initial-job census: jobs frozen at the snap, followed by their facts. */
export function initialJobCensus(d: LedgerData): JobCensusRow[] {
  const events = d.play.carrierEvents;
  const firstT = events.length ? Math.min(...events.map(e => e.t)) : null;
  const firstCarrierContact = firstT === null ? null : { t: firstT, defenders: [...new Set(events.filter(e => e.t === firstT).map(e => e.defender))] };
  return d.initialJobs.map(job => {
    // A job's release: the member change that put a member on the assigned target as a climb.
    const rel = d.changes.find(c => job.members.includes(c.actor) && c.reason === 'combination-release'
      && c.after.kind === 'climb' && c.after.target === job.backer);
    const actor = rel ? rel.actor : job.kind === 'direct' ? job.members[0] : null;
    let firstMemberLoad: number | null = null;
    for (const t of new Set(d.rows.filter(r => job.members.includes(r.actor)).map(r => r.endpoint))) {
      const sum = d.rows.filter(r => r.endpoint === t && job.members.includes(r.actor))
        .reduce((s, r) => s + r.hands.filter(h => h.defender === job.backer).reduce((x, h) => x + h.magnitude, 0), 0);
      if (sum > LOAD_PRESENT) { firstMemberLoad = firstMemberLoad === null ? t : Math.min(firstMemberLoad, t); }
    }
    const targetCarrierContacts = events.filter(e => e.defender === job.backer).map(e => ({ t: e.t, type: e.type }));
    const stratum = firstMemberLoad !== null ? 'L' : targetCarrierContacts.length ? 'U' : '?';
    const start = rel ? rel.t : 0;
    const after = actor === null ? [] : d.changes.filter(c => c.actor === actor && c.t >= start);
    const spans = actor === null ? [] : planSpans(d, actor).filter(s => s.to > start);
    return { ...job, release: rel ? { t: rel.t, actor: rel.actor } : null, firstMemberLoad, firstCarrierContact,
      targetCarrierContacts,
      loadByFirstContact: firstMemberLoad === null || firstCarrierContact === null ? null : firstMemberLoad <= firstCarrierContact.t,
      stratum,
      responsibility: { actor, threatRereadAfterRelease: after.some(c => c.reason === 'threat-reread' && (rel ? c.t > rel.t : true)),
        otherClimbTargets: [...new Set(spans.filter(s => s.plan.kind === 'climb' && s.plan.target !== null && s.plan.target !== job.backer).map(s => s.plan.target!))] } };
  });
}

export interface DutySpan { from: number; to: number; plan: PlanState }

/** One blocker's current duty over time: the initial plan, then a new span at each recorded change's decision time. */
export function planSpans(d: LedgerData, actor: number): DutySpan[] {
  const initial = d.initialPlans.find(p => p.actor === actor);
  if (!initial) return [];
  const end = d.rows.length ? d.rows[d.rows.length - 1].endpoint : d.initialAt ?? 0;
  const spans: DutySpan[] = [];
  let from = d.initialAt ?? 0, plan = initial.plan;
  for (const c of d.changes.filter(x => x.actor === actor)) {
    // Same-time changes keep their chain as zero-length spans.
    spans.push({ from, to: Math.max(from, c.t), plan });
    from = Math.max(from, c.t); plan = c.after;
  }
  spans.push({ from, to: Math.max(from, end), plan });
  return spans;
}

/** The dynamic view: every blocker's duty spans, with the reason each one began. */
export function dutyTimeline(d: LedgerData): Array<{ actor: number; slot: string; spans: Array<DutySpan & { because: string }> }> {
  return d.initialPlans.map(({ actor }) => {
    const reasons = ['initial job', ...d.changes.filter(c => c.actor === actor).map(c => c.reason)];
    const spans = planSpans(d, actor);
    return { actor, slot: d.actors[actor].slot, spans: spans.map((s, i) => ({ ...s, because: reasons[i] ?? 'initial job' })) };
  });
}

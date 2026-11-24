/**
 * QB_V2 module E: the cycle (QB lane, 2026-11-24; docs/reviews/2026-11-24-qb-v2-design.md §3). One state machine on
 * one clock, his feet. This file is the decision logic only: it reads his senses through `CycleSenses` (his picture,
 * his felt rush, the judgment D) and returns an intent; the caller (QBPass under QB_V2) turns the intent into a
 * command with the kept mechanics (throw, pocket movement, throwaway). Nothing here reads the simulation.
 */
import type { PlanRead, QbReadPlan, ThrowOption } from './plan.js';
import { type LookTarget, Looks } from './look.js';

export type CycleState = 'presnap' | 'drop' | 'read' | 'throw' | 'structureOut' | 'escape';
export type PressureState = 'clean' | 'felt' | 'imminent' | 'contact';

/** What D returns for a candidate throw (the judgment), or null when he cannot judge it (not in his picture). */
export interface Judged { option: ThrowOption; P: number; risk: number; reachesSticks: boolean; /** Before its time (an on-break throw whose release would lead the break by more than his anticipation): not thrown yet. */ early?: boolean }

/** His senses as the cycle needs them (all from his own picture, felt rush and the judgment). */
export interface CycleSenses {
  now: number;
  /** When he plants (the snap plus the called drop's time: his set point) and his stride (one footwork step). */
  plantAt: number;
  stride: number;
  /** When his first read starts, if before the plant (QB_QUICK_DRIFT bit 2: from the secure, his eyes working on the
   * drift); later reads keep the step clock from the plant. Absent: the plant. */
  readFrom?: number;
  /** His felt rush, 0-1 (from the rush only; no timer). */
  felt: number;
  /** Whether his own position has him outside the pocket (with its margins, as THROWAWAY_FELT keeps them). */
  outside: boolean;
  /** Whether this look target is inside his clear cone now, and whether his head can still get it there (the turn). */
  inClear(t: LookTarget): boolean;
  canReach(t: LookTarget): boolean;
  /** His resolve time (s) and confidence need (0-1), from his ratings and felt rush (module C's inputs). */
  tau: number;
  need: number;
  /** His bar: completion belief to clear and risk he accepts, lowered by urgency. */
  bar: { P: number; risk: number };
  /** D: judge one candidate throw on his picture now. */
  judge(o: ThrowOption): Judged | null;
  /** For a key read: what the key (by role and side) is doing in his picture (null while he cannot tell). */
  keyCue(role: string, side: 'S' | 'W'): string | null;
  /** The side he sees an unblocked rusher coming from (his picture), or null. */
  hotSide: 'S' | 'W' | null;
}

/** What the cycle asks for this tick. */
export type Intent =
  | { kind: 'look'; target: LookTarget | null }
  | { kind: 'throw'; judged: Judged }
  | { kind: 'checkdown' }
  | { kind: 'move' }
  | { kind: 'escape' }
  | { kind: 'away' }
  /** Thrown at this receiver's feet to end the play (a covered read marked onCovered: 'kill'). */
  | { kind: 'kill'; ref: string }
  /** An RPO's key read answered no by the mesh deadline: give the ball to the back (Run Game's mesh). */
  | { kind: 'handoff' };

/** Pressure states' entry and exit on his felt rush (chosen: each exit well under its entry; `felt` as THROWAWAY_FELT). */
const PRESSURE: Array<{ s: PressureState; enter: number; exit: number }> = [
  { s: 'felt', enter: 0.6, exit: 0.4 },
  { s: 'imminent', enter: 0.85, exit: 0.7 },
];

export class Cycle {
  state: CycleState = 'presnap';
  readIdx = 0;
  /** Reads he has left (each left once). */
  readonly passed = new Set<number>();
  outPass = 0;
  pressure: PressureState = 'clean';
  decision: { intent: Intent; at: number } | null = null;
  readonly looks = new Looks();

  constructor(readonly plan: QbReadPlan, startRead = 0) { this.readIdx = startRead; }

  /** When step n lands (step 0 the plant, then one stride a hitch). */
  stepAt(s: CycleSenses, n: number): number { return s.plantAt + n * s.stride; }

  /** His pressure state from his felt rush, with entry and exit margins (each rung is kept until its exit). */
  private updatePressure(felt: number): void {
    let st: PressureState = 'clean';
    for (const p of PRESSURE) {
      const holding = this.pressure === p.s || (this.pressure === 'imminent' && p.s === 'felt');
      if (holding ? felt > p.exit : felt >= p.enter) st = p.s;
    }
    this.pressure = st;
  }

  /** The look target a read calls for. */
  private target(r: PlanRead): LookTarget { return r.look.kind === 'receiver' ? { kind: 'receiver', ref: r.look.ref } : { kind: 'key', role: `${r.look.side ?? 'S'}:${r.look.role}` }; }

  /** Throws of this read that clear his bar, in the taught order (a key's answer first), then the line to gain, then P. */
  private choose(s: CycleSenses, r: PlanRead): Judged | null {
    const cue = r.look.kind === 'key' ? s.keyCue(r.look.role, r.look.side ?? 'S') : null;
    const named = cue ? r.keyRules?.find((k) => k.cue === cue)?.throwTo ?? null : null;
    const order = named ? [...r.throws].sort((a, b) => (a.ref === named ? -1 : b.ref === named ? 1 : 0)) : r.throws;
    const clear = order.map((o) => s.judge(o)).filter((j): j is Judged => !!j && !j.early && j.P >= s.bar.P && j.risk <= s.bar.risk);
    if (!clear.length) return null;
    const first = clear[0];
    if (named && first.option.ref === named) return first;
    const sticks = clear.filter((j) => j.reachesSticks);
    return (sticks.length ? sticks : clear).sort((a, b) => b.P - a.P)[0] ?? first;
  }

  /** One tick. */
  tick(s: CycleSenses): Intent {
    this.updatePressure(s.felt);
    if (this.state === 'presnap') this.state = 'drop';
    if (this.state === 'throw' && this.decision) return this.decision.intent;
    if (s.outside && this.state !== 'escape') this.state = 'escape';
    if (this.state === 'drop') {
      if (s.now < (s.readFrom ?? s.plantAt)) { this.looks.update(null, false, s.now, s.tau); return { kind: 'look', target: null }; }
      this.state = 'read';
    }
    if (this.state === 'read') return this.onRead(s);
    if (this.state === 'structureOut') return this.onStructureOut(s);
    return this.onEscape(s);
  }

  private commit(s: CycleSenses, intent: Intent): Intent {
    if (intent.kind === 'throw' || intent.kind === 'kill') this.state = 'throw';
    this.decision = { intent, at: s.now };
    return intent;
  }

  private onRead(s: CycleSenses): Intent {
    const r = this.plan.reads[this.readIdx];
    if (!r) { this.state = 'structureOut'; return this.onStructureOut(s); }
    const t = this.target(r);
    this.looks.update(t, s.inClear(t), s.now, s.tau);
    const res = this.looks.resolved(t);
    if (res >= s.need) {
      const j = this.choose(s, r); if (j) return this.commit(s, { kind: 'throw', judged: j });
      if (r.onCovered === 'kill' && r.throws[0]) return this.commit(s, { kind: 'kill', ref: r.throws[0].ref });
    }
    const press = this.pressureResponse(s);
    if (press) return press;
    const next = this.stepAt(s, this.plan.reads[this.readIdx + 1]?.step ?? (r.step + 1));
    // The hold rule (Integration's ruling, 2026-11-24), applying only when timing throws can be early (QB_QUICK_DRIFT bit 2):
    // (a) the throw he is timing holds his eyes, no other: on a key read, the throw the key names (none named yet: only
    //     while every throw of the read is still early); on a receiver read, its throws;
    // (b) the rhythm bounds it: a read is never held past the progression's next step from the set, so a slow throw
    //     cannot hold the whole read open-ended.
    // Controls (staged cells, must not move): the quick out's hitch on its break at 2.05 s, the out at 1.65 s vs the squat.
    const cue = r.look.kind === 'key' ? s.keyCue(r.look.role, r.look.side ?? 'S') : null;
    const named = cue ? r.keyRules?.find((k) => k.cue === cue)?.throwTo ?? null : null;
    const early = (o: ThrowOption) => s.judge(o)?.early === true;
    const timed = r.look.kind !== 'key' ? r.throws : named ? r.throws.filter((o) => o.ref === named) : r.throws.every(early) ? r.throws : [];
    const notDue = timed.some(early);
    // No hitch to keep the rhythm (bit 2): a read resolved and answered no, with the throw he times due, lets the eyes go
    // on without waiting for a step his feet do not take.
    const answeredNo = s.readFrom !== undefined && res >= s.need && !notDue;
    if (s.now >= next || answeredNo) {
      this.looks.markDue(t, s.now);
      // Resolved and answered no: the eyes move. Unresolved: hold while the look is resolving (the stare-down), bounded
      // by the next step plus the time the look would take; a look that cannot resolve has nothing to wait for.
      const holding = res < s.need && s.canReach(t) && (this.looks.resolving(t) || s.now - next < 0.1)
        && s.now < next + s.tau * Math.log(1 / Math.max(1e-3, 1 - s.need));
      // (b): at or past the next step the timing hold no longer applies; before it, only an answered no moves on.
      if (!holding && (s.now >= next || !notDue)) { this.passed.add(this.readIdx); this.readIdx++; }
    }
    return { kind: 'look', target: t };
  }

  /** The one ordered pressure response, by state (design §3.3). Null in a clean pocket and with the rush only felt. */
  private pressureResponse(s: CycleSenses): Intent | null {
    if (this.pressure === 'clean' || this.pressure === 'felt') return null;
    for (const h of this.plan.hot) {
      if (h.side !== 'either' && h.side !== s.hotSide) continue;
      const j = s.judge(h.answer); if (j && j.P >= s.bar.P && j.risk <= s.bar.risk) return this.commit(s, { kind: 'throw', judged: j });
    }
    if (this.plan.checkdown) { const j = s.judge({ ref: this.plan.checkdown.ref, timing: this.plan.checkdown.timing }); if (j && j.P >= s.bar.P && j.risk <= s.bar.risk) return this.commit(s, { kind: 'throw', judged: j }); }
    if (this.pressure === 'imminent') return { kind: 'move' };
    return { kind: 'away' };
  }

  /** Out of structure: one more pass through reads he has not left, then the checkdown, then extend or away. */
  private onStructureOut(s: CycleSenses): Intent {
    if (this.outPass === 0) {
      this.outPass = 1;
      const live = this.plan.reads.findIndex((_, i) => !this.passed.has(i));
      if (live >= 0) { this.readIdx = live; this.state = 'read'; return this.onRead(s); }
    }
    if (this.plan.checkdown) { const j = s.judge({ ref: this.plan.checkdown.ref, timing: this.plan.checkdown.timing }); if (j && j.P >= s.bar.P && j.risk <= s.bar.risk) return this.commit(s, { kind: 'throw', judged: j }); }
    const press = this.pressureResponse(s);
    if (press) return press;
    return { kind: 'move' };
  }

  /** Out of the pocket (ported by phase): the reads' throws judged as they are; away when the rush is on him. */
  private onEscape(s: CycleSenses): Intent {
    for (const r of this.plan.reads) { const j = this.choose(s, r); if (j) return this.commit(s, { kind: 'throw', judged: j }); }
    return this.pressure === 'clean' ? { kind: 'escape' } : { kind: 'away' };
  }
}

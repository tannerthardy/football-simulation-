/**
 * QB_V2 wiring (QB lane, 2026-11-24): drives the cycle (module E) from QBPass on a concept with an authored read plan
 * that fits the call, with the look (C), the judgment (D), the role resolver and the pre-snap decision (B, Flex). It
 * builds the cycle's senses from the passer's own picture (QBMind's estimates, his receiver forecasts, his felt rush)
 * through a host the QBPass hands it, and returns the cycle's intent; QBPass turns it into a command with its kept
 * mechanics (the drop, pocket movement, the throw, the throwaway). Nothing here reads a defender's truth: positions,
 * velocities and facings are his estimates; bodies are the host's believed body.
 */
import type { Agent } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { ReceiverRef } from '../../playbook/types.js';
import type { PhysicalProfile } from '../../players/physical.js';
import { arcPoint, dragFreeLaunch } from '../../physics/ball.js';
import { Cycle, type CycleSenses, type Intent, type Judged } from './cycle.js';
import { COVER_RADIUS, judge, type SeenDefender, type ThrowQuestion } from './judge.js';
import type { LookTarget } from './look.js';
import type { PreSnapState, QbReadPlan, ThrowOption } from './plan.js';
import { decidePreSnap, mirrorPlan } from './presnap.js';
import { isDbSlot, RoleResolver, type RolePicture } from './roles.js';

type V = { x: number; y: number };
type V3 = { x: number; y: number; z: number };

/** What QBPass lends the driver (bound to its private methods; all on his own picture). */
export interface V2Host {
  a: Agent;
  sim: PlaySim;
  estimate(d: Agent): { pos: V; vel: V; facing: number };
  /** The head direction he sees on this man (perception records it), null where not seen. */
  seenHead(d: Agent): number | null;
  pictureAge(d: Agent): number;
  pictureSpread(d: Agent): number;
  /** His receiver's predicted position `ahead` s from now (his forecast), and the forecast's break (absolute time). */
  predict(r: Agent, ahead: number): V | null;
  breakAt(r: Agent): number | null;
  /** His timing anchor for an on-break throw (absolute): when his forecast turns the receiver's body, else breakAt. */
  timingAt?(r: Agent): number | null;
  /** The route's break point as installed (field position), for the seen-depth timing rule. */
  breakPoint?(r: Agent): V | null;
  /** Where his route starts (his alignment, as installed), for his progress along the stem. */
  routeStart?(r: Agent): V | null;
  /** He feels a body on him (his own contact). */
  contact?: boolean;
  /** The side his most urgent felt rusher comes from (S / W of the ball, the alignment's strong side), or null. */
  hotSide?: 'S' | 'W' | null;
  /** Whether his clear cone holds this point now (his head's direction and his focus). */
  inClear(p: V): boolean;
  /** The throw's mechanics to this receiver now (catch point, flight), or null when it cannot be thrown. */
  mechanics(r: Agent, u: number): { point: V3; T: number } | null;
  windup(): number;
  /** His belief of his placement error (yd, one sigma) on a throw of this length, under the rush he feels. */
  placeSpread?(dist: number): number;
  body(d: Agent): PhysicalProfile;
  ballSkills(d: Agent): number;
  /** When he plants (his set point on the drop's count) and his stride (one footwork step), absolute times. */
  plantAt: number;
  stride: number;
  /** QB_QUICK_DRIFT bit 2: his first read starts here (the secure); absent, at the plant. */
  readFrom?: number;
  /** His felt rush 0-1 (from the rush only: no timer), his resolve time, his confidence need, and his bar. */
  felt: number;
  tau: number;
  need: number;
  /** His anticipation lead (s): an on-break throw may release up to this long before his forecast of the break. Absent:
   * no timing hold (the plant holds the ball instead). */
  lead?: number;
  bar: { P: number; risk: number };
  outside: boolean;
  releaseZ: number;
  /** The snap (absolute time). */
  snapAt: number;
}

/** The catch belief with no defender near (stated, Phase 1: the catch model's clean rate stands in until it is wired). */
/** A throw no defender plays is caught this often in our engine (cal14 staged cells, 2026-11-24: 165 of 202; the rest land
 * uncaught or are dropped). To be replaced by the catch model's own estimate once Tools' catching fix lands. */
export const CATCH_CLEAN = 0.82;
/** His completion belief on a throw no defender plays, from his own arm (Integration, 2026-11-24: one constant made every
 * passer equally sure, the 35 passer overconfident by 0.18). Measured on the staged quick outs and hitches (35/60/88,
 * 152 throws no defender played): a ball within CATCH_ADJUST of where he aimed is caught CATCH_IN of the time (the receiver
 * adjusts to it), farther out CATCH_OUT; his real release error at the arrival is PLACE_REAL times his own missSigma
 * (medians 1.40/1.17/0.95 yd against 0.95/0.81/0.61 believed). His ball lands in a disk of that spread around the aim
 * (Rayleigh), so P(caught clean) = IN * P(|e| <= R) + OUT * (1 - P). Falls back to CATCH_CLEAN without a spread. */
// Re-measured on the candidate (QB_QUICK_DRIFT=3, Integration's ruling): the 35/60/88 panel, 475 throws no defender played,
// ball-to-aim p50 0.66/0.54/0.48 yd against believed 0.81/0.68/0.57 (ratio 0.82); 0.95 caught within 1 yd, 0.77 beyond.
// (Bit 1, 152 throws: 1.5, 0.90, 0.58. The longer, on-the-move outs of bit 1 carried more error than his belief.)
export const CATCH_ADJUST = 1.0, CATCH_IN = 0.95, CATCH_OUT = 0.77, PLACE_REAL = 0.82;
export function catchFrom(spread: number | undefined): number {
  if (spread === undefined || !(spread > 0)) return CATCH_CLEAN;
  const s = PLACE_REAL * spread, pin = 1 - Math.exp(-(CATCH_ADJUST * CATCH_ADJUST) / (2 * s * s));
  return CATCH_IN * pin + CATCH_OUT * (1 - pin);
}
/** A key's cue from his picture of the man's velocity (yd/s) relative to the read's side: enter and exit (chosen). */
const CUE_ENTER = 1.5, CUE_EXIT = 0.8;
/** A sitting key's read changes only when the other landmark is nearer him by this much (yd; chosen). */
const SIT_SWITCH = 0.5;

export class V2Drive {
  cycle: Cycle;
  /** The pre-snap decision (Flex's module B), once taken at the snap. */
  presnap: PreSnapState | null = null;
  private roles = new RoleResolver();
  private cue = new Map<string, string>();
  private lastJudged = new Map<string, Judged>();
  /** His picture over the last half second (defenders and his receivers by ref), for relations held over time. */
  private hist: Array<{ t: number; defs: Map<number, V>; recv: Map<string, V> }> = [];
  /** The coverer he holds for each receiver (kept unless another is nearer by COVER_SWAP). */
  private held = new Map<string, number | null>();
  /** Diagnostics (no effect): the roles behind the last judgment of each receiver. */
  readonly lastRoles = new Map<string, ReturnType<typeof judge>['roles']>();

  constructor(public plan: QbReadPlan, startRead = 0) { this.cycle = new Cycle(plan, startRead); }

  /** At the snap: Flex's pre-snap decision on his scan picture (the plan as authored: condHolds mirrors the alert itself),
   * then the cycle on the plan he will run (mirrored when the pick flips it) from the read he starts on. */
  decidePreSnap(h: V2Host, belief: Record<string, number>, pSingleHigh: number, boxHalfWidth: { S: number; W: number }, protectors: { S: number; W: number }): PreSnapState {
    const pic = { ...this.picture(h), t: -0.01 };
    const st = decidePreSnap({ plan: this.plan, picture: pic, belief, pSingleHigh, boxHalfWidth, protectors });
    this.presnap = st;
    if (st.flip) this.plan = mirrorPlan(this.plan);
    this.cycle = new Cycle(this.plan, st.startRead);
    return st;
  }

  private receiver(h: V2Host, ref: ReceiverRef): Agent | null {
    const slot = h.sim.offAlign.numbering[ref];
    return slot ? h.sim.slot(slot) ?? null : null;
  }

  /** QB_QUICK_DRIFT bit 2's timing rule, on what he sees (Integration's ruling, 2026-11-24: "throw it when he hits the top
   * of his stem"; no clock): an on-break throw is not due while the receiver, where the passer sees him, is farther from
   * his route's break point than his windup plus his anticipation lead covers at the speed he sees him run (plus half a
   * yard): the release then leads the break by at most the lead. Once due it
   * stays due for that receiver (he has reached the top of the stem; a later look does not take it back). */
  private reachedBreak = new Map<string, number>();
  private notAtBreak(h: V2Host, r: Agent, ref: string, lead: number): boolean {
    if (this.reachedBreak.has(ref)) return false;
    const bp = h.breakPoint?.(r); if (!bp) return false;
    const e = h.estimate(r), sp = Math.hypot(e.vel.x, e.vel.y), st = h.routeStart?.(r), allow = lead * Math.max(sp, 1) + 0.5;
    // His progress along the stem as he sees it, not the distance to a fixed point (audit §1 #3: a receiver ridden 2 yd
    // wide of his stem never enters a radius round the installed break, so the throw could never clear).
    let left: number;
    if (st) {
      const ux = bp.x - st.x, uy = bp.y - st.y, L = Math.hypot(ux, uy) || 1;
      left = L - ((e.pos.x - st.x) * ux + (e.pos.y - st.y) * uy) / L;
    } else left = Math.hypot(e.pos.x - bp.x, e.pos.y - bp.y);
    if (left <= allow) { this.reachedBreak.set(ref, h.sim.t); return false; }
    return true;
  }

  /** Information-honest (outside audit 2026-11-24 §1 row 14): a defender is up unless the passer sees him down, and a
   * receiver is where the passer's forecast puts him, else his estimate; never the true body. */
  private seenUp(h: V2Host, d: Agent): boolean { return h.sim.see(h.a, d).pose !== 'down'; }
  private seenAt(h: V2Host, r: Agent, ahead = 0): V {
    const p = h.predict(r, ahead); if (p) return p;
    const e = h.estimate(r); return { x: e.pos.x + e.vel.x * ahead, y: e.pos.y + e.vel.y * ahead };
  }

  private picture(h: V2Host): RolePicture {
    const sim = h.sim, s1 = this.receiver(h, 'S1'), strong: 1 | -1 = s1 && this.seenAt(h, s1).y < sim.ballY ? -1 : 1;
    const defenders = sim.defense.filter((d) => this.seenUp(h, d)).map((d) => {
      const e = h.estimate(d);
      return { id: d.idx, x: e.pos.x, y: e.pos.y, vx: e.vel.x, vy: e.vel.y, db: isDbSlot(sim.defCall.personnel, d.slot) };
    });
    const receivers: RolePicture['receivers'] = {};
    for (const ref of ['S1', 'S2', 'S3', 'W1', 'W2', 'W3', 'B'] as ReceiverRef[]) {
      const r = this.receiver(h, ref); if (!r) continue;
      const p = this.seenAt(h, r); receivers[ref] = { id: r.idx, x: p.x, y: p.y, vx: 0, vy: 0 };
    }
    return { defenders, receivers, los: sim.los, dir: 1, ballY: sim.ballY, strong, t: sim.t - h.snapAt };
  }

  /** Where a look target is in his picture now. */
  private where(h: V2Host, t: LookTarget): V | null {
    if (t.kind === 'receiver') { const r = this.receiver(h, t.ref as ReceiverRef); return r ? h.predict(r, 0) ?? h.estimate(r).pos : null; }
    const [side, role] = t.role.split(':') as ['S' | 'W', string];
    const m = this.roles.resolve(this.picture(h), role, side);
    if (m) return { x: m.x, y: m.y };
    // No man in that role in his picture: his eyes go to the read's first throw rather than to nothing (Integration's
    // ruling, 2026-11-24); the plan's 'none' cue, where Rules authors one, answers the read.
    const rd = this.cycle.plan.reads.find((x) => x.look.kind === 'key' && x.look.role === role && (x.look.side ?? 'S') === side);
    const r0 = rd?.throws[0] ? this.receiver(h, rd.throws[0].ref) : null;
    return r0 ? this.seenAt(h, r0) : null;
  }

  /** The key's cue: what the man in that role is doing in his picture, kept until another clears its entry. */
  private keyCue(h: V2Host, role: string, side: 'S' | 'W'): string | null {
    const pic = this.picture(h), m = this.roles.resolve(pic, role, side);
    // `none` (Rules' definition, read-plans §conventions): he has looked at that key's area (his look there has resolved to
    // his need) and no defender fills the role in his picture. An area he has not resolved yet is not read: no cue.
    if (!m) return this.cycle.looks.resolved({ kind: 'key', role: `${side}:${role}` }) >= h.need ? 'none' : null;
    const out = m.vy * pic.strong * (side === 'S' ? 1 : -1), deep = m.vx * pic.dir;
    const key = `${side}:${role}`, held = this.cue.get(key) ?? null;
    const score: Record<string, number> = { widens: out, sinks: deep, jumps: -deep };
    if (held && score[held] !== undefined && score[held] > CUE_EXIT) return held;
    let best: string | null = null, bv = CUE_ENTER;
    for (const [c, v] of Object.entries(score)) if (v >= bv) { best = c; bv = v; }
    // No movement cue clears its entry: he is read by where he is, whatever his speed (Rules, 2026-11-24: the cue is the
    // route he takes; a speed gate left a corner drifting at 1-1.5 yd/s over the flat with no cue at all).
    if (!best && pic.t > 0.6) best = this.sitsWhere(h, role, side, m, held);
    if (best) this.cue.set(key, best);
    return best;
  }

  /** A key who sits: which route he has taken, by where he sits (Rules' taught meaning, 2026-11-24: Walsh in Ross, "If he
   * took the flat route ... fire the stick ... If he squatted on the stick, he would hit Roger Craig on the move in the
   * flat"; Throw Deep). Against the read's two answers, the receiver a squat sends him to (the route he leaves open) and
   * the one a widen sends him to, each where his forecast puts it half a second on: sitting nearer the squat answer's
   * landmark laterally means he sits over that route, so he has taken it, and reads as `widens`; otherwise he walls the
   * other route: `squats`. Only his seen position and the passer's own forecasts. Without both rules, a sit is `squats`. */
  private sitsWhere(h: V2Host, role: string, side: 'S' | 'W', m: { x: number; y: number }, held: string | null = null): string {
    const r = this.cycle.plan.reads.find((x) => x.look.kind === 'key' && x.look.role === role && (x.look.side ?? 'S') === side);
    const sq = r?.keyRules?.find((k) => k.cue === 'squats')?.throwTo, wd = r?.keyRules?.find((k) => k.cue === 'widens')?.throwTo;
    if (!sq || !wd || sq === wd) return 'squats';
    const a = this.receiver(h, sq), b = this.receiver(h, wd);
    const pa = a ? this.seenAt(h, a, 0.5) : null, pb = b ? this.seenAt(h, b, 0.5) : null;
    if (!pa || !pb) return 'squats';
    // Held with a margin (audit §3 #1): a sitting man keeps the read he gave until the other landmark is nearer him by
    // SIT_SWITCH, so moving forecasts do not flip a still defender between squats and widens.
    const da = Math.abs(m.y - pa.y), db = Math.abs(m.y - pb.y);
    if (held === 'widens') return db < da - SIT_SWITCH ? 'squats' : 'widens';
    if (held === 'squats') return da < db - SIT_SWITCH ? 'widens' : 'squats';
    return da < db ? 'widens' : 'squats';
  }

  /** Keep his picture's history (one sample a tick, the last 0.5 s). */
  private remember(h: V2Host): void {
    const t = h.sim.t; if (this.hist.length && this.hist[this.hist.length - 1].t === t) return;
    const defs = new Map<number, V>(), recv = new Map<string, V>();
    for (const d of h.sim.defense) if (this.seenUp(h, d)) defs.set(d.idx, h.estimate(d).pos);
    for (const ref of ['S1', 'S2', 'S3', 'W1', 'W2', 'W3', 'B'] as ReceiverRef[]) { const r = this.receiver(h, ref); if (r) { const p = h.predict(r, 0); if (p) recv.set(ref, p); } }
    this.hist.push({ t, defs, recv });
    while (this.hist.length && this.hist[0].t < t - 0.5) this.hist.shift();
  }

  /** Defenders his picture had within the coverage radius of this receiver 0.2 s ago (and so may be its coverer now). */
  private eligible(h: V2Host, ref: string): ReadonlySet<number> | undefined {
    const past = this.hist.find((x) => x.t >= h.sim.t - 0.2 - 1e-6);
    if (!past || h.sim.t - past.t < 0.15) return undefined;
    const rp = past.recv.get(ref); if (!rp) return undefined;
    const out = new Set<number>();
    for (const [id, p] of past.defs) if (Math.hypot(p.x - rp.x, p.y - rp.y) <= COVER_RADIUS) out.add(id);
    return out;
  }

  /** D on one candidate throw, on his picture. */
  private judgeOption(h: V2Host, o: ThrowOption): Judged | null {
    const a = h.a; // the passer himself (his own body)
    const r = this.receiver(h, o.ref); if (!r) return null;
    const mech = h.mechanics(r, h.felt); if (!mech) return null;
    const sim = h.sim, from = { x: a.pos.x, y: a.pos.y, z: h.releaseZ }, v0 = dragFreeLaunch(from, mech.point, mech.T);
    const path: V[] = [], heights: number[] = [];
    for (let f = 0.1; f <= 1.0001; f += 0.1) { const b = arcPoint(from, v0, mech.T * f); path.push({ x: b.x, y: b.y }); heights.push(b.z); }
    const bk = h.breakAt(r);
    const look = this.cycle.looks.current;
    const q: ThrowQuestion = {
      windup: h.windup(), flight: mech.T, catchAt: { x: mech.point.x, y: mech.point.y },
      receiverAt: (t) => (o.timing === 'seenOpen' ? (() => { const e = h.estimate(r), p = h.predict(r, 0) ?? e.pos; return { x: p.x + e.vel.x * t, y: p.y + e.vel.y * t }; })() : this.seenAt(h, r, t)),
      breakIn: o.timing === 'onBreak' && bk !== null ? bk - sim.t : null,
      ballHeightAt: (p) => { let bi = -1, bd = Infinity; path.forEach((q2, i) => { const d = Math.hypot(q2.x - p.x, q2.y - p.y); if (d < bd) { bd = d; bi = i; } }); return bi >= 0 && bd < 1.5 ? heights[bi] : null; },
      heldCoverer: this.held.get(o.ref) ?? null, coverEligible: this.eligible(h, o.ref),
      path: [{ x: from.x, y: from.y }, ...path], los: sim.los, catchClean: catchFrom(h.placeSpread?.(Math.hypot(mech.point.x - from.x, mech.point.y - from.y))), res: look ? this.cycle.looks.resolved(look) : 0, receiverSpread: h.pictureSpread(r),
      placeSpread: h.placeSpread?.(Math.hypot(mech.point.x - from.x, mech.point.y - from.y)),
    };
    const defs: SeenDefender[] = sim.defense.filter((d) => this.seenUp(h, d) && h.pictureAge(d) < 1.5).map((d) => {
      const e = h.estimate(d), b = h.body(d), toQB = Math.atan2(a.pos.y - e.pos.y, a.pos.x - e.pos.x), eyes = h.seenHead(d) ?? e.facing;
      // His eyes on the passer: the head he sees on the man where perception records it, else the body (Coverage's review).
      const faces = Math.abs(Math.atan2(Math.sin(eyes - toQB), Math.cos(eyes - toQB))) < Math.PI / 3;
      return { id: d.idx, pos: e.pos, vel: e.vel, facing: e.facing, spread: h.pictureSpread(d), age: h.pictureAge(d), facesPasser: faces,
        vmax: b.vmax, accel: b.vmax / Math.max(b.tau, 1e-3), reach: b.reach, leap: b.reactReach + 0.5 * (b.maxCatchHeight - b.reactReach), ballSkills: h.ballSkills(d) };
    });
    const j = judge(q, defs);
    this.held.set(o.ref, j.roles.find((x) => x.role === 'coverer')?.id ?? null);
    // A timing throw is not started before its time: the release (now + windup) may lead his forecast of the break by at
    // most his anticipation lead. Judged all the same (the trace shows it), marked early.
    const early = h.lead !== undefined && o.timing === 'onBreak' && this.notAtBreak(h, r, o.ref, q.windup + h.lead);
    // His window has been seen once the receiver reached the top of his stem a windup ago (Integration's ruling: a window
    // cannot be refused before it can exist). Only with the timing rule on.
    const at = this.reachedBreak.get(o.ref), seenBreak = h.lead !== undefined && o.timing === 'onBreak' ? at !== undefined && sim.t - at >= q.windup : undefined;
    const judged: Judged = { option: o, P: j.P, risk: j.risk, reachesSticks: mech.point.x >= sim.firstDownX, early, seenBreak };
    this.lastJudged.set(o.ref, judged);
    this.lastRoles.set(o.ref, j.roles);
    return judged;
  }

  /** One tick: the cycle on his senses now. */
  tick(h: V2Host): Intent {
    const a = h.a; // the passer himself (his own body)
    this.remember(h);
    const senses: CycleSenses = {
      now: h.sim.t, plantAt: h.plantAt, stride: h.stride, readFrom: h.readFrom, felt: h.felt, outside: h.outside,
      inClear: (t) => { const p = this.where(h, t); return !!p && h.inClear(p); },
      canReach: (t) => { const p = this.where(h, t); if (!p) return false; const ang = Math.atan2(p.y - a.pos.y, p.x - a.pos.x); return Math.abs(Math.atan2(Math.sin(ang - a.body.facing), Math.cos(ang - a.body.facing))) < 150 * Math.PI / 180; },
      tau: h.tau, need: h.need, bar: h.bar,
      judge: (o) => this.judgeOption(h, o),
      keyCue: (role, side) => this.keyCue(h, role, side),
      hotSide: h.hotSide ?? null, contact: h.contact,
    };
    return this.cycle.tick(senses);
  }

  /** On the drop: his eyes are on the first read (module C: the eyes go to what the next step calls for), and that look
   * resolves while his cone holds it, so a read thrown off the plant has been seen. No decision is made here. */
  watch(h: V2Host): void {
    this.remember(h);
    const r = this.plan.reads[this.cycle.readIdx]; if (!r) return;
    const t: LookTarget = r.look.kind === 'receiver' ? { kind: 'receiver', ref: r.look.ref } : { kind: 'key', role: `${r.look.side ?? 'S'}:${r.look.role}` };
    const p = this.where(h, t);
    this.cycle.looks.update(t, !!p && h.inClear(p), h.sim.t, h.tau);
  }

  /** Where his eyes go this tick: the cycle's look target, or on the drop the first read's. */
  gaze(h: V2Host): V | null {
    const t = this.cycle.looks.current ?? (() => { const r = this.plan.reads[this.cycle.readIdx]; if (!r) return null; return r.look.kind === 'receiver' ? { kind: 'receiver', ref: r.look.ref } as LookTarget : { kind: 'key', role: `${r.look.side ?? 'S'}:${r.look.role}` } as LookTarget; })();
    return t ? this.where(h, t) : null;
  }

  /** The receiver a throw intent names, for the kept throw mechanics. */
  target(h: V2Host, ref: string): Agent | null { return this.receiver(h, ref as ReceiverRef); }
  judgedFor(ref: string): Judged | undefined { return this.lastJudged.get(ref); }
}

/**
 * Offensive pre-snap motion (MOTION=1; off by default). One off-ball skill
 * player moves before the snap along a planned path:
 *
 *  - `across`: jogs to the far side and sets as its innermost detached
 *    receiver (2x2 becomes 3x1, a single-width side gains a slot).
 *  - `jet`:    runs flat behind the line at speed and is still moving,
 *    parallel to the line, at the snap, short of the ball: the snap is timed
 *    so he reaches the mesh about JET_LEAD s later (tracked jets snap a median
 *    5 yd from the ball, most before reaching it).
 *  - `empty`:  the back motions out of the backfield to the weak side and sets
 *    as a slot (one back becomes empty).
 *  - `return`: yo-yo; steps inside and returns to his spot.
 *
 * Every plan is legal by construction (NFL 7-4-7/8): the motion man is off the
 * line, alone in motion, and never moving toward the line at the snap.
 *
 * After the motion the offense is renumbered from where players actually
 * stand, so routes, coverage checks and match rules all see the final
 * structure ("defend the final formation"). Nothing here moves a defender.
 */
import { CENTER_Y } from '../core/field.js';
import type { Rng } from '../core/rng.js';
import type { Vec2 } from '../core/vec.js';
import { alignDefense, frontSign, isDeepZone, type AlignStyle, type DefenseAlignment, type ManPreference, type OffenseAlignment } from '../playbook/alignment.js';
import { installCoverage } from '../playbook/coverages.js';
import type { DefensivePlayCall, DefSlot, MotionCall, MotionKind, ReceiverRef, Side, SkillSlot } from '../playbook/types.js';
import { sideSign } from '../playbook/types.js';
import type { Body } from '../physics/kinematics.js';
import type { Intent } from '../physics/world.js';
import type { Agent } from './agent.js';

/** Motion is experimental: played only with MOTION=1 (read at each snap, so a test can scope it). */
export const motionEnabled = (): boolean => process.env.MOTION === '1';

export type { MotionCall, MotionKind };

export interface MotionPlan {
  slot: SkillSlot;
  kind: MotionKind;
  /** When the motion starts, seconds before the snap. */
  seconds: number;
  /** Waypoints in order, each with its speed as a fraction of top speed. */
  legs: Array<{ to: Vec2; speed: number }>;
  /** Still moving at the snap (jet): the last leg is run through, not stopped on. */
  live: boolean;
  /** Where the plan has him at the snap. */
  snapPos: Vec2;
}

/** Depth behind the line a jet runs at: clear of the center's body and the snap. */
const JET_DEPTH = 1.8;
/** The jet man reaches the ball this long after the snap: the snap is timed to the mesh (s). */
const JET_LEAD = 0.6;
/** Fastest pace (fraction of top speed) a set motion is run at to fit the pre-snap clock. */
const MAX_SET_SPEED = 0.9;
/** A motion man must be off the line of scrimmage. */
const OFF_LINE = 1.0;
/** A set motion man arrives this long before the snap. */
const SET_MARGIN = 1.0;
/** Longest motion an offense runs before the snap (s). */
const MAX_SECONDS = 5.5;

/** Receivers to one side (detached and attached), outside-in, with lateral distance from the ball. */
function sideReceivers(off: OffenseAlignment, sign: number): Array<{ slot: string; lateral: number; inline: boolean }> {
  return Object.values(off.spots)
    .filter(p => p.slot !== 'QB' && !p.backfield && !['LT', 'LG', 'C', 'RG', 'RT'].includes(p.slot) && (p.pos.y - off.ballY) * sign > 0)
    .map(p => ({ slot: p.slot, lateral: Math.abs(p.pos.y - off.ballY), inline: p.inline }))
    .sort((a, b) => b.lateral - a.lateral);
}

/** Can this player legally go in motion from his installed spot? */
export function canMotion(off: OffenseAlignment, slot: SkillSlot): boolean {
  const spot = off.spots[slot];
  return !!spot && !spot.inline && spot.pos.x <= off.los - OFF_LINE;
}

/** Plan a motion for `call` from the installed alignment, or null if it is not legal or makes no sense. */
export function planMotion(off: OffenseAlignment, call: MotionCall, body: Pick<Body['profile'], 'vmax' | 'tau' | 'brake'>): MotionPlan | null {
  if (!canMotion(off, call.slot)) return null;
  const spot = off.spots[call.slot];
  const p0 = { ...spot.pos };
  const own = Math.sign(p0.y - off.ballY) || -off.strongSign;
  const far = -own;
  const legs: MotionPlan['legs'] = [];
  let live = false;
  let jetSnap: Vec2 | null = null;
  switch (call.kind) {
    case 'across': {
      if (spot.backfield) return null;
      // Set as the far side's new slot: tight inside a lone #1 (tracked across
      // motion sets a median 5.4 yd from the ball), or inside an existing slot.
      const detached = sideReceivers(off, far).filter(r => !r.inline);
      const lateral = detached.length === 0 ? 9
        : detached.length === 1 ? Math.max(4.5, detached[0].lateral * 0.3)
        : Math.max(4.6, detached[detached.length - 1].lateral * 0.62);
      legs.push({ to: { x: p0.x, y: off.ballY + far * lateral }, speed: 0.7 });
      break;
    }
    case 'jet': {
      if (spot.backfield) return null;
      const x = off.los - JET_DEPTH;
      legs.push({ to: { x, y: p0.y - own * 1.5 }, speed: 0.6 });
      legs.push({ to: { x, y: off.ballY + far * 1.0 }, speed: 0.85 });
      live = true;
      // Snapped JET_LEAD s of running short of the ball, never behind his turn.
      const turn = Math.abs(p0.y - own * 1.5 - off.ballY);
      jetSnap = { x, y: off.ballY + own * Math.min(turn, JET_LEAD * 0.85 * body.vmax) };
      break;
    }
    case 'empty': {
      if (!spot.backfield) return null;
      const weak = -off.strongSign;
      const detached = sideReceivers(off, weak).filter(r => !r.inline);
      const lateral = detached.length ? Math.min(10, Math.max(6, detached[detached.length - 1].lateral - 4)) : 8;
      legs.push({ to: { x: off.los - 1.2, y: off.ballY + weak * lateral }, speed: 0.6 });
      break;
    }
    case 'return': {
      if (spot.backfield) return null;
      legs.push({ to: { x: p0.x, y: p0.y - own * 4 }, speed: 0.45 });
      legs.push({ to: p0, speed: 0.45 });
      break;
    }
  }
  // Travel time: integrate his speed along the path under the same targets
  // motionIntent commands. Speeding up follows the sprint law (dv/dt =
  // (target - v) / tau), slowing is at his braking limit, a path that turns
  // back on itself stops first, and a set motion tapers into its spot. A jet
  // is timed to its snap point on the live leg.
  const travel = (pace: number) => {
    const dt = 0.01;
    let t = 0, v = 0, prev = p0, dir: Vec2 | null = null;
    for (const [i, leg] of legs.entries()) {
      const final = i === legs.length - 1;
      const to = jetSnap && final ? jetSnap : leg.to;
      const d = Math.hypot(to.x - prev.x, to.y - prev.y);
      const top = Math.min(MAX_SET_SPEED, leg.speed * pace) * body.vmax;
      const nd = d > 1e-6 ? { x: (to.x - prev.x) / d, y: (to.y - prev.y) / d } : null;
      if (dir && nd && dir.x * nd.x + dir.y * nd.y < 0) { t += v / body.brake; v = 0; }
      const stopAt = final && !live ? 0.3 : 0;
      for (let left = d; left > stopAt && t < 2 * MAX_SECONDS; t += dt) {
        const target = final && !live ? Math.min(top, left * 2.5) : top;
        v = target > v ? v + (target - v) * dt / body.tau : Math.max(target, v - body.brake * dt);
        left -= v * dt;
      }
      prev = to;
      dir = nd ?? dir;
    }
    if (!live) t += SET_MARGIN;
    return { t, end: prev };
  };
  // A set motion too long for the pre-snap clock is run faster, up to
  // MAX_SET_SPEED; one that still does not fit is not called.
  let pace = 1, plan = travel(pace);
  while (plan.t > MAX_SECONDS && legs.some(l => l.speed * pace < MAX_SET_SPEED)) plan = travel(pace += 0.05);
  if (plan.t > MAX_SECONDS) return null;
  for (const leg of legs) leg.speed = Math.min(MAX_SET_SPEED, leg.speed * pace);
  return { slot: call.slot, kind: call.kind, seconds: plan.t, legs, live, snapPos: { ...plan.end } };
}

/** The motion man's requested velocity and facing at pre-snap time `t` (negative). */
export function motionIntent(plan: MotionPlan, body: Body, t: number, state: { leg: number }): { vel: Vec2; facing: number } {
  const still = { vel: { x: 0, y: 0 }, facing: 0 };
  if (t < -plan.seconds - 1e-9) return still;
  const lastLeg = plan.legs.length - 1;
  // A live (jet) last leg is run through along its line, not stopped on.
  if (plan.live && state.leg === lastLeg) {
    const from = plan.legs[lastLeg - 1]?.to ?? body.pos, to = plan.legs[lastLeg].to;
    const len = Math.hypot(to.x - from.x, to.y - from.y) || 1;
    const dir = { x: (to.x - from.x) / len, y: (to.y - from.y) / len };
    const top = plan.legs[lastLeg].speed * body.profile.vmax;
    return { vel: { x: dir.x * top, y: dir.y * top }, facing: Math.atan2(dir.y, dir.x) };
  }
  if (state.leg > lastLeg) return still;
  const leg = plan.legs[state.leg];
  const dx = leg.to.x - body.pos.x, dy = leg.to.y - body.pos.y, d = Math.hypot(dx, dy);
  const final = state.leg === lastLeg;
  if (d < (final ? 0.3 : 0.6)) {
    state.leg++;
    return motionIntent(plan, body, t, state);
  }
  // Waypoints are run through; a set motion brakes into its final spot.
  const top = leg.speed * body.profile.vmax;
  const speed = final ? Math.min(top, d * 2.5) : top;
  return { vel: { x: dx / d * speed, y: dy / d * speed }, facing: speed > 0.5 ? Math.atan2(dy, dx) : 0 };
}

/**
 * The offense renumbered from where its players stand at the snap. Same
 * conventions as alignOffense: backs in the backfield are not numbered,
 * receivers count outside-in per side, strength is the side with more
 * receivers, then the attached end's side, then the field side.
 */
export function realignOffense(off: OffenseAlignment, at: (slot: string) => Vec2 | undefined): OffenseAlignment {
  const spots: OffenseAlignment['spots'] = {};
  for (const [slot, s] of Object.entries(off.spots)) {
    const pos = at(slot) ?? s.pos;
    const lateral = Math.abs(pos.y - off.ballY);
    // A back who has motioned outside the tackle box is a receiver now.
    const backfield = s.backfield && lateral < 3.5;
    const side: Side | 'C' = slot === 'QB' ? 'C' : pos.y - off.ballY > 0 ? 'L' : pos.y - off.ballY < 0 ? 'R' : s.side;
    spots[slot] = { ...s, pos: { ...pos }, backfield, side };
  }
  const ol = new Set(['LT', 'LG', 'C', 'RG', 'RT', 'QB']);
  const bySide: Record<Side, Array<{ slot: SkillSlot; off: number }>> = { L: [], R: [] };
  for (const [slot, s] of Object.entries(spots)) {
    if (ol.has(slot) || s.backfield) continue;
    const o = s.pos.y - off.ballY;
    bySide[o >= 0 ? 'L' : 'R'].push({ slot: slot as SkillSlot, off: Math.abs(o) });
  }
  bySide.L.sort((a, b) => b.off - a.off);
  bySide.R.sort((a, b) => b.off - a.off);
  const teSide = (s: Side) => bySide[s].some(r => spots[r.slot].inline);
  let strong: Side;
  if (bySide.L.length !== bySide.R.length) strong = bySide.L.length > bySide.R.length ? 'L' : 'R';
  else if (teSide('L') !== teSide('R')) strong = teSide('L') ? 'L' : 'R';
  else strong = off.ballY < CENTER_Y ? 'L' : 'R';
  const weak: Side = strong === 'L' ? 'R' : 'L';
  const numbering: OffenseAlignment['numbering'] = {};
  const refOf: OffenseAlignment['refOf'] = {};
  bySide[strong].forEach((r, i) => { numbering[`S${i + 1}` as ReceiverRef] = r.slot; refOf[r.slot] = `S${i + 1}` as ReceiverRef; });
  bySide[weak].forEach((r, i) => { numbering[`W${i + 1}` as ReceiverRef] = r.slot; refOf[r.slot] = `W${i + 1}` as ReceiverRef; });
  const backs = Object.entries(spots).filter(([slot, s]) => slot !== 'QB' && s.backfield).map(([slot]) => slot as SkillSlot)
    .sort((a, b) => (a === 'RB' ? -1 : b === 'RB' ? 1 : 0));
  if (backs[0]) { numbering.B = backs[0]; refOf[backs[0]] = 'B'; }
  if (backs[1]) { numbering.B2 = backs[1]; refOf[backs[1]] = 'B2'; }
  const strongSign = sideSign(strong);
  // Only off-ball players motion, so the core (attached ends) is unchanged;
  // its strong/weak labels follow the strength.
  const flipped = strongSign !== off.strongSign;
  return {
    ...off, spots, numbering, refOf, strong, strongSign,
    coreEdge: flipped ? { S: off.coreEdge.W, W: off.coreEdge.S } : off.coreEdge,
    hasTE: { S: teSide(strong), W: teSide(weak) },
    counts: { S: bySide[strong].length, W: bySide[weak].length },
  };
}

/** What a motion needs from the play: its bodies, the installed offense, and its pre-snap clock. */
export interface MotionHost {
  readonly offAlign: OffenseAlignment;
  readonly defense: Agent[];
  readonly t: number;
  readonly los: number;
  slot(slot: string): Agent | undefined;
}

/** Experimental (MOTION_CHECK=1, off): the defense answers motion as tracked
 * defenses do (2022 BDB 2025 weeks 1-9, 3,856 single-motion plays, line set
 * to snap; scripts/diag/align/nfl_motion.py and motionlook.py).
 * - Man coverage locks or trades. A lock keeps the line-set man defender on
 *   the motion man ("Lock/Glue": he travels, or trails a jet); a trade passes
 *   him to whoever the new formation puts there. Tracked locks, by the PFF
 *   matchup of the motion man's defender already being on him at the line
 *   set: across 51%, jet 66%, empty 69%, in-and-back 58%.
 * - Everyone else bumps: jobs move, players slide. The coverage for the new
 *   formation is handed to whoever is nearest: the corners between
 *   themselves (they keep their sides), every other job among the nickel,
 *   dime, safeties and backers, a deep job only to a safety and a man job on
 *   a wide receiver never to a backer. On a change of strength the safeties
 *   spin and the new slot is taken by the down safety or an apex backer
 *   instead of a nickel running the width of the field. Tracked zone
 *   defenses put someone across the ball on 19% of across motions; the
 *   provisional re-sort ran whole groups across (59%).
 * - The front stays ("Stay" / "Play It", 2002 Bengals; "TE move" shifts the
 *   front, 1998 Bears): a receiver's motion does not move the front's side,
 *   so the linemen keep their techniques and the backers stay keyed to them;
 *   only coverage jobs move. (With FRONT_STRENGTH the front sets to an
 *   attached end, who cannot motion, or else to the call's lean at the set.)
 * - A locked defender on a jet trails him at full speed from what he saw a
 *   reaction time ago (tracked man coverage puts a defender with the jet on
 *   47% of jets).
 * Off: the provisional bump below. */
export const motionCheckEnabled = (): boolean => process.env.MOTION_CHECK === '1';
const LOCK: Record<MotionKind, number> = { across: .51, jet: .66, empty: .69, return: .58 };
/** Defenders who exchange coverage jobs on a bump: the corners between themselves, the rest among themselves. */
const KINDS: DefSlot[][] = [['CB_S', 'CB_W'], ['NB', 'DB', 'FS', 'SS', 'LB_S', 'LB_M', 'LB_W']];
const CORNER = new Set<DefSlot>(['CB_S', 'CB_W']), SAFETY = new Set<DefSlot>(['FS', 'SS']), BACKER = new Set<DefSlot>(['LB_S', 'LB_M', 'LB_W']);

/** Hand each kind's coverage spots to its nearest players (least summed
 * squared distance from where they stand: several men slide rather than one
 * runs the width of the field); `keep` holds his own. Rushers and
 * blitzers keep theirs. Among the rest, a deep job goes only to a safety
 * and a man job on a wide receiver never to a backer. */
function exchange(align: DefenseAlignment, at: (slot: DefSlot) => Vec2 | undefined, keep: DefSlot | null,
  isWide: (target: string) => boolean): DefenseAlignment {
  const spots = { ...align.spots };
  const can = (who: DefSlot, job: DefSlot) => {
    const r = align.spots[job]!.role, target = align.spots[job]!.manTarget;
    if (CORNER.has(who)) return true;
    if (r.kind === 'zone' && isDeepZone(r.zone)) return SAFETY.has(who);
    if (r.kind === 'man' && target && isWide(target)) return !BACKER.has(who);
    return true;
  };
  for (const kind of KINDS) {
    const members = kind.filter(s => s !== keep && spots[s] && at(s) && (spots[s]!.role.kind === 'zone' || spots[s]!.role.kind === 'man'));
    if (members.length < 2) continue;
    let best = members, cost = Infinity;
    for (const perm of permutations(members)) {
      if (!members.every((s, i) => can(s, perm[i]))) continue;
      const c = members.reduce((sum, s, i) => { const p = at(s)!, q = align.spots[perm[i]]!.pos; return sum + (p.x - q.x) ** 2 + (p.y - q.y) ** 2; }, 0);
      if (c < cost - 1e-9) { cost = c; best = perm; }
    }
    members.forEach((s, i) => { spots[s] = { ...align.spots[best[i]]!, slot: s }; });
  }
  return { ...align, spots };
}
function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map(p => [x, ...p]));
}

/** Defender reaction to what the motion shows (s), and how often the secondary re-sorts its alignment. */
const BUMP_REACTION = 0.3;
const BUMP_EVERY = 0.2;

/**
 * One pre-snap motion: drives the motion man, and gives the secondary a
 * provisional response. By default the coverage "bumps" (HNFL-063 "all
 * motions are bumped across"; scouted 85% bump, 15% run, HNFL-186): every
 * 0.2 s it re-sorts to the alignment for the formation it saw 0.3 s ago and
 * walks there, so a man defender keeps or trades his man the way the
 * installed man preferences say. It never sees the motion's endpoint. The
 * defensive pre-snap alignment owner can replace `respond` with richer
 * answers (lock/travel, spin, nickel only on change of strength).
 */
export class MotionRuntime {
  private readonly progress = { leg: 0 };
  private readonly seen: Array<{ t: number; pos: Vec2 }> = [];
  private nextSort = -Infinity;
  private readonly targets = new Map<Agent, Vec2>();

  constructor(
    readonly plan: MotionPlan,
    private readonly called: DefensivePlayCall,
    private readonly prefs: ManPreference | undefined,
    /** The defense's alignment style (mass, habits, situation), as at the set. */
    private readonly style: AlignStyle = {},
    /** MOTION_CHECK: the alignment at the line set (whose man defender had the motion man). */
    private readonly initial?: DefenseAlignment,
    /** MOTION_CHECK: the lock-or-trade draw. */
    private readonly rng?: Rng,
  ) {}

  /** MOTION_CHECK: the defender locked on the motion man (null: traded or zone; undefined: not yet recognized). */
  private lock: DefSlot | null | undefined;

  /** The call and alignment for the formation `off`: the front held, a lock kept and the bump handed out by kind. */
  private answer(sim: MotionHost, off: OffenseAlignment): { call: DefensivePlayCall; align: DefenseAlignment } {
    const slots = sim.defense.map(d => d.slot as DefSlot);
    const installed = installCoverage(this.called, off);
    if (!motionCheckEnabled()) return { call: installed, align: alignDefense(installed, off, slots, this.prefs, this.style) };
    const held = frontSign(this.called, sim.offAlign);
    const call: DefensivePlayCall = { ...installed, strength: frontSign({ ...installed, strength: 'passing' }, off) === held ? 'passing' : 'opposite' };
    if (this.lock === undefined) {
      const had = this.initial ? (Object.values(this.initial.spots).find(sp => sp?.role.kind === 'man' && sp.manTarget === this.plan.slot)?.slot ?? null) : null;
      this.lock = had && this.called.coverage.man && (this.rng?.chance(LOCK[this.plan.kind]) ?? false) ? had : null;
    }
    const prefs = this.lock ? { ...this.prefs, overrides: { ...this.prefs?.overrides, [this.lock]: this.plan.slot } } : this.prefs;
    const align = alignDefense(call, off, slots, prefs, this.style);
    return { call, align: exchange(align, slot => sim.slot(slot)?.pos, this.lock, target => sim.slot(target)?.player.position === 'WR') };
  }

  /** Pre-snap tick: the motion man's intent and the secondary's bump. */
  step(sim: MotionHost, intents: Intent[]): void {
    const man = sim.slot(this.plan.slot);
    if (!man) return;
    const cmd = motionIntent(this.plan, man.body, sim.t, this.progress);
    intents[man.idx] = { vel: cmd.vel, facing: cmd.facing };
    this.seen.push({ t: sim.t, pos: { ...man.pos } });
    this.respond(sim, intents);
  }

  /** Default response: bump to the alignment for the formation as seen a reaction time ago. */
  private respond(sim: MotionHost, intents: Intent[]): void {
    if (sim.t >= this.nextSort) {
      this.nextSort = sim.t + BUMP_EVERY;
      const seen = [...this.seen].reverse().find(s => s.t <= sim.t - BUMP_REACTION) ?? this.seen[0];
      const off = realignOffense(sim.offAlign, slot => (slot === this.plan.slot ? seen.pos : undefined));
      const { align } = this.answer(sim, off);
      this.targets.clear();
      for (const d of sim.defense) {
        const spot = align.spots[d.slot as DefSlot];
        if (spot && (spot.role.kind === 'zone' || spot.role.kind === 'man')) this.targets.set(d, { ...spot.pos });
      }
    }
    for (const [d, target] of this.targets) {
      const dx = target.x - d.pos.x, dy = target.y - d.pos.y, len = Math.hypot(dx, dy);
      const speed = Math.min(d.profile.vmax * 0.75, len * 3);
      // Turn and run to a far spot; settle facing the offense.
      const facing = len > 2 ? Math.atan2(dy, dx) : Math.PI;
      intents[d.idx] = { vel: { x: len ? dx / len * speed : 0, y: len ? dy / len * speed : 0 }, facing };
    }
    // MOTION_CHECK: a defender locked on a jet trails him: to where he was a
    // reaction time ago, carried on at his seen pace, at the man's depth.
    const locked = this.lock ? sim.slot(this.lock) : undefined;
    const spot = locked && this.targets.get(locked);
    if (motionCheckEnabled() && this.plan.live && locked && spot) {
      const seen = [...this.seen].reverse().find(s => s.t <= sim.t - BUMP_REACTION) ?? this.seen[0];
      const before = [...this.seen].reverse().find(s => s.t <= seen.t - 0.1);
      const vy = before && seen.t > before.t ? (seen.pos.y - before.pos.y) / (seen.t - before.t) : 0;
      const target = { x: spot.x, y: seen.pos.y + vy * BUMP_REACTION };
      const dx = target.x - locked.pos.x, dy = target.y - locked.pos.y, len = Math.hypot(dx, dy);
      const speed = Math.min(locked.profile.vmax, len * 3 + Math.abs(vy));
      // Turned and running while he is behind; square to the offense once on him.
      intents[locked.idx] = { vel: { x: len ? dx / len * speed : 0, y: len ? dy / len * speed : 0 }, facing: len > 2 ? Math.atan2(dy, dx) : Math.PI };
    }
  }

  /** At the snap: the offense as it actually stands, and the coverage installed against it. */
  finish(sim: MotionHost): { offAlign: OffenseAlignment; defCall: DefensivePlayCall; defAlign: DefenseAlignment } {
    const offAlign = realignOffense(sim.offAlign, slot => sim.slot(slot)?.pos);
    const { call: defCall, align: defAlign } = this.answer(sim, offAlign);
    return { offAlign, defCall, defAlign };
  }
}

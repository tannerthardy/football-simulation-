/**
 * Offensive pre-snap motion (MOTION=1; off by default). One off-ball skill
 * player moves before the snap along a planned path:
 *
 *  - `across`: jogs to the far side and sets as its innermost detached
 *    receiver (2x2 becomes 3x1, a single-width side gains a slot).
 *  - `jet`:    runs flat behind the line at speed and is still moving,
 *    parallel to the line, at the snap, just past the ball.
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
import type { Vec2 } from '../core/vec.js';
import { alignDefense, type DefenseAlignment, type ManPreference, type OffenseAlignment } from '../playbook/alignment.js';
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
  switch (call.kind) {
    case 'across': {
      if (spot.backfield) return null;
      // Set as the far side's new slot, the way alignOffense spaces slots:
      // halfway in from a lone #1, or inside an existing slot.
      const detached = sideReceivers(off, far).filter(r => !r.inline);
      const lateral = detached.length === 0 ? 9
        : detached.length === 1 ? Math.max(5.5, detached[0].lateral * 0.45 + 0.5)
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
  // Travel time: distance at each leg's pace, the sprint start-up lag (tau)
  // once, a stop-and-reverse wherever the path turns back on itself, and the
  // final braking for a set motion.
  let t = body.tau, prev = p0, dir: Vec2 | null = null;
  for (const leg of legs) {
    const d = Math.hypot(leg.to.x - prev.x, leg.to.y - prev.y);
    const v = leg.speed * body.vmax;
    const nd = d > 1e-6 ? { x: (leg.to.x - prev.x) / d, y: (leg.to.y - prev.y) / d } : null;
    if (dir && nd && dir.x * nd.x + dir.y * nd.y < 0) t += v / body.brake + body.tau;
    t += d / v;
    prev = leg.to;
    dir = nd ?? dir;
  }
  if (!live) t += legs[legs.length - 1].speed * body.vmax / body.brake;
  const seconds = Math.min(MAX_SECONDS, t + (live ? 0 : SET_MARGIN));
  return { slot: call.slot, kind: call.kind, seconds, legs, live, snapPos: { ...prev } };
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
  ) {}

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
      const align = alignDefense(installCoverage(this.called, off), off, sim.defense.map(d => d.slot as DefSlot), this.prefs);
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
  }

  /** At the snap: the offense as it actually stands, and the coverage installed against it. */
  finish(sim: MotionHost): { offAlign: OffenseAlignment; defCall: DefensivePlayCall; defAlign: DefenseAlignment } {
    const offAlign = realignOffense(sim.offAlign, slot => sim.slot(slot)?.pos);
    const defCall = installCoverage(this.called, offAlign);
    return { offAlign, defCall, defAlign: alignDefense(defCall, offAlign, sim.defense.map(d => d.slot as DefSlot), this.prefs) };
  }
}

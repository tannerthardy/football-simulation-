/** EXPERIMENT (HANDS2=1): two independent blocker hands on a pass rep.
 *
 * Lightweight approximation, no arms or biomechanics: each blocker hand is an
 * ordinary World hand joint carrying half of the existing two-hand capacity,
 * with an attachment point fixed on the rusher's torso in the rusher's body
 * frame. Two attached hands equal today's single joint exactly.
 *
 * A hand stays on only while geometry allows it: its torso point must be
 * within the arm's reach of that shoulder and on the side of the body facing
 * the blocker. When the rusher's body actually rotates (a spin), the points
 * rotate with him. A chop removes a hand when the rusher's arm impulse beats
 * that hand's grip impulse (arm force and hand technique, plus timing noise).
 * A free hand re-attaches on the blocker's next decision beat if a graspable
 * point is within reach in his own delayed picture of the rusher.
 *
 * Known limit: World hand joints act between body centers, so one hand cannot
 * twist the rusher (the open hand angular-law item).
 */
import { clamp, type Vec2 } from '../core/vec.js';
import type { HandJoint } from '../physics/world.js';
import { supportParams } from '../physics/support.js';
import { ARM_SPEED } from '../physics/actuation.js';
import type { Agent, Engagement } from './agent.js';
import type { PlaySim } from './playsim.js';

export const HANDS2 = process.env.HANDS2 === '1';

export type HandName = 'inside' | 'outside';
export interface HandState {
  on: boolean;
  /** Attachment angle on the rusher's torso, relative to his facing. */
  theta: number;
  /** World time of the last change, for continuity measures. */
  since: number;
  losses: number;
  regains: number;
  why?: string;
}
export interface PairState {
  inside: HandState;
  outside: HandState;
  /** Second World joint (the first is the engagement's own e.hands). */
  second: HandJoint;
  nextReach: number;
  lastFacing: number;
  spin?: { dir: number; from: number; rotated: number; lastFacing: number; until: number };
  allowRecovery: boolean;
}

const pairs = new WeakMap<Engagement, PairState>();
export const pairOf = (e: Engagement): PairState | undefined => pairs.get(e);

const rot = (a: number): Vec2 => ({ x: Math.cos(a), y: Math.sin(a) });

/** The blocker's shoulder for a hand: inside is the one toward the ball. */
function shoulder(sim: PlaySim, b: Agent, hand: HandName): Vec2 {
  const left = rot(b.facing + Math.PI / 2);
  const leftIsInside = (left.y * (sim.ballY - b.pos.y)) >= 0;
  const s = (hand === 'inside') === leftIsInside ? 1 : -1;
  return { x: b.pos.x + left.x * s * .6 * b.profile.radius, y: b.pos.y + left.y * s * .6 * b.profile.radius };
}
let blockerHandsOf: (b: Agent) => number = () => .5;
/** Engagement supplies the blocker's hand technique (avoids an import cycle). */
export const setHandTechnique = (f: (b: Agent) => number) => { blockerHandsOf = f; };
const reachOf = (b: Agent) => b.player.measurables.armIn / 36 * .95 + .1;
const pointOn = (d: { pos: Vec2; facing: number; profile: { radius: number } }, theta: number): Vec2 => {
  const u = rot(d.facing + theta);
  return { x: d.pos.x + u.x * d.profile.radius, y: d.pos.y + u.y * d.profile.radius };
};

/** Can this shoulder hold that torso point? Reach and the facing side. */
function graspable(s: Vec2, d: { pos: Vec2 }, p: Vec2, reach: number): boolean {
  const dist = Math.hypot(p.x - s.x, p.y - s.y);
  if (dist > reach) return false;
  const nx = p.x - d.pos.x, ny = p.y - d.pos.y, nl = Math.hypot(nx, ny) || 1;
  return (nx * (s.x - p.x) + ny * (s.y - p.y)) / (nl * (dist || 1)) > -.25;
}

/** The graspable torso point nearest a shoulder, as body-frame angle. */
function nearestGrip(s: Vec2, d: { pos: Vec2; facing: number; profile: { radius: number } }, reach: number): number | null {
  let best: { theta: number; dist: number } | null = null;
  for (let k = 0; k < 24; k++) {
    const theta = -Math.PI + k * Math.PI / 12, p = pointOn(d, theta);
    if (!graspable(s, d, p, reach)) continue;
    const dist = Math.hypot(p.x - s.x, p.y - s.y);
    if (!best || dist < best.dist) best = { theta, dist };
  }
  return best?.theta ?? null;
}

export function initPair(sim: PlaySim, e: Engagement): PairState {
  let st = pairs.get(e);
  if (st) return st;
  const b = e.blocker, d = e.defender;
  const make = (hand: HandName): HandState => {
    const theta = nearestGrip(shoulder(sim, b, hand), d, reachOf(b) + .2);
    return { on: theta !== null, theta: theta ?? 0, since: sim.t, losses: 0, regains: 0 };
  };
  st = { inside: make('inside'), outside: make('outside'),
    second: { kind: 'hands', a: b.body, b: d.body, extension: 1, push: 0, hold: 0, steer: 0 },
    nextReach: sim.t, lastFacing: d.facing, allowRecovery: process.env.HANDS2_RECOVER !== '0' };
  pairs.set(e, st);
  return st;
}

function lose(sim: PlaySim, h: HandState, why: string) {
  if (!h.on) return;
  h.on = false; h.since = sim.t; h.losses++; h.why = why;
}

/** Geometry each tick; recovery on the blocker's decision beat. */
export function updatePair(sim: PlaySim, e: Engagement): PairState {
  const st = initPair(sim, e), b = e.blocker, d = e.defender, reach = reachOf(b);
  const yaw = Math.atan2(Math.sin(d.facing - st.lastFacing), Math.cos(d.facing - st.lastFacing)) / sim.dt;
  st.lastFacing = d.facing;
  // A pressing hand slides over the jersey to the nearest graspable point.
  const track = ARM_SPEED * (.5 + .5 * blockerHandsOf(b));
  for (const name of ['inside', 'outside'] as const) {
    const h = st[name];
    if (!h.on) continue;
    const s = shoulder(sim, b, name), p = pointOn(d, h.theta);
    // Sliding past does not remove a pressing hand; a torso turning under it
    // faster than the arm can follow rolls it off.
    void p;
    if (Math.abs(yaw) * d.profile.radius > track) { lose(sim, h, 'rolled off'); continue; }
    const theta = nearestGrip(s, d, reach);
    if (theta === null) lose(sim, h, 'out of reach');
    else h.theta = theta;
  }
  if (st.allowRecovery && sim.t >= st.nextReach && (!st.inside.on || !st.outside.on)) {
    st.nextReach = sim.t + b.mind.decisionInterval;
    // His own delayed picture of the rusher, not the live body.
    const seen = sim.see(b, d);
    const picture = { pos: seen.pos, facing: seen.facing, profile: d.profile };
    for (const name of ['inside', 'outside'] as const) {
      const h = st[name];
      if (h.on) continue;
      const theta = nearestGrip(shoulder(sim, b, name), picture, reach);
      // The live body must still be there: reaching at a stale picture can miss.
      if (theta !== null && graspable(shoulder(sim, b, name), d, pointOn(d, theta), reach)) {
        h.on = true; h.theta = theta; h.since = sim.t; h.regains++; h.why = undefined;
      }
    }
  }
  return st;
}

/** A chop at one blocker hand: arm impulse against that hand's grip. */
export function chop(sim: PlaySim, e: Engagement, target: HandName, rusherHands: number, blockerHands: number): boolean {
  const st = initPair(sim, e), h = st[target];
  if (!h.on) return false;
  const strike = .12; // a chop lasts about this long; both arms work over it
  const arm = (a: Agent) => supportParams(a.profile).armForce;
  const chopImpulse = arm(e.defender) * strike * (.6 + .4 * rusherHands) * (1 + sim.rng.normal(0, .12));
  const grip = arm(e.blocker) * strike * .5 * (.6 + .4 * blockerHands) * (1 + .5 * Math.max(0, e.control));
  if (chopImpulse <= grip) return false;
  lose(sim, h, 'chopped');
  return true;
}

/** Split the two-hand joint capacity over the hands actually attached. */
export function applyPair(sim: PlaySim, e: Engagement, st: PairState): void {
  const one = e.hands!, two = st.second;
  two.a = e.blocker.body; two.b = e.defender.body;
  two.actor = one.actor; two.holder = one.holder; two.extension = one.extension; two.height = one.height;
  const share = (h: HandState) => h.on ? .5 : 0;
  const total = { push: one.push, hold: one.hold, steer: one.steer };
  one.push = total.push * share(st.inside); one.hold = total.hold * share(st.inside); one.steer = total.steer * share(st.inside);
  two.push = total.push * share(st.outside); two.hold = total.hold * share(st.outside); two.steer = total.steer * share(st.outside);
  if (!sim.world.joints.includes(two)) sim.world.joints.push(two);
}

export function releasePair(sim: PlaySim, e: Engagement): void {
  const st = pairs.get(e);
  if (st) sim.world.joints = sim.world.joints.filter((j) => j !== st.second);
}

/** A spin: request a real body rotation and an inside redirection. The World
 * limits yaw rate, charges traction for it and keeps his balance law. */
export function spinIntent(sim: PlaySim, e: Engagement, st: PairState): { facing: number; heading: number } | null {
  const d = e.defender, sp = st.spin;
  if (!sp) return null;
  const step = Math.atan2(Math.sin(d.facing - sp.lastFacing), Math.cos(d.facing - sp.lastFacing));
  sp.rotated += step * sp.dir > 0 ? Math.abs(step) : 0;
  sp.lastFacing = d.facing;
  if (sp.rotated >= 1.7 * Math.PI || sim.t > sp.until) { st.spin = undefined; return null; }
  // Keep turning the same way; the World decides how fast he actually turns.
  const facing = d.facing + sp.dir * 1.2;
  // Redirect: from the outside path toward the QB's side of the blocker.
  const toQb = Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x);
  return { facing, heading: toQb };
}

export function startSpin(sim: PlaySim, e: Engagement, st: PairState): void {
  const d = e.defender, b = e.blocker;
  // Spin away from the blocker first: turn the back to him, come out inside.
  const f = rot(d.facing), tb = { x: b.pos.x - d.pos.x, y: b.pos.y - d.pos.y };
  const dir = -(Math.sign(f.x * tb.y - f.y * tb.x) || 1);
  // A bound on an abandoned turn, not a scripted duration: he keeps rotating
  // only while he is still short of a full turn.
  st.spin = { dir, from: d.facing, rotated: 0, lastFacing: d.facing, until: sim.t + 1.2 };
}

export const handCount = (st: PairState) => (st.inside.on ? 1 : 0) + (st.outside.on ? 1 : 0);
export const clampAngle = (a: number) => clamp(a, -Math.PI, Math.PI);

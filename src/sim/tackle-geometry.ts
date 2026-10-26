import { fallTime, supportParams } from '../physics/support.js';
import type { Body } from '../physics/kinematics.js';
import type { PhysicalProfile } from '../players/physical.js';
import { contactQuality } from './tackle-window.js';

/** How the holder's hands are getting there. A lunge is an upright step,
 * so its hands reach no farther than standing; a dive lays the body out. */
export type HandMode = 'standing' | 'lunge' | 'dive';

/** Hip to fingertips of a body laid out flat, as a share of height
 * (QB-3's segment lengths: about 1.46 yd for a 6'1" defender). */
export const LAYOUT_SHARE = 0.72;
/** Farthest a runner's trailing foot sits behind his center, as a share of
 * height, at full stride (top speed). Model assumption, not tracked. */
export const TRAILING_FOOT_SHARE = 0.25;

type Holder = { profile: Pick<PhysicalProfile, 'reach' | 'heightYd'> };

/** Horizontal center-to-hand span, yd. Standing and lunging hands reach the
 * profile's arm (it already includes the holder's own radius). A diver's span
 * grows from that toward his laid-out length only as his fall progresses:
 * `progress` 0 when he leaves his feet, 1 when he is flat. Nothing reaches
 * past layout, and nobody gets layout before his body has gone down. */
export function handSpan(d: Holder, mode: HandMode, progress = 0): number {
  const arm = d.profile.reach;
  if (mode !== 'dive') return arm;
  const layout = Math.max(arm, LAYOUT_SHARE * d.profile.heightYd);
  return arm + (layout - arm) * Math.min(1, Math.max(0, progress));
}

/** How far a dive's fall has run, 0-1, on the World's own fall clock.
 * Zero for a body still on its feet or down for some other reason. */
export function diveProgress(body: Body, profile: PhysicalProfile, now: number): number {
  const s = body.support;
  if (!s || s.cause !== 'dive') return 0;
  if (s.state === 'down') return 1;
  if (s.state !== 'falling') return 0;
  return Math.min(1, Math.max(0, (now - s.since) / fallTime(supportParams(profile), s.posture)));
}

/** Reduced horizontal contact geometry. Body.pos is the actor's center;
 * the target is its circular body surface, so center-to-hand reach includes
 * the target radius exactly once and never the holder's radius. Facing and
 * lower/upper hold height do not supply a separate horizontal body segment.
 * The same bound applies to retained standing grasps. */
export function tackleReach(holder: Pick<PhysicalProfile, 'reach'>,
  target: Pick<PhysicalProfile, 'radius'>, armShare = 1): number {
  return holder.reach * armShare + target.radius;
}

/** Where a leg hold aims on a runner: his trailing foot. Without a modeled
 * foot it sits behind his center along his velocity, farther the faster he
 * strides, up to TRAILING_FOOT_SHARE of his height at top speed. */
export function trailingFoot(c: { pos: { x: number; y: number }; vel: { x: number; y: number };
  profile: Pick<PhysicalProfile, 'heightYd' | 'vmax'> }): { x: number; y: number } {
  const s = Math.hypot(c.vel.x, c.vel.y);
  if (s < 1e-6) return { x: c.pos.x, y: c.pos.y };
  const back = TRAILING_FOOT_SHARE * c.profile.heightYd * Math.min(1, s / Math.max(1e-6, c.profile.vmax));
  return { x: c.pos.x - c.vel.x / s * back, y: c.pos.y - c.vel.y / s * back };
}

/** A diver's reach to a runner's legs: the nearer of his body surface and
 * his trailing foot, measured from the diver's center. `allowance` is how
 * much nearer that target is than the runner's center; a retained hold keeps
 * it so the joint, which acts between centers, starts inside its span. */
export function legTarget(d: { pos: { x: number; y: number } }, c: Parameters<typeof trailingFoot>[0]
  & { profile: Pick<PhysicalProfile, 'radius'> }): { distance: number; allowance: number } {
  const center = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
  const f = trailingFoot(c);
  const foot = Math.hypot(f.x - d.pos.x, f.y - d.pos.y);
  const distance = Math.max(0, Math.min(center - c.profile.radius, foot));
  return { distance, allowance: center - distance };
}

/** Wrap quality, 0 fingertips … 1 body to body, at a center distance. The
 * denominator is the holder's own span past the torso: how far his arms
 * extend, not that span less his radius a second time. */
export function gripQuality(distance: number, torso: number, span: number): number {
  return contactQuality(distance, torso, torso + span);
}

/** A policy distance between centers for approach, arrival and threat
 * forecasts: both radii plus `armShare` of the holder's reach. Callers choose
 * the share as "stop short of full reach by this much"; it is not contact,
 * which only tackle admission (tackleReach / handSpan) grants. */
export function approachDistance(holder: Pick<PhysicalProfile, 'radius' | 'reach'>,
  target: Pick<PhysicalProfile, 'radius'>, armShare: number): number {
  return holder.radius + target.radius + holder.reach * armShare;
}

/** Named approach margins (shares of the holder's reach); values unchanged. */
export const APPROACH = {
  /** Pursuit intercept and carrier-threat forecasts: inside three quarters of reach. */
  intercept: 0.75,
  /** Gather, chase contact and engaged run trail: stop at two thirds of reach. */
  gather: 0.65,
} as const;

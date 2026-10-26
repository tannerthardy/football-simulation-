// Offline re-run of pursuitPoint's intercept choice from one traced row (scan.ts format):
// the same forecast path and interceptPoint call, with inputs that can be swapped.
import { FIELD_WIDTH } from '../../../src/core/field.js';
import type { PhysicalProfile } from '../../../src/players/physical.js';
import { interceptPoint, timeToReach, timeToReachRequested } from '../../../src/physics/reach.js';

export interface ChooserInputs {
  mpos: { x: number; y: number }; mvel: { x: number; y: number }; scale: number;
  pos: { x: number; y: number }; h: { x: number; y: number }; sp: number; V: number; tau: number;
  req: { speed: number; effort: number } | null; horizon: number; radius: number;
}
export const inputs = (r: any): ChooserInputs => ({ mpos: r.mpos, mvel: r.mvel, scale: r.scale, pos: r.seen.pos, h: r.fc.h,
  sp: r.fc.sp, V: r.fc.V, tau: r.fc.tau, req: r.req, horizon: r.horizonIp, radius: r.radius });

const forecast = (x: ChooserInputs) => (t: number) => { const d = x.V * t - (x.V - x.sp) * x.tau * (1 - Math.exp(-t / x.tau));
  return { x: x.pos.x + x.h.x * d, y: Math.min(FIELD_WIDTH, Math.max(0, x.pos.y + x.h.y * d)) }; };

/** The whole sampled slack curve (interceptPoint stops sampling at its first feasible sample). */
export function curve(x: ChooserInputs, profile: PhysicalProfile) {
  const path = forecast(x), m = { pos: x.mpos, vel: x.mvel, profile, speedScale: x.scale }, out = [];
  for (let t = 0; t <= x.horizon + 1e-9; t += 0.1) {
    const pt = path(t), tt = x.req ? timeToReachRequested(m, pt, x.radius, x.req) : timeToReach(m, pt, x.radius);
    out.push({ t, point: pt, slack: t - tt });
  }
  return out;
}

export function choose(x: ChooserInputs, profile: PhysicalProfile) {
  const path = forecast(x);
  const ip = interceptPoint({ pos: x.mpos, vel: x.mvel, profile, speedScale: x.scale }, path,
    { horizon: x.horizon, step: 0.1, radius: x.radius, request: x.req ?? undefined, recordSamples: true });
  return { t: ip.t, point: ip.point, status: ip.estimate.status === 'estimated-feasible' ? 'F' : 'B', samples: ip.samples! };
}

/** One group of later inputs swapped into the earlier ones. */
export const swaps: Record<string, (o: ChooserInputs, n: ChooserInputs) => ChooserInputs> = {
  self: (o, n) => ({ ...o, mpos: n.mpos, mvel: n.mvel, scale: n.scale }),
  pos: (o, n) => ({ ...o, pos: n.pos }),
  dir: (o, n) => ({ ...o, h: n.h }),
  speed: (o, n) => ({ ...o, sp: n.sp, V: Math.max(0, o.V + (n.sp - o.sp)) }),
  accel: (o, n) => ({ ...o, V: Math.max(0, o.V + (n.V - o.V) - (n.sp - o.sp)) }),
  request: (o, n) => ({ ...o, req: n.req, horizon: n.horizon, radius: n.radius }),
};

/** Counterfactual read-outs of the same sampled curve (offline only; nothing in the engine uses them).
 *  current      earliest feasible sample, else least deficit (interceptPoint as it is)
 *  noAccel      the same rule on a forecast without the acceleration term (relaxed speed = observed speed)
 *  peak         the sample with the most slack (earliest on ties), feasible or not
 *  peakNoAccel  both */
export type Rule = 'current' | 'noAccel' | 'peak' | 'peakNoAccel';
export function chooseBy(rule: Rule, x: ChooserInputs, profile: PhysicalProfile) {
  const y = rule === 'noAccel' || rule === 'peakNoAccel' ? { ...x, V: x.sp } : x;
  if (rule === 'current' || rule === 'noAccel') { const r = choose(y, profile); return { t: r.t, status: r.status, point: r.point }; }
  const c = curve(y, profile);
  let best = c[0];
  for (const s of c) if (s.slack > best.slack + 1e-9) best = s;
  return { t: best.t, status: best.slack >= 0 ? 'F' : 'B', point: best.point };
}

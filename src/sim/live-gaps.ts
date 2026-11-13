/** Live gaps: where a run gap is now, as one player perceives the line.
 *
 * A gap is the space between offensive bodies, so it moves when they move.
 * Gaps are counted outward from the center in the observer's delayed picture
 * of the surface (linemen and inline ends): A between the center and the first
 * body, B between the first and second, C beyond the second (between it and an
 * inline end), D outside the last. With the bodies in their stances this is
 * exactly the alignment landmarks (`gapY`).
 *
 * A body that has left the surface (a puller stepping back and across, or a
 * climber at the second level) no longer bounds a gap. If his stance lay
 * between bodies still on the surface, he leaves a vacancy there, so his
 * neighbours' gaps keep their names: a pulled guard opens one wide space
 * between center and tackle rather than renaming the tackle's gaps.
 *
 * Shared by every run controller; nothing here knows the called scheme.
 */
import type { Gap } from '../playbook/types.js';
import { gapY } from '../playbook/alignment.js';
import type { Agent } from './agent.js';
import type { Perceived } from './perception.js';
import type { PlaySim } from './playsim.js';

/** Run fits use live gaps (LIVE_GAPS=0 restores snap landmarks, for A/B). */
export const LIVE_GAPS = process.env.LIVE_GAPS !== '0';

const CORE = new Set(['LT', 'LG', 'C', 'RG', 'RT']);

export interface SurfaceBody {
  agent: Agent;
  seen: Perceived;
  /** Lateral stance position (snap alignment), yd. */
  home: number;
}

export interface OutwardBody { y: number; vel: number; vacancy: boolean; radius: number }

export interface LinePicture {
  /** Perceived center (or the ball's spot when he is not on the surface). */
  center: number;
  /** The center's lateral velocity and radius in this picture. */
  centerVel: number;
  centerRadius: number;
  /** Per side (+1 / -1): lateral positions outward from the center, with
   * vacancies where a departed body's stance lay between present ones. */
  outward: Record<'1' | '-1', OutwardBody[]>;
  /** Bodies on the surface, and bodies seen leaving it (pull, slice, climb). */
  surface: SurfaceBody[];
  departed: SurfaceBody[];
}

const cache = new WeakMap<Agent, { t: number; sim: PlaySim; picture: LinePicture }>();

/** Has this body left the line? A puller steps back and across; a climber
 * leaves for the second level. Either no longer bounds a gap. A body pushed
 * back and across while the observer sees him on a defender is still
 * blocking on the surface. */
function departed(sim: PlaySim, observer: Agent, b: SurfaceBody): boolean {
  const dir = sim.attackDir(b.agent.team);
  const home = sim.offAlign.spots[b.agent.slot]!.pos;
  const depth = (b.seen.pos.x - home.x) * dir, across = Math.abs(b.seen.pos.y - home.y);
  if (depth > 1.5 || depth < -1.5) return true;
  // Pullers run flat, inside the half-yard depth above, and cross behind the
  // line: a body still behind his stance who is now seen past a teammate he
  // lined up beside, with no defender on him, has left his place in the line.
  // A zone line moves together and keeps its order, so a reach or cutoff
  // running flat across stays on the surface.
  if ((depth < 0 && crossedBehind(sim, observer, b) || depth < -.5 && across > 1) && !seenOnDefender(sim, observer, b)) return true;
  return false;
}

/** In the observer's pictures, this body has crossed a line body whose stance
 * lay beside his on the way: that teammate's stance lies between this body's
 * stance and where this body is now, the teammate is still seen on that path,
 * and this body is clear past him, the two bodies' widths apart. A teammate
 * who himself left and crossed the other way is not on that path, and a body
 * that has not reached a teammate's stance has passed no one, so a nearly
 * still body is never taken off the line by someone else's pull; two blockers
 * who meet at the edge (a tackle setting back outside his tight end) have not
 * crossed each other. */
function crossedBehind(sim: PlaySim, observer: Agent, b: SurfaceBody): boolean {
  const s = Math.sign(b.seen.pos.y - b.home);
  if (!s) return false;
  return sim.offense.some((o) => {
    const spot = sim.offAlign.spots[o.slot];
    if (o === b.agent || !spot || !(CORE.has(o.slot) || spot.inline) || (spot.pos.y - b.home) * s <= 0
      || (b.seen.pos.y - spot.pos.y) * s <= 0) return false;
    const y = sim.see(observer, o).pos.y;
    return (y - b.home) * s > 0 && (b.seen.pos.y - y) * s > b.agent.profile.radius + o.profile.radius;
  });
}

/** The observer's visible-block test: in his pictures, a defender within
 * touching distance of this body (centres within radii + .35 yd). */
function seenOnDefender(sim: PlaySim, observer: Agent, b: SurfaceBody): boolean {
  return sim.opponents(b.agent).some((d) => {
    const p = d === observer ? d.pos : sim.see(observer, d).pos;
    return Math.hypot(p.x - b.seen.pos.x, p.y - b.seen.pos.y) < b.agent.profile.radius + d.profile.radius + .35;
  });
}

/** The offensive surface as `observer` currently perceives it. */
export function linePicture(sim: PlaySim, observer: Agent): LinePicture {
  const hit = cache.get(observer);
  if (hit && hit.t === sim.t && hit.sim === sim) return hit.picture;
  const surface: SurfaceBody[] = [], gone: SurfaceBody[] = [];
  let centerBody: SurfaceBody | null = null;
  for (const o of sim.offense) {
    const spot = sim.offAlign.spots[o.slot];
    if (!spot || !(CORE.has(o.slot) || spot.inline)) continue;
    const b = { agent: o, seen: sim.see(observer, o), home: spot.pos.y };
    if (departed(sim, observer, b)) gone.push(b);
    else { surface.push(b); if (o.slot === 'C') centerBody = b; }
  }
  const center = centerBody ? centerBody.seen.pos.y : sim.ballY;
  const outward: LinePicture['outward'] = { '1': [], '-1': [] };
  const key = (side: number) => (side > 0 ? '1' : '-1') as '1' | '-1';
  for (const b of surface) {
    if (b === centerBody) continue;
    outward[key(b.seen.pos.y - center)].push({ y: b.seen.pos.y, vel: b.seen.vel.y, vacancy: false, radius: b.agent.profile.radius });
  }
  // A departed body whose stance lay between two present bodies leaves a
  // vacancy at the same fraction of the space between them now.
  const homeCenter = centerBody?.home ?? sim.ballY;
  for (const g of gone) {
    // The center is already the origin of the gap count. His departure
    // cannot insert another outward boundary and rename B as A.
    if (g.agent.slot === 'C') continue;
    const side = g.home >= homeCenter ? 1 : -1;
    const present = surface.filter((b) => b !== centerBody && (b.home - homeCenter) * side > 0)
      .sort((p, q) => (p.home - q.home) * side);
    const inner = [...present].reverse().find((b) => (b.home - g.home) * side < 0);
    const outer = present.find((b) => (b.home - g.home) * side > 0);
    if (!outer) continue; // beyond the end man: the surface simply ends sooner
    const innerHome = inner?.home ?? homeCenter, innerY = inner ? inner.seen.pos.y : center;
    const w = (g.home - innerHome) / ((outer.home - innerHome) || 1);
    const innerVel = inner ? inner.seen.vel.y : centerBody?.seen.vel.y ?? 0;
    outward[key(side)].push({ y: innerY + (outer.seen.pos.y - innerY) * w, vel: innerVel + (outer.seen.vel.y - innerVel) * w, vacancy: true, radius: 0 });
  }
  for (const side of [1, -1]) outward[key(side)].sort((p, q) => (p.y - q.y) * side);
  const picture = { center, centerVel: centerBody?.seen.vel.y ?? 0, centerRadius: centerBody?.agent.profile.radius ?? 0,
    outward, surface, departed: gone };
  cache.set(observer, { t: sim.t, sim, picture });
  return picture;
}

/** A gap's lateral position in a line picture (absolute y). Spacing beyond the
 * last counted body follows the alignment landmarks (half split .65, end man
 * C .65 and D 1.6 outside a tackle, .7 outside an inline end). */
export function gapIn(p: LinePicture, gap: Gap, side: number): number {
  // Offsets from the center keep mirrored pictures exactly mirrored.
  const s = side >= 0 ? 1 : -1, c = p.center, n = p.outward[s > 0 ? '1' : '-1'].length;
  const o = p.outward[s > 0 ? '1' : '-1'].map((b) => (b.y - c) * s);
  let off: number;
  switch (gap) {
    case 'A': off = n >= 1 ? o[0] / 2 : .65; break;
    case 'B': off = n >= 2 ? (o[0] + o[1]) / 2 : n === 1 ? o[0] + .65 : 1.95; break;
    case 'C': off = n >= 3 ? (o[1] + o[2]) / 2 : n === 2 ? o[1] + .65 : n === 1 ? o[0] + 1.95 : 3.25; break;
    case 'D': off = n >= 3 ? o[n - 1] + .7 : n === 2 ? o[1] + 1.6 : n === 1 ? o[0] + 2.9 : 4.2; break;
  }
  return c + s * off;
}

/** A gap as a space between bodies: where it is, how wide the opening
 * between its bounding bodies is (radii removed; an outside gap with no
 * outer body is open), and how fast it moves (its bounding bodies' mean
 * lateral velocity). Derived geometry only; it moves nobody. */
export interface GapSurface { y: number; width: number; vel: number }

export function gapSurfaceIn(p: LinePicture, gap: Gap, side: number): GapSurface {
  const s = side >= 0 ? 1 : -1, o = p.outward[s > 0 ? '1' : '-1'];
  const c: OutwardBody = { y: p.center, vel: p.centerVel, vacancy: false, radius: p.centerRadius };
  const pair = (a: OutwardBody | undefined, b: OutwardBody | undefined) => a && b
    ? { width: Math.abs(b.y - a.y) - a.radius - b.radius, vel: (a.vel + b.vel) / 2 }
    : { width: Infinity, vel: (a ?? b ?? c).vel };
  const bounds = gap === 'A' ? pair(c, o[0]) : gap === 'B' ? pair(o[0], o[1])
    : gap === 'C' ? pair(o[1], o[2]) : pair(o[o.length - 1], undefined);
  return { y: gapIn(p, gap, s), ...bounds };
}

/** The assigned gap as `observer` sees it now (LIVE_GAPS=0: snap landmark, still). */
export function liveGap(sim: PlaySim, observer: Agent, gap: Gap, side: number): GapSurface {
  if (!LIVE_GAPS) return { y: gapY(sim.offAlign, gap, side), width: Infinity, vel: 0 };
  return gapSurfaceIn(linePicture(sim, observer), gap, side);
}

/** Where `observer` sees an assigned gap now (absolute y). */
export function liveGapY(sim: PlaySim, observer: Agent, gap: Gap, side: number): number {
  if (!LIVE_GAPS) return gapY(sim.offAlign, gap, side);
  return gapIn(linePicture(sim, observer), gap, side);
}

/** Mean lateral velocity of the surface the observer sees (line flow), yd/s. */
export function lineFlow(p: LinePicture): number {
  const v = p.surface.map((b) => b.seen.vel.y);
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0;
}

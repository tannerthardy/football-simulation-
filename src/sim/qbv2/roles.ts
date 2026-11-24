/**
 * QB_V2: resolving a coached role to a man in the passer's own picture (QB lane with Flex, 2026-11-24; Flex's module B
 * note §4, docs/reviews/2026-11-24-qb-module-b-presnap-plan.md). One resolver for both sides of the snap: Flex's
 * pre-snap module B calls it on his scan picture, module C after the snap, so a role names the same man before and after
 * it. It reads only the picture it is given (his positions and velocities of defenders and of his own receivers), never
 * an assignment, a slot label or the call. A role once resolved keeps its man while the man stays within the role's
 * area plus an exit margin (commit to a decision); only then is it re-resolved.
 */
import type { KeyRole } from './plan.js';

export interface PicturedMan { id: number; x: number; y: number; vx: number; vy: number }

/** The picture the resolver needs, in field coordinates. */
export interface RolePicture {
  defenders: PicturedMan[];
  /** His receivers by plan ref (S1, S2, W1, ...) as he pictures them. */
  receivers: Partial<Record<string, PicturedMan>>;
  /** The line of scrimmage (x) and which way is downfield (+1 or -1). */
  los: number;
  dir: 1 | -1;
  /** The ball's lateral position (y) and which lateral direction is the strong side (S): +1 or -1. */
  ballY: number;
  strong: 1 | -1;
  /** Seconds since the snap (negative before it). */
  t: number;
}

/** Area of a role, in yards: `deep` past the line, `out` lateral from the ball toward the side (+ = toward the side). */
interface Area { deep: [number, number]; out: [number, number] | ((p: RolePicture, side: 'S' | 'W') => [number, number]) }

/** Exit margin (yd) a resolved man may leave his role's area by before the role is re-resolved (chosen). */
const ROLE_EXIT = 1.5;

const deepOf = (p: RolePicture, m: { x: number }) => (m.x - p.los) * p.dir;
const outOf = (p: RolePicture, m: { y: number }, side: 'S' | 'W') => (m.y - p.ballY) * p.strong * (side === 'S' ? 1 : -1);
/** A receiver's lateral position from the ball toward the side, by ref (#1 = S1/W1, #2 = S2/W2). */
const recOut = (p: RolePicture, side: 'S' | 'W', n: number): number | null => { const r = p.receivers[`${side}${n}`]; return r ? outOf(p, r, side) : null; };

/** Pre-snap definitions are Flex's (§4); after the snap flat / curl / hook are where the man has dropped. */
function area(role: KeyRole, p: RolePicture, side: 'S' | 'W'): Area | null {
  const two = recOut(p, side, 2) ?? 6, one = recOut(p, side, 1) ?? 14;
  switch (role) {
    case 'corner': return { deep: [-1, 9], out: [Math.max(two, 8), 40] };
    case 'mofSafety': return { deep: [9, 30], out: [-6, 6] };
    case 'apex': case 'overhang': return { deep: [3, 7], out: [3.5, Math.max(4, two)] };
    // Before the snap the flat defender is the first man inside #1 outside the box (the apex or nickel; Rules +
    // Coaching, Throw Deep); after it, where he has widened to.
    case 'flat': return p.t < 0 ? { deep: [0, 7], out: [3.5, one] } : { deep: [-1, 6], out: [two, 40] };
    case 'curl': return p.t < 0 ? { deep: [3, 8], out: [two - 2, one] } : { deep: [6, 13], out: [two - 1, one + 1] };
    case 'hook': return p.t < 0 ? { deep: [3, 8], out: [0, two] } : { deep: [5, 12], out: [-1, two] };
    default: return null;
  }
}

const inArea = (p: RolePicture, a: Area, m: PicturedMan, side: 'S' | 'W', margin: number): boolean => {
  const d = deepOf(p, m), o = outOf(p, m, side), out = typeof a.out === 'function' ? a.out(p, side) : a.out;
  return d >= a.deep[0] - margin && d <= a.deep[1] + margin && o >= out[0] - margin && o <= out[1] + margin;
};

/** The man a role names in this picture: inside its area, the widest (corner), deepest (mofSafety) or nearest to the
 * role's landmark (the rest). Null when no one is there (a vacated flat is an answer: nobody is in it). */
function pick(role: KeyRole, p: RolePicture, side: 'S' | 'W'): PicturedMan | null {
  const a = area(role, p, side); if (!a) return null;
  const cand = p.defenders.filter((m) => inArea(p, a, m, side, 0));
  if (!cand.length) return null;
  if (role === 'corner') return cand.reduce((b, m) => (outOf(p, m, side) > outOf(p, b, side) ? m : b));
  if (role === 'mofSafety') return cand.reduce((b, m) => (deepOf(p, m) > deepOf(p, b) ? m : b));
  const out = typeof a.out === 'function' ? a.out(p, side) : a.out;
  // The role's landmark as coached (chosen): the flat 3 yd deep and 4 yd outside #2, the curl 10 yd deep between #1 and
  // #2, the hook 8 yd deep halfway to #2; apex and overhang the middle of their area.
  const two = recOut(p, side, 2) ?? 6, one = recOut(p, side, 1) ?? 14;
  const [cd, co] = role === 'flat' ? (p.t < 0 ? [4, two] : [3, two + 4]) : role === 'curl' ? [10, (one + two) / 2] : role === 'hook' ? [8, two / 2]
    : [(a.deep[0] + a.deep[1]) / 2, (out[0] + out[1]) / 2];
  const dist = (m: PicturedMan) => Math.hypot(deepOf(p, m) - cd, outOf(p, m, side) - co);
  return cand.reduce((b, m) => (dist(m) < dist(b) ? m : b));
}

/** Resolves roles over a play, keeping each resolved man while he stays inside his role's area plus ROLE_EXIT. */
export class RoleResolver {
  private held = new Map<string, number | null>();
  resolve(p: RolePicture, role: KeyRole, side: 'S' | 'W' = 'S'): PicturedMan | null {
    const key = `${side}:${role}`, a = area(role, p, side);
    const keptId = this.held.get(key);
    if (keptId != null && a) {
      const m = p.defenders.find((d) => d.id === keptId);
      if (m && inArea(p, a, m, side, ROLE_EXIT)) return m;
    }
    const m = pick(role, p, side);
    this.held.set(key, m ? m.id : null);
    return m;
  }
}

/** One-shot form (Flex's pre-snap scan). */
export const resolveRole = (p: RolePicture, role: KeyRole, side: 'S' | 'W' = 'S'): PicturedMan | null => pick(role, p, side);

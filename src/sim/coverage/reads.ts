/**
 * Route declarations as a defender sees them. Pattern-match coverage keys
 * receivers by number (#1 widest, #2, #3 to a side) and asks one question of
 * each: what did he declare? Vertical, out, flat, under (shallow in-breaker),
 * in (intermediate in-breaker), stop (hitch/curl settling), or block.
 *
 * Each defender reads through his own perception (delayed, lagged, focus-
 * dependent) and needs a declaration to persist for a moment before he
 * believes it, so two defenders keyed on the same #2 can disagree for a beat —
 * which is how real exchanges bust. Nothing here knows the route that was
 * called; it only sees movement.
 */
import { believedCaps, lookAt } from '../believed-body.js';
import { clamp, type Vec2 } from '../../core/vec.js';
import type { ReceiverRef } from '../../playbook/types.js';
import type { Agent } from '../agent.js';
import { RouteObservation } from '../coverage-read.js';
import { observedBlocking, showsBlock } from '../coverage-cues.js';
import type { PlaySim } from '../playsim.js';

/** READ_VERTICAL_LOS (on since engine-90; READ_VERTICAL_LOS=0 restores): a release is read as
 * vertical only past the line of scrimmage in the reader's picture (a protecting back stepping up behind it is not). */
export const READ_VERTICAL_LOS = process.env.READ_VERTICAL_LOS !== '0';

/** BACK_CLEAR (on since engine-90; BACK_CLEAR=0 restores): a back who started in the backfield
 * declares a flat release from what the reader sees of him clearing the box, not from lateral speed behind the line.
 * Behind the line (deeper than BACK_CLEAR_DEPTH) and inside his rush-side tackle's seen width plus BACK_CLEAR_WIDTH, a
 * back moving out toward a rusher he could block (a defender seen within BACK_CLEAR_RANGE, on or behind the line, ahead
 * of his seen path within 45 degrees) is not read as a flat release: that is a protector working to the edge.
 * Once he is past the tackle's width, up near the line, or not squaring on a rusher (a swing away from the rush, a
 * check-release after his chip), the flat read is as fast as before. Margins are stated choices: 0.5 yd of width,
 * 1.5 yd of depth, 3 yd of range, 45 degrees. */
export const BACK_CLEAR = process.env.BACK_CLEAR !== '0';
const BACK_CLEAR_WIDTH = 0.5, BACK_CLEAR_DEPTH = 1.5, BACK_CLEAR_RANGE = 3;

export type Release = 'none' | 'block' | 'vertical' | 'out' | 'flat' | 'under' | 'in' | 'stop';

export interface ReceiverRead {
  r: Agent;
  pos: Vec2;
  vel: Vec2;
  /** Yards beyond the line. */
  depth: number;
  /** Lateral movement from his alignment toward his own sideline (+) or the ball (−). */
  outward: number;
  /** Sign of "outside" for this receiver (+1 = +y). */
  outSign: number;
  /** Current believed declaration. */
  release: Release;
  /** First declaration he believed after the snap. */
  first: Release;
  /** When the current declaration was believed. */
  since: number;
  /** Has this receiver shown a vertical stem (depth beyond 7 while climbing)? */
  climbed: boolean;
  /** Deepest he has been seen beyond the line since the snap. */
  deepest: number;
}

interface Memory {
  release: Release;
  first: Release;
  since: number;
  pending: Release;
  pendingSince: number;
  climbed: boolean;
  deepest: number;
  obs: RouteObservation;
  start: Vec2;
  outSign: number;
}

/** How long a new declaration must persist before the defender believes it. */
const CONFIRM = 0.12;

export class ReleaseReader {
  private readonly memory = new Map<Agent, Memory>();
  private readonly cache = new Map<Agent, ReceiverRead>();
  private cacheT = -1;

  /** Only keys already consumed by this tick's rule; no additional reads. */
  recordedReads(t: number): ReadonlyArray<ReceiverRead> {
    return this.cacheT === t ? [...this.cache.values()] : [];
  }

  constructor(private readonly a: Agent, sim: PlaySim) {
    // Alignments at the snap: declarations are relative to where he started.
    for (const r of sim.offense) {
      if (r === sim.qb || isLineman(r)) continue;
      const outSign = Math.sign(r.pos.y - sim.ballY) || 0;
      this.memory.set(r, { release: 'none', first: 'none', since: 0, pending: 'none', pendingSince: 0, climbed: false,
        deepest: -Infinity, obs: new RouteObservation(), start: { ...r.pos }, outSign });
    }
  }

  /** The defender's current read of receiver `r` (cached per tick). */
  read(sim: PlaySim, r: Agent): ReceiverRead | null {
    if (sim.t !== this.cacheT) {
      this.cache.clear();
      this.cacheT = sim.t;
    }
    const hit = this.cache.get(r);
    if (hit) return hit;
    const m = this.memory.get(r);
    if (!m) return null;
    const a = this.a;
    const cue = sim.see(a, r);
    lookAt(sim, a, r, cue);
    const seen = m.obs.read(cue, sim.t, believedCaps(sim, a, r), a.profile.reactionTime, a.r('anticipation') * a.mind.focus);
    // A back declares his side when he releases.
    if (m.outSign === 0 && Math.abs(seen.vel.y) > 1.5) m.outSign = Math.sign(seen.vel.y);
    const outSign = m.outSign || 1;
    const depth = seen.pos.x - sim.los;
    const outward = (seen.pos.y - m.start.y) * outSign;
    const vOut = seen.vel.y * outSign;
    const vx = seen.vel.x;
    const speed = Math.hypot(seen.vel.x, seen.vel.y);
    if (depth > 7 && vx > 2.5) m.climbed = true;
    m.deepest = Math.max(m.deepest, depth);
    let now: Release = 'none';
    // A run reader need not invent a new vertical when his already accepted
    // blocker crosses the shallow admission boundary. Keep requiring current
    // acquired pads/contact evidence; real releases retain normal confirmation.
    const blocking = m.release === 'block' && a.recog?.read === 'run'
      ? observedBlocking(a, sim, r, seen) : showsBlock(a, sim, r, seen);
    if (blocking) now = 'block';
    // Breaks count once the path leans about 30° off vertical: a slant is an
    // in-breaker from its first step inside, not when it flattens.
    else if (vOut > 1.8 && vOut > Math.abs(vx) * 0.6) {
      now = depth < 3.5 && !m.climbed ? 'flat' : 'out';
      if (now === 'flat' && BACK_CLEAR && m.start.x - sim.los < -2 && protectingSlide(a, sim, seen, outSign, depth)) now = 'none';
    }
    else if (-vOut > 1.8 && -vOut > Math.abs(vx) * 0.6) now = depth < 6.5 ? 'under' : 'in';
    // READ_VERTICAL_LOS: a vertical release is upfield motion past the line of scrimmage as he sees it; a back stepping
    // up in his protection set behind the line (and latching 'vertical') is not one.
    else if (vx > 2.5 && vx > Math.abs(seen.vel.y) && (!READ_VERTICAL_LOS || depth > 0)) now = 'vertical';
    else if (speed < 2.2 && depth > 2.5) now = 'stop';
    // Believe a new declaration only after it persists (focus shortens it).
    if (now !== 'none' && now !== m.release) {
      if (now !== m.pending) {
        m.pending = now;
        m.pendingSince = sim.t;
      } else if (sim.t - m.pendingSince >= CONFIRM * (1.6 - 0.6 * a.mind.focus)) {
        m.release = now;
        m.since = sim.t;
        if (m.first === 'none') m.first = now;
      }
    } else {
      // A fake followed by ambiguity or the original stem breaks the chain
      // of evidence. A later similar fake must earn its own confirmation.
      m.pending = 'none';
      m.pendingSince = sim.t;
    }
    const read: ReceiverRead = { r, pos: seen.pos, vel: seen.vel, depth, outward, outSign, release: m.release, first: m.first,
      since: m.since, climbed: m.climbed, deepest: m.deepest };
    this.cache.set(r, read);
    return read;
  }

  /** Read a numbered receiver on a side (strength-relative), if he exists. */
  readRef(sim: PlaySim, ref: ReceiverRef): ReceiverRead | null {
    const slot = sim.offAlign.numbering[ref];
    const r = slot ? sim.slot(slot) : undefined;
    return r ? this.read(sim, r) : null;
  }

  /**
   * Receivers currently on a side of the ball (sign = +1/−1 in y), outside-in,
   * including a released back and a crosser that has come over: "final"
   * numbering after the snap, which is what hook defenders must find.
   */
  sideNow(sim: PlaySim, sign: number): ReceiverRead[] {
    const out: ReceiverRead[] = [];
    for (const r of this.memory.keys()) {
      const rd = this.read(sim, r);
      if (!rd || rd.release === 'block') continue;
      if ((rd.pos.y - sim.ballY) * sign > -0.5) out.push(rd);
    }
    return out.sort((p, q) => Math.abs(q.pos.y - sim.ballY) - Math.abs(p.pos.y - sim.ballY));
  }
}

/** BACK_CLEAR: from his own picture, is this back still inside the box behind the line and moving onto a rusher? */
function protectingSlide(a: Agent, sim: PlaySim, seen: { pos: Vec2; vel: Vec2 }, outSign: number, depth: number): boolean {
  if (depth > -BACK_CLEAR_DEPTH) return false;
  let tackleWidth = 0;
  for (const o of sim.offense) if (isLineman(o)) tackleWidth = Math.max(tackleWidth, (sim.see(a, o).pos.y - sim.ballY) * outSign);
  if ((seen.pos.y - sim.ballY) * outSign > tackleWidth + BACK_CLEAR_WIDTH) return false;
  const sp = Math.hypot(seen.vel.x, seen.vel.y) || 1;
  return sim.defense.some(d => {
    if (d === a) return false;
    const c = sim.see(a, d);
    if (c.pos.x - sim.los > 1) return false;
    const dx = c.pos.x - seen.pos.x, dy = c.pos.y - seen.pos.y, dist = Math.hypot(dx, dy);
    return dist < BACK_CLEAR_RANGE && dist > 0.05 && (dx * seen.vel.x + dy * seen.vel.y) / (dist * sp) > Math.SQRT1_2;
  });
}

export function isLineman(a: Agent): boolean {
  return a.slot === 'LT' || a.slot === 'LG' || a.slot === 'C' || a.slot === 'RG' || a.slot === 'RT';
}

/** A short (under) or settling route near the line: what MOD/Palms call "under". */
export function isShort(rd: ReceiverRead, depth = 7): boolean {
  return (rd.release === 'under' || rd.release === 'stop' || rd.release === 'flat' || rd.release === 'in' || rd.release === 'out') && rd.depth < depth;
}

/** Quick out/flat by a slot (the Palms trigger): outside and shallow, before he has climbed. */
export function isQuickOut(rd: ReceiverRead, sim: PlaySim): boolean {
  void sim;
  return (rd.release === 'flat' || rd.release === 'out') && rd.depth < 7.5 && !rd.climbed;
}

export const deepEnough = (rd: ReceiverRead, depth: number): boolean => rd.depth >= depth;
export const clampY = (y: number, w: number): number => clamp(y, 0.5, w - 0.5);

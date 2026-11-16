/** RELEASE_BELIEF (experimental, off; RELEASE_BELIEF=1 turns it on): each defender's belief that the ball is gone, from
 * the release cues he saw (Rules + Coaching's `releaseEvidence`, presented possession step 1b, #713), instead of the
 * true air state.
 *
 * Today `sawThrow` starts from `sim.ball.kind === 'air'`: no defender can believe a throw that has not happened (a pump
 * he bites on) or keep believing one he saw once the ball is caught, and a defender with his eyes on the passer keys
 * the throwing motion from his picture with the true air state as the gate. With this flag his belief is his own:
 *  - motion (set -> load in his picture of the arm): a throw is coming (`loadingAt`);
 *  - through (load -> deliver): he believes it is out, from the arm (`releasedAt`, source 'arm'); a pump is a through
 *    with no ball after it, so a defender keying the arm can bite on one;
 *  - pulled (back to set with the ball still in hand): an arm belief is undone (loading and released from the arm);
 *  - ball (the ball in flight, seen): released, from the ball; never undone by an arm cue.
 * Cues arrive at the sample's own moment (his delay, view and line of sight are in `releaseEvidence`), and a gap in his
 * view can bring motion and through on the same tick: he saw the arm come through. No weights: skill enters through
 * what he sees (his delay, his eyes). The store is updated once per tick per defender, on first use.
 * Not in this step: the receiver's hands (`readsHandsAt` keeps its channel), and the callers' own air-state gates. */
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { releaseEvidence } from './release-evidence.js';
import { BALL_EST_INCIDENTAL, estimatesFor } from './ball-estimate.js';

export const RELEASE_BELIEF = process.env.RELEASE_BELIEF !== '0';

/** BALL_CALL (off; C14 honest defender, 2026-11-16, attempt 1): a defender who never saw the release learns the ball is
 * up from what he can perceive, never its place. (1) The call: a teammate who has the flight in his own samples yells
 * 'ball' after his reaction; within BALL_CALL_RANGE the sound reaches him at its travel time and he takes it in after his
 * own observation delay (LOOSE_SEEN's heard call). Hearers do not call on: only a man with the ball in his eyes has it.
 * (2) His own man: a man defender whose receiver, in his view, has eased off (seen speed under EASE_FRAC of his best in
 * the last second, held EASE_HOLD) with his body turned away from the passer takes it as gone elsewhere, after his
 * recognition delay. A receiver who sits facing the passer, or sells a break and goes again, gives nothing. Either way
 * he then looks for the ball (ARM_LOOK's search) and knows only what his own samples give. Constants are stated choices. */
export const BALL_CALL = process.env.BALL_CALL === '1';
const BALL_CALL_RANGE = 20, SOUND_YDS = 375, EASE_FRAC = 0.5, EASE_HOLD = 0.4;
const ease = new WeakMap<PlaySim, Map<number, { man: number; hist: { t: number; sp: number }[]; lowSince?: number }>>();

function heardCallAt(sim: PlaySim, a: Agent): number | undefined {
  const E = sim.ballEstimates;
  if (!E || sim.ball.kind !== 'air') return undefined;
  const take = a.mind.observationDelay(a.profile.reactionTime);
  let best: number | undefined;
  for (const o of sim.defense) {
    if (o === a || !estimatesFor(o)) continue;
    const f = E.firstSeenAt(o);
    if (f === undefined) continue;
    const d = Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y);
    if (d > BALL_CALL_RANGE) continue;
    const heard = f + o.profile.reactionTime + d / SOUND_YDS;
    if (heard + take <= sim.t + 1e-9 && (best === undefined || heard < best)) best = heard;
  }
  return best;
}

function manEasedAt(sim: PlaySim, a: Agent): number | undefined {
  const man = a.behavior?.kind === 'man' ? (a.behavior as { target?: Agent }).target : undefined;
  if (!man || man.team === a.team) return undefined;
  let m = ease.get(sim);
  if (!m) { m = new Map(); ease.set(sim, m); }
  let h = m.get(a.idx);
  if (!h || h.man !== man.idx) { h = { man: man.idx, hist: [] }; m.set(a.idx, h); }
  const seen = sim.see(a, man), brg = Math.atan2(seen.pos.y - a.pos.y, seen.pos.x - a.pos.x);
  // Only what is in his view of his man.
  if (Math.cos(a.body.facing - brg) <= Math.cos(100 * Math.PI / 180)) { h.lowSince = undefined; return undefined; }
  const sp = Math.hypot(seen.vel.x, seen.vel.y);
  if (!h.hist.length || h.hist[h.hist.length - 1].t < sim.t - 1e-9) h.hist.push({ t: sim.t, sp });
  while (h.hist.length && sim.t - h.hist[0].t > 1 + 1e-9) h.hist.shift();
  const top = Math.max(...h.hist.map((x) => x.sp)), q = sim.see(a, sim.qb);
  const away = Math.cos(seen.facing - Math.atan2(q.pos.y - seen.pos.y, q.pos.x - seen.pos.x)) < 0;
  if (top >= 4 && sp < EASE_FRAC * top && away) h.lowSince ??= sim.t; else h.lowSince = undefined;
  if (h.lowSince === undefined || sim.t - h.lowSince < EASE_HOLD - 1e-9) return undefined;
  const recog = a.mind.observationDelay(a.profile.reactionTime);
  return sim.t - h.lowSince >= EASE_HOLD + recog - 1e-9 ? h.lowSince + EASE_HOLD : undefined;
}

export interface ReleaseBelief {
  /** When the throwing motion he saw began (sample time), while it stands. */
  loadingAt: number | undefined;
  /** When he believes the ball came out (sample time), and from what. */
  releasedAt: number | undefined;
  source: 'arm' | 'ball' | 'call' | 'man' | undefined;
  /** When the ball itself was first in his view (sample time). */
  ballAt: number | undefined;
}

const store = new WeakMap<PlaySim, Map<number, ReleaseBelief & { t: number }>>();

/** His release belief this tick (updated from this tick's cues on first use). */
export function releaseBelief(sim: PlaySim, a: Agent): ReleaseBelief {
  let m = store.get(sim);
  if (!m) { m = new Map(); store.set(sim, m); }
  let b = m.get(a.idx);
  if (!b) { b = { loadingAt: undefined, releasedAt: undefined, source: undefined, ballAt: undefined, t: -1 }; m.set(a.idx, b); }
  if (b.t === sim.t) return b;
  b.t = sim.t;
  // BALL_EST with bit 32 (passive sight through his head): his sight of the ball is his own sample alone, below.
  const ownSight = estimatesFor(a) && BALL_EST_INCIDENTAL;
  for (const cue of releaseEvidence(sim, a)) {
    if (cue.kind === 'ball') {
      if (ownSight) continue;
      b.ballAt ??= cue.at;
      if (b.source !== 'ball') { b.releasedAt = b.source === 'arm' && b.releasedAt !== undefined ? Math.min(b.releasedAt, cue.at) : cue.at; b.source = 'ball'; }
    } else if (cue.kind === 'motion') {
      if (b.source !== 'ball') b.loadingAt ??= cue.at;
    } else if (cue.kind === 'through') {
      if (b.source !== 'ball') { b.loadingAt ??= cue.at; b.releasedAt ??= cue.at; b.source = 'arm'; }
    } else if (cue.kind === 'pulled') {
      if (b.source !== 'ball') { b.loadingAt = undefined; b.releasedAt = undefined; b.source = undefined; }
    }
  }
  // BALL_EST (this player's own estimate): the first ball he sampled (through whichever head he has) is a ball cue;
  // with bit 32 it is the only one (one perception: the cone above is skipped), without it it joins the cone's. It never
  // undoes an arm cue.
  if (estimatesFor(a)) {
    const at = sim.ballEstimates?.firstSeenAt(a);
    if (at !== undefined) {
      b.ballAt = b.ballAt === undefined ? at : Math.min(b.ballAt, at);
      if (b.source !== 'ball') { b.releasedAt = b.releasedAt !== undefined ? Math.min(b.releasedAt, at) : at; b.source = 'ball'; }
    }
  }
  // BALL_CALL: with no release believed yet, the heard call, then his own man easing off.
  // No gate on the ball's true state: his man easing off before a throw is a false alarm he pays for.
  if (BALL_CALL && a.team === 'D' && b.releasedAt === undefined) {
    const heard = heardCallAt(sim, a);
    if (heard !== undefined) { b.releasedAt = heard; b.source = 'call'; }
    else { const eased = manEasedAt(sim, a); if (eased !== undefined) { b.releasedAt = eased; b.source = 'man'; } }
  }
  return b;
}

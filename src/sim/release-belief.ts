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

export const RELEASE_BELIEF = process.env.RELEASE_BELIEF === '1';

export interface ReleaseBelief {
  /** When the throwing motion he saw began (sample time), while it stands. */
  loadingAt: number | undefined;
  /** When he believes the ball came out (sample time), and from what. */
  releasedAt: number | undefined;
  source: 'arm' | 'ball' | undefined;
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
  for (const cue of releaseEvidence(sim, a)) {
    if (cue.kind === 'ball') {
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
  return b;
}

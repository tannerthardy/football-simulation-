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

/** Read-only: his release belief as last updated (no update now). For a reader that runs before this tick's cues are in
 * (ZONE_EYES's head step): it must not fix this tick's belief early for everyone else. */
export function lastReleaseBelief(sim: PlaySim, a: Agent): ReleaseBelief | undefined {
  return store.get(sim)?.get(a.idx);
}

/** RUSH_RELEASE (experimental, off; RUSH_RELEASE=1 turns it on; Defense, 2026-11-25): pass protection ends through the
 * two players, not a clock on the true release. engagement.ts dissolved every pass engagement 0.35 s after the true throw
 * (neither player's decision, and a read of a release neither had seen); every engaged rusher turned at a near-fixed
 * 0.8-0.9 s (0.35 + about 0.5 s to restart), and 96% were still engaged at the release, 7% at the catch (Coverage's
 * rush-turn operator). With it:
 * - the rusher stops working the block when he believes the ball is thrown (his release belief), and asks to come off
 *   it toward the ball; when his release belief shows the passer loading (loadingAt) and his own time to the passer is
 *   longer than what is left of the delivery as he judges it (LOAD_BEAT from the load he saw), he pulls up facing the
 *   passer with his hands up (a held decision; one who can get there keeps rushing);
 * - the blocker stops working when he believes the release himself or sees his man turned away from the passer (more
 *   than 90 deg, for his reaction time): his own picture of the man he is blocking;
 * - the engagement dissolves when neither is working it and the hands joint carries no load. While one still is, the
 *   engagement goes on as before (it does not decide who wins the rep): a blocker who has not seen his man turn keeps
 *   blocking him. A rusher already working off on his belief is not handed to the run rep by the catch;
 * - believing it thrown, he pursues a carrier he sees, else the flight he has, else turns downfield.
 * Stated choices: LOAD_BEAT 0.35 s (the delivery he expects from a load he sees: the measured median load-to-release
 * here), PULL_MARGIN 0.1 s (enter when he is that much late, back to rushing only when that much early). */
export const RUSH_RELEASE = process.env.RUSH_RELEASE === '1';
export const LOAD_BEAT = 0.35, PULL_MARGIN = 0.1;

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
  return b;
}

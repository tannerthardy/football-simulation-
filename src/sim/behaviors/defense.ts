/**
 * Defensive behaviors: pass rush, blitz, run fits, man coverage, zone
 * coverage, playing the ball in the air, and pursuit.
 *
 * Every defender carries a read time (reaction + play recognition). Until he
 * reads the play, he executes his pre-snap job; play action can fool him into
 * believing run for longer.
 */
import { HANDS_CUE, handsUpAt } from '../hands-cue.js';
import { isOL } from './blocking.js';
import { KEY_REACT, KEY_STEP_SEEN, STEP_SEEN, keyScale } from '../key-read.js';
import { END_LINE_X, FIELD_WIDTH, OPP_GOAL_X } from '../../core/field.js';
import { angleDiff, clamp, lerp, norm, sub, type Vec2 } from '../../core/vec.js';
import { directionalSpeedFactor, type MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import { coverageDepth, gapY, isDeepZone, zoneLandmark } from '../../playbook/alignment.js';
import type { DefSlot, Gap, ZoneId, ZoneStyle } from '../../playbook/types.js';
import type { Agent, Behavior } from '../agent.js';
import type { PlaySim } from '../playsim.js';
import type { Perceived } from '../perception.js';
import { TRACKING_REACH_BONUS } from '../catching.js';
import { asCarrierPursuit } from '../coverage-space.js';
import { angleTo, chase, goTo, leverage, PURSUIT_COMMIT, pursuitPoint, runThrough, stand, track, watch } from './common.js';
import { creepPace } from '../backer-creep.js';
import { ARC_PAST, EDGE_ARC, arcLandmark, seenOverset, traits } from '../engagement.js';
import { catchSpot } from './receiver.js';
import { observedBlocking, showsBlock } from '../coverage-cues.js';
import { executeRunFit, guardStep, lineRead, pullers, type RunFitRead } from '../run-fits.js';
import { linePicture } from '../live-gaps.js';
import { RouteObservation } from '../coverage-read.js';
import { movingCatchApproach } from '../catch-approach.js';
import { RELEASE_BELIEF, releaseBelief } from '../release-belief.js';
import { withMovementObjective } from '../movement-objective.js';
import { OPEN_FIELD, playsBall } from '../open-field.js';
import { DeepCoverage } from '../coverage-leverage.js';
import { roundedTurnTime, withFacingTechnique } from '../coverage/orientation.js';
import { SNAP_REACT } from '../snap-count.js';
import { BALL_EST_MAN_LOOK, estimatesFor, lookAnyway, lookJoints, PHASE_BEHIND, PHASE_SIDE, phaseJudgeSd } from '../ball-estimate.js';
import { acquireFlight, anticipatedCatcher, catchOpportunity, flightLanded, hasObservedFlight, observedHolder, QB_RELEASE, qbRunning, qbRunningAtLine, rememberCatchOpportunity, rememberedFlight, unresolvedBallArea } from '../possession-read.js';
import { seenEngaged } from '../seen-contact.js';

/** On (PASS_FIRST=0 for comparison): a man-coverage defender who is not the
 * side's force player stays on his receiver when the receiver comes to block
 * him, until the ball carrier is past the line. A corner plays pass first: a
 * receiver closing on him may be stalking or selling a route, and the force
 * player owns the edge. Tracked wide DBs are still bailing at 2.5 s on runs
 * (3.7 -> 5.7 yd deep) and blocked 15% at 2.0 s; ours came to the run at the
 * stalk read, sat at 4 yd and were blocked 62% (dbtempo.py). */
const passFirstOn = () => process.env.PASS_FIRST !== '0';
/** DB_SLOWPLAY (experimental, off): see ManCoverage.slowPlay. Fraction of the receiver's tempo he gives
 * (NFL off corners on runs, 0.9 of 3 yd/s), cushion he keeps (yd), receiver speed that is a release (of his vmax). */
const RUN_BLITZ = process.env.RUN_BLITZ !== '0';
/** END_CHASE (experimental, off): see the edge squeeze; how far into the backfield the chase aims (yd). */
const END_CHASE = process.env.END_CHASE !== '0', CHASE_DEPTH = 1.0;
const DB_SLOWPLAY = process.env.DB_SLOWPLAY !== '0', SLOW_GIVE = 0.3, SLOW_MIN = 1.5, SLOW_SPRINT = 0.75, SLOW_WIDTH = 8;
/** LB_READ_STEP (experimental, off): see ZoneCoverage's box-backer read step; how far downhill it goes (yd). */
const LB_READ_STEP = process.env.LB_READ_STEP !== '0', READ_STEP = 0.3;

/** Has this defender read run? (His own read from what he's seen — see recognition.ts.)
 * Without a recognition he is unsure: never the offense's play type. */
export function believesRun(_sim: PlaySim, a: Agent): boolean {
  return a.recog?.read === 'run';
}
/** ZONE_SETTLE (default on; ZONE_SETTLE=0 turns it off): underneath zone
 * droppers stop gaining depth once they see the QB set ("drop until his back
 * foot hits, then plant"), as tracked underneath defenders do (BDB 2025: hook
 * 4.4 -> 6.6 yd by 2.5 s on dropbacks; docs/reviews/2026-11-09-coverage-spacing.md). */
const ZONE_SETTLE = process.env.ZONE_SETTLE !== '0';
/** SEEN_EYES (default on; SEEN_EYES=0 restores the QB's internal read target): a zone defender
 * reads the QB's look from what he sees of him, not from the QB's internal
 * read target (sim.qbEyes, the exact receiver, instantly, for every defender
 * whether or not he can see the QB). He must have the QB in view (within
 * 100 deg of his facing); then the receiver he takes the QB to be looking at
 * is the one, in his own delayed picture, nearest the QB's perceived facing,
 * within 20 deg (12 deg when he is 20+ yd from the QB). Otherwise no read. */
const SEEN_EYES = process.env.SEEN_EYES !== '0';
/** HONEST_READS (experimental, off; HONEST_READS=1 turns it on): removes
 * true-state reads found by the 2026-11-13 defense audit. A blitzer peels to
 * the ball only once he has seen the throw, on his acquired flight; the ball
 * finder's turn is measured from the thrower he sees; a pursuer plays the
 * ball only once he has seen it thrown; a coverage player opens to the holder
 * he has seen whatever the true ball state; a breaking-down defender screens
 * nearby bodies by his picture of them; a backer taking on a climber, and an
 * edge setting his line, treat a body as blocked when their picture shows it
 * in contact (seen contact, src/sim/seen-contact.ts),
 * not by its engagement state. */
export const HONEST_READS = process.env.HONEST_READS !== '0';
/** HONEST_FLIGHT (experimental, off; HONEST_FLIGHT=1 turns it on): the flight half of the audit, waiting on the ball-
 * perception channel (acquireFlight's estimate, built with Coverage). A defender drives on a catch at the receiver his own
 * flight estimate brings the ball to, at the facing he sees, not at the private securing state; the switch from playing
 * the flight to the catch (catch-carry, flight continuation, ball rally) comes when his own estimate says the ball has
 * arrived or he sees it in the air near him, not on the true end of the air state; a flight he has acquired is his to
 * play until his estimate resolves it. */
export const HONEST_FLIGHT = process.env.HONEST_FLIGHT === '1';
/** HONEST_FLIGHT's drive on a catch: from this long before his estimate's arrival to this long after (a catch's securing beat). */
const DRIVE_LEAD = 0.05, DRIVE_SECURE = 0.4;
/** INFO_HONEST (off; INFO_HONEST=63 turns every item on; single items by their
 * bit below, for the per-item read): coverage decisions
 * read the defender's own picture, not true state. Items (coverage audit
 * 2026-11-13): 3 deep help decisions freeze when he has seen the throw
 * (judgment.ts), not at the true release; 6 a man carry stops re-squaring
 * when he has seen the throw, not at the true release; 7 the judgment's
 * protect-vertical carry starts its cushion from the receiver he saw, not
 * his true spot; 8 the zone lean toward the QB's look goes to where he sees
 * that receiver, not where he is; 9 zone lanes and facing use where he sees
 * the QB (zone, spot underneath, wall, rob); H the hands cue needs the
 * receiver in his view (within 100 deg of his facing). */
const INFO_HONEST = Number(process.env.INFO_HONEST ?? 63);
/** INFO_HONEST is a bit mask so each item can be read alone: 3 = 1, 6 = 2, 7 = 4, 8 = 8, 9 = 16, H = 32; 63 = all. */
const INFO_BITS: Record<string, number> = { 3: 1, 6: 2, 7: 4, 8: 8, 9: 16, H: 32 };
export function infoHonest(item: number | string): boolean {
  return (INFO_HONEST & INFO_BITS[String(item)]) !== 0;
}
const eyesCache = new WeakMap<Agent, { t: number; r: Agent | null }>();
/** SEEN_EYES: the receiver this defender sees the QB looking at, or null. */
export function seenQbEyes(a: Agent, sim: PlaySim): Agent | null {
  if (!SEEN_EYES && !QB_BODY_SEEN) return sim.qbEyes;
  const c = eyesCache.get(a);
  if (c && c.t === sim.t) return c.r;
  let r: Agent | null = null;
  const q = sim.see(a, sim.qb);
  const toQB = Math.atan2(q.pos.y - a.pos.y, q.pos.x - a.pos.x), dist = Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y);
  if (Math.cos(a.body.facing - toQB) > Math.cos(100 * Math.PI / 180)) {
    const tol = Math.cos((dist > 20 ? 12 : 20) * Math.PI / 180);
    let best = tol;
    for (const o of sim.offense) {
      if (o === sim.qb || ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot)) continue;
      const p = sim.see(a, o).pos;
      const cos = Math.cos((QB_BODY_SEEN ? q.head ?? q.facing : q.facing) - Math.atan2(p.y - q.pos.y, p.x - q.pos.x));
      if (cos > best) { best = cos; r = o; }
    }
  }
  eyesCache.set(a, { t: sim.t, r });
  return r;
}

/** Has this defender read pass? His own read; without a recognition he is unsure. */
export function knowsPass(_sim: PlaySim, a: Agent): boolean {
  return a.recog?.read === 'pass';
}

/**
 * Common transition: once the ball carrier is past the line (or the QB is
 * seen running out of the pocket), everyone pursues. Behind the line, a
 * defender who has read run plays his fit — he doesn't abandon his gap to
 * chase, including against a designed QB run.
 */
/** ARRIVE_LEAD (experimental, off; ARRIVE_LEAD=1 turns it on): on a short
 * throw he cannot beat to the catch, an underneath zone defender drives to the
 * catcher's upfield shoulder. NFL nearest defenders on catches 0-10 yd past the
 * line run on a line that crosses the catcher's lateral line 1.4-1.7 yd
 * upfield of him (1.9 when the catcher is running across, 1.4 when moving
 * away); ours 0.3-0.6 (BDB 2025 dropbacks vs engine-34; aimside.py). Leading
 * along the route instead (attempt 1) aimed behind settling catchers. */
const ARRIVE_LEAD = process.env.ARRIVE_LEAD !== '0';
/** An underneath zone player: a zone seat or zone-eyed match defender without deep responsibility. */
function underneathZone(a: Agent): boolean {
  const b = a.behavior as { plastersScramble?: boolean; zoneEyes?: boolean } | undefined;
  return (a.behavior instanceof ZoneCoverage && !b?.plastersScramble) || b?.zoneEyes === true;
}

/** HONEST_FLIGHT: a ball in the air that he can see: near him (BALL_SEEN_RANGE) and inside his view. A ball popped back
 * up off a receiver's hands next to the defender driving on the catch is in plain sight; the same ball across the field
 * behind him is not. (The sight channel, as ThrowSight senses the throw.) */
const BALL_SEEN_RANGE = 6, BALL_SEEN_COS = Math.cos(100 * Math.PI / 180);
function ballSeenInAir(a: Agent, sim: PlaySim): boolean {
  if (sim.ball.kind !== 'air') return false;
  const b = (sim.ball as { flight?: { pos: { x: number; y: number } } }).flight?.pos ?? sim.ballPos(), dx = b.x - a.pos.x, dy = b.y - a.pos.y, d = Math.hypot(dx, dy);
  return d <= BALL_SEEN_RANGE && (d < 0.5 || Math.cos(a.body.facing - Math.atan2(dy, dx)) >= BALL_SEEN_COS);
}

export function pursueIfLive(sim: PlaySim, a: Agent): MoveCommand | null {
  const read = observedHolder(a, sim);
  const preserveEdge = a.runFit?.kind === 'edge' || a.runFit?.kind === 'force' || a.runFit?.kind === 'cutback';
  if (read) {
    const { target, cue } = read;
    const past = cue.pos.x > sim.los + (preserveEdge ? 2 : 0);
    // A newer held-body image after recognized flight supports a catch even
    // behind the line. Pass belief alone cannot turn a handoff into a catch
    // and discard an installed edge. Snap QB possession keeps the rush/fit.
    // RELEASE_BELIEF: a release he believed (the arm, without the ball seen) supports a catch the same way.
    const caught = target !== sim.qb && (hasObservedFlight(a) || (RELEASE_BELIEF && releaseBelief(sim, a).releasedAt !== undefined));
    // A QB seen leaving the pocket as a runner, by a defender who has not
    // read run: the scramble response, from his own QB picture. Rushers and
    // underneath zones come up; each role keeps its own contract. Under
    // QB_RELEASE an underneath zone waits for the QB to commit to the line.
    // Man and deep defenders keep plastering until he crosses the line.
    const plaster = (a.behavior as { plastersScramble?: boolean } | undefined)?.plastersScramble === true;
    const scramble = target === sim.qb && !plaster && !believesRun(sim, a)
      && (QB_RELEASE && underneathZone(a) ? qbRunningAtLine(a, sim) : qbRunning(a, sim));
    if (caught || ((past || scramble) && (sim.t >= a.readAt || cue.pos.x > sim.los + 2))) {
      if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'possession-pursuit', chose: target.slot,
        cue: 'carrying=true in this observer\'s acquired body picture',
        detail: `Sample age ${cue.age ?? 'unknown'} s; acquired x=${cue.pos.x}; installed ${a.runFit?.kind ?? 'fallback'} boundary. No authoritative holder/catch flag.` });
      return asCarrierPursuit(chase(sim, a, target, 3, { onTop: OPEN_FIELD }));
    }
  }
  // CATCH_CARRY: the ball reached a receiver he is on (he drove on the catch,
  // or his own flight picture had it arriving at that man) and the outcome is
  // not yet in his picture. He attacks that receiver as he last saw him,
  // through the hands, instead of station-keeping, steering on the flight's
  // end or rallying to where the ball landed. A newer picture of him without
  // the ball refutes it (dropped); a ball back in the air is played as flight;
  // an acquired holder is pursued above.
  // HONEST_FLIGHT: the ball is out of the air when his own flight estimate
  // says it has arrived (or he never saw a throw), not on the true air state.
  // RELEASE_BELIEF: the same as playsThrow's exit (his own flight estimate, a ball still seen in the air keeping it
  // open), so a defender whose flight has landed by his estimate is on the catch here, not between the two.
  const landed = HONEST_FLIGHT || RELEASE_BELIEF ? (!hasObservedFlight(a) || flightLanded(a, sim.t)) && !ballSeenInAir(a, sim) : sim.ball.kind !== 'air';
  if (CATCH_CARRY && landed) {
    const drive = catchDrive.get(a) ?? catchOpportunity(a);
    if (drive) {
      const seen = sim.see(a, drive.receiver);
      const refuted = seen.carrying === false && seen.age !== undefined && sim.t - seen.age > drive.t;
      const on = Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) <= CATCH_CARRY_RANGE;
      if (!refuted && on) {
        a.tags.add('catch-carry');
        // OPEN_FIELD: the ball is there; he approaches the receiver as a runner in space.
        if (OPEN_FIELD) return asCarrierPursuit(chase(sim, a, drive.receiver, 3, { onTop: true }));
        const f = seen.facing;
        return asCarrierPursuit(runThrough(a, f === undefined ? seen.pos : { x: seen.pos.x + Math.cos(f) * 0.35, y: seen.pos.y + Math.sin(f) * 0.35 }, { speed: 1 }));
      }
      if (refuted) catchDrive.delete(a);
    }
  }
  // Continue the acquired flight estimate while possession is unresolved.
  // Disappearance of the authoritative air state does not announce a catch,
  // or reopen coverage. A receiver can still miss this predicted opportunity.
  const path = rememberedFlight(a, sim.t);
  const anticipated = landed && path ? anticipatedCatcher(a, sim) : null;
  if (anticipated) {
    if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'catch-anticipation', chose: anticipated.target.slot,
      cue: 'first acquired catch opportunity; result not yet acquired',
      detail: 'Keep working with the possible catcher; an empty picture after the opportunity refutes it. No confirmed possession.' });
    return track(a, anticipated.cue.pos, anticipated.cue.vel);
  }
  if ((HONEST_FLIGHT || landed) && path && sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'flight-continuation',
    chose: 'continue acquired catch opportunity', cue: 'recognized trajectory; no newer acquired holder',
    detail: `Forecast ends at ${path[path.length - 1].t} s. Catch is possible, not confirmed.` });
  // HONEST_FLIGHT: a flight he has acquired is his to play until his own estimate resolves it, whatever the true
  // ball does meanwhile (a catch before his estimate's arrival is not yet in his picture).
  if ((HONEST_FLIGHT || landed) && path) return playObservedFlight(a, sim, path);
  const area = landed ? unresolvedBallArea(a) : null;
  if (area) {
    if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'ball-rally',
      chose: 'locate ball at acquired landing area', cue: 'recognized pass; flight ended without acquired possession',
      detail: 'Keep ball responsibility instead of reopening route coverage. No holder is inferred.' });
    return goTo(a, area);
  }
  return null;
}

// ------------------------------------------------------------- pass rush

/** How much sooner a lineman reads the man in front of him than the rest of
 * the field (his key, an arm's length away and straight ahead of him, as a
 * rusher keys the quarterback), and the step speed at which he sees it: see
 * key-read.ts. */
const stepSeen = KEY_REACT ? KEY_STEP_SEEN : STEP_SEEN;
/** KEY_PACE (experimental, off): how much faster than the key's own step he answers it (yd/s). */
const KEY_PACE = process.env.KEY_PACE !== '0', KEY_STEP_LEAD = 0.5;
/** KEY_DEPTH (experimental, off): see the key step; his upfield step is his own read step. */
const KEY_DEPTH = process.env.KEY_DEPTH !== '0';
/** LB_GUARD_STEP (experimental, off): see ZoneCoverage's unsure box backer. */
const LB_GUARD_STEP = process.env.LB_GUARD_STEP !== '0';
/** EDGE_REACH (experimental, off): see the edge's key read against a reach in PassRusher, and the edge fit in run-fits.ts. */
export const EDGE_REACH = process.env.EDGE_REACH !== '0', EDGE_UPFIELD = 1.2;
/** STANCE_TELL (experimental, off): see assign.ts. How long after his get-off a
 * read lean leads his step before the key's own movement must confirm it (s). */
const STANCE_TELL = process.env.STANCE_TELL !== '0';
/** DEF_STANCE: pad level a hand-down lineman keeps coming off the ball, and for how long (s). */
const DOWN_POSTURE = 0.7, DOWN_LOW_FOR = 0.8;
/** SINK_LEAD (experimental, off): see PassRusher.sink. Target pad levels are the
 * engaged requests (run fit 0.85, pass rush 0.6, engagement.ts); the rate is the
 * world's posture slew (POSTURE_RATE); margin covers one decision beat (s). */
const SINK_LEAD = process.env.SINK_LEAD === '1', SINK_RUN = 0.85, SINK_PASS = 0.6, SINK_RATE = 2.5, SINK_MARGIN = 0.1;
/** SINK_LEAD: a blocker within this gap (yd, about an arm and a step) is on him
 * whatever the closing speed, so a lineman in his stance stays low. */
const SINK_NEAR = 1.0;
const TELL_WINDOW = 0.3;
/** How far outside the down blocker's body an edge keeps his own body as he closes (yd). */
const HIP_GAP = 0.35;
/** How far into the backfield a squeezed edge sets up to meet a kick-out (yd); tracked play-side ends are 0.3-0.5 yd deep by 1.5-2.0 s. */
const SET_DEPTH = 0.4;

/** The blocker on the surface in front of a rusher, as he sees the line: the
 * nearest one laterally, read as his key. An interior man keys the blocker
 * within a yard and a half; an edge keys the end of the line inside him,
 * however wide he aligns (a wide 9 still reads his tackle). */
function manInFront(sim: PlaySim, a: Agent, reach = 1.5, held: Agent | null = null): (Perceived & { home: Vec2; agent: Agent }) | null {
  let best: Agent | null = held, bd = Infinity;
  if (!best) for (const b of linePicture(sim, a).surface) {
    const dy = Math.abs(b.seen.pos.y - a.pos.y);
    if (dy <= reach && dy < bd) { best = b.agent; bd = dy; }
  }
  // Where he lined up is the pre-snap picture every defender has.
  return best ? { ...sim.see(a, best, keyScale(a)), home: sim.offAlign.spots[best.slot]!.pos, agent: best } : null;
}

/** DL_GAMES: how long a moving lineman executes his called step before he
 * plays from the new gap (s after his get-off): about two steps. */
const GAME_STEP = 0.45;

/** DL_GAMES twist timing (s after get-off): the crasher penetrates the partner's
 * gap, the looper jabs his own man, then loops behind into the crasher's gap. */
const TWIST_CRASH = 0.8, TWIST_HOLD = 0.15, TWIST_LOOP = 1.6;
function twistRole(a: Agent, sim: PlaySim): { role: 'crash' | 'loop'; y: number } | null {
  const game = sim.defCall.dlGame;
  if (!game || game.kind !== 'twist') return null;
  const s = game.dir === 'S' ? 'S' : 'W', o = s === 'S' ? 'W' : 'S';
  const pair = game.pair ?? 'TE';
  const [crash, loop] = pair === 'TE' ? [`DT_${s}`, `DE_${s}`] : pair === 'ET' ? [`DE_${s}`, `DT_${s}`] : [`DT_${s}`, `DT_${o}`];
  const c = sim.slot(crash as DefSlot), l = sim.slot(loop as DefSlot);
  if (!c || !l || (a !== c && a !== l)) return null;
  // Each attacks where the other was: the gap's y at the line from the alignment.
  const spot = (d: Agent) => sim.defAlign.spots[d.slot as DefSlot]!;
  const target = a === c ? spot(l) : spot(c);
  return { role: a === c ? 'crash' : 'loop', y: gapY(sim.offAlign, target.gap, target.gapSign) };
}

export class PassRusher implements Behavior {
  readonly kind = 'rush';
  private readonly getOff: number;
  /** STANCE_TELL: he picked up his key's pre-snap lean (his recognition). */
  private readonly readsTell: boolean;
  /** Own contact with the line, not a chip from a back or receiver.
   * Once past the opening lane and free, finish instead of restarting it. */
  private workedLineBlock = false;
  /** The end of the line an edge keyed: he keeps reading that man. A down
   * block steps away from him, and that step is the cue, not a reason to
   * lose his key. */
  private keyed: Agent | null = null;
  /** Pre-snap rush plan from his tools. */
  readonly plan: 'power' | 'finesse' | 'speed';
  /** DL_GAMES: a called angle/slant/pinch moved his gap; until this clock he
   * executes the movement into it (the call, not a read), then plays from there. */
  private readonly gameUntil: number;
  /** DL_GAMES twist: the crasher attacks the partner's gap; the looper waits a
   * beat, then loops behind him into the gap the crasher vacated. */
  private readonly twist: { role: 'crash' | 'loop'; y: number } | null;
  constructor(
    a: Agent,
    sim: PlaySim,
    private readonly gap: Gap,
    private readonly gapSign: number,
    /** His pass-rush lane, when it differs from his run gap (FIT_TE_GAP). */
    private readonly laneGap: Gap = gap,
  ) {
    const burst = clamp((1.8 - a.player.measurables.tenSplit) / 0.35, 0, 1);
    // SNAP_REACT plans every start from the count itself.
    const scatter = sim.dice('rush', a).normal(0, 0.03);
    this.getOff = a.snapReadyAt = SNAP_REACT ? a.snapReadyAt : clamp(a.snapReadyAt + scatter, 0.02, 0.4);
    this.readsTell = STANCE_TELL && sim.rng.fork(`tell-read:${a.slot}`).next() < 0.6 + 0.6 * a.r('playRecognition');
    const edge = gap === 'C' || gap === 'D';
    const pw = 0.3 + a.r('passRushPower') + (a.profile.massKg - 120) / 60;
    const fi = 0.3 + a.r('passRushFinesse');
    const sp = edge ? 0.2 + burst * 1.2 + traits(a).bend * 0.5 : 0;
    this.plan = sim.dice('rush', a).weighted(['power', 'finesse', 'speed'] as const, [pw, fi, sp]);
    const spot = sim.defAlign.spots[a.slot as DefSlot];
    const movedGap = !!sim.defCall.dlGame && sim.defCall.dlGame.kind !== 'twist' && !!spot
      && (spot.gap !== gap || Math.sign(spot.gapSign) !== Math.sign(gapSign));
    this.gameUntil = movedGap ? this.getOff + GAME_STEP : -1;
    this.twist = twistRole(a, sim);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const cmd = this.decide(a, sim);
    // DEF_STANCE: out of a hand-down stance he fires out low and stays low into
    // his first contact; standing up, he comes off at ordinary pad level.
    if (a.setStance === 'down' && !a.engagement && (cmd as { posture?: number }).posture === undefined && sim.t < this.getOff + DOWN_LOW_FOR)
      return SINK_LEAD ? this.sink(a, sim, { ...cmd, posture: DOWN_POSTURE } as MoveCommand) : { ...cmd, posture: DOWN_POSTURE } as MoveCommand;
    return SINK_LEAD ? this.sink(a, sim, cmd) : cmd;
  }

  /** SINK_LEAD: a lineman who sees a blocker closing on him lowers his pads in
   * time to meet him at the pad level he plays blocks with ("low man wins"),
   * from his own picture of the gap and closing speed; in his stance, with a
 * blocker an arm and a step away, he stays down rather than rising to wait. Pad level slews at a
   * finite rate and costs speed (world.ts), so he starts no earlier than the
   * slew needs. */
  private sink(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
    if (a.engagement) return cmd;
    const want = believesRun(sim, a) ? SINK_RUN : SINK_PASS;
    const have = a.body.support?.posture ?? 0, asked = (cmd as { posture?: number }).posture ?? 0;
    if (asked >= want) return cmd;
    const lead = Math.max(0, want - have) / SINK_RATE + SINK_MARGIN;
    for (const o of sim.offense) {
      if (!isOL(o)) continue;
      const p = sim.see(a, o); const dx = p.pos.x - a.pos.x, dy = p.pos.y - a.pos.y, dist = Math.hypot(dx, dy);
      const gap = dist - a.profile.radius - o.profile.radius; if (gap > 3) continue;
      const closing = -(dx * (p.vel.x - a.vel.x) + dy * (p.vel.y - a.vel.y)) / Math.max(dist, 1e-6);
      if (gap <= SINK_NEAR || (closing > 0.3 && gap / closing < lead)) return { ...cmd, posture: want } as MoveCommand;
    }
    return cmd;
  }

  private decide(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.getOff) return stand(Math.PI);
    if (a.engagement) {
      const { blocker } = a.engagement;
      if (['LT', 'LG', 'C', 'RG', 'RT'].includes(blocker.slot)) this.workedLineBlock = true;
      return stand();
    }
    const live = pursueIfLive(sim, a);
    if (live) return live;
    // Throw in the air: peel off toward the ball.
    if (playsFlight(a, sim, null)) {
      const path = acquireFlight(a, sim), spot = catchSpot(a, { t: sim.t, ballPath: path });
      if (spot) return runThrough(a, spot.p, { speed: 0.9 });
    }
    // A called movement goes on the snap: across the blocker's face into his
    // new gap at the line, whatever the man in front of him does.
    if (this.twist && !believesRun(sim, a)) {
      const t = sim.t - this.getOff, x = (d: number) => sim.los - d * sim.attackDir(sim.offense[0].team);
      if (this.twist.role === 'crash' && t < TWIST_CRASH) {
        a.tags.add('twist-crash');
        return runThrough(a, { x: x(0.6), y: this.twist.y }, { speed: 1 });
      }
      if (this.twist.role === 'loop' && t < TWIST_LOOP) {
        a.tags.add('twist-loop');
        // A jab at his own man first (the hold that sells the rush), then the loop behind the crash.
        if (t < TWIST_HOLD) return runThrough(a, { x: x(0.2), y: a.pos.y }, { speed: 0.6 });
        return runThrough(a, { x: x(0.2), y: this.twist.y }, { speed: 1 });
      }
    }
    if (sim.t < this.gameUntil) {
      a.tags.add('dl-game-step');
      return runThrough(a, { x: sim.los - 0.3 * sim.attackDir(sim.offense[0].team), y: gapY(sim.offAlign, this.gap, this.gapSign) }, { speed: 1 });
    }
    // The ball is handed off or the QB takes off: play the run. Up close a
    // lineman sees the exchange; a rusher who has read run plays it too
    // (on play action, that's being fooled).
    const holder = observedHolder(a, sim);
    if (holder && (holder.target !== sim.qb || qbRunning(a, sim))) return runFit(a, sim, this.gap, this.gapSign);
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign);
    // Key the man in front: a lineman steps with his first step. A blocker
    // coming off the ball across him, pads low (a zone step, a reach, a down
    // block), is not setting up to pass protect; the rusher plays him, square,
    // moving with him, instead of sprinting past him at the quarterback. A pass
    // set stands up and gives ground and leaves the rush as it is. His own picture of the blocker; what
    // the blocker means to do is not his to know, so a play-action line fools him.
    const onEdge = this.gap === 'C' || this.gap === 'D';
    const man = a.pos.x > sim.los - 0.5 ? manInFront(sim, a, onEdge ? Infinity : 1.5, onEdge ? this.keyed : null) : null;
    if (onEdge && man) this.keyed = man.agent;
    watch(sim, a, man?.agent);
    const runStep = !!man && man.stance === 'low' && man.vel.x * sim.attackDir(sim.offense[0].team) > -0.5 && Math.abs(man.vel.y) > stepSeen;
    // An edge keeps his outside against a reach. A man in front blocking down,
    // stepping inside away from him, opens his gap to a kick-out or a pulling
    // lead: he closes flat along the line behind the down block and sets the
    // edge there, where the puller has to come and get him, instead of rushing
    // upfield past the play.
    // He closes hip to hip on the down blocker, but only as far as the spot
    // the blocker left: that is the gap to shut. Squeeze, don't chase. Once
    // there he stops sliding and steps into the backfield to meet whoever
    // comes to kick him out, rather than riding the down block inside.
    if (onEdge && runStep && Math.sign(man!.vel.y) === Math.sign(sim.ballY - man!.pos.y)) {
      const side = Math.sign(man!.vel.y), h = a.mind.decisionInterval;
      // END_CHASE (experimental, off): the whole line stepping away with his
      // man and no puller crossing is a zone step, not a down block: no
      // kick-out is coming to the spot he would set. He squeezes inside and
      // upfield behind his man's hip, chasing the play from the backside
      // (cutback, bootleg, the back's heels). NFL unblocked backside ends on
      // zone runs cross the line on 68-80% of snaps and are 0.6-0.7 yd in the
      // backfield by 1.5 s; ours squeezed flat and sat on the line.
      if (END_CHASE && pullers(sim, a).length === 0 && lineRead(sim, a) === side) {
        const dir = sim.attackDir(sim.offense[0].team);
        a.tags.add('end-chase');
        return track(a, { x: sim.los - dir * CHASE_DEPTH, y: man!.pos.y - side * (a.profile.radius + HIP_GAP) + man!.vel.y * h },
          { x: 0, y: man!.vel.y }, { speed: 1, gain: 3, facing: Math.PI });
      }
      const hip = man!.pos.y - side * (a.profile.radius + HIP_GAP);
      const shut = man!.home.y - side * a.profile.radius;
      a.tags.add('key-squeeze');
      if ((a.pos.y - shut) * side >= -0.1) {
        a.tags.add('squeeze-set');
        return track(a, { x: sim.los - SET_DEPTH, y: shut }, { x: 0, y: 0 }, { speed: 1, gain: 3, facing: Math.PI });
      }
      const ahead = hip + man!.vel.y * h, clamped = (ahead - shut) * side > 0;
      // Moving with the blocker only until the spot: past it his slide is the blocker's, not his.
      return track(a, { x: man!.pos.x + man!.vel.x * h, y: clamped ? shut : ahead }, { x: man!.vel.x, y: clamped ? 0 : man!.vel.y },
        { speed: 1, gain: 3, facing: Math.PI });
    }
    // STANCE_TELL: before the key's step is visible, a lineman who read his
    // key's weight lean pre-snap steps with it off the ball. The step is the
    // same flat step as the read below; the first real movement he sees
    // replaces it either way (a lean that lied costs him that step).
    if (STANCE_TELL && !onEdge && man && !runStep && this.readsTell && man.agent.stanceLean
      && sim.t < this.getOff + TELL_WINDOW && Math.abs(man.vel.y) < stepSeen) {
      const side = man.agent.stanceLean, step = a.profile.vmax * a.profile.shuffle;
      a.tags.add('tell-step');
      return track(a, { x: man.home.x + man.vel.x * a.mind.decisionInterval, y: a.pos.y + side * step * a.mind.decisionInterval },
        { x: 0, y: side * step }, { speed: 1, gain: 3, facing: Math.PI });
    }
    // EDGE_REACH (experimental, off): an edge keeps his outside against a
    // reach. His key stepping out toward him, away from the ball (a stretch or
    // reach step), is running for his outside shoulder: he answers it as an
    // interior man answers his key, with a flat step of his own at full effort
    // the way the key goes, square to him, instead of rushing inside at the
    // quarterback. NFL play-side OZ edge men are +0.69 / +1.75 yd outside
    // their snap spot at 1.0 / 1.5 s; ours stepped inside (-0.32 at 1.0 s).
    // A reach is a step mostly sideways at him; a drive step that drifts out
    // (inside zone) is mostly upfield, and he holds his spot against it.
    const reachOut = EDGE_REACH && onEdge && runStep && Math.sign(man!.vel.y) === -Math.sign(sim.ballY - man!.pos.y)
      && Math.abs(man!.vel.y) > Math.abs(man!.vel.x);
    if (reachOut) a.tags.add('edge-reach');
    // The interior man keys the blocker over him.
    if ((!onEdge || reachOut) && runStep) {
      // The answer to a lateral first step is a flat step of his own at full
      // effort, square to the man, not a match of the speed seen so far.
      // KEY_PACE (experimental, off): he answers the step he sees at its pace
      // plus a step of his own: a reach running for his shoulder gets a
      // sprint, an inside-zone drive step a matching step that keeps his gap.
      // NFL inside-zone DL go about 0.8 as far sideways as their blockers; a
      // full flat sprint on every key step took ours as far as the blocker or
      // further. Judge with the offense's reach pace (Run Game's REACH_FLAT):
      // matched to a slow, upfield reach, the outside-zone DL is slow too.
      const side = Math.sign(man!.vel.y), full = a.profile.vmax * a.profile.shuffle;
      const step = KEY_PACE ? Math.min(full, Math.abs(man!.vel.y) + KEY_STEP_LEAD) : full;
      const h = a.mind.decisionInterval;
      // KEY_DEPTH (experimental, off): upfield it is a read step too, his own
      // step (the same lead as KEY_PACE's), meeting the man where he comes,
      // not a run at the man's spot: closing on it at tracking gain asked for
      // a sprint (5-7 yd/s) into the block. NFL interior DL not yet near an OL
      // move 0.5-0.74 yd/s upfield through 1.0 s; ours ramped to 1.1 by 0.5 s.
      // An edge answering a reach sets the edge upfield as he widens: NFL
      // play-side OZ edge men go from 0.9 yd off the ball to 0.28 yd into the
      // backfield by 1.0 s (about 1.2 yd/s), faster than the interior read step.
      const up = -sim.attackDir(sim.offense[0].team) * (reachOut ? EDGE_UPFIELD : KEY_STEP_LEAD);
      // An edge lines up outside his key: he steps from where he stands, never
      // onto the key's spot (that is inside him).
      const fromY = reachOut ? (side * (a.pos.y - man!.pos.y) > 0 ? a.pos.y : man!.pos.y) : man!.pos.y;
      const at = KEY_DEPTH ? { x: a.pos.x + up * h, y: fromY + side * step * h } : { x: man!.pos.x + man!.vel.x * h, y: fromY + side * step * h };
      a.tags.add('key-step');
      if (KEY_REACT) a.keyStep = { from: man!.agent, side };
      return track(a, at, { x: KEY_DEPTH ? up : 0, y: side * step }, { speed: 1, gain: 3, facing: Math.PI });
    }
    // Rush lane by plan: power rushers go through the blocker's chest at the
    // QB; finesse rushers attack a shoulder through their gap; speed rushers
    // take a wide arc and bend to a point behind the QB.
    const qb = sim.qb;
    const qbSeen = sim.see(a, qb, 0.5).pos;
    const gy = gapY(sim.offAlign, this.laneGap, this.gapSign);
    const edge = this.laneGap === 'C' || this.laneGap === 'D';
    const bend = 0.8 + 0.45 * traits(a).bend;
    if (this.plan === 'power') {
      const p = pursuitPoint(sim, a, qb, 1.5);
      return runThrough(a, p, { speed: 1 });
    }
    if (a.pos.x > sim.los - 0.5) {
      const lane = edge ? { x: sim.los - 1.6, y: gy + this.gapSign * (this.plan === 'speed' ? 1.8 : 1.0) } : { x: sim.los - 0.6, y: gy };
      return runThrough(a, lane, { speed: 1, cutSkill: bend });
    }
    if (edge && this.workedLineBlock) {
      return runThrough(a, pursuitPoint(sim, a, qb, 1.5), { speed: 1, cutSkill: bend });
    }
    // EDGE_ARC: the landmark is outside his key's outside shoulder at the QB's
    // depth; past the key's hips he turns for the QB; a key he sees oversetting
    // opens the inside, and he takes it.
    if (EDGE_ARC && edge && this.keyed) {
      const tk = sim.see(a, this.keyed).pos, arc = arcLandmark(sim, this.keyed, a);
      if (a.pos.x >= tk.x - ARC_PAST && !seenOverset(tk, a.pos, arc)) {
        a.tags.add('edge-arc');
        return runThrough(a, { x: Math.min(qbSeen.x, tk.x - ARC_PAST - 0.2), y: arc.y }, { speed: 1, cutSkill: bend });
      }
      return runThrough(a, pursuitPoint(sim, a, qb, 1.5), { speed: 1, cutSkill: bend });
    }
    if (edge && a.pos.x > qbSeen.x + 1.0) {
      const arc = { x: qbSeen.x - 1.0, y: qbSeen.y + this.gapSign * (this.plan === 'speed' ? 1.3 : 0.8) };
      return runThrough(a, arc, { speed: 1, cutSkill: bend });
    }
    const p = pursuitPoint(sim, a, qb, 1.5);
    return runThrough(a, p, { speed: 1, cutSkill: bend });
  }
}

export class Blitzer implements Behavior {
  readonly kind = 'blitz';
  private readonly delay: number;
  constructor(
    a: Agent,
    sim: PlaySim,
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {
    const scatter = sim.dice('get-off', a).normal(0, 0.04);
    this.delay = a.snapReadyAt = SNAP_REACT ? a.snapReadyAt : clamp(a.snapReadyAt + scatter, 0.02, 0.4);
    void a;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.t < this.delay) return stand(Math.PI);
    if (a.engagement) return stand();
    const live = pursueIfLive(sim, a);
    if (live) return live;
    // RUN_BLITZ (experimental, off): a called blitz still goes on a run. Short
    // of the line he keeps attacking through his gap to the same point behind
    // it; through it, he plays the run from the backfield. A blocker who meets
    // him engages him as ever. NFL box backers who stand within 2.5 yd get
    // past the line on 29% of runs; ours fitted the gap at the line (3%).
    if (believesRun(sim, a)) {
      if (RUN_BLITZ && a.pos.x > sim.los - 0.3) {
        a.tags.add('run-blitz');
        return runThrough(a, { x: sim.los - 0.8, y: gapY(sim.offAlign, this.gap, this.gapSign) }, { speed: 1 });
      }
      return runFit(a, sim, this.gap, this.gapSign);
    }
    if (HONEST_READS ? playsFlight(a, sim, null) : sim.ball.kind === 'air') {
      // HONEST_READS: the ball he has seen thrown, on his acquired flight.
      const spot = HONEST_READS ? catchSpot(a, { t: sim.t, ballPath: acquireFlight(a, sim) }) : catchSpot(a, sim);
      if (spot) return runThrough(a, spot.p, { speed: 0.9 });
    }
    const gy = gapY(sim.offAlign, this.gap, this.gapSign);
    if (a.pos.x > sim.los + 0.3) return runThrough(a, { x: sim.los - 0.8, y: gy }, { speed: 1 });
    const p = pursuitPoint(sim, a, sim.qb, 1.5);
    return runThrough(a, p, { speed: 1 });
  }
}

// ------------------------------------------------------------- run fits

/**
 * Gap-sound run defense: defend the assigned gap until the carrier commits,
 * then fit on him with pursuit leverage. DBs force/alley from outside-in.
 */
export function runFit(a: Agent, sim: PlaySim, gap: Gap, gapSign: number, read?: RunFitRead | null): MoveCommand {
  if (read === undefined) {
    // Removing the catch broadcast must not uncover a second private-holder
    // selection inside the fit fallback. Reuse the installed mesh picture,
    // including unknown/negative carrying, rather than inventing a handoff.
    const holder = observedHolder(a, sim), back = sim.slot('RB');
    if (!/^(DE|DT|NT)/.test(a.slot)) watch(sim, a, holder?.target ?? back);
    // A QB seen running is the runner himself, not a mesh still to resolve.
    if (holder && (holder.target !== sim.qb || hasObservedFlight(a) || qbRunning(a, sim))) read = { possession: holder };
    else if (back && sim.offAlign.spots[back.slot]?.backfield) {
      read = { backfield: { back, backCue: sim.see(a, back), qbCue: sim.see(a, sim.qb) } };
    } else read = holder ? { possession: holder } : null;
  }
  const cmd = executeRunFit(a, sim, gap, gapSign, read);
  const fit = BACKER_TAKEON && /^LB/.test(a.slot) ? takeOn(a, sim, cmd) : cmd;
  return READ_LEAN && /^LB/.test(a.slot) ? passPull(a, sim, fit) : fit;
}

/** READ_LEAN (experimental, off): the unsure box backer's downhill pace at a
 * full run picture (yd/s; NFL box backers 0.45-1.0 yd/s downhill at 0.4-0.5 s
 * on runs). A pass lean only takes his feet off the line (his creep, scaled by
 * the lean); he has no drop of his own until he reads pass, when his zone
 * landmark and the receivers decide it (NFL about 0 to -0.25 yd/s on dropbacks
 * through 1.0 s). */
const READ_LEAN = process.env.READ_LEAN !== '0', LEAN_RUN = 1.5;
/** READ_LEAN: after a run read, a pass picture (the QB deep after the fake, the
 * line setting) pulls his attack back before a full change of mind: his
 * downhill speed is scaled by how far his picture now leans pass. Not once he
 * has seen the ball given: then the run is real. NFL box backers on zone play
 * action come downhill at about 0.85 of their run pace at 1.0 s; ours came
 * harder than on runs and read pass at p50 1.10 s. */
function passPull(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  const r = a.recog;
  if (!r || r.read !== 'run' || r.sawBall()) return cmd;
  const lean = r.lean(); if (lean >= 0) return cmd;
  const dir = sim.attackDir(sim.offense[0].team), down = -cmd.vel.x * dir;
  if (down <= 0) return cmd;
  a.tags.add('lb-pass-pull');
  return { ...cmd, vel: { x: cmd.vel.x * (1 + lean), y: cmd.vel.y } };
}

/** BACKER_TAKEON (experimental, off): an unblocked backer who sees a blocker
 * climbing at him breaks down before contact ("shock and shed"): he brakes his
 * speed into the blocker to a fitting pace, squares to him and sinks his pads,
 * so the collision carries the closing speed of a settled backer, not of one
 * running into it. Everything comes from his own picture of the blocker; the
 * cost is real (a slower fit, time stopped while the blocker arrives). He does
 * not break down for a blocker when the carrier he sees is closer: a tackle
 * comes first. Pads at the engaged run-fit level (0.85, engagement.ts);
 * the window is the time his brakes need plus one decision beat. */
const BACKER_TAKEON = process.env.BACKER_TAKEON !== '0', TAKEON_PADS = 0.85, TAKEON_PACE = 0.5, TAKEON_REACH = 2.5, TAKEON_CLOSING = 2;
/** BACKER_TAKEON: a blocker's working reach beyond the two bodies (yd; the run-block reach, engagement.ts inBlockReach). */
const TAKEON_ARM = 0.45;
/** BACKER_TAKEON: the blocker's own speed at him that makes him a climber (yd/s; a jog). */
const TAKEON_CLIMB = 1.5;
/** BACKER_TAKEON diagnostics: plays (by sim) on which the break-down fired. */
export const takeOnFired = new WeakSet<PlaySim>();
/** BACKER_TAKEON diagnostics: when set, each tick a backer brakes is pushed here. */
export const takeOnTrace: { rows: Array<{ sim: PlaySim; a: Agent; o: Agent; t: number }> | null } = { rows: null };
function takeOn(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  if (a.engagement || a.isDown(sim.t)) return cmd;
  let best: { ux: number; uy: number; gap: number; o: Agent } | null = null, carrierGap = Infinity;
  for (const o of sim.offense) {
    if (o === sim.qb) continue;
    const p = sim.see(a, o); const dx = p.pos.x - a.pos.x, dy = p.pos.y - a.pos.y, dist = Math.hypot(dx, dy);
    const gap = dist - a.profile.radius - o.profile.radius;
    if (p.carrying === true) { carrierGap = Math.min(carrierGap, gap); continue; }
    if (gap > TAKEON_REACH) continue;
    // A climber: a blocker off his block and moving at him himself. A
    // blocker locked on a lineman is not coming, however fast the backer
    // runs toward him.
    if (HONEST_READS ? seenEngaged(sim, a, o) : o.engagement) continue;
    const ux = dx / Math.max(dist, 1e-6), uy = dy / Math.max(dist, 1e-6);
    const closing = (a.vel.x - p.vel.x) * ux + (a.vel.y - p.vel.y) * uy;
    if (closing < TAKEON_CLOSING || p.vel.x * -ux + p.vel.y * -uy < TAKEON_CLIMB) continue;
    // Brakes needed to shed his own speed into the blocker, plus one beat.
    const own = Math.max(0, a.vel.x * ux + a.vel.y * uy);
    const window = Math.max(0, own - TAKEON_PACE) / a.profile.brake + 0.05;
    if (gap / closing > window + 0.15) continue;
    // Only a blocker whose path is aimed at him: on the relative motion he
    // sees, their closest approach comes inside the blocker's arms.
    const wx = p.vel.x - a.vel.x, wy = p.vel.y - a.vel.y, w2 = wx * wx + wy * wy;
    const tc = w2 > 1e-6 ? -(dx * wx + dy * wy) / w2 : 0;
    if (Math.hypot(dx + wx * tc, dy + wy * tc) > a.profile.radius + o.profile.radius + TAKEON_ARM) continue;
    if (!best || gap < best.gap) best = { ux, uy, gap, o };
  }
  if (!best || carrierGap <= best.gap) return cmd;
  takeOnFired.add(sim);
  takeOnTrace.rows?.push({ sim, a, o: best.o, t: sim.t });
  const along = cmd.vel.x * best.ux + cmd.vel.y * best.uy;
  const vel = along > TAKEON_PACE ? { x: cmd.vel.x - (along - TAKEON_PACE) * best.ux, y: cmd.vel.y - (along - TAKEON_PACE) * best.uy } : cmd.vel;
  return { ...cmd, vel, posture: Math.max((cmd as { posture?: number }).posture ?? 0, TAKEON_PADS) } as MoveCommand;
}

export class RunDefender implements Behavior {
  readonly kind = 'run-fit';
  constructor(
    private readonly gap: Gap,
    private readonly gapSign: number,
  ) {}
  update(a: Agent, sim: PlaySim): MoveCommand {
    const live = pursueIfLive(sim, a);
    if (live) return live;
    return runFit(a, sim, this.gap, this.gapSign);
  }
}

// ------------------------------------------------------------- coverage

/**
 * Man technique options. `lev`: which shoulder he plays (inside by default,
 * toward his help); `trail`: low-hip, under the receiver with deep help over
 * the top (2-Man); `overTop`: a deep player carrying a vertical stays on top of
 * him (quarters safety on #2, a bracket's high player).
 */
export interface ManOptions {
  lev?: 'inside' | 'outside' | 'head';
  trail?: boolean;
  overTop?: boolean;
  /** Installed deep responsibility, distinct from an underneath top shoulder. */
  protectDepth?: boolean;
  /** Acquired entry picture; used only to initialize cushion. */
  initialPosition?: Vec2;
}

/** PRESS_MIRROR (off; PRESS_MIRROR=1 turns it on): a pressing corner mirrors
 * the receiver head-up while he is still releasing at the line, so the
 * receiver must release around him (receiver.ts). Off, the corner stepped to
 * his leverage spot at the snap and opened the lane: tracked pressed outside
 * receivers are 0.62 yd lateral by their first yard and reach 5 yd at 1.90 s;
 * ours went straight (0.00 yd) and reached 5 yd at 1.65 s (BDB 2025). */
const PRESS_MIRROR = process.env.PRESS_MIRROR !== '0';
/** MAN_PHASE (off; MAN_PHASE=1 turns it on): once his hips are open and the
 * receiver is past the release (2+ yd deep), a man defender runs in phase an
 * arm's length off the receiver's hip on his leverage side (their two body
 * radii plus his reach) while the receiver runs his stem (over 3 yd/s, mostly
 * upfield), not at a point 0.7 yd off the receiver's body. On a plant or break
 * he closes on the body as before (holding the offset through a hitch left him
 * a yard off the catch). NFL
 * pressed pairs at 2.0 s: 1.20 yd apart, about 1 yd to the side; ours 0.82,
 * within 1.2 yd 88% against 51% (BDB 2025 weeks 1-3, same operator). */
const MAN_PHASE = process.env.MAN_PHASE === '1';
/** CUSHION_BREAK (experimental, off; CUSHION_BREAK=1 turns it on): inside
 * zone calls, a deep defender carrying a vertical stays square (side-on when
 * his pedal cannot keep the cushion, QB in view) until the receiver actually
 * breaks his cushion (`cushionBroken`), then opens and runs. Before, the depth
 * check turned him on a forecast burst he had not seen, and the hip trigger
 * used a half-turn flip from wherever he faced. NFL deep defenders in Cover
 * 2/3/4/6 over a receiver turn before the throw 8-10%, with or without deep
 * help; ours 51-91% (BDB 2025 weeks 1-2 vs leagueSample games, nflcue.py /
 * simcue.mts). Pure man (Cover 0/1, 2-Man) keeps its own trigger. */
const CUSHION_BREAK = process.env.CUSHION_BREAK !== '0';
/** CUSHION_BREAK: how far he opens his hips off the quarterback while he
 * carries a vertical, as the output of the speed match: the smallest angle off
 * the line to the QB (opened toward the receiver) at which his body's facing
 * cap in the direction he runs reaches the speed he needs (carrySpeedNeed: he
 * spends spare cushion rather than matching the receiver). Far over the top
 * he stays square; as the spare cushion goes he opens progressively, and he
 * comes back toward square as the receiver throttles.
 * The full turn (losing the QB) stays the cushion-break trigger. NFL deep
 * defenders over a climber open 33 deg at 1.5 s to 62 deg at 3.0 s as their
 * speed rises 3.3 -> 4.9 yd/s, turned at most 11% (BDB 2025, nflcarry.py).
 * With today's facing curve (backpedal cap above side-on) this stays square up
 * to the pedal cap and then jumps; it is continuous with PEDAL_CAP. */
function openTo(a: Agent, qb: Vec2, receiver: Vec2, heading: number, need: number): number {
  const toQB = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x), toR = Math.atan2(receiver.y - a.pos.y, receiver.x - a.pos.x);
  const side = Math.cos(toQB + Math.PI / 2 - toR) >= Math.cos(toQB - Math.PI / 2 - toR) ? 1 : -1;
  const p = a.profile;
  for (let deg = 0; deg <= 180; deg += 5) {
    const facing = toQB + side * deg * Math.PI / 180;
    if (p.vmax * directionalSpeedFactor(p, angleDiff(facing, heading)) >= need) return facing;
  }
  return toQB + side * Math.PI;
}
/** CUSHION_BREAK: has the receiver broken the cushion of a defender over him?
 * He opens to run when the cushion left is less than what the receiver closes
 * while his own hips turn from where they face now to the run (side-on is a
 * quarter turn, square a half turn, in the time a rounded hip turn takes his
 * body: `roundedTurnTime`, the turn the open-to-run actually achieves), on top of the
 * overlap he may give: a deep player with no help behind him may not let the
 * receiver reach his body (both body radii); a trail player with help over him
 * may let the receiver draw level by the same overlap before he opens. NFL deep
 * defenders over a climbing receiver who have not turned by the release keep a
 * median 1.4 yd with no deep help (below 1 yd 17-20%) and -0.9 to +0.8 yd with
 * help (BDB 2025 weeks 1-2, nflcue.py). */
function cushionThreshold(a: Agent, receiverVx: number, help: boolean, receiverRadius: number): number {
  const closing = Math.max(0, receiverVx - Math.max(0, a.vel.x));
  const flip = roundedTurnTime(a, angleDiff(a.body.facing, 0)) + 0.15 * (1 - a.r('anticipation') * a.mind.focus);
  const overlap = (a.profile.radius + receiverRadius) * (help ? -1 : 1);
  return overlap + closing * flip;
}
function cushionBroken(a: Agent, cushion: number, receiverVx: number, help: boolean, receiverRadius: number): boolean {
  return cushion < cushionThreshold(a, receiverVx, help, receiverRadius);
}
/** CUSHION_BREAK: the slowest downfield speed he may carry now. He must be at
 * the receiver's speed by the time the cushion has shrunk to his break
 * threshold; closing a gap c at the acceleration a his legs give at his
 * current facing burns c^2 / 2a of cushion (a braking distance), so
 * need = vx - sqrt(2 a (cushion - threshold)), floored at 0. Far over the top
 * he may pedal slowly and spend cushion; as the spare cushion goes he must be
 * matched; if no angle that keeps the QB in view gives that speed, the
 * cushion breaks and he turns. a is his own: the propulsion his legs give
 * toward his facing cap downfield at his current speed (1 - v / cap) * vmax /
 * tau, so a slow-footed defender has to start earlier. */
function carrySpeedNeed(a: Agent, cushion: number, receiverVx: number, help: boolean, receiverRadius: number,
  seenAccel?: number): number {
  const vx = Math.max(0, receiverVx), p = a.profile;
  if (CARRY_READ && seenAccel !== undefined) {
    const spare = cushion - cushionThreshold(a, receiverVx, help, receiverRadius);
    return spare <= 0 ? vx : burstNeed(a, spare, vx, seenAccel);
  }
  const cap = p.vmax * directionalSpeedFactor(p, angleDiff(a.body.facing, 0));
  const accel = Math.max(0.1, (1 - Math.max(0, a.vel.x) / cap) * p.vmax / p.tau);
  const spare = cushion - cushionThreshold(a, receiverVx, help, receiverRadius);
  return spare <= 0 ? vx : Math.max(0, vx - Math.sqrt(2 * accel * spare));
}
/** CARRY_READ (on since engine-57; `CARRY_READ=0` restores the old carry): a deep carry
 * plays off what the receiver can still become, read from what he shows: his
 * seen upfield speed vx and the acceleration in the defender's picture
 * (DeepCoverage's seen-velocity change), continued as a burst that fades over
 * BURST_TAU: v(t) = vx + a tau (1 - e^(-t / tau)). Three parts:
 * 1. A man carry with installed deep responsibility asks for no ground back
 *    toward a receiver who will still be climbing (`holdWeight`, continuous in
 *    that projection, scales the downhill part of his request); he may still
 *    spend cushion by pedalling slower than the receiver climbs, and comes
 *    downhill as the receiver throttles.
 * 2. The carry need (`carrySpeedNeed`, both call sites) is the slowest speed
 *    now that keeps the gap he gives up within his spare cushion while the
 *    receiver bursts and he accelerates with his own tau, toward his facing's
 *    cap until a rounded turn to the run would be done and toward his top
 *    speed after: a slower or squarer defender needs more, so he opens sooner.
 * Off: on No. 1's go vs a Cover 3 match corner, as No. 1 passed 3 yd/s at
 * about 0.8 s the over-the-top roof asked a corner 6-9 yd over him to come
 * downhill at 4-6 yd/s; then the need (from vx alone) kept him square at a
 * pedal while No. 1 burst 6.1 -> 8.3 yd/s. Over him at 1.5 / 2.0 / 2.85 s NFL
 * 4.9 / 3.3 / +1.2 yd, sim 3.9 / 2.1 / -0.8; his speed at 1.5 s 3.1 vs about 2
 * yd/s; on top at 2.85 s 54% vs 0% (BDB 2025 weeks 1-3 n 37 vs seeds 11/23;
 * scripts/diag/risk/vert-pos.ts, vert_sep_nfl.py --pos). */
const CARRY_READ = process.env.CARRY_READ !== '0';
/** CARRY_READ: how fast a seen burst fades (s), and how far ahead his cushion must last (s). Estimated, stand-in debt. */
const BURST_TAU = 1.0, BURST_HORIZON = 2.0;
/** CARRY_READ: receiver speed t s ahead, from what the defender sees. */
const projected = (vx: number, accel: number, t: number) => Math.max(0, vx + accel * BURST_TAU * (1 - Math.exp(-t / BURST_TAU)));
/** CARRY_READ: how fully he holds his depth: 1 while the receiver will be climbing 0.5 s on (3+ yd/s), easing to 0 as
 * that projection falls to 1 yd/s (a throttle, a plant). */
const holdWeight = (vx: number, accel: number) => clamp((projected(vx, accel, 0.5) - 1) / 2, 0, 1);
function burstNeed(a: Agent, spare: number, vx: number, accel: number): number {
  const p = a.profile, dt = 0.05;
  // Square, his body cannot reach his top speed: until a rounded turn from his
  // facing to the run would be done, he accelerates only toward his facing's cap.
  const turn = roundedTurnTime(a, angleDiff(a.body.facing, 0));
  const square = p.vmax * directionalSpeedFactor(p, angleDiff(a.body.facing, 0));
  const keeps = (v0: number) => {
    let gap = 0, vd = v0;
    for (let t = dt; t <= BURST_HORIZON + 1e-9; t += dt) {
      vd += Math.max(0, (t < turn ? square : p.vmax) - vd) / p.tau * dt;
      gap += (projected(vx, accel, t) - vd) * dt;
      if (gap > spare) return false;
    }
    return true;
  };
  if (keeps(0)) return 0;
  if (!keeps(p.vmax)) return p.vmax;
  let lo = 0, hi = p.vmax;
  for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (keeps(mid)) hi = mid; else lo = mid; }
  return hi;
}
/** OPEN_CARRY (experimental, off; OPEN_CARRY=1 turns it on): an underneath
 * zone or match defender carrying a route keeps his hips as square to the QB
 * as his run allows, instead of turning his back to run with it. His facing
 * is the CUSHION_BREAK rule (`openTo`): the smallest opening off the line to
 * the QB, toward the receiver, at which his body's facing speed cap reaches
 * the speed his own carry request asks for. A defender with poorer hips or
 * speed is opened further, sooner, by the same curve. On a vertical, if his
 * own picture shows a deep teammate over the receiver, he opens no further
 * than side-on: he gives ground and the route goes to the help. With no help
 * in his picture (none there, or it rotated away before he saw it go) he
 * opens as far as the speed needs, back to the QB if he must.
 * Why: NFL zone defenders running with a route from 3-6 yd face the QB within
 * 90 deg 91% of the time at release - 0.3 s; ours 62%, through man-open,
 * carry-run-past and lane-carry, which dropped the QB facing outright (BDB
 * 2025 weeks 1-2 vs sim, nfleyes.py / eyesprobe.mts by nearest receiver). */
export const OPEN_CARRY = process.env.OPEN_CARRY !== '0';
/** OPEN_CARRY: does his own picture show a deep teammate over this receiver
 * (3+ yd deeper than the receiver, within 12 yd of his line)? */
function seesDeepHelp(a: Agent, sim: PlaySim, receiver: Vec2): boolean {
  const up = sim.attackDir('O');
  for (const t of sim.defense) {
    if (t === a) continue;
    const s = sim.see(a, t).pos;
    if ((s.x - receiver.x) * up >= 3 && Math.abs(s.y - receiver.y) <= 12) return true;
  }
  return false;
}
/** OPEN_CARRY: his facing while he carries `receiver` with request `req`. */
export function openCarryFacing(a: Agent, sim: PlaySim, receiver: Agent, req: MoveCommand, vertical: boolean): number {
  const qb = sim.see(a, sim.qb).pos, r = sim.see(a, receiver).pos;
  const toQB = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x);
  const need = Math.hypot(req.vel.x, req.vel.y);
  const facing = openTo(a, qb, r, Math.atan2(req.vel.y, req.vel.x), need);
  const off = angleDiff(facing, toQB);
  if (vertical && Math.abs(off) > Math.PI / 2 && seesDeepHelp(a, sim, r)) {
    a.tags.add('open-carry-help');
    return toQB + Math.sign(off) * Math.PI / 2;
  }
  return facing;
}
/** CUSHION_NEED (on since engine-27; CUSHION_NEED=0 restores): before his
 * hips open, a man defender's cushion on a released receiver is the one the
 * receiver's observed vertical threat requires (his own hip-turn threshold:
 * 1.8 yd plus the closing speed over his flip time plus the burst the receiver
 * still has), not the alignment cushion scheduled down by the receiver's
 * depth. A climbing receiver still gets the full cushion; a back or tight end
 * releasing short under him is squeezed instead of pedalled from 4-5 yd. NFL
 * linebackers over the catcher are moving at him at the release (C1 5.1 yd/s,
 * +2.1 toward, 11% slow; zone calls 3.5, +1.3-1.4, 8-10%); ours sat (C1 2.2,
 * -0.1, 29%; C3/C4 2.3-2.4, +0.2-0.3, 27-42%), the largest group pedalling on
 * the back (man:RB) inside a zone call. */
const CUSHION_NEED = process.env.CUSHION_NEED !== '0';
/** LOOK_ONCE (off; LOOK_ONCE=1 turns it on; C15, estimated): whether a defender
 * near the ball's path gets his head around to find it is one event per flight,
 * not a fresh dice roll every tick. Off, the 0.15-0.65 chance was re-rolled at
 * 20 Hz, so nearly every such defender was "looking" within about 0.5 s
 * whatever his ball skills (half the defenders who faced the ball at the catch
 * on the panel did so through this tag). On, the first tick he is near the
 * path he draws once: with a chance of 0.25 + 0.6 x ballSkills he finds it,
 * after a turn time of 0.25 s plus up to 0.35 s for a defender whose back is
 * to the passer (body facing vs the ball's origin), shortened by ball skills;
 * otherwise he plays this flight without the look. */
const LOOK_ONCE = process.env.LOOK_ONCE !== '0';
/** DRIVE_CATCH (off; DRIVE_CATCH=1 turns it on; C14, with CATCH_SECURE): while
 * a ball is in a receiver's hands but not yet a catch (the securing window), a
 * defender within 4 yd of him drives through his hands and body (as he sees
 * them) at full effort, instead of steering to the ball's last point. Off, the
 * near defender's requested velocity turned off the man during the window
 * (toward him 4.7 -> 0.5 yd/s in 0.3 s; NFL defenders keep 4.5-5.0). */
const DRIVE_CATCH = process.env.DRIVE_CATCH !== '0';
/** CATCH_CARRY (experimental, off; CATCH_CARRY=1 turns it on): a defender who
 * was driving through a receiver's hands while he secured the ball (DRIVE_CATCH)
 * keeps driving on that receiver, as he last saw him, until his own picture
 * resolves the outcome: a holder (pursuit, as now), a newer picture of the
 * receiver without the ball (dropped), or the ball back in the air (broken
 * up). He gets no earlier knowledge of the catch than observedHolder gives.
 * Before, between the catch and his picture of it (0.15-0.35 s) he went to the
 * ball's acquired landing area, a fixed spot the catcher was leaving: his
 * request turned 99 deg off his run and his speed toward the catcher fell
 * 3.5 -> 2.0 yd/s just as the catcher started to move (settled catches 3-10 yd,
 * engine-42, settletrace.mts; NFL defenders hold +3.5 at +0.4 s). */
const CATCH_CARRY = process.env.CATCH_CARRY !== '0';
/** CATCH_CARRY: the receiver each defender was driving on, and when. */
const catchDrive = new WeakMap<Agent, { receiver: Agent; t: number }>();
/** CATCH_CARRY: how near the receiver (as he sees him) a defender must be to be "on" him (yd). */
const CATCH_CARRY_RANGE = 5;
const lookPlan = new WeakMap<Agent, { flight: number; at: number }>();
function findsBall(a: Agent, sim: PlaySim): boolean {
  const ball = sim.ball;
  if (ball.kind !== 'air') return false;
  let plan = lookPlan.get(a);
  if (!plan || plan.flight !== ball.releaseT) {
    const bs = a.r('ballSkills');
    const thrower = HONEST_READS ? sim.see(a, ball.thrower).pos : ball.thrower.pos;
    const from = Math.atan2(thrower.y - a.pos.y, thrower.x - a.pos.x);
    const away = (1 - Math.cos(a.body.facing - from)) / 2;
    const finds = sim.dice('look', a).chance(0.25 + 0.6 * bs);
    plan = { flight: ball.releaseT, at: finds ? sim.t + (0.25 + 0.35 * away) * (1.2 - 0.4 * bs) : Infinity };
    lookPlan.set(a, plan);
  }
  return sim.t >= plan.at;
}

/** Man coverage with press/off technique, leverage and hip turn. */
export class ManCoverage implements Behavior {
  readonly kind = 'man';
  /** A seen scramble does not release his man until the QB crosses the line. */
  readonly plastersScramble = true;
  private readonly press: boolean;
  private readonly initialCushion: number;
  private hipsOpen = false;
  private releaseObserved = false;
  private routeRead = false;
  private stemHeading: number | null = null;
  private stableSince = 0;
  private readonly observation = new RouteObservation();
  private readonly depth = new DeepCoverage();
  private keyedFitRecorded = false;
  /** Shallow blocking evidence admitted this marker's current support duty. */
  private blockingRun = false;

  /** The technique actually in use, without updating receiver observation. */
  recordedTechnique(): NonNullable<import('../types.js').ReplayAgentState['man']> {
    return { leverage: this.opts.lev ?? 'inside', initialCushion: this.initialCushion, press: this.press,
      hipsOpen: this.hipsOpen, trail: !!this.opts.trail, overTop: !!this.opts.overTop, routeRead: this.routeRead };
  }

  constructor(
    a: Agent,
    sim: PlaySim,
    readonly target: Agent,
    press: boolean,
    private readonly gap: Gap,
    private readonly gapSign: number,
    readonly opts: ManOptions = {},
  ) {
    this.press = press;
    this.initialCushion = Math.max(0.8, a.pos.x - (opts.initialPosition ?? target.pos).x);
    void sim;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const R = this.target;
    if (sim.ball.kind === 'air') {
      let continuing = false;
      const command = playBall(a, sim, R, () => {
        continuing = true;
        return this.coverMan(a, sim);
      });
      // The existing ball controller recognized flight, rather than invoking
      // the continuation. Retire support without another sighting or private
      // release-time gate.
      if (!continuing) this.blockingRun = false;
      return command;
    }
    return this.coverMan(a, sim);
  }

  /** An unrecognized throw does not erase the installed man technique. */
  private coverMan(a: Agent, sim: PlaySim): MoveCommand {
    const R = this.target;
    const live = pursueIfLive(sim, a);
    if (live) return live;
    const receiverCue = sim.see(a, R);
    // A back carrying the ball will not look like a stalk blocker. A man
    // marker who reads run and personally acquires that possession uses his
    // installed run fit (insertion, alley, force...), not receiver cushion:
    // cushion on a ball carrier is a retreat that turns his back on the ball.
    // Alley support still preserves its cap through a deep mesh; it is not an
    // extra interior fitter just because this defender marks the back.
    // Unknown/negative possession preserves ordinary man/PA responsibility.
    const backfieldBack = sim.offAlign.spots[R.slot]?.backfield
      && (R.player.position === 'RB' || R.player.position === 'FB');
    if (backfieldBack && believesRun(sim, a) && receiverCue.carrying === true) {
      if (!this.keyedFitRecorded) {
        this.keyedFitRecorded = true;
        if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'coverage-run-fit', chose: `keyed-fit:${R.slot}`,
          cue: `${R.slot} carrying=true in consumed picture; run belief; installed ${a.runFit?.kind ?? 'fallback'}`,
          options: [`man:${R.slot}`, `keyed-fit:${R.slot}`],
          detail: `Installed ${a.runFit?.gap ?? this.gap}-gap, side ${a.runFit?.side ?? this.gapSign}; known target ${R.slot}; picture age ${receiverCue.age === undefined ? 'unknown' : receiverCue.age.toFixed(2)} s, depth ${(receiverCue.pos.x - sim.los).toFixed(2)} yd. Keyed target is not confirmed live carrier; observed geometry decides insertion or pursuit.` });
      }
      return runFit(a, sim, this.gap, this.gapSign, { target: R, cue: receiverCue });
    }
    // The shared transition above handles an acquired committed QB. Support
    // below still interprets his picture with the installed backfield.
    const qbCue = sim.see(a, sim.qb);
    const back = sim.slot('RB');
    const installedBackfield = !!back && !!sim.offAlign.spots[back.slot]?.backfield;
    // Do not extend this duty where its explicit information input is absent.
    // Empty/split-back formations keep their pre-existing shallow policy.
    if (!installedBackfield) this.blockingRun = false;
    const run = believesRun(sim, a);
    const blockingLook = this.blockingRun
      ? observedBlocking(a, sim, R, receiverCue) : showsBlock(a, sim, R, receiverCue);
    // Once admitted, this informed duty owns its backfield interpretation.
    // A hidden holder change must not switch it through the legacy live-
    // carrier pursuit gate. Recognized flight already retired it in update.
    // Perimeter only: a man on a back or an inline end is a box defender,
    // whose man blocking him is his run read.
    const spot = sim.offAlign.spots[R.slot];
    const passFirst = passFirstOn() && a.runFit?.kind !== 'force' && !!spot && !spot.backfield && !spot.inline;
    if (this.blockingRun && run && blockingLook && !passFirst) return this.blockingSupport(a, sim, qbCue);
    this.blockingRun = false;
    if (run && blockingLook && !passFirst) {
      this.blockingRun = installedBackfield;
      return this.blockingSupport(a, sim, qbCue);
    }
    if (DB_SLOWPLAY && run && !this.hipsOpen) {
      const slow = this.slowPlay(a, sim);
      if (slow) return slow;
    }

    return this.trackReceiver(a, sim);
  }

  /** DB_SLOWPLAY (experimental, off): a man defender who has read run stays on
   * his receiver (pass first) but slow-plays him: he gives ground at a
   * fraction of the receiver's tempo and lets an approach close his cushion,
   * keeping his leverage, instead of retreating at the receiver's speed. A
   * receiver sprinting off the ball (a real release) or a cushion already
   * down to SLOW_MIN returns him to ordinary man tracking, so play action
   * that sells the run still beats him with a vertical. NFL off corners on
   * runs give ground at about 0.9 yd/s while their receiver comes at about
   * 3 (0.3 of his tempo); ours matched him at 2.6-3. Wide receivers only
   * (aligned SLOW_WIDTH yd or more from the ball). */
  private slowPlay(a: Agent, sim: PlaySim): MoveCommand | null {
    const R = this.target, cue = sim.see(a, R), speed = Math.hypot(cue.vel.x, cue.vel.y);
    // Wide receivers only: a man on a slot is an inside run supporter, who triggers.
    const spot = sim.offAlign.spots[R.slot]?.pos;
    if (!spot || Math.abs(spot.y - sim.ballY) < SLOW_WIDTH) return null;
    if (speed > SLOW_SPRINT * R.profile.vmax) return null;
    if (a.pos.x - cue.pos.x <= SLOW_MIN) return null;
    const inside = Math.sign(sim.ballY - cue.pos.y) || 1, o = this.opts;
    const lev = (o.trail ? 0.9 : 0.7) * (o.lev === 'outside' ? -inside : o.lev === 'head' ? 0 : inside);
    a.tags.add('slow-play');
    return withFacingTechnique(track(a, { x: a.pos.x, y: clamp(cue.pos.y + lev, 0.5, FIELD_WIDTH - 0.5) },
      { x: SLOW_GIVE * Math.max(0, cue.vel.x), y: cue.vel.y }, { facing: Math.PI, gain: 1.6 }), { label: 'man-slowplay', key: cue.vel });
  }

  private blockingSupport(a: Agent, sim: PlaySim, qbCue: Perceived): MoveCommand {
    const back = sim.slot('RB');
    // A block read admits installed support, not private holder knowledge.
    // Use the same acquired/expected backfield in held and unrecognized
    // flight. The fit retains its existing failed-exchange retirement.
    const read = back && sim.offAlign.spots[back.slot]?.backfield
      ? { backfield: { back, backCue: sim.see(a, back), qbCue } } : undefined;
    return runFit(a, sim, this.gap, this.gapSign, read);
  }

  /** Release movement only; provisional zone readers retain their own
   * support and recognized-flight priorities before using this technique. */
  trackReceiver(a: Agent, sim: PlaySim): MoveCommand {
    const R = this.target;

    // Anticipate a stable observed stem, then lose that confidence on a break.
    // No route identity or once-per-play "knows the route" coin flip.
    const cue = sim.see(a, R);
    const heading = Math.atan2(cue.vel.y, cue.vel.x);
    if (Math.hypot(cue.vel.x, cue.vel.y) < 1 || this.stemHeading === null || Math.abs(angleDiff(this.stemHeading, heading)) > 0.35) {
      this.stableSince = sim.t;
      this.stemHeading = heading;
      this.routeRead = false;
    } else if (sim.t - this.stableSince > 0.35 + 0.35 * (1 - a.r('playRecognition') * a.mind.focus)) this.routeRead = true;
    const delayScale = this.routeRead ? 0.65 : 1;
    const acquired = sim.see(a, R, delayScale);
    const seen = this.observation.read(acquired, sim.t, R.profile, a.profile.reactionTime,
      a.r('anticipation') * a.r('manCoverage') * a.mind.focus);
    if (Math.hypot(seen.vel.x, seen.vel.y) > 1.5) this.releaseObserved = true;
    const inside = Math.sign(sim.ballY - seen.pos.y) || 1;
    const o = this.opts;
    // PRESS_MIRROR: in press, while the receiver is still releasing at the
    // line (not yet level with him), the corner mirrors him head-up and
    // stays in his path; his leverage is where he ends up, not his first step.
    const releasing = PRESS_MIRROR && this.press && seen.pos.x - sim.los < 3 && seen.pos.x < a.pos.x - 0.3;
    const vx = seen.vel.x;
    const deep = seen.pos.x - sim.los;
    // MAN_PHASE: in phase on the stem, his hand reaches the receiver's near
    // hip. A plant or break ends the race; he closes on the body as before.
    const vSeen = Math.hypot(seen.vel.x, seen.vel.y);
    const onStem = vSeen > 3 && vx > 0.8 * vSeen;
    const levMag = MAN_PHASE && this.hipsOpen && deep > 2 && onStem
      ? a.profile.radius + R.profile.radius + a.player.measurables.armIn / 36 * 0.7
      : o.trail ? 0.9 : 0.7;
    // CUSHION_BREAK: a carry inside a zone call plays to a shoulder, never
    // stacked on the receiver's line: his body and the receiver's plus a reach
    // off it, on his leverage side (inside when head-up), so a receiver who
    // closes runs past him rather than through him. With help behind him the
    // offset widens by another reach as the receiver comes level (he trails
    // on the hip and gives the vertical to the help). NFL deep defenders over
    // a climber sit 0.9-1.3 yd off his line with no help, 1.2 -> 2.1 yd with
    // help as he comes level; ours 0.6-0.9 (BDB 2025 weeks 1-2, nflcarry.py).
    const reach = a.player.measurables.armIn / 36 * 0.7, shoulderOff = a.profile.radius + R.profile.radius + reach;
    const shoulder = CUSHION_BREAK && !sim.defCall.coverage.man && !releasing && deep > 2 && onStem
      ? shoulderOff + (o.protectDepth ? 0 : reach * clamp(1 - (a.pos.x - seen.pos.x) / shoulderOff, 0, 1)) : null;
    const lev = releasing ? 0 : shoulder !== null ? shoulder * (o.lev === 'outside' ? -inside : inside)
      : levMag * (o.lev === 'outside' ? -inside : o.lev === 'head' ? 0 : inside);

    // Cushion shrinks as the route develops; press plays in phase.
    const developing = clamp(Math.max(0, deep) / 8, 0, 1);
    const cushion = this.press ? 0.8 : Math.max(1, Math.min(5.5, this.initialCushion) * (1 - developing) + developing);
    // At press depth the receiver is already within 2.5 yards at the snap.
    // That alone is not a release cue: opening immediately made the corner
    // step downhill and turn twice while the receiver accelerated past him.
    const closing = Math.max(0, vx - Math.max(0, a.vel.x));
    const flipTime = Math.PI / a.profile.turnRate + 0.15 * (1 - a.r('anticipation') * a.mind.focus);
    const releaseBurst = Math.max(0, (R.profile.vmax - Math.hypot(seen.vel.x, seen.vel.y)) / R.profile.tau);
    // CUSHION_BREAK applies inside zone calls (match carries and deep zones);
    // pure man keeps its trigger. Help: a carry with no installed deep
    // responsibility has a deep player behind it.
    const breakOn = CUSHION_BREAK && !sim.defCall.coverage.man, help = !o.protectDepth;
    const broken = () => cushionBroken(a, a.pos.x - seen.pos.x, vx, help, R.profile.radius);
    const consumed = breakOn ? broken()
      : a.pos.x - seen.pos.x < 1.8 + closing * flipTime + 0.25 * releaseBurst * flipTime * flipTime;
    const crossing = Math.abs(seen.vel.y) > 3 && Math.abs(seen.vel.y) > Math.abs(vx);
    if (!this.hipsOpen && Math.hypot(seen.vel.x, seen.vel.y) > 1.5 && (consumed || crossing)) this.hipsOpen = true;
    // CUSHION_BREAK: a receiver he is carrying throttles below his own speed
    // with the cushion not broken: he re-squares (the body turns back at its
    // own rate; the stop route is built to win in that time).
    if (breakOn && this.hipsOpen && !crossing && (infoHonest(6) ? !playsThrow(a, sim, R) : sim.ball.kind !== 'air') && vx < Math.max(0, a.vel.x) - 1
      && !broken()) { this.hipsOpen = false; a.tags.add('re-square'); }

    let tx = seen.pos.x;
    let ty = seen.pos.y + lev;
    if (this.press && vx >= 0) {
      const developing = clamp(deep / 4, 0, 1);
      tx += this.initialCushion * (1 - developing) + 0.6 * developing;
    }
    else if (vx > 3 && deep > 3) tx = Math.max(tx, seen.pos.x + cushion * 0.5);
    else if (!this.hipsOpen) {
      // Before the release, hold the off-man cushion rather than charging a
      // stationary back. Once his observed stem moves, close excess cushion:
      // a late match must not inherit its current depth as a retreat floor.
      // A later plant does not undo knowledge that this receiver released.
      // Feed-forward motion still lets a receiver consume the cushion, and
      // the ordinary body limits determine whether the defender can close.
      // CUSHION_NEED: once released, keep only the cushion his threat needs.
      // What he could gain upfield during the flip: his upfield speed now
      // plus the acceleration he has left toward his top speed (1/2 a t^2).
      const upBurst = Math.max(0, (R.profile.vmax - Math.max(0, vx)) / R.profile.tau);
      const need = 1.8 + closing * flipTime + 0.5 * upBurst * flipTime * flipTime;
      const held = CUSHION_NEED && this.releaseObserved ? Math.min(cushion, need) : cushion;
      if (held < cushion) a.tags.add('cushion-need');
      tx = this.releaseObserved
        ? seen.pos.x + held : Math.max(seen.pos.x + cushion, a.pos.x - 0.2);
    }
    // Over the top: a deep carrier keeps a cushion on the vertical; trail: a
    // low-hip under defender sits behind his hip with help over the top.
    if (o.overTop) {
      // Keep a roof on a climbing receiver. A visible plant compresses the
      // cushion instead of preserving four yards of empty grass forever.
      const climbing = Math.max(0, vx);
      const top = 0.8 + 0.15 * climbing;
      tx = seen.pos.x + top;
    }
    else if (o.trail && deep > 3 && vx > 2) tx = seen.pos.x - 0.6;
    if (o.protectDepth) {
      if (!this.releaseObserved) tx = Math.max(tx, a.pos.x - .2);
      tx = Math.min(tx, END_LINE_X - a.profile.radius);
    }
    ty = clamp(ty, 0.5, FIELD_WIDTH - 0.5);
    const tgt = { x: tx, y: ty };
    const cs = 0.85 + 0.35 * a.r('manCoverage');
    const openReq = this.hipsOpen ? track(a, tgt, seen.vel, { cutSkill: cs, gain: 2.0 + a.r('manCoverage') }) : null;
    // OPEN_CARRY: an underneath match carry inside a zone call runs as square
    // to the QB as his request allows (pure man and deep carries unchanged).
    const underCarry = OPEN_CARRY && openReq && !sim.defCall.coverage.man && !o.protectDepth;
    if (underCarry) a.tags.add('open-carry');
    let command = openReq
      ? underCarry
        ? withFacingTechnique({ ...openReq, facing: openCarryFacing(a, sim, R, openReq, vx > 3) }, { label: 'open-carry', key: seen.vel })
        : withFacingTechnique(openReq, { label: 'man-open', key: seen.vel })
      : withFacingTechnique(track(a, tgt, { x: Math.max(0, seen.vel.x), y: seen.vel.y }, { facing: Math.PI, gain: 1.6 }),
        { label: 'man-pedal', key: seen.vel });
    if (!o.protectDepth) return command;
    // CARRY_READ: while the receiver will still be climbing, he asks for at
    // least the upfield speed his carry needs (the slowest that keeps his spare
    // cushion against the burst he sees): he spends cushion only as fast as it
    // allows and never comes downhill at a climber. As the receiver throttles
    // the hold fades and the roof / cushion need bring him down.
    const hold = CARRY_READ ? holdWeight(vx, this.depth.seenAcceleration) : 0;
    if (hold > 0) {
      const need = carrySpeedNeed(a, a.pos.x - seen.pos.x, vx, !o.protectDepth, R.profile.radius, this.depth.seenAcceleration);
      const floor = hold * need;
      if (command.vel.x < floor) {
        command = { ...command, vel: { x: floor, y: command.vel.y } };
        a.tags.add('carry-hold');
      }
    }
    const base = o.overTop ? .8 + .15 * Math.max(0, vx)
      : vx > 3 && deep > 3 ? cushion * .5 : cushion;
    // CUSHION_BREAK: square in his pedal until the cushion is broken; when the
    // pedal cannot keep it but it is not broken, he carries side-on (QB still
    // in view) at the speed the depth check asks for.
    const selected = this.depth.choose(a, seen, acquired, R.profile, base, command, sim.t, sim.world.handContact);
    if (breakOn && !this.hipsOpen && !broken()) {
      const req = selected.facing === undefined ? selected : command;
      const qbSeen = sim.see(a, sim.qb).pos;
      const facing = openTo(a, qbSeen, seen.pos, Math.atan2(req.vel.y, req.vel.x),
        carrySpeedNeed(a, a.pos.x - seen.pos.x, vx, help, R.profile.radius, this.depth.seenAcceleration));
      const toQB = Math.atan2(qbSeen.y - a.pos.y, qbSeen.x - a.pos.x);
      if (Math.abs(angleDiff(facing, toQB)) < 1e-6 && req === command) return command;
      a.tags.add('open-carry');
      return withFacingTechnique({ ...req, facing }, { label: 'man-open-carry', key: seen.vel });
    }
    if (selected.facing === undefined && vx > 1.5) this.hipsOpen = true;
    return selected.facing === undefined && command.facing !== undefined
      ? withFacingTechnique(selected, { label: 'man-depth-run', key: seen.vel }) : selected;
  }
}

/**
 * Zone coverage. Two techniques:
 * - match (pattern-match): drop to the landmark, carry verticals through the
 *   zone, pick up whoever enters it, read the QB's eyes as a tiebreaker.
 * - spot (spot drop, "country" zone): sprint to the landmark, settle and play
 *   the quarterback — lean where he looks, sit in the lane of a receiver in
 *   the zone without following him out, break on his arm action.
 * Overloaded match defenders can hesitate at an exchange, then recover on a
 * subsequent read. Their called technique stays intact.
 */
/** CURL_FLAT_BACK (experimental, off; CURL_FLAT_BACK=1 turns it on): the
 * curl-flat rule's second half. With No. 2 not (or no longer) carried
 * vertically, the curl-flat defender who sees the back or No. 3 showing to the
 * flat on his side (shallow, running outside 2 yd outside the ball, or already
 * settled in the flat 4 yd outside it) sinks to
 * his curl window and widens under it toward the flat with his eyes on the QB,
 * by his read and range, and breaks on the throw (the existing sawThrow /
 * playBall), so a flat-curl high-low still works on him. Without it the curl-flat
 * expansion covered only No. 2 and was switched off by a fast-releasing back;
 * he played the threat nearest his curl landmark and was about 10 yd inside
 * the catcher on our wide back-flat catches with nobody in front of the
 * catcher (RB wide nobody-in-front 50% vs NFL 12%: outside_wide.py,
 * wide-owner.ts). */
const CURL_FLAT_BACK = process.env.CURL_FLAT_BACK !== '0';
/** SAFETY_DEPTH (experimental, off; SAFETY_DEPTH=1 turns it on): a deep or
 * quarter-field zone defender's landmark is never shallower than his
 * alignment. Without it a quarter of our safeties (quarters inside safeties at
 * 12 yd aligned about 12; deep middles compressed near the goal line) were
 * installed with a landmark 1.3-1.5 yd shallower than where they lined up and
 * walked down to it in the first second: 91-95% of the safeties who came
 * downhill on non-PA drop-backs (21% of safeties vs the NFL's 12%; Cover 4
 * 38% vs 6%), none of them reading run (safety-downhill.ts, safety_deep.py).
 * A call that sends a safety down gives him an underneath zone and is
 * unchanged. */
const SAFETY_DEPTH = process.env.SAFETY_DEPTH !== '0';
/** SAFETY_DEPTH: a deep safety's depth over the deepest route in his zone, as he sees it, with that route `r` yd past
 * the line: NFL deep safeties' median depth over it is 13.0 / 11.7 / 8.5 yd with the route at 1.2 / 3.7 / 9.7 yd
 * (BDB 2025, safety_cushion.py), i.e. 13.4 - 0.5 r. A slower safety keeps more and a better reader less (scale
 * 9.6 / top speed, 0.85-1.25, x 1.1 - 0.2 play recognition: estimated, stand-in debt). Never under 2 yd. */
/** SAFETY_DEPTH: a safety facing the QB requests the backward speed he means to run, his pedal (top speed x
 * backpedal), not a speed the body would clip; to go faster he opens and runs (the turn-run / open-carry branches). */
function pedalRequest(a: Agent, cmd: MoveCommand): MoveCommand {
  const pedal = a.profile.vmax * a.profile.backpedal;
  return cmd.vel.x > pedal ? { ...cmd, vel: { x: pedal, y: cmd.vel.y } } : cmd;
}
function safetyOver(a: Agent, r: number): number {
  const scale = clamp(9.6 / a.profile.vmax, 0.85, 1.25) * (1.1 - 0.2 * a.r('playRecognition'));
  return Math.max(2, (13.4 - 0.5 * Math.max(0, r)) * scale);
}
export class ZoneCoverage implements Behavior {
  readonly kind = 'zone';
  private readonly landmark: Vec2;
  /** Inspect the exact adjusted landmark used by this technique. */
  recordedLandmark(): Vec2 { return { ...this.landmark }; }
  private readonly deep: boolean;
  /** Deep zones stay on top of a scramble until the QB crosses the line. */
  get plastersScramble(): boolean { return this.deep; }
  private readonly radius: number;
  /** Lateral band of responsibility (field y range). */
  private readonly band: [number, number];
  readonly style: ZoneStyle;
  target: Agent | null = null;
  private nextPatternRead = 0;
  private patternHesitationUntil = -1;
  private readonly initialDepth: number;
  private turnedWith: Agent | null = null;
  private readonly observations = new Map<Agent, RouteObservation>();
  private readonly depthReads = new Map<Agent, DeepCoverage>();
  private flatExpansionRecorded = false;
  /** ZONE_SETTLE: when this underneath dropper saw the QB set (-1 not yet). */
  private settledAt = -1;
  /** ZONE_SETTLE: the deepest the QB has been in this defender's picture. */
  private qbDeepest = Infinity;
  /** A box backer has left his read step for his drop. */
  private dropping = false;

  constructor(
    a: Agent,
    sim: PlaySim,
    readonly zone: ZoneId,
    private readonly gap: Gap,
    private readonly gapSign: number,
    styleOverride?: ZoneStyle,
  ) {
    this.landmark = zoneLandmark(zone, sim.offAlign);
    this.initialDepth = a.pos.x - sim.los;
    this.deep = isDeepZone(zone);
    // Flat/curl-flat defenders expand all the way to the sideline with a threat.
    this.radius = this.deep ? 11 : zone === 'robber' || zone === 'hook_mid' || zone === 'hole' ? 6.5 : zone.includes('flat') ? 11 : 7.5;
    this.band = zoneBand(zone, sim);
    const style: ZoneStyle = styleOverride ?? (zone === 'robber' || zone === 'hole' ? 'match' : (sim.defCall.zoneStyle ?? 'match'));
    if (style === 'spot' && !this.deep) {
      // Spot drops are deeper: curl and hook defenders sink to 11-12 yards.
      const sink = zone.startsWith('curl_flat') ? 2.5 : zone.startsWith('hook') ? 1.5 : zone.startsWith('flat') ? 1.5 : 0;
      this.landmark = { x: sim.los + coverageDepth(sim.los, this.landmark.x - sim.los + sink), y: this.landmark.y };
    }
    // SAFETY_DEPTH: a deep or quarter-field zone defender does not walk down to
    // a landmark shallower than where he lined up: his landmark is never
    // shallower than his alignment (to the end line). Calls that send a
    // safety down give him an underneath zone (robber, hook, curl-flat), and
    // those landmarks are unchanged.
    if (SAFETY_DEPTH && this.deep && this.landmark.x - sim.los < this.initialDepth) {
      this.landmark = { x: Math.min(END_LINE_X - 1.2, sim.los + this.initialDepth), y: this.landmark.y };
      a.tags.add('safety-depth');
    }
    this.style = style;
  }

  /** SAFETY_DEPTH: the depth he held over a route when he first saw it stop climbing (cleared if it climbs again). */
  private readonly heldOver = new Map<Agent, number>();
  private holdOver(r: Agent, x: number): number {
    const held = this.heldOver.get(r);
    if (held !== undefined) return held;
    this.heldOver.set(r, x);
    return x;
  }

  private selectTarget(a: Agent, target: Agent | null): void {
    // Retire only the held action. Per-receiver observation/depth memory stays.
    a.mind.setAimTarget('zone-drive', target?.idx ?? null);
    this.target = target;
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const live = pursueIfLive(sim, a);
    if (live) return live;
    // Until he sees the throw, a zone defender keeps playing his zone.
    if (playsThrow(a, sim, null)) return playBall(a, sim, null, RELEASE_BELIEF ? () => this.zonePlay(a, sim) : undefined);
    // SHOULDER_READ: an underneath defender reading the QB stops his drop on
    // the throwing motion he has seen; the rest of his zone play goes on.
    if (SHOULDER_READ && !this.deep && underneathPlant(a, sim)) return stopDrop(sim, this.zonePlay(a, sim));
    return this.zonePlay(a, sim);
  }

  /** His zone play with the ball in the QB's hands (no throw seen). */
  private zonePlay(a: Agent, sim: PlaySim): MoveCommand {
    // A deep defender who reads run executes his cap/force contract. Alley
    // fits retain depth through the mesh; certainty about the hidden call is
    // not required, and a mistaken read can still expose play action.
    if (believesRun(sim, a)) return runFit(a, sim, this.gap, this.gapSign);
    // A box backer reads before he moves: square, at his alignment, eyes on
    // the quarterback as he sees him. He drops only once he has read pass
    // (tracked box backers, 2.5-8 yd deep and within 6 yd of the ball, hold
    // their depth through 0.8 s on passes and runs alike). An apex or
    // overhang backer keeps his eased drop to the flat.
    // How sure he must be before he drops is the call's (dropStart; default
    // early, on the read itself). Once he drops he doesn't step back.
    if (!this.deep && !this.dropping && boxBacker(a, sim)) {
      const read = a.recog?.read;
      if (read === 'unsure' || (read === 'pass' && a.recog!.pPass() < DROP_START[sim.defCall.dropStart ?? 'early'])) {
        if (read === 'unsure') watch(sim, a, sim.qb);
        // LB_GUARD_STEP (experimental, off): "guards to backs". Still unsure of
        // run or pass, a box backer whose guards both step the same way (no
        // pass set; guardStep, read at first movement) steps with them, at their pace plus a step of
        // his own, eyes still on the quarterback. A pass read stops him there;
        // a run read finds him already flowing. NFL OZ box backers move +0.37 to
        // +0.54 yd/s toward the play by 0.2 s; ours stood until the run read
        // committed (median 0.60 s).
        const g = LB_GUARD_STEP ? guardStep(sim, a) : { side: 0, pace: 0 }, side = g.side;
        // READ_LEAN (experimental, off): still unsure, he acts on the picture
        // he has, not only once it commits him. His downhill step follows his
        // own filtered evidence (the same evidence his commit uses, no prior):
        // pressing as the line fires out, settling as it sets to pass.
        // NFL box backers' run and dropback motion separate from 0.1-0.3 s,
        // even those standing at the snap; ours were identical until 0.4 s
        // (the guard step held depth, the read step was the same either way).
        if (READ_LEAN && read === 'unsure' && a.recog) {
          const lean = a.recog.lean(), cdir = sim.attackDir(sim.offense[0].team), h = a.mind.decisionInterval;
          const cp = creepPace.get(a) ?? 0, down = lean > 0 ? cp + lean * LEAN_RUN : cp * (1 + lean);
          const pace = side ? Math.min(a.profile.vmax * a.profile.shuffle, g.pace + KEY_STEP_LEAD) : 0;
          a.tags.add('lb-read-lean');
          return withFacingTechnique(track(a, { x: a.pos.x - cdir * down * h, y: a.pos.y + side * pace * h }, { x: -cdir * down, y: side * pace },
            { facing: angleTo(a.pos, sim.see(a, sim.qb).pos), gain: 1.6, speed: 1 }), { label: 'read-step' });
        }
        if (side) {
          const pace = Math.min(a.profile.vmax * a.profile.shuffle, g.pace + KEY_STEP_LEAD), h = a.mind.decisionInterval;
          a.tags.add('lb-guard-step');
          // BACKER_CREEP: a backer who crept into the snap keeps walking into
          // it while he steps with the guards; stepping does not stop his feet.
          const cp = creepPace.get(a) ?? 0, cdir = sim.attackDir(sim.offense[0].team);
          return withFacingTechnique(track(a, { x: a.pos.x - cdir * cp * h, y: a.pos.y + side * pace * h }, { x: -cdir * cp, y: side * pace },
            { facing: angleTo(a.pos, sim.see(a, sim.qb).pos), gain: 1.6, speed: 1 }), { label: 'read-step' });
        }
        // BACKER_CREEP: still unsure, a backer who crept into the snap keeps
        // walking into his read at his creep pace (his read step is the creep
        // continued) rather than planting or stepping back to a fixed spot.
        const cp = creepPace.get(a);
        if (cp) {
          const cdir = sim.attackDir(sim.offense[0].team), h = a.mind.decisionInterval;
          return withFacingTechnique(track(a, { x: a.pos.x - cdir * cp * h, y: a.pos.y }, { x: -cdir * cp, y: 0 },
            { facing: angleTo(a.pos, sim.see(a, sim.qb).pos), gain: 1.6, speed: 1 }), { label: 'read-step' });
        }
        // LB_READ_STEP (experimental, off): his read step is a step. Off the
        // snap he presses a short step downhill from his alignment, square,
        // eyes on the quarterback, and reads from there: a run read keeps him
        // coming, a pass read starts his drop from it. NFL box backers gain
        // 0.1-0.15 yd downhill by 0.5 s on runs and dropbacks alike, then 40%
        // stop or drop on passes; ours stood still until the read.
        if (LB_READ_STEP) {
          const home = sim.defAlign.spots[a.slot as keyof typeof sim.defAlign.spots]?.pos ?? a.pos, dir = sim.attackDir(sim.offense[0].team);
          a.tags.add('lb-read-step');
          return withFacingTechnique(track(a, { x: home.x - dir * READ_STEP, y: home.y }, { x: 0, y: 0 },
            { facing: angleTo(a.pos, sim.see(a, sim.qb).pos), gain: 1.6, speed: 0.5 }), { label: 'read-step' });
        }
        return withFacingTechnique(stand(angleTo(a.pos, sim.see(a, sim.qb).pos)), { label: 'read-step' });
      }
      if (read === 'pass') this.dropping = true;
    }
    const spot = this.style === 'spot';

    const qb = sim.qb;
    const lm = this.landmark;
    const [ylo, yhi] = this.band;
    const qbAt = infoHonest(9) ? sim.see(a, qb).pos : qb.pos;
    const facingQB = angleTo(a.pos, qbAt);
    watch(sim, a, qb);
    const qbEyes = seenQbEyes(a, sim);
    // Zone drops are run under control, eyes on the QB.
    // Until he's read pass, an underneath defender only eases into his drop
    // (read step): how far he commits depends on how sure he is.
    const hesitate = this.deep ? 1 : unsureFactor(a);
    const zs = (0.65 + 0.2 * a.r('zoneCoverage')) * hesitate;
    const inside = (y: number) => Math.sign(sim.ballY - y) || 1;

    // Perceived routes in (or about to enter) this zone's lateral band.
    const threats: Array<{ r: Agent; pos: Vec2; vel: Vec2; fut: Vec2; cue: Perceived }> = [];
    for (const r of sim.offense) {
      if (r === sim.qb || ['LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot)) continue;
      let observation = this.observations.get(r);
      if (!observation) { observation = new RouteObservation(); this.observations.set(r, observation); }
      const cue = sim.see(a, r);
      const seen = observation.read(cue, sim.t, r.profile, a.profile.reactionTime,
        a.r('anticipation') * a.r('zoneCoverage') * a.mind.focus);
      const fut = { x: seen.pos.x + seen.vel.x * 0.7, y: seen.pos.y + seen.vel.y * 0.7 };
      if (fut.y < ylo || fut.y > yhi) continue;
      threats.push({ r, pos: seen.pos, vel: seen.vel, fut, cue });
    }

    // ZONE_SETTLE: an underneath dropper gains depth until he sees the
    // quarterback finish his drop (set behind the line, all but still in his
    // own delayed picture), then plants: from there he plays the QB and the
    // routes at the depth he has, carrying a vertical only when it comes.
    if (ZONE_SETTLE && !this.deep && this.settledAt < 0) {
      // The set is the end of a drop he has seen: the QB first gives ground
      // (a yard or more deeper than where he took the snap), then stops.
      const q = sim.see(a, qb);
      this.qbDeepest = Math.min(this.qbDeepest, q.pos.x);
      const dropped = (sim.offAlign.spots.QB?.pos.x ?? q.pos.x) - this.qbDeepest >= 1;
      if (dropped && knowsPass(sim, a) && Math.hypot(q.vel.x, q.vel.y) < 1.2) this.settledAt = sim.t;
    }
    const settled = (t: Vec2): Vec2 => this.settledAt >= 0 ? { x: Math.min(t.x, Math.max(a.pos.x, sim.los + 3)), y: t.y } : t;
    const settle = (t: Vec2): Vec2 => settled(t);

    if (this.deep) {
      // Deep zones: never let a vertical get on top. Split two verticals.
      let vert = threats.filter((th) => th.fut.x - sim.los > 7 || (th.vel.x > 1 && th.pos.x > sim.los));
      // A deep-third corner stays over verticals in the outside third; a seam
      // on the hash is the middle safety's. He only takes #2 if #2 works out to him.
      if (this.zone === 'deep_third_s' || this.zone === 'deep_third_w') {
        const third = FIELD_WIDTH / 3;
        const outer = vert.filter((th) => Math.min(th.fut.y, FIELD_WIDTH - th.fut.y) < third + 2);
        if (outer.length) vert = outer;
      }
      // Quarters is a route distribution: the corner carries #1, the safety
      // keys #2. Splitting both verticals here duplicated the corner's help
      // and left the slot free. Deep-third corners likewise own the outside
      // receiver before helping on a seam. Halves/middle retain split rules.
      const quarter = this.zone.startsWith('quarter_');
      const thirdCorner = this.zone.startsWith('deep_third_');
      if (quarter || thirdCorner) {
        const side = this.zone.includes('_s') ? 'S' : 'W';
        const number = this.zone.endsWith('_in') ? '2' : '1';
        const slot = sim.offAlign.numbering[`${side}${number}` as 'S1' | 'S2' | 'W1' | 'W2'];
        const owned = vert.find(th => th.r.slot === slot);
        if (owned) vert = [owned];
      }
      if (vert.length === 0) {
        a.mind.setAimTarget('zone-drive', null);
        let tgt = lm;
        // Spot-drop safeties play the QB's eyes harder (and get moved by look-offs).
        if (qbEyes) tgt = lerp(lm, infoHonest(8) ? sim.see(a, qbEyes).pos : qbEyes.pos, (spot ? 0.25 + 0.2 * a.r('zoneCoverage') : 0.2) * a.r('anticipation') + (spot ? 0.1 : 0));
        // SAFETY_DEPTH: a deep safety keeps his depth over the deepest receiver he sees in his band, with his landmark
        // as a floor; the QB's eyes shade him laterally only.
        if (SAFETY_DEPTH && this.initialDepth >= 9) {
          const r = Math.max(0, ...threats.map(th => th.pos.x - sim.los));
          const x = Math.min(END_LINE_X - 1.2, Math.max(lm.x, sim.los + r + safetyOver(a, r)));
          return withFacingTechnique(pedalRequest(a, goTo(a, { x, y: tgt.y }, { facing: facingQB, speed: zs })), { label: 'deep-read' });
        }
        return withFacingTechnique(goTo(a, { x: Math.max(tgt.x, lm.x - 1), y: tgt.y }, { facing: facingQB, speed: zs }),
          { label: 'deep-read' });
      }
      vert.sort((p, q) => q.fut.x - p.fut.x);
      const deepest = vert[0];
      // Pattern read: once the threat stops climbing (breaks in/out or sits)
      // under the deep defender, he drives downhill on it.
      // Never while another receiver is climbing into the zone behind it.
      // (Only verticals near him; a seam on the far hash belongs to the middle safety.)
      const climbing = vert.some((th) => th !== deepest && th.vel.x > 3.5 && th.pos.x - sim.los > 2 && Math.abs(th.pos.y - a.pos.y) < 8);
      // (Pattern reads are match technique; a spot dropper waits for the QB's arm.)
      if ((!spot || OPP_GOAL_X - sim.los <= 10) && !climbing && deepest.vel.x < 3.0 && deepest.pos.x < lm.x + 1
        && deepest.pos.x - sim.los > Math.min(6, Math.max(1, (OPP_GOAL_X - sim.los) * 0.5))) {
        this.selectTarget(a, deepest.r);
        const drive = { x: deepest.pos.x + 1.2 + deepest.vel.x * 0.3, y: deepest.pos.y + deepest.vel.y * 0.4 };
        if (a.mind.focus * (0.4 + 0.6 * a.r('playRecognition')) > 0.35) {
          const aim = a.mind.aim('zone-drive', drive, sim.t);
          return withFacingTechnique(track(a, { x: aim.x, y: clamp(aim.y, 0.5, FIELD_WIDTH - 0.5) }, { x: deepest.vel.x, y: deepest.vel.y },
            { facing: facingQB, speed: zs * 1.05, gain: 2.2 }), { label: 'deep-drive', key: deepest.vel });
        }
      }
      // Stay 2–3 yards over the top: deep enough not to be beaten vertically,
      // close enough to drive on a break.
      const cushion = 1.6 + 0.16 * Math.max(0, deepest.vel.x) - 0.6 * a.r('anticipation');
      let ty: number;
      if (vert.length >= 2) {
        // Split them, leaning toward where the QB is looking.
        const w = qbEyes === vert[1].r ? 0.65 : qbEyes === vert[0].r ? 0.35 : 0.5;
        ty = vert[0].fut.y * (1 - w) + vert[1].fut.y * w;
      } else ty = deepest.fut.y + inside(deepest.fut.y) * (CUSHION_BREAK
        // CUSHION_BREAK: a deep-zone carry plays a shoulder off the receiver's line (bodies plus a reach).
        ? a.profile.radius + deepest.r.profile.radius + a.player.measurables.armIn / 36 * 0.7 : 0.8);
      // A landmark describes responsibility, not a minimum depth to sprint
      // to regardless of the release. Let the initial cushion compress as
      // the stem climbs; otherwise a corner retreats from a hitch into grass.
      const developing = clamp((deepest.pos.x - sim.los) / 8, 0, 1);
      const workingCushion = Math.max(cushion, this.initialDepth * (1 - developing) + cushion * developing);
      // SAFETY_DEPTH: a deep safety stays deeper than the deepest route he sees, by the NFL's cushion (landmark floor).
      const tx = Math.min(END_LINE_X - a.profile.radius, SAFETY_DEPTH && this.initialDepth >= 9
        // A route that has stopped climbing (a dig, a curl) no longer pulls him deeper: he holds his depth over it.
        ? Math.max(deepest.pos.x + workingCushion, lm.x, deepest.vel.x < 1
          ? this.holdOver(deepest.r, Math.min(a.pos.x, deepest.pos.x + safetyOver(a, deepest.pos.x - sim.los)))
          : (this.heldOver.delete(deepest.r), deepest.pos.x + safetyOver(a, deepest.pos.x - sim.los)))
        : deepest.pos.x + workingCushion);
      // Turn before the receiver consumes the cushion during the hip flip.
      // Pedaling has a physical speed cap; racing a vertical does not.
      const closing = Math.max(0, deepest.vel.x - Math.max(0, a.vel.x));
      const flipTime = Math.PI / a.profile.turnRate + 0.15 * (1 - a.r('anticipation') * a.mind.focus);
      const deepBroken = () => cushionBroken(a, a.pos.x - deepest.pos.x, deepest.vel.x, false, deepest.r.profile.radius);
      if (CUSHION_BREAK && this.turnedWith === deepest.r && deepest.vel.x < Math.max(0, a.vel.x) - 1
        && !deepBroken()) { this.turnedWith = null; a.tags.add('re-square'); }
      if (deepest.vel.x > a.profile.vmax * a.profile.backpedal && (CUSHION_BREAK
        ? deepBroken() : a.pos.x - deepest.pos.x < cushion + closing * flipTime))
        this.turnedWith = deepest.r;
      const turnRun = this.turnedWith === deepest.r && deepest.vel.x > 3;
      const tv = { x: Math.max(0, deepest.vel.x), y: deepest.vel.y * 0.9 };
      this.selectTarget(a, deepest.r);
      const overReq = track(a, { x: tx, y: clamp(ty, 0.5, FIELD_WIDTH - 0.5) }, tv, {
        facing: turnRun ? undefined : facingQB,
        speed: turnRun ? 1 : zs * 1.05,
        gain: 1.8,
      });
      const command = withFacingTechnique(SAFETY_DEPTH && this.initialDepth >= 9 && !turnRun ? pedalRequest(a, overReq) : overReq,
        { label: turnRun ? 'deep-turn-run' : 'deep-over', key: deepest.vel });
      let depth = this.depthReads.get(deepest.r);
      if (!depth) { depth = new DeepCoverage(); this.depthReads.set(deepest.r, depth); }
      // CUSHION_BREAK: square in his pedal until the cushion is broken; side-on
      // when the pedal cannot keep it.
      const selected = depth.choose(a, deepest, deepest.cue, deepest.r.profile, cushion, command, sim.t, sim.world.handContact);
      if (CUSHION_BREAK && this.turnedWith !== deepest.r && !deepBroken()) {
        const req = selected.facing === undefined ? selected : command;
        const qbSeen = sim.see(a, sim.qb).pos;
        const facing = openTo(a, qbSeen, deepest.pos, Math.atan2(req.vel.y, req.vel.x),
          carrySpeedNeed(a, a.pos.x - deepest.pos.x, deepest.vel.x, false, deepest.r.profile.radius, depth.seenAcceleration));
        const toQB = Math.atan2(qbSeen.y - a.pos.y, qbSeen.x - a.pos.x);
        if (Math.abs(angleDiff(facing, toQB)) < 1e-6 && req === command) return command;
        a.tags.add('open-carry');
        return withFacingTechnique({ ...req, facing }, { label: 'deep-open-carry', key: deepest.vel });
      }
      if (selected.facing === undefined && deepest.vel.x > 1.5) this.turnedWith = deepest.r;
      return selected.facing === undefined && command.facing !== undefined
        ? withFacingTechnique(selected, { label: 'deep-depth-run', key: deepest.vel }) : selected;
    }

    // Low red-zone Cover 2: the corner sinks under #1 with outside leverage
    // rather than abandoning him for an open-field flat landmark. An actual
    // second threat entering the flat still pulls him off; the safety caps #1.
    if (OPP_GOAL_X - sim.los <= 10 && (this.zone === 'flat_s' || this.zone === 'flat_w')) {
      const side = this.zone === 'flat_s' ? 'S' : 'W';
      const sign = side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
      const one = threats.find(th => th.r.slot === sim.offAlign.numbering[`${side}1`]);
      if (one) {
        const flat = threats.filter(th => th !== one && th.pos.x - sim.los < 5 && th.pos.x > sim.los - 1
          && sign * th.vel.y > 1 && (Math.abs(th.fut.y - one.pos.y) < 6 || sign * (th.fut.y - sim.ballY) > 12))
          .sort((p, q) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y))[0];
        const key = flat ?? one;
        this.selectTarget(a, key.r);
        const tgt = { x: Math.max(sim.los + Math.min(2.5, this.initialDepth), key.pos.x - 0.8),
          y: clamp(key.pos.y + sign * 0.45, 0.5, FIELD_WIDTH - 0.5) };
        const run = key.vel.x > 3 && a.pos.x - key.pos.x < 1.5;
        return withFacingTechnique(track(a, tgt, { x: key.vel.x * 0.85, y: key.vel.y * 0.9 }, {
          facing: run ? undefined : facingQB, speed: zs * 1.1, gain: 2 }),
          { label: run ? 'low-flat-run' : 'low-flat', key: key.vel });
      }
    }

    if (spot) return this.spotUnderneath(a, sim, threats);

    // An overloaded pattern reader can spend a beat zoning grass when two
    // routes demand an exchange. He can recover on the next read; the called
    // technique never turns into a permanent randomly selected bust.
    if (sim.t >= this.nextPatternRead) {
      this.nextPatternRead = sim.t + a.mind.decisionInterval;
      const crossing = threats.filter((th) => th.pos.x - sim.los > 2 && th.pos.x - sim.los < 13);
      if (crossing.length >= 2 && a.mind.focus * (0.5 + 0.5 * a.r('zoneCoverage')) < 0.52) {
        this.patternHesitationUntil = this.nextPatternRead;
        a.tags.add('match-hesitation');
      }
    }
    if (sim.t < this.patternHesitationUntil) return this.spotUnderneath(a, sim, threats);

    // Underneath: carry a vertical #2/#3 through the zone (seam carry / wall),
    // otherwise sit in the throwing lane of the nearest threat.
    // Curl-flat players wall #2 only to ~10 yards, then hand him off and expand
    // under #1; hook players carry seams a little deeper.
    const carryTo = this.zone.startsWith('curl_flat') ? 10 : 13;
    const carryable = threats.filter((th) => th.vel.x > 4.5 && th.pos.x - sim.los > 2 && th.pos.x - sim.los < carryTo && Math.abs(th.pos.y - lm.y) < 6);
    if (carryable.length > 0 && this.zone !== 'flat_s' && this.zone !== 'flat_w') {
      carryable.sort((p, q) => Math.abs(p.pos.y - lm.y) - Math.abs(q.pos.y - lm.y));
      const th = carryable[0];
      this.selectTarget(a, th.r);
      // Wall and carry: keep him in front and inside, gaining depth before he
      // gets there. Eyes stay on the QB until the seam threatens to run past;
      // then turn and run with him.
      const tgt = { x: Math.max(th.pos.x + 1.5, a.pos.x - 0.5), y: th.pos.y + inside(th.pos.y) * 0.9 };
      const runPast = th.vel.x > 4.5 && a.pos.x - th.pos.x < 2.5;
      const carry = track(a, tgt, { x: th.vel.x, y: th.vel.y }, { facing: runPast ? undefined : facingQB,
        speed: runPast ? 0.92 + 0.08 * a.r('zoneCoverage') : zs * 1.1, gain: 1.8 });
      // OPEN_CARRY: run with the seam as square to the QB as the run allows.
      if (OPEN_CARRY && runPast) {
        a.tags.add('open-carry');
        return withFacingTechnique({ ...carry, facing: openCarryFacing(a, sim, th.r, carry, true) }, { label: 'open-carry-seam', key: th.vel });
      }
      return withFacingTechnique(carry, { label: runPast ? 'carry-run-past' : 'carry-wall', key: th.vel });
    }
    // CURL_FLAT_BACK: with No. 2 not (or no longer) carried vertically, the
    // curl-flat defender who sees the back or No. 3 showing to the flat on his
    // side widens under his curl window toward him and breaks on the throw.
    if (CURL_FLAT_BACK && knowsPass(sim, a) && (this.zone === 'curl_flat_s' || this.zone === 'curl_flat_w')) {
      const side = this.zone === 'curl_flat_s' ? 'S' : 'W';
      const sign = side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
      const three = sim.offAlign.numbering[`${side}3` as 'S3' | 'W3'];
      const showing = threats.filter(th => (sim.offAlign.spots[th.r.slot]?.backfield || th.r.slot === three)
        && th.pos.x - sim.los < 5 && th.pos.x - sim.los > -8
        // showing to the flat (running outside), or already settled in it on his side
        && ((sign * th.vel.y > 1.5 && sign * (th.pos.y - sim.ballY) > 2) || sign * (th.pos.y - sim.ballY) > 4));
      if (showing.length) {
        showing.sort((p, q) => Math.hypot(p.pos.x - a.pos.x, p.pos.y - a.pos.y) - Math.hypot(q.pos.x - a.pos.x, q.pos.y - a.pos.y));
        const flat = showing[0];
        this.selectTarget(a, flat.r);
        a.tags.add('curl-flat-back');
        // He sinks to his curl window and widens under it toward the flat with his eyes on the QB, by what the QB
        // shows (weights estimated, stand-in debt), and breaks on the throw (sawThrow -> playBall), not on the release.
        // The cheat follows what the QB shows him (his seen picture of the QB's eyes): eyes on the flat, he widens;
        // eyes on a receiver in his curl window, he hangs in it; eyes elsewhere, he widens once the back has
        // crossed his face. Recognition sharpens it; range lets him cheat further.
        const eyes = seenQbEyes(a, sim), rec = a.r('playRecognition');
        const inCurl = eyes && eyes !== flat.r && Math.hypot(sim.see(a, eyes).pos.x - lm.x, sim.see(a, eyes).pos.y - lm.y) < 6;
        const crossed = sign * (flat.pos.y - a.pos.y) > 0;
        const base = eyes === flat.r ? 0.55 + 0.3 * rec : inCurl ? 0.1 : crossed ? 0.35 + 0.2 * rec : 0.15;
        const cheat = clamp(base + 0.15 * clamp((a.profile.vmax - 8) / 2, 0, 1), 0, 0.9);
        const tgt = { x: Math.max(sim.los + 2, Math.min(lm.x, a.pos.x)), y: clamp(lm.y + (flat.fut.y - lm.y) * cheat, 0.5, FIELD_WIDTH - 0.5) };
        return withFacingTechnique(goTo(a, settle(tgt), { facing: facingQB, speed: zs }), { label: 'curl-flat-widen', key: flat.vel });
      }
    }
    let best: (typeof threats)[number] | null = null;
    let bd = Infinity;
    for (const th of threats) {
      const depth = th.fut.x - sim.los;
      if (depth > 16) continue;
      let dd = Math.hypot(th.fut.x - lm.x, th.fut.y - lm.y);
      if (qbEyes === th.r) dd -= 3 * a.r('anticipation');
      if (dd < bd && dd < this.radius + 2) {
        bd = dd;
        best = th;
      }
    }
    // A two-receiver curl/flat conflict is not a contest for proximity to
    // the landmark. Hold off #1's curl, but widen beneath it when the known
    // #2 has actually declared outside the curl landmark. Otherwise the
    // generic lane score can leave a visible flat entirely out-leveraged.
    // Trips/Fast-3 exchanges need their installed rules, not this two-man
    // shortcut. With no acquired wide flat, ordinary carries remain intact.
    if (knowsPass(sim, a) && (this.zone === 'curl_flat_s' || this.zone === 'curl_flat_w')) {
      const side = this.zone === 'curl_flat_s' ? 'S' : 'W';
      const sign = side === 'S' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
      const one = sim.offAlign.numbering[`${side}1`];
      const two = sim.offAlign.numbering[`${side}2`];
      const flat = threats.find(th => th.r.slot === two);
      const fastBack = threats.some(th => sim.offAlign.spots[th.r.slot]?.backfield
        && th.pos.x > sim.los - 1 && sign * th.vel.y > 1.8);
      if (best && best.r.slot === one && flat && !sim.offAlign.numbering[`${side}3`] && !fastBack) {
        const depth = flat.pos.x - sim.los;
        const vOut = sign * flat.vel.y;
        const outward = sign * (flat.pos.y - sim.offAlign.spots[flat.r.slot].pos.y);
        if (depth > -1 && depth < 7.5 && sign * (flat.pos.y - lm.y) > 0
          && ((vOut > 1.8 && vOut > Math.abs(flat.vel.x) * 0.6) || outward > 3)) {
          this.selectTarget(a, flat.r);
          if (!this.flatExpansionRecorded) {
            this.flatExpansionRecorded = true;
            if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'coverage-flat-expand',
              chose: `flat:${flat.r.slot}`, options: [`lane:${best.r.slot}`, `flat:${flat.r.slot}`],
              cue: `Known ${side}2 beyond curl landmark in consumed shallow outward picture; pass belief`,
              detail: `${flat.r.slot} depth ${depth.toFixed(2)} yd, outward ${outward.toFixed(2)} yd, velocity (${flat.vel.x.toFixed(2)},${flat.vel.y.toFixed(2)}) yd/s. Widen beneath #1, not a new man assignment or a confirmed throw target.` });
          }
          const across = Math.abs(flat.vel.y) > 3 && Math.abs(flat.vel.y) > Math.abs(flat.vel.x);
          const tgt = { x: Math.min(lm.x, Math.max(a.pos.x, flat.pos.x + 1)),
            y: clamp(flat.fut.y + sign * 0.6, 0.5, FIELD_WIDTH - 0.5) };
          return withFacingTechnique(track(a, tgt, { x: Math.max(0, flat.vel.x) * 0.5, y: flat.vel.y * 0.9 }, {
            facing: across ? Math.atan2(flat.vel.y, flat.vel.x) : facingQB,
            speed: across ? 1 : zs * 1.05, gain: 1.8 }), { label: across ? 'flat-across' : 'flat-expand', key: flat.vel });
        }
      }
    }
    this.selectTarget(a, best?.r ?? null);
    if (!best) {
      let tgt = lm;
      if (qbEyes) tgt = lerp(lm, infoHonest(8) ? sim.see(a, qbEyes).pos : qbEyes.pos, 0.25 * a.r('anticipation'));
      return withFacingTechnique(goTo(a, settle(tgt), { facing: facingQB, speed: zs }), { label: this.settledAt >= 0 ? 'zone-settle' : 'zone-landmark' });
    }
    const lane = lerp(qbAt, best.pos, 0.82);
    let tgt = { x: Math.min(lane.x, best.pos.x - 0.5), y: lane.y };
    const off = sub(tgt, lm);
    const l = Math.hypot(off.x, off.y);
    if (l > this.radius) tgt = { x: lm.x + (off.x / l) * this.radius, y: lm.y + (off.y / l) * this.radius };
    // A match defender can run with a crosser while looking back toward the
    // QB. Treating gaze as hip orientation forced him to shuffle at ~60% of
    // top speed forever, even after accepting the route into his zone.
    const carryingAcross = Math.abs(best.vel.y) > 3 && Math.abs(best.vel.y) > Math.abs(best.vel.x);
    // An advancing stem underneath the hook has not declared a short route.
    // Squeeze its lane without driving down through it before carry admission.
    // Holding depth means no depth feedforward: following half the receiver's
    // speed here would keep retreating from a hitch. A plant already read by
    // RouteObservation, a stop or a crossing release restores the lane drive.
    const stemRead = this.zone.startsWith('hook') && best.pos.x < a.pos.x
      && best.vel.x > 0.5 && best.vel.x > Math.abs(best.vel.y)
      && Math.hypot(best.vel.x, best.vel.y) + 1e-6 >= Math.hypot(best.cue.vel.x, best.cue.vel.y);
    // A read step must not retain depth already outside his installed drop.
    if (stemRead) tgt = { ...tgt, x: Math.min(a.pos.x, lm.x) };
    // A receiver still behind the line in front of him (a back, a swing, a
    // screen) is no lane to drive down to before the ball is out: he holds
    // his depth and leverage, squeezes it from there and breaks on the throw,
    // unless the call tags him to trap it.
    const holdFlat = best.pos.x < sim.los && (sim.defCall.flatThreat ?? 'hold') === 'hold';
    if (holdFlat) tgt = { ...tgt, x: Math.max(tgt.x, Math.min(a.pos.x, lm.x)) };
    const settledLane = this.settledAt >= 0 && !carryingAcross;
    if (settledLane) tgt = settle(tgt);
    const laneReq = track(a, { x: tgt.x, y: clamp(tgt.y, 0.5, FIELD_WIDTH - 0.5) }, { x: stemRead || holdFlat ? 0 : settledLane ? Math.min(0, best.vel.x * 0.5) : best.vel.x * 0.5, y: best.vel.y * 0.8 }, {
      facing: carryingAcross ? Math.atan2(best.vel.y, best.vel.x) : facingQB, speed: carryingAcross ? 1 : zs * 1.05, gain: 1.6 });
    // OPEN_CARRY: carry the crosser as square to the QB as the run allows.
    if (OPEN_CARRY && carryingAcross) {
      a.tags.add('open-carry');
      return withFacingTechnique({ ...laneReq, facing: openCarryFacing(a, sim, best.r, laneReq, false) }, { label: 'open-carry-cross', key: best.vel });
    }
    return withFacingTechnique(laneReq,
      { label: carryingAcross ? 'lane-carry' : stemRead ? 'hook-stem-read' : holdFlat ? 'lane-hold' : 'lane', key: best.vel });
  }

  /**
   * Spot-drop underneath defender: sprint to the spot (turned to run, so quick
   * throws beat him before he gets there), then settle with eyes on the QB.
   * He leans where the QB looks and squeezes the lane of a receiver in his
   * zone, but keeps his depth and never leaves his zone with a route.
   */
  private spotUnderneath(a: Agent, sim: PlaySim, threats: Array<{ r: Agent; pos: Vec2; vel: Vec2; fut: Vec2 }>): MoveCommand {
    const qb = sim.qb;
    const lm = this.landmark;
    const qbAt = infoHonest(9) ? sim.see(a, qb).pos : qb.pos;
    const facingQB = angleTo(a.pos, qbAt);
    watch(sim, a, qb);
    const toSpot = Math.hypot(lm.x - a.pos.x, lm.y - a.pos.y);
    if (toSpot > 2.5 && !a.tags.has('settled') && this.settledAt < 0) {
      // Until he has read pass he is in his read step: eyes and chest stay
      // on the backfield. Turning to run before the read turned his back on
      // a run, and on a quick throw he could not yet have keyed.
      // He gathers and re-squares before the spot, not on it: the rounded
      // hip turn back to the QB takes time he must start early.
      const resquare = Math.hypot(a.vel.x, a.vel.y) * roundedTurnTime(a, Math.PI) * 0.5;
      const turned = toSpot > 4 + resquare && knowsPass(sim, a);
      return withFacingTechnique(goTo(a, lm, { speed: (0.88 + 0.1 * a.r('zoneCoverage')) * unsureFactor(a), facing: turned ? undefined : facingQB }),
        { label: turned ? 'spot-drop-run' : 'spot-drop' });
    }
    a.tags.add('settled');
    const read = 0.5 * a.r('zoneCoverage') + 0.5 * a.r('anticipation');
    let tgt: Vec2 = lm;
    const eyes = seenQbEyes(a, sim);
    const inZone = threats.filter((th) => Math.hypot(th.pos.x - lm.x, th.pos.y - lm.y) < this.radius && th.pos.x - sim.los > 1);
    const looked = eyes ? inZone.find((th) => th.r === eyes) : undefined;
    if (looked) {
      // The QB is looking at a receiver in my zone: get in the throwing lane.
      const lane = lerp(qbAt, looked.pos, 0.82);
      tgt = lerp(lm, lane, 0.45 + 0.4 * read);
    } else if (eyes) {
      // Looking elsewhere: drift that way ("rally to the eyes"), and squeeze
      // whoever is in my zone on the way.
      const seen = sim.see(a, eyes);
      tgt = lerp(lm, seen.pos, 0.15 + 0.25 * read);
      if (inZone.length) {
        const near = inZone.reduce((p, q) => (Math.hypot(p.pos.x - lm.x, p.pos.y - lm.y) < Math.hypot(q.pos.x - lm.x, q.pos.y - lm.y) ? p : q));
        tgt = lerp(tgt, lerp(qbAt, near.pos, 0.82), 0.3);
      }
    }
    // Hold the spot's depth until the ball is thrown; stay within the zone.
    // Planted short of the spot on the QB's set, he holds where he planted.
    tgt = { x: Math.max(tgt.x, lm.x - 2), y: tgt.y };
    if (this.settledAt >= 0) tgt = { x: Math.min(tgt.x, Math.max(a.pos.x, sim.los + 3)), y: tgt.y };
    const off = sub(tgt, lm);
    const l = Math.hypot(off.x, off.y);
    if (l > this.radius) tgt = { x: lm.x + (off.x / l) * this.radius, y: lm.y + (off.y / l) * this.radius };
    return withFacingTechnique(goTo(a, { x: tgt.x, y: clamp(tgt.y, 0.5, FIELD_WIDTH - 0.5) }, { facing: facingQB, speed: 0.7 + 0.15 * a.r('zoneCoverage') }),
      { label: 'spot-settle' });
  }
}

/** A linebacker installed in the box: 2.5-8 yd off the ball and within 6 yd
 * of it laterally, from his own alignment spot (no live picture needed). */
function boxBacker(a: Agent, sim: PlaySim): boolean {
  const spot = sim.defAlign.spots[a.slot as keyof typeof sim.defAlign.spots]?.pos;
  if (!a.slot.startsWith('LB') || !spot) return false;
  const depth = Math.abs(spot.x - sim.los);
  return depth >= 2.5 && depth <= 8 && Math.abs(spot.y - sim.ballY) < 6;
}

/** The pass belief a box backer needs before he drops, by the call's dropStart:
 * `early` is the belief at which he reads pass at all. */
const DROP_START = { early: 0, confirmed: 0.95, late: 0.98 } as const;

/** Speed factor for a defender who hasn't read run or pass yet. */
export function unsureFactor(a: Agent): number {
  const r = a.recog;
  if (!r || r.read !== 'unsure') return 1;
  return 0.3 + 0.7 * r.pPass();
}

/** Lateral responsibility band for a zone (field y). */
function zoneBand(zone: ZoneId, sim: PlaySim): [number, number] {
  const W = FIELD_WIDTH;
  const s = sim.offAlign.strongSign;
  const by = sim.ballY;
  const third = W / 3;
  const side = (sign: number, lo: number, hi: number): [number, number] => (sign > 0 ? [lo, hi] : [W - hi, W - lo]);
  switch (zone) {
    // Deep thirds watch #2 up the hash too (he can break to the corner).
    case 'deep_third_s':
      return side(s, 2 * third - 6, W);
    case 'deep_third_w':
      return side(-s, 2 * third - 6, W);
    case 'deep_mid':
      return [third - 3, 2 * third + 3];
    case 'tampa_mid':
      return [W / 2 - 7, W / 2 + 7];
    case 'deep_half_s':
      return side(s, W / 2 - 3, W);
    case 'deep_half_w':
      return side(-s, W / 2 - 3, W);
    case 'quarter_s_out':
      return side(s, (3 * W) / 4 - 2, W);
    case 'quarter_w_out':
      return side(-s, (3 * W) / 4 - 2, W);
    case 'quarter_s_in':
      return side(s, W / 2 - 2, (3 * W) / 4 + 2);
    case 'quarter_w_in':
      return side(-s, W / 2 - 2, (3 * W) / 4 + 2);
    case 'flat_s':
    case 'curl_flat_s': {
      const lo = by + s * 3;
      return s > 0 ? [lo, W] : [0, lo];
    }
    case 'flat_w':
    case 'curl_flat_w': {
      const lo = by - s * 3;
      return s > 0 ? [0, lo] : [lo, W];
    }
    case 'hook_s':
      return s > 0 ? [by - 1, by + 10] : [by - 10, by + 1];
    case 'hook_w':
      return s > 0 ? [by - 10, by + 1] : [by - 1, by + 10];
    case 'hook_mid':
      return [by - 6, by + 6];
    case 'robber':
      return [by - 8, by + 8];
    case 'hole':
      return [by - 9, by + 9];
    case 'curl_s': {
      const lo = by + s * 1;
      return s > 0 ? [lo, W - 4] : [4, lo];
    }
    case 'curl_w': {
      const lo = by - s * 1;
      return s > 0 ? [4, lo] : [lo, W - 4];
    }
  }
}

/** Ball in the air: break on it after reacting; intercept the path or contest the catch. */
/** SHOULDER_READ (experimental, off; SHOULDER_READ=1 turns it on): the
 * underneath plant. An underneath zone defender who keys the quarterback as
 * keysQB does (facing him, eyes held on him through his observation delay)
 * stops his drop once he has seen the throwing motion: he brakes it at his own
 * rates, break-ready ("feet stop when the ball comes off
 * his front hand"). The motion tells him when, not where, so he gets no
 * direction; at the release keysQB hands him to playBall from the plant rather
 * than from a backpedal. Without it the cue matures about 0.2 s before the
 * release but cannot act until the ball is out (sawThrow), and he is still
 * dropping away from the catch (docs/reviews/2026-11-12-underneath-plant.md).
 * Only the drop stops: his lateral and downhill zone play go on (a full stop
 * also cancelled his movement toward threats; attempt 1, reverted).
 * Its costs are physical: a quick release gives him little time planted, a
 * long one a lot; a pump is a windup, so he plants on it and restarts his drop
 * only once he sees the ball pulled down (after his observation delay); a
 * planted defender gives up depth to a route behind him. Replaces the earlier
 * eyes-directed lean (as often wrong as right on catches 0-10 yd). */
const SHOULDER_READ = process.env.SHOULDER_READ !== '0';
/** QB_BODY_SEEN (experimental, off; QB_BODY_SEEN=1): the passer's throwing motion and head are read from what a
 * defender sees of his body (`Agent.arm`, `Agent.head`, recorded with every perception sample), with that defender's
 * own delay and view, instead of from the published `sim.windupAt` / `sim.windupEndAt` (the time the motion started,
 * known to every defender) and `sim.qbEyes`. SHOULDER_READ's plant and restart, sawThrow's arm key and SEEN_EYES's
 * look read the picture. Off: the published fields, as before. */
const QB_BODY_SEEN = process.env.QB_BODY_SEEN !== '0';
/** QB_BODY_SEEN: whether this picture of the passer shows a throwing motion (loading or delivering). */
const throwingShown = (q: { arm?: 'set' | 'load' | 'deliver' }) => q.arm === 'load' || q.arm === 'deliver';
/** SHOULDER_READ: the throwing motion each defender planted on (by its windupAt), per play. */
const plants = new WeakMap<Agent, { sim: PlaySim; windup: number }>();
/** SHOULDER_READ: whether he is planted on a throwing motion he has seen. */
function underneathPlant(a: Agent, sim: PlaySim): boolean {
  if (hasObservedFlight(a) || observedHolder(a, sim)?.target !== sim.qb) return false;
  const react = a.mind.observationDelay(a.profile.reactionTime * (1 - 0.4 * a.r('anticipation')));
  let p = plants.get(a);
  if (p && p.sim !== sim) { plants.delete(a); p = undefined; }
  if (QB_BODY_SEEN) {
    // His picture of the passer, on the same anticipation-shortened delay: planted while it shows a throwing motion
    // (a new one after a restart), restarting once it shows him set again.
    const q = sim.see(a, sim.qb, 1 - 0.4 * a.r('anticipation'));
    if (p && !throwingShown(q)) { plants.delete(a); p = undefined; a.tags.add('plant-restart'); }
    if (!p && throwingShown(q) && Math.cos(a.body.facing - Math.atan2(q.pos.y - a.pos.y, q.pos.x - a.pos.x)) > -0.2
      && eyesHeldOnQB(a, sim, react, -0.2)) {
      p = { sim, windup: sim.t }; plants.set(a, p); a.tags.add('plant');
    }
    return !!p;
  }
  // The motion he planted on was pulled down: once he has seen that, he restarts his drop.
  if (p && sim.windupAt !== p.windup && sim.windupEndAt >= p.windup && sim.t - sim.windupEndAt >= react) {
    plants.delete(a); p = undefined; a.tags.add('plant-restart');
  }
  if (sim.windupAt >= 0 && p?.windup !== sim.windupAt && sim.t - sim.windupAt >= react) {
    const qb = sim.see(a, sim.qb).pos;
    if (Math.cos(a.body.facing - Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x)) > -0.2 && eyesHeldOnQB(a, sim, react, -0.2)) {
      p = { sim, windup: sim.windupAt }; plants.set(a, p); a.tags.add('plant');
    }
  }
  return !!p;
}
/** SHOULDER_READ: his zone command without its drop: no velocity away from the line (he brakes it at his own
 * rates); his lateral and downhill play and his facing are unchanged. */
function stopDrop(sim: PlaySim, cmd: MoveCommand): MoveCommand {
  const deeper = sim.attackDir(sim.offense[0].team), away = cmd.vel.x * deeper;
  return away > 0 ? { ...cmd, vel: { x: 0, y: cmd.vel.y } } : cmd;
}

/** Has this defender seen the throw yet? (Eyes on the QB see it sooner.) */
export function sawThrow(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  // RELEASE_BELIEF: his own belief that the ball is gone (release-belief.ts), not the true air state.
  if (RELEASE_BELIEF) return believesThrow(a, sim, man);
  const ball = sim.ball;
  if (ball.kind !== 'air') return false;
  const qb = sim.see(a, sim.qb).pos;
  const qbAngle = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x);
  // Zone eyes can look over the shoulder while the hips carry a crossing
  // route. A defender sprinting directly away still cannot see the release.
  const zoneEyes = a.behavior instanceof ZoneCoverage || (a.behavior as { zoneEyes?: boolean }).zoneEyes === true;
  const facingQB = Math.cos(a.body.facing - qbAngle) > (zoneEyes ? -0.2 : 0.1);
  const react = a.mind.observationDelay(a.profile.reactionTime * (1 - 0.4 * a.r('anticipation'))) + (man ? 0.05 : 0);
  // A zone defender with his eyes on the quarterback keys him, spot or
  // match: the shoulders turning and the arm coming through give the throw
  // away before the ball is out, so his reaction starts at the throwing
  // motion, or when his eyes reached the QB if that was later. Motion he did
  // not see gives him nothing. He still learns where it goes only from the
  // visible flight.
  const keysQB = facingQB && zoneEyes
    && (QB_BODY_SEEN ? throwingShown(sim.see(a, sim.qb, (1 - 0.4 * a.r('anticipation')) + (man ? 0.05 / a.profile.reactionTime : 0)))
      : sim.windupAt >= 0 && sim.t - sim.windupAt >= react)
    && eyesHeldOnQB(a, sim, react, -0.2);
  if (keysQB) {
    a.tags.add('readArm');
    return true;
  }
  // Otherwise he reacts from the first moment the ball was in his view (the
  // release itself if he was watching), or, trailing his man, from the
  // receiver turning his head and hands back for it. Not from the release
  // time he never saw.
  const seen = sim.throwSight.seenAt(a);
  const cue = man ? readsHandsAt(a, sim, man, seen) : seen;
  return cue !== undefined && sim.t - cue >= react;
}

/** RELEASE_BELIEF's sawThrow: a zone defender with his eyes on the passer keys the throwing motion he saw (loading or
 * released in his belief: a pump he saw can make him bite, a pull-down he saw undoes it); otherwise he reacts from the
 * first moment the ball itself was in his view (or, trailing his man, the receiver's hands), once his belief has the
 * ball out. */
function believesThrow(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  const rb = releaseBelief(sim, a);
  const qb = sim.see(a, sim.qb).pos;
  const qbAngle = Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x);
  const zoneEyes = a.behavior instanceof ZoneCoverage || (a.behavior as { zoneEyes?: boolean }).zoneEyes === true;
  const facingQB = Math.cos(a.body.facing - qbAngle) > (zoneEyes ? -0.2 : 0.1);
  const react = a.mind.observationDelay(a.profile.reactionTime * (1 - 0.4 * a.r('anticipation'))) + (man ? 0.05 : 0);
  if (facingQB && zoneEyes && (rb.loadingAt !== undefined || rb.releasedAt !== undefined) && eyesHeldOnQB(a, sim, react, -0.2)) {
    a.tags.add('readArm');
    return true;
  }
  // A man defender who saw neither the arm nor the ball (his back to the passer, trailing his man) still reads his
  // man looking back for it, as before.
  if (rb.releasedAt === undefined) {
    if (!man) return false;
    const hands = readsHandsAt(a, sim, man, undefined);
    return hands !== undefined && sim.t - hands >= react;
  }
  const cue = man ? readsHandsAt(a, sim, man, rb.ballAt) : rb.ballAt;
  return cue !== undefined && sim.t - cue >= react;
}

/** A man defender in phase with his receiver sees him look back for the
 * ball: the receiver's acquired body facing turned well off his own running
 * line. The first such picture is remembered for this flight. */
function readsHandsAt(a: Agent, sim: PlaySim, man: Agent, seen: number | undefined): number | undefined {
  const cue = sim.see(a, man);
  const speed = Math.hypot(cue.vel.x, cue.vel.y);
  const lookingBack = cue.facing !== undefined && speed >= 2
    && Math.hypot(cue.pos.x - a.pos.x, cue.pos.y - a.pos.y) <= 3
    && Math.cos(cue.facing - Math.atan2(cue.vel.y, cue.vel.x)) <= -0.2;
  let hands = lookingBack ? sim.throwSight.sawHands(a, sim.t) : sim.throwSight.handsAt(a);
  // HANDS_CUE: his man's hands coming up for the ball, seen from within 3 yd, from when they became visible.
  const inView = !infoHonest('H') || Math.cos(a.body.facing - Math.atan2(cue.pos.y - a.pos.y, cue.pos.x - a.pos.x)) > Math.cos(100 * Math.PI / 180);
  if (HANDS_CUE && inView && Math.hypot(cue.pos.x - a.pos.x, cue.pos.y - a.pos.y) <= 3) {
    const up = handsUpAt(man);
    if (up !== undefined && up <= sim.t) hands = hands === undefined ? up : Math.min(hands, up);
  }
  return hands === undefined ? seen : seen === undefined ? hands : Math.min(seen, hands);
}

/** His own recorded body kept the quarterback in view (cosine of the angle
 * off his facing above `cosMin`) through the last `span` seconds. */
function eyesHeldOnQB(a: Agent, sim: PlaySim, span: number, cosMin: number): boolean {
  for (let back = 1; back * sim.dt <= span + 1e-9; back++) {
    const me = sim.perception.recorded(a.idx, back * sim.dt), qb = sim.perception.recorded(sim.qb.idx, back * sim.dt);
    if (!me || !qb || Math.cos(me.facing - Math.atan2(qb.pos.y - me.pos.y, qb.pos.x - me.pos.x)) <= cosMin) return false;
  }
  return true;
}

export function playBall(a: Agent, sim: PlaySim, man: Agent | null,
  continueCoverage?: () => MoveCommand): MoveCommand {
  if (RELEASE_BELIEF) return playBelievedBall(a, sim, man, continueCoverage);
  const ball = sim.ball;
  if (ball.kind !== 'air') return stand();
  if (!sawThrow(a, sim, man)) {
    // Use the same acquired route picture, leverage and technique until the
    // defender recognizes the throw. Ball flight alone is hidden information.
    if (continueCoverage) return continueCoverage();
    // Haven't seen it yet: stay with the man / keep doing what we were doing.
    if (man) {
      const s = sim.see(a, man);
      const inside = Math.sign(sim.ballY - s.pos.y) || 1;
      return track(a, { x: s.pos.x, y: s.pos.y + inside * 0.7 }, s.vel, { cutSkill: 0.85 + 0.35 * a.r('manCoverage') });
    }
    return { vel: a.vel };
  }
  const path = acquireFlight(a, sim);
  // BALL_EST: until he has an estimate of where it is going he keeps playing what he was playing.
  if (estimatesFor(a) && !path.length) {
    if (continueCoverage) return continueCoverage();
    if (man) {
      const s = sim.see(a, man), inside = Math.sign(sim.ballY - s.pos.y) || 1;
      return track(a, { x: s.pos.x, y: s.pos.y + inside * 0.7 }, s.vel, { cutSkill: 0.85 + 0.35 * a.r('manCoverage') });
    }
    return { vel: a.vel };
  }
  a.tags.add('onBall');
  return playObservedFlight(a, sim, path, true);
}

/** RELEASE_BELIEF: whether he plays the throw now: his belief (sawThrow) instead of the true air state, while the
 * flight he saw has not landed by his own estimate (then the holder and carry channels take over). Off: the true air
 * state and sawThrow, as before. */
export function playsThrow(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  if (!RELEASE_BELIEF) return sim.ball.kind === 'air' && sawThrow(a, sim, man);
  // His flight is over when it has landed by his own estimate and he no longer sees the ball in the air (the same
  // test pursueIfLive's catch carry uses, so one of the two always has him).
  return sawThrow(a, sim, man) && !(hasObservedFlight(a) && flightLanded(a, sim.t) && !ballSeenInAir(a, sim));
}
/** RELEASE_BELIEF: as playsThrow, for a caller that steers on the flight itself: he must have seen the ball. */
function playsFlight(a: Agent, sim: PlaySim, man: Agent | null): boolean {
  return playsThrow(a, sim, man) && (!RELEASE_BELIEF || releaseBelief(sim, a).ballAt !== undefined);
}
/** Bit 256: his look decision for this flight (one judgment of his phase, one draw of his discipline), kept for film
 * and the witness: behind / side as he judged them, in phase or not, and whether he looks. */
const manLookChoice = new WeakMap<Agent, { key: number | undefined; behind: number; side: number; inPhase: boolean; looks: boolean; at: number }>();
export function manLookOf(a: Agent): { behind: number; side: number; inPhase: boolean; looks: boolean; at: number } | undefined {
  return manLookChoice.get(a);
}
function manLooks(a: Agent, sim: PlaySim, man: Agent, key: number | undefined): boolean {
  // One choice per belief (his release belief's time, as the shoulder pick keys), not per true flight.
  const prev = manLookChoice.get(a);
  if (prev && prev.key === key) return prev.looks;
  // His picture of the man: how far behind him along the man's running line, and how far off it. With no heading in
  // his picture (the man standing, no facing seen) he cannot judge "behind" this tick and does not decide yet.
  const s = sim.see(a, man), sp = Math.hypot(s.vel.x, s.vel.y);
  if (sp <= 1 && s.facing === undefined) return false;
  const h = sp > 1 ? Math.atan2(s.vel.y, s.vel.x) : s.facing!;
  const dx = a.pos.x - s.pos.x, dy = a.pos.y - s.pos.y, ux = Math.cos(h), uy = Math.sin(h);
  const dice = sim.dice('man-look', a);
  const behind = -(dx * ux + dy * uy) + dice.normal(0, phaseJudgeSd(a)), side = Math.abs(-dx * uy + dy * ux);
  const inPhase = behind <= PHASE_BEHIND && side <= PHASE_SIDE;
  const looks = inPhase || dice.chance(lookAnyway(a));
  manLookChoice.set(a, { key, behind, side, inPhase, looks, at: sim.t });
  if (looks) a.tags.add(inPhase ? 'man-look' : 'man-look-trailing');
  return looks;
}
/** Bit 256: the look. He attends to the ball (his head turns where he believes it comes from: the passer as he saw
 * him, until he has an estimate) and his body gives the look the joints it needs: neck, the shoulders through the trunk,
 * the hips for what is left, priced by the facing cap. His picture of the man runs on the same eyes meanwhile. */
function manLook(a: Agent, sim: PlaySim, cmd: MoveCommand): MoveCommand {
  sim.ballEstimates.estimate(a, sim);
  const qb = sim.see(a, sim.qb).pos, sp = Math.hypot(cmd.vel.x, cmd.vel.y);
  const heading = sp > 0.4 ? Math.atan2(cmd.vel.y, cmd.vel.x) : (cmd.facing ?? a.facing);
  return lookJoints(a, cmd, heading, angleDiff(heading, Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x)), true);
}

/** RELEASE_BELIEF's playBall: with the ball seen, the flight he acquired; on a belief from the arm alone (the motion
 * tells him when, not where) he bites: a zone defender plants (stops his drop, the rest of his zone play goes on), a
 * man defender stays on his man, until he sees the ball or the pull-down. */
function playBelievedBall(a: Agent, sim: PlaySim, man: Agent | null, continueCoverage?: () => MoveCommand): MoveCommand {
  const fallback = (): MoveCommand => {
    if (continueCoverage) return continueCoverage();
    if (man) {
      const s = sim.see(a, man);
      const inside = Math.sign(sim.ballY - s.pos.y) || 1;
      return track(a, { x: s.pos.x, y: s.pos.y + inside * 0.7 }, s.vel, { cutSkill: 0.85 + 0.35 * a.r('manCoverage') });
    }
    return { vel: a.vel };
  };
  if (!sawThrow(a, sim, man)) return fallback();
  const rb = releaseBelief(sim, a);
  // BALL_EST (with bit 128): a ball seen once is not yet a flight he can play: with fewer than two samples his own
  // estimate is empty, and he plays as on the arm alone until it is not (not an empty path to playObservedFlight).
  const noFlight = rb.ballAt !== undefined && estimatesFor(a) && !hasObservedFlight(a) && !sim.ballEstimates.estimate(a, sim).length;
  if (rb.ballAt === undefined || noFlight) {
    // Bit 256: a man defender who has not found the ball judges his phase and, in phase (or undisciplined), looks.
    if (man && BALL_EST_MAN_LOOK && estimatesFor(a) && !hasObservedFlight(a) && manLooks(a, sim, man, rb.releasedAt)) return manLook(a, sim, fallback());
    a.tags.add('arm-bite');
    if (!continueCoverage) return fallback();
    // A zone defender breaks on the passer's shoulders at the delivery (the arm coming through; on the load alone he
    // plants): toward the receiver they point at, read through the tracking channel of the passer he is watching,
    // chosen once for this belief, with his reaction time after the choice. With none lined up, he plants (stops his
    // drop) until he sees the ball or the pull-down.
    if (rb.releasedAt === undefined) return stopDrop(sim, continueCoverage());
    const pick = shoulderTarget(a, sim, rb.releasedAt);
    const react = a.profile.reactionTime * (1 - 0.4 * a.r('anticipation'));
    if (pick.R && sim.t - pick.at >= react - 1e-9) { a.tags.add('shoulder-break'); return runThrough(a, sim.see(a, pick.R).pos, { speed: 0.9 }); }
    return stopDrop(sim, continueCoverage());
  }
  a.tags.add('onBall');
  const path = hasObservedFlight(a) ? rememberedFlight(a, sim.t) : null;
  return playObservedFlight(a, sim, path ?? (sim.ball.kind === 'air' ? acquireFlight(a, sim) : []), !path);
}

/** RELEASE_BELIEF: the receiver the passer's shoulders point at in this defender's picture when his belief came from
 * the arm (smallest bearing off the passer's seen facing, within SHOULDER_CONE), chosen once per belief. */
const SHOULDER_CONE = 25 * Math.PI / 180;
/** His read of the passer's shoulders: a bearing error drawn once per belief, its spread by anticipation (deg). The
 * rating acts on the read, not on the break's result; a misread sends him to the wrong man, which the passer's eyes and
 * shoulders can exploit. */
const SHOULDER_READ_SD_MIN = 5, SHOULDER_READ_SD_SPAN = 15;
const shoulderPick = new WeakMap<Agent, { key: number; R: Agent | null; at: number; read: number | null; err: number; seenBearing: number | null }>();
/** Diagnostic: his last shoulder read (the receiver picked, null if none lined up; when; the bearing he read). */
export function shoulderPickOf(a: Agent): { R: Agent | null; at: number; read: number | null; err: number; seenBearing: number | null } | undefined { return shoulderPick.get(a); }
function shoulderTarget(a: Agent, sim: PlaySim, key: number): { R: Agent | null; at: number; read: number | null; err: number; seenBearing: number | null } {
  const prev = shoulderPick.get(a);
  if (prev && prev.key === key) return prev;
  // The passer he is watching, through the tracking channel (his gaze is on him: the arm key requires it).
  const q = sim.track(a, sim.qb, 1, true);
  const err = sim.dice('shoulder', a).normal(0, (SHOULDER_READ_SD_MIN + SHOULDER_READ_SD_SPAN * (1 - a.r('anticipation'))) * Math.PI / 180);
  const read = q.facing === undefined ? null : q.facing + err;
  let best: Agent | null = null, bestOff = SHOULDER_CONE, seenBearing: number | null = null;
  if (read !== null) for (const r of sim.offense) {
    if (r === sim.qb || isOL(r)) continue;
    const p = sim.see(a, r).pos, b = Math.atan2(p.y - q.pos.y, p.x - q.pos.x), off = Math.abs(angleDiff(b, read));
    if (off < bestOff) { bestOff = off; best = r; seenBearing = b; }
  }
  // err and seenBearing are kept for the diagnostic probe only (the read's draw, and the pick's bearing in his picture)
  const out = { key, R: best, at: sim.t, read, err, seenBearing };
  shoulderPick.set(a, out);
  return out;
}

/** Same catch approach, seeded only by this defender's acquired trajectory.
 * A newer body-possession picture takes priority in pursueIfLive. */
function playObservedFlight(a: Agent, sim: PlaySim, path: PlaySim['ballPath'], acquired = false): MoveCommand {
  const c = flightApproach(a, sim, path, acquired);
  if (!PURSUIT_COMMIT) return c ?? stand();
  // PURSUIT_COMMIT: on the flight's last tick no sample of it is left ahead of
  // him; that is not a reason to stop. Hold the approach he last chose.
  if (c) { lastFlightApproach.set(a, { cmd: c, t: sim.t }); return c; }
  const last = lastFlightApproach.get(a);
  return last && sim.t - last.t <= 0.3 ? { ...last.cmd } : stand();
}

const lastFlightApproach = new WeakMap<Agent, { cmd: MoveCommand; t: number }>();

function flightApproach(a: Agent, sim: PlaySim, path: PlaySim['ballPath'], acquired = false): MoveCommand | null {
  const spot = catchSpot(a, { t: sim.t, ballPath: path });
  const window = observedCatchWindow(a, sim, path);
  if (acquired) rememberCatchOpportunity(a, window);
  // Near the ball's path, a defender with ball skills turns his head and finds
  // it (looking over the shoulder doesn't turn the body).
  const nearPath = spot && Math.hypot(spot.p.x - a.pos.x, spot.p.y - a.pos.y) < 5;
  if (LOOK_ONCE) { if (nearPath && !a.tags.has('looking') && findsBall(a, sim)) a.tags.add('looking'); }
  else if (nearPath && !a.tags.has('looking') && sim.dice('look', a).chance(0.15 + 0.5 * a.r('ballSkills'))) a.tags.add('looking');
  // DRIVE_CATCH: the ball is in a receiver's hands but not yet his: drive
  // through his hands and body to play the catch, at full effort.
  // HONEST_FLIGHT: the receiver his own flight estimate brings the ball to, from
  // just before its arrival to the end of a catch's securing beat, and the
  // facing he sees, not the private securing state or true body.
  const opportunity = HONEST_FLIGHT ? catchOpportunity(a) : null;
  const securing = HONEST_FLIGHT
    ? (opportunity && sim.t >= opportunity.t - DRIVE_LEAD && sim.t <= opportunity.t + DRIVE_SECURE ? opportunity.receiver : null)
    : (sim.ball.kind === 'air' && sim.ball.securing ? sim.ball.securing.receiver : null);
  // HONEST_FLIGHT: a receiver he sees without the ball after the arrival is not securing it.
  const droppedSeen = (R: Agent) => { const q = sim.see(a, R); return !!opportunity && q.carrying === false && q.age !== undefined && sim.t - q.age > opportunity.t; };
  if (DRIVE_CATCH && securing && !(HONEST_FLIGHT && droppedSeen(securing))) {
    const R = securing, seen = sim.see(a, R);
    if (Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y) <= 4) {
      const f = HONEST_FLIGHT ? seen.facing ?? Math.atan2(a.pos.y - seen.pos.y, a.pos.x - seen.pos.x) : R.body.facing, hands = { x: seen.pos.x + Math.cos(f) * 0.35, y: seen.pos.y + Math.sin(f) * 0.35 };
      a.tags.add('drive-catch');
      if (CATCH_CARRY && !(HONEST_FLIGHT && catchDrive.get(a)?.receiver === R)) catchDrive.set(a, { receiver: R, t: sim.t });
      // OPEN_FIELD: through the hands only while he can get there within the securing beat his own estimate of the
      // arrival (his catch window) leaves; otherwise he takes the receiver as a runner in space.
      if (OPEN_FIELD) {
        const opp = window && window.receiver === R ? window : opportunity ?? catchOpportunity(a);
        const remaining = opp && opp.receiver === R ? opp.t + DRIVE_SECURE - sim.t : DRIVE_SECURE;
        const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, hands, a.profile.reach);
        if (!playsBall(a, R, tt, remaining)) { a.tags.add('open-field'); return chase(sim, a, R, 3, { onTop: true }); }
      }
      return runThrough(a, hands, { speed: 1 });
    }
  }
  // A defender already carrying the visible catcher must not brake out of
  // phase toward a stationary point on the flight. Keep his feet with the
  // receiver unless he can play the ball before that receiver's window.
  const earlierBall = spot && window && spot.t < window.t
    && timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, spot.p, a.profile.reach)
      <= spot.t - sim.t + .05;
  if (window && !earlierBall && Math.hypot(window.seen.vel.x, window.seen.vel.y) > .5
    && Math.hypot(window.seen.pos.x - a.pos.x, window.seen.pos.y - a.pos.y)
      <= a.profile.radius + window.receiver.profile.radius + a.profile.reach) {
    if (sim.trace.data) sim.trace.decide({ t: sim.t, a: a.idx, kind: 'catch-approach',
      chose: 'carry observed receiver', cue: 'nearby running catcher and visible ball window',
      detail: `${window.receiver.slot} at ${window.t.toFixed(2)} s; no earlier reachable ball opportunity.` });
    return track(a, window.seen.pos, window.seen.vel);
  }
  if (spot) {
    const tt = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, spot.p, a.profile.reach);
    // A reachable ball is an arrival problem. Sprinting *through* the spot
    // every tick pulls an in-phase defender across the receiver and then
    // out of the contest as the trajectory's earliest reachable point moves.
    // A receiver may get to the ball before this later point on its flight.
    // Reaching where an already-caught pass would have hit the ground is not
    // an interception opportunity. Close the actual visible catch window.
    if (tt <= spot.t - sim.t + 0.05 && (!window || spot.t <= window.t + 0.05)) return goTo(a, spot.p);
  }
  // Can't beat the ball to its path: drive on the catch point to arrive with
  // the ball — on the receiver's near side, ready to play through the hands
  // or make the tackle the moment it's caught.
  const land = window?.p ?? arrivalPoint(sim, path);
  if (land) {
    // Close to the catch itself. A fixed yard of standoff plus inside shade
    // keeps a late defender outside the hands even when he can recover.
    // ARRIVE_LEAD: an underneath zone defender who cannot beat the ball there
    // drives to the catcher's upfield shoulder, not the catch point: the catch
    // point carried upfield by both bodies and his reach, and across by the
    // catcher's seen lateral run over the time he will be late (scaled by his
    // pursuit; never along the route's downfield component, which turns at the
    // catch). It takes away the upfield run and makes him go east-west; a
    // catcher who cuts back underneath can still beat it.
    let tgt = land;
    if (ARRIVE_LEAD && window && underneathZone(a)) {
      const late = Math.max(0, timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, land, a.profile.reach)
        - (window.t - sim.t));
      const upfield = a.profile.radius + window.receiver.profile.radius + a.profile.reach;
      const across = window.seen.vel.y * late * (0.6 + 0.4 * a.r('pursuit'));
      tgt = { x: land.x + upfield, y: clamp(land.y + across, 0.5, FIELD_WIDTH - 0.5) };
    }
    const dx = tgt.x - a.pos.x;
    const dy = tgt.y - a.pos.y;
    const d = Math.hypot(dx, dy) || 1;
    // Full speed, breaking down only in the last couple of yards; sure
    // tacklers arrive under more control.
    const control = 2.2 + 2.5 * (1 - a.r('tackling'));
    const allowed = Math.sqrt(control * control + 2 * a.profile.brake * 0.7 * Math.max(0, d - 0.3));
    const sp = Math.min(a.profile.vmax, allowed);
    return movingCatchApproach(a,sim,withMovementObjective({vel:{x:(dx/d)*sp,y:(dy/d)*sp}},
      { kind: 'fixed', point: tgt }),window,spot);
  }
  return spot ? runThrough(a, spot.p, { speed: 0.9 }) : null;
}

/** First plausible receiver catch from the defender's delayed picture and
 * the visible flight. Does not inspect the intended target or called route.
 * This is a possibility estimate; a receiver can still drop or miss it. */
function observedCatchWindow(a: Agent, sim: PlaySim, path: PlaySim['ballPath']): { p: Vec2; t: number; receiver: Agent; seen: Perceived } | null {
  const receivers = sim.offense.filter(r => r !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(r.slot))
    .map(r => ({ r, seen: sim.see(a, r) }));
  for (const s of path) {
    const remaining = s.t - sim.t;
    if (remaining < 0 || s.z < 0.25) continue;
    for (const { r, seen } of receivers) {
      if (s.z > r.profile.maxCatchHeight * 0.92) continue;
      const p = { x: s.x, y: s.y };
      const reach = r.profile.reach + TRACKING_REACH_BONUS;
      if (Math.hypot(p.x - seen.pos.x, p.y - seen.pos.y) > r.profile.vmax * remaining + reach) continue;
      // Catching does not require stopping at the ball point. A receiver's
      // observed path can carry his hands through it even when a point-arrival
      // estimate charges for braking/redirecting. Use the same maximum hand
      // envelope as a tracking catch, without consulting his hidden target,
      // route or eventual possession. He may still miss or drop the pass.
      const passing = Math.hypot(p.x - seen.pos.x - seen.vel.x * remaining,
        p.y - seen.pos.y - seen.vel.y * remaining) <= reach;
      const tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile: r.profile }, p, reach);
      if (passing || tt <= remaining) return { p, t: s.t, receiver: r, seen };
    }
  }
  return null;
}

/** Where the ball comes down to catch height on its current flight. */
function arrivalPoint(sim: PlaySim, path: PlaySim['ballPath']): Vec2 | null {
  let last: Vec2 | null = null;
  for (const s of path) {
    if (s.t < sim.t) continue;
    last = { x: s.x, y: s.y };
    if (s.z < 1.4 && s.t > sim.t + 0.1) break;
  }
  return last;
}

/** Generic pursuit of the ball carrier. */
export class Pursuit implements Behavior {
  readonly kind = 'pursuit';
  update(a: Agent, sim: PlaySim): MoveCommand {
    if (a.engagement) return stand();
    if (sim.ball.kind === 'loose') return runThrough(a, { x: sim.ball.flight.pos.x, y: sim.ball.flight.pos.y });
    const holder = observedHolder(a, sim);
    if (holder) return chase(sim, a, holder.target);
    if (HONEST_READS ? playsThrow(a, sim, null) : sim.ball.kind === 'air') return playBall(a, sim, null);
    return pursueIfLive(sim, a) ?? stand();
  }
}

/** Loose ball: everyone near it goes for it. */
export class FumbleScramble implements Behavior {
  readonly kind = 'scramble-ball';
  constructor(private readonly fallback: Behavior) {}
  update(a: Agent, sim: PlaySim): MoveCommand {
    if (sim.ball.kind !== 'loose') return this.fallback.update(a, sim);
    const b = sim.ball.flight.pos;
    const d = Math.hypot(b.x - a.pos.x, b.y - a.pos.y);
    if (d > 12) return goTo(a, { x: b.x, y: b.y }, { speed: 0.7 });
    return runThrough(a, { x: b.x + sim.ball.flight.vel.x * 0.2, y: b.y + sim.ball.flight.vel.y * 0.2 }, { speed: 1 });
  }
}

export function toward(a: Vec2, b: Vec2): Vec2 {
  return norm(sub(b, a));
}

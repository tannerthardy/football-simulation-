/**
 * Quarterback.
 *
 * Pass plays: snap → drop (or play-action fake) → progression reads in the
 * concept's order, each read gated by its route timing → evaluate the throw
 * window → throw / move to the next read / climb or slide in the pocket /
 * scramble / throw it away / take the sack.
 *
 * Throw-window evaluation: predict the receiver's position at release +
 * flight time (anticipation: the QB knows the route), solve the shortest
 * flight his arm allows (bullet) and a touch alternative, then for every
 * defender he perceives compute time-to-reach the catch point (plus reaction
 * to the ball) vs. the ball's arrival, and the chance an underneath defender
 * can get a hand on the ball's path. Decision-making adds noise to those
 * margins; accuracy turns into a miss distance on the actual throw.
 */
import { FIELD_WIDTH } from '../../core/field.js';
import { clamp, logistic, wrapAngle, type Vec2, type Vec3 } from '../../core/vec.js';
import { arcPoint, dragFreeLaunch, minFlightTime, qbArmSpeed, solveLaunch, DRAG_SPIRAL } from '../../physics/ball.js';
import type { MoveCommand } from '../../physics/kinematics.js';
import { timeToReach } from '../../physics/reach.js';
import { supportParams } from '../../physics/support.js';
import type { PassConcept, ReceiverRef } from '../../playbook/types.js';
import { dropSpec, plannedFakeEnd, plannedSnapAt } from '../called-drop.js';
import { PUNCH } from '../engagement.js';
import type { Agent, Behavior } from '../agent.js';
import type { Perceived } from '../perception.js';
import type { PlaySim } from '../playsim.js';
import { BallCarrier } from './carrier.js';
import { handoffReach } from '../ball-transfer.js';
import { HEAD_RATE as SHARED_HEAD_RATE, turnHead } from '../head.js';
import { angleTo, goTo, stand } from './common.js';
import { RouteRunner } from './receiver.js';
import type { QBMind } from '../qbmind.js';
import { believedProfile, typicalAt } from '../believed.js';
import type { PhysicalProfile } from '../../players/physical.js';
import type { ReplayTelemetryFrame } from '../types.js';
import { ReceiverForecast, type InstalledReceiverRoute } from '../receiver-forecast.js';
import { screenSpot, type ScreenSpot } from '../screen-spot.js';
import { compilingPlan, installedPlan } from '../../playbook/read-compiler/runtime.js';
import { DECLARED_BREAK } from '../../playbook/read-compiler/features.js';

/** TRACK_FEEL (experimental, off; TRACK_FEEL=1, or PERCEIVE_TRACK=1 for every group): perception channels step 1b,
 * the QB's feel for the rush (docs/reviews/2026-11-13-perception-proposal.md; built with the QB lane, who own the
 * shoulder test and every consumer). A rusher in front of his shoulders is read through the tracking channel
 * (`PlaySim.track`: a 0.12 s correcting loop, no focus or stress terms stacked on a scaled delay, no acceleration term)
 * instead of `see()`; `feltClosing`'s seen-acceleration extrapolation retires with it. Behind his shoulders the
 * non-visual term (pocket presence) stands. Teammates are seen as before (`track` returns `see` for them). */
const TRACK_FEEL = process.env.TRACK_FEEL !== '0' || process.env.PERCEIVE_TRACK === '1';
const RELEASE_Z = 2.2;
const CATCH_Z = 1.3;

/** What the no-throw behaviour is told when the throw decision has nothing acceptable this tick (the seam between
 * the throw decision and the no-throw behaviour). Guarantees:
 * - `pressure`: the rusher he feels most urgently, as his own picture has him (QBPass.pressure).
 * - `u`: his urgency this tick, 0..1 (rush and his clock); the alarm is pressure.time < 0.45.
 * - `best`: the best throw he evaluated this tick on his own pictures, rejected (below his bar at this urgency, or
 *   not yet looked at); null when nobody was worth evaluating. Its P and intRisk say a bad window from nobody near.
 *   During a look it is the option chosen when the look began (not re-evaluated until his eyes arrive).
 * - `eyes`: whom his eyes are on this tick (a look's target, else his current read); null when on no receiver.
 * - `reason`: which decision returned no throw: 'alarm' (the hot path), 'urgency' (the read logic under rising
 *   urgency), 'clock' (his internal clock).
 * - `since`: the sim time this no-throw spell began (the first of consecutive no-throw ticks, a look's included).
 * Called every such tick; the throw decision runs first each tick, from wherever the no-throw behaviour has put him,
 * and a started throw ends the spell. */
export interface NoThrowContext {
  pressure: { time: number; agent: Agent | null; dist: number };
  u: number;
  best: ThrowEval | null;
  eyes: Agent | null;
  reason: 'alarm' | 'urgency' | 'clock';
  since: number;
}

interface ThrowEval {
  target: Agent;
  point: Vec3;
  T: number;
  P: number;
  intRisk: number;
  value: number;
  depth: number;
  /** Diagnostics: the window's factors (P = pOpen * pClear * pAcc * hands). */
  parts?: { pOpen: number; pClear: number; pAcc: number; hands: number; intPath?: number; intJump?: number; intContest?: number };
}



/** PA_DROP (experimental, off; PA_DROP=1 turns it on): the play-action drop by the QB's alignment (see dropSpec). */
const PA_DROP = process.env.PA_DROP !== '0';
/** SCREEN_QB (experimental, off; SCREEN_QB=1): screens thrown as NFL quarterbacks throw them: a slow screen on its
 * timing once the receiver is ready, and firm (docs/reviews/2026-11-13-screens.md). */
const SCREEN_QB = process.env.SCREEN_QB === '1';
/** The quarterback's natural flight time to a point d yd away for his arm (the measured fit below, scaled by his arm);
 * shared with his receivers' expectation of his ball (BALL_EST). */
export function naturalFlightFor(armSpeed: number, d: number): number {
  const armEdge = clamp((armSpeed - 26) / 8, -0.5, 0.5);
  const base = SCREEN_QB ? 0.27 + 0.0173 * d + 0.00062 * d * d : 0.38 + 0.022 * d + 0.00065 * d * d;
  return base * (1 - 0.12 * armEdge);
}

/** A quarterback's weight going toward the target in his stride (NFL tracking: about 0.4 yd/s at the release). */
const STRIDE_SPEED = 0.45;

/** THROW_REACT (experimental, off; THROW_REACT=1 turns it on): in his
 * window estimate a defender facing him reacts to the ball when it is out
 * (zone: or a reaction after the motion starts, if later), as defenders do
 * (sawThrow); before, every facing defender broke at the motion's start, which
 * made anticipation throws look covered (forced throws he rated 0.07 completed
 * 52%). */
const THROW_REACT = process.env.THROW_REACT !== '0';

/** QB_RHYTHM (on by default; QB_RHYTHM=0 turns it off): the progression keeps the QB's
 * rhythm. A read that is not ready yet gets the same look as one that is (no
 * extra 0.6 s wait for a late route), and once the rush he sees or his own
 * clock says time is up (urgency above the pressure mark) his eyes go to the
 * outlet, the last read, instead of finishing the order. NFL throws to backs
 * leave at 2.50 s p50 against ours at 3.15 s, at the same share (BDB 2025). */
const QB_RHYTHM = process.env.QB_RHYTHM !== '0';
/** QB_FEEL (off; QB_FEEL=1 turns it on): the QB's sense of how long a rusher
 * still in a block will take is read from what he can see, the blocker's body
 * between the rusher and him, not the rep's private score. A blocker square in
 * the rusher's path adds the time to get around him (and off his hands); a
 * rusher level with or past the blocker's edge is as near as he looks. Off,
 * any engaged rusher read 0.35-1.75 s later than his path, so at the first
 * pressure (a man within 2 yd) our QB felt 1.6 s and stood (0.23 yd moved;
 * NFL 0.72 at 2.1 yd/s). */
const QB_FEEL = process.env.QB_FEEL === '1';
/** Experimental (THROW_BODY=1, off): a hold on the passer acts on the throw
 * through what it holds. Its interference is how firmly he is held (heldBy)
 * times how high the hold is on him (1 - the grasp's leg share: the shoulder
 * line 1, the waist 0.5, the legs 0). A hold taken during the load pins the
 * arm with that chance, rolled when the arm must come forward (the delivery's
 * start, with the hold as it is then), and
 * the throw is abandoned; the hold then rules the play. A throw that does come
 * out under a hold has lost the trunk and the step that a hold takes: it is
 * thrown as an arm throw to that degree (the flick's own speed and accuracy
 * costs, flick = max(flick, interference)). Off, a windup in progress is
 * immune to holds and a held throw only widens its miss (missSigma). */
const THROW_BODY = process.env.THROW_BODY !== '0';
/** Experimental (PICTURE_AGE=1, off): an old picture is an uncertain one. In
 * the throw's evaluation, each picture's position uncertainty is what the body
 * could have done since he saw it, from its own acceleration (A = vmax / tau)
 * over the picture's age t: a defender (whose intent he does not know) up to
 * min(A t^2 / 2, vmax t); his receiver (on a route he installed, who can only
 * fall off its tempo) up to min(A t^2 / 2, v t) at the speed he last saw. In
 * time, through the defender's top speed, it widens the margins' spreads in
 * quadrature (contest 0.13 s, undercut 0.10 s; the receiver's term only at the
 * catch point). A fresh read changes nothing; a throw to a man he has not
 * looked at is valued as the gamble it is. Off, an aged picture is
 * extrapolated and scored as if certain. */
const PICTURE_AGE = process.env.PICTURE_AGE === '1';
/** Experimental (POCKET_CLIMB=1, off): pocket movement is buying time. When
 * set and unable to finish what he still needs (the rest of his current read,
 * then a throwing motion) before a rusher he feels could reach him where he
 * stands, he weighs standing against moving, in eight
 * directions at
 * 2.2 yd/s (the pace this model already treats as the edge of a set throw,
 * missSigma), and takes whatever leaves him the most felt time to contact (his
 * felt() picture of each rusher, plus held() for one still in a block) at the
 * end of that time. He stays 2.5 yd behind the line and
 * keeps his eyes on his read; standing wins whenever moving buys nothing.
 * Edge rushers past his depth leave the space in front (he climbs), interior
 * push leaves it to the side (he slides). Escape is what the same movement
 * becomes when the existing scramble check finds a lane. Off, he walks toward a
 * set point nudged by rushers within 3.5 yd at 0.45-0.6 of his speed. */
const POCKET_CLIMB = process.env.POCKET_CLIMB === '1';
/** QB_GATHER (experimental, off; QB_GATHER=1): the drop's rhythm carries his feet to the read he is on. When his eyes
 * reach a read in the pocket, he hitches toward it (a short step, longer with a slower release and less experience),
 * so the ball comes out on the hitch to the read he is on and a later read takes a second hitch. No beat is added:
 * the hitch is taken while he reads. NFL QBs move toward the eventual target from about 0.6 s before the release (p75
 * +0.37 yd/s at -0.6 s, +0.52 at -0.5, +0.67 at -0.4; BDB 2025, scripts/diag/eyes/), ours stood still until the
 * windup (p75 0.00). Under pressure his pocket movement (QB_FEEL, SET_DECIDE) takes over.
 * docs/reviews/2026-11-13-qb-gather.md. */
const QB_GATHER = process.env.QB_GATHER === '1';
/** QB_GATHER_THROW (experimental, off; QB_GATHER_THROW=1; acts only with QB_GATHER and QB_EYES): one hitch, into the
 * throw. QB_GATHER hitched up toward every read his eyes reached, so a quarterback holding the ball crept up the
 * pocket (still holding at 3.0 s he stood 6.8 yd deep against the NFL's 8.0, at 3.5 s 5.8 against 7.7;
 * scripts/diag/escape/qb-hold-depth.py). With this on he holds his set point while he reads, and steps once toward
 * the man he has decided to throw to, during the look that precedes the motion (QB_EYES' gate). The step is toward
 * the target, not forced upfield: on NFL throws held 2.5-3.5 s the last 0.6 s is 0.5 yd of net movement with a median
 * change in depth of 0.0 (p25 -0.3, p75 +0.3). */
const QB_GATHER_THROW = process.env.QB_GATHER_THROW === '1';
/** ACC_RADIUS (experimental, off; ACC_RADIUS=1): his accuracy belief's catchable radius grows with the flight time and
 * the receiver's ball skills (1.6 + 0.9 T yd), as our receivers' catches by the aim miss show, instead of a fixed
 * 1.35 yd: the fixed radius priced a 2 s ball at a fifth of what our receivers catch. docs/reviews/2026-11-13-qb-gather.md. */
const ACC_RADIUS = process.env.ACC_RADIUS === '1';
/** QB_PEEK (experimental, off; QB_PEEK=1): the vertical peek (verticals as one look, then the back; READ_PLAN) is taken at
 * the top of the drop: declared once he is set and the inside verticals have shown their stems (10 yd), instead of when
 * every vertical is 12 yd downfield. docs/reviews/2026-11-13-qb-gather.md. */
const QB_PEEK = process.env.QB_PEEK === '1';
/** QB_COMMIT (experimental, off; QB_COMMIT=1): the delivery recheck (pullDown) keeps a started throw unless what he now
 * sees has clearly changed (the window at half the chance he threw it at, or its pick risk up by 0.12); off, any
 * re-priced value below zero pumped it, so on contested verticals he started and pumped repeatedly.
 * docs/reviews/2026-11-13-qb-gather.md. */
const QB_COMMIT = process.env.QB_COMMIT === '1';
/** QB_EYES (experimental, off; QB_EYES=1): the processing gate. A throw goes only to the man his eyes have been on for
 * his processing time (0.15 + 0.25 (1 - decisionMaking) s); a throw he wants to a man his eyes are not on moves them
 * there first. The window is priced at the release that follows (the gate's remaining time, then the windup). His eyes
 * (what defenders read) are on the man he is about to throw to. NFL defenders facing the QB close on the catch point
 * before the release (+1.5/+2.5 yd/s zone/man) where ours did not (+0.3/+0.6): his eyes were on the eventual target
 * 21% of the time at -0.5 s, 85% at -0.3 s (the windup). docs/reviews/2026-11-13-qb-gather.md. */
const QB_EYES = process.env.QB_EYES === '1';
/** BLITZ_READ (experimental, off; BLITZ_READ=1): the post-snap blitz read. A free rusher by his protection (one no
 * protector is assigned to), coming at him unblocked in his picture in the first second and held for his processing
 * time, sends his eyes and the ball to the hot (the quickest-breaking route on that side, else the back). NFL QBs throw
 * quick on 18% of blitzes (9% otherwise), 69% to wideouts; ours 7% (6%); on our blitzes with a free rusher (34%) he
 * threw quick on 5% and was sacked on 13%. docs/reviews/2026-11-13-qb-gather.md. */
const BLITZ_READ = process.env.BLITZ_READ !== '0';
/** BLITZ_DEPTH (experimental, off; BLITZ_DEPTH=1, read with BLITZ_READ): attempt 2 of the rush belief. Its prior is
 * keyed by alignment and role, from the NFL's realized rush rates of non-linemen (BDB 2025 wk1-3, dropbacks without
 * play action, OLBs excluded: `nfl_rush_by_align.py`), and a step at him raises it fully only at or past the line;
 * above it a quarter (a box backer stepping up on a fake or a man coming up on a route is where those stop). */
const BLITZ_DEPTH = process.env.BLITZ_DEPTH !== '0';
/** BLITZ_SKILL (experimental, off; BLITZ_SKILL=1, read with BLITZ_READ): the blitz read's skill levels (the user's
 * direction, 2026-11-13). (a) His clock is per threat, from the protection call he knows (the blockers' assignments at
 * the snap, declared backers included): a man he believes is coming whom the call has nobody for is a free rusher,
 * and his urgency is the earliest believed free arrival (belief x how soon he gets there in his felt picture), not a
 * head count; the hot look fires on a believed free rusher. (b) Believed pressure narrows him by (1 - composure):
 * a longer processing time (freezing), shorter looks and a lower bar; a composed QB is not narrowed. (c) A prepared
 * answer (awareness and decision-making): on the hot call he first takes one short look at the vacated seat, where
 * the replacement comes from, before the ball can go; an unprepared one goes straight to the throw on the picture
 * he has (stares down the vacated space). */
const BLITZ_SKILL = process.env.BLITZ_SKILL !== '0';
/** BLITZ_DEPTH's prior: on the line off the ball LB 0.54 / DB 0.27, box 0.11 / 0.13, edge 0.32 / 0.18, else 0.03 / 0.01. */
function rushPrior(depth: number, wide: number, lb: boolean): number {
  if (depth <= 1.5 && wide <= 9.5) return lb ? 0.54 : 0.27;
  if (depth <= 6 && wide <= 5.5) return lb ? 0.11 : 0.13;
  if (depth <= 2.5 && wide <= 9.5) return lb ? 0.32 : 0.18;
  return lb ? 0.03 : 0.01;
}
/** Experimental (BLOCK_SEEN=1, off): QB_FEEL's perception half on its own.
 * The QB reads a rusher as held only from what he sees: an offensive body in
 * contact with the rusher and on his path to the QB (seenHold), never from the
 * sim's engagement record or the rep's private win score, so a blocker who has
 * come off holds nothing. QB_FEEL's pocket move is not part of it. Off (and
 * QB_FEEL off), held() credits any engaged rusher 0.35-1.75 s from
 * engagement.win, which rises as the win score falls while he closes. */
const BLOCK_SEEN = process.env.BLOCK_SEEN !== '0';
/** Experimental (FREE_BOUND=1, off): a free man near him is a hit soon,
 * whatever he looks to be doing. For a rusher he sees unblocked (no offensive
 * body within arm's length of him) within FREE_NEAR, the QB's felt time is at
 * most how soon that man COULD hit him: from where he sees him, a typical
 * rusher's burst straight at him to within a hand of his body, with any speed
 * already toward him as a head start and none of his picture's speed away or
 * across counted against him (the picture is 0.25-0.3 s old; a free man that
 * near can have turned in it, and one going by can still reach in). A QB's-eye
 * estimate from typical constants, not the rusher's ratings. Out of his field
 * of view (felt's blind side) poor pocket presence applies it late. Off, a free man drifting past at 1.6 yd, seen on a 0.3 s old
 * picture moving away, read 1-2 s off (Rules + Coaching repro, hitches vs
 * Cover 2, seed 2 flipped, READ_PLAN). */
const FREE_BOUND = process.env.FREE_BOUND === '1';
/** Estimated (FREE_BOUND), a QB's-eye typical rusher: burst toward the QB,
 * yd/s^2; reach from his centre, yd; the range where a hand-and-burst hit is
 * the question (beyond it his ordinary estimate, velocity and all, is what he
 * reads), yd; how much later a poor pocket presence applies the bound to a man
 * behind his shoulder, s. Not fitted to sacks or yards. */
const FREE_BURST = 5;
const FREE_REACH = 1.0;
const FREE_NEAR = 3;
const FREE_BLIND_LAG = 0.5;
/** Experimental (SET_DECIDE=1, off): one decision under pressure. When where
 * he stands he no longer has the time he still needs (the rest of his current
 * read, then a throwing motion) before a rusher he feels can reach him, he
 * moves first: to whichever reachable spot (climb, slide, or out of the box,
 * at 2.2 yd/s, the edge of a set throw in missSigma) leaves him the most felt
 * time to contact at the end of that time, holding the direction for one
 * reaction time and reading as he goes. A lane past the line from where the
 * movement has taken him is an escape (the existing scramble check). Only when
 * no spot buys him time is he trapped, and the existing hot path (throw to
 * anyone with P > 0.3, throw away, evade) decides. With nobody near, nothing
 * here runs. Off, the hot path pre-empts movement whenever he feels a hit
 * within 0.45 s, and he walks toward a set point. */
const SET_DECIDE = process.env.SET_DECIDE === '1';
/** Experimental (SHOULDERS_SET=1, off): his body is not his eyes. After the
 * drop his front shoulder sets to his first read; his eyes move through the
 * progression, and his feet follow a read only once he has held it for a
 * reset (SHOULDER_SETTLE), so a throw decided on a read his feet have not
 * reached, or to a man he was not reading (outlet, hot), starts square to
 * somewhere else. The throw then requests the turn: the shoulders close on the
 * target through the motion, and a bigger turn needs a longer motion (the step
 * and hip turn of a throwing turn, not the body's free yaw, which the World
 * does in ~0.15 s for 30 deg). Off, the body faces whatever his eyes are on,
 * and no throw needs a turn. sim.qbEyes stays gaze. */
const SHOULDERS_SET = process.env.SHOULDERS_SET === '1';
/** Experimental (EXTEND=1, off): when there is no throw in time and he feels a
 * rusher, he moves first. With no acceptable throw (today: under the alarm, no
 * hot throw; later whatever Rules + Coaching's decision says), his answer is
 * his own, by his traits and what he sees: evade to the reachable spot that
 * leaves him the most felt time (SET_DECIDE's spot choice, at his mobility's
 * pace, so a statue finds fewer spots that buy time than a mobile QB); from
 * there a lane past the line is a scramble (the existing check). When nobody
 * is open, he gives the play up as his decision-making lets him: from outside
 * the tackle box he throws it beyond the sideline past the line; inside, at an
 * eligible receiver's feet if one is near enough (a ball into his area); a poor
 * decision maker with neither throws it away anyway and the rules call
 * grounding. With no spot that buys time and no throw-away, he protects the ball
 * (the existing evade) and is caught. Off, the hot path's no-throw branch:
 * scramble check, the veteran throw-away dice, evade (NFL with a free rusher at 2
 * yd: the QB with no throw moves 3 yd before a sack, 2.4 before a throwaway, 10
 * in a scramble; ours 0.8-1.0, inside the tackles; no-throw-in-time review). */
const EXTEND = process.env.EXTEND === '1';
/** QB_POCKET (experimental, off; QB_POCKET=1): his feet in the pocket follow one decision, made on the nearest body he
 * feels. Off, pocketMove climbs whenever ANY felt defender is wide of him within 4-5.5 yd (a defensive end on most
 * snaps), whatever is in front of him, and otherwise drifts off bodies within 3.5 yd a little each tick. On, the
 * nearest body he feels inside POCKET_NEAR decides:
 * - at the edge (wide of him, at or behind his depth): the existing climb, same destination and pace;
 * - in front of him or inside: a slide to the side, toward the read his eyes are on when it is to a side, else away
 *   from the body; POCKET_SLIDE yd at up to POCKET_SLIDE_PACE, which is above missSigma's set-throw edge, so a throw
 *   started mid-slide pays the existing moving cost. Held until he is there, a felt body closes on the spot, or it
 *   lapses; the same body does not move him again until it is POCKET_RENEW nearer;
 * - nobody inside POCKET_NEAR: QB_GATHER's hitch if it is on, else he holds his set point. No drift.
 * NFL (BDB 2025 wk 1-9, scripts/diag/escape/qb-pocket.py; first DL/LB within 3 yd after the drop, he moves 1+ yd):
 * body at the edge -> up 59-67%; body in front -> lateral 56-58%, up 23%; ours up 50-100% either way. Third build:
 * attempt 1 (a reset on a time cause) and attempt 2 (a side hitch) are docs/reviews/patches/2026-11-13-qb-pocket-attempt{1,2}.patch;
 * neither touched the climb that actually moves him. */
const QB_POCKET = process.env.QB_POCKET === '1';
/** QB_HONEST_FEEL (experimental, off; QB_HONEST_FEEL=1; intended on once read): his pressure picture reads only what he
 * has perceived. Off, four things use a rusher's TRUE position: which side of his shoulder the man is on (felt(), and
 * FREE_BOUND's lag), which decides whether he is seen at 1x or late; the distance pressure() reports beside its felt
 * time; and where evade() steps away from. On: the shoulder test uses his plain picture of the man (see() at 1x), the
 * distance is to the felt position, and he evades the felt position. Expect him to feel pressure a little later and
 * less exactly; a loss is repaired by better perception (PERCEIVE_TRACK step 1b), not by the leak. */
const QB_HONEST_FEEL = process.env.QB_HONEST_FEEL !== '0';
/** THROW_PLATFORM (experimental, off; THROW_PLATFORM=1): what moving costs a throw, as one continuous mechanism. Off, a
 * throw from a mover is 1.15-1.6x wider in every direction once his speed passes 2.2 yd/s and costs nothing below it: a
 * step on his own speed, with no direction. On, the cost comes from the part of his velocity the throw cannot use:
 * - Stepping toward the target is the throw itself, free up to PLATFORM_STRIDE (the weight going into the ball).
 * - The rest of his velocity is carried by the ball. He corrects for it, imperfectly: the uncorrected share
 *   (PLATFORM_RESID0 + PLATFORM_RESID_SKILL x (1 - throwOnRun)) of that velocity over the flight time is a miss along
 *   his direction of motion, so a long ball thrown on the move misses by more than a short one.
 * - Moving across the target line or away from it takes his base and trunk out of the throw: an arm throw (flick) to
 *   the degree that component nears PLATFORM_BASE, less for a good thrower on the run.
 * Below PLATFORM_QUIET of unusable velocity nothing is charged, so a set throw (his stride into it included) is
 * unchanged. The shape is mechanics; the coefficients are chosen, to be checked for ORDER only (set < stepping in <
 * drifting away < across the body) and against ball-vs-aim by platform (scripts/diag/eyes/deep-split.ts), never fitted
 * to completions or to the NFL's ball-to-receiver distance (which contains the receiver's adjustment). */
/** QB_BELIEVED_DEF (experimental, off; QB_BELIEVED_DEF=1; information rule): in pricing a throw he no longer knows each
 * defender exactly. Off, the window reads every defender's true physical profile (reach, reaction time, top speed, leap)
 * and exact ball-skills rating, and the sim's engagement record for whether a defender is tied up. On:
 * - body and ball skills are a belief: the position's typical values corrected toward the man's own by how well he
 *   knows the opponent, SCOUT0 + SCOUT_AWARE x awareness + SCOUT_EXP x experience (to 8 years). So an elite corner he
 *   has not studied is rated nearer an ordinary one, and knowing the opponent is a rating, not a given. Fixed for the
 *   play (no fresh noise each tick).
 * - a defender's current fatigue (his speed scale) is not read: it shows only in how he is moving, which the picture
 *   already carries.
 * - tied up is what he sees: an offensive body other than his target within arm's length of the defender in his
 *   pictures; the same in screenDead() and the rush belief.
 * A loss from this is repaired by preparation as a mechanism (film study raising how well he knows them), not by the
 * leak. SCOUT constants are chosen. */
const QB_BELIEVED_DEF = process.env.QB_BELIEVED_DEF !== '0';
/** QB_SEEN_OUT (experimental, off; QB_SEEN_OUT=1; information rule): whether a check-release man is out on his route is
 * no longer read from the man's behaviour object. He is out once the quarterback's own picture has placed him on his
 * installed release route (the forecast's progress, from a look or his peripheral view), and he then stays out. It
 * gates the rhythm outlet, whether that man is ready, and his place in the hot order. A man whose route starts on an
 * installed count is unchanged, and so is a screen's receiver (his release is the called count). A slow screen's "he has settled" is likewise read from where the quarterback has him,
 * not from the receiver's own flag and true position. Receivers with no installed picture are unchanged. */
const QB_SEEN_OUT = process.env.QB_SEEN_OUT !== '0';
/** QB_CALL_ROUTES (information rule, 2026-11-16): who is on a route and which route is his call (the play's install,
 * known from the huddle; a check-release man once his picture has him out), never the receiver's live behavior object. */
const QB_CALL_ROUTES = process.env.QB_CALL_ROUTES === '1';
/** QB_SEEN_REC (experimental, off; QB_SEEN_REC=1; information rule): the remaining reads of his own receivers' true
 * state use where he has them: his forecast of the man, else his delayed picture. That is the side a receiver is on
 * (look-off decoy, hot side), the verticals' stems for the peek, whether a man is in his clear look, the fallback
 * target point in pricing, and in the man-coverage reorder both the receiver and the defender on him (his picture of
 * the defense). A receiver is down when his delayed picture shows him off his feet. A receiver's block is not read
 * from the engagement record: who blocks is the call, and a check-release man is a receiver once seen out. */
const QB_SEEN_REC = process.env.QB_SEEN_REC !== '0';
const SCOUT0 = 0.2;
const SCOUT_AWARE = 0.4;
const SCOUT_EXP = 0.4;
const THROW_PLATFORM = process.env.THROW_PLATFORM === '1';
/** QB_BREAK (experimental, off; QB_BREAK=1; the out-of-pocket phase, first build): leaving the pocket no longer ends
 * his time as a passer. When he has no throw and feels the rush (the alarm's no-throw branch), or his clock has run
 * out, and a spot outside the rush beats every pursuer he feels by BREAK_MARGIN, he breaks to that side with the ball
 * up. The pocket's own trigger does the same for a man in front who is free, or blocked and still being walked back at him. Out there, at his processing interval and each held until the next, he decides: throw (his best man on his
 * pictures at the bar he has in the pocket, lowered by the pressure he feels; the eyes gate applying), tuck and run (a lane past the line beats the pursuers and nobody is
 * near the bar; this is the old scramble), throw it away (outside the tackles, a pursuer inside one motion and one
 * processing time, nobody above half the bar; a short motion, not an instant release), stop and set (no pursuer inside
 * SET_ROOM for a reaction time: his new spot is his pocket), or keep moving to a destination he picked and holds
 * (flat, up and out, or deeper and out, the one that keeps the most time on the pursuers and stays behind the line).
 * A throw from there is made on the move (THROW_PLATFORM prices it) instead of planting. He shows carryPosture 'up'
 * until he tucks. Off: the alarm's no-throw branch scrambles, rolls a throw-away or steps back, and the clock's
 * branch scrambles. Constants are chosen (first build). docs/reviews/2026-11-13-qb-pocket.md. */
const QB_BREAK = process.env.QB_BREAK === '1';
/** QB_RELOOK (experimental, off; QB_RELOOK=1; information rule): running out of reads gives him nothing for free. Off,
 * the moment his progression ends he takes the best man on the whole field, on his pictures, at his bar less 0.1: a
 * look round the field at once that no quarterback has, standing where the real decision belongs. On, he goes back to
 * his first read and works through them again, one look at a time at his dwell, with his eyes going to each man and at
 * the bar he has (the list ending does not lower it); his check-down is taken on the way as before (QB_RHYTHM's outlet).
 * With QB_BREAK, moving is the other answer at that moment: he leaves with the ball up when a spot outside is there,
 * and reads on from it. */
const QB_RELOOK = process.env.QB_RELOOK !== '0';
/** QB_KEY_MAN (experimental, off; QB_KEY_MAN=1; with READ_PLAN's defender keys): his key read is taken on the defender
 * the concept names, not on whoever is nearest the line between the two routes (on corner_flat that was the middle
 * linebacker once the corner sank under the corner route). Before the snap he picks the man by the role's alignment
 * rule, from where the defense lines up: the corner is the widest defender on the key's side inside 10 yd; the apex
 * (flat) defender the second from the sideline inside 8 yd; the hook player the second-level defender (2.5-8 yd off
 * the ball) nearest the ball, on the key's side of it; a deep key the deepest man (8 yd or more) nearest the middle, or over the high
 * route. He picks from alignment, so a rotated or disguised look can give him the wrong man. In the drop his eyes go
 * to that man, and at the cue he reads the man's movement in his picture (sinking to the high route gives the low man, jumping
 * the low route gives the high man), or where he stands when he is not moving along the stretch. When he has no fresh
 * picture of the man, or the role names nobody, there is no key read and he runs the order as installed. */
const QB_KEY_MAN = process.env.QB_KEY_MAN !== '0';
/** QB_KEY_MAN: the speed along the low-high stretch (yd/s) at which the key's movement is the read, and how his
 * reading noise on a place along the stretch scales to a speed. Both chosen. */
const KEY_MOVE = 1.0;
const KEY_MOVE_NOISE = 5;
/** QB_KEY_READ (experimental, off; QB_KEY_READ=1; with QB_KEY_MAN; docs/reviews/2026-11-16-key-man.md, Integration's
 * ruling): the key read as taught. (a) The key man is named pre-snap from the shell as he reads it, among coverage
 * players in his picture (2 yd or more off the ball, or detached wide; never a man on the line in a stance): a flat /
 * curl-flat key is the corner under a two-high read with a hard corner (6 yd or shallower), else the overhang inside
 * him; a disguise that fools his shell read names the wrong man, and that error stays. Off, the second-widest man
 * within 8 yd from the true alignment, the strong-side end from doubles on 42 of 48 plays. (b) The read is the man's
 * movement after the snap in his picture: his displacement along the low-high stretch since the snap; past the commit
 * margin toward the high route he has taken it (throw low), toward the low route he has jumped it (throw high). A man
 * who has not committed by the cue gets the concept's coached default for a sitter (the plan's `key.sits`, Rules'
 * SITS table, #813; without it, a flat / curl-flat key's "if he doesn't widen, throw the flat", the low route). Off,
 * where he stands against the stretch's midpoint. Once made the read is committed: it changes once at most, only on a
 * perceived move past the margin the other way before the throw. */
const QB_KEY_READ = process.env.QB_KEY_READ === '1';
/** QB_KEY_READ: the commit margin (yd of displacement along the stretch since the snap), chosen; the exit is half.
 * Numeric so the staged gate reads it a level either side. */
const KEY_COMMIT = Number(process.env.QB_KEY_COMMIT ?? 1.0);
/** QB_KEY_READ: a man within this share of the stretch of a route is standing on it (chosen). */
const KEY_ON_ROUTE = 0.25;
/** QB_KEY_THROW (experimental, off; QB_KEY_THROW=1; with QB_KEY_MAN): he stays on the key read's answer through its
 * break. The key tells him which side of the stretch the conflict defender left; it does not tell him the top is
 * open. So the read chooses where he looks and removes the wait for a second look at the other half: he holds on the
 * answer through its break (up to KEY_HOLD after the read, chosen) instead of moving on at his dwell, and throws it
 * when it passes his price like any read (the man over the route is in the price). Two earlier forms let the read
 * stand in for the price behind window tests (who is near the catch, who can reach the ball's path, a named danger
 * man): they doubled corner throws and put the added ones where a safety was a hard run from the ball (50% of routes
 * targeted against the NFL's 8%; docs/reviews/2026-11-13-qb-pocket.md). */
const QB_KEY_THROW = process.env.QB_KEY_THROW === '1';
/** PLAN_CLOCK (experimental, off; PLAN_CLOCK=1): DECLARED_BREAK's installed break time read on the play clock. The
 * read compiler times each break as the sampled play's sim.t (from the start of the play); planBreakAt added the
 * snap-secured time (0.3 s, GUN_SNAP ~0.5 s) to it again. On engine-68 (scripts/diag/escape/rhythm-check.ts, 157 read
 * routes): true break minus compiled p50 -0.05 s; his belief minus the true break p50 +0.49 s off, +0.10 s on. Where
 * his forecast cannot place the break, the plan's time is the one his readiness waits for. */
const PLAN_CLOCK = process.env.PLAN_CLOCK !== '0';
/** QB_TICK_PICTURE (experimental, off; QB_TICK_PICTURE=1): his pictures of the defense are taken once a tick, as time
 * passes, not when a decision asks for them. Off, `felt` and his plain picture call the perception layer on demand,
 * and that layer's state advances with the asking: under SIGHT_CARRIER the per-tick visibility memo (`sighted`'s
 * `sightAt`) freezes a past tick's line of sight at the moment it is first asked (with the bodies' heights then), and
 * TRACK_FEEL's loop starts over for a pair not asked about last tick. So an extra `evaluate` (an observer scoring a
 * receiver every tick) changed the play: Rules' cov7 observer case, bisected to `sightAt` (restoring it after the
 * observer's call makes the arms identical; restoring `believed`, `outSeen` and the forecast caches does not). On: at
 * the start of each of his updates he takes his plain and felt picture of every defender, and advances `outSeen`;
 * his `believed` map and the judgment draws his pricing reads are created at his first update, in a fixed order.
 * `evaluate`, `window` and pressure read those; between his updates they read the last ones. */
const QB_TICK_PICTURE = process.env.QB_TICK_PICTURE !== '0';
/** QB_FELT_EDGE (experimental, off; QB_FELT_EDGE=1): the blind-side lag is continuous in the rusher's bearing off his
 * facing. Off, freeBound adds FREE_BLIND_LAG x (1 - pocket presence) to a rusher's believed arrival the moment his
 * bearing passes 1.8 rad, a step function of his own facing: on engine-70 (seeds 11 / 23, 392 pass plays,
 * scripts/diag/eyes/threshold-flips.ts) the edge flipped 2,217 times, 20% undone within 0.3 s. The two channels'
 * pictures of the man agree at the edge (jump p50 0.02 yd, as an ordinary tick), so the channel choice in feltLive
 * stays a single edge; the step that mattered is the lag. On: the lag rises smoothly from 0 at FELT_IN_VIEW to its
 * full value at FELT_BLIND (a smoothstep), so pressure() and urgency are continuous across the edge of his view. No
 * state: it is a function of what he sees now. The band is chosen (the edge of his field less 0.15 rad). Most of the
 * edge's flips are his facing swinging 0.4-0.8 rad and back within 0.3 s, a controller question this does not
 * address. */
const QB_FELT_EDGE = process.env.QB_FELT_EDGE === '1';
/** QB_FACE_SEEN (experimental, off; QB_FACE_SEEN=1; information rule): his pocket facing turns to his picture of the
 * read (his forecast of the man, `has`), not the receiver's true position. Off, bodyFacing aimed at `read.pos` and the
 * shoulder read's `.pos`: the truth, however small the difference (found measuring his facing swing, 2026-11-16). */
const QB_FACE_SEEN = process.env.QB_FACE_SEEN !== '0';
const FELT_IN_VIEW = 1.65, FELT_BLIND = 1.8;
/** QB_TICK_PICTURE: the judgment keys his pricing reads (created at his first update, so their order is his, not the asker's). */
const PRICE_JUDGMENTS = ['def-phase', 'def-dislodge', 'int-belief', 'acc-urgency', 'drop-belief'];
/** QB_FOOTWORK (experimental, numeric bits, off): the progression carried by his feet, stage one (coupling perfect;
 * docs/reviews/2026-11-15-drop-design-stage1.md). Read on CONCEPT_DROPS=1, PLAN_CLOCK=1 and QB_TICK_PICTURE=1.
 * Bit 1: reads on steps and the release on a step. The plan gives each read its step index (`plan.rhythm[].n`, Rules
 * + Coaching's hand-over: 0 the set, 1 the first hitch, 2 the second; reads on one look share it); he lands step n n
 * strides of his own drop after his set. His eyes go to the next read when the step that lands for it starts, not
 * when a dwell runs out, but not before he has given the read he is on his yes/no glance (attempt one moved them at
 * the set + 0.1 s, before a read-1 throw on the plant could start). The hitch is a base reset at depth, one stride,
 * turned to the read. A read can be thrown once its step has landed (or with the landing inside his load). Under
 * pressure (urgency 0.8 or more) he throws from where he is. Off the plan's steps the dwell moves him on as before.
 * Triangle, peek, key and hot reads are unchanged by this bit. Bits 2 (the open-hip drop, drop pacing) and 4 (climb /
 * slide / reset) are not built. */
const QB_FOOTWORK = Number(process.env.QB_FOOTWORK ?? 0) | 0;
const FW_STEPS = (QB_FOOTWORK & 1) !== 0;
/** QB_FOOTWORK bit 2 (first part: his facing). The drop opens his hips: his chest turns from downfield toward his
 * picture of read 1 as he gives ground, in proportion to the depth he has dropped (the coached crossover drop, hips
 * open to the throw's side; NFL chest off downfield 22 / 41 / 55 / 59 deg at 25 / 50 / 75 / 90% of a short gun drop, ours
 * 0 throughout: docs/reviews/2026-11-15-drop-measurements.md). From under center the same, in place of a fixed 75 deg
 * to one side. In the pocket his shoulders set on a step, not on a look: they turn to a read at the plant and when a
 * footwork step lands (bit 1's), toward his picture of the man; a look moves his eyes and head only (his facing
 * re-aimed with every look and came back within 0.3 s on 68 of 186 reversals, scripts/diag/eyes/facing-swing.ts).
 * Part 3: the crossover drop, hips side-on to travel toward read 1's side over the first third of the depth, and the
 * drop paced to its measured time. Read with bit 1. Not built yet in bit 2: the step into the throw. */
const FW_HIPS = (QB_FOOTWORK & 2) !== 0;
/** QB_FOOTWORK bit 16 (split from bit 2, Integration 2026-11-16): the play-action fake held to the measured mesh. Not
 * to land alone: with it a gun PA plants at 2.3 s (the NFL's 2.2) but his read after the plant is a dropback's (throw
 * 3.2 s against the NFL's 2.3), and PA sacks go 14.8 -> 27.1% staged; it lands with PA reads decided on the plant out
 * of the fake. */
// (FW_PA_FAKE is read in called-drop.ts's plannedFakeEnd, which the back, the QB and the line share.)
/** QB_EDGE_THREAT (experimental, off; QB_EDGE_THREAT=1; Integration's ruling 2026-11-16, Flex's long-hold measurement):
 * the step-up answers an edge rusher who threatens him, into room. pocketMove's edge test (his home 1.8 + 1.2 pp yd up)
 * fired on any defender he felt wide and level within 2.5 + 3 pp yd, blocked or not, closing or not: on long holds the
 * edge rushers ridden past by the tackles kept it true for most of a second a play, and he walked 1.4 yd up into the
 * interior (staged QB depth 7.85 -> 6.70 yd from 2.0 to 3.5 s, NFL 7.4 -> 7.7; scripts/diag/escape/long-hold-climb.ts).
 * With it, a rusher counts only if, in his felt picture (felt(): the blind side lagged as his feel allows, never the true
 * position), he is not tied up by a blocker he sees (seenTied: his plain picture of his own players) and is closing on
 * him; the forward home holds only while his picture has room ahead (nearest body within 30 deg ahead: teammates seen,
 * defenders felt). Enter and exit margins on both, the exit on the far side: once he steps up it is a committed move
 * until the threat or the room clears its exit margin. Margins chosen. */
const QB_EDGE_THREAT = process.env.QB_EDGE_THREAT === '1';
const EDGE_CLOSE_IN = 1.5, EDGE_CLOSE_OUT = 0.5; // yd/s toward him (chosen)
const EDGE_ROOM_IN = 2.0, EDGE_ROOM_OUT = 1.4; // yd ahead (chosen)
/** QB_FOOTWORK bit 8: the grass read (docs/reviews/2026-11-15-drop-design-stage1.md, "Design: the grass read"; Rules +
 * Coaching's vertical-ready note on #780). A first read thrown before its break into space (a vertical, a corner, a
 * post, a deep out) is read on the grass it is going to, during the drop: his eyes go to the landing area from the
 * drop's start; it is readable when, in his pictures, the receiver is out of the collision and no defender stands between
 * him and the landing area (beaten or under him); the throw goes by his last drop step if it clears his price (the
 * window prices the throw to the aim point: anticipation), and if it has not gone by the set he is on to his next read at
 * once ("on his fifth step, the ball should be gone or he should be on to his mesh read", Win With The Pass). The plan's
 * own fields (grass reads, landing areas) are taken when it hands them over; until then the grass routes and the landing
 * area are his own (installed route families; his forecast of the man at the ball's arrival: his wind-up plus its flight). Read with bits 1+2. */
const FW_GRASS = (QB_FOOTWORK & 8) !== 0;
/** QB_FOOTWORK bit 8: routes thrown before their break into space (installed route ids). Chosen; GRASS_READ's plan
 * fields replace it. */
// The set agreed with Rules from the sources (2026-11-16): go and fade (Gonzalez; Marinelli); the corner as read 1 and
// not half of a key (Win With The Pass, mesh). Not the seam at the plant (decided "as he passes by the linebacker":
// the plan's later step carries it); not the post or the deep out (Walsh: thrown on the break).
const GRASS_ROUTES = new Set(['go', 'fade', 'corner']);
/** GRASS_READ (Rules, #802): the plan marks grass reads (`rhythm[i].grass`: landing in the plan's frame, the route time
 * there, decided on the entry's step n). With it, the plan is the source of which reads are grass reads and where they
 * land; without it, the fallbacks above (read 1 only, decided on the plant). */
const GRASS_FIELDS = process.env.GRASS_READ === '1';
/** QB_FOOTWORK: the hitch is a stride of his own drop (a gather, back foot then front foot, that re-sets his base and
 * turns him to the read, at depth): its time is his drop's time over its steps, so his eyes leave for the next read
 * one stride before its beat and the ball can leave on its landing. The steps each drop is taught in (1 the quick
 * game's catch-and-throw, the gun three and five, the five and seven from under center; play action counts the
 * fake's step as one more of five). Coached counts, not fitted. */
const DROP_STEPS: Record<string, number> = { quick: 1, gun3: 3, gun5: 5, five: 5, five_deep: 5, seven: 7, pa: 5, boot: 5 };
/** QB_EVADE_UP (experimental, off; QB_EVADE_UP=1): the trapped case (under the 0.45 s alarm with no throw) steps off a
 * man in front of him to the side and up, not straight away from him. Off, evade steps directly away from the man, so
 * against an interior rusher it is a step backward at up to 0.7 of his top speed (commanded -3.7 to -4.6 yd/s upfield
 * on the stand probe's events): the drift that put him deeper as the man arrived. Against an edge it is unchanged. */
const QB_EVADE_UP = process.env.QB_EVADE_UP !== '0';
/** BLITZ_SECOND (experimental, off; BLITZ_SECOND=1; with BLITZ_READ): the coached second look. A blitzer keeps coming
 * at the quarterback; a linebacker in man on the back goes where the back goes. On engine-68, 44 of 125 false hots on
 * non-blitz plays (10.3% of them) were linebackers in man on the back (scripts/diag/eyes/free-rusher.ts), and 24 more
 * were called on now screens, where a hot has no meaning. On: while the back has released in his picture (moving away
 * from him), each off-ball defender's path is classified from a fresh picture of him (no older than PATH_FRESH):
 * 'follow' when his velocity points nearer the released back's forecast point half a second on than at the
 * quarterback by PATH_MARGIN, back to 'rush' when it points nearer the quarterback by the same margin (enter and exit
 * on opposite sides); a man following the back has his step toward the quarterback not counted as a rush in the
 * belief's update. If the back stayed in, a man who comes is a rusher. No hot is called on a screen. The look costs
 * time by construction: the belief waits for the man's path to declare itself. */
const BLITZ_SECOND = process.env.BLITZ_SECOND !== '0';
/** BLITZ_SECOND: how fresh his picture of a man must be to classify his path (s), and the angular margin (rad) by which
 * one bearing must beat the other to enter or leave 'following the back'. Chosen; not tuned to a rate. */
const PATH_FRESH = 0.5, PATH_MARGIN = 0.35;
/** QB_LOOKOFF_RHYTHM (experimental, off; QB_LOOKOFF_RHYTHM=1): a look-off is taken only when his first read will
 * not be ready until after it. A look-off moves a safety with his eyes in the drop; as taught it never costs the
 * rhythm throw. Off, it was rolled once at the set (by decision-making, anticipation and experience) and held read 1
 * for 0.25-0.35 s whether or not read 1 was already open (mesh's 1.85 s look-off on the route package). Paired staged
 * read (scripts/diag/escape/drop-staged.ts on the QB lane branch, 3,072 plays, engine-67): 671 plays change; 8.29 ->
 * 8.47 yd a play, complete 67.7 -> 68.4%, sacks 198 -> 195, INT 34 -> 35, throwaways 46 -> 56. */
const QB_LOOKOFF_RHYTHM = process.env.QB_LOOKOFF_RHYTHM === '1';
const KEY_HOLD = 1.2;
/** QB_BREAK: the time a spot must leave him on the nearest felt pursuer (s); the existing scramble lane margin. */
const BREAK_MARGIN = 0.35;
/** QB_BREAK: how far outside him the break point is (yd); the existing panic lane. */
const BREAK_REACH = 5.5;
/** QB_BREAK: how far ahead he picks a destination (yd) and how long he holds it at most (s). */
const OUT_STEP = 4;
const OUT_HOLD = 0.8;
/** QB_BREAK: his pace with the ball up, and through a throwing motion on the move (fractions of top speed). */
const OUT_PACE = 0.8;
const OUT_THROW_PACE = 0.45;
/** QB_BREAK: he tucks only with nobody above this share of the bar. */
const TUCK_BAR = 0.5;
/** QB_BREAK: with no felt pursuer inside this (yd) for one reaction time he stops and sets. */
const SET_ROOM = 4.5;
/** QB_BREAK: the throw-away's motion as a share of his load. */
const AWAY_LOAD = 0.6;
/** THROW_PLATFORM constants. PLATFORM_STRIDE, yd/s: NFL quarterbacks release moving at 0.7 / 1.1 / 1.9 yd/s (p25/50/75,
 * BDB 2026); ours at 0.4 (STRIDE_SPEED). PLATFORM_QUIET, yd/s: chosen, above a planted body's sway. PLATFORM_RESID0 /
 * PLATFORM_RESID_SKILL: chosen (the best mover leaves a twelfth of his motion in the ball, the worst a third).
 * PLATFORM_BASE, yd/s: chosen (a run at about two thirds of a quarterback's top speed leaves no base at all).
 * PLATFORM_ALONG: chosen; motion along the target line changes the ball's length, motion across it its direction, and a
 * ball long or short by a yard is nearer a moving receiver than one a yard wide of him. */
const PLATFORM_STRIDE = 1.2;
const PLATFORM_QUIET = 0.3;
const PLATFORM_RESID0 = 0.08;
const PLATFORM_RESID_SKILL = 0.25;
const PLATFORM_BASE = 6;
const PLATFORM_ALONG = 0.6;
/** QB_POCKET, named so a reader can tell a measurement from a choice.
 * - POCKET_NEAR0 / POCKET_NEAR_PP, yd: the felt distance inside which the nearest body decides his feet,
 *   NEAR0 + NEAR_PP x pocketPresence. Chosen, bracketing the operator's 3 yd; the rating acts on how far out he
 *   notices, not on an outcome.
 * - POCKET_EDGE_WIDE / POCKET_EDGE_DEPTH, yd: "at the edge" is wide of him by this much and no more than this far in
 *   front of his depth. The operator's definition (1.5, 1.0), which the NFL rows are split by.
 * - POCKET_READ_SIDE, yd: his read is "to a side" when it is this far off his own y. The operator's 3 yd.
 * - POCKET_CLEAR, yd: a slide spot with a felt defender within this is not taken (and ends a slide under way). Chosen.
 * - POCKET_SLIDE, yd: one slide. Chosen inside the NFL's displacement on these events (p50 0.85-1.12 yd in 0.5 s;
 *   lateral 1.0 yd on throws held 1.5 s+).
 * - POCKET_SLIDE_PACE, yd/s: its top pace. Chosen from the same rows (1+ yd in 0.5 s from rest needs about 3).
 * - POCKET_RENEW, yd: the same body moves him again only when this much nearer than at his last slide. Chosen.
 * - POCKET_MAX_T, s: a slide not reached by then is dropped. Chosen (1.25 yd at 3 yd/s from rest is about 0.6 s).
 * - POCKET_CLOSING, yd/s: a body in a blocker's hands moves him only when he feels it closing on him at least this fast.
 *   Chosen: a walk-back, well under a free rush (4-6 yd/s).
 * Known free action: a slide rarely reaches the 2.2 yd/s where missSigma charges a moving throw, so throws during or just
 * after one cost him nothing today (72-78% complete against 69%); that is not evidence the slide is right. The price
 * belongs to the on-the-move throw mechanics in the out-of-pocket work. */
const POCKET_NEAR0 = 2.2;
const POCKET_NEAR_PP = 1.2;
const POCKET_EDGE_WIDE = 1.5;
const POCKET_EDGE_DEPTH = 1.0;
const POCKET_READ_SIDE = 3;
const POCKET_CLEAR = 1.5;
const POCKET_SLIDE = 1.25;
const POCKET_SLIDE_PACE = 3;
const POCKET_RENEW = 0.5;
const POCKET_MAX_T = 0.8;
const POCKET_CLOSING = 1.0;
/** Estimated (SHOULDERS_SET): how long he holds a read before his feet reset
 * to it, s: a reaction time, not fitted. Its check is the NFL shoulder angle to
 * the target at his last settled frame and the turn-angle mix (qb-release.py),
 * never yards or completions. */
const SHOULDER_SETTLE = 0.3;
/** Estimated (SHOULDERS_SET): a throwing turn of A deg takes TURN_BASE +
 * A / TURN_RATE s. Fitted to the NFL turn into the throw by angle turned
 * (qb-release.py, BDB 2025 pocket dropbacks: 15-45 deg 0.3 s, 45-90 0.5 s,
 * 90-180 0.7 s), not to yards or completions. */
const TURN_BASE = 0.12;
const TURN_RATE = 190 * Math.PI / 180;
/** READ_PLAN (experimental, off; READ_PLAN=1 turns it on): he runs the read plan compiled from the routes
 * (src/playbook/read-compiler, docs/reviews/2026-11-11-read-compiler-phase0.md) instead of the concept's
 * hand-written progression. The plan is his intent; he executes it from what he sees:
 * - pure: the start side through, then the other side, then the outlet;
 * - alert: a yes/no glance at an isolated vertical at the set, then the order;
 * - defender key: eyes on the defender between a low and a high route from the drop; at the plan's cue time,
 *   from his own delayed picture, if that defender is playing the high route he throws the low one, if the low
 *   one the high, read as well and as fast as his decision-making and awareness allow; no defender there (man,
 *   or nobody in the stretch) leaves the order as it is;
 * - triangle: three routes read as one picture (eyes on its middle), the best open one taken;
 * - vertical peek: the verticals as one picture, one look, then the back.
 * Pressure and his clock still end any plan (QB_RHYTHM's outlet). Off: `concept.progression`. */
const READ_PLAN = process.env.READ_PLAN !== '0';
/** HOT_LOOK (experimental, off; HOT_LOOK=1 turns it on): the hot throw costs the look. Under an alarm he picks
 * where to throw from his pictures of the receivers (as old as his last look at each), not from the field as it is.
 * A target inside his clear look is thrown after the windup, as before; anyone else first needs his eyes there:
 * the head turn (HEAD_RATE) and a glance to take him in (decision-making and awareness), while he evades. Then the
 * throw is judged again on the fresh picture; if it has gone, he chooses again or is left with no throw (Flex's
 * extend / throw away / take the sack). Nothing is barred. Also fixes the plan's gaze: when pressure sends his eyes
 * to the back, a vertical peek or triangle is closed and an unread key is no longer watched, so his eyes are where
 * his read is. Off: the instant best of every receiver on the alarm tick, wherever he is looking. */
const HOT_LOOK = process.env.HOT_LOOK !== '0';
/** DEF_BELIEF (experimental, off; DEF_BELIEF=1 turns it on): his belief about how defenders close on a throw, in the
 * window. Off, every defender keeps his course until his start (docs/reviews/2026-11-12-window-defenders.md: on
 * engine-40 that under-rates the closing of a man in coverage on the target by 0.3-0.7 yd). On: a defender within
 * 4 yd of the target (by his pictures) moves partly with the target over that time, as coverage on a man does; his
 * belief of how much is right on average and spread both ways by inexperience (decision-making and experience).
 * Calibrated on engine-40's defense (ARRIVE_LEAD, CUSHION_BREAK on): re-read when the defense changes. */
const DEF_BELIEF = process.env.DEF_BELIEF !== '0';
/** ACC_BELIEF (experimental, off; ACC_BELIEF=1 turns it on): his belief of his own accuracy prices the throw he will
 * release. Off, the window's miss (missSigma) uses his decision's urgency, which is scaled down by pocket presence
 * and taken from the rush as it is now; the release uses the rush as it is at the release, unscaled, and a throw the
 * rush reaches is a flick. Under pressure (u 0.5-1 at the decision) that put his believed off-target at 0.22 against
 * the release's own 0.41 and 0.34 observed (docs/reviews/2026-11-12-accuracy-belief.md). On: the window's miss uses
 * the urgency the rush will have when the ball leaves (his picture of it, closed over the windup), unscaled (pocket
 * presence stays on his bar), and expects a flick when the rush arrives before the release; how well he anticipates it
 * is set by his knowledge (decision-making and experience), with error both ways. */
const ACC_BELIEF = process.env.ACC_BELIEF !== '0';
/** DROP_BELIEF (experimental, off; DROP_BELIEF=1 turns it on): his belief of how often a ball that reaches his
 * receiver untouched is dropped, by the receiver's hands. Off: 0.12 - 0.1·hands. On natural league throws on engine-47
 * (CATCH_CARRY, HANDS_CUE, CATCH_SPEED, CATCH_CHOICE on; 3,872 reached and not defended, 290 drops) the observed rate
 * was 0.165 - 0.13·hands (fitted on one half of the games, within 0.004 on the other), about 0.025 above his belief at
 * every hands level (docs/reviews/2026-11-12-drop-belief.md). On: the fitted rate. His knowledge (decision-making and
 * experience) sets how well he knows it, with error both ways. Re-read when the catch rules change. */
const DROP_BELIEF = process.env.DROP_BELIEF !== '0';
const DROP_BASE = 0.165;
const DROP_HANDS = 0.13;
/** INT_BELIEF (experimental, off; INT_BELIEF=1 turns it on): his interception belief, shaped like how picks happen.
 * Off, each defender's path undercut (a touch on the ball in flight) adds to the risk as if every touch were a pick,
 * and a contested catch point is priced lightly. On natural league throws (engine-47 candidate: CATCH_CARRY,
 * HANDS_CUE, CATCH_SPEED, CATCH_CHOICE on), his catch-point terms ranked picks (0.9% to 4.0% across their bands) and
 * his path terms barely did (docs/reviews/2026-11-12-int-belief.md). On: a touch in flight ends a pick a fraction of the
 * time (PATH_PICK) and the catch point's jumped and contested picks are weighted up (CATCH_PICK), defenders combined as
 * probabilities. His knowledge sets how well he knows it, with error both ways. Calibrated against the engine-47
 * candidate's catch flags and engine-46's defense: re-read when the catch, tip or coverage rules change. */
const INT_BELIEF = process.env.INT_BELIEF !== '0';
/** INT_BELIEF weights, fitted by likelihood on natural throws (seeds 101/201) and checked on 301/401. */
const PATH_PICK = 0.2;
const CATCH_PICK = 1.75;
/** DEF_BELIEF: how much of the target's motion a defender on him carries over his blind time (engine-40 probe). */
const PHASE_MEAN = 0.5;
/** DEF_BELIEF: the catch has to survive the defender who arrives just after the ball (CATCH_SECURE's securing
 * window, 0.12-0.45 s): his belief of that window and of how often such a defender gets it out (the receiver's hands
 * and contested-catch skill set how well he holds on; the window's grip strengthens as it goes, hence 0.65). */
const SECURE_T = 0.3;
const DISLODGE = 0.5;
/** HOT_LOOK: head-and-eye turn rate to a new target (an assumed 400 deg/s; sport head turns peak at 300-600). */
const HEAD_RATE = 400 * Math.PI / 180;
/** QB_HEAD (experimental, off; QB_HEAD=1; Integration's go 2026-11-16, Defense's zone trace): his head turns to where
 * he wants to look at the shared head's rate within the shared neck range (head.ts's turnHead, the one head model), and
 * his picture is taken along where his head points, not at the point he wants. Off, his head is set to his gaze point
 * every tick, so it jumped between reads in a tick and the zone defenders who lean on his eyes stepped with it. The
 * hot look's timed turn (HEAD_RATE, 400 deg/s) is a double count under it and comes out: his eyes are there when his
 * head is, then the glance. */
const QB_HEAD = process.env.QB_HEAD === '1';

export class QBPass implements Behavior {
  readonly kind = 'qb-pass';
  private phase: 'snap' | 'drop' | 'set' | 'windup' = 'snap';
  private readonly snapAt: number;
  private drop: { x: number; time: number };
  private dropY: number;
  private reads: Agent[] = [];
  private readIdx = 0;
  /** Diagnostics only (no effect on play): set by a probe, the window records each defender's believed arrival margin. */
  marginProbe = false;
  marginLast: any[] | null = null;
  /** Diagnostics only (no effect on play): the first hot alarm, the hot path's source and its pick. */
  alarmAt: number | null = null;
  alarmAges: (number | null)[] | null = null;
  hotLooks = 0;
  hotNone = 0;
  /** HOT_LOOK: the look under way to a hot target: eyes arrive at eyesAt, the man is taken in at seenAt. */
  /** Diagnostics only: his bar this tick, and the throw as started. */
  private barNow: { t: number; u: number; urgency: number; clock: number; thr: number; maxInt: number; thr0: number; max0: number } | null = null;
  throwRec: Record<string, unknown> | null = null;
  /** The hot path's best option this tick, below the bar or not (for the no-throw hook). */
  private lastHotBest: ThrowEval | null = null;
  private noThrowSince = -1;
  private noThrowLast = -99;
  private look: { target: Agent; from: Vec2; eyesAt: number; seenAt: number; glance?: number } | null = null;
  hotPick: { t: number; slot: string; alarmAt: number | null; looked: number; onRead: boolean; facingOff: number; gazeOff: number; P: number; intRisk: number } | null = null;
  private readStart = -1;
  private setAt = -1;
  private pending: ThrowEval | null = null;
  /** Diagnostic record (no effect): the point and flight time the last release was thrown to (test staging records it). */
  releaseRec: { aim: Vec3; T: number } | null = null;
  /** PlaySetup.stagedThrow: true while the staged throw starts. */
  private staging = false;
  private releaseAt = 0;
  /** The load he would use now: shortened (a flick) when he feels a hit coming
   * before a full motion could finish. */
  private plannedLoad = -1;
  /** How much of the load the throw in progress gave up (0 full motion, 1 none). */
  private flick = 0;
  /** SET_DECIDE: throws the read logic offered that he could not finish (diagnostic count). */
  noFinish = 0;
  /** SET_DECIDE: the direction he is moving in, held until moveUntil. */
  private moveDir: Vec2 | null = null;
  /** QB_GATHER: the read his current hitch is to, and where it takes his feet. */
  private hitchFor: Agent | null = null;
  /** QB_FOOTWORK bit 1: each read's installed step, from the plan (Rules + Coaching's hand-over, #780: `n`, 0 the set,
   * 1 the first hitch, 2 the second; reads on one look, a keyed high-low or mesh's two crossers, share an `n`). The
   * plan says which step; he times it from his own drop: step n lands n strides after his set (`beat`). */
  private readStep = new Map<Agent, number>();
  private stepOf = { get: (r: Agent | undefined): { n: number; beat: number } | undefined => {
    const n = r ? this.readStep.get(r) : undefined;
    return n === undefined ? undefined : { n, beat: n * this.stride() };
  } };
  private landedSteps = 0;
  private step: { n: number; to: Vec2; since: number; landed: boolean } | null = null;
  /** THROW_PLATFORM diagnostics (no effect): what his motion added to the last release. */
  platformRec: { sigma: number; flick: number; speed: number } | null = null;
  /** QB_POCKET: the slide under way, the felt distance of each body at his last slide off it, and diagnostics (no
   * effect): the first classification of the nearest body inside POCKET_NEAR on this dropback, and each slide. */
  private slide: { to: Vec2; until: number } | null = null;
  private slidAt = new Map<Agent, number>();
  pocketFirst: { t: number; where: 'edge' | 'front'; inHands: boolean; dist: number } | null = null;
  readonly slideLog: Array<{ t: number; dist: number; toRead: boolean; inHands: boolean; by: string; from: Vec2; end?: { t: number; why: 'there' | 'lapsed' | 'closed'; moved: number } }> = [];
  private hitchTo: Vec2 | null = null;
  private moveUntil = -1;
  /** THROW_BODY: whether this throw's load has met a hold (the pin is rolled once). */
  private pinRolled = false;
  /** SHOULDERS_SET: the read his feet are set to, the read his eyes are on and since when, and the throw's turn. */
  private shoulderRead: Agent | null = null;
  private eyesRead: Agent | null = null;
  private eyesAt = 0;
  private turnFrom = 0;
  private turnT = 0;
  private motionAt = -1;
  /** Whether the throw in progress has had its last look at the plant. */
  private rechecked = false;
  private underPressure = 0;
  private readonly clock: number;
  private readonly armSpeed: number;
  private fakeUntil = 0;
  /** Diagnostics: when his play-action fake ended (null until then, or no fake). */
  fakeEndAt: number | null = null;
  private readonly mind: QBMind;
  /** Look-off: eyes on a decoy to move the safety before the first read. */
  private lookOff: { until: number; decoy: Agent } | null = null;
  private lookOffChecked = false;
  private readonly receiverForecasts = new Map<Agent, ReceiverForecast>();
  /** READ_PLAN: the installed plan this play runs (null: the hand-written progression). */
  private plan: { style: string; key: { low: Agent; high: Agent; cueBy: number; deep: boolean; role: string; man: Agent | null; sits?: Agent | null } | null; triangle: Agent[] | null; alert: Agent | null; outlet: Agent | null; peek: boolean } | null = null;
  /** READ_PLAN: the key read once made (diagnostic): the defender he read (null: none in the stretch), where he
   * put him between the low (0) and high (1) routes, and the throw it gave. */
  keyRead: { at: number; defender: string | null; s: number | null; throwTo: 'low' | 'high' } | null = null;
  private triDone = false;
  /** READ_PLAN vertical peek: when every vertical was 12 yd deep (the squeeze can show), -1 before. */
  private peekDeclared = -1;
  /** BLITZ_READ: his hot call (the man his eyes went to, when), and since when he has seen a free rusher. */
  private hot: { target: Agent | null; at: number } | null = null;
  private hotSeenAt: number | null = null;
  /** BLITZ_READ: his rush belief on each defender off the line (0..1) and where he stood at the snap. */
  private rushB = new Map<Agent, { p: number; prior: number; from: Vec2 }>();
  /** BLITZ_READ: believed rushers beyond his protection's count (linemen, plus his rush belief on the rest, less his
   * blockers), as of his last update. */
  private rushExcess = 0;
  /** BLITZ_SKILL: the protection call as he knows it (the defenders it has a blocker for at the snap), his believed
   * free threat (the earliest believed free arrival), its urgency, and his confirmation look at the vacated seat. */
  private callSet: Set<Agent> | null = null;
  private freeThreat: { d: Agent; p: number; arr: number } | null = null;
  private freeU = 0;
  private confirm: { at: Vec2; until: number } | null = null;
  /** BLITZ_SKILL: how much believed pressure narrows him (0 for a composed QB). */
  private narrow(a: Agent): number { return BLITZ_SKILL ? this.freeU * (1 - a.r('composure')) : 0; }
  /** BLITZ_READ: a defender's rush belief, 0 if he is not tracked (linemen: the protection counts them). */
  private rushOf(d: Agent): number { return this.rushB.get(d)?.p ?? 0; }
  /** BLITZ_READ: update his rush belief from his felt picture. A defender's prior comes from his alignment at the
   * snap: on the line off the ball 0.45, in the box 0.25, on its edge 0.3, elsewhere 0.03. Each yard he moves toward
   * the quarterback from that spot adds to it, each yard he drops or widens takes it away, so a man who shows and
   * bails loses it as his position reverses; position in the felt picture is right to 0.2-0.3 yd while speed lags. His
   * belief follows the evidence at a rate set by his awareness, so a poor reader acts on a stale one. */
  private updateRush(a: Agent, sim: PlaySim): void {
    const dir = sim.attackDir(a.team), DLINE = ['DE', 'DT', 'NT', 'EDGE'];
    const tau = 0.1 + 0.4 * (1 - a.r('awareness')), k = Math.min(1, sim.dt / tau);
    let lineMen = 0, believed = 0;
    // BLITZ_SECOND: his picture of the back now (a teammate's picture, the same moment as the defenders' felt ones), and
    // whether the back is out on a release (moving away from him).
    const rb = BLITZ_SECOND ? sim.slot('RB') : null;
    const back = rb ? sim.see(a, rb) : null;
    const backOut = !!back && ((back.pos.x - a.pos.x) * back.vel.x + (back.pos.y - a.pos.y) * back.vel.y) > 0 && Math.hypot(back.vel.x, back.vel.y) > 1.5;
    // Where the released back is going: his forecast half a second on (his installed release), else his picture carried on.
    const backAhead = rb && backOut ? this.receiverForecasts.get(rb)?.predict(sim.t, 0.5) ?? { x: back!.pos.x + back!.vel.x * 0.5, y: back!.pos.y + back!.vel.y * 0.5 } : null;
    for (const d of sim.defense) {
      // A man he sees on the ground is out of the count (his felt picture's pose, not the man's true state).
      const fd = this.felt(a, sim, d);
      if (fd.pose === 'down') continue;
      if (DLINE.includes(d.player.position)) { lineMen++; continue; }
      const p = fd.pos;
      let r = this.rushB.get(d);
      if (!r) {
        const depth = (p.x - sim.los) * dir, wide = Math.abs(p.y - sim.ballY);
        const prior = BLITZ_DEPTH ? rushPrior(depth, wide, d.player.position === 'LB')
          : depth <= 1.5 && wide <= 9.5 ? 0.45 : depth <= 6 && wide <= 5.5 ? 0.25 : depth <= 2.5 && wide <= 9.5 ? 0.3 : 0.03;
        r = { p: prior, prior, from: { ...p } }; this.rushB.set(d, r);
      }
      const tx = a.pos.x - r.from.x, ty = a.pos.y - r.from.y, tl = Math.hypot(tx, ty) || 1;
      let toward = ((p.x - r.from.x) * tx + (p.y - r.from.y) * ty) / tl;
      // BLITZ_DEPTH: a step at him counts as a rush only at or past the line (1 yd off it), where a run fitter or a
      // coverage player stops; above it, a quarter of it (a backer filling on a fake, a man coming up on a route).
      if (BLITZ_DEPTH && toward > 0 && (p.x - sim.los) * dir > 1) toward *= 0.25;
      // BLITZ_SECOND: whose path is he on? Toward where the released back is going (a man on the back), or at the
      // quarterback. Recognition: it is updated only from a fresh picture of the man, and once made it holds until
      // his path changes past a margin (enter and exit on opposite sides).
      if (BLITZ_SECOND) {
        const prev = this.pathOf.get(d) ?? 'rush';
        let cls = prev;
        const sp = Math.hypot(fd.vel.x, fd.vel.y);
        const near = backAhead ? [backAhead] : [];
        if (near.length && sp > 1 && this.mind.pictureAge(d) <= PATH_FRESH) {
          const ang = (x: number, y: number) => Math.abs(Math.atan2(fd.vel.x * y - fd.vel.y * x, fd.vel.x * x + fd.vel.y * y));
          const toQb = ang(a.pos.x - p.x, a.pos.y - p.y), toBack = Math.min(...near.map((q) => ang(q.x - p.x, q.y - p.y)));
          if (prev === 'rush' && toBack < toQb - PATH_MARGIN) cls = 'follow';
          else if (prev === 'follow' && toQb < toBack - PATH_MARGIN) cls = 'rush';
        } else if (!near.length) cls = 'rush'; // nobody released near him (his man stays in): a man who comes is a rusher
        this.pathOf.set(d, cls);
        if (cls === 'follow' && toward > 0) toward = 0;
      }
      const target = logistic(Math.log(r.prior / (1 - r.prior)) + 2.5 * toward);
      r.p += (target - r.p) * k;
      if (this.seenTied(a, sim, d, p)) r.p = Math.min(r.p, 0.5);
      believed += r.p;
    }
    const coord = sim.offense.map((o) => (o.behavior as unknown as { coord?: { protectors: Agent[]; assigned?: Map<Agent, Agent | null> } }).coord).find((c) => c?.protectors);
    // QB_CALL_ROUTES: his protection count is the call's, taken once (the snap), not the live protector list.
    const blockers = QB_CALL_ROUTES ? (this.callBlockers ??= coord ? coord.protectors.length : 5) : coord ? coord.protectors.length : 5;
    this.rushExcess = lineMen + believed - blockers;
    if (BLITZ_SKILL) {
      // The call he knows: who has a blocker at the snap (read once, as his protection call; not the rep's later truth).
      if (!this.callSet) this.callSet = new Set([...(coord?.assigned?.values() ?? [])].filter((x): x is Agent => !!x));
      let best: { d: Agent; p: number; arr: number } | null = null, u = 0;
      for (const [d, r] of this.rushB) {
        if (this.callSet.has(d) || r.p < 0.15) continue;
        const f = this.felt(a, sim, d);
        if (f.pose === 'down') continue;
        // The body he believes the man has; he does not know how tired the man is.
        const arr = timeToReach({ pos: f.pos, vel: f.vel, profile: this.bodyOf(a, d), speedScale: 1 }, a.pos, 0.8);
        const ud = r.p * clamp((2.2 - arr) / 1.4, 0, 1);
        if (ud > u) { u = ud; best = { d, p: r.p, arr }; }
      }
      this.freeThreat = best; this.freeU = u;
    }
  }
  /** BLITZ_READ diagnostics: the last defender he saw trigger (position:behaviour:read). */
  /** QB_EYES: the man his eyes are on, and since when. */
  private eyesOn: Agent | null = null;
  private eyesOnAt = 0;

  /** Existing private state only; never evaluates a fresh throw window. */
  recordedState(): Omit<NonNullable<ReplayTelemetryFrame['qb']>, 'eyes' | 'belief' | 'best'> {
    const p = this.pending;
    return { phase: this.phase, read: this.reads[this.readIdx]?.idx ?? null, pressure: this.underPressure,
      pending: p ? { target: p.target.idx, point: [p.point.x, p.point.y, p.point.z], flightTime: p.T,
        completion: p.P, interceptionRisk: p.intRisk, value: p.value } : null };
  }

  constructor(
    a: Agent,
    private readonly sim: PlaySim,
    private readonly concept: PassConcept,
    receiverPriors: ReadonlyMap<Agent, InstalledReceiverRoute>,
  ) {
    const gun = sim.offCall.formation.qb !== 'under';
    // GUN_SNAP: his drop starts when the snap is secured in his hands.
    this.snapAt = plannedSnapAt(gun, a.pos, { x: sim.los, y: sim.ballY });
    this.drop = dropSpec(concept.drop, a.pos.x, sim.los, gun);
    this.dropY = a.pos.y;
    this.clock = 2.5 + 1.0 * a.r('composure') + 0.6 * a.r('pocketPresence') + sim.dice('qb', a).normal(0, 0.25);
    this.armSpeed = qbArmSpeed(a.player.ratings.throwPower);
    // QB_FOOTWORK bit 16: the fake is held to the measured mesh plus half its ride (BDB 2025 play action,
    // scripts/diag/eyes/nfl_pa_ride.py: gun mesh at 1.2 s after the snap, ridden 0.5 s; under center at 1.4 s, ridden
    // 0.2 s), not an absolute 0.7 s that in the gun left a 0.2 s turn after he had the ball (nobody bites on that).
    if (concept.family === 'playaction') this.fakeUntil = plannedFakeEnd(gun);
    this.mind = sim.qbMind;
    for (const [r, prior] of receiverPriors) this.receiverForecasts.set(r, new ReceiverForecast(a, prior, sim.dt));
    this.mind.receiverAt = (r) => this.receiverForecasts.get(r)?.predict(sim.t, 0) ?? null;
  }

  /** Called after all behaviors are assigned (receivers exist). */
  init(sim: PlaySim): void {
    if (READ_PLAN && !compilingPlan() && this.initPlan(sim)) {
      this.reads = this.orderReads(sim, this.reads);
      return;
    }
    const refs = this.concept.progression;
    const seen = new Set<Agent>();
    for (const ref of refs) {
      const r = this.receiverFor(sim, ref);
      if (r && (QB_CALL_ROUTES ? this.receiverForecasts.has(r) : r.behavior.passOption) && !seen.has(r)) {
        this.reads.push(r);
        seen.add(r);
      }
    }
    // Anyone else running a route is a late option (not on a screen: the
    // other routes clear coverage).
    if (this.concept.family !== 'screen') for (const o of sim.offense) {
      if (!seen.has(o) && (QB_CALL_ROUTES ? this.receiverForecasts.has(o) : o.behavior instanceof RouteRunner)) {
        this.reads.push(o);
        seen.add(o);
      }
    }
    this.reads = this.orderReads(sim, this.reads);
  }

  /** READ_PLAN: reads from the installed plan: the alert, the plan's order, any other route, the outlet last. */
  private initPlan(sim: PlaySim): boolean {
    const p = installedPlan(this.concept, sim.offCall.formation.id);
    if (!p) return false;
    const ag = (ref: ReceiverRef | null) => {
      const r = ref ? this.receiverFor(sim, ref) : null;
      return r && (QB_CALL_ROUTES ? this.receiverForecasts.has(r) : r.behavior.passOption) ? r : null;
    };
    const seen = new Set<Agent>(), reads: Agent[] = [];
    const push = (r: Agent | null) => { if (r && !seen.has(r)) { reads.push(r); seen.add(r); } };
    const alert = ag(p.alert);
    push(alert);
    for (const ref of p.order) push(ag(ref));
    const outlet = ag(p.outlet);
    for (const o of sim.offense) if (o !== outlet && (QB_CALL_ROUTES ? this.receiverForecasts.has(o) : o.behavior instanceof RouteRunner)) push(o);
    push(outlet);
    if (!reads.length) return false;
    this.reads = reads;
    const low = ag(p.key?.low ?? null), high = ag(p.key?.high ?? null);
    const tri = p.triangle?.map(ag).filter((r): r is Agent => !!r) ?? null;
    const peek = p.style === 'vertical_peek';
    // DECLARED_BREAK: what the plan says of each read's break (route time, as installed) and how it is thrown.
    if (FW_STEPS) for (const rh of p.rhythm as { ref: ReceiverRef; step: string; n?: number }[]) {
      const r = ag(rh.ref);
      if (r && !this.readStep.has(r)) this.readStep.set(r, rh.n ?? (rh.step === 'set' ? 0 : rh.step === 'hitch' ? 1 : 2));
      // QB_FOOTWORK bit 8 with GRASS_READ: the plan's landing area, from the plan's frame to the field (his own call).
      const g = (rh as { grass?: { landing: { x: number; y: number }; t: number } }).grass;
      if (FW_GRASS && GRASS_FIELDS && r && g && !this.grassPlan.has(r)) {
        const dir = sim.attackDir(sim.qb.team), ss = sim.offAlign?.strongSign ?? 1;
        this.grassPlan.set(r, { x: sim.los + dir * g.landing.x, y: sim.ballY + ss * g.landing.y });
      }
    }
    if (DECLARED_BREAK) for (const rd of p.reads ?? []) { const r = ag(rd.ref); if (r) this.planReads.set(r, { breakAt: rd.breakAt, throwFamily: rd.throwFamily, anchorLead: rd.anchorLead }); }
    this.plan = { style: p.style, key: p.key && low && high ? { low, high, cueBy: p.key.cueBy, deep: p.key.role.startsWith('deep'), role: p.key.role, man: QB_KEY_MAN ? (QB_KEY_READ ? this.keyManShell(sim, p.key.role, low, high) : this.keyMan(sim, p.key.role, low, high)) : null,
      ...(QB_KEY_READ ? { sits: ag(((p.key as { sits?: ReceiverRef | null }).sits) ?? null) } : {}) } : null,
      triangle: tri && (peek ? tri.length >= 2 : tri.length === 3) ? tri : null, alert, outlet, peek };
    return true;
  }

  /** READ_PLAN key: the defender in the stretch between the low and high routes, from his own pictures (acquired
   * by looking there, with their age), placed along the line from the low route (0) to the high one (1) where he
   * is heading; playing the high route (0.5 or more) gives the low throw, the low one the high throw. His
   * decision-making and awareness set how cleanly he places him. */
  /** QB_KEY_THROW: the man his key read gave, and when. */
  private keyAnswer: { target: Agent; toHigh: boolean; at: number } | null = null;
  /** BLITZ_SECOND: his classification of each off-ball defender's path. */
  private pathOf = new Map<Agent, 'rush' | 'follow'>();
  /** BLITZ_READ diagnostic (no effect): the defender his hot was called on. */
  hotDef: Agent | null = null;
  /** QB_KEY_THROW diagnostic (no effect): throws to the answer while he was holding on it. */
  keyThrows = 0;

  /** QB_KEY_MAN: the defender a role names, picked from the alignment before the snap (everyone is in view then). */
  private keyMan(sim: PlaySim, role: string, low: Agent, high: Agent): Agent | null {
    const dir = sim.attackDir(sim.qb.team), midY = (low.pos.y + high.pos.y) / 2, side = Math.sign(midY - sim.ballY) || 1;
    const D = sim.defense.map((d) => ({ d, depth: (d.pos.x - sim.los) * dir, out: (d.pos.y - sim.ballY) * side, y: d.pos.y }));
    const best = (S: typeof D, cost: (x: typeof D[number]) => number) => S.reduce<typeof D[number] | null>((b, x) => (!b || cost(x) < cost(b) ? x : b), null)?.d ?? null;
    if (/corner/.test(role)) return best(D.filter((x) => x.depth <= 10 && x.out > 0), (x) => -x.out);
    if (/apex|flat/.test(role)) return D.filter((x) => x.depth <= 8 && x.out > 0).sort((x, y) => y.out - x.out)[1]?.d ?? null;
    // The hook player is an inside second-level defender: nearest the ball, on the key's side of it when there is one.
    if (/hook/.test(role)) return best(D.filter((x) => x.depth >= 2.5 && x.depth <= 8), (x) => Math.abs(x.y - sim.ballY) + (role !== 'middle_hook' && x.out < 0 ? 2 : 0));
    if (/safety|deep/.test(role)) return best(D.filter((x) => x.depth >= 8), (x) => Math.abs(x.y - (/over_vertical/.test(role) ? high.pos.y : sim.ballY)) - 0.1 * x.depth);
    return null;
  }

  /** QB_KEY_READ: the key man named pre-snap from the shell as he reads it, from his picture of the alignment. */
  private keySnap: Vec2 | null = null;
  private keyManShell(sim: PlaySim, role: string, low: Agent, high: Agent): Agent | null {
    const qb = sim.qb, dir = sim.attackDir(qb.team), midY = (low.pos.y + high.pos.y) / 2, side = Math.sign(midY - sim.ballY) || 1;
    // Coverage players in his picture: off the ball, or detached wide. A man on the line in a stance is a rusher.
    const D = sim.defense.map((d) => { const p = sim.see(qb, d).pos; return { d, p, depth: (p.x - sim.los) * dir, out: (p.y - sim.ballY) * side, y: p.y }; })
      .filter((x) => x.depth >= 2 || Math.abs(x.y - sim.ballY) > 9);
    const best = (S: typeof D, cost: (x: typeof D[number]) => number) => S.reduce<typeof D[number] | null>((b, x) => (!b || cost(x) < cost(b) ? x : b), null);
    let pick: typeof D[number] | null = null;
    if (/corner/.test(role)) pick = best(D.filter((x) => x.depth <= 10 && x.out > 0), (x) => -x.out);
    else if (/apex|flat/.test(role)) {
      const side = D.filter((x) => x.depth <= 10 && x.out > 0).sort((x, y) => y.out - x.out);
      const corner = side[0] ?? null, twoHigh = this.mind.pSingleHigh() < 0.5;
      // Two-high with a hard corner: the corner is the flat player. Otherwise the overhang, the next man inside him.
      pick = corner && twoHigh && corner.depth <= 6 ? corner : side[1] ?? null;
    } else if (/hook/.test(role)) pick = best(D.filter((x) => x.depth >= 2.5 && x.depth <= 8), (x) => Math.abs(x.y - sim.ballY) + (role !== 'middle_hook' && x.out < 0 ? 2 : 0));
    else if (/safety|deep/.test(role)) pick = best(D.filter((x) => x.depth >= 8), (x) => Math.abs(x.y - (/over_vertical/.test(role) ? high.pos.y : sim.ballY)) - 0.1 * x.depth);
    this.keySnap = pick ? { ...pick.p } : null;
    return pick?.d ?? null;
  }
  /** QB_KEY_READ: the key man's displacement along the stretch since the snap, in his picture (null with no fresh one). */
  private keyDisp(a: Agent, sim: PlaySim): number | null {
    const k = this.plan!.key!;
    if (!k.man || !this.keySnap) return null;
    const at = (r: Agent, ahead: number) => this.receiverForecasts.get(r)?.predict(sim.t, ahead) ?? null;
    const lo = at(k.low, 0.2), hi = at(k.high, 0.6);
    const p = this.mind.routeKeyPictures().find((x) => x.id === k.man!.player.id && x.age <= 0.8);
    if (!p || !lo || !hi) return null;
    const sx = hi.x - lo.x, sy = hi.y - lo.y, L = Math.max(1, Math.hypot(sx, sy));
    return ((p.pos.x - this.keySnap.x) * sx + (p.pos.y - this.keySnap.y) * sy) / L;
  }
  /** QB_KEY_READ: where the key man stands along the low-high stretch now in his picture (0 low, 1 high). */
  private keyPlace(sim: PlaySim): number | null {
    const k = this.plan!.key!;
    if (!k.man) return null;
    const at = (r: Agent, ahead: number) => this.receiverForecasts.get(r)?.predict(sim.t, ahead) ?? null;
    const lo = at(k.low, 0.2), hi = at(k.high, 0.6);
    const p = this.mind.routeKeyPictures().find((x) => x.id === k.man!.player.id && x.age <= 0.8);
    if (!p || !lo || !hi) return null;
    const sx = hi.x - lo.x, sy = hi.y - lo.y, L2 = Math.max(1, sx * sx + sy * sy);
    return ((p.pos.x - lo.x) * sx + (p.pos.y - lo.y) * sy) / L2;
  }
  private keyFlipped = false;
  private readKeyShell(a: Agent, sim: PlaySim): void {
    const k = this.plan!.key!;
    const d = this.keyDisp(a, sim);
    const noise = 0.15 + 0.4 * (1 - a.r('decisionMaking')) + 0.15 * (1 - a.r('awareness'));
    const m = d === null ? null : d + sim.dice('readkey', a).normal(0, noise);
    // Where he stands along the stretch now (0 the low route, 1 the high), for a man who has not moved: one standing on
    // a route has taken it (Rules: "throw the route he is not standing on"; smash's squatting corner, already on the
    // hitch, gives the corner route). Only a man between them gets the concept's sitter default. Bands chosen.
    const sNow = this.keyPlace(sim);
    let throwTo: 'low' | 'high', mode: string;
    if (m !== null && Math.abs(m) >= KEY_COMMIT) { throwTo = m > 0 ? 'low' : 'high'; mode = 'move'; }
    else if (sNow !== null && sNow <= KEY_ON_ROUTE) { throwTo = 'high'; mode = 'on-low'; }
    else if (sNow !== null && sNow >= 1 - KEY_ON_ROUTE) { throwTo = 'low'; mode = 'on-high'; }
    else if (k.sits === k.high) { throwTo = 'high'; mode = 'sits'; }
    else { throwTo = 'low'; mode = k.sits === k.low ? 'sits' : 'role'; }
    this.keyRead = { at: sim.t, defender: k.man?.player.id ?? null, s: m === null ? null : +m.toFixed(3), throwTo, mode } as typeof this.keyRead;
    this.applyKey(sim, throwTo);
  }
  /** QB_KEY_READ: once made the read stands; it changes once, on a perceived move past the margin the other way. */
  private rekey(a: Agent, sim: PlaySim): void {
    if (this.keyFlipped || !this.keyRead || this.phase === 'windup' || !this.keyAnswer) return;
    const d = this.keyDisp(a, sim);
    if (d === null) return;
    const now = this.keyRead.throwTo;
    const flip = now === 'low' ? d <= -KEY_COMMIT : d >= KEY_COMMIT;
    if (!flip) return;
    this.keyFlipped = true;
    const to = now === 'low' ? 'high' : 'low';
    this.keyRead = { ...this.keyRead, throwTo: to, at: sim.t } as typeof this.keyRead;
    this.applyKey(sim, to);
  }
  private applyKey(sim: PlaySim, throwTo: 'low' | 'high'): void {
    const k = this.plan!.key!;
    const first = throwTo === 'low' ? k.low : k.high, second = first === k.low ? k.high : k.low;
    this.reads = [first, second, ...this.reads.filter((r) => r !== first && r !== second)];
    this.readIdx = 0;
    this.readStart = sim.t;
    this.keyAnswer = { target: first, toHigh: throwTo === 'high', at: sim.t };
  }

  private readKey(a: Agent, sim: PlaySim): void {
    const k = this.plan!.key!;
    if (QB_KEY_READ && QB_KEY_MAN) { this.readKeyShell(a, sim); return; }
    if (QB_KEY_MAN) {
      // The named man, as his picture has him now. No fresh picture, or nobody named: no key read; the order stands.
      const at = (r: Agent, ahead: number) => this.receiverForecasts.get(r)?.predict(sim.t, ahead) ?? null;
      const lo = at(k.low, 0.2), hi = at(k.high, 0.6);
      const p = k.man ? this.mind.routeKeyPictures().find((x) => x.id === k.man!.player.id && x.age <= 0.8) : null;
      if (!p || !lo || !hi) { this.keyRead = { at: sim.t, defender: null, s: null, throwTo: 'low' }; return; }
      const sx = hi.x - lo.x, sy = hi.y - lo.y, L2 = Math.max(1, sx * sx + sy * sy);
      const q = { x: p.pos.x + p.vel.x * 0.3, y: p.pos.y + p.vel.y * 0.3 };
      const noise = 0.06 + 0.2 * (1 - a.r('decisionMaking')) + 0.08 * (1 - a.r('awareness'));
      const z = sim.dice('readkey', a).normal(0, noise);
      const s = clamp(((q.x - lo.x) * sx + (q.y - lo.y) * sy) / L2, -0.25, 1.75) + z;
      // What he reads is the man's movement: going to the high route (sinking) gives the low man, coming down on the
      // low route (jumping it) gives the high man. A man who is not moving along the stretch is read by where he stands.
      const along = (p.vel.x * sx + p.vel.y * sy) / Math.sqrt(L2) + z * KEY_MOVE_NOISE;
      const throwTo = Math.abs(along) >= KEY_MOVE ? (along > 0 ? 'low' : 'high') : s >= 0.5 ? 'low' : 'high';
      this.keyRead = { at: sim.t, defender: p.id, s: +s.toFixed(3), throwTo };
      const first = throwTo === 'low' ? k.low : k.high, second = first === k.low ? k.high : k.low;
      this.reads = [first, second, ...this.reads.filter((r) => r !== first && r !== second)];
      this.readIdx = 0;
      this.readStart = sim.t;
      this.keyAnswer = { target: first, toHigh: throwTo === 'high', at: sim.t };
      return;
    }
    // The stretch is where the two routes are going (he knows the installed routes): the high route about half a
    // second on, so a route that has not yet broken is placed where it is headed, not on its stem.
    const at = (r: Agent, ahead: number) => this.receiverForecasts.get(r)?.predict(sim.t, ahead) ?? null;
    const lo = at(k.low, 0.2), hi = at(k.high, 0.6);
    const dir = sim.attackDir(a.team);
    let found: { id: string; s: number; d: number } | null = null;
    if (lo && hi) {
      const sx = hi.x - lo.x, sy = hi.y - lo.y, L2 = Math.max(1, sx * sx + sy * sy);
      for (const p of this.mind.routeKeyPictures()) {
        if (p.age > 0.8) continue;
        const q = { x: p.pos.x + p.vel.x * 0.3, y: p.pos.y + p.vel.y * 0.3 };
        const s = clamp(((q.x - lo.x) * sx + (q.y - lo.y) * sy) / L2, -0.25, 1.75);
        const d = Math.hypot(q.x - (lo.x + s * sx), q.y - (lo.y + s * sy));
        // A deep key (the defender over a vertical) is over the top of the high route, past its end of the line,
        // and deeper than the low route: an underneath defender there is not the key (a linebacker taken for it at
        // the low end, then carrying the in-breaker, was a misread that gave interceptions on drive).
        if (k.deep && (q.x - lo.x) * dir < 2) continue;
        if (d < (k.deep ? 5 : 4) && s <= (k.deep ? 1.6 : 1) && (!found || d < found.d)) found = { id: p.id, s, d };
      }
    }
    if (!found) {
      this.keyRead = { at: sim.t, defender: null, s: null, throwTo: 'low' };
      return;
    }
    const noise = 0.06 + 0.2 * (1 - a.r('decisionMaking')) + 0.08 * (1 - a.r('awareness'));
    const s = found.s + sim.dice('readkey', a).normal(0, noise);
    const throwTo = s >= 0.5 ? 'low' : 'high';
    this.keyRead = { at: sim.t, defender: found.id, s: +s.toFixed(3), throwTo };
    const first = throwTo === 'low' ? k.low : k.high, second = first === k.low ? k.high : k.low;
    this.reads = [first, second, ...this.reads.filter((r) => r !== first && r !== second)];
    this.readIdx = 0;
    this.readStart = sim.t;
  }

  /**
   * Where to start, from what he believes pre-snap: against a pressure look
   * the hot (quickest) route comes first; against man he starts with his best
   * matchup; otherwise the concept's progression. A wrong belief sends him to
   * the wrong place first.
   */
  private orderReads(sim: PlaySim, reads: Agent[]): Agent[] {
    const out = [...reads];
    if (out.length < 2) return out;
    const m = this.mind;
    const bt = (r: Agent) => this.breakClock(r);
    if (m.blitzExpected) {
      const hot = out.slice(0, 4).reduce((b, r) => (bt(r) < bt(b) ? r : b));
      return [hot, ...out.filter((r) => r !== hot)];
    }
    if (m.pMan() > 0.6) {
      const score = (r: Agent) => {
        let d: Agent | null = null;
        let dd = Infinity;
        const rp = this.has(sim, r);
        for (const o of sim.defense) {
          const op = QB_SEEN_REC ? m.estimate(o).pos : o.pos;
          const x = Math.hypot(op.x - rp.x, op.y - rp.y);
          if (x < dd) {
            dd = x;
            d = o;
          }
        }
        if (!d) return 0;
        // QB_BELIEVED_DEF: the defender's speed and man coverage as he believes them.
        const bel = QB_BELIEVED_DEF ? this.believe(sim.qb, d) : null;
        return 0.5 * r.r('routeRunning') + 0.25 * (r.profile.vmax - (bel ? bel.profile.vmax : d.profile.vmax)) - 0.5 * (bel ? bel.manCoverage : d.r('manCoverage')) + 0.15 * r.r('releaseVsPress');
      };
      const first3 = out.slice(0, 3);
      const best = first3.reduce((b, r) => (score(r) > score(b) ? r : b));
      if (best !== out[0] && score(best) - score(out[0]) > 0.12) return [best, ...out.filter((r) => r !== best)];
    }
    return out;
  }

  private receiverFor(sim: PlaySim, ref: ReceiverRef): Agent | null {
    const slot = sim.offAlign.numbering[ref];
    if (!slot) return null;
    return sim.slot(slot) ?? null;
  }

  /** Load: front hand off the ball, front shoulder to the target, the ball
   * drawn back (0.15-0.30 s, quicker with a better release). Delivery: the
   * stride, plant and arm to the release; front-foot plant to release is the
   * best-measured part of a throw (0.17-0.21 s). The visible motion is both,
   * about 0.4-0.5 s in NFL tracking (docs/reviews/2026-11-05-qb-throwing-motion.md). */
  private load(a: Agent): number {
    return 0.15 + 0.15 * (1 - a.r('release'));
  }

  private delivery(a: Agent): number {
    return 0.17 + 0.04 * (1 - a.r('release'));
  }

  private windup(a: Agent): number {
    return (this.plannedLoad >= 0 ? this.plannedLoad : this.load(a)) + this.delivery(a);
  }

  /** Under a hit he cuts the load short to get the ball out before it lands:
   * no full coil or step, so less on the ball and less control of it. The
   * delivery itself (plant to release) does not shorten. */
  private loadFor(a: Agent, hitIn: number): number {
    const full = this.load(a);
    return clamp(hitIn - 0.05 - this.delivery(a), Math.min(full, 0.05), full);
  }

  update(a: Agent, sim: PlaySim): MoveCommand {
    const t = sim.t;
    if (sim.carrier !== a) { if (QB_BREAK) a.carryPosture = null; return stand(); }
    if (QB_TICK_PICTURE) this.takePictures(a, sim);
    const facingDown = 0;
    // Wrapped up by a tackler he cannot start a throw (with only a hand on him he
    // still can); a throw already on its way comes out, wobbling.
    if (heldBy(a, sim) >= 0.6 && this.phase !== 'windup') return stand();

    // Eyes: what he looks at is what he sees; everything else is memory and belief.
    let gaze = this.gazePoint(sim);
    if (QB_HEAD) {
      // QB_HEAD: his head turns toward the gaze at its rate; what he sees is along where it points, at the gaze's range.
      const want = Math.atan2(gaze.y - a.pos.y, gaze.x - a.pos.x), range = Math.hypot(gaze.x - a.pos.x, gaze.y - a.pos.y);
      a.head = turnHead(a, a.head ?? a.body.facing, want, SHARED_HEAD_RATE * sim.dt);
      gaze = { x: a.pos.x + range * Math.cos(a.head), y: a.pos.y + range * Math.sin(a.head) };
    }
    this.mind.observe(gaze);
    // QB_BODY_SEEN: his head shows where he is looking.
    if (!QB_HEAD) a.head = Math.atan2(gaze.y - a.pos.y, gaze.x - a.pos.x);
    const routeKeys = this.mind.routeKeyPictures();
    for (const [r, forecast] of this.receiverForecasts) {
      const picture = this.mind.receiverLook(r, gaze);
      if (picture) forecast.acquire(picture);
      if (forecast.prior.read) forecast.readKeys(routeKeys);
    }
    if (this.mind.justIdentified && this.readIdx === 0) this.reads = this.orderReads(sim, this.reads);

    if (this.phase === 'snap') {
      if (t < this.snapAt) return stand(facingDown);
      this.phase = 'drop';
      this.dropStartX = a.pos.x;
    }
    // BLITZ_READ: his rush belief, from the snap on, through his drop.
    if (BLITZ_READ && this.phase !== 'windup' && t <= this.snapAt + 2.5) {
      this.updateRush(a, sim);
      if (BLITZ_SKILL ? (this.freeThreat?.p ?? 0) >= 0.5 : this.rushExcess > 0.5) this.hotSeenAt ??= t; else if (!this.hot) this.hotSeenAt = null;
    }

    if (this.phase === 'windup') {
      // THROW_BODY: a hold taken in the load can pin the arm. It matters at the
      // moment the arm must come forward (the delivery's start), with the hold
      // as it is then; a hold taken once the arm is moving cannot stop it.
      // THROW_HOLD: from the delivery's start to the release, a hold on his upper body that reaches what his arm can
      // drive stops the arm coming forward: the ball stays in his hand and the hold rules. No roll.
      if (THROW_HOLD && this.pending && sim.deliveryAt >= 0 && t >= sim.deliveryAt) {
        const load = throwLoad(a, sim), d = Math.min(1, load.ratio);
        sim.throwDisturb = Math.max(sim.throwDisturb, d);
        sim.throwPull = { x: load.dir.x * sim.throwDisturb, y: load.dir.y * sim.throwDisturb };
      }
      if (THROW_HOLD && this.pending && sim.deliveryAt >= 0 && t >= sim.deliveryAt && throwHold(a, sim) >= 1) {
        this.phase = 'set'; this.pending = null; this.pendingSpot = null; this.readStart = t;
        sim.windupAt = -1; sim.deliveryAt = -1; sim.windupEndAt = t;
        sim.event('throw_held', a);
        return stand();
      }
      if (!THROW_HOLD && THROW_BODY && this.pending && !this.pinRolled && sim.deliveryAt >= 0 && t >= sim.deliveryAt) {
        this.pinRolled = true;
        const pin = throwInterference(a, sim);
        if (pin > 0) {
          if (sim.dice('throw', a).chance(pin)) {
            this.phase = 'set'; this.pending = null; this.pendingSpot = null; this.readStart = t;
            sim.windupAt = -1; sim.deliveryAt = -1; sim.windupEndAt = t;
            return stand();
          }
        }
      }
      // Last look at the plant, before the arm is committed: the throw as it
      // would now come out, re-aimed on the picture he has gained during the
      // load. If it has gone bad he pulls it down (a pump), paying the time;
      // a defender who broke on the load has already committed.
      if (this.pending && !this.rechecked && t >= this.releaseAt - this.delivery(a) - 1e-9) {
        this.rechecked = true;
        if (this.pullDown(a, sim, this.pending)) {
          this.phase = 'set';
          this.pending = null;
          this.readStart = t;
          sim.windupAt = -1;
          sim.deliveryAt = -1;
          sim.windupEndAt = t;
          sim.event('pump', a);
          return stand();
        }
      }
      if (t >= this.releaseAt && this.pending) {
        this.release(a, sim, this.pending);
        this.pending = null;
        return stand();
      }
      const facing = this.pending ? this.motionFacing(a, sim, this.pending) : facingDown;
      // Weight transfer: his weight starts toward the target with the load and
      // reaches stride speed as the front foot plants for the delivery.
      if (QB_BREAK && this.out && this.pending) {
        // On the move: he keeps going where he was going, gathered, with his shoulders to the target.
        const o = this.out, dx = o.dest.x - a.pos.x, dy = o.dest.y - a.pos.y, L = Math.hypot(dx, dy) || 1, v = OUT_THROW_PACE * a.profile.vmax;
        return { vel: { x: dx / L * v, y: dy / L * v }, facing };
      }
      if (this.pending) {
        const loadTime = this.releaseAt - this.delivery(a) - this.motionAt;
        const s = STRIDE_SPEED * (1 - this.flick) * clamp((t - this.motionAt) / Math.max(loadTime, sim.dt), 0, 1);
        return { vel: { x: Math.cos(facing) * s, y: Math.sin(facing) * s }, facing };
      }
      return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing };
    }

    // QB_BREAK: out of the pocket with the ball up, his decisions are the out-of-pocket ones.
    if (QB_BREAK) {
      a.carryPosture = 'up';
      if (this.out) return this.outTick(a, sim);
    }

    const pressure = this.pressure(a, sim);
    this.plannedLoad = this.loadFor(a, pressure.time);
    if (pressure.time < 0.7 && pressure.agent) {
      if (!sim.stats.pressured && pressure.dist < 2.5) {
        sim.stats.pressured = true;
        sim.stats.hurriedBy = pressure.agent.player.id;
        sim.event('pressure', pressure.agent, a);
      }
    }

    // Test staging (PlaySetup.stagedThrow; never set in games): the test fixes when and to whom the throw starts. After
    // his pressure read, so a hurried load is the one he would have made.
    const staged = sim.stagedThrow;
    if (staged && t >= staged.at) {
      const r = sim.slot(staged.slot), ev = r ? this.evaluate(a, sim, r, 0) : null;
      if (r && ev) {
        sim.qbEyes = r;
        this.staging = true;
        const cmd = this.startThrow(a, sim, ev);
        this.staging = false;
        return cmd;
      }
    }

    if (this.phase === 'drop') {
      const target = { x: this.drop.x, y: this.dropY };
      const d = Math.hypot(target.x - a.pos.x, target.y - a.pos.y);
      // Play-action: sell the fake first.
      // BLITZ_SKILL: how long he sells the fake depends on how much time he believes he has: with a believed free
      // rusher coming (prior and update) he cuts it short and gets his eyes up; with none he rides the mesh. A QB
      // narrowed by believed pressure cuts it more.
      const fakeEnd = BLITZ_SKILL ? this.fakeUntil * (1 - clamp(0.6 * this.freeU + 0.3 * this.narrow(a), 0, 0.8)) : this.fakeUntil;
      if (this.fakeUntil > 0 && t >= fakeEnd && this.fakeEndAt === null) this.fakeEndAt = t;
      if (t < fakeEnd) {
        const rb = sim.slot('RB');
        if (rb) sim.presentHandoffFake(a, rb);
        // PA_DROP: under center the fake is carried on the drop (NFL QBs keep moving back through it: 1.9 -> 3.3 yd
        // behind the snap from 0.5 to 1.0 s); off, he slowed to the mesh point and re-started his drop from it.
        if (PA_DROP && sim.offCall.formation.qb !== 'gun') {
          // He carries it back on a line just off the back's track (0.6 yd away from it), not into him.
          const meshPt = rb ? { x: sim.los - 5.0, y: this.dropY - Math.sign(rb.pos.y - this.dropY || 1) * 0.6 } : target;
          return goTo(a, meshPt, { speed: 1, through: 1, facing: Math.PI / 2 * Math.sign(meshPt.y - a.pos.y || 1) });
        }
        const fakePt = rb ? { x: sim.los - 4.2, y: (a.pos.y + rb.pos.y) / 2 } : target;
        return goTo(a, fakePt, { speed: 0.6, facing: Math.PI / 2 * Math.sign(fakePt.y - a.pos.y || 1) });
      }
      // BLITZ_READ: a free rusher he has recognized ends the drop: he hits his back foot and throws hot.
      const hotNow = BLITZ_READ && this.hotSeenAt !== null && t - this.hotSeenAt >= this.processing(a);
      if (d < 0.4 || t > this.snapAt + this.drop.time + 0.4 || (pressure.time < 0.5 && t > this.snapAt + 0.4) || hotNow) {
        this.phase = 'set';
        this.setAt = t;
        this.readStart = t;
        // QB_FOOTWORK bit 2: his shoulders set at the plant, to the read he is on.
        if (FW_HIPS) this.shoulderOn = this.reads[this.readIdx] ?? this.reads[0] ?? null;
      } else {
        // Rhythm: on the last step of his drop he can already start his load,
        // so a timing throw comes out as he hits his set point rather than
        // after it. Same evaluation and thresholds as when set.
        // READ_PLAN key: read at its cue, from the drop; until then the low route is not thrown on rhythm.
        if (READ_PLAN && this.plan?.key && !this.keyRead && t >= this.plan.key.cueBy) this.readKey(a, sim);
        const first = READ_PLAN && this.plan?.key && !this.keyRead ? undefined : this.reads[0];
        if (first && t >= this.snapAt + this.drop.time - this.load(a) && this.ready(first, sim)) {
          const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
          const ev = this.evaluate(a, sim, first, 0);
          if (ev && ev.P >= 0.6 - 0.12 * aggression && ev.intRisk <= 0.025 + 0.05 * aggression) {
            sim.qbEyes = first;
            this.setAt = t;
            return this.startThrow(a, sim, ev);
          }
        }
        // QBs who lock onto their first read give it away during the drop.
        if (a.r('decisionMaking') < 0.45) sim.qbEyes = this.reads[0] ?? null;
        const gun = sim.offCall.formation.qb !== 'under';
        // Drop: backpedal from gun, turn-and-drop from under center.
        let facing = gun ? 0 : Math.PI / 2.4;
        // QB_FOOTWORK bit 2, part 3: the coached crossover drop. His hips open side-on to his travel toward read 1's side
        // (his picture of the man) over the first third of the depth he gives, and hold; he squares in the hitch and the
        // windup. And the drop is paced to its time: he arrives at the set point at the drop's measured time (the distance
        // left over the time left), not at a sprint (ours was about 40% faster back than the NFL's at every share of a
        // short gun drop, docs/reviews/2026-11-15-drop-measurements.md).
        if (FW_HIPS && this.reads[0]) {
          const dirX = sim.attackDir(a.team), down = dirX > 0 ? 0 : Math.PI;
          const depthNow = (this.dropStartX - a.pos.x) * dirX, depthAll = Math.max(0.5, (this.dropStartX - this.drop.x) * dirX);
          const k = clamp(depthNow / (depthAll / 3), 0, 1), side = Math.sign(this.has(sim, this.reads[0]).y - a.pos.y) || 1;
          facing = down + side * k * Math.PI / 2;
          const left = Math.max(this.snapAt + this.drop.time - t, 0.15);
          // The plant step: he plants to throw read 1, so on the drop's last stride he turns to his picture of the man
          // (part-square). NFL gun drops (BDB 2025): chest off downfield at the plant p50 58-61 deg at every depth from 1 to
          // 6 yd, while the most open he gets in the drop rises with depth, 62 to 89 deg: open on the crossover steps,
          // part-square on the plant step.
          if (left <= this.stride()) facing = angleTo(a.pos, this.has(sim, this.reads[0]));
          return goTo(a, target, { facing, through: 0, speed: clamp(d / left / a.profile.vmax, 0.25, 1) });
        }
        return goTo(a, target, { facing, through: 0 });
      }
    }

    // ---- set: reading the field ----
    // Quick game is rhythm: one look per read. Dropback reads take longer.
    const rhythm = this.concept.family === 'quick' ? 0.6 : 1;
    const dwell = (0.42 + 0.4 * (1 - a.r('decisionMaking')) - 0.1 * a.r('awareness')) * rhythm * (1 + 0.3 * (1 - a.mind.focus)) * (1 - 0.3 * this.narrow(a));
    const timeSet = t - this.setAt;
    const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1) * (0.5 + 0.5 * a.r('pocketPresence'));
    const clockUrgency = clamp((timeSet + this.snapAt + this.drop.time - this.clock) / 0.8, 0, 1);
    // BLITZ_READ: believed rushers beyond his protection's count shorten how long he thinks he has.
    const u = Math.max(urgency, clockUrgency, BLITZ_READ ? (BLITZ_SKILL ? clamp(0.7 * this.freeU, 0, 0.7) : clamp(0.4 * this.rushExcess, 0, 0.7)) : 0);
    if (u > 0.5) this.underPressure++;

    // Look-off: veterans hold the safety with their eyes before the first read.
    if (!this.lookOffChecked) {
      this.lookOffChecked = true;
      const vet = Math.min(1, a.player.experience / 6);
      const p = 0.08 + 0.45 * a.r('decisionMaking') * a.r('anticipation') * (0.5 + 0.5 * vet);
      // QB_LOOKOFF_RHYTHM: not when read 1 will be a throw before the look-off would end (judged as his readiness test does).
      const r1SoonReady = QB_LOOKOFF_RHYTHM && !!this.reads[0] && (this.ready(this.reads[0], sim) || ((this.receiverForecasts.get(this.reads[0])?.breakAt() ?? Infinity) - this.windup(a) <= t + 0.35));
      // QB_FOOTWORK bit 8: not before a grass read; his eyes were on its landing area through the drop and it is decided now.
      if (this.concept.family !== 'quick' && this.reads.length > 1 && !r1SoonReady && !this.isGrass(this.reads[0]) && sim.dice('qb', a).chance(p)) {
        const side = Math.sign(this.has(sim, this.reads[0]).y - sim.ballY);
        const decoy = this.reads.find((r) => Math.sign(this.has(sim, r).y - sim.ballY) !== side);
        if (decoy) {
          this.lookOff = { until: t + 0.25 + 0.1 * sim.dice('qb', a).next(), decoy };
          this.readStart = this.lookOff.until;
        }
      }
    }
    if (this.lookOff && t < this.lookOff.until && pressure.time > 0.6) {
      sim.qbEyes = this.lookOff.decoy;
      return this.pocketMove(a, sim, this.lookOff.decoy);
    }

    // READ_PLAN: the key, read at the plan's cue unless the rush has already taken over.
    if (READ_PLAN && this.plan?.key && !this.keyRead && t >= this.plan.key.cueBy && u <= 0.5) this.readKey(a, sim);
    else if (QB_KEY_READ && QB_KEY_MAN && READ_PLAN && this.plan?.key && this.keyRead) this.rekey(a, sim);

    // QB_RHYTHM: with the rush or his clock telling him time is up, his eyes go
    // to the outlet (the last read) instead of finishing the order.
    if (QB_RHYTHM && u > 0.5 && this.reads.length > 1 && this.readIdx < this.reads.length - 1) {
      // READ_PLAN: coming off the plan under pressure, his eyes go to the back, wherever the plan read him.
      const back = READ_PLAN && this.plan?.outlet ? this.reads.indexOf(this.plan.outlet) : -1;
      if (back < 0 || back > this.readIdx) {
        this.readIdx = back > this.readIdx ? back : this.reads.length - 1;
        this.readStart = t;
        // HOT_LOOK: his eyes leave the plan's picture for the back (off, the peek or triangle kept his gaze).
        if (HOT_LOOK) this.triDone = true;
      }
    }
    // BLITZ_READ: in the first second, a rusher his protection does not account for (the call's free man), coming
    // across the line at him unblocked in his picture and held there for his processing time, sends his eyes to the
    // hot: the quickest-breaking route on that side, else the back. The ball goes there at the hot bar, through
    // HOT_LOOK's look and QB_EYES' gate when they are on. A poor reader is later; a receiver with no quick route on
    // that side leaves him the back or nothing.
    // BLITZ_READ: believing more rushers than his protection has, his eyes go first to where the space is vacated: the
    // quickest-breaking route on the side of the man he believes is coming (the concept's built-in answer). The throw
    // itself comes from his ordinary window valuation, in which a believed rusher is discounted as a coverage defender.
    if (BLITZ_READ && !this.hot && this.hotSeenAt !== null && t - this.hotSeenAt >= this.processing(a) && !(BLITZ_SECOND && (this.concept.family === 'screen' || this.concept.screen))) {
      let top: Agent | null = BLITZ_SKILL ? this.freeThreat?.d ?? null : null;
      if (!top) for (const [d, r] of this.rushB) if (!top || r.p > this.rushOf(top)) top = d;
      // BLITZ_SKILL: a prepared answer takes one short look at the vacated seat (where the replacement comes from).
      if (BLITZ_SKILL && top) {
        const prep = 0.5 * a.r('awareness') + 0.5 * a.r('decisionMaking');
        if (sim.dice('qb', a).chance(clamp(2 * prep - 0.8, 0, 1))) this.confirm = { at: this.rushB.get(top)!.from, until: t + 0.1 + 0.3 * (1 - prep) };
      }
      const side = top ? Math.sign(this.felt(a, sim, top).pos.y - sim.ballY) || 1 : 1;
      const bt = (r: Agent) => this.breakClock(r);
      const quick = this.reads.filter((r) => r.slot !== 'RB' && Math.sign(this.has(sim, r).y - sim.ballY) === side && bt(r) <= 1.6).sort((x, y) => bt(x) - bt(y));
      const target = quick[0] ?? this.reads.find((r) => r.slot === 'RB' && (QB_SEEN_OUT && this.checkRelease(r) ? this.seenOut(r) : this.onRoute(r))) ?? null;
      this.hot = { target, at: t };
      this.hotDef = top; // diagnostic (no effect): the man the hot was called on
      const k = target ? this.reads.indexOf(target) : -1;
      if (k >= 0) { this.readIdx = k; this.readStart = t; if (HOT_LOOK) this.triDone = true; }
    }
    let read = this.reads[this.readIdx];
    // QB_FOOTWORK bit 8: a grass read is decided by its step (the plant for read 1), with no dwell: not thrown by then,
    // he is on to his next read.
    if (FW_GRASS && this.isGrass(read) && this.setAt >= 0 && t - this.grassDue(read) > sim.dt + 1e-9 && this.readIdx < this.reads.length - 1) {
      this.readIdx++; this.readStart = t; read = this.reads[this.readIdx];
    }
    if (FW_STEPS) this.footwork(a, sim, read);
    // QB_EYES: his eyes are on the man he is gating a throw to; otherwise on his read (from when they got there).
    if (QB_EYES) {
      // His first read is the one he looks at through his drop (the decision is made at or before the back foot), so
      // his eyes count on it from halfway through the drop; a later read counts from when they get there.
      if (!this.eyesOn) { this.eyesOn = read ?? null; this.eyesOnAt = Math.min(t, this.snapAt + 0.5 * this.drop.time); }
      else if (this.eyesOn !== read && this.gateFor !== this.eyesOn) { this.eyesOn = read ?? null; this.eyesOnAt = t; }
      sim.qbEyes = this.eyesOn;
    } else sim.qbEyes = read ?? null;
    const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
    const thr = 0.6 - 0.12 * aggression - 0.32 * u - 0.15 * this.narrow(a);
    const maxInt = 0.025 + 0.05 * aggression + 0.08 * u;
    this.barNow = { t, u, urgency, clock: clockUrgency, thr, maxInt, thr0: 0.6 - 0.12 * aggression, max0: 0.025 + 0.05 * aggression };

    // A called screen is decided before the snap, so it is not held for an
    // ordinary low-risk window: with that gate the QB held slip and TE screens
    // past 2.5 s into the rush (NFL throws at 2.2 and 2.4 s).
    // - A quick screen is thrown as soon as it is there unless it is dead (a
    //   man sitting on it or jumping it). Waiting let the defense come to it
    //   (bunch now thrown at 2.2-3.7 s; NFL quick screens leave at 1.1-1.5 s).
    // - A slow screen is built to develop: he waits for a good window and takes
    //   a worse one as the rush closes (the ordinary completion bar, which
    //   falls with urgency). Taking any 20% window threw TE screens at 1.45 s
    //   with the end he had just released beside him (TE 1.6 yd from the
    //   nearest DL at the throw, NFL 5.7; 5 picks, 19 bats in 80 reps).
    const called = this.concept.family === 'screen';
    const quick = called && this.concept.screen?.tempo === 'quick';
    // SCREEN_QB: a slow screen is thrown on its timing too, once the receiver is ready (settled behind his blockers),
    // at a low bar: NFL slow screens leave at 2.2-2.4 s and almost never end in a sack; waiting for the ordinary bar
    // had him hit before the throw on a quarter to a third of called slow screens (screen-outcomes.mts).
    const need = quick ? Math.min(thr, 0.2) : called && SCREEN_QB ? Math.min(thr, 0.3) : thr, risk = called ? Math.max(maxInt, 0.12) : maxInt;
    // READ_PLAN triangle: the three routes as one picture; the best one open that clears his bar is the throw.
    // The picture is held until all three have shown (or two and a half looks), then the order goes on.
    // SCREEN_QB: a called quick screen is decided before the snap. From the moment it should be thrown (after his drop
    // and the receiver's sell), he reads whether it is dead from what he sees: the catcher covered (a free defender on
    // him or on the spot) or the lane filled (a rusher in the throw's first yards). A picture that stays dead for his
    // patience (his processing time; aggressive passers hang on longer) is thrown away, not held. A catcher who is
    // only late, with no one on him, is not dead; the clock is only the outer bound, a second past the timing.
    if (SCREEN_QB && quick && this.reads[0]) {
      const due = this.snapAt + this.drop.time + (this.concept.screen?.receiverSell ?? 0);
      if (t >= due) {
        const r = this.reads[0], ev = this.evaluate(a, sim, r, u);
        const throwable = !!ev && ev.P >= need && ev.intRisk <= risk;
        const dead = this.screenDead(a, sim, r);
        if (!dead) this.deadSince = -1; else if (this.deadSince < 0) this.deadSince = t;
        const patience = 0.15 + 0.25 * (1 - a.r('decisionMaking')) + 0.3 * aggression;
        const seenDead = this.deadSince >= 0 && t - this.deadSince >= patience;
        if (!throwable && (seenDead || t > due + 1.0)) {
          this.screenThrownAway = seenDead ? 'dead' : 'bound'; return this.throwAway(a, sim);
        }
      }
    }
    const tri = READ_PLAN && !this.triDone ? this.plan?.triangle ?? null : null;
    // READ_PLAN alert: a yes/no glance, not a full read.
    const glance = 0.15 + 0.2 * (1 - a.r('decisionMaking'));
    const readDwell = READ_PLAN && this.plan?.alert && read === this.plan.alert && this.readIdx === 0 ? glance : dwell;
    // QB_KEY_THROW: he stays on the key read's answer through its break (he throws it out of the break, not before).
    let keyHold = false;
    if (QB_KEY_THROW && read && this.keyAnswer?.target === read && t <= this.keyAnswer.at + KEY_HOLD && u < 0.8) {
      const f = this.receiverForecasts.get(read), brk = f?.hasBreak && f.estimate?.motion === 'installed-route' ? f.breakAt() : null;
      keyHold = brk !== null && brk !== undefined && brk + glance > t;
    }
    if (tri) {
      let pick: ThrowEval | null = null;
      for (const r of tri) {
        if (!this.ready(r, sim)) continue;
        const ev = this.evaluate(a, sim, r, u);
        if (ev && ev.P >= need && ev.intRisk <= risk && (!pick || ev.value > pick.value)) pick = ev;
      }
      if (pick) { const go = this.startIfFinish(a, sim, pick); if (go) return go; }
      const held = t - this.readStart;
      // A vertical peek lasts until the deep defenders' squeeze can show: every vertical 12 yd or more downfield,
      // then his processing time; while a vertical is close to his bar (winning, or about to) he stays on it, to
      // two and a half looks. Nothing winning by then, he checks it down. A triangle is held until its three have
      // shown.
      let done: boolean;
      if (this.plan!.peek) {
        const dir = sim.attackDir(a.team);
        // QB_PEEK: the peek is his look at the top of the drop: once he is set and the inside verticals (the peek reads
        // inside-out) have shown their stems, not when the slowest vertical reaches 12 yd (a rerouted one held it to
        // 3.1 s and the capped check-down to 3.65 s, against the NFL's ~2.44 s to the back).
        const shown = QB_PEEK ? tri.slice(0, 2).every((r) => (this.has(sim, r).x - sim.los) * dir >= 10)
          : tri.every((r) => (this.has(sim, r).x - sim.los) * dir >= 12);
        if (this.peekDeclared < 0 && shown) this.peekDeclared = t;
        const processed = this.peekDeclared >= 0 && t - this.peekDeclared > 0.15 + 0.25 * (1 - a.r('decisionMaking'));
        const close = tri.some((r) => { const e = this.ready(r, sim) ? this.evaluate(a, sim, r, u) : null; return !!e && e.P >= 0.85 * need && e.intRisk <= risk; });
        done = (processed && !close) || held > 2.5 * dwell;
      } else done = (held > 1.5 * dwell && tri.every((r) => this.ready(r, sim))) || held > 2.5 * dwell;
      if (done) {
        this.triDone = true;
        const after = this.reads.findIndex((r) => !tri.includes(r));
        this.readIdx = after < 0 ? this.reads.length : after;
        this.readStart = t;
      }
    } else if (read && this.ready(read, sim)) {
      const ev = this.evaluate(a, sim, read, u);
      // SCREEN_QB: a quick screen thrown to its spot goes on its timing (it is ready: the ball and the receiver get
      // there together) unless a defender is already sitting on the spot in his picture. Its window is not judged
      // like a route's: the defender near the spot is the one a blocker in the call is assigned to (NFL tunnel screens
      // leave at 1.6 s, before the receiver turns; ours priced that defender as a 40%+ pick and held to 3.0 s).
      const toSpotNow = SCREEN_QB && quick && ev ? this.toSpot(a, sim, read) : null;
      if (toSpotNow && ev && !this.spotSatOn(sim, toSpotNow.spot)) {
        const go = this.startIfFinish(a, sim, ev);
        if (go) { this.pendingSpot = toSpotNow.spot; return go; }
      }
      if (ev && ev.P >= need && ev.intRisk <= risk && (!FW_STEPS || this.onStep(a, read, u, t))) { const go = this.startIfFinish(a, sim, ev); if (go) { if (QB_KEY_THROW && this.keyAnswer?.target === read) { this.keyThrows++; this.keyAnswer = null; } return go; } }
      // A read that has made his break and is plainly covered is done: he
      // moves on after a glance rather than waiting out the read.
      const forecast = this.receiverForecasts.get(read);
      const broken = !!forecast?.hasBreak && forecast.estimate?.motion === 'installed-route' && forecast.breakAt() === null;
      if (!keyHold && (FW_STEPS && this.onBeats(read) ? this.beatDue(read, t, glance) : (t - this.readStart > readDwell || (broken && (!ev || ev.P < 0.5 * need) && t - this.readStart > glance)))) {
        // QB_RHYTHM: moving off a read, his eyes pass the outlet; a released
        // outlet that is there now is the throw, in rhythm, not at the end.
        // READ_PLAN: the back is a read in the plan, at his window on the side he releases to (HonestNFL 224,
        // 107, 133), not a rhythm outlet taken on the first move-off; pressure still sends him there (below).
        const outletOpen = !READ_PLAN || !this.plan;
        const outlet = QB_RHYTHM && outletOpen ? this.outletThrow(a, sim, u, need, risk) : null;
        if (outlet) { const go = this.startIfFinish(a, sim, outlet); if (go) return go; }
        this.readIdx++;
        this.readStart = t;
      }
    } else if (!read && QB_RELOOK) {
      // QB_RELOOK: his reads are done and nothing was there. He moves and reads on (QB_BREAK), or goes back to his
      // first read and through them again, one look at a time.
      this.relooks++;
      if (QB_BREAK && this.tryBreak(a, sim, 'reads')) return this.outTick(a, sim);
      this.readIdx = 0;
      this.readStart = t;
    } else if (!read) {
      // Out of reads: take the best available.
      const best = this.bestOption(a, sim, u);
      if (best && best.P >= thr - 0.1 && best.intRisk <= maxInt + 0.03) { const go = this.startIfFinish(a, sim, best); if (go) return go; }
      // QB_BREAK: his reads are done and nothing is there. He moves to buy time and change the picture, ball up, and
      // goes on reading out there. NFL quarterbacks who leave a clean pocket after the drop go sideways (60%; 2.7 yd in
      // the first second, upfield 0.0), then hold the ball 2.1 s more and throw 66% of the time
      // (scripts/diag/escape/clean-leave.py).
      else if (QB_BREAK && this.tryBreak(a, sim, 'reads')) return this.outTick(a, sim);
    } else if (!keyHold && (FW_STEPS && this.onBeats(read) ? this.beatDue(read, t, glance) : t - this.readStart > readDwell + (QB_RHYTHM ? 0 : 0.6))) {
      this.readIdx++;
      this.readStart = t;
    }

    // SET_DECIDE: under pressure he moves first; the hot path is for when he is trapped.
    if (SET_DECIDE) {
      const move = this.setDecide(a, sim, read);
      if (move) return move;
    }

    // Hot / panic: under imminent pressure, find anything.
    // HOT_LOOK: a look finished after the alarm eased leaves his eyes there; the read logic takes over again.
    if (this.look && pressure.time >= 0.45 && sim.t >= this.look.seenAt) this.look = null;
    if (pressure.time < 0.45) {
      this.alarmAt ??= sim.t;
      if (this.alarmAges === null) this.alarmAges = this.reads.map((r) => {
        const p = this.receiverForecasts.get(r)?.lastPicture();
        return p ? +(sim.t - p.sampledAt).toFixed(2) : null;
      });
      const hot = HOT_LOOK ? this.hotLook(a, sim) : this.hotThrow(a, sim);
      if (hot === 'look') return this.whileLooking(a, sim, this.noThrowContext(sim, pressure, u, 'alarm'));
      if (hot === null) this.hotNone++;
      if (hot) {
        // Diagnostic record (no effect): the hot throw's source, whether it went to the read he was on, and how far
        // his facing and his gaze were from it.
        const bearing = Math.atan2(hot.point.y - a.pos.y, hot.point.x - a.pos.x), gaze = this.gazePoint(sim);
        const off = (ang: number) => Math.abs(Math.atan2(Math.sin(ang - bearing), Math.cos(ang - bearing))) * 180 / Math.PI;
        this.hotPick = { t: sim.t, slot: hot.target.slot, alarmAt: this.alarmAt, looked: this.hotLooks, onRead: hot.target === this.reads[this.readIdx],
          facingOff: off(a.body.facing), gazeOff: off(Math.atan2(gaze.y - a.pos.y, gaze.x - a.pos.x)), P: hot.P, intRisk: hot.intRisk };
        return this.startThrow(a, sim, hot);
      }
      return this.noThrow(a, sim, this.noThrowContext(sim, pressure, u, 'alarm'));
    }

    // Internal clock expired: receivers go to the scramble drill, and he has to
    // get rid of it — escape, find someone uncovering, or throw it away.
    if (clockUrgency >= 1) {
      sim.scrambleDrill = true;
      if (QB_BREAK) { if (this.tryBreak(a, sim, 'clock')) return this.outTick(a, sim); }
      else if (this.shouldScramble(a, sim, false)) return this.scramble(a, sim);
      const over = timeSet + this.snapAt + this.drop.time - this.clock;
      if (timeSet > 1.4 + this.clock * 0.5 && this.outsidePocket(a, sim) && sim.dice('qb', a).chance(0.06)) return this.throwAway(a, sim);
      if ((over > 0.8 && sim.dice('qb', a).chance(0.06 + 0.1 * a.r('awareness'))) || over > 2.2) return this.throwAway(a, sim);
    }
    // Mobile QBs leave the pocket when coverage holds and the lane is there.
    if (!QB_BREAK && timeSet > 1.0 && this.readIdx >= 2 && this.shouldScramble(a, sim, false) && sim.dice('qb', a).chance(0.06 + 0.14 * a.r('elusiveness'))) {
      return this.scramble(a, sim);
    }

    return this.pocketMove(a, sim, read);
  }

  /** SET_DECIDE: a throw he cannot finish before the rusher he sees arrives is
   * not started (null: the decision below, move, escape or trapped, answers
   * instead). Off: the throw starts. */
  /** QB_EYES: the man he is gating a throw to (his eyes went there for it), or null. */
  private gateFor: Agent | null = null;
  /** QB_EYES: his processing time on a man his eyes have just reached. */
  private processing(a: Agent): number { return (0.15 + 0.25 * (1 - a.r('decisionMaking'))) * (1 + 0.8 * this.narrow(a)); }

  private startIfFinish(a: Agent, sim: PlaySim, ev: ThrowEval): MoveCommand | null {
    if (this.confirm && sim.t < this.confirm.until) return null;
    // QB_EYES: the ball goes only to the man his eyes have been on for his processing time; otherwise they go there.
    if (QB_EYES) {
      if (this.eyesOn !== ev.target) { this.eyesOn = ev.target; this.eyesOnAt = sim.t; this.gateFor = ev.target; sim.qbEyes = ev.target; return null; }
      if (sim.t - this.eyesOnAt < this.processing(a)) { this.gateFor = ev.target; return null; }
      this.gateFor = null;
    }
    // HOT_LOOK: while his eyes are on the way to a hot target, a read they have left is not thrown blind.
    if (HOT_LOOK && this.look && !this.inClearLook(a, sim, ev.target)) return null;
    if (SET_DECIDE && !this.canFinish(a, sim)) { this.noFinish++; return null; }
    return this.startThrow(a, sim, ev);
  }

  /** The read logic's hot throw under imminent pressure: anything with P > 0.3
   * and an interception risk under 0.18 (Coverage owns its contents). */
  private hotThrow(a: Agent, sim: PlaySim): ThrowEval | null {
    const best = this.lastHotBest = this.bestOption(a, sim, 1);
    return best && best.P > 0.3 && best.intRisk < 0.18 ? best : null;
  }

  /** HOT_LOOK: the hot throw, paying for the look. The choice is made on his pictures; a target outside his clear
   * look is looked at first ('look': his eyes are on the way, he evades meanwhile), then judged on what he sees. */
  private hotLook(a: Agent, sim: PlaySim): ThrowEval | 'look' | null {
    const ok = (ev: ThrowEval | null) => !!ev && ev.P > 0.3 && ev.intRisk < 0.18;
    if (this.look) {
      // QB_HEAD: his eyes are on the man once his head points at him; then the glance.
      if (QB_HEAD && this.look.seenAt === Infinity) {
        const p = this.receiverForecasts.get(this.look.target)?.predict(sim.t, 0) ?? this.look.target.pos;
        if (a.head !== null && Math.abs(wrapAngle(angleTo(a.pos, p) - a.head)) < 0.15) this.look.seenAt = sim.t + (this.look.glance ?? 0);
      }
      if (sim.t < this.look.seenAt) return 'look';
      const r = this.look.target;
      const ev = this.evaluate(a, sim, r, 1);
      // Thrown: his eyes are still on him (startThrow ends the look).
      if (ok(ev)) return ev;
      this.look = null;
    }
    const best = this.hotThrow(a, sim);
    if (!best) return null;
    if (this.inClearLook(a, sim, best.target)) return best;
    // His eyes go there: the head turn from where he is looking, then a glance to take the man and his defender in.
    const gaze = this.gazePoint(sim), to = this.receiverForecasts.get(best.target)?.predict(sim.t, 0) ?? best.target.pos;
    const turn = Math.abs(wrapAngle(angleTo(a.pos, to) - angleTo(a.pos, gaze))) / HEAD_RATE;
    const glance = 0.15 + 0.2 * (1 - a.r('decisionMaking')) + 0.1 * (1 - a.r('awareness'));
    this.look = QB_HEAD ? { target: best.target, from: gaze, eyesAt: sim.t, seenAt: Infinity, glance } : { target: best.target, from: gaze, eyesAt: sim.t + turn, seenAt: sim.t + turn + glance };
    this.hotLooks++;
    return 'look';
  }

  /** The decision has no acceptable throw this tick and the situation calls for an answer (the interface with the
   * no-throw behaviour, Flex's: evade, throw it away, scramble, protect the ball). Called every such tick; the throw
   * decision runs first each tick, from wherever this has put him. `best` is his best option on his pictures, even
   * below the bar (null when none). Today: the existing branch. */
  private noThrow(a: Agent, sim: PlaySim, ctx: NoThrowContext): MoveCommand {
    if (EXTEND) return this.extend(a, sim, ctx);
    if (QB_BREAK && this.tryBreak(a, sim, 'rush')) return this.outTick(a, sim);
    if (!QB_BREAK && this.shouldScramble(a, sim, true)) return this.scramble(a, sim);
    // Veterans throw it away (or at a back's feet) rather than eat a sack.
    if (sim.t > this.snapAt + this.drop.time + 0.3 && sim.dice('qb', a).chance(0.06 + 0.12 * a.r('awareness') + (this.outsidePocket(a, sim) ? 0.1 : 0))) return this.throwAway(a, sim);
    return this.evade(a, sim, ctx.pressure.agent);
  }

  /** The seam's context this tick; consecutive calls share one `since`. */
  private noThrowContext(sim: PlaySim, pressure: NoThrowContext['pressure'], u: number, reason: NoThrowContext['reason']): NoThrowContext {
    if (this.noThrowLast < sim.t - sim.dt - 1e-6) this.noThrowSince = sim.t;
    this.noThrowLast = sim.t;
    return { pressure, u, best: this.lastHotBest, eyes: this.look?.target ?? this.reads[this.readIdx] ?? null, reason, since: this.noThrowSince };
  }

  /** HOT_LOOK: his eyes are on the way to a hot target (busy, not giving up); his feet do this meanwhile. Today: evade. */
  private whileLooking(a: Agent, sim: PlaySim, ctx: NoThrowContext): MoveCommand {
    // EXTEND: an evasion already under way goes on while his head turns; a look never starts one.
    if (EXTEND && this.moveDir && sim.t < this.moveUntil) {
      const mobility = 0.5 * clamp((5.0 - a.player.measurables.forty) / 0.6, 0, 1) + 0.5 * a.r('elusiveness');
      const move = this.setDecide(a, sim, ctx.eyes ?? undefined, this.windup(a), 2.2 + 2.8 * mobility);
      if (move) return move;
    }
    return this.evade(a, sim, ctx.pressure.agent);
  }

  /** Whether his picture of `r` sits inside his clear look now (qbmind's clear sector). */
  private inClearLook(a: Agent, sim: PlaySim, r: Agent): boolean {
    const gaze = this.gazePoint(sim), p = this.receiverForecasts.get(r)?.predict(sim.t, 0) ?? this.has(sim, r);
    // QB_HEAD: his clear look is about where his head points.
    const eyes = QB_HEAD && a.head !== null ? a.head : angleTo(a.pos, gaze);
    return Math.abs(wrapAngle(angleTo(a.pos, p) - eyes)) < this.mind.clearHalf * (0.65 + 0.35 * a.mind.focus);
  }

  /** QB_RHYTHM: the outlet (last read) when it is a live, ready option that
   * clears his ordinary bar now; null otherwise. */
  private outletThrow(a: Agent, sim: PlaySim, u: number, need: number, risk: number): ThrowEval | null {
    const last = this.reads.length - 1;
    if (this.readIdx >= last - 1 || last < 1) return null;
    const outlet = this.reads[last];
    if (!outlet || (QB_SEEN_OUT && this.checkRelease(outlet) ? !this.seenOut(outlet) : QB_CALL_ROUTES ? !this.onRoute(outlet) : outlet.behavior.kind === 'pass-pro') || !this.ready(outlet, sim)) return null;
    const ev = this.evaluate(a, sim, outlet, u);
    return ev && ev.P >= need && ev.intRisk <= risk ? ev : null;
  }

  private gazePoint(sim: PlaySim): Vec2 {
    const heldPoint = (r: Agent): Vec2 => {
      const forecast = this.receiverForecasts.get(r);
      return forecast?.predict(sim.t, 0) ?? forecast?.prior.start ?? { x: sim.los + 10, y: sim.ballY };
    };
    if (this.lookOff && sim.t < this.lookOff.until) return heldPoint(this.lookOff.decoy);
    // BLITZ_SKILL: his confirmation look at the vacated seat.
    if (this.confirm && sim.t < this.confirm.until) return this.confirm.at;
    if (this.phase === 'windup' && this.pending) return this.pending.point;
    // HOT_LOOK: on the way to a hot target his eyes leave where they were at the head's turn.
    if (this.look) return sim.t < this.look.eyesAt ? this.look.from : heldPoint(this.look.target);
    // READ_PLAN: a key is watched from the drop until it is read (HonestNFL 135: the corner during the drop);
    // a triangle is one picture, its middle.
    const k = this.plan?.key;
    if (k && !this.keyRead && this.phase !== 'snap' && (!HOT_LOOK || this.readIdx === 0)) {
      // QB_KEY_MAN: his eyes are on the man he is reading (where he has him), not on the middle of the two routes.
      if (QB_KEY_MAN && k.man) return this.mind.estimate(k.man).pos;
      const lo = heldPoint(k.low), hi = heldPoint(k.high);
      return { x: (lo.x + hi.x) / 2, y: (lo.y + hi.y) / 2 };
    }
    // QB_FOOTWORK bit 8: in the drop, his eyes on his grass read's landing area ("look at the area he is going").
    if (FW_GRASS && this.phase === 'drop' && this.readIdx === 0 && this.isGrass(this.reads[0])) return this.grassLanding(sim, this.reads[0]);
    if (FW_GRASS && this.phase === 'set' && this.isGrass(this.reads[this.readIdx])) return this.grassLanding(sim, this.reads[this.readIdx]);
    const tri = this.plan?.triangle;
    if (tri && !this.triDone && this.phase === 'set') {
      const P = tri.map(heldPoint);
      return { x: P.reduce((s, p) => s + p.x, 0) / 3, y: P.reduce((s, p) => s + p.y, 0) / 3 };
    }
    const read = this.reads[this.readIdx];
    // During the drop: the key (middle-of-field safety); quick game eyes the first read.
    if ((this.phase === 'snap' || this.phase === 'drop') && this.concept.family !== 'quick') return { x: sim.los + 12, y: sim.ballY };
    return read ? heldPoint(read) : { x: sim.los + 10, y: sim.ballY };
  }

  /** QB_SEEN_REC: where he has a receiver now: his forecast of him, else his delayed picture. */
  private has(sim: PlaySim, r: Agent): Vec2 {
    return QB_SEEN_REC ? this.receiverForecasts.get(r)?.predict(sim.t, 0) ?? sim.see(sim.qb, r).pos : r.pos;
  }

  /** QB_SEEN_OUT: a man whose release is not on an installed count (a check-release from protection or a fake). */
  private checkRelease(r: Agent): boolean {
    // A screen's receiver leaves his block on the called count: that is the call, which he knows, not a check.
    if (this.concept.family === 'screen' || this.concept.screen) return false;
    return this.receiverForecasts.get(r)?.prior.startDelay === null;
  }
  /** Whether a man is on a route, as he knows it: QB_CALL_ROUTES, his call (installed, and out in his picture if he is a
   * check-release); off, the receiver's live behavior (a leak: it tells him who converted to a block or released). */
  private callBlockers: number | null = null;
  private onRoute(r: Agent): boolean {
    if (!QB_CALL_ROUTES) return r.behavior instanceof RouteRunner;
    if (!this.receiverForecasts.has(r)) return false;
    return QB_SEEN_OUT && this.checkRelease(r) ? this.seenOut(r) : true;
  }

  /** QB_FOOTWORK bit 1: the next read in his order. */
  private nextRead(read: Agent | undefined): Agent | undefined { return read ? this.reads[this.reads.indexOf(read) + 1] : undefined; }
  /** Whether the move from this read to the next is on the plan's steps (the next read is installed on a later step). */
  private onBeats(read: Agent | undefined): boolean {
    const nx = this.nextRead(read), s = read ? this.stepOf.get(read) : undefined, sn = nx ? this.stepOf.get(nx) : undefined;
    return !!s && !!sn && sn.n > s.n && this.setAt >= 0;
  }
  /** His eyes leave for the next read when the hitch that lands on its beat starts. */
  private beatDue(read: Agent | undefined, t: number, glance: number): boolean {
    const sn = this.stepOf.get(this.nextRead(read)!)!;
    // A read gets at least his yes/no glance (a throw on read 1 is started at the plant and must be decided there).
    return t >= this.setAt + sn.beat - this.stride() && t - this.readStart >= glance;
  }
  /** One stride of his own drop (s): the hitch's length in time. */
  private stride(): number { return this.drop.time / (DROP_STEPS[this.concept.drop] ?? 5); }
  /** His feet keep the plan's clock: step k starts one stride before it lands, at k strides after his set, up to the
   * plan's last step, whatever read his eyes are on; it lands when its stride is done. (A first form took a step only
   * when the read his eyes were on needed it, so eyes held on a keyed pair and then moved to the outlet waited a
   * stride for a step that should already have landed: dagger on develop's deeper five, 11 of 13 new sacks the back
   * thrown at 3.40-3.55 s off.) */
  private footwork(a: Agent, sim: PlaySim, _read: Agent | undefined): void {
    const st = this.step;
    if (st && !st.landed && sim.t - st.since >= this.stride() - 1e-9) {
      st.landed = true; this.landedSteps = st.n;
      // QB_FOOTWORK bit 2: a step that lands sets his shoulders to the read he is on.
      if (FW_HIPS && _read) this.shoulderOn = _read;
    }
    if (this.setAt < 0 || (st && !st.landed)) return;
    let last = 0;
    for (const n of this.readStep.values()) last = Math.max(last, n);
    const k = this.landedSteps + 1;
    if (k > last || sim.t < this.setAt + (k - 1) * this.stride()) return;
    // A base reset at depth: he gathers where he stands, turned to the read (his body facing follows his read). Whether
    // a hitch gains ground is a pressure decision (the climb, bit 4), not the hitch's.
    this.step = { n: k, since: sim.t, landed: false, to: { x: a.pos.x, y: a.pos.y } };
  }
  /** QB_FOOTWORK bit 1: a vertical's readable event (Rules + Coaching, docs/reviews/2026-11-15-vertical-ready.md on
   * #780: the seam thrown as the back foot hits, the cue whether he defeats the collision; the fade read on the
   * defender's position after the escape). From his own pictures: the receiver is out of the collision (2+ yd past
   * the line, running) and even with or past the man over him along the stem (the nearest defender he believes within
   * 4 yd across and not more than 2 yd shallower), or there is no such man. His awareness sets how cleanly he reads the
   * margin (a judgment draw, his own, scaled by 1 - awareness, in yards). Once read it holds: the release is decided.
   * Whether anyone over the top can reach the throw is the window's (the aim point), not this cue's. */
  private vertRead = new Set<Agent>();
  /** QB_FOOTWORK bit 8: whether a read is his grass read (read 1, a route into space) and where its landing area is. */
  private grassPlan = new Map<Agent, Vec2>();
  private isGrass(r: Agent | undefined): boolean {
    if (!FW_GRASS || !r) return false;
    // Half of a key is thrown off the key defender, not the grass (the agreed set; Rules' VERTS_KEYS keys the trips
    // seam): the key read decides it.
    if (this.plan?.key && (this.plan.key.low === r || this.plan.key.high === r)) return false;
    if (GRASS_FIELDS) return this.grassPlan.has(r);
    if (this.reads[0] !== r) return false;
    const id = this.receiverForecasts.get(r)?.prior.routeId ?? null;
    return !!id && GRASS_ROUTES.has(id);
  }
  /** When a grass read is decided: his step n for it (n strides after his set; the plant for n = 0). */
  private grassDue(r: Agent): number { return this.setAt + (this.stepOf.get(r)?.n ?? 0) * this.stride(); }
  private grassLanding(sim: PlaySim, r: Agent): Vec2 {
    const planned = this.grassPlan.get(r);
    if (planned) return planned;
    // Without the plan's landing: where his forecast has the man when a ball started now arrives (his wind-up plus the
    // flight to that point at his natural speed), solved by two passes from the wind-up alone.
    const f = this.receiverForecasts.get(r);
    if (!f) return this.has(sim, r);
    const qb = sim.qb, w = this.windup(qb);
    let at = f.predict(sim.t, w) ?? this.has(sim, r);
    for (let i = 0; i < 2; i++) at = f.predict(sim.t, w + naturalFlightFor(this.armSpeed, Math.hypot(at.x - qb.pos.x, at.y - qb.pos.y))) ?? at;
    return at;
  }
  /** Readable (Integration's ruling, 2026-11-16, the last form): only what he can judge of the receiver on the step:
   * the release won (out of the collision) and his leverage on the man over him, from his pictures (the vertical cue,
   * vertReadable). Whether to throw is the window's price on that step (the ball to where the man will be when it
   * arrives), no geometric veto: whether a deep safety gets there before the ball is the window's timing question. The
   * first form vetoed on any defender within 2 yd of the path to the landing area (four verts from trips: sacks 6 -> 21). */
  private grassReadable(sim: PlaySim, r: Agent): boolean {
    // A vertical: its release and the leverage on the man over him (the vertical cue). A corner: its release only; the
    // deep half defender over it is the window's timing question (the hole shot goes before he gets there).
    if (this.receiverForecasts.get(r)?.prior.declRule === 'vertical') return this.vertReadable(sim, r);
    const p = sim.see(sim.qb, r);
    return (p.pos.x - sim.los) * sim.attackDir(sim.qb.team) >= 2 && Math.hypot(p.vel.x, p.vel.y) >= 4;
  }
  private vertReadable(sim: PlaySim, r: Agent): boolean {
    if (this.vertRead.has(r)) return true;
    const a = sim.qb, dir = sim.attackDir(a.team), p = sim.see(a, r);
    const depth = (p.pos.x - sim.los) * dir;
    if (depth < 2 || Math.hypot(p.vel.x, p.vel.y) < 4) return false;
    let lead: number | null = null, best = Infinity;
    for (const d of sim.defense) {
      const e = this.mind.estimate(d).pos, across = Math.abs(e.y - p.pos.y), dd = (e.x - sim.los) * dir;
      if (across > 4 || dd < depth - 2) continue;
      if (across < best) { best = across; lead = depth - dd; }
    }
    const noise = a.mind.judgment(`vert:${r.slot}`) * 0.6 * (1 - a.r('awareness'));
    if (lead !== null && lead + noise < 0) return false;
    this.vertRead.add(r);
    return true;
  }
  /** A throw to this read leaves on its step: landed, or landing inside his load. Under pressure, from where he is. */
  private onStep(a: Agent, read: Agent, u: number, t: number): boolean {
    const s = this.stepOf.get(read);
    if (!s || u >= 0.8 || s.n <= this.landedSteps) return true;
    const st = this.step;
    if (!st || st.landed || st.n < s.n) return false;
    return st.since + this.stride() - t <= this.load(a);
  }

  /** QB_SEEN_OUT: whether he has seen a check-release man on his release route. Once out, he stays out. */
  private outSeen = new Set<Agent>();
  private seenOut(r: Agent): boolean {
    if (QB_TICK_PICTURE) return this.outSeen.has(r);
    return this.seenOutLive(r);
  }
  private seenOutLive(r: Agent): boolean {
    if (this.outSeen.has(r)) return true;
    const e = this.receiverForecasts.get(r)?.estimate;
    if (!e || e.source !== 'acquired' || e.progress === null) return false;
    this.outSeen.add(r);
    return true;
  }

  /** DECLARED_BREAK: the plan's word on each read: the route's declared break as installed (seconds after the snap),
   * whether it is thrown on the break or to a man seen open, and the plan's anchor lead. With the flag on these, and
   * his own forecast, are his only sources for a break: never the receiver's own break time, which carries the man's
   * private start delay and his true speed (off, the legacy path still reads it; that path goes with the flag's). */
  private planReads = new Map<Agent, { breakAt: number | null; throwFamily: 'onBreak' | 'seenOpen'; anchorLead: number }>();
  /** How far ahead of a route's break he starts the throw, beyond his motion (s). Today the plan's anchor; his own
   * (anticipation, his read of the receiver) is to come, which is why it is asked for at each check. */
  private leadFor(_passer: Agent, _family: 'onBreak' | 'seenOpen', anchor: number): number { return anchor; }
  /** DECLARED_BREAK: the break he holds for a man from the install: the plan's, in play time; null when it has none. */
  private planBreakAt(r: Agent): number | null {
    const rd = this.planReads.get(r);
    // PLAN_CLOCK: the compiler's break times are already on the play clock (its sampled sim.t), so adding the snap
    // put every installed break 0.3-0.5 s late (the snap-secured time) in his belief.
    return rd && rd.breakAt !== null ? (PLAN_CLOCK ? rd.breakAt : this.snapAt + rd.breakAt) : null;
  }
  /** DECLARED_BREAK: his picture has the man out and running on a route (acquired, placed on it or moving at a run). */
  private seenRunning(sim: PlaySim, r: Agent): boolean {
    const e = this.receiverForecasts.get(r)?.estimate;
    if (!e || e.source !== 'acquired') return false;
    const v = sim.see(sim.qb, r).vel;
    return e.progress !== null || Math.hypot(v.x, v.y) > 2;
  }
  /** When a receiver's break comes, for ordering quick answers: the installed time; 9 for a man not out on a route. */
  private breakClock(r: Agent): number {
    if (QB_SEEN_OUT && this.checkRelease(r)) return this.seenOut(r) ? this.receiverForecasts.get(r)!.breakAt() ?? 0 : 9;
    if (DECLARED_BREAK) return this.onRoute(r) ? (this.planBreakAt(r) ?? this.receiverForecasts.get(r)?.breakAt() ?? 9) - this.snapAt : 9;
    if (QB_CALL_ROUTES) return this.onRoute(r) ? (this.receiverForecasts.get(r)?.breakAt() ?? this.snapAt + 9) - this.snapAt : 9;
    return r.behavior instanceof RouteRunner ? r.behavior.breakTime : 9;
  }

  private ready(r: Agent, sim: PlaySim): boolean {
    if (QB_SEEN_OUT && this.checkRelease(r)) {
      if (!this.seenOut(r)) return false;
      // Out, on the route he installed: ready once its break is behind him or a throw started now meets it.
      const brk = this.receiverForecasts.get(r)!.breakAt();
      return brk === null || sim.t + this.windup(sim.qb) >= brk - 0.3 * sim.qb.r('anticipation');
    }
    // QB_CALL_ROUTES: the route as called (his install), not the receiver's live behavior.
    const rr = QB_CALL_ROUTES ? null : r.behavior instanceof RouteRunner ? r.behavior : null;
    const called = this.receiverForecasts.get(r)?.prior;
    if (QB_CALL_ROUTES ? !this.onRoute(r) : !rr) return QB_CALL_ROUTES ? false : r.behavior.kind === 'route';
    const routeEnd = rr ? rr.route.end : called!.end, routePath = rr ? rr.path : called!.path;
    // QB_FOOTWORK bit 1: a vertical is readable when its release is decided, not at 12 yd.
    if (FW_STEPS && this.receiverForecasts.get(r)?.prior.declRule === 'vertical' && this.vertReadable(sim, r)) return true;
    // QB_FOOTWORK bit 8: a grass read is ready when it is readable, not at its break.
    if (this.isGrass(r)) return this.grassReadable(sim, r);
    // A slow screen is thrown once the receiver has settled behind his blockers.
    if (this.concept.family === 'screen' && routeEnd === 'settle' && this.concept.screen?.tempo === 'slow') {
      // Thrown on anticipation as he turns for the ball: NFL slow screens leave
      // the hand with the receiver still ~2.3-2.9 yd from where he catches it
      // (BDB 2025, screen_reference), lofted over the rush he let through.
      const last = routePath[routePath.length - 1]?.p;
      if (QB_SEEN_OUT) {
        const at = this.receiverForecasts.get(r)?.predict(sim.t, 0) ?? sim.see(sim.qb, r).pos;
        return !!last && Math.hypot(at.x - last.x, at.y - last.y) < 3.5;
      }
      return !!rr?.settled || (!!last && Math.hypot(r.pos.x - last.x, r.pos.y - last.y) < 3.5);
    }
    // A quick screen after a sell is thrown to its spot: once the ball,
    // floated if need be, can get there with the receiver.
    const to = this.toSpot(sim.qb, sim, r);
    if (to) return to.lead <= to.float;
    // He times his release, not the start of his motion, to the break he
    // expects from the route he installed: a throw started now comes out one
    // windup later. Once the break is behind the receiver he is ready.
    const antic = sim.qb.r('anticipation');
    const forecast = this.receiverForecasts.get(r);
    const brk = forecast ? forecast.breakAt() : null;
    if (forecast && brk === null && forecast.estimate?.motion === 'installed-route' && forecast.hasBreak) return true;
    if (DECLARED_BREAK) {
      const rd = this.planReads.get(r);
      // A route thrown to a man seen open, or one the plan says nothing of: ready when his forecast has its break
      // behind it (above), and otherwise when his picture has the man out and running; never on a clock.
      if (brk === null && (!rd || rd.throwFamily === 'seenOpen' || rd.breakAt === null)) return this.seenRunning(sim, r);
      // A route thrown on its break: the break he expects (his forecast's while it can place the man, else the
      // plan's), less the lead and his motion.
      const at = brk ?? this.planBreakAt(r)!;
      return sim.t + this.windup(sim.qb) >= at - (rd ? this.leadFor(sim.qb, rd.throwFamily, rd.anchorLead) : 0.3 * antic);
    }
    return sim.t + this.windup(sim.qb) >= (brk ?? rr?.breakTime ?? 9) - 0.3 * antic;
  }

  /** SCREEN_QB: whether the last touch read found a rusher in his throwing lane. */
  private screenLane = false;
  /** SCREEN_QB diagnostics: a quick screen thrown away, on his read of it as dead or at the outer bound. */
  screenThrownAway: false | 'dead' | 'bound' = false;
  /** SCREEN_QB: the spot of a quick screen whose throw he has started to its spot (null otherwise). */
  private pendingSpot: Vec2 | null = null;
  /** SCREEN_QB: a defender sits on the spot in his picture (within 2 yd of it). */
  private spotSatOn(sim: PlaySim, spot: Vec2): boolean {
    return sim.defense.some((d) => { if (d.isDown(sim.t)) return false; const e = this.mind.estimate(d).pos; return Math.hypot(e.x - spot.x, e.y - spot.y) < 2; });
  }
  /** SCREEN_QB: when his picture of the quick screen went dead (-1: not dead). */
  private deadSince = -1;
  /**
   * SCREEN_QB: the quick screen is dead in his picture: a defender not in a block within 1.5 yd of the catcher (where
   * he sees him) or of the spot it is thrown to, or a rusher in the first yards of the throw's lane. Everything is
   * his own delayed, error-laden picture (mind.estimate, see).
   */
  private screenDead(a: Agent, sim: PlaySim, r: Agent): boolean {
    const rc = sim.see(a, r).pos;
    const sp = this.spotCache && this.spotCache.receiver === r && !this.spotDone ? this.spotCache.spot : null;
    const pt = sp ?? rc;
    const dx = pt.x - a.pos.x, dy = pt.y - a.pos.y, len = Math.hypot(dx, dy) || 1;
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const seen = this.mind.estimate(d).pos;
      const along = ((seen.x - a.pos.x) * dx + (seen.y - a.pos.y) * dy) / len;
      const off = Math.abs((seen.x - a.pos.x) * dy - (seen.y - a.pos.y) * dx) / len;
      if (along > 0 && along < Math.min(4, 0.45 * len) && off < 1.5) return true;
      if (QB_BELIEVED_DEF ? this.seenTied(a, sim, d, seen, r) : !!d.engagement) continue;
      if (Math.hypot(seen.x - rc.x, seen.y - rc.y) < 1.5 || (sp && Math.hypot(seen.x - sp.x, seen.y - sp.y) < 1.5)) return true;
    }
    return false;
  }
  private spotCache: ScreenSpot | null | undefined;
  private spotDone = false;
  /**
   * Throwing a quick screen to the spot. The QB knows where the call is
   * caught; he releases so the ball and the receiver get there together, as
   * NFL quick screens are thrown before the receiver turns to it (tunnel:
   * thrown at 1.6 s, turn at 1.8 s; flights 0.9-1.1 s,
   * screen_wr_path_reference.py). The receiver's arrival is his own picture
   * of his teammate. Only for a receiver who sells first: his early motion
   * hides the route, so a forecast from what the QB sees points the wrong
   * way, while a receiver already on his route (bubble) is read from his
   * motion. Once the receiver reaches the spot, the forecast throw takes over.
   */
  private toSpot(a: Agent, sim: PlaySim, r: Agent): { spot: Vec2; lead: number; natural: number; float: number } | null {
    if (this.concept.family !== 'screen' || this.concept.screen?.tempo !== 'quick' || !this.concept.screen.receiverSell || this.spotDone) return null;
    if (this.spotCache === undefined) this.spotCache = screenSpot(sim, this.concept);
    const sp = this.spotCache;
    if (!sp || sp.receiver !== r) return null;
    const seen = sim.see(a, r);
    if (Math.hypot(seen.pos.x - sp.spot.x, seen.pos.y - sp.spot.y) < 1.5) { this.spotDone = true; return null; }
    const tR = timeToReach({ pos: seen.pos, vel: seen.vel, profile: r.profile, speedScale: r.speedScale }, sp.spot, 0.5);
    const natural = this.naturalFlight(Math.hypot(sp.spot.x - a.pos.x, sp.spot.y - a.pos.y));
    return { spot: sp.spot, lead: tR - this.windup(a), natural, float: 1.8 * natural };
  }

  /** The flight time real QBs use at this distance, never faster than his arm allows. Stronger arms get there a
   * little sooner. Its one consumer is the quick screen thrown to its spot (toSpot).
   * Off: the 2023 fit (BDB 2026 output frames over all targeted passes, to the pass's end rather than its arrival:
   * ~0.6 s under 10 yd, 0.8 at 15, 1.2 at 25, 1.8 at 35, 2.5 at 45; the fit itself runs 0.06-0.2 s above those).
   * SCREEN_QB: refit to BDB 2025 completions, pass_forward to pass_arrived (the ball at the hands; p50 0.5 s at 8 yd,
   * 0.7 at 15, 1.1 at 25, 1.6 at 35, 2.2 at 45; scripts/diag/flight/), least squares on 3-yd bins. */
  private naturalFlight(d: number): number {
    return naturalFlightFor(this.armSpeed, d);
  }

  private outsidePocket(a: Agent, sim: PlaySim): boolean {
    return Math.abs(a.pos.y - sim.ballY) > 4.5;
  }

  /** A defender as the QB has him. Blind-side rushers are sensed late by
   * QBs with poor pocket presence. */
  private felt(a: Agent, sim: PlaySim, d: Agent): Perceived {
    if (QB_TICK_PICTURE) { const p = this.pics.get(d); if (p) return p.felt; }
    return this.feltLive(a, sim, d);
  }
  /** QB_TICK_PICTURE: his plain picture of a defender (this tick's, once taken). */
  private plainOf(a: Agent, sim: PlaySim, d: Agent): Perceived {
    if (QB_TICK_PICTURE) { const p = this.pics.get(d); if (p) return p.plain; }
    return sim.see(a, d);
  }
  /** QB_TICK_PICTURE: this tick's pictures of every defender, taken as time passes; `outSeen` advanced; his beliefs about
   * the defenders and his pricing judgments created at the first update. */
  private pics = new Map<Agent, { plain: Perceived; felt: Perceived }>();
  private picsMade = false;
  private takePictures(a: Agent, sim: PlaySim): void {
    if (!this.picsMade) {
      this.picsMade = true;
      for (const d of sim.defense) { if (QB_BELIEVED_DEF) this.believe(a, d); a.mind.judgment(`reach:${d.slot}`); }
      for (const k of PRICE_JUDGMENTS) a.mind.judgment(k);
    }
    for (const d of sim.defense) {
      const plain = sim.see(a, d);
      this.pics.set(d, { plain, felt: this.feltLive(a, sim, d, plain) });
    }
    for (const r of sim.offense) if (r !== a && !this.outSeen.has(r) && this.checkRelease(r)) this.seenOutLive(r);
  }
  /** A point's bearing off his facing, wrapped to [0, pi]. */
  private offFacing(a: Agent, at: Vec2): number {
    // QB_FOOTWORK bit 2: his blind side is behind where his eyes are (his head), not his chest: with bit 2 his shoulders
    // hold side-on in the crossover and on a step while his head moves, and the backside rusher sat 111-125 deg off his
    // chest, felt as behind him, while his head was 36-40 deg from him (scripts/diag/eyes/feel-facing.ts, mesh cover 2
    // roster 11). Off, his chest (it follows his look).
    const look = FW_HIPS && a.head !== null && Number.isFinite(a.head) ? a.head : a.body.facing;
    const raw = Math.atan2(at.y - a.pos.y, at.x - a.pos.x) - look;
    return Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw)));
  }
  /** Behind his shoulder: the single 1.8 rad edge (the channel choice; the two channels agree at it). */
  private isBehind(a: Agent, _d: Agent, at: Vec2): boolean { return this.offFacing(a, at) > 1.8; }
  /** How far behind his view a point is, for the blind-side lag: 0 or 1 at the 1.8 rad edge, or with QB_FELT_EDGE a
   * smoothstep from FELT_IN_VIEW to FELT_BLIND. */
  private blindShare(a: Agent, at: Vec2): number {
    const ang = this.offFacing(a, at);
    if (!QB_FELT_EDGE) return ang > 1.8 ? 1 : 0;
    const x = clamp((ang - FELT_IN_VIEW) / (FELT_BLIND - FELT_IN_VIEW), 0, 1);
    return x * x * (3 - 2 * x);
  }
  private feltLive(a: Agent, sim: PlaySim, d: Agent, plain?: Perceived): Perceived {
    // Bearing off his facing, wrapped to [0, pi]: behind his shoulder is
    // beyond 1.8 rad (about 103 deg) either side.
    // QB_HONEST_FEEL: which side of his shoulder the man is on comes from his own plain picture of him, not from where
    // the man truly is.
    const at = QB_HONEST_FEEL ? (plain ?? sim.see(a, d)).pos : d.pos;
    const blind = this.isBehind(a, d, at);
    // TRACK_FEEL (step 1b): a rusher in front of his shoulders is read through the tracking channel (a short
    // correcting loop); behind them the existing non-visual term stands (the QB lane's).
    if (TRACK_FEEL && !blind) return sim.track(a, d, 1, true);
    return sim.see(a, d, blind ? 2.2 - 1.4 * a.r('pocketPresence') : 1);
  }

  /** Pocket feel: a rusher still in a block arrives later the more square
   * the block is. Good pocket presence reads a rep being lost before the
   * rusher is free; poor pocket presence only notices when he's loose. */
  private held(a: Agent, d: Agent, sim?: PlaySim): number {
    if (BLOCK_SEEN && sim) return this.seenHold(a, d, sim);
    if (!d.engagement) return 0;
    if (QB_FEEL && sim) {
      // What he sees: the rusher's path to him and the blocker's body on it.
      const r = this.felt(a, sim, d).pos, b = this.felt(a, sim, d.engagement.blocker).pos;
      const px = a.pos.x - r.x, py = a.pos.y - r.y, L = Math.hypot(px, py) || 1;
      const along = ((b.x - r.x) * px + (b.y - r.y) * py) / L;
      const off = Math.abs((b.x - r.x) * py - (b.y - r.y) * px) / L;
      const width = d.profile.radius + d.engagement.blocker.profile.radius;
      if (along <= 0 || along >= L || off >= width) return 0;
      // Around the blocker's body at a rusher's lateral pace while held up,
      // plus getting off his hands; good pocket presence reads it sooner.
      return (0.2 + (width - off) / 2) * (0.6 + 0.4 * (1 - a.r('pocketPresence')));
    }
    const feltWin = Math.min(1, d.engagement.win) * (0.35 + 0.65 * a.r('pocketPresence'));
    return 0.35 + 1.4 * (1 - feltWin);
  }

  /** BLOCK_SEEN: the hold he sees on a rusher -- an offensive body in contact
   * with him (as he sees them, the rusher's body within the blocker's arm's
   * length: centres within the blocker's reach + the rusher's radius) and on his
   * path to the QB. Neither the sim's engagement record nor its win score: a
   * blocker who has come off (or never was there) holds nothing, and a rusher
   * level with or past the blocker's edge is as near as he looks. A rusher in
   * contact (any blocker within arm's length) is also paced: he closes no
   * faster than the QB sees him closing while the contact lasts. */
  /** BLOCK_SEEN's "in contact": the rusher's body within the blocker's arm's length. With elbows bent that is his
   * reach (0.25 + 0.85 arm from his centre). PUNCH puts the hands out to lockout (the bodies plus 0.9 arm, about
   * 0.1 yd beyond that), so under PUNCH the arm is measured from the body surfaces: radii + his arm. Off, 46% of
   * engaged pass ticks under PUNCH read as a free rusher sprinting at him (4% truly at air). */
  private inArm(o: Agent, d: Agent, dist: number): boolean {
    return dist <= (PUNCH ? o.profile.radius + d.profile.radius + o.player.measurables.armIn / 36 : o.profile.reach + d.profile.radius);
  }

  private seenHold(a: Agent, d: Agent, sim: PlaySim): number {
    const seen = this.felt(a, sim, d), r = seen.pos;
    const px = a.pos.x - r.x, py = a.pos.y - r.y, L = Math.hypot(px, py) || 1;
    let hold = 0, contact = false;
    for (const o of sim.offense) {
      if (o === a || o.isDown(sim.t)) continue;
      const b = this.felt(a, sim, o).pos, width = d.profile.radius + o.profile.radius;
      if (!this.inArm(o, d, Math.hypot(b.x - r.x, b.y - r.y))) continue;
      contact = true;
      const along = ((b.x - r.x) * px + (b.y - r.y) * py) / L;
      const off = Math.abs((b.x - r.x) * py - (b.y - r.y) * px) / L;
      if (along <= 0 || along >= L || off >= width) continue;
      hold = Math.max(hold, (0.2 + (width - off) / 2) * (0.6 + 0.4 * (1 - a.r('pocketPresence'))));
    }
    if (contact) {
      // A rusher still in a blocker's hands -- driving him back, or ridden from
      // beside -- cannot burst at the QB as a free man would: while the contact
      // lasts he closes at the pace the QB sees him closing. The felt time is at
      // least that pace over the distance (2026-11-12: a bull rush and an edge
      // ride each read about 0.35-0.6 s short as a fresh sprint at a QB
      // standing still).
      // Closing on him: the rusher's seen velocity toward him less his own
      // (he knows how he is moving; a drift away is distance the rusher must
      // still make up).
      const closing = ((seen.vel.x - a.vel.x) * px + (seen.vel.y - a.vel.y) * py) / L;
      const paced = Math.min(3, Math.max(0, L - 0.8) / Math.max(closing, 0.5));
      const sprint = timeToReach({ pos: r, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, a.pos, 0.8);
      hold = Math.max(hold, paced - sprint);
    }
    return hold;
  }

  /** FREE_BOUND: how soon a man he sees unblocked within FREE_NEAR could hit
   * him (Infinity for one he sees in a block, or farther). */
  private freeBound(a: Agent, sim: PlaySim, d: Agent, seen: { pos: Vec2; vel: Vec2 }, at: Vec2 = a.pos): number {
    for (const o of sim.offense) {
      if (o === a || o.isDown(sim.t)) continue;
      const b = this.felt(a, sim, o).pos;
      if (this.inArm(o, d, Math.hypot(b.x - seen.pos.x, b.y - seen.pos.y))) return Infinity;
    }
    const dx = at.x - seen.pos.x, dy = at.y - seen.pos.y, R = Math.hypot(dx, dy) || 1;
    if (R > FREE_NEAR) return Infinity;
    const D = R - FREE_REACH - a.profile.radius;
    let t = 0;
    if (D > 0) {
      const v = Math.max(0, (seen.vel.x * dx + seen.vel.y * dy) / R);
      t = (-v + Math.sqrt(v * v + 2 * FREE_BURST * D)) / FREE_BURST;
    }
    const at0 = QB_HONEST_FEEL ? this.plainOf(a, sim, d).pos : d.pos;
    return t + this.blindShare(a, at0) * FREE_BLIND_LAG * (1 - a.r('pocketPresence'));
  }

  private pressure(a: Agent, sim: PlaySim): { time: number; agent: Agent | null; dist: number } {
    let best = Infinity;
    let who: Agent | null = null;
    let dist = Infinity;
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const seen = this.felt(a, sim, d);
      let tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, a.pos, 0.8) + this.held(a, d, sim);
      if (FREE_BOUND) tt = Math.min(tt, this.freeBound(a, sim, d, seen));
      if (tt < best) {
        best = tt;
        who = d;
        const dp = QB_HONEST_FEEL ? seen.pos : d.pos;
        dist = Math.hypot(dp.x - a.pos.x, dp.y - a.pos.y);
      }
    }
    return { time: best, agent: who, dist };
  }

  private evaluate(a: Agent, sim: PlaySim, r: Agent, urgency: number): ThrowEval | null {
    if (QB_SEEN_REC) {
      const pose = sim.see(a, r).pose;
      // No picture of his pose is not a picture of him down.
      if ((pose !== null && pose !== undefined && pose !== 'up') || (this.checkRelease(r) && !this.seenOut(r))) return null;
    } else if (r.isDown(sim.t) || r.engagement) return null;
    // SHOULDERS_SET: his motion to this man includes the turn to him (as startThrow will make it).
    const wind = (SHOULDERS_SET ? Math.max(this.windup(a), this.turnTime(a, sim.see(a, r).pos)) : this.windup(a))
      // QB_EYES: priced at the release after the rest of his processing on this man.
      + (QB_EYES ? Math.max(0, this.processing(a) - (this.eyesOn === r ? sim.t - this.eyesOnAt : 0)) : 0);
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    const forecast = this.receiverForecasts.get(r);
    const current = forecast?.predict(sim.t, 0);
    if (!forecast || !current) return null;
    const predict = (dt: number): Vec2 => forecast.predict(sim.t, dt)!;
    // Natural throw: the flight time real QBs use at this distance (2023
    // tracking: ~0.6 s under 10 yd, 0.8 s at 15, 1.2 s at 25, 1.8 s at 35,
    // 2.5 s at 45), never faster than his arm allows. Stronger arms get there
    // a little sooner.
    const armEdge = clamp((this.armSpeed - 26) / 8, -0.5, 0.5);
    const natural = (d: number) => (0.38 + 0.022 * d + 0.00065 * d * d) * (1 - 0.12 * armEdge);
    let range = Math.hypot(current.x - a.pos.x, current.y - a.pos.y);
    let T = Math.max(0.3, natural(range));
    let Tmin = T;
    let pt = predict(wind + T);
    for (let i = 0; i < 3; i++) {
      const to = { x: pt.x, y: pt.y, z: CATCH_Z };
      range = Math.hypot(pt.x - a.pos.x, pt.y - a.pos.y);
      Tmin = minFlightTime(from, to, this.armSpeed) * 1.05;
      T = Math.max(Tmin, natural(range));
      pt = predict(wind + T);
    }
    pt = { x: pt.x, y: clamp(pt.y, 2, FIELD_WIDTH - 2) };
    const depth = pt.x - sim.los;
    // Options: the natural ball, a fastball into a tight window, and touch over the top.
    const options: number[] = [T];
    if (range > 15) options.push(T * 1.2);
    let fastball = Tmin < T * 0.85 ? Math.max(Tmin, T * 0.75) : null;
    // A slow screen is thrown with a chosen touch, not evaluated like a route
    // window: he floats it over a rusher in his lane, or to a back still
    // drifting under it, and puts it on him firm when a defender is closing
    // on the catch point. NFL screens fly ~0.8 s over 6-10 yd (p25 0.6, p75
    // 0.9) against ~0.55 s for this natural ball (throw_flight_reference.py).
    // Quick screens to a receiver on the move keep the natural ball: floated
    // to a bubble running away, the forecast over the longer flight misses
    // (lab: bubble 24 -> 13 caught).
    const to = this.toSpot(a, sim, r);
    if (to) {
      pt = { ...to.spot };
      const tm = minFlightTime(from, { x: pt.x, y: pt.y, z: CATCH_Z }, this.armSpeed) * 1.05;
      options.length = 0;
      options.push(clamp(to.lead, Math.max(tm, to.natural), to.float));
      fastball = null;
    }
    if (this.concept.family === 'screen' && this.concept.screen?.tempo === 'slow') {
      options.length = 0;
      // SCREEN_QB: NFL screens are thrown firm: 0.5 s over 6-10 yd and 0.6 s over 10-14 to the ball's arrival (BDB
      // 2025 screens, pass_forward -> pass_arrived). The 0.8 s this float was set to was measured to the catch event
      // (pass_outcome_caught), about 0.3 s after the arrival. Over a rusher in his lane only a little air.
      const touch = this.screenTouch(a, sim, r, pt, T);
      options.push(touch !== 'float' ? T : SCREEN_QB ? (this.screenLane ? T * 1.2 : T) : Math.max(T * 1.5, T + 0.25));
      fastball = null;
    }

    let best: ThrowEval | null = null;
    const consider = (Topt: number) => {
      const p2 = Topt === T ? pt : predict(wind + Topt);
      const point: Vec3 = { x: p2.x, y: clamp(p2.y, 2, FIELD_WIDTH - 2), z: depth > 20 ? 1.6 : CATCH_Z };
      const ev = this.window(a, sim, r, from, point, Topt, wind, urgency);
      if (!best || ev.value > best.value) best = ev;
    };
    for (const Topt of options) consider(Topt);
    // The fastball only comes out when the natural throw isn't there.
    if (fastball && (!best || (best as ThrowEval).P < 0.6)) consider(fastball);
    return best;
  }

  /** Float or firm, from what he sees: a rusher in the near half of his
   * throwing lane (he has to go over him) or a receiver still drifting into
   * his spot says float; a defender who would reach the catch point within a
   * beat of a firm ball says firm. */
  private screenTouch(a: Agent, sim: PlaySim, r: Agent, pt: Vec2, T: number): 'float' | 'firm' {
    const dx = pt.x - a.pos.x, dy = pt.y - a.pos.y, len = Math.hypot(dx, dy) || 1;
    let inLane = false, closing = false;
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const seen = this.mind.estimate(d);
      const along = ((seen.pos.x - a.pos.x) * dx + (seen.pos.y - a.pos.y) * dy) / len;
      const off = Math.abs((seen.pos.x - a.pos.x) * dy - (seen.pos.y - a.pos.y) * dx) / len;
      if (along > 0 && along < Math.min(4, 0.45 * len) && off < 1.5) inLane = true;
      const mover = { pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale };
      if (timeToReach(mover, pt, d.profile.reach) + (d.engagement ? 0.5 : 0) < T + 0.35) closing = true;
    }
    const seenR = this.mind.estimate(r);
    const away = (seenR.vel.x * dx + seenR.vel.y * dy) / len;
    this.screenLane = inLane;
    if (inLane) return 'float';
    if (closing) return 'firm';
    return away > 1.5 ? 'float' : 'firm';
  }

  private window(a: Agent, sim: PlaySim, r: Agent, from: Vec3, point: Vec3, T: number, wind: number, urgency: number): ThrowEval {
    const noise = 0.22 * (1 - a.r('decisionMaking')) + 0.05;
    // DEF_BELIEF: how well he knows defenders (decision-making and experience), 0..1.
    const know = clamp(0.25 + 0.45 * a.r('decisionMaking') + 0.3 * Math.min(1, a.player.experience / 8), 0, 1);
    const total = wind + T;
    const forecast = this.receiverForecasts.get(r);
    const target = forecast?.predict(sim.t, 0) ?? this.has(sim, r);
    // The man on the target runs the stem with him and learns the break only
    // when it comes: the separation a timing throw is thrown into.
    const breakAt = forecast?.breakAt() ?? null;
    const untilBreak = breakAt === null ? 0 : Math.max(0, breakAt - sim.t);
    const defenders = sim.defense.filter((d) => !d.isDown(sim.t)).map((d) => {
      // Not where the defender is: where the QB thinks he is.
      const seen = this.mind.estimate(d);
      // QB_BELIEVED_DEF: the defender's body and ball skills as he believes them, and whether he sees him tied up.
      const bel = QB_BELIEVED_DEF ? this.believe(a, d) : null;
      const dp = bel ? bel.profile : d.profile, dBall = bel ? bel.ballSkills : d.r('ballSkills');
      const tied = QB_BELIEVED_DEF ? this.seenTied(a, sim, d, seen.pos, r) : !!d.engagement;
      const facingQB = Math.cos(seen.facing - Math.atan2(a.pos.y - seen.pos.y, a.pos.x - seen.pos.x)) > 0.2;
      // What each defender knows, and when: one facing him sees the motion
      // start; one on the target follows the stem until the break; anyone
      // else keeps his course until the ball is out.
      const onTarget = Math.hypot(seen.pos.x - target.x, seen.pos.y - target.y) < 3;
      // THROW_REACT: no defender breaks on the ball before it is in the air.
      // One facing him in zone keys the motion, so he goes at the release or
      // a reaction after the motion starts, whichever is later; one in man
      // reads the release itself. Weighted by his own man/zone belief.
      const pMan = this.mind.pMan();
      const facingBlind = THROW_REACT ? pMan * wind + (1 - pMan) * Math.max(0, wind - dp.reactionTime) : 0;
      const blind = facingQB ? facingBlind : onTarget ? Math.min(untilBreak, wind) : wind;
      let mover = { pos: { x: seen.pos.x + seen.vel.x * blind, y: seen.pos.y + seen.vel.y * blind }, vel: seen.vel, profile: dp, speedScale: bel ? 1 : d.speedScale };
      // DEF_BELIEF: the man on the target goes partly where the target goes.
      if (DEF_BELIEF && Math.hypot(seen.pos.x - target.x, seen.pos.y - target.y) < 4) {
        const k = clamp(PHASE_MEAN + (1 - know) * 0.35 * a.mind.judgment('def-phase'), 0, 1);
        const tb = forecast?.predict(sim.t, blind) ?? target, tv = forecast?.predict(sim.t, blind + 0.1) ?? tb;
        const rv = { x: (tv.x - tb.x) / 0.1, y: (tv.y - tb.y) / 0.1 };
        mover = { ...mover, pos: { x: mover.pos.x + k * (tb.x - target.x - seen.vel.x * blind), y: mover.pos.y + k * (tb.y - target.y - seen.vel.y * blind) },
          vel: { x: seen.vel.x + k * (rv.x - seen.vel.x), y: seen.vel.y + k * (rv.y - seen.vel.y) } };
      }
      const react = dp.reactionTime * (facingQB ? 1 : 1.8) + (tied ? 0.5 : 0);
      const leap = dp.reactReach + 0.5 * (dp.maxCatchHeight - dp.reactReach);
      // PICTURE_AGE: how far he could be from where the QB has him, in time.
      let spreadD = 0;
      if (PICTURE_AGE) {
        const age = this.mind.pictureAge(d), A = dp.vmax / Math.max(dp.tau, 1e-3);
        spreadD = Math.min(0.5 * A * age * age, dp.vmax * age) / Math.max(dp.vmax, 1e-3);
      }
      return { d, dp, dBall, blind, mover, react, leap, spreadD, facingQB, estimateError: a.mind.judgment(`reach:${d.slot}`) * noise };
    });
    // A ball that arrives at `pt`: who contests it at the catch, who can get a
    // hand on it on the way, and how many of those become picks.
    // PICTURE_AGE: his receiver's uncertainty from the age of the last look
    // (never seen: since the snap).
    let spreadR = 0;
    if (PICTURE_AGE) {
      const pic = forecast?.lastPicture() ?? null;
      const age = Math.max(0, sim.t - (pic ? pic.sampledAt : this.snapAt)), A = r.profile.vmax / Math.max(r.profile.tau, 1e-3);
      spreadR = Math.min(0.5 * A * age * age, (pic ? pic.speed : r.profile.vmax) * age);
    }
    // DEF_BELIEF: how readily his receiver loses a ball a late defender reaches.
    const dislodge = DEF_BELIEF ? clamp((DISLODGE + (1 - know) * 0.15 * a.mind.judgment('def-dislodge')) * (1.15 - 0.3 * r.r('hands') - 0.3 * r.r('contestedCatch')) * 0.65, 0, 0.9) : 0;
    // INT_BELIEF: how well he knows where picks come from, an error both ways for the less experienced.
    const intBelief = INT_BELIEF ? Math.exp((1 - know) * 0.3 * a.mind.judgment('int-belief')) : 1;
    // Diagnostics only (no effect): each defender's believed arrival margin at the aimed point, when a probe asks.
    const marginTrace: any[] | null = this.marginProbe ? [] : null;
    const at = (pt: Vec3) => {
      let pOpen = 1, pClear = 1, intRisk = 0, pSecure = 1, intPath = 0, intJump = 0, intContest = 0, noPathPick = 1, noCatchPick = 1;
      const v0 = dragFreeLaunch(from, pt, T);
      for (const { d, dp, dBall, blind, mover, react, leap, spreadD, facingQB, estimateError } of defenders) {
        const tt = blind + timeToReach(mover, pt, dp.reach + 0.3) + react;
        // BLITZ_READ: a defender he believes is rushing is going elsewhere, not to this point.
        const m = tt - total + estimateError + (BLITZ_READ ? 3 * this.rushOf(d) : 0);
        const sCatch = PICTURE_AGE ? Math.hypot(0.13, spreadD, spreadR / Math.max(dp.vmax, 1e-3)) : 0.13;
        const sPath = PICTURE_AGE ? Math.hypot(0.1, spreadD) : 0.1;
        const contest = 1 - logistic((m - 0.05) / sCatch);
        // A defender who gets there well before the ball is sitting on the route.
        const first = 1 - logistic((m + 0.3) / sCatch);
        pOpen *= 1 - contest * (0.55 + 0.3 * dBall);
        // DEF_BELIEF: arriving after the ball but inside the securing window, he can still get it out.
        if (DEF_BELIEF) {
          const late = Math.max(0, (1 - logistic((m - 0.05 - SECURE_T) / Math.max(sCatch, 0.1))) - contest);
          pSecure *= 1 - late * dislodge;
        }
        // Undercut risk along the flight path: a hand on the ball kills the
        // completion, and some of those become picks.
        let touch = 0;
        for (const f of [0.3, 0.45, 0.6, 0.75, 0.88]) {
          const tau = T * f;
          const b = arcPoint(from, v0, tau);
          if (b.z > leap + 0.1) continue;
          const tb = blind + timeToReach(mover, b, dp.reach) + react;
          const mb = tb - (wind + tau) + estimateError;
          touch = Math.max(touch, logistic(-(mb - 0.05) / sPath));
        }
        pClear *= 1 - touch * 0.75;
        const iPath = touch * (0.08 + 0.3 * dBall);
        // At the catch point: jumped routes are picks; contested balls sometimes.
        const iJump = first * (0.15 + 0.35 * dBall), iContest = Math.max(0, contest - first) * 0.08 * dBall;
        intRisk += iPath + iJump + iContest;
        intPath += iPath; intJump += iJump; intContest += iContest;
        if (marginTrace && pt === point && (contest > 0.05 || iPath + iJump + iContest > 0.001)) marginTrace.push({ slot: d.slot, m: +m.toFixed(3), first: +first.toFixed(3),
          contest: +contest.toFixed(3), blind: +blind.toFixed(3), react: +react.toFixed(3), wind: +wind.toFixed(3), total: +total.toFixed(3), touch: +touch.toFixed(4),
          iPath: +iPath.toFixed(4), iJump: +iJump.toFixed(4), iContest: +iContest.toFixed(4), facingQB, ballSkills: +dBall.toFixed(2) });
        if (INT_BELIEF) {
          noPathPick *= 1 - clamp(iPath * PATH_PICK * intBelief, 0, 0.95);
          noCatchPick *= 1 - clamp((iJump + iContest) * CATCH_PICK * intBelief, 0, 0.95);
        }
      }
      // INT_BELIEF: the chance of a pick is one minus the chance that nobody picks it, in flight or at the catch.
      if (INT_BELIEF) intRisk = 1 - noPathPick * noCatchPick;
      return { pOpen: pOpen * pSecure, pClear, intRisk, intPath, intJump, intContest };
    };
    const aimed = at(point);
    if (marginTrace) this.marginLast = marginTrace;
    const { pOpen, pClear } = aimed;
    const dist = Math.hypot(point.x - from.x, point.y - from.y);
    let sigma: number;
    if (ACC_BELIEF) {
      // The rush as it will be when the ball leaves his hand, and a flick if it is on him by then.
      const pr = this.pressure(a, sim), atRelease = pr.time - wind;
      const uRel = clamp(clamp((0.9 - atRelease) / 0.7, 0, 1) + (1 - know) * 0.25 * a.mind.judgment('acc-urgency'), 0, 1);
      sigma = this.missSigma(a, sim, dist, uRel, THROW_PLATFORM ? this.platform(a, point, T) : undefined) * (1 + 0.8 * clamp((0.15 - atRelease) / 0.3, 0, 1));
    } else sigma = this.missSigma(a, sim, dist, urgency, THROW_PLATFORM ? this.platform(a, point, T) : undefined);
    // ACC_RADIUS: how far from his aim the ball can land and still be caught grows with the flight, as the receiver
    // sees it and runs under it, and with his ball skills (our own catches: about 1.9 yd on short balls, 3 on long
    // ones; scripts/diag/eyes/catch-radius.ts). Off: a fixed 1.35 yd whatever the flight.
    const radius = ACC_RADIUS ? 1.6 + 0.9 * T + 0.4 * (r.r('ballSkills') - 0.5) : 1.35;
    const pAcc = Math.exp(-(sigma * sigma) / (2 * radius * radius));
    // He knows his own accuracy: the ball can land anywhere in his miss, and an
    // errant ball is the one a defender can pick. Its risk is averaged over the
    // miss (four sigma points of his release error: 0.8σ along the throw's
    // depth, σ across it), so for an accurate thrower it is the aimed risk.
    const k = Math.SQRT2 * sigma;
    let intRisk = 0;
    for (const [dx, dy] of [[0.8 * k, 0], [-0.8 * k, 0], [0, k], [0, -k]]) {
      intRisk += 0.25 * at({ x: point.x + dx, y: clamp(point.y + dy, 0, FIELD_WIDTH), z: point.z }).intRisk;
    }
    // DROP_BELIEF: how often a ball that reaches his receiver untouched is dropped, by the receiver's hands, as he
    // knows it; an error both ways for the less experienced.
    const hands = DROP_BELIEF
      ? 1 - clamp((DROP_BASE - DROP_HANDS * r.r('hands')) * Math.exp((1 - know) * 0.3 * a.mind.judgment('drop-belief')), 0.005, 0.5)
      : 0.88 + 0.1 * r.r('hands');
    const P = pOpen * pClear * pAcc * hands;
    const depth = point.x - sim.los;
    const gain = depth + 1.5 + 3.5 * pOpen;
    const toSticks = sim.firstDownX - sim.los;
    const sticksBonus = depth >= toSticks ? 3 : 0;
    // An incompletion costs a down (~3 yards of value); a pick costs ~45.
    const value = P * (gain + sticksBonus + 2) - (1 - P) * 3 - intRisk * 45;
    return { target: r, point, T, P, intRisk: Math.min(1, intRisk), value, depth, parts: { pOpen, pClear, pAcc, hands,
      intPath: aimed.intPath, intJump: aimed.intJump, intContest: aimed.intContest } };
  }

  private bestOption(a: Agent, sim: PlaySim, urgency: number): ThrowEval | null {
    let best: ThrowEval | null = null;
    for (const r of this.reads) {
      if (!this.ready(r, sim) && urgency < 0.8) continue;
      const ev = this.evaluate(a, sim, r, urgency);
      if (ev && (!best || ev.value > best.value)) best = ev;
    }
    return best;
  }

  /** QB_BELIEVED_DEF: his belief of a defender's body and ball skills, fixed for the play. */
  private believed = new Map<Agent, { profile: PhysicalProfile; ballSkills: number; manCoverage: number }>();
  private believe(a: Agent, d: Agent): { profile: PhysicalProfile; ballSkills: number; manCoverage: number } {
    let b = this.believed.get(d);
    if (!b) {
      const k = clamp(SCOUT0 + SCOUT_AWARE * a.r('awareness') + SCOUT_EXP * Math.min(1, a.player.experience / 8), 0, 1);
      const typ = typicalAt(d.player.position);
      b = typ ? { profile: believedProfile(d.profile, typ.profile, k), ballSkills: typ.ratings.ballSkills + (d.r('ballSkills') - typ.ratings.ballSkills) * k,
          manCoverage: typ.ratings.manCoverage + (d.r('manCoverage') - typ.ratings.manCoverage) * k }
        : { profile: d.profile, ballSkills: d.r('ballSkills'), manCoverage: d.r('manCoverage') };
      this.believed.set(d, b);
    }
    return b;
  }

  /** The body he takes a defender to have: his belief about the man (QB_BELIEVED_DEF), else the man's own. */
  private bodyOf(a: Agent, d: Agent): PhysicalProfile { return QB_BELIEVED_DEF ? this.believe(a, d).profile : d.profile; }

  /** QB_BELIEVED_DEF: whether he sees a defender tied up: an offensive body other than `except` within arm's length of
   * where he has the defender, on his own picture of that teammate. */
  private seenTied(a: Agent, sim: PlaySim, d: Agent, at: Vec2, except?: Agent): boolean {
    for (const o of sim.offense) {
      if (o === a || o === except) continue;
      const so = sim.see(a, o);
      if (so.pose === 'down') continue;
      const b = so.pos;
      if (this.inArm(o, d, Math.hypot(b.x - at.x, b.y - at.y))) return true;
    }
    return false;
  }

  /** THROW_PLATFORM: what his motion does to a throw at `to` with flight time T: the miss it adds along his direction
   * of motion (yd, one sigma), that direction, and the share of the throw that is arm only. Zero for a set throw. */
  private platform(a: Agent, to: Vec2, T: number): { sigma: number; dir: Vec2; flick: number } {
    const ux = to.x - a.pos.x, uy = to.y - a.pos.y, ul = Math.hypot(ux, uy) || 1;
    const par = (a.vel.x * ux + a.vel.y * uy) / ul;
    // His velocity less the stride into the throw.
    const free = clamp(par, 0, PLATFORM_STRIDE);
    // What the ball carries: his motion across the target line in full (it moves the ball off the line), his motion
    // along it at PLATFORM_ALONG (it changes the throw's length, which costs less than its direction).
    const rest = par - free, cx = (a.vel.x - par * ux / ul), cy = (a.vel.y - par * uy / ul);
    const ex = cx + PLATFORM_ALONG * rest * ux / ul, ey = cy + PLATFORM_ALONG * rest * uy / ul, e = Math.hypot(ex, ey);
    const lost = Math.max(0, e - PLATFORM_QUIET);
    if (lost <= 0) return { sigma: 0, dir: { x: 0, y: 0 }, flick: 0 };
    const skill = 1 - a.r('throwOnRun');
    const perp = Math.abs(a.vel.x * uy - a.vel.y * ux) / ul, away = Math.max(0, -par);
    return { sigma: (PLATFORM_RESID0 + PLATFORM_RESID_SKILL * skill) * lost * T, dir: { x: ex / e, y: ey / e },
      flick: clamp((perp + away - PLATFORM_QUIET) / PLATFORM_BASE, 0, 1) * (0.4 + 0.6 * skill) };
  }

  private missSigma(a: Agent, sim: PlaySim, dist: number, urgency: number, plat?: { sigma: number }): number {
    const acc = dist < 10 ? a.r('accShort') : dist < 20 ? lerp(a.r('accShort'), a.r('accMid'), (dist - 10) / 10) : lerp(a.r('accMid'), a.r('accDeep'), clamp((dist - 20) / 15, 0, 1));
    // Error grows with distance, and faster beyond ~15 yards (deep balls).
    let sigma = 0.25 + dist * (0.013 + 0.034 * (1 - acc)) + 0.0007 * Math.max(0, dist - 15) ** 2;
    sigma *= 1 + 0.7 * urgency * (1.1 - a.r('composure'));
    if (!THROW_PLATFORM && a.speed > 2.2) sigma *= 1.15 + 0.45 * (1 - a.r('throwOnRun'));
    sigma *= 1 + 0.25 * (1 - a.body.energy);
    sigma *= 1 + 2.5 * heldBy(a, sim);
    // THROW_PLATFORM: his belief of the miss includes what his motion adds (as one spread; the release applies it along
    // his direction of motion).
    if (THROW_PLATFORM && plat && plat.sigma > 0) sigma = Math.hypot(sigma, plat.sigma);
    return sigma;
  }

  private startThrow(a: Agent, sim: PlaySim, ev: ThrowEval): MoveCommand {
    // Test staging: his own throws are held until the staged one (he keeps his drop and set).
    if (sim.stagedThrow && !this.staging) return { vel: { x: a.vel.x * 0.5, y: a.vel.y * 0.5 }, facing: a.body.facing };
    this.phase = 'windup';
    this.pendingSpot = null;
    this.look = null;
    // Diagnostic record (no effect): the throw as he accepted it, against his bar this tick and his normal bar.
    const bar = this.barNow?.t === sim.t ? this.barNow : null;
    this.throwRec = { t: sim.t, slot: ev.target.slot, P: ev.P, intRisk: ev.intRisk, value: ev.value, depth: ev.depth, parts: ev.parts ?? null, at: { x: a.pos.x, y: a.pos.y }, aim: { x: ev.point.x, y: ev.point.y }, T: ev.T,
      u: bar?.u ?? null, urgency: bar?.urgency ?? null, clock: bar?.clock ?? null, thr: bar?.thr ?? null, maxInt: bar?.maxInt ?? null,
      clearsNormal: bar ? ev.P >= bar.thr0 && ev.intRisk <= bar.max0 : null, hot: this.alarmAt !== null && this.alarmAt <= sim.t && this.hotPick?.t === sim.t };
    this.pending = ev;
    const base = this.windup(a);
    // SHOULDERS_SET: the motion lasts at least the turn it has to make.
    this.turnFrom = a.body.facing;
    this.turnT = SHOULDERS_SET ? this.turnTime(a, ev.point) : 0;
    const plain = sim.t + base;
    this.releaseAt = this.turnT > base ? sim.t + this.turnT : plain;
    this.motionAt = sim.t;
    this.rechecked = false;
    this.pinRolled = false;
    // The arm's load is the base motion's; time spent turning does not add to it.
    this.flick = 1 - (plain - sim.t - this.delivery(a)) / this.load(a);
    // The load gives the throw away to defenders reading him: front hand off
    // the ball, front shoulder to the target.
    sim.windupAt = sim.t;
    sim.deliveryAt = this.releaseAt - this.delivery(a);
    const keep = QB_BREAK && this.out ? 0.85 : 0.5;
    return { vel: { x: a.vel.x * keep, y: a.vel.y * keep }, facing: this.motionFacing(a, sim, ev) };
  }

  /** SHOULDERS_SET: how long a throwing turn from his current facing to `p` takes. */
  private turnTime(a: Agent, p: Vec2): number {
    return TURN_BASE + Math.abs(wrapAngle(angleTo(a.pos, p) - a.body.facing)) / TURN_RATE;
  }

  /** The facing his throwing motion asks for: square to the target, or with
   * SHOULDERS_SET the shoulders closing on it through the motion. */
  private motionFacing(a: Agent, sim: PlaySim, ev: ThrowEval): number {
    const to = angleTo(a.pos, ev.point);
    if (!SHOULDERS_SET || this.turnT <= 0) return to;
    // The turn ends at the release: the step and hip and shoulder rotation are
    // the motion's last turnT seconds, after the load (NFL: shoulders closing on
    // the target up to the release, ~0.3 s for 30 deg).
    const f = clamp((sim.t + sim.dt - (this.releaseAt - this.turnT)) / this.turnT, 0, 1);
    return this.turnFrom + wrapAngle(to - this.turnFrom) * f;
  }

  /** SHOULDERS_SET: the facing his feet hold while he reads. His shoulders go
   * to a read once his eyes have held it for SHOULDER_SETTLE; until then they
   * stay where they were set. Off: square to the read. */
  /** QB_FOOTWORK bit 2: the read his shoulders are set to (at the plant, then at each landed step). */
  private shoulderOn: Agent | null = null;
  /** QB_FOOTWORK bit 2: where his drop started (his x at the snap). */
  private dropStartX = NaN;
  private bodyFacing(a: Agent, sim: PlaySim, read: Agent | null | undefined): number {
    // QB_FOOTWORK bit 2: shoulders on a step, toward his picture of the man; a look alone does not turn them.
    if (FW_HIPS) { const r = this.shoulderOn ?? read; return r ? angleTo(a.pos, this.has(sim, r)) : a.body.facing; }
    const at = (r: Agent) => QB_FACE_SEEN ? this.has(sim, r) : r.pos;
    if (!SHOULDERS_SET) return read ? angleTo(a.pos, at(read)) : 0;
    const eyes = read ?? null;
    if (eyes !== this.eyesRead) { this.eyesRead = eyes; this.eyesAt = sim.t; }
    if (!this.shoulderRead) this.shoulderRead = this.reads[0] ?? eyes;
    if (eyes && eyes !== this.shoulderRead && sim.t - this.eyesAt >= SHOULDER_SETTLE) this.shoulderRead = eyes;
    return this.shoulderRead ? angleTo(a.pos, at(this.shoulderRead)) : a.body.facing;
  }

  /** Whether the committed throw, re-aimed as it would now leave his hand, is
   * worth less than keeping the ball. Held or about to be hit, he cannot. */
  private pullDown(a: Agent, sim: PlaySim, ev: ThrowEval): boolean {
    if (sim.stagedThrow) return false; // test staging: the staged throw comes out
    const left = this.releaseAt - sim.t;
    const pressure = this.pressure(a, sim);
    if (heldBy(a, sim) > 0 || pressure.time < left + 0.3) return false;
    // SCREEN_QB: a quick screen thrown to its spot is rechecked by the rule it was thrown on (a defender now sitting on
    // the spot in his picture), not re-priced as a route's window: that pumped tunnel screens every look to 2.7-3.0 s.
    if (this.pendingSpot) {
      const pull = this.spotSatOn(sim, this.pendingSpot);
      if (pull) this.pendingSpot = null;
      return pull;
    }
    const p = this.receiverForecasts.get(ev.target)?.predict(sim.t, left + ev.T);
    if (!p) return false;
    const point: Vec3 = { x: p.x, y: clamp(p.y, 2, FIELD_WIDTH - 2), z: ev.point.z };
    const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1) * (0.5 + 0.5 * a.r('pocketPresence'));
    const w = this.window(a, sim, ev.target, { x: a.pos.x, y: a.pos.y, z: RELEASE_Z }, point, ev.T, left, urgency);
    // QB_COMMIT: a started throw holds unless what he now sees clears a margin beyond what he started on: the window
    // at half the chance he threw it at, or its pick risk up by 0.12 or more. Off: any re-priced value below zero
    // pulled it down (a pump), at the entry itself.
    if (QB_COMMIT) return w.P < 0.5 * ev.P || w.intRisk > ev.intRisk + 0.12;
    return w.value < 0;
  }

  private release(a: Agent, sim: PlaySim, ev: ThrowEval): void {
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    // Re-aim at release with the latest prediction.
    const r = ev.target;
    let point = ev.point;
    // SCREEN_QB: a throw to the spot goes to the spot; his forecast of a receiver still selling points the wrong way.
    const p = this.pendingSpot ? null : this.receiverForecasts.get(r)?.predict(sim.t, ev.T);
    this.pendingSpot = null;
    if (p) {
      point = { x: p.x, y: clamp(p.y, 2, FIELD_WIDTH - 2), z: ev.point.z };
    }
    const dist = Math.hypot(point.x - from.x, point.y - from.y);
    const pressure = this.pressure(a, sim);
    const urgency = clamp((0.9 - pressure.time) / 0.7, 0, 1);
    let sigma = this.missSigma(a, sim, dist, urgency);
    // THROW_BODY: a hold takes the trunk and the step: an arm throw to that degree.
    if (THROW_HOLD) { this.flick = Math.max(this.flick, Math.min(1, Math.max(sim.throwDisturb, throwHold(a, sim)))); sim.throwDisturb = 0; sim.throwPull = { x: 0, y: 0 }; }
    else if (THROW_BODY) this.flick = Math.max(this.flick, throwInterference(a, sim));
    // THROW_PLATFORM: moving across or away from the target takes his base out of it.
    const plat = THROW_PLATFORM ? this.platform(a, point, ev.T) : null;
    if (plat) this.flick = Math.max(this.flick, plat.flick);
    // A flick: thrown with the arm alone, without the full coil and step [D].
    sigma *= 1 + 0.8 * this.flick;
    const dice = sim.dice('throw', a);
    sigma *= Math.exp(dice.normal(0, 0.2 * (1 - a.r('consistency'))));
    const miss: Vec3 = {
      x: point.x + dice.normal(0, sigma * 0.8),
      y: point.y + dice.normal(0, sigma),
      z: Math.max(0.4, point.z + dice.normal(0, sigma * 0.45)),
    };
    // THROW_PLATFORM: the share of his own motion he did not take out of the ball, along that motion. Drawn only for
    // a mover, so a set throw's draws are unchanged.
    if (plat && plat.sigma > 0) {
      const k = dice.normal(0, plat.sigma);
      miss.x += plat.dir.x * k; miss.y += plat.dir.y * k;
      this.platformRec = { sigma: plat.sigma, flick: plat.flick, speed: a.speed };
    }
    // Without the legs and trunk, less on the ball [D].
    let T = Math.max(ev.T * (1 + dice.normal(0, 0.03)), minFlightTime(from, miss, this.armSpeed * (1 - 0.2 * this.flick)));
    // Test staging (PlaySetup.stagedThrow with an aim): the ball goes to the recorded point in the recorded flight time.
    const staged = sim.stagedThrow;
    if (staged?.aim && staged.T !== undefined) { miss.x = staged.aim.x; miss.y = staged.aim.y; miss.z = staged.aim.z; T = staged.T; }
    this.releaseRec = { aim: { ...miss }, T };
    const v0 = solveLaunch(from, miss, T, DRAG_SPIRAL, sim.wind);
    sim.throwBall(a, r, v0, point, sim.t + T);
  }

  /** EXTEND: no acceptable throw and a rusher he feels (noThrow's body with the flag on). */
  private extend(a: Agent, sim: PlaySim, ctx: NoThrowContext): MoveCommand {
    const dm = a.r('decisionMaking');
    // What he could still throw, on his pictures, even below his bar (the decision's own
    // best, else his own look round): nobody near a throw is the giving-up case; a bad window is not.
    const best = ctx.best ?? this.bestOption(a, sim, 1);
    const nobody = !best || best.P < 0.15;
    const outside = this.outsidePocket(a, sim);
    // Giving up from outside the box, the throw beyond the sideline past the line is legal.
    if (nobody && outside && dm >= 0.3) return this.throwAway(a, sim);
    // Evade: the spot with the most felt time, at his mobility's pace.
    const mobility = 0.5 * clamp((5.0 - a.player.measurables.forty) / 0.6, 0, 1) + 0.5 * a.r('elusiveness');
    const move = this.setDecide(a, sim, ctx.eyes ?? undefined, this.windup(a), 2.2 + 2.8 * mobility);
    if (move) return move;
    // Trapped (no spot buys time): a legal throw-away if he has one, else protect the ball.
    if (nobody && dm >= 0.3) {
      const feet = this.feetTarget(a, sim);
      if (outside) return this.throwAway(a, sim);
      if (feet) return this.throwAway(a, sim, feet);
    }
    // A poor decision maker throws it away from inside with nobody near: grounding.
    if (nobody && dm < 0.3) return this.throwAway(a, sim);
    return this.evade(a, sim, ctx.pressure.agent);
  }

  /** EXTEND: an eligible receiver near enough for a ball into his area (at his feet), as the QB sees him. */
  private feetTarget(a: Agent, sim: PlaySim): Vec3 | null {
    let best: Vec3 | null = null, bd = Infinity;
    for (const r of this.reads) {
      if (r.isDown(sim.t)) continue;
      const p = sim.see(a, r).pos, d = Math.hypot(p.x - a.pos.x, p.y - a.pos.y);
      if (d < bd && d <= 20) { bd = d; best = { x: p.x, y: p.y, z: 0 }; }
    }
    return best;
  }

  private throwAway(a: Agent, sim: PlaySim, at?: Vec3): MoveCommand {
    const side = a.pos.y < sim.ballY ? -1 : 1;
    const y = side > 0 ? FIELD_WIDTH + 3 : -3;
    const target: Vec3 = at ?? { x: a.pos.x + 8, y, z: 1.5 };
    const from: Vec3 = { x: a.pos.x, y: a.pos.y, z: RELEASE_Z };
    const T = minFlightTime(from, target, this.armSpeed) * 1.2;
    const v0 = solveLaunch(from, target, T, DRAG_SPIRAL, sim.wind);
    sim.throwBall(a, null, v0, target, sim.t + T, true);
    return stand();
  }

  private shouldScramble(a: Agent, sim: PlaySim, panic: boolean): boolean {
    const mobility = 0.5 * clamp((5.0 - a.player.measurables.forty) / 0.6, 0, 1) + 0.5 * a.r('elusiveness');
    if (!panic && mobility < 0.18) return false;
    // Is there a lane? Check points a few yards upfield; under pressure also
    // escapes outside the pocket to either side.
    let open = 0;
    const lanes = [-4, -2, 0, 2, 4].map((dy) => ({ x: Math.max(a.pos.x + 4, sim.los + 1), y: clamp(a.pos.y + dy, 1, FIELD_WIDTH - 1) }));
    if (panic) for (const side of [-1, 1]) lanes.push({ x: a.pos.x + 1, y: clamp(a.pos.y + side * 5.5, 1, FIELD_WIDTH - 1) });
    // Each defender as he has him, not where he truly is: an unseen rusher
    // behind his shoulder is still where he last registered him.
    const threats = sim.defense.filter((d) => !d.isDown(sim.t))
      .map((d) => ({ d, seen: this.felt(a, sim, d), held: this.held(a, d, sim) }));
    for (const q of lanes) {
      // His own run as scramble() will ask for it: the carrier's full-speed
      // sprint from the velocity he has now, with the same estimate as the
      // defenders'. A set QB starts from rest, not at speed.
      const myT = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, q);
      let margin = Infinity;
      for (const { d, seen, held } of threats) {
        // A rusher still in a block is held as long as the pressure check feels him held.
        const tt = timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, q, 1) + held;
        margin = Math.min(margin, tt - myT);
      }
      if (margin > 0.35) open++;
    }
    return open >= (panic ? 1 : 2) && (panic ? mobility > 0.2 || sim.dice('qb', a).chance(0.3) : true);
  }

  private scramble(a: Agent, sim: PlaySim): MoveCommand {
    sim.scrambled = true;
    if (QB_BREAK) { a.carryPosture = 'tucked'; if (this.out) this.breakRec.push({ t: sim.t, what: 'tuck' }); this.out = null; }
    sim.stats.scramble = true;
    sim.stats.rusher = a.player.id;
    sim.event('scramble', a);
    a.behavior = new BallCarrier({ qb: true }, a);
    return a.behavior.update(a, sim);
  }

  /** QB_BREAK: out of the pocket with the ball up: the side he broke to, his held destination, his next decision. */
  private out: { side: number; since: number; dest: Vec2; until: number; decideAt: number; clearSince: number | null; away: number | null; best: ThrowEval | null; thr: number; risk: number; order: Agent[]; idx: number } | null = null;
  /** QB_RELOOK diagnostics (no effect): how many times his reads ran out on this play. */
  relooks = 0;
  /** QB_BREAK: he has stopped and set outside the pocket on this play. */
  private hasSet = false;
  /** QB_BREAK diagnostics (no effect): what he did out there and when. */
  readonly breakRec: Array<{ t: number; what: 'break:rush' | 'break:clock' | 'break:feel' | 'break:reads' | 'tuck' | 'away' | 'set' | 'throw' }> = [];

  /** QB_BREAK diagnostics (no effect): each time he looked to break, and the time each side would have left him. */
  readonly breakTry: Array<{ t: number; why: string; m: number[] }> = [];

  /** QB_BREAK: the pursuers as he feels them, with the hold he sees on each. */
  private pursuers(a: Agent, sim: PlaySim): Array<{ d: Agent; seen: Perceived; held: number }> {
    return sim.defense.map((d) => ({ d, seen: this.felt(a, sim, d) })).filter((x) => x.seen.pose !== 'down').map((x) => ({ ...x, held: this.held(a, x.d, sim) }));
  }

  /** QB_BREAK: the time a spot leaves him on the nearest felt pursuer, running to it from where he is. */
  private spotMargin(a: Agent, q: Vec2, threats: Array<{ d: Agent; seen: Perceived; held: number }>): number {
    const myT = timeToReach({ pos: a.pos, vel: a.vel, profile: a.profile, speedScale: a.speedScale }, q);
    let margin = Infinity;
    for (const { d, seen, held } of threats) margin = Math.min(margin, timeToReach({ pos: seen.pos, vel: seen.vel, profile: this.bodyOf(a, d), speedScale: 1 }, q, 1) + held - myT);
    return margin;
  }

  /** QB_BREAK: the break. True when he is out (now or already). */
  private tryBreak(a: Agent, sim: PlaySim, why: 'rush' | 'clock' | 'feel' | 'reads'): boolean {
    if (this.out) return true;
    // Once he has stopped and set out there, only the rush moves him again: his clock and his reads have had their
    // answer, and leaving and setting in turn on the same picture is not a decision.
    if (this.hasSet && (why === 'clock' || why === 'reads')) return false;
    const threats = this.pursuers(a, sim);
    let side = 0, best = BREAK_MARGIN, dest: Vec2 | null = null;
    for (const s of [-1, 1]) {
      const q = { x: Math.min(a.pos.x + 1, sim.los - 1), y: clamp(a.pos.y + s * BREAK_REACH, 1, FIELD_WIDTH - 1) };
      const m = this.spotMargin(a, q, threats);
      if (m > best) { best = m; side = s; dest = q; }
    }
    this.breakTry.push({ t: sim.t, why, m: [-1, 1].map((sd) => this.spotMargin(a, { x: Math.min(a.pos.x + 1, sim.los - 1), y: clamp(a.pos.y + sd * BREAK_REACH, 1, FIELD_WIDTH - 1) }, threats)) });
    if (!dest) return false;
    this.out = { side, since: sim.t, dest, until: sim.t + OUT_HOLD, decideAt: sim.t + this.processing(a), clearSince: null, away: null, best: null, thr: 1, risk: 0, order: [], idx: 0 };
    // He goes on reading one man at a time: the men on the side he broke to first, in the order he had them.
    const sideOf = (r: Agent) => Math.sign(this.has(sim, r).y - a.pos.y) === side ? 0 : 1;
    this.out.order = [...this.reads].sort((x, y) => sideOf(x) - sideOf(y));
    this.breakRec.push({ t: sim.t, what: `break:${why}` as const });
    this.look = null;
    sim.event('read', a, null, `breaks the pocket (${why})`);
    return true;
  }

  /** QB_BREAK: one tick out of the pocket with the ball up. */
  private outTick(a: Agent, sim: PlaySim): MoveCommand {
    const o = this.out!, t = sim.t;
    const go = (pace: number, facing: number): MoveCommand => {
      const dx = o.dest.x - a.pos.x, dy = o.dest.y - a.pos.y, L = Math.hypot(dx, dy) || 1, v = pace * a.profile.vmax;
      return { vel: { x: dx / L * v, y: dy / L * v }, facing, cutSkill: 0.8 + 0.4 * a.r('elusiveness') };
    };
    // A throw-away under way: the short motion, then the ball goes.
    if (o.away !== null) {
      if (t >= o.away) { this.breakRec.push({ t, what: 'away' }); this.out = null; return this.throwAway(a, sim); }
      return go(OUT_THROW_PACE, o.side * Math.PI / 2);
    }
    if (t >= o.decideAt) {
      o.decideAt = t + this.processing(a);
      const threats = this.pursuers(a, sim);
      // The nearest pursuer he feels: how far he is, and how soon he gets to where the quarterback is going. Not to
      // where he stands: he is running, and the time he has is the time until a pursuer reaches the spot he is running
      // to (measured to where he stands, every break looked like a man about to be hit and his bar fell at once).
      let soon = Infinity, dist = Infinity;
      for (const { d, seen, held } of threats) {
        soon = Math.min(soon, timeToReach({ pos: seen.pos, vel: seen.vel, profile: this.bodyOf(a, d), speedScale: 1 }, o.dest, 0.8) + held);
        dist = Math.min(dist, Math.hypot(seen.pos.x - a.pos.x, seen.pos.y - a.pos.y));
      }
      // His bar is the bar he has in the pocket: his own, lowered by the pressure he feels now (the same rule).
      const aggression = 0.5 + 0.35 * (a.player.archetype === 'Gunslinger' ? 1 : 0) - 0.25 * a.r('decisionMaking');
      const u = clamp((0.9 - soon) / 0.7, 0, 1) * (0.5 + 0.5 * a.r('pocketPresence'));
      o.thr = 0.6 - 0.12 * aggression - 0.32 * u; o.risk = 0.025 + 0.05 * aggression + 0.08 * u;
      // One look per decision: the man his eyes are on now, then the next. No look round the whole field.
      const man = o.order.length ? o.order[o.idx % o.order.length] : null;
      const k = man ? this.reads.indexOf(man) : -1;
      if (k >= 0) { this.readIdx = k; this.readStart = t; }
      const seenNow = man && (this.ready(man, sim) || u >= 0.8) ? this.evaluate(a, sim, man, u) : null;
      if (!(seenNow && seenNow.P >= o.thr && seenNow.intRisk <= o.risk)) o.idx++;
      const best = o.best = this.lastHotBest = seenNow;
      const near = Math.max(0, best ? best.P / o.thr : 0);
      // Tuck and run: a lane past the line beats every pursuer he feels, and nobody is near his bar.
      if (near < TUCK_BAR) {
        const ahead = [0, 2, 4].map((k) => ({ x: Math.max(a.pos.x + 4, sim.los + 1), y: clamp(a.pos.y + o.side * k, 1, FIELD_WIDTH - 1) }));
        if (ahead.some((q) => this.spotMargin(a, q, threats) > BREAK_MARGIN)) return this.scramble(a, sim);
      }
      // Throw it away: outside the tackles, a pursuer inside one motion and one processing time, nobody above half the bar.
      if (this.outsidePocket(a, sim) && soon < this.windup(a) + this.processing(a) && near < 0.5) {
        o.away = t + AWAY_LOAD * this.load(a);
        return go(OUT_THROW_PACE, o.side * Math.PI / 2);
      }
      // Stop and set: nobody inside SET_ROOM for a reaction time. Where he stands is his pocket now.
      if (dist >= SET_ROOM) {
        o.clearSince ??= t;
        if (t - o.clearSince >= a.profile.reactionTime) {
          this.breakRec.push({ t, what: 'set' });
          this.out = null; this.hasSet = true; this.drop = { ...this.drop, x: a.pos.x }; this.dropY = a.pos.y; this.readIdx = 0; this.readStart = t;
          return stand();
        }
      } else o.clearSince = null;
      // His destination: held until reached, lapsed, or closed by a pursuer; then the candidate that keeps the most
      // time on them and stays behind the line while the ball is up.
      const left = Math.hypot(o.dest.x - a.pos.x, o.dest.y - a.pos.y);
      if (left < 0.75 || t >= o.until || this.spotMargin(a, o.dest, threats) <= 0) {
        let pick: Vec2 | null = null, pm = -Infinity;
        for (const [hx, hy] of [[0, 1], [0.57, 0.82], [-0.4, 0.92]] as const) {
          const q = { x: Math.min(a.pos.x + hx * OUT_STEP, sim.los - 1), y: clamp(a.pos.y + o.side * hy * OUT_STEP, 1.5, FIELD_WIDTH - 1.5) };
          const m = this.spotMargin(a, q, threats);
          if (m > pm) { pm = m; pick = q; }
        }
        if (pick) { o.dest = pick; o.until = t + OUT_HOLD; }
      }
    }
    // A throw he likes, from his last look round, priced again now; the eyes gate and the finish check apply.
    const b = o.best;
    if (b && b.P >= o.thr && b.intRisk <= o.risk) {
      const ev = this.evaluate(a, sim, b.target, 1);
      if (ev && ev.P >= o.thr && ev.intRisk <= o.risk) {
        const start = this.startIfFinish(a, sim, ev);
        if (start) { this.breakRec.push({ t, what: 'throw' }); return start; }
      }
    }
    // Keep moving, eyes downfield (toward the man he likes, else up the field).
    const eye = b ? Math.atan2(b.point.y - a.pos.y, b.point.x - a.pos.x) : 0;
    return go(OUT_PACE, eye);
  }

  private evade(a: Agent, sim: PlaySim, threat: Agent | null): MoveCommand {
    if (!threat) return stand();
    // Step away from the rusher, climbing if he comes from the edge.
    // QB_HONEST_FEEL: he steps away from where he feels the man, not from where the man truly is.
    const tp = QB_HONEST_FEEL ? this.felt(a, sim, threat).pos : threat.pos;
    const away = { x: a.pos.x - tp.x, y: a.pos.y - tp.y };
    const l = Math.hypot(away.x, away.y) || 1;
    const fromEdge = Math.abs(tp.y - a.pos.y) > 1.5 && tp.x < a.pos.x + 1;
    const side = Math.sign(away.y) || Math.sign(a.pos.y - sim.ballY) || 1;
    const dir = fromEdge ? { x: 0.8, y: (away.y / l) * 0.6 } : QB_EVADE_UP ? { x: 0.45, y: side * 0.9 } : { x: away.x / l, y: away.y / l };
    const elus = 0.5 + 0.5 * a.r('elusiveness');
    return { vel: { x: dir.x * a.profile.vmax * 0.7 * elus, y: dir.y * a.profile.vmax * 0.7 * elus }, facing: 0, cutSkill: 0.8 + 0.4 * a.r('elusiveness') };
  }

  /** QB_EDGE_THREAT: whether he is stepping up from an edge threat (for the exit margins). */
  private edgeOn = false;
  private pocketMove(a: Agent, sim: PlaySim, read: Agent | undefined): MoveCommand {
    // Hold the set point, sliding away from nearby rushers. When an edge rusher
    // gets to his depth outside him — the tackle riding him past — he climbs
    // into the pocket before the rusher can turn the corner. He reacts to what
    // he sees and feels: a rusher behind his shoulder registers late, and
    // pocket presence decides how early he senses the edge closing.
    const pp = a.r('pocketPresence');
    let fx = 0;
    let fy = 0;
    let edge = false;
    let threat = false;
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const fd = this.felt(a, sim, d), seen = fd.pos;
      const dx = a.pos.x - seen.x;
      const dy = a.pos.y - seen.y;
      const dd = Math.hypot(dx, dy);
      if (dd < 1e-3) continue;
      if (QB_POCKET) continue; // the nearest body decides, below; no drift
      if (QB_EDGE_THREAT) {
        // QB_EDGE_THREAT: wide and level as before (a little farther once stepping), untied in his picture, closing on him.
        if (Math.abs(dy) > 1.6 && seen.x <= a.pos.x + 1.5 && dd < 2.5 + 3 * pp + (this.edgeOn ? 0.5 : 0)) {
          const closing = (fd.vel.x * dx + fd.vel.y * dy) / dd;
          if (closing > (this.edgeOn ? EDGE_CLOSE_OUT : EDGE_CLOSE_IN) && !this.seenTied(a, sim, d, seen)) threat = true;
        }
      } else if (Math.abs(dy) > 1.6 && seen.x <= a.pos.x + 1.5 && dd < 2.5 + 3 * pp) edge = true;
      if (dd > 3.5) continue;
      const w = (3.5 - dd) / 3.5;
      fx += (dx / dd) * w;
      fy += (dy / dd) * w;
    }
    // QB_POCKET: the nearest body he feels inside POCKET_NEAR decides. At the edge: the climb below, unchanged. In
    // front or inside: a slide (returned here while it lasts).
    if (QB_EDGE_THREAT && !QB_POCKET) {
      // Room ahead in his picture: the nearest body within 30 deg of straight ahead (teammates seen, defenders felt).
      const dir = sim.attackDir(a.team);
      let room = Infinity;
      for (const o of [...sim.offense, ...sim.defense]) {
        if (o === a || o.isDown(sim.t)) continue;
        const p = o.team === a.team ? sim.see(a, o).pos : this.felt(a, sim, o).pos;
        const ax = (p.x - a.pos.x) * dir, ay = p.y - a.pos.y;
        if (ax > 0 && Math.abs(Math.atan2(ay, ax)) < Math.PI / 6) room = Math.min(room, Math.hypot(ax, ay));
      }
      edge = threat && room > (this.edgeOn ? EDGE_ROOM_OUT : EDGE_ROOM_IN);
      this.edgeOn = edge;
    }
    let slideMove: Vec2 | null = null;
    if (QB_POCKET) {
      const d = this.pocketDecide(a, sim, read);
      if (d.out) return this.outTick(a, sim);
      edge = d.edge;
      slideMove = d.slide;
    }
    const home = { x: this.drop.x + (edge ? 1.8 + 1.2 * pp : 0), y: this.dropY };
    const tx = home.x + fx * 2 * pp;
    const ty = home.y + fy * 2 * pp;
    const facing = this.bodyFacing(a, sim, (QB_EYES && this.eyesOn) || read);
    if (slideMove) return goTo(a, slideMove, { speed: Math.min(1, POCKET_SLIDE_PACE / a.profile.vmax), facing, cutSkill: 0.8 + 0.4 * a.r('elusiveness') });
    // QB_FEEL: a rusher he feels closing moves him now, not toward a set
    // point: up inside an edge rusher's arc, away from interior push, at a
    // pace he can still throw from, eyes still on his read.
    if (QB_FEEL) {
      const p = this.pressure(a, sim);
      if (p.agent && p.time < 1.2) {
        const r = this.felt(a, sim, p.agent).pos;
        const dx = a.pos.x - r.x, dy = a.pos.y - r.y, dd = Math.hypot(dx, dy) || 1;
        const outside = Math.abs(dy) > 1.0 && r.x <= a.pos.x + 1;
        // Interior push: slide off its line; a little give if it is on top of him.
        const side = Math.sign(dy) || Math.sign(a.pos.y - sim.ballY) || 1;
        const dir = outside ? { x: 0.85, y: 0.5 * side } : { x: dd < 1.5 ? -0.3 : 0, y: side };
        const n = Math.hypot(dir.x, dir.y) || 1;
        const pace = (1.6 + 1.2 * a.r('elusiveness')) * clamp((1.2 - p.time) / 0.6, 0.4, 1);
        const vx = dir.x / n * pace, vy = dir.y / n * pace;
        const room = sim.los - 2.5 - a.pos.x;
        return { vel: { x: room > 0 ? vx : Math.min(0, vx), y: vy }, facing, cutSkill: 0.8 + 0.4 * a.r('elusiveness') };
      }
    }
    if (POCKET_CLIMB) {
      const climb = this.climb(a, sim, facing);
      if (climb) return climb;
    }
    // QB_FOOTWORK bit 1: the gather is a step of his footwork in time, not a command that holds him: while it lasts his
    // body does what the pocket does (the spring and its push off a body near him; the climb with an edge rusher).
    // A first form pinned him to the spot for the stride; with his feet on the plan's clock he was in a gather most
    // of his time in the pocket, the push off a rusher never acted, and the arm was held (dagger on develop's deeper
    // five: 10 throw_held on 11 new sacks). Replacing that movement is bit 4's.
    // QB_GATHER: a hitch to the read his eyes are on, from where he is when they get there; no hitch with an edge
    // rusher he feels (he slides off him as before).
    if (QB_GATHER && QB_GATHER_THROW) {
      // One hitch, toward the man he has decided on, while his eyes finish on him. No hitch while he only reads.
      const to = edge ? null : this.gateFor;
      if (to) {
        if (this.hitchFor !== to) {
          this.hitchFor = to;
          const seen = sim.see(a, to).pos, dx = seen.x - a.pos.x, dy = seen.y - a.pos.y, L = Math.hypot(dx, dy) || 1;
          const len = 0.5 + 0.3 * (1 - a.r('release')) + 0.2 * (1 - Math.min(1, a.player.experience / 8));
          this.hitchTo = { x: Math.min(a.pos.x + dx / L * len, sim.los - 2.5), y: a.pos.y + dy / L * len };
        }
        return goTo(a, this.hitchTo!, { speed: 0.35, facing });
      }
    } else if (QB_GATHER && read && !edge) {
      if (this.hitchFor !== read) {
        this.hitchFor = read;
        const seen = sim.see(a, read).pos, dx = seen.x - a.pos.x, dy = seen.y - a.pos.y, L = Math.hypot(dx, dy) || 1;
        const len = 0.5 + 0.3 * (1 - a.r('release')) + 0.2 * (1 - Math.min(1, a.player.experience / 8));
        // The hitch is up and toward him, never back: the pocket's floor is where he stands.
        const ux = Math.max(0.35, dx / L), uy = dy / L, n = Math.hypot(ux, uy);
        this.hitchTo = { x: Math.min(a.pos.x + ux / n * len, sim.los - 2.5, this.drop.x + 2.5), y: a.pos.y + uy / n * len };
      }
      return goTo(a, this.hitchTo!, { speed: 0.35, facing });
    }
    return goTo(a, { x: Math.min(tx, sim.los - 2.5), y: ty }, { speed: edge ? 0.6 : 0.45, facing });
  }

  /** QB_POCKET: the one decision for his feet, on his pictures (felt() for defenders, see() for teammates and the
   * read). Returns whether the nearest body inside POCKET_NEAR is at the edge (the caller climbs), and the slide
   * destination while a slide is decided or under way. */
  private pocketDecide(a: Agent, sim: PlaySim, read: Agent | undefined): { edge: boolean; slide: Vec2 | null; out?: boolean } {
    const t = sim.t;
    const felt = sim.defense.filter((d) => !d.isDown(t)).map((d) => { const f = this.felt(a, sim, d); return { d, pos: f.pos, vel: f.vel }; });
    const clearOf = (q: Vec2) => felt.every(({ pos }) => Math.hypot(pos.x - q.x, pos.y - q.y) >= POCKET_CLEAR);
    if (this.slide) {
      const s = this.slide, left = Math.hypot(s.to.x - a.pos.x, s.to.y - a.pos.y);
      if (left > 0.25 && t < s.until && clearOf(s.to)) return { edge: false, slide: s.to };
      const rec = this.slideLog[this.slideLog.length - 1];
      if (rec && !rec.end) rec.end = { t, why: left <= 0.25 ? 'there' : t >= s.until ? 'lapsed' : 'closed', moved: Math.hypot(a.pos.x - rec.from.x, a.pos.y - rec.from.y) };
      this.slide = null;
    }
    const near = POCKET_NEAR0 + POCKET_NEAR_PP * a.r('pocketPresence');
    let by: { d: Agent; pos: Vec2; vel: Vec2 } | null = null, bd = near;
    for (const f of felt) {
      const dd = Math.hypot(f.pos.x - a.pos.x, f.pos.y - a.pos.y);
      if (dd <= bd) { by = f; bd = dd; }
    }
    if (!by) return { edge: false, slide: null };
    const edge = Math.abs(by.pos.y - a.pos.y) > POCKET_EDGE_WIDE && by.pos.x <= a.pos.x + POCKET_EDGE_DEPTH;
    const inHands = this.held(a, by.d, sim) > 0;
    this.pocketFirst ??= { t, where: edge ? 'edge' : 'front', inHands, dist: bd };
    if (edge) return { edge: true, slide: null };
    // In front or inside, a body moves him only if nobody has it, or a blocker has it and it is still coming at him
    // (the pocket being pushed into his lap). A rusher held where he is does not.
    const closing = -((by.vel.x * (by.pos.x - a.pos.x) + by.vel.y * (by.pos.y - a.pos.y)) / Math.max(bd, 1e-6));
    if (inHands && closing < POCKET_CLOSING) return { edge: false, slide: null };
    // One slide per body until it is clearly nearer.
    const last = this.slidAt.get(by.d);
    if (last !== undefined && bd > last - POCKET_RENEW) return { edge: false, slide: null };
    // QB_BREAK: a man in front who is free, or in a blocker's hands and still coming at him, is answered by leaving
    // when a spot outside beats the pursuers he feels; the slide is what is left when none does. NFL quarterbacks who
    // leave do it from a man who is still blocked 87% of the time (nearest DL/LB 2.2 / 3.0 / 4.4 yd away at the onset,
    // closing at 1.4 yd/s; scripts/diag/escape/leave-onset.py), so waiting for him to come free was waiting too long.
    if (QB_BREAK && this.tryBreak(a, sim, 'feel')) return { edge: false, slide: null, out: true };
    this.slidAt.set(by.d, bd);
    const rp = read ? sim.see(a, read).pos : null;
    const toRead = !!rp && Math.abs(rp.y - a.pos.y) >= POCKET_READ_SIDE;
    const first = toRead ? Math.sign(rp!.y - a.pos.y) : Math.sign(a.pos.y - by.pos.y) || Math.sign(a.pos.y - sim.ballY) || 1;
    const mates = sim.offense.filter((o) => o !== a && !o.isDown(t)).map((o) => ({ o, pos: sim.see(a, o).pos }));
    for (const sg of [first, -first]) {
      const q = { x: a.pos.x, y: a.pos.y + sg * POCKET_SLIDE };
      if (q.y < 1 || q.y > FIELD_WIDTH - 1 || !clearOf(q)) continue;
      if (mates.some(({ o, pos }) => Math.hypot(pos.x - q.x, pos.y - q.y) < o.profile.radius + a.profile.radius)) continue;
      this.slide = { to: q, until: t + POCKET_MAX_T };
      this.slideLog.push({ t, dist: bd, toRead: toRead && sg === first, inHands, by: by.d.slot, from: { x: a.pos.x, y: a.pos.y } });
      return { edge: false, slide: q };
    }
    return { edge: false, slide: null };
  }

  /** SET_DECIDE: a rusher as he sees him closing. His delayed picture is carried
   * forward with the acceleration he has seen it gaining (two samples of the
   * same delayed picture one tick apart), not at constant velocity: a rusher
   * coming off a block is speeding up, and the constant-velocity picture puts
   * him about 0.15 s later than he arrives. Capped at the rusher's top speed. */
  private feltClosing(a: Agent, sim: PlaySim, d: Agent): { pos: Vec2; vel: Vec2 } {
    const seen = this.felt(a, sim, d), age = seen.age ?? 0;
    // TRACK_FEEL: the tracking channel carries no acceleration term; this compensator for the stale picture retires.
    if (TRACK_FEEL || age <= 0) return seen;
    const older = sim.perception.perceive(d.idx, age + sim.dt);
    const ax = (seen.vel.x - older.vel.x) / sim.dt, ay = (seen.vel.y - older.vel.y) / sim.dt;
    let vx = seen.vel.x + ax * age, vy = seen.vel.y + ay * age;
    const v = Math.hypot(vx, vy), cap = d.profile.vmax * (d.speedScale ?? 1);
    if (v > cap) { vx *= cap / v; vy *= cap / v; }
    return { pos: { x: seen.pos.x + 0.5 * ax * age * age, y: seen.pos.y + 0.5 * ay * age * age }, vel: { x: vx, y: vy } };
  }

  /** SET_DECIDE: whether he can finish a throwing motion here before the
   * nearest rusher he sees closing could reach him. */
  private canFinish(a: Agent, sim: PlaySim): boolean {
    const need = this.windup(a);
    for (const d of sim.defense) {
      if (d.isDown(sim.t)) continue;
      const seen = this.feltClosing(a, sim, d);
      if (timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, a.pos, 0.8) + this.held(a, d, sim) < need) return false;
    }
    return true;
  }

  /** SET_DECIDE: null when he still has the time he needs where he stands
   * (nothing changes) or when no spot buys him time (trapped: the existing
   * logic decides); otherwise the move, or the escape it has opened. */
  private setDecide(a: Agent, sim: PlaySim, read: Agent | undefined, needOverride?: number, paceOverride?: number): MoveCommand | null {
    const rhythm = this.concept.family === 'quick' ? 0.6 : 1;
    const dwell = (0.42 + 0.4 * (1 - a.r('decisionMaking')) - 0.1 * a.r('awareness')) * rhythm * (1 + 0.3 * (1 - a.mind.focus));
    // PERCEPTION: the rushers as he sees them closing, and his own blockers'
    // bodies as he sees them (a teammate's position reaches him quickly).
    const threats = sim.defense.filter((d) => !d.isDown(sim.t)).map((d) => ({ d, seen: this.feltClosing(a, sim, d) }));
    const mates = sim.offense.filter((o) => o !== a && !o.isDown(sim.t)).map((o) => ({ o, pos: sim.see(a, o).pos }));
    // ABILITY: where his body can get in the time, at the pace he can still
    // throw from (missSigma's 2.2 yd/s edge of a set throw). EXTEND: his
    // mobility's pace when he is escaping rather than resetting.
    const pace = paceOverride ?? 2.2;
    // The time he still needs here: the rest of this read, or (if it is done) a
    // full look at the next, then a throw; in the drop, the rest of the drop and
    // a throw (so an on-time throw keeps its chance).
    const rest = this.readStart + dwell - sim.t;
    const need = needOverride ?? ((rest > 0 ? rest : dwell) + this.windup(a));
    // A rusher's time to a spot, around any of his blockers standing on the line
    // between them (the perceived block read's geometry: around the blocker's
    // body at a held rusher's pace, plus getting off his hands), so a walled-off
    // rusher counts late and a free or winning one counts in full.
    const detour = (from: Vec2, q: Vec2, rd: number) => {
      const px = q.x - from.x, py = q.y - from.y, L = Math.hypot(px, py) || 1;
      let worst = 0;
      for (const { o, pos } of mates) {
        const along = ((pos.x - from.x) * px + (pos.y - from.y) * py) / L;
        const off = Math.abs((pos.x - from.x) * py - (pos.y - from.y) * px) / L, width = rd + o.profile.radius;
        if (along <= 0 || along >= L || off >= width) continue;
        worst = Math.max(worst, 0.2 + (width - off) / 2);
      }
      return worst;
    };
    // EXTEND: the same felt time his alarm uses (FREE_BOUND's bound on a free man, at that spot).
    const bounded = EXTEND && FREE_BOUND && paceOverride !== undefined;
    const ttc = (q: Vec2) => {
      let best = Infinity;
      for (const { d, seen } of threats) {
        best = Math.min(best,
          timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, q, 0.8) + detour(seen.pos, q, d.profile.radius));
        if (bounded) best = Math.min(best, this.freeBound(a, sim, d, seen, q));
      }
      return best - need;
    };
    // A spot with a teammate standing in it is not his to take.
    const taken = (q: Vec2) => mates.some(({ o, pos }) => Math.hypot(pos.x - q.x, pos.y - q.y) < o.profile.radius + a.profile.radius);
    // DISPOSITION (the league-average hook for per-QB traits): how much felt time
    // a move must buy before he gives up his spot. 0: any gain moves him.
    const MOVE_FOR = 0;
    // A direction he has committed to runs for one reaction time before he decides again.
    let dir: Vec2 | null = this.moveDir && sim.t < this.moveUntil ? this.moveDir : null;
    const stay = ttc(a.pos);
    if (!dir && stay >= 0) { this.moveDir = null; return null; }
    if (!dir) {
      let bestT = stay;
      for (let k = 0; k < 8; k++) {
        const th = k * Math.PI / 4, c = { x: Math.cos(th), y: Math.sin(th) };
        const q = { x: a.pos.x + c.x * pace * need, y: clamp(a.pos.y + c.y * pace * need, 1, FIELD_WIDTH - 1) };
        if (q.x > sim.los - 2.5 && c.x > 0) continue;
        // No retreat past his set depth: deeper takes him into the edge rushers'
        // arcs and off his throwing base (NFL pressured QBs retreat ~0%; the
        // straight-line time to reach here does not see his blockers walling
        // off the front).
        if (c.x < -0.1 && a.pos.x <= this.drop.x + 0.1) continue;
        if (taken(q)) continue;
        const v = ttc(q);
        if (v > bestT + MOVE_FOR) { bestT = v; dir = c; }
      }
      if (!dir) { this.moveDir = null; return null; }
      this.moveDir = dir; this.moveUntil = sim.t + a.profile.reactionTime;
    }
    // Escape: the movement has opened a lane and the read logic has offered nothing.
    if (this.shouldScramble(a, sim, false)) { this.moveDir = null; return this.scramble(a, sim); }
    const facing = this.bodyFacing(a, sim, (QB_EYES && this.eyesOn) || read);
    const vx = a.pos.x >= sim.los - 2.5 ? Math.min(0, dir.x * pace) : dir.x * pace;
    return { vel: { x: vx, y: dir.y * pace }, facing, cutSkill: 0.8 + 0.4 * a.r('elusiveness') };
  }

  /** POCKET_CLIMB: the move (or none) that leaves the most felt time to contact
   * one throwing motion from now. Null when standing is best. */
  private climb(a: Agent, sim: PlaySim, facing: number): MoveCommand | null {
    // The time he still needs here: the rest of his current read, then a throw.
    const rhythm = this.concept.family === 'quick' ? 0.6 : 1;
    const dwell = (0.42 + 0.4 * (1 - a.r('decisionMaking')) - 0.1 * a.r('awareness')) * rhythm * (1 + 0.3 * (1 - a.mind.focus));
    const horizon = Math.max(0, this.readStart + dwell - sim.t) + this.windup(a), pace = 2.2;
    const threats = sim.defense.filter((d) => !d.isDown(sim.t))
      .map((d) => ({ d, seen: this.felt(a, sim, d), held: this.held(a, d, sim) }));
    const ttc = (q: Vec2) => {
      let best = Infinity;
      for (const { d, seen, held } of threats) best = Math.min(best,
        timeToReach({ pos: seen.pos, vel: seen.vel, profile: d.profile, speedScale: d.speedScale }, q, 0.8) + held - horizon);
      return best;
    };
    const stay = ttc(a.pos);
    // Where he stands he can still finish a throw before contact: no need to move.
    if (stay >= 0) return null;
    let bestT = stay, bestDir: Vec2 | null = null;
    for (let k = 0; k < 8; k++) {
      const th = k * Math.PI / 4, dir = { x: Math.cos(th), y: Math.sin(th) };
      const q = { x: a.pos.x + dir.x * pace * horizon, y: clamp(a.pos.y + dir.y * pace * horizon, 1, FIELD_WIDTH - 1) };
      if (q.x > sim.los - 2.5 && dir.x > 0) continue;
      const t = ttc(q);
      if (t > bestT) { bestT = t; bestDir = dir; }
    }
    if (!bestDir) return null;
    return { vel: { x: bestDir.x * pace, y: bestDir.y * pace }, facing, cutSkill: 0.8 + 0.4 * a.r('elusiveness') };
  }
}

/** Run plays: open to the mesh point, hand off (or pitch), carry out the fake. */
export class QBHandoff implements Behavior {
  readonly kind = 'qb-handoff';
  private handed = false;
  private exchangeClosing = false;
  constructor(
    private readonly mesh: Vec2,
    private readonly meshTime: number,
    private readonly rb: Agent | null,
    private readonly pitchRange = 1.3,
    private readonly keeper = false,
    /** GUN_MESH: the point on the back's track where the ball goes in. */
    private readonly ballPoint?: Vec2,
    /** GUN_SNAP: when he can first give it (snap secured + his handoff action); no installed window. */
    private readonly secured?: number,
  ) {}

  update(a: Agent, sim: PlaySim): MoveCommand {
    if (this.handed || sim.carrier !== a) {
      if (this.handed) sim.pretendCarry(a);
      // Carry out the fake away from the installed play, even after the
      // exchange has taken the QB slightly across his own mesh spot.
      const run = sim.offCall.run;
      const playSide = run ? (run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign) : 0;
      const away = a.pos.y + (playSide ? -playSide : Math.sign(a.pos.y - this.mesh.y || 1)) * 4;
      return goTo(a, { x: sim.los - 6, y: away }, { speed: 0.4 });
    }
    if (this.keeper && sim.t >= this.meshTime) {
      a.behavior = new BallCarrier({ aim: { x: sim.los + 1, y: sim.ballY }, aimUntil: sim.t + 0.8 }, a);
      sim.stats.rusher = a.player.id;
      return a.behavior.update(a, sim);
    }
    const rb = this.rb;
    if (rb && sim.t >= (this.secured !== undefined ? this.secured : this.meshTime - 0.15)) {
      const d = Math.hypot(rb.pos.x - a.pos.x, rb.pos.y - a.pos.y);
      if (this.pitchRange > handoffReach(a, rb) && d <= this.pitchRange) {
        this.handed = sim.pitchBall(a, rb);
        return stand();
      }
      // GUN_MESH: the ball goes into his pocket where his track meets it, not
      // at the first moment he comes within reach on his way there.
      const bp = this.ballPoint, v = Math.hypot(rb.vel.x, rb.vel.y);
      const atPoint = !bp || v < .5 || ((rb.pos.x - bp.x) * rb.vel.x + (rb.pos.y - bp.y) * rb.vel.y) / v >= -.25;
      if (d <= handoffReach(a, rb) && atPoint) {
        this.handed = sim.handoff(a, rb);
        return stand();
      }
      if (this.pitchRange <= handoffReach(a, rb)) {
        const seen = sim.see(a, rb), dx = seen.pos.x - a.pos.x, dy = seen.pos.y - a.pos.y;
        const radial = dx * (seen.vel.x - a.vel.x) + dy * (seen.vel.y - a.vel.y);
        if (radial < 0) this.exchangeClosing = true;
        const speed = Math.hypot(seen.vel.x, seen.vel.y), reach = handoffReach(a, rb);
        // A delayed picture of the back has passed the mesh and our closest
        // approach, outside reach and separating. Continuing this give would
        // require a new recovery route, not the installed run-through track.
        // Secure the ball and carry; do not chase him or extend transfer reach.
        const pastMesh = (seen.pos.x - this.mesh.x) * seen.vel.x + (seen.pos.y - this.mesh.y) * seen.vel.y;
        if (this.exchangeClosing && Math.hypot(dx, dy) > reach && radial > 0
          && dx * seen.vel.x + dy * seen.vel.y > 0 && pastMesh > reach * speed) {
          a.behavior = new BallCarrier({ qb: true }, a);
          sim.stats.rusher = a.player.id;
          sim.event('read', a, rb, 'exchange passed outside reach; secure and carry');
          return a.behavior.update(a, sim);
        }
      }
    }
    if (sim.t < 0.05) return stand();
    // Quick reverse pivot / step to the mesh. Once the back is already on it
    // and riding past, ride with him: put the ball where he is going.
    if (rb && sim.t >= this.meshTime - 0.3 && Math.hypot(rb.pos.x - this.mesh.x, rb.pos.y - this.mesh.y) < 1.2) {
      const seen = sim.see(a, rb), lead = { x: seen.pos.x + seen.vel.x * .2, y: seen.pos.y + seen.vel.y * .2 };
      return goTo(a, lead, { speed: 1, facing: angleTo(a.pos, lead), through: 0 });
    }
    const facing = angleTo(a.pos, this.mesh);
    return goTo(a, this.mesh, { speed: 1, facing, through: 0 });
  }
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);

/** The firmest control a tackler has of `a` (0 when nobody is holding him). */
/** THROW_BODY: how much the holds on him interfere with a throw: how firmly
 * he is held times how high the highest hold sits (1 - its leg share). */
export function throwInterference(a: Agent, sim: PlaySim): number {
  const held = heldBy(a, sim);
  if (held <= 0) return 0;
  let legs = 1;
  for (const j of sim.world.joints) if (j.kind === 'grasp' && !j.broken && j.b === a.body) legs = Math.min(legs, j.legs ?? 1);
  return Math.min(1, held) * (1 - Math.min(1, Math.max(0, legs)));
}

/** THROW_HOLD (experimental, off; intended on): a hold on the passer acts on the throw as a force, not a rolled pin.
 * The hold is what the tackler's grasp joints apply to his upper body this step (the World's measured joint force,
 * times the hold's upper-body share: a wrap at the shoulders counts fully, one at the legs not at all); the throw is
 * what his arm and trunk can drive forward (his arm force, the bench-press capacity the trenches use). Their ratio,
 * from the delivery's start to the release: at 1 or more the arm cannot come forward (the ball stays in his hand and
 * the hold rules: a sack in the making); below 1 the ball comes out as an arm throw to that degree (flick: slower and
 * wider, release()). Replaces THROW_BODY's rolled pin. Diagnosis (finish-trace.mts, windup-load.mts): after first
 * contact our QB threw 64-72% within 0.1 s (NFL 30%, 0.3 s later); 54% of throws with a defender within a yard
 * already had a grasp on him at the delivery's start, and came out anyway. */
const THROW_HOLD = process.env.THROW_HOLD !== '0';
export function throwHold(a: Agent, sim: PlaySim): number {
  return throwLoad(a, sim).ratio;
}
/** THROW_HOLD: what disturbs his throwing motion this step, as a share of his arm force, and its direction. The
 * larger of the grasp joints' hold on his upper body (force x upper-body share) and the whole contact load his body
 * received (the support's `load`: bodies arriving, hands, grips) less what holds at his legs account for. So a man
 * arriving at speed disturbs him with no hold taken, and a hold at the ankles does not reach the arm. Also writes
 * sim.qbHold (the upper hold's ratio, whenever a grasp is on him). */
export function throwLoad(a: Agent, sim: PlaySim): { ratio: number; dir: { x: number; y: number } } {
  let upper = 0, legs = 0;
  for (const j of sim.world.joints) {
    if (j.kind !== 'grasp' || j.broken || j.b !== a.body) continue;
    const f = Math.max(0, j.force ?? 0), l = Math.min(1, Math.max(0, j.legs ?? 1));
    upper += f * (1 - l); legs += f * l;
  }
  const L = a.body.support?.load ?? { x: 0, y: 0 }, lm = Math.hypot(L.x, L.y);
  const arm = Math.max(1e-6, supportParams(a.profile).armForce);
  const force = Math.max(upper, lm - legs);
  sim.qbHold = upper / arm;
  return { ratio: force / arm, dir: lm > 1e-9 ? { x: L.x / lm, y: L.y / lm } : { x: 0, y: 0 } };
}

function heldBy(a: Agent, sim: PlaySim): number {
  const bond = sim.bond;
  if (!bond || bond.carrier !== a) return 0;
  return Math.max(0, ...bond.tacklers.map((d) => bond.control?.get(d) ?? bond.grip?.get(d) ?? 1));
}

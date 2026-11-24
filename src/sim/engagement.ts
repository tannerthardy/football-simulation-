/**
 * Trench model: blocking engagements as technical reps on shared physics.
 *
 * `facing` here is read as the CHEST (a blocker's pads toward a man, `beta`, `off`): shoulders by meaning, hips in the code
 * until a stage that gives linemen a trunk (TRUNK_TWIST Stage 1 gives it to receivers only; trunk is 0 for everyone else,
 * so the two are the same number).
 *
 * A rep keeps a small state that line coaches would recognize:
 *
 *   control  — hand position. +1: the blocker's hands are inside and latched
 *              (he steers the defender); −1: the defender controls the blocker
 *              (hands inside on his chest, or the blocker's hands knocked away).
 *   phi      — the defender's angular progress around the blocker relative to
 *              the line he must stay on (QB for pass pro, drive axis for runs),
 *              in units of 90°: 0 = square, ±1 = hip to hip (beaten). It is
 *              measured from where the bodies actually are, every tick.
 *   base     — each player's balance, read from his body (physics/support.ts).
 *              It belongs to the player, not to this rep.
 *
 * The rep does not move anybody. Each tick it publishes, for the blocker,
 * the defender and any helper:
 *
 *   - a movement intent: where each player is trying to go, his facing, his
 *     pad level, and whether he leans into the contact with his legs;
 *   - a hand joint (physics/world.ts): the arms' working distance and the
 *     bounded push, hold and steering force the current hand fight allows.
 *
 * The physics world turns those into motion with the same contact, traction
 * and support rules every other player obeys: who gets pushed back, who
 * mirrors fast enough, who loses his base. Rush moves are choices made from
 * the state of the rep, with execution uncertainty, and their effects are
 * physical actions — a strike to the chest, a snatch that pulls the blocker
 * off balance, hands cleared for a moment so the rusher's own feet carry him
 * past — never a jump in leverage or a prescribed speed.
 */
import { KEY_REACT, keyScale } from './key-read.js';
import { angleDiff, clamp, logistic, norm, sub, type Vec2 } from '../core/vec.js';
import { G } from '../core/units.js';
import { directionalSpeedFactor, gaitLag, fatigueFactor, movingArrivalVelocity, shouldersOf, TRUNK_TWIST } from '../physics/kinematics.js';
import { availability, baseRadiusAt, criticalDeviation, omega0, recoverySpeed, supportParams } from '../physics/support.js';
import { gapY } from '../playbook/alignment.js';
import { CF_FLOW } from './counterfactual.js';
import { connectionGap, contactMotion } from './contact-motion.js';
import { lineFlow, linePicture, liveGapY } from './live-gaps.js';
import { calledLaunchX, plannedDropX } from './called-drop.js';
import { requestToCover } from './motion-plan.js';
import { lineRead, pullers } from './run-fits.js';
import { observedHolder } from './possession-read.js';
import { runContactObservers } from './run-contact-observer.js';
import { DOUBLE_TRACK, ENGAGED_DEFENDER, ENGAGED_TECHNIQUE, REACH_RACE, TRACK_TEMPO, REACH_RACE_OPEN, REACH_TECHNIQUE, drivePace, reachFeet, runWithFeet, wallFeet, type EngagedGoal } from './engaged-technique.js';
import { OPEN_HANDS, PUSH_GROWTH, RUSH_HANDS, type HandJoint, type Intent } from '../physics/world.js';
import { ARM_SPEED } from '../physics/actuation.js';
import { inHeadCone } from './head.js';
import type { Agent, Engagement, RunContactSurface, RushMove } from './agent.js';
import type { PlaySim } from './playsim.js';

// ------------------------------------------------------------ traits

export interface TrenchTraits {
  /** Pad height when bent at the knees (yd). */
  pad: number;
  /** 0–1 flexibility to play low / bend the edge. */
  bend: number;
  /** 0–1 quickness and precision of the hands. */
  hands: number;
  /** Arm length in inches. */
  arm: number;
  /** Lateral quickness while engaged / in a set (yd/s). */
  lateral: number;
  /** 0–1 footwork technique (set, mirror, re-anchor). */
  feet: number;
  /** 0–1 balance / base recovery. */
  balance: number;
  /** 0–1 recognition of what the opponent is doing. */
  read: number;
}

/** PASS_ANCHOR (off; PASS_ANCHOR=1 turns it on): the pass set asks for an
 * anchor, not a drive. His lean into the rusher grows to the load he feels and
 * no further (lean growth 0, not the lean law's 1.25x). An OL fell before the
 * throw on 75% of dropbacks (NFL about 1%), 19% with LEAN_PITCH: leans into a
 * full push pitched him onto the rusher when the load sagged. A tried
 * exception, the ordinary growth back while walked back past his set, raised
 * falls (10.9% -> 15.6% of dropbacks) and bought no pocket depth. */
const PASS_ANCHOR = process.env.PASS_ANCHOR !== '0';
const cache = new WeakMap<Agent, TrenchTraits>();
const runCache = new WeakMap<Agent, TrenchTraits>();

/** The body/drill traits are shared. Hands and feet use the technique of the
 * actual rep; knowing a pass set is not the same skill as sustaining a run fit.
 * The default remains the pass technique used by pre-contact protection.
 */
/** Default on (DL_ANCHOR=0 turns it off): an engaged run defender who is doubled,
 * or is being driven back by a real load, sits into his stance: pads down to
 * get under the drive ("stay low", "drop the pressure leg"; Bucs, Kuchar,
 * Shurmur). It only matters where pad level has a physical path
 * (PAD_LEVERAGE); a blocker already anchors the same way when driven. */
const DL_ANCHOR = process.env.DL_ANCHOR !== '0';
/** Default on (DL_FLATTEN=0 turns it off): an attacking lineman whose blocker steps
 * across his face (a reach or zone step: the man on him, as he sees him, moving across
 * faster than 1 yd/s and more across than at him) flattens on
 * the line at the depth he met him, instead of driving upfield at 1.5 yd/s
 * past the play ("flatten the guard on the L.O.S. and keep outside
 * leverage", Bucs; "push & press", Allen; "do not run outside", Michigan).
 * Upfield penetration against zone opens the cutback and the cut-up behind
 * him: ours finish 1.61 yd upfield on single-blocked outside zone at 2.5 s,
 * tracked linemen 0.62. A vertical drive block keeps the attack. */
const DL_FLATTEN = process.env.DL_FLATTEN !== '0';
/** DL_SQUEEZE (on; =0 turns it off): an engaged first-level man who sees the man on him move
 * away from the ball (a down block, a double driving him off) fights back
 * across toward it ("fight pressure with pressure", "squeeze the down
 * block"), instead of keeping his shoulder on a blocker who is washing him
 * out of the hole. A blocker moving toward the ball (a reach) he still flows
 * with. Tracked linemen close on the back as he reaches the line (lateral
 * move since the snap -0.3 to -0.5 yd, crease 2.4-2.5 yd); ours drift
 * 0.5-1.1 yd away (crease 4.2-4.8; scripts/diag/depth/crease.py). Off: he
 * follows his blocker's flow. */
const DL_SQUEEZE = process.env.DL_SQUEEZE !== '0';
/** DL_SQUEEZE: the squeeze side chosen at a read, and until when it is held. */
const squeezes = new WeakMap<Engagement, { side: number; until: number }>();
/** DL_FLATTEN_WON (with DL_FLATTEN, on): the flatten applies only while he is
 * being reached; one already beside or past the man on him keeps attacking
 * ("if you beat the reach, penetrate and make the play"). */
const DL_FLATTEN_WON = process.env.DL_FLATTEN_WON !== '0';
/** SHED_ROUTE (experimental, off): see the work-off; a first-level man works around the
 * blocker's actual ball-side shoulder, not the frame of the blocker's original drive. */
const SHED_ROUTE = process.env.SHED_ROUTE !== '0';
/** FLAT_PRESS (experimental, off): see the flatten's depth request; his step into the man (yd/s). */
const FLAT_PRESS = process.env.FLAT_PRESS !== '0', FLAT_PRESS_STEP = 0.5;
/** TOUCH_READ (experimental, off): see the flatten read; a hand-fighting lineman
 * reads the man's motion by touch, not by a delayed picture. */
const TOUCH_READ = process.env.TOUCH_READ !== '0';
function drivenBack(d: Agent): boolean {
  const felt = d.body.support?.felt; if (!felt) return false;
  const load = Math.hypot(felt.x, felt.y);
  return load > 0.25 * d.profile.massKg * G && (d.vel.x * felt.x + d.vel.y * felt.y) / load > 0.15;
}

export function traits(a: Agent, type: 'pass' | 'run' = 'pass'): TrenchTraits {
  const common = commonTraits(a);
  if (type === 'pass' || a.team !== 'O') return common;
  let run = runCache.get(a);
  if (!run) {
    const cone = clamp((8.0 - a.player.measurables.threeCone) / 1.3, 0, 1);
    run = { ...common,
      hands: 0.65 * a.r('handTechnique') + 0.35 * a.r('runBlock'),
      feet: 0.6 * a.r('runBlock') + 0.2 * a.r('balance') + 0.2 * cone,
    };
    runCache.set(a, run);
  }
  return run;
}

function commonTraits(a: Agent): TrenchTraits {
  let t = cache.get(a);
  if (t) return t;
  const m = a.player.measurables;
  const cone = clamp((8.0 - m.threeCone) / 1.3, 0, 1);
  const shuttle = clamp((4.9 - m.shuttle) / 0.9, 0, 1);
  const isOff = a.team === 'O';
  const tech = isOff ? 0.5 * a.r('passBlock') + 0.5 * a.r('runBlock') : 0.4 * a.r('passRushFinesse') + 0.3 * a.r('blockShedding') + 0.3 * a.r('passRushPower');
  const bend = clamp(0.45 * cone + 0.25 * shuttle + 0.3 * tech - (m.heightIn - 76) * 0.02, 0, 1);
  const pad = (m.heightIn / 36) * 0.5 * (1.12 - 0.24 * bend);
  const hands = isOff ? 0.65 * a.r('handTechnique') + 0.35 * a.r('passBlock') : 0.6 * a.r('passRushFinesse') + 0.4 * a.r('blockShedding');
  const lateral = a.profile.vmax * a.profile.shuffle * (0.55 + 0.45 * (0.5 * cone + 0.5 * shuttle));
  const feet = isOff ? 0.6 * a.r('passBlock') + 0.2 * a.r('balance') + 0.2 * cone : 0.5 * a.r('passRushFinesse') + 0.3 * cone + 0.2 * a.r('balance');
  t = {
    pad,
    bend,
    hands,
    arm: m.armIn,
    lateral,
    feet,
    balance: a.r('balance'),
    read: 0.6 * a.r('awareness') + 0.4 * a.r(isOff ? 'handTechnique' : 'playRecognition'),
  };
  cache.set(a, t);
  return t;
}

// ------------------------------------------------------------ geometry

/** Reference contact surface, normally against the displacement intention. */
export function axisOf(sim: PlaySim, e: Engagement): Vec2 {
  if (e.type === 'pass') return norm(sub(sim.qb.pos, e.defender.pos));
  if (e.surfaceAxis) return e.surfaceAxis;
  const d = e.drive ?? norm(sub(e.defender.pos, e.blocker.pos));
  return { x: -d.x, y: -d.y };
}

const latOf = (a: Vec2): Vec2 => ({ x: -a.y, y: a.x });

/** Set relative to the visible launch point, leaving space to step up.
 * Tackles gain more depth to intersect an edge arc; the interior stays in
 * front. This is a protection technique choice, not an elapsed-snap gate.
 */
export function passSetDepth(sim: PlaySim, b: Agent): number {
  const tackle = b.slot === 'LT' || b.slot === 'RT';
  const clearance = tackle ? 2.8 : 3.8;
  // SET_SPOT: from the call (the drop he knows is coming), or the QB's alignment at the snap; never the QB's live
  // position behind him. The tackles keep the live read unless SET_SPOT_TACKLE (KNOWN_PROBLEMS PRO-INFO #12).
  const fromCall = SET_SPOT && (!tackle || SET_SPOT_TACKLE);
  const qx = fromCall ? calledLaunchX(sim) ?? sim.snapX[sim.qb.idx] ?? sim.qb.pos.x : sim.qb.pos.x;
  const pocket = Math.max(tackle ? 1.4 : 1, sim.los - qx - clearance);
  const snapDepth = sim.los - (sim.snapX[b.idx] ?? b.pos.x);
  // SET_SPOT, interior: the short set as taught (two set steps back off his snap spot), no deeper than the pocket's
  // front. Further ground is what the rusher wins against him, not his request.
  if (SET_SPOT && (b.slot === 'LG' || b.slot === 'C' || b.slot === 'RG')) {
    const short = Math.min(pocket, snapDepth + SHORT_SET);
    // POCKET_LEVEL: then level with the pocket, a request with a pace (his neighbors'), bounded by the short set and
    // the pocket's front from the call.
    // POCKET_DROP: from the gun, the cup in front of the drop he knows from the call, on its clock.
    const onDrop = POCKET_DROP ? pocketDropDepth(sim, clearance) : null;
    if (onDrop !== null) return Math.min(pocket, Math.max(snapDepth, onDrop));
    const level = POCKET_LEVEL ? pocketLevelDepth(sim, b) : null;
    return level === null ? short : Math.min(pocket, Math.max(short, level));
  }
  // SET_SPOT_TACKLE: his own set is the three-step vertical set as taught, no deeper than the pocket's front from the
  // call. Further depth is the rusher's: the kick keeps him deeper than the man up his arc (PASS_KICK), never past the
  // launch point he knows from the call.
  if (SET_SPOT_TACKLE && tackle) return Math.min(pocket, snapDepth + TACKLE_STEPS);
  return pocket;
}
/** POCKET_LEVEL (experimental, off; POCKET_LEVEL=1, needs SET_SPOT): the interior set's second phase. The NFL's
 * uncovered guard or center goes back 0.2 / 0.9 / 1.9 / 2.9 yd at 0.5 / 1.0 / 1.5 / 2.0 s with nobody on him, as far as
 * an engaged one (0.2 / 0.8 / 1.7 / 2.7; ol-set-depth.py --uncovered): the retreat is his set, keeping level with the
 * pocket, not the push. The pocket is the cup the line forms around the launch point he knows from the call, never
 * the QB.
 * - **"Level with":** his distance from the launch point matches the median of three distances: his two neighbors'
 *   (as he sees them, beside him) and the tackles' mean (the honest tackles set the pocket's edges from the rusher and
 *   the call).
 * - **One outlier doesn't drag him:** a neighbor beaten cleanly is outvoted. A stunt, or two men driven back together,
 *   moves the median.
 * - **His target** is the point at that distance from the launch point at his own width, no shallower than his short
 *   set and no deeper than the pocket's front.
 * - **The pace** is the set's own track and the rep's kick toward it. Engaged, he gives that ground under control with
 *   his man in front (stepPassRep's lateral reference is unchanged).
 * Null when it gives no depth (his neighbors still at the line). */
export const POCKET_LEVEL = process.env.SET_SPOT !== '0' && process.env.POCKET_LEVEL !== '0';
/** POCKET_DROP (experimental, off; POCKET_DROP=1, needs SET_SPOT, on since engine-72; POCKET_LEVEL's next bit; Integration, 2026-11-16): from
 * the gun the interior set is the cup in front of the drop, on the drop's clock. NFL dropbacks from the gun hold the
 * middle three OL a near-constant 3.8-4.1 yd in front of the QB through the whole drop (QB minus interior depth p50
 * 3.8 / 3.8 / 3.9 / 4.0 / 4.1 / 4.0 / 3.8 yd at 0.5 / 0.8 / 1.0 / 1.3 / 1.5 / 2.0 / 2.5 s; scripts/diag/pass-operators/
 * pocket-gap.py). His depth target at t is the QB's planned depth for the call at t (plannedDropX: the QB lane's plan,
 * from the call alone, never the live QB behind him) less the interior clearance passSetDepth already uses (3.8 yd: the
 * pocket's front at the launch point, the same constant along the way), no shallower than his snap spot and no deeper
 * than the pocket's front. It replaces the short set and the neighbour level as his depth target while it applies; he
 * still plays his man (the rep gives ground at that rate under control; a man who beats or drives him is physics).
 * Under centre the NFL line does not follow the drop (the gap opens 1.1 -> 5.5 yd, as ours does), so it is gun only.
 * Off (POCKET_LEVEL on), ours reached its short set early (1.3 vs the NFL's 0.9 yd at 0.5 s) and then lagged the drop
 * (2.8 vs 3.5 yd at 2.0 s): retreat 0.8 / 1.0 / 1.2 yd/s over 0-0.5 / 0.5-1.0 / 1.0-1.5 s against the NFL's
 * 0.4 / 1.2 / 1.8. */
export const POCKET_DROP = process.env.SET_SPOT !== '0' && process.env.POCKET_DROP !== '0';
function pocketDropDepth(sim: PlaySim, clearance: number): number | null {
  const concept = sim.offCall.pass, gun = sim.offCall.formation.qb !== 'under';
  if (!concept || !gun) return null;
  const spot = sim.offAlign.spots[sim.qb.slot as keyof typeof sim.offAlign.spots]?.pos;
  const qbSnap = { x: sim.snapX[sim.qb.idx] ?? sim.qb.pos.x, y: spot?.y ?? sim.ballY };
  return sim.los - plannedDropX(concept.drop, gun, qbSnap, { x: sim.los, y: sim.ballY }, sim.t) - clearance;
}
const LINE_ORDER = ['LT', 'LG', 'C', 'RG', 'RT'];
function pocketLevelDepth(sim: PlaySim, b: Agent): number | null {
  const L = protectPoint(sim), i = LINE_ORDER.indexOf(b.slot);
  const at = (slot: string) => { const n = sim.slot(slot); if (!n) return null; const p = sim.see(b, n).pos; return Math.hypot(p.x - L.x, p.y - L.y); };
  const nA = at(LINE_ORDER[i - 1]), nB = at(LINE_ORDER[i + 1]), lt = at('LT'), rt = at('RT');
  const tk = lt !== null && rt !== null ? (lt + rt) / 2 : lt ?? rt;
  const r = [nA, nB, tk].filter((v): v is number => v !== null).sort((u, v) => u - v);
  if (!r.length) return null;
  const R = r[Math.floor((r.length - 1) / 2)], dy = b.pos.y - L.y;
  if (R <= Math.abs(dy)) return null;
  return sim.los - (L.x + Math.sqrt(R * R - dy * dy));
}
/** SET_SPOT_TACKLE: the tackle's vertical set, three set steps (yd). */
const TACKLE_STEPS = 3 * 0.45;
/** SET_SPOT: the interior short set, two set steps (yd; about 16 in each). */
const SHORT_SET = 2 * 0.45;

/** SET_SPOT (experimental, off; SET_SPOT=1): the pass set's reference is the pocket, not the man (Integration,
 * 2026-11-15; hand-fight note sections 21-23).
 * - **Information removed** (interior OL). The set no longer reads the QB's live position, which is behind the
 *   blocker and unseen. passSetDepth and the point he protects come from the call (calledLaunchX: the drop every
 *   lineman knows), or from the QB's alignment at the snap.
 * - **The interior short set, as taught.** The guard sets back two steps; guards hold the pocket's depth, fight at the
 *   line and give little ground.
 *   - From the snap he goes two set steps straight back off his snap spot, no deeper than the pocket's front, and
 *     meets the rusher there. Further ground is what the rusher wins against him.
 *   - Off, he sat at punching distance in front of the rusher, on the rusher's line to the live QB. He barely moved
 *     until the rusher came (0.2 yd/s of retreat requested to 0.5 s); NFL interior OL are 0.80 yd deep at 1.0 s,
 *     ours were 0.50.
 * - **The lateral reference** (setSpotTarget): inside-out on the man at his own depth, unbounded.
 *   - Off, his target was a step in front of the rusher on the rusher's line, moving with the man he was carrying:
 *     a self-starting slide (staged: 1.28 yd/s by 1.5 s from no drift at all).
 * - **Tackles.** They keep their own kick and, unless SET_SPOT_TACKLE, the live-QB read: a known leak, owed
 *   (KNOWN_PROBLEMS PRO-INFO #12). */
export const SET_SPOT = process.env.SET_SPOT !== '0';
/** SET_SPOT_TACKLE (experimental, off; needs SET_SPOT): the tackles' live-QB reads removed (attempt 3, a different
 * mechanism; Integration, 2026-11-15). He takes the three-step vertical set off his snap spot, and further depth is
 * paced by the rusher: PASS_KICK keeps him deeper than the man up his arc. The call is the floor only: the launch
 * point he protects and the pocket's front. Two call-only spots failed before (the final launch point from the snap,
 * then the called drop's schedule): tackles set 4.6-5.0 yd deep at 2 s against the NFL's 3.7. Never from the QB's
 * measured depth (the QB lane is rebuilding the drop). */
export const SET_SPOT_TACKLE = SET_SPOT && process.env.SET_SPOT_TACKLE !== '0';
/** SET_SPOT: his lateral target and its share of the rusher's lateral motion: inside-out on the man, where the
 * rusher's line to the launch point crosses his own depth, fed forward by that point's own motion (frac of the
 * rusher's), not a step in front of the man he is carrying.
 * - **No bound.** Two bounds were tried and dropped. The first was a fixed zone of half a split about his alignment;
 *   the second was no drift beyond his split from the neighbors he sees.
 * - Each let the man go when he worked across it: interior "engaged, then free" pressers went 7.0% of dropbacks
 *   (off) -> 11.0 (zone) and -> 17.7 / 18.6 (neighbors).
 * - The reference limits the drift by itself. As the pair leaves the launch line, the target pulls back toward the
 *   ball. Staged, a drift turns back within about 2.5 s and 1 yd, and a real lateral move is mirrored throughout
 *   (hand-fight note section 23). */
export function setSpotTarget(sim: PlaySim, rPos: Vec2, atX: number): { y: number; frac: number } {
  const ref = protectPoint(sim), dx = rPos.x - ref.x;
  const frac = dx > 0.3 ? clamp((atX - ref.x) / dx, 0, 1) : 1;
  return { y: ref.y + (rPos.y - ref.y) * frac, frac };
}

/** Signed phi from current positions (blocker relative to the defender). */
function measurePhi(axis: Vec2, d: { pos: Vec2 }, b: { pos: Vec2 }): number {
  const bd = norm(sub(b.pos, d.pos));
  const lat = latOf(axis);
  // B = D + (axis cosφ − lat sinφ)·sep  ⇒  φ = atan2(−bd·lat, bd·axis)
  return Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2);
}

/** REP_SEEN: the rusher's leverage on a blocker he sees at bPos, against the QB as he sees him. */
function rusherPhi(sim: PlaySim, d: Agent, bPos: Vec2): number {
  return measurePhi(norm(sub(sim.see(d, sim.qb).pos, d.pos)), d, { pos: bPos });
}

/** REP_SEEN: where a pass blocker protects: the launch point he knows from the call, on the ball's line. */
export function protectPoint(sim: PlaySim): Vec2 {
  return { x: calledLaunchX(sim) ?? (SET_SPOT ? sim.snapX[sim.qb.idx] ?? sim.qb.pos.x : sim.qb.pos.x), y: sim.ballY };
}

/** Balance available to a player's technique, from his body. */
function baseOf(a: Agent): number {
  const sup = a.body.support;
  if (!sup) return 1;
  return availability(sup, supportParams(a.profile), fatigueFactor(a.body.energy));
}

// ------------------------------------------------------------ creation

/** BLOCK_FRAME (experimental, off; BLOCK_FRAME=1 turns it on). A blocker gets back on a defender who has already been
 * released from a block this play only from where a block is legal: inside his frame (the blocker within 90 deg of his
 * body facing: his chest and shoulders, not his back). The 90 deg half-plane is a labeled choice.
 * From anywhere else, getting a hand on him is a grab, not a block: the blocker may still choose it, by the same
 * discipline-and-situation chance a beaten blocker grabs with (holdChance, as tryHold), decided once per pair per play;
 * a grab forms the engagement with the hold on (cloth), and contact-holding judges the restraint it achieves (with
 * HOLD_CALL, whether it is seen). Otherwise he does not re-block that man (he goes on to the next one).
 * Why (post-shed-joint-tap.mts, develop 7689bc4e, 4 games): no hand joint survives a shed, but 6% of run DL releases
 * had hands back on them within 0.5 s, 36 of 37 by a new blocker, 31 of 37 from beside or behind him; createEngagement
 * clamped phi to +-0.95, so a blocker from behind got the block of one at the hip, never a hold and never a call.
 * Initial fits (a defender not yet released this play) are unchanged. */
export const BLOCK_FRAME = process.env.BLOCK_FRAME === '1';
const engagedBefore = new WeakMap<Agent, PlaySim>();
/** BLOCK_FRAME diagnostics (read-only; behaviour does not depend on it): called at each re-block outside the frame with
 * the blocker's choice (true = a grab, false = no block). */
let blockFrameSink: ((sim: PlaySim, b: Agent, d: Agent, type: 'pass' | 'run', grab: boolean) => void) | null = null;
export function setBlockFrameSink(f: typeof blockFrameSink): void { blockFrameSink = f; }
const frameChoice = new WeakMap<Agent, { sim: PlaySim; by: Map<Agent, boolean> }>();
function inFrameToBlock(_axis: Vec2, d: Agent, b: Agent): boolean {
  // Inside his frame: the blocker within 90 deg of the defender's body facing (his chest and shoulders, not his back).
  // That is what makes a block legal; his direction of travel is not (a backer scraping sideways while facing the line is
  // blocked legally by a man in front of his chest). Not the engagement's phi either: on a run that is measured on the
  // blocker's own drive axis, and an ordinary reach forms at |phi| >= 1 there (test/inline-zone-keeper.test.ts).
  // (A travel half was tried first: 315 of 758 refused run re-blocks were inside his facing but behind his travel, 131
  // of them square to the blocker, and the runs lost 0.8 yd, from blocks the rule should not have dropped.)
  const toB = Math.atan2(b.pos.y - d.pos.y, b.pos.x - d.pos.x);
  return Math.abs(angleDiff(toB, d.body.facing)) <= Math.PI / 2;
}
/** The chance a blocker chooses a grab (tryHold's: less disciplined men grab more; in pass protection more than on runs). */
function holdChance(b: Agent, type: 'pass' | 'run'): number {
  return (0.04 + 0.13 * (1 - b.r('discipline'))) * (type === 'pass' ? 1 : 0.6);
}

export function createEngagement(sim: PlaySim, blocker: Agent, defender: Agent, type: 'pass' | 'run', drive: Vec2 | null, surface?: RunContactSurface): Engagement | null {
  const t = sim.t;
  if (sim.bond && [sim.bond.carrier, ...sim.bond.tacklers].some((a) => a === blocker || a === defender)) return null;
  if (blocker.engagement) return blocker.engagement;
  if ((blocker.shedBy.get(defender) ?? -1) > t) return null;
  if (defender.isDown(t) || blocker.isDown(t)) return null;
  if (!inBlockReach(blocker, defender, type)) return null;
  const existing = defender.engagement;
  if (existing) {
    // Second blocker: double team.
    if (existing.helpers.length < 1 && existing.blocker !== blocker) {
      existing.helpers.push(blocker);
      helperSince.set(blocker, t);
      blocker.engagement = existing;
      syncJoints(sim, existing);
      const hands = existing.helperHands!.get(blocker)!;
      if (Math.hypot(blocker.pos.x-defender.pos.x,blocker.pos.y-defender.pos.y) <= hands.extension)
        helperTouches.set(blocker, { rep: existing, at: t, pos: { ...defender.pos } });
      return existing;
    }
    return null;
  }

  const rng = sim.dice('rep', blocker, defender);
  const tb = traits(blocker, type);
  const td = traits(defender, type);
  const e: Engagement = {
    blocker,
    defender,
    helpers: [],
    start: t,
    type,
    win: 0,
    control: 0,
    phi: 0,
    side: 1,
    baseB: baseOf(blocker),
    baseD: baseOf(defender),
    move: 'bull',
    moveUntil: t,
    moveOk: false,
    nextMoveAt: t + rng.range(0.35, 0.6),
    pushBoost: 0,
    drive,
    sealTarget: 0,
    repEdge: rng.normal(0, 0.08),
    holding: false,
  };
  // This is the installed shoulder, never inferred from the actual arrival.
  // Existing hands and joining helpers returned above keep their acquired frame.
  if (type === 'run' && surface) {
    e.surfaceAxis = { ...surface.axis };
    e.sealTarget = surface.sealTarget;
  }
  const axis = axisOf(sim, e);
  const lat = latOf(axis);
  // BLOCK_FRAME: a defender already released from a block this play is blocked again only from in front of his path
  // and inside his frame; from anywhere else it is a grab the blocker may choose (decided once per pair), or no block.
  if (BLOCK_FRAME && engagedBefore.get(defender) === sim && !inFrameToBlock(axis, defender, blocker)) {
    let pair = frameChoice.get(blocker);
    if (!pair || pair.sim !== sim) { pair = { sim, by: new Map() }; frameChoice.set(blocker, pair); }
    let grab = pair.by.get(defender);
    if (grab === undefined) { grab = sim.dice('frame-hold', blocker, defender).chance(holdChance(blocker, type)); pair.by.set(defender, grab); }
    blockFrameSink?.(sim, blocker, defender, type, grab);
    if (!grab) return null;
    e.holding = true;
    blocker.tags.add('held'); blocker.tags.add('frame-grab');
  }
  engagedBefore.set(defender, sim);
  e.phi = clamp(measurePhi(axis, defender, blocker), -0.95, 0.95);

  // Working side: edge rushers work outside; interior/run defenders toward
  // their gap / the ball; a defender who is already beside the blocker keeps
  // working that way.
  let pref: Vec2;
  if (type === 'pass') {
    const out = Math.sign(defender.pos.y - sim.ballY) || 1;
    const isEdge = Math.abs(defender.pos.y - sim.ballY) > 3.0;
    pref = isEdge ? { x: 0, y: out } : { x: 0, y: Math.sign(defender.pos.y - blocker.pos.y) || out };
  } else pref = sub(runContactRead(sim, e).aim, defender.pos);
  e.side = Math.sign(pref.x * lat.x + pref.y * lat.y) || 1;
  if (Math.abs(e.phi) > 0.3) e.side = Math.sign(e.phi);

  // Punch exchange. Longer arms land first and keep the opponent off the body.
  const armEdge = (tb.arm - td.arm) / 3; // +1 per 3" advantage
  const punchB = tb.hands + 0.12 * armEdge + rng.normal(0, 0.18) + e.repEdge;
  if (type === 'pass') {
    const plan = planMove(sim, e, defender, blocker);
    e.move = plan;
    if (plan === 'swim' || plan === 'club' || plan === 'rip' || plan === 'speed') {
      // Swipe/chop the punch: a miss leaves the blocker reaching at air.
      const swipe = td.hands + 0.15 * td.bend + rng.normal(0, 0.18);
      if (swipe - punchB > 0.18) {
        e.control = -0.5;
        e.moveOk = true;
        e.moveUntil = t + 0.3;
        e.nextMoveAt = t + 0.2;
        lunge(sim, blocker, defender, 0.5);
      } else e.control = clamp(0.35 + (punchB - swipe), -0.2, 0.9);
    } else {
      // Power: strike for the chest.
      const strike = 0.5 * td.hands + 0.5 * defender.r('passRushPower') - 0.12 * armEdge + rng.normal(0, 0.18);
      e.control = clamp(punchB - strike, -0.8, 0.8);
    }
  } else {
    // Run: get-off and first hands. Offensive linemen know the snap count.
    const strike = 0.5 * td.hands + 0.5 * defender.r('strength') - 0.12 * armEdge + rng.normal(0, 0.18);
    e.control = HAND_FIGHT ? firstHands(blocker, defender, tb, td, rng) : clamp(punchB - strike + 0.1, -0.8, 0.8);
    e.move = 'shed';
    // Reach blocks want the defender sealed on the backside.
    if (drive && !surface) e.sealTarget = clamp(-0.45 * Math.abs(drive.y), -0.5, 0) * e.side;
  }
  blocker.engagement = e;
  defender.engagement = e;
  sim.engagements.push(e);
  syncJoints(sim, e);
  return e;
}

const helperSince = new WeakMap<Agent, number>();
// The local point acquired by new hands, not a continuously fresh visual fix.
const helperTouches = new WeakMap<Agent, { rep: Engagement; at: number; pos: Vec2 }>();
export function inBlockReach(b: Agent, d: Agent, type: 'run' | 'pass'): boolean {
  const range = b.profile.radius + d.profile.radius + .1 + b.player.measurables.armIn / 36 * (type === 'run' ? .45 : .85);
  return Math.hypot(b.pos.x-d.pos.x,b.pos.y-d.pos.y) <= range;
}

/** Functional contact, direction of force and time to establish a base. */
export function helperSupport(sim: PlaySim, e: Engagement, h: Agent): number {
  if (h.isDown(sim.t) || !inBlockReach(h,e.defender,e.type)) return 0;
  const axis = axisOf(sim,e), toward = norm(sub(h.pos,e.defender.pos));
  const angle = clamp(toward.x*axis.x+toward.y*axis.y,0,1);
  const established = clamp((sim.t-(helperSince.get(h) ?? e.start))/.15,0,1);
  return angle * established * fatigueFactor(h.body.energy);
}

// ------------------------------------------------------------ hands

/** Arm force a player can put through his hands, kg·yd/s². */
function armForce(a: Agent): number {
  return supportParams(a.profile).armForce;
}

/** Press a player can put through his hands (a push, not a grip), kg·yd/s². */
function pressForce(a: Agent): number {
  return supportParams(a.profile).pressForce;
}

// A joining blocker earns his own hands. The state belongs to the acquired
// physical contact, rather than to whichever blocker currently owns the rep.
// Primary reps retain their existing control/RNG law; pass helpers retain the
// older behavior until their separate technique is addressed.
interface RunHandControl { control: number; }
const runHands = new WeakMap<HandJoint, RunHandControl>();

/** Acquired hand position, never inferred from how much force a joint carries.
 * The caller still checks that this joint is live and that the body can support
 * the proposed work. A stale object reference alone establishes neither.
 */
export function contactControl(e: Engagement, member: Agent): number | null {
  if (member === e.blocker) return e.control;
  if (e.type !== 'run' || !e.helpers.includes(member)) return null;
  const joint = e.helperHands?.get(member);
  return joint?.a === member.body && joint.b === e.defender.body
    ? runHands.get(joint)?.control ?? null : null;
}

/** Transfer the keeper's acquired contact without moving bodies or changing
 * any joint capacity/load. The controller handles the departing player's job;
 * the next ordinary sync removes that player's old physical contact.
 */
export function promoteContact(e: Engagement, keeper: Agent): boolean {
  if (keeper === e.blocker) return true;
  const joint = e.helperHands?.get(keeper), control = contactControl(e, keeper);
  if (!joint || control === null) return false;
  e.blocker = keeper;
  e.hands = joint;
  e.control = control;
  e.helpers = e.helpers.filter(h => h !== keeper);
  e.helperHands!.delete(keeper);
  // A cloth grab by the departed primary is not the keeper's acquired hold.
  e.holding = false;
  // Nor did a move which cleared that primary's hands clear the keeper's
  // independent contact. Existing physical strikes and body state remain.
  e.moveOk = false;
  return true;
}

/** The same working-distance and bounded arm law for either run blocker. */
function setContactHands(joint: HandJoint, b: Agent, d: Agent, type: 'pass' | 'run', c: number, holding: boolean): void {
  const tb = traits(b, type), td = traits(d, type);
  const sep = b.profile.radius + d.profile.radius;
  const reach = (c >= 0 ? tb.arm : td.arm) / 36;
  joint.actor = c >= 0 ? b.body : d.body;
  joint.extension = sep + reach * 0.3 * (0.5 + 0.5 * Math.abs(c));
  joint.push = (c >= 0 ? pressForce(b) : pressForce(d)) * (0.35 + 0.65 * Math.abs(c));
  joint.hold = holding ? armForce(b) * 1.2 : c > 0.3 ? armForce(b) * 0.25 * c : 0;
  joint.steer = c >= 0 ? armForce(b) * (0.15 + 0.55 * c) : armForce(d) * (0.15 + 0.4 * -c);
}

/** PUNCH (experimental, off; PUNCH=1 turns it on): a blocker's hands go to
 * the man. The hand law above works at elbows-bent extension (bodies + 0.3 arm
 * x (0.5 + 0.5 control), a quarter of his arm), so a man standing off at
 * arm's length -- inside his reach but beyond his bent elbows -- is touched
 * and not pressed: an anchored tackle's hands carried no compression 58% of
 * engaged ticks and none as an edge rusher crossed his face (hands-band.mts,
 * inside-probe.mts). With PUNCH he works his hands to where he feels the man
 * (PASS_FEEL's touch latency), out to lockout (0.9 of his arm), no faster
 * than arms move (ARM_SPEED): late, the man is into his chest before the arms
 * are out; at air (the man beyond his lockout) he is overextended for his
 * reaction time, his push down to a third, while the man goes by. The arm's
 * force is the joint's (push from his press, the World's limits); only where
 * the hands work is his. The same joint serves run and pass blocks. */
export const PUNCH = process.env.PUNCH !== '0';
/** Lockout: the share of his arm the hands reach with the elbows locked. */
const LOCKOUT = 0.9;
/** How far the punch drives the hands into the man (yd): a press, not a touch. */
const PRESS_INTO = 0.1;
const punchState = new WeakMap<HandJoint, { ext: number; over: number; striking?: boolean }>();
/** PUNCH_STRIKE (experimental, off; with PUNCH): the punch's press into the man (PRESS_INTO) is a strike, not a
 * standing request. On a new fit his hands drive into the man as before, until he feels the man on them (the joint's
 * press at UNLOADED of his own press, last step's): the strike has landed. From then he holds the fit: his hands stay
 * at the man (the touch), giving and following at arm speed, so they press only as the man closes on them faster than
 * his arms give: his press, not a drive of his own. (Attempt 1 kept the arms' length against him, never shorter: a man
 * closing compressed the joint deeper than the drive had, and falls rose to 41% of dropbacks.) A new fit (the man off his hands, beyond his arms by 0.05 yd, or a
 * hand knocked off) is a new strike. A standing 0.1-yd drive into the man kept the joint at its push limit; his lean
 * (sized by PASS_ANCHOR to the load he feels, his own drive's reaction included) grew to about a body weight, and when
 * a swim, club or pull took the load away he fell forward: OL falls before the throw on 24.6% of dropbacks against
 * 10.7% with PUNCH off (fall-rate.mts; NFL about 1-5 falls per 100 dropbacks, fall-proxy.py). */
export const PUNCH_STRIKE = PUNCH && process.env.PUNCH_STRIKE !== '0';

/** PUNCH is pass-set technique, the blocker's choice from what his job is
 * showing: pressing a man at arm's length is how a pass blocker keeps him off
 * his body, and how a defender sheds a run block, so a run blocker fits tight
 * and drives instead (with it on every block, the run report lost 0.30 yd a
 * carry and outside-zone DL sheds at the hit doubled). A pass rep sets (a
 * play-action run look ends at contact: pa-look.ts); a draw blocker shows
 * pass while he is still selling it. */
function passSetTechnique(sim: PlaySim, b: Agent, e: Engagement): boolean {
  // Engaged on a pass rep, his play-action look (if any) has ended at the contact (pa-look.ts).
  if (e.type === 'pass') return true;
  return (b.behavior as { presentingDraw?: (t: number) => boolean }).presentingDraw?.(sim.t) === true;
}

function punch(sim: PlaySim, joint: HandJoint, b: Agent, d: Agent): void {
  const bodies = b.profile.radius + d.profile.radius, arm = b.player.measurables.armIn / 36;
  const base = joint.extension - bodies, lock = LOCKOUT * arm;
  let st = punchState.get(joint);
  if (!st) { st = { ext: base, over: -Infinity }; punchState.set(joint, st); }
  const rt = Math.max(0.1, b.profile.reactionTime);
  const felt = sim.see(b, d, 0.06 / rt);
  const gap = Math.hypot(felt.pos.x - b.pos.x, felt.pos.y - b.pos.y) - bodies;
  if (sim.t < st.over) { joint.extension = bodies + lock; joint.push *= 1 / 3; return; }
  // At air: the man is past his lockout and his hands are already out there.
  if (gap > lock + 0.05 && st.ext >= lock - 0.02) { st.over = sim.t + rt; joint.extension = bodies + lock; joint.push *= 1 / 3; return; }
  // A punch presses: the hands go a little into the man (PRESS_INTO), so the joint compresses against him -- across
  // his path when he comes across the blocker's face -- rather than resting at the touch (attempt 1 aimed at the
  // gap less 0.02 yd: as the man crossed, N p50 stayed 0).
  if (PUNCH_STRIKE) {
    // A new fit: the man off his hands (beyond his arms), or a hand knocked off (RUSH_HANDS).
    if (st.striking === undefined || gap > st.ext + 0.05 || joint.off || (joint.handsOn ?? 2) < 2) st.striking = true;
    // Landed: he feels the man on his hands.
    else if (st.striking && Math.max(0, joint.normalForce ?? 0) >= UNLOADED * pressForce(b)) st.striking = false;
  }
  const holding = PUNCH_STRIKE && !st.striking;
  // Holding the fit: his hands stay at the man (the touch), giving and following at arm speed; they press only as the man
  // closes on them faster than his arms give (his press, not a drive of his own).
  const want = holding ? clamp(gap, base, lock) : clamp(gap + PRESS_INTO, base, lock), step = ARM_SPEED * sim.dt;
  st.ext = clamp(want, st.ext - step, st.ext + step);
  joint.extension = bodies + Math.max(base, st.ext);
}

/** HAND_SITE (experimental, off): a hand's working length follows where it is on the man (Integration, 2026-11-13,
 * torso-contact diagnosis). The hands joint is a strut from the holder's chest to the man's centre; its length so far
 * was the arm's extension to a man's chest in front of him, wherever the man was. Beside him, the hand still on is on
 * the man's side or back plate with the elbow bent: its working length is a forearm, so the bodies can meet and the
 * torso contact (normal across his path, friction along it, his balance carrying the side load) carries the ride.
 *
 * Continuous in the man's bearing off the holder's chest, beta (0 = square in front):
 *   - |beta| <= SITE_FRONT (45 deg): nothing changes (every joint force identical to off);
 *   - to SITE_ABREAST (100 deg): the length goes smoothly (smoothstep) from the arm's to bodies + FOREARM;
 *   - the length moves at ARM_SPEED (the arm bends and straightens no faster than arms move).
 * What the hand can do there, also continuous, with w the same smoothstep (1 in front, 0 abreast):
 *   - push (press along the joint, holder to man): the arm's press scaled by the man's own bearing, gamma (0 = the
 *     holder at his chest, 90 = at his side, 180 = at his back): full to gamma 90 deg (a hand on his side presses
 *     him across his path), to 0 at gamma 150 deg (a hand on his back cannot push him away from the QB: it would push
 *     him on toward him). push *= w + (1 - w) * pressAt(gamma);
 *   - steer (along the man's chest): a bent arm on his side steers a little: steer *= w + (1 - w) * 0.5 * pressAt(gamma);
 *   - hold: unchanged (a grab from behind stays the holding detector's).
 * No threshold switches anything: length, push and steer are smooth functions of the two bearings. */
export const HAND_SITE = process.env.HAND_SITE === '1';
const SITE_FRONT = 45 * Math.PI / 180, SITE_ABREAST = 100 * Math.PI / 180;
const siteState = new WeakMap<HandJoint, { len: number }>();
const smooth01 = (x: number) => { const u = clamp(x, 0, 1); return u * u * (3 - 2 * u); };
/** The hand's place on the man, by bearing: 1 on the holder's chest frame, 0 abreast or behind. */
function siteWeight(holder: Agent, man: Agent): number {
  const beta = Math.abs(Math.atan2(Math.sin(Math.atan2(man.pos.y - holder.pos.y, man.pos.x - holder.pos.x) - chestOf(holder)),
    Math.cos(Math.atan2(man.pos.y - holder.pos.y, man.pos.x - holder.pos.x) - chestOf(holder))));
  return 1 - smooth01((beta - SITE_FRONT) / (SITE_ABREAST - SITE_FRONT));
}
/** The press a hand can put on the man at his own bearing gamma (the holder's direction off his facing). */
function pressAt(holder: Agent, man: Agent): number {
  const a = Math.atan2(holder.pos.y - man.pos.y, holder.pos.x - man.pos.x) - man.body.facing;
  const gamma = Math.abs(Math.atan2(Math.sin(a), Math.cos(a)));
  return 1 - smooth01((gamma - Math.PI / 2) / (Math.PI * 60 / 180));
}
export function handSite(sim: Pick<PlaySim, "dt">, joint: HandJoint, b: Agent, d: Agent): void {
  const holder = joint.actor === d.body ? d : b, man = holder === b ? d : b;
  const w = siteWeight(holder, man);
  let st = siteState.get(joint);
  if (w >= 1 && !st) return;
  const full = joint.extension, bent = Math.min(full, holder.profile.radius + man.profile.radius + FOREARM);
  const target = bent + (full - bent) * w, step = ARM_SPEED * sim.dt;
  if (!st) { st = { len: full }; siteState.set(joint, st); }
  st.len = clamp(target, st.len - step, st.len + step);
  if (w >= 1 && Math.abs(st.len - full) < 1e-9) { siteState.delete(joint); return; }
  joint.extension = st.len;
  const p = pressAt(holder, man);
  joint.push *= w + (1 - w) * p;
  joint.steer *= w + (1 - w) * 0.5 * p;
}

/** OPEN_HANDS: the rep's leverage at which the man has left the blocker's
 * frame -- at or past his hip, the blocker no longer between him and where
 * he is going (Integration, 2026-11-12; the holding detector's own measure). */
export const FRAME_PHI = 1;
/** OPEN_HANDS diagnostic cut (OPEN_HANDS_BACK_ONLY=1): the frame is left only
 * when the blocker is on the man's back, not when he is past the hip. */
const OPEN_HANDS_BACK_ONLY = process.env.OPEN_HANDS_BACK_ONLY === '1';
/** OPEN_HANDS: does the holder have fingers on the man's cloth? Inside the
 * man's frame (the holder on his front or side, by the man's own facing, and
 * the man not past him: |phi| < FRAME_PHI) a grip is the block itself. Letting
 * go is the holder's decision from what he feels and sees of the man going by
 * (the man's position and motion through his hands, PASS_FEEL's touch
 * latency): he opens his hands when the man's leverage, carried forward by
 * how fast it is rising, reaches the frame's edge. How far forward is his
 * discipline and awareness: a disciplined, aware blocker lets go at or just
 * before the man is past him (up to his reaction time ahead), a poor one late
 * (up to his reaction time behind). Hanging on regardless is the existing
 * choice (`declared`, tryHold), a hold for the officials to judge. The hand
 * fight and the grip's capacity still break any grip, by the World. No timer:
 * an earlier version let go a fixed reaction x (2 - discipline) after the man
 * left the frame, which kept the grip through the rusher's turn and gave 4.9
 * holding calls a team-game (instant release: 0.3; NFL about 1.1 accepted). */
export function gripFor(sim: PlaySim, joint: HandJoint, holder: Agent, man: Agent, e: Engagement | null, declared: boolean): boolean {
  void joint;
  const rt = Math.max(0.1, holder.profile.reactionTime);
  const seen = sim.see(holder, man, 0.06 / rt);
  const bear = Math.atan2(holder.pos.y - seen.pos.y, holder.pos.x - seen.pos.x);
  const off = Math.abs(((bear - seen.facing) * 180 / Math.PI + 540) % 360 - 180);
  let left = off > 90;
  const seenSpeed = Math.hypot(seen.vel.x, seen.vel.y);
  const lead = rt * (holder.r('discipline') + holder.r('awareness') - 1);
  if (!left && !OPEN_HANDS_BACK_ONLY && e) {
    // His leverage against the man's line to where he is going, as he feels it, carried forward by its rate.
    const axis = axisOf(sim, e), lat = latOf(axis);
    const phiAt = (p: Vec2): number => {
      const bd = norm(sub(holder.pos, p));
      return Math.abs(Math.atan2(-(bd.x * lat.x + bd.y * lat.y), bd.x * axis.x + bd.y * axis.y) / (Math.PI / 2));
    };
    const h = 0.1, now = phiAt(seen.pos);
    const ahead = phiAt({ x: seen.pos.x + (seen.vel.x - holder.vel.x) * h, y: seen.pos.y + (seen.vel.y - holder.vel.y) * h });
    left = now + (ahead - now) / h * lead >= FRAME_PHI;
    // PAST_ALONG_PATH: and past him along his path too (the same definition as the rep's beat and the officials').
    if (left && PAST_ALONG_PATH && seenSpeed >= 1) {
      const rx = holder.pos.x - seen.pos.x, ry = holder.pos.y - seen.pos.y;
      const along = (rx * seen.vel.x + ry * seen.vel.y) / seenSpeed;
      const rate = -(seen.vel.x * seen.vel.x + seen.vel.y * seen.vel.y - holder.vel.x * seen.vel.x - holder.vel.y * seen.vel.y) / seenSpeed;
      left = along + rate * lead < -PAST_MARGIN;
    }
  }
  return !left || declared;
}

function setRunHelperHands(sim: PlaySim, e: Engagement, h: Agent, joint: HandJoint): void {
  if (h.isDown(sim.t) || !inBlockReach(h, e.defender, 'run')) {
    runHands.delete(joint);
    joint.push = joint.hold = joint.steer = 0;
    return;
  }
  let state = runHands.get(joint);
  if (!state) {
    const d = e.defender, tb = traits(h, 'run'), td = traits(d, 'run');
    // A punch can extend to the longest working distance already represented
    // by the shared hand law. Range permits an exchange; it does not win one.
    const workingReach = h.profile.radius + d.profile.radius + tb.arm / 36 * 0.3;
    const touching = Math.hypot(h.pos.x-d.pos.x, h.pos.y-d.pos.y) <= workingReach;
    if (!touching) {
      // Reaching toward a contact is not acquired inside hands. In particular
      // an unacquired joint cannot steer through air or hold an opponent.
      joint.extension = workingReach;
      joint.push = joint.hold = joint.steer = 0;
      return;
    }
    const armEdge = (tb.arm-td.arm)/3;
    const dice = sim.dice('help', h, d);
    const repEdge = dice.normal(0, 0.08);
    const punch = tb.hands + 0.12*armEdge + dice.normal(0, 0.18) + repEdge;
    const strike = 0.5*td.hands + 0.5*d.r('strength') - 0.12*armEdge + dice.normal(0, 0.18);
    state = { control: clamp(punch-strike+0.1, -0.8, 0.8) };
    runHands.set(joint, state);
    helperTouches.set(h, { rep: e, at: sim.t, pos: { ...d.pos } });
  }
  setContactHands(joint, h, e.defender, 'run', state.control, false);
  if (PUNCH && state.control >= 0 && passSetTechnique(sim, h, e)) punch(sim, joint, h, e.defender);
  if (HAND_SITE) handSite(sim, joint, h, e.defender);
  if (OPEN_HANDS) joint.grip = gripFor(sim, joint, h, e.defender, e, false);
}

function advanceRunHelperHands(sim: PlaySim, e: Engagement): void {
  const td = traits(e.defender, 'run');
  for (const h of e.helpers) {
    const joint = e.helperHands?.get(h), state = joint && runHands.get(joint);
    if (!state) continue;
    const tb = traits(h, 'run');
    state.control = clamp(state.control + sim.dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + sim.dice('help', h, e.defender).normal(0, 0.25)), -1, 1);
  }
}

/**
 * Keep the world's hand joints in step with the rep: one for the blocker,
 * one per helper. A joint is the hand fight's physical consequence — working
 * distance, bounded push, hold and steering — set every tick from control.
 */
export function syncJoints(sim: PlaySim, e: Engagement): void {
  const world = sim.world;
  const want = new Map<Agent, HandJoint>();
  const make = (b: Agent, existing?: HandJoint): HandJoint =>
    existing ?? { kind: 'hands', a: b.body, b: e.defender.body, extension: 1, push: 0, hold: 0, steer: 0 };
  e.hands = make(e.blocker, e.hands && e.hands.a === e.blocker.body ? e.hands : undefined);
  want.set(e.blocker, e.hands);
  const helpers = (e.helperHands ??= new Map());
  for (const h of e.helpers) want.set(h, make(h, helpers.get(h)));
  for (const [h, j] of [...helpers]) if (!e.helpers.includes(h)) { helpers.delete(h); world.joints = world.joints.filter((x) => x !== j); }
  for (const h of e.helpers) helpers.set(h, want.get(h)!);
  const mine = new Set(want.values());
  world.joints = world.joints.filter((j) => j.kind !== 'hands' || j.b !== e.defender.body || mine.has(j));
  for (const j of mine) if (!world.joints.includes(j)) world.joints.push(j);
  setHands(sim, e);
}

function setHands(sim: PlaySim, e: Engagement): void {
  const b = e.blocker, d = e.defender;
  const t = sim.t;
  const inMove = t < e.moveUntil && e.moveOk;
  // Inside hands lock out at the controlling player's arm length; neither in
  // control, the hands meet in the middle.
  const hands = e.hands!;
  // Latched hands can hold and steer; a defender in control steers the
  // blocker off his line just as well.
  setContactHands(hands, b, d, e.type, e.control, e.holding);
  // PUNCH: the blocker's hands go to the man, out to lockout.
  if (PUNCH && e.control >= 0 && passSetTechnique(sim, b, e)) punch(sim, hands, b, d);
  if (HAND_SITE) handSite(sim, hands, b, d);
  // OPEN_HANDS: the controlling player's fingers on the other man's cloth.
  if (OPEN_HANDS) hands.grip = e.control >= 0 ? gripFor(sim, hands, b, d, e, e.holding) : gripFor(sim, hands, d, b, null, false);
  // RUSH_HANDS: a hand knocked off re-fits by reach and touch: after his reaction to the loss (felt), it travels
  // from his chest to the man at arm speed, then is on him again where it lands.
  // RUSH_HANDS: a hand slid but still on him is walked back to where he wants it (the middle of the man) by his own
  // arm, at arm speed, once it is no longer being driven (at rest on the chest).
  if (RUSH_HANDS && !hands.off && hands.handOffset && Math.abs(hands.handVel ?? 0) < 0.05) {
    const o = hands.handOffset, step = ARM_SPEED * sim.dt;
    hands.handOffset = Math.abs(o) <= step ? 0 : o - Math.sign(o) * step; hands.handVel = 0;
  }
  if (RUSH_HANDS && (hands.off || (hands.handsOn ?? 2) < 2)) {
    // He feels the hands gone (both, or the last one not pressing him): he is free of them until one re-fits (his
    // request works past, as a landed move).
    // RUSH_ONE_HAND: one hand gone is not a landed move: only both gone frees him (the side it guarded is open, the
    // body and the other hand are still in front; workToCleared aims him there).
    if (hands.off || (!RUSH_ONE_HAND && Math.max(0, hands.normalForce ?? 0) < UNLOADED * pressForce(b))) { e.moveOk = true; e.moveUntil = Math.max(e.moveUntil, t + sim.dt); }
    refit(sim, hands, b, d);
  }
  // A landed finesse move has the hands off for its window.
  if (inMove && e.move !== 'bull' && e.move !== 'longarm') {
    hands.steer *= 0.1;
    if (e.move === 'spin' || e.move === 'swim') hands.push *= 0.2;
  }
  for (const h of e.helpers) {
    const j = e.helperHands?.get(h);
    if (!j) continue;
    if (e.type === 'run') { setRunHelperHands(sim, e, h, j); continue; }
    const support = helperSupport(sim, e, h);
    j.extension = h.profile.radius + d.profile.radius + traits(h, e.type).arm / 36 * 0.2;
    j.push = pressForce(h) * 0.8 * support;
    j.steer = armForce(h) * 0.4 * support;
    j.hold = 0;
    if (HAND_SITE) handSite(sim, j, h, d);
    if (OPEN_HANDS) j.grip = gripFor(sim, j, h, d, e, false);
  }
  if (RUSH_HANDS && e.rusherHand) stepLongArm(sim, e);
}

const refitState = new WeakMap<HandJoint, { lostAt: number }>();
/** RUSH_HANDS: the time a lost hand takes back to the man (s): reaction to the loss plus the hand's travel from his
 * chest (the bodies' gap) at ARM_SPEED. */
export function refitTime(b: Agent, d: Agent): number {
  const gap = Math.max(0, Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) - b.profile.radius - d.profile.radius);
  return Math.max(0.1, b.profile.reactionTime) + gap / ARM_SPEED;
}
function refit(sim: PlaySim, hands: HandJoint, b: Agent, d: Agent): void {
  let st = refitState.get(hands);
  if (!st) { st = { lostAt: sim.t }; refitState.set(hands, st); }
  if (sim.t - st.lostAt < refitTime(b, d)) return;
  // One hand back at a time.
  const on = hands.off ? 1 : Math.min(2, (hands.handsOn ?? 2) + 1);
  hands.off = false; hands.handsOn = on; hands.handOffset = 0; hands.handVel = 0;
  if (on === 2) { hands.offSide = undefined; refitState.delete(hands); } else refitState.set(hands, { lostAt: sim.t });
}

/**
 * Mirror by feel: the sideways load the blocker's hands carry last step,
 * as a lateral velocity cue along `lat`. A defender working across pulls the
 * blocker's hands with him well before his body is visibly past; the
 * blocker's feet answer that pull (proprioception, not prediction).
 */
function felt(e: Engagement, lat: Vec2): number {
  const j = e.hands;
  if (!j || !j.tangentForce) return 0;
  const b = e.blocker, d = e.defender;
  const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, l = Math.hypot(dx, dy) || 1;
  // Tangential force on the defender is along perp(b→d); the blocker feels the opposite.
  const tx = -dy / l, ty = dx / l;
  const onBlocker = -(tx * lat.x + ty * lat.y) * j.tangentForce;
  return onBlocker / b.profile.massKg * 0.3;
}

/** Remove a rep's joints from the world (disengage). */
export function releaseJoints(sim: PlaySim, e: Engagement): void {
  const gone = new Set<HandJoint>([...(e.hands ? [e.hands] : []), ...(e.helperHands?.values() ?? []), ...(e.rusherHand ? [e.rusherHand] : [])]);
  e.rusherHand = undefined;
  for (const joint of gone) runHands.delete(joint);
  sim.world.joints = sim.world.joints.filter((j) => !gone.has(j as HandJoint));
}

/** A player who reached at air: his lean goes with his arms. */
function lunge(sim: PlaySim, a: Agent, toward: Agent, amount: number): void {
  const sup = a.body.support;
  if (!sup) return;
  const dir = norm(sub(toward.pos, a.pos));
  const force = supportParams(a.profile).pushForce * amount;
  sup.lean = { x: sup.lean.x + dir.x * force, y: sup.lean.y + dir.y * force };
  void sim;
}

// ------------------------------------------------------------ moves

/** Pre-contact rush plan from the rusher's tools and alignment. */
function planMove(sim: PlaySim, e: Engagement, d: Agent, b: Agent): RushMove {
  const td = traits(d);
  const power = d.r('passRushPower');
  const fin = d.r('passRushFinesse');
  const isEdge = Math.abs(d.pos.y - sim.ballY) > 3.0;
  const burst = clamp((1.75 - d.player.measurables.tenSplit) / 0.3, 0, 1);
  const massEdge = (d.profile.massKg - b.profile.massKg) / 60;
  const w: Array<[RushMove, number]> = [
    ['bull', 0.3 + power * 1.0 + massEdge],
    ['longarm', 0.1 + power * 0.6 + (td.arm - 33) * 0.12],
    ['speed', isEdge ? 0.2 + burst * 1.1 + td.bend * 0.6 : 0],
    ['swim', 0.15 + fin * 0.8],
    ['rip', 0.15 + fin * 0.6 + td.bend * 0.3],
    ['club', 0.1 + fin * 0.4 + power * 0.3],
  ];
  if (Math.abs(e.phi) > 0.35) w.push(['dip', 0.8 + td.bend]);
  // Contact executes the approach plan. Previously a speed arc could turn
  // into an unrelated bull rep the instant the tackle landed his hands.
  const approach = d.behavior.kind === 'rush' && 'plan' in d.behavior ? d.behavior.plan : undefined;
  const fits = (move: RushMove) => approach === 'speed' ? move === 'speed' || move === 'dip'
    : approach === 'power' ? move === 'bull' || move === 'longarm'
    : approach === 'finesse' ? move === 'swim' || move === 'rip' || move === 'club' : true;
  const planned = w.filter(([move]) => fits(move));
  return sim.dice('rep', b, d).weighted(
    planned.map((x) => x[0]),
    planned.map((x) => Math.max(0, x[1])),
  );
}

/** RUSH_HANDS: the rusher's keys for the physical moves. By touch, the blocker's hand on him is unloaded (pressing
 * him with less than UNLOADED of the blocker's press capacity, from the joint's measured force last step): the
 * exposed hand a club beats. By sight, his arm is longer than the blocker's: the long-arm's edge. Each is read right
 * with probability 0.5 + 0.5 x his recognition (finesse and awareness); a misread commits him to the wrong move,
 * which costs what that move costs. */
const UNLOADED = 0.2;
/** RUSH_ONE_HAND: the side (along `lat`, +-1) a cleared hand vacated, 0 with both hands on or both off. The
 * hands joint runs blocker -> rusher; its tangent is (-n.y, n.x) and `offSide` is the vacated side's sign along it. */
function clearedSide(e: Engagement, lat: Vec2): number {
  const j = e.hands;
  if (!j || j.off || (j.handsOn ?? 2) !== 1 || !j.offSide) return 0;
  const dx = e.defender.pos.x - e.blocker.pos.x, dy = e.defender.pos.y - e.blocker.pos.y, n = Math.hypot(dx, dy) || 1;
  const along = j.offSide * (-dy / n * lat.x + dx / n * lat.y);
  return Math.abs(along) < 1e-6 ? 0 : Math.sign(along);
}

export function handUnloaded(e: Engagement): boolean {
  const h = e.hands;
  return !!h && !h.off && Math.max(0, h.normalForce ?? 0) < UNLOADED * pressForce(e.blocker);
}
/** KEYED_FELT (experimental, off; requires RUSH_HANDS): the hand model's keyed moves read what he feels, not a rated
 * coin. Whether the blocker's hand is pressing on him is his own touch (the joint's measured force, a step old):
 * the club is keyed when it is unloaded, and only then. Off, a misread (probability 0.5 - 0.5 x recognition) of a
 * loaded hand still keyed a club: 55% of clubs under the hand model came with the hand loaded, the club was chosen at
 * 39% of decisions against 14% without the model, and each club tripled the interior's pass rate (club-trace.mts).
 * The long-arm against a shorter man is not forced at every decision: it is a weight in the ordinary choice (+0.6, the
 * cue bonuses' scale; a choice). */
export const KEYED_FELT = RUSH_HANDS && process.env.KEYED_FELT === '1';
if (process.env.KEYED_FELT === '1' && !RUSH_HANDS) throw new Error('KEYED_FELT=1 requires RUSH_HANDS=1 (the hand model whose keyed moves it reads)');
function keyedMove(sim: PlaySim, e: Engagement): RushMove | null {
  const d = e.defender, b = e.blocker, rng = sim.dice('rep', b, d);
  if (KEYED_FELT) return handUnloaded(e) ? 'club' : null;
  const recognition = 0.5 * d.r('passRushFinesse') + 0.5 * d.r('awareness');
  const read = (truth: boolean) => (rng.chance(0.5 + 0.5 * recognition) ? truth : !truth);
  if (read(handUnloaded(e))) return 'club';
  if (read(d.player.measurables.armIn > b.player.measurables.armIn) && !handUnloaded(e)) return 'longarm';
  return null;
}

/** Choose the next move from the state of the rep. */
function chooseMove(sim: PlaySim, e: Engagement): RushMove {
  const d = e.defender;
  if (RUSH_HANDS && e.type === 'pass') { const keyed = keyedMove(sim, e); if (keyed) return keyed; }
  const td = traits(d);
  const power = d.r('passRushPower');
  const fin = d.r('passRushFinesse');
  const w: Array<[RushMove, number]> = [
    ['bull', 0.2 + power * 0.9 + (e.control < 0 ? 0.4 : 0)],
    ['longarm', 0.1 + power * 0.5 + (td.arm - 33) * 0.1 + (KEYED_FELT && RUSH_HANDS && e.type === 'pass' && d.player.measurables.armIn > e.blocker.player.measurables.armIn ? 0.6 : 0)],
    ['rip', 0.1 + fin * 0.5 + (e.control > 0.3 ? 0.6 : 0)],
    ['club', 0.1 + fin * 0.3 + power * 0.2 + (e.control > 0.3 ? 0.4 : 0)],
    ['swim', 0.1 + fin * 0.6 + (e.baseB < 0.6 ? 0.6 : 0)],
    ['snatch', 0.05 + power * 0.3 + (e.baseB < 0.55 ? 0.9 : 0)],
  ];
  // Even with the blocker on the working side: finish with dip-and-bend.
  // REP_SEEN: his leverage and the blocker's motion as he has them, against the QB as he sees him.
  const seenB = REP_SEEN ? sim.see(d, e.blocker) : null;
  const phiD = seenB && e.type === 'pass' ? rusherPhi(sim, d, seenB.pos) : e.phi;
  const bVelX = seenB ? seenB.vel.x : e.blocker.vel.x;
  if (phiD * e.side > 0.4) w.push(['dip', 1.0 + td.bend * 1.5]);
  // Blocker over-set (rusher is inside his leverage): inside counter.
  // EDGE_ARC: an edge's cue for it is the tackle he sees oversetting.
  const arcOut = e.blocker.passSet?.outside ?? 0;
  const edgeArc = EDGE_ARC && e.type === 'pass' && arcOut !== 0 && Math.abs(d.pos.y - sim.ballY) > 3;
  const overset = edgeArc ? seenOverset(sim.see(d, e.blocker).pos, d.pos, arcLandmark(sim, e.blocker, d))
    : phiD * e.side < -0.15 || (e.type === 'pass' && bVelX < -2 && phiD * e.side < 0.1);
  if (overset) w.push(['spin', 0.4 + fin * 1.2], ['swim', 0.4 + fin * 0.6]);
  return sim.dice('rep', e.blocker, d).weighted(
    w.map((x) => x[0]),
    w.map((x) => Math.max(0.01, x[1])),
  );
}

/** RUSH_HANDS: the club. His near arm sweeps across the blocker's hand: a force of his arm (armForce) on the hand,
 * across the joint toward his working side's inside, for as long as his hand is on the blocker's arm: the time it
 * takes to cross the forearm's thickness (FOREARM, about 0.1 yd: a forearm circumference of about 30 cm) at his hand
 * speed (ARM_SPEED by his finesse: 0.75-1.25), about 0.03 s. Whether the hand comes off is the
 * World's: the blocker's hold (extension, press, grip) against it. Nothing else is applied: a club that does not
 * clear the hand has spent his hands for its length. */
/** RUSH_HANDS: a forearm's thickness, yd (circumference about 30 cm, so about 9.5 cm across). */
const FOREARM = 0.1;
export function clubHand(sim: PlaySim, e: Engagement, axis: Vec2): { force: Vec2; duration: number } {
  const d = e.defender, lat = latOf(axis);
  const speed = ARM_SPEED * (0.75 + 0.5 * d.r('passRushFinesse'));
  const duration = FOREARM / speed, F = armForce(d);
  const force = { x: -lat.x * e.side * F, y: -lat.y * e.side * F };
  sim.world.handForce(e.hands!, d.body, force, sim.world.time, sim.world.time + duration);
  e.moveOk = false; e.moveUntil = sim.t + duration;
  e.club = { end: sim.t + duration, handsBefore: e.hands!.off ? 0 : e.hands!.handsOn ?? 2, speed };
  return { force, duration };
}

/** RUSH_HANDS: the long-arm. His near arm goes straight into the blocker's chest at his own lockout (0.9 of his
 * arm): a hands joint of his (a = rusher), pushing with his press, held until his next move decision. While it is on
 * and the man is beyond the blocker's arm, the blocker's hands cannot reach him (no push, hold or steer). His legs
 * drive through the straight arm in the World. */
export function longArm(sim: PlaySim, e: Engagement): HandJoint {
  const b = e.blocker, d = e.defender;
  const j: HandJoint = e.rusherHand && !e.rusherHand.off ? e.rusherHand
    : { kind: 'hands', a: d.body, b: b.body, actor: d.body, extension: 1, push: 0, hold: 0, steer: 0 };
  j.extension = b.profile.radius + d.profile.radius + 0.9 * d.player.measurables.armIn / 36;
  j.push = pressForce(d); j.steer = 0.3 * armForce(d); j.hold = 0;
  e.rusherHand = j; e.longArmUntil = e.nextMoveAt; e.moveOk = false; e.moveUntil = sim.t;
  if (!sim.world.joints.includes(j)) sim.world.joints.push(j);
  return j;
}

/** RUSH_HANDS: the blocker against a long-arm. He feels a straight arm on his chest with the man beyond his own hands;
 * after his reaction time he clubs the arm (the same force on a hand as the rusher's club, his arm and hand speed). */
function counterLongArm(sim: PlaySim, e: Engagement): void {
  const j = e.rusherHand, b = e.blocker, d = e.defender;
  if (!j || j.off) return;
  const rt = Math.max(0.1, b.profile.reactionTime);
  if (e.counterAt === undefined) { e.counterAt = sim.t + rt; return; }
  if (sim.t < e.counterAt) return;
  const dx = b.pos.x - d.pos.x, dy = b.pos.y - d.pos.y, L = Math.hypot(dx, dy) || 1;
  const lat = { x: -dy / L * e.side, y: dx / L * e.side };
  const speed = ARM_SPEED * (0.75 + 0.5 * b.r('handTechnique')), duration = FOREARM / speed, F = armForce(b);
  sim.world.handForce(j, b.body, { x: lat.x * F, y: lat.y * F }, sim.world.time, sim.world.time + duration);
  e.counterAt = sim.t + rt + duration;
}

/** RUSH_HANDS: the long-arm's lifetime and the blocker's reach while it is on. */
/** LONGARM_STRUT (experimental, off; requires RUSH_HANDS): against a long-arm the blocker is not disarmed. Off, his push,
 * hold and steer were zeroed whenever the gap between bodies exceeded his arm: a step that decided 17% (interior) and
 * 25% (tackle) of the long-arm episodes where it turned on, against 0-1% where it never did (longarm-switch.mts). The
 * rusher's straight arm is a strut that carries force both ways and a single point the blocker can work: his hands are
 * on that arm, so his push carries through it unchanged, and his hold and steer act on the man through the arm, as
 * much as a hand that far out along it controls him: x 1 at the old threshold, falling linearly to 0 at the rusher's
 * own hand (gap beyond his arm / the rusher's arm). Continuous in the gap; the counter (a club on the arm) unchanged. */
export const LONGARM_STRUT = RUSH_HANDS && process.env.LONGARM_STRUT === '1';
if (process.env.LONGARM_STRUT === '1' && !RUSH_HANDS) throw new Error('LONGARM_STRUT=1 requires RUSH_HANDS=1 (the long-arm it acts on)');
function stepLongArm(sim: PlaySim, e: Engagement): void {
  const j = e.rusherHand;
  if (!j) return;
  if (j.off || sim.t >= (e.longArmUntil ?? 0)) {
    sim.world.joints = sim.world.joints.filter((x) => x !== j);
    e.rusherHand = undefined; e.counterAt = undefined;
    return;
  }
  const b = e.blocker, d = e.defender, h = e.hands;
  const gap = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - b.profile.radius - d.profile.radius;
  const armB = b.player.measurables.armIn / 36;
  if (h && gap > armB) {
    if (LONGARM_STRUT) {
      const sc = clamp(1 - (gap - armB) / Math.max(1e-6, d.player.measurables.armIn / 36), 0, 1);
      h.hold *= sc; h.steer *= sc;
    } else { h.push = 0; h.hold = 0; h.steer = 0; }
  }
  counterLongArm(sim, e);
}

/**
 * Resolve the defender's move against the blocker's counters. Success and
 * failure are physical actions on the two bodies and their hands.
 */
function resolveMove(sim: PlaySim, e: Engagement, axis: Vec2): void {
  const t = sim.t;
  const rng = sim.dice('rep', e.blocker, e.defender);
  // RUSH_HANDS: the club is a force on the blocker's hand, not a roll.
  if (RUSH_HANDS && e.move === 'club' && e.hands && !e.hands.off) { clubHand(sim, e, axis); e.nextMoveAt = t + 0.55 + rng.range(0, 0.45); return; }
  if (RUSH_HANDS && e.move === 'longarm' && e.hands) { e.nextMoveAt = t + 0.75 + rng.range(0, 0.45); longArm(sim, e); return; }
  // RUSH_RIP: no roll; his arm's force on the blocker's hand and his body's bend through the corner.
  if (RUSH_RIP && e.move === 'rip') {
    if (e.hands && !e.hands.off) {
      const lat = latOf(axis), speed = ARM_SPEED * (0.75 + 0.5 * e.defender.r('passRushFinesse')), F = armForce(e.defender);
      sim.world.handForce(e.hands, e.defender.body, { x: -lat.x * e.side * F, y: -lat.y * e.side * F }, sim.world.time, sim.world.time + FOREARM / speed);
    }
    e.moveUntil = t + 0.3; e.moveOk = true; e.nextMoveAt = t + 0.55 + rng.range(0, 0.45); return;
  }
  // RUSH_BULL: no roll; the drive is his intent (stepPassRep's power request) and the World's.
  if (RUSH_BULL && e.move === 'bull') { e.moveUntil = t + 0.3; e.moveOk = true; e.nextMoveAt = t + 0.75 + rng.range(0, 0.45); return; }
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  const fin = d.r('passRushFinesse');
  const pow = d.r('passRushPower');
  const counter = 0.45 * tb.hands + 0.25 * tb.read + 0.3 * tb.feet;
  const baseBonus = (0.6 - e.baseB) * 1.2;
  const doubled = e.helpers.length > 0 ? -1.4 : 0;
  let skill: number;
  let bonus = baseBonus + doubled;
  switch (e.move) {
    case 'bull':
      skill = 0.6 * pow + 0.4 * d.r('strength');
      bonus += (d.profile.massKg - b.profile.massKg) / 70 + (traits(b).pad - td.pad) * 1.5;
      break;
    case 'longarm':
      skill = 0.6 * pow + 0.4 * d.r('strength');
      bonus += (td.arm - tb.arm) * 0.12;
      break;
    case 'speed':
    case 'dip':
      skill = 0.45 * fin + 0.55 * td.bend;
      bonus += e.phi * e.side * 1.2 + (td.lateral - tb.lateral) * 0.25;
      break;
    case 'spin':
      skill = 0.7 * fin + 0.3 * clamp((7.4 - d.player.measurables.threeCone) / 0.9, 0, 1);
      bonus += -e.phi * e.side * 1.5 - 0.4; // high risk unless he's over-set
      break;
    case 'swim':
    case 'club':
      skill = 0.75 * fin + 0.25 * pow;
      bonus += (d.player.measurables.heightIn - b.player.measurables.heightIn) * 0.03 + (td.arm - tb.arm) * 0.05;
      break;
    case 'rip':
      skill = 0.7 * fin + 0.3 * td.bend;
      bonus += (tb.pad - td.pad) * 1.2;
      break;
    case 'snatch':
      skill = 0.5 * pow + 0.5 * fin;
      bonus += (0.5 - e.baseB) * 2;
      break;
    default:
      skill = 0.5;
  }
  const p = logistic(-2.1 + 3.4 * (skill - counter) + bonus + e.control * -0.6);
  const ok = rng.chance(p);
  e.moveUntil = t + 0.3;
  e.moveOk = ok;
  const lat = latOf(axis);
  const mb = b.profile.massKg, md = d.profile.massKg;
  const world = sim.world;
  if (ok) {
    switch (e.move) {
      case 'bull':
        // Hips through the chest: a strike that drives the blocker back.
        e.pushBoost = 0.6;
        world.strike(d.body, b.body, { x: axis.x * mb * 0.9, y: axis.y * mb * 0.9 });
        e.control = Math.min(e.control, -0.3);
        break;
      case 'longarm':
        e.pushBoost = 0.45;
        world.strike(d.body, b.body, { x: axis.x * mb * 0.6, y: axis.y * mb * 0.6 });
        e.control = -0.6;
        break;
      case 'speed':
      case 'dip':
        // Hands avoided, hips turned: his own feet carry him around.
        e.control = Math.min(e.control, 0);
        break;
      case 'spin':
        e.side = -e.side;
        e.control = Math.min(e.control, -0.2);
        break;
      case 'swim':
      case 'club': {
        // The club knocks the blocker's arm and shoulder across his body.
        if (e.move === 'club') world.strike(d.body, b.body, { x: -lat.x * e.side * mb * 0.7, y: -lat.y * e.side * mb * 0.7 });
        e.control = -0.4;
        break;
      }
      case 'rip':
        e.control = Math.min(e.control - 0.6, -0.2);
        break;
      case 'snatch':
        // Pull the blocker's arm through: he is yanked forward, off his base.
        world.strike(d.body, b.body, { x: (-axis.x * 1.1 + lat.x * e.side * 0.5) * mb, y: (-axis.y * 1.1 + lat.y * e.side * 0.5) * mb });
        e.control = Math.min(e.control, -0.2);
        break;
      default:
        break;
    }
  } else {
    // Failed move: the blocker latches and punches a rusher who has exposed
    // his chest.
    e.control = Math.min(1, e.control + 0.35);
    const punch = (e.move === 'spin' ? 0.9 : 0.45) * (0.5 + 0.5 * tb.hands);
    world.strike(b.body, d.body, { x: -axis.x * md * punch, y: -axis.y * md * punch });
  }
  e.nextMoveAt = t + (e.move === 'bull' || e.move === 'longarm' ? 0.75 : 0.55) + rng.range(0, 0.45);
}

// ------------------------------------------------------------ update

/** ZONE_RUN (experimental, off): an interior defender keyed on his man's
 * reach/bucket step races him for the play-side shoulder with open hips. */
const ZONE_RUN = process.env.ZONE_RUN !== '0', ZONE_RUN_PACE = 0.75, ZONE_RUN_STEP = 0.5, ZONE_RUN_OPEN = Math.PI / 4;
/** ZONE_RUN: a blocker seen running sideways at least this fast (yd/s) is
 * racing for the shoulder (a reach); slower, he is driving (inside zone) and
 * the DL plays his pace. Racing, the DL presses upfield as he crosses
 * (yd/s, the attack technique's press); his body and the blocker decide how
 * much ground he gains. */
const ZONE_RUN_REACH = 1.5;
/** RACE_LEAN (experimental, off): racing, he leans into the man at his read
 * step (FLAT_PRESS_STEP), the same press as flattening, not the attack
 * technique's 1.5 yd/s. */
const RACE_LEAN = process.env.RACE_LEAN === '1';
/** Anchor braces along the drive line and keeps lateral work (ANCHOR_SPLIT=0 off). */
const ANCHOR_SPLIT = process.env.ANCHOR_SPLIT !== '0';

/** Stretch reaches stay connected rather than drive (STRETCH_REACH=0 off). */
const STRETCH_REACH = process.env.STRETCH_REACH !== '0';
/** Trial: retain the held solo reach's track intention through contact. */
const RUN_CONTACT_TRACK = process.env.RUN_CONTACT_TRACK === '1';
/** Shoulder speed is a complete component; set 0 to reproduce the comparison baseline. */
const RUN_CONTACT_COMPONENTS = process.env.RUN_CONTACT_COMPONENTS !== '0';

/** Default on (DL_CHASE=0 turns it off): an engaged interior lineman keys the guard
 * near him. When he sees him pull, his gap has left with him: he works across
 * his blocker's face toward the pull and follows it down the line, instead of
 * holding a shoulder that slides with the block. A backside edge closes the
 * same way when the pull goes away from his side. The puller is the one he
 * sees (`pullers`), within 3 yd (an edge: 4.5); nothing reads the call. */
const DL_CHASE = process.env.DL_CHASE !== '0';
/** Experimental (RUN_HANDS=1, off): run blockers drive committed defenders off their body. */
const RUN_HANDS = process.env.RUN_HANDS === '1';
/** Experimental (DL_HANDS=1, off): a shedding defender in control of the hands works past with them. */
const DL_HANDS = process.env.DL_HANDS === '1';
/** Experimental (PASS_SINK=1, off): pass blockers sink their hips under a heavy load. */
const PASS_SINK = process.env.PASS_SINK === '1';
/** RUN_FEEL (G1, default on; RUN_FEEL=0 turns it off): a run blocker's
 * mirror and seal lead use the defender's motion as he has it (PASS_FEEL's
 * touch and sight delays), not the defender's true current velocity. With
 * the true velocity a quicker defender could never gain a step: the blocker
 * matched him in the same tick (G1 lab: DL released by the 5-yd crossing
 * 36% -> 47%, ever 36% -> 73%). His felt hand load is unchanged. */
const RUN_FEEL = process.env.RUN_FEEL !== '0';
/** PASS_KICK (G5, default on; the set is in behaviors/blocking.ts): in the
 * rep a tackle keeps kicking with an outside rusher, level with or deeper
 * than him, short of the launch point, instead of stopping at the set spot
 * while the rusher runs on. */
const PASS_KICK = process.env.PASS_KICK !== '0';
/** How far deeper than the rusher the kick in the rep aims (yd). */
const RIDE_LEAD = 0.3;

/** TACKLE_SET (experimental, off; TACKLE_SET=1 turns it on): a tackle sets
 * against an edge rusher to a depth from the call, not the QB's live spot or
 * the rusher's depth. He knows the called drop, so he knows where the QB will
 * launch; he kicks with the rusher as before (what he sees of his path), but
 * never deeper than a body width short of that launch point, and there he
 * anchors. Off, the kick follows the rusher's depth down to half a yard short
 * of wherever the QB is, and a QB who drifts takes the tackle with him: at
 * 3.0 s ours stood deeper than the QB (-8.2 vs -7.8; NFL tackle -6.8, QB -7.8;
 * docs/reviews/2026-11-12-edge-rush.md). No strength or anchoring capacity
 * is added: the physics decides whether the anchor holds. */
export const TACKLE_SET = process.env.TACKLE_SET === '1';
/** TACKLE_BRAKE (experimental, off; TACKLE_BRAKE=1 with TACKLE_SET): the
 * tackle brakes the pair into his set, not only himself. NFL tracking
 * (hip-gain.py): engaged with the rusher in front, the tackle slows by depth
 * -- from about 1.5 yd short of the QB's depth, nearly stopped at it --
 * whatever the rusher's gain on his hip; ours carried kick speed past it.
 * The depth is TACKLE_SET's floor (the called launch point less a body width,
 * from what he knows). His depth speed toward it is at most sqrt(2 a d), with
 * a his braking force (0.8 of his brake, the law movement uses, times his
 * mass) over his mass plus the load he carries: the measured press of the
 * rusher through his hands along his retreat, as the mass it amounts to at his
 * braking, at most the rusher's own. The harder he is pressed the earlier he
 * must start (fully pressed, about 1.8x the distance). And he anchors before he mirrors: pressed, his lateral
 * request changes by no more than the traction left after holding the press
 * allows in a step. No timer and no capacity added: the body brakes. */
export const TACKLE_BRAKE = process.env.TACKLE_BRAKE === '1';

/** TACKLE_RESET (experimental, off; with TACKLE_SET and TACKLE_BRAKE): the
 * anchor's base re-set. A man can only drive into a load with his base under
 * his hips (OL protection textbook §7.6-7.7, §8.4, §20.5: "stop retreat,
 * bring feet under hips, anchor"; "replace ground with short, coordinated
 * steps"; "absorbs, resets feet, then reacts to spin"). Carried back, the
 * World's lean -- his drive into the load -- is held near his base limit and
 * grows past it only at the pendulum's rate (feet() probe: 186 of a 559
 * press). The cue is what he feels: the press beyond what his base holds at
 * his stance (m w0^2 x base radius) while he is carried faster than he asked
 * to retreat. He acts on it after a delay by his pass-block technique (0.5-1.5
 * reaction times). The step (a short replacement, of which a hop is one
 * form) takes the sunk stance's base radius over his recovery stepping speed;
 * during it his feet are light -- no braking and no drive into the man, his
 * retreat going on (a stand-in: the model has no per-foot normal load; debt)
 * -- and he sinks (PASS_SINK's posture). On landing his lean is set to his
 * base limit at the posture he has reached (scaled by balance: 0.5-1), no
 * more than the press, and grows from there as the World allows. He stays
 * sunk while pressed; his lean may exceed the press (PUSH_GROWTH) only while
 * he is still carried, and not once the pair has stopped, so a pull or swim
 * cannot pitch him onto the rusher. No capacity added. */
export const TACKLE_RESET = process.env.TACKLE_RESET === '1';
const SINK_POSTURE = 0.95;

/** ANCHOR_BASE (experimental, off): how much of himself a pass protector commits into the man is bounded by what
 * his base could recover from if the load vanished. The World releases a lean that loses its load into his capture
 * point (lean / (m w0^2), less what his gait absorbs) and he falls past criticalDeviation (base radius + stepping speed
 * / w0); in games, unloads topple him 1-4% of the time with a lean under 0.6 of m w0^2 x critical deviation, 21-30% at
 * 0.9 and above, where the lean has grown to the whole press (unload-outcomes.mts). So:
 *  - the commit bound: leanCap = k m w0^2 critDev at his present posture, k = 1.05 - 0.55 x technique (pass blocking
 *    and balance): a poor technician commits up to all of what he can recover from and is swum and pulled; a good one
 *    keeps a margin;
 *  - the anchor: under a heavy press he sinks (posture 0.6 + 0.35 x technique), a lower centre of mass and a wider base
 *    (w0^2 x critDev both grow), so the base itself stops more press for the same margin; his strength (the World's
 *    leg drive and traction) decides how much of it the legs can hold;
 *  - the rest of the press, beyond what he commits, walks him back: ground given is the rusher's power against his base
 *    and strength.
 * PASS_SINK sank him under load and TACKLE_RESET re-set his feet, both acting on the retreat with the lean unbounded
 * (it grew to the press); this bounds the commitment itself. No capacity added. */
export const ANCHOR_BASE = process.env.ANCHOR_BASE !== '0';
function anchorBase(b: Agent, tb: TrenchTraits, heavy: boolean, intent: Intent): void {
  const sup = b.body.support; if (!sup) return;
  const technique = clamp(0.5 * b.r('passBlock') + 0.5 * tb.balance, 0, 1);
  if (heavy) intent.posture = Math.max(intent.posture ?? 0.6, 0.6 + 0.35 * technique);
  const sp = supportParams(b.profile), w0 = omega0(sp, sup.posture);
  intent.leanCap = (1.05 - 0.55 * technique) * b.profile.massKg * w0 * w0 * criticalDeviation(sp, sup.posture, sup.feetLock, 1);
}

/** RUSH_ARM_BALANCE (experimental, off; with RUSH_HANDS): while a rusher holds a long-arm, his own locked arm is the
 * strut between him and the blocker, and he can lose it in one tick (the blocker gives, slips the arm, or the arm comes
 * off). A lean against his own strut buys no movement the arm's push does not already give, so he commits behind it as
 * a protector does: no lean past the load he feels (growth 0) and no more than his base could recover from if the strut
 * went (k m w0^2 critDev, k = 1.05 - 0.55 x technique: balance and power rush). A bull, his chest on the man, keeps its
 * commitment, and a bull who over-commits and is dropped still falls. Diagnosis: under RUSH_HANDS, 37 of 44 rusher
 * falls were long-arm releases; the press he leaned against was two joints summed (the guard's hands and his own arm,
 * 1600-1900) and his lean grew to it plus the legs' 25% growth, then dumped forward when the arm ended
 * (fall-trace.mts FALL_ROLE=DL, longarm-release.mts). */
export const RUSH_ARM_BALANCE = process.env.RUSH_ARM_BALANCE === '1';
/** RUSH_LEAN_BOUND (experimental, off; RUSH_LEAN_BOUND=1): every pass rusher engaged with a blocker commits as a
 * protector does (ANCHOR_BASE's law, armBalance): no lean past the load he feels (growth 0) and no more than his base
 * could recover from if the press went (k m w0^2 critDev, k = 1.05 - 0.55 x technique: balance and power rush). The
 * long-arm case (RUSH_ARM_BALANCE) generalised: the interior rusher leaning about 1400 N into an 1800 N press went
 * forward onto the man when it was taken away (12 of 21 interior falls; dl-falls.mts). A bull still keeps the
 * commitment his bound allows and can still be dropped. */
export const RUSH_LEAN_BOUND = process.env.RUSH_LEAN_BOUND !== '0';
/** RUSH_BULL (experimental, off; RUSH_BULL=1; PRO-INFO #9 and #10, the first move): the bull rush is the rusher's
 * drive, not a roll. He asks to go through the man's chest to the QB (power: push 1 at 0.55 of his top speed, his pad
 * level), and the World resolves his legs, mass, lean and base against the blocker's anchor; nothing else. The roll
 * (logistic of rated skill against the blocker's rated counter), the scripted strikes (a won bull's 0.9 x the
 * blocker's mass, a lost one's blocker punch), the lost move's stall and both control swings are gone together. What
 * a bull that doesn't move the man costs comes from the bodies: he spent his drive and his weight is forward on the
 * man; the blocker's counter is his own anchor and hands. With it the pass rep's control no longer drifts toward the
 * better hands rating (#10): it changes only through the hand events still in the rep.
 * Diagnosis (rep-rolls.mts, engine-61, 8 games): 1475 bull rolls, 10% won, opening 4 of 210 sheds; a lost roll left
 * the rusher 0.08-0.09 yd nearer the QB over 0.5 s against 0.12-0.14 engaged with no move: a move attempt was worth
 * less than none. */
export const RUSH_BULL = process.env.RUSH_BULL !== '0';
/** RUSH_RIP (experimental, off; RUSH_RIP=1; PRO-INFO #9, the second move): the rip is his hand and his body, not a roll.
 * His near arm comes up under the blocker's hand on his working side: a force of his arm (armForce) across the
 * blocker's hand joint, toward the inside, for the time his hand takes to cross the forearm (FOREARM at his hand
 * speed, ARM_SPEED by his finesse), the club's force law (RUSH_HANDS); whether the hand comes off is the World's
 * (the joint's hold and grip against the force). At the same time his body runs the rip: he dips and turns the corner
 * (the move's bend request: low posture, at the blocker's hip, his speed by his bend). The roll, the lost move's stall
 * and blocker punch, and the control swing are gone together; a rip that doesn't clear the hand leaves him low on the
 * corner with the hand still on him, and what that costs is the bodies'. Diagnosis (rep-rolls.mts, engine-61, 8
 * games): 1126 rip rolls, 6% won, opening 3 of 210 sheds. Requires RUSH_HANDS (the World's hand model: without it a
 * force on a hand does nothing, and attempt 1, the body alone, lost sheds: 210 -> 202). Read with RUSH_ONE_HAND (a
 * cleared hand opens the side it guarded): RUSH_HANDS + RUSH_ONE_HAND, 8 games: sheds 228 -> 283, the rip clears a
 * hand 16% of the time. */
export const RUSH_RIP = process.env.RUSH_RIP === '1';
// A rip without the World's hand model is a silent no-op (a force on a hand does nothing): refuse it.
if (RUSH_RIP && !RUSH_HANDS) throw new Error('RUSH_RIP=1 requires RUSH_HANDS=1 (the World hand model the rip acts through)');
function armBalance(d: Agent, td: TrenchTraits, intent: Intent): void {
  const sup = d.body.support; if (!sup) return;
  const technique = clamp(0.5 * td.balance + 0.5 * d.r('passRushPower'), 0, 1);
  const sp = supportParams(d.profile), w0 = omega0(sp, sup.posture);
  intent.growth = 0;
  intent.leanCap = (1.05 - 0.55 * technique) * d.profile.massKg * w0 * w0 * criticalDeviation(sp, sup.posture, sup.feetLock, 1);
}

/** TACKLE_RESET: the blocker's base re-set (see the flag). Edits his intent in place. */
function baseReset(sim: PlaySim, e: Engagement, intent: Intent): void {
  const b = e.blocker, sup = b.body.support;
  if (!sup || sup.state !== 'up') return;
  const sp = supportParams(b.profile), m = b.profile.massKg;
  const st = e.baseReset ?? (e.baseReset = {});
  const L = Math.hypot(sup.felt.x, sup.felt.y);
  const carried = (e.lastReqX ?? b.vel.x) - b.vel.x > 0;
  if (st.until !== undefined && !st.done) {
    if (sim.t < st.until) {
      // In the step: light feet -- no braking, no drive into him; he sinks.
      intent.vel = { x: b.vel.x, y: b.vel.y }; intent.push = 0; intent.posture = SINK_POSTURE;
      return;
    }
    // Landed: the base under his hips, toward the load.
    st.done = true; st.cueAt = undefined;
    if (L > 1e-6) {
      const w = omega0(sp, sup.posture);
      const limit = m * w * w * baseRadiusAt(sp, sup.posture) * (0.5 + 0.5 * b.r('balance'));
      const mag = Math.min(L, Math.max(Math.hypot(sup.lean.x, sup.lean.y), limit));
      sup.lean = { x: -sup.felt.x / L * mag, y: -sup.felt.y / L * mag };
    }
  }
  if (st.done) {
    if (L > 0.3 * m * G) intent.posture = SINK_POSTURE;
    intent.growth = carried ? PUSH_GROWTH : 0;
  }
  // The cue (again after a landing: a step or two, as the press needs).
  const w = omega0(sp, sup.posture);
  const cue = L > m * w * w * baseRadiusAt(sp, sup.posture) && carried;
  if (!cue) { st.cueAt = undefined; return; }
  if (st.cueAt === undefined) st.cueAt = sim.t;
  const rt = Math.max(0.1, b.profile.reactionTime);
  if (sim.t - st.cueAt < rt * (1.5 - b.r('passBlock'))) return;
  const speed = Math.max(0.5, recoverySpeed(sp, 0, fatigueFactor(b.body.energy)));
  st.until = sim.t + baseRadiusAt(sp, SINK_POSTURE) / speed; st.done = false;
}

/** TACKLE_BRAKE: the rusher's press on the blocker along -x (toward his own
 * goal), kg*yd/s^2, from the hands joint's last-step force (0 without one). */
export function pressOnBlocker(b: Agent, joint: HandJoint | undefined): number {
  if (!joint?.normalForceOnB) return 0;
  const onB = { x: joint.normalForceOnB.x + (joint.tangentForceOnB?.x ?? 0), y: joint.normalForceOnB.y + (joint.tangentForceOnB?.y ?? 0) };
  const fx = joint.b === b.body ? onB.x : joint.a === b.body ? -onB.x : 0;
  return Math.max(0, -fx);
}

/** PAST_ALONG_PATH (experimental, off; PAST_ALONG_PATH=1 turns it on): a
 * blocker is beaten when the man is past him along the man's own path of
 * travel (hips past hips: the blocker more than PAST_MARGIN behind him along
 * his velocity), the football meaning and the officials'. Off, the pass rep's
 * beat is |phi| >= 1 against the man's line to the QB: with a kicking tackle
 * 47% of corner beats fired while the rusher was still level along his path,
 * and with an anchored tackle the beat fired with the man past but still
 * within reach and hands on, freeing him 4-5 yd from the QB to bend inside
 * (beat-probe.mts; docs/reviews/2026-11-12-tackle-set.md). Past but within
 * reach, the rep goes on as a ride: the blocker turns with him and pushes him
 * on past the QB; it ends when the man is out of reach. OPEN_HANDS's frame
 * uses the same test (`gripFor`): the grip lapses when the ride starts. */
export const PAST_ALONG_PATH = process.env.PAST_ALONG_PATH !== '0';
/** TACKLE_ANCHOR (experimental, off; TACKLE_ANCHOR=1 with TACKLE_SET): once
 * engaged with an edge rusher the tackle gives no more ground -- he anchors
 * and plays him from inside half. Retried on top of PAST_ALONG_PATH's ride:
 * without it, an anchored tackle was beaten the moment the man drew level
 * (edge win 33%, inside 31% free 98%); with it, the anchored counterfactual
 * matched the NFL's engaged retreat curve (-2.5/-2.25/-1.75/-0.75 yd/s at
 * 1.5-3.0+ s; NFL -2.75/-2.25/-1.5/-0.5) but lost inside 18.8% (NFL 6.4%):
 * nearly head-up when the man crossed his face (docs/reviews/2026-11-12-tackle-set.md). */
export const TACKLE_ANCHOR = process.env.TACKLE_ANCHOR === '1';
/** Inside-half leverage: how far inside the man's line to the QB the anchored tackle's body sits (yd). */
const INSIDE_LEVERAGE = 0.33;
/** RUSH_INTENT (experimental, off; RUSH_INTENT=1 turns it on): between
 * moves a pass rusher's request is an intent he chose, not a default. Off,
 * every rusher with no live move asked for 0.8 + 0.15 bend of his vmax at
 * push 0.75 toward a corner beside the blocker (measured along his line to
 * the QB, so a third of it ran sideways along the tackle), and 'power' stuck
 * to a bull or long-arm after its window: half an edge rusher's engaged time,
 * scraping sideways at 3.0 yd/s (NFL 2.1) and driving at the QB 1.4 (NFL 2.5)
 * (docs/reviews/2026-11-12-rusher-intent.md). With it, from what he feels and
 * sees -- his leverage (phi x side), his own speed, the blocker giving ground,
 * the hands -- he chooses:
 *   edge: with leverage, he works the blocker's outside hip at the pace he can
 *     bend (0.6 + 0.25 bend of vmax), push 0.5;
 *   power (press): otherwise, through the blocker at the QB, collapsing the
 *     pocket (0.55 vmax, push 0.75-1.0 by his power and mass);
 *   stall: while the blocker is driving him back, he fights the hands at a
 *     walking pace (1.2 yd/s, push 0.6) until his next move, and may lose.
 * Which he prefers is the player's (edge: finesse and bend; power: power and
 * mass); he keeps an intent at least his reaction time and changes it only
 * when his leverage or the blocker's ground changes past a margin. */
export const RUSH_INTENT = process.env.RUSH_INTENT === '1';
const RUSH_STALL_PACE = 1.2;
type RushIntent = 'edge' | 'power' | 'stall';
const rushIntents = new WeakMap<Engagement, { intent: RushIntent; since: number; lev: number; ground: boolean; switches: number; reversals: number; prev: RushIntent | null; at: number }>();

/** RUSH_INTENT: his intent between moves, kept until a perceived change clears a margin. */
function rushIntent(sim: PlaySim, e: Engagement, axis: Vec2, sep: number, bK: Felt = e.blocker): RushIntent {
  void sep;
  const d = e.defender, td = traits(d);
  // ENGAGE_FELT: his leverage and the blocker giving ground, from the blocker as he has him.
  const lev = (ENGAGE_FELT ? measurePhi(axis, d, bK) : e.phi) * e.side;
  const ground = bK.vel.x * axis.x + bK.vel.y * axis.y > 1.0;   // the blocker giving ground along the man's line to the QB
  const moving = Math.hypot(d.vel.x, d.vel.y) > 2.5;
  const edgePref = 0.5 * d.r('passRushFinesse') + 0.5 * td.bend;
  const powPref = 0.5 * d.r('passRushPower') + 0.5 * clamp((d.profile.massKg - 110) / 40, 0, 1);
  // Attempt 2: with no leverage he presses through the blocker at the QB (collapsing the pocket: NFL engaged edge
  // rushers drive at the QB about 2.5 yd/s), not a walk; he stalls only while the blocker is driving him back.
  // (Attempt 1 required momentum to press, so a stall killed the momentum that would end it: 77% of engaged time
  // stalled, engaged edge speed 2.4 vs NFL 3.5 yd/s.)
  const drivenBack = d.vel.x * axis.x + d.vel.y * axis.y < -0.5;
  const choose = (): RushIntent => {
    if (lev > 0.3 && !(ground && powPref > edgePref + 0.15)) return 'edge';
    if (lev > 0.15 && edgePref > powPref + 0.15) return 'edge';
    return drivenBack ? 'stall' : 'power';
  };
  void moving;
  let st = rushIntents.get(e);
  if (!st) { const intent = choose(); st = { intent, since: sim.t, lev, ground, switches: 0, reversals: 0, prev: null, at: sim.t }; rushIntents.set(e, st); return intent; }
  const rt = Math.max(0.1, d.profile.reactionTime);
  if (sim.t - st.since >= rt && (Math.abs(lev - st.lev) > 0.2 || ground !== st.ground)) {
    const next = choose();
    if (next !== st.intent) {
      st.switches++;
      if (next === st.prev && sim.t - st.since < 0.6) st.reversals++;
      st.prev = st.intent; st.intent = next; st.since = sim.t;
    }
    st.lev = lev; st.ground = ground;
  }
  st.at = sim.t;
  return st.intent;
}

/** RUSH_INTENT diagnostics: the rep's current intent and its switch counts (for probes). */
export function rushIntentOf(e: Engagement): { intent: RushIntent; switches: number; reversals: number } | null {
  const st = rushIntents.get(e);
  return st ? { intent: st.intent, switches: st.switches, reversals: st.reversals } : null;
}

/** Hips past hips: how far behind the man, along his path, the blocker must be (yd). */
export const PAST_MARGIN = 0.3;
/** The ride's push away from the QB, on top of keeping up with the man (yd/s). */
const RIDE_PUSH = 1.0;
/** PASS_RIDE (experimental, off; PASS_RIDE=1 turns it on): the ride as coached, one rule for every pass blocker. A man
 * who has won his hip (past along his path, PAST_ALONG_PATH's test) is not let go: the blocker runs with him on his
 * QB side -- the spot beside the man's hip, a body's width toward the QB across his path -- matching his velocity and
 * closing on that spot, hips opened to run where he is going, and pushes through his hands (the joint's push, away from himself: the man's path flattened
 * away from the QB). Off, the ride asked for the man's velocity less 1 yd/s toward the QB, so the blocker fell behind
 * by design (guards 1.9 against the man's 3.4 yd/s; the rep ended 3 yd from the QB, ride-probe.mts). Whether he keeps
 * up is his body's: the rep still ends when the man is beyond his arm. Ride to stop needs the man clearly back in
 * front (along his path by more than PAST_MARGIN), so the two do not flicker. A grip from behind stays the holding
 * detector's. */
export const PASS_RIDE = process.env.PASS_RIDE !== '0';
/** RUSH_ONE_HAND (with RUSH_HANDS; off): one cleared hand opens the side it guarded instead of freeing him; only
 * both hands gone is a landed move, and PAST (geometry) declares the win. */
export const RUSH_ONE_HAND = RUSH_HANDS && process.env.RUSH_ONE_HAND === '1';
const RIDE_GAIN = 2.5;
function rideIntent(b: Agent, d: { pos: Vec2; vel: Vec2; profile: { radius: number } }, qb: Vec2, growth: number | undefined, feet: number): Intent {
  const sp = Math.hypot(d.vel.x, d.vel.y);
  const path = sp >= 1 ? { x: d.vel.x / sp, y: d.vel.y / sp } : norm(sub(qb, d.pos));
  const nx = -path.y, ny = path.x, side = Math.sign((qb.x - d.pos.x) * nx + (qb.y - d.pos.y) * ny) || 1;
  const w = b.profile.radius + d.profile.radius;
  const spot = { x: d.pos.x + nx * side * w, y: d.pos.y + ny * side * w };
  const vel = { x: d.vel.x + RIDE_GAIN * (spot.x - b.pos.x), y: d.vel.y + RIDE_GAIN * (spot.y - b.pos.y) };
  // He opens his hips and runs with the man (faces where he is going), his near hand on the man's side.
  const facing = Math.hypot(vel.x, vel.y) > 1 ? Math.atan2(vel.y, vel.x) : Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x);
  return { vel, facing, push: 1, growth, posture: 0.6, cutSkill: 0.85 + 0.3 * feet };
}

/** PAST_ALONG_PATH: is the man past the blocker along his own path of travel?
 * Below a walk, his path is not defined; the leverage (phi) decides. */
export function pastAlongPath(b: { pos: Vec2 }, d: { pos: Vec2; vel: Vec2 }, phi: number): boolean {
  // Past means both: behind him along where he is running, and no longer between him and where he is going (the
  // leverage against his line to the ball or QB, |phi| >= 1). Along the path alone counted a blocker sealing a man
  // who runs down the line -- behind him along his path, still in his way -- as beaten: run holding calls rose to
  // 8 a team-game (holds-detail.mts: 93% behind along the path, 91% with |phi| < 1).
  if (phi < 1) return false;
  const sp = Math.hypot(d.vel.x, d.vel.y);
  if (sp < 1) return true;
  return ((b.pos.x - d.pos.x) * d.vel.x + (b.pos.y - d.pos.y) * d.vel.y) / sp < -PAST_MARGIN;
}

/** EDGE_ARC (experimental, off; EDGE_ARC=1 turns it on): an edge rusher runs
 * the arc as it is taught. His landmark is outside the tackle's outside
 * shoulder at the depth he sees the QB set: he gets level with the tackle
 * there, turns for the QB once his hips are past the tackle's, and counters
 * inside when he sees the tackle overset -- the tackle's body level with or
 * outside his own, from his picture of the tackle, not the tackle's
 * assignment. His bend (speed and cut) sets how well he runs it, his
 * reaction how soon he reads the overset; nothing sets whether he wins. Off,
 * his rush point in the rep is a corner beside the blocker measured along
 * the line to the QB, which once level sits behind the tackle: he requested
 * -2.6 to -3.1 yd/s across, achieved about 0, and won in front of the tackle
 * (55-57% vs NFL 27%; docs/reviews/2026-11-12-edge-rush.md). */
export const EDGE_ARC = process.env.EDGE_ARC === '1';
/** REP_SEEN (experimental, off; REP_SEEN=1; PRO-INFO #3, #4, #7, #8): in the pass rep each man acts on what he can
 * sense. The rusher aims and faces at the QB as he sees him, and reads his leverage and the blocker's overset from
 * his picture of the blocker. The blocker sets against the launch point he knows from the call (calledLaunchX), not
 * the QB's live spot behind him; his ride runs with the man as he has him (touch or sight), and his hands-off delay
 * is keyed on his own hands being off the man, not on the rusher's move record. The rep's outcome geometry (past,
 * turned the corner) stays the World's. */
export const REP_SEEN = process.env.REP_SEEN !== '0';
/** ENGAGE_FELT (default off; ENGAGE_FELT=1): an engaged man's requests and decisions read the man he is engaged with as
 * he has him: by touch at the hands' delay (0.06 s, the delay punch() feels the man at) while either man's hands carry
 * load, by sight (0.12-0.24 s, by his read) when they do not; never the man's true position or velocity (Integration,
 * 2026-11-14: the engaged pass set, the ride and the run drive faced atan2(d.pos - b.pos)). Covered: both men's facing,
 * the blocker's ride trigger, lane and seal offsets and drive pace, the rusher's aims off the blocker's body and his
 * between-moves intent, the run defender's touch reads of the blocker, the helpers' and climbers' reads of the man.
 * Physics (joint and strike geometry, the World's contact and reach) and the rep's outcome geometry (past and out of
 * reach, behind his shoulders, the body no longer in the way) stay on the true bodies. */
export const ENGAGE_FELT = process.env.ENGAGE_FELT !== '0';
/** ENGAGE_TRUNK (experimental, off; ENGAGE_TRUNK=1, needs TRUNK_TWIST=1 and ENGAGE_FELT=1; the yaw note's step 1,
 * docs/reviews/2026-11-14-pair-contact-design.md): an engaged man's hips and shoulders are two requests. The hips are his
 * set and ride, square to what he protects (a pass setter: the direction from the called launch point through him; a
 * run blocker: his track, REACH_RACE's open hips as before; a gap-holding run defender: square to the line of
 * scrimmage); the shoulders (`look`, TRUNK_TWIST's trunk within its range) are on the man as he has him (ENGAGE_FELT).
 * His chest then trails a man who moves by the picture's delay and each segment's own bound (the yaw motor for the
 * hips, TRUNK_RATE for the trunk), with no blend constant. Readers that compare his front with the line to the man read
 * the shoulders: the hand site's bearing, the pass rep's ride retention, the run block's lost-behind-the-shoulders test
 * and the run hands' sides. Off, each engaged man asks for one facing, at the man (the NFL tackle's facing follows the
 * set frame 0.27 and the rusher 0.61, ours 0.01 / 0.80: engaged-yaw.py). The coaching: inside-out, half a man, punch the
 * inside half; the run block's play-side number; the gap defender's stab and grab (sources in the note). */
export const ENGAGE_TRUNK = process.env.ENGAGE_TRUNK !== '0';
if (ENGAGE_TRUNK && !(TRUNK_TWIST && ENGAGE_FELT)) throw new Error('ENGAGE_TRUNK=1 requires TRUNK_TWIST=1 and ENGAGE_FELT=1');
/** Where a man's chest points for the readers that mean it (ENGAGE_TRUNK: the shoulders; off: the facing, as before). */
const chestOf = (a: Agent): number => ENGAGE_TRUNK ? shouldersOf(a.body) : a.body.facing;
const bearing = (from: Vec2, to: Vec2): number => Math.atan2(to.y - from.y, to.x - from.x);
type Felt = { pos: Vec2; vel: Vec2 };
/** Diagnostic hook (no behaviour): each feltMan call, with whether he had the man by touch. */
export const feltProbe: { on?: (self: Agent, man: Agent, touch: boolean, t: number, delay?: number) => void } = {};
const lastTouch = new WeakMap<PlaySim, Map<string, number>>();
/** The hand-over from touch to sight is continuous: a hand that carries no load for a tick is still on the man, so from
 * the last loaded tick his picture ages from the touch delay toward his sight delay over his reaction time (a step
 * between the two each time the load crossed zero was 86% single-tick sight stretches, about one a second engaged:
 * felt-switch.mts). The picture never steps back in time: it ages at most at the touch-to-sight rate, and a reloaded hand
 * is fresh information at once. Delays are held to 0.01 s. `off` (a landed hand move) is unloaded hands. */
function feltMan(sim: PlaySim, self: Agent, man: Agent, e: Engagement, read: number, off = false): Felt {
  const on = !off && !!(e.hands?.normalForce || e.hands?.tangentForce);
  // Per pair in the play, not per rep: a man re-engaged on the same man keeps the touch he had a moment ago.
  const rt = Math.max(0.1, self.profile.reactionTime), m = lastTouch.get(sim) ?? new Map<string, number>(), key = `${self.idx}>${man.idx}`;
  lastTouch.set(sim, m);
  if (on) m.set(key, sim.t);
  const sight = 0.12 + 0.12 * (1 - read), u = clamp((sim.t - (m.get(key) ?? -Infinity)) / rt, 0, 1);
  const delay = Math.round((0.06 + (sight - 0.06) * u) * 100) / 100;
  feltProbe.on?.(self, man, on, sim.t, delay);
  return sim.see(self, man, delay / rt);
}
/** Room outside the tackle's shoulder the arc's landmark leaves (yd): the corner's existing offset. */
export const ARC_ROOM = 0.45;
/** Past the tackle's hips: deeper than him by this much (yd). */
export const ARC_PAST = 0.3;

/** The width a tackle's kick takes from his alignment (the set point in behaviors/blocking.ts): coached, so both sides know it. */
export const KICK_WIDTH = 0.8;

/** EDGE_ARC (attempt 2): the rusher's arc from what he saw at the snap -- the
 * tackle's alignment and the width a kick takes from it. `out` is the
 * tackle's outside, `setY` where his set should be, `y` the landmark outside
 * it (bodies + ARC_ROOM). Off his live shoulder instead (attempt 1) a tackle
 * who widened dragged the landmark out with him (tackle +1.6 yd wide at 3.0 s,
 * NFL -0.6). */
export function arcLandmark(sim: PlaySim, tackle: Agent, rusher: Agent): { out: number; setY: number; y: number } {
  const home = sim.offAlign.spots[tackle.slot]?.pos.y ?? tackle.pos.y, out = Math.sign(home - sim.ballY) || 1;
  const setY = home + out * KICK_WIDTH;
  return { out, setY, y: setY + out * (tackle.profile.radius + rusher.profile.radius + ARC_ROOM) };
}

/** EDGE_ARC: the tackle seen oversetting -- wider than his set by more than the room the arc leaves, close enough to matter. */
export function seenOverset(seen: Vec2, rusher: Vec2, arc: { out: number; setY: number }): boolean {
  return (seen.y - arc.setY) * arc.out > ARC_ROOM && Math.abs(seen.x - rusher.x) < 1.5;
}
/** A body width and a step: how far short of the launch point the tackle sets. */
export const TACKLE_SET_SHORT = 1.0;

/** TACKLE_SET (attempt 2): the set is a spot, with a width as well as a
 * depth. He kicks back along a line from his own alignment, wider for a wider
 * rusher (his alignment outside the tackle at the snap, 0.4 of it, 0.3-1.0 yd:
 * enough to keep the inside half of a man who has to come round), and he never
 * chases the rusher outside that line: a rusher who goes wider than it is
 * taking the long way round, which is the point. Inward he mirrors freely.
 * Off (and in attempt 1) the kick and the rep follow the rusher's width:
 * tackles ended +1.3-1.6 yd outside their alignment at 3.0 s against an arc
 * (NFL -0.6), and the rusher's corner sat 0.7-1.2 yd further from the QB. */
export function tackleSetLine(sim: PlaySim, tackle: Agent, rusher: Agent): { out: number; y: number } {
  const home = sim.offAlign.spots[tackle.slot]?.pos.y ?? tackle.pos.y, out = Math.sign(home - sim.ballY) || 1;
  const rHome = sim.defAlign.spots[rusher.slot as keyof typeof sim.defAlign.spots]?.pos.y ?? rusher.pos.y;
  return { out, y: home + out * clamp(0.4 * (rHome - home) * out, 0.3, 1.0) };
}
/** Inside-half leverage: where his centre sits inside the rusher's. */
export const INSIDE_HALF = 0.3;

/** The deepest x a tackle sets to under TACKLE_SET (null without a called drop). */
export function tackleFloor(sim: PlaySim): number | null {
  const launch = calledLaunchX(sim);
  return launch === null ? null : launch + TACKLE_SET_SHORT;
}
/** Experimental (DL_FIGHT=1, off): a defender driven sideways fights pressure. */
const DL_FIGHT = process.env.DL_FIGHT === '1';
/** An edge widens with a reach only as far as containing the runner needs
 * (EDGE_CONTAIN=0 restores widening with the blocker without bound). */
const EDGE_CONTAIN = process.env.EDGE_CONTAIN !== '0';

/** A run blocker whose hands are loaded keeps the leverage he caught the man
 * with instead of running to a new shoulder and carrying him along
 * (SEAL_HOLD=0 restores the unbounded seal correction). */
const SEAL_HOLD = process.env.SEAL_HOLD !== '0';

/** Run release measured against the blocker's torso (LEVER_FACING=0: fixed frame). */
const LEVER_FACING = process.env.LEVER_FACING !== '0';

/** A run shed is a decision executed by the body (SHED_PHYSICAL=0: rolled outcome). */
const SHED_PHYSICAL = process.env.SHED_PHYSICAL !== '0';
/** Once the runner a blocked defender has declared (held between ordinary
 * reads) is past the line, the ball has left his gap and everyone pursues:
 * he works off the block toward the ball at any range, not only when it is
 * within 3.5 yd. Only the decision to work off changes; the hand fight, his
 * feet and the blocker's body still decide whether he gets free. When the
 * rep ends because the runner has passed him, the same blocker cannot
 * re-latch him at once (the shed window); bodies still collide.
 * SHED_PURSUE=0 restores the close-range gate for comparison. */
const SHED_PURSUE = process.env.SHED_PURSUE !== '0';
/** Experimental (RUN_HAND_MOVE=1, off): a defender who decides to work off
 * a run block attacks the blocker's hands first (see the shed decision). */
const RUN_HAND_MOVE = process.env.RUN_HAND_MOVE !== '0';
/** Experimental (SHED_PAST=1, off): a defender working off a run block is
 * off it once the blocker is no longer between him and the runner he sees
 * (see the leverage check in stepRunRep). */
const SHED_PAST = process.env.SHED_PAST !== '0';
/** Experimental (SHED_PAST_GATE=1, with SHED_PAST; off): getting past frees
 * him only while the runner he sees is still more than 2 yd off. Slipping the
 * blocker with the runner already on him leaves him in the block, reaching
 * with his free arm (docs/reviews/run-shed-release.md, "Release timing"). */
const SHED_PAST_GATE = process.env.SHED_PAST_GATE !== '0';

/** A defender working off a run block: until when, and toward which side of
 * the surface frame (the ball side when he decided). */
/** SEAL_HOLD: the lateral offset a loaded run blocker keeps (see stepRunRep). */
const sealHolds = new WeakMap<Engagement, number>();
const runSheds = new WeakMap<Engagement, { until: number; side: number; runner?: boolean; contactSide?: number }>();

/** Run-blocker anchoring against a felt drive (RUN_ANCHOR=0 disables, for A/B). */
const ANCHOR = process.env.RUN_ANCHOR !== '0';
/** ANCHOR_GRADE (default off): an engaged run blocker braces in proportion
 * to how hard he is being driven back (felt load toward his backfield,
 * 0.15-0.35 of body weight, and backward speed, 0.05-0.25 yd/s), blending his
 * request toward the brace, instead of switching his whole request to the
 * brace when both cross a line (0.25 g, 0.15 yd/s). The switch flickered
 * tick to tick: its toggles were 58% of outside zone solo blockers' request
 * heading churn (70% on doubles, 49% inside zone solo), each a 60-90 deg jump. */
const ANCHOR_GRADE = process.env.ANCHOR_GRADE !== '0';
/** ANCHOR_GRADE: the time (s) over which a blocker's feel of being driven
 * settles (a reaction time), and that feel per blocker. */
const ANCHOR_FEEL = .15;
/** FEET_SETTLE (default off): an engaged run blocker's foot request follows
 * his controller's wish with a motor lag (FEET_SETTLE_TAU) instead of
 * changing every tick. The wish moves tick to tick with the man's perceived
 * lateral motion in the hand fight, the switch between touch and sight delay
 * when hand force blinks, the SEAL_HOLD load threshold and the raw felt-force
 * feedback (together the lateral-jump share of engaged OZ/IZ request heading
 * churn, about equal parts). Feet re-plan at step cadence. */
const FEET_SETTLE = process.env.FEET_SETTLE !== '0';
const FEET_SETTLE_TAU = .1;
const feetSettle = new WeakMap<Agent, { e: Engagement; vel: Vec2; t: number }>();
const anchorFeel = new WeakMap<Agent, { load: number; back: number; t: number }>();

/** Default on (PASS_FEEL=0 turns it off): the pass blocker mirrors the rusher on
 * acquired information: the one he feels through his hands (a 0.06 s
 * tactile latency plus his attention lapses, via sim.see) or, while a landed move has his hands off, the one
 * he sees (his visuomotor delay), not the rusher's current velocity and
 * position. */
const PASS_FEEL = process.env.PASS_FEEL !== '0';

/** Test hook: a fixed move sequence for a rep (identical across arms). */
export const rushScripts = new WeakMap<Engagement, RushMove[]>();

export function updateEngagements(sim: PlaySim, intents: Intent[] = sim.intents): void {
  const t = sim.t;
  for (const e of [...sim.engagements]) {
    const b = e.blocker;
    const d = e.defender;
    if (b.isDown(t) || d.isDown(t)) {
      if (e.type === 'run') runContactObservers.get(sim)?.(e, 'end', { reason: 'body down' });
      sim.disengage(e);
      continue;
    }
    if (e.type === 'pass' && sim.throwAt >= 0 && t - sim.throwAt > 0.35) {
      sim.disengage(e);
      continue;
    }
    // Pass pro converts to run blocking once the QB hands off / scrambles.
    if (e.type === 'pass' && (!sim.isPass || (sim.carrier !== null && sim.carrier !== sim.qb) || sim.scrambled)) e.type = 'run';
    // The runner he sees with the ball, not the live holder.
    const held = e.type === 'run' ? observedHolder(d, sim, b) : null;
    if (held) {
      const past = (held.cue.pos.x - d.pos.x) * sim.attackDir(held.target.team);
      if (past > 2.5 && t - e.start > 0.4) {
        runContactObservers.get(sim)?.(e, 'end', { reason: 'runner passed defender', past });
        sim.disengage(e);
        // He is off this block to pursue: the blocker's body can still be in
        // his way (World contact), but his hands cannot re-latch the man on
        // the next tick, the same window as a shed.
        if (SHED_PURSUE) b.shedBy.set(d, t + 0.6);
        continue;
      }
    }
    // Contact that has come apart (a bump, a spin away) ends the rep.
    const apart = Math.hypot(b.pos.x - d.pos.x, b.pos.y - d.pos.y) - (b.profile.radius + d.profile.radius);
    // An isolated run contact cannot steer through air beyond either full
    // arm. Preserve the existing pass and shared-helper contact lifecycle.
    const grace = e.type === 'run' && !e.helpers.length ? 0 : 0.35;
    if (apart > Math.max(traits(b).arm, traits(d).arm) / 36 + grace) {
      if (e.type === 'run') runContactObservers.get(sim)?.(e, 'end', { reason: 'separation', apart });
      sim.disengage(e);
      continue;
    }
    syncJoints(sim, e);
    e.baseB = baseOf(b);
    e.baseD = baseOf(d);
    if (e.type === 'pass') stepPassRep(sim, e, intents);
    else { stepRunRep(sim, e, intents); if (CLIMB_PREP) prepareClimberFeet(sim, e, intents); if (CLIMB_BASE) easeClimberPush(sim, e, intents); }
  }
}

/** CLIMB_PREP (default off): on a zone double whose backer either member sees
 * showing (arriving within reach shortly, or flowing to the play side), his
 * feet go with the man's lateral flow and half a yard a second more and start
 * gaining ground upfield while his hands stay on: eyes on the backer, feet
 * already going. Tracked climbers accelerate into the release (outside zone
 * 2.1 -> 3.5 yd/s over the 0.6 s before leaving); ours held at 2.1-2.5 yd/s
 * and started their climb from there. Contact and World decide what the feet
 * achieve; the release read is unchanged. */
export const CLIMB_PREP = process.env.CLIMB_PREP !== '0';
/** CLIMB_SQUARE (default off; acts with CLIMB_PREP): the same climber squares
 * his shoulders upfield while his hands stay on. At release climbers faced
 * ~45 deg in toward the down man with the climb path ~35 deg the other way
 * (80-90 deg off), and spent 0.3 s turning before they could accelerate. */
export const CLIMB_SQUARE = process.env.CLIMB_SQUARE !== '0';
interface ClimbPrepPlan { kind: string; climbTo?: Agent | null;
  combination?: { released: boolean; backer: Agent | null; defender: Agent; members: Agent[] } }
/** CLIMB_BASE (default off): a zone double member whose backer shows (in
 * his own picture: arriving within reach in half a second, or flowing play
 * side) keeps his hands on the man but eases his drive (push at most 0.35),
 * so his weight stays over his own feet. Driving full force into the man up
 * to the release left the climber leaning ~1,300 N into him; with the man
 * gone the lean collapsed his posture (0.77 to 0.12) and he spent 0.8 s
 * recovering at ~1 yd/s beside the man (s11-45 RG). */
export const CLIMB_BASE = process.env.CLIMB_BASE !== '0';
/** DOUBLE_OVERTAKE (default off): zone doubles hand the man to the member
 * who can hold him and release the other, as tracked: on stretch runs the
 * backside member overtakes a man flowing play side (races for his play-side
 * half as the engaged blocker, approaches where he is going) and does not
 * take the climb while he is gaining on him, so the play-side member climbs;
 * a man he cannot gain on stays his partner's. A man flowing toward the
 * climber is handed only to a keeper who has replaced the hip (within a
 * quarter yard of level, keeping pace). A climber's cut to his backer counts
 * the way around the man he leaves. Tracked 2022 zone doubles, same
 * operator, play-side member's share of climbs (NFL / before / with): outside
 * zone, man in the gap 92 / 24 / 67%, over the backside man 89 / 58 / 85%,
 * over the play-side man 46 / 16 / 51%. Read in blocking.ts; defined here. */
export const DOUBLE_OVERTAKE = process.env.DOUBLE_OVERTAKE !== '0';
function easeClimberPush(sim: PlaySim, e: Engagement, intents: Intent[]): void {
  const run = sim.offCall.run;
  if (!run || !['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(run.scheme)) return;
  const d = e.defender, ps = run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  for (const m of [e.blocker, ...e.helpers]) {
    const plan = (m.behavior as { plan?: ClimbPrepPlan }).plan, combo = plan?.combination, it = intents[m.idx];
    if (!plan || !combo || combo.released || !combo.backer || combo.defender !== d || !combo.members.includes(m) || !it) continue;
    const backer = sim.see(m, combo.backer);
    const ahead = { x: backer.pos.x + backer.vel.x * .5, y: backer.pos.y + backer.vel.y * .5 };
    if (!(Math.hypot(ahead.x - m.pos.x, ahead.y - m.pos.y) < 4.2 || backer.vel.y * ps > 1.5)) continue;
    intents[m.idx] = { ...it, push: Math.min(it.push ?? 1, .35) };
  }
}

function prepareClimberFeet(sim: PlaySim, e: Engagement, intents: Intent[]): void {
  const run = sim.offCall.run;
  if (!run || !['insideZone', 'outsideZone', 'wideZone', 'splitZone'].includes(run.scheme)) return;
  const d = e.defender, ps = run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  for (const m of [e.blocker, ...e.helpers]) {
    const plan = (m.behavior as { plan?: ClimbPrepPlan }).plan, combo = plan?.combination;
    if (!plan || !combo || combo.released || !combo.backer || combo.defender !== d || !combo.members.includes(m) || !intents[m.idx]) continue;
    // Only the member behind the man's flow goes with it; the one on his
    // play side running at flow speed would leave the man.
    if ((m.pos.y - (ENGAGE_FELT ? sim.see(m, d) : d).pos.y) * ps > 0) continue;
    const backer = sim.see(m, combo.backer);
    const ahead = { x: backer.pos.x + backer.vel.x * .5, y: backer.pos.y + backer.vel.y * .5 };
    const shows = Math.hypot(ahead.x - m.pos.x, ahead.y - m.pos.y) < 4.2 || backer.vel.y * ps > 1.5;
    if (!shows) continue;
    const up = sim.attackDir(m.team), seenD = sim.see(m, d);
    const v = intents[m.idx].vel, flow = Math.max(0, seenD.vel.y * ps);
    const lateral = Math.max(v.y * ps, flow + .5) * ps;
    const forward = Math.max(v.x * up, 1) * up;
    // Hip to hip with the keeper, shoulders square upfield (not turned in on
    // the man): he can come off without turning his body around first.
    intents[m.idx] = { ...intents[m.idx], vel: { x: forward, y: lateral }, facing: CLIMB_SQUARE ? (up > 0 ? 0 : Math.PI) : intents[m.idx].facing };
  }
}

/** Hip leverage does not by itself detach a tackle's working outside hand.
 * Retain only an already loaded compressive contact the blocker owns, inside
 * its existing working span and in front of his actual torso. The ordinary
 * solver still limits its force, work and the feet needed to keep up. */
function canRidePassContact(e: Engagement, t: number): boolean {
  const b = e.blocker, d = e.defender, hands = e.hands;
  const outside = b.passSet?.outside;
  if (!outside || !hands || e.holding || e.control <= 0 || hands.actor !== b.body
    || !((hands.normalForce ?? 0) > 0)) return false;
  // A landed finesse action has cleared the hands for this window. Do not
  // turn the old solved load into evidence that a new hold exists.
  if (t < e.moveUntil && e.moveOk && e.move !== 'bull' && e.move !== 'longarm') return false;
  const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y;
  return dy * outside > 0 && Math.hypot(dx, dy) <= hands.extension
    && dx * Math.cos(chestOf(b)) + dy * Math.sin(chestOf(b)) >= 0;
}

function stepPassRep(sim: PlaySim, e: Engagement, intents: Intent[]): void {
  const t = sim.t;
  const dt = sim.dt;
  const rng = sim.dice('rep', e.blocker, e.defender);
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b);
  const td = traits(d);
  // ENGAGE_FELT: the rusher as the blocker has him, the blocker as the rusher has him (each the true body when off).
  const dK: Felt = ENGAGE_FELT ? feltMan(sim, b, d, e, tb.read) : d, bK: Felt = ENGAGE_FELT ? feltMan(sim, d, b, e, td.read) : b;
  const axis = axisOf(sim, e);
  const lat = latOf(axis);
  // Leverage is where the bodies are, relative to the QB, every tick.
  e.phi = measurePhi(axis, d, b);
  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);
  // PAST_ALONG_PATH: beaten means past the blocker along the man's own path
  // of travel; past but still within reach, the rep goes on as a ride.
  let riding = false;
  if (PAST_ALONG_PATH) {
    const pastOf = (m: Felt, phi: number): boolean => {
      let p = pastAlongPath(b, m, Math.abs(phi));
      // PASS_RIDE: once riding, he stays on him until the man is clearly back in front along his path.
      if (PASS_RIDE && !p && e.riding) {
        const sp = Math.hypot(m.vel.x, m.vel.y);
        p = sp < 1 || ((b.pos.x - m.pos.x) * m.vel.x + (b.pos.y - m.pos.y) * m.vel.y) / sp <= PAST_MARGIN;
      }
      return p;
    };
    // The outcome (past him and out of his reach) is the World's; ENGAGE_FELT: the ride is his decision, on the man as
    // he has him.
    const past = pastOf(d, e.phi), feltPast = ENGAGE_FELT ? pastOf(dK, measurePhi(axis, dK, b)) : past;
    if (past) {
      const reach = b.profile.radius + d.profile.radius + b.player.measurables.armIn / 36;
      if (Math.hypot(d.pos.x - b.pos.x, d.pos.y - b.pos.y) > reach && !canRidePassContact(e, t)) {
        if (tryHold(sim, e)) return;
        beat(sim, e, axis, lat, false, 'past him');
        return;
      }
    }
    riding = feltPast;
  }
  else if (Math.abs(e.phi) >= 1 && !canRidePassContact(e, t)) {
    if (tryHold(sim, e)) return;
    beat(sim, e, axis, lat, false, 'turned the corner');
    return;
  }
  if (b.body.support?.state !== 'up') b.tags.add('anchor-lost');
  // PASS_OFF attempt 2: a helper who sees the man come off his blocker takes him; the rep goes on as his next tick.
  if (passOff(sim, e, true)) return;

  // ---- moves at decision points
  // RUSH_HANDS: a move takes his arm away; he throws no other until it is back. After a club his arm returns across
  // its sweep (0.45 of his arm) at his hand speed, plus his reaction; a club that did not clear (his arm stopped on a
  // hand) must be cocked again from rest (a second sweep); one that left him off balance costs his reaction again.
  // A counter is a new decision on a felt change (the blocker's hand going unloaded on him) -- once he can.
  if (RUSH_HANDS && e.type === 'pass') {
    const rt = Math.max(0.1, d.profile.reactionTime);
    if (e.club && t >= e.club.end) {
      const h = e.hands, now = !h || h.off ? 0 : h.handsOn ?? 2, cleared = now < e.club.handsBefore;
      const sweep = 0.45 * d.player.measurables.armIn / 36 / e.club.speed;
      e.handsBackAt = e.club.end + sweep + rt + (cleared ? 0 : sweep) + (baseOf(d) < 0.9 ? rt : 0);
      e.nextMoveAt = Math.max(e.nextMoveAt, e.handsBackAt);
      e.club = undefined;
    }
    const loaded = !handUnloaded(e);
    const ready = !e.club && !e.rusherHand && t >= (e.handsBackAt ?? 0);
    if (ready && e.feltLoaded && !loaded && !(t < e.moveUntil)) e.nextMoveAt = Math.min(e.nextMoveAt, Math.max(t + rt, e.handsBackAt ?? 0));
    e.feltLoaded = loaded;
  }
  if (t >= e.nextMoveAt) {
    const scripted = rushScripts.get(e);
    e.move = scripted?.length ? scripted.shift()! : t - e.start < 0.1 ? e.move : chooseMove(sim, e);
    resolveMove(sim, e, axis);
  }
  const inMove = t < e.moveUntil && e.moveOk;
  const stalled = t < e.moveUntil && !e.moveOk;
  e.pushBoost = Math.max(0, e.pushBoost - dt * 1.2);
  // Hand fight drifts toward the better hands; arm length keeps you off the body.
  // RUSH_BULL (#10): no drift toward the better hands rating.
  if (!RUSH_BULL) e.control = clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);
  setHands(sim, e);

  const sep = b.profile.radius + d.profile.radius;
  const qb = sim.qb.pos;
  // REP_SEEN: the rusher's QB is the one he sees; the blocker's is the called launch point.
  const qbD = REP_SEEN ? sim.see(d, sim.qb).pos : qb, qbB = REP_SEEN ? protectPoint(sim) : qb;
  // ---- the rusher: to the QB, around the working side or through the man.
  const turned = (REP_SEEN ? rusherPhi(sim, d, sim.see(d, b).pos) : e.phi) * e.side > 0.5;
  // RUSH_INTENT: between moves his request is an intent he chose (edge, power or stall), not a default.
  const between = RUSH_INTENT && !(t < e.moveUntil) && !turned ? rushIntent(sim, e, axis, sep, bK) : null;
  const power = between ? between === 'power' : RUSH_INTENT ? (t < e.moveUntil && (e.move === 'bull' || e.move === 'longarm')) : e.move === 'bull' || e.move === 'longarm';
  const bend = inMove && (e.move === 'speed' || e.move === 'dip' || e.move === 'rip');
  const corner = { x: bK.pos.x + lat.x * e.side * (sep + 0.45) + axis.x * 0.35, y: bK.pos.y + lat.y * e.side * (sep + 0.45) + axis.y * 0.35 };
  let aim = power || turned ? qbD : corner;
  if (between === 'edge') {
    // Work the edge: at the blocker's hip on his working side, a step past it toward the QB.
    aim = { x: bK.pos.x + lat.x * e.side * (sep + 0.2) + axis.x * 0.5, y: bK.pos.y + lat.y * e.side * (sep + 0.2) + axis.y * 0.5 };
  } else if (between === 'stall') aim = { x: bK.pos.x, y: bK.pos.y };
  // RUSH_ONE_HAND: a cleared hand opens the side it guarded. He works to it, at the blocker's hip a step past toward
  // the QB, through the body and the remaining hand at whatever speed that contact allows; PAST (geometry) wins it.
  const cleared = RUSH_ONE_HAND && !turned && !inMove ? clearedSide(e, lat) : 0;
  if (cleared) aim = { x: bK.pos.x + lat.x * cleared * (sep + 0.2) + axis.x * 0.5, y: bK.pos.y + lat.y * cleared * (sep + 0.2) + axis.y * 0.5 };
  // EDGE_ARC: working the outside of a tackle, the corner is his landmark at
  // the QB's depth outside the tackle's shoulder; past the hips he turns.
  const arcOut = b.passSet?.outside ?? 0;
  if (EDGE_ARC && !power && arcOut !== 0 && Math.abs(d.pos.y - sim.ballY) > 3 && lat.y * e.side * arcOut > 0) {
    const qbSeen = sim.see(d, sim.qb, 0.5).pos;
    aim = d.pos.x < bK.pos.x - ARC_PAST ? qbSeen : { x: Math.min(qbSeen.x, bK.pos.x - ARC_PAST - 0.2), y: arcLandmark(sim, b, d).y };
  }
  const toAim = norm(sub(aim, d.pos));
  const rush = cleared ? d.profile.vmax * (0.8 + 0.15 * td.bend) : between === 'stall' ? RUSH_STALL_PACE : between === 'edge' ? d.profile.vmax * (0.6 + 0.25 * td.bend)
    : d.profile.vmax * (power ? 0.55 : 0.8 + 0.15 * td.bend) * (stalled ? 0.6 : 1);
  intents[d.idx] = {
    vel: { x: toAim.x * rush, y: toAim.y * rush },
    facing: Math.atan2(qbD.y - d.pos.y, qbD.x - d.pos.x),
    push: cleared ? 0.75 : between === 'stall' ? 0.6 : between === 'edge' ? 0.5 : between === 'power' ? 0.75 + 0.25 * (0.5 * d.r('passRushPower') + 0.5 * clamp((d.profile.massKg - 110) / 40, 0, 1)) : power ? 1 : inMove ? 0.35 : 0.75,
    posture: bend ? 0.95 : 0.75,
    cutSkill: 0.8 + 0.5 * td.bend,
  };
  if ((RUSH_ARM_BALANCE && e.rusherHand) || RUSH_LEAN_BOUND) armBalance(d, td, intents[d.idx]);

  // ---- the blocker: stay between him and the QB, give ground to set depth,
  // then anchor. Mirror with the feet; the hands steer what they control.
  // REP_SEEN: computed below from the man as he has him, toward the launch point.
  let front = { x: d.pos.x + axis.x * (sep + 0.15), y: d.pos.y + axis.y * (sep + 0.15) };
  const intent = b.passSet;
  // TACKLE_ANCHOR: anchored against an edge rusher he plays him from inside
  // half -- his body on the man's inside shoulder, a third of a yard inside
  // the man's line to the QB, better feet holding it nearer -- so an inside
  // move runs into him, not across his face. Otherwise (and off) he works an
  // outside rush wide of the launch lane.
  const anchorRep = TACKLE_ANCHOR && TACKLE_SET && !!intent?.outside && Math.abs(dK.pos.y - sim.ballY) > 3;
  if (anchorRep) {
    // Across the man's line to the QB, on its inside (the ball's side of it).
    const sgn = lat.y * -intent!.outside >= 0 ? 1 : -1, k = sgn * INSIDE_LEVERAGE * (0.6 + 0.4 * tb.feet);
    front.x += lat.x * k; front.y += lat.y * k;
  }
  else if (intent && intent.outside !== 0 && (dK.pos.y - b.pos.y) * intent.outside > 0.15) {
    // Work an outside rush wide of the launch lane.
    front.y += clamp((intent.laneY - front.y) * 0.5, -0.4, 0.4);
  }
  const lead = 0.15 + 0.15 * tb.read;
  // PASS_FEEL: what the blocker has of the rusher, by touch or by sight.
  // REP_SEEN: by touch while his own hands are on the man, by sight when they are off.
  const handsOff = REP_SEEN ? !(e.hands?.normalForce || e.hands?.tangentForce) : inMove && e.move !== 'bull' && e.move !== 'longarm';
  const rt = Math.max(0.1, b.profile.reactionTime);
  // ENGAGE_FELT: the same felt picture as his other reads (its touch / sight hand-over continuous).
  const known = ENGAGE_FELT ? dK : PASS_FEEL || REP_SEEN ? sim.see(b, d, (handsOff ? 0.12 + 0.12 * (1 - tb.read) : 0.06) / rt) : d;
  if (REP_SEEN) {
    // His front: on the man's line to the launch point, the TACKLE_ANCHOR / lane shift carried over.
    const axB = norm(sub(qbB, known.pos)), base = { x: d.pos.x + axis.x * (sep + 0.15), y: d.pos.y + axis.y * (sep + 0.15) };
    front = { x: front.x - base.x + known.pos.x + axB.x * (sep + 0.15), y: front.y - base.y + known.pos.y + axB.y * (sep + 0.15) };
  } else if (PASS_FEEL) { front.x += known.pos.x - d.pos.x; front.y += known.pos.y - d.pos.y; }
  let offLat = (front.x + known.vel.x * lead - b.pos.x) * lat.x + (front.y + known.vel.y * lead - b.pos.y) * lat.y;
  let dLat = known.vel.x * lat.x + known.vel.y * lat.y;
  // SET_SPOT: an interior blocker's lateral target is inside-out on the man (setSpotTarget), not a step in front of the
  // man he is carrying; its feed-forward is the target's own motion.
  if (SET_SPOT && !b.passSet?.outside) {
    const tg = setSpotTarget(sim, known.pos, b.pos.x);
    offLat = (tg.y - b.pos.y) * lat.y;
    dLat = tg.frac * known.vel.y * lat.y;
  }
  const mirror = tb.lateral * (0.75 + 0.35 * tb.feet) * (e.helpers.length ? 1.3 : 1);
  const vLat = clamp(dLat + felt(e, lat) * (0.6 + 0.6 * tb.feet) + offLat * (3 + 3 * tb.feet), -mirror, mirror);
  const depth = sim.los - b.pos.x;
  let setDepth = b.passSet?.depth ?? passSetDepth(sim, b);
  // PASS_KICK: against an outside rusher he keeps kicking with him in the rep
  // (level with or deeper than the rusher, short of the launch point) instead
  // of stopping at the set spot while the rusher runs on to his hip.
  if (PASS_KICK && Math.abs(known.pos.y - sim.ballY) > Math.abs(b.pos.y - sim.ballY))
    setDepth = Math.max(setDepth, Math.min(sim.los - known.pos.x + RIDE_LEAD, sim.los - qbB.x - 0.5));
  // TACKLE_SET: no deeper than the set the called drop gives him, short of
  // the launch point; there he anchors (no kick, no following the rusher's
  // depth) and the rep is the hands and feet against the rusher's path.
  const floor = TACKLE_SET && b.passSet?.outside ? tackleFloor(sim) : null;
  if (floor !== null) setDepth = Math.min(setDepth, sim.los - floor);
  // PASS_KICK: match the rusher's upfield speed as well as close the gap
  // (closing alone trails a moving rusher by his speed x 0.55 s).
  const follow = PASS_KICK && setDepth > (b.passSet?.depth ?? passSetDepth(sim, b)) ? Math.max(0, -known.vel.x) : 0;
  const kick = depth < setDepth ? Math.min(b.profile.vmax * b.profile.backpedal * (0.75 + 0.25 * tb.feet), (setDepth - depth) / 0.55 + follow) : 0;
  // PASS_SINK (experimental, off): under a heavy load he sinks his hips
  // rather than leaning his chest over his feet: a lower centre of mass
  // carries the same push with less forward lean (more balance margin), at
  // the gait's cost of a lower pad level.
  const feltLoad = b.body.support?.felt;
  const heavy = !!feltLoad && Math.hypot(feltLoad.x, feltLoad.y) > 0.3 * b.profile.massKg * G;
  // PASS_ANCHOR: an anchor, not a drive. His lean is sized to the load he
  // feels (no growth past it), so a pull or swim that takes the load away
  // leaves no excess lean to pitch him onto the rusher. Bulled back, the lean
  // still meets the whole load (as far as his legs can), so he is walked back,
  // not knocked over.
  const growth = PASS_ANCHOR ? 0 : undefined;
  // TACKLE_SET: the mirror runs across the rusher's line to the QB; once he
  // is wide and deep that line is mostly lateral and mirroring along it is a
  // retreat. He asks for no more depth than he can brake off before the set
  // (the braking law movement uses, kinematics.ts), and none at it.
  const vx = lat.x * vLat - kick;
  // TACKLE_SET: and no wider than his set line than he can brake off before it.
  let vy = lat.y * vLat;
  if (floor !== null) {
    const line = tackleSetLine(sim, b, d), room = (line.y - b.pos.y) * line.out;
    if (vy * line.out > 0) vy = line.out * Math.min(vy * line.out, Math.sqrt(2 * 0.8 * b.profile.brake * Math.max(0, room)));
  }
  // TACKLE_BRAKE: brake the pair (his braking less the measured press), and anchor before the mirror.
  let brakeA = 0.8 * b.profile.brake;
  if (TACKLE_BRAKE && floor !== null) {
    const press = pressOnBlocker(b, e.hands);
    // The press is load he must stop with him: the mass it amounts to at his braking (at most the rusher's own).
    const carried = Math.min(d.profile.massKg, press / Math.max(1e-6, brakeA));
    brakeA = brakeA * b.profile.massKg / (b.profile.massKg + carried);
    if (press > 0) {
      const T = supportParams(b.profile).traction;
      const room = Math.sqrt(Math.max(0, T * T - press * press)) / b.profile.massKg * sim.dt;
      vy = clamp(vy, b.vel.y - room, b.vel.y + room);
    }
  }
  intents[b.idx] = {
    vel: { x: anchorRep ? Math.max(vx, 0) : floor !== null ? Math.max(vx, -Math.sqrt(2 * brakeA * Math.max(0, b.pos.x - floor))) : vx, y: vy },
    facing: Math.atan2(dK.pos.y - b.pos.y, dK.pos.x - b.pos.x),
    push: 1,
    growth,
    posture: PASS_SINK && heavy ? 0.95 : 0.6,
    cutSkill: 0.85 + 0.3 * tb.feet,
  };
  if (TACKLE_RESET && TACKLE_BRAKE && floor !== null && !riding) baseReset(sim, e, intents[b.idx]);
  // ENGAGE_TRUNK: his hips square to what he protects, from where he is; his shoulders on the man as he has him.
  if (ENGAGE_TRUNK) intents[b.idx] = { ...intents[b.idx], facing: bearing(protectPoint(sim), b.pos), look: bearing(b.pos, dK.pos) };
  if (ANCHOR_BASE) anchorBase(b, tb, heavy, intents[b.idx]);
  e.lastReqX = intents[b.idx].vel.x;
  if (PASS_RIDE) e.riding = riding;
  if (riding) {
    // PAST_ALONG_PATH: the ride. He has been beaten along the man's path but
    // is still within reach: he turns with him, keeps up, and pushes him on
    // past -- away from the QB -- with his hands on the man's side.
    const away = norm(sub(dK.pos, qb));
    if (PASS_RIDE) intents[b.idx] = REP_SEEN ? rideIntent(b, { pos: known.pos, vel: known.vel, profile: d.profile }, qbB, growth, tb.feet)
      : rideIntent(b, d, qb, growth, tb.feet);
    else intents[b.idx] = { vel: { x: dK.vel.x + away.x * RIDE_PUSH, y: dK.vel.y + away.y * RIDE_PUSH },
      facing: Math.atan2(dK.pos.y - b.pos.y, dK.pos.x - b.pos.x), push: 1, growth, posture: 0.6, cutSkill: 0.85 + 0.3 * tb.feet };
    if (ANCHOR_BASE) anchorBase(b, tb, heavy, intents[b.idx]);
    // ENGAGE_TRUNK: the ride's hips on his path (as asked above); his shoulders on the man.
    if (ENGAGE_TRUNK) intents[b.idx] = { ...intents[b.idx], look: bearing(b.pos, dK.pos) };
  }
  helperIntents(sim, e, intents, axis);
}

/** The installed fit survives contact. Body/contact geometry is felt locally;
 * the runner's location is a delayed picture, never the offensive call.
 * This shares the free-fit declaration boundary, not a new strength rule.
 * Ball-holder identity remains the engine's existing public interface; this
 * does not claim a complete model of seeing possession through congestion.
 */
interface RunStackRead {
  owner: Agent;
  fit: string;
  depth: number;
  shoulder: number;
  nextRead: number;
  flow: number;
  contacted: boolean;
  /** The lateral direction of the blocker's first step as he saw it (his first clear flow), 0 until seen. */
  firstStep: number;
  /** ZONE_RUN: he is racing this man for the shoulder. */
  race?: boolean;
  /** ZONE_RUN: he lost the race to this man (reached), or the ball went past him. */
  raceOver?: boolean;
  /** ZONE_RUN: this man reached him (his body across the DL's face to the play side). */
  reached?: boolean;
  /** DL_FIGHT: the lateral point he holds while driven sideways, and until when. */
  hold?: { y: number; until: number };
}
const runStacks = new WeakMap<Engagement, RunStackRead>();
const runTargets = new WeakMap<Engagement, { aim: Vec2; runner: boolean; flow?: number; trail?: boolean }>();
/** The runner's first clear lateral flow an edge saw in this contact. */
const runFlows = new WeakMap<Engagement, number>();
const CUTBACK_RANGE = 3.5; // yd: a cutback this close is his to play

/** The body a lineman keys for the play's direction: the back through the
 * mesh (a QB or back he sees holding it), else whoever he sees holding it. */
function ballKey(sim: PlaySim, d: Agent): Agent | null {
  const held = observedHolder(d, sim), back = sim.slot('RB');
  if (!held) return null;
  return back && (held.target === sim.qb || held.target === back) ? back : held.target;
}

function runContactRead(sim: PlaySim, e: Engagement) {
  const d = e.defender, b = e.blocker, job = d.runFit;
  const back = sim.slot('RB');
  // Support must recognize an acquired receiver carrying the ball too.
  // Use the same delayed, ambiguity-checked pictures as the release check;
  // the live holder identity never selects whom this defender observes.
  const held = observedHolder(d, sim, b);
  const enemy = held?.target ?? null;
  const carrierCue = held?.cue ?? null;
  // Read through the mesh instead of working toward a stationary QB. This
  // uses only the observed depth; a QB draw/scramble can declare at the surface.
  const runnerCue = enemy === sim.qb && carrierCue && carrierCue.pos.x < sim.los - 1.6 && back
    ? sim.see(d, back) : carrierCue;
  const advanced = !!(enemy && carrierCue &&
    (carrierCue.pos.x - sim.los) * sim.attackDir(enemy.team) > 2);
  // A completed pass: a man other than the quarterback he sees holding the
  // ball is the ball, wherever he caught it (a screen is caught behind the
  // line). A blocked defender fights to get to him, as on a run he has read.
  const caught = !!(sim.isPass && enemy && enemy !== sim.qb && carrierCue?.carrying === true);
  const reading = d.recog?.read === 'run' || advanced || caught;
  const declared = !!(reading && runnerCue && (runnerCue.pos.x > sim.los - 1.6 || caught));
  const edge = job?.kind === 'edge' || job?.kind === 'force';
  const fit = job ? `${job.kind}:${job.gap}:${job.side}:${job.edge}:${job.technique}` : 'unassigned';
  let stack: RunStackRead | undefined;
  let blockerY = b.pos.y;
  // Narrow installation: first-level gap/edge fits. Stalked support players,
  // inserts and unassigned pass-converted contacts retain their old policy.
  if (job && (job.kind === 'interior' || job.kind === 'edge')) {
    stack = runStacks.get(e);
    const picture = sim.see(d, b);
    const touch = !!(e.hands?.normalForce || e.hands?.tangentForce);
    const local = touch ? b.pos : picture.pos;
    blockerY = local.y;
    // A contact episode remembers our own depth, not a displacement allowance.
    // Keeper promotion changes the opponent picture, not the point we defend.
    if (!stack || stack.owner !== b || stack.fit !== fit) {
      const sep = b.profile.radius + d.profile.radius;
      stack = { owner: b, fit, depth: stack?.depth ?? d.pos.x,
        shoulder: edge ? job.side * (job.edge === 'spill' ? -.45 : .65)
          : clamp(liveGapY(sim, d, job.gap, job.side) - local.y, -sep * .65, sep * .65),
        nextRead: -Infinity, flow: 0, contacted: stack?.contacted ?? false,
        firstStep: KEY_REACT && d.keyStep?.from === b ? d.keyStep.side : 0 };
      runStacks.set(e, stack);
    }
    // Reaching is not touching. Only the first transmitted hand load installs
    // the useful contact depth; a keeper change cannot move that memory back.
    if (touch && !stack.contacted) {
      stack.depth = d.pos.x;
      stack.contacted = true;
    }
    // Motion is a personally acquired cue held for an ordinary decision beat.
    // Touch supplies local position/load, never the OL's private drive.
    // KEY_REACT: his first step is his key's, read on the key's own sight
    // whenever it shows, not held for the next decision beat.
    if (KEY_REACT && !stack.firstStep && !edge) {
      const key = sim.see(d, b, keyScale(d)).vel.y;
      if (Math.abs(key) > .5) stack.firstStep = Math.sign(key);
    }
    if (sim.t >= stack.nextRead) {
      stack.flow = picture.vel.y;
      if (!stack.firstStep && Math.abs(stack.flow) > .5) stack.firstStep = Math.sign(stack.flow);
      if (!edge && job.technique === 'lag' && reading && Math.abs(stack.flow) > .8)
        stack.shoulder = -Math.sign(stack.flow) * (b.profile.radius + d.profile.radius) * .65;
      stack.nextRead = sim.t + d.mind.decisionInterval;
    }
  }
  let pullFlow: number | undefined;
  if (DL_CHASE && stack && !declared) {
    // An interior man keys the guard beside him; an edge keys a pull going
    // away from his side (his contain is backside, the ball is not).
    const pull = pullers(sim, d).find(p => Math.abs(p.pos.y - d.pos.y) < (edge ? 4.5 : 3)
      && (!edge || Math.sign(p.vel.y) !== job!.side));
    if (pull) {
      stack.shoulder = Math.sign(pull.vel.y) * (b.profile.radius + d.profile.radius) * .65;
      pullFlow = pull.vel.y;
      d.tags.add('fit-follow-pull');
    }
  }
  // Preserve the box/spill shoulder until the runner is beyond the surface,
  // just as the free fit does. The touching blocker's position is haptic.
  const y = stack ? blockerY + stack.shoulder : job ? edge
    ? b.pos.y + job.side * (job.edge === 'spill' ? -.45 : .65)
    : gapY(sim.offAlign, job.gap, job.side) : b.pos.y;
  let desired = { x: d.pos.x, y };
  // An edge keeps his outside leverage while the runner he sees could still
  // get outside him. A runner who first flowed away from his side and now
  // cuts back toward it from inside him has no outside left: play the ball,
  // without waiting for him to clear the line.
  let cutback = false;
  if (edge && declared && runnerCue && !advanced) {
    const side = job!.side, lateral = runnerCue.vel.y * side;
    const first = runFlows.get(e);
    if (first === undefined && Math.abs(runnerCue.vel.y) > 1) runFlows.set(e, Math.sign(runnerCue.vel.y));
    cutback = first !== undefined && first * side < 0 && lateral > 1
      && (d.pos.y - runnerCue.pos.y) * side > 0 && Math.abs(d.pos.y - runnerCue.pos.y) < CUTBACK_RANGE;
    if (cutback) d.tags.add('edge-cutback');
  }
  if (declared && (!edge || advanced || cutback)) desired = { ...runnerCue!.pos };
  else if (!job && runnerCue && reading) desired = { ...runnerCue.pos };
  let flow: number | undefined;
  if (stack && job!.kind === 'interior' && job!.technique !== 'lag' && d.recog?.read === 'run' && back) {
    // The runner has left this first-level fit laterally. Work along the
    // line with inside-out leverage instead of recentering on an obsolete
    // blocker shoulder. Possession comes from acquired backfield pictures;
    // the live holder, offensive call and private blocker work are not keys.
    const qbSeen = sim.see(d, sim.qb), backSeen = sim.see(d, back);
    const horizon = 2 * d.mind.decisionInterval;
    const fresh = (age: number | undefined) => age !== undefined && Number.isFinite(age)
      && age >= 0 && age <= d.profile.reactionTime + horizon;
    const trail = d.profile.radius + back.profile.radius + d.profile.reach * .65;
    const side = Math.sign(backSeen.vel.y);
    if (backSeen.carrying === true && qbSeen.carrying === false
      && fresh(backSeen.age) && fresh(qbSeen.age) && Math.abs(backSeen.vel.y) > 1.5
      && backSeen.pos.x <= sim.los - 1.6
      && (backSeen.pos.y - d.pos.y) * side > trail) {
      // The movement planner advances this held point with `flow` once.
      desired = { x: d.pos.x, y: backSeen.pos.y - side * trail };
      flow = backSeen.vel.y;
    }
  }
  let trail = false;
  if (stack && edge && job!.kind === 'edge' && !advanced && !cutback && d.recog?.read === 'run' && back) {
    // Backside: the back he sees has the ball and is flowing away from this
    // edge behind the line. His contain is behind the play, not outside a
    // blocker the play has left: work down the line behind the ball, keeping
    // the lateral relation to the ball his fit had (the boot/reverse/cutback
    // check), as the free edge fit does. Possession and motion come from his
    // own backfield pictures, as for the interior trail above.
    const qbSeen = sim.see(d, sim.qb), backSeen = sim.see(d, back);
    const fresh = (age: number | undefined) => age !== undefined && Number.isFinite(age)
      && age >= 0 && age <= d.profile.reactionTime + 2 * d.mind.decisionInterval;
    const cushion = Math.abs(liveGapY(sim, d, job!.gap, job!.side) - sim.ballY);
    const point = backSeen.pos.y + job!.side * cushion;
    if (backSeen.carrying === true && qbSeen.carrying === false && fresh(backSeen.age) && fresh(qbSeen.age)
      && job!.side * backSeen.vel.y < -1 && (backSeen.pos.x - sim.los) * sim.attackDir(back.team) <= 0
      && (point - d.pos.y) * job!.side < 0) {
      desired = { x: d.pos.x, y: point };
      flow = backSeen.vel.y;
      trail = true;
      d.tags.add('edge-trail');
    }
  }
  if (flow === undefined && pullFlow !== undefined) flow = pullFlow;
  // EDGE_CONTAIN: an edge's outside shoulder is leverage on the ball, not on
  // the blocker. Widening with a reach only pays while the runner he sees
  // could still get outside him; beyond that he is running himself (and his
  // blocker) out of the play. He reads the back's track: where it crosses
  // his own depth at the pace he sees (a deep, flat stretch threatens far
  // outside; a planted, downhill back does not). His lateral objective is
  // bounded to just outside that point; the blocker-relative shoulder still
  // governs whenever it is the tighter of the two.
  let contain: number | undefined;
  if (EDGE_CONTAIN && stack && edge && job!.edge !== 'spill' && reading && runnerCue && back) {
    const up = sim.attackDir(back.team);
    const arrive = clamp((d.pos.x - runnerCue.pos.x) * up / Math.max(runnerCue.vel.x * up, .5), 0, 1.5);
    const margin = d.profile.radius + back.profile.radius + d.profile.reach * .65;
    contain = runnerCue.pos.y + runnerCue.vel.y * arrive + job!.side * margin;
  }
  const aim = d.mind.aim(stack ? `run-contact:${b.idx}:${fit}` : `run-contact:${b.idx}`, desired, sim.t);
  // The selected target mode belongs to the same held decision as its aim.
  // A newly seen declaration cannot drop flow feedforward midway through it.
  // Support contacts hold the selected target mode too. A safety's acquired
  // runner aim must not keep being treated as an undeclared force landmark.
  if (runTargets.get(e)?.aim !== aim)
    runTargets.set(e, { aim, runner: flow === undefined && declared && (!edge || advanced || cutback), flow, trail });
  // A close observed back can threaten a penetrating lineman deep behind
  // the surface; shedding must not wait for the free-fit declaration depth.
  // A standing deep QB is still a mesh key, not a run target. An observed
  // advanced carrier supplies urgency even after an original pass read.
  const threat = reading && carrierCue &&
    (enemy !== sim.qb || carrierCue.pos.x > sim.los - 1.6) ? carrierCue : null;
  return { aim, reading, threat, declared: runTargets.get(e)!.runner,
    flow: runTargets.get(e)!.flow, stack, contain, trail: !!runTargets.get(e)!.trail, acquiredHolder: !!held };
}

/** RUN_HANDS (experimental, off; needs HAND_MOTOR=1 to act): a blocker who
 * controls the hands pushes a defender further the way he has committed when
 * that way takes him off the blocker's body: running wide of him (drag hand)
 * or ducking inside him (slingshot). A man working across the blocker's face
 * is only braked (passive steer). Felt through the hands: relative motion at
 * the contact, not a picture of the play. */
function runHandDrive(sim: PlaySim, e: Engagement): void {
  const j = e.hands;
  if (!j) return;
  j.drive = 0;
  if (e.control < 0 || j.actor !== e.blocker.body) return;
  const b = e.blocker, d = e.defender;
  // Arms spent sideways are not holding a man out of the backfield: while
  // he feels himself driven back he keeps them on stopping him.
  const felt = b.body.support?.felt, up = sim.attackDir(b.team);
  if (felt && -felt.x * up > 0.25 * b.profile.massKg * G) return;
  const other = j.b === d.body ? d : b, self = other === d ? b : d;
  const dx = other.pos.x - self.pos.x, dy = other.pos.y - self.pos.y, L = Math.hypot(dx, dy) || 1;
  const tx = -dy / L, ty = dx / L;
  const vt = (other.vel.x - self.vel.x) * tx + (other.vel.y - self.vel.y) * ty;
  if (Math.abs(vt) < 0.5) return;
  // Which side of the blocker's chest the defender is on, and whether his
  // relative motion takes him further to that side.
  const right = { x: Math.sin(chestOf(b)), y: -Math.cos(chestOf(b)) };
  const off = (d.pos.x - b.pos.x) * right.x + (d.pos.y - b.pos.y) * right.y;
  const dTan = other === d ? vt : -vt;
  const moving = dTan * (tx * right.x + ty * right.y);
  if (Math.abs(off) < 0.05 || off * moving <= 0) return;
  // Only a man committed across the blocker: one driving straight through
  // him is fought with the feet and chest, not helped past a shoulder.
  // His own motion decides it, not the blocker's step.
  const along = d.vel.x * Math.cos(chestOf(b)) + d.vel.y * Math.sin(chestOf(b));
  if (Math.abs(along) > Math.abs(d.vel.x * right.x + d.vel.y * right.y)) return;
  j.drive = Math.sign(vt) * Math.min(3, Math.abs(vt) + 1);
}

/** Experimental (HAND_FIGHT=1, off): the run hand fight from bodies, not a ratings walk. */
const HAND_FIGHT = process.env.HAND_FIGHT === '1';

/** Upper-body leverage a player brings to the hand fight now: his balance
 * margin (support availability), how square he is to the man, his pad level
 * and his arm strength after fatigue. Ratings enter only through the body. */
function handLeverage(a: Agent, other: Agent): number {
  const sup = a.body.support;
  if (!sup || sup.state !== 'up') return 0;
  const sp = supportParams(a.profile), fat = fatigueFactor(a.body.energy);
  const toO = Math.atan2(other.pos.y - a.pos.y, other.pos.x - a.pos.x);
  const off = Math.abs(Math.atan2(Math.sin(toO - a.facing), Math.cos(toO - a.facing)));
  return availability(sup, sp, fat) * Math.max(0, Math.cos(off)) * (0.75 + 0.5 * sup.posture) * sp.armForce * fat;
}

/** Who lands hands first: arm reach against the closing gap, then a punch
 * whose speed and timing spread come from hand skill. Blockers know the count. */
function firstHands(b: Agent, d: Agent, tb: TrenchTraits, td: TrenchTraits, rng: PlaySim['rng']): number {
  const sep = b.profile.radius + d.profile.radius;
  const dx = d.pos.x - b.pos.x, dy = d.pos.y - b.pos.y, dist = Math.hypot(dx, dy) || 1;
  const closing = Math.max(0.5, ((b.vel.x - d.vel.x) * dx + (b.vel.y - d.vel.y) * dy) / dist);
  const land = (t: TrenchTraits) => (dist - (sep + t.arm / 36 * 0.3)) / closing
    + 0.1 / (0.7 + 0.6 * t.hands) + rng.normal(0, 0.03 * (1.2 - t.hands));
  return clamp((land(td) - (land(tb) - 0.02)) / 0.08, -0.8, 0.8);
}

/** Control relaxes toward the share of upper-body leverage each side has now,
 * at a rate set by the gaining player's hand skill (how fast he re-fits). */
function handFight(e: Engagement, tb: TrenchTraits, td: TrenchTraits, dt: number, rng: PlaySim['rng']): number {
  const lb = handLeverage(e.blocker, e.defender), ld = handLeverage(e.defender, e.blocker);
  const target = lb + ld > 1e-9 ? (lb - ld) / (lb + ld) : 0;
  const tau = 0.25 + 0.5 * (1 - (target > e.control ? tb.hands : td.hands));
  return clamp(e.control + (target - e.control) * (1 - Math.exp(-dt / tau)) + rng.normal(0, 0.25) * dt, -1, 1);
}

function stepRunRep(sim: PlaySim, e: Engagement, intents: Intent[]): void {
  const t = sim.t;
  const dt = sim.dt;
  const rng = sim.dice('rep', e.blocker, e.defender);
  const b = e.blocker;
  const d = e.defender;
  const tb = traits(b, e.type);
  const td = traits(d, e.type);
  // ENGAGE_FELT: the blocker as the defender has him (the true body when off).
  const bK: Felt = ENGAGE_FELT ? feltMan(sim, d, b, e, td.read) : b;
  const axis = axisOf(sim, e); // defender toward the intended contact surface
  const lat = latOf(axis);
  const read = runContactRead(sim, e);
  const supportRunner = SHED_PHYSICAL && !read.stack && read.acquiredHolder
    && read.declared && read.threat?.carrying === true;
  // A declared support player works across the man actually on him, not
  // the original offensive drive line. Loaded hands supply his local body;
  // reaching without load supplies only the defender's acquired picture.
  const localBlocker = supportRunner ? (e.hands?.normalForce || e.hands?.tangentForce)
    ? bK.pos : sim.see(d, b).pos : null;
  const contactAxis = localBlocker ? norm(sub(localBlocker, d.pos)) : axis;
  const contactLat = latOf(contactAxis);
  e.phi = measurePhi(axis, d, b);
  e.win = Math.max(Math.abs(e.phi), 1 - e.baseB);

  // The defender keeps the called fit/shoulder and can answer a declared
  // runner at his next decision. The blocker still seeks his seal surface.
  const toAim = sub(read.aim, d.pos);
  const preferred = toAim.x * lat.x + toAim.y * lat.y;
  if (Math.abs(preferred) > .1) e.side = Math.sign(preferred);
  e.control = HAND_FIGHT ? handFight(e, tb, td, dt, rng)
    : clamp(e.control + dt * (0.5 * (tb.hands - td.hands) + 0.08 * ((tb.arm - td.arm) / 3) + rng.normal(0, 0.25)), -1, 1);
  advanceRunHelperHands(sim, e);

  // Shed attempts once the ball carrier threatens his area — not the QB
  // standing at the mesh before the handoff.
  if (read.threat) {
    const dc = Math.hypot(read.threat.pos.x - d.pos.x, read.threat.pos.y - d.pos.y);
    // A support player who has personally declared the carrying runner must
    // work free toward him even when the block keeps him outside close range.
    // First-level stack/shoulder and uncertain possession retain the old gate.
    // Once that runner is past the line, any blocked defender works off
    // toward him at any range (SHED_PURSUE). It uses the declaration held
    // between ordinary reads, and a support job needs an acquired holder
    // picture; a first-level fit's runner picture is his own line read.
    const firstLevel = d.runFit?.kind === 'interior' || d.runFit?.kind === 'edge';
    const pursue = SHED_PURSUE && read.declared && read.threat.carrying === true
      && (firstLevel || read.acquiredHolder)
      && (read.threat.pos.x - sim.los) * sim.attackDir(b.team) > 0;
    // #169: acquiring hands does not restart already justified support.
    const ready = t >= e.nextMoveAt || (supportRunner && !runSheds.has(e));
    if (ready && (dc < 3.5 || supportRunner || pursue)) {
      // Shedding toward the ball is hard if the blocker has sealed you away from it.
      const toBall = sub(read.threat.pos, d.pos);
      const ballSide = Math.sign(toBall.x * lat.x + toBall.y * lat.y);
      if (SHED_PHYSICAL) {
        // He decides to get off the block toward the ball he sees. Whether he
        // does is physical: the hand fight (who controls the hands), his feet
        // and the blocker's body decide it through the release geometry
        // below, not a roll.
        // Once his blocker is behind the already selected runner approach,
        // continuing across the old surface is no longer the exit objective.
        // Loaded hands supply the local body position; an extended, unloaded
        // reach supplies only this observer's acquired blocker picture.
        let runner = false;
        if (localBlocker) {
          if ((localBlocker.x - d.pos.x) * toAim.x + (localBlocker.y - d.pos.y) * toAim.y < 0)
            runner = true;
        }
        const contactSide = localBlocker
          ? Math.sign(toAim.x * contactLat.x + toAim.y * contactLat.y)
            || runSheds.get(e)?.contactSide || ballSide || e.side : undefined;
        runSheds.set(e, { until: t + d.mind.decisionInterval * 2, side: ballSide || e.side, runner, contactSide });
        e.nextMoveAt = t + d.mind.decisionInterval * 2;
        d.tags.add('shed-attempt');
        // RUN_HAND_MOVE: working off starts with his hands on the blocker's
        // (a rip or swipe at the arms), the same exchange a pass rusher's
        // finesse move makes against the punch. Landed, the blocker's hands
        // are off for the move's window (setHands); missed, the blocker
        // re-fits tighter. Whether he then gets free is still his feet, the
        // blocker's feet and the bodies.
        if (RUN_HAND_MOVE && !(t < e.moveUntil && e.moveOk)) {
          const swipe = td.hands + 0.15 * td.bend + rng.normal(0, 0.18);
          const keep = tb.hands + 0.3 * Math.max(0, e.control) + e.repEdge + rng.normal(0, 0.18);
          if (swipe - keep > 0.18) {
            e.move = 'rip'; e.moveOk = true; e.moveUntil = t + 0.3;
            e.control = Math.min(e.control, -0.4);
            d.tags.add('shed-hands');
          } else {
            e.moveOk = false;
            e.control = Math.min(1, e.control + 0.2);
          }
        }
      } else {
        const sealed = -e.phi * ballSide; // >0: blocker is between you and the ball laterally
        const skill = 0.6 * d.r('blockShedding') + 0.4 * d.r('strength');
        const sustain = 0.5 * b.r('runBlock') + 0.3 * tb.hands + 0.2 * b.r('strength');
        const p = logistic(-2.0 + 3.4 * (skill - sustain) - 1.2 * e.control - 1.3 * sealed + (d.profile.massKg - b.profile.massKg) / 120 - (e.helpers.length ? 1.2 : 0) + (1 - e.baseB) * 1.5);
        if (rng.chance(p)) {
          if (!tryHold(sim, e)) beat(sim, e, axis, lat, true, 'shed');
          return;
        }
        e.control = Math.min(1, e.control + 0.2);
        e.nextMoveAt = t + 0.4 + rng.range(0, 0.3);
      }
    }
  }
  const shed = runSheds.get(e);
  const shedding = !!shed && t < shed.until;
  // A blocker's hands and chest work in front of him: he loses the man when
  // the defender is behind his shoulders relative to where his torso actually
  // faces (World limits how fast he can turn). Running alongside a reached
  // defender is not a lost block. LEVER_FACING=0 restores the fixed frame.
  // He can still bring his chest back to the man within this step, at his
  // own turn rate; only an angle beyond that is a lost block.
  const toD = Math.atan2(d.pos.y - b.pos.y, d.pos.x - b.pos.x);
  const off = Math.abs(Math.atan2(Math.sin(toD - chestOf(b)), Math.cos(toD - chestOf(b))));
  const behind = LEVER_FACING ? Math.max(0, off - b.profile.turnRate * dt) / (Math.PI / 2) : Math.abs(e.phi);
  runContactObservers.get(sim)?.(e, 'geometry', { axis, lat, drive: e.drive, phi: e.phi,
    off, behind, support: b.body.support, facing: b.facing, toD, baseB: e.baseB, baseD: e.baseD });
  if (b.body.support?.state !== 'up' || behind >= 1.1) {
    if (!tryHold(sim, e)) beat(sim, e, axis, lat, true, b.body.support?.state !== 'up' ? 'blocker off his feet' : 'leverage');
    return;
  }
  // SHED_PAST: turning his chest to follow the man keeps the hands on, but a
  // block is the body between the defender and where he is going. Once a
  // defender working off has got past the blocker's shoulder toward the
  // runner he sees, and has the blocker's hands off him, the blocker is no
  // longer in his way; he can only hold him (tryHold, a foul risk) or let
  // him go.
  // Past him is not free of him while his hands are still on: a landed hand
  // move has cleared them, or there is no load in them. Until then he stays
  // engaged, and a passing runner meets only his free arm.
  const handsClear = (t < e.moveUntil && e.moveOk) || !(e.hands?.normalForce || e.hands?.tangentForce);
  if (SHED_PAST && shedding && read.threat && handsClear
    && (!SHED_PAST_GATE || Math.hypot(read.threat.pos.x - d.pos.x, read.threat.pos.y - d.pos.y) > 2)) {
    const u = norm(sub(read.threat.pos, d.pos)), rb = sub(b.pos, d.pos);
    const sep = b.profile.radius + d.profile.radius;
    const ahead = rb.x * u.x + rb.y * u.y, across = Math.abs(rb.x * u.y - rb.y * u.x);
    if (ahead < 0.25 * sep || across > sep) {
      if (!tryHold(sim, e)) beat(sim, e, axis, lat, true, 'past him');
      return;
    }
  }
  setHands(sim, e);
  if (e.hands && (RUN_HANDS || DL_HANDS)) e.hands.drive = 0;
  if (RUN_HANDS) runHandDrive(sim, e);
  // DL_HANDS (experimental, off; needs HAND_MOTOR=1): a defender who controls
  // the hands while getting off toward the ball works himself past the
  // blocker's ball-side shoulder with them (rip, push-pull), not only his feet.
  if (DL_HANDS && shedding && e.hands && e.control < 0 && e.hands.actor === d.body) {
    const j = e.hands, self = j.a === b.body ? b : d, other = self === b ? d : b;
    const L = Math.hypot(other.pos.x - self.pos.x, other.pos.y - self.pos.y) || 1;
    const tx = -(other.pos.y - self.pos.y) / L, ty = (other.pos.x - self.pos.x) / L;
    // Wanted motion of the defender toward the ball side, as motion of b past a.
    const want = (lat.x * tx + lat.y * ty) * shed!.side * (other === d ? 1 : -1);
    j.drive = Math.sign(want) * 2;
  }
  // Feet request displacement along the drive line; contact geometry and the
  // lateral fit use the surface frame. These can differ in a stretch-zone rep.
  // Actual hand normal, ground traction and work remain physical constraints.
  const drive = e.drive ?? { x: -axis.x, y: -axis.y };
  const sep = b.profile.radius + d.profile.radius;
  // RUN_FEEL: the blocker mirrors the defender's motion as he has it, by
  // touch while his hands are on (0.06 s) or by sight (0.12-0.24 s), the
  // pass rep's PASS_FEEL law, not the defender's true current velocity.
  // A landed hand move has his hands off the man for its window (setHands):
  // he follows him by sight, as a pass blocker does after a landed move.
  const handsOff = RUN_HAND_MOVE && t < e.moveUntil && e.moveOk;
  const runSeen = ENGAGE_FELT ? feltMan(sim, b, d, e, tb.read, handsOff) : RUN_FEEL ? sim.see(b, d, ((e.hands?.normalForce || e.hands?.tangentForce) && !handsOff
    ? 0.06 : 0.12 + 0.12 * (1 - tb.read)) / Math.max(0.1, b.profile.reactionTime)) : d;
  const dv = runSeen.vel;
  // ENGAGE_FELT: the defender as the blocker has him, for his offsets, drive and facing.
  const dK: Felt = ENGAGE_FELT ? runSeen : d;
  const dLat = dv.x * lat.x + dv.y * lat.y;
  // Seal target as a lateral offset of the blocker from the defender, where
  // the defender is heading in a beat.
  const lead = 0.15 + 0.15 * tb.read;
  const offset = (b.pos.x - dK.pos.x - dv.x * lead) * lat.x + (b.pos.y - dK.pos.y - dv.y * lead) * lat.y;
  const wantOffset = -Math.sin(e.sealTarget * Math.PI / 2) * sep;
  const mirror = tb.lateral * (0.75 + 0.35 * tb.feet) * (e.helpers.length ? 1.3 : 1);
  const feltCue = felt(e, lat), feedback = feltCue * (0.6 + 0.6 * tb.feet);
  let correction = (wantOffset - offset) * (3 + 3 * tb.feet);
  // SEAL_HOLD: with his hands loaded (his own felt load) he cannot run around
  // the man to a new shoulder; running sideways only carries the man with
  // him, the offset never closes and the request stays pinned at his top
  // lateral speed. He keeps the leverage he caught him with (the closest to
  // the wanted shoulder he has reached while loaded) and drives him on it;
  // ground he gains toward the wanted shoulder is kept. Unloaded closing
  // keeps the ordinary correction.
  const feltLoad0 = b.body.support?.felt;
  if (SEAL_HOLD && feltLoad0 && Math.hypot(feltLoad0.x, feltLoad0.y) > 0.1 * b.profile.massKg * G) {
    const raw = (b.pos.x - dK.pos.x) * lat.x + (b.pos.y - dK.pos.y) * lat.y;
    const prev = sealHolds.get(e);
    const caught = prev === undefined || Math.abs(raw - wantOffset) < Math.abs(prev - wantOffset) ? raw : prev;
    sealHolds.set(e, caught);
    correction = (caught - raw) * (3 + 3 * tb.feet);
  } else sealHolds.delete(e);
  const seal = clamp(dLat + feedback + correction, -mirror, mirror);
  // Anchor against felt lost depth. A stretch keeps its shoulder footwork;
  // drive blocks reduce it. Locomotion and lean share one physical budget.
  // On a stretch play the reach is a race for the playside shoulder, not a
  // vertical drive: forward work only keeps him connected (matches the
  // defender's own forward motion and closes separation), leaving the shared
  // traction budget to the lateral race. Drive blocks keep their downhill drive.
  const run = sim.offCall.run;
  const stretch = STRETCH_REACH && !!e.surfaceAxis && (run?.scheme === 'outsideZone' || run?.scheme === 'wideZone');
  const along = (v: Vec2) => v.x * drive.x + v.y * drive.y;
  const closingDirection = RUN_CONTACT_COMPONENTS ? contactMotion(drive, lat, 1, 0) : drive;
  const gap = connectionGap({ x: dK.pos.x - b.pos.x, y: dK.pos.y - b.pos.y }, sep, closingDirection);
  // ENGAGED_TECHNIQUE: the blocker's controller names his engaged goal; his
  // drive pace is his own (a share of his top speed), not one constant.
  const goal: EngagedGoal | null = ENGAGED_TECHNIQUE && !stretch ? b.behavior.engagedGoal?.(b, sim, e) ?? null : null;
  const pace = goal ? drivePace(b.profile.vmax) : 2.4;
  let forward = stretch ? clamp(along(dK.vel) + gap * 3, -1, 2.4) : pace;
  if (!stretch) {
    // Full drive assumes the man is ahead on the installed drive line.
    // Once level or past, carry the existing connection instead of running
    // away from it. Seal work, anchoring and World still govern the rep.
    const ahead = (dK.pos.x - b.pos.x) * drive.x + (dK.pos.y - b.pos.y) * drive.y;
    const w = clamp(ahead / (0.5 * sep), 0, 1);
    forward = w * pace + (1 - w) * clamp(along(dK.vel) + gap * 3, -1, pace);
  }
  // A stretch never fights the flow: ahead of the man, he does not step back
  // to a fixed seal offset; he at least matches the defender's play-side
  // speed (beat him to the shoulder, or run him past the hole).
  let lateral = seal;
  if (goal?.kind === 'wall') {
    const feet = wallFeet({ lat, drive, rel: { x: b.pos.x - dK.pos.x, y: b.pos.y - dK.pos.y }, dv, sep, seal,
      lateral: tb.lateral, away: goal.away, gap, pace });
    lateral = feet.lateral; forward = feet.forward;
  } else if (goal?.kind === 'runWith') {
    const feet = runWithFeet(lat, goal.flow, dv, seal, tb.lateral, along(dv), gap, pace);
    lateral = feet.lateral; forward = feet.forward;
  }
  const contactTrack = RUN_CONTACT_TRACK && stretch ? b.behavior.contactMotion?.(b) : null;
  const runoffWork = RUN_CONTACT_COMPONENTS && stretch ? b.behavior.contactMotion?.(b, 'runoff') : null;
  if (stretch && run) {
    const toPlay = lat.y * (run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign);
    if (Math.abs(toPlay) > .5) {
      lateral = Math.max(seal * toPlay, dLat * toPlay) * toPlay;
      if (contactTrack) {
        const track = contactTrack.x * lat.x + contactTrack.y * lat.y;
        lateral = Math.max(lateral * toPlay, Math.min(mirror, track * toPlay)) * toPlay;
      }
      if (runoffWork) {
        // The component frame removes the drive's tangent to avoid double
        // counting. Keep the chosen solo-runoff work explicitly, rather than
        // reducing it to defender co-flow after the shoulder offset settles.
        // Project once, retain the existing bound, and let spacing/body/contact
        // execution decide which movement and protection can be achieved.
        const side = Math.sign(toPlay), work = runoffWork.x * lat.x + runoffWork.y * lat.y;
        lateral = Math.max(lateral * side, Math.min(mirror, work * side)) * side;
      }
    }
  }
  // REACH_TECHNIQUE: the reach's own footwork replaces the mirror (and the
  // stretch co-flow floor above): race for the play-side shoulder.
  const reach = REACH_TECHNIQUE ? b.behavior.reachGoal?.(b, sim, e) ?? null : null;
  let racingSide = 0;
  if (reach?.kind === 'reach') {
    // REACH_RACE: his race pace is what his legs give running with the hips
    // opened toward the play (lateral at 45 degrees off his facing); he
    // brakes onto the shoulder with half his free braking (a man on his hands).
    const race = REACH_RACE ? b.profile.vmax * fatigueFactor(b.body.energy)
      * directionalSpeedFactor(b.profile, Math.PI / 2 - REACH_RACE_OPEN) : 0;
    const feet = reachFeet(lat, reach.side, { x: b.pos.x - dK.pos.x, y: b.pos.y - dK.pos.y }, dv, sep, seal, tb.lateral, along(dv), gap, race, .5 * b.profile.brake);
    lateral = feet.lateral;
    if (REACH_RACE && !feet.onShoulder) racingSide = Math.sign(reach.side);
    if (!stretch) forward = feet.forward;
    // Hands his: steer across the man's face toward his play-side shoulder
    // (arm work through HAND_MOTOR, within the arm and grip budgets).
    const j = e.hands;
    // He steers only a man still on his hands with his own feet under him:
    // steering a man who is coming off the block pulls the blocker after him
    // (s9-99: the tackle leaned on 1,500 N of arm force, the end slid out of
    // reach and he pitched forward).
    const off = { x: dK.pos.x - b.pos.x, y: dK.pos.y - b.pos.y }, offL = Math.hypot(off.x, off.y) || 1;
    const leaving = ((dK.vel.x - b.vel.x) * off.x + (dK.vel.y - b.vel.y) * off.y) / offL > .3;
    const su = b.body.support;
    const footed = !su || (su.state === 'up' && Math.hypot(su.xi.x, su.xi.y) < .5 * baseRadiusAt(supportParams(b.profile), su.posture));
    if (j && e.control >= 0 && j.actor === b.body && !feet.onShoulder && !leaving && footed) {
      const other = j.b === d.body ? d : b, self = other === d ? b : d;
      const dx = other.pos.x - self.pos.x, dy = other.pos.y - self.pos.y, L = Math.hypot(dx, dy) || 1;
      const tx = -dy / L, ty = dx / L;
      // Wanted relative motion of the blocker past the man toward the play side.
      const bPastD = (other === d ? -1 : 1) * (tx * 0 + ty * reach.side);
      j.drive = Math.sign(bPastD) * Math.min(2, tb.lateral);
    } else if (j && j.actor === b.body) j.drive = 0;
  }
  let blockVel: Vec2;
  if (RUN_CONTACT_COMPONENTS && stretch) {
    // Follow motion across the contact surface in that same normal frame.
    // Projecting the defender onto a diagonal drive aliases shoulder flow
    // into depth work, then attenuates true normal motion a second time.
    // Keep the existing projected closure and bounds: a tangential drive
    // earns no extra normal request, and no angle division is needed.
    const driveNormal = -(drive.x * axis.x + drive.y * axis.y);
    const defenderNormal = -(dv.x * axis.x + dv.y * axis.y);
    const normal = clamp(defenderNormal + driveNormal * gap * 3,
      Math.min(-driveNormal, 2.4 * driveNormal), Math.max(-driveNormal, 2.4 * driveNormal));
    blockVel = { x: -axis.x * normal + lat.x * lateral, y: -axis.y * normal + lat.y * lateral };
  } else {
    // A wall's forward work only keeps him connected upfield; where he takes
    // the man is the lateral work, not the installed diagonal.
    const fwd = goal?.kind === 'wall' || goal?.kind === 'runWith' ? { x: sim.attackDir(b.team), y: 0 } : drive;
    blockVel = { x: fwd.x * forward + lat.x * lateral, y: fwd.y * forward + lat.y * lateral };
  }
  const preAnchor = blockVel;
  let anchored = false;
  // Anchor against the normal threat only (lost depth), and keep the
  // lateral work otherwise (a
  // defender's flow is not a reason to stop working sideways). ANCHOR_SPLIT=0
  // restores bracing along the whole felt load with the seal cut to 30%.
  const feltLoad = b.body.support?.felt;
  if (ANCHOR && feltLoad) {
    const load = Math.hypot(feltLoad.x, feltLoad.y);
    if (ANCHOR_SPLIT) {
      // The normal threat is lost depth: load and motion toward his own
      // backfield. Then he braces upfield. A stretch retains its shoulder
      // work; a vertical drive reduces it. Both spend the same World budget.
      // Flowing across him without lost depth is lateral co-flow.
      const up = sim.attackDir(b.team);
      const backLoad = -feltLoad.x * up, drivenBack = -b.vel.x * up;
      const shoulderWork = lateral * (stretch ? 1 : 0.3);
      const brace = { x: up * 2.4 + lat.x * shoulderWork, y: lat.y * shoulderWork };
      if (ANCHOR_GRADE) {
        // He braces as hard as he is being driven: the share of his request
        // given to the brace grows with the load toward his backfield and
        // with how fast it is moving him, instead of switching at a line.
        // What he feels of being driven settles over a reaction time; he
        // does not re-brace on each instant's push.
        const prev = anchorFeel.get(b), k = prev ? 1 - Math.exp(-Math.max(0, sim.t - prev.t) / ANCHOR_FEEL) : 1;
        const feel = prev ? { load: prev.load + (backLoad - prev.load) * k, back: prev.back + (drivenBack - prev.back) * k, t: sim.t }
          : { load: backLoad, back: drivenBack, t: sim.t };
        anchorFeel.set(b, feel);
        const w = clamp((feel.load / (b.profile.massKg * G) - .15) / .2, 0, 1) * clamp((feel.back - .05) / .2, 0, 1);
        if (w > 0) {
          anchored = w >= .5;
          blockVel = { x: blockVel.x + (brace.x - blockVel.x) * w, y: blockVel.y + (brace.y - blockVel.y) * w };
        }
      } else if (backLoad > 0.25 * b.profile.massKg * G && drivenBack > 0.15) {
        anchored = true;
        blockVel = brace;
      }
    } else {
      const driven = load > 1e-6 ? (b.vel.x * feltLoad.x + b.vel.y * feltLoad.y) / load : 0;
      if (load > 0.25 * b.profile.massKg * G && driven > 0.15) {
        anchored = true;
        const ux = -feltLoad.x / load, uy = -feltLoad.y / load;
        blockVel = { x: ux * 2.4 + lat.x * seal * 0.3, y: uy * 2.4 + lat.y * seal * 0.3 };
      }
    }
  }
  // The installed helper may prepare feet for its acquired next job while
  // these same real hands keep working. Existing forced anchoring wins.
  const preparation=!anchored?b.behavior.contactMotion?.(b,'prepare'):null;
  if (preparation) {
    // Preparing feet cannot surrender the current normal blocking work.
    const change=(preparation.x-blockVel.x)*lat.x+(preparation.y-blockVel.y)*lat.y;
    blockVel={x:blockVel.x+lat.x*change,y:blockVel.y+lat.y*change};
  }
  // DOUBLE_TRACK: a double on a stretch call keeps stepping the track.
  const trackSide = DOUBLE_TRACK && !anchored && e.helpers.length ? stretchTrackSide(sim) : 0;
  if (trackSide) blockVel = { x: blockVel.x, y: trackSide * Math.max(blockVel.y * trackSide, TRACK_TEMPO * b.profile.vmax) };
  if (FEET_SETTLE) {
    // His feet follow what his controller wants over a step, not each tick:
    // per-tick jitter in the man's felt and seen motion does not reach them.
    const prev = feetSettle.get(b);
    if (prev && prev.e === e && sim.t - prev.t < .2) {
      const k = 1 - Math.exp(-Math.max(0, sim.t - prev.t) / FEET_SETTLE_TAU);
      blockVel = { x: prev.vel.x + (blockVel.x - prev.vel.x) * k, y: prev.vel.y + (blockVel.y - prev.vel.y) * k };
    }
    feetSettle.set(b, { e, vel: { ...blockVel }, t: sim.t });
  }
  intents[b.idx] = {
    vel: blockVel,
    facing: racingSide ? openToward(Math.atan2(dK.pos.y - b.pos.y, dK.pos.x - b.pos.x), racingSide, REACH_RACE_OPEN)
      : Math.atan2(dK.pos.y - b.pos.y, dK.pos.x - b.pos.x),
    push: 1,
    posture: 0.85,
    cutSkill: 0.8 + 0.3 * tb.feet,
  };
  // ENGAGE_TRUNK: his hips on his track (opened toward the play in the race), his shoulders on the man. The track is
  // where his feet are asked to go (a zone step runs along the line, not up the drive axis), the drive axis when he is
  // nearly still. (Attempt 1 as first built put the hips on the drive axis: an outside-zone blocker shuffled sideways at
  // his shuffle speed and the run set lost 0.58 yd on OZ.)
  if (ENGAGE_TRUNK) {
    const v = intents[b.idx].vel, track = Math.hypot(v.x, v.y) > 1 ? Math.atan2(v.y, v.x) : Math.atan2(drive.y, drive.x);
    intents[b.idx].facing = racingSide ? openToward(track, racingSide, REACH_RACE_OPEN) : track;
    intents[b.idx].look = bearing(b.pos, dK.pos);
  }
  runContactObservers.get(sim)?.(e, 'movement', { axis, lat, drive, stretch, forward,
    // `forward` is retained for older diagnostic readers. Component-mode
    // normal work is the emitted command, not that legacy drive projection.
    legacyDriveRequest: forward, normalRequest: -(blockVel.x * axis.x + blockVel.y * axis.y),
    dLat, feltCue, feedback, correction, mirror, offset, wantOffset, seal,
    sealWithoutFeel: clamp(dLat + correction, -mirror, mirror), contactTrack, runoffWork, lateral, preAnchor,
    anchored, command: intents[b.idx], blockerPos: b.pos, defenderPos: d.pos,
    blockerVel: b.vel, defenderVel: d.vel, facing: b.facing, support: b.body.support,
    defensiveAim: read.aim, reading: read.reading, declared: read.declared,
    heldFlow: read.stack?.flow, heldTargetFlow: read.flow, fit: d.runFit });
  // Follow acquired flow while preserving the chosen shoulder. Control/lag
  // replace feet toward their remembered contact depth; attack retains useful
  // forward intent. These are finite requests, not stronger ground support.
  // A declared runner can redirect the fit on the existing decision cadence.
  const work = td.lateral * (0.2 + 0.25 * d.r('blockShedding')) * (read.reading ? 1 : 0.3);
  const legacy = { x: -drive.x * 1.5 + lat.x * e.side * work, y: -drive.y * 1.5 + lat.y * e.side * work };
  // DL_FLATTEN: against a reach or zone step (the blocker's held flow across
  // his face) an attacking lineman flattens on the line instead of driving on.
  // He sees the man on him step across rather than come at him.
  const blockerSeen = DL_FLATTEN && d.runFit?.technique === 'attack' ? sim.see(d, b) : null;
  // A lineman who has already beaten the reach (beside or past the man on
  // him toward the backfield) keeps attacking: penetrate and make the play.
  const beaten = !!blockerSeen && (d.pos.x - blockerSeen.pos.x) * sim.attackDir(b.team) < d.profile.radius;
  // TOUCH_READ (experimental, off): with his hands on the man he feels how
  // the man moves, as he already has his position by touch (the stack read);
  // a reach that turns into a vertical drive is a drive to press, not a
  // picture of a step across that is a reaction time old.
  const touching = TOUCH_READ && !!(e.hands?.normalForce || e.hands?.tangentForce);
  const across = blockerSeen ? Math.abs((touching ? bK.vel : blockerSeen.vel).y) : 0;
  const atHim = blockerSeen ? Math.abs((touching ? bK.vel : blockerSeen.vel).x) : 0;
  const zoneStep = !!blockerSeen && !(DL_FLATTEN_WON && beaten) && across > 1 && across > atHim;
  // DL_SQUEEZE: a blocker whose first step went against the play is a down
  // block or a wash; one whose first step went with it, a reach. The play's
  // direction is the lateral track of the back he has seen take the ball.
  // Before he sees a carrier running a track there is no squeeze: reading the
  // back's early mesh path, or where he stood, took zone reaches for down
  // blocks (docs/reviews/squeeze-read.md).
  let squeeze = 0;
  // The squeeze is a decision: made at a read, held for its beat.
  const lastSqueeze = squeezes.get(e);
  if (lastSqueeze && sim.t < lastSqueeze.until) squeeze = lastSqueeze.side;
  else if (DL_SQUEEZE && read.stack && !read.declared && read.stack.firstStep) {
    // He reads the back, as the fit does; a pitch or another carrier is the ball.
    const ball = ballKey(sim, d);
    const cue = ball ? sim.see(d, ball) : null;
    // His track: the lateral run of the carrier he sees (a zone back's read).
    // A downhill gap back shows none until he bends; see squeeze-read.md.
    const track = cue?.carrying === true && Math.abs(cue.vel.y) > 1 ? Math.sign(cue.vel.y) : 0;
    // The line tells him first (a pull, a zone step); the back's track when it shows nothing.
    const play = lineRead(sim, d) || track;
    if (play && read.stack.firstStep * play < 0) { squeeze = play; d.tags.add('squeeze'); }
  }
  if (DL_SQUEEZE && !(lastSqueeze && sim.t < lastSqueeze.until)) squeezes.set(e, { side: squeeze, until: sim.t + d.mind.decisionInterval });
  // Squeezing a down block is on the line: he flattens at his contact depth
  // and works across, pressing the blocker into the hole, not upfield past him.
  // Where he lined up against the man tells a cutoff from a reach: shaded to
  // the man's backside at the snap, a man stepping away is cutting him off;
  // lined up on or outside his play-side shoulder, a man who gets across him
  // has reached him (ZONE_RUN, below).
  const dHome = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.pos, bHome = sim.offAlign.spots[b.slot as keyof typeof sim.offAlign.spots]?.pos;
  const shadeSide = dHome && bHome ? Math.sign(dHome.y - bHome.y) : 0;
  // ZONE_RUN: reached, he flattens: pressing upfield past a man who has his
  // play-side shoulder runs him out of the play and opens the cutback, so he
  // holds his depth and works down the line.
  const reachedFlat = ZONE_RUN && !!read.stack?.reached;
  const recover = reachedFlat || d.runFit?.technique !== 'attack' || zoneStep || squeeze !== 0;
  // FLAT_PRESS (experimental, off): flattening on a reach is lateral work down
  // the line, square and still pressing into the man, not a stop: with a zone
  // step read, his depth request is the more upfield of holding his contact
  // depth and his own step into the man (the read-step pace, 0.5 yd/s).
  const up = -sim.attackDir(b.team);
  const holdDepth = read.stack ? clamp((read.stack.depth - d.pos.x) * 3, -1.5, 1.5) : 0;
  const depth = read.declared ? clamp((read.aim.x - d.pos.x) * 3, -1.5, 1.5)
    : read.stack && recover ? (FLAT_PRESS && zoneStep && !reachedFlat && squeeze === 0 && holdDepth * up < FLAT_PRESS_STEP ? up * FLAT_PRESS_STEP : holdDepth)
      : up * 1.5;
  // Keep the shoulder where it will need to be: the held flow cue carries it
  // forward over a short horizon, and he follows that point with the flow
  // plus a proportional correction. A request his body can follow without
  // reversing: planning to cover the gap within the horizon under his
  // sprint lag over-commanded, and his much faster braking then reversed
  // it at every small change of aim (docs/reviews/2026-10-27-engaged-stall.md).
  const held = read.declared ? 0 : read.flow ?? read.stack?.flow ?? 0, horizon = 2 * d.mind.decisionInterval;
  let target = read.aim.y + held * horizon;
  // Never widen past what containing the runner needs (EDGE_CONTAIN, read
  // above). Already wider than that, he stops and holds his ground; this
  // bounds his widening only and never pulls him inside his shoulder.
  const side = d.runFit?.side ?? 0;
  // A trailing backside edge (above) has no outside to keep: the ball has
  // gone away from him, so containment does not hold him where he is.
  // Bounded there, the flow he read no longer carries him outward either.
  let carry = held;
  if (read.contain !== undefined && !read.trail && (target - read.contain) * side > 0) {
    target = (d.pos.y - read.contain) * side > 0 ? d.pos.y : read.contain;
    if (carry * side > 0) carry = 0;
  }
  const flow = clamp(carry + (target - d.pos.y) * 3, -td.lateral, td.lateral);
  let zoneRun = 0;
  // DL_FIGHT (experimental, off): fight pressure with pressure. A defender
  // who feels himself driven sideways holds the point where the push began
  // and leans into it, instead of following the blocker's flow off his gap.
  // The lateral twin of the blocker's lost-depth anchor; the decision is held
  // for a decision beat, then renewed while the push lasts.
  let lateralFlow = squeeze ? squeeze * td.lateral : flow;
  // A blocker whose first step went with the play the line shows is reaching
  // him or cutting him off. The answer is a technique, not a pursuit of the
  // speed seen so far: an interior man works across his face with the play at
  // full lateral effort while the blocker keeps stepping that way. His body and
  // the blocker's hands decide how far he gets.
  const st = read.stack;
  if (!squeeze && st && !read.declared && d.runFit?.kind === 'interior' && st.firstStep
    && Math.sign(st.flow) === st.firstStep && st.firstStep === lineRead(sim, d)) {
    lateralFlow = st.firstStep * td.lateral;
    d.tags.add('work-across');
  }
  // ZONE_RUN (experimental, off): the race for the play-side shoulder. Keyed
  // on the man in front alone, not on the rest of the line: when his own
  // first step goes to one side (a reach or bucket step) and he keeps going
  // that way, an interior man opens his hips and races him for that
  // shoulder. Not yet outside it, he runs at his open-hip speed; outside it,
  // he keeps the man's pace plus a step. The bodies and hands decide who
  // gets there. NFL DL flow 2.3 yd/s by 0.9 s and 2.9 by 1.2 s on outside
  // zone; a square shuffle capped ours at 2.6 and the old line-flow gate
  // kept the race from starting.
  // He races a man running for the shoulder (a reach), and keeps racing while
  // the man keeps running; a man driving at him (inside zone) he plays square,
  // holding his gap: NFL inside-zone DL go about two-thirds as far sideways as
  // their blockers by 1.5 s.
  // The race ends, for this man, when he sees he has lost it: the blocker's
  // body across his face to the play side (reached; he feels it in contact),
  // or the ball already past him downfield. Then he stops pressing and plays
  // the ordinary engaged read. NFL outside-zone DL stop gaining depth by
  // about 1.5 s; a race with no end pressed on, and kept the blocker running.
  const reachSpeed = st ? Math.abs(bK.vel.y) : 0;
  if (ZONE_RUN && st?.race && !st.raceOver) {
    const s1 = st.firstStep, across = shadeSide !== -s1 && (bK.pos.y - d.pos.y) * s1 > (b.profile.radius + d.profile.radius) * .5;
    const ball = ballKey(sim, d), cue = ball ? sim.see(d, ball) : null;
    const past = !!cue && (cue.pos.x - d.pos.x) * sim.attackDir(b.team) > 0;
    if (across || past) { st.raceOver = true; st.reached = across; d.tags.add(across ? 'reached' : 'ball-past'); }
  }
  if (st) st.race = ZONE_RUN && !st.raceOver && !!st.firstStep && reachSpeed >= (st.race ? ZONE_RUN_REACH / 2 : ZONE_RUN_REACH);
  if (ZONE_RUN && !squeeze && st?.race && !read.declared && d.runFit?.kind === 'interior' && st.firstStep
    && st.flow * st.firstStep >= 0) {
    const s1 = st.firstStep, shoulder = bK.pos.y + s1 * (b.profile.radius + d.profile.radius) * .5;
    const behind = (shoulder - d.pos.y) * s1 > 0;
    const open = d.profile.vmax * ZONE_RUN_PACE;
    const pace = behind ? open : Math.min(open, Math.max(td.lateral, Math.abs(bK.vel.y) + ZONE_RUN_STEP));
    lateralFlow = s1 * pace;
    zoneRun = s1;
    d.tags.add('zone-run');
  }
  if (DL_FIGHT && read.stack && !read.declared) {
    const st = read.stack, push = d.body.support?.felt?.y ?? 0;
    // A push toward where he sees the ball heading (a reach running him
    // wide) costs him nothing; one driving him away from it (a down block,
    // a seal) washes him out of the play. He reads the back he can see.
    const ball = ballKey(sim, d);
    const cue = ball ? sim.see(d, ball) : null;
    const toBall = cue ? cue.pos.y + cue.vel.y * d.mind.decisionInterval - d.pos.y : 0;
    const away = Math.abs(toBall) > .5 && push * toBall < 0;
    if (away && Math.abs(push) > 0.25 * d.profile.massKg * G && push * d.vel.y > 0 && Math.abs(d.vel.y) > 0.15) {
      st.hold = { y: st.hold && t < st.hold.until ? st.hold.y : d.pos.y, until: t + d.mind.decisionInterval };
    }
    // Only when his ordinary request would go with the push: working across
    // a reach to keep leverage already fights it.
    if (st.hold && t < st.hold.until) {
      if (flow * push > 0) {
        lateralFlow = clamp(requestToCover(gaitLag(d.profile), st.hold.y - d.pos.y, horizon, d.vel.y), -td.lateral, td.lateral);
        d.tags.add('fight-pressure');
      }
    } else delete st.hold;
  }
  // Working off: across the blocker's ball-side shoulder at full lateral
  // effort, pressing into him rather than backing out.
  // The contact technique does not own a second, older runner waypoint.
  // Follow the existing read's held objective as it legitimately refreshes;
  // lost/contradictory acquisition retains the ordinary across-face response.
  const exitAim = shedding && shed!.runner && supportRunner ? read.aim : undefined;
  const exit = exitAim ? norm(sub(exitAim, d.pos)) : null;
  const acrossFace = supportRunner && shed?.contactSide !== undefined;
  // SHED_ROUTE (experimental, off): a first-level man working off goes around
  // the shoulder of the man actually on him (by touch with loaded hands, else
  // his picture), to the side the ball is on now, not across the blocker's
  // original drive line, which once the blocker has moved can point into his chest.
  const routeBody = SHED_ROUTE && shedding && !acrossFace && read.threat
    ? (e.hands?.normalForce || e.hands?.tangentForce) ? bK.pos : sim.see(d, b).pos : null;
  const routeAxis = routeBody ? norm(sub(routeBody, d.pos)) : null, routeLat = routeAxis ? latOf(routeAxis) : null;
  const routeSide = routeLat && read.threat ? Math.sign((read.threat.pos.x - d.pos.x) * routeLat.x + (read.threat.pos.y - d.pos.y) * routeLat.y) : 0;
  const workAxis = acrossFace ? contactAxis : routeAxis ?? axis, workLat = acrossFace ? contactLat : routeLat ?? lat;
  const workSide = acrossFace ? shed!.contactSide! : (routeSide || (shed?.side ?? e.side));
  const workOff = shedding ? exit
    ? { x: exit.x * Math.hypot(td.lateral, .6), y: exit.y * Math.hypot(td.lateral, .6) }
    : { x: workLat.x * workSide * td.lateral + workAxis.x * .6,
      y: workLat.y * workSide * td.lateral + workAxis.y * .6 } : null;
  // Diagnostic counterfactual defenses (docs/reviews/counterfactual-defense.md).
  let cf: Vec2 | null = null;
  if (CF_FLOW && !read.declared) {
    const home = sim.defAlign.spots[d.slot as keyof typeof sim.defAlign.spots]?.pos.y ?? d.pos.y;
    const f = lineFlow(linePicture(sim, d)), dir = Math.abs(f) > .5 ? Math.sign(f) : 0;
    const y = CF_FLOW === 'over' && dir ? dir * td.lateral
      : clamp(requestToCover(gaitLag(d.profile), home - d.pos.y, horizon, d.vel.y), -td.lateral, td.lateral);
    cf = { x: depth, y };
  }
  if (ENGAGED_DEFENDER && !read.stack && !cf) {
    // His own request stands; only his facing stays on the man he is fighting.
    intents[d.idx] = { ...intents[d.idx], push: 1 };
    runContactObservers.get(sim)?.(e, 'defender-movement', { reading: read.reading,
      declared: read.declared, supportRunner, defensiveAim: read.aim, exitAim, workOff: null, workAxis, workSide,
      command: intents[d.idx], contain: read.contain, trail: read.trail, squeeze, own: true });
    helperIntents(sim, e, intents, axis);
    return;
  }
  intents[d.idx] = {
    vel: workOff ?? cf ?? (read.stack ? { x: zoneRun ? -sim.attackDir(b.team) * (RACE_LEAN ? FLAT_PRESS_STEP : 1.5) : depth, y: lateralFlow } : legacy),
    // Running the line he opens his hips halfway toward it, off square.
    facing: zoneRun && !workOff && !cf ? (() => {
      // ENGAGE_TRUNK: square is to the line of scrimmage (his hips), not to the blocker.
      const sq = ENGAGE_TRUNK ? (sim.attackDir(b.team) > 0 ? Math.PI : 0) : Math.atan2(bK.pos.y - d.pos.y, bK.pos.x - d.pos.x), run = Math.atan2(zoneRun, 0);
      const turn = ((run - sq + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
      return sq + Math.sign(turn) * Math.min(Math.abs(turn), ZONE_RUN_OPEN);
    })() : ENGAGE_TRUNK && read.stack && !workOff && !cf ? (sim.attackDir(b.team) > 0 ? Math.PI : 0) : Math.atan2(bK.pos.y - d.pos.y, bK.pos.x - d.pos.x),
    // ENGAGE_TRUNK: his shoulders on the blocker as he has him.
    ...(ENGAGE_TRUNK ? { look: bearing(d.pos, bK.pos) } : {}),
    push: 1,
    posture: DL_ANCHOR && (e.helpers.length > 0 || drivenBack(d)) ? 1 : 0.85,
    cutSkill: 0.8 + 0.4 * td.bend,
  };
  runContactObservers.get(sim)?.(e, 'defender-movement', { reading: read.reading,
    declared: read.declared, supportRunner, defensiveAim: read.aim,
    exitAim, workOff, workAxis, workSide, command: intents[d.idx], contain: read.contain, trail: read.trail, squeeze });
  helperIntents(sim, e, intents, axis);
}

interface HelperFitRead {
  rep: Engagement;
  owner: Agent;
  side: number;
  nextRead: number;
  recovery: boolean;
  goal: Vec2;
  defender: Vec2;
}
const helperFits = new WeakMap<Agent, HelperFitRead>();

/** A joined helper cannot drive through the defender to replace his feet.
 * Retain one personally observed foot landmark for the ordinary decision
 * beat. The acquired surface is known work; the two bodies are delayed visual
 * pictures. This requests movement only, leaving actual hands/support intact.
 */
function helperFit(sim: PlaySim, e: Engagement, h: Agent, axis: Vec2): Intent | null {
  const hands = e.helperHands?.get(h);
  // Sustained hand load is immediate proprioception. Do not retreat from a
  // useful working block because an older visual picture extrapolates
  // elsewhere. Feeling load on the far side is not a usable run surface;
  // keep replacing feet using the retained visual landmark in that case.
  if (hands?.normalForce || hands?.tangentForce) {
    const contact = norm(sub(h.pos, e.defender.pos));
    if (contact.x*axis.x + contact.y*axis.y > 0) return null;
  }
  let read = helperFits.get(h);
  if (!read || read.rep !== e || read.owner !== e.blocker || sim.t >= read.nextRead) {
    const owner = sim.see(h, e.blocker), visual = sim.see(h, e.defender);
    const touch = helperTouches.get(h);
    const defender = touch?.rep === e && touch.at === sim.t
      ? { ...visual, pos: touch.pos } : visual;
    const lat = latOf(axis);
    const side = read?.rep === e && read.owner === e.blocker ? read.side
      : Math.sign((h.pos.x-owner.pos.x)*lat.x+(h.pos.y-owner.pos.y)*lat.y) || e.side;
    const width = (h.profile.radius+e.blocker.profile.radius)*.95;
    const hip = { x: owner.pos.x+lat.x*width*side, y: owner.pos.y+lat.y*width*side };
    const offset = sub(hip, defender.pos), relative = sub(h.pos, defender.pos);
    const depth = offset.x*axis.x+offset.y*axis.y;
    const recovery = depth <= 0 || relative.x*axis.x+relative.y*axis.y <= 0;
    let goal = hip;
    if (recovery) {
      const contact = h.profile.radius+e.defender.profile.radius;
      // Keep a neighboring lane while replacing feet on the useful surface.
      // No actual body, contact axis or hand extension is projected here.
      const replace = Math.max(0, .5*contact-depth);
      let fit = { x: offset.x+axis.x*replace, y: offset.y+axis.y*replace };
      const length = Math.hypot(fit.x,fit.y), clearance = contact+.15;
      if (length < clearance) fit = { x: fit.x*clearance/length, y: fit.y*clearance/length };
      const dx = fit.x-relative.x, dy = fit.y-relative.y;
      const along = clamp(-(relative.x*dx+relative.y*dy)/Math.max(1e-12,dx*dx+dy*dy),0,1);
      if (Math.hypot(relative.x+along*dx,relative.y+along*dy) < contact) {
        const distance = Math.hypot(relative.x,relative.y);
        if (distance > 1e-9) {
          const cross = relative.x*fit.y-relative.y*fit.x;
          // Antipodal feet still have a known joining side to work around.
          const angle = (Math.sign(cross)||-side)*Math.min(.35,Math.acos(clamp(
            (relative.x*fit.x+relative.y*fit.y)/(distance*Math.hypot(fit.x,fit.y)),-1,1)));
          const radius = Math.max(clearance,(distance+clearance)/2);
          fit = { x:(relative.x*Math.cos(angle)-relative.y*Math.sin(angle))*radius/distance,
            y:(relative.x*Math.sin(angle)+relative.y*Math.cos(angle))*radius/distance };
        }
      }
      goal = { x:defender.pos.x+fit.x, y:defender.pos.y+fit.y+h.mind.placementError };
    }
    read = { rep:e, owner:e.blocker, side, nextRead:sim.t+h.mind.decisionInterval, recovery,
      goal, defender:{...defender.pos} };
    helperFits.set(h,read);
  }
  if (!read.recovery) return null;
  // A foot landmark is held for this beat. Chasing its stale extrapolated
  // velocity would add a second prediction on top of the visual picture.
  return { vel:movingArrivalVelocity(h.body,read.goal,{x:0,y:0},h.profile.vmax,.1,0,1,baseOf(h)),
    facing:Math.atan2(read.defender.y-h.pos.y,read.defender.x-h.pos.x), push:1, posture:.75 };
}

/** Useful helpers drive normally; an unusable run surface first needs feet. */
function helperIntents(sim: PlaySim, e: Engagement, intents: Intent[], axis: Vec2): void {
  const b = e.blocker, d = e.defender;
  const lat = latOf(axis);
  const sep = b.profile.radius + d.profile.radius;
  for (const h of e.helpers) {
    const recovery = e.type === 'run' ? helperFit(sim,e,h,axis) : null;
    if (recovery) { intents[h.idx] = recovery; continue; }
    // ENGAGE_FELT: the man as this helper has him.
    const dH: Felt = ENGAGE_FELT ? feltMan(sim, h, d, e, traits(h, e.type).read) : d;
    const hs = Math.sign((h.pos.x - b.pos.x) * lat.x + (h.pos.y - b.pos.y) * lat.y) || e.side;
    let spot = { x: b.pos.x + lat.x * sep * 0.95 * hs, y: b.pos.y + lat.y * sep * 0.95 * hs };
    // DOUBLE_TRACK: the backside member of a stepping stretch double works to
    // replace the hip: his feet go to the man's middle (just backside of it),
    // not a spot on his partner's hip, so the man can be handed over and the
    // play-side member can climb (DOUBLE_FLOW's takeover needs the keeper
    // level with the man). His partner's body and the man's resist him there.
    const overtakeSide = DOUBLE_TRACK && e.type === 'run' ? stretchTrackSide(sim) : 0;
    if (overtakeSide && (h.pos.y - b.pos.y) * overtakeSide < 0) {
      const hsep = h.profile.radius + d.profile.radius;
      spot = { x: dH.pos.x + axis.x * hsep - lat.x * .25 * Math.sign(lat.y * overtakeSide), y: dH.pos.y + axis.y * hsep - lat.y * .25 * Math.sign(lat.y * overtakeSide) };
    }
    const toSpot = sub(spot, h.pos);
    const preparation=e.type==='run'?h.behavior.contactMotion?.(h,'prepare'):null;
    const direction = e.drive ?? { x: -axis.x, y: -axis.y };
    const drive = e.type === 'run' ? { x: direction.x * 2.2, y: direction.y * 2.2 } : { x: -axis.x * 0.5, y: -axis.y * 0.5 };
    const feet={x:drive.x+toSpot.x*3,y:drive.y+toSpot.y*3};
    if (preparation) {
      const change=(preparation.x-feet.x)*lat.x+(preparation.y-feet.y)*lat.y;
      feet.x+=lat.x*change;feet.y+=lat.y*change;
    }
    // DOUBLE_TRACK: the partner keeps stepping the track with his hands on.
    const trackSide = DOUBLE_TRACK && e.type === 'run' ? stretchTrackSide(sim) : 0;
    if (trackSide) feet.y = trackSide * Math.max(feet.y * trackSide, TRACK_TEMPO * h.profile.vmax);
    intents[h.idx] = {
      vel: feet,
      facing: Math.atan2(dH.pos.y - h.pos.y, dH.pos.x - h.pos.x),
      push: 1,
      posture: 0.75,
    };
  }
}

// Retired visibility decisions are consumed for execution-stream compatibility
// but never become official calls. Actual World restraint is adjudicated by
// contact-holding.ts after the interval and simultaneous no-call facts exist.
const legacyHoldVisible = new WeakSet<PlaySim>();

/** A beaten blocker may attempt a cloth grab. This changes the bounded hand
 * technique, not the official ruling. Only achieved illegal restraint is a foul. */
function tryHold(sim: PlaySim, e: Engagement): boolean {
  // BLOCK_FRAME: a chosen hold persists while the blocker still has him: his hands joint on the man (not slipped off)
  // and the man within his arm's reach. The joint's tension is capped at the arm's hold force, so a man stronger than
  // the hold opens the gap and gets free in the World; officiating (contact-holding) judges the restraint achieved.
  // Before, a chosen hold lived one tick: on the next beat this returned false and the caller ended the block, so no
  // restraint accumulated (audit of engagement.ts, 2026-11-24).
  if (e.holding) return BLOCK_FRAME && !!e.hands && !e.hands.off && inBlockReach(e.blocker, e.defender, e.type);
  const b = e.blocker;
  // Only possible with hands on him.
  if (e.control < -0.4) return false;
  const pHold = holdChance(b, e.type);
  if (!sim.dice('hold', b).chance(pHold)) return false;
  e.holding = true;
  b.tags.add('held');
  setHands(sim, e);
  const id = `legacy-hold:${b.idx}:${e.defender.idx}:${sim.t}`;
  const evidence = { source: 'legacy' as const, rule: '12-1-3(c)',
    action: 'selected_holding_mode', victimId: e.defender.player.id,
    facts: { selectedTechnique: true, achievedRestrictionQualified: false, control: e.control } };
  sim.foulRecords.push({ id, t: sim.t, kind: 'holding', playerId: b.player.id,
    called: false, assessment: 'unresolved', evidence });
  sim.event('holding_attempt', b, e.defender, 'legacy technique choice; achieved legal elements unqualified');
  // Preserve the historical draw until the first formerly visible attempt;
  // do not pretend that this sampled bit proves achieved NFL illegality.
  const visible = 0.35 + 0.35 * Math.min(1, Math.abs(e.phi) + (1 - e.baseB));
  const legacyCall = [sim.penalty, ...sim.penalties].some(p => p?.kind === 'holding'
    && !p.id?.startsWith('native-holding:'));
  if (!legacyCall && !legacyHoldVisible.has(sim) && sim.dice('hold', b).chance(visible)) legacyHoldVisible.add(sim);
  return true;
}

/** Defender wins: the hands come apart. Run sheds throw the blocker aside. */
/** PASS_OFF (experimental, off; PASS_OFF=1): the pass-off. A pass rusher who beats his blocker while a helper's hands are
 * on him (the helper's joint carried load last step: he feels the man on his hands) is the helper's man from there: the
 * helper keeps him as his own block, as coached on a pass-off, instead of losing him with the beaten man's rep. The
 * engagement goes on with the helper as its blocker and his own hands joint (a fresh fight: neither man in control, no
 * hold carried over, the rusher's move state reset, his long-arm on the beaten man gone). The beaten blocker leaves it,
 * with the ordinary 0.6 s before he can grab the same man again; then his own blocking decides whether he recovers to
 * double him or finds other work, by what he sees. Off, beating the primary ended the rep for everyone on it: a helper
 * with his hands on the man lost him (of helped rushers who still reached the QB, the helper stayed within a yard the
 * whole 0.5 s in 36% against the NFL's 63%: hand-fight note section 8). */
export const PASS_OFF = process.env.PASS_OFF !== '0';
/** PASS_OFF's hand-over (folded in, 2026-11-16): the hand-over's control is the keeper's own
 * fit, the same first-contact law as any new pass engagement, not a scripted 0 (Integration, 2026-11-16: every
 * hand-over had gone to exactly 0 from -0.41..+0.75, giving the keeper the grip and the punch by assignment).
 * - **The exchange** (createEngagement's pass branch): his punch (hands, arm edge) against the rusher's current move.
 *   A finesse move meets it with his swipe (a swipe that beats the punch leaves the keeper reaching: -0.5); a power
 *   move with his strike.
 * - **Late** (attempt 2, corrected; only when he sees the man come free without his hands loaded on him): his hands
 *   must land before the man clears his reach. If they land after, it is a miss (the
 *   swiped punch's -0.5); between, the fit falls smoothly with the share of that window he used. (Attempt 1 bounded it by
 *   firstHands, which compares both men's landing over the same distance and so never penalised a late keeper.)
 * - **Off balance:** off his feet he does not fit (at most -0.5, the missed punch).
 * The old pairing's rep edge is not carried. */
function handoverControl(sim: PlaySim, e: Engagement, keeper: Agent): number {
  const d = e.defender, tb = traits(keeper, 'pass'), td = traits(d, 'pass'), rng = sim.dice('handover', keeper, d);
  const armEdge = (tb.arm - td.arm) / 3, punchB = tb.hands + 0.12 * armEdge + rng.normal(0, 0.18);
  let c: number;
  if (e.move === 'swim' || e.move === 'club' || e.move === 'rip' || e.move === 'speed') {
    const swipe = td.hands + 0.15 * td.bend + rng.normal(0, 0.18);
    c = swipe - punchB > 0.18 ? -0.5 : clamp(0.35 + (punchB - swipe), -0.2, 0.9);
  } else {
    const strike = 0.5 * td.hands + 0.5 * d.r('passRushPower') - 0.12 * armEdge + rng.normal(0, 0.18);
    c = clamp(punchB - strike, -0.8, 0.8);
  }
  // Late (attempt 2; attempt 1 bounded by firstHands, which compares both men's landing over the same distance and so
  // never penalised a late keeper): his hands must land before the man clears his reach. Land: his distance beyond
  // the bodies' contact over his closing speed on the man. Clear: the reach the man has left over the man's speed away
  // from him. Landing after the man has cleared is a miss (the swiped punch's -0.5); between, the fit falls smoothly
  // with the share of the window he used.
  // Attempt 2 corrected: only on the `seen` path, where his hands are not loaded on the man. A keeper whose hands are
  // already fitted (the hand-over's other precondition: force on his helper joint) has nothing left to land, so his fit
  // is the exchange alone. (Attempt 2 charged every keeper a landing time at his closing speed: a fitted, slowly
  // closing keeper got a near miss; staged, in reach -0.44.)
  // Loaded is the load on his own hands joint, not the path that found him: the seen check runs first each tick, so it
  // also finds keepers whose hands are already on (the first cut keyed on the path and changed nothing).
  const hj = e.hands, loaded = !!hj && (Math.max(0, hj.normalForce ?? 0) > 0 || Math.abs(hj.tangentForce ?? 0) > 0);
  if (loaded) return (keeper.body.support?.state ?? 'up') !== 'up' ? Math.min(c, -0.5) : c;
  const dx = d.pos.x - keeper.pos.x, dy = d.pos.y - keeper.pos.y, dist = Math.hypot(dx, dy) || 1, ux = dx / dist, uy = dy / dist;
  const contact = keeper.profile.radius + d.profile.radius, reach = contact + tb.arm / 36 * 0.3;
  const closing = Math.max(0.1, (keeper.vel.x - d.vel.x) * ux + (keeper.vel.y - d.vel.y) * uy);
  const away = Math.max(0.1, (d.vel.x - keeper.vel.x) * ux + (d.vel.y - keeper.vel.y) * uy);
  const land = Math.max(0, dist - contact) / closing, clear = Math.max(0, reach - dist) / away;
  const used = land / Math.max(1e-3, land + clear);
  c = c + (-0.5 - c) * clamp(used, 0, 1) ** 2;
  if ((keeper.body.support?.state ?? 'up') !== 'up') c = Math.min(c, -0.5);
  return c;
}
function passOff(sim: PlaySim, e: Engagement, seen = false): boolean {
  if (!PASS_OFF || e.type !== 'pass' || !e.helpers.length) return false;
  const d = e.defender;
  const keeper = e.helpers.find((h) => {
    const j = e.helperHands?.get(h);
    if (!j || h.isDown(sim.t) || !inBlockReach(h, d, 'pass')) return false;
    return seen ? seesComeFree(sim, e, h) : Math.max(0, j.normalForce ?? 0) > 0 || Math.abs(j.tangentForce ?? 0) > 0;
  });
  if (!keeper) return false;
  const old = e.blocker, joint = e.helperHands!.get(keeper)!;
  old.shedBy.set(d, sim.t + 0.6);
  old.engagement = null;
  if (e.rusherHand) { sim.world.joints = sim.world.joints.filter((x) => x !== e.rusherHand); e.rusherHand = undefined; e.counterAt = undefined; e.longArmUntil = undefined; }
  e.blocker = keeper; e.hands = joint;
  e.helpers = e.helpers.filter((h) => h !== keeper); e.helperHands!.delete(keeper);
  // The keeper's control from the first-contact law, from his own fit (not a scripted 0).
  e.control = handoverControl(sim, e, keeper);
  e.holding = false; e.moveOk = false; e.moveUntil = sim.t; e.riding = false; e.club = undefined;
  syncJoints(sim, e);
  keeper.tags.add('pass-off');
  d.tags.add('shed');
  sim.event('shed', d, old, 'pass: passed off');
  return true;
}

/** PASS_OFF attempt 2: the helper sees the man come off the blocker he is helping, as he has them both (his own sight
 * delay), with the man in his view cone: the man beyond the blocker's working reach (the bodies plus 0.85 of the
 * blocker's arm, the punch's lockout) or past his shoulder (70 deg off the blocker's line to the launch point, the
 * release the operators use). Then he takes him. Attempt 1 handed off only at beat(): under FITTED_HANDS most rushers
 * who reach the QB are still in the first man's rep at arm's length (51% of the frames to the reach), so it fired 3
 * times in 2 games. */
function seesComeFree(sim: PlaySim, e: Engagement, h: Agent): boolean {
  const b = e.blocker, d = e.defender, sd = sim.see(h, d), sb = sim.see(h, b);
  if (!inHeadCone(h.head ?? h.body.facing, Math.atan2(sd.pos.y - h.pos.y, sd.pos.x - h.pos.x))) return false;
  const rx = sd.pos.x - sb.pos.x, ry = sd.pos.y - sb.pos.y, sep = Math.hypot(rx, ry);
  if (sep > b.profile.radius + d.profile.radius + 0.85 * b.player.measurables.armIn / 36) return true;
  const pp = protectPoint(sim), ux = pp.x - sb.pos.x, uy = pp.y - sb.pos.y, L = Math.hypot(ux, uy) || 1;
  const ang = Math.atan2((rx * -uy + ry * ux) / L, -(rx * ux + ry * uy) / L);
  return Math.abs(ang) > (70 * Math.PI) / 180;
}

function beat(sim: PlaySim, e: Engagement, axis: Vec2, lat: Vec2, run = false, why = ''): void {
  if (!run && passOff(sim, e)) return;
  const d = e.defender;
  const b = e.blocker;
  if (run) runContactObservers.get(sim)?.(e, 'end', { reason: why });
  sim.disengage(e);
  // Hands need a moment to refit before he can grab the same man again.
  b.shedBy.set(d, sim.t + 0.6);
  if (run) {
    const s = Math.sign(e.phi) || e.side;
    const mb = b.profile.massKg;
    sim.world.strike(d.body, b.body, { x: -lat.x * s * mb * 0.6 - axis.x * mb * 0.2, y: -lat.y * s * mb * 0.6 - axis.y * mb * 0.2 });
  }
  d.tags.add('shed');
  sim.event('shed', d, b, `${run ? 'run' : 'pass'}: ${why}`);
}

/** Turn a facing toward the field side `sideY` (sign of y) by up to `open` rad. */
function openToward(facing: number, sideY: number, open: number): number {
  const toward = Math.atan2(sideY, 0), d = Math.atan2(Math.sin(toward - facing), Math.cos(toward - facing));
  return facing + Math.sign(d) * Math.min(Math.abs(d), open);
}

/** DOUBLE_TRACK: the play-side direction (sign of y) on a stretch call, else 0. */
function stretchTrackSide(sim: PlaySim): number {
  const run = sim.offCall.run;
  if (!run || (run.scheme !== 'outsideZone' && run.scheme !== 'wideZone')) return 0;
  return run.direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
}

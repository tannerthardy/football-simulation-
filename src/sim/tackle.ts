/**
 * Tackling on the shared physical world.
 *
 * A defender within reach of the carrier attempts a tackle. Execution keeps
 * irreducible uncertainty — a whiff, how good a hold he gets and where —
 * drawn once per attempt at the decision rate. Everything after that is the
 * same physics every other contact uses:
 *
 *  - the hit is a body collision (momentum, compliance, friction);
 *  - the hold is a bounded grasp joint (physics/world.ts): around the legs,
 *    the waist, or a handful of jersey. It resists separation and sliding up
 *    to a grip force; a load beyond it slips, and a hold that slides past
 *    the arms' reach breaks — a broken tackle;
 *  - each tackler drives with his feet to stop and turn the carrier back,
 *    and the carrier keeps driving his: the pile's motion is the result;
 *  - the carrier goes down when his support fails (physics/support.ts): a
 *    hold on his legs pitches him over a base he cannot move, a load he
 *    cannot follow knocks him off it. He falls with his own momentum.
 *
 * Officiating stays rules, not physics: down by contact once he is on the
 * ground, forward progress stopped when a held pile stops gaining ground,
 * a quarterback in the grasp. Whiffed lunges and dives commit the body: a
 * defender who leaves his base to reach pays for it physically.
 */
import { armSpan, reachTo } from './tackle-reach.js';
import { TRACK_TACKLE } from './behaviors/common.js';
import { OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import { G } from '../core/units.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { availability, comHeightAt, fallTime, supportParams, TURF_MU } from '../physics/support.js';
import { fatigueFactor, shouldersOf } from '../physics/kinematics.js';
import { CONTACT_SCALE, GROUND_STRETCH, type GraspJoint, type Intent } from '../physics/world.js';
import { DIVE_STANCE, DIVE_STANCE_S, diveSpeedGain } from '../physics/dive.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { contactQuality, previewTackleWindow, type TackleWindow } from './tackle-window.js';

export interface TackleBond {
  carrier: Agent;
  tacklers: Agent[];
  start: number;
  /** Forward-progress spot (max x for the offense, min x for a defensive returner). */
  progressX: number;
  down: boolean;
  /** Each tackler's hold quality: 0 = fingertips, 1 = a locked wrap. */
  grip?: Map<Agent, number>;
  /** Each tackler's control of the carrier, 0-1: the grip his arms' current
   * extension allows. Rulings (in the grasp, forward progress) and the
   * carrier's sense of being held read this; physics reads `grip`. Without
   * GRIP_HOLD the two are equal. */
  control?: Map<Agent, number>;
  /** Each tackler's grasp joint in the world. */
  holds?: Map<Agent, GraspJoint>;
  /** Execution draw for each hold (median 1): technique and footing on this rep. */
  execution?: Map<Agent, number>;
  /** HOLD_SINK: since when each tackler's hold has held without slipping, s. */
  sink?: Map<Agent, number>;
  /** Tacklers holding with one arm (ONE_ARM_HOLD): a grab with the arm a
   * blocker did not control. One hand on the man, no locked wrap, until his
   * body closes on the carrier and the second arm can come around. */
  oneArm?: Set<Agent>;
  /** Seconds the held carrier has gone without gaining ground. */
  stalled?: number;
  /** Last step's external (ground) impulse and work on the pile, kg·yd units. */
  physics?: { externalImpulse: Vec2; groundWork: number };
}

/** Seconds a held pile can go without gaining ground before forward progress is ruled stopped. */
const STALL = 0.8;

/** Force a hold of quality q can sustain, kg·yd/s². Locked arms around a
 * body hold by geometry (the hands must come apart), several times what
 * fingertips on a jersey can; technique finishes the wrap. */
/** Experimental contact acquired at standing reach with finite arm bracing.
 * Approach requests and real torso collisions remain physical. Default-off. */
const REACH_CONTACT = process.env.REACH_CONTACT === '1';
/** Experimental early hand acquisition with coherent approach footwork through
 * a committed strike. Ordinary grip and strike; default-off. */
const TACKLE_TOUCH = process.env.TACKLE_TOUCH === '1';
/** GRASP_JEOPARDY (experimental, off): the in-the-grasp whistle is the
 * rule's exception, not the ordinary sack. The rule declares a passer down
 * when he is in the grasp and control of a tackler behind the line and his
 * safety is in jeopardy. On, a pocket QB is whistled in the grasp only while a
 * tackler has control of him (the arms-tight measure, not a grip at full
 * stretch) and his body is going down (support falling); otherwise he is ruled
 * like any runner: stopped forward progress or down by contact. Off: a pocket
 * QB held 0.25 s with control or grip 0.6 is down at once. */
const GRASP_JEOPARDY = process.env.GRASP_JEOPARDY !== '0';
/** Experimental (WRAP_FOOT=1, off): a hold's coupling to the carrier's
 * corrective step is its secure leg share only (see updateBond). */
const WRAP_FOOT = process.env.WRAP_FOOT === '1';
/** Default on (BLOCKED_REACH=0 turns it off): a blocked defender reaches for a
 * passing carrier with the arm his blocker does not control, rather than only
 * once he is beating the block. One free arm reaches 0.7 of his reach; a
 * blocker with inside hands latched pins it to 0.4. The grab gives up the
 * block (grasp disengages it) and its hold quality falls with distance, as
 * for any reach. Only a runner on his free side, away from the blocker, is in
 * that arm's reach: a blocker head-up or on the runner's side occupies it
 * (the installed gate holds there). Tracking: blocked defenders make 46% of
 * first contacts on gap runs and 55% on zone
 * (scripts/diag/runblock/blockedfirst.py); the gate left 32% and 41%. */
const BLOCKED_REACH = process.env.BLOCKED_REACH !== '0';
/** Default on (GRIP_HOLD=0 turns it off): a hold keeps the grip it has
 * acquired when the arms extend. Closing still works a grip toward a wrap,
 * but a hand closed on a jersey is not weaker because the elbow straightened;
 * extension costs the reel its leverage, not the hold its tension. The held
 * grip never weakens: the hold still slides out while slipping and ends when
 * it slides past reach (World). Without it,
 * any extension cut the grip at once, so a slip extended the arms, the
 * weaker grip slipped more and the hold broke: crowd holds on break-through
 * runs sat at grip 0.45, slipping 79% of the time (KNOWN_PROBLEMS TKL-1). */
const GRIP_HOLD = process.env.GRIP_HOLD !== '0';
/** Default on (ONE_ARM_HOLD=0 for comparison): a grab made from inside a block
 * (BLOCKED_REACH, the free arm) holds with one hand and no locked wrap until
 * the tackler's body has closed on the carrier, when the second arm comes
 * around. One arm cannot lock around a body; the hands have to meet. Before
 * this the free-arm grab was scored against the short arm's own range, so a
 * back passing close to the free shoulder gave a form-tackle hold with two
 * locked arms: OZ runs stopped at the first engaged DL's grab, 1.3 yd after
 * contact against NFL 2.6 (Run Game, 2026-11-06). */
const ONE_ARM_HOLD = process.env.ONE_ARM_HOLD !== '0';
/** The second arm comes around once the arms' span is within this of the
 * torsos touching, yd. */
const SECOND_ARM_CLOSE = 0.15;

/** `lock`: how much of the wrap the arms' geometry still locks (default
 * the hold's quality). A wrap that slides out to arm's length is a hand hold
 * again; the hands keep the grip they acquired (GRIP_HOLD). */
export function gripForce(d: Agent, quality: number, lock = quality, hands = 2): number {
  const q = clamp(quality, 0, 1), l = clamp(lock, 0, 1);
  // One arm pulls with its own share of the arms' force and cannot lock.
  const wrap = supportParams(d.profile).armForce * (hands < 2 ? 0.15 : 0.3 + 2.5 * l * l) * (0.6 + 0.6 * d.r('tackling'));
  return GRIP_HOLD ? Math.max(wrap, handHold(d, q, hands)) : wrap;
}

/** What two hands closed on a jersey hold, kg·yd/s², by hold quality: a
 * handful of cloth from about q 0.5, down to a fingertip pinch at 0.
 * Hand grip is a capacity of the body, not of tackling technique (how good
 * a handful he gets is the quality). Model assumption: Division I athletes'
 * dynamometer grip is about 45-55 kg per hand (about half of body mass for a
 * 100 kg player), scaled here by mass and strength; a tight, slick jersey
 * keeps 3/4 of it; a pinch is about a third of a full grip. No combine drill
 * measures grip, so this replaces only the arm-push mapping the old law used
 * below a wrap. A locked wrap keeps the arm law above (GRIP_HOLD). */
function handHold(d: Agent, q: number, hands = 2): number {
  const perHand = d.profile.massKg * (0.42 + 0.16 * d.r('strength'));
  return hands * 0.75 * perHand * G * clamp(0.3 + 1.4 * q, 0, 1);
}

/** LUNGE_FLIGHT (experimental, off; LUNGE_FLIGHT=1 turns it on): a lunge is a launch, not range. Off, a free
 * tackler out of standing reach but within it + 0.45 yd (and an escaping runner within + 0.75) gets a hold made at once,
 * at that distance, and is then sent into a dive: the extra half yard is free, and the hold starts at its own break
 * reach (hold-trace.mts, 10 games: lunge holds broke 47%, reaches 1.8%, form 0.3%; TACKLE_REACH's shorter, correct arms
 * put more contacts in that band, 120 -> 164 lunge holds). On, he launches (the existing dive: a traction-limited
 * push-off of at most 1.5 yd/s over one tick, then he is off his feet) toward where he sees the carrier going, and a
 * grab is made only if, in that flight, the carrier comes inside his standing reach (`reachTo`, share 1): the attempt is
 * then the ordinary one at the distance the bodies actually reached. If he lands without that, it is a miss
 * ('lunge short'). What the lunge buys is closing his body can produce; what it costs is his feet, his steering and the
 * hold's footing, and the reach of his body laid out behind his arms (`flightReach`). He takes it only when, by his picture and that push-off, the flight reaches (`lungeReaches`); a first
 * build launched whenever the 0.3 s forecast said he would get no closer, and 92% of its launches never closed at all
 * (lunge-flight.mts: median 0.27 yd beyond reach, the runner separating at 0.5 yd/s, the tackler at 4.4 yd/s asking
 * for 9.2): a dive's one plant adds at most 0.59 yd/s, his legs keep accelerating. Stated choices: in flight his hands reach his standing reach plus GROUND_STRETCH as the fall lays him
 * out (`flightReach`; a first build gave the flight no layout at all); a grab can be made from the launch until he is
 * down on the ground (FLIGHT_MAX bounds it). */
export const LUNGE_FLIGHT = process.env.LUNGE_FLIGHT === '1';
/** Longest a lunge's flight is followed, s (a bound, not a law: a dive is on the ground well inside it). */
const FLIGHT_MAX = 1;
type Flight = { sim: PlaySim; t0: number; carrier: Agent; from: 'lunge' | 'dive'; launchDist: number; closest: number; closestArms: number;
  forecast?: { gap: number; at: number } };
const flights = new WeakMap<Agent, Flight>();
/** Diagnostics: tackler `d`'s lunge flight in progress (LUNGE_FLIGHT), read-only. */
export function flightOf(d: Agent): Readonly<Flight> | undefined { return flights.get(d); }

/** LUNGE_FLIGHT: his hands' reach in a dive, `progress` 0 (still on his feet) to 1 (laid out): his standing reach plus
 * the body stretched out behind the arms, GROUND_STRETCH (the World's own allowance for a holder off his feet, which the
 * extended hold's joint already uses), in proportion to how far the fall has laid him out. Stated choice: the layout is
 * linear in fall time. */
function flightReach(d: Agent, c: Agent, progress: number): number {
  return reachTo(d, c, 1) + GROUND_STRETCH * clamp(progress, 0, 1);
}

/** LUNGE_FLIGHT: one tick of a launched tackler's flight. True while he is in it (the caller skips him). */
function flightStep(sim: PlaySim, d: Agent, c: Agent): boolean {
  const f = flights.get(d);
  if (!f) return false;
  const state = d.body.support?.state;
  if (f.sim !== sim || f.carrier !== c) { flights.delete(d); return false; }
  if (sim.bond && sim.bond.tacklers.includes(d)) { flights.delete(d); return true; }
  const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
  const sup = d.body.support;
  const progress = sup && sup.state === 'falling'
    ? clamp((sim.world.time - sup.since) / fallTime(supportParams(d.profile), sup.posture), 0, 1) : 0;
  const arms = flightReach(d, c, progress);
  if (dd - arms < f.closest - f.closestArms) { f.closest = dd; f.closestArms = arms; }
  if (state !== 'down' && sim.t - f.t0 <= FLIGHT_MAX && dd <= arms && !occluded(sim, d, c)) {
    flights.delete(d);
    attempt(sim, d, c, contactQuality(dd, c.profile.radius + d.profile.radius, arms), false, true, arms, REACH_TIME);
    return true;
  }
  if (state === 'down' || sim.t - f.t0 > FLIGHT_MAX) {
    d.nextTackleAt = Math.max(d.nextTackleAt, sim.t + 0.5);
    d.missedTackles++;
    sim.stats.missedTackles++;
    sim.event('missed_tackle', d, c, f.from === 'dive' ? 'dive short' : 'lunge short');
    flights.delete(d);
  }
  return true;
}

/** LUNGE_FLIGHT: whether a launch now gets his hands to the carrier, by his picture of the carrier (`cp`, `cv`) and his
 * own body: the World's dive push-off along the launch line (`diveSpeedGain`, dive.ts: one plant at the turf's traction,
 * or with DIVE_STANCE the stride's force over its stance), then a coasting flight until he is down (`fallTime`). He launches only if that
 * flight comes inside his standing reach; otherwise a dive cannot get there and he keeps his feet (his legs keep
 * accelerating; a falling body cannot). A controller read of his own capability, not a cap: whenever the launch
 * reaches, he may take it. */
function lungeReaches(sim: PlaySim, d: Agent, c: Agent, cp: Vec2, cv: Vec2): boolean {
  return lungeForecast(sim, d, c, cp, cv).gap <= 0;
}
/** The flight `lungeReaches` forecasts: its closest approach beyond his standing reach (yd, <= 0 reaches) and when. */
export function lungeForecast(sim: PlaySim, d: Agent, c: Agent, cp: Vec2, cv: Vec2): { gap: number; at: number } {
  const ax = cp.x + cv.x * DIVE_WINDOW - d.pos.x, ay = cp.y + cv.y * DIVE_WINDOW - d.pos.y, al = Math.hypot(ax, ay) || 1;
  const speed = Math.hypot(d.vel.x, d.vel.y), ux = ax / al, uy = ay / al;
  // The World's push-off, one law (dive.ts): off, one plant's traction-limited gain; DIVE_STANCE, the stride's force
  // over a 0.12 s stance, his feet going at the end of the tick it ends in.
  const dv = diveSpeedGain(d.profile, speed, d.vel.x * ux + d.vel.y * uy, 1, sim.dt);
  const push = DIVE_STANCE ? DIVE_STANCE_S : 0;
  const feet = DIVE_STANCE ? Math.ceil(DIVE_STANCE_S / sim.dt - 1e-9) * sim.dt : sim.dt;
  const fall = fallTime(supportParams(d.profile), d.body.support?.posture ?? 0);
  const flight = feet + fall;
  // Along the launch line the gain ramps in over the push (at once for the one-tick plant), then he coasts.
  const gained = (t: number) => dv * (push > 0 && t < push ? t * t / (2 * push) : t - push / 2);
  let gap = Infinity, at = 0;
  for (let t = sim.dt; t <= flight + 1e-9; t += sim.dt) {
    const gx = cp.x + cv.x * t - (d.pos.x + d.vel.x * t + ux * gained(t)), gy = cp.y + cv.y * t - (d.pos.y + d.vel.y * t + uy * gained(t));
    const g = Math.hypot(gx, gy) - flightReach(d, c, clamp((t - feet) / fall, 0, 1));
    if (g < gap) { gap = g; at = t; }
    if (g <= 0) break;
  }
  return { gap, at };
}

/** His picture of the carrier in his tackle window (the window preview's): TRACK_TACKLE's tracked carrier, else a
 * scaled `see()`; perception was sampled at tick start, so its stale velocity is dead-reckoned to this body-state
 * boundary (tryTackles follows physics). */
function windowPicture(sim: PlaySim, d: Agent, c: Agent) {
  const look = (.12 + .12 * (1 - d.r('awareness'))) / Math.max(.1, d.profile.reactionTime);
  // TRACK_TACKLE (step 1a'): the carrier in his tackle window is tracked.
  const seen = TRACK_TACKLE ? sim.track(d, c, 1, true) : sim.see(d, c, look);
  const elapsed = clamp(sim.world.time - sim.t, 0, sim.dt);
  return { ...seen, pos: { x: seen.pos.x + seen.vel.x * elapsed, y: seen.pos.y + seen.vel.y * elapsed } };
}

/** LUNGE_FLIGHT: the launch decision reads the same picture as the window preview (`windowPicture`). A first reading of
 * HONEST_TACKLE's plain `see()` put the carrier about 0.3 yd nearer than he was at launch distance: every one of 23
 * short launches in 3 games was out of reach by the true state (lunge-flight.mts: forecast gap p50 -0.10 yd, true
 * +0.21). */
function lungeOk(sim: PlaySim, d: Agent, c: Agent): { ok: boolean; pos: Vec2; vel: Vec2 } {
  const p = windowPicture(sim, d, c);
  return { ok: lungeReaches(sim, d, c, p.pos, p.vel), pos: p.pos, vel: p.vel };
}

/** LUNGE_FLIGHT: launch toward where he sees the carrier going over the layout's window. */
function launch(sim: PlaySim, d: Agent, c: Agent, cp: Vec2, cv: Vec2, from: 'lunge' | 'dive'): void {
  const ax = cp.x + cv.x * DIVE_WINDOW - d.pos.x, ay = cp.y + cv.y * DIVE_WINDOW - d.pos.y, al = Math.hypot(ax, ay) || 1;
  const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
  flights.set(d, { sim, t0: sim.t, carrier: c, from, launchDist: dd, closest: dd, closestArms: reachTo(d, c, 1),
    forecast: lungeForecast(sim, d, c, cp, cv) });
  sim.diveAt(d, { x: ax / al, y: ay / al });
}

/** REACH_TIME (experimental, off; REACH_TIME=1 turns it on): a reach takes time, and whether it gets a hand on the man
 * is the bodies' geometry when the hands arrive, not a roll. Off, an attempt is decided at once: by a rating roll
 * (pMiss from tackling and pursuit against elusiveness, open field, overrun, +0.3 off a block) or, with TKL_WHIFF, by a
 * forecast of the carrier's body that credits him a cut away (whiffMargin) he never makes; and the hold's quality takes
 * a rating contest and a random execution draw. roll-audit.mts (3 games): the roll missed 4.7% of free reaches, nearly
 * flat in the reach margin (0.02 deep inside reach, 0.13 beyond it), granted 12% of grabs that were out of reach, and
 * missed 28% of grabs off a block that were inside it. On: the attempt starts the reach (his strike step, committed:
 * `strike`); his hands go out from his torso, accelerating, to the full reach (`limit`, the same arms or free-arm reach the
 * attempt was judged on) in REACH_EXTEND; the first tick the carrier's body is inside the hands' reach so far (and not
 * behind another body), the hold is made at the distance the bodies are at; a nearer or fast-closing carrier is met
 * sooner. (Earlier builds: judged only at arrival, which missed runners who had come inside and passed; swept from the
 * carrier's start distance, which put the hands at him at once; went out at one speed over the unsourced 0.2 s
 * REACH_WINDOW, about 3.5 yd/s, which doubled the misses and is half a sourced strike's speed), with its ordinary quality law and no draw; otherwise it is a miss, and the reach has committed his body
 * (`commitLunge`). Both bodies keep moving in the window under their own commands and contacts, so the carrier's actual
 * cut, speed and the tackler's own momentum decide it. Ratings act through capability only: his grip (gripForce, the
 * reel), his strike, his cut and the carrier's, and the picture delays that chose the moment. Stated choice: the window
 * is the existing REACH_WINDOW law, not a new number. */
export const REACH_TIME = process.env.REACH_TIME === '1';
/** REACH_TIME: seconds for the hands to go from his torso to full reach (stated choice inside sourced ranges, Rules +
 * Coaching 2026-11-24, checked: a trained straight punch's attack phase, fist's first motion to contact, 111 +/- 41 ms
 * experienced and 102 +/- 37 ms inexperienced, Menzel & Potthast 2021 Sensors 21:7882; peak hand speed 6.6-12.5 m/s
 * reached 8-21 ms before contact, Whiting, Gregor & Finerman 1988 AJSM 16(2). Rules' stated range for a tackler, who opens
 * and wraps from wide or low arms while running, is 0.12-0.15 s with a late-peaking speed; 0.12 s, its fast end, with
 * constant acceleration, the simplest late-peaking profile). Not whiffMargin's REACH_WINDOW (0.2 s, an unsourced
 * assumption that TKL_WHIFF keeps). */
const REACH_EXTEND = 0.12;
type Reach = { sim: PlaySim; carrier: Agent; t0: number; arrive: number; engaged: boolean; lunged: boolean; limit: number; arms: number; start: number };
const reaches = new WeakMap<Agent, Reach>();
/** Diagnostics: tackler `d`'s reach in progress (REACH_TIME), read-only. */
export function reachOf(d: Agent): Readonly<Reach> | undefined { return reaches.get(d); }

function startReach(sim: PlaySim, d: Agent, c: Agent, engaged: boolean, lunged: boolean, limit: number): void {
  const body = c.profile.radius + d.profile.radius;
  const span = Number.isFinite(limit) ? limit : reachTo(d, c, 1);
  // The hands go out from his torso to full reach in REACH_EXTEND, accelerating (reachStep).
  // The contact-quality span is his arms (for a lunge, his standing reach, not the lunge's limit), as at the attempt.
  reaches.set(d, { sim, carrier: c, t0: sim.t, arrive: sim.t + REACH_EXTEND - 1e-9, engaged, lunged, limit: span, arms: lunged ? reachTo(d, c, 1) : span,
    start: body });
  d.nextTackleAt = sim.t + 0.5;
  // He commits his last step to the near hip as the arms go (a lunge has already left his feet).
  if (!engaged && !lunged) strike(sim, d, c, d.r('tackling'));
}

/** REACH_TIME: whether a reach started now meets the carrier, by his tackle-window picture (`windowPicture`) and his own
 * body: his velocity plus, free of a block, the strike step he commits with it (`strike`'s law, toward the hip he sees),
 * and the hands' law (from his torso to `limit` in REACH_EXTEND, accelerating). A controller read of his capability,
 * like the lunge's (`lungeReaches`): a reach at a carrier already leaving his arms is not taken; he keeps closing, and
 * whenever a reach would meet the man he may take it. Why (reach-trace.mts, 4 games, sourced hand law): reaches started
 * at low closing missed 21.5%, nearly all with the carrier at the edge of reach and receding, where no hand speed gets
 * there; open-field attempts at 1.0-1.5 yd missed 0.69 against the NFL's 0.17. */
function reachMeets(sim: PlaySim, d: Agent, c: Agent, engaged: boolean, limit: number): boolean {
  const p = windowPicture(sim, d, c);
  const body = c.profile.radius + d.profile.radius;
  const span = Number.isFinite(limit) ? limit : reachTo(d, c, 1);
  let vx = d.vel.x, vy = d.vel.y;
  if (!engaged) {
    const PUSH_OFF = 0.2;
    const gx = p.pos.x - d.pos.x + (p.vel.x - d.vel.x) * PUSH_OFF, gy = p.pos.y - d.pos.y + (p.vel.y - d.vel.y) * PUSH_OFF;
    const g = Math.hypot(gx, gy), touch = 0.9 * body;
    if (g > touch) {
      const dv = Math.min(TURF_MU * G * PUSH_OFF * (0.7 + 0.3 * d.r('tackling')), (g - touch) / PUSH_OFF);
      vx += gx / g * dv; vy += gy / g * dv;
    }
  }
  const h = sim.dt / 2;
  for (let t = h; t <= REACH_EXTEND + 1e-9; t += h) {
    const share = t / REACH_EXTEND, hands = body + (span - body) * share * share;
    const gap = Math.hypot(p.pos.x + p.vel.x * t - (d.pos.x + vx * t), p.pos.y + p.vel.y * t - (d.pos.y + vy * t));
    if (gap <= hands) return true;
  }
  return false;
}

/** REACH_TIME: one tick of a reach in progress. True while he is in it (the caller skips him). */
function reachStep(sim: PlaySim, d: Agent, c: Agent): boolean {
  const r = reaches.get(d);
  if (!r) return false;
  if (r.sim !== sim || r.carrier !== c) { reaches.delete(d); return false; }
  if (sim.bond && sim.bond.tacklers.includes(d)) { reaches.delete(d); return true; }
  const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy);
  const body = c.profile.radius + d.profile.radius;
  // The hands sweep out over the window: the reach he has now grows from where the carrier was when he started (or
  // his torso) to the full limit at arrival. A carrier who comes inside it on the way (a fast-closing runner meeting
  // the hands early) is reached then; one never inside it by arrival is missed.
  // Constant acceleration from his torso: the extension covered is the square of the time share (speed peaking at
  // full extension, as a strike's does just before contact).
  const share = clamp((sim.t - r.t0) / Math.max(1e-6, r.arrive - r.t0), 0, 1);
  const now = r.start + (r.limit - r.start) * share * share;
  const inside = dd <= now && !occluded(sim, d, c) && d.body.support?.state !== 'down';
  if (!inside && sim.t < r.arrive) return true;
  reaches.delete(d);
  // A blocked defender's free arm may have been pinned or freed meanwhile; the reach he made is the one judged.
  if (inside) {
    attempt(sim, d, c, contactQuality(dd, body, r.arms), r.engaged && !!d.engagement, r.lunged, r.limit, true);
    return true;
  }
  d.missedTackles++;
  sim.stats.missedTackles++;
  sim.event('missed_tackle', d, c, 'reach');
  if (!r.engaged && !r.lunged) commitLunge(d, dx / (dd || 1), dy / (dd || 1), contactQuality(dd, body, r.arms));
  return true;
}

/** HOLD_AIM (experimental, off; HOLD_AIM=1 turns it on): where his hands go on the man is his choice, the taught aim
 * for the situation he sees, executed with error, and a lower aim costs reach. Off, the hold's height (legs share: 0
 * shoulder line, 0.5 waist, 1 legs) is a draw centred by situation (gripReach: free and square 0.2 + 0.45 form, about
 * 0.4 for an average tackler), and the reach is the same at any height. finish-trace.mts (package, 3 games): a tight,
 * locked mid-torso hold (legs 0.45-0.52) left the carrier's balance at a third of critical and his legs free to step, so
 * he walked the holder until help came (65% of light holds); solo holds at legs >= 0.7 put him down in 0.15 s.
 * Taught (Rules + Coaching, 2026-11-24, CHECKED): square or in front, the thighs ("contact point on the THIGHS", the
 * Seahawks-style handout; World Rugby: shoulder on the thighs, squeeze the legs, drive); angled, the near hip (Quinn:
 * "the ballcarrier's near hip ... hit that hip with your related shoulder"); from behind, the hips or legs (World Rugby);
 * at full stretch, the feet (the tap). Stated choice: those regions as legs shares: thigh 0.7, near hip 0.5, hips/legs
 * 0.6, feet 1; off a block, what one arm reaches (gripReach's 0.35). Execution: about that mean with gripReach's own
 * spread for the situation, widened by lost balance and narrowed by skill (WHIFF_MARGIN's law: x (2 - availability) x
 * (1.3 - 0.6 tackling)). The cost of a low aim is the bend: with REACH_TIME, while his hands go out he asks for the
 * posture that brings his shoulder line to the target (`reachIntents`; the World's posture law solved for it), and the
 * World charges it (pad level costs speed, at its own rate of change). A first build charged the reach
 * instead (the arm coming down from his crouched shoulder line, `aimReach`), which made the waist all but unreachable:
 * the World's crouch lowers the centre of mass by a quarter and does not model the trunk lean that brings the shoulders
 * down and forward. No height is forbidden. */
export const HOLD_AIM = process.env.HOLD_AIM === '1';
type Aim = { mean: number; sd: number; region: 'thigh' | 'near hip' | 'hips/legs' | 'feet' | 'free arm' };
const aimFor = new WeakMap<Agent, Aim>();
function chooseAim(d: Agent, cp: Vec2, cv: Vec2, engaged: boolean, lunging: boolean): Aim {
  const sup = d.body.support, a = sup ? availability(sup, supportParams(d.profile), fatigueFactor(d.body.energy)) : 1;
  const err = (2 - a) * (1.3 - 0.6 * d.r('tackling'));
  // Stated choices, not fitted. Legs share is the World's hold height: 0 the shoulder line, 0.5 the waist (belt), 1 the
  // legs at the feet (com x (1 - 0.55 legs) below the waist; upperHoldHeight above it). Means: the taught contact for the
  // situation (Rules + Coaching 2026-11-24, docs/reviews/2026-11-24-tackle-aim-point.md on #869). Spreads: gripReach's
  // own per-situation spreads (inherited), times WHIFF_MARGIN's execution law (inherited).
  //  - 0.35 off a block: what one free arm reaches at the side (gripReach's engaged mean).
  //  - 1 at full stretch: the feet and ankles, the 'tap' (gripReach's lunge spread 0.15).
  if (engaged) return { mean: 0.35, sd: 0.12 * err, region: 'free arm' };
  if (lunging) return { mean: 1, sd: 0.15 * err, region: 'feet' };
  const cs = Math.hypot(cv.x, cv.y), rx = cp.x - d.pos.x, ry = cp.y - d.pos.y, rd = Math.hypot(rx, ry) || 1;
  // +1: the carrier running at him; -1: he is behind the carrier (attempt's cosA, from his picture).
  const cosA = cs > 0.5 ? -(cv.x * rx + cv.y * ry) / (cs * rd) : 1;
  //  - 0.6 behind: the hips or legs, between the hip line (0.5) and the thighs (0.7), the taught 'hips/legs'.
  //  - 0.7 in front: the thighs, below the hip line, above the knee (the taught contact point).
  //  - 0.5 side-on: the near hip, the belt line (Quinn's 'epicentre').
  // The side/front/behind split is attempt's own cosA bands (0.3), from his picture of the carrier's travel.
  if (cosA < -0.3) return { mean: 0.6, sd: 0.18 * err, region: 'hips/legs' };
  if (cosA > 0.3) return { mean: 0.7, sd: 0.12 * err, region: 'thigh' };
  return { mean: 0.5, sd: 0.12 * err, region: 'near hip' };
}
/** HOLD_AIM: the reach to a target at legs share `legs`: his arm's horizontal reach is shortened by the drop from his
 * shoulder line (his posture now) to the target's height on the carrier (the World's hold heights). */
export function aimReach(d: Agent, c: Agent, share: number, legs: number): number {
  const full = reachTo(d, c, share);
  const arm = Math.max(0, d.profile.reach - 0.25) * share;
  // He bends to strike (pad level): his shoulder line comes down toward the target as far as his crouch goes (posture 1,
  // the World's comHeightAt); the arm covers only what is left below that, or above his shoulders as he stands now.
  const sp = supportParams(d.profile), posture = d.body.support?.posture ?? 0;
  const shoulderAt = (p: number) => SHOULDER * d.profile.heightYd * (comHeightAt(sp, p) / sp.comHeight);
  const csp = supportParams(c.profile), cpost = c.body.support?.posture ?? 0;
  const target = upperHoldHeight(c, legs) ?? comHeightAt(csp, cpost) * (1 - 0.55 * clamp(legs, 0, 1));
  const shoulder = clamp(target, shoulderAt(1), shoulderAt(posture));
  const drop = Math.min(arm, Math.abs(shoulder - target));
  return full - (arm - Math.sqrt(Math.max(0, arm * arm - drop * drop)));
}
/** HOLD_AIM step 2: the posture a tackler bends to so his shoulder line comes down to the target at legs share `legs`
 * (the World's comHeightAt law solved for posture; 0 upright, 1 his deepest crouch). */
function aimPosture(d: Agent, c: Agent, legs: number): number {
  const sp = supportParams(d.profile), csp = supportParams(c.profile), cpost = c.body.support?.posture ?? 0;
  const target = upperHoldHeight(c, legs) ?? comHeightAt(csp, cpost) * (1 - 0.55 * clamp(legs, 0, 1));
  const standing = SHOULDER * d.profile.heightYd;
  return clamp((1 - target / standing) / (0.25 * (0.4 + 0.6 * sp.bend)), 0, 1);
}
/** HOLD_AIM step 2 (with REACH_TIME): while his hands are going out, a tackler asks for the bend his aim needs, so the
 * World charges it (a lower pad level costs speed; the posture changes at the World's own rate). Called with the
 * tick's intents, before the physics step (PlaySim, beside updateBond). */
export function reachIntents(sim: PlaySim, intents: Intent[]): void {
  if (!HOLD_AIM || !REACH_TIME) return;
  for (const d of sim.agents) {
    const r = reaches.get(d), aim = aimFor.get(d);
    if (!r || r.sim !== sim || !aim || r.engaged) continue;
    const want = aimPosture(d, r.carrier, aim.mean), own = intents[d.idx];
    if (own && (own.posture ?? 0) < want) intents[d.idx] = { ...own, posture: want };
  }
}

/** Diagnostics: the aim chosen for tackler `d`'s last attempt (HOLD_AIM). */
export function aimOf(d: Agent): Readonly<Aim> | undefined { return aimFor.get(d); }

export function tryTackles(sim: PlaySim): void {
  const c = sim.carrier;
  if (!c || sim.ball.kind !== 'held') return;
  const t = sim.t;
  for (const d of sim.opponents(c)) {
    if (LUNGE_FLIGHT && flightStep(sim, d, c)) {
      if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
      continue;
    }
    if (REACH_TIME && reachStep(sim, d, c)) {
      if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
      continue;
    }
    if (d.isDown(t) || t < d.nextTackleAt) continue;
    if (sim.bond && sim.bond.tacklers.includes(d)) continue;
    const pic = HONEST_TACKLE ? sim.see(d, c) : null;
    if (pic && pic.carrying === false) continue;
    // His read of the carrier's motion relative to him (true geometry when off).
    const cp = pic ? pic.pos : c.pos, cv = pic ? pic.vel : c.vel;
    const rx = cp.x - d.pos.x, ry = cp.y - d.pos.y, rd = Math.hypot(rx, ry) || 1;
    const dx = c.pos.x - d.pos.x;
    const dy = c.pos.y - d.pos.y;
    const dd = Math.hypot(dx, dy);
    const engaged = !!d.engagement;
    // A blocked defender can only reach out for the carrier once he's clearly
    // working off the block (tracking: linemen make a third of run tackles).
    const blockerY = engaged ? d.engagement!.blocker.pos.y - d.pos.y : 0;
    const freeSide = engaged && BLOCKED_REACH && Math.abs(blockerY) >= 0.25 && blockerY * dy < 0;
    if (engaged && !freeSide && d.engagement!.win < 0.6) continue;
    const body = c.profile.radius + d.profile.radius;
    const freeArm = freeSide ? 0.7 - 0.3 * clamp(d.engagement!.control, 0, 1) : 0.4;
    // TACKLE_REACH: from his centre, his reach to the carrier's surface (tackle-reach.ts); off, the legacy double count.
    let arms = reachTo(d, c, engaged ? freeArm : 1.0);
    if (HOLD_AIM) {
      const aim = chooseAim(d, cp, cv, engaged, false);
      aimFor.set(d, aim);
      // The reach is not shortened by a low aim here: he bends to strike, and the World's crouch is not the whole bend
      // (the trunk lean that also brings the shoulders forward is not modelled; anatomical detail is paused), so
      // aimReach's arm-only drop overstated the cost. Kept for diagnostics; the bend's cost is step 2.
      void aimReach;
    }
    // A free tackler can lunge for the last half yard by committing his body;
    // a miss then leaves him off his base.
    const range = arms + (engaged ? 0 : 0.45);
    if (dd <= range && !occluded(sim, d, c)) {
      // Contact quality: 1 = body to body (form tackle), 0 = fingertips / lunge.
      const q = contactQuality(dd, body, arms);
      const acquireAtReach = (REACH_CONTACT || TACKLE_TOUCH) && dd <= arms && !engaged;
      // A tackler reaches when he is in position to wrap, or when this is
      // the best shot the visible relative trajectory offers (a runner
      // passing or pulling away). While he is still closing on a better
      // shot he keeps his feet running; an assist takes whatever it gets.
      const closing = -((cv.x - d.vel.x) * rx + (cv.y - d.vel.y) * ry) / rd;
      // A crossing hip can already be passing without rapidly separating.
      // Outside standing reach, retain the ordinary escape exception or
      // require acquired evidence that this is the last attainable reach.
      const needsLastReach = dd > arms && closing > -1.5;
      let lastReach = false;
      // Waiting needs affirmative evidence from the picture and the command
      // actually held. A joint, recent contact or recovering support makes a
      // one-body forecast unavailable; ideal current-state motion cannot
      // promise that those constraints will let us reach a better hip.
      let waitForBetter = false;
      const form = 0.85 - 0.15 * d.r('tackling');
      if (!sim.bond && q < form && sim.intents[d.idx]
        && !sim.world.joints.some(j => (j.a === d.body || j.b === d.body)
          && (j.kind !== 'grasp' || !j.broken))
        && !sim.lastStep?.contacts.some(hit => hit.i === d.idx || hit.j === d.idx)) {
        // Forecast the command actually executed, without asking the behavior
        // for another decision or drawing from its pursuit-error stream.
        const observed = windowPicture(sim, d, c);
        const window = previewTackleWindow(d, observed, sim.intents[d.idx], body, arms, sim.world.time);
        if (window) {
          // Compare two estimates from the same observation. Actual reach and
          // the resulting grip still use current physical geometry below.
          waitForBetter = waitsForBetter(window);
          lastReach = observed.carrying === true && window.closestAt === 0
            && window.closest > arms && window.closest <= range;
          const keepFeet = (waitForBetter && !acquireAtReach) || (needsLastReach && !lastReach);
          if (sim.trace.data) sim.trace.decide({ t: sim.t, a: d.idx,
            kind: 'tackle-opportunity',
            chose: keepFeet ? 'keep feet moving'
              : needsLastReach ? 'take last reach' : 'attempt current opportunity',
            cue: 'delayed carrier motion and attainable movement',
            options: ['keep feet moving', 'attempt current opportunity', 'take last reach'],
            detail: `Observed possession ${observed.carrying === true ? 'held' : 'unconfirmed'}; wrap quality ${window.currentQuality.toFixed(2)}; best attainable decision sample ${window.futureQuality.toFixed(2)} at ${window.closestAt.toFixed(2)} s. Held movement command; future cuts and contacts are unknown.` });
        }
      }
      if (needsLastReach && !lastReach) continue;
      if (waitForBetter && !acquireAtReach) continue;
      if (LUNGE_FLIGHT && dd > arms && !engaged) {
        const lo = lungeOk(sim, d, c);
        if (lo.ok) launch(sim, d, c, lo.pos, lo.vel, 'lunge');
        continue;
      }
      attempt(sim, d, c, q, engaged, dd > arms, dd > arms ? range : arms);
      if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
      continue;
    }
    // Escaping carrier just out of reach: lay out for his legs. The dive is a
    // real fall; whether he trips the carrier is the hold and the physics.
    const dive = range + 0.3;
    const separating = ((cv.x - d.vel.x) * rx + (cv.y - d.vel.y) * ry) / rd;
    const behind = (d.pos.x - cp.x) * cv.x + (d.pos.y - cp.y) * cv.y < 0;
    if (!engaged && dd <= dive && separating > 1.6 && behind && !sim.bond && !occluded(sim, d, c)) {
      if (LUNGE_FLIGHT) { const lo = lungeOk(sim, d, c); if (lo.ok) launch(sim, d, c, lo.pos, lo.vel, 'dive'); continue; }
      d.nextTackleAt = t + 1;
      sim.diveAt(d, { x: dx, y: dy });
      const p = 0.22 + 0.3 * d.r('tackling') - 0.15 * c.r('elusiveness') - 0.1 * c.r('balance');
      if ((TKL_WHIFF ? !whiffs(sim, d, c, dive, false, DIVE_WINDOW) : sim.dice('tackle', d).chance(Math.max(0.05, p)))
        && (!GRAB_CONNECT || grabConnects(sim, d, c, dive, false))) {
        // He gets a hand on a foot: a weak hold, all of it on the legs.
        grasp(sim, d, c, 0.3, 1, dd, 1, true, 'dive');
        sim.event('hit', d, c, 'diving tackle');
        return;
      }
      d.missedTackles++;
      sim.stats.missedTackles++;
      sim.event('missed_tackle', d, c, 'dive');
    }
  }
}

/** Is another body between the tackler and the carrier? */
function occluded(sim: PlaySim, d: Agent, c: Agent): boolean {
  const sx = c.pos.x - d.pos.x;
  const sy = c.pos.y - d.pos.y;
  const l2 = sx * sx + sy * sy;
  if (l2 < 0.36) return false;
  for (const o of sim.agents) {
    if (o === d || o === c) continue;
    const t = ((o.pos.x - d.pos.x) * sx + (o.pos.y - d.pos.y) * sy) / l2;
    if (t <= 0.15 || t >= 0.85) continue;
    const px = d.pos.x + sx * t - o.pos.x;
    const py = d.pos.y + sy * t - o.pos.y;
    // Bodies plus shoulders/arms block a corridor.
    if (px * px + py * py < (o.profile.radius + 0.25) ** 2) return true;
  }
  return false;
}

/** TKL_WHIFF (experimental, off; =1 turns it on): an open-field reach or dive
 * misses because the carrier's body is not where the tackler's hands can get
 * to in the reach window, not on a rating roll. In that window the tackler's
 * centre goes where his momentum takes it, redirected toward his delayed
 * picture of the carrier only as far as his cut capacity allows (a blocked
 * defender a fraction of it); the carrier, if he can see the tackler, moves
 * his hips away by his own cut capacity, otherwise runs on. A whiff is the
 * carrier ending outside the tackler's hand reach. Ratings enter only as
 * these capacities and the picture delay. A pocket QB keeps his escape law. */
const TKL_WHIFF = process.env.TKL_WHIFF === '1';
/** POCKET_REACH (experimental, off; intended on; PRO-INFO #6/#11): a reach for a QB in the pocket misses when his body
 * is not where the tackler's hands can get to in the reach window (`whiffs`: the tackler's momentum, redirected toward
 * his delayed picture by his cut capacity; the QB, if he sees the man, cutting away by his own), not by a roll with a
 * rated escape (elusiveness, pocket presence) and the rusher's true bearing off his facing (`seesIt`). Diagnosis
 * (qb-tackle-gates.mts): when our QB threw after a rusher reached a yard of him, the rusher spent 42% of those ticks on
 * his tackle cooldown after a rolled miss at lunge range, and 49% bonded with the throw still coming out. */
const POCKET_REACH = process.env.POCKET_REACH !== '0';
/** WAIT_REACHED (on; WAIT_REACHED=0 turns it off): a tackler holds his reach for a better
 * shot only when his forecast reaches that better point inside its lookahead. Each tick the forecast is redone; one
 * whose best point always sits at its last sample (a slow chase on a runner as fast as he is, or faster than the
 * runner's seen velocity says) promised a shot 0.3 s away forever, and he never took the one he had. */
const WAIT_REACHED = process.env.WAIT_REACHED !== '0';
/** HONEST_TACKLE (experimental, off; HONEST_TACKLE=1 turns it on): the tackler's
 * decisions come from his picture of the carrier, not the true state. He reaches
 * only for a body his picture does not show without the ball (the carrier he has
 * not yet seen take a handoff is not his target until he sees it), and his
 * closing, separating and behind reads for the last reach and the dive use the
 * carrier's seen position and velocity. Reach, grip and contact stay physical. */
const HONEST_TACKLE = process.env.HONEST_TACKLE !== '0';
/** Whether the forecast is worth waiting for: a better shot by a margin and, with WAIT_REACHED, one it reaches inside
 * its lookahead. A best point at the horizon's edge is a slow chase still closing (or a runner faster than his seen,
 * stale velocity): the better shot keeps receding, so he takes the reach he has. */
export function waitsForBetter(window: TackleWindow, reachedRule = WAIT_REACHED): boolean {
  return window.futureQuality > window.currentQuality + .1 && (!reachedRule || window.reached);
}
/** Hand strike, extension to contact (model assumption, s). */
const REACH_WINDOW = 0.2;
/** Layout from the launch to full extension (model assumption, s). */
const DIVE_WINDOW = 0.3;
/** WHIFF_MARGIN (experimental, off; needs TKL_WHIFF): the reach's geometry
 * decides how close the hands get to the runner's body; whether fingers then
 * get a grip of cloth at that margin is below the body scale we simulate, so it
 * is a probability of the margin (W tier, docs/reviews/2026-11-10-tackle-forms.md).
 * p(miss) = 1 / (1 + exp(-margin / sigma)): margin = the runner's predicted
 * body point beyond the hands' reach (yd, + = out of reach). sigma is hand
 * placement precision: HAND_SIGMA (a hand's width, a model assumption), wider
 * with lost balance (availability) and with a blocker still on him, narrower
 * with tackling skill (capability, not outcome). Checked against the missed
 * share by approach on the shared index (Defense's classes, NFL tracking). */
const WHIFF_MARGIN = process.env.WHIFF_MARGIN === '1';
const HAND_SIGMA = 0.1;
/** TKL_EXEC_STATE (experimental, off): drop the per-attempt random execution
 * draw; the hold's quality keeps its deterministic contact-quality and
 * skill-against-elusiveness terms. The whiff and grip physics carry the noise. */
const TKL_EXEC_STATE = process.env.TKL_EXEC_STATE === '1';
/** GRAB_CONNECT (experimental, off): a grab becomes a hold only if the fingers
 * close on cloth before the runner's separation uses up the reach margin the
 * grab has left. p(connect) = 1 / (1 + exp(-(m - dv * GRIP_CLOSE) / sigma)):
 * m = the attempt's reach limit minus the distance (yd), dv = how fast the
 * runner is pulling away from him (yd/s), GRIP_CLOSE = hand closure time (a
 * model assumption), sigma = hand placement precision as in WHIFF_MARGIN. A
 * grab that does not connect is a miss (the lunge or dive still costs him his
 * base). W tier (docs/reviews/2026-11-10-tackle-forms.md): a full-stretch
 * grab on a fleeing runner mostly fails to become a hold, instead of holding
 * for 0.3 s and slipping. Checked against the missed share at first contact. */
const GRAB_CONNECT = process.env.GRAB_CONNECT === '1';
const GRIP_CLOSE = 0.1;
export function grabConnects(sim: PlaySim, d: Agent, c: Agent, limit: number, engaged: boolean): boolean {
  const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
  const sep = Math.max(0, ((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / dd);
  const m = limit - dd;
  const sup = d.body.support, a = sup ? availability(sup, supportParams(d.profile), fatigueFactor(d.body.energy)) : 1;
  const sigma = HAND_SIGMA * (2 - a) * (engaged ? 1.5 : 1) * (1.3 - 0.6 * d.r('tackling'));
  return sim.dice('tackle', d).chance(1 / (1 + Math.exp(-(m - sep * GRIP_CLOSE) / sigma)));
}
export function whiffs(sim: PlaySim, d: Agent, c: Agent, limit: number, engaged: boolean, window: number): boolean {
  const m = whiffMargin(sim, d, c, limit, engaged, window);
  if (!WHIFF_MARGIN) return m > 0;
  const sup = d.body.support, a = sup ? availability(sup, supportParams(d.profile), fatigueFactor(d.body.energy)) : 1;
  const sigma = HAND_SIGMA * (2 - a) * (engaged ? 1.5 : 1) * (1.3 - 0.6 * d.r('tackling'));
  return sim.dice('tackle', d).chance(1 / (1 + Math.exp(-m / sigma)));
}
/** The reach's miss distance: + = the runner's body beyond the hands' reach (yd). */
export function whiffMargin(sim: PlaySim, d: Agent, c: Agent, limit: number, engaged: boolean, window: number): number {
  // The hands get there sooner the less they have to extend: a form tackle
  // at body distance is on him at once; a reach at full stretch takes the
  // whole window, in which the carrier can be gone.
  const body = c.profile.radius + d.profile.radius;
  const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
  const w = Math.max(0.08, window * clamp((dd - body) / Math.max(0.1, limit - body), 0, 1));
  const seenC = TRACK_TACKLE ? sim.track(d, c, 1, true) : sim.see(d, c);
  const aim = { x: seenC.pos.x + seenC.vel.x * w, y: seenC.pos.y + seenC.vel.y * w };
  const coast = { x: d.pos.x + d.vel.x * w, y: d.pos.y + d.vel.y * w };
  const redirect = 0.5 * d.profile.lateral * (engaged ? 0.3 : 1) * w * w;
  const ax = aim.x - coast.x, ay = aim.y - coast.y, al = Math.hypot(ax, ay);
  const k = al > redirect ? redirect / al : 1;
  const hands = { x: coast.x + ax * k, y: coast.y + ay * k };
  let cw = { x: c.pos.x + c.vel.x * w, y: c.pos.y + c.vel.y * w };
  const seenD = sim.see(c, d);
  const sees = Math.cos(shouldersOf(c.body) - Math.atan2(seenD.pos.y - c.pos.y, seenD.pos.x - c.pos.x)) > -0.2;
  if (sees && !sim.bond) {
    const tw = { x: seenD.pos.x + seenD.vel.x * w, y: seenD.pos.y + seenD.vel.y * w };
    const ex = cw.x - tw.x, ey = cw.y - tw.y, el = Math.hypot(ex, ey) || 1;
    const cut = 0.5 * c.profile.lateral * w * w;
    cw = { x: cw.x + ex / el * cut, y: cw.y + ey / el * cut };
  }
  return Math.hypot(cw.x - hands.x, cw.y - hands.y) - limit;
}

function attempt(sim: PlaySim, d: Agent, c: Agent, q: number, engaged: boolean, lunged: boolean, limit = Infinity, reached = false): void {
  const t = sim.t;
  // REACH_TIME: a reach takes time; it resolves on the bodies' actual geometry when the hands arrive (reachStep).
  if (REACH_TIME && !reached) {
    // He commits his arms when, by his picture, they will meet the man; otherwise he keeps his feet and closes.
    if (!lunged && !reachMeets(sim, d, c, engaged, limit)) return;
    startReach(sim, d, c, engaged, lunged, limit);
    return;
  }
  const rng = sim.dice('tackle', d);
  // Arms reach and recoil: one attempt per beat, not per physics tick.
  d.nextTackleAt = t + 0.5;
  const dx = c.pos.x - d.pos.x;
  const dy = c.pos.y - d.pos.y;
  const dd = Math.hypot(dx, dy);
  const nx = dx / (dd || 1);
  const ny = dy / (dd || 1);
  const cs = c.speed;
  const hx = cs > 0.5 ? c.vel.x / cs : 0;
  const hy = cs > 0.5 ? c.vel.y / cs : 0;
  // +1: carrier running straight into the defender; −1: defender from behind.
  const cosA = -(hx * nx + hy * ny);
  const closing = (d.vel.x - c.vel.x) * nx + (d.vel.y - c.vel.y) * ny;

  const T = d.r('tackling') * 0.85 + d.r('pursuit') * 0.15;
  const E = c.r('elusiveness');
  const P = c.r('breakTackle') * 0.7 + c.r('strength') * 0.3;
  const openField = sim.opponents(c).filter((o) => Math.hypot(o.pos.x - c.pos.x, o.pos.y - c.pos.y) < 4).length <= 1 ? 1 : 0;
  const alreadyWrapped = !!sim.bond;

  if (!alreadyWrapped && !reached) {
    // Whiff: a juke, a reach at full extension, or overrunning the angle.
    const overrun = clamp((d.speed - 6.5) / 3.5, 0, 1) * (cosA < 0.3 ? 1 : 0.4);
    // A QB in the pocket who sees the rusher coming can duck, spin or step up.
    const pocketQB = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
    const seesIt = pocketQB && Math.cos(shouldersOf(c.body) - Math.atan2(d.pos.y - c.pos.y, d.pos.x - c.pos.x)) > -0.2;
    const escape = pocketQB ? (seesIt ? 0.12 + 0.18 * c.r('elusiveness') + 0.08 * c.r('pocketPresence') : 0.03) : 0;
    const pMiss = clamp(0.02 + 0.2 * (E - T) * (0.5 + 0.5 * openField) + 0.07 * (1 - q) + 0.06 * overrun + (engaged ? 0.3 : 0) + (cs > 7 ? 0.02 : 0) + escape, 0.01, 0.6);
    if ((TKL_WHIFF && !pocketQB) || (POCKET_REACH && pocketQB) ? whiffs(sim, d, c, limit, engaged, REACH_WINDOW) : rng.chance(pMiss)) {
      d.missedTackles++;
      sim.stats.missedTackles++;
      sim.event('missed_tackle', d, c);
      // The reach committed his body: a lay-out leaves his feet, a lunge
      // leaves his base. Physics decides whether he stays up.
      if (lunged && q < 0.25) sim.diveAt(d, { x: dx, y: dy });
      else if (!engaged) commitLunge(d, nx, ny, q);
      return;
    }
  }

  if (GRAB_CONNECT && !reached && !alreadyWrapped && !grabConnects(sim, d, c, limit, engaged)) {
    d.missedTackles++;
    sim.stats.missedTackles++;
    sim.event('missed_tackle', d, c, 'grab did not connect');
    if (lunged && q < 0.25) sim.diveAt(d, { x: dx, y: dy });
    else if (!engaged) commitLunge(d, nx, ny, q);
    return;
  }

  // Fumble on contact: hit severity from the closing speed and the hitter's mass.
  const md = d.profile.massKg;
  const hit = clamp((Math.max(0, closing) / 7) * (md / 105) * (0.6 + 0.8 * d.r('hitPower')), 0, 2);
  const pFumble = (0.0035 + 0.016 * hit) * (1.25 - c.r('ballSecurity')) * (alreadyWrapped ? 1.6 : 1) * (c === sim.qb && sim.isPass && sim.throwAt < 0 ? 3.2 : 1);
  if (sim.dice('fumble', c).chance(pFumble)) {
    sim.event('hit', d, c);
    sim.fumble(c, d);
    return;
  }

  // How good a hold: body to body he wraps; at full extension, or with a hand
  // off a block, it is a grab. A slippery, powerful runner turns his hips so
  // the arms cannot lock. One execution draw per attempt.
  const base = clamp(0.25 + 0.85 * q - (engaged ? 0.3 : 0), 0.1, 1);
  // REACH_TIME: no execution draw and no rating contest; his skill is in his grip's capability (gripForce, the reel).
  const execution = REACH_TIME ? 1 : clamp((1 - 0.35 * clamp(0.5 * P + 0.5 * E - T, -1, 1)) * (TKL_EXEC_STATE ? 1 : Math.exp(0.3 * rng.normal(0, 1))), 0.2, 1.6);
  const quality = clamp(base * execution, 0.08, 1);
  // Where: good tacklers wrap the thighs; from behind they take the legs; a
  // reach off a block gets jersey; a lunge goes for the legs.
  const fromBehind = cosA < -0.3 ? 1 : 0;
  const aim = HOLD_AIM ? (lunged ? chooseAim(d, c.pos, c.vel, false, true) : aimFor.get(d)) : undefined;
  if (aim) aimFor.set(d, aim);
  const legs = aim ? clamp(aim.mean + rng.normal(0, aim.sd), 0, 1)
    : lunged ? clamp(0.75 + rng.normal(0, 0.15), 0.4, 1)
    : GRIP_REACH ? gripReach(rng, engaged, fromBehind === 1, d.r('tackling') * q)
    : clamp(0.1 + 0.55 * d.r('tackling') * q + 0.25 * fromBehind - (engaged ? 0.3 : 0) + rng.normal(0, 0.15), 0, 1);
  // Out of standing reach he has to lay out to get there. Within it he
  // strikes: the last step drives his body into the carrier's near hip, so
  // the wrap follows a collision instead of a reach at a passing runner.
  if (lunged) sim.diveAt(d, { x: dx, y: dy });
  else if (!engaged && !reached) strike(sim, d, c, d.r('tackling'));
  grasp(sim, d, c, quality, legs, dd, execution, lunged, `${lunged ? 'lunge' : engaged ? 'block' : q > 0.6 ? 'form' : 'reach'}${alreadyWrapped ? '+assist' : ''}${fromBehind ? '+behind' : ''}`,
    ONE_ARM_HOLD && engaged);
  sim.event('tackle_wrap', d, c, alreadyWrapped ? 'assist' : 'initial');
  if (closing > 4) sim.event('hit', d, c);
}

/** One explosive step at the carrier's hip: the extra velocity the legs add to
 * meet him a push-off from now, within what traction gives over that step. */
function strike(sim: PlaySim, d: Agent, c: Agent, skill: number): void {
  const PUSH_OFF = 0.2;
  const gx = c.pos.x - d.pos.x + (c.vel.x - d.vel.x) * PUSH_OFF;
  const gy = c.pos.y - d.pos.y + (c.vel.y - d.vel.y) * PUSH_OFF;
  const g = Math.hypot(gx, gy);
  const touch = 0.9 * (c.profile.radius + d.profile.radius);
  if (g <= touch) return;
  const most = TURF_MU * G * PUSH_OFF * (0.7 + 0.3 * skill);
  const dv = Math.min(most, (g - touch) / PUSH_OFF);
  sim.lungeAt(d, { x: gx / g * dv, y: gy / g * dv });
}

/** A tackler who reached and missed: his body went with his arms. */
function commitLunge(d: Agent, nx: number, ny: number, q: number): void {
  const sup = d.body.support;
  if (!sup) return;
  const extension = (1 - q) * (0.6 + 0.4 * clamp(d.speed / 7, 0, 1));
  // Leaning on a carrier who is not there: the world turns an unsupported
  // lean into lost balance on the next substep.
  const force = d.profile.massKg * G * 0.9 * extension;
  sup.lean = { x: sup.lean.x + nx * force, y: sup.lean.y + ny * force };
}

/** Create a tackler's hold on the carrier and join (or start) the bond.
 * `extended`: he caught him at full stretch on a dive, holding from the ground. */
function grasp(sim: PlaySim, d: Agent, c: Agent, quality: number, legs: number, dd: number, execution: number, extended = false, origin = '', oneArm = false): void {
  const wasEngaged = !!d.engagement;
  if (sim.firstContactX === null) {
    sim.firstContactX = c.pos.x;
    sim.event('carrier_contact', c, d, 'grasp');
  }
  // A defender committing to the carrier relinquishes his old block. Keeping
  // both constraints would hold the same body in two techniques. A one-armed
  // grab off a block (ONE_ARM_HOLD) is the exception: the blocker's hands
  // stay on him because he chose to tackle; he holds the runner with the
  // free arm while the block goes on, until he gets off it.
  if (d.engagement && !oneArm) sim.disengage(d.engagement);
  if (!sim.bond) {
    sim.bond = { carrier: c, tacklers: [], start: sim.t, progressX: c.pos.x, down: false, stalled: 0,
      grip: new Map(), control: new Map(), holds: new Map(), execution: new Map() };
  }
  const bond = sim.bond;
  bond.tacklers.push(d);
  // A standing hold keeps the arms' length; a diving catch adds his body
  // stretched along the ground toward the legs.
  const reach = reachTo(d, c, 0.9) + (extended ? 0.9 : 0);
  // He pulls himself into the runner: a sure tackler's arms reel faster.
  const pull = extended ? 0.6 : 1.2 + 1.2 * d.r('tackling');
  const joint: GraspJoint = { kind: 'grasp', a: d.body, b: c.body, reach: Math.max(reach, dd + 0.15), capacity: oneArm ? gripForce(d, quality, 0, 1) : gripForce(d, quality), lock: oneArm ? 0 : clamp(quality, 0, 1), legs, pull, hold: dd, origin,
    ground: extended ? Math.max(reach, dd + 0.15) : undefined };
  if (REACH_CONTACT && !extended && !wasEngaged && dd > c.profile.radius + d.profile.radius) {
    joint.brace = dd;
    joint.pull = 0;
  }
  (bond.grip ??= new Map()).set(d, quality);
  (bond.control ??= new Map()).set(d, quality);
  (bond.holds ??= new Map()).set(d, joint);
  (bond.execution ??= new Map()).set(d, execution);
  // A hold is one-armed for exactly as long as this grab: a later two-arm grab
  // in the same bond must not inherit an earlier grab's missing arm.
  if (oneArm) (bond.oneArm ??= new Set()).add(d);
  else bond.oneArm?.delete(d);
  sim.world.joints.push(joint);
}

/** The body-center distance a hold's arms amount to: at `CONTACT_SCALE`
 * of the radii the World reads a full wrap; never farther than the centers. */
function armDistance(joint: GraspJoint | undefined, centers: number, torso: number): number {
  return Math.min(centers, (joint?.hold ?? centers) + (1 - CONTACT_SCALE) * torso);
}

/** GRIP_REACH (experimental, off): where a tackler's hands land on the runner
 * (legs share: 0 shoulder line, 0.5 waist, 1 legs) is drawn from what he can
 * reach in his situation, not one formula clamped at the shoulders. Free and
 * square: chest to waist, lower (thighs) the better his form and approach;
 * from behind: waist, hips or legs; off a block: what one arm reaches at the
 * side (arm, waist, jersey). A draw outside the reach is drawn again, so no
 * situation piles up at an edge. An input to the hold's physics, not a
 * result: where the hands are, not whether the tackle holds. */
const GRIP_REACH = process.env.GRIP_REACH !== '0';
export function gripReach(rng: { normal(m: number, s: number): number }, engaged: boolean, fromBehind: boolean, form: number): number {
  const [mean, sd, lo, hi] = engaged ? [0.35, 0.12, 0.15, 0.6]
    : fromBehind ? [0.6 + 0.15 * form, 0.18, 0.35, 1]
    : [0.2 + 0.45 * form, 0.12, 0.15, 0.75];
  for (let i = 0; i < 8; i++) {
    const v = mean + rng.normal(0, sd);
    if (v >= lo && v <= hi) return v;
  }
  return clamp(mean, lo, hi);
}

/** HOLD_FINISH (experimental, off): the holder plants against the runner's
 * travel in proportion to his grip, and an upper grip sits at the height his
 * hands hold (shoulder line to waist). */
const HOLD_FINISH = process.env.HOLD_FINISH !== '0';
/** Experimental (HOLD_SINK=1, off): sink and drag. Beside or behind the runner
 * (the existing side/rear branch: the runner is not running into him), once
 * his hold is not slipping he stops running with the man: he asks to stop
 * along the runner's path and leans against the load (push), so his weight and
 * his feet's friction act against the runner instead of his legs adding to the
 * pair's momentum. Holding is not running with him: from the grasp his
 * request along the runner's path never exceeds the speed he already has there
 * (no delay: it is what his body does when it grabs, not a read of the
 * carrier). The committed sink is executed by skill: once his hands have held
 * (not slipping, read from his own hands) for his reaction time, longer for a
 * poor tackler (he has to know he has him), he commits as fully as his
 * tackling lets him (a poor one keeps half running). Until then, and while his
 * grip slips, HOLD_FINISH's request under that cap. Third design (2026-11-12):
 * attempts 1-2 left HOLD_FINISH's target, a speed to accelerate to, in charge
 * during the recognition delay. The World
 * decides the rest: a grip too weak for the anchor is torn off (a broken
 * tackle), and a holder already off his base regains it or hangs as the
 * physics has him; nothing forces a stance. Off, HOLD_FINISH commits his
 * weight by grip security, which ramps from the hold's quality, so when the
 * load arrives he still runs with the man at about half his speed (34 fast
 * game wraps: median 55% over the first 0.3 s; side-wrap-bench.mts: asking to
 * stop ends a side wrap in 2.5 yd and 0.5 s, running with him 3.7 yd). */
const HOLD_SINK = process.env.HOLD_SINK === '1';
/** HOLD_FACING (experimental, off): a holder beside or behind the runner faces
 * the way he is being carried, not square to the runner every tick. */
const HOLD_FACING = process.env.HOLD_FACING !== '0';
/** ROLL_AXIS (experimental, off; ROLL_AXIS=1 turns it on): a secure wrap's roll takes its axis from the runner's
 * travel blended into the attack direction by ROLL_AXIS_SPEED, continuously, instead of switching to the attack
 * direction below 0.3 yd/s. The commitment rule: a post-decision stage must not flip the request as a step function
 * of motion it causes. */
const ROLL_AXIS = process.env.ROLL_AXIS !== '0';
/** Runner speed at which his travel and the attack direction weigh equally in the roll axis (yd/s; choice: a walk). */
const ROLL_AXIS_SPEED = 1;
/** ROLL_AXIS's unit axis for a runner moving at `vel` attacking toward `dir` (±1): continuous in `vel`. */
export function rollAxis(vel: { x: number; y: number }, dir: number): { x: number; y: number } {
  const ax = vel.x + dir * ROLL_AXIS_SPEED, ay = vel.y, an = Math.hypot(ax, ay);
  return an > 1e-9 ? { x: ax / an, y: ay / an } : { x: dir, y: 0 };
}
/** Shoulder line as a share of stature (Flex's bench: 1.60 yd). */
const SHOULDER = 0.79;
/** Height of an upper hold, yd, for the runner's current posture: the shoulder
 * line at legs share 0, joining the World's default (COM · (1 − 0.55 legs))
 * at the waist (0.5). Undefined below the waist: the default stands. */
function upperHoldHeight(c: Agent, legs: number): number | undefined {
  const l = clamp(legs, 0, 1);
  if (l >= 0.5) return undefined;
  const sp = supportParams(c.profile), posture = c.body.support?.posture ?? 0;
  const com = comHeightAt(sp, posture), shoulder = SHOULDER * c.profile.heightYd * (comHeightAt(sp, posture) / sp.comHeight);
  return com * (1 - 0.55 * l) + (shoulder - com) * (1 - 2 * l);
}

/** Release every hold of the bond (fumble, whistle, carrier change). */
export function releaseBond(sim: PlaySim): void {
  const bond = sim.bond;
  if (!bond) return;
  const holds = new Set(bond.holds?.values() ?? []);
  sim.world.joints = sim.world.joints.filter((j) => !holds.has(j as GraspJoint));
  sim.bond = null;
}

/**
 * Before the physics step: drop broken holds, work grips toward a wrap as
 * the tacklers close, set every pile member's intent, and apply the
 * officiating rules that do not need the step (in the grasp, progress stopped).
 */
export function updateBond(sim: PlaySim, bond: TackleBond, intents: Intent[]): void {
  const c = bond.carrier;
  const t = sim.t;
  const dt = sim.dt;
  if (sim.carrier !== c || sim.ball.kind !== 'held') {
    releaseBond(sim);
    return;
  }
  const grip = (bond.grip ??= new Map());
  const holds = (bond.holds ??= new Map());
  const execution = (bond.execution ??= new Map());
  const control = (bond.control ??= new Map());
  for (const d of [...bond.tacklers]) {
    const joint = holds.get(d);
    if (joint && !joint.broken) continue;
    bond.tacklers = bond.tacklers.filter((x) => x !== d);
    holds.delete(d);
    grip.delete(d);
    control.delete(d);
    if (joint) sim.world.joints = sim.world.joints.filter((j) => j !== joint);
    d.nextTackleAt = Math.max(d.nextTackleAt, t + 0.3);
    sim.stats.brokenTackles++;
    // A one-armed grab made from inside a block (ONE_ARM_HOLD) that the runner
    // pulls through is counted apart: charting would usually call it a miss or
    // not chart it, so G1's missed + broken comparison uses open tackles only.
    const engagedGrab = bond.oneArm?.delete(d) ?? false;
    if (engagedGrab) sim.stats.brokenEngagedGrabs = (sim.stats.brokenEngagedGrabs ?? 0) + 1;
    sim.event('broken_tackle', c, d, engagedGrab ? 'engaged grab slipped' : 'hold slipped');
  }
  if (bond.tacklers.length === 0) {
    sim.bond = null;
    return;
  }
  const dir = sim.attackDir(c.team);
  for (const d of bond.tacklers) {
    const joint = holds.get(d)!;
    // Grip improves only with actual closing: an extended arm does not become
    // a body wrap because time passed.
    const distance = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    const torso = c.profile.radius + d.profile.radius;
    // How tight the hold is, by the arms' own span: a wrap on a trailing
    // leg is tight although the bodies' centers are a stride apart.
    const near = armDistance(joint, distance, torso);
    // A holder on the ground is stretched out behind his arms; the arms
    // themselves are as close as they were.
    const stretched = d.body.support?.state !== 'up' ? GROUND_STRETCH : 0;
    const quality = clamp(1 - (near - stretched - torso - 0.25) / Math.max(0.2, armSpan(d) - 0.25), 0, 1);
    const available = clamp(0.25 + 0.85 * quality, 0.1, 1) * (execution.get(d) ?? 1);
    const rate = Math.min(1, dt * (1 + 2.5 * d.r('tackling')));
    const g = grip.get(d) ?? available;
    const next = g < available ? g + (available - g) * rate : GRIP_HOLD ? g : available;
    grip.set(d, clamp(next, 0.05, 1));
    // Control follows the arms: a grip held at full stretch is strong but is
    // not a firm hold on the man for the officials or for him.
    const k = control.get(d) ?? g;
    const held = clamp(k < available ? k + (available - k) * rate : available, 0.05, 1);
    control.set(d, held);
    // A one-armed hold becomes a wrap only once his body has closed on the
    // carrier, so the second arm can come around.
    const oneArm = bond.oneArm?.has(d) ?? false;
    if (oneArm && !d.engagement && near - torso <= SECOND_ARM_CLOSE) bond.oneArm!.delete(d);
    // HOLD_FINISH: an upper hold is taken where his hands are, from the
    // shoulders (jersey, pads: legs share 0) down to the waist (0.5), not at
    // the runner's centre of mass, so a pull on it has its moment about his
    // base. Below the waist the World's own interpolation stands.
    if (HOLD_FINISH) joint.height = upperHoldHeight(c, joint.legs);
    joint.capacity = oneArm && bond.oneArm!.has(d) ? gripForce(d, clamp(next, 0.05, 1), 0, 1)
      : gripForce(d, clamp(next, 0.05, 1), Math.min(clamp(next, 0.05, 1), held));
    joint.lock = oneArm && bond.oneArm!.has(d) ? 0 : Math.min(clamp(next, 0.05, 1), held);
    // The lower-body share describes the acquired point's motion relative
    // to corrective support. Grip security limits transmitted load above;
    // it cannot move that point or change its geometric Jacobian.
    delete joint.recoveryCoupling;
    const tx = (c.pos.x - d.pos.x) / (distance || 1), ty = (c.pos.y - d.pos.y) / (distance || 1);
    const close = Math.min(1.5, Math.max(0, near - torso) * 3);
    const own = intents[d.idx];
    const cs = Math.hypot(c.vel.x, c.vel.y);
    // +1: the carrier is running into him; −1: he holds on from behind.
    const into = cs > 0.5 ? (c.vel.x * -tx + c.vel.y * -ty) / cs : 1;
    if (c.body.support?.state !== 'up') {
      // He is going down: stay on him.
      intents[d.idx] = { vel: { x: c.vel.x + tx * close, y: c.vel.y + ty * close }, facing: Math.atan2(ty, tx), push: 1, posture: 0.7, dive: own?.dive, lunge: own?.lunge };
    } else if (into > 0.3) {
      // In front of him: drive through the carrier, toward his own goal,
      // staying tight to the hold.
      intents[d.idx] = { vel: { x: -dir * 2.5 + tx * close, y: ty * close }, facing: Math.atan2(ty, tx), push: 1, posture: 0.7, dive: own?.dive, lunge: own?.lunge };
    } else {
      // Stay with an extended reach to close it. As actual body proximity and
      // the acquired grip permit a wrap, plant rather than keep matching the
      // runner's speed forever. This is a requested finish, not a stop impulse:
      // ground traction, grip load and balance decide whether it is achieved.
      // Brake along the loaded hold, retaining the runner's perpendicular
      // motion. Braking across an extended side hold would mostly swing the
      // holder around his arms, rather than establish useful rear leverage.
      const plant = Math.max(0, c.vel.x * tx + c.vel.y * ty) * quality * clamp(next, 0, 1);
      let vel = { x: c.vel.x + tx * (close - plant), y: c.vel.y + ty * (close - plant) };
      // HOLD_FINISH (experimental, off): with a hold, he commits his weight
      // against the runner's travel, not only along his arms: he sits and
      // drags as hard as his grip lets him. Beside the runner the line of his
      // arms is across the runner's path, so the plant above asks for almost
      // nothing and he runs along with his hands on the man. He reads it from
      // his own hands (how hard he holds); the runner's speed is the load the
      // plant puts on that grip, and the World decides whether the grip
      // survives it: a weak grip that plants may be torn off (a broken tackle).
      // While his hold is slipping (his hands at their limit last step) he
      // gives with it and keeps his feet with the runner instead of sitting:
      // a trailing man who grabs a runner going by would otherwise sit while
      // being ripped through his hands. He sits again once it holds.
      if (HOLD_SINK && cs > 0.5) {
        // Sink and drag: once his hands have held (not slipping) for as long
        // as it takes him to know he has the man -- his reaction time, longer
        // for a poor tackler -- he commits as fully as his tackling lets him
        // sink. Until then: his weight by his grip's security; while the grip
        // slips he gives with it (commitment 0).
        const since = (bond.sink ??= new Map());
        if (joint.slipping) since.delete(d); else if (!since.has(d)) since.set(d, t);
        const knows = since.has(d) && t - since.get(d)! >= d.profile.reactionTime * (1.5 - d.r('tackling'));
        const full = 0.6 + 0.4 * d.r('tackling');
        const commit = joint.slipping ? 0 : knows ? Math.max(full, clamp(next, 0, 1)) : clamp(next, 0, 1);
        const ux = c.vel.x / cs, uy = c.vel.y / cs;
        // Holding is not running with him: from the grasp his request along
        // the runner's path never exceeds the speed he already has there.
        // (HOLD_FINISH's request, the runner's speed x (1 - grip security), is
        // a target he would accelerate to after a grab from beside or from a
        // slower trail.) Across the path he stays tight to the hold.
        const own = Math.max(0, d.vel.x * ux + d.vel.y * uy);
        // Sunk (he knows he has him): his own speed less what he commits.
        const along = knows && !joint.slipping ? Math.min(own, cs) * (1 - commit) : Math.min(own, cs * (1 - commit));
        vel = { x: ux * along + tx * close, y: uy * along + ty * close };
      } else if (HOLD_FINISH && cs > 0.5) {
        const ux = c.vel.x / cs, uy = c.vel.y / cs, commit = joint.slipping ? 0 : clamp(next, 0, 1);
        vel = { x: c.vel.x - ux * cs * commit + tx * close, y: c.vel.y - uy * cs * commit + ty * close };
      }
      // Planted on a secure hold of his legs and still dragged, he drops his
      // weight and hangs on: off his feet he can no longer chase, but half
      // his weight then hangs on the runner's legs (the World decides what
      // that binds). He reads it from his own body and arms: where they are
      // on the man, how secure they are, and that after a plant he is still
      // carried along faster than he asks to go.
      const secure = clamp(next, 0, 1) * quality;
      const dragged = (d.vel.x - vel.x) * tx + (d.vel.y - vel.y) * ty > 1;
      const drop = d.body.support?.state === 'up' && joint.legs >= 0.35 && secure >= 0.6
        && t - bond.start >= 0.4 && dragged;
      // HOLD_FACING (experimental, off): holding a runner going past him, he
      // does not re-aim his chest at the runner every tick (a pirouette the
      // grasp's own moment never asks for). He asks to keep the facing he
      // has; the runner turns him through the hold and the contacts, as far
      // as the World's yaw response gives.
      const facing = HOLD_FACING ? d.body.facing : Math.atan2(ty, tx);
      intents[d.idx] = { vel, facing, push: 1, posture: 0.6,
        dive: drop ? { x: tx * 0.2, y: ty * 0.2 } : own?.dive, lunge: own?.lunge };
    }
    if (TACKLE_TOUCH && (own?.lunge || d.body.support?.strike)
      && c.body.support?.state === 'up' && d.body.support?.state === 'up'
      && distance > torso + .15) {
      // An acquired hand must not replace approach footwork with pile braking
      // while the committed strike is still driving the body. Keep the actual
      // cached command; contacts and ground limits determine what it achieves.
      intents[d.idx] = { ...intents[d.idx], vel: { ...own.vel },
        cutSkill: own.cutSkill, effort: own.effort };
    }
  }
  // A tight, secure wrap on an upright carrier finishes by rolling him, not
  // by matching or out-pushing him. The holder sits his weight down against
  // the carrier's travel and turns away across it, so the wrap pulls the
  // carrier's hips sideways while his held legs limit the step that would
  // catch him. Ground, grip and balance decide whether he goes down; a loose
  // or extended hold is unchanged.
  if (c.body.support?.state === 'up') for (const d of bond.tacklers) {
    const torso = c.profile.radius + d.profile.radius;
    const distance = armDistance(holds.get(d), Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y), torso);
    const quality = clamp(1 - (distance - torso - 0.25) / Math.max(0.2, armSpan(d) - 0.25), 0, 1);
    const secure = clamp(grip.get(d) ?? 0, 0, 1) * quality;
    if (d.body.support?.state !== 'up' || distance > torso + .15 || secure < .5) continue;
    const cs = Math.hypot(c.vel.x, c.vel.y);
    // ROLL_AXIS: the axis is his travel blended continuously into the attack direction as he slows, not a switch at
    // 0.3 yd/s. At a walk the runner's velocity direction swings with every push of the roll itself, so the holder's
    // side of it (and his roll) flipped every tick.
    const { x: ux, y: uy } = ROLL_AXIS ? rollAxis(c.vel, dir) : cs > .3 ? { x: c.vel.x / cs, y: c.vel.y / cs } : { x: dir, y: 0 };
    // Across his travel, toward the holder's own side. A square-on holder has
    // no side to roll him over: the sideways part grows with the holder's
    // actual lateral offset, so a square wrap only sits down (and mirrored
    // plays stay mirrored, with no tie-break).
    const lateral = (d.pos.x - c.pos.x) * -uy + (d.pos.y - c.pos.y) * ux;
    const roll = Math.sign(lateral) * clamp(Math.abs(lateral) / .15, 0, 1) * 1.5 * secure;
    const own = intents[d.idx];
    intents[d.idx] = { ...own, vel: { x: c.vel.x * (1 - secure) - uy * roll, y: c.vel.y * (1 - secure) + ux * roll }, push: 1 };
  }
  // The carrier keeps his legs driving where his vision takes him.
  const own = intents[c.idx];
  intents[c.idx] = { ...own, push: 1, posture: Math.max(own.posture ?? 0, 0.5) };

  // In the grasp: a quarterback held firmly behind the line before he throws
  // is ruled down at once (the rule protects him).
  const held = t - bond.start;
  // A passer whose arm is already coming forward gets the pass off.
  const delivering = sim.deliveryAt >= 0 && t >= sim.deliveryAt;
  const pocketQB = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled && !delivering;
  const inGrasp = pocketQB && (GRASP_JEOPARDY
    ? c.body.support?.state === 'falling' && bond.tacklers.some((d) => (control.get(d) ?? 0) >= 0.6)
    : held >= 0.25 && bond.tacklers.some((d) => (control.get(d) ?? grip.get(d) ?? 0) >= 0.6));
  // A running carrier is not down merely because the arms held for seconds.
  // Upright tackles require stopped progress; physical falls are checked below.
  if (inGrasp || (bond.stalled ?? 0) >= STALL) whistleDown(sim, bond);
}

/** After the physics step: forward progress, and down by contact. */
export function afterStep(sim: PlaySim): void {
  const c = sim.carrier;
  if (!c || sim.phase !== 'live') return;
  const bond = sim.bond && sim.bond.carrier === c ? sim.bond : null;
  const dir = sim.attackDir(c.team);
  if (bond) {
    const before = bond.progressX;
    bond.progressX = dir > 0 ? Math.max(bond.progressX, c.pos.x) : Math.min(bond.progressX, c.pos.x);
    // Forward progress is stopped when a firmly held pile stops gaining ground.
    const firm = bond.tacklers.some((d) => (bond.control?.get(d) ?? bond.grip?.get(d) ?? 0) >= 0.4);
    bond.stalled = firm && Math.abs(bond.progressX - before) <= 0.5 * sim.dt ? (bond.stalled ?? 0) + sim.dt : 0;
  }
  const sup = c.body.support;
  if (sup?.state === 'down' && (bond || sim.t - (sim.touchedAt.get(c) ?? -Infinity) <= 1.0)) {
    if (bond) whistleDown(sim, bond);
    else downSpot(sim, c, null);
  }
}

function whistleDown(sim: PlaySim, bond: TackleBond): void {
  if (bond.down) return;
  bond.down = true;
  downSpot(sim, bond.carrier, bond);
}

/** Spot the ball where he went down, or at his forward progress if he was driven back. */
function downSpot(sim: PlaySim, c: Agent, bond: TackleBond | null): void {
  const dir = sim.attackDir(c.team);
  const sup = c.body.support;
  // A falling carrier carries the ball out ahead of his body.
  const reach = sup && sup.state !== 'up' ? 0.3 : 0;
  const ballX = c.pos.x + (sup?.fall.x ?? 0) * reach;
  // A score needs the ball across the plane while he is still live.
  const capped = dir > 0 ? Math.min(ballX, OPP_GOAL_X - 0.05) : Math.max(ballX, OWN_GOAL_X + 0.05);
  const x = bond ? (dir > 0 ? Math.max(bond.progressX, capped) : Math.min(bond.progressX, capped)) : capped;
  sim.finishCarry('tackle', { x, y: c.pos.y });
}

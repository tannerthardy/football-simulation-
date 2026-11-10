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
import { OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import { G } from '../core/units.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { comHeightAt, supportParams, TURF_MU } from '../physics/support.js';
import { CONTACT_SCALE, GROUND_STRETCH, type GraspJoint, type Intent } from '../physics/world.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';
import { contactQuality, previewTackleWindow } from './tackle-window.js';

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
/** Experimental (ENGAGED_REACH=1, off): an engaged defender's reach for the
 * carrier is the arm from his free shoulder, not a share of his reach. The free
 * shoulder is the one away from his blocker; the arm is his reach less the
 * shoulder's offset from his centre (both from the reach law in physical.ts:
 * 0.25 yd + 0.85 arm). The blocker's control (+1 = inside hands latched) takes
 * that share of the arm away, so a man the blocker has well controlled cannot
 * reach the carrier, and one who controls the blocker keeps his whole arm.
 * Off, he reaches 0.4 of his reach, or 0.7 − 0.3 control on his free side:
 * a blocked man 1–2 yd from the carrier is out of range by rule (in range on
 * 17% of ticks, docs/reviews/2026-11-10-blocked-defender-plan.md, piece 1).
 * Who may reach (free side or win ≥ 0.6) is unchanged. */
const ENGAGED_REACH = process.env.ENGAGED_REACH === '1';
/** Shoulder offset from the body centre in the reach law (physical.ts), yd. */
const SHOULDER_OFFSET = 0.25;

/** ENGAGED_REACH: the centre-distance an engaged defender's free arm covers to
 * this carrier (comparable with the body-centre distance, as `arms` is). */
export function engagedArms(d: Agent, c: Agent): number {
  const e = d.engagement!, b = e.blocker;
  const fx = Math.cos(d.body.facing), fy = Math.sin(d.body.facing), px = -fy, py = fx;
  const side = (b.pos.x - d.pos.x) * px + (b.pos.y - d.pos.y) * py >= 0 ? -1 : 1;
  const sx = d.pos.x + px * side * SHOULDER_OFFSET, sy = d.pos.y + py * side * SHOULDER_OFFSET;
  const gap = Math.hypot(c.pos.x - sx, c.pos.y - sy) - c.profile.radius;
  const arm = Math.max(0, d.profile.reach - SHOULDER_OFFSET) * (1 - clamp(e.control, 0, 1));
  return Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) - gap + arm;
}
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

export function tryTackles(sim: PlaySim): void {
  const c = sim.carrier;
  if (!c || sim.ball.kind !== 'held') return;
  const t = sim.t;
  for (const d of sim.opponents(c)) {
    if (d.isDown(t) || t < d.nextTackleAt) continue;
    if (sim.bond && sim.bond.tacklers.includes(d)) continue;
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
    const arms = ENGAGED_REACH && engaged ? engagedArms(d, c) : body + d.profile.reach * (engaged ? freeArm : 1.0);
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
      const closing = -((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
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
        const look = (.12 + .12 * (1 - d.r('awareness'))) / Math.max(.1, d.profile.reactionTime);
        const seen = sim.see(d, c, look);
        // tryTackles follows physics. Perception was sampled at tick start;
        // dead-reckon only its stale velocity to this body-state boundary.
        const elapsed = clamp(sim.world.time - sim.t, 0, sim.dt);
        const observed = { ...seen, pos: { x: seen.pos.x + seen.vel.x * elapsed,
          y: seen.pos.y + seen.vel.y * elapsed } };
        const window = previewTackleWindow(d, observed, sim.intents[d.idx], body, arms, sim.world.time);
        if (window) {
          // Compare two estimates from the same observation. Actual reach and
          // the resulting grip still use current physical geometry below.
          waitForBetter = window.futureQuality > window.currentQuality + .1;
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
      attempt(sim, d, c, q, engaged, dd > arms, dd > arms ? range : arms);
      if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
      continue;
    }
    // Escaping carrier just out of reach: lay out for his legs. The dive is a
    // real fall; whether he trips the carrier is the hold and the physics.
    const dive = range + 0.3;
    const separating = ((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
    const behind = (d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y < 0;
    if (!engaged && dd <= dive && separating > 1.6 && behind && !sim.bond && !occluded(sim, d, c)) {
      d.nextTackleAt = t + 1;
      sim.diveAt(d, { x: dx, y: dy });
      const p = 0.22 + 0.3 * d.r('tackling') - 0.15 * c.r('elusiveness') - 0.1 * c.r('balance');
      if (TKL_WHIFF ? !whiffs(sim, d, c, dive, false, DIVE_WINDOW) : sim.dice('tackle', d).chance(Math.max(0.05, p))) {
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
/** Hand strike, extension to contact (model assumption, s). */
const REACH_WINDOW = 0.2;
/** Layout from the launch to full extension (model assumption, s). */
const DIVE_WINDOW = 0.3;
export function whiffs(sim: PlaySim, d: Agent, c: Agent, limit: number, engaged: boolean, window: number): boolean {
  // The hands get there sooner the less they have to extend: a form tackle
  // at body distance is on him at once; a reach at full stretch takes the
  // whole window, in which the carrier can be gone.
  const body = c.profile.radius + d.profile.radius;
  const dd = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
  const w = Math.max(0.08, window * clamp((dd - body) / Math.max(0.1, limit - body), 0, 1));
  const seenC = sim.see(d, c);
  const aim = { x: seenC.pos.x + seenC.vel.x * w, y: seenC.pos.y + seenC.vel.y * w };
  const coast = { x: d.pos.x + d.vel.x * w, y: d.pos.y + d.vel.y * w };
  const redirect = 0.5 * d.profile.lateral * (engaged ? 0.3 : 1) * w * w;
  const ax = aim.x - coast.x, ay = aim.y - coast.y, al = Math.hypot(ax, ay);
  const k = al > redirect ? redirect / al : 1;
  const hands = { x: coast.x + ax * k, y: coast.y + ay * k };
  let cw = { x: c.pos.x + c.vel.x * w, y: c.pos.y + c.vel.y * w };
  const seenD = sim.see(c, d);
  const sees = Math.cos(c.body.facing - Math.atan2(seenD.pos.y - c.pos.y, seenD.pos.x - c.pos.x)) > -0.2;
  if (sees && !sim.bond) {
    const tw = { x: seenD.pos.x + seenD.vel.x * w, y: seenD.pos.y + seenD.vel.y * w };
    const ex = cw.x - tw.x, ey = cw.y - tw.y, el = Math.hypot(ex, ey) || 1;
    const cut = 0.5 * c.profile.lateral * w * w;
    cw = { x: cw.x + ex / el * cut, y: cw.y + ey / el * cut };
  }
  return Math.hypot(cw.x - hands.x, cw.y - hands.y) > limit;
}

function attempt(sim: PlaySim, d: Agent, c: Agent, q: number, engaged: boolean, lunged: boolean, limit = Infinity): void {
  const t = sim.t;
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

  if (!alreadyWrapped) {
    // Whiff: a juke, a reach at full extension, or overrunning the angle.
    const overrun = clamp((d.speed - 6.5) / 3.5, 0, 1) * (cosA < 0.3 ? 1 : 0.4);
    // A QB in the pocket who sees the rusher coming can duck, spin or step up.
    const pocketQB = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
    const seesIt = pocketQB && Math.cos(c.body.facing - Math.atan2(d.pos.y - c.pos.y, d.pos.x - c.pos.x)) > -0.2;
    const escape = pocketQB ? (seesIt ? 0.12 + 0.18 * c.r('elusiveness') + 0.08 * c.r('pocketPresence') : 0.03) : 0;
    const pMiss = clamp(0.02 + 0.2 * (E - T) * (0.5 + 0.5 * openField) + 0.07 * (1 - q) + 0.06 * overrun + (engaged ? 0.3 : 0) + (cs > 7 ? 0.02 : 0) + escape, 0.01, 0.6);
    if (TKL_WHIFF && !pocketQB ? whiffs(sim, d, c, limit, engaged, REACH_WINDOW) : rng.chance(pMiss)) {
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
  const execution = clamp((1 - 0.35 * clamp(0.5 * P + 0.5 * E - T, -1, 1)) * Math.exp(0.3 * rng.normal(0, 1)), 0.2, 1.6);
  const quality = clamp(base * execution, 0.08, 1);
  // Where: good tacklers wrap the thighs; from behind they take the legs; a
  // reach off a block gets jersey; a lunge goes for the legs.
  const fromBehind = cosA < -0.3 ? 1 : 0;
  const legs = lunged ? clamp(0.75 + rng.normal(0, 0.15), 0.4, 1)
    : GRIP_REACH ? gripReach(rng, engaged, fromBehind === 1, d.r('tackling') * q)
    : clamp(0.1 + 0.55 * d.r('tackling') * q + 0.25 * fromBehind - (engaged ? 0.3 : 0) + rng.normal(0, 0.15), 0, 1);
  // Out of standing reach he has to lay out to get there. Within it he
  // strikes: the last step drives his body into the carrier's near hip, so
  // the wrap follows a collision instead of a reach at a passing runner.
  if (lunged) sim.diveAt(d, { x: dx, y: dy });
  else if (!engaged) strike(sim, d, c, d.r('tackling'));
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
  const reach = c.profile.radius + d.profile.radius + d.profile.reach * 0.9 + (extended ? 0.9 : 0);
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
    const quality = clamp(1 - (near - stretched - torso - 0.25) / Math.max(0.2, d.profile.reach - 0.25), 0, 1);
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
      if (HOLD_FINISH && cs > 0.5) {
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
      intents[d.idx] = { vel, facing: Math.atan2(ty, tx), push: 1, posture: 0.6,
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
    const quality = clamp(1 - (distance - torso - 0.25) / Math.max(0.2, d.profile.reach - 0.25), 0, 1);
    const secure = clamp(grip.get(d) ?? 0, 0, 1) * quality;
    if (d.body.support?.state !== 'up' || distance > torso + .15 || secure < .5) continue;
    const cs = Math.hypot(c.vel.x, c.vel.y);
    const ux = cs > .3 ? c.vel.x / cs : dir, uy = cs > .3 ? c.vel.y / cs : 0;
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

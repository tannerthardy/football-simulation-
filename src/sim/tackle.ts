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
import { supportParams, TURF_MU } from '../physics/support.js';
import { GROUND_STRETCH, type GraspJoint, type Intent } from '../physics/world.js';
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
  /** Each tackler's grasp joint in the world. */
  holds?: Map<Agent, GraspJoint>;
  /** Execution draw for each hold (median 1): technique and footing on this rep. */
  execution?: Map<Agent, number>;
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
export function gripForce(d: Agent, quality: number): number {
  const q = clamp(quality, 0, 1);
  return supportParams(d.profile).armForce * (0.3 + 2.5 * q * q) * (0.6 + 0.6 * d.r('tackling'));
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
    if (engaged && d.engagement!.win < 0.6) continue;
    const body = c.profile.radius + d.profile.radius;
    const arms = body + d.profile.reach * (engaged ? 0.4 : 1.0);
    // A free tackler can lunge for the last half yard by committing his body;
    // a miss then leaves him off his base.
    const range = arms + (engaged ? 0 : 0.45);
    if (dd <= range && !occluded(sim, d, c)) {
      // Contact quality: 1 = body to body (form tackle), 0 = fingertips / lunge.
      const q = contactQuality(dd, body, arms);
      // A tackler reaches when he is in position to wrap, or when this is
      // the best shot the visible relative trajectory offers (a runner
      // passing or pulling away). While he is still closing on a better
      // shot he keeps his feet running; an assist takes whatever it gets.
      const closing = -((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
      // Beyond standing reach he only lays out when the carrier is pulling
      // away from him; otherwise he keeps running his feet. No opportunity
      // forecast is needed when this attempt is already disallowed.
      if (dd > arms && closing > -1.5) continue;
      const vx = c.vel.x - d.vel.x, vy = c.vel.y - d.vel.y;
      const closestAt = clamp(-(dx * vx + dy * vy) / Math.max(0.01, vx * vx + vy * vy), 0, 0.3);
      const closest = Math.hypot(dx + vx * closestAt, dy + vy * closestAt);
      let futureQuality = contactQuality(closest, body, arms);
      let waitingQuality = q;
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
          futureQuality = window.futureQuality;
          // Compare two estimates from the same observation. Actual reach and
          // the resulting grip still use current physical geometry below.
          waitingQuality = window.currentQuality;
          if (sim.trace.data) sim.trace.decide({ t: sim.t, a: d.idx,
            kind: 'tackle-opportunity',
            chose: futureQuality > waitingQuality + .1 ? 'keep feet moving' : 'attempt current opportunity',
            cue: 'delayed carrier motion and attainable movement',
            options: ['keep feet moving', 'attempt current opportunity'],
            detail: `Observed wrap quality ${waitingQuality.toFixed(2)}; best attainable decision sample ${futureQuality.toFixed(2)} at ${window.closestAt.toFixed(2)} s. Held movement command; future cuts and contacts are unknown.` });
        }
      }
      if (!sim.bond && q < form && futureQuality > waitingQuality + 0.1) continue;
      attempt(sim, d, c, q, engaged, dd > arms);
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
      if (sim.rng.chance(Math.max(0.05, p))) {
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

function attempt(sim: PlaySim, d: Agent, c: Agent, q: number, engaged: boolean, lunged: boolean): void {
  const t = sim.t;
  const rng = sim.rng;
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
    if (rng.chance(pMiss)) {
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
  if (rng.chance(pFumble)) {
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
    : clamp(0.1 + 0.55 * d.r('tackling') * q + 0.25 * fromBehind - (engaged ? 0.3 : 0) + rng.normal(0, 0.15), 0, 1);
  // Out of standing reach he has to lay out to get there. Within it he
  // strikes: the last step drives his body into the carrier's near hip, so
  // the wrap follows a collision instead of a reach at a passing runner.
  if (lunged) sim.diveAt(d, { x: dx, y: dy });
  else if (!engaged) strike(sim, d, c, d.r('tackling'));
  grasp(sim, d, c, quality, legs, dd, execution, lunged, `${lunged ? 'lunge' : engaged ? 'block' : q > 0.6 ? 'form' : 'reach'}${alreadyWrapped ? '+assist' : ''}${fromBehind ? '+behind' : ''}`);
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
function grasp(sim: PlaySim, d: Agent, c: Agent, quality: number, legs: number, dd: number, execution: number, extended = false, origin = ''): void {
  if (sim.firstContactX === null) {
    sim.firstContactX = c.pos.x;
    sim.event('carrier_contact', c, d, 'grasp');
  }
  // A defender committing to the carrier relinquishes his old block. Keeping
  // both constraints would hold the same body in two techniques.
  if (d.engagement) sim.disengage(d.engagement);
  if (!sim.bond) {
    sim.bond = { carrier: c, tacklers: [], start: sim.t, progressX: c.pos.x, down: false, stalled: 0,
      grip: new Map(), holds: new Map(), execution: new Map() };
  }
  const bond = sim.bond;
  bond.tacklers.push(d);
  // A standing hold keeps the arms' length; a diving catch adds his body
  // stretched along the ground toward the legs.
  const reach = c.profile.radius + d.profile.radius + d.profile.reach * 0.9 + (extended ? 0.9 : 0);
  // He pulls himself into the runner: a sure tackler's arms reel faster.
  const pull = extended ? 0.6 : 1.2 + 1.2 * d.r('tackling');
  const joint: GraspJoint = { kind: 'grasp', a: d.body, b: c.body, reach: Math.max(reach, dd + 0.15), capacity: gripForce(d, quality), legs, pull, hold: dd, origin,
    ground: extended ? Math.max(reach, dd + 0.15) : undefined };
  (bond.grip ??= new Map()).set(d, quality);
  (bond.holds ??= new Map()).set(d, joint);
  (bond.execution ??= new Map()).set(d, execution);
  sim.world.joints.push(joint);
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
  for (const d of [...bond.tacklers]) {
    const joint = holds.get(d);
    if (joint && !joint.broken) continue;
    bond.tacklers = bond.tacklers.filter((x) => x !== d);
    holds.delete(d);
    grip.delete(d);
    if (joint) sim.world.joints = sim.world.joints.filter((j) => j !== joint);
    d.nextTackleAt = Math.max(d.nextTackleAt, t + 0.3);
    sim.stats.brokenTackles++;
    sim.event('broken_tackle', c, d, 'hold slipped');
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
    // A holder on the ground is stretched out behind his arms; the arms
    // themselves are as close as they were.
    const stretched = d.body.support?.state !== 'up' ? GROUND_STRETCH : 0;
    const quality = clamp(1 - (distance - stretched - torso - 0.25) / Math.max(0.2, d.profile.reach - 0.25), 0, 1);
    const available = clamp(0.25 + 0.85 * quality, 0.1, 1) * (execution.get(d) ?? 1);
    const g = grip.get(d) ?? available;
    const next = g < available ? g + (available - g) * Math.min(1, dt * (1 + 2.5 * d.r('tackling'))) : available;
    grip.set(d, clamp(next, 0.05, 1));
    joint.capacity = gripForce(d, clamp(next, 0.05, 1));
    const tx = (c.pos.x - d.pos.x) / (distance || 1), ty = (c.pos.y - d.pos.y) / (distance || 1);
    const close = Math.min(1.5, Math.max(0, distance - torso) * 3);
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
      // Beside or behind him: digging in against a runner's momentum only
      // tears the grip. Run with him and work up to a wrap; once the arms
      // are locked, drop the weight on him and let him carry it.
      // He lets his legs go where the runner pulls him: no launch.
      const locked = next >= 0.55 && cs > 2;
      const drop = locked ? { x: c.vel.x / cs * 0.01, y: c.vel.y / cs * 0.01 } : undefined;
      intents[d.idx] = { vel: { x: c.vel.x + tx * close, y: c.vel.y + ty * close }, facing: Math.atan2(ty, tx), push: 1, posture: 0.6,
        dive: own?.dive ?? drop, lunge: own?.lunge };
    }
  }
  // The carrier keeps his legs driving where his vision takes him.
  const own = intents[c.idx];
  intents[c.idx] = { ...own, push: 1, posture: Math.max(own.posture ?? 0, 0.5) };

  // In the grasp: a quarterback held firmly behind the line before he throws
  // is ruled down at once (the rule protects him).
  const held = t - bond.start;
  const pocketQB = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
  const inGrasp = pocketQB && held >= 0.25 && bond.tacklers.some((d) => (grip.get(d) ?? 0) >= 0.6);
  if (inGrasp || held > 4 || (bond.stalled ?? 0) >= STALL) whistleDown(sim, bond);
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
    const firm = bond.tacklers.some((d) => (bond.grip?.get(d) ?? 0) >= 0.4);
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

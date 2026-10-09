/**
 * Tackling.
 *
 * A defender within arm's reach of the carrier attempts a tackle. The attempt
 * can whiff (elusiveness vs. tackling, angle, open field), be broken
 * (breakTackle/mass vs. tackling, arm tackles), or wrap. A wrap forms a
 * tackle bond (see updateBond): tacklers hold with a grip and apply stopping
 * force, the carrier keeps driving with his legs; impact momentum is exchanged
 * on contact. Yards after contact, gang tackles and piles emerge. Fumbles roll from hit power vs. ball security.
 */
import { OPP_GOAL_X, OWN_GOAL_X } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { movementDemand, type MoveCommand } from '../physics/kinematics.js';
import { advanceGrasps, applyGroupImpulse, contactGroup, groupVelocity, type GraspLink } from '../physics/contact.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export interface TackleBond {
  carrier: Agent;
  tacklers: Agent[];
  start: number;
  /** Forward-progress spot (max x for the offense, min x for a defensive returner). */
  progressX: number;
  down: boolean;
  /** Each tackler's hold: 0 = fingertips, 1 = a locked wrap. A missing entry is a locked wrap. */
  grip?: Map<Agent, number>;
  /** How far the carrier's base has been taken away; he is down at 1. */
  topple?: number;
  /** This pile's technique and footing, drawn once (median 1). */
  toppleRate?: number;
  /** Seconds since the pile last gained ground: the whistle comes when forward progress stops. */
  stalled?: number;
  /** Last step's explicit foot impulse/work, in kg/yard/second units. */
  physics?: { externalImpulse: Vec2; groundWork: number };
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
    // The bounded prototype requires actual standing arm reach. The default
    // keeps its prior lunge approximation pending physical support/lean work.
    const range = arms + (!sim.experimentalGrasps && !engaged && t >= 0.6 ? 0.45 : 0);
    if (dd <= range && !occluded(sim, d, c)) {
      // Contact quality: 1 = body to body (form tackle), 0 = fingertips / lunge.
      const q = clamp(1 - (dd - body - 0.25) / Math.max(0.2, arms - body - 0.25), 0, 1);
      // Wait only if the visible relative trajectory actually offers a better
      // shot. Closing distance alone also describes a glancing fly-by.
      const closing = -((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
      const patience = 0.35 + 0.4 * d.r('tackling');
      const vx = c.vel.x-d.vel.x, vy = c.vel.y-d.vel.y;
      const closestAt = clamp(-(dx*vx+dy*vy)/Math.max(.01,vx*vx+vy*vy),0,.25);
      const closest = Math.hypot(dx+vx*closestAt,dy+vy*closestAt);
      const futureQuality = clamp(1-(closest-body-.25)/Math.max(.2,arms-body-.25),0,1);
      if (q < patience && closing > 1.0 && futureQuality >= patience && !sim.bond) continue;
      attempt(sim, d, c, q, engaged);
      if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
      continue;
    }
    // Escaping carrier just out of reach: lay out for a diving / shoestring tackle.
    const dive = range + 0.3;
    const separating = ((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
    const behind = (d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y < 0;
    if (!engaged && dd <= dive && separating > 1.6 && behind && !sim.bond && !occluded(sim,d,c)) {
      d.nextTackleAt = t + 1;
      d.downUntil = t + 0.7;
      const p = 0.22 + 0.3 * d.r('tackling') - 0.15 * c.r('elusiveness') - 0.1 * c.r('balance');
      if (sim.rng.chance(Math.max(0.05, p))) {
        if (sim.firstContactX === null) sim.firstContactX = c.pos.x;
        // Tripped up: the carrier stumbles forward a step and goes down.
        const fall = Math.min(1.5, c.speed * 0.2);
        const sp = c.speed || 1;
        const spot = { x: c.pos.x + (c.vel.x / sp) * fall, y: c.pos.y + (c.vel.y / sp) * fall };
        sim.bond = { carrier: c, tacklers: [d], start: t, progressX: sim.attackDir(c.team) > 0 ? Math.max(c.pos.x, spot.x) : Math.min(c.pos.x, spot.x), down: true };
        sim.event('hit', d, c, 'diving tackle');
        c.downUntil = t + 1;
        sim.finishCarry('tackle', { x: sim.bond.progressX, y: spot.y });
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

function attempt(sim: PlaySim, d: Agent, c: Agent, q: number, engaged: boolean): void {
  const t = sim.t;
  const rng = sim.rng;
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
  const B = c.r('balance');
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
      d.downUntil = t + rng.range(0.1, 0.25) + 0.45 * (1 - q) * rng.next();
      sim.event('missed_tackle', d, c);
      return;
    }
  }

  // A whiff is not contact. Body bumps are recorded by the collision solver;
  // a successful reach/wrap or a broken grasp also starts contact here.
  if (sim.firstContactX === null) sim.firstContactX = c.pos.x;

  // Impact: momentum exchange along the contact normal.
  const mc = c.profile.massKg;
  const md = d.profile.massKg;
  if (closing > 1.5) {
    const dv = (md / (mc + md)) * closing * 0.75;
    c.body.vel = { x: c.vel.x + nx * dv, y: c.vel.y + ny * dv };
    d.body.vel = { x: d.vel.x - nx * dv * mc / md, y: d.vel.y - ny * dv * mc / md };
  }

  if (!alreadyWrapped) {
    const armTackle = q < 0.5 || engaged;
    const pBreak = clamp(
      0.02 + 0.2 * (P - T) + 0.1 * ((mc - md) / mc) + (armTackle ? 0.05 : 0) + 0.03 * (1 - q) + (cosA < -0.3 ? 0.03 : 0) + 0.06 * (B - 0.5) - (closing > 4 ? 0.05 : 0),
      0.01,
      0.5,
    );
    if (rng.chance(pBreak)) {
      sim.stats.brokenTackles++;
      d.downUntil = t + rng.range(0.3, 0.8);
      c.body.vel = { x: c.vel.x * 0.75, y: c.vel.y * 0.75 };
      c.slowUntil = t + 0.3;
      c.slowFactor = 0.8;
      sim.event('broken_tackle', c, d);
      return;
    }
  }

  // Fumble on contact.
  const hit = clamp((Math.max(0, closing) / 7) * (md / 105) * (0.6 + 0.8 * d.r('hitPower')), 0, 2);
  const pFumble = (0.0035 + 0.016 * hit) * (1.25 - c.r('ballSecurity')) * (alreadyWrapped ? 1.6 : 1) * (c === sim.qb && sim.isPass && sim.throwAt < 0 ? 3.2 : 1);
  if (rng.chance(pFumble)) {
    sim.event('hit', d, c);
    sim.fumble(c, d);
    return;
  }

  // A defender committing to the carrier relinquishes his old block. Keeping
  // both constraints would move the same body in two separate solvers.
  if (d.engagement) sim.disengage(d.engagement);
  if (sim.bond) {
    sim.bond.tacklers.push(d);
  } else {
    sim.bond = { carrier: c, tacklers: [d], start: t, progressX: c.pos.x, down: false, topple: 0, stalled: 0, toppleRate: Math.exp(0.35 * rng.normal(0, 1)) };
  }
  // How well he holds on: body to body he wraps; at full extension, or with a
  // hand off a block, it is a grab he has to work into a wrap.
  const grip = clamp(0.25 + 0.85 * q - (engaged ? 0.3 : 0), 0.1, 1);
  (sim.bond.grip ??= new Map()).set(d, grip);
  // Contact couples the bodies inelastically — fully for a wrap, partly for a
  // grab (the tackler is dragged). Blending every body toward the shared
  // centre-of-mass velocity by the same fraction conserves momentum and
  // cannot add kinetic energy.
  const bodies = [c,...sim.bond.tacklers];
  const mass = bodies.reduce((sum,a)=>sum+a.profile.massKg,0);
  const shared = {x:bodies.reduce((sum,a)=>sum+a.vel.x*a.profile.massKg,0)/mass,
    y:bodies.reduce((sum,a)=>sum+a.vel.y*a.profile.massKg,0)/mass};
  for(const a of bodies) a.body.vel=grip>=1?{...shared}:{x:a.vel.x+(shared.x-a.vel.x)*grip,y:a.vel.y+(shared.y-a.vel.y)*grip};
  sim.event('tackle_wrap', d, c, alreadyWrapped ? 'assist' : 'initial');
  if (closing > 4) sim.event('hit', d, c);
}

/** Rate at which held tacklers take a carrier's base away (per second, for equal power). */
const TOPPLE = 0.8;
/** Seconds a pile can go without gaining ground before forward progress is ruled stopped. */
const STALL = 0.8;

/**
 * Advance the tackle bond one tick.
 *
 * Tacklers hold with a grip that a sure tackler works from a grab into a wrap.
 * Held tacklers slow the pile — hardest from in front of the carrier, where
 * they can drive through him; from the side or behind they are weight he
 * drags — while he drives his legs. He goes down when they have taken his
 * base away (their grip and power against his balance) or when the pile stops
 * gaining ground, and falls forward if he is still moving forward.
 */
export function updateBond(sim: PlaySim, bond: TackleBond, cmds: MoveCommand[]): void {
  if (sim.experimentalGrasps) { updateBoundedBond(sim, bond, cmds); return; }
  const c = bond.carrier;
  const t = sim.t;
  const dt = sim.dt;
  bond.tacklers = bond.tacklers.filter((d) => !d.isDown(t));
  if (bond.tacklers.length === 0 || sim.carrier !== c) {
    sim.bond = null;
    return;
  }
  const grip = (bond.grip ??= new Map());
  const hold = (d: Agent) => grip.get(d) ?? 1;
  const dir = sim.attackDir(c.team);
  const want = cmds[c.idx]?.vel ?? { x: dir, y: 0 };
  const wl = Math.hypot(want.x, want.y) || 1;
  const ux = want.x / wl;
  const uy = want.y / wl;

  const bodies = [c, ...bond.tacklers];
  const group = contactGroup(bodies.map(a => a.body));
  const common = groupVelocity(group);
  // The default pile remains a coupled-body approximation. Its common motion
  // must come from every participant, never the carrier alone.
  const sp = Math.hypot(common.x, common.y);
  const fx = sp > 0.5 ? common.x / sp : ux;
  const fy = sp > 0.5 ? common.y / sp : uy;
  let stop = 0;
  let lever = 0;
  for (const d of bond.tacklers) {
    const ox = d.pos.x - c.pos.x;
    const oy = d.pos.y - c.pos.y;
    const front = (ox * fx + oy * fy) / (Math.hypot(ox, oy) || 1);
    const g = hold(d);
    stop += g * d.profile.power * (0.55 + 0.6 * d.r('tackling')) * (0.75 + 0.25 * Math.max(0, front));
    lever += g * d.profile.power * (0.4 + 0.6 * d.r('tackling'));
  }
  const drive = c.profile.power * (0.45 + 0.4 * c.r('breakTackle') + 0.15 * c.r('balance'));
  const mass = c.profile.massKg + bond.tacklers.reduce((sum,d)=>sum+d.profile.massKg,0);

  // Net deceleration on the carrier's current velocity, plus leg drive along his intent.
  const decel = (stop * 9) / mass;
  const legs = (drive * 3.2) / mass;
  let nsp = Math.max(0, sp - decel * dt);
  let vx = sp > 1e-6 ? (common.x / sp) * nsp : 0;
  let vy = sp > 1e-6 ? (common.y / sp) * nsp : 0;
  // Leg drive can only keep a pile moving, not accelerate it beyond ~2 yd/s.
  const pushCap = clamp(2.2 * (drive / (stop + 1)) - 0.3, 0, 2.2);
  const along = vx * ux + vy * uy;
  if (along < pushCap) {
    const add = Math.min(pushCap - along, legs * dt);
    vx += ux * add;
    vy += uy * add;
  }
  nsp = Math.hypot(vx, vy);
  // Coupling removes internal relative kinetic energy, conserving momentum.
  // Ground drive/resistance then supplies the explicit external impulse.
  for (const a of bodies) a.body.vel = { ...common };
  const impulse = { x: (vx - common.x) * mass, y: (vy - common.y) * mass };
  bond.physics = { externalImpulse: impulse, groundWork: applyGroupImpulse(group, impulse) };
  for (const a of bodies) a.body.pos = { x: a.pos.x + a.vel.x * dt, y: a.pos.y + a.vel.y * dt };
  // No automatic position pull-in: tightening requires actual foot/contact
  // work. The bounded-grasp prototype supplies that controller separately.
  // Hands work a grab into a wrap: a sure tackler in about a third of a second.
  for (const d of bond.tacklers) {
    const g = hold(d);
    grip.set(d, g + (1 - g) * Math.min(1, dt * (1 + 2.5 * d.r('tackling'))));
  }

  // Forward progress.
  const before = bond.progressX;
  bond.progressX = dir > 0 ? Math.max(bond.progressX, c.pos.x) : Math.min(bond.progressX, c.pos.x);
  bond.stalled = Math.abs(bond.progressX - before) > 0.5 * dt ? 0 : (bond.stalled ?? 0) + dt;

  const held = t - bond.start;
  const n = bond.tacklers.length;
  // Solo tackle from behind by a weak tackler: the carrier can still slip out,
  // more easily from a grab than from a wrap.
  if (n === 1 && held > 0.15 && held < 0.9) {
    const d = bond.tacklers[0];
    const pFree = dt * 1.1 * (1.3 - hold(d)) * clamp(c.r('breakTackle') * 0.6 + c.r('balance') * 0.4 - d.r('tackling') + 0.15, 0, 1);
    if (sim.rng.chance(pFree)) {
      sim.stats.brokenTackles++;
      d.downUntil = t + 0.6;
      sim.bond = null;
      sim.event('broken_tackle', c, d);
      return;
    }
  }
  // Taking his base away: the tacklers' hold and power against his balance.
  // A carrier still moving fast is easier to trip or spin off his feet.
  const resist = c.profile.power * (0.6 + 0.8 * c.r('balance'));
  const speedUp = 1 + 0.25 * Math.max(0, nsp - 2);
  bond.topple = (bond.topple ?? 0) + dt * TOPPLE * (bond.toppleRate ?? 1) * speedUp * (lever / Math.max(1e-12, resist));
  // In the grasp: a quarterback held firmly behind the line before he throws is
  // ruled down at once (the rule protects him; set to throw, he has no base anyway).
  const pocketQB = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
  const inGrasp = pocketQB && held >= 0.25 && bond.tacklers.some((d) => hold(d) >= 0.6);
  if (bond.topple >= 1 || bond.stalled >= STALL || held > 4 || inGrasp) {
    bond.down = true;
    for (const d of bond.tacklers) d.downUntil = t + 0.8;
    c.downUntil = t + 1.0;
    // Going down while still moving forward, he falls forward with the ball
    // (short of the goal line: a score needs the carrier himself to cross it).
    const forward = Math.max(0, vx * dir);
    const fall = Math.min(0.75, 0.25 * forward);
    const x = dir > 0 ? Math.max(bond.progressX, Math.min(c.pos.x + fall, OPP_GOAL_X - 0.05)) : Math.min(bond.progressX, Math.max(c.pos.x - fall, OWN_GOAL_X + 0.05));
    const spot: Vec2 = { x, y: c.pos.y };
    sim.finishCarry('tackle', spot);
  }
}

/** Experimental bounded contact/controller path; not enabled by default. */
function updateBoundedBond(sim: PlaySim, bond: TackleBond, cmds: MoveCommand[]): void {
  const c = bond.carrier;
  const t = sim.t;
  const dt = sim.dt;
  bond.tacklers = bond.tacklers.filter((d) => !d.isDown(t));
  if (bond.tacklers.length === 0 || sim.carrier !== c) {
    sim.bond = null;
    return;
  }
  const grip = (bond.grip ??= new Map());
  const hold = (d: Agent) => grip.get(d) ?? 1;
  const dir = sim.attackDir(c.team);
  const want = cmds[c.idx]?.vel ?? { x: dir, y: 0 };
  const wl = Math.hypot(want.x, want.y) || 1;
  const ux = want.x / wl;
  const uy = want.y / wl;

  const bodies = [c, ...bond.tacklers];
  const common = groupVelocity(contactGroup(bodies.map(a => a.body)));
  const sp = Math.hypot(common.x, common.y);
  const fx = sp > 0.5 ? common.x / sp : ux;
  const fy = sp > 0.5 ? common.y / sp : uy;
  let stop = 0;
  const stopping = new Map<Agent, number>();
  for (const d of bond.tacklers) {
    const ox = d.pos.x - c.pos.x;
    const oy = d.pos.y - c.pos.y;
    const front = (ox * fx + oy * fy) / (Math.hypot(ox, oy) || 1);
    const g = hold(d);
    const force = g * d.profile.power * (0.55 + 0.6 * d.r('tackling')) * (0.75 + 0.25 * Math.max(0, front));
    stop += force; stopping.set(d, force);
  }
  const drive = c.profile.power * (0.45 + 0.4 * c.r('breakTackle') + 0.15 * c.r('balance'));
  const mass = c.profile.massKg + bond.tacklers.reduce((sum,d)=>sum+d.profile.massKg,0);

  const physics = bond.physics = { externalImpulse: { x: 0, y: 0 }, groundWork: 0 };
  const groundImpulse = (a: Agent, impulse: Vec2) => {
    physics.groundWork += applyGroupImpulse(contactGroup([a.body]), impulse);
    physics.externalImpulse.x += impulse.x; physics.externalImpulse.y += impulse.y;
  };
  // Foot resistance acts on the bracing defender, not remotely on every
  // member of the pile. Passive grasp impulses transmit that load afterwards.
  // A stationary defender cannot reverse his motion through drag alone.
  for (const d of bond.tacklers) {
    const along = d.vel.x * fx + d.vel.y * fy;
    const amount = Math.min(stopping.get(d)! * 9 * dt, d.profile.massKg * Math.max(0, along));
    // Once hands are on the runner, work the feet with his motion and close
    // the remaining body gap. Seeking his current center alone trails a fast
    // carrier; contact supplies immediate local relative-motion feedback.
    const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, distance = Math.hypot(dx, dy);
    const bodyGap = Math.max(0, distance - c.profile.radius - d.profile.radius);
    const closing = Math.min(d.profile.shuffle * d.profile.vmax, bodyGap * 5);
    const command = { vel: { x: c.vel.x + dx / (distance || 1) * closing,
      y: c.vel.y + dy / (distance || 1) * closing }, facing: Math.atan2(dy, dx) };
    const demand = movementDemand(d.body, command, dt);
    const moving = 1 - hold(d);
    const impulse = { x: demand.impulse.x * moving - fx * amount, y: demand.impulse.y * moving - fy * amount };
    // Working into a wrap and bracing share one finite foot-force envelope.
    const capacity = d.profile.power * (9.81 / 0.9144) * dt;
    const size = Math.hypot(impulse.x, impulse.y), scale = size > capacity ? capacity / size : 1;
    groundImpulse(d, { x: impulse.x * scale, y: impulse.y * scale });
    d.body.facing = demand.facing;
    d.body.energy += (demand.energy - d.body.energy) * moving * scale;
  }
  const legs = (drive * 3.2) / mass;
  const afterStop = groupVelocity(contactGroup(bodies.map(a => a.body)));
  // Leg drive can only keep a pile moving, not accelerate it beyond ~2 yd/s.
  const pushCap = clamp(2.2 * (drive / (stop + 1)) - 0.3, 0, 2.2);
  const along = afterStop.x * ux + afterStop.y * uy;
  if (along < pushCap) {
    const add = Math.min(pushCap - along, legs * dt);
    groundImpulse(c, { x: ux * add * mass, y: uy * add * mass });
  }
  const links: GraspLink[] = bond.tacklers.map(d => ({ a: c.body, b: d.body,
    maxDistance: c.profile.radius + d.profile.radius + d.profile.reach,
    // Passive arm/wrap load is distinct from grounded push power: a player
    // can be dragged with his feet moving and still maintain a grasp.
    // This compact structural limit is a model assumption, not measured NFL force.
    forceCapacity: d.profile.massKg * (9.81 / 0.9144) * (0.5 + 2.5 * d.r('strength')) * hold(d),
    // Hands try to stick immediately; the finite structural impulse budget
    // determines how much motion can actually be arrested. Grip quality is
    // a load capacity, not a timer prescribing velocity convergence.
    dampingRate: 0, locked: true }));
  const slipped = advanceGrasps(bodies.map(a => a.body), links, dt);
  bond.tacklers = bond.tacklers.filter((d, i) => {
    if (!slipped.has(links[i])) return true;
    grip.delete(d); d.nextTackleAt = Math.max(d.nextTackleAt, t + 0.2);
    sim.stats.brokenTackles++; sim.event('broken_tackle', c, d, 'grasp exceeded reach/load');
    return false;
  });
  if (!bond.tacklers.length) { sim.bond = null; return; }
  // Improvement requires actual closing contact. An extended arm cannot
  // become a body wrap merely because time passed.
  for (const d of bond.tacklers) {
    const g = hold(d);
    const distance = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    const torso = c.profile.radius + d.profile.radius;
    const quality = clamp(1 - (distance - torso - 0.25) / Math.max(0.2, d.profile.reach - 0.25), 0, 1);
    const available = clamp(0.25 + 0.85 * quality, 0.1, 1);
    grip.set(d, Math.min(available, g + Math.max(0, available - g) * Math.min(1, dt * (1 + 2.5 * d.r('tackling')))));
  }

  // Forward progress.
  const before = bond.progressX;
  bond.progressX = dir > 0 ? Math.max(bond.progressX, c.pos.x) : Math.min(bond.progressX, c.pos.x);
  bond.stalled = Math.abs(bond.progressX - before) > 0.5 * dt ? 0 : (bond.stalled ?? 0) + dt;

  const held = t - bond.start;
  const n = bond.tacklers.length;
  // Solo tackle from behind by a weak tackler: the carrier can still slip out,
  // more easily from a grab than from a wrap.
  if (n === 1 && held > 0.15 && held < 0.9) {
    const d = bond.tacklers[0];
    const pFree = dt * 1.1 * (1.3 - hold(d)) * clamp(c.r('breakTackle') * 0.6 + c.r('balance') * 0.4 - d.r('tackling') + 0.15, 0, 1);
    if (sim.rng.chance(pFree)) {
      sim.stats.brokenTackles++;
      d.downUntil = t + 0.6;
      sim.bond = null;
      sim.event('broken_tackle', c, d);
      return;
    }
  }
  // Taking his base away: the tacklers' hold and power against his balance.
  // A carrier still moving fast is easier to trip or spin off his feet.
  const resist = c.profile.power * (0.6 + 0.8 * c.r('balance'));
  const lever = bond.tacklers.reduce((sum, d) => sum + hold(d) * d.profile.power * (0.4 + 0.6 * d.r('tackling')), 0);
  const speedUp = 1 + 0.25 * Math.max(0, c.speed - 2);
  bond.topple = (bond.topple ?? 0) + dt * TOPPLE * (bond.toppleRate ?? 1) * speedUp * (lever / Math.max(1e-12, resist));
  // In the grasp: a quarterback held firmly behind the line before he throws is
  // ruled down at once (the rule protects him; set to throw, he has no base anyway).
  const pocketQB = c === sim.qb && sim.isPass && sim.throwAt < 0 && !sim.scrambled;
  const inGrasp = pocketQB && held >= 0.25 && bond.tacklers.some((d) => hold(d) >= 0.6);
  if (bond.topple >= 1 || bond.stalled >= STALL || held > 4 || inGrasp) {
    bond.down = true;
    for (const d of bond.tacklers) d.downUntil = t + 0.8;
    c.downUntil = t + 1.0;
    // Going down while still moving forward, he falls forward with the ball
    // (short of the goal line: a score needs the carrier himself to cross it).
    const forward = Math.max(0, c.vel.x * dir);
    const fall = Math.min(0.75, 0.25 * forward);
    const x = dir > 0 ? Math.max(bond.progressX, Math.min(c.pos.x + fall, OPP_GOAL_X - 0.05)) : Math.min(bond.progressX, Math.max(c.pos.x - fall, OWN_GOAL_X + 0.05));
    const spot: Vec2 = { x, y: c.pos.y };
    sim.finishCarry('tackle', spot);
  }
}

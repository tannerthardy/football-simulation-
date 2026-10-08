/**
 * Tackling.
 *
 * A defender within arm's reach of the carrier attempts a tackle. The attempt
 * can whiff (elusiveness vs. tackling, angle, open field), be broken
 * (breakTackle/mass vs. tackling, arm tackles), or wrap. A wrap forms a
 * tackle bond: tacklers apply stopping force, the carrier keeps driving with
 * his legs; impact momentum is exchanged on contact. Yards after contact,
 * gang tackles and piles emerge. Fumbles roll from hit power vs. ball security.
 */
import { clamp, type Vec2 } from '../core/vec.js';
import type { MoveCommand } from '../physics/kinematics.js';
import type { Agent } from './agent.js';
import type { PlaySim } from './playsim.js';

export interface TackleBond {
  carrier: Agent;
  tacklers: Agent[];
  start: number;
  /** Forward-progress spot (max x for the offense, min x for a defensive returner). */
  progressX: number;
  down: boolean;
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
    // A blocked defender can only reach out for the carrier if he's working off the block.
    if (engaged && d.engagement!.win < 0.4) continue;
    const body = c.profile.radius + d.profile.radius;
    const arms = body + d.profile.reach * (engaged ? 0.4 : 1.0);
    // Beyond full extension a defender can still lunge (low-quality arm tackle)
    // — once the line has cleared, not in the scrum at the snap.
    const range = arms + (engaged || t < 0.6 ? 0 : 0.45);
    if (dd <= range && !occluded(sim, d, c)) {
      // Contact quality: 1 = body to body (form tackle), 0 = fingertips / lunge.
      const q = clamp(1 - (dd - body - 0.25) / Math.max(0.2, arms - body - 0.25), 0, 1);
      // Closing (carrier still coming): a good tackler waits for a better shot.
      const closing = -((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
      const patience = 0.35 + 0.4 * d.r('tackling');
      if (q < patience && closing > 1.0 && !sim.bond) continue;
      attempt(sim, d, c, q, engaged);
      if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
      continue;
    }
    // Escaping carrier just out of reach: lay out for a diving / shoestring tackle.
    const dive = range + 0.3;
    const separating = ((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / (dd || 1);
    const behind = (d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y < 0;
    if (!engaged && dd <= dive && separating > 1.6 && behind && !sim.bond) {
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

  if (sim.firstContactX === null) sim.firstContactX = c.pos.x;

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
    const pMiss = clamp(0.02 + 0.2 * (E - T) * (0.5 + 0.5 * openField) + 0.07 * (1 - q) + 0.06 * overrun + (engaged ? 0.15 : 0) + (cs > 7 ? 0.02 : 0) + escape, 0.01, 0.6);
    if (rng.chance(pMiss)) {
      d.missedTackles++;
      sim.stats.missedTackles++;
      d.downUntil = t + rng.range(0.1, 0.25) + 0.45 * (1 - q) * rng.next();
      c.body.vel = { x: c.vel.x * 0.9, y: c.vel.y * 0.9 };
      sim.event('missed_tackle', d, c);
      return;
    }
  }

  // Impact: momentum exchange along the contact normal.
  const mc = c.profile.massKg;
  const md = d.profile.massKg;
  if (closing > 1.5) {
    const dv = (md / (mc + md)) * closing * 0.75;
    c.body.vel = { x: c.vel.x + nx * dv, y: c.vel.y + ny * dv };
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

  if (sim.bond) {
    sim.bond.tacklers.push(d);
  } else {
    sim.bond = { carrier: c, tacklers: [d], start: t, progressX: c.pos.x, down: false };
  }
  if (closing > 4) sim.event('hit', d, c);
}

/** Advance the tackle bond one tick. */
export function updateBond(sim: PlaySim, bond: TackleBond, cmds: MoveCommand[]): void {
  const c = bond.carrier;
  const t = sim.t;
  const dt = sim.dt;
  bond.tacklers = bond.tacklers.filter((d) => !d.isDown(t));
  if (bond.tacklers.length === 0 || sim.carrier !== c) {
    sim.bond = null;
    return;
  }
  const dir = sim.attackDir(c.team);
  const want = cmds[c.idx]?.vel ?? { x: dir, y: 0 };
  const wl = Math.hypot(want.x, want.y) || 1;
  const ux = want.x / wl;
  const uy = want.y / wl;

  let stop = 0;
  for (const d of bond.tacklers) stop += d.profile.power * (0.55 + 0.6 * d.r('tackling'));
  const drive = c.profile.power * (0.45 + 0.4 * c.r('breakTackle') + 0.15 * c.r('balance'));
  const mc = c.profile.massKg;

  // Net deceleration on the carrier's current velocity, plus leg drive along his intent.
  const sp = c.speed;
  const decel = (stop * 9) / mc;
  const legs = (drive * 3.2) / mc;
  let nsp = Math.max(0, sp - decel * dt);
  let vx = sp > 1e-6 ? (c.vel.x / sp) * nsp : 0;
  let vy = sp > 1e-6 ? (c.vel.y / sp) * nsp : 0;
  // Leg drive can only keep a pile moving, not accelerate it beyond ~2 yd/s.
  const pushCap = clamp(2.2 * (drive / (stop + 1)) - 0.3, 0, 2.2);
  const along = vx * ux + vy * uy;
  if (along < pushCap) {
    const add = Math.min(pushCap - along, legs * dt);
    vx += ux * add;
    vy += uy * add;
  }
  nsp = Math.hypot(vx, vy);
  c.body.vel = { x: vx, y: vy };
  c.body.pos = { x: c.pos.x + vx * dt, y: c.pos.y + vy * dt };
  for (const d of bond.tacklers) {
    const ox = d.pos.x - c.pos.x;
    const oy = d.pos.y - c.pos.y;
    const ol = Math.hypot(ox, oy) || 1;
    // The tackler closes onto the carrier at a physical rate (no snapping).
    const sep = (c.profile.radius + d.profile.radius) * 0.8;
    const cur = Math.max(sep, ol - 4.5 * dt);
    d.body.pos = { x: c.pos.x + (ox / ol) * cur, y: c.pos.y + (oy / ol) * cur };
    d.body.vel = { x: vx, y: vy };
  }

  // Forward progress.
  bond.progressX = dir > 0 ? Math.max(bond.progressX, c.pos.x) : Math.min(bond.progressX, c.pos.x);

  const held = t - bond.start;
  const n = bond.tacklers.length;
  const skill = bond.tacklers.reduce((s, d) => s + d.r('tackling'), 0) / n;
  // Solo tackle from behind by a weak tackler: the carrier can still slip out.
  if (n === 1 && held > 0.15 && held < 0.9) {
    const d = bond.tacklers[0];
    const pFree = dt * 1.1 * clamp(c.r('breakTackle') * 0.6 + c.r('balance') * 0.4 - d.r('tackling') + 0.15, 0, 1);
    if (sim.rng.chance(pFree)) {
      sim.stats.brokenTackles++;
      d.downUntil = t + 0.6;
      sim.bond = null;
      sim.event('broken_tackle', c, d);
      return;
    }
  }
  const pDown = dt * (1.2 + 1.6 * skill) * (0.6 + 0.4 * n) + (nsp < 0.9 && held > 0.25 ? dt * 5 : 0);
  if (sim.rng.chance(pDown) || held > 3) {
    bond.down = true;
    for (const d of bond.tacklers) d.downUntil = t + 0.8;
    c.downUntil = t + 1.0;
    const spot: Vec2 = { x: bond.progressX, y: c.pos.y };
    sim.finishCarry('tackle', spot);
  }
}

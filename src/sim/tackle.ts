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
  void t;
  // Ball just caught/handed: allow a beat to secure (prevents same-tick tackles).
  for (const d of sim.opponents(c)) {
    if (d.isDown(t) || t < d.nextTackleAt) continue;
    if (sim.bond && sim.bond.tacklers.includes(d)) continue;
    const dx = c.pos.x - d.pos.x;
    const dy = c.pos.y - d.pos.y;
    const dd = Math.hypot(dx, dy);
    const engaged = !!d.engagement;
    // A blocked defender can only reach out for the carrier if he's working off the block.
    if (engaged && d.engagement!.win < 0.4) continue;
    // A defender who is square and under control has his full wrap range.
    const square = !engaged && d.speed < 5.5 && Math.cos(d.body.facing - Math.atan2(c.pos.y - d.pos.y, c.pos.x - d.pos.x)) > 0.5;
    const reach = c.profile.radius + d.profile.radius + d.profile.reach * (engaged ? 0.35 : square ? 0.8 : 0.6);
    if (dd > reach) {
      // Carrier sliding past a square defender: lunge (arm tackle).
      const lunge = reach + 0.45;
      if (square && dd <= lunge && t >= d.nextTackleAt) {
        attempt(sim, d, c, dd, true);
        if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
        continue;
      }
      // Escaping carrier just out of reach: lay out for a diving / shoestring tackle.
      const dive = c.profile.radius + d.profile.radius + d.profile.reach + 0.55;
      const separating = ((c.vel.x - d.vel.x) * (c.pos.x - d.pos.x) + (c.vel.y - d.vel.y) * (c.pos.y - d.pos.y)) / (dd || 1);
      // Last-ditch only: the carrier is pulling away and the defender is trailing.
      const behind = ((d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y) < 0;
      if (!engaged && dd <= dive && separating > 1.2 && behind && !sim.bond) {
        d.nextTackleAt = sim.t + 1;
        d.downUntil = sim.t + 0.7;
        const p = 0.12 + 0.3 * d.r('tackling') - 0.2 * c.r('elusiveness') - 0.15 * c.r('balance');
        if (sim.rng.chance(Math.max(0.03, p))) {
          if (sim.firstContactX === null) sim.firstContactX = c.pos.x;
          // Tripped up: the carrier stumbles forward a step and goes down.
          const fall = Math.min(1.5, c.speed * 0.2);
          const sp = c.speed || 1;
          const spot = { x: c.pos.x + (c.vel.x / sp) * fall, y: c.pos.y + (c.vel.y / sp) * fall };
          sim.bond = { carrier: c, tacklers: [d], start: sim.t, progressX: sim.attackDir(c.team) > 0 ? Math.max(c.pos.x, spot.x) : Math.min(c.pos.x, spot.x), down: true };
          sim.event('hit', d, c, 'diving tackle');
          c.downUntil = sim.t + 1;
          sim.finishCarry('tackle', { x: sim.bond.progressX, y: spot.y });
          return;
        } else {
          d.missedTackles++;
          sim.stats.missedTackles++;
          sim.event('missed_tackle', d, c, 'dive');
        }
      }
      continue;
    }
    attempt(sim, d, c, dd, engaged);
    if (sim.ball.kind !== 'held' || sim.phase !== 'live') return;
  }
}

function attempt(sim: PlaySim, d: Agent, c: Agent, dd: number, engaged: boolean): void {
  const t = sim.t;
  const rng = sim.rng;
  d.nextTackleAt = t + 0.5;
  const nx = (c.pos.x - d.pos.x) / (dd || 1);
  const ny = (c.pos.y - d.pos.y) / (dd || 1);
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
    // Whiff: a juke or the defender overrunning the angle.
    const overrun = clamp((d.speed - 6) / 4, 0, 1) * (cosA < 0.3 ? 1 : 0.3);
    const pMiss = clamp(0.07 + 0.32 * (E - T) * (0.5 + 0.5 * openField) + 0.08 * overrun + (engaged ? 0.3 : 0) + (cs > 6 ? 0.03 : 0), 0.02, 0.6);
    if (rng.chance(pMiss)) {
      d.missedTackles++;
      sim.stats.missedTackles++;
      d.downUntil = t + rng.range(0.25, 0.7);
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
    const armTackle = dd > c.profile.radius + d.profile.radius + 0.35 || engaged;
    const pBreak = clamp(
      0.05 + 0.32 * (P - T) + 0.18 * ((mc - md) / mc) + (armTackle ? 0.16 : 0) + (cosA < -0.3 ? 0.05 : 0) + 0.08 * (B - 0.5) - (closing > 4 ? 0.06 : 0),
      0.02,
      0.55,
    );
    if (rng.chance(pBreak)) {
      sim.stats.brokenTackles++;
      d.downUntil = t + rng.range(0.4, 0.9);
      c.body.vel = { x: c.vel.x * 0.72, y: c.vel.y * 0.72 };
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
    const sep = (c.profile.radius + d.profile.radius) * 0.8;
    d.body.pos = { x: c.pos.x + (ox / ol) * sep, y: c.pos.y + (oy / ol) * sep };
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

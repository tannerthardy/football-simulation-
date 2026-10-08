/**
 * Special teams.
 *
 * Place kicks use real ball physics: launch speed from the kicker's leg,
 * elevation, end-over-end drag, wind, and a direction error from accuracy;
 * the kick is good if the ball crosses the goal plane above the crossbar and
 * inside the uprights. Punts use the punter's leg for distance/hang time.
 * Kickoffs follow the 2025 dynamic-kickoff rules (landing zone between the
 * goal line and the 20; touchback to the 35; short kicks to the 40).
 * Returns are resolved from returner and coverage quality.
 */
import type { Rng } from '../core/rng.js';
import { CROSSBAR_HEIGHT, UPRIGHT_HALF_WIDTH } from '../core/field.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { DRAG_KICK, stepFlight, type BallFlight } from '../physics/ball.js';
import { derivePhysical } from '../players/physical.js';
import { r01, type Player } from '../players/types.js';
import type { Team } from '../league/team.js';

export interface FieldGoalResult {
  good: boolean;
  blocked: boolean;
  /** 'left' | 'right' | 'short' when missed. */
  miss?: 'left' | 'right' | 'short';
  distance: number;
}

/** Attempt a place kick of `distance` yards (spot to goal posts). */
export function kickFieldGoal(rng: Rng, kicker: Player, distance: number, wind: Vec2 = { x: 0, y: 0 }, pressure = 0): FieldGoalResult {
  const pow = r01(kicker.ratings.kickPower);
  const acc = r01(kicker.ratings.kickAccuracy);
  const comp = r01(kicker.ratings.composure);
  if (rng.chance(0.012 + 0.004 * Math.max(0, distance - 40) / 10)) return { good: false, blocked: true, distance };
  const v0 = (25.5 + 7.5 * pow) * (1 + rng.normal(0, 0.015));
  // Long kicks are struck flatter to get distance.
  const elev = ((distance > 50 ? 34 : 38) + rng.normal(0, 1.2)) * (Math.PI / 180);
  const sigmaDeg = (1.7 + 2.6 * (1 - acc)) * (1 + 0.4 * pressure * (1 - comp));
  const yaw = rng.normal(0, sigmaDeg) * (Math.PI / 180);
  const f: BallFlight = {
    pos: { x: 0, y: 0, z: 0.3 },
    vel: { x: v0 * Math.cos(elev) * Math.cos(yaw), y: v0 * Math.cos(elev) * Math.sin(yaw), z: v0 * Math.sin(elev) },
    drag: DRAG_KICK,
  };
  let prevX = 0;
  let prevY = 0;
  let prevZ = 0.3;
  for (let i = 0; i < 400; i++) {
    stepFlight(f, 0.01, wind);
    if (f.pos.x >= distance) {
      const t = (distance - prevX) / Math.max(1e-6, f.pos.x - prevX);
      const y = prevY + (f.pos.y - prevY) * t;
      const z = prevZ + (f.pos.z - prevZ) * t;
      if (z < CROSSBAR_HEIGHT) return { good: false, blocked: false, miss: 'short', distance };
      if (Math.abs(y) > UPRIGHT_HALF_WIDTH) return { good: false, blocked: false, miss: y > 0 ? 'left' : 'right', distance };
      return { good: true, blocked: false, distance };
    }
    if (f.pos.z <= 0) return { good: false, blocked: false, miss: 'short', distance };
    prevX = f.pos.x;
    prevY = f.pos.y;
    prevZ = f.pos.z;
  }
  return { good: false, blocked: false, miss: 'short', distance };
}

/** Longest field goal a coach will attempt with this kicker (yards). */
export function fieldGoalRange(kicker: Player): number {
  return Math.round(47 + 12 * r01(kicker.ratings.kickPower));
}

// ------------------------------------------------------------------ returns

export function returnerOf(team: Team, exclude: Set<string> = new Set()): Player {
  const cands = team.roster.filter((p) => (p.position === 'WR' || p.position === 'RB' || p.position === 'CB') && !exclude.has(p.id));
  let best = cands[0];
  let bs = -Infinity;
  for (const p of cands) {
    const v = derivePhysical(p).vmax;
    const s = v * 6 + p.ratings.elusiveness * 0.4 + p.ratings.vision * 0.3 + p.ratings.ballSecurity * 0.2;
    if (s > bs) {
      bs = s;
      best = p;
    }
  }
  return best;
}

/** Coverage unit quality 0–1 from the depth players who cover kicks. */
export function coverageQuality(team: Team): number {
  const cover = team.roster.filter((p) => p.position === 'LB' || p.position === 'S' || p.position === 'CB' || p.position === 'WR' || p.position === 'TE');
  cover.sort((a, b) => b.ratings.tackling + b.ratings.pursuit - (a.ratings.tackling + a.ratings.pursuit));
  const unit = cover.slice(4, 14);
  const avg = unit.reduce((s, p) => s + p.ratings.tackling * 0.5 + p.ratings.pursuit * 0.3 + p.ratings.workRate * 0.2, 0) / Math.max(1, unit.length);
  return clamp(avg / 100, 0, 1);
}

function returnYards(rng: Rng, returner: Player, coverage: number, base: number, spread: number): { yards: number; fumble: boolean } {
  const v = derivePhysical(returner).vmax;
  const talent = 0.45 * clamp((v - 9.5) / 1.5, 0, 1) + 0.35 * r01(returner.ratings.elusiveness) + 0.2 * r01(returner.ratings.vision);
  let yards = rng.normal(base + 6 * (talent - 0.5) - 6 * (coverage - 0.5), spread);
  // Occasional seam: a big return.
  if (rng.chance(0.035 + 0.04 * talent - 0.02 * coverage)) yards += rng.range(15, 70);
  const fumble = rng.chance(0.012 * (1.3 - r01(returner.ratings.ballSecurity)));
  return { yards: Math.max(-2, yards), fumble };
}

export interface KickoffResult {
  /** Receiving team's starting yardline (from their own goal). */
  yardline: number;
  touchback: boolean;
  returner?: Player;
  returnYards: number;
  td: boolean;
  fumbleLost: boolean;
  onside?: boolean;
  recoveredByKicking?: boolean;
  text: string;
}

export function kickoff(rng: Rng, kicking: Team, receiving: Team, opts: { onside?: boolean } = {}): KickoffResult {
  const k = kicking.roster.find((p) => p.position === 'K')!;
  if (opts.onside) {
    const rec = rng.chance(0.1);
    return {
      // Kicking team recovers around its own 45; otherwise the receivers start at their 55.
      yardline: rec ? 45 : 55,
      touchback: false,
      returnYards: 0,
      td: false,
      fumbleLost: false,
      onside: true,
      recoveredByKicking: rec,
      text: rec ? `onside kick RECOVERED by ${kicking.abbr}` : `onside kick recovered by ${receiving.abbr}`,
    };
  }
  const pow = r01(k.ratings.kickPower);
  // Most teams kick into the landing zone to force a return; strong legs can choose a touchback.
  const forceReturn = rng.chance(0.68);
  if (!forceReturn && rng.chance(0.75 + 0.2 * pow)) {
    return { yardline: 35, touchback: true, returnYards: 0, td: false, fumbleLost: false, text: `kickoff, touchback` };
  }
  // Landing spot (yards from receiving goal line); short of the 20 is illegal → 40.
  const land = rng.normal(6 - 6 * (pow - 0.5), 5);
  if (land > 20) return { yardline: 40, touchback: false, returnYards: 0, td: false, fumbleLost: false, text: `kickoff short of the landing zone, ball at the 40` };
  const ret = returnerOf(receiving);
  const cov = coverageQuality(kicking);
  const start = Math.max(-5, land);
  const r = returnYards(rng, ret, cov, 24, 7);
  let yl = start + r.yards;
  const td = yl >= 100;
  if (td) yl = 100;
  if (start < 0 && yl < 0) yl = 25; // downed in the end zone after a return attempt: touchback-ish
  const name = `${ret.firstName[0]}.${ret.lastName}`;
  if (r.fumble && !td) {
    const lost = rng.chance(0.55);
    return { yardline: lost ? 100 - yl : yl, touchback: false, returner: ret, returnYards: r.yards, td: false, fumbleLost: lost, text: `kickoff returned by ${name}, FUMBLE ${lost ? `recovered by ${kicking.abbr}` : 'recovered by return team'}` };
  }
  return { yardline: Math.round(clamp(yl, 1, 100)), touchback: false, returner: ret, returnYards: Math.round(r.yards), td, fumbleLost: false, text: td ? `kickoff returned ${Math.round(r.yards)} yds for a TOUCHDOWN by ${name}` : `kickoff returned ${Math.round(r.yards)} yds by ${name}` };
}

export interface PuntResult {
  /** Receiving team's starting yardline (from their own goal). */
  yardline: number;
  gross: number;
  touchback: boolean;
  fairCatch: boolean;
  returnYards: number;
  td: boolean;
  blocked: boolean;
  muffLost: boolean;
  text: string;
}

/** Punt from the kicking team's `yardline` (yards from its own goal). */
export function punt(rng: Rng, kicking: Team, receiving: Team, yardline: number): PuntResult {
  const p = kicking.roster.find((x) => x.position === 'P')!;
  const pow = r01(p.ratings.puntPower);
  const acc = r01(p.ratings.puntAccuracy);
  if (rng.chance(0.006)) {
    const spot = Math.max(1, yardline - 8);
    return { yardline: 100 - spot, gross: 0, touchback: false, fairCatch: false, returnYards: 0, td: false, blocked: true, muffLost: false, text: `punt BLOCKED` };
  }
  const toGoal = 100 - yardline;
  // Inside midfield punters kick for placement (pooch), not distance.
  const pooch = toGoal < 52;
  const target = pooch ? toGoal - 8 - 4 * acc : 44 + 8 * pow;
  const gross = Math.max(20, rng.normal(target, pooch ? 5 - 2 * acc : 5));
  const hang = 3.6 + 1.0 * pow + rng.normal(0, 0.25);
  let land = toGoal - gross; // yards from receiving goal line
  if (land <= 0) {
    // Into the end zone (or bounced in): touchback unless downed.
    if (pooch && land > -4 && rng.chance(0.35 + 0.3 * acc)) land = rng.range(1, 6);
    else return { yardline: 20, gross: Math.round(gross), touchback: true, fairCatch: false, returnYards: 0, td: false, blocked: false, muffLost: false, text: `punt ${Math.round(gross)} yds, touchback` };
  }
  const ret = returnerOf(receiving);
  const name = `${ret.firstName[0]}.${ret.lastName}`;
  // Fair catch more likely with hang time and inside the 15.
  const pFair = clamp(0.28 + 0.12 * (hang - 4.1) + (land < 15 ? 0.3 : 0), 0.1, 0.85);
  if (land < 10 && rng.chance(0.5)) {
    return { yardline: Math.round(Math.max(1, land)), gross: Math.round(gross), touchback: false, fairCatch: false, returnYards: 0, td: false, blocked: false, muffLost: false, text: `punt ${Math.round(gross)} yds, downed at the ${Math.round(Math.max(1, land))}` };
  }
  if (rng.chance(pFair)) {
    return { yardline: Math.round(Math.max(1, land)), gross: Math.round(gross), touchback: false, fairCatch: true, returnYards: 0, td: false, blocked: false, muffLost: false, text: `punt ${Math.round(gross)} yds, fair catch by ${name}` };
  }
  if (rng.chance(0.01)) {
    return { yardline: Math.round(100 - Math.max(1, land)), gross: Math.round(gross), touchback: false, fairCatch: false, returnYards: 0, td: false, blocked: false, muffLost: true, text: `punt ${Math.round(gross)} yds, MUFFED by ${name}, recovered by ${kicking.abbr}` };
  }
  const cov = coverageQuality(kicking);
  const r = returnYards(rng, ret, cov, 8.5 - (hang - 4.2) * 3, 6);
  let yl = land + r.yards;
  const td = yl >= 100;
  if (td) yl = 100;
  return {
    yardline: Math.round(clamp(yl, 1, 100)),
    gross: Math.round(gross),
    touchback: false,
    fairCatch: false,
    returnYards: Math.round(r.yards),
    td,
    blocked: false,
    muffLost: false,
    text: td ? `punt ${Math.round(gross)} yds, returned for a TOUCHDOWN by ${name}` : `punt ${Math.round(gross)} yds, returned ${Math.round(r.yards)} yds by ${name}`,
  };
}

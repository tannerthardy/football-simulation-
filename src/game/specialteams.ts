/**
 * Special teams.
 *
 * Place kicks use real ball physics: launch speed from the kicker's leg,
 * elevation, end-over-end drag, wind, and a direction error from accuracy;
 * the kick is good if the ball crosses the goal plane above the crossbar and
 * inside the uprights. Punts use the punter's leg for distance/hang time.
 * Kick events are adjudicated under the 2026 rules by kick-rules.ts; the return
 * sample is an explicit reduced model, not a simulation of kick coverage contact.
 * Returns are resolved from returner and coverage quality.
 */
import type { Rng } from '../core/rng.js';
import { CROSSBAR_HEIGHT, UPRIGHT_HALF_WIDTH } from '../core/field.js';
import { G } from '../core/units.js';
import { clamp, type Vec2 } from '../core/vec.js';
import { DRAG_KICK, stepFlight, type BallFlight } from '../physics/ball.js';
import { derivePhysical } from '../players/physical.js';
import { r01, type Player } from '../players/types.js';
import type { Team } from '../league/team.js';
import { assessFreeKick, assessScrimmageKick, fairCatchKickEligibility,
  type FreeKickFacts, type KickRuling, type KickTeam, type ScrimmageKickFacts } from './kick-rules.js';

export interface FieldGoalResult {
  good: boolean;
  blocked: boolean;
  /** 'left' | 'right' | 'short' when missed. */
  miss?: 'left' | 'right' | 'short';
  distance: number;
}

export interface PlaceKickOptions {
  fairCatchKick?: boolean;
  /** Supplied operation facts, not a sampled snap/holder quality rating.
   * Omitted means the existing nominal controlled snap and set hold. The
   * caller must resolve a failed exchange without inventing an FG attempt.
   * Strike errors are achieved launch offsets, not inferred from ball tilt. */
  operation?: {
    snapControlled?: boolean;
    holdSet?: boolean;
    yawErrorDeg?: number;
    elevationErrorDeg?: number;
  };
}

/** Attempt a place kick of `distance` yards (spot to goal posts). */
export function kickFieldGoal(rng: Rng, kicker: Player, distance: number, wind: Vec2 = { x: 0, y: 0 }, pressure = 0,
  options: PlaceKickOptions = {}): FieldGoalResult {
  const operation = options.operation;
  if ((!options.fairCatchKick && operation?.snapControlled === false) || operation?.holdSet === false)
    throw new Error('No place-kick attempt without a controlled snap and set hold');
  const yawError = operation?.yawErrorDeg ?? 0, elevationError = operation?.elevationErrorDeg ?? 0;
  if (!Number.isFinite(yawError) || !Number.isFinite(elevationError))
    throw new Error('Place-kick strike errors must be finite degrees');
  const pow = r01(kicker.ratings.kickPower);
  const acc = r01(kicker.ratings.kickAccuracy);
  const comp = r01(kicker.ratings.composure);
  // The old block sample describes a scrimmage rush, which a fair-catch kick
  // does not have. Actual airborne interception/touching needs its own event.
  // Reduced rush risk, fitted to BLOCKED labels in pooled 2022–23 FG/XP.
  // Share a smooth distance curve because the native caller supplies no try
  // phase. It is not an observed rush/engagement or a strike-error correction.
  const blockRisk = clamp(.0066 + .0017 * Math.max(0, distance - 33), 0, 1);
  if (!options.fairCatchKick && rng.chance(blockRisk)) return { good: false, blocked: true, distance };
  const legSpeed = 25.5 + 7.5 * pow;
  const v0 = legSpeed * (1 + rng.normal(0, 0.015));
  // Long kicks are struck flatter to get distance.
  const elev = ((distance > 50 ? 34 : 38) + rng.normal(0, 1.2) + elevationError) * (Math.PI / 180);
  // A longer demand on the same leg makes the strike less repeatable, beyond
  // the narrowing angular window already imposed by the uprights. v²/g is a
  // length scale, not the drag-limited makeable range or a coach's range call.
  // 0.70/0.29 calibrate this reduced scatter to pooled 2022–23 UNBLOCKED FG/XP
  // outcomes underlying game-layer.json. Blocked kicks do not calibrate the
  // strike. These are not measured biomechanics or a make-rate roll.
  const rangeDemand = distance * G / (legSpeed * legSpeed);
  const scatter = 1 + .70 * Math.max(0, rangeDemand - .29);
  const sigmaDeg = (1.7 + 2.6 * (1 - acc)) * scatter * (1 + 0.4 * pressure * (1 - comp));
  const yaw = (rng.normal(0, sigmaDeg) + yawError) * (Math.PI / 180);
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

/** 10-2-4,11-4-3: no snap/holder-depth addition and no tee. The caller must
 * possess a made/awarded fair-catch entitlement; an invalid signal is insufficient. */
export function kickFairCatch(rng: Rng, kicker: Player, yardline: number,
  entitlement: Parameters<typeof fairCatchKickEligibility>[0], wind: Vec2 = { x: 0, y: 0 }): FieldGoalResult {
  if (!fairCatchKickEligibility(entitlement).allowed) throw new Error('No fair-catch kick entitlement');
  return kickFieldGoal(rng, kicker, 110 - yardline, wind, 0, { fairCatchKick: true });
}

/** Selected reduced event for generated FG misses, including sampled
 * deflections: the kick crosses LOS, is untouched by receivers beyond LOS,
 * and becomes dead in the receiving end zone. This is explicit simulation
 * state, not a measured trajectory inferred from the blocked boolean. Behind-
 * line blocks/returns/recoveries require a supplied ScrimmageKickFacts event.
 * The assumption preserves the established11-4-2 missed-FG spot distribution. */
export function generatedMissedFieldGoalEvent(scrimmageSpot: number,
  placeKickSpot = scrimmageSpot - 7): ScrimmageKickFacts {
  return { scrimmageSpot, missedFieldGoalSpot: placeKickSpot,
    groundTouchedInReceivingEndzone: true, terminal: { kind: 'rest', yardline: -1 } };
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
  /** Possession owner's yardline from its own goal; use possession explicitly. */
  yardline: number;
  possession: KickTeam;
  rules: KickRuling;
  touchback: boolean;
  returner?: Player;
  returnYards: number;
  td: boolean;
  fumbleLost: boolean;
  onside?: boolean;
  recoveredByKicking?: boolean;
  text: string;
}

export interface KickoffOptions {
  onside?: boolean;
  safetyKick?: boolean;
  /** K-own yardline: ordinary35, safety20, adjusted by enforced carryover. */
  kickSpot?: number;
  /** Existing onside call is the abstract declaration unless explicitly false. */
  declaredOnside?: boolean;
  /** A represented kick event bypasses sampling and follows the same law path. */
  event?: FreeKickFacts;
}
function kickoffRuling(rules: KickRuling, text: string, extra: Partial<KickoffResult> = {}): KickoffResult {
  return { touchback: rules.touchback, returnYards: 0, td: rules.touchdown === 'receiving',
    fumbleLost: false, ...extra, yardline: Math.round(clamp(rules.yardline, 1, 100)), possession: rules.possession, rules, text };
}
export function kickoff(rng: Rng, kicking: Team, receiving: Team, opts: KickoffOptions = {}): KickoffResult {
  if (opts.event) {
    const rules = assessFreeKick(opts.event);
    return kickoffRuling(rules, rules.reason, { onside: opts.event.kind === 'onside',
      recoveredByKicking: rules.possession === 'kicking' && !opts.event.terminal.receiverPossessed,
      fumbleLost: rules.possession === 'kicking' && !!opts.event.terminal.receiverPossessed });
  }
  const k = kicking.roster.find((p) => p.position === 'K')!;
  const kickSpot = opts.kickSpot ?? (opts.safetyKick ? 20 : 35);
  const kind = opts.safetyKick ? 'safety' : 'kickoff';
  if (opts.onside) {
    const rec = rng.chance(0.1);
    const rules = assessFreeKick({ kind: 'onside', kickSpot, safetyOnside: opts.safetyKick,
      declaredOnside: opts.declaredOnside ?? true, declarationBeforePlayClock: true,
      reachedReceivingRestrainingLine: true,
      terminal: { kind: 'possession', possession: rec ? 'kicking' : 'receiving', yardline: 100 - kickSpot - 10 } });
    return kickoffRuling(rules, rec ? `onside kick RECOVERED by ${kicking.abbr}` : `onside kick recovered by ${receiving.abbr}`, {
      onside: true,
      recoveredByKicking: rec,
    });
  }
  const pow = r01(k.ratings.kickPower);
  // Most teams kick into the landing zone to force a return; strong legs can choose a touchback.
  const forceReturn = rng.chance(0.68);
  if (!forceReturn && rng.chance(0.75 + 0.2 * pow)) {
    const rules = assessFreeKick({ kind, kickSpot, terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } });
    return kickoffRuling(rules, `kickoff, touchback`);
  }
  // Landing spot (yards from receiving goal line); short of the 20 is illegal → 40.
  const land = rng.normal(6 - 6 * (pow - 0.5), 5);
  if (land > 20) {
    const rules = assessFreeKick({ kind, kickSpot, firstContact: { by: 'ground', yardline: land },
      terminal: { kind: 'rest', yardline: land } });
    return kickoffRuling(rules, `kickoff short of the landing zone, ball at the ${Math.round(rules.yardline)}`);
  }
  const ret = returnerOf(receiving);
  const cov = coverageQuality(kicking);
  const start = Math.max(-5, land);
  const r = returnYards(rng, ret, cov, 24, 7);
  let yl = start + r.yards;
  const td = yl >= 100;
  if (td) yl = 100;
  const name = `${ret.firstName[0]}.${ret.lastName}`;
  if (r.fumble && !td) {
    const lost = rng.chance(0.55);
    const rules = assessFreeKick({ kind, kickSpot, landingZoneTouched: land > 0 && land <= 20, receiverTouched: true,
      terminal: { kind: 'possession', possession: lost ? 'kicking' : 'receiving', yardline: yl,
        recoveryYardline: start, receiverPossessed: true, returnedIntoOwnEndzone: start > 0 && yl <= 0 } });
    return kickoffRuling(rules, `kickoff returned by ${name}, FUMBLE ${lost ? `recovered by ${kicking.abbr}` : 'recovered by return team'}`,
      { returner: ret, returnYards: r.yards, fumbleLost: lost });
  }
  const rules = assessFreeKick({ kind, kickSpot, landingZoneTouched: land > 0 && land <= 20,
    receiverTouched: true, terminal: { kind: 'possession', possession: 'receiving', yardline: yl,
      recoveryYardline: start, returnedIntoOwnEndzone: start > 0 && yl <= 0 } });
  return kickoffRuling(rules, td ? `kickoff returned ${Math.round(r.yards)} yds for a TOUCHDOWN by ${name}`
    : rules.touchback ? `kickoff, touchback` : `kickoff returned ${Math.round(r.yards)} yds by ${name}`,
    { returner: ret, returnYards: rules.touchback ? 0 : Math.round(r.yards) });
}

export interface PuntResult {
  /** Possession owner's yardline from its own goal; use possession explicitly. */
  yardline: number;
  possession: KickTeam;
  rules: KickRuling;
  gross: number;
  touchback: boolean;
  fairCatch: boolean;
  returnYards: number;
  td: boolean;
  blocked: boolean;
  muffLost: boolean;
  text: string;
}

export interface PuntOptions { event?: ScrimmageKickFacts }
function puntRuling(rules: KickRuling, text: string, extra: Partial<PuntResult> = {}): PuntResult {
  return { gross: 0, touchback: rules.touchback, fairCatch: rules.fairCatch,
    returnYards: 0, td: rules.touchdown === 'receiving', blocked: false, muffLost: false,
    ...extra, yardline: Math.round(clamp(rules.yardline, 1, 100)), possession: rules.possession, rules, text };
}

/** Punt from the kicking team's `yardline` (yards from its own goal). */
export function punt(rng: Rng, kicking: Team, receiving: Team, yardline: number, opts: PuntOptions = {}): PuntResult {
  if (opts.event) {
    const rules = assessScrimmageKick(opts.event);
    return puntRuling(rules, rules.reason, { muffLost: rules.possession === 'kicking' && !!opts.event.receiverTouchedBeyondLine });
  }
  const p = kicking.roster.find((x) => x.position === 'P')!;
  const pow = r01(p.ratings.puntPower);
  const acc = r01(p.ratings.puntAccuracy);
  if (rng.chance(0.006)) {
    const spot = Math.max(1, yardline - 8);
    const rules = assessScrimmageKick({ scrimmageSpot: yardline,
      terminal: { kind: 'possession', possession: 'receiving', yardline: 100 - spot } });
    return puntRuling(rules, `punt BLOCKED`, { blocked: true });
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
    else {
      const rules = assessScrimmageKick({ scrimmageSpot: yardline, groundTouchedInReceivingEndzone: true,
        terminal: { kind: 'rest', yardline: land } });
      return puntRuling(rules, `punt ${Math.round(gross)} yds, touchback`, { gross: Math.round(gross) });
    }
  }
  const ret = returnerOf(receiving);
  const name = `${ret.firstName[0]}.${ret.lastName}`;
  // Fair catch more likely with hang time and inside the 15.
  const pFair = clamp(0.28 + 0.12 * (hang - 4.1) + (land < 15 ? 0.3 : 0), 0.1, 0.85);
  if (land < 10 && rng.chance(0.5)) {
    const rules = assessScrimmageKick({ scrimmageSpot: yardline,
      firstKickingTouches: [{ yardline: land }], terminal: { kind: 'possession', possession: 'kicking', yardline: land } });
    return puntRuling(rules, `punt ${Math.round(gross)} yds, downed at the ${Math.round(Math.max(1, land))}`, { gross: Math.round(gross) });
  }
  if (rng.chance(pFair)) {
    const rules = assessScrimmageKick({ scrimmageSpot: yardline,
      fairCatch: { kick: 'scrimmage', crossedLine: true, signal: 'valid', signalYardline: land,
        catcherIsSignaler: true, caughtInAir: true, catchYardline: land },
      terminal: { kind: 'possession', possession: 'receiving', yardline: land, caughtInAir: true } });
    return puntRuling(rules, `punt ${Math.round(gross)} yds, fair catch by ${name}`, { gross: Math.round(gross) });
  }
  if (rng.chance(0.01)) {
    const rules = assessScrimmageKick({ scrimmageSpot: yardline, receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: land } });
    return puntRuling(rules, `punt ${Math.round(gross)} yds, MUFFED by ${name}, recovered by ${kicking.abbr}`,
      { gross: Math.round(gross), muffLost: true });
  }
  const cov = coverageQuality(kicking);
  const r = returnYards(rng, ret, cov, 8.5 - (hang - 4.2) * 3, 6);
  let yl = land + r.yards;
  const td = yl >= 100;
  if (td) yl = 100;
  // Preserve the legacy return draw sequence. Its sampled fumble has no recovery
  // actor/spot; do not manufacture possession from that incomplete fact.
  const rules = assessScrimmageKick({ scrimmageSpot: yardline, receiverTouchedBeyondLine: true,
    terminal: { kind: 'possession', possession: 'receiving', yardline: yl, recoveryYardline: land,
      returnedIntoOwnEndzone: land > 0 && yl <= 0 } });
  return puntRuling(rules, td ? `punt ${Math.round(gross)} yds, returned for a TOUCHDOWN by ${name}`
    : `punt ${Math.round(gross)} yds, returned ${Math.round(r.yards)} yds by ${name}`,
    { gross: Math.round(gross), returnYards: Math.round(r.yards) });
}

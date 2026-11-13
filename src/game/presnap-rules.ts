/** NFL-2026 scrimmage snap laws on represented facts (Rules 3–8).
 * No discipline roll, execution RNG or inference of helmet/belt anatomy. */
import { FIELD_LENGTH, FIELD_WIDTH } from '../core/field.js';
import { bodyRadius } from '../physics/bodyshape.js';
import type { TeamSide } from '../sim/agent.js';
import type { PlaySim } from '../sim/playsim.js';

export interface SnapPlayerFacts {
  playerId: string;
  team: TeamSide;
  number?: number;
  y: number;
  /** A supplied legal-position fact, not a center-coordinate threshold. */
  line?: 'line' | 'backfield' | 'ambiguous';
  inBounds?: boolean;
  directlyBehindSnapper?: boolean;
  tFormationQB?: boolean;
  reportedEligibility?: 'eligible' | 'ineligible';
  moving?: boolean;
  movingTowardLine?: boolean;
  /** Actual abrupt act simulating the snap, not ordinary stance adjustment. */
  simulatesSnap?: boolean;
  interiorThreePointPositionChanged?: boolean;
  eligibleLineReceiverMovedForwardAfterSet?: boolean;
  eligibleLineReceiverNotStopped?: boolean;
  tFormationQBSetSeconds?: number;
  inNeutralZone?: boolean;
}

export interface SnapIncident {
  playerId: string;
  enteredNeutralZone: boolean;
  contactedOpponentOrBall?: boolean;
  interferedWithSnap?: boolean;
  beyondOffensiveLinemanWithUnimpededPath?: boolean;
  immediateNearbyProtectiveReaction?: boolean;
}

export interface SnapEligibility {
  playerId: string;
  eligible: boolean | null;
  covered: boolean;
  endOfLine: boolean;
  reason: string;
}

export type PresnapFoulKind = 'false_start' | 'offside' | 'encroachment' | 'neutral_zone_infraction'
  | 'illegal_formation' | 'illegal_shift' | 'illegal_motion' | 'illegal_snap'
  | 'illegal_substitution' | 'too_many_players' | 'delay_of_game' | 'unsportsmanlike_conduct';

export interface PresnapFoul {
  kind: PresnapFoulKind;
  against: TeamSide;
  playerId?: string;
  rule: string;
  yards: 5 | 15;
  deadBall: boolean;
  reason: string;
}

export interface ScrimmageSnapFacts {
  players: readonly SnapPlayerFacts[];
  readyForPlay?: boolean;
  /** False permits inspection before the snap; omitted means at the snap. */
  snapOccurred?: boolean;
  snapImminent?: boolean;
  allSetSeconds?: number;
  /** True if another multi-player shift occurred after the recorded full set. */
  shiftAfterLastSet?: boolean;
  /** A full simultaneous set occurred earlier, even if the last shift did not reset. */
  hadFullSet?: boolean;
  gameClockRunning?: boolean;
  afterTwoMinuteWarning?: boolean;
  playClockExpired?: boolean;
  offensiveFormationOverElevenSeconds?: number;
  offensiveHuddleCount?: number;
  playClockRunning?: boolean;
  /** Entering the neutral zone alone can be recovered before the snap. */
  defensiveIncidents?: readonly SnapIncident[];
  snap?: {
    snapperId?: string;
    receiverId?: string;
    ballOnGround?: boolean;
    ballLongAxisPerpendicularToLine?: boolean;
    quickContinuousHandMotion?: boolean;
    ballLeftSnapperHands?: boolean;
    backward?: boolean;
    officialsReady?: boolean;
    repeatedBeforeOfficialsReadyAfterWarning?: boolean;
    firstGroundedOrMuffedByEligibleBack?: boolean;
  };
  substitutions?: readonly {
    playerId: string;
    team: TeamSide;
    enteredDuringLiveBall?: boolean;
    interferedDuringLiveBall?: boolean;
    offensiveSubstituteFailedToReachNumbers?: boolean;
    withdrewAcrossWrongBoundary?: boolean;
    disqualifiedPlayerReturned?: boolean;
    suspendedPlayerReturnedBeforeEligible?: boolean;
  }[];
  /** Officials' actual hold on the snap for a permitted defensive response. */
  defensiveMatchupOpportunityDenied?: boolean;
  substitutionDeceptionAfterWarning?: boolean;
}

export interface PresnapAssessment {
  fouls: PresnapFoul[];
  eligibility: SnapEligibility[];
  unresolved: string[];
  snapPermitted: boolean;
}

/** 5-1-2,8-1-5/6: eligibility numbers, including zero, not position labels. */
export function eligibleNumber(number: number | undefined): boolean | null {
  if (number === undefined || !Number.isInteger(number) || number < 0 || number > 99) return null;
  return number <= 49 || (number >= 80 && number <= 89);
}

/** Freeze this result at the actual snap; later route locations do not change it. */
export function eligibilityAtSnap(players: readonly SnapPlayerFacts[]): SnapEligibility[] {
  const line = players.filter(p => p.team === 'O' && p.line === 'line');
  const ys = line.map(p => p.y).filter(Number.isFinite);
  const low = Math.min(...ys), high = Math.max(...ys);
  return players.map(p => {
    const onLine = p.team === 'O' && p.line === 'line';
    const lowEnd = onLine && p.y === low && line.filter(a => a.y === low).length === 1;
    const highEnd = onLine && p.y === high && line.filter(a => a.y === high).length === 1;
    const endOfLine = lowEnd || highEnd;
    const covered = onLine && p.y > low && p.y < high;
    const out = (eligible: boolean | null, reason: string): SnapEligibility =>
      ({ playerId: p.playerId, eligible, covered, endOfLine, reason });
    if (p.team === 'D') return out(true, 'defensive player');
    if (p.inBounds === false) return out(false, 'out of bounds at snap');
    if (p.tFormationQB) return out(false, 'T-formation quarterback,8-1-6(d)');
    if (covered) return out(false, 'covered interior player on line');
    if (!p.line || (onLine && !endOfLine)) return out(null, 'snap line/end position unresolved');
    if (p.line === 'ambiguous') return out(false, 'not an eligible end or backfield position');
    const numbered = p.reportedEligibility === 'eligible' ? true
      : p.reportedEligibility === 'ineligible' ? false : eligibleNumber(p.number);
    if (numbered === null) return out(null, 'number/reporting unresolved');
    return out(numbered, numbered ? 'eligible end/backfield number or report' : 'ineligible number/report');
  });
}

export function assessScrimmageSnap(f: ScrimmageSnapFacts): PresnapAssessment {
  const fouls: PresnapFoul[] = [], unresolved: string[] = [];
  const atSnap = f.snapOccurred !== false;
  const offense = f.players.filter(p => p.team === 'O'), defense = f.players.filter(p => p.team === 'D');
  const eligibility = eligibilityAtSnap(f.players);
  const add = (kind: PresnapFoulKind, against: TeamSide, rule: string, deadBall: boolean,
    reason: string, playerId?: string, yards: 5 | 15 = 5): void => {
    if (!fouls.some(x => x.kind === kind && x.against === against && x.playerId === playerId))
      fouls.push({ kind, against, rule, yards, deadBall, reason, playerId });
  };
  if (f.playClockExpired) add('delay_of_game', 'O', '4-6-1/2/4', true, 'applicable play clock expired');
  if ((f.offensiveHuddleCount ?? 0) > 11 && f.playClockRunning)
    add('illegal_substitution', 'O', '5-2-1/8(a)', true, 'more than eleven in offensive huddle');
  if (offense.length > 11) {
    if ((f.offensiveFormationOverElevenSeconds ?? 0) > 3)
      add('too_many_players', 'O', '5-1-1', true, 'offensive formation had over eleven for more than three seconds');
    else if (atSnap) add('too_many_players', 'O', '5-1-1', false, 'over eleven on field at snap');
  }
  if (defense.length > 11) {
    if (f.snapImminent) add('too_many_players', 'D', '5-1-1', true, 'snap imminent with over eleven in defensive formation');
    else if (atSnap) add('too_many_players', 'D', '5-1-1', false, 'over eleven on field at snap');
  }
  if (f.readyForPlay !== false) {
    for (const p of offense) {
      if (p.simulatesSnap || p.interiorThreePointPositionChanged || p.eligibleLineReceiverMovedForwardAfterSet
        || p.eligibleLineReceiverNotStopped)
        add('false_start', 'O', '7-4-2', true, 'represented prohibited pre-snap start/stance act', p.playerId);
    }
    for (const d of f.defensiveIncidents ?? []) {
      if (d.interferedWithSnap || (d.enteredNeutralZone && d.contactedOpponentOrBall))
        add('encroachment', 'D', '7-4-3', true, 'neutral-zone contact or interference with snap', d.playerId);
      else if (d.enteredNeutralZone && (d.beyondOffensiveLinemanWithUnimpededPath || d.immediateNearbyProtectiveReaction))
        add('neutral_zone_infraction', 'D', '7-4-4(a/b)', true, 'unimpeded path or immediate nearby protective reaction', d.playerId);
    }
  }
  if (f.defensiveMatchupOpportunityDenied) {
    // 5-2-9/10: first violation prevents the down, not a free too-many flag.
    if (f.substitutionDeceptionAfterWarning)
      add('unsportsmanlike_conduct', 'O', '5-2-9/10', true, 'repeated denied substitution response after warning', undefined, 15);
    else unresolved.push('5-2-9/10: down must be prevented/replayed and defense given substitution opportunity');
  }
  for (const s of f.substitutions ?? []) {
    if (s.interferedDuringLiveBall) unresolved.push(`17-2/12-3-4: substitute interference requires unfair-act remedy:${s.playerId}`);
    else if (s.enteredDuringLiveBall) add('illegal_substitution', s.team, '5-2-4/8(b)', false, 'substitute entered live field', s.playerId);
    if (atSnap && (s.offensiveSubstituteFailedToReachNumbers || s.withdrewAcrossWrongBoundary || s.suspendedPlayerReturnedBeforeEligible))
      add('illegal_substitution', s.team, '5-2-8(d/e/f)', false, 'represented substitution/withdrawal restriction violated', s.playerId);
    if (s.disqualifiedPlayerReturned)
      add('unsportsmanlike_conduct', s.team, '5-2-8(g)', !atSnap, 'disqualified player returned; removal required', s.playerId, 15);
  }
  if (atSnap) {
    const line = offense.filter(p => p.line === 'line');
    if (offense.every(p => p.line !== undefined) && line.length < 7)
      add('illegal_formation', 'O', '7-5-1(a)', false, 'fewer than seven on line');
    const ambiguous = offense.filter(p => p.line === 'ambiguous');
    for (const p of offense) {
      const e = eligibility.find(x => x.playerId === p.playerId)!;
      if (p.inBounds === false) add('illegal_formation', 'O', '7-5-1(c)', false, 'offensive player out of bounds', p.playerId);
      if (p.line === 'ambiguous' && (!p.directlyBehindSnapper || ambiguous.length > 1
        || (p.reportedEligibility !== 'eligible' && eligibleNumber(p.number) === false)))
        add('illegal_formation', 'O', '7-5-1(d)', false, 'not clearly on/off line without allowed direct-snapper position', p.playerId);
      const eligiblePosition = e.endOfLine || p.line === 'backfield';
      if (eligiblePosition && (p.reportedEligibility === 'ineligible'
        || (p.reportedEligibility !== 'eligible' && eligibleNumber(p.number) === false)))
        add('illegal_formation', 'O', '7-5-1(b/e)', false, 'ineligible number/report in eligible formation position', p.playerId);
      if (!p.line || eligibleNumber(p.number) === null) unresolved.push(`snap alignment/number not qualified:${p.playerId}`);
    }
    if (f.allSetSeconds !== undefined && f.allSetSeconds < 1) {
      const lateFalseStart = f.gameClockRunning && f.afterTwoMinuteWarning && !f.hadFullSet;
      add(lateFalseStart ? 'false_start' : 'illegal_shift', 'O', lateFalseStart ? '7-4-2 Item6' : '7-4-6/7',
        !!lateFalseStart, 'offense did not establish the required full-second simultaneous set');
    }
    if (f.shiftAfterLastSet) add('illegal_shift', 'O', '7-4-7', false, 'multi-player shift without another full-second set');
    const moving = offense.filter(p => p.moving);
    if (moving.length > 1) add('illegal_shift', 'O', '7-4-7/8', false, 'more than one offensive player moving at snap');
    for (const p of moving) {
      if (p.movingTowardLine || p.line !== 'backfield' || p.tFormationQB)
        add('illegal_motion', 'O', '7-4-8', false, 'motion toward line or a moving non-backfield player', p.playerId);
    }
    for (const p of offense) if (p.tFormationQB && p.tFormationQBSetSeconds !== undefined && p.tFormationQBSetSeconds < 1)
      add('illegal_motion', 'O', '7-4-8', false, 'T-formation QB motion not followed by a full-second stop', p.playerId);
    const legallySet = f.allSetSeconds !== undefined && f.allSetSeconds >= 1 && !f.shiftAfterLastSet;
    for (const p of f.players.filter(p => p.inNeutralZone)) {
      const lateNzi = p.team === 'D' && f.afterTwoMinuteWarning && legallySet;
      add(lateNzi ? 'neutral_zone_infraction' : 'offside', p.team,
        lateNzi ? '7-4-4(c)' : '7-4-5', !!lateNzi, lateNzi ? 'last-two-minute snap before defense legally across line'
          : 'body in neutral zone at snap', p.playerId);
    }
    const s = f.snap;
    if (s) {
      const snapper = offense.find(p => p.playerId === s.snapperId);
      if (snapper?.line !== undefined && snapper.line !== 'line')
        add('illegal_snap', 'O', '7-6-3', true, 'snapper not on line', snapper.playerId);
      if ([s.ballOnGround, s.ballLongAxisPerpendicularToLine, s.quickContinuousHandMotion,
        s.ballLeftSnapperHands, s.backward].some(v => v === false))
        add('illegal_snap', 'O', '7-6-3/4', true, 'represented illegal snap mechanics', s.snapperId);
      const receiver = offense.find(p => p.playerId === s.receiverId);
      if (receiver?.line === 'line' && !s.firstGroundedOrMuffedByEligibleBack)
        add('illegal_snap', 'O', '7-6-4', true, 'snap received by player on line before allowed ground/muff', receiver.playerId);
      if (s.officialsReady === false && s.repeatedBeforeOfficialsReadyAfterWarning)
        add('delay_of_game', 'O', '4-6-5(b)', true, 'repeated snap before officials ready after warning', s.snapperId);
    }
  }
  return { fouls, eligibility, unresolved, snapPermitted: f.readyForPlay !== false
    && f.snap?.officialsReady !== false && !f.defensiveMatchupOpportunityDenied && !fouls.some(p => p.deadBall) };
}

/** A motion man moving faster than this at the snap is in motion (yd/s);
 * slower is a set man's settle, which an official does not flag. */
const IN_MOTION = 0.5;

/** Current engine installs an offensive set instead of simulating huddle/helmet
 * geometry. Freeze these declared positions at setup; do not re-evaluate route
 * locations for eligibility. No made-up offensive motion history is supplied:
 * the one man the play put in motion is judged by where his body is going at
 * the snap (7-4-8: in motion, never toward the line). */
export function inspectInstalledSnap(sim: PlaySim,
  reports: Readonly<Record<string, 'eligible' | 'ineligible'>> = {},
  context: Pick<ScrimmageSnapFacts, 'afterTwoMinuteWarning' | 'gameClockRunning'
    | 'allSetSeconds' | 'hadFullSet' | 'shiftAfterLastSet'> = {}): PresnapAssessment {
  const core = new Set(['LT', 'LG', 'C', 'RG', 'RT']);
  const motionSlot = sim.motion?.plan.slot;
  const players: SnapPlayerFacts[] = sim.agents.map(a => {
    const installed = sim.offAlign.spots[a.slot];
    const skill = sim.offCall.formation.slots[a.slot as keyof typeof sim.offCall.formation.slots];
    const depth = a.slot === 'QB' ? (sim.offCall.formation.qb === 'under' ? 1.6 : 4)
      : core.has(a.slot) ? .55 : skill?.depth;
    const line = a.team === 'D' ? undefined : core.has(a.slot) || (depth !== undefined && depth <= .6 + 1e-9)
      ? 'line' : depth !== undefined && depth >= 1 ? 'backfield' : 'ambiguous';
    const snapX = sim.snapX[a.idx] ?? a.pos.x;
    const installedX = installed?.pos.x ?? snapX;
    const radius = bodyRadius(a.body, 1, 0);
    return { playerId: a.player.id, team: a.team, number: a.player.jersey,
      y: installed?.pos.y ?? a.pos.y, line, inBounds: (installed?.pos.y ?? a.pos.y) > 0
        && (installed?.pos.y ?? a.pos.y) < FIELD_WIDTH && installedX > 0 && installedX < FIELD_LENGTH,
      reportedEligibility: reports[a.player.id],
      // These are sufficient represented torso crossings, not a declaration
      // that unrepresented helmet/feet geometry is proven legal otherwise.
      inNeutralZone: a.team === 'D' ? snapX - radius < sim.los || !!sim.snapActs?.inZone.has(a.player.id)
        : snapX + radius > sim.los,
      tFormationQB: a.team === 'O' && a.slot === 'QB' && sim.offCall.formation.qb === 'under',
      // SNAP_REACT: an abrupt start before the snap that the count produced.
      simulatesSnap: a.team === 'O' && !!sim.snapActs?.falseStarts.has(a.player.id),
      ...(a.team === 'O' && a.slot === motionSlot ? {
        moving: Math.hypot(a.vel.x, a.vel.y) > IN_MOTION, movingTowardLine: a.vel.x > IN_MOTION } : {}) };
  });
  //The current install explicitly supplies a legal stationary set, rather
  //than simulating huddle/stance history. Preserve a caller's actual recorded
  //history when supplied; late-NZI classification still needs Game's warning.
  const assessment = assessScrimmageSnap({ players, readyForPlay: true, snapOccurred: true,
    defensiveIncidents: sim.snapActs?.incidents,
    ...context, allSetSeconds: context.allSetSeconds ?? 1, hadFullSet: context.hadFullSet ?? true });
  assessment.unresolved.push('3-18/7-4: declared installed line/set abstraction; helmet/beltline and snap mechanics not recorded; offensive motion judged only by the motion man\'s velocity at the snap');
  return assessment;
}

/** Rules15–19 have explicit administrative owners; their absence must not
 * masquerade as a missing physical contact predicate. */
export const ADMINISTRATIVE_RULE_BOUNDARIES = [
  { rule: '15', contract: 'reviewable rulings, authority and correction/clock procedures', status: 'deterministic-ruling abstraction; crew/challenge workflow not simulated' },
  { rule: '16', contract: 'editioned regular/postseason overtime timing and possession rights', status: 'Game procedures require their own qualified contracts; no presnap substitution for OT law' },
  { rule: '17', contract: 'emergency suspension/resumption and unfair-act remedies', status: 'explicit unsupported administration; preserve game state, do not invent yardage' },
  { rule: '18', contract: 'captain choice among legal options', status: 'deterministic legal-option policy may stand in for captain UI' },
  { rule: '19', contract: 'official authority and2026 consultation/disqualification', status: 'objective rules service; no simulated official sightlines or consultation crew' },
] as const;

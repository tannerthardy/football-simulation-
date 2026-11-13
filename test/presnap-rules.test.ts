import { describe, expect, it } from 'vitest';
import { assessScrimmageSnap, eligibleNumber, eligibilityAtSnap,
  type ScrimmageSnapFacts, type SnapPlayerFacts } from '../src/game/presnap-rules.js';

function players(): SnapPlayerFacts[] {
  return [
    ...['X', 'LT', 'LG', 'C', 'RG', 'RT', 'Y'].map((playerId, n): SnapPlayerFacts =>
      ({ playerId, team: 'O', number: n === 0 ? 0 : n === 6 ? 88 : 50 + n,
        y: 35 - n * 2, line: 'line', inBounds: true })),
    ...['QB', 'RB', 'H', 'Z'].map((playerId, n): SnapPlayerFacts =>
      ({ playerId, team: 'O', number: 10 + n, y: 26 + n, line: 'backfield', inBounds: true })),
    ...Array.from({ length: 11 }, (_, n): SnapPlayerFacts =>
      ({ playerId: `D${n}`, team: 'D', number: 90 + n % 10, y: n * 3, inBounds: true })),
  ];
}
const scene = (extra: Partial<ScrimmageSnapFacts> = {}): ScrimmageSnapFacts =>
  ({ players: players(), readyForPlay: true, snapOccurred: true, allSetSeconds: 1, ...extra });
const kinds = (f: ScrimmageSnapFacts) => assessScrimmageSnap(f).fouls.map(x => x.kind);

describe('NFL snap-time eligibility and formation', () => {
  it('keeps a legal eleven-player seven-man line and eligible zero jersey', () => {
    const r = assessScrimmageSnap(scene());
    expect(r.fouls).toEqual([]);
    expect(r.snapPermitted).toBe(true);
    expect(r.eligibility.find(x => x.playerId === 'X')).toMatchObject({ eligible: true, endOfLine: true });
    expect(r.eligibility.find(x => x.playerId === 'C')).toMatchObject({ eligible: false, covered: true });
  });
  it.each([0, 49, 80, 89])('recognizes eligible jersey %i', n => expect(eligibleNumber(n)).toBe(true));
  it.each([50, 79, 90, 99])('does not make jersey %i eligible without a report', n => expect(eligibleNumber(n)).toBe(false));
  it('requires seven on the line but does not invent a fewer-than-eleven foul', () => {
    const p = players().filter(x => x.playerId !== 'Z');
    expect(assessScrimmageSnap(scene({ players: p })).fouls).toEqual([]);
    p.find(x => x.playerId === 'Y')!.line = 'backfield';
    expect(kinds(scene({ players: p }))).toContain('illegal_formation');
  });
  it('makes a covered skill player ineligible without inventing an automatic formation foul', () => {
    const p = players(); p.find(x => x.playerId === 'H')!.line = 'line';
    const r = assessScrimmageSnap(scene({ players: p }));
    expect(r.eligibility.find(x => x.playerId === 'H')).toMatchObject({ eligible: false, covered: true });
    expect(r.fouls).toEqual([]);
  });
  it('requires reporting for an ineligible-number player at an eligible end', () => {
    const p = players(), x = p.find(x => x.playerId === 'X')!; x.number = 72;
    expect(kinds(scene({ players: p }))).toContain('illegal_formation');
    x.reportedEligibility = 'eligible';
    const r = assessScrimmageSnap(scene({ players: p }));
    expect(r.fouls).toEqual([]);
    expect(r.eligibility.find(x => x.playerId === 'X')?.eligible).toBe(true);
  });
  it('preserves the under-center quarterback exception while shotgun QB is eligible', () => {
    const p = players(), q = p.find(x => x.playerId === 'QB')!;
    expect(eligibilityAtSnap(p).find(x => x.playerId === 'QB')?.eligible).toBe(true);
    q.tFormationQB = true;
    expect(eligibilityAtSnap(p).find(x => x.playerId === 'QB')?.eligible).toBe(false);
    expect(kinds(scene({ players: p }))).toEqual([]);
    q.number = 70;
    expect(kinds(scene({ players: p }))).toContain('illegal_formation');
  });
  it('keeps missing line or numbering unresolved instead of proving eligibility', () => {
    const p = players(), x = p.find(x => x.playerId === 'X')!; x.number = undefined;
    expect(eligibilityAtSnap(p).find(x => x.playerId === 'X')?.eligible).toBeNull();
    x.number = 0; x.line = undefined;
    const r = assessScrimmageSnap(scene({ players: p }));
    expect(r.eligibility.find(x => x.playerId === 'X')?.eligible).toBeNull();
    expect(r.unresolved.length).toBeGreaterThan(0);
  });
  it('does not choose one of two tied end positions as a privileged eligible receiver', () => {
    const p = players(); p.find(x => x.playerId === 'H')!.line = 'line';
    p.find(x => x.playerId === 'H')!.y = p.find(x => x.playerId === 'X')!.y;
    expect(eligibilityAtSnap(p).find(x => x.playerId === 'X')?.eligible).toBeNull();
    expect(eligibilityAtSnap(p).find(x => x.playerId === 'H')?.eligible).toBeNull();
  });
});

describe('set, shift and motion laws', () => {
  it('permits one back moving laterally after a full set', () => {
    const p = players(); p.find(x => x.playerId === 'Z')!.moving = true;
    expect(kinds(scene({ players: p }))).toEqual([]);
  });
  it('calls forward backfield motion live, not a blanket dead-ball false start', () => {
    const p = players(), z = p.find(x => x.playerId === 'Z')!; z.moving = z.movingTowardLine = true;
    expect(assessScrimmageSnap(scene({ players: p })).fouls)
      .toEqual([expect.objectContaining({ kind: 'illegal_motion', deadBall: false, playerId: 'Z' })]);
  });
  it('requires a new simultaneous set after a multi-player shift', () => {
    expect(kinds(scene({ shiftAfterLastSet: true }))).toContain('illegal_shift');
    expect(kinds(scene({ allSetSeconds: .8 }))).toContain('illegal_shift');
  });
  it('converts never-set late-half running-clock offense to false start, but not a later shift', () => {
    const f = scene({ allSetSeconds: .8, gameClockRunning: true, afterTwoMinuteWarning: true });
    expect(assessScrimmageSnap(f).fouls).toEqual([expect.objectContaining({ kind: 'false_start', deadBall: true })]);
    expect(kinds({ ...f, hadFullSet: true })).toContain('illegal_shift');
  });
  it('calls an actual snap-simulating act dead before the snap', () => {
    const p = players(); p.find(x => x.playerId === 'LT')!.simulatesSnap = true;
    const r = assessScrimmageSnap(scene({ players: p, snapOccurred: false }));
    expect(r.snapPermitted).toBe(false);
    expect(r.fouls).toEqual([expect.objectContaining({ kind: 'false_start', rule: '7-4-2' })]);
  });
  it('requires a full-second stop after T-formation QB motion', () => {
    const p = players(), q = p.find(x => x.playerId === 'QB')!;
    q.tFormationQB = true; q.tFormationQBSetSeconds = .8;
    expect(kinds(scene({ players: p }))).toContain('illegal_motion');
    q.tFormationQBSetSeconds = 1;
    expect(kinds(scene({ players: p }))).toEqual([]);
  });
  it('does not mistake a moving T-formation QB for an ordinary legal motion back', () => {
    const p = players(), q = p.find(x => x.playerId === 'QB')!;
    q.tFormationQB = true; q.moving = true;
    expect(kinds(scene({ players: p }))).toContain('illegal_motion');
    q.tFormationQB = false;
    expect(kinds(scene({ players: p }))).toEqual([]);
  });
});

describe('offside, NZI and encroachment causality', () => {
  it('does not flag a defender who enters and legally retreats before the snap', () => {
    expect(kinds(scene({ defensiveIncidents: [{ playerId: 'D0', enteredNeutralZone: true }] }))).toEqual([]);
  });
  it('keeps ordinary snap-time offside live for the free play', () => {
    const p = players(); p.find(x => x.playerId === 'D0')!.inNeutralZone = true;
    const r = assessScrimmageSnap(scene({ players: p }));
    expect(r.fouls).toEqual([expect.objectContaining({ kind: 'offside', against: 'D', deadBall: false })]);
    expect(r.snapPermitted).toBe(true);
  });
  it.each(['contactedOpponentOrBall', 'interferedWithSnap'] as const)('calls %s encroachment dead', contact => {
    expect(assessScrimmageSnap(scene({ snapOccurred: false, defensiveIncidents: [
      { playerId: 'D0', enteredNeutralZone: true, [contact]: true },
    ] })).fouls).toEqual([expect.objectContaining({ kind: 'encroachment', deadBall: true })]);
  });
  it.each(['beyondOffensiveLinemanWithUnimpededPath', 'immediateNearbyProtectiveReaction'] as const)(
    'calls %s NZI without inventing an offensive false start', cue => {
      expect(assessScrimmageSnap(scene({ snapOccurred: false, defensiveIncidents: [
        { playerId: 'D0', enteredNeutralZone: true, [cue]: true },
      ] })).fouls).toEqual([expect.objectContaining({ kind: 'neutral_zone_infraction', deadBall: true })]);
    });
  it('uses the last-two-minute legally-set NZI exception without applying it to an illegally set offense', () => {
    const p = players(); p.find(x => x.playerId === 'D0')!.inNeutralZone = true;
    expect(kinds(scene({ players: p, afterTwoMinuteWarning: true }))).toEqual(['neutral_zone_infraction']);
    expect(kinds(scene({ players: p, afterTwoMinuteWarning: true, allSetSeconds: .8, hadFullSet: true })))
      .toEqual(['illegal_shift', 'offside']);
  });
});

describe('snap, personnel, substitution and play-clock facts', () => {
  it('distinguishes early dead-ball twelve-man formations from live snap-time twelve men', () => {
    const p = players(); p.push({ playerId: 'extra', team: 'O', number: 89, y: 40, line: 'backfield' });
    expect(assessScrimmageSnap(scene({ players: p, snapOccurred: false, offensiveFormationOverElevenSeconds: 3.1 })).fouls)
      .toEqual([expect.objectContaining({ kind: 'too_many_players', deadBall: true })]);
    expect(assessScrimmageSnap(scene({ players: p })).fouls)
      .toEqual([expect.objectContaining({ kind: 'too_many_players', deadBall: false })]);
  });
  it('calls defensive twelve dead when the snap is imminent', () => {
    const p = players(); p.push({ playerId: 'extra', team: 'D', number: 23, y: 40 });
    expect(assessScrimmageSnap(scene({ players: p, snapOccurred: false, snapImminent: true })).fouls)
      .toEqual([expect.objectContaining({ kind: 'too_many_players', against: 'D', deadBall: true })]);
  });
  it('prevents a delay-of-game snap without pretending a pre-snap clock exists by default', () => {
    expect(kinds(scene())).toEqual([]);
    const r = assessScrimmageSnap(scene({ playClockExpired: true, snapOccurred: false }));
    expect(r.snapPermitted).toBe(false);
    expect(r.fouls).toEqual([expect.objectContaining({ kind: 'delay_of_game', deadBall: true })]);
  });
  it('keeps the ball dead until officials are ready, with a penalty only on warned repeated snaps', () => {
    const f = scene({ snap: { officialsReady: false } });
    expect(assessScrimmageSnap(f)).toMatchObject({ snapPermitted: false, fouls: [] });
    expect(kinds({ ...f, snap: { officialsReady: false, repeatedBeforeOfficialsReadyAfterWarning: true } }))
      .toContain('delay_of_game');
  });
  it('rejects a snap straight to a line player but preserves the grounded-snap exception', () => {
    const f = scene({ snap: { receiverId: 'LT' } });
    expect(kinds(f)).toContain('illegal_snap');
    expect(kinds({ ...f, snap: { receiverId: 'LT', firstGroundedOrMuffedByEligibleBack: true } })).toEqual([]);
  });
  it('does not declare an invalid one-motion/ball-on-ground snap legal', () => {
    expect(kinds(scene({ snap: { ballOnGround: false } }))).toContain('illegal_snap');
    expect(kinds(scene({ snap: { quickContinuousHandMotion: false } }))).toContain('illegal_snap');
  });
  it('requires the snapper to be on the line, independent of who receives the snap', () => {
    expect(kinds(scene({ snap: { snapperId: 'RB', receiverId: 'QB' } }))).toContain('illegal_snap');
    expect(kinds(scene({ snap: { snapperId: 'C', receiverId: 'QB' } }))).toEqual([]);
  });
  it('keeps illegal substitute interference as an unfair-act remedy, not an invented five-yard cure', () => {
    const r = assessScrimmageSnap(scene({ substitutions: [
      { playerId: 'extra', team: 'D', enteredDuringLiveBall: true, interferedDuringLiveBall: true },
    ] }));
    expect(r.fouls).toEqual([]);
    expect(r.unresolved.join(' ')).toContain('unfair-act');
  });
  it('keeps the required defensive substitution response opportunity distinct from free twelve-man flags', () => {
    const r = assessScrimmageSnap(scene({ defensiveMatchupOpportunityDenied: true }));
    expect(r.snapPermitted).toBe(false); expect(r.fouls).toEqual([]);
    expect(kinds(scene({ defensiveMatchupOpportunityDenied: true, substitutionDeceptionAfterWarning: true })))
      .toContain('unsportsmanlike_conduct');
  });
  it('does not mutate input facts or consume randomness', () => {
    const f = scene(), before = JSON.stringify(f);
    expect(assessScrimmageSnap(f)).toEqual(assessScrimmageSnap(f));
    expect(JSON.stringify(f)).toBe(before);
  });
});

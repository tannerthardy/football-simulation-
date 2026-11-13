import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import { generateTeam, pickDefense, pickOffense, type Team } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { BallState, CarrierSegment, PlayResult, PlayStats } from '../src/sim/types.js';
import { deriveOfficialPossessionStats, type NativeFumbleCredit } from '../src/game/possession-stats.js';

function segment(team: 'O' | 'D', carrier: string, how: CarrierSegment['how'], end: CarrierSegment['end']): CarrierSegment {
  return { team, carrier, how, end, startX: 40, endX: 45 };
}
function result(segments: CarrierSegment[] = [], fumbles?: NativeFumbleCredit[]) {
  const stats: PlayStats & { fumbles?: NativeFumbleCredit[] } = { tacklers: [], completed: false, attempted: false,
    sacked: false, scramble: false, throwaway: false, pressured: false, brokenTackles: 0, missedTackles: 0, dropped: false,
    ...(fumbles !== undefined ? { fumbles } : {}) };
  const possession = segments.at(-1)?.team ?? 'O';
  return { stats, segments, possession, turnover: possession === 'D' };
}
const snap = (end: CarrierSegment['end'] = 'pass') => segment('O', 'QB', 'snap', end);
const intercept = (end: CarrierSegment['end'] = 'dead') => segment('D', 'FS', 'interception', end);

describe('official multi-possession turnovers', () => {
  it('does not count a normal snap or handoff as a turnover', () => {
    const r = result([snap('handoff'), segment('O', 'RB', 'handoff', 'dead')], []);
    expect(deriveOfficialPossessionStats(r)).toEqual({ teamTurnovers: { O: 0, D: 0 }, fumbleCredits: [], recoveryCredits: [] });
  });
  it('counts one actual interception without double-counting its singular field', () => {
    const r = result([snap(), intercept()], []); r.stats.interceptedBy = 'FS';
    expect(deriveOfficialPossessionStats(r).teamTurnovers).toEqual({ O: 1, D: 0 });
  });
  it('counts INT then return fumble then original-offense recovery as one turnover by each side', () => {
    const r = result([snap(), intercept('fumble'), segment('O', 'X', 'recovery', 'dead')],
      [{ playerId: 'FS', team: 'D', lost: true, recoveredBy: 'X' }]);
    r.stats.interceptedBy = 'FS';
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 1 });
    expect(actual.fumbleCredits).toEqual([{ playerId: 'FS', team: 'D', lost: true, recoveredBy: 'X', recoveryTeam: 'O' }]);
    expect(actual.recoveryCredits).toEqual([{ playerId: 'X', team: 'O' }]);
  });
  it('does not add a turnover or recovery credit for a return-team own recovery', () => {
    const r = result([snap(), intercept('fumble'), segment('D', 'SS', 'recovery', 'dead')],
      [{ playerId: 'FS', team: 'D', lost: false, recoveredBy: 'SS' }]);
    r.stats.interceptedBy = 'FS';
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(actual.fumbleCredits[0]).toMatchObject({ playerId: 'FS', team: 'D', lost: false, recoveryTeam: 'D' });
    expect(actual.recoveryCredits).toEqual([]);
  });
  it('counts opposing fumble losses once each across two changes', () => {
    const r = result([snap('handoff'), segment('O', 'RB', 'handoff', 'fumble'),
      segment('D', 'LB', 'recovery', 'fumble'), segment('O', 'Y', 'recovery', 'dead')],
    [{ playerId: 'RB', team: 'O', lost: true, recoveredBy: 'LB' }, { playerId: 'LB', team: 'D', lost: true, recoveredBy: 'Y' }]);
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 1 });
    expect(actual.recoveryCredits).toEqual([{ playerId: 'LB', team: 'D' }, { playerId: 'Y', team: 'O' }]);
  });
  it('counts an opponent-endzone OOB fumble touchback despite no opponent carrier segment', () => {
    const r = result([snap('handoff'), segment('O', 'RB', 'handoff', 'fumble')],
      [{ playerId: 'RB', team: 'O', lost: true }]);
    r.possession = 'D'; r.turnover = true;
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(actual.recoveryCredits).toEqual([]);
  });
  it('does not turn a retained infield OOB fumble into a lost fumble', () => {
    const r = result([snap('handoff'), segment('O', 'RB', 'handoff', 'fumble')],
      [{ playerId: 'RB', team: 'O', lost: false }]);
    expect(deriveOfficialPossessionStats(r).teamTurnovers).toEqual({ O: 0, D: 0 });
  });
  it('keeps repeated fumbles by the same player as separate credits', () => {
    const r = result([snap('handoff'), segment('O', 'RB', 'handoff', 'fumble'),
      segment('O', 'RB', 'recovery', 'fumble'), segment('D', 'LB', 'recovery', 'dead')],
    [{ playerId: 'RB', team: 'O', lost: false, recoveredBy: 'RB' },
      { playerId: 'RB', team: 'O', lost: true, recoveredBy: 'LB' }]);
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.fumbleCredits).toHaveLength(2);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(actual.recoveryCredits).toEqual([{ playerId: 'LB', team: 'D' }]);
  });
  it('treats an explicit empty native ledger as authoritative over stale singular fumble fields', () => {
    const r = result([snap('dead')], []);
    r.stats.fumbledBy = 'QB'; r.stats.fumbleLost = true; r.stats.fumbleRecoveredBy = 'FS';
    expect(deriveOfficialPossessionStats(r)).toEqual({ teamTurnovers: { O: 0, D: 0 }, fumbleCredits: [], recoveryCredits: [] });
  });
  it('does not award a recovery to an own-team player even when an inconsistent lost bit is supplied', () => {
    const r = result([snap('fumble'), segment('O', 'RB', 'recovery', 'dead')],
      [{ playerId: 'QB', team: 'O', lost: true, recoveredBy: 'RB' }]);
    expect(deriveOfficialPossessionStats(r).recoveryCredits).toEqual([]);
  });
});

describe('historical singular-field and segment compatibility', () => {
  it('uses a segment-proven opposing recovery without duplicating singular loss', () => {
    const r = result([snap('fumble'), segment('D', 'FS', 'recovery', 'dead')]);
    r.stats.fumbledBy = 'QB'; r.stats.fumbleLost = true; r.stats.fumbleRecoveredBy = 'FS';
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(actual.fumbleCredits).toHaveLength(1);
    expect(actual.recoveryCredits).toEqual([{ playerId: 'FS', team: 'D' }]);
  });
  it('uses the first actual recovery, rather than final possession or a stale loss flag', () => {
    const r = result([snap('fumble'), segment('O', 'RB', 'recovery', 'pass'), intercept()]);
    r.stats.fumbledBy = 'QB'; r.stats.fumbleLost = true; r.stats.interceptedBy = 'FS';
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.fumbleCredits[0]).toMatchObject({ playerId: 'QB', lost: false, recoveredBy: 'RB' });
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(actual.recoveryCredits).toEqual([]);
  });
  it('recovers return-team fumble ownership from segments even when old singular fields are absent', () => {
    const r = result([snap(), intercept('fumble'), segment('O', 'X', 'recovery', 'dead')]);
    r.stats.interceptedBy = 'FS';
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.fumbleCredits[0]).toMatchObject({ playerId: 'FS', team: 'D', lost: true });
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 1 });
  });
  it('preserves the old singular fumble and interception fallbacks when no useful segments exist', () => {
    const fumble = result(); fumble.stats.fumbledBy = 'RB'; fumble.stats.fumbleLost = true;
    fumble.stats.fumbleRecoveredBy = 'LB'; fumble.possession = 'D'; fumble.turnover = true;
    expect(deriveOfficialPossessionStats(fumble).teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(deriveOfficialPossessionStats(fumble).recoveryCredits).toEqual([{ playerId: 'LB', team: 'D' }]);
    const pick = result(); pick.stats.interceptedBy = 'FS'; pick.possession = 'D'; pick.turnover = true;
    expect(deriveOfficialPossessionStats(pick).teamTurnovers).toEqual({ O: 1, D: 0 });
  });
  it('preserves a final-possession-only historical turnover', () => {
    const r = result(); r.possession = 'D'; r.turnover = true;
    expect(deriveOfficialPossessionStats(r).teamTurnovers).toEqual({ O: 1, D: 0 });
  });
  it('handles a missed backward pitch whose old segment ended as a handoff', () => {
    const r = result([snap('handoff'), segment('D', 'LB', 'recovery', 'dead')]);
    r.stats.fumbledBy = 'QB'; r.stats.fumbleLost = true;
    const actual = deriveOfficialPossessionStats(r);
    expect(actual.teamTurnovers).toEqual({ O: 1, D: 0 });
    expect(actual.recoveryCredits).toEqual([{ playerId: 'LB', team: 'D' }]);
  });
});

describe('official history selected by enforcement', () => {
  it('excludes a later illegal return pass only when the caller selects the accepted pre-foul history', () => {
    const raw = result([snap(), intercept('pass'), segment('O', 'X', 'interception', 'dead')], []);
    raw.stats.interceptedBy = 'FS';
    expect(deriveOfficialPossessionStats(raw).teamTurnovers).toEqual({ O: 1, D: 1 });
    const accepted = { ...raw, segments: raw.segments.slice(0, 2), stats: { ...raw.stats, fumbles: [] },
      possession: 'D' as const, turnover: true };
    expect(deriveOfficialPossessionStats(accepted).teamTurnovers).toEqual({ O: 1, D: 0 });
  });
  it('does not mutate frozen result history or fumble records', () => {
    const r = result([snap('fumble'), segment('D', 'LB', 'recovery', 'dead')],
      [{ playerId: 'QB', team: 'O', lost: true, recoveredBy: 'LB' }]);
    for (const f of r.stats.fumbles!) Object.freeze(f);
    Object.freeze(r.stats.fumbles); Object.freeze(r.stats);
    for (const s of r.segments) Object.freeze(s);
    Object.freeze(r.segments); Object.freeze(r);
    expect(() => deriveOfficialPossessionStats(r)).not.toThrow();
  });
});


function nativeFixture() {
  const offense = generateTeam(new Rng(751), 'O', 'OFF', { strength: .55 });
  const defense = generateTeam(new Rng(752), 'D', 'DEF', { strength: .55 });
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'official possession stats' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 753, audibles: false });
  for (const a of sim.agents) { a.body.pos = { x: 15, y: 2 + a.idx }; a.body.vel = { x: 0, y: 0 }; a.downUntil = 99; }
  sim.t = sim.world.time = 2;
  const game = new Game(offense, defense, { seed: 754 });
  const credit = (r: PlayResult = sim.buildResult()) => {
    (game as unknown as { recordStats(sim: PlaySim, r: PlayResult, off: Team, def: Team): void })
      .recordStats(sim, r, offense, defense);
    return game.result().box;
  };
  function intercept() {
    sim.qb.body.pos = { x: 35, y: CENTER_Y }; sim.ball = { kind: 'held', carrier: sim.qb };
    sim.throwBall(sim.qb, sim.slot('X')!, { x: 10, y: 0, z: 2 }, { x: 45, y: CENTER_Y, z: 1 }, 3);
    const defender = sim.slot('FS')!; defender.body.pos = { x: 45, y: CENTER_Y };
    sim.possess(defender, 'interception');
    return defender;
  }
  return { sim, game, offense, defense, credit, intercept };
}

describe('native fumble ledger through official Game box-score hooks', () => {
  it('credits INT, defensive return fumble and offensive recovery to their actual original sides', () => {
    const { sim, offense, defense, credit, intercept } = nativeFixture();
    const defender = intercept(), recovery = sim.slot('X')!;
    defender.body.pos.x = 53; sim.fumble(defender, null); recovery.body.pos = { x: 53, y: CENTER_Y };
    sim.possess(recovery, 'recovery'); sim.finishCarry('tackle', recovery.pos);
    const box = credit();
    expect(box.team(offense.abbr).turnovers).toBe(1);
    expect(box.team(defense.abbr).turnovers).toBe(1);
    expect(box.players.get(defender.player.id)).toMatchObject({ team: defense.abbr, defInt: 1, fumbles: 1, fumblesLost: 1, fr: 0 });
    expect(box.players.get(recovery.player.id)).toMatchObject({ team: offense.abbr, fr: 1 });
    expect(box.players.get(sim.qb.player.id)?.int).toBe(1);
  });
  it('retains only the original INT turnover and no FR for a defensive own recovery', () => {
    const { sim, offense, defense, credit, intercept } = nativeFixture();
    const defender = intercept(), recovery = sim.slot('SS')!;
    defender.body.pos.x = 53; sim.fumble(defender, null); recovery.body.pos = { x: 53, y: CENTER_Y };
    sim.possess(recovery, 'recovery'); sim.finishCarry('tackle', recovery.pos);
    const box = credit();
    expect(box.team(offense.abbr).turnovers).toBe(1); expect(box.team(defense.abbr).turnovers).toBe(0);
    expect(box.players.get(defender.player.id)).toMatchObject({ fumbles: 1, fumblesLost: 0 });
    expect(box.players.get(recovery.player.id)?.fr ?? 0).toBe(0);
  });
  it('credits a native opponent-endzone OOB fumble touchback without inventing a recovery player', () => {
    const { sim, offense, defense, credit } = nativeFixture(), rb = sim.slot('RB')!;
    sim.qb.downUntil = -1; rb.downUntil = -1;
    sim.qb.body.pos = { x: 35, y: CENTER_Y }; rb.body.pos = { x: 34.6, y: CENTER_Y };
    sim.ball = { kind: 'held', carrier: sim.qb }; expect(sim.handoff(sim.qb, rb)).toBe(true);
    rb.body.pos.x = 108; sim.fumble(rb, null);
    const loose = sim.ball as BallState;
    if (loose.kind !== 'loose') throw new Error('Native fumble missing');
    loose.flight = { pos: { x: 113, y: .1, z: 0 }, vel: { x: 0, y: -4, z: 0 }, drag: 0 };
    (sim as unknown as { updateBall(): void }).updateBall();
    expect(sim.outcome).toBe('touchback');
    const box = credit();
    expect(box.team(offense.abbr).turnovers).toBe(1); expect(box.team(defense.abbr).turnovers).toBe(0);
    expect(box.players.get(rb.player.id)).toMatchObject({ fumbles: 1, fumblesLost: 1 });
    expect([...box.players.values()].reduce((sum, l) => sum + l.fr, 0)).toBe(0);
  });
  it('uses deep pre-illegal-pass snapshots for accepted returner penalties', () => {
    const { sim, offense, defense, credit, intercept } = nativeFixture(), defender = intercept(), rec = sim.slot('X')!;
    defender.body.pos.x = 35;
    sim.throwBall(defender, null, { x: -10, y: 0, z: 2 }, { x: 30, y: CENTER_Y, z: 1 }, 3);
    rec.body.pos = { x: 30, y: CENTER_Y }; sim.possess(rec, 'interception');
    sim.fumble(rec, null); sim.possess(sim.slot('Y')!, 'recovery'); sim.finishCarry('tackle', sim.slot('Y')!.pos);
    const raw = sim.buildResult();
    expect(raw.stats.fumbles).toHaveLength(1);
    expect(raw.statsBeforeIllegalPass?.fumbles?.length ?? 0).toBe(0);
    expect(deriveOfficialPossessionStats(raw).teamTurnovers).toEqual({ O: 1, D: 1 });
    const accepted = { ...raw, segments: raw.segmentsBeforeIllegalPass!, stats: raw.statsBeforeIllegalPass!,
      possession: 'D' as const, turnover: true, score: null };
    const box = credit(accepted);
    expect(box.team(offense.abbr).turnovers).toBe(1); expect(box.team(defense.abbr).turnovers).toBe(0);
    expect(box.players.get(rec.player.id)?.fumbles ?? 0).toBe(0);
  });
});

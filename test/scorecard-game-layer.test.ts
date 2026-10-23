import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameResult, PlayLog } from '../src/game/game.js';
import { BoxScore } from '../src/game/stats.js';
import { METRICS, evaluate, interval, penaltyMetrics } from '../scripts/scorecard/metrics.js';
import { gameLayerRecord, type GameLayerRec, type GameRec } from '../scripts/scorecard/records.js';
import type { Card } from '../scripts/scorecard/provenance.js';

const empty = (): GameLayerRec => ({ fieldGoals: [], kicks: [], puntGrossYards: 0,
  fourthOpportunities: 0, fourthGoes: 0, fourthAttempts: 0, fourthConversions: 0,
  twoPointChoices: 0, touchdowns: 0, drives: 0, drivePoints: 0, redZoneTrips: 0,
  redZoneTDs: 0, turnovers: 0, penaltiesByType: {} });
const game = (gameLayer?: GameLayerRec, punts = 0): GameRec => ({
  game: 0, league: 0, seed: 7, home: 'H', away: 'A', points: 20, totalYds: 400, penalties: 3,
  third: 10, thirdConv: 4, fga: 2, fgm: 1, xpa: 2, xpm: 2, fumLost: 1, punts,
  tie: false, ms: 1, plays: [], probe: {}, ...(gameLayer ? { gameLayer } : {}) });
const metric = (id: string) => METRICS.find(m => m.id === id)!;
const play = (kind: PlayLog['kind'], patch: Partial<PlayLog> = {}): PlayLog => ({
  index: 0, quarter: 1, clock: 600, offense: 'H', down: 1, distance: 10,
  yardline: 25, call: '', defense: '', text: '', yards: 0, score: { home: 0, away: 0 }, kind, ...patch });
const result = (log: PlayLog[], score = { home: 0, away: 0 }): GameResult => ({
  home: { abbr: 'H' }, away: { abbr: 'A' }, box: new BoxScore(), score, log, quarterScores: [],
} as unknown as GameResult);

describe('game-layer scorecard arithmetic', () => {
  const a: GameLayerRec = { ...empty(), fieldGoals: [
    { distance: 18, good: true }, { distance: 29, good: false }, { distance: 30, good: true },
    { distance: 40, good: false }, { distance: 50, good: true }],
    kicks: [
      { kind: 'punt', netYards: 40, returned: true, returnYards: 10, touchback: false },
      { kind: 'punt', netYards: 20, returned: false, returnYards: 0, touchback: true },
      { kind: 'kickoff', returned: true, returnYards: 20, touchback: false },
      { kind: 'kickoff', returned: false, returnYards: 0, touchback: true }],
    puntGrossYards: 90, fourthOpportunities: 3, fourthGoes: 1, fourthAttempts: 2,
    fourthConversions: 1, twoPointChoices: 1, touchdowns: 2, drives: 3, drivePoints: 10,
    redZoneTrips: 2, redZoneTDs: 1, turnovers: 1,
    penaltiesByType: { offensive_holding: 2, false_start: 1 } };
  const b: GameLayerRec = { ...empty(), fieldGoals: [
    { distance: 39, good: false }, { distance: 49, good: true }, { distance: 61, good: false }],
    kicks: [
      { kind: 'punt', netYards: 50, returned: true, returnYards: 0, touchback: false },
      { kind: 'kickoff', returned: true, returnYards: 30, touchback: false },
      { kind: 'onside', returned: false, touchback: false },
      { kind: 'safety', returned: true, returnYards: 100, touchback: false }],
    puntGrossYards: 60, fourthOpportunities: 2, fourthGoes: 1, fourthAttempts: 3,
    fourthConversions: 2, touchdowns: 1, drives: 2, drivePoints: 7,
    redZoneTrips: 1, redZoneTDs: 1, turnovers: 3, penaltiesByType: { false_start: 1 } };
  const games = [game(a, 2), game(b, 1)];

  it.each([
    ['fg18', 50, 2], ['fg30', 50, 2], ['fg40', 50, 2], ['fg50', 50, 2],
    ['puntGross', 50, 3], ['puntNet', 110 / 3, 3], ['kickReturn', 25, 2], ['puntReturn', 5, 2],
    ['kickTouchback', 100 / 3, 3], ['puntTouchback', 100 / 3, 3],
    ['fourthGo', 40, 5], ['fourthConversion', 60, 5], ['twoPoint', 100 / 3, 3],
    ['drives', 1.25, 4], ['pointsPerDrive', 3.4, 5], ['redZoneTD', 200 / 3, 3], ['turnovers', 1, 4],
  ])('%s uses the right numerator and exposure, with no invented NFL band', (id, expected, n) => {
    const m = metric(id as string), actual = evaluate(m, games);
    expect(actual.value).toBeCloseTo(expected as number, 10);
    expect(actual.n).toBe(n);
    expect(m.band).toBeUndefined();
    expect(m.source).toBe('internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json');
  });

  it('counts accepted penalty names per team-game, including a zero in the other arm', () => {
    const m = penaltyMetrics(games).find(m => m.id === 'penalty:offensive_holding')!;
    expect(evaluate(m, games)).toEqual({ value: .5, n: 4 });
    expect(evaluate(m, [games[1]])).toEqual({ value: 0, n: 2 });
    expect(penaltyMetrics(games).map(m => m.id)).toEqual(['penalty:false_start', 'penalty:offensive_holding']);
  });

  it('keeps all older metrics identical when the additive measurements are attached', () => {
    const legacy = games.map(({ gameLayer: _layer, ...g }) => g);
    for (const m of METRICS.filter(m => m.source !== 'internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json'))
      expect(evaluate(m, games)).toEqual(evaluate(m, legacy));
  });

  it('keeps missing legacy measurements and unknown return credit unavailable', () => {
    for (const m of METRICS.filter(m => m.source === 'internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json')) {
      expect(evaluate(m, [game()]).value).toBeNaN();
      expect(evaluate(m, [games[0], game()]).value).toBeNaN();
    }
    const unknown = game({ ...empty(), kicks: [{ kind: 'punt', touchback: false }] }, 1);
    expect(evaluate(metric('puntReturn'), [unknown]).value).toBeNaN();
    expect(evaluate(metric('puntNet'), [unknown]).value).toBeNaN();
    expect(interval(metric('puntReturn'), [games[0], unknown]).every(Number.isNaN)).toBe(true);
    expect(evaluate(metric('fg18'), [game(empty())]).value).toBeNaN();
    expect(evaluate(metric('fg18'), [game({ ...empty(), fieldGoals: [{ good: true }] })]).value).toBeNaN();
  });
});

describe('completed game-log extraction', () => {
  it('uses the complete accepted ledger without double-counting the legacy alias', () => {
    const accepted = { kind: 'offensive_holding', team: 'H', yards: 10, accepted: true, offset: false };
    const res = result([play('penalty', { fouls: [accepted,
      { ...accepted, kind: 'illegal_contact', accepted: false },
      { ...accepted, kind: 'offside', offset: true }], foul: accepted }),
      play('penalty', { foul: { kind: 'false_start', team: 'H', yards: 5, accepted: true } })]);
    const before = JSON.stringify(res);
    expect(gameLayerRecord(res).penaltiesByType).toEqual({ offensive_holding: 1, false_start: 1 });
    expect(JSON.stringify(res)).toBe(before);
  });

  it('excludes Q4 at/below 150 seconds, replayed downs and kneels from go opportunities', () => {
    const go = { down: 4, officialCredit: { treatment: 'physical', playCharged: true, downAttempt: true, converted: true } } as const;
    const res = result([
      play('run', { ...go, quarter: 4, clock: 151 }),
      play('pass', { ...go, quarter: 4, clock: 150 }),
      play('pass', { ...go, quarter: 4, clock: 149 }),
      play('run', { ...go, quarter: 2, clock: 10 }),
      play('run', { ...go, nullified: true, officialCredit: { ...go.officialCredit, downAttempt: false } }),
      play('pass', { ...go, nullified: true, officialCredit: { ...go.officialCredit, treatment: 'loss_of_down' } }),
      play('punt', { down: 4 }), play('fg', { down: 4, fgDistance: 45, fgGood: false }),
      play('punt', { down: 4, nullified: true }), play('kneel', { down: 4 }),
    ]);
    Object.assign(res.box.team('H'), { fourthAtt: 7, fourthConv: 3 });
    const r = gameLayerRecord(res);
    expect(r.fourthOpportunities).toBe(5);
    expect(r.fourthGoes).toBe(3);
    expect(r.fourthAttempts).toBe(7);
    expect(r.fourthConversions).toBe(3);
  });

  it('counts offensive drives through quarters, halftime, Try retries and same-team kick recoveries', () => {
    const res = result([
      play('kickoff', { offense: 'A' }),
      play('run'), play('penalty'), play('pass', { quarter: 2 }),
      play('run', { quarter: 2, outcome: 'touchdown' }),
      play('two', { quarter: 2, score: { home: 6, away: 0 }, nullified: true }),
      play('two', { quarter: 2, score: { home: 6, away: 0 } }),
      play('kickoff', { quarter: 2, score: { home: 8, away: 0 }, kick: { kind: 'onside', retry: false, touchback: false } }),
      play('kneel', { quarter: 2, score: { home: 8, away: 0 } }),
      play('kickoff', { quarter: 3, offense: 'A', score: { home: 8, away: 0 } }),
      play('run', { quarter: 3, score: { home: 8, away: 0 } }),
      play('punt', { quarter: 3, score: { home: 8, away: 0 } }),
      play('pass', { quarter: 3, offense: 'A', score: { home: 8, away: 0 } }),
      play('fg', { quarter: 4, offense: 'A', score: { home: 8, away: 0 }, fgDistance: 39, fgGood: true }),
    ], { home: 8, away: 3 });
    const before = JSON.stringify(res), r = gameLayerRecord(res);
    expect(r.drives).toBe(4);
    expect(r.drivePoints).toBe(11);
    expect(r.touchdowns).toBe(1);
    expect(r.twoPointChoices).toBe(1);
    expect(r.fieldGoals).toEqual([{ distance: 39, good: true }]);
    expect(JSON.stringify(res)).toBe(before);
  });

  it('excludes defensive/return scores from offensive points but includes their TD in Try exposure', () => {
    const res = result([
      play('run'), play('punt'),
      play('xp', { offense: 'A', score: { home: 0, away: 7 } }),
      play('kickoff', { offense: 'A', score: { home: 0, away: 7 } }),
      play('pass', { score: { home: 0, away: 7 }, outcome: 'touchdown',
        segments: [{ team: 'D' }] as PlayLog['segments'] }),
      play('two', { offense: 'A', score: { home: 0, away: 13 } }),
    ], { home: 0, away: 15 });
    const r = gameLayerRecord(res);
    expect(r.drives).toBe(2);
    expect(r.drivePoints).toBe(0);
    expect(r.touchdowns).toBe(2);
    expect(r.twoPointChoices).toBe(1);
  });

  it('omits kick retries and raw nullified FG makes while preserving unknown supplied returns', () => {
    const res = result([
      play('kickoff', { kick: { kind: 'kickoff', retry: true, touchback: false } }),
      play('kickoff', { kick: { kind: 'kickoff', retry: false, touchback: true, returned: false, returnYards: 0 } }),
      play('punt', { nullified: true, kick: { kind: 'punt', retry: true, touchback: false } }),
      play('punt', { kick: { kind: 'punt', retry: false, touchback: false } }),
      play('fg', { nullified: true, fgGood: true, fgDistance: 20 }),
      play('fg', { fgGood: true, fgDistance: 30 }),
    ]);
    const r = gameLayerRecord(res);
    expect(r.kicks).toHaveLength(2);
    expect(r.kicks[1].returned).toBeUndefined();
    expect(r.fieldGoals).toEqual([{ distance: 30, good: false }]);
  });
});

it('prints the new rows and accepted penalty types with quick-tier rendering and no invented reference', () => {
  const dir = mkdtempSync(join(tmpdir(), 'scorecard-game-layer-'));
  try {
    const saved = join(dir, 'saved.json'), before = JSON.stringify({
      meta: { commit: 'fixture', date: '2026-10-23', seed: 7, games: 1, leagues: 1, node: process.version },
      arms: [{ name: 'fixture', env: {}, games: [game({ ...empty(), penaltiesByType: { false_start: 2 } })] }],
    } satisfies Card);
    writeFileSync(saved, before);
    const report = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/scorecard/run.ts',
      '--tier', 'quick', '--from', saved], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    for (const id of ['fg18', 'fg30', 'fg40', 'fg50', 'puntGross', 'puntNet', 'kickReturn', 'puntReturn',
      'kickTouchback', 'puntTouchback', 'fourthGo', 'fourthConversion', 'twoPoint', 'drives',
      'pointsPerDrive', 'redZoneTD', 'turnovers']) expect(report).toContain(`| ${metric(id).label} |`);
    expect(report).toContain('| Accepted penalties / team-game: false_start | 1.00 |');
    expect(report).toContain('| internal: no band yet; NFL ranges in data/reviews/nflverse/game-layer.json |');
    expect(readFileSync(saved, 'utf8')).toBe(before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

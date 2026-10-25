/** Saved native-event controls and one native-play passivity pair; no games or downloads. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameHooks, GameResult } from '../src/game/game.js';
import type { PlayEvent, PlayStats } from '../src/sim/types.js';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { METRICS, evaluate, interval } from '../scripts/scorecard/metrics.js';
import { gameRecord, type GameRec, type PlayRec } from '../scripts/scorecard/records.js';
import { captureTackleOpportunities, failedTackleOpportunities } from '../scripts/scorecard/tackles.js';
import { engineSettings, provenance, type Card } from '../scripts/scorecard/provenance.js';

const players = [
  { team: 'O', id: 'qb' }, { team: 'O', id: 'runner' },
  { team: 'D', id: 'first' }, { team: 'D', id: 'second' }, { team: 'D', id: 'assist' },
] as const;
const e = (type: PlayEvent['type'], a?: number, b?: number): PlayEvent => ({ type, t: 1, a, b });
const count = (events: PlayEvent[], tacklers: string[] = []) => failedTackleOpportunities({ events, players }, { tacklers });
const m = METRICS.find((m) => m.id === 'failedTackleOpportunities')!;
const play = (failed?: number): PlayRec => ({
  kind: 'run', down: 1, dist: 10, yl: 25, quarter: 1, concept: 'iz', coverage: 'cover3', family: 'cover3',
  formation: 'gun', personnel: '11', playAction: false, yards: 4, att: false, comp: false, sack: false,
  int: false, td: false, scramble: false, throwaway: false, missed: 3, broken: 2, firstDown: false,
  failedTackleOpportunities: failed,
});
const game = (...plays: PlayRec[]): GameRec => ({
  game: 0, league: 0, seed: 7, home: 'H', away: 'A', points: 40, totalYds: 600, penalties: 4,
  third: 10, thirdConv: 4, fga: 2, fgm: 1, xpa: 3, xpm: 3, fumLost: 0, punts: 6, tie: false,
  ms: 1000, plays, probe: {},
});

describe('per-defender failed tackle opportunities', () => {
  it('deduplicates repeated whiffs and lost grips, excluding defenders who later finish', () => {
    const events = [e('handoff', 0, 1), e('missed_tackle', 2, 1), e('missed_tackle', 2, 1),
      e('broken_tackle', 1, 2), e('broken_tackle', 1, 3), e('tackle_wrap', 3, 1), e('tackle', 3, 1)];
    const original = structuredClone(events);
    expect(count(events, ['second'])).toBe(1);
    expect(events).toEqual(original);
  });

  it('counts a lost assisting grip unless the defender is in the final tackle credit', () => {
    const events = [e('handoff', 0, 1), e('tackle_wrap', 2, 1), e('tackle_wrap', 4, 1),
      e('broken_tackle', 1, 4), e('tackle', 2, 1)];
    expect(count(events, ['first'])).toBe(1);
    expect(count(events, ['first', 'assist'])).toBe(0);
    expect(count([e('handoff', 0, 1), e('broken_tackle', 1, 2), e('out_of_bounds', 1)])).toBe(1);
  });

  it('starts at the handoff, catch, pitch catch or scramble and excludes pocket/return attempts', () => {
    expect(count([e('missed_tackle', 2, 0), e('sack', 2, 0)], ['first'])).toBe(0);
    for (const start of [e('handoff', 0, 1), e('catch', 1), e('pitch_catch', 1, 0)]) {
      expect(count([e('missed_tackle', 2, 0), start, e('broken_tackle', 1, 2),
        e('missed_tackle', 0, 3)])).toBe(1);
    }
    expect(count([e('missed_tackle', 2, 0), e('scramble', 0), e('missed_tackle', 3, 0)])).toBe(1);
    expect(count([e('catch', 3), e('missed_tackle', 0, 3)])).toBeUndefined();
  });

  it('leaves incomplete event identities unknown', () => {
    expect(count([e('handoff', 0)])).toBeUndefined();
    expect(count([e('handoff', 0, 1), e('broken_tackle', 1, 99)])).toBeUndefined();
    expect(count([e('handoff', 0, 1), e('missed_tackle', undefined, 1)])).toBeUndefined();
    expect(count([e('handoff', 0, 1), e('missed_tackle', 2)])).toBeUndefined();
  });

  it('observes the original result once and attaches counts only to official recorded plays', () => {
    const stats = { tacklers: ['second'], missedTackles: 3, brokenTackles: 2 } as PlayStats;
    const result = { stats, events: [e('handoff', 0, 1), e('broken_tackle', 1, 2), e('tackle', 3, 1)] };
    let runs = 0;
    const sim = {
      run: () => { runs++; return result; }, agents: players.map((p) => ({ team: p.team, player: { id: p.id } })),
    } as unknown as Parameters<NonNullable<GameHooks['playResult']>>[0];
    const observation = captureTackleOpportunities();
    expect(observation.hooks.playResult!(sim, 'scrimmage')).toBeUndefined();
    expect(runs).toBe(0);
    expect(sim.run()).toBe(result);
    expect(runs).toBe(1);
    const log = { kind: 'run', down: 1, distance: 10, yardline: 25, quarter: 1, yards: 4, text: '', stats };
    const res = { home: { abbr: 'H' }, away: { abbr: 'A' }, score: { home: 20, away: 20 },
      box: { team: () => ({ thirdAtt: 0, thirdConv: 0, penalties: 0, totalYds: 0 }), teamPlayers: () => [] },
      log: [log, { ...log, nullified: true }],
    } as unknown as GameResult;
    const rec = gameRecord({ game: 0, league: 0, seed: 7, home: 0, away: 1 }, res, 1000, observation.count);
    expect(rec.plays).toHaveLength(1);
    expect(rec.plays[0]).toMatchObject({ missed: 3, broken: 2, failedTackleOpportunities: 1 });
    expect(observation.count({ ...stats })).toBeUndefined();
  });

  it('uses official plays as the denominator and keeps missing legacy measurements unavailable', () => {
    const recorded = game(play(2), play(0)), other = game(play(1)), legacy = game(play());
    expect(evaluate(m, [recorded, other])).toEqual({ value: 1, n: 3 });
    expect(evaluate(m, [legacy]).value).toBeNaN();
    expect(evaluate(m, [recorded, legacy]).value).toBeNaN();
    const range = interval(m, [recorded, legacy]);
    expect(range.every(Number.isNaN)).toBe(true);
    expect(m.band).toBeUndefined();
    expect(METRICS.indexOf(m)).toBe(METRICS.findIndex((m) => m.id === 'missed') + 1);
  });

  it('preserves one native play result and RNG continuation with observation enabled', () => {
    const offense = pickOffense(generateTeam(new Rng(19), 'O', 'OFF'), '11');
    const defense = pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel');
    const stage = () => new PlaySim({ offense, defense,
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'control' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'control' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 83, record: false });
    const control = stage(), observed = stage(), observation = captureTackleOpportunities();
    observation.hooks.playResult!(observed, 'scrimmage');
    const expected = control.run(), actual = observed.run();
    expect(actual).toEqual(expected);
    expect(observed.rng.nextU32()).toBe(control.rng.nextU32());
    expect(observation.count(actual.stats)).toBeTypeOf('number');
    expect(actual.frames).toBeUndefined();
  });

  it('renders the unverified PFF source beside the raw band and preserves saved cards', () => {
    const dir = mkdtempSync(join(tmpdir(), 'scorecard-tackles-'));
    try {
      const input = join(dir, 'saved.json');
      const card: Card = { meta: { commit: 'saved', date: '2026-10-22', seed: 7, games: 1, leagues: 1, node: process.version },
        arms: [{ name: 'saved', env: {}, games: [game(play())] }] };
      writeFileSync(input, JSON.stringify(card));
      const bytes = readFileSync(input);
      const report = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/scorecard/run.ts',
        '--from', input, '--metrics', 'missed,failedTackleOpportunities'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      // M3 gives every missing reference the same explicit "unsourced:" prefix;
      // the band, raw counter and unknown PFF definition remain unchanged.
      expect(report).toContain('0.11–0.16 (unsourced: PFF, definition unknown)');
      expect(report).toContain('| Missed + broken tackles / play | 5.00 |');
      expect(report).toContain('| Failed tackle opportunities / play (unique defenders) | — | — to — | internal: unique failed defenders per official play; no NFL comparison band |');
      expect(readFileSync(input)).toEqual(bytes);
      // A producer with matching metadata can still predate this particular field.
      card.meta.provenance = { ...provenance(), cpuModel: null, cpuQuotaCores: null };
      Object.assign(card.meta, { probes: [], workersUsed: 1,
        timing: { gameMs: 'simulateGame-elapsed', wallMs: 'collection-elapsed', cpu: 'not-collected' } });
      Object.assign(card.arms[0], { settings: engineSettings({}), workerProcesses: 1 });
      card.arms[0].games[0].inputSha256 = 'same-input';
      card.arms.push(structuredClone(card.arms[0]));
      const paired = join(dir, 'paired.json');
      writeFileSync(paired, JSON.stringify(card));
      const comparison = execFileSync(process.execPath, ['--import', 'tsx', 'scripts/scorecard/run.ts',
        '--from', paired, '--metrics', 'missed,failedTackleOpportunities'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      const missing = comparison.split('\n').find((line) => line.startsWith('| Failed tackle opportunities'))!;
      expect(comparison).toContain('Measurement, runtime, probe and actual input identities agree');
      expect(missing).toContain('| unavailable |');
      expect(missing).not.toContain('noise');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

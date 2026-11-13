/** Game consumes deterministic represented kick facts. No game campaign or
 * special-teams collision/coverage performance claim is made by these controls. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game, type GameHooks, type GameState } from '../src/game/game.js';
import type { FreeKickFacts, ScrimmageKickFacts } from '../src/game/kick-rules.js';
import { inspectInstalledSnap } from '../src/game/presnap-rules.js';
import { generateTeam } from '../src/league/team.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PlayResult } from '../src/sim/types.js';

const home = generateTeam(new Rng(451), 'Home', 'HOM', { strength: .55 });
const away = generateTeam(new Rng(452), 'Away', 'AWY', { strength: .55 });
for (const t of [home, away]) {
  t.coach.aggression = 0;
  const k = t.roster.find(p => p.position === 'K')!;
  k.ratings.kickPower = k.ratings.kickAccuracy = 100;
}
const free = (extra: Partial<FreeKickFacts> = {}): FreeKickFacts => ({ kind: 'kickoff', kickSpot: 35,
  terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: 5, yardline: 28 }, ...extra });
const punt = (extra: Partial<ScrimmageKickFacts> = {}): ScrimmageKickFacts => ({ scrimmageSpot: 40,
  terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: 20, yardline: 30 }, ...extra });
const fair = (spot = 30, scrimmageSpot = 40): ScrimmageKickFacts => punt({ scrimmageSpot,
  terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: spot, yardline: spot },
  fairCatch: { kick: 'scrimmage', crossedLine: true, signal: 'valid', signalYardline: spot,
    catcherIsSignaler: true, caughtInAir: true, catchYardline: spot },
});
function script(sim: PlaySim, extra: Partial<PlayResult> = {}): PlayResult {
  return { outcome: 'tackle', possession: 'O', turnover: false, endX: sim.los,
    endY: CENTER_Y, yards: 0, offenseYards: 0, segments: [], score: null,
    duration: 2, clockStops: false, kind: 'run', events: [], stats: { tacklers: [],
      completed: false, attempted: false, sacked: false, scramble: false, throwaway: false,
      pressured: false, brokenTackles: 0, missedTackles: 0, dropped: false }, ...extra };
}
function scene(hooks: GameHooks = {}, patch: Partial<GameState> = {}) {
  const g = new Game(home, away, { seed: 5, hooks: { preSnapFoul: () => null,
    tryChoice: () => 'kick', playResult: sim => script(sim), ...hooks } });
  g.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 40, down: 4, distance: 20,
    score: { home: 0, away: 0 }, openingReceiver: 'away', ...patch });
  return g;
}
const kicks = (g: Game) => g.result().log.filter(x => x.kind === 'kickoff');
const punts = (g: Game) => g.result().log.filter(x => x.kind === 'punt');

describe('native Game kick possession and retry', () => {
  it('awards ordinary receiver return in receiver coordinates', () => {
    const g = scene({ freeKickEvent: () => free() }); g.kickoffToStart();
    expect(g.state).toMatchObject({ possession: 'away', yardline: 28, down: 1, distance: 10 });
  });
  it('keeps legal K free-kick recovery in K-own coordinates', () => {
    const g = scene({ freeKickEvent: () => free({ landingZoneTouched: true,
      terminal: { kind: 'possession', possession: 'kicking', yardline: 8 } }) });
    g.kickoffToStart();
    expect(g.state).toMatchObject({ possession: 'home', yardline: 92, down: 1, distance: 8 });
  });
  it('does not invert an onside K recovery for a second time', () => {
    const g = scene({ freeKickEvent: () => free({ kind: 'onside', declaredOnside: true,
      reachedReceivingRestrainingLine: true, terminal: { kind: 'possession', possession: 'kicking', yardline: 55 } }) });
    g.kickoffToStart(); expect(g.state).toMatchObject({ possession: 'home', yardline: 45, down: 1 });
  });
  it('keeps K ownership of a later return fumble in the correct coordinate frame', () => {
    const g = scene({ freeKickEvent: () => free({ terminal: { kind: 'possession', possession: 'kicking',
      receiverPossessed: true, recoveryYardline: 5, yardline: 20 } }) });
    g.kickoffToStart(); expect(g.state).toMatchObject({ possession: 'home', yardline: 80 });
  });
  it('replays a free kick with fresh generated event and does not count offsets as penalties', () => {
    let calls = 0;
    const g = scene({ freeKickEvent: () => { calls++; return free({ formation: { legal: false },
      fouls: [{ kind: 'offside', against: 'receiving', yards: 5, rule: '6-1-3', spot: 65, enforcement: 'previous' }] }); } });
    g.kickoffToStart();
    expect(calls).toBe(1); expect(kicks(g)).toHaveLength(2);
    expect(kicks(g)[0].fouls?.every(x => x.offset)).toBe(true);
    expect(g.result().box.team('HOM').penalties).toBe(0);
    expect(g.result().box.team('AWY').penalties).toBe(0);
  });
  it('replays a punt without reinjecting the same illegal seam or crediting its nullified attempt', () => {
    let calls = 0;
    const g = scene({ scrimmageKickEvent: () => { calls++; return punt({ fouls: [
      { kind: 'illegal_formation', against: 'kicking', yards: 5, rule: '9-1', spot: 60, enforcement: 'previous' },
      { kind: 'offside', against: 'receiving', yards: 5, rule: '7-4-5', spot: 60,
        enforcement: 'previous', attemptToBlockKick: true },
    ] }); } });
    g.step(); expect(calls).toBe(1); expect(punts(g)).toHaveLength(2);
    expect(punts(g)[0].nullified).toBe(true);
    expect(g.result().box.players.get(home.roster.find(x => x.position === 'P')!.id)?.punts).toBe(1);
    expect(g.result().box.team('HOM').penalties).toBe(0);
    expect(g.result().box.team('AWY').penalties).toBe(0);
  });
  it('new series follows a legal K muff recovery beyond LOS', () => {
    const g = scene({ scrimmageKickEvent: () => punt({ receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 20, yardline: 1 } }) });
    g.step(); expect(g.state).toMatchObject({ possession: 'home', yardline: 80, down: 1, distance: 10 });
  });
  it('untouched K behind-line recovery short of old line to gain loses possession on fourth down', () => {
    const g = scene({ scrimmageKickEvent: () => punt({ terminal: { kind: 'possession', possession: 'kicking',
      recoveryYardline: 65, yardline: 57 } }) });
    g.step(); expect(g.state).toMatchObject({ possession: 'away', yardline: 57, down: 1 });
  });
  it('a legal behind-line recovery can advance to old line to gain', () => {
    const g = scene({ scrimmageKickEvent: () => punt({ terminal: { kind: 'possession', possession: 'kicking',
      recoveryYardline: 65, yardline: 39 } }) });
    g.step(); expect(g.state).toMatchObject({ possession: 'home', yardline: 61, down: 1 });
  });
  it('a receiving previous-spot penalty reaching old LTG awards first down instead of forcing a fresh punt', () => {
    let calls = 0;
    const g = scene({ scrimmageKickEvent: () => { calls++; return punt({ fouls: [{ kind: 'offside',
      against: 'receiving', rule: '7-4-5', yards: 5, spot: 60, enforcement: 'previous', attemptToBlockKick: true }] }); } },
    { distance: 2 });
    g.step(); expect(calls).toBe(1); expect(punts(g)).toHaveLength(1);
    expect(g.state).toMatchObject({ possession: 'home', yardline: 45, down: 1, distance: 10 });
    expect(g.result().box.players.get(home.roster.find(x => x.position === 'P')!.id)?.punts ?? 0).toBe(0);
  });
  it('a receiving previous-spot personal foul awards automatic first even short of old LTG', () => {
    const g = scene({ scrimmageKickEvent: () => punt({ fouls: [{ kind: 'unnecessary_roughness',
      against: 'receiving', rule: '12-2-8', yards: 15, spot: 60, enforcement: 'previous', attemptToBlockKick: true }] }) },
    { distance: 30 });
    g.step(); expect(punts(g)).toHaveLength(1);
    expect(g.state).toMatchObject({ possession: 'home', yardline: 55, down: 1, distance: 10 });
  });
  it('a receiving offside short of old LTG preserves fourth down and the physical LTG on retry', () => {
    const g = scene({ scrimmageKickEvent: () => punt({ fouls: [{ kind: 'offside',
      against: 'receiving', rule: '7-4-5', yards: 5, spot: 60, enforcement: 'previous', attemptToBlockKick: true }] }) });
    g.step(); expect(punts(g)).toHaveLength(2);
    expect(punts(g)[1]).toMatchObject({ down: 4, yardline: 45, distance: 15 });
  });
});

describe('native safety origin and period transitions', () => {
  const safety = (sim: PlaySim) => script(sim, { outcome: 'safety', score: { kind: 'safety', team: 'D' },
    endX: 9, yards: 9 - sim.los });
  const td = (sim: PlaySim) => script(sim, { outcome: 'touchdown', score: { kind: 'TD', team: 'O' },
    endX: 110, yards: 110 - sim.los });
  it('ordinary safety kicks from20 with no artificial15-yard field-position addition', () => {
    const origins: number[] = [];
    const g = scene({ playResult: safety, freeKickEvent: (_, origin) => {
      origins.push(origin); return free({ kind: 'safety', kickSpot: origin,
        firstContact: { by: 'ground', yardline: 22 }, terminal: { kind: 'rest', yardline: 22 } });
    } }, { down: 1 });
    g.step(); expect(origins).toEqual([20]);
    expect(g.state).toMatchObject({ possession: 'away', yardline: 50, score: { home: 0, away: 2 } });
  });
  it('defers an expiring-Q1 safety kick to Q2 while retaining origin20', () => {
    const seen: Array<{ origin: number; quarter: number }> = [];
    const g = scene({ playResult: safety, freeKickEvent: (_, origin) => {
      seen.push({ origin, quarter: g.state.quarter });
      return free({ kind: 'safety', kickSpot: origin, terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } });
    } }, { quarter: 1, clock: 1, down: 1 });
    g.step(); expect(seen).toEqual([{ origin: 20, quarter: 2 }]); expect(kicks(g)).toHaveLength(1);
  });
  it('an ordinary expiring-half safety gets only the halftime kickoff', () => {
    const seen: number[] = [];
    const g = scene({ playResult: safety, freeKickEvent: (_, origin) => {
      seen.push(origin); return free({ kickSpot: origin, terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } });
    } }, { quarter: 2, clock: 1, down: 1, score: { home: 0, away: 7 } });
    g.step(); expect(seen).toEqual([35]); expect(g.state.quarter).toBe(3);
  });
  it('penalty-caused safety may have the requested untimed safety kick before halftime', () => {
    const seen: number[] = [];
    const g = scene({ playResult: sim => script(sim, { penalties: [{ kind: 'holding', against: 'O',
      playerId: sim.slot('LT')!.player.id, yards: 10, autoFirst: false, spotX: 9, t: 1,
      rule: '12-1-3', possessionChanges: 0, possessionTeam: 'O' }] }),
    freeKickEvent: (_, origin) => { seen.push(origin); return free({ kind: origin === 20 ? 'safety' : 'kickoff',
      kickSpot: origin, terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } }); } },
    { quarter: 2, clock: 1, down: 1, score: { home: 0, away: 7 } });
    g.step(); expect(seen).toEqual([20, 35]); expect(g.state.quarter).toBe(3);
    expect(g.state.score.away).toBe(9);
  });
  it('an ordinary last-play safety ends regulation without another free kick', () => {
    let calls = 0;
    const g = scene({ playResult: safety, freeKickEvent: () => { calls++; return free(); } },
      { quarter: 4, clock: 1, down: 1 });
    g.step(); expect(calls).toBe(0); expect(g.state.over).toBe(true);
    const count = g.result().log.length; g.step(); expect(g.result().log).toHaveLength(count);
  });
  it('a safety tying regulation starts only one overtime kickoff', () => {
    const seen: number[] = [];
    const g = scene({ playResult: safety, freeKickEvent: (_, origin) => {
      seen.push(origin); return free({ kickSpot: origin, terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } });
    } }, { quarter: 4, clock: 1, down: 3, score: { home: 2, away: 0 } });
    g.step(); expect(seen).toEqual([35]); expect(g.state.quarter).toBe(5);
  });
  it('last-play Q1 TD has one kickoff in Q2, after its Try', () => {
    const seen: number[] = [];
    const g = scene({ playResult: td, freeKickEvent: () => { seen.push(g.state.quarter); return free(); } },
      { quarter: 1, clock: 1, down: 1 });
    g.step(); expect(seen).toEqual([2]); expect(g.result().log.map(x => x.kind)).toEqual(['run', 'xp', 'kickoff']);
  });
  it('last-play Q2 TD has no scoring kickoff in addition to the halftime kickoff', () => {
    const seen: number[] = [];
    const g = scene({ playResult: td, freeKickEvent: () => { seen.push(g.state.quarter); return free(); } },
      { quarter: 2, clock: 1, down: 1, yardline: 20, score: { home: 0, away: 7 } });
    g.step(); expect(seen).toEqual([3]); expect(kicks(g)).toHaveLength(1);
  });
  it('last-play Q4 TD that does not tie has no scoring kickoff', () => {
    const g = scene({ playResult: td, freeKickEvent: () => free() },
      { quarter: 4, clock: 1, down: 1, yardline: 20, score: { home: 0, away: 10 } });
    g.step(); expect(kicks(g)).toHaveLength(0); expect(g.state.over).toBe(true);
  });
});

describe('native fair-catch elections and flags', () => {
  it('supports a real next fair-catch kick and consumes entitlement once', () => {
    const g = scene({ scrimmageKickEvent: () => fair(80, 5) }, { yardline: 5 });
    g.step(); expect(g.fairCatchKickAvailable).toBe(true);
    g.fairCatchKick();
    expect(g.result().log.find(x => x.kind === 'fg')).toMatchObject({ fgDistance: 30 });
    expect(g.fairCatchKickAvailable).toBe(false);
    expect(() => g.fairCatchKick()).toThrow('election');
  });
  it('expired-period fair catch permits even a very long kick outside coach range', () => {
    const g = scene({ scrimmageKickEvent: () => fair(20) },
      { quarter: 4, clock: 1, score: { home: 3, away: 0 } });
    g.step(); expect(g.state.quarter).toBe(4); expect(g.state.over).toBe(false);
    expect(g.fairCatchKickAvailable).toBe(true); g.fairCatchKick();
    expect(g.result().log.find(x => x.kind === 'fg')).toMatchObject({ fgDistance: 90 });
    expect(g.state.over).toBe(true);
  });
  it('preserves fair-catch election through a dead-ball false start and updates its spot', () => {
    let flag = true;
    const g = scene({ scrimmageKickEvent: () => fair(30), preSnapFoul: () => flag ? 'false_start' : null });
    g.step(); expect(g.fairCatchKickAvailable).toBe(true);
    g.step(); flag = false;
    expect(g.state.yardline).toBe(25); expect(g.fairCatchKickAvailable).toBe(true);
    g.fairCatchKick(); expect(g.result().log.find(x => x.kind === 'fg')?.fgDistance).toBe(85);
  });
  it('a subsequent actual scrimmage snap consumes the election', () => {
    const g = scene({ scrimmageKickEvent: () => fair(30) }); g.step(); g.step();
    expect(g.fairCatchKickAvailable).toBe(false);
  });
  it('an invalid signal grants no FCK entitlement', () => {
    const f = fair(30); f.fairCatch!.signal = 'invalid';
    const g = scene({ scrimmageKickEvent: () => f }); g.step();
    expect(g.fairCatchKickAvailable).toBe(false); expect(g.state.yardline).toBe(25);
  });
  it('accepted unsignaled kick-catch interference preserves an untimed snap at clock0', () => {
    const g = scene({ scrimmageKickEvent: () => punt({ terminal: { kind: 'possession', possession: 'kicking', yardline: 20 },
      fairCatch: { kick: 'scrimmage', crossedLine: true, signal: 'none', signalYardline: 20,
        interference: { airborneOpportunity: true, yardline: 20 } } }) },
    { quarter: 4, clock: 1, score: { home: 3, away: 0 } });
    g.step(); expect(g.state).toMatchObject({ quarter: 4, clock: 0, over: false, possession: 'away', yardline: 35 });
    expect(g.fairCatchKickAvailable).toBe(false);
    g.step(); expect(g.result().log.some(x => x.kind === 'run' || x.kind === 'pass')).toBe(true);
  });
  it('records score carryover yardage once at its actual half-distance Try enforcement', () => {
    let n = 0;
    const g = scene({ freeKickEvent: () => ++n === 1 ? free({ terminal: { kind: 'possession', possession: 'receiving', yardline: 100 },
      fouls: [{ kind: 'unnecessary_roughness', against: 'kicking', rule: '12-2-8', yards: 15,
        spot: 80, enforcement: 'spot' }] })
      : free({ terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } }) });
    g.kickoffToStart();
    expect(g.result().box.team('HOM')).toMatchObject({ penalties: 1, penaltyYds: 7.5 });
    expect(kicks(g)[0].fouls?.[0]).toMatchObject({ accepted: true, yards: 7.5 });
  });
});

describe('native field-goal terminal composition', () => {
  it('represented made FG plus opponent personal foul keeps3 and carries15 onto next kickoff', () => {
    const origins: number[] = [];
    const g = scene({ scrimmageKickEvent: () => ({ scrimmageSpot: 80, fieldGoalGood: true,
      terminal: { kind: 'out_of_bounds', yardline: -10 }, fouls: [{ kind: 'unnecessary_roughness',
        against: 'receiving', rule: '12-2-8', yards: 15, spot: 20, enforcement: 'previous', attemptToBlockKick: true }] }),
    freeKickEvent: (_, origin) => { origins.push(origin); return free({ kickSpot: origin,
      terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } }); } }, { yardline: 80 });
    g.step(); expect(g.state.score).toEqual({ home: 3, away: 0 }); expect(origins).toEqual([50]);
    expect(g.state).toMatchObject({ possession: 'away', yardline: 20 });
    expect(g.result().box.team('AWY')).toMatchObject({ penalties: 1, penaltyYds: 15 });
    expect(g.result().log[0].fouls?.[0]).toMatchObject({ accepted: true, yards: 15 });
  });
  it('represented made FG with K pre-kick foul is nullified/replayed before any3 points count', () => {
    let calls = 0;
    const g = scene({ scrimmageKickEvent: () => { calls++; return { scrimmageSpot: 80, fieldGoalGood: true,
      terminal: { kind: 'out_of_bounds', yardline: -10 }, fouls: [{ kind: 'illegal_formation',
        against: 'kicking', rule: '9-1', yards: 5, spot: 20, enforcement: 'previous' }] }; },
    freeKickEvent: () => free({ terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } }) }, { yardline: 80 });
    g.step(); const fgs = g.result().log.filter(x => x.kind === 'fg');
    expect(calls).toBe(1); expect(fgs).toHaveLength(2);
    expect(fgs[0]).toMatchObject({ fgGood: true, nullified: true, score: { home: 0, away: 0 } });
    expect(fgs[1]).toMatchObject({ yardline: 75, distance: 25, score: { home: 0, away: 0 } });
    expect(g.state.score.home).toBeLessThanOrEqual(3);
    expect(g.result().box.players.get(home.roster.find(p => p.position === 'K')!.id)?.fga).toBe(1);
  });
  it.each([{ yardline: 80, expected: 27 }, { yardline: 90, expected: 20 }])(
    'untouched missed FG from own$yardline uses actual kick spot with20 minimum', ({ yardline, expected }) => {
      const g = scene({ scrimmageKickEvent: () => ({ scrimmageSpot: yardline, terminal: { kind: 'rest', yardline: -1 },
        groundTouchedInReceivingEndzone: true }) }, { yardline });
      g.step(); expect(g.state).toMatchObject({ possession: 'away', yardline: expected, down: 1 });
      expect(g.result().log[0]).toMatchObject({ kind: 'fg', fgGood: false });
      expect(g.result().box.players.get(home.roster.find(p => p.position === 'K')!.id)?.fga).toBe(1);
    });
  it('a supplied blocked FG recovered behind LOS after qualifying R touch keeps K new series', () => {
    const g = scene({ scrimmageKickEvent: () => ({ scrimmageSpot: 80, kickBlocked: true,
      receiverTouchedBeyondLine: true, terminal: { kind: 'possession', possession: 'kicking',
        recoveryYardline: 27, yardline: 23 } }) }, { yardline: 80 });
    g.step(); expect(g.state).toMatchObject({ possession: 'home', yardline: 77, down: 1, distance: 10 });
    expect(g.result().log[0].text).toContain('BLOCKED');
  });
  it('untouched behind-line blocked FG recovery may advance but cannot manufacture new series short of LTG', () => {
    const g = scene({ scrimmageKickEvent: () => ({ scrimmageSpot: 80, kickBlocked: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 27, yardline: 15 } }) },
    { yardline: 80, distance: 10 });
    g.step(); expect(g.state).toMatchObject({ possession: 'away', yardline: 15, down: 1 });
  });
  it('a supplied receiver catch/return replaces untouched missed-FG placement', () => {
    const g = scene({ scrimmageKickEvent: () => ({ scrimmageSpot: 80, receiverTouchedBeyondLine: true,
      terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: -1, yardline: 35 } }) }, { yardline: 80 });
    g.step(); expect(g.state).toMatchObject({ possession: 'away', yardline: 35 });
  });
  it('supplied legal K behind-line recovery/advance can score a touchdown', () => {
    const g = scene({ scrimmageKickEvent: () => ({ scrimmageSpot: 80, kickBlocked: true,
      terminal: { kind: 'possession', possession: 'kicking', recoveryYardline: 27, yardline: -1 } }),
    freeKickEvent: () => free({ terminal: { kind: 'possession', possession: 'receiving', yardline: -1 } }) },
    { yardline: 80 });
    g.step(); expect(g.state.score.home).toBeGreaterThanOrEqual(6); expect(g.state.score.away).toBe(0);
    expect(kicks(g)).toHaveLength(1);
  });
  it('FG replay uses a fresh generated attempt and counts only the official attempt', () => {
    let calls = 0;
    const g = scene({ scrimmageKickEvent: () => { calls++; return { scrimmageSpot: 80,
      terminal: { kind: 'possession', possession: 'receiving', recoveryYardline: 10, yardline: 20 }, fouls: [
        { kind: 'illegal_formation', against: 'kicking', rule: '9-1', yards: 5, spot: 20, enforcement: 'previous' },
        { kind: 'offside', against: 'receiving', rule: '7-4-5', yards: 5, spot: 20,
          enforcement: 'previous', attemptToBlockKick: true },
      ] }; }, freeKickEvent: () => free() }, { yardline: 80 });
    g.step(); expect(calls).toBe(1);
    const fgs = g.result().log.filter(x => x.kind === 'fg');
    expect(fgs).toHaveLength(2); expect(fgs[0].nullified).toBe(true);
    expect(g.result().box.players.get(home.roster.find(p => p.position === 'K')!.id)?.fga).toBe(1);
  });
});

describe('native installed snap boundaries and period metadata', () => {
  function installed(): PlaySim {
    let sim: PlaySim | undefined;
    const g = scene({ playResult: s => { sim = s; return script(s); } }, { down: 1 });
    g.step(); return sim!;
  }
  it('inspects endlines as well as sidelines on explicit installed placement', () => {
    const sim = installed(), x = sim.offAlign.spots.X!;
    expect(inspectInstalledSnap(sim).fouls.some(f => f.reason === 'offensive player out of bounds')).toBe(false);
    x.pos.x = 0;
    expect(inspectInstalledSnap(sim).fouls).toContainEqual(expect.objectContaining({ kind: 'illegal_formation',
      playerId: sim.slot('X')!.player.id, reason: 'offensive player out of bounds' }));
    x.pos.x = 120;
    expect(inspectInstalledSnap(sim).fouls).toContainEqual(expect.objectContaining({ kind: 'illegal_formation',
      playerId: sim.slot('X')!.player.id }));
  });
  it('uses supplied late-warning/full-set facts for late neutral-zone classification', () => {
    const sim = installed(), d = sim.defense[0]; sim.snapX[d.idx] = sim.los;
    const ordinary = inspectInstalledSnap(sim, {}, { afterTwoMinuteWarning: false });
    const late = inspectInstalledSnap(sim, {}, { afterTwoMinuteWarning: true });
    expect(ordinary.fouls).toContainEqual(expect.objectContaining({ kind: 'offside', deadBall: false, playerId: d.player.id }));
    expect(late.fouls).toContainEqual(expect.objectContaining({ kind: 'neutral_zone_infraction', deadBall: true, playerId: d.player.id }));
  });
});

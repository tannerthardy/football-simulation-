/** Native foul production is exercised once through real bodies/World; the
 * remaining scenarios isolate official enforcement with the existing Game seam.
 * A scripted physical ending is not a claim about normal-play success. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y, OPP_GOAL_X } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game, type GameState } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { PenaltyCall, PlayResult, PlayStats } from '../src/sim/types.js';

const home = generateTeam(new Rng(311), 'Home', 'HOM', { strength: .55 });
const away = generateTeam(new Rng(312), 'Away', 'AWY', { strength: .55 });
// The fourth-and-one scenarios are deliberate go-for-it plays, not tests of
// the play-caller's punt/FG policy.
home.coach.aggression = 1;

type Script = Omit<Partial<PlayResult>, 'stats'> & { stats?: Partial<PlayStats> };
const id = (sim: PlaySim, slot: string) => sim.slot(slot)!.player.id;

function scripted(sim: PlaySim, p: Script = {}): PlayResult {
  const { stats, ...rest } = p;
  const yards = rest.yards ?? 0;
  return {
    outcome: 'tackle', possession: 'O', turnover: false, endX: sim.los + yards,
    endY: CENTER_Y, yards, offenseYards: rest.turnover ? 0 : yards,
    segments: [], score: null, duration: 3, clockStops: false, kind: 'pass', events: [],
    ...rest,
    stats: { tacklers: [], completed: false, attempted: true, sacked: false, scramble: false,
      throwaway: false, pressured: false, brokenTackles: 0, missedTackles: 0, dropped: false,
      passer: id(sim, 'QB'), ...stats },
  };
}

function foul(sim: PlaySim, kind: PenaltyCall['kind'], extra: Partial<PenaltyCall> = {}): PenaltyCall {
  return { kind, against: kind === 'dpi' ? 'D' : 'O', playerId: kind === 'dpi'
    ? sim.defense[0].player.id : id(sim, 'X'), yards: kind === 'dpi' ? 0 : 10,
    autoFirst: kind === 'dpi', spotX: sim.los + 10, t: 1, possessionChanges: 0, ...extra };
}

function scenario(play: (sim: PlaySim, n: number) => PlayResult, state: Partial<GameState> = {}) {
  let snaps = 0;
  const sims: PlaySim[] = [];
  const game = new Game(home, away, { seed: 5, record: false, hooks: {
    preSnapFoul: () => null,
    playResult: (sim, kind) => {
      expect(kind).toBe('scrimmage');
      sims.push(sim);
      return play(sim, snaps++);
    },
  } });
  game.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 50,
    down: 1, distance: 10, score: { home: 0, away: 0 }, ...state });
  game.step();
  return { game, sims, snaps: () => snaps };
}

const team = (game: Game, which: 'home' | 'away') => game.result().box.team(which === 'home' ? home.abbr : away.abbr);
const scrimmage = (game: Game) => game.result().log.filter(p => p.kind === 'run' || p.kind === 'pass');

/** Same achieved-contact interface as prethrow-opi.test, in the actual Game
 * PlaySim with all22 ordinary bodies. No hand load or foul is injected. */
function nativePrethrowOpi(sim: PlaySim): PlayResult {
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y - 8 };
  const blocker = sim.slot('X')!;
  const defender = sim.slot('CB_S') ?? sim.defense.find(a => a.player.position === 'CB')!;
  blocker.body.pos = { x: sim.los + 4, y: CENTER_Y };
  defender.body.pos = { x: blocker.pos.x + blocker.profile.radius + defender.profile.radius + .1, y: CENTER_Y };
  blocker.body.facing = 0; defender.body.facing = Math.PI;
  sim.t = .5;
  const rep = sim.engage(blocker, defender, 'run', { x: 1, y: 0 });
  expect(rep).not.toBeNull();
  rep!.control = .8;
  sim.tick(); sim.tick();
  expect(Math.hypot(rep!.hands?.normalForce ?? 0, rep!.hands?.tangentForce ?? 0)).toBeGreaterThan(0);
  expect(sim.events.some(e => e.type === 'block_contact' && e.a === blocker.idx)).toBe(true);
  expect(sim.buildResult().penalties?.some(p => p.kind === 'opi')).not.toBe(true);
  sim.throwBall(sim.qb, sim.slot('Z')!, { x: 15, y: 0, z: 5 },
    { x: sim.los + 12, y: CENTER_Y - 8, z: 1.5 }, sim.t + 1);
  const native = sim.buildResult();
  expect(native.penalties?.filter(p => p.kind === 'opi')).toHaveLength(1);
  // Only the unofficiated ending is scripted. Native loaded-act provenance,
  // production pass release and the resulting call are unchanged.
  return scripted(sim, { ...native, kind: 'pass', outcome: 'touchdown',
    score: { team: 'O', kind: 'TD' }, endX: OPP_GOAL_X, yards: OPP_GOAL_X - sim.los,
    offenseYards: OPP_GOAL_X - sim.los, duration: 3, clockStops: true,
    stats: { ...native.stats, attempted: true, completed: true,
      passer: sim.qb.player.id, receiver: id(sim, 'Z'), target: id(sim, 'Z') } });
}

function nativeSecondPass(sim: PlaySim): PlayResult {
  sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y }; sim.qb.body.facing = 0;
  const back = sim.slot('RB')!;
  back.body.pos = { x: sim.los - 2, y: CENTER_Y }; back.body.facing = 0;
  sim.t = .2;
  sim.throwBall(sim.qb, back, { x: 10, y: 0, z: 2 }, { x: back.pos.x, y: back.pos.y, z: 1 }, .4);
  sim.t = .4; sim.possess(back, 'catch');
  sim.t = .6;
  sim.throwBall(back, sim.slot('X')!, { x: 15, y: 0, z: 5 },
    { x: sim.los + 10, y: CENTER_Y, z: 1.5 }, 1.6);
  sim.whistle('incomplete', { x: sim.los, y: CENTER_Y });
  const native = sim.buildResult();
  expect(native.penalties?.some(p => p.kind === 'illegal_forward_pass' && p.reason === 'second_forward_pass')).toBe(true);
  return scripted(sim, { ...native, kind: 'pass', outcome: 'incomplete', duration: 1,
    clockStops: true, stats: { ...native.stats, completed: false } });
}

/** Isolate Try law from coaching choice. The ordinary touchdown is scripted;
 * each requested Try still uses production Game and its real PlaySim roster. */
function tryScenario(play: (sim: PlaySim, n: number) => PlayResult) {
  const attempts: PlaySim[] = [];
  const game = new Game(home, away, { seed: 5, hooks: {
    preSnapFoul: () => null,
    tryChoice: () => 'two',
    playResult: (sim, kind) => {
      if (kind === 'scrimmage') return scripted(sim, { kind: 'pass', outcome: 'touchdown',
        score: { team: 'O', kind: 'TD' }, endX: 110, yards: 110 - sim.los,
        offenseYards: 110 - sim.los, clockStops: true,
        stats: { completed: true, receiver: id(sim, 'Z'), target: id(sim, 'Z') } });
      const n = attempts.length;
      attempts.push(sim);
      return play(sim, n);
    },
  } });
  game.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 90,
    down: 1, distance: 10, score: { home: 0, away: 0 } });
  game.step();
  return { game, attempts };
}

const goodTry = (sim: PlaySim): PlayResult => scripted(sim, { kind: 'run', outcome: 'touchdown',
  score: { team: 'O', kind: 'TD' }, endX: 110, yards: 110 - sim.los,
  offenseYards: 110 - sim.los, stats: { attempted: false, rusher: id(sim, 'RB') } });

describe('native foul → Game official result', () => {
  it('nullifies a scripted TD after a real achieved block and later native OPI call', () => {
    const { game, sims } = scenario(nativePrethrowOpi);
    const log = scrimmage(game)[0];
    expect(game.state).toMatchObject({ possession: 'home', yardline: 40, down: 1, distance: 20, score: { home: 0, away: 0 } });
    expect(log).toMatchObject({ nullified: true, foul: { kind: 'opi', accepted: true, yards: 10 },
      official: { treatment: 'enforce', stats: 'none', spotX: 50 } });
    expect(log.foulRecords?.some(f => f.kind === 'opi' && f.assessment === 'violation'
      && f.evidence.source === 'native')).toBe(true);
    expect(team(game, 'home')).toMatchObject({ penalties: 1, penaltyYds: 10, plays: 0, totalYds: 0 });
    expect(game.result().box.players.get(id(sims[0], 'QB'))).toMatchObject({ att: 0, cmp: 0, passTD: 0 });
    expect(game.result().box.players.get(id(sims[0], 'Z'))).toMatchObject({ rec: 0, recTD: 0 });
    expect(sims[0].frames).toEqual([]);
  });

  it('enforces an uncapped DPI spot and automatic first down without inventing completion stats', () => {
    const { game, sims } = scenario(sim => scripted(sim, { outcome: 'incomplete', clockStops: true,
      penalties: [foul(sim, 'dpi', { spotX: sim.los + 25, rule: '8-5' })] }), { down: 3 });
    expect(game.state).toMatchObject({ yardline: 75, down: 1, distance: 10 });
    expect(team(game, 'away')).toMatchObject({ penalties: 1, penaltyYds: 25 });
    expect(team(game, 'home')).toMatchObject({ firstDowns: 1, thirdAtt: 0, plays: 0 });
    expect(game.result().box.players.get(id(sims[0], 'QB'))?.att).toBe(0);
  });

  it.each([{ yardline: 90, spot: 99, distance: 1 }, { yardline: 99, spot: 99.5, distance: .5 }])(
    'applies the DPI end-zone placement exception from own-yardline $yardline', ({ yardline, spot, distance }) => {
      const { game } = scenario(sim => scripted(sim, { outcome: 'incomplete', clockStops: true,
        penalties: [foul(sim, 'dpi', { spotX: 112, rule: '8-5' })] }), { yardline, distance: 100 - yardline, down: 3 });
      expect(game.state).toMatchObject({ possession: 'home', yardline: spot, down: 1, distance });
    });

  it('retains both same-team calls while assessing one chosen penalty, without double counting a legacy alias', () => {
    const { game } = scenario(sim => {
      const hold = foul(sim, 'holding', { id: 'hold', playerId: id(sim, 'LT'), spotX: sim.los + 4 });
      const opi = foul(sim, 'opi', { id: 'opi', spotX: sim.los + 20 });
      return scripted(sim, { yards: 25, stats: { attempted: true, completed: true, receiver: id(sim, 'Z') },
        penalties: [hold, opi], penalty: { ...hold } });
    });
    const log = scrimmage(game)[0];
    expect(log.fouls).toHaveLength(2);
    expect(log.fouls?.filter(f => f.accepted)).toHaveLength(1);
    expect(log.fouls?.map(f => f.kind)).toEqual(['holding', 'opi']);
    expect(team(game, 'home')).toMatchObject({ penalties: 1, penaltyYds: 10, plays: 0 });
    expect(game.state).toMatchObject({ yardline: 40, down: 1, distance: 20 });
  });

  it('can enforce native prethrow OPI after the original offense regains an interception-return fumble', () => {
    const { game } = scenario(sim => {
      nativePrethrowOpi(sim); // Produces the real block/pass call; ignore its scripted ending.
      const interceptor = sim.defense.find(a => a.player.position === 'CB')!;
      interceptor.body.pos = { x: sim.los + 10, y: CENTER_Y };
      sim.t = 1; sim.possess(interceptor, 'interception');
      interceptor.body.pos.x = sim.los + 5;
      sim.t = 1.2; sim.fumble(interceptor, sim.slot('Y')!);
      sim.slot('Y')!.body.pos = { x: sim.los + 3, y: CENTER_Y };
      sim.t = 1.4; sim.possess(sim.slot('Y')!, 'recovery');
      sim.whistle('tackle', sim.slot('Y')!.pos);
      const native = sim.buildResult();
      expect(native.segments.map(s => s.team)).toEqual(['O', 'D', 'O']);
      return scripted(sim, { ...native, kind: 'pass', duration: 3 });
    }, { down: 3 });
    expect(game.state).toMatchObject({ possession: 'home', yardline: 40, down: 3, distance: 20 });
    expect(scrimmage(game)[0].foul).toMatchObject({ kind: 'opi', accepted: true });
    expect(team(game, 'home')).toMatchObject({ plays: 0, penalties: 1, turnovers: 0 });
  });

  it('a legal original-offense regain starts a new series rather than retaining the old third down', () => {
    const { game } = scenario(sim => scripted(sim, { kind: 'pass', yards: 3,
      possession: 'O', turnover: false, segments: [
        { team: 'O', carrier: sim.qb.player.id, how: 'snap', startX: sim.los, endX: sim.los - 3, end: 'pass' },
        { team: 'D', carrier: sim.defense[0].player.id, how: 'interception', startX: sim.los + 10, endX: sim.los + 5, end: 'fumble' },
        { team: 'O', carrier: id(sim, 'Y'), how: 'recovery', startX: sim.los + 3, endX: sim.los + 3, end: 'dead' },
      ] }), { down: 3 });
    expect(game.state).toMatchObject({ possession: 'home', yardline: 53, down: 1, distance: 10 });
  });

  it('offsets the supported no-possession-change pair and replays the down without either TD or yards', () => {
    const { game } = scenario(sim => scripted(sim, { outcome: 'touchdown', score: { team: 'O', kind: 'TD' },
      endX: 110, yards: 50, penalties: [foul(sim, 'opi'), foul(sim, 'dpi', { spotX: sim.los + 20 })] }), { down: 3 });
    expect(game.state).toMatchObject({ possession: 'home', yardline: 50, down: 3, distance: 10, score: { home: 0, away: 0 } });
    expect(scrimmage(game)[0]).toMatchObject({ nullified: true, yards: 0, official: { treatment: 'offset' } });
    expect(scrimmage(game)[0].fouls?.every(f => f.offset && !f.accepted)).toBe(true);
    expect(team(game, 'home')).toMatchObject({ plays: 0, penalties: 0, thirdAtt: 0 });
    expect(team(game, 'away').penalties).toBe(0);
  });

  it.each([3, 4])('enforces a native second forward pass with loss of down on down %i', down => {
    const { game } = scenario(nativeSecondPass, { down, distance: 1, yardline: 60 });
    const log = scrimmage(game)[0];
    expect(log.foul).toMatchObject({ kind: 'illegal_forward_pass', accepted: true, yards: 5 });
    if (down === 3) expect(game.state).toMatchObject({ possession: 'home', yardline: 55, down: 4, distance: 6 });
    else expect(game.state).toMatchObject({ possession: 'away', yardline: 45, down: 1, distance: 10 });
    expect(team(game, 'home')).toMatchObject({ penalties: 1, penaltyYds: 5,
      ...(down === 3 ? { thirdAtt: 1, thirdConv: 0 } : { fourthAtt: 1, fourthConv: 0 }) });
  });

  it('preserves the original INT when a native returner pass nullifies a scripted defensive TD', () => {
    const { game, sims } = scenario(sim => {
      sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y }; sim.qb.body.facing = 0;
      const interceptor = sim.defense.find(a => a.player.position === 'CB')!;
      sim.t = .2;
      sim.throwBall(sim.qb, sim.slot('X')!, { x: 15, y: 0, z: 5 },
        { x: sim.los + 10, y: CENTER_Y, z: 1.5 }, 1.2);
      interceptor.body.pos = { x: sim.los + 10, y: CENTER_Y };
      sim.t = .4; sim.possess(interceptor, 'interception');
      interceptor.body.pos.x = sim.los + 5; interceptor.body.facing = Math.PI;
      sim.t = .6;
      sim.throwBall(interceptor, sim.defense.find(a => a !== interceptor)!, { x: -15, y: 0, z: 5 },
        { x: sim.los - 10, y: CENTER_Y, z: 1.5 }, 1.6);
      const native = sim.buildResult();
      expect(native.penalties?.some(p => p.reason === 'after_change_of_possession')).toBe(true);
      return scripted(sim, { ...native, kind: 'pass', possession: 'D', turnover: true,
        outcome: 'touchdown', score: { team: 'D', kind: 'TD' }, endX: 10, duration: 3,
        yards: 0, offenseYards: 0, clockStops: true });
    }, { down: 3 });
    const sim = sims[0], interceptor = sim.defense.find(a => a.player.position === 'CB')!;
    expect(game.state.score).toEqual({ home: 0, away: 0 });
    expect(game.state.possession).toBe('away');
    expect(game.state.down).toBe(1);
    expect(team(game, 'home')).toMatchObject({ plays: 1, turnovers: 1, thirdAtt: 1, thirdConv: 0 });
    expect(team(game, 'away')).toMatchObject({ penalties: 1, penaltyYds: 5, plays: 0 });
    expect(game.result().box.players.get(sim.qb.player.id)).toMatchObject({ att: 1, int: 1 });
    expect(game.result().box.players.get(interceptor.player.id)).toMatchObject({ defInt: 1, att: 0 });
    expect(scrimmage(game)[0].official?.stats).toBe('before_change_of_possession');
  });

  it('keeps an untimed down after accepted defensive DPI when the fourth-quarter clock expires', () => {
    const { game, snaps } = scenario((sim, n) => scripted(sim, { outcome: 'incomplete', clockStops: true,
      duration: n === 0 ? 3 : 0, penalties: n === 0 ? [foul(sim, 'dpi', { spotX: sim.los + 10 })] : undefined }),
    { quarter: 4, clock: 1, score: { home: 0, away: 7 } });
    expect(game.state).toMatchObject({ quarter: 4, clock: 0, over: false });
    game.step();
    expect(snaps()).toBe(2);
    expect(game.state.over).toBe(true);
  });

  it('does not extend the period for offensive OPI when its scripted physical TD is erased', () => {
    const { game, snaps } = scenario(sim => scripted(sim, { outcome: 'touchdown',
      score: { team: 'O', kind: 'TD' }, endX: 110, yards: 50, duration: 3, clockStops: true,
      penalties: [foul(sim, 'opi')] }), { quarter: 4, clock: 1, score: { home: 0, away: 7 } });
    expect(game.state).toMatchObject({ quarter: 4, clock: 0, over: true, score: { home: 0, away: 7 } });
    expect(snaps()).toBe(1);
  });
});

describe('Try foul and scoring composition, NFL2026 11-3', () => {
  it('erases an apparent successful Try for OPI, retries ten yards back, then awards only the legal two points', () => {
    const { game, attempts } = tryScenario((sim, n) => n === 0
      ? { ...goodTry(sim), penalties: [foul(sim, 'opi', { rule: '8-5-4(a)' })] }
      : goodTry(sim));
    expect(attempts.map(sim => sim.los)).toEqual([108, 98]);
    expect(game.state.score).toEqual({ home: 8, away: 0 });
    const logs = game.result().log.filter(p => p.kind === 'two');
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ nullified: true, foul: { kind: 'opi', accepted: true, yards: 10 } });
  });

  it('declines offensive OPI on an already unsuccessful Try rather than giving a free replay', () => {
    const { game, attempts } = tryScenario(sim => scripted(sim, { outcome: 'incomplete',
      penalties: [foul(sim, 'opi', { rule: '8-5-4(a)' })] }));
    expect(attempts).toHaveLength(1);
    expect(game.state.score).toEqual({ home: 6, away: 0 });
    expect(game.result().log.find(p => p.kind === 'two')?.foul).toMatchObject({ kind: 'opi', accepted: false });
  });

  it('accepts an own-end-zone offensive hold on an unsuccessful Try to award the defense one point', () => {
    const { game, attempts } = tryScenario(sim => scripted(sim, { outcome: 'incomplete',
      penalties: [foul(sim, 'holding', { spotX: 9, rule: '12-1-3(c)' })] }));
    expect(attempts).toHaveLength(1);
    expect(game.state.score).toEqual({ home: 6, away: 1 });
    expect(game.result().log.find(p => p.kind === 'two')?.foul).toMatchObject({ kind: 'holding', accepted: true });
  });

  it('a loss-of-down second pass makes the Try unsuccessful without another attempt', () => {
    const { game, attempts } = tryScenario(sim => ({ ...goodTry(sim),
      penalties: [foul(sim, 'illegal_forward_pass', { rule: '8-1-2', reason: 'second_forward_pass',
        lossDown: true, enforcement: 'previous', yards: 5 })] }));
    expect(attempts).toHaveLength(1);
    expect(game.state.score).toEqual({ home: 6, away: 0 });
    expect(game.result().log.find(p => p.kind === 'two')?.foul).toMatchObject({ kind: 'illegal_forward_pass', accepted: true });
  });

  it('declines an offensive second-pass foul when the defense already earned a two-point return', () => {
    const { game, attempts } = tryScenario(sim => scripted(sim, { possession: 'D', turnover: true,
      outcome: 'touchdown', score: { team: 'D', kind: 'TD' }, endX: 10,
      penalties: [foul(sim, 'illegal_forward_pass', { rule: '8-1-2', reason: 'second_forward_pass',
        lossDown: true, enforcement: 'previous', yards: 5, possessionChanges: 0 })],
      segments: [{ team: 'O', carrier: sim.qb.player.id, how: 'snap', startX: 108, endX: 105, end: 'pass' },
        { team: 'D', carrier: sim.defense[0].player.id, how: 'interception', startX: 110, endX: 10, end: 'dead' }],
      stats: { interceptedBy: sim.defense[0].player.id } }));
    expect(attempts).toHaveLength(1);
    expect(game.state.score).toEqual({ home: 6, away: 2 });
    expect(game.result().log.find(p => p.kind === 'two')?.foul).toMatchObject({ kind: 'illegal_forward_pass', accepted: false });
  });

  it('selects the actual loss-of-down call, not OPI yardage, when ending a multiply fouled successful Try', () => {
    const { game, attempts } = tryScenario(sim => ({ ...goodTry(sim), penalties: [
      foul(sim, 'opi', { id: 'try-opi', rule: '8-5-4(a)' }),
      foul(sim, 'illegal_forward_pass', { id: 'try-second', rule: '8-1-2', reason: 'second_forward_pass',
        lossDown: true, enforcement: 'previous', yards: 5 }),
    ] }));
    expect(attempts).toHaveLength(1);
    expect(game.state.score).toEqual({ home: 6, away: 0 });
    const accepted = game.result().log.find(p => p.kind === 'two')?.fouls?.filter(f => f.accepted);
    expect(accepted).toEqual([expect.objectContaining({ kind: 'illegal_forward_pass', yards: 5 })]);
  });

  it('enforces defensive end-zone DPI on an unsuccessful Try and retries from the one', () => {
    const { game, attempts } = tryScenario((sim, n) => n === 0
      ? scripted(sim, { outcome: 'incomplete', penalties: [foul(sim, 'dpi', { spotX: 112, rule: '8-5' })] })
      : goodTry(sim));
    expect(attempts.map(sim => sim.los)).toEqual([108, 109]);
    expect(game.state.score).toEqual({ home: 8, away: 0 });
    expect(game.result().log.find(p => p.kind === 'two')?.foul).toMatchObject({ kind: 'dpi', accepted: true });
  });

  it('awards a clean defensive Try return touchdown to the defense for two points', () => {
    const { game, attempts } = tryScenario(sim => scripted(sim, { possession: 'D', turnover: true,
      outcome: 'touchdown', score: { team: 'D', kind: 'TD' }, endX: 10,
      segments: [{ team: 'O', carrier: sim.qb.player.id, how: 'snap', startX: 108, endX: 105, end: 'pass' },
        { team: 'D', carrier: sim.defense[0].player.id, how: 'interception', startX: 110, endX: 10, end: 'dead' }],
      stats: { interceptedBy: sim.defense[0].player.id } }));
    expect(attempts).toHaveLength(1);
    expect(game.state.score).toEqual({ home: 6, away: 2 });
  });

  it.each([{ scoringTeam: 'D' as const, expected: { home: 6, away: 1 } },
    { scoringTeam: 'O' as const, expected: { home: 7, away: 0 } }])(
    'awards the one-point Try safety to the actual scoring side $scoringTeam', ({ scoringTeam, expected }) => {
      const { game, attempts } = tryScenario(sim => scripted(sim, { outcome: 'safety',
        score: { team: scoringTeam, kind: 'safety' }, endX: scoringTeam === 'D' ? 10 : 110,
        possession: scoringTeam === 'D' ? 'O' : 'D', turnover: scoringTeam === 'O' }));
      expect(attempts).toHaveLength(1);
      expect(game.state.score).toEqual(expected);
    });
});

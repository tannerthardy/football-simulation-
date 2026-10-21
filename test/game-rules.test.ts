/**
 * Game-rule scenarios: each case scripts the result of one snap and checks
 * the official record (score, down and distance, clock, box score). The
 * reproduced defects from the 2026-10-08 engine review are covered here.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y, OPP_GOAL_X, HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game, type GameHooks, type GameState } from '../src/game/game.js';
import { generateTeam, pickDefense, pickOffense, type Team } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { PlayResult, PlayStats } from '../src/sim/types.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: 0.6 });

type Script = Omit<Partial<PlayResult>, 'stats'> & { stats?: Partial<PlayStats> };

/** A complete PlayResult for `sim` with the given overrides. */
function scripted(sim: PlaySim, p: Script): PlayResult {
  const { stats, ...rest } = p;
  const yards = rest.yards ?? 0;
  return {
    outcome: 'tackle',
    possession: 'O',
    turnover: false,
    endX: sim.los + yards,
    endY: CENTER_Y,
    yards,
    offenseYards: rest.turnover ? 0 : yards,
    segments: [],
    score: null,
    duration: 5,
    clockStops: false,
    kind: 'run',
    events: [],
    ...rest,
    stats: { tacklers: [], completed: false, attempted: false, sacked: false, scramble: false, throwaway: false, pressured: false, brokenTackles: 0, missedTackles: 0, dropped: false, ...stats },
  };
}

const id = (sim: PlaySim, slot: string) => sim.slot(slot)!.player.id;
const defender = (sim: PlaySim, prefix: string): Agent => sim.defense.find((a) => a.slot.startsWith(prefix))!;

interface Scenario {
  state?: Partial<GameState>;
  play?: (sim: PlaySim) => Script;
  two?: (sim: PlaySim) => Script;
  foul?: 'false_start' | 'offside';
  tryChoice?: 'kick' | 'two';
}

/** Build a game in `state` with home on offense, then run one snap. */
function run(sc: Scenario): { g: Game; sims: PlaySim[] } {
  const sims: PlaySim[] = [];
  const hooks: GameHooks = {
    playResult: (sim, kind) => {
      sims.push(sim);
      const f = kind === 'two-point' ? sc.two : sc.play;
      return f ? scripted(sim, f(sim)) : undefined;
    },
    preSnapFoul: () => sc.foul ?? null,
    tryChoice: () => sc.tryChoice,
  };
  const g = new Game(home, away, { seed: 5, hooks });
  g.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 50, down: 1, distance: 10, score: { home: 0, away: 0 }, ...sc.state });
  g.step();
  return { g, sims };
}

const box = (g: Game, t: Team) => g.result().box.team(t.abbr);
const line = (g: Game, playerId: string) => g.result().box.players.get(playerId);
const scrimmageLog = (g: Game) => g.result().log.filter((p) => p.kind === 'run' || p.kind === 'pass');

describe('dead-ball fouls', () => {
  it('offside does not use a down or count a third-down attempt', () => {
    const { g } = run({ state: { down: 3, distance: 10 }, foul: 'offside' });
    expect(g.state).toMatchObject({ down: 3, distance: 5, yardline: 55 });
    expect(box(g, home).thirdAtt).toBe(0);
    expect(box(g, away).penalties).toBe(1);
  });

  it('offside that reaches the line to gain is a first down by penalty', () => {
    const { g } = run({ state: { down: 3, distance: 3 }, foul: 'offside' });
    expect(g.state).toMatchObject({ down: 1, distance: 10, yardline: 55 });
    expect(box(g, home).firstDowns).toBe(1);
    expect(box(g, home).thirdAtt).toBe(0);
  });

  it('a false start moves the offense back and keeps the down', () => {
    const { g } = run({ state: { down: 3, distance: 10 }, foul: 'false_start' });
    expect(g.state).toMatchObject({ down: 3, distance: 15, yardline: 45 });
    expect(box(g, home).thirdAtt).toBe(0);
  });

  it('half the distance near the goal line', () => {
    const { g } = run({ state: { yardline: 96, down: 1, distance: 4 }, foul: 'offside' });
    expect(g.state.yardline).toBe(98);
    expect(g.state.down).toBe(1);
  });
});

describe('two-minute warning', () => {
  it('a live play crossing the warning keeps its elapsed time', () => {
    const { g } = run({ state: { quarter: 4, clock: 125 }, play: () => ({ yards: 3, duration: 8 }) });
    expect(g.state.clock).toBeCloseTo(117, 6);
    expect(g.state.twoMinWarned).toBe(true);
  });

  it('runoff between plays stops at the warning', () => {
    const { g } = run({ state: { quarter: 4, clock: 140 }, play: () => ({ yards: 3, duration: 5 }) });
    expect(g.state.clock).toBe(120);
    expect(g.state.twoMinWarned).toBe(true);
  });
});

describe('clock between snaps', () => {
  /** Two snaps from 2nd-and-10 at 10:00 of the 2nd (or `quarter`/`clock`): a scripted play, then a pre-snap foul or another play. */
  function twoSnaps(first: Script, second: 'false_start' | 'play', state: Partial<GameState> = {}): { clocks: number[] } {
    let snap = 0;
    const hooks: GameHooks = {
      playResult: (sim) => scripted(sim, first),
      preSnapFoul: () => (snap++ === 1 && second === 'false_start' ? 'false_start' : null),
    };
    const g = new Game(home, away, { seed: 5, hooks });
    g.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 50, down: 1, distance: 10, score: { home: 0, away: 0 }, ...state });
    g.step();
    const clocks = [g.state.clock];
    g.step();
    clocks.push(g.state.clock);
    return { clocks };
  }

  it('out of bounds before the late-half windows restarts on the ready signal', () => {
    const { clocks } = twoSnaps({ outcome: 'oob', yards: 6, duration: 5, clockStops: true }, 'play');
    expect(clocks[0]).toBeLessThan(600 - 5 - 20);
    expect(clocks[0]).toBeGreaterThan(600 - 5 - 40);
  });

  it('out of bounds late in a half stops the clock until the snap', () => {
    const { clocks } = twoSnaps({ outcome: 'oob', yards: 6, duration: 5, clockStops: true }, 'play', { quarter: 4, clock: 240 });
    expect(clocks[0]).toBeCloseTo(235, 6);
  });

  it('a false start with the clock running costs the ready-signal runoff', () => {
    const { clocks } = twoSnaps({ yards: 3, duration: 5 }, 'false_start');
    expect(clocks[0] - clocks[1]).toBeGreaterThan(8);
    expect(clocks[0] - clocks[1]).toBeLessThan(26);
  });

  it('a false start after an incompletion runs no clock', () => {
    const { clocks } = twoSnaps({ kind: 'pass', outcome: 'incomplete', yards: 0, duration: 4, clockStops: true, stats: { attempted: true } }, 'false_start');
    expect(clocks[1]).toBe(clocks[0]);
  });
});

const td = (sim: PlaySim): Script => ({ outcome: 'touchdown', yards: OPP_GOAL_X - sim.los, endX: OPP_GOAL_X + 1, score: { team: 'O', kind: 'TD' }, clockStops: true, stats: { rusher: id(sim, 'RB') } });
const twoGood = (sim: PlaySim): Script => ({ ...td(sim) });
const twoFailed = (): Script => ({ yards: 1 });

describe('overtime', () => {
  const ot = { quarter: 5, clock: 500, possession: 'away', yardline: 95, distance: 5, otPossessions: 2, otFirst: 'home' } as const;

  it('a second-possession touchdown and try that tie the game continue it', () => {
    const { g } = run({ state: { ...ot, score: { home: 8, away: 0 } }, play: td, tryChoice: 'two', two: twoGood });
    expect(g.state.score).toEqual({ home: 8, away: 8 });
    expect(g.state.over).toBe(false);
    // The tying team kicked off; sudden death has begun.
    expect(g.state.otPossessions).toBe(3);
  });

  it('a second-possession touchdown that still trails after the try ends it', () => {
    const { g } = run({ state: { ...ot, score: { home: 8, away: 0 } }, play: td, tryChoice: 'two', two: twoFailed });
    expect(g.state.score).toEqual({ home: 8, away: 6 });
    expect(g.state.over).toBe(true);
  });

  it('a second-possession touchdown that takes the lead ends it without a try', () => {
    const { g } = run({ state: { ...ot, score: { home: 3, away: 0 } }, play: td, tryChoice: 'two', two: twoGood });
    expect(g.state.score).toEqual({ home: 3, away: 6 });
    expect(g.state.over).toBe(true);
    expect(g.result().log.some((p) => p.kind === 'two' || p.kind === 'xp')).toBe(false);
  });

  it('a first-possession touchdown does not end it', () => {
    const { g } = run({ state: { ...ot, possession: 'home', otPossessions: 1, score: { home: 0, away: 0 } }, play: td, tryChoice: 'kick' });
    expect(g.state.over).toBe(false);
    expect(g.state.possession).toBe('away');
    expect(g.state.otPossessions).toBe(2);
  });

  it('the regular-season period can end in a tie; the postseason plays on', () => {
    const tie = new Game(home, away, { seed: 3, hooks: { playResult: (sim) => scripted(sim, { yards: 2, duration: 6 }), preSnapFoul: () => null } });
    tie.setState({ quarter: 5, clock: 3, possession: 'home', otPossessions: 3, score: { home: 10, away: 10 }, yardline: 30 });
    tie.step();
    expect(tie.state.over).toBe(true);
    const post = new Game(home, away, { seed: 3, rules: { postseason: true }, hooks: { playResult: (sim) => scripted(sim, { yards: 2, duration: 6 }), preSnapFoul: () => null } });
    post.setState({ quarter: 5, clock: 3, possession: 'home', otPossessions: 3, score: { home: 10, away: 10 }, yardline: 30 });
    post.step();
    expect(post.state.over).toBe(false);
    expect(post.state.quarter).toBe(6);
  });
});

describe('holding during a play', () => {
  it('wipes out a completion completely and repeats the down', () => {
    let qb = '', wr = '', de = '', cb = '';
    const { g } = run({
      play: (sim) => {
        qb = id(sim, 'QB');
        wr = sim.slot('X')!.player.id;
        de = defender(sim, 'DE').player.id;
        cb = defender(sim, 'CB').player.id;
        return {
          kind: 'pass',
          yards: 12,
          clockStops: false,
          penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'LT'), yards: 10, autoFirst: false, spotX: sim.los - 1 },
          stats: { passer: qb, target: wr, receiver: wr, attempted: true, completed: true, airYards: 9, yac: 3, hurriedBy: de, pressured: true, tacklers: [cb] },
        };
      },
    });
    const t = box(g, home);
    expect(t.plays).toBe(0);
    expect(t.passYds).toBe(0);
    expect(t.penalties).toBe(1);
    expect(t.penaltyYds).toBe(10);
    expect(line(g, qb)?.att ?? 0).toBe(0);
    expect(line(g, wr)?.rec ?? 0).toBe(0);
    expect(line(g, wr)?.yac ?? 0).toBe(0);
    expect(line(g, de)?.pressures ?? 0).toBe(0);
    expect(line(g, cb)?.tackles ?? 0).toBe(0);
    expect(g.state).toMatchObject({ down: 1, distance: 20, yardline: 40 });
    const entry = scrimmageLog(g)[0];
    expect(entry.nullified).toBe(true);
    expect(entry.foul).toMatchObject({ kind: 'holding', accepted: true, yards: 10 });
  });

  it('wipes out a touchdown', () => {
    const { g } = run({
      state: { yardline: 80, distance: 10 },
      play: (sim) => ({ ...td(sim), kind: 'pass', stats: { passer: id(sim, 'QB'), receiver: id(sim, 'X'), target: id(sim, 'X'), attempted: true, completed: true }, penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'RT'), yards: 10, autoFirst: false, spotX: sim.los - 2 } }),
    });
    expect(g.state.score).toEqual({ home: 0, away: 0 });
    expect(box(g, home).penalties).toBe(1);
    // Pass play: previous spot.
    expect(g.state).toMatchObject({ possession: 'home', down: 1, distance: 20, yardline: 70 });
  });

  it('on a run, enforces from the spot of the foul beyond the line', () => {
    const { g } = run({
      state: { yardline: 30, distance: 10 },
      play: (sim) => ({ yards: 25, stats: { rusher: id(sim, 'RB') }, penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'LG'), yards: 10, autoFirst: false, spotX: sim.los + 4 } }),
    });
    expect(g.state).toMatchObject({ down: 1, yardline: 24, distance: 16 });
  });

  it('in the end zone is a safety', () => {
    const { g } = run({
      state: { yardline: 2, distance: 10 },
      play: (sim) => ({ yards: 3, stats: { rusher: id(sim, 'RB') }, penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'C'), yards: 10, autoFirst: false, spotX: sim.los - 2.5 } }),
    });
    expect(g.state.score).toEqual({ home: 0, away: 2 });
    expect(g.state.possession).toBe('away');
  });

  it('declines the P022-style sack after enforcing a behind-line hold from the previous spot', () => {
    let qb = '';
    const { g } = run({
      state: { yardline: 35 },
      play: (sim) => {
        qb = id(sim, 'QB');
        return { kind: 'pass', yards: -8, stats: { sacked: true, sackedBy: [defender(sim, 'DE').player.id] },
          penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'LG'), yards: 10, autoFirst: false, spotX: sim.los - 4.04966946421048 } };
      },
    });
    expect(scrimmageLog(g)[0].foul?.accepted).toBe(false);
    expect(g.state).toMatchObject({ down: 2, distance: 18, yardline: 27 });
    expect(line(g, qb)).toMatchObject({ att: 0, sacked: 1, sackYds: 8 });
    expect(box(g, home)).toMatchObject({ passYds: -8, totalYds: -8, penalties: 0 });
  });

  it('uses the previous spot for a run hold behind the line, with half-distance at that spot', () => {
    const { g } = run({
      state: { yardline: 6 },
      play: (sim) => ({ yards: 3, stats: { rusher: id(sim, 'RB') },
        penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'LG'), yards: 10, autoFirst: false, spotX: sim.los - 2 } }),
    });
    expect(g.state).toMatchObject({ down: 1, distance: 13, yardline: 3 });
    expect(box(g, home)).toMatchObject({ penaltyYds: 3, penalties: 1, totalYds: 0 });
  });

  it('is declined when the play stopped a third down short', () => {
    const { g } = run({
      state: { down: 3, distance: 10 },
      play: (sim) => ({ yards: 4, stats: { rusher: id(sim, 'RB') }, penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'LG'), yards: 10, autoFirst: false, spotX: sim.los } }),
    });
    expect(g.state).toMatchObject({ down: 4, distance: 6, yardline: 54 });
    expect(box(g, home).penalties).toBe(0);
    expect(box(g, home).thirdAtt).toBe(1);
    expect(scrimmageLog(g)[0].foul?.accepted).toBe(false);
  });

  it('is declined when the defense took the ball away', () => {
    const { g } = run({
      play: (sim) => ({
        kind: 'pass', turnover: true, possession: 'D', endX: sim.los + 5, clockStops: true,
        stats: { passer: id(sim, 'QB'), target: id(sim, 'X'), attempted: true, interceptedBy: defender(sim, 'CB').player.id },
        penalty: { kind: 'holding', against: 'O', playerId: id(sim, 'LT'), yards: 10, autoFirst: false, spotX: sim.los },
      }),
    });
    expect(g.state.possession).toBe('away');
    expect(box(g, home).penalties).toBe(0);
    expect(box(g, home).turnovers).toBe(1);
  });
});

describe('down conversions', () => {
  it('a third-down touchdown is an attempt, a conversion and a first down', () => {
    const { g } = run({ state: { down: 3, distance: 5, yardline: 90 }, play: td, tryChoice: 'kick' });
    const t = box(g, home);
    expect(t.thirdAtt).toBe(1);
    expect(t.thirdConv).toBe(1);
    expect(t.firstDowns).toBe(1);
    expect(t.redZoneTrips).toBe(1);
    expect(t.redZoneTDs).toBe(1);
  });

  it('a third-down interception is an attempt without a conversion', () => {
    const { g } = run({
      state: { down: 3, distance: 5 },
      play: (sim) => ({ kind: 'pass', turnover: true, possession: 'D', endX: sim.los + 10, clockStops: true, stats: { passer: id(sim, 'QB'), attempted: true, interceptedBy: defender(sim, 'CB').player.id } }),
    });
    expect(box(g, home).thirdAtt).toBe(1);
    expect(box(g, home).thirdConv).toBe(0);
  });

  it('a fourth-down stop is an attempt and a turnover on downs', () => {
    const { g } = run({ state: { down: 4, distance: 1, yardline: 60 }, play: (sim) => ({ yards: 0, stats: { rusher: id(sim, 'RB') } }) });
    expect(box(g, home).fourthAtt).toBe(1);
    expect(box(g, home).fourthConv).toBe(0);
    expect(g.state).toMatchObject({ possession: 'away', yardline: 40, down: 1 });
  });
});

describe('fumble after a catch', () => {
  it('credits the completion and reception to the fumble spot', () => {
    let qb = '', wr = '';
    const { g } = run({
      play: (sim) => {
        qb = id(sim, 'QB');
        wr = id(sim, 'X');
        const cb = defender(sim, 'CB').player.id;
        return {
          kind: 'pass', turnover: true, possession: 'D', endX: sim.los + 5, yards: 0, offenseYards: 15, clockStops: true,
          stats: { passer: qb, target: wr, receiver: wr, attempted: true, completed: true, airYards: 8, yac: 7, fumbledBy: wr, fumbleLost: true, fumbleRecoveredBy: cb },
        };
      },
    });
    expect(line(g, qb)).toMatchObject({ att: 1, cmp: 1, passYds: 15 });
    expect(line(g, wr)).toMatchObject({ rec: 1, recYds: 15, yac: 7, fumbles: 1, fumblesLost: 1 });
    expect(box(g, home).turnovers).toBe(1);
    expect(g.state.possession).toBe('away');
    expect(g.state.yardline).toBe(110 - (60 + 5));
  });

  it('the play simulator records the fumble spot as the offense\'s statistical spot', () => {
    const formation = FORMATION_BY_ID.i_pro_21;
    const sim = new PlaySim({
      offense: pickOffense(home, formation.personnel),
      defense: pickDefense(away, 'base43'),
      offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID[Object.keys(RUN_BY_ID)[0]], label: 'run' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
      los: 40,
      ballY: HASH_LEFT_Y,
      firstDownX: 50,
      seed: 1,
    });
    const qb = sim.slot('QB')!;
    const rb = sim.slot('RB')!;
    const lb = sim.defense.find((a) => a.slot.startsWith('LB'))!;
    rb.body.pos = { x: 36, y: HASH_LEFT_Y };
    qb.body.pos = { x: 36.8, y: HASH_LEFT_Y }; // this fixture requires a reachable exchange
    sim.handoff(qb, rb);
    rb.body.pos = { x: 47, y: HASH_LEFT_Y };
    sim.fumble(rb, lb);
    lb.body.pos = { x: 47.5, y: HASH_LEFT_Y };
    sim.possess(lb, 'recovery');
    lb.body.pos = { x: 39, y: HASH_LEFT_Y };
    sim.whistle('tackle', lb.pos);
    const r = sim.buildResult();
    expect(r.turnover).toBe(true);
    expect(r.offenseYards).toBe(7);
    expect(r.stats.returnYards).toBeCloseTo(8.5, 6);
    expect(r.segments.map((s) => [s.team, s.how, s.end])).toEqual([
      ['O', 'snap', 'handoff'],
      ['O', 'handoff', 'fumble'],
      ['D', 'recovery', 'dead'],
    ]);
  });
});

describe('actual possession credit', () => {
  it('credits a retained-snap loss to the QB while keeping the failed exchange visible', () => {
    let qb = '';
    const { g } = run({ play: (sim) => {
      qb = id(sim, 'QB');
      return { yards: -5, outcome: 'timeout', duration: 25,
        segments: [{ team: 'O', carrier: qb, how: 'snap', startX: sim.los - 5, endX: sim.los - 5, end: 'dead' }],
        stats: { rusher: qb, retainedSnap: true } };
    } });
    expect(line(g, qb)).toMatchObject({ rushAtt: 1, rushYds: -5, sacked: 0, fumbles: 0 });
    expect(box(g, home)).toMatchObject({ rushYds: -5, totalYds: -5 });
    expect(scrimmageLog(g)[0]).toMatchObject({ segments: [{ carrier: qb, how: 'snap' }], stats: { retainedSnap: true } });
    expect(scrimmageLog(g)[0].text).toContain('(snap retained; no exchange)');
    expect(scrimmageLog(g)[0].text).not.toContain('?');
  });

  it('keeps intended target separate while crediting an incidental completion to its actual receiver', () => {
    let qb = '', target = '', receiver = '';
    const { g } = run({ play: (sim) => {
      qb = id(sim, 'QB'); target = id(sim, 'X'); receiver = id(sim, 'RB');
      return { kind: 'pass', yards: 11,
        stats: { passer: qb, target, receiver, attempted: true, completed: true, airYards: 7, completedAirYards: -4, yac: 15 } };
    } });
    expect(line(g, qb)).toMatchObject({ att: 1, cmp: 1, passYds: 11 });
    expect(line(g, target)).toMatchObject({ targets: 1, rec: 0 });
    expect(line(g, receiver)).toMatchObject({ targets: 0, rec: 1, recYds: 11, yac: 15 });
    expect(scrimmageLog(g)[0].stats).toMatchObject({ target, receiver, airYards: 7, completedAirYards: -4 });
    expect(scrimmageLog(g)[0].text).toContain('(-4 air, 15 YAC)');
  });
});

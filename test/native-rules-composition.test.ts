/** Bounded production Game composition checks. Native transfer/score APIs
 * supply football histories; explicit conduct rulings are scenario inputs,
 * since gestures are not a physical solver observable. No game campaign. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game, type GameState } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PenaltyCall, PlayResult } from '../src/sim/types.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
function gameWith(play: (sim: PlaySim, kind: 'scrimmage' | 'two-point') => PlayResult,
  state: Partial<GameState> = {}, two = false): Game {
  const game = new Game(home, away, { seed: 5, record: false, hooks: {
    preSnapFoul: () => null, playResult: play, tryChoice: () => two ? 'two' : 'kick',
  } });
  game.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 30,
    down: 1, distance: 10, score: { home: 0, away: 0 }, ...state });
  return game;
}
function ready(sim: PlaySim): void {
  for (const a of sim.agents) { a.downUntil = -1; a.snapReadyAt = 0; }
  sim.t = 2;
}
function endCarry(sim: PlaySim, carrier: Agent, x: number, outcome: 'touchdown' | 'tackle' = 'tackle'): PlayResult {
  carrier.body.pos = { x: outcome === 'touchdown' ? x + (carrier.team === 'O' ? .1 : -.1) : x, y: CENTER_Y };
  if (outcome === 'touchdown') {
    // Cross the actual goal-line condition through the live World/tick path.
    // finishCarry alone records an ending but does not award a touchdown.
    for (const a of sim.agents) a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
    sim.tick();
  } else sim.finishCarry(outcome, carrier.pos);
  return sim.buildResult();
}
function judged(sim: PlaySim, call: PenaltyCall): void {
  sim.recordFoul(call, { source: 'native', rule: call.rule!, action: 'explicit_official_conduct_ruling',
    facts: { scenarioInput: true } });
}

describe('native rules through Game composition', () => {
  it.each([
    { opponent: 5, tries: 0, final: 6, label: 'already wins by one' },
    { opponent: 6, tries: 1, final: 8, label: 'ties and the Try decides the winner' },
  ])('handles an expired-fourth touchdown that $label', ({ opponent, tries, final }) => {
    let attempts = 0;
    const game = gameWith((sim, kind) => {
      ready(sim);
      if (kind === 'two-point') attempts++;
      return endCarry(sim, sim.qb, 110, 'touchdown');
    }, { quarter: 4, clock: 1, score: { home: 0, away: opponent } }, true);
    game.step();
    expect(attempts).toBe(tries);
    expect(game.state.score).toEqual({ home: final, away: opponent });
    expect(game.state.over).toBe(true);
  });

  it('extends an expired half for a pre-interception offensive personal foul even after an offensive regain', () => {
    let ran = false;
    const game = gameWith(sim => {
      ran = true; ready(sim);
      const defender = sim.slot('FS')!, receiver = sim.slot('X')!;
      judged(sim, { id: 'pre-interception-personal', kind: 'unnecessary_roughness', against: 'O',
        playerId: sim.slot('LT')!.player.id, yards: 15, autoFirst: false, personalFoul: true,
        phase: 'live', possessionChanges: 0, possessionTeam: 'O', t: .1, spotX: sim.los + 1,
        rule: '12-2-8', playPhase: 'pass' });
      sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y };
      sim.throwBall(sim.qb, receiver, { x: 15, y: 0, z: 3 }, { x: sim.los + 5, y: CENTER_Y, z: 1 }, 3);
      defender.body.pos = { x: sim.los + 5, y: CENTER_Y }; sim.possess(defender, 'interception');
      defender.body.pos.x = sim.los + 3; sim.fumble(defender, null);
      receiver.body.pos = { x: sim.los - 2, y: CENTER_Y }; sim.possess(receiver, 'recovery');
      return endCarry(sim, receiver, sim.los - 2);
    }, { quarter: 2, clock: 1, timeouts: { home: 0, away: 0 }, score: { home: 0, away: 7 } });
    game.step();
    expect(ran).toBe(true);
    expect(game.state, JSON.stringify(game.result().log)).toMatchObject({ quarter: 2, clock: 0, possession: 'away', down: 1 });
    expect(game.state.over).toBe(false);
  });

  it('keeps the original interception but excludes a later illegal return pass, fumble and touchdown', () => {
    let quarterback = '', interceptor = '', laterFumbler = '', missedActor = '';
    const game = gameWith(sim => {
      ready(sim);
      const x = sim.slot('X')!, fs = sim.slot('FS')!, ss = sim.slot('SS')!;
      quarterback = sim.qb.player.id; interceptor = fs.player.id; laterFumbler = ss.player.id; missedActor = x.player.id;
      sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y };
      sim.throwBall(sim.qb, x, { x: 15, y: 0, z: 3 }, { x: sim.los + 5, y: CENTER_Y, z: 1 }, 3);
      fs.body.pos = { x: sim.los + 5, y: CENTER_Y }; sim.possess(fs, 'interception');
      fs.body.pos.x = sim.los - 5;
      x.missedTackles = 1; sim.stats.missedTackles = 1; // one official pre-release miss
      sim.throwBall(fs, ss, { x: -15, y: 0, z: 3 }, { x: 20, y: CENTER_Y, z: 1 }, 3);
      x.missedTackles = 2; sim.stats.missedTackles = 2; // later nullified miss
      ss.body.pos = { x: 20, y: CENTER_Y }; sim.possess(ss, 'catch');
      sim.fumble(ss, null); fs.body.pos = { x: 20, y: CENTER_Y }; sim.possess(fs, 'recovery');
      const physical = endCarry(sim, fs, 10, 'touchdown');
      expect(physical.penalties).toContainEqual(expect.objectContaining({ kind: 'illegal_forward_pass', against: 'D' }));
      expect(physical.stats.fumbles).toHaveLength(1);
      expect(physical.statsBeforeIllegalPass?.fumbles?.length ?? 0).toBe(0);
      return physical;
    }, { down: 3 });
    game.step();
    const result = game.result();
    expect(game.state.score).toEqual({ home: 0, away: 0 });
    expect(game.state).toMatchObject({ possession: 'away', yardline: 70.3, down: 1, distance: 10 });
    expect(result.box.team(home.abbr).turnovers).toBe(1);
    expect(result.box.team(away.abbr).turnovers).toBe(0);
    expect(result.box.players.get(quarterback)?.int).toBe(1);
    expect(result.box.players.get(interceptor)?.defInt).toBe(1);
    expect(result.box.players.get(laterFumbler)?.fumbles ?? 0).toBe(0);
    expect(result.box.players.get(missedActor)?.missedTackles).toBe(1);
    expect(result.log.find(p => p.foul?.kind === 'illegal_forward_pass')?.official?.stats).toBe('before_change_of_possession');
  });

  it('removes a twice-taunting player despite offsetting yardage, while two ordinary personal fouls do not automatically eject', () => {
    let snap = 0, offender = '', ordinaryOffender = '';
    const thirdSnap: string[] = [];
    const game = gameWith(sim => {
      ready(sim); snap++;
      if (snap === 1) { offender = sim.qb.player.id; ordinaryOffender = sim.slot('FS')!.player.id; }
      if (snap === 3) thirdSnap.push(...sim.agents.map(a => a.player.id));
      endCarry(sim, sim.qb, sim.los + 3);
      if (snap <= 2) {
        judged(sim, { id: `taunt:${snap}`, kind: 'taunting', against: 'O', playerId: offender,
          yards: 15, autoFirst: false, phase: 'dead_ball', rule: '12-3-1(c)', t: 2 });
        judged(sim, { id: `ordinary-personal:${snap}`, kind: 'unnecessary_roughness', against: 'D', playerId: ordinaryOffender,
          yards: 15, autoFirst: true, personalFoul: true, phase: 'dead_ball', rule: '12-2-8', t: 2 });
      }
      return sim.buildResult();
    });
    game.step(); game.step(); game.step();
    expect(game.result().disqualifiedPlayers).toEqual([offender]);
    expect(thirdSnap).not.toContain(offender);
    expect(thirdSnap).toContain(ordinaryOffender);
    expect(game.result().box.team(home.abbr).penalties).toBe(0);
    expect(game.result().box.team(away.abbr).penalties).toBe(0);
  });
});

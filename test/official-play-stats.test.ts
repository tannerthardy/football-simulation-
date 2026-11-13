/** NFL GSIS statistical contract through production Game. Native releases,
 * gains and possession changes supply the history; judged holding calls are
 * explicit scenario inputs, independently covered by native holding tests. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PenaltyCall, PlayResult } from '../src/sim/types.js';

const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
function park(sim: PlaySim): void {
  sim.t = sim.world.time = .5;
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + a.idx % 5 * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 }; a.downUntil = -1; a.snapReadyAt = 0;
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.qb.body.pos = { x: sim.los - 3, y: CENTER_Y }; sim.qb.body.facing = 0;
}
function run(play: (sim: PlaySim) => PlayResult, down = 3, late = false) {
  let sim!: PlaySim;
  const game = new Game(home, away, { seed: 5, hooks: { preSnapFoul: () => null,
    playResult: current => { sim = current; park(sim); return play(sim); } } });
  game.setState({ quarter: late ? 4 : 2, clock: late ? 78 : 600, possession: 'home',
    yardline: 30, down, distance: 10, score: { home: 0, away: 7 }, timeouts: { home: 0, away: 0 } });
  game.step();
  const result = game.result();
  const log = result.log.find(p => p.kind === 'run' || p.kind === 'pass')!;
  return { game, sim, log, box: result.box.team(home.abbr), result };
}
function finish(sim: PlaySim, carrier: Agent, x: number): PlayResult {
  carrier.body.pos = { x, y: CENTER_Y }; sim.t += .5;
  sim.finishCarry('tackle', carrier.pos); return sim.buildResult();
}
function judgedHold(sim: PlaySim, against: 'O' | 'D', x: number): void {
  const actor = against === 'O' ? sim.slot('LT')! : sim.slot('FS')!;
  const call: PenaltyCall = { id: 'official-hold', kind: 'holding', against, playerId: actor.player.id,
    yards: 10, autoFirst: false, spotX: x, t: sim.t, phase: 'live', playPhase: 'run' };
  sim.recordFoul(call, { source: 'native', rule: '12-1-3', action: 'judged_holding_scenario', facts: { scenarioInput: true } });
}
function originalRun(sim: PlaySim, x: number): PlayResult {
  const rb = sim.slot('RB')!; rb.body.pos = { x: sim.qb.pos.x - .5, y: CENTER_Y };
  expect(sim.handoff(sim.qb, rb)).toBe(true);
  // The hook's selected Game call can be a pass. Supply the achieved native
  // handoff as a run result, rather than scoring an unattempted called pass.
  return { ...finish(sim, rb, x), kind: 'run' };
}

describe('official credit distinct from a nullified raw ending', () => {
  it('charges a native grounding incomplete attempt and third down, without crediting a sack', () => {
    const { game, sim, log, box, result } = run(sim => {
      // A delayed spike is an objective native grounding act, independent of
      // the pressure judgment. Actual flight must reach the ground.
      expect(sim.spikeBall()).toBe(true);
      for (let tick = 0; tick < 12 && sim.phase === 'live'; tick++) sim.tick();
      expect(sim.penalties.some(p => p.kind === 'intentional_grounding')).toBe(true);
      return sim.buildResult();
    });
    expect(game.state).toMatchObject({ down: 4, distance: 20, yardline: 20 });
    expect(log.nullified).toBe(true);
    expect(log.stats).toBe(sim.stats);
    expect(log.officialCredit).toMatchObject({ treatment: 'loss_of_down', playCharged: true,
      downAttempt: true, converted: false, kind: 'pass', yards: 0 });
    expect(box).toMatchObject({ plays: 1, thirdAtt: 1, thirdConv: 0, passYds: 0,
      totalYds: 0, penalties: 1, penaltyYds: 10, sacksAllowed: 0 });
    expect(result.box.players.get(sim.qb.player.id)).toMatchObject({ att: 1, cmp: 0, sacked: 0, passYds: 0 });
  });

  it('keeps accepted previous-spot holding wholly uncredited', () => {
    const { game, log, box } = run(sim => {
      judgedHold(sim, 'O', sim.los - 1);
      return originalRun(sim, sim.los + 12);
    });
    expect(game.state).toMatchObject({ down: 3, yardline: 20, distance: 20 });
    expect(log).toMatchObject({ nullified: true, officialCredit: { treatment: 'none', playCharged: false, downAttempt: false } });
    expect(box).toMatchObject({ plays: 0, thirdAtt: 0, rushYds: 0, totalYds: 0 });
  });

  it('retains a spot-enforced run prefix but no replayed-third attempt', () => {
    const { game, sim, log, box, result } = run(sim => {
      judgedHold(sim, 'O', sim.los + 5);
      return originalRun(sim, sim.los + 12);
    });
    expect(game.state).toMatchObject({ down: 3, yardline: 25, distance: 15 });
    expect(log.nullified).toBe(true);
    expect(log.officialCredit).toMatchObject({ treatment: 'to_enforcement_spot', playCharged: true,
      downAttempt: false, converted: false, yards: 5 });
    expect(box).toMatchObject({ plays: 1, thirdAtt: 0, rushYds: 5, totalYds: 5, penaltyYds: 10 });
    expect(result.box.players.get(sim.slot('RB')!.player.id)).toMatchObject({ rushAtt: 1, rushYds: 5 });
    expect(log.officialCredit!.segments!.at(-1)?.how).toBe('handoff');
  });

  it('credits the ordinary legal run and its third-down conversion', () => {
    const { log, box } = run(sim => originalRun(sim, sim.los + 12));
    expect(log.nullified).not.toBe(true);
    expect(log.officialCredit).toMatchObject({ treatment: 'physical', playCharged: true, downAttempt: true, converted: true });
    expect(box).toMatchObject({ plays: 1, thirdAtt: 1, thirdConv: 1, rushYds: 12 });
  });

  it('credits the native beyond-line illegal pass as a rush to release, with no illegal pass attempt', () => {
    const { sim, log, box, result } = run(sim => {
      sim.qb.body.pos.x = sim.los + 3;
      sim.throwBall(sim.qb, null, { x: 10, y: 0, z: 0 }, { x: sim.los + 8, y: CENTER_Y, z: 0 }, 2, true);
      sim.whistle('incomplete', sim.qb.pos);
      return sim.buildResult();
    });
    expect(log.foul).toMatchObject({ kind: 'illegal_forward_pass', accepted: true });
    expect(log.officialCredit).toMatchObject({ treatment: 'loss_of_down', playCharged: true, downAttempt: true, yards: 3.3 });
    expect(box).toMatchObject({ plays: 1, thirdAtt: 1, rushYds: 3.3 });
    expect(result.box.players.get(sim.qb.player.id)).toMatchObject({ rushAtt: 1, rushYds: 3.3, att: 0 });
  });

  it('retains the native missed backward-pitch rush and statistical fumble separately from its late-half penalty', () => {
    const { sim, log, box, result } = run(sim => {
      sim.qb.body.pos = { x: sim.los - 3, y: .2 };
      const rb = sim.slot('RB')!; rb.body.pos = { x: sim.los - 4, y: -2 };
      expect(sim.pitchBall(sim.qb, rb)).toBe(true);
      for (let tick = 0; tick < 20 && sim.phase === 'live'; tick++) sim.tick();
      expect(sim.penalties.some(p => p.kind === 'illegal_backward_pass')).toBe(true);
      return sim.buildResult();
    }, 3, true);
    expect(log.nullified).toBe(true);
    expect(log.officialCredit).toMatchObject({ treatment: 'loss_of_down', playCharged: true, downAttempt: true });
    expect(box).toMatchObject({ plays: 1, thirdAtt: 1, turnovers: 0, penalties: 1, penaltyYds: 5 });
    expect(box.rushYds).toBe(sim.buildResult().offenseYards);
    expect(result.box.players.get(sim.qb.player.id)).toMatchObject({ rushAtt: 1, fumbles: 1, fumblesLost: 0 });
  });

  it('preserves an original interception and a qualifying return fumble without the nullified later giveaway', () => {
    let interceptor!: Agent, originalReceiver!: Agent;
    const { log, box, result } = run(sim => {
      originalReceiver = sim.slot('X')!; interceptor = sim.slot('FS')!;
      sim.throwBall(sim.qb, originalReceiver, { x: 15, y: 0, z: 4 }, { x: sim.los + 10, y: CENTER_Y, z: 1 }, 2);
      sim.t = 1; interceptor.body.pos = { x: sim.los + 10, y: CENTER_Y }; sim.possess(interceptor, 'interception');
      expect(sim.buildResult().possessionSnapshots).toHaveLength(1);
      sim.t = 1.5; interceptor.body.pos.x = sim.los + 5; judgedHold(sim, 'D', sim.los + 5);
      sim.t = 2; interceptor.body.pos.x = sim.los + 2; sim.fumble(interceptor, null);
      sim.t = 2.5; originalReceiver.body.pos = { x: sim.los + 2, y: CENTER_Y }; sim.possess(originalReceiver, 'recovery');
      sim.t = 3; sim.fumble(originalReceiver, null);
      sim.t = 3.5; interceptor.body.pos = { x: sim.los + 2, y: CENTER_Y }; sim.possess(interceptor, 'recovery');
      // The long physical return makes accepting the foul useful to O; a
      // simple O regain would correctly lead O to decline the return hold.
      return finish(sim, interceptor, sim.los - 20);
    });
    expect(log.officialCredit).toMatchObject({ treatment: 'before_change_of_possession', playCharged: true, downAttempt: true });
    expect(box).toMatchObject({ plays: 1, thirdAtt: 1, turnovers: 1 });
    expect(result.box.team(away.abbr).turnovers).toBe(0);
    expect(result.box.players.get(interceptor.player.id)).toMatchObject({ defInt: 1, fumbles: 1, fumblesLost: 0 });
    expect(result.box.players.get(originalReceiver.player.id)?.fr).toBe(0);
    expect(log.officialCredit!.segments!.map(s => s.team)).toEqual(['O', 'D']);
    expect(log.segments!.map(s => s.team)).toEqual(['O', 'D', 'O', 'D']);
  });

  it('selects the actual retained interception snapshot for a pre-INT offensive personal foul', () => {
    let interceptor!: Agent, receiver!: Agent;
    const { log, box, result } = run(sim => {
      interceptor = sim.slot('FS')!; receiver = sim.slot('X')!;
      sim.recordFoul({ kind: 'unnecessary_roughness', against: 'O', playerId: sim.slot('LT')!.player.id,
        yards: 15, autoFirst: false, personalFoul: true, phase: 'live', t: sim.t,
        possessionChanges: 0, possessionTeam: 'O', spotX: sim.los + 1, playPhase: 'pass' },
      { source: 'native', rule: '12-2-8', action: 'judged_personal_scenario', facts: { scenarioInput: true } });
      sim.throwBall(sim.qb, receiver, { x: 15, y: 0, z: 4 }, { x: sim.los + 10, y: CENTER_Y, z: 1 }, 2);
      sim.t = 1; interceptor.body.pos = { x: sim.los + 10, y: CENTER_Y }; sim.possess(interceptor, 'interception');
      sim.t = 2; interceptor.body.pos.x = sim.los + 2; sim.fumble(interceptor, null);
      sim.t = 2.5; receiver.body.pos = { x: sim.los + 2, y: CENTER_Y }; sim.possess(receiver, 'recovery');
      sim.t = 3; sim.fumble(receiver, null);
      sim.t = 3.5; interceptor.body.pos = { x: sim.los + 2, y: CENTER_Y }; sim.possess(interceptor, 'recovery');
      return finish(sim, interceptor, sim.los + 40);
    });
    expect(log.officialCredit).toMatchObject({ treatment: 'before_change_of_possession', playCharged: true, downAttempt: true });
    expect(log.officialCredit!.segments!.map(s => s.team)).toEqual(['O', 'D']);
    expect(box.turnovers).toBe(1);
    expect(result.box.team(away.abbr).turnovers).toBe(0);
    expect(result.box.players.get(interceptor.player.id)?.defInt).toBe(1);
    expect(result.box.players.get(receiver.player.id)?.fumbles ?? 0).toBe(0);
  });
});

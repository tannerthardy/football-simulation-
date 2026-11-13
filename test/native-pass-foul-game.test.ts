/** One controlled native act per enforcement family. No PenaltyCall or
 * PlayResult foul is inserted: the real World and PlaySim observers produce
 * the call, and Game consumes buildResult through its existing scenario hook.
 * The terminal whistle fixes the comparison ending; it is not catch evidence. */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { Game } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { DRAG_SPIRAL, solveLaunch, stepFlight } from '../src/physics/ball.js';
import type { HandJoint } from '../src/physics/world.js';
import type { Agent } from '../src/sim/agent.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { PenaltyCall } from '../src/sim/types.js';

const home = generateTeam(new Rng(31), 'Home', 'HOM', { strength: .55 });
const away = generateTeam(new Rng(32), 'Away', 'AWY', { strength: .55 });
function move(a: Agent, x: number, y: number, vx = 0, vy = 0, kind = 'idle'): void {
  a.body.pos = { x, y }; a.body.vel = { x: vx, y: vy };
  a.body.facing = Math.hypot(vx, vy) ? Math.atan2(vy, vx) : 0;
  a.behavior = { kind, update: () => ({ vel: { x: vx, y: vy }, facing: a.facing }) };
}
function stage(sim: PlaySim): { receiver: Agent; defender: Agent } {
  for (const a of sim.agents) {
    move(a, 75 + a.idx % 5 * 3, 3 + Math.floor(a.idx / 5) * 3); a.snapReadyAt = 0;
  }
  move(sim.qb, sim.los - 3, CENTER_Y);
  sim.t = .5;
  const receiver = sim.slot('X')!, defender = sim.slot('CB_S')!;
  expect(sim.snapEligibility.get(receiver.player.id)?.eligible).toBe(true);
  return { receiver, defender };
}

function nativeFoulGame(kind: 'dpi' | 'illegal_contact') {
  let nativeCall: PenaltyCall | undefined;
  let nativeSim: PlaySim | undefined;
  const game = new Game(home, away, { seed: 5, record: false, hooks: {
    preSnapFoul: () => null,
    playResult: (sim, snapKind) => {
      expect(snapKind).toBe('scrimmage'); nativeSim = sim;
      const { receiver, defender } = stage(sim);
      if (kind === 'dpi') {
        const target = { x: sim.los + 11.5, y: CENTER_Y - 1.4, z: 1.5 };
        sim.t = .2;
        const release = { x: sim.qb.pos.x + .3, y: sim.qb.pos.y, z: 2.2 };
        sim.throwBall(sim.qb, receiver, solveLaunch(release, target, .72, DRAG_SPIRAL), target, .92);
        expect(sim.ball.kind).toBe('air');
        if (sim.ball.kind === 'air') stepFlight(sim.ball.flight, .3);
        sim.t = .5;
        move(receiver, sim.los + 10, CENTER_Y, 6, 0, 'track'); receiver.tags.add('onBall');
        move(defender, sim.los + 10, CENTER_Y - .55, 0, 12, 'pursuit'); defender.tags.delete('onBall');
        sim.tick();
        expect(sim.lastStep!.contacts.some(c => c.impulse > 0 && [c.i, c.j].includes(receiver.idx)
          && [c.i, c.j].includes(defender.idx))).toBe(true);
      } else {
        move(receiver, sim.los + 2, CENTER_Y, 2, 0, 'route');
        move(defender, sim.los + 2.7, CENTER_Y); defender.body.facing = Math.PI;
        const hand: HandJoint = { kind: 'hands', a: defender.body, b: receiver.body,
          extension: .7, push: 400, hold: 0, steer: 100 };
        sim.world.joints.push(hand);
        sim.tick();
        expect(sim.penalties.some(p => p.kind === kind)).toBe(false); // legal loaded press
        receiver.body.pos.x += 5; defender.body.pos.x += 5;
        sim.tick();
        expect(Math.hypot(hand.normalForce ?? 0, hand.tangentForce ?? 0)).toBeGreaterThan(0);
      }
      nativeCall = sim.penalties.find(p => p.kind === kind);
      expect(nativeCall, JSON.stringify(sim.foulRecords)).toBeDefined();
      expect(sim.foulRecords.find(r => r.called && r.kind === kind)?.evidence.source).toBe('native');
      // Termination is a shared controlled ending; foul production above used
      // live World intervals and the production PlaySim hooks exclusively.
      sim.whistle(kind === 'dpi' ? 'incomplete' : 'tackle', { x: sim.los, y: CENTER_Y });
      return sim.buildResult();
    },
  } });
  game.setState({ quarter: 2, clock: 600, possession: 'home', yardline: 30,
    down: 3, distance: 15, score: { home: 0, away: 0 } });
  game.step();
  expect(nativeSim).toBeDefined();
  return { game, call: nativeCall!, sim: nativeSim! };
}

describe('native pass-contact foul through official Game enforcement', () => {
  it('places actual DPI at its native foul spot, awards a new series and credits no nullified pass', () => {
    const { game, call, sim } = nativeFoulGame('dpi');
    expect(call).toMatchObject({ against: 'D', autoFirst: true, enforcement: 'spot', phase: 'live', possessionChanges: 0 });
    expect(game.state.possession).toBe('home');
    expect(game.state.yardline).toBeCloseTo(call.spotX! - 10, 8);
    expect(game.state).toMatchObject({ down: 1, distance: 10, score: { home: 0, away: 0 } });
    const result = game.result(), entry = result.log.find(p => p.fouls?.some(f => f.kind === 'dpi'))!;
    expect(entry.official).toMatchObject({ treatment: 'enforce', possession: 'home', spotX: call.spotX,
      down: 1, distance: 10, stats: 'none' });
    expect(entry.foul).toMatchObject({ kind: 'dpi', accepted: true });
    expect(entry.foulRecords).toContainEqual(expect.objectContaining({ kind: 'dpi', called: true,
      evidence: expect.objectContaining({ source: 'native' }) }));
    expect(result.box.team(away.abbr).penalties).toBe(1);
    expect(result.box.team(away.abbr).penaltyYds).toBeCloseTo(call.spotX! - sim.los, 8);
    expect(result.box.team(home.abbr)).toMatchObject({ plays: 0, passYds: 0 });
    expect(result.box.players.get(sim.qb.player.id)?.att ?? 0).toBe(0);
  });

  it('enforces actual illegal contact five from the previous spot with an automatic first down', () => {
    const { game, call, sim } = nativeFoulGame('illegal_contact');
    expect(call).toMatchObject({ against: 'D', yards: 5, autoFirst: true, enforcement: 'previous' });
    expect(call.spotX!).toBeGreaterThan(sim.los + 5); // not the enforcement spot
    expect(game.state).toMatchObject({ possession: 'home', yardline: 35, down: 1, distance: 10,
      score: { home: 0, away: 0 } });
    const result = game.result(), entry = result.log.find(p => p.fouls?.some(f => f.kind === 'illegal_contact'))!;
    expect(entry.official).toMatchObject({ spotX: sim.los + 5, down: 1, distance: 10, stats: 'none' });
    expect(entry.foul).toMatchObject({ kind: 'illegal_contact', accepted: true, yards: 5 });
    expect(result.box.team(away.abbr)).toMatchObject({ penalties: 1, penaltyYds: 5 });
    expect(result.box.team(home.abbr)).toMatchObject({ plays: 0, totalYds: 0 });
  });
});

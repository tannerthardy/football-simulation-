import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { resolveCatchOpportunities } from '../src/sim/catching.js';
import { PlaySim } from '../src/sim/playsim.js';
import { INCIDENTAL_FLIGHT_MAX_AGE } from '../src/sim/catch-readiness.js';
import type { Player } from '../src/players/types.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const saved = JSON.parse(readFileSync(new URL('./fixtures/incidental-catch-windows.json', import.meta.url), 'utf8'));

function stage(play = 24, record = false) {
  const f = saved.cases.find((c: { play: number }) => c.play === play);
  const offense = pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11');
  offense[f.actor.slot as keyof typeof offense] = f.player as Player;
  const sim = new PlaySim({ offense,
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.slant_flat, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1, record, recordEvery: 1, recordLevel: 'full' });
  const r = sim.slot(f.actor.slot)!, target = sim.slot('X')!;
  for (const a of sim.agents) a.body.pos = { x: 10, y: 2 };
  r.body.pos = { ...f.actor.pos }; r.body.vel = { ...f.actor.vel }; r.body.facing = f.actor.facing;
  r.behavior = { kind: f.actor.kind, passOption: f.actor.passOption, update: () => ({ vel: { x: 0, y: 0 } }) };
  sim.ball = { kind: 'air', flight: { pos: { ...f.prev }, vel: { ...f.ball.vel }, drag: 0 },
    thrower: sim.qb, target, releaseT: f.releaseT, releaseX: 35,
    intended: { x: 100, y: 20, z: 1.5 }, arrivalT: 3, deflected: false, throwaway: false };
  sim.t = f.drawTime;
  let draws = 0;
  sim.rng.chance = () => { draws++; return true; };
  const resolve = () => resolveCatchOpportunities(sim, f.prev, f.cur);
  return { sim, r, target, f, resolve, draws: () => draws };
}

describe('incidental offensive catch readiness', () => {
  it('does not award P024’s protection-only back possession without acquiring the flight', () => {
    const { sim, resolve, draws } = stage();
    resolve();
    expect(sim.stats.completed).toBe(false);
    expect(draws()).toBe(0);
    expect(sim.ball.kind).toBe('air');
  });

  it('preserves the existing targeted check-release catch window (P034)', () => {
    const { sim, r, f, resolve, draws } = stage(34);
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    sim.ball.target = r;
    r.tags.add('onBall');
    resolve();
    expect(sim.stats.receiver).toBe(f.player.id);
    expect(draws()).toBe(1);
  });

  it.each([4, 24, 23])('does not acquire the unseen/too-late incidental flight in saved P%s', play => {
    const { sim, r, f, resolve, draws } = stage(play);
    const flight = sim.ball;
    if (flight.kind !== 'air') throw new Error('Expected flight');
    for (const sample of f.samples) {
      sim.t = sample.t;
      r.body.pos = { ...sample.actor.pos }; r.body.facing = sample.actor.facing;
      flight.flight.pos = { ...sample.ball };
      sim.incidentalCatchReadiness.sense(sim);
    }
    sim.t = f.drawTime;
    r.body.pos = { ...f.actor.pos }; r.body.facing = f.actor.facing;
    expect(sim.incidentalCatchReadiness.query(r, sim.t)).toBeNull();
    resolve();
    expect(sim.stats.completed).toBe(false);
    expect(draws()).toBe(0);
  });

  it('allows an eligible permanent protector who has seen the flight in time to catch', () => {
    const { sim, r, f, resolve, draws } = stage();
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    r.body.facing = Math.PI;
    // Opposing control: a longer visible flight, same catch geometry/capability.
    sim.ball.flight.pos = { x: r.pos.x - 3, y: r.pos.y, z: 2 };
    sim.t = f.releaseT;
    sim.incidentalCatchReadiness.sense(sim);
    sim.t = f.releaseT + .4;
    sim.incidentalCatchReadiness.sense(sim);
    expect(sim.incidentalCatchReadiness.query(r, sim.t)).not.toBeNull();
    resolve();
    expect(r.behavior.kind).toBe('carrier');
    expect(sim.stats.receiver).toBe(f.player.id);
    expect(draws()).toBe(1);
  });

  it('retains occupied hands as a catch exclusion even with an acquired flight', () => {
    const { sim, r, resolve, draws } = stage();
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    r.body.facing = Math.PI;
    sim.ball.flight.pos = { x: r.pos.x - 3, y: r.pos.y, z: 2 };
    sim.t = 2; sim.incidentalCatchReadiness.sense(sim);
    sim.t = 2.4; sim.incidentalCatchReadiness.sense(sim);
    expect(sim.incidentalCatchReadiness.query(r, sim.t)).not.toBeNull();
    sim.defense[0].body.pos = { x: r.pos.x + .5, y: r.pos.y };
    expect(sim.engage(r, sim.defense[0], 'pass')).not.toBeNull();
    resolve();
    expect(sim.stats.completed).toBe(false);
    expect(draws()).toBe(0);
  });

  it('queries do not acquire evidence, use hidden current positions or consume randomness', () => {
    const { sim, r } = stage();
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    const rng = JSON.stringify(sim.rng);
    sim.ball.flight.pos = { x: r.pos.x - 4, y: r.pos.y, z: 2 };
    r.body.facing = 0;
    for (const t of [2, 2.05, 2.1, 2.15, 2.2, 2.25, 2.3, 2.35, 2.4]) {
      sim.t = t;
      sim.ball.flight.pos.x -= 1; // Advance hidden reality at every boundary.
      sim.incidentalCatchReadiness.sense(sim);
      for (let n = 0; n < 10; n++) expect(sim.incidentalCatchReadiness.query(r, t)).toBeNull();
    }
    expect(JSON.stringify(sim.rng)).toEqual(rng);
    // Repeated sensing within this boundary cannot make a fresh sighting.
    r.body.facing = Math.PI;
    sim.incidentalCatchReadiness.sense(sim);
    sim.t = 2.45; sim.incidentalCatchReadiness.sense(sim);
    expect(sim.incidentalCatchReadiness.query(r, 2.45)).toBeNull();
    sim.t = 2.8; sim.incidentalCatchReadiness.sense(sim);
    const acquired = sim.incidentalCatchReadiness.query(r, sim.t)!;
    expect(acquired.sampledAt).toBe(2.45);
    expect(acquired.pos).toEqual(sim.ball.flight.pos);
    sim.ball.flight.pos.x -= 20;
    sim.ball.target = sim.slot('Z')!;
    expect(sim.incidentalCatchReadiness.query(r, sim.t)).toEqual(acquired);
    acquired.pos.x = 999;
    expect(sim.incidentalCatchReadiness.query(r, sim.t)!.pos.x).not.toBe(999);
    expect(JSON.stringify(sim.rng)).toEqual(rng);
  });

  it('expires a lost flight instead of refreshing it from hidden reality', () => {
    const { sim, r } = stage();
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    sim.ball.flight.pos = { x: r.pos.x - 4, y: r.pos.y, z: 2 };
    r.body.facing = Math.PI;
    sim.t = 2; sim.incidentalCatchReadiness.sense(sim);
    r.body.facing = 0;
    sim.t = 2.4; sim.incidentalCatchReadiness.sense(sim);
    expect(sim.incidentalCatchReadiness.query(r, sim.t)?.sampledAt).toBe(2);
    sim.t = 2 + INCIDENTAL_FLIGHT_MAX_AGE + .05;
    sim.incidentalCatchReadiness.sense(sim);
    expect(sim.incidentalCatchReadiness.query(r, sim.t)).toBeNull();
  });

  it('the normal tick supplies a sensing opportunity before catch resolution', () => {
    const { sim, r } = stage();
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    r.body.facing = Math.PI;
    sim.ball.flight.pos = { x: r.pos.x - 8, y: r.pos.y, z: 2 };
    sim.ball.flight.vel = { x: 0, y: 0, z: 0 };
    for (let n = 0; n < 7; n++) sim.tick();
    expect(sim.incidentalCatchReadiness.query(r, sim.t)).not.toBeNull();
    expect(sim.stats.completed).toBe(false); // Outside reach despite acquisition.
  });

  it.each([6, 43])('preserves P%s’s targeted first-window success/failure and chance', play => {
    const { sim, r, f, resolve } = stage(play);
    if (sim.ball.kind !== 'air') throw new Error('Expected flight');
    sim.ball.target = r; r.tags.add('onBall');
    let chance = 0;
    sim.rng.chance = p => { chance = p; return f.originalSuccess; };
    resolve();
    expect(chance).toBeCloseTo(f.originalChance, 10);
    expect(sim.stats.completed).toBe(f.originalSuccess);
    expect(sim.stats.dropped).toBe(false);
  });

  it('recording and repeated diagnostic queries preserve actual tick execution and RNG', () => {
    const quiet = stage(), recorded = stage(24, true);
    for (const { sim, r } of [quiet, recorded]) {
      if (sim.ball.kind !== 'air') throw new Error('Expected flight');
      r.body.facing = Math.PI;
      sim.ball.flight.pos = { x: r.pos.x - 8, y: r.pos.y, z: 2 };
      sim.ball.flight.vel = { x: 0, y: 0, z: 0 };
    }
    for (let n = 0; n < 7; n++) {
      quiet.sim.tick(); recorded.sim.tick();
      for (let q = 0; q < 10; q++) recorded.sim.incidentalCatchReadiness.query(recorded.r, recorded.sim.t);
    }
    expect(recorded.sim.agents.map(a => a.body)).toEqual(quiet.sim.agents.map(a => a.body));
    expect(recorded.sim.events).toEqual(quiet.sim.events);
    expect(recorded.sim.stats).toEqual(quiet.sim.stats);
    expect(JSON.stringify(recorded.sim.rng)).toEqual(JSON.stringify(quiet.sim.rng));
    expect(recorded.sim.incidentalCatchReadiness.query(recorded.r, recorded.sim.t))
      .toEqual(quiet.sim.incidentalCatchReadiness.query(quiet.r, quiet.sim.t));
  });
});

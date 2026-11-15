import { describe, expect, it, vi } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { FIELD_WIDTH } from '../src/core/field.js';
import { ROUTES } from '../src/playbook/routes.js';
import { RouteRunner } from '../src/sim/behaviors/receiver.js';
import { PlaySim } from '../src/sim/playsim.js';
import { ReceiverForecast, installReceiverRoute } from '../src/sim/receiver-forecast.js';

/** Controller contract, not a saved ordinary play. Identical actual bodies and
 * recorded visual history, with only the named opposing variable changed. */
function scene(side = 1, keySide = -1) {
  const sim = new PlaySim({ ...nativeTraceSetup({ coverage: 'cover3', concept: 'stick',
    seed: 7, roster: 7, formation: 'gun_doubles_11', flip: false }), audibles: false });
  const r = sim.slot(sim.offAlign.numbering.S2!)!, key = sim.slot('LB_M')!;
  r.body.pos = { x: 40, y: FIELD_WIDTH / 2 }; r.body.vel = { x: 0, y: 0 };
  const runner = new RouteRunner(r, sim, ROUTES.stick, side);
  r.behavior = runner;
  // Re-staged on the engine defaults (2026-11-15): RELEASE_SEEN gives a receiver inside 5 yd of the line a release around
  // a defender tight in front of him, which owns his command there; the option read is staged past it (5.6 yd), the
  // key the same 2 yd in front.
  r.body.pos.x = 45.6; r.body.vel.x = 5;
  for (const d of sim.defense) { d.body.pos = { x: 30, y: 1 }; d.body.vel = { x: 0, y: 0 }; }
  key.body.pos = { x: 47.6, y: r.pos.y + side * keySide };
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents, sim.qb.idx);
  sim.t = 2;
  return { sim, r, key, runner };
}

describe('receiver option reads use acquired leverage', () => {
  it.each([-1, 1])('does not learn hidden call or target motion from reality advancing (side %s)', side => {
    const a = scene(side), b = scene(side);
    a.sim.defAlign.coverage = { ...a.sim.defAlign.coverage, man: true };
    b.sim.defAlign.coverage = { ...b.sim.defAlign.coverage, man: false };
    b.key.body.pos.y = b.r.pos.y + 10 * side;
    // Both worlds advance. The latest changed position is not yet acquired.
    for (const f of [a, b]) f.sim.perception.record(f.sim.agents, f.sim.qb.idx);
    const dice = vi.spyOn(a.sim, 'dice');
    const rawA = a.runner.update(a.r, a.sim), rawB = b.runner.update(b.r, b.sim);
    expect(a.runner.path).toEqual(b.runner.path);
    expect(rawA).toEqual(rawB);
    expect(a.runner.routeDecision?.choice.answer).toBe('away');
    expect(dice).not.toHaveBeenCalled();
  });

  it.each([-1, 1])('responds to an acquired defender capping the installed exit (side %s)', side => {
    const free = scene(side, -1), capped = scene(side, 1);
    free.runner.update(free.r, free.sim); capped.runner.update(capped.r, capped.sim);
    expect(free.runner.routeDecision?.choice).toMatchObject({ answer: 'away', reason: 'escape-open' });
    expect(capped.runner.routeDecision?.choice).toMatchObject({ answer: 'base', reason: 'escape-capped' });
    expect(free.runner.path).not.toEqual(capped.runner.path);
    // The answer is the installed six-yard out, above the complementary flat.
    expect(free.runner.path[1].p.x - free.sim.los).toBe(6);
  });

  it('waits for route progress, then keeps the committed branch through later rotation', () => {
    const f = scene(); f.r.pos.x = 41;
    f.runner.update(f.r, f.sim);
    expect(f.runner.routeDecision).toBeNull(); // A long jam is not permission to read a future break.
    f.r.pos.x = 44; f.runner.update(f.r, f.sim);
    const path = structuredClone(f.runner.path), decision = structuredClone(f.runner.routeDecision);
    f.key.pos.y = f.r.pos.y + 2;
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents, f.sim.qb.idx);
    f.sim.t += .4; f.runner.update(f.r, f.sim);
    expect(f.runner.routeDecision).toEqual(decision);
    expect(f.runner.path).toEqual(path);
  });

  it('remembers an acquired exit cap as he advances past his broad stem look', () => {
    const f = scene(), cap = f.sim.slot('CB_S')!;
    f.r.pos.x = 40;
    cap.body.pos = { x: 46, y: f.r.pos.y + 7 }; // Outside the local five-yard key window, on the called out.
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents, f.sim.qb.idx);
    f.runner.update(f.r, f.sim);
    f.r.pos.x = 44; f.sim.t += .05;
    f.runner.update(f.r, f.sim);
    expect(f.runner.routeDecision?.choice).toMatchObject({ answer: 'base', reason: 'escape-capped' });
    expect(f.runner.routeDecision?.choice.keys).toContain(cap.player.id);
  });

  it('keeps a legitimate disagreement until the QB sees the selected route', () => {
    const f = scene(); f.runner.update(f.r, f.sim);
    const prior = installReceiverRoute({ x: 40, y: FIELD_WIDTH / 2 }, 40, 1, ROUTES.stick, 0, f.r.profile, f.r.r('routeRunning'));
    const qb = new ReceiverForecast(f.sim.qb, prior, .05);
    qb.acquire({ pos: { x: 44, y: FIELD_WIDTH / 2 }, vel: { x: 5, y: 0 }, facing: 0, sampledAt: 1.8, acquiredAt: 2 });
    qb.readKeys([{ id: f.key.player.id, pos: { x: 46, y: FIELD_WIDTH / 2 + 1 }, vel: { x: 0, y: 0 }, age: .2 }]);
    expect(f.runner.routeDecision?.choice.answer).toBe('away');
    expect(qb.estimate?.routeAnswer).toBe('base');
    const before = qb.predict(2, .5);
    f.runner.path[1] = { p: { x: 90, y: 10 }, s: 1 };
    expect(qb.predict(2, .5)).toEqual(before); // Private intent is never a correction signal.
    qb.acquire({ pos: { x: 46, y: FIELD_WIDTH / 2 + 3 }, vel: { x: 0, y: 5 }, facing: Math.PI / 2,
      sampledAt: 2.3, acquiredAt: 2.5 });
    expect(qb.estimate).toMatchObject({ routeAnswer: 'away', answerSource: 'receiver-motion' });
    expect(qb.predict(2.5, .4)!.y).toBeGreaterThan(FIELD_WIDTH / 2 + 3);
  });

  it('does not refresh defensive memory or consume randomness by inspecting the QB route keys', () => {
    const f = scene(), see = vi.spyOn(f.sim, 'see'), dice = vi.spyOn(f.sim, 'dice');
    const first = f.sim.qbMind.routeKeyPictures();
    f.key.pos.y += 20;
    expect(f.sim.qbMind.routeKeyPictures()).toEqual(first);
    expect(see).not.toHaveBeenCalled(); expect(dice).not.toHaveBeenCalled();
    f.sim.t += .1;
    expect(f.sim.qbMind.routeKeyPictures()[0].age).toBeCloseTo(first[0].age + .1, 12);
  });

  it('keeps the QB expected answer when keys expire or rotate after the observed read landmark', () => {
    const f = scene();
    const prior = installReceiverRoute({ x: 40, y: FIELD_WIDTH / 2 }, 40, 1, ROUTES.stick, 0, f.r.profile, f.r.r('routeRunning'));
    const qb = new ReceiverForecast(f.sim.qb, prior, .05);
    const key = { id: f.key.player.id, pos: { x: 46, y: FIELD_WIDTH / 2 - 1 }, vel: { x: 0, y: 0 }, age: .2 };
    qb.acquire({ pos: { x: 43, y: FIELD_WIDTH / 2 }, vel: { x: 5, y: 0 }, facing: 0, sampledAt: 1, acquiredAt: 1.2 });
    qb.readKeys([key]);
    expect(qb.estimate?.routeAnswer).toBe('away');
    qb.readKeys([{ ...key, age: .8 }]);
    expect(qb.estimate?.routeAnswer).toBe('away'); // Lost look is not a reversal cue, even before commitment.
    qb.acquire({ pos: { x: 44.1, y: FIELD_WIDTH / 2 }, vel: { x: 5, y: 0 }, facing: 0, sampledAt: 1.2, acquiredAt: 1.4 });
    qb.readKeys([key]);
    const expected = qb.predict(1.4, .8);
    qb.readKeys([{ ...key, pos: { x: 46, y: FIELD_WIDTH / 2 + 1 } }]);
    expect(qb.predict(1.4, .8)).toEqual(expected);
    expect(qb.estimate?.routeAnswer).toBe('away');
  });

  it('anticipates the selected answer without changing the common stem before the read', () => {
    const f = scene();
    const prior = installReceiverRoute({ x: 40, y: FIELD_WIDTH / 2 }, 40, 1, ROUTES.stick, 0, f.r.profile, f.r.r('routeRunning'));
    const base = new ReceiverForecast({}, prior, .05), away = new ReceiverForecast({}, prior, .05);
    const picture = { pos: { x: 42.5, y: FIELD_WIDTH / 2 }, vel: { x: 3, y: 0 }, facing: 0, sampledAt: 1, acquiredAt: 1 };
    base.acquire(picture); away.acquire(picture);
    away.readKeys([{ id: 'inside-key', pos: { x: 46, y: FIELD_WIDTH / 2 - 1 }, vel: { x: 0, y: 0 }, age: .2 }]);
    expect(away.estimate?.routeAnswer).toBe('away');
    expect(away.predict(1, .15)).toEqual(base.predict(1, .15));
    expect(away.predict(1, 1.8)!.y).toBeGreaterThan(base.predict(1, 1.8)!.y);
  });

  // #408 + #420: the QB times his release to the break of the route he
  // expects, through the shared stem to the read landmark and then the answer
  // he infers from his own key picture; never the base path for an option
  // route he reads differently, nor the receiver's private choice.
  it('times the break from the expected answer, not the base route', () => {
    const f = scene();
    const prior = installReceiverRoute({ x: 40, y: FIELD_WIDTH / 2 }, 40, 1, ROUTES.stick, 0, f.r.profile, f.r.r('routeRunning'));
    const base = new ReceiverForecast({}, prior, .05), away = new ReceiverForecast({}, prior, .05);
    const picture = { pos: { x: 42.5, y: FIELD_WIDTH / 2 }, vel: { x: 3, y: 0 }, facing: 0, sampledAt: 1, acquiredAt: 1 };
    base.acquire(picture); away.acquire(picture);
    away.readKeys([{ id: 'inside-key', pos: { x: 46, y: FIELD_WIDTH / 2 - 1 }, vel: { x: 0, y: 0 }, age: .2 }]);
    expect(base.estimate?.routeAnswer).toBe('base');
    expect(away.estimate?.routeAnswer).toBe('away');
    expect(base.hasBreak && away.hasBreak).toBe(true);
    const b = base.breakAt()!, w = away.breakAt()!;
    expect(b).toBeGreaterThan(1);
    expect(w).toBeGreaterThan(1);
    expect(w).not.toBe(b);
  });
});

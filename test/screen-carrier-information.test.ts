import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SCREEN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { BallCarrier, type CarrierDecisionRecord } from '../src/sim/behaviors/carrier.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

/** One decision, with no body integration or forced outcome. Every other
 * body's delivered image stays fixed unless the test explicitly changes it. */
function scene(side: number) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(41), 'Screen O', 'O', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'Screen D', 'D', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: side < 0,
      kind: 'pass', pass: SCREEN_BY_ID.tunnel_screen, label: 'screen carrier picture' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over 3' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 1007 });
  const runner = sim.slot('RB')!, blocker = sim.slot('LG')!, defender = sim.slot('LB_M')!;
  sim.t = 4;
  for (const a of sim.agents) { a.body.pos = { x: 100 + a.idx, y: 5 }; a.body.vel = { x: 0, y: 0 }; }
  runner.body.pos = { x: 45, y: CENTER_Y }; runner.body.vel = { x: 4, y: 0 };
  blocker.body.pos = { x: 46.6, y: CENTER_Y + side * .3 }; blocker.body.vel = { x: 0, y: side * .5 };
  defender.body.pos = { x: 49, y: CENTER_Y + side * 3 }; defender.body.vel = { x: -2, y: -side };
  const pictures = new Map<typeof runner, Perceived>(sim.agents.map(a => [a, { pos: { ...a.pos }, vel: { ...a.vel },
    facing: a.facing, pose: 'up', stance: null, age: .2 } satisfies Perceived]));
  vi.spyOn(sim, 'see').mockImplementation((_observer, target) => structuredClone(pictures.get(target)!));
  const records: CarrierDecisionRecord[] = [];
  vi.spyOn(sim, 'commandTraceFor').mockReturnValue({ carrier: (data: CarrierDecisionRecord) => records.push(data) } as never);
  const evaluate = () => {
    records.length = 0;
    const work = new BallCarrier({ screenCatch: true }, runner);
    const result = (work as unknown as { evaluate: (...args: unknown[]) => unknown }).evaluate(runner, sim, 1, false);
    const record = records.find(r => r.kind === 'evaluate');
    if (!record || record.kind !== 'evaluate') throw Error('Screen evaluation must assess routes');
    return { result, routes: structuredClone(record.routes) };
  };
  return { sim, runner, blocker, defender, pictures, evaluate };
}
afterEach(() => vi.restoreAllMocks());

describe('screen carrier forecasts use acquired motion and public capacity', () => {
  it.each([-1, 1])('does not query another player\'s private fatigue/endurance/squeeze, side %s', side => {
    const f = scene(side), others = f.sim.agents.filter(a => a !== f.runner);
    const reads = others.map(a => vi.spyOn(a, 'speedScale', 'get'));
    expect(f.evaluate().routes.length).toBeGreaterThan(0);
    for (const read of reads) expect(read).not.toHaveBeenCalled();
  });

  it.each([-1, 1])('hidden motion and effort do not change a held screen picture, side %s', side => {
    const f = scene(side), before = f.evaluate();
    for (const a of f.sim.agents) if (a !== f.runner) {
      a.body.pos = { x: 44, y: CENTER_Y - side * 8 }; a.body.vel = { x: 7, y: side * 6 };
      a.body.energy = .1; a.body.sprintLoad = 10; a.body.squeeze = 1;
    }
    expect(f.evaluate()).toEqual(before);
  });

  it.each([-1, 1])('new acquired defender motion and blocker pose still change route assessments, side %s', side => {
    const f = scene(side), before = f.evaluate();
    f.pictures.get(f.defender)!.vel = { x: 6, y: side * 4 };
    expect(f.evaluate().routes).not.toEqual(before.routes);
    const g = scene(side), upright = g.evaluate();
    g.pictures.get(g.blocker)!.pose = 'down';
    expect(g.evaluate().routes).not.toEqual(upright.routes);
  });

  it.each([-1, 1])('shoulder-turn request follows acquired pose, not hidden support, side %s', side => {
    const f = scene(side), work = new BallCarrier({ screenCatch: true }, f.runner);
    for (const [b, sign] of [[f.blocker, -side], [f.defender, side]] as const) {
      f.pictures.get(b)!.pos = { x: f.runner.pos.x + 1,
        y: f.runner.pos.y + sign * (b.profile.radius + f.runner.profile.radius * .85) };
    }
    const command = () => (work as unknown as { command: (...args: unknown[]) => { squeeze: number } })
      .command(f.runner, f.sim, 0, 5, .8);
    const upright = command();
    expect(upright.squeeze).toBeGreaterThan(0);
    f.blocker.body.support!.state = 'down';
    f.defender.body.support!.state = 'down';
    expect(command()).toEqual(upright);
    f.pictures.get(f.blocker)!.pose = 'down';
    expect(command().squeeze).toBe(0);
  });

  it.each([-1, 1])('screen threat forecast cannot read a staged recovery deadline, side %s', side => {
    const f = scene(side), before = f.evaluate();
    f.defender.downUntil = f.sim.t + 10;
    expect(f.evaluate()).toEqual(before);
    f.pictures.get(f.defender)!.pose = 'down';
    expect(f.evaluate().routes).not.toEqual(before.routes);
  });
});

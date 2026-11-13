import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { blockerWorkPoint, readBlockerWorkPicture } from '../src/sim/blocker-work-picture.js';
import { PlaySim } from '../src/sim/playsim.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Synthetic decision encounter with actual perception latency. The advancing
 * snapshot records changed reality; the blocker can still receive the older
 * picture. No native continuation or useful block is awarded by this fixture.
 */
function stage(work = true, known: boolean | undefined = true) {
  const sim = new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'work reference' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'Over' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  for (const b of sim.agents) {
    b.body.pos = { x: 80 + b.idx * 2, y: CENTER_Y };
    b.body.vel = { x: 0, y: 0 };
    if (b.team === 'O') b.behavior = { kind: 'fixture-unassigned', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  const a = sim.slot('C')!, qb = sim.slot('QB')!, rb = sim.slot('RB')!;
  a.body.pos = { x: 40, y: CENTER_Y };
  qb.body.pos = { x: 45, y: CENTER_Y + 4 };
  rb.body.pos = { x: 36, y: CENTER_Y };
  if (work) {
    sim.slot('DE_W')!.body.pos = { x: 41.8, y: CENTER_Y - 1.5 };
    sim.slot('DE_S')!.body.pos = { x: 41.8, y: CENTER_Y + 1.5 };
  }
  const controller = new RunBlocker({ kind: 'drive', target: null, drive: { x: 1, y: 0 } });
  a.behavior = controller;
  sim.t = 2;
  const record = () => sim.perception.record(sim.agents, known === undefined ? undefined : known ? qb.idx : null);
  for (let i = 0; i < 24; i++) record();
  return { sim, a, qb, rb, controller, record };
}

describe('free blocker work follows acquired possession rather than hidden reality', () => {
  it('keeps the same useful-side choice across hidden exchanges and advancing snapshots', () => {
    const run = (side: number) => {
      const f = stage();
      f.rb.body.pos = { x: 45, y: CENTER_Y + side * 5 };
      f.sim.ball = { kind: 'held', carrier: f.rb };
      f.sim.t += .05;
      f.sim.perception.record(f.sim.agents, f.rb.idx);
      expect(f.sim.see(f.a, f.qb).carrying).toBe(true);
      expect(f.sim.see(f.a, f.rb).carrying).toBe(false);
      const bodies = f.sim.agents.map(b => structuredClone(b.body)), rng = JSON.stringify(f.sim.rng);
      const command = f.controller.update(f.a, f.sim);
      expect(f.sim.agents.map(b => b.body)).toEqual(bodies);
      expect(JSON.stringify(f.sim.rng)).toBe(rng);
      expect(f.a.engagement).toBeNull();
      expect(f.sim.world.joints).toHaveLength(0);
      return { target: f.controller.target?.slot, command };
    };
    const left = run(-1), right = run(1);
    expect(left).toEqual(right);
    expect(left.target).toBe('DE_S');
  });

  it('responds to an acquired exchange toward the other useful-side threat', () => {
    const f = stage();
    f.rb.body.pos = { x: 45, y: CENTER_Y - 5 };
    f.sim.ball = { kind: 'held', carrier: f.rb };
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents, f.rb.idx);
    f.controller.update(f.a, f.sim);
    expect(f.controller.target).toBe(f.sim.slot('DE_W'));
  });

  it.each([undefined, false])('uses the installed work area when possession is %s', known => {
    // Avoid the fixture's default parameter when deliberately omitting possession.
    const f = stage(false, false);
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents, known === false ? null : undefined);
    f.rb.body.pos = { x: 10, y: CENTER_Y - 10 };
    f.sim.ball = { kind: 'held', carrier: f.rb };
    const reference = readBlockerWorkPicture(f.a, f.sim);
    expect(reference.source).toBe('installed');
    expect(reference.carrier).toBeNull();
    expect(blockerWorkPoint(reference, f.sim.t)).toEqual({ x: 40, y: CENTER_Y });
    expect(f.controller.update(f.a, f.sim).vel.x).toBeGreaterThan(0);
  });

  it('retains and advances the acquired picture only until the ordinary next read', () => {
    const f = stage(false);
    f.qb.body.pos = { x: 39, y: CENTER_Y };
    f.qb.body.vel = { x: 2, y: 0 };
    for (let i = 0; i < 24; i++) f.record();
    const spy = vi.spyOn(f.sim, 'see');
    const before = JSON.stringify(f.sim.rng);
    const first = f.controller.update(f.a, f.sim);
    const reads = () => spy.mock.calls.filter(([observer, target]) => observer === f.a && target.team === 'O').length;
    expect(reads()).toBe(f.sim.offense.length);
    // Repeated calls/recording do not acquire another picture or consume RNG.
    expect(f.controller.update(f.a, f.sim)).toEqual(first);
    expect(reads()).toBe(f.sim.offense.length);
    f.qb.body.pos.x = 25;
    f.qb.body.vel.x = 0;
    for (let i = 0; i < 24; i++) f.record();
    f.sim.t += f.a.mind.decisionInterval / 2;
    expect(f.controller.update(f.a, f.sim).vel.x).toBeGreaterThan(0);
    expect(reads()).toBe(f.sim.offense.length);
    f.sim.t += f.a.mind.decisionInterval;
    expect(f.controller.update(f.a, f.sim).vel.x).toBeLessThan(0);
    expect(reads()).toBe(2 * f.sim.offense.length);
    expect(JSON.stringify(f.sim.rng)).toBe(before);
    spy.mockRestore();
  });

  it('does not add observation age again or predict beyond the held decision beat', () => {
    const f = stage(false);
    f.qb.body.vel.x = 2;
    for (let i = 0; i < 24; i++) f.record();
    const reference = readBlockerWorkPicture(f.a, f.sim);
    expect(reference.source).toBe('acquired');
    expect(reference.pos.x).toBeCloseTo(45.1, 10);
    expect(blockerWorkPoint(reference, reference.at).x).toBe(reference.pos.x);
    expect(blockerWorkPoint(reference, reference.at + .05).x).toBeCloseTo(45.2, 10);
    expect(blockerWorkPoint(reference, reference.nextRead + 10))
      .toEqual(blockerWorkPoint(reference, reference.nextRead));
  });

  it('prefers dated positive evidence over an undated conflicting holder', () => {
    const f = stage(false), see = f.sim.see.bind(f.sim);
    const spy = vi.spyOn(f.sim, 'see').mockImplementation((a, b, delay) => {
      const picture = see(a, b, delay);
      if (b === f.qb) return { ...picture, carrying: true, age: undefined };
      if (b === f.rb) return { ...picture, carrying: true, age: .05 };
      return picture;
    });
    expect(readBlockerWorkPicture(f.a, f.sim).carrier).toBe(f.rb.idx);
    spy.mockRestore();
  });
});

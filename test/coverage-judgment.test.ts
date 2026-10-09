import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';
import { CoverageJudgment } from '../src/sim/coverage/judgment.js';
import { ReleaseReader, type ReceiverRead } from '../src/sim/coverage/reads.js';
import { showsBlock } from '../src/sim/coverage-cues.js';
import { Wall } from '../src/sim/coverage/techniques.js';

function setup() {
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'D'), 'nickel'), seed: 3,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50 });
  const a = sim.slot('FS')!, one = sim.slot('X')!, two = sim.slot('H')!;
  a.body.pos = { x: 52, y: 20 }; a.body.facing = Math.PI;
  one.body.pos = { x: 48, y: 20 }; one.body.vel = { x: 6, y: 0 };
  two.body.pos = { x: 50, y: 23 }; two.body.vel = { x: 6, y: 0 };
  for (const d of sim.defense) if (d !== a) d.body.pos = { x: 40, y: 40 };
  // Controlled visual samples isolate decisions; actual called routes remain
  // unrelated to these cues. No oracle targets/assignments enter the reader.
  vi.spyOn(sim, 'see').mockImplementation((_a, r) => ({ pos: { ...r.pos }, vel: { ...r.vel }, facing: r.facing, stance: r.stance, age: 0 }));
  return { sim, a, one, two };
}

describe('coverage judgment and continuous evidence', () => {
  it('keeps an uncapped primary vertical even when another receiver is farther downfield', () => {
    const { sim, a, one } = setup();
    const reader = new ReleaseReader(a, sim);
    for (const t of [0.1, 0.3]) { sim.t = t; for (const r of [one, sim.slot('H')!]) reader.read(sim, r); }
    const d = new CoverageJudgment().decide(a, sim, reader, { t: 'man', r: one, opts: { overTop: true } }, true);
    expect(d.t === 'man' && d.r).toBe(one);
  });

  it('can rescue an exposed vertical when the primary is visibly capped, and recover when that help leaves', () => {
    const { sim, a, one, two } = setup(), cap = sim.slot('CB_W')!;
    cap.body.pos = { x: one.pos.x + 2, y: one.pos.y }; cap.body.vel = { x: 5, y: 0 };
    const reader = new ReleaseReader(a, sim), mind = new CoverageJudgment();
    for (const t of [0.1, 0.3]) { sim.t = t; reader.read(sim, one); reader.read(sim, two); }
    const primary = { t: 'man' as const, r: one, opts: { overTop: true } };
    const rescue = mind.decide(a, sim, reader, primary, true);
    expect(rescue.t === 'man' && rescue.r).toBe(two);
    const held = sim.ball;
    sim.throwBall(sim.qb, one, { x: 20, y: 0, z: 4 }, { x: 50, y: 20, z: 2 }, 1);
    const duringFlight = mind.decide(a, sim, reader, primary, true);
    expect(duringFlight.t === 'man' && duringFlight.r).toBe(two);
    sim.ball = held;
    cap.body.pos.y += 10; sim.t += 1;
    const recover = mind.decide(a, sim, reader, primary, true);
    expect(recover.t === 'man' && recover.r).toBe(one);
  });

  it('requires continuous new evidence after a fake returns to the original stem', () => {
    const { sim, a, one } = setup();
    const reader = new ReleaseReader(a, sim);
    const observe = (t: number, vel: { x: number; y: number }) => { sim.t = t; one.body.vel = vel; return reader.read(sim, one)!.release; };
    observe(0.1, { x: 6, y: 0 });
    expect(observe(0.3, { x: 6, y: 0 })).toBe('vertical');
    observe(0.4, { x: 0, y: -5 });
    observe(0.45, { x: 6, y: 0 });
    expect(observe(0.7, { x: 0, y: -5 })).toBe('vertical');
    expect(observe(0.95, { x: 0, y: -5 })).toBe('out');
  });

  it('does not label a motionless delayed release as blocking just because time passed', () => {
    const { sim, a, one } = setup();
    one.body.pos = { x: 39, y: 10 }; one.body.vel = { x: 0, y: 0 };
    const reader = new ReleaseReader(a, sim);
    for (const t of [1, 3, 5]) { sim.t = t; expect(reader.read(sim, one)!.release).toBe('none'); }
    one.stance = 'low'; one.body.vel.x = 1;
    expect(showsBlock(a, sim, one)).toBe(true);
  });

  it('opens the hips to carry a closing seam without turning zone gaze into a backpedal cap', () => {
    const { sim, a, one } = setup();
    a.body.pos.x = one.pos.x + 1;
    one.body.vel.x = a.profile.vmax;
    const wall = new Wall(one, new ReleaseReader(a, sim), 'C', -1);
    a.recog!.read = 'pass';
    const cmd = wall.update(a, sim);
    expect(cmd.facing).toBeUndefined();
    expect(cmd.vel.x).toBeGreaterThan(a.profile.vmax * a.profile.backpedal);
  });
});

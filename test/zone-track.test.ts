import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { playSideSign } from '../src/sim/behaviors/blocking.js';
import { executeRunFit, pullers } from '../src/sim/run-fits.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });
const OL = ['LT', 'LG', 'C', 'RG', 'RT'];

function play(run: string, flip: boolean, until: number) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const line = OL.map((s) => sim.slot(s)!), start = new Map(line.map((a) => [a, { ...a.pos }]));
  const ps = playSideSign(sim, RUN_BY_ID[run]);
  let closest = Infinity;
  while (sim.t < until && sim.phase === 'live') {
    sim.tick();
    for (let i = 0; i < line.length; i++) for (let j = i + 1; j < line.length; j++)
      closest = Math.min(closest, Math.hypot(line[i].pos.x - line[j].pos.x, line[i].pos.y - line[j].pos.y)
        - (line[i].profile.radius + line[j].profile.radius));
  }
  const lateral = line.map((a) => (a.pos.y - start.get(a)!.y) * ps);
  return { sim, lateral, mean: lateral.reduce((p, q) => p + q, 0) / line.length, closest };
}

describe('a zone line runs its track together', () => {
  it('moves play side as a unit on wide zone, without linemen running into each other', () => {
    const r = play('wz_strong', false, 1);
    expect(r.mean).toBeGreaterThan(.4);
    expect(r.lateral.filter((y) => y > 0).length).toBeGreaterThanOrEqual(4);
    expect(r.closest).toBeGreaterThan(-.15);
  });

  it('moves play side on both flips of the formation', () => {
    // Native LT/RT are different bodies and the front aligns to strength, so a
    // flip is not an exact mirror (a head-up end can engage at the snap).
    for (const flip of [false, true]) expect(play('wz_strong', flip, 1).mean).toBeGreaterThan(.25);
  });

  it('leaves gap schemes to their own footwork', () => {
    // Power pulls and down-blocks: no lateral track for its line.
    expect(play('power', false, .6).mean).toBeLessThan(.25);
  });
});

describe('free run fits read pullers', () => {
  it.each([false, true])('flows a linebacker toward a guard he sees pulling, flip=%s', flip => {
    // Same staged counter, same bodies; only whether the backside guard is
    // seen pulling across behind the line differs.
    const stage = (pull: boolean) => {
      const formation = FORMATION_BY_ID.ace_11;
      const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
        offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.counter, label: 'Counter' },
        defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
        los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
      const g = sim.slot('LG')!, dir = sim.attackDir(g.team), across = -Math.sign(g.pos.y - CENTER_Y);
      if (pull) { g.body.pos = { x: g.pos.x - dir * 1.1, y: g.pos.y + across * 1.6 }; g.body.vel = { x: 0, y: across * 4 }; }
      sim.t = sim.world.time = .8;
      for (let k = 0; k < 30; k++) sim.perception.record(sim.agents);
      const lb = sim.defense.filter((d) => d.slot.startsWith('LB') && d.runFit && d.runFit.kind !== 'interior')
        .sort((p, q) => Math.abs(p.pos.y - g.pos.y) - Math.abs(q.pos.y - g.pos.y))[0];
      Object.defineProperty(lb.mind, 'placementError', { get: () => 0 });
      return { sim, lb, across, cmd: executeRunFit(lb, sim, lb.runFit!.gap, lb.runFit!.side) };
    };
    const still = stage(false), pulled = stage(true);
    expect(pullers(pulled.sim, pulled.lb)).toHaveLength(1);
    expect(pullers(still.sim, still.lb)).toHaveLength(0);
    expect(pulled.lb.tags.has('fit-pull-read')).toBe(true);
    expect(pulled.cmd.vel.y * pulled.across).toBeGreaterThan(still.cmd.vel.y * still.across);
  });
});

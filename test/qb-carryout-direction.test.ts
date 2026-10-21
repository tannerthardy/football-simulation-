import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { QBHandoff } from '../src/sim/behaviors/qb.js';
import { goTo } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(51), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(52), 'D', 'D', { strength: .55 });
function setup(run: string, flip = false) {
  const formation = FORMATION_BY_ID.i_pro_21;
  return new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Under' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
}

describe('QB handoff carry-out side from the installed play', () => {
  it.each([['power', false], ['power', true], ['iz_weak', false], ['iz_weak', true]] as const)(
    'carries away from %s after either exchange drift, flip=%s', (run, flip) => {
      const sim = setup(run, flip), qb = sim.qb;
      const side = RUN_BY_ID[run].direction === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
      const mesh = { x: sim.los - 4, y: CENTER_Y };
      const behavior = new QBHandoff(mesh, 1, sim.slot('RB')!);
      sim.ball = { kind: 'held', carrier: sim.slot('RB')! };
      for (const drift of [-.3, .3]) {
        qb.body.pos = { x: mesh.x, y: mesh.y + side * drift };
        const cmd = behavior.update(qb, sim);
        expect(cmd.vel.y * side).toBeLessThan(0);
        expect(cmd).toEqual(goTo(qb, { x: sim.los - 6, y: qb.pos.y - side * 4 }, { speed: .4 }));
      }
    });

  it('preserves the pre-exchange arrival and the no-installed-run fallback', () => {
    const sim = setup('power'), qb = sim.qb, rb = sim.slot('RB')!;
    const mesh = { x: sim.los - 4, y: CENTER_Y + 1 };
    const behavior = new QBHandoff(mesh, 1, rb);
    sim.t = .1; // Past the preserved initial pivot, before the give window.
    expect(behavior.update(qb, sim)).toEqual(goTo(qb, mesh, { speed: 1,
      facing: Math.atan2(mesh.y - qb.pos.y, mesh.x - qb.pos.x), through: 0 }));
    sim.ball = { kind: 'held', carrier: rb };
    sim.offCall = { ...sim.offCall, run: undefined };
    const away = qb.pos.y + Math.sign(qb.pos.y - mesh.y || 1) * 4;
    expect(behavior.update(qb, sim)).toEqual(goTo(qb, { x: sim.los - 6, y: away }, { speed: .4 }));
  });
});

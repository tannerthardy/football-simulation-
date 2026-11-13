import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { playSideSign, RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(71), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(72), 'D', 'D', { strength: .55 });

/** G1 P029 in miniature: just after the snap on inside zone from Gun Wing,
 * the inline Y, the wing H and the tackle each get a first-level block on an
 * end in front of them. Returns each blocker's first request. The tackle's
 * first step and zone track are his alone and do not change. */
function firstRequest(slot: 'Y' | 'H' | 'RT') {
  const sim = new PlaySim({ offense: pickOffense(offense, '12'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.gun_wing_12, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Inside zone' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 11 });
  const ps = playSideSign(sim, sim.offCall.run!), a = sim.slot(slot)!, end = sim.slot('DE_S')!;
  end.body.pos = { x: sim.los + 1.2, y: a.pos.y + ps * .8 };
  const behavior = new RunBlocker({ kind: 'reach', target: end, drive: { x: .86, y: ps * .5 } });
  a.behavior = behavior;
  sim.t = a.mind.snapDelay + .05; sim.world.time = sim.t;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { intent: behavior.update(a, sim), a, inline: !!sim.offAlign.spots[slot]?.inline };
}

describe('an inline end keeps the line\'s base into a block', () => {
  it('keeps his snap base like the tackle instead of rising into the end', () => {
    const { intent, inline } = firstRequest('Y');
    expect(inline).toBe(true);
    expect(intent.posture).toBe(.7);
  });

  it('leaves the tackle\'s first step as it was (control)', () => {
    const { intent, a } = firstRequest('RT');
    expect(intent.posture).toBe(.7);
    expect(intent.vel.x).toBeLessThan(a.profile.vmax * .5);
  });

  it('leaves a detached wing on his own approach (control)', () => {
    const { intent, a, inline } = firstRequest('H');
    expect(inline).toBe(false);
    expect(intent.posture).toBeUndefined();
    expect(intent.vel.x).toBeGreaterThan(a.profile.vmax * .5);
  });
});

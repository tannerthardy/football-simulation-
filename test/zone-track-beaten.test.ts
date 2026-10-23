import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { playSideSign, RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });

/** A free backside cutoff tackle on inside zone at 1 s, his end placed by
 * depth (yd behind the line, + = our backfield) and lateral offset (yd to
 * the backside, + = away from the play). Everyone else is out of the way. */
function scene(depth: number, backside: number) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: false, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'Inside zone' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 5 });
  const ps = playSideSign(sim, sim.offCall.run!), dir = sim.attackDir('O');
  for (const a of sim.agents) {
    a.body.pos = { x: 75 + (a.idx % 5) * 3, y: 3 + Math.floor(a.idx / 5) * 3 };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) };
  }
  sim.t = 1; sim.world.time = 1;
  const t = ps > 0 ? sim.slot('LT')! : sim.slot('RT')!, end = sim.slot('DE_W')!;
  t.body.pos = { x: 40 - dir * .9, y: CENTER_Y };
  end.body.pos = { x: 40 - dir * (.9 + depth), y: CENTER_Y - ps * backside };
  t.body.facing = dir > 0 ? 0 : Math.PI;
  const behavior = new RunBlocker({ kind: 'cutoff', target: end, drive: { x: dir * .86, y: ps * .5 } });
  t.behavior = behavior;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  return { intent: behavior.update(t, sim), t, end, ps, dir };
}

describe('a zone lineman whose man is already beaten backside and upfield', () => {
  it('stops running the track away from him and works to him', () => {
    const { intent, t, end } = scene(2, 3);
    const toEnd = { x: end.pos.x - t.pos.x, y: end.pos.y - t.pos.y };
    // Old request: playside track tempo plus a backpedal, opening away from the man.
    expect(intent.vel.x * toEnd.x + intent.vel.y * toEnd.y).toBeGreaterThan(0);
  });

  it('still runs the track when that man is in front of him (control)', () => {
    const { intent, ps, t } = scene(-1.8, 3);
    expect(intent.vel.y * ps).toBeGreaterThan(t.profile.vmax * .45 * .55 - 1e-9);
  });

  it('still races a man who got upfield inside him (control)', () => {
    const { intent, ps } = scene(2, -1.5);
    expect(intent.vel.y * ps).toBeGreaterThan(0);
  });
});

/**
 * Run-read attention: a defender who has read run sees men releasing away
 * from him late (his eyes are on the backfield and the blockers), but not a
 * blocker in front of him and in range, whatever that blocker's position.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

const formation = FORMATION_BY_ID.ace_11;
const offense = generateTeam(new Rng(31), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(32), 'D', 'D', { strength: .55 });

/** Corner at the origin of the scene facing the line (−x); Z placed at an
 * offset; the corner's read set as given. Returns how old his picture of Z is. */
function stage(offset: { x: number; y: number }, read: 'run' | 'pass') {
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.oz_strong, label: 'attention' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  const d = sim.slot('CB_S')!, z = sim.slot('Z')!;
  d.body.pos = { x: 46, y: CENTER_Y + 10 }; d.body.vel = { x: 0, y: 0 }; d.body.facing = Math.PI;
  z.body.pos = { x: 46 + offset.x, y: CENTER_Y + 10 + offset.y }; z.body.vel = { x: 0, y: 0 };
  d.recog = { ...d.recog!, read } as typeof d.recog;
  d.eyes = null;
  sim.t = 1; sim.world.time = 1;
  for (let i = 0; i < 24; i++) sim.perception.record(sim.agents);
  return { sim, d, z };
}
const ageOfZ = (offset: { x: number; y: number }, read: 'run' | 'pass') => {
  const { sim, d, z } = stage(offset, read);
  return sim.see(d, z).age!;
};

describe('run-read attention', () => {
  it('a blocker in front of him and in range is seen on the normal delay', () => {
    expect(ageOfZ({ x: -3, y: 0 }, 'run')).toBeCloseTo(ageOfZ({ x: -3, y: 0 }, 'pass'), 6);
    expect(ageOfZ({ x: -3, y: 2 }, 'run')).toBeCloseTo(ageOfZ({ x: -3, y: 2 }, 'pass'), 6);
  });

  it('a man behind him or out of range is seen late, as before', () => {
    // Behind (he faces the line, Z is deeper) and in range.
    expect(ageOfZ({ x: 3, y: 0 }, 'run')).toBeCloseTo(ageOfZ({ x: 3, y: 0 }, 'pass') + 0.15, 6);
    // In front, but well out of blocking range.
    expect(ageOfZ({ x: -12, y: 0 }, 'run')).toBeCloseTo(ageOfZ({ x: -12, y: 0 }, 'pass') + 0.15, 6);
  });

  it('where the blocker really is now does not choose his picture: only the recorded history does', () => {
    // History recorded with Z 5.2 yd in front (out of range); then only Z's live body moves across the
    // range (5.01 -> 4.99 yd) or the cone edge (cos .0999 -> .1001), with no record in between.
    const picture = (live: { x: number; y: number }) => {
      const { sim, d, z } = stage({ x: -5.2, y: 0 }, 'run');
      z.body.pos = { x: d.pos.x + live.x, y: d.pos.y + live.y };
      const seen = sim.see(d, z);
      return { age: seen.age, pos: seen.pos, stance: seen.stance };
    };
    const atCos = (cos: number) => ({ x: -3 * cos, y: 3 * Math.sqrt(1 - cos * cos) });
    expect(picture({ x: -4.99, y: 0 })).toEqual(picture({ x: -5.01, y: 0 }));
    expect(picture(atCos(.1001))).toEqual(picture(atCos(.0999)));
  });

});

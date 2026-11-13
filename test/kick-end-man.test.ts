import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { planRunBlocking, playSideSign } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(61), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(62), 'D', 'D', { strength: .55 });

/** Power's kick-out man is the end man on the line of scrimmage. Matched-restage
 * power/counter snaps called a corner pressed on a split receiver 8-9 yd out the
 * kick man when he stood inside the 9-yd down-defender window. */
function kickMan(cornerDepth: number) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'run', run: RUN_BY_ID.power, label: 'Power' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 9 });
  const ps = playSideSign(sim, sim.offCall.run!), dir = sim.attackDir('O');
  const rel = (y: number) => (y - CENTER_Y) * ps;
  const edge = Math.abs((ps === sim.offAlign.strongSign ? sim.offAlign.coreEdge.S : sim.offAlign.coreEdge.W) - CENTER_Y);
  const wr = sim.offense.filter(o => !sim.offAlign.spots[o.slot]?.inline && Math.abs(o.pos.x - sim.los) < 2 && rel(o.pos.y) > edge + 3)
    .sort((a, b) => rel(a.pos.y) - rel(b.pos.y))[0]!;
  wr.body.pos = { x: sim.los - dir * .6, y: CENTER_Y + ps * 8 };
  // Everyone else on defense off the line, then an end 1.5 yd outside the core and a corner over the receiver.
  for (const d of sim.defense) d.body.pos = { x: sim.los + dir * 5, y: d.pos.y };
  const end = sim.slot('DE_S')!, corner = sim.defense.find(d => d.slot.startsWith('CB') && rel(d.pos.y) > 0) ?? sim.slot('CB_S')!;
  end.body.pos = { x: sim.los + dir * .9, y: CENTER_Y + ps * (edge + 1.5) };
  corner.body.pos = { x: sim.los + dir * cornerDepth, y: CENTER_Y + ps * 8.1 };
  const plans = planRunBlocking(sim, sim.offCall.run!);
  const kick = [...plans.entries()].find(([, p]) => p.kind === 'pull' && p.pullRole === 'kick')!;
  return { kick: kick[1].target, end, corner };
}

describe('the power kick-out man is the end man on the line', () => {
  it('a corner standing off the ball over a split receiver is not the kick man', () => {
    const { kick, end } = kickMan(1.3);
    expect(kick).toBe(end);
  });
  it('a defender on the ball outside the end is', () => {
    const { kick, corner } = kickMan(.9);
    expect(kick).toBe(corner);
  });
});

/** FORCE_BOUNCE (run-fits.ts executeRunFit, force fit): before the runner
 * declares, the force keeps outside the seen bodies at the point of attack (a
 * kick-out and the end it meets, not only the offensive surface) by the ground
 * the runner covers at full speed in the force's reaction time. Off: the
 * installed boundary, the offensive line and inline ends as seen (a pulling
 * guard counts, the man he kicks does not). */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Engagement } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'O', 'O', { strength: .55 });
const defense = generateTeam(new Rng(42), 'D', 'D', { strength: .55 });

/** Before the handoff: the guard has kicked out to meet the end 1.5–2.3 yd
 * outside the tight end; everyone else is home and still. */
function stage(side: number, kickout = true) {
  const sim = new PlaySim({ offense: pickOffense(offense, '12'), defense: pickDefense(defense, 'base43'),
    offCall: { formation: FORMATION_BY_ID.ace_12, flip: side < 0, kind: 'run', run: RUN_BY_ID.power, label: 'Kick-out' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3 });
  sim.t = 1.2;
  const a = sim.slot('SS')!, end = side > 0 ? sim.slot('DE_S')! : sim.slot('DE_W')!, guard = sim.slot('LG')!;
  a.runFit = { gap: 'D', side, kind: 'force', technique: 'attack', edge: 'box', pace: 'stack' };
  a.body.pos = { x: 45, y: CENTER_Y + side * 9 };
  Object.defineProperty(a.mind, 'placementError', { get: () => 0 });
  const inline = sim.offense.filter(o => ['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) || sim.offAlign.spots[o.slot]?.inline);
  const surface = Math.max(...inline.map(o => side * sim.offAlign.spots[o.slot].pos.y + o.profile.radius));
  const spot = (o: typeof a) => o.team === a.team ? sim.defAlign.spots[o.slot as keyof typeof sim.defAlign.spots]!.pos : sim.offAlign.spots[o.slot].pos;
  const picture = new Map(sim.agents.map(o => {
    const pos = { ...spot(o) }, vel = { x: 0, y: 0 };
    if (kickout && o === guard) { pos.x = 39.7; pos.y = side * (surface + 1.5); vel.y = side * 2; }
    if (kickout && o === end) { pos.x = 40.3; pos.y = side * (surface + 2.3); }
    return [o, { pos, vel, age: .2, carrying: o === sim.qb ? true : null, stance: null, facing: 0, pose: 'up' } as Perceived] as const;
  }));
  if (kickout) end.engagement = { blocker: guard, defender: end, helpers: [], start: 1, type: 'run', win: .2, control: 0, phi: 0, side,
    baseB: 1, baseD: 1 } as unknown as Engagement;
  sim.see = (_observer, target) => picture.get(target)!;
  const margin = a.profile.reactionTime * sim.slot('RB')!.profile.vmax;
  return { sim, a, side, margin, guardOuter: side * (surface + 1.5 + guard.profile.radius), endOuter: side * (surface + 2.3 + end.profile.radius) };
}
async function aimY(enabled: boolean, side: number, kickout = true) {
  vi.stubEnv('FORCE_BOUNCE', enabled ? '1' : '0');
  vi.resetModules();
  const { executeRunFit } = await import('../src/sim/run-fits.js');
  const { movementObjective } = await import('../src/sim/movement-objective.js');
  const f = stage(side, kickout);
  return { y: movementObjective(executeRunFit(f.a, f.sim, 'D', side))!.point.y, ...f };
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('the force keeps outside the point of attack', () => {
  it.each([-1, 1])('off: half a yard outside the pulling guard, inside the end he kicks, side=%s', async side => {
    const r = await aimY(false, side);
    expect(r.y).toBeCloseTo(r.guardOuter + side * .5, 6);
    expect(side * (r.endOuter - r.y)).toBeGreaterThan(0);
  });
  it.each([-1, 1])('on: outside the kicked end by his reaction margin, side=%s', async side => {
    const r = await aimY(true, side);
    expect(r.y).toBeCloseTo(r.endOuter + side * (.5 + r.margin), 6);
  });
  it('on: with nobody at the point of attack the margin is kept outside the surface', async () => {
    const on = await aimY(true, 1, false), off = await aimY(false, 1, false);
    expect(on.y).toBeCloseTo(off.y + on.margin, 9);
  });
});

/** Acquired moving-blocker pictures through the actual possession controller.
 * These held-body scenes test a route assessment, not a prescribed run ending.
 * The runner keeps ordinary momentum and all production movement modifiers.
 */
import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { BallCarrier } from '../src/sim/behaviors/carrier.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { runReadObservers } from '../src/sim/run-read-observer.js';

const offense = generateTeam(new Rng(31), 'Moving-block offense', 'MO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Moving-block defense', 'MD', { strength: .55 });
const LOS = 40;
type Measurement = { entry: { x: number; y: number }; risk: number; score: number };

function scene(side: -1 | 1, transverseVelocity: number, blockerOffset = .95) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'moving-block picture' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over Cover 3' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5, record: false });
  // Other bodies remain in the picture, outside the local route comparison.
  for (const a of sim.agents) {
    a.body.pos = { x: 80 + a.idx, y: 2 };
    a.body.vel = { x: 0, y: 0 };
  }
  for (const [slot, y] of [['C', -4], ['LG', -2], ['RG', blockerOffset], ['LT', 3], ['RT', 5]] as const) {
    sim.slot(slot)!.body.pos = { x: LOS - .5, y: CENTER_Y + side * y };
  }
  const back = sim.slot('RB')!, blocker = sim.slot('RG')!;
  back.body.pos = { x: LOS - 1.6, y: CENTER_Y };
  back.body.vel = { x: 3, y: 0 };
  back.body.facing = 0;
  blocker.body.vel = { x: 0, y: side * transverseVelocity };
  const pictures = new Map(sim.agents.map(a => [a, {
    pos: { ...a.pos }, vel: { ...a.vel }, stance: null, facing: a.facing, pose: 'up', age: .05,
  } satisfies Perceived]));
  // Fixed legitimate observations: later private-body changes are unavailable.
  sim.see = (_observer, target) => structuredClone(pictures.get(target)!);
  sim.ball = { kind: 'held', carrier: back } as never;
  const opts = () => ({ aim: { x: LOS + .6, y: CENTER_Y }, aimUntil: 10,
    run: { scheme: 'insideZone' as const, side } });
  function choose() {
    let candidates: Measurement[] = [], selected: { x: number; y: number } | null = null;
    runReadObservers.set(sim, event => {
      if (event.phase !== 'aim') return;
      candidates = event.candidates as Measurement[];
      selected = event.selected as { x: number; y: number };
    });
    const command = new BallCarrier(opts(), back).update(back, sim);
    const direct = candidates.find(c => Math.abs(c.entry.x - (LOS + .5)) < 1e-8
      && Math.abs(c.entry.y - CENTER_Y) < 1e-8)!;
    expect(direct).toBeDefined();
    expect(selected).not.toBeNull();
    return { command, direct, selected, candidates };
  }
  return { sim, back, blocker, pictures, choose };
}

describe('moving teammates in the production crease assessment', () => {
  it.each([-1, 1] as const)('distinguishes a blocker entering the route from one clearing it, mirror %s', side => {
    const entering = scene(side, -2).choose(), clearing = scene(side, 2).choose();
    // Identical positions and runner momentum; only acquired peer velocity differs.
    // The current straight route is statically open in both pictures. The
    // transverse block reaches it while the ordinary moving back approaches.
    expect(entering.direct.risk).toBeGreaterThan(clearing.direct.risk + .5);
    expect(clearing.direct.risk).toBe(0);
    expect(entering.command.vel.x).toBeGreaterThan(0);
    expect(clearing.command.vel.x).toBeGreaterThan(0);
    expect(Math.hypot(entering.command.vel.x - clearing.command.vel.x,
      entering.command.vel.y - clearing.command.vel.y)).toBeGreaterThan(.3);
    // Demand a response to the moving obstacle, without prescribing an inside cut.
    expect(Math.abs(entering.command.vel.y)).toBeGreaterThan(Math.abs(clearing.command.vel.y));
  });

  it.each([-1, 1] as const)('retains genuine static obstruction and a clear opposing route, mirror %s', side => {
    const obstructed = scene(side, 0, 0).choose(), clear = scene(side, 0).choose();
    expect(obstructed.direct.risk).toBeGreaterThan(1.5);
    expect(clear.direct.risk).toBe(0);
    expect(Math.abs(obstructed.command.vel.y)).toBeGreaterThan(.3);
    expect(Math.abs(clear.command.vel.y)).toBeLessThan(.1);
  });

  it.each([-1, 1] as const)('uses the acquired motion despite private body and engagement changes, mirror %s', side => {
    const s = scene(side, -2), before = s.choose();
    const end = s.sim.slot('DE_S')!;
    // Create an unobserved connection and motion after saving the picture.
    end.body.pos = { x: s.blocker.pos.x + .8, y: s.blocker.pos.y };
    const engagement = s.sim.engage(s.blocker, end, 'run');
    expect(engagement).toBeTruthy();
    engagement!.win = .99;
    s.blocker.body.vel = { x: -4, y: side * 5 };
    s.blocker.body.pos = { x: LOS + 5, y: CENTER_Y - side * 4 };
    const after = s.choose();
    expect(after.direct).toEqual(before.direct);
    expect(after.selected).toEqual(before.selected);
    expect(after.command).toEqual(before.command);
  });
});

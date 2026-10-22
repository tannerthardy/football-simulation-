/**
 * G3 man deep: an off man defender keeps the cushion he chose with the body he
 * has. Without it, he asked for less than the receiver's speed while he was
 * still deeper than his aim point, let the stem eat the cushion, and was left
 * turning and accelerating from about 2 yd/s with the receiver at 6: tracked
 * deep man defenders are level at the throw; the sim's trailed by 1.3 yd.
 * Without deep responsibility he keeps a level margin, not a roof, so a hitch
 * gets the room an off corner gives and he still drives on the plant. Press
 * technique plays under the receiver by design and is unchanged.
 */
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage } from '../src/sim/behaviors/defense.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'Man offense', 'MNO', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Man defense', 'MND', { strength: .55 });

/** Cover 1; the strong corner plays the outside receiver from 7 yd off. On
 * four verticals: his depth over the receiver and both speeds when the
 * receiver first reaches 6 and 12 yd past the line. */
function rep(manRole: boolean, press = false) {
  return run(manRole, press, 'four_verts').at;
}

/** The same corner against all hitches: his distance from the receiver at
 * the plant and 0.5 s later. */
function hitch(manRole: boolean) {
  return run(manRole, false, 'hitches').plant!;
}

function run(manRole: boolean, press: boolean, concept: string) {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 'go' },
    los: 40, ballY: 26, firstDownX: 50, seed: 11 });
  sim.throwBall = () => undefined;
  const a = sim.slot('CB_S')!, r = sim.slot(sim.offAlign.numbering.S1!)!;
  a.body.pos = { x: r.pos.x + (press ? 1 : 7), y: r.pos.y - .7 };
  a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI;
  a.behavior = new ManCoverage(a, sim, r, press, 'B', 1, { lev: 'outside', manRole, initialPosition: { ...r.pos } });
  const at: Record<number, { over: number; speed: number; wr: number }> = {};
  let plant: { t: number; gap: number; after?: number } | null = null;
  const gap = () => Math.hypot(a.pos.x - r.pos.x, a.pos.y - r.pos.y);
  const step = sim as unknown as { tick(): void };
  while (sim.phase === 'live' && sim.t < 4 && !at[12] && plant?.after === undefined) {
    step.tick();
    for (const depth of [6, 12]) if (!at[depth] && r.pos.x - sim.los >= depth)
      at[depth] = { over: a.pos.x - r.pos.x, speed: Math.hypot(a.vel.x, a.vel.y), wr: Math.hypot(r.vel.x, r.vel.y) };
    if (!plant && r.pos.x - sim.los > 3 && Math.hypot(r.vel.x, r.vel.y) < 1.5) plant = { t: sim.t, gap: gap() };
    else if (plant && sim.t >= plant.t + .5) plant.after = gap();
  }
  return { at, plant };
}

describe('an off man defender keeps his cushion with the body he has', () => {
  it('opens and runs before the go eats the cushion, so he is not left trailing at 12 yd', () => {
    const before = rep(false), after = rep(true);
    expect(before[12] && after[12]).toBeTruthy();
    // He is moving faster when the receiver reaches 6 yd, and not behind him at 12.
    expect(after[6].speed).toBeGreaterThan(before[6].speed + 0.5);
    expect(after[12].over).toBeGreaterThan(before[12].over + 0.5);
    expect(after[12].over).toBeGreaterThan(-0.3);
  });

  it('against a hitch he gives the room an off corner gives, and drives on the plant', () => {
    const before = hitch(false), after = hitch(true);
    // Squatting at 1.6 yd on a hitch from a 7 yd cushion was the old error.
    expect(after.gap).toBeGreaterThan(before.gap);
    expect(after.gap).toBeLessThan(3.5);
    expect(after.after!).toBeLessThan(after.gap);
  });

  it('press technique is unchanged', () => {
    expect(rep(true, true)).toEqual(rep(false, true));
  });
});

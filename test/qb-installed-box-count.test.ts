import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;

const offense = generateTeam(new Rng(31), 'Box offense', 'BOXO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Box defense', 'BOXD', { strength: .55 });
afterEach(() => vi.restoreAllMocks());
function fixture(form: string, box: number, flip = false) {
  const formation = FORMATION_BY_ID[form];
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID.iz_strong, label: 'installed box count' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'box' },
    los: 40, ballY: 26.67, firstDownX: 50, seed: 77, audibles: false });
  // Isolate the existing number check from authority, alignment noise and
  // coverage uncertainty. No new controller perception or World steps.
  const authority = vi.spyOn(sim.rng, 'chance').mockReturnValue(true);
  const noise = vi.spyOn(sim.rng, 'normal').mockReturnValue(0);
  vi.spyOn(sim.qbMind, 'pSingleHigh').mockReturnValue(.8);
  sim.defense.forEach((d, i) => { d.body.pos = i < box
    ? { x: sim.los + 1, y: sim.ballY + i - (box - 1) / 2 }
    : { x: sim.los + 10, y: sim.ballY + 15 }; });
  return { sim, authority, noise };
}
function check(f: ReturnType<typeof fixture>) {
  const result = f.sim.qbMind.preSnapCheck(f.sim.offCall, { hurry: false, down: 1, distance: 10 });
  expect(f.authority).toHaveBeenCalledTimes(1);
  expect(f.noise).toHaveBeenCalledTimes(f.sim.defense.length * 2);
  expect(f.sim.t).toBe(0);
  return result;
}

describe('pre-snap numbers include installed fullback work once', () => {
  it.each([false, true])('centered F preserves the nine-versus-seven run, flip=%s', flip => {
    const f = fixture('i_pro_21', 9, flip), fullback = f.sim.slot('F')!;
    expect(f.sim.offAlign.spots.F?.backfield).toBe(true);
    expect(f.sim.offAlign.spots.F!.pos.y).toBe(f.sim.ballY);
    expect(fullback.behavior).toBeInstanceOf(RunBlocker);
    expect((fullback.behavior as RunBlocker).plan.kind).toBe('lead');
    expect(check(f)).toBe(f.sim.offCall);
    expect(f.sim.qbMind.report.audible).toBeUndefined();
  });

  it.each([false, true])('offset F also contributes one installed blocker, flip=%s', flip => {
    const f = fixture('offset_i_21', 9, flip);
    expect(f.sim.offAlign.spots.F?.backfield).toBe(true);
    expect(f.sim.offAlign.spots.F!.pos.y).not.toBe(f.sim.ballY);
    expect(check(f)).toBe(f.sim.offCall);
  });

  it('still checks out against a genuine ten-versus-seven overload, without double-counting centered F', () => {
    const f = fixture('i_pro_21', 10);
    expect(check(f).kind).toBe('pass');
    expect(f.sim.qbMind.report.audible).toMatch(/^check to /);
  });

  it('retains the nine-versus-six singleback overload control', () => {
    const f = fixture('ace_11', 9);
    expect(f.sim.slot('F')).toBeUndefined();
    expect(check(f).kind).toBe('pass');
    expect(f.sim.qbMind.report.audible).toMatch(/^check to /);
  });

  it.each([false, true])('credits the offset lead on his installed side while a centered lead can still flip, flip=%s', flip => {
    const offset = fixture('offset_i_21', 7, flip), center = fixture('i_pro_21', 7, flip);
    for (const f of [offset, center]) {
      const sign = f.sim.offAlign.strongSign;
      // Five on the called side, two opposite. Offset F adds a whole hat on
      // that side; centered F adds half on each under the same existing rule.
      f.sim.defense.forEach((d, i) => { d.body.pos = i < 7
        ? { x: f.sim.los + 1, y: f.sim.ballY + sign * (i < 5 ? .7 + i * .6 : -.7 - (i - 5) * .6) }
        : { x: f.sim.los + 10, y: f.sim.ballY + 15 }; });
    }
    expect(check(offset)).toBe(offset.sim.offCall);
    expect(check(center).run?.direction).toBe('weak');
    expect(center.sim.qbMind.report.audible).toBe('flip run');
  });
});

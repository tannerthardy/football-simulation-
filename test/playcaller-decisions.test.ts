import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { chooseFourthDown, chooseTry } from '../src/game/playcaller.js';

const fourth = { distance: 1, yardline: 62, quarter: 4, clock: 7, scoreDiff: 0 };
const options = { fieldGoalRange: 58, aggression: .5 };

describe('fourth-down scoring opportunity', () => {
  // nflverse REG PBP: 2023_16_NE_DEN / 4263, tied, Q4 0:07, fourth-and-one
  // at DEN38. NE kicked a 56-yard FG. Our +17 geometry requests 55 yards;
  // the existing game's <=6-second override does not cover this scene.
  it('takes the available winning kick rather than another short-yardage snap', () => {
    expect(chooseFourthDown(fourth, options)).toBe('fg');
  });

  it('keeps the short-yardage attempt when there is a full quarter to play', () => {
    expect(chooseFourthDown({ ...fourth, clock: 900 }, options)).toBe('go');
  });

  it.each([-1, -2, -3])('takes the late kick to lead or tie when down %i', (scoreDiff) => {
    expect(chooseFourthDown({ ...fourth, scoreDiff }, options)).toBe('fg');
  });

  it.each([-4, -8, -9])('seeks a touchdown when three points cannot erase a %i margin', (scoreDiff) => {
    expect(chooseFourthDown({ ...fourth, distance: 10, yardline: 80, scoreDiff }, options)).toBe('go');
  });

  it('does not invent kicker range or treat the terminal override as a universal kick', () => {
    expect(chooseFourthDown(fourth, { ...options, fieldGoalRange: 54 })).toBe('go');
  });

  it('does not make the third quarter a terminal scoring situation', () => {
    expect(chooseFourthDown({ ...fourth, quarter: 3 }, options)).toBe('go');
  });

  it('leaves overtime to its existing policy rather than assuming regulation win conditions', () => {
    expect(chooseFourthDown({ ...fourth, quarter: 5 }, options)).toBe('go');
  });
});

describe('ordinary fourth-down policy stays bounded to the existing state inputs', () => {
  it.each([
    { yardline: 20, distance: 1, expected: 'punt' },
    { yardline: 45, distance: 1, expected: 'go' },
    { yardline: 45, distance: 8, expected: 'punt' },
    { yardline: 80, distance: 8, expected: 'fg' },
    { yardline: 99, distance: 1, expected: 'go' },
  ])('at own-goal distance $yardline with $distance to gain: $expected', ({ yardline, distance, expected }) => {
    expect(chooseFourthDown({ ...fourth, quarter: 2, clock: 600, yardline, distance }, options)).toBe(expected);
  });

  it('considers the available kicker rather than always attempting a long kick', () => {
    const s = { ...fourth, quarter: 2, clock: 600, distance: 3 };
    expect(chooseFourthDown(s, { ...options, fieldGoalRange: 54 })).toBe('go');
    expect(chooseFourthDown(s, { ...options, fieldGoalRange: 58 })).toBe('fg');
  });

  it('retains coach risk preference at a marginal short-yardage opportunity', () => {
    const s = { ...fourth, clock: 600, distance: 2, yardline: 45 };
    expect(chooseFourthDown(s, { ...options, aggression: .25 })).toBe('punt');
    expect(chooseFourthDown(s, { ...options, aggression: 1 })).toBe('go');
  });
});

describe('Try score arithmetic', () => {
  it.each([
    // NFL examples: 2022_11_DET_NYG / 4048 and 2022_06_MIN_MIA / 3672.
    { scoreDiff: -13 },
    { scoreDiff: 12 },
  ])('recognizes the two-point opportunity at margin $scoreDiff after six points', ({ scoreDiff }) => {
    expect(chooseTry({ quarter: 4, clock: 180, scoreDiff }, .5, new Rng(0))).toBe('two');
  });

  it('keeps the opposing earlier-period discretionary choice and its RNG sequence', () => {
    const rng = new Rng(0), control = new Rng(0);
    const expected = control.chance(.11) ? 'two' : 'kick';
    expect(chooseTry({ quarter: 3, clock: 180, scoreDiff: 12 }, .5, rng)).toBe(expected);
    expect(rng.nextU32()).toBe(control.nextU32());
  });

  it.each([-12, -10, -9, -5, -2, 1, 5])('preserves the existing late-game chart at margin %i', (scoreDiff) => {
    expect(chooseTry({ quarter: 4, clock: 180, scoreDiff }, .5, new Rng(0))).toBe('two');
  });

  it('takes the winning single point with regulation over, regardless of the discretionary draw', () => {
    for (let seed = 0; seed < 32; seed++) {
      const rng = new Rng(seed), untouched = new Rng(seed);
      expect(chooseTry({ quarter: 4, clock: 0, scoreDiff: 0 }, 1, rng)).toBe('kick');
      expect(rng.nextU32()).toBe(untouched.nextU32());
    }
  });

  it('still needs two points to tie a two-point deficit with regulation over', () => {
    expect(chooseTry({ quarter: 4, clock: 0, scoreDiff: -2 }, .5, new Rng(0))).toBe('two');
  });

  it('does not assume that a tied overtime period ending has the same Try objective', () => {
    const rng = new Rng(0), control = new Rng(0);
    const expected = control.chance(.11) ? 'two' : 'kick';
    expect(chooseTry({ quarter: 5, clock: 0, scoreDiff: 0 }, .5, rng)).toBe(expected);
    expect(rng.nextU32()).toBe(control.nextU32());
  });
});

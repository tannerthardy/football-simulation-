import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { OffensiveCoordinator, type Situation } from '../src/game/playcaller.js';
import { generateTeam } from '../src/league/team.js';

describe('run-only evaluation harness', () => {
  const rng = new Rng(11);
  const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
  const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
  const long: Situation = { down: 3, distance: 15, yardline: 30, quarter: 4, clock: 90, scoreDiff: -10, ballY: CENTER_Y, hurry: true };

  it('calls only designed runs, even on obvious passing downs', () => {
    const oc = new OffensiveCoordinator(off, new Rng(3), true);
    const calls = Array.from({ length: 120 }, () => oc.call(long, def));
    expect(calls.every((c) => c.kind === 'run')).toBe(true);
    expect(new Set(calls.map((c) => c.run!.scheme)).size).toBeGreaterThan(1);
  });

  it('leaves the normal call mix alone when unset', () => {
    const oc = new OffensiveCoordinator(off, new Rng(3));
    const calls = Array.from({ length: 120 }, () => oc.call(long, def));
    expect(calls.some((c) => c.kind === 'pass')).toBe(true);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { kickFieldGoal, type PlaceKickOptions } from '../src/game/specialteams.js';
import { generateTeam, specialist } from '../src/league/team.js';

const starter = specialist(generateTeam(new Rng(7), 'Kick control', 'KCK', { strength: .55 }), 'K');
const kicker = (ratings: Partial<typeof starter.ratings> = {}) => ({ ...starter,
  ratings: { ...starter.ratings, kickPower: 75, kickAccuracy: 75, composure: 75, ...ratings } });

/** Deterministic centered strike; preserve the production flight and posts. */
function centered(player = kicker(), distance = 33, wind = { x: 0, y: 0 }, options: PlaceKickOptions = {}) {
  const rng = new Rng('C1-centered');
  const block = vi.spyOn(rng, 'chance').mockReturnValue(false);
  const normal = vi.spyOn(rng, 'normal').mockImplementation(mean => mean);
  return { result: kickFieldGoal(rng, player, distance, wind, 0, options), block, normal };
}

function yawSpread(player: ReturnType<typeof kicker>, distance: number, pressure = 0) {
  const rng = new Rng('C1-dispersion');
  vi.spyOn(rng, 'chance').mockReturnValue(false);
  const draws: { mean: number; sd: number }[] = [];
  vi.spyOn(rng, 'normal').mockImplementation((mean, sd) => { draws.push({ mean, sd }); return mean; });
  kickFieldGoal(rng, player, distance, undefined, pressure);
  return draws.at(-1)!.sd;
}

describe('place-kick execution by distance and operation', () => {
  it('the reduced block risk grows with distance and is separate from strike ratings', () => {
    const short = centered(kicker(), 33), long = centered(kicker(), 55);
    expect(short.block.mock.calls[0]![0]).toBeLessThan(long.block.mock.calls[0]![0]);
    expect(centered(kicker({ kickAccuracy: 99, kickPower: 99 }), 33).block.mock.calls[0])
      .toEqual(short.block.mock.calls[0]);
  });

  it('ordinary make frequency decreases across distance with matched kick draws', () => {
    const made = [20, 33, 45, 52, 58].map(distance => {
      let total = 0;
      for (let seed = 0; seed < 1000; seed++)
        total += Number(kickFieldGoal(new Rng(`C1-distance-${seed}`), kicker(), distance).good);
      return total;
    });
    for (let i = 1; i < made.length; i++) expect(made[i]).toBeLessThan(made[i - 1]!);
  });

  it('a longer demand on the same leg increases directional scatter', () => {
    expect(yawSpread(kicker(), 55)).toBeGreaterThan(yawSpread(kicker(), 33));
  });

  it('greater leg capacity reduces long-kick scatter without changing accuracy', () => {
    expect(yawSpread(kicker({ kickPower: 95 }), 55))
      .toBeLessThan(yawSpread(kicker({ kickPower: 55 }), 55));
  });

  it('better accuracy reduces scatter at the same range demand', () => {
    expect(yawSpread(kicker({ kickAccuracy: 95 }), 45))
      .toBeLessThan(yawSpread(kicker({ kickAccuracy: 55 }), 45));
  });

  it('composure affects the supplied pressure response, not a calm strike', () => {
    const calm = kicker({ composure: 95 }), rattled = kicker({ composure: 20 });
    expect(yawSpread(calm, 45)).toBe(yawSpread(rattled, 45));
    expect(yawSpread(calm, 45, 1)).toBeLessThan(yawSpread(rattled, 45, 1));
  });

  it('a centered ordinary extra point and short FG remain physically makeable', () => {
    expect(centered().result).toMatchObject({ good: true, blocked: false, distance: 33 });
    expect(centered(kicker(), 20).result.good).toBe(true);
  });

  it('leg power changes the reachable flight, without awarding a make', () => {
    expect(centered(kicker({ kickPower: 1 }), 60).result).toMatchObject({ good: false, miss: 'short' });
    expect(centered(kicker({ kickPower: 99 }), 60).result.good).toBe(true);
  });

  it('headwind removes a reachable long kick and tailwind can preserve it', () => {
    expect(centered(kicker({ kickPower: 99 }), 60, { x: -15, y: 0 }).result)
      .toMatchObject({ good: false, miss: 'short' });
    expect(centered(kicker({ kickPower: 99 }), 60, { x: 10, y: 0 }).result.good).toBe(true);
  });

  it('opposite crosswinds move a centered strike outside opposite uprights', () => {
    expect(centered(kicker(), 50, { x: 0, y: 20 }).result).toMatchObject({ good: false, miss: 'left' });
    expect(centered(kicker(), 50, { x: 0, y: -20 }).result).toMatchObject({ good: false, miss: 'right' });
  });

  it('a supplied operation strike error changes the flight rather than rolling a miss', () => {
    expect(centered(kicker(), 33, undefined, { operation: { yawErrorDeg: 10 } }).result)
      .toMatchObject({ good: false, blocked: false, miss: 'left' });
    expect(centered(kicker(), 33, undefined, { operation: { yawErrorDeg: -10 } }).result)
      .toMatchObject({ good: false, blocked: false, miss: 'right' });
    expect(centered(kicker(), 33, undefined, { operation: { elevationErrorDeg: -40 } }).result)
      .toMatchObject({ good: false, blocked: false, miss: 'short' });
  });

  it.each([{ snapControlled: false }, { holdSet: false }])('an unready operation is not an attempted FG: %j', operation => {
    const rng = new Rng('C1-failed-operation'), untouched = new Rng('C1-failed-operation');
    expect(() => kickFieldGoal(rng, kicker(), 33, undefined, 0, { operation })).toThrow('No place-kick attempt');
    expect(rng.nextU32()).toBe(untouched.nextU32());
  });

  it('explicit nominal operation preserves the result and complete RNG state', () => {
    const a = new Rng('C1-operation'), b = new Rng('C1-operation');
    const ordinary = kickFieldGoal(a, kicker(), 45);
    expect(kickFieldGoal(b, kicker(), 45, undefined, 0, { operation: {
      snapControlled: true, holdSet: true, yawErrorDeg: 0, elevationErrorDeg: 0,
    } })).toEqual(ordinary);
    expect({ ...b }).toEqual({ ...a });
  });

  it('a fair-catch place kick needs a set ball but no snap or sampled scrimmage rush', () => {
    const kick = centered(kicker(), 33, undefined, { fairCatchKick: true, operation: { snapControlled: false, holdSet: true } });
    expect(kick.result.good).toBe(true);
    expect(kick.block).not.toHaveBeenCalled();
    expect(() => centered(kicker(), 33, undefined, { fairCatchKick: true, operation: { holdSet: false } }))
      .toThrow('No place-kick attempt');
  });
});

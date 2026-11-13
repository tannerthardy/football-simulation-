import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { DT } from '../src/core/units.js';
import { fastRefillRate, Game, HALFTIME_RESERVE_REFILL, RESERVE_SHARE } from '../src/game/game.js';
import { fatigueFactor, spendEnergy, stepBody, type Body } from '../src/physics/kinematics.js';
import { derivePhysical } from '../src/players/physical.js';
import { generatePlayer } from '../src/players/generator.js';
import { decayWorkload, generateTeam, pickDefense, pickOffense, ROTATION_MEMORY_SECONDS, SUBSTITUTION_COST, workloadTolerance } from '../src/league/team.js';
import type { Player } from '../src/players/types.js';

const bodyFor = (p: Player, energy = 1): Body => ({ pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy, profile: derivePhysical(p) });

describe('fast pool: drain and output', () => {
  it('keeps a near-full burst on a partly drained pool and fades as it runs low', () => {
    expect(fatigueFactor(1)).toBe(1);
    expect(fatigueFactor(.8)).toBeGreaterThan(.99);
    expect(fatigueFactor(.5)).toBeGreaterThan(.94);
    expect(fatigueFactor(.5)).toBeLessThan(.96);
    expect(fatigueFactor(0)).toBeCloseTo(.7, 6);
    for (let e = 0; e < 1; e += .05) expect(fatigueFactor(e)).toBeLessThan(fatigueFactor(e + .05) + 1e-12);
  });

  it('charges hard isometric pushing much more than standing', () => {
    const p = generatePlayer(new Rng(3), 'DT', { quality: .6 });
    const stand = bodyFor(p), push = bodyFor(p);
    for (let t = 0; t < 5; t += DT) { spendEnergy(stand, { x: 0, y: 0 }, 0, DT); spendEnergy(push, { x: 0, y: 0 }, 1, DT); }
    expect(1 - stand.energy).toBeCloseTo(.0045 * 5, 3);
    // A five-second all-out push spends a large part of the fast pool.
    expect(1 - push.energy).toBeGreaterThan(.4);
    expect(1 - push.energy).toBeLessThan(.6);
  });

  it('leaves a fresh 40 untouched: speed holds through the sprint', () => {
    const p = generatePlayer(new Rng(42), 'WR', { quality: .6 });
    const b = bodyFor(p);
    let t = 0;
    while (b.pos.x < 40 && t < 10) { stepBody(b, { vel: { x: 20, y: 0 } }, DT); t += DT; }
    expect(fatigueFactor(b.energy)).toBeGreaterThan(.99);
  });
});

describe('rest: refill toward the slow reserve', () => {
  const home = generateTeam(new Rng(11), 'Home', 'HOM', { strength: .6 });
  const away = generateTeam(new Rng(12), 'Away', 'AWY', { strength: .6 });
  type Pools = { energy: Map<string, number>; reserve: Map<string, number>; recoverAll(s: number, r?: number): void };
  const pools = (g: Game) => g as unknown as Pools;

  it('refills the fast pool exponentially, never above the reserve', () => {
    const g = pools(new Game(home, away, { seed: 1 })), p = home.roster[0];
    g.energy.set(p.id, .4); g.reserve.set(p.id, .9);
    g.recoverAll(40);
    expect(g.energy.get(p.id)).toBeCloseTo(.4 + .5 * (1 - Math.exp(-40 * fastRefillRate(p))), 12);
    g.recoverAll(10_000);
    expect(g.energy.get(p.id)).toBeCloseTo(.9, 9);
    expect(g.reserve.get(p.id)).toBe(.9);
  });

  it('gives back only part of the reserve at halftime', () => {
    const g = pools(new Game(home, away, { seed: 1 })), p = home.roster[0];
    g.reserve.set(p.id, .9);
    g.recoverAll(600, HALFTIME_RESERVE_REFILL);
    expect(g.reserve.get(p.id)).toBeCloseTo(.95, 12);
  });

  it('a better-conditioned player refills faster', () => {
    const [a, b] = [generatePlayer(new Rng(5), 'DT', { quality: .5 }), generatePlayer(new Rng(6), 'DT', { quality: .5 })];
    a.ratings.stamina = 85; b.ratings.stamina = 45;
    expect(fastRefillRate(a)).toBeGreaterThan(fastRefillRate(b));
  });

  it('charges the reserve a small share of the play', () => {
    expect(RESERVE_SHARE).toBeGreaterThan(0);
    expect(RESERVE_SHARE).toBeLessThan(.05);
  });
});

describe('coach rotation from observable workload', () => {
  const team = generateTeam(new Rng(21), 'Team', 'TEM', { strength: .55 });
  const starters = pickDefense(team, 'base43');
  const offense = pickOffense(team, '11');

  it('spells a worked defensive tackle with a backup', () => {
    const dt = starters.DT_S!;
    const workload = new Map([[dt.id, workloadTolerance(dt) + 3]]);
    const tired = pickDefense(team, 'base43', { workload });
    expect(Object.values(tired).map(p => p!.id)).not.toContain(dt.id);
  });

  it('never rotates the offensive line or the QB for workload', () => {
    const workload = new Map(Object.values(offense).map(p => [p.id, 20]));
    const same = pickOffense(team, '11', { workload });
    for (const slot of ['QB', 'LT', 'LG', 'C', 'RG', 'RT'] as const) expect(same[slot].id).toBe(offense[slot].id);
  });

  it('prefers to keep the unit together inside a series', () => {
    const dt = starters.DT_S!;
    // Just past tolerance: enough to lose the slot between series, not inside one.
    const workload = new Map([[dt.id, workloadTolerance(dt) + 1]]);
    const between = pickDefense(team, 'base43', { workload });
    const inside = pickDefense(team, 'base43', { workload, lastSnap: new Set(Object.values(starters).map(p => p!.id)), substitutionCost: SUBSTITUTION_COST });
    expect(Object.values(between).map(p => p!.id)).not.toContain(dt.id);
    expect(Object.values(inside).map(p => p!.id)).toContain(dt.id);
  });

  it('forgets most of a series after a few minutes off the field', () => {
    expect(decayWorkload(6, ROTATION_MEMORY_SECONDS)).toBeCloseTo(6 / Math.E, 12);
    expect(decayWorkload(6, 0)).toBe(6);
  });
});

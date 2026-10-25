import { describe, expect, it } from 'vitest';
import { movementObjective } from '../src/sim/movement-objective.js';
import { executeProjection, projectionOracle, projectionScene, selectProjection } from '../scripts/diag/navigation/joint-projection.js';

describe('joint headway retains the nearest feasible free-footwork request', () => {
  it('removes a feasible sequential overcorrection and improves achievable progress toward the same goal', () => {
    const scene = projectionScene(), before = structuredClone(scene), goalBefore=structuredClone(movementObjective(scene.raw)), oracle = projectionOracle(scene);
    const selected = selectProjection(scene), closest = oracle.closest;
    expect(oracle.limits.every(c => oracle.ordinary.x * c.nx + oracle.ordinary.y * c.ny <= c.speed + 1e-9)).toBe(true);
    // Positive multipliers certify this two-active-boundary intersection is
    // the closest point to raw, rather than another implementation's golden.
    const secondMultiplier = (scene.raw.vel.y - closest.y) / oracle.limits[1].ny;
    const firstMultiplier = scene.raw.vel.x - closest.x - secondMultiplier * oracle.limits[1].nx;
    expect(secondMultiplier).toBeGreaterThan(0); expect(firstMultiplier).toBeGreaterThan(0);
    expect(selected.command.vel.x).toBeCloseTo(closest.x, 9);
    expect(selected.command.vel.y).toBeCloseTo(closest.y, 9);
    expect({ ...selected.command, vel: undefined }).toEqual({ ...scene.raw, vel: undefined });
    expect(movementObjective(selected.command)).toEqual(movementObjective(scene.raw));
    expect(selected.reads).toBe(2); expect(selected.ownUnchanged && selected.picturesUnchanged).toBe(true);
    const old = executeProjection(scene, { ...scene.raw, vel: oracle.ordinary });
    const next = executeProjection(scene, selected.command);
    expect(next.upright).toBe(true); expect(next.contacts).toBe(0);
    expect(next.progress).toBeGreaterThan(old.progress);
    expect(next.goalError).toBeLessThan(old.goalError);
    expect(next.maxWorkResidual).toBeLessThan(1e-8); expect(next.maxMotorExcess).toBeLessThan(1e-8);
    expect(structuredClone(scene)).toEqual(before);
    expect(movementObjective(scene.raw)).toEqual(goalBefore);
  });

  it('preserves the full clear request and tactile-owned ordinary contact response', () => {
    const clear = projectionScene('clear'), selected = selectProjection(clear);
    expect(selected.command).toEqual(clear.raw);
    const loaded = projectionScene('loaded'), oracle = projectionOracle(loaded);
    const held=selectProjection(loaded).command;
    expect(held.vel.x).toBeCloseTo(oracle.ordinary.x,12);
    expect(held.vel.y).toBeCloseTo(oracle.ordinary.y,12);
    expect({...held,vel:undefined}).toEqual({...loaded.raw,vel:undefined});
  });

  it('retains single-neighbor braking and the real collision when residual momentum cannot stop in time', () => {
    const scene = projectionScene('obstruction'), oracle = projectionOracle(scene), selected = selectProjection(scene);
    expect(selected.command).toEqual({ ...scene.raw, vel: oracle.ordinary });
    expect(executeProjection(scene, selected.command).contacts).toBeGreaterThan(0);
  });
});

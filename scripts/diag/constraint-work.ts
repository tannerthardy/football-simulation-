/** Isolated actual solver rows; no integration, contacts, feet or gameplay. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { World } from '../../src/physics/world.js';
import { sourceVersion } from '../source-version.js';

export const soft = { massScale: .8, impulseScale: .2, biasRate: 0 };
export function isolated(mode: 'per-update' | 'per-solve', budget = 100) {
  // Deliberately expose private methods only in this numerical isolation.
  const w: any = Object.create(World.prototype);
  w.constraintWork = mode;
  // This prototype-only fixture has no lower attachments. Keep the World
  // state read by the real grasp solver explicit even though no constructor
  // or support integration is run here.
  w.attachments = new WeakMap();
  w.bodies = [0, 2, 1].map(x => ({ vel: { x, y: 0 }, support: {} }));
  w.mass = [1, 1, 1];
  w.report = { armWorkLimit: [budget, budget, budget], armWork: [0, 0, 0],
    work: { hands: 0, grasps: 0, strikes: 0 }, passiveGraspWork: 0 };
  return w;
}
export function probe(mode: 'per-update' | 'per-solve', kind: 'hands' | 'grasp', iterations: number,
  reverse = false, budget = 100) {
  const w = isolated(mode, budget);
  const rows = [1, 2].map(j => ({ joint: { kind, a: w.bodies[0], b: w.bodies[j], legs: 0 },
    i: 0, j, nx: 1, ny: 0, mn: .5, mode: -1, c: 0, ln: 0, lt: 0,
    limit: 100, pushLim: 100, holdLim: 100, steerLim: 0, actor: 0, reel: 0,
    normalWork: { net: 0 }, tangentWork: { net: 0 } }));
  const order = reverse ? [...rows].reverse() : rows;
  for (let iteration = 0; iteration < iterations; iteration++) for (const row of order) {
    if (kind === 'hands') w.solveHands(row, soft);
    else w.solveGrasp(row, soft, .01);
  }
  const velocities: number[] = w.bodies.map((b: any) => b.vel.x);
  const residuals = rows.map(r => -.5 * soft.massScale * (velocities[r.j] - velocities[0]) - soft.impulseScale * r.ln);
  return { mode, kind, iterations, reverse, budget, velocities, lambda: rows.map(r => r.ln), residuals,
    normalWork: rows.map(r => r.normalWork.net), tangentWork: rows.map(r => r.tangentWork.net),
    momentum: velocities.reduce((sum, v) => sum + v, 0),
    energyChange: velocities.reduce((sum, v) => sum + .5 * v * v, 0) - 2.5,
    work: w.report.work, armWork: w.report.armWork[0], passiveGraspWork: w.report.passiveGraspWork };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cases = [];
  for (const mode of ['per-update', 'per-solve'] as const)
    for (const kind of ['hands', 'grasp'] as const)
      for (const iterations of [8, 32]) for (const reverse of [false, true])
        for (const budget of [0, .001, 100]) cases.push(probe(mode, kind, iterations, reverse, budget));
  const output = process.argv[2] ?? 'out/plant-transfer/constraint-work.json';
  mkdirSync(resolve(output, '..'), { recursive: true });
  writeFileSync(output, JSON.stringify({ sourceSha256: sourceVersion(), node: process.version,
    scope: 'Three unit masses, initial velocities (0,2,1), two tensile normal rows, zero bias; actual private solver methods, no world integration or virtual feet.', cases }, null, 2) + '\n');
  console.log(output);
}

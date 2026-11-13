import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { World } from '../src/physics/world.js';
import { ZoneCoverage, runFit } from '../src/sim/behaviors/defense.js';
import type { ZoneId } from '../src/playbook/types.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import type { RunFitJob } from '../src/sim/run-fits.js';

interface Scene {
  id: string; strong: boolean; setup: PlaySetup; t: number; actor: number; zone: ZoneId;
  positions: number[]; bodies: Array<{ velocity: number[]; energy: number; posture: number }>;
  runFit: RunFitJob;
  cues: Array<{ b: number; position: number[]; velocity: number[]; pose?: Perceived['pose'];
    carrying: Perceived['carrying']; age?: number }>;
}
const saved: { cases: Scene[] } = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/acquired-mesh-scenes.json.gz', import.meta.url))).toString());

function stage(scene: Scene = saved.cases[0]) {
  const sim = new PlaySim({ ...structuredClone(scene.setup), record: true, recordLevel: 'full' }), homes = sim.agents.map(a => ({ ...a.pos }));
  for (const a of sim.agents) {
    const i = a.idx, b = scene.bodies[i];
    a.body.pos = { x: scene.positions[i * 3], y: scene.positions[i * 3 + 1] };
    a.body.facing = scene.positions[i * 3 + 2];
    a.body.vel = { x: b.velocity[0], y: b.velocity[1] };
    a.body.energy = b.energy; a.body.support!.posture = b.posture;
  }
  const a = sim.agents[scene.actor], back = sim.slot('RB')!;
  a.runFit = structuredClone(scene.runFit); a.recog!.read = 'run';
  const pictures = new Map<number, Perceived>();
  for (const p of scene.cues) pictures.set(p.b, { pos: { x: p.position[0], y: p.position[1] },
    vel: { x: p.velocity[0], y: p.velocity[1] }, facing: 0, stance: null, pose: p.pose, carrying: p.carrying, age: p.age });
  const queries: number[] = [];
  sim.see = (_observer, target) => {
    queries.push(target.idx);
    return pictures.get(target.idx) ?? { pos: homes[target.idx], vel: { x: 0, y: 0 },
      facing: 0, stance: null, carrying: null };
  };
  const zone = new ZoneCoverage(a, sim, scene.zone, a.runFit!.gap, a.runFit!.side);
  a.behavior = zone; sim.t = scene.t;
  const fit = () => runFit(a, sim, a.runFit!.gap, a.runFit!.side);
  return { sim, a, back, pictures, queries, fit, update: () => zone.update(a, sim) };
}

describe('retire an unkeyed mesh expectation from acquired contradiction', () => {
  it.each(saved.cases.filter(s => s.strong))('$id uses the acquired carrying QB after the empty back leaves', scene => {
    const f = stage(scene), expected = stage(scene);
    // Existing downstream QB-fit comparator, not evidence supplied to f.
    expected.sim.scrambled = true;
    expect(f.pictures.get(f.back.idx)!.carrying).toBe(false);
    expect(f.pictures.get(f.back.idx)!.pos.x).toBeGreaterThan(f.sim.los);
    const installed = structuredClone(f.a.runFit), command = f.update();
    expect(f.sim.trace.data!.decisions.find(d => d.kind === 'run-fit-mesh')?.chose).toBe('acquired-QB');
    expect(command).toEqual(expected.fit());
    const report = new World([f.a.body]).step([command], .05);
    expect(f.a.runFit).toEqual(installed);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    console.info(JSON.stringify({ id: scene.id, t: scene.t, actor: f.a.slot,
      qb: f.pictures.get(f.sim.qb.idx), back: f.pictures.get(f.back.idx), requested: command.vel, achieved: f.a.vel }));
  });

  it('preserves the successful Ace mesh and does not use elapsed time or initial QB possession alone', () => {
    for (const t of [1.1, 10, 20]) {
      const f = stage(saved.cases[4]), unknown = stage(saved.cases[4]);
      f.sim.t = unknown.sim.t = t;
      unknown.pictures.get(unknown.sim.qb.idx)!.carrying = null;
      expect(f.update()).toEqual(unknown.update());
    }
  });

  it('requires positive QB and negative back possession, rather than hidden reality', () => {
    for (const [qb, rb] of [[null, false], [false, false], [undefined, false], [true, null], [true, undefined], [true, true]] as const) {
      const f = stage(), expected = stage();
      for (const s of [f, expected]) {
        s.pictures.get(s.sim.qb.idx)!.carrying = qb;
        s.pictures.get(s.back.idx)!.carrying = rb;
      }
      // INFO-1 now resolves competing possession pictures. Clearing only
      // QB possession can legitimately identify the back, so that is no
      // longer an unchanged-information comparator. Keep all six original
      // cases and compare the explicit installed-backfield request instead.
      expect(f.update()).toEqual(runFit(expected.a, expected.sim, expected.a.runFit!.gap, expected.a.runFit!.side,
        { backfield: { back: expected.back, backCue: expected.pictures.get(expected.back.idx)!,
          qbCue: expected.pictures.get(expected.sim.qb.idx)! } }));
      expect(f.sim.trace.data!.decisions.some(d => d.kind === 'run-fit-mesh')).toBe(false);
    }
  });

  it('retains retirement for this observer without sharing it or reviving the mesh when the back returns', () => {
    const f = stage(saved.cases[1]), untouched = stage(saved.cases[1]), expected = stage(saved.cases[1]);
    f.update();
    // Both remembering observers must actually acquire the contradiction.
    // Private `scrambled` no longer supplies a substitute for this history.
    expected.update();
    for (const s of [f, untouched, expected]) {
      s.sim.t = 10;
      s.pictures.get(s.back.idx)!.pos = { x: s.sim.los - 2, y: s.sim.ballY + 8 };
      s.pictures.get(s.back.idx)!.vel = { x: -1, y: 4 };
    }
    expect(f.update()).toEqual(expected.fit());
    expect(f.update()).not.toEqual(untouched.update());
    expect(untouched.sim.trace.data!.decisions.some(d => d.kind === 'run-fit-mesh')).toBe(false);
    expect(f.sim.trace.data!.decisions.filter(d => d.kind === 'run-fit-mesh')).toHaveLength(1);
  });

  it('keeps requests invariant under hidden QB/back movement while reality snapshots advance', () => {
    const a = stage(), b = stage();
    for (let k = 0; k < 4; k++) {
      b.sim.qb.body.pos = { x: 80 + k, y: 1 }; b.back.body.pos = { x: 20, y: 45 - k };
      b.back.body.vel = { x: -8, y: 7 };
      a.sim.perception.record(a.sim.agents); b.sim.perception.record(b.sim.agents);
      expect(b.update()).toEqual(a.update()); expect(b.sim.rng).toEqual(a.sim.rng);
      a.sim.t += .05; b.sim.t += .05;
    }
  });

  it('leaves keyed acquired-back fits independent of the retired unkeyed expectation', () => {
    const f = stage(), control = stage(); f.update();
    for (const s of [f, control]) {
      s.sim.t = 10;
      s.pictures.get(s.back.idx)!.pos = { x: s.sim.los - 1, y: s.sim.ballY + 2 };
      s.pictures.get(s.back.idx)!.carrying = true;
    }
    f.queries.length = 0;
    const keyed = (s: ReturnType<typeof stage>) => runFit(s.a, s.sim, s.a.runFit!.gap, s.a.runFit!.side,
      { target: s.back, cue: s.pictures.get(s.back.idx)! });
    expect(keyed(f)).toEqual(keyed(control));
    expect(f.queries).not.toContain(f.sim.qb.idx);
  });

  it('also retires mesh for an acquired carrying QB beyond the existing commitment surface', () => {
    const f = stage(saved.cases[4]), expected = stage(saved.cases[4]);
    for (const s of [f, expected]) s.pictures.get(s.sim.qb.idx)!.pos.x = s.sim.los + 3;
    expected.sim.scrambled = true;
    expect(f.fit()).toEqual(expected.fit());
  });
});

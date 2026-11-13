import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { World } from '../src/physics/world.js';
import { ManCoverage, playBall, sawThrow, type ManOptions } from '../src/sim/behaviors/defense.js';
import { chase } from '../src/sim/behaviors/common.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim, type PlaySetup } from '../src/sim/playsim.js';
import type { RunFitJob } from '../src/sim/run-fits.js';

interface Scene {
  id: string; strong: boolean; setup: PlaySetup; t: number; actor: number; target: number;
  positions: number[]; bodies: Array<{ velocity: number[]; energy: number; posture: number }>;
  runFit: RunFitJob;
  man: { press: boolean; initialCushion: number; hipsOpen: boolean; routeRead: boolean;
    leverage: ManOptions['lev']; trail: boolean; overTop: boolean };
  cues: Array<{ b: number; position: number[]; velocity: number[]; facing?: number;
    stance?: Perceived['stance']; pose?: Perceived['pose']; carrying: Perceived['carrying']; age?: number }>;
}
const saved: { cases: Scene[] } = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/acquired-qb-scenes.json.gz', import.meta.url))).toString());

/** Local producing-stage replay, not a restorable whole-play checkpoint.
 * Keep actual selected players, recorded own state and consumed pictures;
 * unexported historical mind/technique state is not invented as exact truth. */
function stage(scene: Scene = saved.cases[0]) {
  const sim = new PlaySim(structuredClone(scene.setup) as PlaySetup);
  const homes = sim.agents.map(a => ({ ...a.pos }));
  for (const a of sim.agents) {
    const i = a.idx, body = scene.bodies[i];
    a.body.pos = { x: scene.positions[i * 3], y: scene.positions[i * 3 + 1] };
    a.body.facing = scene.positions[i * 3 + 2];
    a.body.vel = { x: body.velocity[0], y: body.velocity[1] };
    a.body.energy = body.energy; a.body.support!.posture = body.posture;
  }
  const a = sim.agents[scene.actor], receiver = sim.agents[scene.target];
  a.runFit = structuredClone(scene.runFit); a.recog!.read = 'pass';
  const pictures = new Map<number, Perceived>();
  for (const p of scene.cues) pictures.set(p.b, {
    pos: { x: p.position[0], y: p.position[1] }, vel: { x: p.velocity[0], y: p.velocity[1] },
    facing: p.facing ?? 0, stance: p.stance ?? null, pose: p.pose ?? null,
    carrying: p.carrying, age: p.age,
  });
  sim.see = (_observer, target) => pictures.get(target.idx) ?? {
    pos: homes[target.idx], vel: { x: 0, y: 0 }, facing: 0, stance: null, pose: null, carrying: null,
  };
  const behavior = new ManCoverage(a, sim, receiver, scene.man.press, a.runFit!.gap, a.runFit!.side, {
    lev: scene.man.leverage, trail: scene.man.trail, overTop: scene.man.overTop,
    initialPosition: { x: a.pos.x - scene.man.initialCushion, y: pictures.get(receiver.idx)!.pos.y },
  });
  Reflect.set(behavior, 'hipsOpen', scene.man.hipsOpen);
  Reflect.set(behavior, 'routeRead', scene.man.routeRead);
  a.behavior = behavior; sim.t = scene.t;
  return { sim, a, receiver, behavior, pictures, update: () => behavior.update(a, sim) };
}

const radial = (v: { x: number; y: number }, f: ReturnType<typeof stage>) => {
  const p = f.pictures.get(f.sim.qb.idx)!.pos, dx = p.x - f.a.pos.x, dy = p.y - f.a.pos.y;
  return (v.x * dx + v.y * dy) / Math.hypot(dx, dy);
};

describe('man coverage accepts a personally acquired committed QB run', () => {
  it.each(saved.cases.filter((s: Scene) => s.strong))('$id accepts pursuit despite retained pass belief', scene => {
    const f = stage(scene), expected = stage(scene), covering = stage(scene);
    const cue = f.pictures.get(f.sim.qb.idx)!;
    expect(cue.carrying).toBe(true); expect(cue.pos.x).toBeGreaterThan(f.sim.los + 2);
    const before = { ...f.a.vel }, command = f.update();
    expect(command).toEqual(chase(expected.sim, expected.a, expected.sim.qb));
    const old = covering.behavior.trackReceiver(covering.a, covering.sim);
    expect(radial(command.vel, f)).toBeGreaterThan(radial(old.vel, covering));
    const report = new World([f.a.body]).step([command], .05);
    new World([covering.a.body]).step([old], .05);
    expect(radial(f.a.vel, expected)).toBeGreaterThan(radial(covering.a.vel, expected));
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(f.a.recog!.read).toBe('pass');
    console.info(JSON.stringify({ id: scene.id, t: scene.t, actor: f.a.slot, cueAge: cue.age,
      requested: command.vel, coveringRequest: old.vel, before, achieved: f.a.vel, coveringAchieved: covering.a.vel }));
  });

  it.each(saved.cases.filter((s: Scene) => !s.strong))('$id retains ordinary/PA receiver responsibility', scene => {
    const f = stage(scene), expected = stage(scene);
    expect(f.pictures.get(f.sim.qb.idx)!.pos.x).toBeLessThanOrEqual(f.sim.los + 2);
    expect(f.update()).toEqual(expected.behavior.trackReceiver(expected.a, expected.sim));
  });

  it('needs acquired possession as well as commitment, and cancels when that evidence changes', () => {
    for (const carrying of [false, null, undefined]) {
      const f = stage(), expected = stage();
      f.update(); // A prior positive picture is not a permanent phase latch.
      for (const s of [f, expected]) s.pictures.get(s.sim.qb.idx)!.carrying = carrying;
      expect(f.update()).toEqual(expected.behavior.trackReceiver(expected.a, expected.sim));
    }
  });

  it('ignores hidden QB motion, possession, scramble/handoff flags and private call while reality advances', () => {
    const f = stage(), hidden = stage();
    for (let k = 0; k < 4; k++) {
      hidden.sim.qb.body.pos = { x: 80 + k, y: 2 + k }; hidden.sim.qb.body.vel = { x: -9, y: 8 };
      hidden.sim.ball = { kind: 'held', carrier: hidden.sim.slot('RB')! };
      hidden.sim.scrambled = k % 2 === 0; hidden.sim.handoffAt = k;
      hidden.sim.isPass = k % 2 === 0;
      for (const s of [f, hidden]) s.sim.perception.record(s.sim.agents);
      expect(hidden.update()).toEqual(f.update());
      expect(hidden.sim.rng).toEqual(f.sim.rng);
      f.sim.t += .05; hidden.sim.t += .05;
    }
  });

  it('does not treat initial snap possession or elapsed time as a committed run', () => {
    for (const t of [.05, 2, 20]) {
      const f = stage(), expected = stage();
      for (const s of [f, expected]) {
        s.sim.t = t; s.pictures.get(s.sim.qb.idx)!.pos = { x: s.sim.los - 4, y: 26 };
      }
      expect(f.update()).toEqual(expected.behavior.trackReceiver(expected.a, expected.sim));
    }
  });

  it('keeps a recognized reachable ball contest ahead of a stale QB carrying picture', () => {
    const f = stage(); f.sim.throwAt = .01; f.a.tags.add('looking');
    f.sim.ball = { kind: 'air', flight: { pos: { x: f.a.pos.x - 1, y: f.a.pos.y, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
      thrower: f.sim.qb, target: f.receiver, releaseT: .01, releaseX: f.sim.los - 4,
      intended: { x: f.a.pos.x, y: f.a.pos.y, z: 1.2 }, arrivalT: f.sim.t + .1, deflected: false, throwaway: false }; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
    f.sim.ballPath = [{ t: f.sim.t + .1, x: f.a.pos.x, y: f.a.pos.y, z: 1.2 }];
    expect(sawThrow(f.a, f.sim, f.receiver)).toBe(true);
    expect(f.update()).toEqual(playBall(f.a, f.sim, f.receiver));
    expect(f.a.tags.has('onBall')).toBe(true);
  });
});

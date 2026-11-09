import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

// A chaser (stage 1 of the field-of-view model) watches his man. An opponent
// moving behind him is known only from the last in-view picture, projected for
// his anticipation horizon. Off, everyone is seen on the ordinary delay.
async function scene(gaze: boolean) {
  vi.stubEnv('GAZE', gaze ? '1' : '0'); vi.resetModules();
  const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
  const { sim, defender: d } = f;
  sim.world.joints = sim.world.joints.filter((j: any) => j.a !== d.body && j.b !== d.body);
  d.engagement = null as any; sim.engagements.length = 0;
  const watched = sim.slot('RB')!, behind = sim.slot('LT')!;
  d.body.pos = { x: 50, y: 20 }; d.body.facing = 0; d.body.vel = { x: 0, y: 0 };
  watched.body.pos = { x: 56, y: 20 }; watched.body.vel = { x: 0, y: 0 };
  behind.body.pos = { x: 44, y: 20 }; behind.body.vel = { x: 0, y: 0 };
  for (const a of [watched, behind]) a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any;
  d.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: 0 }) } as any;
  const first = () => { sim.lookAt(d, watched); return sim.see(d, behind); };
  for (let k = 0; k < 12; k++) { sim.tick(); first(); }
  const before = sim.see(d, behind).pos;
  // He moves 4 yd sideways behind the chaser, then stops.
  behind.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 4 } }) } as any;
  for (let k = 0; k < 20; k++) { sim.tick(); first(); }
  behind.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as any;
  for (let k = 0; k < 30; k++) { sim.tick(); first(); }
  sim.lookAt(d, watched);
  return { before, after: sim.see(d, behind).pos, truth: { ...behind.pos }, watchedSeen: sim.see(d, watched).pos, watchedTrue: { ...watched.pos } };
}

describe('GAZE stage 1: a chaser knows unwatched opponents behind him only from memory', () => {
  it('keeps the last in-view picture of a man moving behind him; off, he is seen', async () => {
    const off = await scene(false), on = await scene(true);
    expect(Math.abs(off.after.y - off.truth.y)).toBeLessThan(0.6);
    expect(Math.abs(on.after.y - on.before.y)).toBeLessThan(0.3);
    expect(Math.abs(on.after.y - on.truth.y)).toBeGreaterThan(1);
    expect(Math.abs(on.watchedSeen.x - on.watchedTrue.x)).toBeLessThan(0.6);
  });
});

describe('GAZE anticipation: read skill sets how far toward the measured best projection', () => {
  it('a poor reader keeps the frozen picture; an elite one projects by constant acceleration, up to 1.0 s', async () => {
    vi.stubEnv('GAZE', '1'); vi.resetModules();
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const { sim, defender: d } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const target = sim.slot('LT')!; const s: any = sim;
    const picture = { pos: { x: 40, y: 20 }, vel: { x: 0, y: 2 }, stance: null, facing: 0, age: 0 };
    const at = (skill: number, since: number) => {
      d.player.ratings.playRecognition = skill * 100; d.player.ratings.awareness = skill * 100;
      s.gaze.set(d, { dir: 0, t: sim.t, target: d, set: sim.t, since: sim.t - since - 1 });
      s.sightMemory.set(`${d.idx}>${target.idx}`, { seen: picture, at: sim.t - since, acc: { x: 0, y: 1 } });
      return s.remembered(d, target, picture).pos;
    };
    const r = (k: string) => d.r(k as any);
    const p0 = at(0, 0.5);
    expect(p0.y).toBeCloseTo(20, 6);
    const p1 = at(1, 0.5), k1 = 0.5 * r('playRecognition') + 0.5 * r('awareness');
    expect(p1.y).toBeCloseTo(20 + k1 * (2 * 0.5 + 0.5 * 1 * 0.25), 6);
    expect(at(1, 2).y).toBeCloseTo(at(1, 1).y, 6);
  });
});

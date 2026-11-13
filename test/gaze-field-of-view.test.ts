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
  it('a zero reader keeps the frozen picture; motion projection saturates at skill 0.5, up to 1.0 s', async () => {
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
    const ca = 2 * 0.5 + 0.5 * 1 * 0.25;
    const pq = at(0.15, 0.5), kq = 0.5 * r('playRecognition') + 0.5 * r('awareness');
    expect(pq.y).toBeCloseTo(20 + Math.min(1, 2 * kq) * ca, 6);
    expect(at(1, 0.5).y).toBeCloseTo(20 + ca, 6);
    expect(at(1, 2).y).toBeCloseTo(at(1, 1).y, 6);
  });
});

describe('GAZE anticipation by assignment: experience applies to the opponents his assignment makes his', () => {
  async function setup() {
    vi.stubEnv('GAZE', '1'); vi.resetModules();
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const { ANTICIPATION_PRIOR } = await import('../src/sim/anticipation-prior.js');
    const { sim, defender: d } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const s: any = sim, up = sim.attackDir('O');
    const target = sim.slot('LT')!;
    const picture = { pos: { x: sim.los + 2 * up, y: sim.ballY + 3 }, vel: { x: 0, y: 2 }, stance: null, facing: 0, age: 0 };
    const ctx = s.priorContext(target, picture, sim.t - 1.5);   // keyed at the recalled picture's time
    // A made-up cell: players like this one break 1 yd back toward the ball per 0.6 s instead of continuing.
    ANTICIPATION_PRIOR[ctx.key] = { '0.3': [0.2, -0.5, 99], '0.6': [0.3, -1, 99], '1': [0.3, -1.6, 99], '1.5': [0.3, -2.4, 99] };
    const at = (skill: number, since: number) => {
      d.player.ratings.playRecognition = skill * 100; d.player.ratings.awareness = skill * 100;
      s.gaze.set(d, { dir: 0, t: sim.t, target: d, set: sim.t, since: sim.t - since - 1 });
      s.sightMemory.set(`${d.idx}>${target.idx}`, { seen: picture, at: sim.t - since, acc: { x: 0, y: 0 } });
      return s.remembered(d, target, picture);
    };
    return { sim, d, target, at, ctx, ANTICIPATION_PRIOR, cleanup: () => { for (const k of ['', 'run|', 'pass|']) delete ANTICIPATION_PRIOR[k + ctx.key]; } };
  }

  it('an elite reader projects his assigned man by the prior; average by motion; unassigned by motion only', async () => {
    const { sim, d, target, at, cleanup } = await setup();
    try {
      // Picture moving +y at 2 yd/s on the ball's +y side: "along" is +y, "across toward his sideline" is -x.
      // Motion (held after 1.0 s) is 2 yd; the prior says 0.3 yd along by 1.5 s.
      const elite = at(1, 1.5), avg = at(0.5, 1.5), y0 = sim.ballY + 3;
      expect(avg.pos.y - y0).toBeCloseTo(2, 6);                           // pure motion
      expect(elite.pos.y - y0).toBeCloseTo(0.3, 6);                       // prior "along"
      expect(at(1, 0.6).pos.y - y0).toBeCloseTo(1.2, 6);                  // young picture: motion first
      expect(at(1, 1.15).pos.y - y0).toBeLessThan(2);                     // handing over
      expect(at(1, 1.15).pos.y - y0).toBeGreaterThan(0.3);
      sim.assignedTo(d, []);                                              // his assignment excludes him
      expect(at(1, 1.5).pos.y - y0).toBeCloseTo(2, 6);
      sim.assignedTo(d, [target]);
      expect(at(1, 1.5).pos.y - y0).toBeCloseTo(0.3, 6);
    } finally { cleanup(); }
  });
});

describe('GAZE anticipation by read: a defender projects by what he believes the play is, right or wrong', () => {
  it('the same picture is projected as a run blocker after a run read and a route after a pass read', async () => {
    vi.stubEnv('GAZE', '1'); vi.resetModules();
    const { contactFixture } = await import('../scripts/diag/run-contact-technique.js');
    const { ANTICIPATION_PRIOR } = await import('../src/sim/anticipation-prior.js');
    const { sim, defender: d } = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: 1 });
    const s: any = sim, target = sim.slot('LT')!;
    const picture = { pos: { x: sim.los + 2 * sim.attackDir('O'), y: sim.ballY + 3 }, vel: { x: 0, y: 2 }, stance: null, facing: 0, age: 0 };
    const key = s.priorContext(target, picture, sim.t - 1.5).key;
    ANTICIPATION_PRIOR[`run|${key}`] = { '0.6': [0.2, 0, 99], '1': [0.3, 0, 99] };
    ANTICIPATION_PRIOR[`pass|${key}`] = { '0.6': [1.5, 0, 99], '1': [2.5, 0, 99] };
    try {
      d.player.ratings.playRecognition = 99; d.player.ratings.awareness = 99;
      const recall = (read: string | null) => {
        d.recog = read === null ? null : ({ read } as any);
        s.gaze.set(d, { dir: 0, t: sim.t, target: d, set: sim.t, since: sim.t - 2 });
        s.sightMemory.set(`${d.idx}>${target.idx}`, { seen: picture, at: sim.t - 1.5, acc: { x: 0, y: 0 } });
        return s.remembered(d, target, picture).pos.y - picture.pos.y;
      };
      expect(recall('run')).toBeCloseTo(0.3, 6);
      expect(recall('pass')).toBeCloseTo(2.5, 6);
      expect(recall('unsure')).toBeCloseTo(2, 6);   // no belief, no cell: motion (held after 1.0 s)
    } finally { delete ANTICIPATION_PRIOR[`run|${key}`]; delete ANTICIPATION_PRIOR[`pass|${key}`]; }
  });
});

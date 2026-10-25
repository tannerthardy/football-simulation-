import { describe, expect, it, vi } from 'vitest';
import { nativeTraceSetup } from '../scripts/diag/command-trace.js';
import { chase } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';

/** FS chasing Z with a chosen picture of Z; no teammates in the read. */
function scene() {
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'four_verts', seed: 19, roster: 7,
    formation: 'gun_doubles_11', flip: false }));
  const d = sim.slot('FS')!, c = sim.slot('Z')!;
  d.body.pos = { x: 40, y: 26 }; d.body.vel = { x: 3, y: 0 };
  sim.ball = { kind: 'held', carrier: c };
  const pic = { pos: { x: 48, y: 18 }, vel: { x: 2, y: 6 } };
  vi.spyOn(sim, 'see').mockImplementation((_o, t) => t === c
    ? { pos: { ...pic.pos }, vel: { ...pic.vel }, facing: 0, stance: null, age: .2 }
    : { pos: { x: -50, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, stance: null, age: .2 });
  vi.spyOn(sim, 'opponents').mockReturnValue([c]);
  vi.spyOn(sim, 'teammates').mockReturnValue([d]);
  const plan = () => {
    const trace = sim.recordCommands({ actor: { playerId: d.player.id }, from: sim.t, to: sim.t + .05 }); trace.begin(sim);
    chase(sim, d, c);
    trace.finish(sim);
    const p = trace.steps[0].pursuit!.find(r => r.data.kind === 'intercept')!.data;
    if (p.kind !== 'intercept') throw new Error('Missing intercept');
    return p;
  };
  return { sim, pic, plan };
}

describe('a chase holds its intercept while the runner picture holds', () => {
  it('keeps the chosen runner-path time on the next plan with an unchanged picture', () => {
    const { sim, pic, plan } = scene();
    const first = plan();
    expect(first.lifetime).toMatchObject({ kept: false, reason: 'new' });
    expect(first.biasedTime).toBeGreaterThan(.2); expect(first.biasedTime).toBeLessThan(2.5); // unclamped
    sim.t += .05; pic.pos.x += .1; pic.pos.y += .3;
    const next = plan();
    expect(next.lifetime).toMatchObject({ kept: true, reason: 'held' });
    // The same absolute time on the runner's path, not a fresh earliest sample.
    expect(next.biasedTime + next.timeBias).toBeCloseTo(first.biasedTime + first.timeBias - .05, 9);
    vi.restoreAllMocks();
  });

  it('replans when the picture of the runner turns', () => {
    const { sim, pic, plan } = scene();
    plan();
    sim.t += .05; pic.vel = { x: 6, y: 1 };
    expect(plan().lifetime).toMatchObject({ kept: false, reason: 'picture-changed' });
    vi.restoreAllMocks();
  });

  it('replans when the picture of the runner changes speed', () => {
    const { sim, pic, plan } = scene();
    plan();
    sim.t += .05; pic.vel = { x: 1, y: 3 };
    expect(plan().lifetime).toMatchObject({ kept: false, reason: 'picture-changed' });
    vi.restoreAllMocks();
  });

  it('starts fresh after a gap in planning', () => {
    const { sim, plan } = scene();
    plan();
    sim.t += .5;
    expect(plan().lifetime!.kept).toBe(false);
    vi.restoreAllMocks();
  });
});

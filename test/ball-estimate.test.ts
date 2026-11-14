/** BALL_EST (ball-estimate.ts; experimental, off). The fit recovers a flight from clean samples (gravity and drag are
 * known physics, iterated in); with range noise much larger than bearing noise its landing error lies along the
 * observer's line of sight. Off: every body on every tick is the unset path. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stepFlight, DRAG_SPIRAL, type BallFlight } from '../src/physics/ball.js';
import { fitFlight } from '../src/sim/ball-estimate.js';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

function flightSamples(eye: { x: number; y: number; z: number }, rangeSd: number, bearingSd: number, seed: number) {
  const b: BallFlight = { pos: { x: 0, y: 20, z: 2 }, vel: { x: 18, y: 4, z: 9 }, drag: DRAG_SPIRAL };
  let s = seed;
  const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const normal = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
  const out: any[] = [];
  for (let k = 0; k < 3; k++) {
    const p = { ...b.pos }, d = { x: p.x - eye.x, y: p.y - eye.y, z: p.z - eye.z }, r = Math.hypot(d.x, d.y, d.z);
    const u = { x: d.x / r, y: d.y / r, z: d.z / r }, e1 = { x: -u.y / Math.hypot(u.x, u.y), y: u.x / Math.hypot(u.x, u.y), z: 0 };
    const er = normal() * rangeSd * r, ea = normal() * bearingSd * r;
    out.push({ t: k * 0.25, p: { x: p.x + u.x * er + e1.x * ea, y: p.y + u.y * er + e1.y * ea, z: p.z + u.z * er }, along: u, sr: Math.max(1e-4, rangeSd * r), sa: Math.max(1e-4, bearingSd * r) });
    stepFlight(b, 0.25);
  }
  const land: BallFlight = { pos: { x: 0, y: 20, z: 2 }, vel: { x: 18, y: 4, z: 9 }, drag: DRAG_SPIRAL };
  let t = 0; while (land.pos.z > 0) { stepFlight(land, 0.01); t += 0.01; }
  return { out, land: land.pos, T: t };
}
function landOf(fit: { t0: number; p: any; v: any }) {
  const b: BallFlight = { pos: { ...fit.p }, vel: { ...fit.v }, drag: DRAG_SPIRAL };
  while (b.pos.z > 0) stepFlight(b, 0.01);
  return b.pos;
}

describe('BALL_EST estimator', () => {
  it('recovers the flight from clean samples', () => {
    const { out, land } = flightSamples({ x: 25, y: 20, z: 1.7 }, 0, 0, 1);
    const p = landOf(fitFlight(out, DRAG_SPIRAL));
    expect(Math.hypot(p.x - land.x, p.y - land.y)).toBeLessThan(0.05);
  });
  it('errs along his line of sight more than across it', () => {
    // A receiver 25 yd downfield looking back up the field: his line of sight is along x.
    let along = 0, across = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const { out, land } = flightSamples({ x: 25, y: 20, z: 1.7 }, 0.075, (0.75 * Math.PI) / 180, seed);
      const p = landOf(fitFlight(out, DRAG_SPIRAL));
      along += (p.x - land.x) ** 2; across += (p.y - land.y) ** 2;
    }
    expect(Math.sqrt(along / 200)).toBeGreaterThan(2 * Math.sqrt(across / 200));
  });
  it('off: the unset path on every tick', async () => {
    const trace = async (flag?: string) => {
      vi.resetModules();
      if (flag !== undefined) vi.stubEnv('BALL_EST', flag);
      const { PlaySim } = await import('../src/sim/playsim.js');
      const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
      const out: number[] = [];
      for (const concept of ['four_verts', 'curl_flat']) for (let seed = 1; seed <= 3; seed++) {
        const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3_match', concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
        const tick = sim.tick.bind(sim);
        sim.tick = () => { tick(); for (const a of sim.agents) out.push(a.pos.x, a.pos.y); };
        sim.run();
      }
      return out;
    };
    const unset = await trace(), zero = await trace('0');
    expect(zero.length).toBeGreaterThan(1000);
    expect(zero).toEqual(unset);
  });
});

describe('BALL_EST read-only accessors', () => {
  it('peek and lastSeen read his belief without attending to the ball', async () => {
    vi.resetModules();
    vi.stubEnv('BALL_EST', '1');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3_match', concept: 'curl_flat', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
    let checked = false;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      tick();
      if (checked || sim.ball.kind !== 'air') return;
      const d = sim.defense[0];
      // Never attended: nothing to peek, no track created.
      expect(sim.ballEstimates.peek(d, sim)).toEqual([]);
      expect(sim.ballEstimates.lastSeen(d)).toBeNull();
      expect(sim.ballEstimates.headOf(d)).toBeUndefined();
      checked = true;
    };
    sim.run();
    expect(checked).toBe(true);
  });
});

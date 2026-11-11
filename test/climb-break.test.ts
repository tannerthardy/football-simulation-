import { afterEach, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

/**
 * CLIMB_BREAK (src/sim/coverage/reads.ts): a defender reads a break that keeps
 * climbing (corner, post, wheel) as a deep threat, from the path he sees,
 * with a confirmation delay that his focus and play recognition shorten.
 */
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Leg = { until: number; vx: number; vy: number };
/** Route shapes as velocity legs (yd/s; +vy is toward his own sideline). Times in s after the snap. */
const SHAPES: Record<string, Leg[]> = {
  go: [{ until: 3, vx: 7, vy: 0 }],
  // 10-yd stem, then a 45° corner still climbing.
  corner: [{ until: 1.45, vx: 7, vy: 0 }, { until: 3, vx: 4.6, vy: 4.6 }],
  // 10-yd stem, then a 45° post.
  post: [{ until: 1.45, vx: 7, vy: 0 }, { until: 3, vx: 4.6, vy: -4.6 }],
  // 12-yd stem, then flat across (dig) or flat out (deep out).
  dig: [{ until: 1.7, vx: 7, vy: 0 }, { until: 3, vx: 0.3, vy: -6.5 }],
  deep_out: [{ until: 1.7, vx: 7, vy: 0 }, { until: 3, vx: -0.3, vy: 6.5 }],
  // A deep out that drifts upfield a little (1.5 yd/s): still an out, not a corner.
  drift_out: [{ until: 1.7, vx: 7, vy: 0 }, { until: 3, vx: 1.5, vy: 6.3 }],
  // Out to the flat, then up the sideline.
  wheel: [{ until: 0.8, vx: 0.4, vy: 6.5 }, { until: 3, vx: 7, vy: 0.4 }],
  // 12-yd curl: stem, then plant and come back.
  curl: [{ until: 1.7, vx: 7, vy: 0 }, { until: 2.0, vx: -1, vy: -0.5 }, { until: 3, vx: 0, vy: 0 }],
};

async function setup(flag: '0' | '1') {
  vi.stubEnv('CLIMB_BREAK', flag);
  vi.resetModules();
  const reads = await import('../src/sim/coverage/reads.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'D'), 'nickel'), seed: 3,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50 });
  // Controlled visual samples: the reader sees the receiver's body as it is.
  vi.spyOn(sim, 'see').mockImplementation((_a, r) => ({ pos: { ...r.pos }, vel: { ...r.vel }, facing: r.facing, stance: r.stance, age: 0 }));
  return { reads, sim };
}

/** Run one shape past a defender; return his read of the receiver each step. */
async function watch(shape: string, o: { flag?: '0' | '1'; recognition?: number } = {}) {
  const { reads, sim } = await setup(o.flag ?? '1');
  const a = sim.slot('CB_S')!, wr = sim.slot('X')!;
  if (o.recognition !== undefined) a.player.ratings.playRecognition = o.recognition;
  a.mind.focus = 1;
  const side = Math.sign(wr.pos.y - sim.ballY) || 1;
  wr.body.pos = { x: sim.los, y: wr.pos.y };
  const reader = new reads.ReleaseReader(a, sim);
  const out: Array<{ t: number; release: string; climb: string | null; deep: boolean; depth: number }> = [];
  let t = 0;
  for (const leg of SHAPES[shape]) {
    while (t < leg.until - 1e-9) {
      t = +(t + 0.05).toFixed(2);
      sim.t = t;
      wr.body.vel = { x: leg.vx, y: leg.vy * side };
      // His torso turns with his path (a planted curl keeps facing upfield, then turns back).
      if (Math.hypot(leg.vx, leg.vy) > 0.5) wr.body.facing = Math.atan2(leg.vy * side, leg.vx);
      wr.body.pos = { x: wr.pos.x + leg.vx * 0.05, y: wr.pos.y + leg.vy * side * 0.05 };
      const rd = reader.read(sim, wr)!;
      out.push({ t, release: rd.release, climb: rd.climb, deep: reads.goingDeep(rd), depth: rd.depth });
    }
  }
  return out;
}
const finalClimb = (f: Awaited<ReturnType<typeof watch>>) => f.at(-1)!.climb;
const firstClimbAt = (f: Awaited<ReturnType<typeof watch>>, c: string) => f.find((s) => s.climb === c)?.t ?? Infinity;

describe('CLIMB_BREAK: the climbing-break read', () => {
  it('is off by default and changes nothing then', async () => {
    const f = await watch('corner', { flag: '0' });
    expect(f.every((s) => s.climb === null)).toBe(true);
    // Without it the corner reads as an out and is not a deep threat.
    expect(f.at(-1)!.release).toBe('out');
    expect(f.at(-1)!.deep).toBe(false);
  });

  it('reads a corner and a post off a stem, and a wheel up from the flat, as deep threats', async () => {
    for (const [shape, climb] of [['corner', 'corner'], ['post', 'post'], ['wheel', 'wheel']] as const) {
      const f = await watch(shape);
      expect(finalClimb(f), shape).toBe(climb);
      expect(f.at(-1)!.deep, shape).toBe(true);
    }
  });

  it('does not call a vertical, a dig, a deep out (even a drifting one) or a curl a climbing break', async () => {
    for (const shape of ['go', 'dig', 'deep_out', 'drift_out', 'curl']) {
      const f = await watch(shape);
      expect(f.filter((s) => s.climb !== null).map((s) => `${s.t} ${s.release} ${s.climb} ${s.depth.toFixed(1)}`), shape).toEqual([]);
    }
    // The vertical is still a deep threat through its own class.
    expect((await watch('go')).at(-1)!.deep).toBe(true);
  });

  it('believes the break only after it persists: never on the step he first sees it', async () => {
    const f = await watch('corner');
    const lean = f.find((s) => s.t > 1.45)!.t;
    expect(firstClimbAt(f, 'corner')).toBeGreaterThan(lean);
  });

  it('is read sooner by a defender with better play recognition', async () => {
    const sharp = firstClimbAt(await watch('corner', { recognition: 99 }), 'corner');
    const slow = firstClimbAt(await watch('corner', { recognition: 25 }), 'corner');
    expect(sharp).toBeLessThan(slow);
    expect(slow - sharp).toBeGreaterThan(0.05);
  });

  it('drops the read when the corner flattens into an out', async () => {
    SHAPES.corner_flat = [...SHAPES.corner.slice(0, 1), { until: 2.3, vx: 4.6, vy: 4.6 }, { until: 3.2, vx: 0, vy: 6.5 }];
    const f = await watch('corner_flat');
    expect(f.some((s) => s.climb === 'corner')).toBe(true);
    expect(finalClimb(f)).toBe(null);
  });
});

describe('CLIMB_BREAK in a scene, through his own perception', () => {
  it("the corner's key reads #1's corner route as a climbing break, after the break and with a delay", async () => {
    vi.stubEnv('CLIMB_BREAK', '1');
    vi.resetModules();
    const { sceneSim } = await import('../src/lab/coverage-scene.js');
    const { CoverageDefender } = await import('../src/sim/coverage/defender.js');
    const sim = sceneSim({ formation: 'gun_spread_10', coverage: 'cover3_match', strong: { 1: 'corner', 2: 'seam' }, weak: { 1: 'go', 2: 'go' } });
    const step = sim as unknown as { tick(): void };
    const cb = sim.slot('CB_S')!, one = sim.slot(sim.offAlign.numbering.S1!)!;
    let breakAt = Infinity, readAt = Infinity;
    while (sim.phase === 'live' && sim.t < 3.0) {
      const t = sim.t;
      step.tick();
      // The corner's route leans out once he is past his stem (route: 11-yd stem).
      if (breakAt === Infinity && one.pos.x - sim.los > 8 && one.vel.y * Math.sign(one.pos.y - sim.ballY) > 2) breakAt = t;
      const b = cb.behavior;
      if (b instanceof CoverageDefender) {
        const rd = b.reader.recordedReads(t).find((r) => r.r === one);
        if (rd?.climb === 'corner' && readAt === Infinity) readAt = t;
      }
    }
    expect(breakAt).toBeLessThan(3.0);
    expect(readAt).toBeLessThan(3.0);
    expect(readAt).toBeGreaterThan(breakAt);
  });
});

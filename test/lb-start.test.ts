import { afterEach, describe, expect, it, vi } from 'vitest';

// RUN_CONFIRM and LB_READ_STEP are read when their modules load: each arm imports the engine fresh.
async function engine(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  return { nativeTraceSetup, PlaySim };
}
afterEach(() => vi.unstubAllEnvs());

/** Box backers on native snaps: the time each first commits run, his read sequence, and per-tick samples. */
async function backers(env: Record<string, string>, concept: string, down: number, toGo: number, seeds = 6) {
  const { nativeTraceSetup, PlaySim } = await engine(env);
  const out: { runAt: number | null; seq: string[] }[] = [];
  for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    const setup: any = nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip });
    setup.down = down; setup.firstDownX = setup.los + toGo;
    const sim = new PlaySim(setup);
    const lbs = sim.defense.filter(d => d.slot.startsWith('LB') && d.behavior?.kind !== 'blitz');
    const rec = new Map(lbs.map(l => [l, { runAt: null as number | null, seq: [] as string[] }]));
    const step = sim.tick.bind(sim);
    (sim as any).tick = () => {
      step();
      for (const l of lbs) {
        const r = l.recog!.read, o = rec.get(l)!;
        if (o.seq[o.seq.length - 1] !== r) o.seq.push(r);
        if (r === 'run' && o.runAt === null) o.runAt = sim.t;
      }
    };
    sim.run();
    out.push(...rec.values());
  }
  return out;
}
const median = (v: number[]) => [...v].sort((a, b) => a - b)[v.length >> 1];
const runReadMedian = (b: { runAt: number | null }[]) => median(b.filter(x => x.runAt !== null).map(x => x.runAt!));

describe('RUN_CONFIRM: the pass expectation asks for a clearer run picture, it does not hold his feet', () => {
  it('an undecided backer reads inside zone on the picture: no later than a committed one on 3rd and 12, and sooner than without the flag', async () => {
    // Native snaps: on 3rd and 12 the prior commits him to pass first and DRAW_READ's
    // picture then turns him; on 1st down he stays undecided, which the posterior
    // alone held until about 0.6 s.
    const onFirst = runReadMedian(await backers({ RUN_CONFIRM: '1' }, 'iz_strong', 1, 10));
    const onThird = runReadMedian(await backers({ RUN_CONFIRM: '1' }, 'iz_strong', 3, 12));
    const offFirst = runReadMedian(await backers({ RUN_CONFIRM: '0' }, 'iz_strong', 1, 10));
    // NFL box backers trigger downhill at a median 0.4 s on runs on every down.
    expect(Math.abs(onThird - onFirst)).toBeLessThan(0.15);
    expect(onFirst).toBeLessThan(offFirst);
  }, 300_000);

  it('a run commit against the prior stays coherent: no run -> pass -> run on 3rd-and-12 runs or play action', async () => {
    for (const concept of ['iz_strong', 'pa_post_dig']) {
      const all = await backers({ RUN_CONFIRM: '1' }, concept, 3, 12);
      expect(all.reduce((n, r) => n + (r.seq.join('>').split('run>pass>run').length - 1), 0)).toBe(0);
    }
  }, 300_000);

  it('opposing control: on a real dropback with a strong pass prior almost no backer commits run', async () => {
    const all = await backers({ RUN_CONFIRM: '1' }, 'dagger', 3, 12);
    expect(all.filter(r => r.runAt !== null).length).toBeLessThanOrEqual(Math.ceil(all.length * 0.03));
  }, 300_000);
});

describe('LB_READ_STEP: an undecided box backer reads from a short downhill step', () => {
  it('steps toward the line at no more than half speed, and stands without the flag', async () => {
    for (const [flag, expectStep] of [['1', true], ['0', false]] as const) {
      const { nativeTraceSetup, PlaySim } = await engine({ LB_READ_STEP: flag });
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'dagger', seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false }));
      const dir = sim.attackDir(sim.offense[0].team);
      const lb = sim.defense.find((d: any) => d.slot === 'LB_M' && d.behavior?.kind === 'zone');
      expect(lb).toBeTruthy();
      let sampled = false;
      while (sim.t < 0.6 && !sampled) {
        sim.tick();
        if (sim.t > lb.snapReadyAt + 0.05 && lb.recog.read === 'unsure') {
          const v = sim.intents[lb.idx].vel, downhill = -v.x * dir;
          if (expectStep) {
            expect(downhill).toBeGreaterThan(0);
            expect(Math.hypot(v.x, v.y)).toBeLessThanOrEqual(0.5 * lb.profile.vmax + 1e-9);
            expect(lb.tags.has('lb-read-step')).toBe(true);
          } else expect(Math.hypot(v.x, v.y)).toBeLessThan(1e-6);
          sampled = true;
        }
      }
      expect(sampled).toBe(true);
    }
  }, 120_000);
});

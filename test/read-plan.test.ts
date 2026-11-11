/** READ_PLAN (behaviors/qb.ts, read-compiler/runtime.ts; experimental, off), with FORECAST_BREAK
 * (receiver-forecast.ts; experimental, off): the quarterback runs the compiled read plan from what he sees.
 * Fixtures from docs/reviews/2026-11-11-read-compiler-phase1.md. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The current engine (the reference stack, docs/REFERENCE_STACK.md), not the legacy pin of vitest.config.ts. */
function referenceEngine(plan: string, forecast: string) {
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('READ_PLAN', plan); vi.stubEnv('FORECAST_BREAK', forecast);
}

type Mode = 'natural' | 'sink' | 'jump';
async function run(opts: { concept: string; coverage: string; seed: number; formation?: string; key?: Mode; plan?: string; forecast?: string }) {
  referenceEngine(opts.plan ?? '1', opts.forecast ?? '1');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { goTo } = await import('../src/sim/behaviors/common.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: opts.coverage, concept: opts.concept, seed: opts.seed, roster: 7, formation: opts.formation ?? 'gun_doubles_11', flip: false }));
  const dir = sim.attackDir(sim.offense[0].team), ss = sim.offAlign.strongSign;
  const ref = (a: any) => sim.offAlign.refOf[a.slot] ?? a.slot;
  const s1 = sim.offense.find((o: any) => ref(o) === 'S1'), s2 = sim.offense.find((o: any) => ref(o) === 'S2');
  if (opts.key && opts.key !== 'natural') {
    // The strong corner (the flat defender in Cover 2) plays his coverage to 0.6 s, then sinks under the corner
    // route or jumps the flat.
    const cb = sim.defense.find((d: any) => d.slot === 'CB_S'), orig = cb.behavior;
    cb.behavior = { kind: orig.kind, update: (a: any, s: any) => s.t < 0.6 ? orig.update(a, s)
      : goTo(a, opts.key === 'sink' ? { x: s.los + 15 * dir, y: s1.pos.y } : { x: s.los + 3 * dir, y: s2.pos.y + 3 * ss }, { speed: 0.95 }) };
  }
  let qb: any = null, target: any = null, movedOn = -1;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (qb && movedOn < 0 && qb.readIdx > 0) movedOn = sim.t;
    if (!air && sim.ball.kind === 'air' && !target) target = sim.ball.target;
  };
  sim.run();
  return { plan: qb?.plan?.style ?? null, keyRead: qb?.keyRead ?? null, throwAt: sim.throwAt as number, target: target ? ref(target) as string : null, movedOn };
}

describe('READ_PLAN', () => {
  it('off: no plan, the hand-written progression', async () => {
    const r = await run({ concept: 'corner_flat', coverage: 'cover2', seed: 1, plan: '0' });
    expect(r.plan).toBeNull();
  });

  it('a defender key: the flat defender sinking gives the flat on rhythm; jumping it gives the high route', async () => {
    const sink = [], jump = [];
    for (const seed of [1, 2, 3]) {
      sink.push(await run({ concept: 'corner_flat', coverage: 'cover2', seed, key: 'sink' }));
      jump.push(await run({ concept: 'corner_flat', coverage: 'cover2', seed, key: 'jump' }));
    }
    for (const r of sink) {
      expect(r.plan).toBe('defender_key');
      expect(r.keyRead?.throwTo).toBe('low');
      expect(r.target).toBe('S2');
      expect(r.throwAt).toBeLessThan(2.4);
    }
    // He reads him from his own delayed picture with his skill's noise: most, not all, jumps are read.
    expect(jump.filter((r) => r.keyRead?.throwTo === 'high').length).toBeGreaterThanOrEqual(2);
    expect(jump.filter((r) => r.target !== 'S2').length).toBeGreaterThanOrEqual(2);
  });

  it('a covered first read moves him on in rhythm (press-man quick outs: #1 covered, #2 thrown)', async () => {
    for (const seed of [1, 2, 3]) {
      const r = await run({ concept: 'quick_outs', coverage: 'cover1', seed });
      expect(r.plan).toBe('pure');
      expect(r.movedOn).toBeGreaterThan(0);
      expect(r.movedOn).toBeLessThan(2.3);
      expect(r.target).not.toBe('S1');
      expect(r.throwAt).toBeLessThan(2.8);
    }
  });

  it('compiling a plan inside a game does not change that game: the same play, cold cache then warm, is identical', async () => {
    referenceEngine('1', '1');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const once = () => {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'dagger', seed: 4, roster: 7, formation: 'gun_trips_11', flip: true }));
      sim.run();
      return { t: sim.throwAt, end: sim.t, qb: [sim.qb.pos.x, sim.qb.pos.y], tgt: sim.ball.target?.slot ?? null, events: sim.events?.length ?? null };
    };
    const cold = once(), warm = once();
    expect(warm).toEqual(cold);
  });
});

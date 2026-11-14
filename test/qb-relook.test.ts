/** QB_RELOOK (behaviors/qb.ts): running out of reads gives him nothing for free. Staged: a play is run to 0.3 s after
 * he sets with nobody priced (so nothing is thrown), then his progression is put at its end and, from that tick, exactly
 * one man is made a throw he would take: his second read (every other man is priced at nothing). The rush stands at the
 * line so only his reading acts.
 * Off: on the tick his reads run out he takes that man from a look round the whole field, wherever his eyes are.
 * On: he goes back to his first read; the throw to the second read starts only once his progression has come back to
 * him, at least one look later, and when it starts he is the man the read loop is on. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function stage(flag: string) {
  vi.resetModules();
  vi.stubEnv('QB_RELOOK', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { stand } = await import('../src/sim/behaviors/common.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'dagger', seed: 3, roster: 3, formation: 'gun_doubles_11', flip: false }));
  const qb = sim.qb, beh: any = qb.behavior;
  for (const d of sim.defense) if (d.behavior.kind === 'rush') d.behavior = { kind: 'idle', update: () => stand(0) };
  const evaluate = beh.evaluate.bind(beh);
  beh.evaluate = () => null;
  let setAt = -1;
  for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh; i++) {
    sim.tick();
    if (setAt < 0 && beh.phase === 'set') setAt = sim.t;
    if (setAt >= 0 && sim.t >= setAt + 0.3) break;
  }
  expect(setAt).toBeGreaterThan(0);
  expect(beh.reads.length).toBeGreaterThanOrEqual(3);
  const man = beh.reads[1];
  // From here: his progression is at its end, and only his second read is a throw he would take.
  beh.readIdx = beh.reads.length;
  beh.ready = () => true;
  beh.evaluate = (a: any, s: any, r: any, u: number) => {
    const ev = evaluate(a, s, r, u);
    return ev ? { ...ev, P: r === man ? 0.95 : 0.01, intRisk: 0, value: r === man ? 1 : -1 } : null;
  };
  const t0 = sim.t;
  let started: { dt: number; target: any; onRead: boolean } | null = null, firstIdx: number | null = null;
  const startThrow = beh.startThrow.bind(beh);
  beh.startThrow = (a: any, s: any, ev: any) => {
    started ??= { dt: +(sim.t - t0).toFixed(2), target: ev.target, onRead: beh.reads[beh.readIdx] === ev.target };
    return startThrow(a, s, ev);
  };
  for (let i = 0; i < 80 && !started && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh; i++) {
    sim.tick();
    firstIdx ??= beh.readIdx;
  }
  return { started: started as { dt: number; target: any; onRead: boolean } | null, firstIdx, man, relooks: beh.relooks as number, dt: sim.dt as number };
}

describe('QB_RELOOK', () => {
  it('off: the tick his reads run out he throws to the best man on the field, wherever his progression is', async () => {
    const r = await stage('0');
    expect(r.started).not.toBeNull();
    expect(r.started!.target).toBe(r.man);
    expect(r.started!.dt).toBeLessThanOrEqual(r.dt + 1e-9);
    expect(r.started!.onRead).toBe(false);
  });

  it('on: he goes back to his first read, and throws to the man only when his progression has come back to him', async () => {
    const r = await stage('1');
    expect(r.relooks).toBeGreaterThanOrEqual(1);
    expect(r.firstIdx).toBe(0);
    expect(r.started).not.toBeNull();
    expect(r.started!.target).toBe(r.man);
    expect(r.started!.onRead).toBe(true);
    // At least one look at the first read comes before it.
    expect(r.started!.dt).toBeGreaterThan(0.2);
  });
});

/** REP_SEEN (engagement.ts; experimental, off; PRO-INFO #3, #4, #7, #8): in the pass rep the rusher faces the QB as he
 * sees him, and the blocker protects the launch point from the call, not the QB's live spot. Fixture: four verticals
 * (nativeTraceSetup), Cover 2, seed 5, roster 1, on the engine defaults (the reference stack). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('REP_SEEN', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed: 5, roster: 1, formation: 'gun_doubles_11', flip: false }));
  // Per pass-rep tick: the rusher's requested facing against his bearing to the true QB.
  const off: number[] = [];
  const step = sim.world.step.bind(sim.world);
  sim.world.step = (intents: any[], dt: number) => {
    for (const e of sim.engagements) {
      const f = intents[e.defender.idx]?.facing;
      if (e.type !== 'pass' || f === undefined) continue;
      const d = e.defender, q = sim.qb.pos, b = Math.atan2(q.y - d.pos.y, q.x - d.pos.x) - f;
      off.push(Math.abs(Math.atan2(Math.sin(b), Math.cos(b))));
    }
    return step(intents, dt);
  };
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0) sim.tick();
  return { off, done: sim.t };
}

describe('REP_SEEN', () => {
  it('the rusher faces the QB he sees: on, his facing departs from the true bearing; off, it is the true bearing', async () => {
    const on = await run('1'), off = await run('0');
    expect(on.off.length).toBeGreaterThan(20);
    expect(Math.max(...on.off)).toBeGreaterThan(1e-3);
    expect(Math.max(...off.off.slice(0, 5))).toBeLessThan(1e-9);
  });

  it('is off unless set', async () => {
    vi.resetModules(); vi.stubEnv('REP_SEEN', '0');
    expect((await import('../src/sim/engagement.js')).REP_SEEN).toBe(false);
  });
});

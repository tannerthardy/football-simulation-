/** KEY_DEPTH (defense.ts, experimental, off): an interior lineman answering his
 * key's step steps upfield at his own read-step pace instead of running at the
 * man's spot; his requested upfield speed while on the key step is lower. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function upfieldRequest(flag: string) {
  vi.stubEnv('KEY_DEPTH', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  let sum = 0, n = 0;
  for (let seed = 1; seed <= 4; seed++) for (const concept of ['iz_strong', 'oz_strong']) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip }) as any);
    const dir = sim.attackDir(sim.offense[0].team);
    while (sim.phase === 'live' && sim.t < 0.8) { sim.tick();
      for (const d of sim.defense) if (/^(DE|DT)/.test(d.slot) && !d.engagement && d.tags.has('key-step')) { sum += -sim.intents[sim.agents.indexOf(d)].vel.x * dir; n++; } }
  }
  return { mean: sum / Math.max(n, 1), n };
}

describe('KEY_DEPTH: the read step is a step upfield, not a charge', () => {
  it('free interior linemen on the key step request less upfield speed with the flag', async () => {
    const on = await upfieldRequest('1'), off = await upfieldRequest('0');
    expect(off.n).toBeGreaterThan(20);
    expect(on.mean).toBeLessThan(off.mean - 0.3);
  }, 120_000);
});

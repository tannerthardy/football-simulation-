/** FLAT_PRESS (engagement.ts, experimental, off): a lineman flattening on a
 * zone step keeps pressing into the man (his read step) instead of asking to
 * hold his contact depth; engaged linemen request more upfield speed. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function engagedUp(flag: string) {
  vi.stubEnv('FLAT_PRESS', flag); vi.stubEnv('KEY_DEPTH', '1'); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  let sum = 0, n = 0;
  for (let seed = 1; seed <= 4; seed++) for (const concept of ['iz_strong', 'oz_strong']) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip }) as any);
    const dir = sim.attackDir(sim.offense[0].team);
    while (sim.phase === 'live' && sim.t < 1.2) { sim.tick();
      for (const d of sim.defense) if (/^(DE|DT)/.test(d.slot) && d.engagement?.type === 'run') { sum += -sim.intents[sim.agents.indexOf(d)].vel.x * dir; n++; } }
  }
  return { mean: sum / Math.max(n, 1), n };
}

describe('FLAT_PRESS: flatten and press', () => {
  it('engaged linemen ask for more upfield speed with the flag', async () => {
    const on = await engagedUp('1'), off = await engagedUp('0');
    expect(off.n).toBeGreaterThan(100);
    expect(on.mean).toBeGreaterThan(off.mean + 0.1);
  }, 120_000);
});

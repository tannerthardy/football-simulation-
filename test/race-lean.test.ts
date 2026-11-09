/** RACE_LEAN (engagement.ts, experimental, off): with ZONE_RUN, a lineman racing a
 * reach leans into the man at his read step instead of pressing at 1.5 yd/s;
 * engaged linemen request less upfield speed. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function engagedUp(flag: string) {
  vi.stubEnv('RACE_LEAN', flag); vi.stubEnv('ZONE_RUN', '1'); vi.stubEnv('KEY_DEPTH', '1'); vi.resetModules();
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

describe('RACE_LEAN: race at a lean', () => {
  it('engaged linemen ask for less upfield speed with the flag', async () => {
    const on = await engagedUp('1'), off = await engagedUp('0');
    expect(off.n).toBeGreaterThan(100);
    expect(on.mean).toBeLessThan(off.mean - 0.1);
  }, 120_000);
});

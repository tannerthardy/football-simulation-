import { afterEach, describe, expect, it, vi } from 'vitest';

// DRAW_READ is read when recognition.ts loads, so each arm imports the engine fresh.
async function draws(flag: string) {
  vi.resetModules();
  vi.stubEnv('DRAW_READ', flag);
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { drawReadEnabled } = await import('../src/sim/recognition.js');
  let beforeGive = 0, linebackers = 0;
  for (const coverage of ['cover3', 'cover2', 'cover1']) for (let seed = 1; seed <= 8; seed++) for (const flip of [false, true]) {
    const sim = new PlaySim(nativeTraceSetup({ coverage, concept: 'draw', seed, roster: 7, formation: 'gun_doubles_11', flip }));
    const lbs = sim.defense.filter(d => d.slot.startsWith('LB'));
    const was = new Map(lbs.map(l => [l, 'unsure' as string]));
    const step = sim.tick.bind(sim);
    (sim as any).tick = () => {
      step();
      for (const l of lbs) {
        const r = l.recog!.read;
        // Changed to run on what the line shows, before his own picture of the ball in the back's hands.
        if (was.get(l) === 'pass' && r === 'run' && !(l.recog as any).sawGive) beforeGive++;
        was.set(l, r);
      }
    };
    sim.run();
    linebackers += lbs.length;
  }
  return { enabled: drawReadEnabled(), beforeGive, linebackers };
}
afterEach(() => vi.unstubAllEnvs());

describe('DRAW_READ: a committed pass read yields to a line that turns to run blocking', () => {
  it('backers who read pass on a draw change to run before seeing the give only with the re-read', async () => {
    const on = await draws('1'), off = await draws('0');
    expect(on.enabled).toBe(true);
    expect(off.enabled).toBe(false);
    // Off, a committed pass read changes only on the posterior, which the
    // situation prior holds above the threshold until he sees the give.
    expect(off.beforeGive).toBe(0);
    expect(on.beforeGive).toBeGreaterThan(on.linebackers / 3);
  }, 120_000);
});

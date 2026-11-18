/** SQUAT_TOPDOWN (src/sim/coverage/rules.ts, `squatTopDown`; experimental, off): the Cover 2 squat corner sinks under
 * a climbed #2's out (flood's sail) instead of locking onto the flat. On the engine defaults (the stack's flags stubbed
 * on, as quick-hitch.test.ts does), with C2_APEX on in both arms. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** Depth (yd past the line) of the strong squat corner at the throw (or 3.0 s). */
async function depth(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('C2_APEX', '1');
  vi.stubEnv('SQUAT_TOPDOWN', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover2_match', concept: 'flood', seed, roster: seed, formation: 'gun_trips_11', flip: false }));
  const dir = sim.attackDir(sim.offense[0].team);
  const two = sim.offense.find((r) => r.slot === sim.offAlign.numbering.S2)!;
  const d = sim.defense.find((x) => (x.behavior as { rule?: string } | undefined)?.rule === 'sink_corner'
    && Math.sign(x.pos.y - sim.ballY) === Math.sign(two.pos.y - sim.ballY))!;
  let at = NaN;
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); if (Number.isNaN(at) && (sim.throwAt >= 0 || sim.t >= 3)) at = (d.pos.x - sim.los) * dir; };
  sim.run();
  return at;
}

describe('SQUAT_TOPDOWN', () => {
  it('against flood (#2 sail, #3 flat) the squat corner is deeper at the throw than the flat lock left him', async () => {
    let off = 0, on = 0;
    for (const seed of [1, 2, 3]) { off += await depth(false, seed); on += await depth(true, seed); }
    expect(on).toBeGreaterThan(off + 3);
  });
});

/** MUSH_MATCH (src/sim/coverage/rules.ts `mush`; experimental, off): the Book / Stubbie nickel matches #2's flat as taught
 * (HNFL-050: "#3 up/in: match #2; #2 fast flat: match it"). slant_flat from trips against Cover 6 Book: #2 runs the flat,
 * #3 a hook after a slow outside release. Off, the nickel traps #3 and then zones; on, he leaves the trap when #3 turns
 * up and matches #2, and he is near #2 when the ball arrives. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(on: boolean) {
  vi.stubEnv('MUSH_MATCH', on ? '1' : '0');
  vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover6_book', concept: 'slant_flat', seed: 1, roster: 1, formation: 'gun_trips_11', flip: false }));
  const modes = new Set<string>();
  let near = Infinity;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    const nb = sim.defense.find((d: any) => d.behavior?.rule === 'mush');
    const two = sim.offense.find((r: any) => r.slot === sim.offAlign.numbering.S2);
    if (!nb || !two) return;
    if (nb.behavior.state?.mode) modes.add(nb.behavior.state.mode);
    if (sim.ball.kind === 'air' && sim.t >= sim.ball.arrivalT - 0.05 && near === Infinity) near = Math.hypot(nb.pos.x - two.pos.x, nb.pos.y - two.pos.y);
  };
  const res = sim.run();
  return { modes, near, yards: res.yards };
}

describe('MUSH_MATCH', () => {
  it('leaves the trap on #3 when #3 turns up and matches #2 in the flat', async () => {
    const off = await run(false), on = await run(true);
    expect(off.modes.has('match2')).toBe(false);
    expect(on.modes.has('match2')).toBe(true);
    expect(on.yards).toBeLessThan(off.yards);
  }, 120000);
});

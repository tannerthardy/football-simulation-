/** SCREW (src/sim/coverage/rules.ts, `qSafety`; experimental, off): on a play fake the quarters safety takes #2 up and
 * out instead of easing into his alley, and hands him back to his #2-to-1 key when #2 breaks in. On the engine defaults
 * (the stack's flags stubbed on, as quick-hitch.test.ts does). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** The modes the quarters safeties' rule passed through on a play-action shot. */
async function modes(on: boolean, seed: number) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('SCREW', on ? '1' : '0');
  vi.stubEnv('QB_ROLE_PATH', '0'); // engine-88 (QB landing, pinned test-only): with the deep man priced through his role the pa_shot is thrown earlier and the safety plays the ball (a behavior with no recordedRule); Coverage / Rules to re-record with it on
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover4', concept: 'pa_shot', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  type Rec = { rule?: string; recordedRule?: (t: number) => { mode: string | null } };
  const safeties = sim.defense.filter((d) => (d.behavior as Rec | undefined)?.rule === 'q_safety');
  const seen = new Set<string>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); for (const d of safeties) seen.add(String((d.behavior as Rec).recordedRule!(-1).mode)); };
  sim.run();
  return seen;
}

describe('SCREW', () => {
  it('the quarters safety takes #2 on the fake only with the flag on, and returns to his key when #2 breaks in', async () => {
    for (const seed of [1, 2]) expect((await modes(false, seed)).has('screw')).toBe(false);
    const on = await modes(true, 1);
    expect(on.has('screw')).toBe(true);
    expect(on.has('one')).toBe(true);
  });
});

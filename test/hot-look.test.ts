/** HOT_LOOK (behaviors/qb.ts; on since engine-41): the hot throw costs the look. Fixture from
 * docs/reviews/2026-11-12-hot-look.md: play-action shot against Cover 1 from gun doubles, seed 2, flipped, where the
 * rush sets off his alarm at 2.75 s with his eyes about 70 degrees from the open outside receiver (W1). Restated
 * under DEF_BELIEF (engine-43): the trips-sail play used under LINE_START (engine-42) still looks first and throws W1,
 * but after the look the window under DEF_BELIEF no longer clears the hot bar, and the ball comes out through the
 * read logic 0.6 s later, so it has no hot pick to check. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(hotLook: string) {
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('HOT_LOOK', hotLook);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'pa_shot', seed: 2, roster: 2, formation: 'gun_doubles_11', flip: true }));
  let qb: any = null, target: any = null;
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    const air = sim.ball.kind === 'air';
    tick();
    if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
    if (!air && sim.ball.kind === 'air' && !target) target = sim.ball.target;
  };
  sim.run();
  const ref = (slot: string) => sim.offAlign.refOf[slot] ?? slot;
  return { alarmAt: qb.alarmAt as number, pick: { ...qb.hotPick, ref: ref(qb.hotPick.slot) }, looks: qb.hotLooks as number,
    release: sim.throwAt as number, target: target ? ref(target.slot) : null };
}

describe('HOT_LOOK', () => {
  it('off: on the alarm tick he throws to a man his eyes are not on', async () => {
    const r = await run('0');
    expect(r.pick.ref).toBe('W1');
    expect(r.target).toBe('W1');
    expect(r.pick.t).toBeCloseTo(r.alarmAt, 5);
    expect(r.pick.gazeOff).toBeGreaterThan(60);
  });

  it('on: his eyes go there first (head turn and a glance), and the throw is judged on what he then sees', async () => {
    const r = await run('1');
    expect(r.looks).toBe(1);
    expect(r.target).toBe('W1');
    expect(r.pick.t - r.alarmAt).toBeGreaterThan(0.3);
    expect(r.pick.gazeOff).toBeLessThan(30);
    expect(r.release - r.alarmAt).toBeGreaterThan(0.7);
  });
});

/** QB_SEEN_REC (behaviors/qb.ts): his own receivers as he has them, not as they truly are. Staged: a play is run to
 * 0.3 s after he sets and two things are then done to a receiver he can price.
 * 1. The receiver is moved 6 yd with no time passing. Off, where the quarterback "has" him moves with him. On, it does
 *    not: it is his forecast of the man.
 * 2. The receiver goes to the ground (his support state is held down, the scene) and the play runs on. Off, he stops
 *    being a target on that tick. On, he is still priced until the quarterback's delayed picture shows him down, and
 *    is then not a target. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function stage(flag: string) {
  vi.resetModules();
  vi.stubEnv('QB_SEEN_REC', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'curl_flat', seed: 1, roster: 1, formation: 'gun_doubles_11', flip: false }));
  const qb = sim.qb, beh: any = qb.behavior;
  let setAt = -1;
  for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh; i++) {
    sim.tick();
    if (setAt < 0 && beh.phase === 'set') setAt = sim.t;
    if (setAt >= 0 && sim.t >= setAt + 0.3) break;
  }
  expect(setAt).toBeGreaterThan(0);
  const r = sim.offense.find((o: any) => o !== qb && o.slot !== 'RB' && beh.evaluate(qb, sim, o, 0));
  expect(r).toBeTruthy();
  // 1. Moved with no time passing.
  const before = { ...beh.has(sim, r) }, was = { ...r.body.pos };
  r.body.pos = { ...was, x: was.x + 6 };
  const after = { ...beh.has(sim, r) };
  r.body.pos = was;
  const moved = Math.hypot(after.x - before.x, after.y - before.y);
  // 2. He goes down; no throw is started while the scene is read.
  expect(r.body.support).toBeTruthy();
  beh.startThrow = () => {};
  const priced: boolean[] = [];
  for (let i = 0; i < 12 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh; i++) {
    r.body.support.state = 'down';
    priced.push(!!beh.evaluate(qb, sim, r, 0));
    sim.tick();
  }
  return { moved, priced };
}

describe('QB_SEEN_REC', () => {
  it('off: he has a receiver where the receiver truly is, and knows he is down the tick he falls', async () => {
    const { moved, priced } = await stage('0');
    expect(moved).toBeCloseTo(6, 6);
    expect(priced[0]).toBe(false);
  });

  it('on: he has him where his forecast does, and learns he is down from his delayed picture', async () => {
    const { moved, priced } = await stage('1');
    expect(moved).toBe(0);
    expect(priced[0]).toBe(true);
    expect(priced.length).toBeGreaterThan(8);
    expect(priced[priced.length - 1]).toBe(false);
    // Once he has seen him down he does not price him again.
    const first = priced.indexOf(false);
    expect(priced.slice(first).every((p) => !p)).toBe(true);
  });
});

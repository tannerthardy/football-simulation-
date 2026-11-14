/** QB_SEEN_MAN (sim/qbmind.ts): where the quarterback expects a man defender he is not looking at. He expects him on
 * his receiver. Staged: a cover-1 play is run to 0.3 s after he sets; the receiver a man defender is assigned to is
 * then moved 6 yd from where he was, with no time passing, so the quarterback's own forecast of that receiver cannot
 * have followed. Off, his expectation of the defender moves with the receiver's true position (he knows where a man he
 * has not seen has gone). On, it does not move: it follows his own forecast of the receiver. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function moved(flag: string): Promise<{ shift: number; pMan: number }> {
  vi.resetModules();
  vi.stubEnv('QB_SEEN_MAN', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'comebacks', seed: 2, roster: 2, formation: 'gun_doubles_11', flip: false }));
  const qb = sim.qb, beh: any = qb.behavior, mind: any = sim.qbMind;
  let setAt = -1;
  for (let i = 0; i < 400 && sim.phase === 'live' && sim.carrier === qb && qb.behavior === beh; i++) {
    sim.tick();
    if (setAt < 0 && beh.phase === 'set') setAt = sim.t;
    if (setAt >= 0 && sim.t >= setAt + 0.3) break;
  }
  expect(setAt).toBeGreaterThan(0);
  // The defender whose expected position depends most on a receiver: try each receiver, keep the largest response.
  let shift = 0;
  for (const r of sim.offense) {
    if (r === qb) continue;
    const before = sim.defense.map((d: any) => mind.expectedPos(d));
    const was = { ...r.body.pos };
    r.body.pos = { ...r.body.pos, x: was.x + 6 };
    sim.defense.forEach((d: any, i: number) => { const e = mind.expectedPos(d); shift = Math.max(shift, Math.hypot(e.x - before[i].x, e.y - before[i].y)); });
    r.body.pos = was;
  }
  return { shift, pMan: mind.pMan() };
}

describe('QB_SEEN_MAN', () => {
  it('off: his expectation of an unseen man defender follows the receiver\'s true position', async () => {
    const { shift, pMan } = await moved('0');
    expect(pMan).toBeGreaterThan(0.2);
    // Moves by the receiver's 6 yd times the weight he puts on a coverage that has a man on him.
    expect(shift).toBeGreaterThan(1);
  });

  it('on: it does not; it follows his own forecast of the receiver', async () => {
    const { shift, pMan } = await moved('1');
    expect(pMan).toBeGreaterThan(0.2);
    expect(shift).toBe(0);
  });
});

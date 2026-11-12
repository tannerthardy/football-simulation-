/** BLOCK_SEEN (behaviors/qb.ts; experimental, off): the QB reads a rusher as
 * held only from what he sees -- an offensive body within arm's length of the
 * rusher and on his path -- never from the sim's engagement record or win
 * score. Repro (Rules + Coaching, 2026-11-12): all hitches vs Cover 2, seed 2
 * flipped, BACK_RELEASE on; off, the strong-side end inside 2 yd is credited
 * 1.3-1.65 s of block and the QB's estimate rises while he closes. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function repro(flag: string) {
  vi.stubEnv('BLOCK_SEEN', flag); vi.stubEnv('BACK_RELEASE', '1'); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  return new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'hitches', seed: 2, roster: 7, formation: 'gun_doubles_11', flip: true })) as any;
}

/** held() for every engaged defender within 3 yd of the QB while he has the ball. */
async function holds(flag: string) {
  const sim = await repro(flag), out: number[] = [];
  while (sim.phase === 'live' && sim.t < 6 && sim.throwAt < 0) {
    sim.tick();
    const qb = sim.qb, b = qb.behavior;
    if (sim.carrier !== qb || typeof b?.held !== 'function' || b.phase === 'snap') continue;
    for (const d of sim.defense)
      if (d.engagement && Math.hypot(d.pos.x - qb.pos.x, d.pos.y - qb.pos.y) <= 3) out.push(b.held(qb, d, sim));
  }
  return { sim, out };
}

describe('BLOCK_SEEN', () => {
  it('on the repro, a rusher inside 3 yd is credited at most a body width of block, not the win score', async () => {
    const off = await holds('0'), on = await holds('1');
    expect(off.out.length).toBeGreaterThan(0);
    expect(Math.max(...off.out)).toBeGreaterThan(1);           // the private score: over a second
    expect(on.out.length).toBeGreaterThan(0);
    expect(Math.max(...on.out)).toBeLessThan(0.65);            // (0.2 + width/2) at most
  });

  it('an engaged rusher whose blocker he sees beyond arm\'s length holds nothing', async () => {
    const sim = await repro('1');
    let d: any = null;
    while (sim.phase === 'live' && sim.t < 6 && sim.throwAt < 0 && !d) {
      sim.tick();
      d = sim.defense.find((x: any) => x.engagement && sim.qb.behavior.held(sim.qb, x, sim) > 0) ?? null;
    }
    expect(d).not.toBeNull();
    const qb = sim.qb, b = qb.behavior, blocker = d.engagement.blocker, felt = b.felt.bind(b);
    b.felt = (a: any, s: any, x: any) => {
      const p = felt(a, s, x);
      if (x !== blocker) return p;
      const r = felt(a, s, d).pos, u = { x: p.pos.x - r.x, y: p.pos.y - r.y }, L = Math.hypot(u.x, u.y) || 1;
      const k = (blocker.profile.reach + d.profile.radius + 0.2) / L;   // just beyond his arms, same direction
      return { ...p, pos: { x: r.x + u.x * k, y: r.y + u.y * k } };
    };
    expect(d.engagement).toBeTruthy();                           // the sim still has them engaged
    expect(b.held(qb, d, sim)).toBe(0);
  });
});

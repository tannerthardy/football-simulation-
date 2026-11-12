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

  it('a bull rush: a rusher driving his blocker back at 3 yd/s is paced at that rate, not read as a fresh sprint', async () => {
    const sim = await repro('1');
    while (sim.phase === 'live' && sim.t < 3 && sim.qb.behavior.phase !== 'set') sim.tick();
    const qb = sim.qb, b = qb.behavior;
    const d = sim.defense.find((x: any) => x.slot === 'DE_S') ?? sim.defense[0];
    const o = sim.offense.find((x: any) => x !== qb && x.profile.reach > 0.8) ?? sim.offense[1];
    const f = qb.body.facing + Math.PI * 0.75, u = { x: Math.cos(f), y: Math.sin(f) };    // the rush comes from here
    const at = 3.6, gap = 0.6;
    const rp = { x: qb.pos.x + u.x * at, y: qb.pos.y + u.y * at }, bp = { x: qb.pos.x + u.x * (at - gap), y: qb.pos.y + u.y * (at - gap) };
    const vel = { x: -u.x * 3, y: -u.y * 3 };
    const felt = b.felt.bind(b);
    b.felt = (a: any, s: any, x: any) => x === d ? { pos: rp, vel, age: 0.2, facing: f + Math.PI, stance: null }
      : x === o ? { pos: bp, vel, age: 0.2, facing: f, stance: null }
      : { pos: { x: 999, y: 999 }, vel: { x: 0, y: 0 }, age: 0.2, facing: 0, stance: null };
    const { timeToReach } = await import('../src/physics/reach.js');
    const sprint = timeToReach({ pos: rp, vel, profile: d.profile, speedScale: d.speedScale }, qb.pos, 0.8);
    const moving = { x: qb.vel.x, y: qb.vel.y }; qb.body.vel = { x: 0, y: 0 };
    const est = sprint + b.held(qb, d, sim);
    qb.body.vel = moving;
    const paced = (at - 0.8) / 3;
    expect(sprint).toBeLessThan(paced - 0.15);                    // a fresh sprint reads him early
    expect(est).toBeGreaterThanOrEqual(paced - 1e-9);              // paced at the rate he drives the blocker
    expect(est).toBeLessThan(paced + 0.6);                         // plus at most the way round the blocker's body
  });
});


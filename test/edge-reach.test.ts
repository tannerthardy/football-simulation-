/** EDGE_REACH (defense.ts PassRusher key read, run-fits.ts edge fit; experimental,
 * off): an edge whose key reaches out toward him (away from the ball) steps
 * with him from where he stands, and his edge fit never falls inside that
 * man's outside shoulder while the line flows his way. NFL play-side OZ edge
 * men are +0.69 yd outside their snap spot at 1.0 s; ours stepped inside.
 * Native outside-zone snaps, both flips: the end on the side the play goes. */
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.EDGE_SET = '0'; process.env.END_KEY = '0'; }); // engine-73: fixture recorded before EDGE_SET, END_KEY; Defense to re-record with it on

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function widen(flag: string, mode: 'vel' | 'lat' = 'lat') {
  vi.stubEnv('EDGE_REACH', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const out: number[] = [];
  for (let seed = 1; seed <= 6; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'oz_strong', seed, roster: 7, formation: 'ace_11', flip }));
    const rb = sim.offense.find((a: any) => a.slot === 'RB'), rb0 = rb.pos.y;
    const ends = sim.defense.filter((d: any) => /^DE/.test(d.slot)).map((d: any) => ({ d, y0: d.pos.y }));
    let v5 = new Map<any, number>();
    while (sim.phase === 'live' && sim.t < 1.0 - 1e-9) { sim.tick(); if (Math.abs(sim.t - 0.5) < 0.026) for (const e of ends) v5.set(e.d, e.d.vel.y); }
    const side = Math.sign(rb.pos.y - rb0); if (!side) continue;
    const play = ends.filter(({ y0 }: any) => (y0 - sim.ballY) * side > 0)[0]; if (!play) continue;
    out.push(mode === 'vel' ? (v5.get(play.d) ?? 0) * side : (play.d.pos.y - play.y0) * side);
  }
  out.sort((a, b) => a - b);
  return { n: out.length, median: out[Math.floor(out.length / 2)] };
}

describe('EDGE_REACH', () => {
  it('on: the play-side end steps out with the reach (0.5 s) and is wider by 1.0 s than off', async () => {
    const offV = await widen('0', 'vel'), onV = await widen('1', 'vel');
    const off = await widen('0'), on = await widen('1');
    expect(onV.n).toBeGreaterThan(6);
    expect(onV.median).toBeGreaterThan(0.5);
    expect(onV.median).toBeGreaterThan(offV.median + 0.5);
    expect(on.median).toBeGreaterThan(off.median + 0.1);
  });
});

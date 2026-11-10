/** READ_LEAN (recognition.ts lean, defense.ts unsure box backer and passPull;
 * experimental, off): a box backer acts on the picture he has. Still unsure,
 * his downhill step follows his own run/pass picture (the probability his
 * commit reads, without the prior); after a run read, a pass picture (the QB
 * deep after the fake, the line setting) scales his downhill attack back.
 * NFL box backers' run and dropback motion separate by 0.4 s; on zone play
 * action they come downhill at about 0.85 of their run pace by 1.0 s. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function downhill(flag: string, concepts: string[], at: number) {
  vi.stubEnv('READ_LEAN', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const v: number[] = [];
  for (const c of concepts) for (let seed = 1; seed <= 4; seed++) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: c, seed, roster: 7, formation: 'ace_11', flip }));
    const dir = sim.attackDir(sim.offense[0].team);
    const box = sim.defense.filter((d: any) => /^LB/.test(d.slot) && (d.pos.x - sim.los) * dir > 1.6 && (d.pos.x - sim.los) * dir <= 7);
    while (sim.phase === 'live' && sim.t < at - 1e-9) sim.tick();
    for (const d of box) v.push(-d.vel.x * dir);
  }
  v.sort((a, b) => a - b);
  return v[Math.floor(v.length / 2)];
}

describe('READ_LEAN', () => {
  it('on: box backers come downhill on a run and ease off on a dropback before the read; off: no separation yet', async () => {
    const offGap = await downhill('0', ['oz_strong'], 0.45) - await downhill('0', ['smash'], 0.45);
    const onGap = await downhill('1', ['oz_strong'], 0.45) - await downhill('1', ['smash'], 0.45);
    expect(onGap).toBeGreaterThan(offGap + 0.2);
  });
  it('on: on play action the pass picture pulls their downhill attack back by 1.0 s', async () => {
    const off = await downhill('0', ['pa_post_dig'], 1.0), on = await downhill('1', ['pa_post_dig'], 1.0);
    expect(on).toBeLessThan(off - 0.2);
  });
});

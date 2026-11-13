/** EXTEND (behaviors/qb.ts; experimental, off): no acceptable throw and a rusher he
 * feels -- he moves first, gives the play up legally as his decision-making lets
 * him, or protects the ball. noThrow is the hook the throw decision falls through to. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function setPlay(flag: string) {
  vi.stubEnv('EXTEND', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'hitches', seed: 2, roster: 7, formation: 'gun_doubles_11', flip: true })) as any;
  while (sim.phase === 'live' && sim.t < 3 && sim.qb.behavior.phase !== 'set') sim.tick();
  return sim;
}
const ctx = (sim: any) => ({ pressure: { time: 0.3, agent: sim.defense[0], dist: 2 }, u: 1, read: sim.qb.behavior.reads[0], reason: 'alarm' as const });
const ratings = (b: any, qb: any, dm: number) => { const r = qb.r.bind(qb); qb.r = (k: string) => k === 'decisionMaking' ? dm : r(k); };

describe('EXTEND', () => {
  it('outside the box with nobody open, a sound decision maker throws it away beyond the sideline', async () => {
    const sim = await setPlay('1'), qb = sim.qb, b = qb.behavior;
    qb.body.pos = { x: qb.pos.x, y: sim.ballY + 6 };          // outside the tackle box
    b.bestOption = () => null; ratings(b, qb, 0.8);
    b.noThrow(qb, sim, ctx(sim));
    expect(sim.ball.kind).toBe('air'); expect(sim.ball.throwaway).toBe(true);
    expect(Math.abs(sim.ball.intended.y - sim.ballY)).toBeGreaterThan(20);
  });

  it("trapped inside with nobody open, a sound decision maker throws at an eligible's feet; a poor one throws it away regardless", async () => {
    const sim = await setPlay('1'), qb = sim.qb, b = qb.behavior;
    b.bestOption = () => null; b.setDecide = () => null; ratings(b, qb, 0.8);
    b.noThrow(qb, sim, ctx(sim));
    expect(sim.ball.throwaway).toBe(true);
    expect(sim.ball.intended.z).toBe(0);                      // into a receiver's area, at his feet
    const sim2 = await setPlay('1'), qb2 = sim2.qb, b2 = qb2.behavior;
    b2.bestOption = () => null; b2.setDecide = () => null; b2.feetTarget = () => null; ratings(b2, qb2, 0.1);
    b2.noThrow(qb2, sim2, ctx(sim2));
    expect(sim2.ball.throwaway).toBe(true);                   // the rules then call grounding
  });

  it('with a man still worth throwing to, he does not give up the play: he evades or protects the ball', async () => {
    const sim = await setPlay('1'), qb = sim.qb, b = qb.behavior;
    b.bestOption = () => ({ P: 0.4, intRisk: 0.05, target: sim.offense[1] });
    let paced: number | undefined; const sd = b.setDecide.bind(b);
    b.setDecide = (a: any, s: any, r: any, need: any, pace: any) => { paced = pace; return sd(a, s, r, need, pace); };
    b.noThrow(qb, sim, ctx(sim));
    expect(sim.ball.kind).toBe('held');
    expect(paced).toBeGreaterThan(2.2);                       // his mobility's pace, not a set throw's
  });

  it('a mobile QB escapes faster than a statue', async () => {
    const pace = async (forty: number, elus: number) => {
      const sim = await setPlay('1'), qb = sim.qb, b = qb.behavior;
      qb.player.measurables.forty = forty; const r = qb.r.bind(qb); qb.r = (k: string) => k === 'elusiveness' ? elus : r(k);
      b.bestOption = () => ({ P: 0.4, intRisk: 0.05 }); let p = 0;
      b.setDecide = (_a: any, _s: any, _r: any, _n: any, pc: number) => { p = pc; return null; };
      b.noThrow(qb, sim, ctx(sim)); return p;
    };
    expect(await pace(4.5, 0.9)).toBeGreaterThan(await pace(5.1, 0.1) + 1.5);
  });
});

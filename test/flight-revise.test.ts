// FLIGHT_REVISE (Flex, 2026-11-25; Integration's scope of the defense's flight, item (a)): with the estimator on for the
// defense, a defender's flight comes from his own samples (the release seed alone is a direction, not a flight) and each new
// sample revises it, so it closes on the ball as he watches. Off the defense estimator nothing changes (BALL_EST default).
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function watchErrors(flag: string) {
  vi.stubEnv('BALL_EST', '2049'); vi.stubEnv('FLIGHT_REVISE', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { rememberedFlight } = await import('../src/sim/possession-read.js');
  const late: number[] = [], seedOnly: boolean[] = [];
  for (let seed = 1; seed <= 6; seed++) {
    const sim = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed, roster: 7, formation: 'gun_doubles_11', flip: false })) as any;
    let D: any = null, landing: any = null;
    for (let i = 0; i < 400 && sim.phase === 'live'; i++) {
      sim.tick();
      if (sim.throwAt >= 0 && !D && sim.ball.kind === 'air') {
        landing = sim.ballPath.at(-1);
        D = sim.defense.filter((d: any) => !/^(DE|DT|NT)/.test(d.slot)).sort((a: any, b: any) => Math.hypot(a.pos.x - landing.x, a.pos.y - landing.y) - Math.hypot(b.pos.x - landing.x, b.pos.y - landing.y))[0];
      }
      if (!D || sim.ball.kind !== 'air') continue;
      const first = sim.ballEstimates.firstSeenAt(D), path = rememberedFlight(D, 0);
      if (first === undefined && path?.length) seedOnly.push(true); // a flight before any sample of his own
      if (first !== undefined && sim.t - first >= 0.4 && path?.length) {
        const at = path.reduce((b: any, p: any) => Math.abs(p.t - landing.t) < Math.abs(b.t - landing.t) ? p : b, path[0]);
        late.push(Math.hypot(at.x - landing.x, at.y - landing.y));
      }
    }
  }
  late.sort((a, b) => a - b);
  return { median: late[Math.floor(late.length / 2)], n: late.length, seedOnly: seedOnly.length };
}

describe('FLIGHT_REVISE: a defender\'s flight from his own looks', () => {
  it('after 0.4 s of watching his flight is close to the ball; before, it was the frozen early guess', async () => {
    const off = await watchErrors('0'), on = await watchErrors('1');
    expect(on.n).toBeGreaterThan(10);
    expect(on.median).toBeLessThan(1.5);
    expect(off.median).toBeGreaterThan(5);
  }, 300_000);
  it('no flight from the release seed alone', async () => {
    expect((await watchErrors('1')).seedOnly).toBe(0);
  }, 300_000);
});

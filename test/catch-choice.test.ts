/** CATCH_CHOICE (catch-choice.ts): on a forced outside go ball he plays the point on the ball's path he chooses, not
 * always the earliest reachable one. With room he keeps his stride: he meets the ball later on its path and faster than
 * the default, which brakes to the first point under his catch height.
 * Panel: four_verts from gun doubles against Cover 1 / 2 / 3 / 4, seeds 1-16; the QB is made to throw the outside go
 * when it is ready between 2.2 and 2.9 s. A play counts only when that ball is thrown to that go (a later checkdown is
 * not a forced go ball). Each play is paired with itself across the two arms (same receiver, same throw time, and a
 * real meeting in both: not a ball that fell untouched), so the claim is per play: with the choice he never meets the
 * ball earlier on its path, and where he chooses a later point he is moving faster at the meeting on most plays (75%)
 * and on average (by 0.3 yd/s or more). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The suite pins the pre-promotion engine; this choice depends on how the current engine's defenders play the ball,
// so the test runs on the current defaults (the reference stack's 'on' flags), as vitest.config.ts asks.
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function meetings(flag: string) {
  for (const k of stackOn) vi.stubEnv(k, '1');
  // The claim is about the choice on the receiver who reads the true flight. Since engine-70 the default receiver reads
  // his own sight (BALL_EST 6145); the choice on that receiver is an open design question (docs/reviews/
  // 2026-11-15-catch-closure.md, the feet's goal), so this test pins the estimator off.
  vi.stubEnv('BALL_EST', '0');
  vi.stubEnv('CATCH_CHOICE', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { RouteRunner } = await import('../src/sim/behaviors/receiver.js');
  const out: { key: string; slot: string; tt: number; early: number; speed: number; type: string }[] = [];
  for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (let seed = 1; seed <= 16; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const by = sim.ballY;
    const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
    const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
      return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
    let qb: any = null, forced = false, arr = NaN, R: any = null, target: any = null, ft = NaN, tt = NaN;
    let met: { key: string; slot: string; tt: number; early: number; speed: number; type: string } | null = null;
    const tb = sim.throwBall.bind(sim);
    // Only the forced ball to the forced go: the QB may still pull it down and throw elsewhere later.
    sim.throwBall = (q: any, r: any, v0: any, pt: any, a: number) => {
      if (forced && R === null && r === target && sim.t - ft < 0.8) { arr = a; R = r; tt = sim.t; }
      return tb(q, r, v0, pt, a);
    };
    const ev0 = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => {
      if (R && !met && ['secure', 'catch', 'pbu', 'miss', 'drop', 'incomplete', 'deflection', 'interception'].includes(type)) met = { key: `${coverage}/${seed}`, slot: R.slot, tt, early: arr - sim.t, speed: Math.hypot(R.vel.x, R.vel.y), type };
      return ev0(type, a, b, note);
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (qb && !forced && sim.throwAt < 0 && qb.phase === 'set' && sim.t >= 2.2 && sim.t <= 2.9) {
        const go = gos.find((r: any) => qb.ready(r, sim)); const ev = go ? qb.evaluate(sim.qb, sim, go, 0) : null;
        if (ev) { forced = true; target = go; ft = sim.t; qb.startThrow(sim.qb, sim, ev); } } };
    sim.run();
    if (met) out.push(met);
  }
  return out;
}

describe('CATCH_CHOICE', () => {
  it('on forced go balls, per play: he never meets the ball earlier, and where he chooses a later point he is faster', async () => {
    const off = await meetings('0'), on = await meetings('1');
    const pairs = off.map(o => [o, on.find(n => n.key === o.key)] as const)
      .filter((p): p is readonly [typeof off[number], typeof off[number]] => !!p[1] && p[1].slot === p[0].slot && Math.abs(p[1].tt - p[0].tt) < 0.05
        && p[0].type !== 'incomplete' && p[1].type !== 'incomplete');
    expect(pairs.length).toBeGreaterThanOrEqual(8);
    for (const [o, n] of pairs) expect(n.early).toBeLessThanOrEqual(o.early + 0.02);
    const chose = pairs.filter(([o, n]) => n.early < o.early - 0.02);
    expect(chose.length).toBeGreaterThanOrEqual(5);
    expect(chose.filter(([o, n]) => n.speed > o.speed).length / chose.length).toBeGreaterThanOrEqual(0.75);
    expect(chose.reduce((t, [o, n]) => t + n.speed - o.speed, 0) / chose.length).toBeGreaterThan(0.3);
  }, 600000);
});

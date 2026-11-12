/** CATCH_CHOICE (catch-choice.ts; experimental, off): on a forced outside go ball he plays the point on the ball's path
 * he chooses, not always the earliest reachable one. With room he keeps his stride: he meets the ball later on its path
 * and faster than the default, which brakes to the first point under his catch height. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The suite pins the pre-promotion engine; this choice depends on how the current engine's defenders play the ball,
// so the test runs on the current defaults (the reference stack's 'on' flags), as vitest.config.ts asks.
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function meetings(flag: string) {
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CATCH_CHOICE', flag); vi.resetModules();
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { RouteRunner } = await import('../src/sim/behaviors/receiver.js');
  const out: { early: number; speed: number }[] = [];
  for (const coverage of ['cover3', 'cover4']) for (let seed = 1; seed <= 4; seed++) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: 'four_verts', seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
    const by = sim.ballY;
    const runners = sim.offense.filter((o: any) => o.behavior instanceof RouteRunner && ['go', 'seam'].includes(o.behavior.route?.id));
    const gos = runners.filter((r: any) => { const side = Math.sign(r.pos.y - by) || 1;
      return !runners.some((o: any) => o !== r && (Math.sign(o.pos.y - by) || 1) === side && Math.abs(o.pos.y - by) > Math.abs(r.pos.y - by) + 0.5); });
    let qb: any = null, forced = false, arr = NaN, R: any = null, met: { early: number; speed: number } | null = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (q: any, r: any, v0: any, pt: any, a: number) => { if (forced && R === null) { arr = a; R = r; } return tb(q, r, v0, pt, a); };
    const ev0 = sim.event.bind(sim);
    sim.event = (type: string, a: any, b: any, note?: string) => {
      if (R && !met && ['secure', 'catch', 'pbu', 'miss', 'drop', 'incomplete', 'deflection', 'interception'].includes(type)) met = { early: arr - sim.t, speed: Math.hypot(R.vel.x, R.vel.y) };
      return ev0(type, a, b, note);
    };
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick();
      if (!qb && sim.qb.behavior.kind === 'qb-pass') qb = sim.qb.behavior;
      if (qb && !forced && sim.throwAt < 0 && qb.phase === 'set' && sim.t >= 2.3 && sim.t <= 2.6) {
        const go = gos.find((r: any) => qb.ready(r, sim)); const ev = go ? qb.evaluate(sim.qb, sim, go, 0) : null;
        if (ev) { forced = true; qb.startThrow(sim.qb, sim, ev); } } };
    sim.run();
    if (met) out.push(met);
  }
  const med = (v: number[]) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) / 2)];
  return { n: out.length, early: med(out.map(m => m.early)), speed: med(out.map(m => m.speed)) };
}

describe('CATCH_CHOICE', () => {
  it('on forced go balls he meets the ball later on its path and faster than the default', async () => {
    const off = await meetings('0'), on = await meetings('1');
    expect(off.n).toBeGreaterThanOrEqual(5); expect(on.n).toBeGreaterThanOrEqual(5);
    expect(on.early).toBeLessThan(off.early);
    expect(on.speed).toBeGreaterThan(off.speed);
  });
});

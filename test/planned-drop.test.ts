/** plannedDropX (called-drop.ts): the QB's planned depth for the call, the line's source for the drop (Flex's interior
 * set). Pure: from the call alone. At the snap spot until he has the ball, even to the set point over the drop's time,
 * then there; monotone. And it is his plan: the QB's drop clock starts at plannedSnapAt, and with QB_FOOTWORK bit 2
 * (the paced drop) his staged depth tracks the plan within a yard through the drop. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe('plannedDropX', () => {
  it('is the called drop: snap spot, even to the set point, then there; monotone', async () => {
    vi.resetModules();
    const { plannedDropX, plannedSnapAt, dropSpec } = await import('../src/sim/called-drop.js');
    const ball = { x: 30, y: 26.65 }, qb = { x: 25.4, y: 26.65 };
    for (const drop of ['quick', 'gun3', 'gun5', 'five', 'seven', 'pa'] as const) {
      const spec = dropSpec(drop, qb.x, ball.x, true), t0 = plannedSnapAt(true, qb, ball);
      expect(plannedDropX(drop, true, qb, ball, 0)).toBe(qb.x);
      expect(plannedDropX(drop, true, qb, ball, t0 + spec.time)).toBeCloseTo(spec.x, 9);
      expect(plannedDropX(drop, true, qb, ball, t0 + spec.time + 2)).toBeCloseTo(spec.x, 9);
      let prev = Infinity;
      for (let t = 0; t <= 4; t += 0.05) { const x = plannedDropX(drop, true, qb, ball, t); expect(x).toBeLessThanOrEqual(prev + 1e-12); prev = x; }
    }
  });
  it('is his plan: with the paced drop his depth stays within a yard of it', async () => {
    vi.resetModules();
    const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
    for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
    vi.stubEnv('CONCEPT_DROPS', '1'); vi.stubEnv('QB_FOOTWORK', '3');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
    const { plannedDropX } = await import('../src/sim/called-drop.js');
    let worst = 0, n = 0;
    for (const concept of ['smash', 'dagger', 'four_verts', 'stick']) for (const coverage of ['cover1', 'cover3']) {
      const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 7, formation: 'gun_doubles_11', flip: false }));
      const snap = { x: sim.qb.pos.x, y: sim.qb.pos.y }, ball = { x: sim.los, y: sim.ballY }, drop = sim.offCall.pass.drop;
      for (let i = 0; i < 80 && sim.phase === 'live' && sim.carrier === sim.qb; i++) {
        sim.tick(); const b: any = sim.qb.behavior;
        if (b?.kind !== 'qb-pass' || b.phase !== 'drop') continue;
        worst = Math.max(worst, Math.abs(sim.qb.pos.x - plannedDropX(drop, true, snap, ball, sim.t))); n++;
      }
    }
    expect(n).toBeGreaterThan(50);
    expect(worst).toBeLessThan(1);
  }, 300_000);
});

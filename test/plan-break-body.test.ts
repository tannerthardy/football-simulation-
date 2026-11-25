/** PLAN_BREAK_BODY (src/sim/behaviors/receiver.ts, src/sim/route-motion.ts bodyRunTime; experimental, off): a route's
 * planned break is his own body's run along his path to its first 35-degree turn, from the stance. The check is the
 * receiver's own arrival at that vertex on a staged rep (no throw): on, the plan is within 0.3 s of it; off, it was 0.42 s
 * (slant) and 0.56 s (quick hitch) early on this seed, and 0.7-0.9 s early against the route chart's later turn peak. Receiver behaviour is unchanged (his look keys lookBreakTime). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function planVsVertex(on: boolean, concept: string, route: string): Promise<{ plan: number; vertex: number; track: number[] }> {
  vi.resetModules();
  vi.stubEnv('PLAN_BREAK_BODY', on ? '1' : '0');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ concept, coverage: 'cover3', seed: 1, roster: 3, formation: 'gun_doubles_11', flip: false }));
  sim.throwBall = () => undefined;
  let snap: number | null = null, rcv: any = null, vtx: any = null, plan = NaN, vertex = NaN;
  const track: number[] = [];
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (snap === null && sim.phase !== 'pre' && sim.phase !== 'presnap') snap = sim.t;
    if (snap === null) return;
    if (!rcv) {
      rcv = sim.offense.find((a: any) => a.behavior?.kind === 'route' && String(a.behavior.route?.id) === route);
      if (rcv) {
        const b = rcv.behavior; plan = b.breakTime + (b.bornAt - snap);
        let prev = rcv.pos, dir: any = null;
        for (const q of b.path) { const sx = q.p.x - prev.x, sy = q.p.y - prev.y, l = Math.hypot(sx, sy); if (l < 1e-6) continue; const u = { x: sx / l, y: sy / l };
          if (dir && !vtx && u.x * dir.x + u.y * dir.y < Math.cos(35 * Math.PI / 180)) vtx = { x: prev.x, y: prev.y }; dir = u; prev = q.p; }
      }
    }
    if (rcv && vtx && Number.isNaN(vertex) && Math.hypot(rcv.pos.x - vtx.x, rcv.pos.y - vtx.y) < 0.6) vertex = sim.t - snap;
    if (rcv) track.push(rcv.pos.x);
    if (sim.t - snap > 3.5) sim.phase = 'dead';
  };
  sim.run();
  return { plan, vertex, track };
}

describe('PLAN_BREAK_BODY', () => {
  for (const [concept, route] of [['slant_flat', 'slant'], ['hitches', 'quick_hitch']] as const) {
    it(`${route}: on, the plan is within 0.3 s of his arrival at the turn and closer than off (off: 0.4 s or more early)`, async () => {
      const off = await planVsVertex(false, concept, route), on = await planVsVertex(true, concept, route);
      expect(Number.isNaN(on.vertex)).toBe(false);
      expect(Math.abs(on.vertex - on.plan)).toBeLessThan(0.3);
      expect(off.vertex - off.plan).toBeGreaterThan(0.35);
      expect(Math.abs(on.vertex - on.plan)).toBeLessThan(Math.abs(off.vertex - off.plan) - 0.2);
      // The receiver runs the same route either way: the plan's numbers change, not his body.
      expect(on.track).toStrictEqual(off.track);
    }, 60000);
  }
});

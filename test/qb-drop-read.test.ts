/** QB_DROP_READ (behaviors/qb.ts; experimental, off): the read runs in the drop and the ball can come out on a step.
 * The same plays off and on (a panel of gun dropback concepts whose drop is deeper than the three-step, against man
 * and zone, several seeds; same bodies, call and seed).
 * Off: no throw is started from the third step. On: on some plays a ready first read is thrown from the plant of the
 * third step, earlier than the same play's throw off, and from at least the three-step depth; no play's throw comes
 * later than it did off by more than a tick of noise in the median. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const SCENES: [string, string][] = [['drive', 'cover1'], ['drive', 'cover3'], ['mesh', 'cover1'], ['mesh', 'cover3'], ['smash', 'cover2'], ['corner_flat', 'cover3'], ['flood', 'cover3'], ['double_outs', 'cover1']];

async function stage(flag: string) {
  vi.resetModules();
  const flags: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
  for (const [k, v] of Object.entries(flags)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('QB_DROP_READ', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { dropSpec } = await import('../src/sim/called-drop.js');
  const rows = new Map<string, { t: number | null; step: string | null; behind: number | null; x3: number }>();
  for (const [concept, coverage] of SCENES) for (const seed of [1, 2, 3, 4, 5, 6]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
    let t: number | null = null, behind: number | null = null, step: string | null = null;
    const tb = sim.throwBall.bind(sim);
    sim.throwBall = (p: any, target: any, ...rest: any[]) => {
      if (p === sim.qb && t === null && target && !rest[3]) { t = sim.t; behind = sim.los - p.pos.x; step = p.behavior?.stepThrow ?? null; }
      return tb(p, target, ...rest);
    };
    sim.run();
    rows.set(`${concept}/${coverage}/${seed}`, { t, step, behind, x3: sim.los - dropSpec('gun3', 0, sim.los, true).x });
  }
  return rows;
}

describe('QB_DROP_READ', () => {
  it('on: a ready first read comes out on the third step, earlier than the same play off; nothing comes later', async () => {
    const off = await stage('0'), on = await stage('1');
    expect([...off.values()].some((r) => r.step !== null)).toBe(false);
    const third = [...on.entries()].filter(([, r]) => r.step === 'third');
    expect(third.length).toBeGreaterThanOrEqual(4);
    for (const [k, r] of third) {
      // Planted at the three-step depth (within the window and the travel of his motion), not short of it.
      expect(r.behind!, k).toBeGreaterThanOrEqual(r.x3 - 0.6);
      const o = off.get(k)!;
      if (o.t !== null) expect(r.t!, k).toBeLessThan(o.t);
    }
    // Over the panel, the throw does not come later: the median difference on plays thrown in both is at or under zero.
    const d = [...on.entries()].filter(([k, r]) => r.t !== null && off.get(k)!.t !== null).map(([k, r]) => r.t! - off.get(k)!.t!).sort((a, b) => a - b);
    expect(d.length).toBeGreaterThanOrEqual(30);
    expect(d[Math.floor(d.length / 2)]).toBeLessThanOrEqual(0.001);
  }, 240000);
});

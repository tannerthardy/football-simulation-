/** RUSH_RIP (engagement.ts resolveMove; experimental, off; requires RUSH_HANDS; PRO-INFO #9): the rip is his arm's force on the
 * blocker's hand and his body's bend, not a roll. Staged four-vertical pass reps on the engine defaults with RUSH_HANDS: under
 * RUSH_RIP no rip resolution makes a scripted
 * strike (world.strike) between the two bodies or changes the rep's control;
 * off, rips still strike or swing control. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function rips(flag: string) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) if (v === 'on') vi.stubEnv(k, '1');
  vi.stubEnv('PASS_OFF', '0'); // engine-70: as rush-bull; Flex to restate with PASS_OFF on
  vi.stubEnv('RUSH_HANDS', '1'); vi.stubEnv('RUSH_RIP', flag);
  // RUSH_BULL removes the pass rep's rated control drift (#10), so a control change at a rip is the rip's.
  vi.stubEnv('RUSH_BULL', '1');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  let resolutions = 0, scripted = 0, drift = 0;
  for (let roster = 1; roster <= 8; roster++) for (const seed of [1, 2, 3]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover1', concept: 'four_verts', seed, roster, formation: 'gun_doubles_11', flip: false }));
    const struck: any[] = []; const s0 = sim.world.strike.bind(sim.world);
    sim.world.strike = (a: any, b: any, ...r: any[]) => { struck.push([a, b]); return s0(a, b, ...r); };
    const last = new Map<any, { until: number; control: number }>();
    while (sim.phase === 'live' && sim.t < 3 && sim.throwAt < 0) {
      struck.length = 0;
      const pre = new Map([...sim.engagements].filter((e: any) => e.type === 'pass').map((e: any) => [e, e.control]));
      sim.tick();
      for (const e of sim.engagements) {
        if (e.type !== 'pass' || !pre.has(e)) continue;
        const l = last.get(e);
        if (l && e.moveUntil !== l.until && e.move === 'rip') {
          resolutions++;
          const mine = struck.some(([a, b]: any[]) => [a, b].includes(e.blocker.body) && [a, b].includes(e.defender.body));
          if (mine || e.control !== pre.get(e)) { scripted++; if (process.env.RB_PRINT) console.log('RB scripted', mine, pre.get(e), e.control); }
        }
        else if (!(e.moveUntil > sim.t) && e.control !== pre.get(e)) { drift++; if (process.env.RB_PRINT) console.log('RB drift', e.move, pre.get(e), e.control); }
        last.set(e, { until: e.moveUntil, control: e.control });
      }
    }
  }
  return { resolutions, scripted, drift };
}

describe('RUSH_RIP', () => {
  it('on: a rip makes no scripted strike and swings no control', async () => {
    const on = await rips('1');
    expect(on.resolutions).toBeGreaterThan(10);
    expect(on.scripted).toBe(0);
  }, 240_000);

  it('off: rips are rolled (strikes or control swings)', async () => {
    const off = await rips('0');
    expect(off.scripted).toBeGreaterThan(0);
  }, 240_000);
});

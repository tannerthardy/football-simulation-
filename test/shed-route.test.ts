/** SHED_ROUTE (engagement.ts, experimental, off): a first-level lineman working
 * off a block goes around the shoulder of the man actually on him, not across
 * the blocker's original drive line; fewer of his requests aim into the
 * blocker's body. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function intoBody(flag: string) {
  vi.stubEnv('SHED_ROUTE', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  let into = 0, n = 0;
  for (let seed = 1; seed <= 6; seed++) for (const concept of ['iz_strong', 'oz_strong']) for (const flip of [false, true]) {
    const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover3', concept, seed, roster: 7, formation: 'gun_doubles_11', flip }) as any);
    while (sim.phase === 'live' && sim.t < 4) { sim.tick(); const c = sim.carrier; if (!c || c === sim.qb) continue;
      for (const d of sim.defense) { const e = d.engagement; if (!e || e.type !== 'run' || !/^(DE|DT)/.test(d.slot) || !d.tags.has('shed-attempt')) continue;
        if (Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y) > 3.5) continue;
        const r = sim.intents[sim.agents.indexOf(d)].vel, bx = e.blocker.pos.x - d.pos.x, by = e.blocker.pos.y - d.pos.y;
        n++; if ((r.x * bx + r.y * by) / ((Math.hypot(r.x, r.y) || 1e-9) * (Math.hypot(bx, by) || 1)) > 0.7) into++; } }
  }
  return { share: into / Math.max(n, 1), n };
}

describe('SHED_ROUTE: work off around the shoulder', () => {
  it('fewer shedding linemen push straight into the blocker with the flag', async () => {
    const on = await intoBody('1'), off = await intoBody('0');
    expect(off.n).toBeGreaterThan(50);
    expect(on.share).toBeLessThan(off.share);
  }, 180_000);
});

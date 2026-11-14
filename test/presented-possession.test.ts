/** PRESENTED_POSSESSION (src/sim/possession-belief.ts; experimental, off), step 1 of the presented-possession spec.
 *  - off: nothing changes;
 *  - a dropback with no mesh (the back never meets the QB moving) is byte-identical with it on;
 *  - on a run, defenders whose picture shows the mesh hold `carrying: null` on both mesh bodies until they resolve it
 *    from what they can see, and most resolve to the true carrier soon after the handoff. */
import { afterEach, describe, expect, it, vi } from 'vitest';
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function play(flag: '0' | '1', concept: string, coverage = 'cover3', seed = 2) {
  vi.resetModules();
  vi.stubEnv('PRESENTED_POSSESSION', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { meshBelief } = await import('../src/sim/possession-belief.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation: 'gun_doubles_11', flip: false }));
  const nulls = new Set<number>(); let handT: number | null = null; const at05: (number | undefined)[] = [];
  while (sim.phase !== 'dead' && sim.t < 8) {
    sim.tick();
    if (handT === null && sim.ball.kind === 'held' && sim.ball.carrier !== sim.qb) handT = sim.t;
    for (const d of sim.defense) {
      const b = meshBelief(sim, d);
      if (b.mesh && b.resolved === undefined) nulls.add(d.idx);
      if (handT !== null && Math.abs(sim.t - handT - 0.5) < 1e-6) at05.push(b.mesh ? b.resolved : undefined);
    }
  }
  return { events: JSON.stringify(sim.events), yards: sim.buildResult().yards, nulls, at05, carrier: handT !== null ? sim.carrier?.idx : null,
    back: sim.offense.find((o: any) => o !== sim.qb && sim.events.some((e: any) => e.type === 'handoff' && e.b === o.idx))?.idx };
}

describe('PRESENTED_POSSESSION: possession at a mesh is each opponent\'s belief', () => {
  it('a dropback with no mesh is byte-identical with the flag on', async () => {
    const off = await play('0', 'four_verts'), on = await play('1', 'four_verts');
    expect(on.events).toBe(off.events);
    expect(on.yards).toBe(off.yards);
  }, 120_000);

  it('on a run, the mesh is unknown until seen, and most mesh watchers resolve to the true carrier', async () => {
    const r = await play('1', 'iz_strong');
    expect(r.back).toBeDefined();
    expect(r.nulls.size).toBeGreaterThan(0);
    const seen = r.at05.filter(x => x !== undefined);
    expect(seen.length).toBeGreaterThan(4);
    const right = seen.filter(x => x === r.back).length;
    expect(right / seen.length).toBeGreaterThan(0.6);
  }, 120_000);
});

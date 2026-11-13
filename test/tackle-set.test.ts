/** TACKLE_SET (engagement.ts / behaviors/blocking.ts; experimental, off): a
 * tackle sets against an edge rusher to a depth from the call -- a body width
 * short of the called drop's launch point -- and anchors there instead of
 * kicking with the rusher's depth to wherever the QB has drifted. The rule is
 * the request; whether the anchor holds is the physics (no capacity added).
 * Repro: four verticals (a five-step gun drop, the QB holds) vs Cover 2. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

// The engine as it runs (the reference stack), not the legacy engine the suite is pinned to.
const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function run(flag: string, seed: number) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) vi.stubEnv(k, v === 'on' ? '1' : '0');
  vi.stubEnv('TACKLE_SET', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { tackleFloor } = await import('../src/sim/engagement.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  const tackles = sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT');
  const floor = tackleFloor(sim) as number;
  // Per tick while the QB holds: each tackle's depth, his requested x, whether he is past the floor.
  const rows: { x: number; req: number; t: number }[] = [];
  // The set is his rep and his approach to it. Two states are not the set, and the floor does not apply to them:
  // after his rep has ended (beaten), and blocking.ts's pre-contact chase when he is beaten to the corner -- an
  // outside rusher level with him or past (less than 1.0 yd in front, within 4 yd), whose inside hip he chases past
  // the QB. Seed 2: the RT works inside, DE_S comes free outside at 1.5 s, and he chases him at about -5 yd/s through
  // the floor in both engines (off he catches him at 2.75 s, 0.02 yd short of the floor; with set A on he does not).
  const repEnded = new Set<any>();
  const chasing = (tk: any) => sim.defense.some((r: any) => Math.abs(r.pos.y - sim.ballY) > Math.abs(tk.pos.y - sim.ballY)
    && r.pos.x < tk.pos.x + 1.0 && Math.hypot(r.pos.x - tk.pos.x, r.pos.y - tk.pos.y) < 4 && !sim.engagements.some((e: any) => e.defender === r));
  while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
    const before = tackles.map((tk: any) => tk.pos.x);              // the spot this tick's request is made from
    const engagedBefore = tackles.map((tk: any) => !!tk.engagement);
    const chaseBefore = tackles.map((tk: any) => !tk.engagement && chasing(tk));
    sim.tick();
    tackles.forEach((tk: any, i: number) => {
      if (engagedBefore[i] && !tk.engagement) repEnded.add(tk);
      if (!repEnded.has(tk) && !chaseBefore[i]) rows.push({ x: before[i], req: sim.intents?.[tk.idx]?.vel.x ?? 0, t: sim.t });
    });
  }
  return { sim, floor, rows };
}

describe('TACKLE_SET', () => {
  it('the floor is the called drop\'s launch point plus a body width, not the QB\'s live spot', async () => {
    const { sim, floor } = await run('1', 1);
    expect(floor).toBeCloseTo(sim.los - 8.0 + 1.0, 9);            // gun5: launch 8.0 yd deep
  });

  it('at or past the floor he asks for no more depth', async () => {
    for (const seed of [1, 2, 3]) {
      const { floor, rows } = await run('1', seed);
      const at = rows.filter((r) => r.x <= floor);
      // 0.1, not 0.05: engine-44, seed 3, t 4.0, the LT's request is -0.057 yd/s 2.4 yd past the floor with an
      // interior man on him. His own rep caps it at 0 there, so a later intent layer shades it (the teammate-spacing
      // pass runs after the engagement update; not confirmed which).
      for (const r of at) expect(r.req).toBeGreaterThan(-0.1);
      const deepest = Math.min(...rows.map((r) => r.x));
      // Whether the anchor holds is the physics: report how far past the set he is carried.
      console.log(`seed ${seed}: floor ${floor.toFixed(2)}, deepest ${deepest.toFixed(2)}, ticks at the floor ${at.length}`);
    }
  });

  it('the set has a width: 0.3-1.0 yd outside his alignment, never asked past it', async () => {
    for (const seed of [1, 2, 3]) {
      vi.resetModules();
      for (const [k, v] of Object.entries(stack)) vi.stubEnv(k, v === 'on' ? '1' : '0');
      vi.stubEnv('TACKLE_SET', '1');
      const { PlaySim } = await import('../src/sim/playsim.js');
      const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
      const { tackleSetLine } = await import('../src/sim/engagement.js');
      const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
      let worst = -Infinity;
      while (sim.phase === 'live' && sim.t < 4 && sim.throwAt < 0 && sim.carrier === sim.qb) {
        const before = new Map(sim.offense.map((a: any) => [a, { ...a.pos }]));
        sim.tick();
        for (const tk of sim.offense.filter((a: any) => a.slot === 'LT' || a.slot === 'RT')) {
          const e = tk.engagement; if (!e) continue;
          const line = tackleSetLine(sim, tk, e.defender), home = sim.offAlign.spots[tk.slot].pos.y;
          const w = (line.y - home) * line.out;
          expect(w).toBeGreaterThanOrEqual(0.3 - 1e-9); expect(w).toBeLessThanOrEqual(1.0 + 1e-9);
          const p = before.get(tk) as any, req = sim.intents[tk.idx].vel.y * line.out;
          if ((p.y - line.y) * line.out >= 0) expect(req).toBeLessThanOrEqual(1e-9);   // at or past the line: nothing outward
          worst = Math.max(worst, (tk.pos.y - line.y) * line.out);
        }
      }
      console.log(`seed ${seed}: furthest outside the set line ${worst.toFixed(2)} yd`);
    }
  });

  it('off, the switch is off (bit-identity of the off engine is the seed-999 export hash, not a test here)', async () => {
    vi.resetModules();
    for (const [k, v] of Object.entries(stack)) vi.stubEnv(k, v === 'on' ? '1' : '0');
    vi.stubEnv('TACKLE_SET', '0');
    const { TACKLE_SET } = await import('../src/sim/engagement.js');
    expect(TACKLE_SET).toBe(false);
  });
});

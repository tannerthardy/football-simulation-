/** EDGE_ARC (engagement.ts / behaviors/defense.ts; experimental, off): an edge
 * rusher's landmark is outside his tackle's set -- the alignment he saw at the
 * snap plus the width a kick takes -- at the QB's depth; past the tackle's
 * hips he turns; the inside counter comes from the tackle he sees wider than
 * that set, never the tackle's assignment. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stack: Record<string, string> = JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags;
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function setup(flag: string, seed = 1) {
  vi.resetModules();
  for (const [k, v] of Object.entries(stack)) vi.stubEnv(k, v === 'on' ? '1' : '0');
  vi.stubEnv('EDGE_ARC', flag);
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const eng = await import('../src/sim/engagement.js');
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: 'cover2', concept: 'four_verts', seed, roster: 7, formation: 'gun_doubles_11', flip: false }));
  return { sim, eng };
}

describe('EDGE_ARC', () => {
  it('the landmark is outside the tackle\'s set (alignment + kick width), on his outside, whatever his live spot', async () => {
    const { sim, eng } = await setup('1');
    const lt = sim.slot('LT'), de = sim.defense.find((d: any) => /^DE/.test(d.slot));
    const home = sim.offAlign.spots.LT.pos.y, arc = eng.arcLandmark(sim, lt, de);
    expect(arc.out).toBe(Math.sign(home - sim.ballY));
    expect(arc.setY).toBeCloseTo(home + arc.out * eng.KICK_WIDTH, 9);
    expect((arc.y - arc.setY) * arc.out).toBeCloseTo(lt.profile.radius + de.profile.radius + eng.ARC_ROOM, 9);
    lt.body.pos = { x: lt.pos.x, y: lt.pos.y + arc.out * 2 };         // the tackle widens: the landmark does not follow
    expect(eng.arcLandmark(sim, lt, de).y).toBeCloseTo(arc.y, 9);
  });

  it('overset is the tackle seen wider than his set by more than the arc\'s room, near the rusher', async () => {
    const { sim, eng } = await setup('1');
    const lt = sim.slot('LT'), de = sim.defense.find((d: any) => /^DE/.test(d.slot));
    const arc = eng.arcLandmark(sim, lt, de), r = { x: 35, y: arc.y };
    expect(eng.seenOverset({ x: 35, y: arc.setY + arc.out * (eng.ARC_ROOM - 0.05) }, r, arc)).toBe(false);
    expect(eng.seenOverset({ x: 35, y: arc.setY + arc.out * (eng.ARC_ROOM + 0.05) }, r, arc)).toBe(true);
    expect(eng.seenOverset({ x: 37, y: arc.setY + arc.out * 2 }, r, arc)).toBe(false);       // 2 yd away in depth
  });

  it('on, free edge rushers run the arc; off, the rule never runs', async () => {
    for (const flag of ['1', '0']) {
      const { sim } = await setup(flag, 2);
      let arcs = 0;
      while (sim.phase === 'live' && sim.t < 3 && sim.throwAt < 0) { sim.tick(); arcs += sim.defense.filter((d: any) => d.tags.has('edge-arc')).length; }
      if (flag === '1') expect(arcs).toBeGreaterThan(0); else expect(arcs).toBe(0);
    }
  });
});

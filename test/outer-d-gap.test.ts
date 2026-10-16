import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { alignOffense } from '../src/playbook/alignment.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { gapIn, gapSurfaceIn, linePicture, type LinePicture } from '../src/sim/live-gaps.js';
import type { PlaySim } from '../src/sim/playsim.js';
import type { Perceived } from '../src/sim/perception.js';

interface Snapshot {
  los: number; ballY: number;
  actors: { idx: number; slot: string; team: string; profile: { radius: number } }[];
  rows: { t: number; pictures: Record<string, Perceived> }[];
}
const saved: Snapshot = JSON.parse(readFileSync(new URL('./fixtures/outer-d-gap.json', import.meta.url), 'utf8'));

/** Replay only the pictures RB already consumed. No bodies or observers run. */
function scene(at: number, mirror = false) {
  const row = saved.rows.find(r => r.t === at)!;
  const reflect = (y: number) => mirror ? 2*saved.ballY-y : y;
  const offense = saved.actors.map(a => ({ ...structuredClone(a), engagement: null })) as unknown as Agent[];
  for (const a of offense) Object.defineProperties(a, {
    pos: { get() { throw new Error('private live position'); } },
    vel: { get() { throw new Error('private live velocity'); } },
  });
  const offAlign = alignOffense(FORMATION_BY_ID.ace_11, false, saved.los, saved.ballY);
  if (mirror) for (const spot of Object.values(offAlign.spots)) spot.pos.y = reflect(spot.pos.y);
  const picture = (idx: number) => {
    const p = structuredClone(row.pictures[idx]);
    p.pos.y = reflect(p.pos.y);
    if (mirror) { p.vel.y *= -1; p.facing *= -1; }
    return p;
  };
  const sim = { t: at, offense, offAlign, ballY: saved.ballY, attackDir: () => 1,
    see: (_observer: Agent, target: Agent) => picture(target.idx),
  } as unknown as PlaySim;
  const rb = offense.find(a => a.slot === 'RB')!;
  return { sim, rb, side: mirror ? 1 : -1, outer: picture(7) };
}

describe('an outside gap uses the outer body after the center leaves the surface', () => {
  it.each([false, true])('retains the ordinary three-boundary D before departure, mirror %s', mirror => {
    const f = scene(1.95, mirror), p = linePicture(f.sim, f.rb);
    expect(p.surface.some(b => b.agent.slot === 'C')).toBe(true);
    expect(p.outward[f.side > 0 ? '1' : '-1']).toHaveLength(3);
    expect(gapIn(p, 'D', f.side)).toBeCloseTo(f.outer.pos.y+f.side*.7, 12);
  });

  it.each([false, true])('keeps D outside the same body that supplies its velocity after departure, mirror %s', mirror => {
    const f = scene(2, mirror), p = linePicture(f.sim, f.rb);
    expect(p.departed.map(b => b.agent.slot)).toEqual(['C']);
    expect(p.outward[f.side > 0 ? '1' : '-1']).toHaveLength(5);
    const d = gapSurfaceIn(p, 'D', f.side);
    expect(d.width).toBe(Infinity);
    expect(d.vel).toBe(f.outer.vel.y);
    expect((d.y-f.outer.pos.y)*f.side).toBeCloseTo(.7, 12);
    expect(d.y).toBeCloseTo(f.outer.pos.y+f.side*.7, 12);
  });

  it('does not manufacture an inward jump when only the center crosses its existing depth cutoff', () => {
    const a = scene(1.95), b = scene(2);
    const before = gapIn(linePicture(a.sim, a.rb), 'D', a.side);
    const after = gapIn(linePicture(b.sim, b.rb), 'D', b.side);
    expect(after-before).toBeCloseTo(b.outer.pos.y-a.outer.pos.y, 12);
    expect(Math.abs(after-before)).toBeLessThan(.1);
  });
});

describe('the bounded D correction leaves existing interior and sparse landmarks unchanged', () => {
  function synthetic(count: number, side: number): LinePicture {
    const center = 20;
    const outward = Array.from({ length: count }, (_, i) => ({
      y: center+side*(i+1)*1.3, vel: i+.25, radius: .3, vacancy: false,
    }));
    return { center, centerVel: 0, centerRadius: .3,
      outward: { '1': side > 0 ? outward : [], '-1': side < 0 ? outward : [] }, surface: [], departed: [] };
  }

  it.each([-1, 1])('preserves the two-boundary tackle edge and ordinary three-boundary inline edge, side %s', side => {
    const two = synthetic(2, side), three = synthetic(3, side);
    expect(gapIn(two, 'D', side)).toBeCloseTo(two.center+side*(2.6+1.6), 12);
    expect(gapIn(three, 'D', side)).toBeCloseTo(three.center+side*(3.9+.7), 12);
  });

  it.each([-1, 1])('retains A/B/C counting when more than three boundaries occupy one side, side %s', side => {
    const p = synthetic(5, side);
    expect(gapIn(p, 'A', side)).toBeCloseTo(p.center+side*.65, 12);
    expect(gapIn(p, 'B', side)).toBeCloseTo(p.center+side*1.95, 12);
    expect(gapIn(p, 'C', side)).toBeCloseTo(p.center+side*3.25, 12);
  });
});

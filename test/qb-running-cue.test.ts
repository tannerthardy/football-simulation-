import { describe, expect, it } from 'vitest';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import type { PlaySim } from '../src/sim/playsim.js';
import { qbRunning } from '../src/sim/possession-read.js';

// qbRunning answers only from the observer's delayed pictures; these scenes
// give it those pictures directly. Field: offense attacks +x, LOS at x=50,
// tackles pictured at y=24 and y=29.67.
type Picture = Pick<Perceived, 'pos' | 'vel' | 'carrying'>;
function scene(tackleX = 49) {
  const qb = { slot: 'QB' } as Agent, lt = { slot: 'LT' } as Agent, rt = { slot: 'RT' } as Agent;
  const defender = { slot: 'DE_L' } as Agent;
  let picture: Picture = { pos: { x: 43, y: 26.67 }, vel: { x: 0, y: 0 }, carrying: true };
  const sim = {
    t: 0, qb, los: 50,
    slot: (name: string) => (name === 'LT' ? lt : name === 'RT' ? rt : undefined),
    see: (_: Agent, target: Agent) => ({
      stance: null, facing: 0, age: 0.2,
      ...(target === qb ? picture : { pos: { x: tackleX, y: target === lt ? 24 : 29.67 }, vel: { x: 0, y: 0 }, carrying: false }),
    }),
  } as unknown as PlaySim;
  return {
    sim, defender,
    show(p: Partial<Picture>, t = sim.t) { picture = { ...picture, ...p }; (sim as { t: number }).t = t; return qbRunning(defender, sim); },
  };
}

describe('qbRunning: a scramble from what a defender can see', () => {
  it('sees a QB breaking the pocket toward the line', () => {
    const s = scene();
    expect(s.show({ pos: { x: 47, y: 26.67 }, vel: { x: 1.5, y: 0 } }, 2.0)).toBe(false);
    expect(s.show({ pos: { x: 47.5, y: 26.67 }, vel: { x: 3.2, y: 0.5 } }, 2.1)).toBe(false);
    // At the front of the pocket (the tackles' depth): a runner.
    expect(s.show({ pos: { x: 48.2, y: 26.8 }, vel: { x: 3.4, y: 0.5 } }, 2.3)).toBe(true);
  });

  it('does not treat a fast climb deep in the pocket as a scramble', () => {
    // Review case: 6 yd deep, inside the tackles, escaping a missed dive.
    const s = scene();
    for (const t of [3.20, 3.25, 3.30, 3.40, 3.50]) {
      expect(s.show({ pos: { x: 44 + (t - 3.2) * 2.6, y: 27 }, vel: { x: 2.6, y: 0.5 } }, t)).toBe(false);
    }
  });

  it('does not let tackles driven deep move the front of the pocket back to him', () => {
    // Review case (smash cover3 #5): tackles pushed 10 yd deep; QB 6 yd
    // behind the line, between them, at v=(2.51, 0.5). Not a runner yet.
    const s = scene(40);
    for (const t of [3.20, 3.25, 3.30]) {
      expect(s.show({ pos: { x: 44 + (t - 3.2) * 2.5, y: 27 }, vel: { x: 2.51, y: 0.5 } }, t)).toBe(false);
    }
    // Reaching the line itself still shows a runner.
    expect(s.show({ pos: { x: 48.3, y: 27 }, vel: { x: 3, y: 0.5 } }, 3.8)).toBe(true);
  });

  it('does not treat a sideways rollout as a scramble until he turns upfield', () => {
    const s = scene();
    expect(s.show({ pos: { x: 43, y: 33 }, vel: { x: 0.3, y: 2 } }, 2.0)).toBe(false);
    expect(s.show({ pos: { x: 43.2, y: 34 }, vel: { x: 0.6, y: 2 } }, 2.3)).toBe(false);
    // Outside the box and now moving downfield: the visible cue.
    expect(s.show({ pos: { x: 43.5, y: 34.5 }, vel: { x: 1.6, y: 1.5 } }, 2.6)).toBe(true);
  });

  it('does not convert on a QB stepping up inside the pocket', () => {
    const s = scene();
    expect(s.show({ pos: { x: 44, y: 27 }, vel: { x: 2.0, y: 0.3 } }, 2.0)).toBe(false);
    expect(s.show({ pos: { x: 45, y: 27.5 }, vel: { x: 2.4, y: 0 } }, 2.4)).toBe(false);
  });

  it('holds through a stutter and releases when the QB resets to throw', () => {
    const s = scene();
    expect(s.show({ pos: { x: 48.5, y: 26.67 }, vel: { x: 3.5, y: 0 } }, 2.0)).toBe(true);
    expect(s.show({ vel: { x: 0.2, y: 1 } }, 2.1)).toBe(true);   // Settling starts.
    expect(s.show({ vel: { x: 1.0, y: 1 } }, 2.25)).toBe(true);  // Moving again: timer restarts.
    expect(s.show({ vel: { x: 0.1, y: 0 } }, 2.3)).toBe(true);
    expect(s.show({ vel: { x: 0.1, y: 0 } }, 2.55)).toBe(true);
    expect(s.show({ vel: { x: 0.1, y: 0 } }, 2.6)).toBe(false);  // Settled 0.3 s: reset.
    expect(s.show({ vel: { x: 1.5, y: 0 } }, 2.7)).toBe(false);  // A new cue is needed.
  });

  it('ignores a pump fake and lets go once the ball has left his hands', () => {
    const s = scene();
    expect(s.show({ vel: { x: 0.4, y: 0 } }, 2.0)).toBe(false);
    expect(s.show({ pos: { x: 48.5, y: 26.67 }, vel: { x: 3, y: 0 } }, 2.4)).toBe(true);
    expect(s.show({ vel: { x: 3, y: 0 }, carrying: false }, 2.5)).toBe(false);
  });

  it('keeps the latch through an unknown picture but never starts on one', () => {
    const s = scene();
    expect(s.show({ pos: { x: 48.5, y: 26.67 }, vel: { x: 4, y: 0 }, carrying: null }, 2.0)).toBe(false);
    expect(s.show({ vel: { x: 4, y: 0 }, carrying: true }, 2.1)).toBe(true);
    expect(s.show({ vel: { x: 0, y: 0 }, carrying: null }, 3.0)).toBe(true);
  });
});

// QB_RELEASE: the underneath zone's release asks the running QB to commit to
// the line (within 3 yd moving at it at 2.5+ yd/s, or past it).
describe('qbRunningAtLine: a coverage player waits for the QB to commit to the line', () => {
  async function lineScene() {
    const { qbRunningAtLine } = await import('../src/sim/possession-read.js');
    const s = scene();
    return { ...s, atLine(p: Partial<Picture>, t: number) { s.show(p, t); return qbRunningAtLine(s.defender, s.sim); } };
  }

  it('a rollout drifting downfield outside the tackles runs to the rusher, not to coverage', async () => {
    const s = await lineScene();
    // Outside the box, drifting downfield 1.6 yd/s 6.5 yd deep: qbRunning's cue fires.
    expect(s.show({ pos: { x: 43.5, y: 34.5 }, vel: { x: 1.6, y: 1.5 } }, 2.6)).toBe(true);
    expect(s.atLine({ pos: { x: 43.5, y: 34.5 }, vel: { x: 1.6, y: 1.5 } }, 2.6)).toBe(false);
    expect(s.atLine({ pos: { x: 44.5, y: 36 }, vel: { x: 1.8, y: 1.2 } }, 3.2)).toBe(false);
  });

  it('a true scramble at the line releases him', async () => {
    const s = await lineScene();
    expect(s.atLine({ pos: { x: 48.5, y: 26.67 }, vel: { x: 3.5, y: 0 } }, 2.0)).toBe(true);
  });

  it('drift then run: released when he commits within 3 yd, and stays released', async () => {
    const s = await lineScene();
    expect(s.atLine({ pos: { x: 44, y: 35 }, vel: { x: 1.5, y: 1.5 } }, 2.6)).toBe(false);
    expect(s.atLine({ pos: { x: 46, y: 36 }, vel: { x: 3.0, y: 0.5 } }, 3.2)).toBe(false); // 4 yd off: not yet
    expect(s.atLine({ pos: { x: 47.2, y: 36.3 }, vel: { x: 3.4, y: 0.4 } }, 3.6)).toBe(true);
    expect(s.atLine({ pos: { x: 47.4, y: 36.4 }, vel: { x: 1.2, y: 0.4 } }, 3.7)).toBe(true); // Latched while running.
    expect(s.atLine({ pos: { x: 47.4, y: 36.4 }, vel: { x: 0, y: 0 }, carrying: false }, 3.9)).toBe(false); // Thrown.
  });
});

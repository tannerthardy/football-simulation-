// QB_TRACK_LOOK (Flex, 2026-11-25; docs/reviews/2026-11-13-perception-proposal.md §11): a defender in the passer's clear
// cone is a man he is watching, read through the tracking channel; off his gaze he keeps the choice-reaction picture.
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function lag(flag: string, offDeg: number) {
  vi.stubEnv('QB_TRACK_LOOK', flag); vi.resetModules();
  const { nativeTraceSetup } = await import('../scripts/diag/command-trace.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sim = new PlaySim({ ...nativeTraceSetup({ coverage: 'cover3', concept: 'stick', seed: 7, roster: 7, formation: 'gun_doubles_11', flip: false }), audibles: false });
  const d = sim.slot('LB_W')!, qb = sim.qb;
  const mind = (sim as unknown as { qbMind: { observe(g: { x: number; y: number }): void; estimate(a: unknown): { vel: { y: number } } } }).qbMind;
  for (const a of sim.agents) { a.body.vel = { x: 0, y: 0 }; if (a !== qb && a !== d) a.body.pos = { x: 20, y: 1 + (a.idx % 20) * 0.5 }; }
  qb.body.pos = { x: 33, y: 26.67 }; qb.body.facing = 0; d.body.pos = { x: 45, y: 20 };
  sim.t = 0; for (let i = 0; i < 24; i++) sim.recordPerception(qb.idx);
  let v = 0, est = 0;
  for (let k = 0; k <= 30; k++) {
    const t = k * sim.dt; v = t < 0.5 ? 0 : 5 * (t - 0.5);
    d.body.vel = { x: 0, y: v }; d.body.pos = { x: 45, y: d.body.pos.y + v * sim.dt };
    sim.t = t; sim.recordPerception(qb.idx);
    const dir = Math.atan2(d.pos.y - qb.pos.y, d.pos.x - qb.pos.x) + offDeg * Math.PI / 180;
    mind.observe({ x: qb.pos.x + 10 * Math.cos(dir), y: qb.pos.y + 10 * Math.sin(dir) });
    est = mind.estimate(d).vel.y;
  }
  return v - est; // true minus believed velocity of a man accelerating at 5 yd/s2
}

describe('QB_TRACK_LOOK: the passer\'s watched defender', () => {
  it('in his clear cone the velocity lag is the tracking latency x acceleration, not the choice-reaction delay', async () => {
    const off = await lag('0', 0), on = await lag('1', 0);
    expect(off).toBeCloseTo(1.25, 1); // 0.25 s x 5 yd/s2
    expect(on).toBeCloseTo(0.5, 1); // 0.1 s x 5
  });
  it('off his gaze nothing changes', async () => {
    expect(await lag('1', 40)).toBeCloseTo(await lag('0', 40), 6);
  });
});

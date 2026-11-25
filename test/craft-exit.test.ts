/** CRAFT_EXIT (experimental, off; with CRAFT_HOLD): the held side is a commitment about one man and ends with him. On the
 * receiver's own controller, staged as test/craft-hold.test.ts stages it:
 * - a man in his lane he runs past: once the man is level or behind him (in his picture) he runs his route, not a bend
 *   round a man who is no longer in front of him (Coverage's paired throws: a seam held a 73-degree bend round a nickel
 *   already level with him, and carried it into the ball's flight);
 * - a declared leg that comes back toward the line (a stick or hook settling) names no side to go round a man in his stem;
 * - past his declared break the hold is over, and the craft is the per-tick one, as with CRAFT_HOLD off. */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

/** The engine's own flags (the reference stack), so the scenes run on the engine defaults whatever the suite's pin. */
const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(exit: boolean) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  vi.stubEnv('CRAFT_HOLD', '1');
  vi.stubEnv('CRAFT_EXIT', exit ? '1' : '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { routeCraft } = await import('../src/sim/behaviors/receiver.js');
  PlaySim.recordedSingleStream = true;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  for (const a of sim.agents) { a.body.pos = { x: 10, y: 5 + a.idx }; a.body.vel = { x: 0, y: 0 }; }
  const r = sim.slot('X')!, cb = sim.defense.find((d) => d.player.position === 'CB')!;
  // His picture starts as the scene: the perception's delay window is filled with the staged positions before the first
  // tick (engine-72: off, his first pictures were the pre-scene placement, which MIRROR_SCATTER moves, and the hold arm
  // bent round a man where he no longer was).
  const settle = () => { const t0 = sim.t; for (let k = 0; k < 12; k++) { sim.t += sim.dt; sim.perception.record(sim.agents, null); } sim.t = t0; };
  return { sim, routeCraft, r, cb, settle };
}

/** He runs a straight stem at 6 yd/s past a man standing 0.4 yd to his inside, 3 yd ahead. His lateral request on each
 * tick once the man is level with him or behind, in his picture. */
async function pastTheMan(exit: boolean) {
  const { sim, routeCraft, r, cb, settle } = await load(exit);
  r.body.pos = { x: 45, y: 20 }; r.body.vel = { x: 6, y: 0 }; r.body.facing = 0;
  cb.body.pos = { x: 48, y: 19.6 }; cb.body.vel = { x: 0, y: 0 }; cb.body.facing = Math.PI;
  settle();
  const after: number[] = [];
  for (let k = 0; k < 40; k++) {
    sim.t += sim.dt;
    sim.perception.record(sim.agents, null);
    const out = routeCraft(r, sim, { vel: { x: 6, y: 0 } }, 0.6, 1);
    if (sim.see(r, cb).pos.x - r.pos.x <= 0) after.push(Math.abs(out.vel.y));
    r.body.vel = { ...out.vel };
    r.body.pos = { x: r.pos.x + out.vel.x * sim.dt, y: r.pos.y + out.vel.y * sim.dt };
  }
  return after;
}

/** A man in his lane 2.5 yd ahead, a hair to his outside (+y); his declared leg settles back toward the line and 0.6 yd
 * inside (-y), as the stick's does against zone; the per-tick break side is outside (+1). The side of his first bend. */
async function settleSide(exit: boolean) {
  const { sim, routeCraft, r, cb, settle } = await load(exit);
  r.body.pos = { x: 45, y: 20 }; r.body.vel = { x: 5, y: 0 }; r.body.facing = 0;
  cb.body.pos = { x: 47.5, y: 20.1 }; cb.body.vel = { x: 0, y: 0 }; cb.body.facing = Math.PI;
  settle();
  sim.t += sim.dt;
  sim.perception.record(sim.agents, null);
  const leg = { x: -0.64, y: -0.77 };
  const out = routeCraft(r, sim, { vel: { x: 5, y: 0 } }, 0.6, 1, leg);
  return Math.sign(out.vel.y);
}

/** The break side handed to the craft flips every tick round a man on his line (craft-hold.test.ts's dither scene), past
 * his declared break. Sign changes of his request across the lane. */
async function flipsPastBreak(exit: boolean) {
  const { sim, routeCraft, r, cb, settle } = await load(exit);
  r.body.pos = { x: 45, y: 20 }; r.body.vel = { x: 5, y: 0 }; r.body.facing = 0;
  cb.body.pos = { x: 47.5, y: 20 }; cb.body.vel = { x: 0, y: 0 }; cb.body.facing = Math.PI;
  settle();
  let changes = 0, last = 0;
  for (let k = 0; k < 12; k++) {
    sim.t += sim.dt;
    sim.perception.record(sim.agents, null);
    const out = routeCraft(r, sim, { vel: { x: 5, y: 0 } }, 0.6, k % 2 ? 1 : -1, null, true);
    const s = Math.abs(out.vel.y) > 0.3 ? Math.sign(out.vel.y) : 0;
    if (s && last && s !== last) changes++;
    if (s) last = s;
    r.body.vel = { ...out.vel };
    r.body.pos = { x: r.pos.x + out.vel.x * sim.dt, y: r.pos.y + out.vel.y * sim.dt };
  }
  return changes;
}

describe('CRAFT_EXIT', () => {
  it('past the man he runs his route: no bend round a man level with him or behind', async () => {
    const hold = await pastTheMan(false), exit = await pastTheMan(true);
    expect(hold.length).toBeGreaterThan(5);
    expect(Math.max(...hold)).toBeGreaterThan(2);
    expect(exit.length).toBeGreaterThan(5);
    expect(Math.max(...exit)).toBeLessThan(0.05);
  });

  it('a declared leg that settles back toward the line names no side: the per-tick side decides', async () => {
    expect(await settleSide(false)).toBe(-1);
    expect(await settleSide(true)).toBe(1);
  });

  it('past his declared break the hold is over: the craft is the per-tick one', async () => {
    expect(await flipsPastBreak(false)).toBe(0);
    expect(await flipsPastBreak(true)).toBeGreaterThan(0);
  });
});

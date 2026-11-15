/** CRAFT_HOLD (experimental, off): the route craft commits to a side round a man in his lane and holds it until he is
 * clear, and a receiver bent off his stem rejoins his route on the leg ahead. Two short loops on the receiver's own
 * controller (the route-craft fixture's lane): his break side is re-derived each tick and flips, as it does for a wing
 * pressed against an end (gun_wing_12 cover6, 1.0-1.7 s); and a receiver 2 yd off a seam's straight-through stem marker.
 * RELEASE_SIDE (experimental, off): with the end sitting on his route line, the wing's slant passes under the end and
 * then inside (the cover6 exchange scene, staged as test/cover6-half-side.test.ts stages it, on the engine defaults). */
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

const stackOn = Object.entries(JSON.parse(readFileSync(new URL('../config/reference-stack.json', import.meta.url), 'utf8')).flags as Record<string, string>)
  .filter(([, v]) => v === 'on').map(([k]) => k);

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function load(hold: boolean) {
  vi.resetModules();
  vi.stubEnv('CRAFT_HOLD', hold ? '1' : '0');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { routeCraft } = await import('../src/sim/behaviors/receiver.js');
  const { steerRoute } = await import('../src/sim/route-motion.js');
  PlaySim.recordedSingleStream = true;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  for (const a of sim.agents) { a.body.pos = { x: 10, y: 5 + a.idx }; a.body.vel = { x: 0, y: 0 }; }
  return { sim, routeCraft, steerRoute };
}

/** A man standing on his line 2.5 yd ahead; the break side handed to the craft flips every tick. Sign changes of his request across the lane. */
async function flips(hold: boolean) {
  const { sim, routeCraft } = await load(hold);
  const r = sim.slot('X')!, cb = sim.defense.find(d => d.player.position === 'CB')!;
  r.body.pos = { x: 45, y: 20 }; r.body.vel = { x: 5, y: 0 }; r.body.facing = 0;
  cb.body.pos = { x: 47.5, y: 20 }; cb.body.vel = { x: 0, y: 0 }; cb.body.facing = Math.PI;
  let changes = 0, last = 0;
  for (let k = 0; k < 12; k++) {
    sim.t += sim.dt;
    sim.perception.record(sim.agents, null);
    const out = routeCraft(r, sim, { vel: { x: 5, y: 0 } }, 0.6, k % 2 ? 1 : -1);
    const s = Math.abs(out.vel.y) > 0.3 ? Math.sign(out.vel.y) : 0;
    if (s && last && s !== last) changes++;
    if (s) last = s;
    r.body.vel = { ...out.vel };
    r.body.pos = { x: r.pos.x + out.vel.x * sim.dt, y: r.pos.y + out.vel.y * sim.dt };
  }
  return changes;
}

/** A seam's stem marker (a turn under 12 deg) 1 yd ahead and 2 yd to his side: what he asks for. */
async function rejoin(hold: boolean) {
  const { sim, steerRoute } = await load(hold);
  const r = sim.slot('X')!;
  r.body.pos = { x: 44, y: 22 }; r.body.vel = { x: 5, y: 0 };
  const path = [{ p: { x: 40, y: 20 }, s: 1 }, { p: { x: 45, y: 20.2 }, s: 1 }, { p: { x: 90, y: 21 }, s: 1 }];
  const st = { idx: 1, from: { x: 40, y: 20 } };
  const cmd = steerRoute(r.body, st, path, 'continue', 1, 0.6, 0.8)!;
  return { idx: st.idx, ux: cmd.vel.x / Math.hypot(cmd.vel.x, cmd.vel.y) };
}

describe('CRAFT_HOLD', () => {
  it('off: the side flips with the break side re-derived each tick; on: he holds the side he chose', async () => {
    expect(await flips(false)).toBeGreaterThan(3);
    expect(await flips(true)).toBeLessThanOrEqual(1);
  });
  it('a receiver bent 2 yd off a straight-through stem marker runs for the next point, not flat back to the marker', async () => {
    const off = await rejoin(false), on = await rejoin(true);
    expect(off.idx).toBe(1);
    expect(off.ux).toBeLessThan(0.6);
    expect(on.idx).toBe(2);
    expect(on.ux).toBeGreaterThan(0.95);
  });
});

/** The cover6 exchange scene's wing (S2, a slant behind the end's flat): how far inside of his spot he is at 2.8 s. */
async function wingInside(flags: Record<string, string>) {
  vi.resetModules();
  for (const k of stackOn) vi.stubEnv(k, '1');
  for (const [k, v] of Object.entries({ FRONT_ALIGN: '0', SNAP_REACT: '0', OL_STAGGER: '0', ...flags })) vi.stubEnv(k, v);
  const { filmScene } = await import('../src/lab/coverage-scene.js');
  const f = filmScene({ formation: 'gun_wing_12', coverage: 'cover6', strong: { 1: 'go', 2: 'slant', 3: 'flat' }, weak: { 1: 'go' }, until: 2.8 });
  const slot = f.numbering.S2!, start = f.sim.offAlign.spots[slot].pos, now = f.sim.slot(slot as never)!.pos;
  return -(now.y - start.y) * Math.sign(start.y - f.sim.offAlign.ballY);
}

describe('RELEASE_SIDE', () => {
  it('the wing\'s slant gets inside of the end with the side held; off, he is still on his spot\'s line at 2.8 s', async () => {
    expect(await wingInside({ RELEASE_SIDE: '0', CRAFT_HOLD: '0' })).toBeLessThan(0.5);
    expect(await wingInside({ RELEASE_SIDE: '1', CRAFT_HOLD: '1' })).toBeGreaterThan(1.5);
  }, 60_000);
});

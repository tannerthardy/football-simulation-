/** RUN_LANE crease read and CLIMB_EXIT departure (experimental, off).
 * Held-body scenes with exact perception: these test what the reader does
 * with a picture, not a football outcome. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(31), 'Lane offense', 'LO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Lane defense', 'LD', { strength: .55 });
const LOS = 40;

/** Line at the LOS (C at the ball, guards ±1.4, tackles ±2.8), RB 4.5 yd deep
 * at lateral `rb` (mirror sign m). Everyone else parked far away. */
function scene(m: 1 | -1, rb = 1, depth = 4.5) {
  const formation = FORMATION_BY_ID.ace_11;
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'base43'),
    offCall: { formation, kind: 'run', flip: false, run: RUN_BY_ID.iz_strong, label: 'lane' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'lane' },
    los: LOS, ballY: CENTER_Y, firstDownX: 50, seed: 5, record: false });
  for (const a of sim.agents) { a.body.pos = { x: 5 + a.idx, y: 2 }; a.body.vel = { x: 0, y: 0 }; }
  const put = (slot: string, x: number, y: number) => { const a = sim.slot(slot as never)!; a.body.pos = { x, y: CENTER_Y + m * y }; return a; };
  for (const [s, y] of [['C', 0], ['LG', -1.4], ['RG', 1.4], ['LT', -2.8], ['RT', 2.8]] as const) put(s, LOS - .5, y);
  const back = put('RB', LOS - depth, rb);
  sim.see = (_a, t) => ({ pos: { ...t.pos }, vel: { ...t.vel }, stance: null, facing: 0, pose: 'up', age: .1 } satisfies Perceived);
  sim.ball = { kind: 'held', carrier: back } as never;
  return { sim, put, back, m };
}

async function reader() {
  vi.stubEnv('RUN_LANE', '1');
  vi.resetModules();
  return (await import('../src/sim/behaviors/carrier.js')).runReadAim;
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
const opts = (m: number, aimY: number) => ({ aim: { x: LOS + .6, y: CENTER_Y + m * aimY }, run: { scheme: 'insideZone' as const, side: m } });
const lat = (y: number, m: number) => (y - CENTER_Y) * m;

describe('RUN_LANE crease read', () => {
  it('a defender standing in the called gap closes it', async () => {
    const runReadAim = await reader();
    for (const m of [1, -1] as const) {
      // Near the line, where a little time to arrive used to make an occupied
      // gap look cheap.
      const open = scene(m, 2.1, 1.6);
      const free = runReadAim(open.back, open.sim, opts(m, 2.1))!;
      expect(Math.abs(lat(free.y, m) - 2.1)).toBeLessThan(.6);
      const closed = scene(m, 2.1, 1.6);
      closed.put('DT_S', LOS, 2.1);
      const entry = runReadAim(closed.back, closed.sim, opts(m, 2.1))!;
      expect(Math.abs(lat(entry.y, m) - 2.1)).toBeGreaterThan(.8);
    }
  });

  it('a block protects the hole on the blocker\'s side, not the defender\'s free side', async () => {
    const runReadAim = await reader();
    for (const m of [1, -1] as const) {
      // RT has walled the end inside him... the end is engaged playside of RT
      // with RT on his inside: the opening inside RT is protected; the
      // outside, the end's free side, is not.
      const s = scene(m, 3.4, 1.6);
      const end = s.put('DE_S', LOS + .2, 3.9), rt = s.sim.slot('RT')!;
      rt.body.pos = { x: LOS - .1, y: CENTER_Y + m * 3.1 };
      const e = s.sim.engage(rt, end, 'run');
      expect(e).toBeTruthy();
      e!.win = 0; e!.phi = 0;
      const entry = runReadAim(s.back, s.sim, opts(m, 4.6))!;
      // Called outside the end, but he takes the protected side of the block.
      expect(lat(entry.y, m)).toBeLessThan(3.3);
    }
  });

  it('is mirror-symmetric', async () => {
    const runReadAim = await reader();
    const pick = (m: 1 | -1) => {
      const s = scene(m, 1.5);
      s.put('DT_S', LOS + .3, 1.6); s.put('LB_M', LOS + 4, 2.5); s.put('DE_W', LOS + .4, -3.4);
      const e = runReadAim(s.back, s.sim, opts(m, 2))!;
      return { x: e.x, y: lat(e.y, m) };
    };
    const a = pick(1), b = pick(-1);
    expect(b.x).toBeCloseTo(a.x, 9);
    expect(b.y).toBeCloseTo(a.y, 9);
  });

  it('flattens behind the line before turning up when bodies stand on the straight run', async () => {
    const runReadAim = await reader();
    for (const m of [1, -1] as const) {
      // Back pressing play side; the only clean entry is back across the
      // center, and the playside guard and his man stand on the straight line.
      const s = scene(m, 3.5);
      s.back.body.pos = { x: LOS - 2.4, y: CENTER_Y + m * 3.5 };
      s.put('DT_S', LOS + .2, 2.2); s.put('DE_S', LOS + .2, 3.6); s.put('LB_S', LOS + 1, 4.2);
      const rg = s.sim.slot('RG')!; rg.body.pos = { x: LOS - .8, y: CENTER_Y + m * 2.1 };
      const entry = runReadAim(s.back, s.sim, { ...opts(m, -1.5), run: { scheme: 'insideZone' as const, side: m } })!;
      // He heads for the waypoint behind the line, not the entry itself.
      expect(entry.x).toBeLessThan(LOS - .5);
    }
  });
});

describe('CLIMB_EXIT departure', () => {
  async function climber(flag: string) {
    vi.stubEnv('CLIMB_EXIT', flag);
    vi.resetModules();
    const { RunBlocker } = await import('../src/sim/behaviors/blocking.js');
    const s = scene(1);
    const g = s.sim.slot('RG')!, c = s.sim.slot('C')!, dt = s.put('DT_S', LOS + .25, 1.0), lb = s.put('LB_M', LOS + 4.5, 2.5);
    g.body.pos = { x: LOS - .45, y: CENTER_Y + .5 };
    c.body.pos = { x: LOS - .3, y: CENTER_Y + 1.6 };
    const blocker = new RunBlocker({ kind: 'climb', target: lb, drive: { x: 1, y: 0 },
      departure: { defender: dt, keeper: c, backer: lb } });
    (blocker as unknown as { startDeparture: (...x: unknown[]) => void }).startDeparture(g, s.sim, dt, c, lb,
      { exit: { x: g.pos.x, y: g.pos.y + .1 }, flow: { x: 0, y: 0 }, backer: s.sim.see(g, lb) });
    g.behavior = blocker;
    s.sim.t = s.sim.world.time = 1;
    (g as Agent).snapReadyAt = 0;
    return { cmd: blocker.update(g, s.sim), g, dt };
  }

  it('leaves off the old man\'s shoulder at running speed rather than walking around him', async () => {
    const legacy = await climber('0');
    const rip = await climber('1');
    const speed = (v: { x: number; y: number }) => Math.hypot(v.x, v.y);
    expect(speed(rip.cmd.vel)).toBeGreaterThan(3);
    expect(speed(rip.cmd.vel)).toBeGreaterThan(speed(legacy.cmd.vel) + 1);
    // Upfield, and not through the old man's center.
    expect(rip.cmd.vel.x).toBeGreaterThan(0);
  });
});

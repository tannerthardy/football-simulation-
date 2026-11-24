/** Three defects in catching.ts (Tools, 2026-11-24), each behind its own flag (default on, =0 restores):
 * HANDS_ON_ARMS: a defender whose hands reach the receiver's arms and do not strip the ball adds difficulty to the catch (the accumulator was never written);
 * SECURE_SPLIT: in the securing window a defender's hand play and his body's arrival are separate events, each tried once;
 * SECURE_FACE_GEOM: in the securing window "facing the ball" is his shoulders toward the ball's position, not against its (pinned) velocity.
 * Staged like test/catch-hands.test.ts: every dice roll pinned to u, swept over a grid. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Flags = { arms?: string; split?: string; face?: string };

async function world(flags: Flags) {
  vi.resetModules();
  vi.stubEnv('CATCH_HANDS', '1'); vi.stubEnv('CATCH_SECURE', '1'); vi.stubEnv('BALL_EST', '0');
  vi.stubEnv('HANDS_ON_ARMS', flags.arms ?? '1'); vi.stubEnv('SECURE_SPLIT', flags.split ?? '1'); vi.stubEnv('SECURE_FACE_GEOM', flags.face ?? '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities, secureStep } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const make = () => {
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
      los: 40, ballY: 26, firstDownX: 50, seed: 1 });
    const r = sim.slot('X')!;
    for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
    const cb = sim.defense.find(d => d.player.position === 'CB')!;
    return { sim, r, cb };
  };
  return { make, resolveCatchOpportunities, secureStep };
}

/** The catch chance in the arms case: a defender level with the receiver, back to the ball, within reach of his arms. */
async function armsCase(flag: string, place: null | { dx: number; dy: number; facing: number }) {
  const { make, resolveCatchOpportunities } = await world({ arms: flag });
  const out: string[] = [];
  for (let i = 0; i < 40; i++) {
    const u = (i + 0.5) / 40, { sim, r, cb } = make();
    r.body.pos = { x: 50, y: 26 }; r.body.facing = Math.PI;
    if (place) { cb.body.pos = { x: 50 + place.dx, y: 26 + place.dy }; cb.body.facing = place.facing; }
    sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 49.7, y: 26, z: 1.3 }, 1.0);
    sim.t = 1.0; sim.rng.next = () => u;
    resolveCatchOpportunities(sim, { x: 48.4, y: 26, z: 1.3 }, { x: 50.3, y: 26, z: 1.3 });
    const securing = sim.ball.kind === 'air' && (sim.ball as any).securing?.receiver === r; // in his hands, the securing window
    out.push(securing || (sim.ball.kind === 'held' && sim.ball.carrier === r) ? 'catch' : 'no');
  }
  return out.filter(x => x === 'catch').length / out.length;
}

/** The securing window: the ball pinned to the receiver, one defender placed by `at(tick)`; returns the rolls he took and whether the ball came loose, per u. */
async function secureCase(flags: Flags, opts: { rVel: { x: number; y: number }; cbFacing: number; at: (k: number, r: { x: number; y: number }) => { x: number; y: number }; ticks: number; u: number }) {
  const { make, secureStep } = await world(flags);
  const { sim, r, cb } = make();
  r.body.pos = { x: 50, y: 26 }; r.body.vel = { ...opts.rVel }; r.body.facing = 0;
  sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 50, y: 26, z: 1.3 }, 1.0);
  sim.t = 1.0;
  (sim.ball as any).securing = { receiver: r, start: 1.0, until: 1.6, tried: new Set() };
  cb.body.facing = opts.cbFacing; cb.body.vel = { ...opts.rVel };
  let rolls = 0; sim.rng.next = () => { rolls++; return opts.u; };
  let loose = false;
  for (let k = 0; k < opts.ticks; k++) {
    sim.t = 1.0 + 0.05 * k;
    cb.body.pos = opts.at(k, r.body.pos);
    secureStep(sim);
    if (!(sim.ball as any).securing) { loose = sim.ball.kind === 'air'; break; }
    r.body.pos = { x: r.body.pos.x + opts.rVel.x * 0.05, y: r.body.pos.y + opts.rVel.y * 0.05 };
  }
  return { rolls, loose };
}

describe('HANDS_ON_ARMS', () => {
  it('nobody near, or out of reach of the arms: identical on and off', async () => {
    expect(await armsCase('1', null)).toBe(await armsCase('0', null));
    expect(await armsCase('1', { dx: 1.7, dy: 0.4, facing: 0 })).toBe(await armsCase('0', { dx: 1.7, dy: 0.4, facing: 0 }));
  });
  it('his hands on the arms that do not strip the ball make the catch harder', async () => {
    const off = await armsCase('0', { dx: 0.2, dy: 0.6, facing: 0 }), on = await armsCase('1', { dx: 0.2, dy: 0.6, facing: 0 });
    expect(on).toBeLessThan(off);
    expect(on).toBeGreaterThan(0);
  });
});

describe('SECURE_SPLIT', () => {
  // He is within his hand's reach of the ball a tick before his body arrives: two events, two rolls on, one off.
  const approach = (k: number, r: { x: number; y: number }) => ({ x: r.x + (k === 0 ? 1.2 : 0.5), y: r.y }); // in front of him: the ball (0.35 ahead of the receiver) is in his hand's reach a tick before his body is
  it('the hand play and the body arrival are separate attempts, each rolled once', async () => {
    const on = await secureCase({ split: '1' }, { rVel: { x: 0, y: 0 }, cbFacing: 0, at: approach, ticks: 3, u: 0.999 });
    const off = await secureCase({ split: '0' }, { rVel: { x: 0, y: 0 }, cbFacing: 0, at: approach, ticks: 3, u: 0.999 });
    expect(off.rolls).toBe(1);
    expect(on.rolls).toBe(2);
  });
  it('a defender who stays in range is not rolled again', async () => {
    const stay = (_k: number, r: { x: number; y: number }) => ({ x: r.x - 0.35, y: r.y });
    const on = await secureCase({ split: '1' }, { rVel: { x: 0, y: 0 }, cbFacing: 0, at: stay, ticks: 6, u: 0.999 });
    expect(on.rolls).toBe(1);
  });
});

describe('SECURE_FACE_GEOM', () => {
  // The receiver runs +x with the ball pinned to him; the defender runs with him one step behind, shoulders +x, looking at the ball.
  const trail = (_k: number, r: { x: number; y: number }) => ({ x: r.x - 0.5, y: r.y });
  async function looseShare(face: string) {
    let n = 0; for (let i = 0; i < 10; i++) if ((await secureCase({ face }, { rVel: { x: 7, y: 0 }, cbFacing: 0, at: trail, ticks: 1, u: (i + 0.5) / 10 })).loose) n++;
    return n / 10;
  }
  it('a trailing defender looking at the ball is not treated as turned away', async () => {
    const off = await looseShare('0'), on = await looseShare('1');
    expect(on).toBeGreaterThan(off);
  });
});

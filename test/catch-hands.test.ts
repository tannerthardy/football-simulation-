/** CATCH_HANDS (experimental, off): the catch is a contest of both players'
 * hands in ball order. Staged like test/deflect-ball.test.ts: a ball passes a
 * receiver's hands at chest height and one defender stands where each case
 * puts him. Every dice roll is pinned to u, swept over a grid, so the share of
 * u that end in a catch is the catch chance the code gives that picture. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Place = null | { dx: number; dy: number; facing: number };

async function scene(flag: string, place: Place) {
  vi.stubEnv('CATCH_HANDS', flag);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const out: string[] = [];
  for (let i = 0; i < 40; i++) {
    const u = (i + 0.5) / 40;
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
      los: 40, ballY: 26, firstDownX: 50, seed: 1 });
    const r = sim.slot('X')!;
    for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
    r.body.pos = { x: 50, y: 26 }; r.body.facing = Math.PI; // facing the passer
    const cb = sim.defense.find(d => d.player.position === 'CB')!;
    if (place) { cb.body.pos = { x: 50 + place.dx, y: 26 + place.dy }; cb.body.facing = place.facing; }
    // Ball from the passer (-x) toward the receiver's chest.
    sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 49.7, y: 26, z: 1.3 }, 1.0);
    sim.t = 1.0;
    sim.rng.next = () => u;
    const events: string[] = []; const ev = sim.event.bind(sim);
    (sim as any).event = (type: string, a: any, ...rest: any[]) => { events.push(type + (a === cb ? '@D' : a === r ? '@R' : '')); return (ev as any)(type, a, ...rest); };
    resolveCatchOpportunities(sim, { x: 48.4, y: 26, z: 1.3 }, { x: 50.3, y: 26, z: 1.3 });
    const caught = sim.ball.kind === 'held' && sim.ball.carrier === r;
    const picked = sim.ball.kind === 'held' && sim.ball.carrier === cb;
    out.push(caught ? 'catch' : picked ? 'int' : events.find(e => e.endsWith('@D')) ?? events.find(e => e.endsWith('@R')) ?? 'none');
  }
  const share = (k: string) => out.filter(x => x.startsWith(k)).length / out.length;
  return { out, catch: share('catch'), defender: out.filter(x => x === 'int' || x.endsWith('@D')).length / out.length };
}

describe('CATCH_HANDS', () => {
  it('nobody near: identical on and off', async () => {
    const off = await scene('0', null), on = await scene('1', null);
    expect(on.out).toEqual(off.out);
  });
  it('defender in front, facing the ball, the ball reaching him first: he plays it', async () => {
    const off = await scene('0', { dx: -0.45, dy: 0.3, facing: Math.PI });
    const on = await scene('1', { dx: -0.45, dy: 0.3, facing: Math.PI });
    expect(on.defender).toBeGreaterThan(off.defender);
    expect(on.catch).toBeLessThan(off.catch);
  });
  it('in phase, back to the ball, beside him: he plays the hands and the catch gets harder', async () => {
    const off = await scene('0', { dx: 0.2, dy: 0.6, facing: 0 });
    const on = await scene('1', { dx: 0.2, dy: 0.6, facing: 0 });
    expect(on.catch).toBeLessThan(off.catch);
    expect(on.catch).toBeGreaterThan(0);
  });
  it('trailing by a step, out of reach of the hands: no hands effect', async () => {
    const off = await scene('0', { dx: 1.7, dy: 0.4, facing: 0 });
    const on = await scene('1', { dx: 1.7, dy: 0.4, facing: 0 });
    expect(on.catch).toBeCloseTo(off.catch, 5);
  });
});

/** CATCH_SECURE: a won catch is a securing window; a defender arriving in it
 * gets one try to dislodge it from what he delivers. */
async function secure(flag: string, defender: null | { dx: number; dy: number; vx: number }) {
  vi.stubEnv('CATCH_SECURE', flag);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities, secureStep } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const out: string[] = [];
  for (let i = 0; i < 400; i++) {
    const u = (Math.floor(i / 20) + 0.5) / 20, v = (i % 20 + 0.5) / 20;
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
      los: 40, ballY: 26, firstDownX: 50, seed: 1 });
    const dice = sim.dice.bind(sim);
    (sim as any).dice = (kind: string, a?: any, b?: any) => { const r = dice(kind, a, b); if (kind === 'secure') r.next = () => v; return r; };
    const r = sim.slot('X')!;
    for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
    r.body.pos = { x: 50, y: 26 }; r.body.facing = Math.PI;
    const cb = sim.defense.find(d => d.player.position === 'CB')!;
    if (defender) { cb.body.pos = { x: 50 + defender.dx, y: 26 + defender.dy }; cb.body.vel = { x: defender.vx, y: 0 }; cb.body.facing = Math.PI; }
    sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 49.7, y: 26, z: 1.3 }, 1.0);
    sim.t = 1.0;
    sim.rng.next = () => u;
    resolveCatchOpportunities(sim, { x: 48.4, y: 26, z: 1.3 }, { x: 50.3, y: 26, z: 1.3 });
    // The window: the defender closes on the receiver one tick at a time.
    for (let k = 0; k < 12 && sim.ball.kind === 'air' && (sim.ball as any).securing; k++) {
      sim.t += sim.dt;
      if (defender) { cb.body.pos = { x: cb.pos.x + defender.vx * sim.dt, y: cb.pos.y + (26 - cb.pos.y) * 0.3 }; cb.body.vel = { x: defender.vx, y: (26 - cb.pos.y) * 6 }; }
      secureStep(sim);
    }
    out.push(sim.ball.kind === 'held' && sim.ball.carrier === r ? 'catch' : 'not');
  }
  return out.filter(x => x === 'catch').length / out.length;
}

describe('CATCH_SECURE', () => {
  it('nobody near: the window only delays the same catch', async () => {
    expect(await secure('1', null)).toBeCloseTo(await secure('0', null), 5);
  });
  it('a defender closing into the receiver during the window dislodges some catches', async () => {
    const off = await secure('0', { dx: -1.8, dy: 0.8, vx: 5 }), on = await secure('1', { dx: -1.8, dy: 0.8, vx: 5 });
    expect(on).toBeLessThan(off);
    expect(on).toBeGreaterThan(0);
  });
});

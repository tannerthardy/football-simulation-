/** PLAY_HANDS (catching.ts; experimental, off; with CATCH_HANDS): a defender plays the receiver's hands, not only
 * the ball. Staged like test/catch-hands.test.ts: a receiver running downfield takes a ball at the catch point and
 * a defender trails him 1.5 yd away, in phase, reading the catch; every dice roll is pinned to u, swept over a grid,
 * so the share of u that end in a catch is the catch chance the code gives that picture. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

/** side: +1 = the ball comes to his hands on the defender's side (reaching back toward him), -1 = away from him. */
async function scene(flag: string, side: number, hands = 0.6) {
  vi.stubEnv('CATCH_HANDS', '1'); vi.stubEnv('CATCH_SECURE', '0'); vi.stubEnv('PLAY_HANDS', flag);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const out: string[] = []; const after: { speed: number; nextTackle: number }[] = [];
  for (let i = 0; i < 40; i++) {
    const u = (i + 0.5) / 40;
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
      defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1, pressure: null, label: '' },
      los: 40, ballY: 26, firstDownX: 50, seed: 1 });
    const r = sim.slot('X')!;
    for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
    r.player.ratings.hands = Math.round(hands * 99); r.player.ratings.contestedCatch = Math.round(hands * 99);
    r.body.pos = { x: 70, y: 26 }; r.body.facing = 0; r.body.vel = { x: 7, y: 0 };
    r.tags.add('onBall');
    const cb = sim.defense.find(d => d.player.position === 'CB')!;
    // Trailing, in phase: 1.35 yd behind and 0.7 yd to the +y side (1.52 yd), running with him, eyes on him.
    cb.body.pos = { x: 68.65, y: 26.7 }; cb.body.facing = 0; cb.body.vel = { x: 7, y: 0 };
    sim.throwBall(sim.qb, r, { x: 20, y: 0, z: 0 }, { x: 70, y: 26 + side * 0.55, z: 1.4 }, 1.6);
    sim.t = 1.6;
    sim.rng.next = () => u;
    const events: string[] = []; const ev = sim.event.bind(sim);
    (sim as any).event = (type: string, a: any, b: any, note?: string) => { events.push(type + (a === cb ? '@D' : a === r ? '@R' : '') + (note ? `:${note}` : '')); return (ev as any)(type, a, b, note); };
    // The ball comes in over his shoulder and meets his hands on the chosen side, then passes them.
    resolveCatchOpportunities(sim, { x: 68.6, y: 26 + side * 0.55, z: 1.6 }, { x: 70.6, y: 26 + side * 0.55, z: 1.3 });
    const caught = sim.ball.kind === 'held' && sim.ball.carrier === r;
    out.push(caught ? 'catch' : events.find(e => e.includes('@D')) ?? events.find(e => e.includes('@R')) ?? 'none');
    after.push({ speed: Math.hypot(cb.vel.x, cb.vel.y), nextTackle: cb.nextTackleAt - sim.t });
  }
  const share = (k: string) => out.filter(x => x.startsWith(k)).length / out.length;
  return { out, catch: share('catch'), hands: out.filter(x => x.includes('through the hands')).length / out.length, after };
}

describe('PLAY_HANDS', () => {
  it('reaching back toward a trailing defender: he can play the hands; caught away from him: clean', async () => {
    const offBack = await scene('0', 1), onBack = await scene('1', 1), onAway = await scene('1', -1), offAway = await scene('0', -1);
    // Off: his hands are 1.36 yd away, beyond his standing reach of the receiver's arms, so nothing happens either way.
    expect(offBack.hands).toBe(0);
    expect(onBack.hands).toBeGreaterThan(0.05); // at the edge of his lunge: about one in ten
    expect(onBack.catch).toBeLessThan(offBack.catch);
    // Away from him the hands are out of even a lunging reach: the catch is as clean as before.
    expect(onAway.hands).toBe(0);
    expect(onAway.catch).toBe(offAway.catch);
  });
  it('a strong-handed receiver catches through the swipe more often than a weak-handed one', async () => {
    const strong = await scene('1', 1, 0.95), weak = await scene('1', 1, 0.35);
    expect(strong.hands).toBeLessThan(weak.hands);
    expect(strong.catch).toBeGreaterThan(weak.catch);
  });
  it('a swipe costs him his stride: slower, and his next tackle waits', async () => {
    const off = await scene('0', 1), on = await scene('1', 1);
    const missed = on.after.filter((_, i) => on.out[i] === 'catch');
    expect(missed.length).toBeGreaterThan(0);
    for (const m of missed) {
      expect(m.speed).toBeLessThan(off.after[0].speed - 1);
      expect(m.nextTackle).toBeGreaterThan(0.2);
    }
  });
});

/** DEFLECT_BALL (experimental, off): a ball the receiver fails to catch comes
 * off him only if his hands got to it. Staged like test/tip-away.test.ts: a
 * ball passes the receiver at the edge of his reach and every roll fails, so
 * he neither catches nor touches it. Off, it was popped up beside him anyway;
 * on, it keeps its flight. Either way the miss is logged. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function edgeMiss(flag: string) {
  vi.stubEnv('DEFLECT_BALL', flag);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { resolveCatchOpportunities } = await import('../src/sim/catching.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  PlaySim.recordedSingleStream = true;
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(7), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50, seed: 1 });
  const r = sim.slot('X')!;
  for (const a of sim.agents) a.body.pos = { x: 20, y: 10 };
  r.body.pos = { x: 50, y: 26 };
  const off = r.profile.reach;
  sim.throwBall(sim.qb, r, { x: 15, y: 0, z: 0 }, { x: 50, y: 26 + off, z: 1.6 }, 1.5);
  sim.t = 1.5;
  sim.rng.next = () => 0.999;
  const events: string[] = []; const ev = sim.event.bind(sim);
  (sim as any).event = (type: string, ...rest: any[]) => { events.push(type); return (ev as any)(type, ...rest); };
  resolveCatchOpportunities(sim, { x: 49.9, y: 26 + off, z: 1.6 }, { x: 50.1, y: 26 + off, z: 1.6 });
  return { air: sim.ball.kind === 'air', deflected: sim.ball.kind === 'air' && !!sim.ball.deflected, logged: events.includes('miss') || events.includes('drop') };
}

describe('DEFLECT_BALL', () => {
  it('off: a ball at the edge of his reach he never touched is popped up beside him', async () => {
    const r = await edgeMiss('0');
    expect(r.air).toBe(true);
    expect(r.deflected).toBe(true);
    expect(r.logged).toBe(true);
  });
  it('on: the same untouched ball keeps its flight', async () => {
    const r = await edgeMiss('1');
    expect(r.air).toBe(true);
    expect(r.deflected).toBe(false);
    expect(r.logged).toBe(true);
  });
});

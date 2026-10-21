/** ZONE_ARM (experimental, off): a match-zone defender whose eyes are on the
 * quarterback breaks on the throwing motion, as spot droppers already do.
 * Staged like test/quarters-flat-wheel.test.ts: the weak curl-flat defender
 * in match Quarters, the ball just released after a windup he could see. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

const WINDUP = .2, RELEASE = 1, NOW = 1.05;

async function staged(arm: string, facing = Math.PI) {
  vi.stubEnv('ZONE_ARM', arm);
  vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { CoverageDefender } = await import('../src/sim/coverage/defender.js');
  const { sawThrow } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(401), 'Arm offense', 'ZAO', { strength: .6 });
  const defense = generateTeam(new Rng(402), 'Arm defense', 'ZAD', { strength: .6 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), seed: 41,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'zone arm' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, zoneStyle: 'match', label: 'zone arm' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false });
  const a = sim.defense.find(d => d.behavior instanceof CoverageDefender && d.behavior.zone === 'curl_flat_w')!;
  const r = sim.slot(sim.offAlign.numbering.W2!)!;
  a.body.pos = { x: 46, y: r.pos.y }; a.body.vel = { x: 0, y: 0 }; a.body.facing = facing;
  for (const d of sim.defense) d.recog!.read = 'pass';
  sim.t = NOW; sim.windupAt = WINDUP; sim.throwAt = RELEASE;
  sim.ball = { kind: 'air', flight: { pos: { x: 38, y: r.pos.y, z: 2 }, vel: { x: 20, y: 0, z: 0 }, drag: 0 },
    thrower: sim.qb, target: r, releaseT: RELEASE, releaseX: 35, intended: { x: 48, y: r.pos.y, z: 1.2 },
    arrivalT: RELEASE + .6, deflected: false, throwaway: false };
  sim.ballPath = [{ t: RELEASE + .6, x: 48, y: r.pos.y, z: 1.2 }];
  return { a, r, sim, style: (a.behavior as InstanceType<typeof CoverageDefender>).style, saw: sawThrow(a, sim, r) };
}

describe('ZONE_ARM', () => {
  it('off: a match defender reacts to the released ball, not the windup', async () => {
    const f = await staged('0');
    expect(f.style).toBe('match');
    expect(f.saw).toBe(false);
    expect(f.a.tags.has('readArm')).toBe(false);
  });

  it('on: a match defender with eyes on the quarterback breaks on the windup', async () => {
    const f = await staged('1');
    expect(f.saw).toBe(true);
    expect(f.a.tags.has('readArm')).toBe(true);
  });

  it('on: a defender running away from the quarterback cannot read the arm', async () => {
    const f = await staged('1', 0);
    expect(f.saw).toBe(false);
  });
});

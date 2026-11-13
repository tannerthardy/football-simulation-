/** CARRY_READ (defense.ts; experimental, off): a Cover 3 match corner over No. 1, square in his pedal, as No. 1 climbs.
 * Same fixture as test/cushion-break.test.ts. Off, as the receiver passes 3 yd/s the over-the-top roof (0.8 + 0.15
 * vx) asks a corner 7 yd over him to come downhill; on, he does not request ground back toward a receiver who will
 * still be climbing. A receiver who has stopped still pulls him down, flag on or off. With a planted foot (as in play), the depth check
 * stands aside, so the over-the-top request goes out as asked. Over a faster climber, his open-carry request asks only for the speed his chosen facing allows. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function step(flag: string, cushion: number, receiverVx: number, cornerVx = 0.5) {
  vi.resetModules();
  vi.stubEnv('CARRY_READ', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ManCoverage } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { directionalSpeedFactor } = await import('../src/physics/kinematics.js');
  const { angleDiff } = await import('../src/core/vec.js');
  const offense = generateTeam(new Rng(31), 'Read offense', 'RDO', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Read defense', 'RDD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'read' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3_match,
      pressure: null, zoneStyle: 'match', label: 'read' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const a = sim.slot('CB_S')!, r = sim.slot(sim.offAlign.numbering.S1!)!;
  r.body.pos = { x: sim.los + 3, y: r.pos.y }; r.body.vel = { x: receiverVx, y: 0 };
  a.body.pos = { x: r.pos.x + cushion, y: r.pos.y - .7 }; a.body.vel = { x: cornerVx, y: 0 }; a.body.facing = Math.PI;
  a.recog!.read = 'pass';
  // Mid-stride, as in play: a planted support foot (the depth check in DeepCoverage.choose stands aside while a foot
  // is down, so the over-the-top request goes out as asked; traced at 0.8-1.0 s in seeds 11/23).
  (a.body as { support?: unknown }).support = { ...(a.body.support ?? {}), xi: { x: 0, y: 0 }, state: 'up', since: 0, posture: 0,
    lean: { x: 0, y: 0 }, load: { x: 0, y: 0 }, foot: {} };
  const see = sim.see.bind(sim);
  sim.see = (who, target, delay) => target === r
    ? { pos: { ...r.pos }, vel: { ...r.vel }, facing: 0, stance: null, pose: 'up', carrying: false, age: .2 }
    : see(who, target, delay);
  sim.t = 0.9;
  const behavior = new ManCoverage(a, sim, r, false, 'B', 1,
    { lev: 'outside', overTop: true, protectDepth: true, initialPosition: { x: sim.los - 1, y: r.pos.y } });
  behavior.update(a, sim);
  const command = behavior.update(a, sim);
  const sp = Math.hypot(command.vel.x, command.vel.y);
  const cap = command.facing === undefined ? Infinity
    : a.profile.vmax * directionalSpeedFactor(a.profile, angleDiff(command.facing, Math.atan2(command.vel.y, command.vel.x)));
  return { vx: command.vel.x, sp, cap, hold: a.tags.has('carry-hold'), hips: behavior.recordedTechnique().hipsOpen };
}

describe('CARRY_READ: a deep carry plays off what the receiver can still become', () => {
  it('does not come downhill at a receiver who is still climbing (off: he does)', async () => {
    const off = await step('0', 7, 3.2), on = await step('1', 7, 3.2);
    expect(off.vx).toBeLessThan(-1);
    expect(on.vx).toBeGreaterThanOrEqual(-1e-6);
    expect(on.hold).toBe(true);
  });
  it('a receiver who has stopped still pulls him down, flag on or off', async () => {
    const off = await step('0', 7, 0), on = await step('1', 7, 0);
    expect(on.hold).toBe(false);
    expect(on.vx).toBeCloseTo(off.vx, 6);
  });
  it('asks only for the speed his chosen facing allows while he carries square or side-on', async () => {
    const on = await step('1', 9, 6.5, 3);
    expect(on.hips).toBe(false);
    expect(on.sp).toBeLessThanOrEqual(on.cap + 1e-6);
  });
});

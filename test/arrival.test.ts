/** Underneath arrival (defense.ts; experimental, off).
 * SHOULDER_READ: an underneath zone defender keying the QB plants on the throwing motion he has seen (stops his
 * drop, squares, no direction); a pump plants him too, and he restarts once he sees the ball pulled down.
 * ARRIVE_LEAD: on a ball he cannot beat to the catch, he aims where the catcher will be when he can arrive, not
 * at the catch point. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function windup(flag: string, opts: { ago?: number; pulledAgo?: number; away?: boolean } = {}) {
  vi.resetModules();
  vi.stubEnv('SHOULDER_READ', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ZoneCoverage } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(41), 'Read offense', 'RDO', { strength: .55 });
  const defense = generateTeam(new Rng(42), 'Read defense', 'RDD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'read' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, zoneStyle: 'spot', label: 'read' }, los: 40, ballY: 26, firstDownX: 50, seed: 5 });
  // Let the play develop with the ball in the QB's hands, so the defender has a held picture of the QB.
  sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  while (sim.t < 0.7) sim.tick();
  const deeper = sim.attackDir(sim.offense[0].team);
  // An underneath zone defender with his eyes on the QB, still dropping (his zone play takes him away from the line).
  const cands = sim.defense.filter(d => d.behavior instanceof ZoneCoverage && !(d.behavior as unknown as { deep?: boolean }).deep
    && !(d.behavior as { plastersScramble?: boolean }).plastersScramble
    && Math.cos(d.body.facing - Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x)) > 0.5);
  const a = cands.find(d => d.behavior.update(d, sim).vel.x * deeper > 0.3)!;
  if (opts.away) a.body.facing += Math.PI; // turned away from the QB: no view of the motion
  const free = a.behavior.update(a, sim); // his zone play, before any motion
  sim.windupAt = sim.t - (opts.ago ?? 0.4);
  const planted = a.behavior.update(a, sim);
  let after = planted;
  if (opts.pulledAgo !== undefined) {
    // The motion is pulled down (a pump) `pulledAgo` s ago.
    sim.windupAt = -1; sim.windupEndAt = sim.t - opts.pulledAgo;
    sim.t += 1e-6;
    after = a.behavior.update(a, sim);
  }
  const away = (c: { vel: { x: number; y: number } }) => c.vel.x * deeper;
  return { a, free, planted, after, away, tags: a.tags };
}

describe('SHOULDER_READ: the underneath plant on the throwing motion', () => {
  it('off: he keeps dropping; on: he stops his drop and keeps his lateral zone play', async () => {
    const off = await windup('0'), on = await windup('1');
    expect(off.tags.has('plant')).toBe(false);
    expect(off.away(off.planted)).toBeGreaterThan(0.3);
    expect(on.tags.has('plant')).toBe(true);
    expect(on.away(on.free)).toBeGreaterThan(0.3);
    expect(on.away(on.planted)).toBe(0);
    expect(on.planted.vel.y).toBeCloseTo(on.free.vel.y, 6);
  });
  it('a quick motion he has not yet seen (under his observation delay) gives him nothing', async () => {
    const quick = await windup('1', { ago: 0.02 });
    expect(quick.tags.has('plant')).toBe(false);
    expect(quick.away(quick.planted)).toBeGreaterThan(0.3);
  });
  it('turned away from the QB he does not see the motion', async () => {
    const away = await windup('1', { away: true });
    expect(away.tags.has('plant')).toBe(false);
  });
  it('a pump plants him; he restarts his drop only after seeing the ball pulled down', async () => {
    const justPulled = await windup('1', { pulledAgo: 0.01 });
    expect(justPulled.tags.has('plant-restart')).toBe(false);
    expect(justPulled.away(justPulled.after)).toBe(0);
    const seenPulled = await windup('1', { ago: 0.6, pulledAgo: 0.45 });
    expect(seenPulled.tags.has('plant-restart')).toBe(true);
    expect(seenPulled.away(seenPulled.after)).toBeGreaterThan(0.3);
  });
});

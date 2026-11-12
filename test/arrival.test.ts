/** Underneath arrival (defense.ts; experimental, off).
 * SHOULDER_READ: from the throwing motion, an underneath zone defender with his eyes on the QB leans toward the
 * receiver the QB's shoulders point at, before the ball is out. A look-off (the shoulders pointed at another
 * receiver) moves him the wrong way; a disciplined defender commits less.
 * ARRIVE_LEAD: on a ball he cannot beat to the catch, he aims where the catcher will be when he can arrive, not
 * at the catch point. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function windup(flag: string, pointAt: 'left' | 'right', discipline?: number) {
  vi.resetModules();
  vi.stubEnv('SHOULDER_READ', flag);
  vi.stubEnv('SEEN_EYES', '1'); // the QB's look as the defender sees it
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
  while (sim.t < 2.0) sim.tick();
  // An underneath zone defender with his eyes on the QB.
  const a = sim.defense.find(d => d.behavior instanceof ZoneCoverage && !(d.behavior as { plastersScramble?: boolean }).plastersScramble
    && Math.cos(d.body.facing - Math.atan2(sim.qb.pos.y - d.pos.y, sim.qb.pos.x - d.pos.x)) > 0.5)!;
  if (discipline !== undefined) {
    const ratings = { ...a.player.ratings, discipline };
    (a as { player: unknown }).player = { ...a.player, ratings };
  }
  // The two nearest eligible receivers, one each side of him.
  const recs = sim.offense.filter(o => o !== sim.qb && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot) && o.pos.x > sim.los + 3);
  const left = recs.filter(r => r.pos.y < a.pos.y).sort((p, q) => Math.abs(p.pos.y - a.pos.y) - Math.abs(q.pos.y - a.pos.y))[0];
  const right = recs.filter(r => r.pos.y >= a.pos.y).sort((p, q) => Math.abs(p.pos.y - a.pos.y) - Math.abs(q.pos.y - a.pos.y))[0];
  const target = pointAt === 'left' ? left : right;
  // The QB in his throwing motion, shoulders to `target` (what the defender sees).
  sim.windupAt = sim.t - 0.4;
  const see = sim.see.bind(sim);
  sim.see = (who, t, delay) => {
    const s = see(who, t, delay);
    return t === sim.qb ? { ...s, facing: Math.atan2(target.pos.y - sim.qb.pos.y, target.pos.x - sim.qb.pos.x) } : s;
  };
  sim.t += 1e-6; // a fresh look (the eyes read is cached per instant)
  const command = a.behavior.update(a, sim);
  return { command, side: Math.sign(target.pos.y - a.pos.y), speed: Math.hypot(command.vel.x, command.vel.y), tags: a.tags };
}

describe('SHOULDER_READ: an underneath defender reading the QB breaks on the motion toward his shoulders', () => {
  it('off: no lean before the ball is out; on: he moves toward the receiver the QB faces', async () => {
    const off = await windup('0', 'right'), on = await windup('1', 'right');
    expect(off.tags.has('shoulder-read')).toBe(false);
    expect(on.tags.has('shoulder-read')).toBe(true);
    expect(Math.sign(on.command.vel.y)).toBe(on.side);
  });
  it('a look-off moves him the wrong way', async () => {
    const lookLeft = await windup('1', 'left');
    expect(lookLeft.tags.has('shoulder-read')).toBe(true);
    expect(Math.sign(lookLeft.command.vel.y)).toBe(lookLeft.side);
  });
  it('a disciplined defender commits less of his break before the ball is out', async () => {
    const loose = await windup('1', 'right', 10), disciplined = await windup('1', 'right', 95);
    expect(disciplined.speed).toBeLessThan(loose.speed);
  });
});

/** WINDUP_READ (defense.ts; experimental, off): an underneath zone defender keyed on the throwing motion he sees
 * breaks on the receiver nearest the line the QB's body points along (his own delayed picture of the QB, a judgment
 * error per motion; zeroed here). A pump: he keeps his break until he sees the ball pulled down. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.resetModules(); });

async function stage(flag: string, opts: { point?: 'left' | 'right' | 'empty'; away?: boolean; pulledAgo?: number } = {}) {
  vi.resetModules();
  vi.stubEnv('WINDUP_READ', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ZoneCoverage, windupReads } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  vi.spyOn(Rng.prototype, 'normal').mockImplementation((mean: number) => mean);
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(41), 'O', 'RDO', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(42), 'D', 'RDD', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'read' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'read' },
    los: 40, ballY: 26, firstDownX: 50, seed: 5 });
  sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  while (sim.t < 0.7) sim.tick();
  // The weak hook backer, with two receivers placed in his area, one each side of him (as he sees them).
  const a = sim.defense.find(d => d.slot === 'LB_W' && d.behavior instanceof ZoneCoverage)!;
  expect(a).toBeDefined();
  const dirX = sim.attackDir(sim.offense[0].team);
  const place = new Map([[sim.slot('Y')!, { x: a.pos.x - 4 * dirX, y: a.pos.y - 5 }], [sim.slot('H')!, { x: a.pos.x - 4 * dirX, y: a.pos.y + 5 }]]);
  for (const [o, p] of place) o.body.pos = { ...p };
  const left = sim.slot('Y')!, right = sim.slot('H')!;
  const target = opts.point === 'left' ? left : opts.point === 'empty' ? null : right;
  // What he sees of the QB: his body pointing at `target` (or back toward his own goal: nobody there).
  const see = sim.see.bind(sim);
  sim.see = (who, t, delay) => {
    const s = see(who, t, delay);
    const placed = place.get(t as never);
    if (placed) return { ...s, pos: { ...placed } };
    if (t !== sim.qb) return s;
    return { ...s, facing: target ? Math.atan2(target.pos.y - sim.qb.pos.y, target.pos.x - sim.qb.pos.x) : Math.PI + Math.atan2(0, sim.attackDir(sim.offense[0].team)) };
  };
  if (opts.away) a.body.facing += Math.PI;
  sim.windupAt = sim.t - 0.4;
  const command = a.behavior.update(a, sim);
  let after = command;
  if (opts.pulledAgo !== undefined) {
    sim.windupAt = -1; sim.windupEndAt = sim.t - opts.pulledAgo; sim.t += 1e-6;
    after = a.behavior.update(a, sim);
  }
  return { a, command, after, target, side: target ? Math.sign(target.pos.y - a.pos.y) : 0, read: windupReads.get(a), tags: a.tags };
}

describe('WINDUP_READ: an underneath defender breaks on the direction of the throwing motion', () => {
  it('off: no break on the motion; on: he breaks toward the receiver it points at', async () => {
    const off = await stage('0', { point: 'right' }), on = await stage('1', { point: 'right' });
    expect(off.tags.has('windup-read')).toBe(false);
    expect(on.tags.has('windup-read')).toBe(true);
    expect(on.read?.target).toBe(on.target);
    expect(Math.sign(on.command.vel.y)).toBe(on.side);
  });
  it('the other direction sends him the other way (he reads the motion, not the catcher)', async () => {
    const left = await stage('1', { point: 'left' });
    expect(left.read?.target).toBe(left.target);
    expect(Math.sign(left.command.vel.y)).toBe(left.side);
  });
  it('a motion pointing where nobody is gives him no break', async () => {
    const empty = await stage('1', { point: 'empty' });
    expect(empty.tags.has('windup-read')).toBe(false);
  });
  it('turned away from the QB he reads nothing', async () => {
    const away = await stage('1', { point: 'right', away: true });
    expect(away.tags.has('windup-read')).toBe(false);
  });
  it('a pump: he keeps his break until he sees the ball pulled down, then stops breaking', async () => {
    const just = await stage('1', { point: 'right', pulledAgo: 0.01 });
    expect(Math.sign(just.after.vel.y)).toBe(just.side);
    expect(just.tags.has('plant-restart')).toBe(false);
    const seen = await stage('1', { point: 'right', pulledAgo: 0.35 });
    expect(seen.tags.has('plant-restart')).toBe(true);
  });
});

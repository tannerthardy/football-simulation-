/** OPEN_CARRY (defense.ts openCarryFacing; experimental, off): an underneath zone or match defender carrying a route keeps
 * his hips as square to the QB as his run allows. His opening off the QB is the smallest at which his body's facing
 * speed cap reaches the speed his carry request asks for; on a vertical, a deep teammate over the receiver in his own
 * picture caps him at side-on (he gives ground and the route goes to the help). */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type P = { x: number; y: number };
const deg = (r: number) => Math.abs(Math.atan2(Math.sin(r), Math.cos(r))) * 180 / Math.PI;

async function setup() {
  vi.resetModules();
  vi.stubEnv('OPEN_CARRY', '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { openCarryFacing } = await import('../src/sim/behaviors/defense.js');
  const offense = generateTeam(new Rng(71), 'Carry offense', 'CYO', { strength: .55 });
  const defense = generateTeam(new Rng(72), 'Carry defense', 'CYD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'carry' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'carry' },
    los: 40, ballY: 26, firstDownX: 50, seed: 7 });
  const receiver = sim.offense.find(o => o.slot !== 'QB' && !['LT', 'LG', 'C', 'RG', 'RT'].includes(o.slot))!;
  // What each defender sees: positions set per case; everyone else far away and not deeper than the receiver.
  const where = new Map<object, P>();
  const see = sim.see.bind(sim);
  sim.see = (who, t, d) => { const s = see(who, t, d); const p = where.get(t); return p ? { ...s, pos: { ...p } } : s; };
  for (const d of sim.defense) where.set(d, { x: 30, y: 26 });
  where.set(sim.qb, { x: 33, y: 26 });
  const facing = (a: typeof sim.defense[number], at: P, r: P, vel: P, help?: P) => {
    a.pos.x = at.x; a.pos.y = at.y;
    where.set(receiver, r);
    const helper = sim.defense.find(d => d !== a)!;
    where.set(helper, help ?? { x: 30, y: 26 });
    const toQB = Math.atan2(26 - at.y, 33 - at.x);
    return deg(openCarryFacing(a, sim, receiver, { vel: vel }, true) - toQB);
  };
  const crossFacing = (a: typeof sim.defense[number], at: P, r: P, vel: P) => {
    a.pos.x = at.x; a.pos.y = at.y; where.set(receiver, r);
    const toQB = Math.atan2(26 - at.y, 33 - at.x);
    return deg(openCarryFacing(a, sim, receiver, { vel }, false) - toQB);
  };
  return { sim, facing, crossFacing };
}

// An underneath defender 8 yd past the line, the receiver beside him on his outside.
const at = { x: 48, y: 22 }, r = { x: 47.5, y: 19.5 };

describe('OPEN_CARRY: an underneath carrier keeps his hips as square to the QB as his run allows', () => {
  it('a slow carry stays square; a fast vertical with no help turns him past side-on', async () => {
    const { sim, facing, crossFacing } = await setup();
    const a = sim.defense.find(d => /^(LB|NB|CB|S)/.test(d.slot))!;
    const slow = crossFacing(a, at, r, { x: 0, y: -2.5 });
    const fast = facing(a, at, r, { x: a.profile.vmax * 0.97, y: 0 });
    expect(slow).toBeLessThan(30);
    expect(fast).toBeGreaterThan(90);
  });
  it('with a deep teammate over the receiver in his picture, he opens no further than side-on', async () => {
    const { sim, facing } = await setup();
    const a = sim.defense.find(d => /^(LB|NB|CB|S)/.test(d.slot))!;
    const helped = facing(a, at, r, { x: a.profile.vmax * 0.97, y: 0 }, { x: 60, y: 21 });
    expect(helped).toBeCloseTo(90, 0);
  });
  it('help that has rotated away (not over the receiver in his picture) leaves him to turn', async () => {
    const { sim, facing } = await setup();
    const a = sim.defense.find(d => /^(LB|NB|CB|S)/.test(d.slot))!;
    const gone = facing(a, at, r, { x: a.profile.vmax * 0.97, y: 0 }, { x: 60, y: 45 });
    expect(gone).toBeGreaterThan(90);
  });
  it('for the same speed asked, the slower defender opens further', async () => {
    const { sim, crossFacing } = await setup();
    const ds = sim.defense.filter(d => /^(LB|NB|CB|S)/.test(d.slot)).sort((p, q) => p.profile.vmax - q.profile.vmax);
    const slow = ds[0], quick = ds[ds.length - 1];
    expect(quick.profile.vmax).toBeGreaterThan(slow.profile.vmax);
    const need = { x: 0, y: -0.85 * slow.profile.vmax };
    expect(crossFacing(slow, at, r, need)).toBeGreaterThan(crossFacing(quick, at, r, need));
  });
});

describe('OPEN_CARRY: an underneath match carrier inside a zone call keeps his eyes on the QB', () => {
  async function eyes(flag: string) {
    vi.resetModules();
    vi.stubEnv('OPEN_CARRY', flag);
    const { Rng } = await import('../src/core/rng.js');
    const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
    const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
    const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const { ManCoverage } = await import('../src/sim/behaviors/defense.js');
    const out: boolean[] = [];
    for (const concept of ['four_verts', 'curl_flat', 'mesh'] as const) for (let seed = 1; seed <= 6; seed++) {
      const pass = PASS_BY_ID[concept]; if (!pass) continue;
      const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(81), 'Eyes O', 'EYO', { strength: .55 }), '11'),
        defense: pickDefense(generateTeam(new Rng(82), 'Eyes D', 'EYD', { strength: .55 }), 'nickel'),
        offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass, label: 'eyes' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, zoneStyle: 'match', label: 'eyes' },
        los: 40, ballY: 26, firstDownX: 50, seed });
      sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
      while (sim.t < 2.5) {
        sim.tick();
        for (const d of sim.defense) {
          const b = d.behavior as { sub?: unknown; zoneEyes?: boolean };
          if (b.sub instanceof ManCoverage && !(b.sub as { opts: { protectDepth?: boolean } }).opts.protectDepth) out.push(b.zoneEyes === true);
        }
      }
    }
    return out;
  }
  it('off: a match man job reads his man; on: he keeps zone eyes', async () => {
    const off = await eyes('0'), on = await eyes('1');
    expect(off.length).toBeGreaterThan(0);
    expect(off.every(v => !v)).toBe(true);
    expect(on.every(v => v)).toBe(true);
  }, 120_000);
});

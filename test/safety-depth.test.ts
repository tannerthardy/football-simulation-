/** SAFETY_DEPTH (defense.ts; experimental, off): a deep or quarter-field zone defender's landmark is never shallower
 * than his alignment; a call that sends a safety down (an underneath zone) is unchanged. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function play(flag: string, coverage: string, deeper = false, concept = 'four_verts') {
  vi.resetModules();
  vi.stubEnv('SAFETY_DEPTH', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ZoneCoverage } = await import('../src/sim/behaviors/defense.js');
  const { isDeepZone } = await import('../src/playbook/alignment.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(51), 'O', 'SDO', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(52), 'D', 'SDD', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID[concept], label: concept },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
    los: 40, ballY: 26, firstDownX: 50, seed: 7 });
  // The QB holds the ball: a drop-back with nobody thrown to in the first second.
  sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  // Quarters: the strong safety lines up at 13.5 yd (deeper than his 12-yd landmark) and takes his zone from there.
  if (deeper) {
    const ss = sim.defense.find(d => d.slot === 'SS')!;
    ss.body.pos = { x: sim.los + 13.5, y: ss.pos.y };
    const z = ss.behavior as unknown as { zone: never; gap: never; gapSign: number };
    ss.behavior = new ZoneCoverage(ss, sim, z.zone, z.gap, z.gapSign);
  }
  const safeties = sim.defense.filter(d => d.pos.x - sim.los >= 9 && d.behavior?.kind === 'zone')
    .map(d => { const z = d.behavior as unknown as { zone: string; recordedLandmark?: () => { x: number } };
      return { d, zone: z.zone, deep: isDeepZone(z.zone as never), x0: d.pos.x - sim.los, lm: (z.recordedLandmark?.().x ?? NaN) - sim.los, min: Infinity }; });
  while (sim.t < 1.0) { sim.tick(); for (const s of safeties) s.min = Math.min(s.min, s.d.pos.x - sim.los); }
  return safeties;
}

describe('SAFETY_DEPTH: no deep landmark shallower than the alignment', () => {
  it('quarters vs four verticals, the safety aligned at 13.5: off, he has a landmark shallower than his alignment; on, none does and none comes downhill', async () => {
    const off = await play('0', 'cover4', true), on = await play('1', 'cover4', true);
    const deepOff = off.filter(s => s.deep), deepOn = on.filter(s => s.deep);
    expect(deepOn.length).toBeGreaterThan(0);
    expect(deepOff.some(s => s.lm < s.x0 - 0.3)).toBe(true);
    for (const s of deepOn) {
      expect(s.lm).toBeGreaterThanOrEqual(s.x0 - 1e-9);
      expect(s.x0 - s.min).toBeLessThan(0.3);
    }
  });
  it('a buzz call still sends its rotating safety down, exactly as without the flag', async () => {
    const off = await play('0', 'cover3_buzz', false, 'curl_flat'), on = await play('1', 'cover3_buzz', false, 'curl_flat');
    const down = on.filter(s => !s.deep), downOff = off.filter(s => !s.deep);
    expect(down.length).toBeGreaterThan(0);
    for (const [i, s] of down.entries()) {
      expect(s.x0 - s.min).toBeGreaterThan(0.3);
      expect(s.min).toBeCloseTo(downOff[i].min, 9);
    }
  });
  it.each(['cover2', 'cover3', 'cover4'])('four verticals vs %s: on, every deep safety stays deeper than the deepest route near him to 2.5 s, and no shallower than off', async (coverage) => {
    const run = async (flag: string) => {
      vi.resetModules();
      vi.stubEnv('SAFETY_DEPTH', flag);
      const { Rng } = await import('../src/core/rng.js');
      const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
      const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
      const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
      const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
      const { isDeepZone } = await import('../src/playbook/alignment.js');
      const { PlaySim } = await import('../src/sim/playsim.js');
      const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(51), 'O', 'SDO', { strength: .55 }), '11'),
        defense: pickDefense(generateTeam(new Rng(52), 'D', 'SDD', { strength: .55 }), 'nickel'),
        offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'verts' },
        defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null, label: coverage },
        los: 40, ballY: 26, firstDownX: 50, seed: 7 });
      sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
      const S = sim.defense.filter(d => d.pos.x - sim.los >= 9 && d.behavior?.kind === 'zone' && isDeepZone((d.behavior as unknown as { zone: never }).zone));
      const elig = sim.offense.filter(o => !['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(o.slot));
      let minOver = Infinity;
      while (sim.t < 2.5) {
        sim.tick();
        for (const d of S) {
          const near = elig.filter(o => Math.abs(o.pos.y - d.pos.y) <= 10);
          if (near.length) minOver = Math.min(minOver, d.pos.x - Math.max(...near.map(o => o.pos.x)));
        }
      }
      return { minOver, depth: S.map(d => d.pos.x - sim.los), n: S.length };
    };
    const off = await run('0'), on = await run('1');
    expect(on.n).toBeGreaterThan(0);
    expect(on.minOver).toBeGreaterThan(0);
    expect(Math.min(...on.depth)).toBeGreaterThan(Math.min(...off.depth) - 0.2);
  });
  it('a dig breaking flat at 12 yd under the middle safety: he stops gaining depth once he can see it, and stays over it', async () => {
    vi.resetModules();
    vi.stubEnv('SAFETY_DEPTH', '1');
    const { Rng } = await import('../src/core/rng.js');
    const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
    const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
    const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
    const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
    const { PlaySim } = await import('../src/sim/playsim.js');
    const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(51), 'O', 'SDO', { strength: .55 }), '11'),
      defense: pickDefense(generateTeam(new Rng(52), 'D', 'SDD', { strength: .55 }), 'nickel'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'dig' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
      los: 40, ballY: 26, firstDownX: 50, seed: 7 });
    sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
    const fs = sim.defense.find(d => (d.behavior as unknown as { zone?: string }).zone === 'deep_mid')!;
    expect(fs).toBeDefined();
    const elig = sim.offense.filter(o => !['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(o.slot));
    const dig = elig.sort((p, q) => Math.abs(p.pos.y - fs.pos.y) - Math.abs(q.pos.y - fs.pos.y))[0];
    for (const o of elig) if (o !== dig) o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
    // The dig: straight up to 12 yd, then flat across at 7 yd/s.
    dig.behavior = { kind: 'route', update: (a: { pos: { x: number } }) => (a.pos.x - sim.los < 12 ? { vel: { x: 7, y: 0 } } : { vel: { x: 0, y: 7 } }) } as never;
    // He sees the break after his delay and brakes his pedal at his body's rate; by 1.0 s after it he has stopped
    // gaining depth (no more than 0.5 yd over the next 0.5 s: what is left is his braking), still over the dig.
    let broke = -1, seen = NaN;
    while (sim.t < 6.5) {
      sim.tick();
      if (broke < 0 && dig.pos.x - sim.los >= 12) broke = sim.t;
      if (broke >= 0 && Number.isNaN(seen) && sim.t >= broke + 1.0) seen = fs.pos.x - sim.los;
      if (broke >= 0 && sim.t >= broke + 1.5) break;
    }
    expect(broke).toBeGreaterThan(0);
    expect(fs.pos.x - sim.los - seen).toBeLessThan(0.5);
    expect(fs.pos.x - dig.pos.x).toBeGreaterThan(0);
  });
});


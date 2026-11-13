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
});

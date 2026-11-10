/** DL_SNAP_TIME (snap-count.ts, experimental, off): a man on the line makes
 * timing the count his get-off: more on-line defenders time it, and timers go
 * closer to the snap (a rhythmic error of a few hundredths), while going early
 * stays the represented early() path. Off: the earlier share and spread. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function plans(on: boolean) {
  vi.stubEnv('SNAP_REACT', '1'); vi.stubEnv('DL_SNAP_TIME', on ? '1' : '0'); vi.resetModules();
  const { Rng } = await import('../src/core/rng.js');
  const { CENTER_Y } = await import('../src/core/field.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const o = generateTeam(new Rng(11), 'O', 'O', { strength: .55 }), dd = generateTeam(new Rng(12), 'D', 'D', { strength: .55 });
  let timed = 0, all = 0; const go: number[] = [];
  for (let seed = 1; seed <= 300; seed++) {
    const sim = new PlaySim({ offense: pickOffense(o, '11'), defense: pickDefense(dd, 'base43'),
      offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.smash, label: 'smash' },
      defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'over3' },
      los: 40, ballY: CENTER_Y, firstDownX: 50, seed });
    for (const d of sim.defense) {
      if (!/^(DE|DT|NT)/.test(d.slot)) continue;
      const p = sim.snapCount!.plans.get(d)!;
      all++;
      if (p.timed) { timed++; go.push(p.go); }
      // A reactor still waits for a visual response to the ball.
      else expect(p.go).toBeGreaterThanOrEqual(0.1);
    }
  }
  go.sort((a, b) => a - b);
  return { share: timed / all, go: go[Math.floor(go.length / 2)] };
}

describe('DL_SNAP_TIME', () => {
  it('on: more defensive linemen time the count, and timers go closer to the snap', async () => {
    const off = await plans(false), on = await plans(true);
    expect(on.share).toBeGreaterThan(off.share);
    expect(on.go).toBeLessThan(off.go - 0.02);
    expect(on.go).toBeGreaterThan(0);
  }, 120000);
});

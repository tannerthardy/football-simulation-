/** EYES_HEAD (defense.ts; experimental, off): a zone defender reads the QB's look from where his head points (his
 * gaze, delayed), not from his body facing. The look-off fixture: the QB's body squares to No. 1 strong while his head
 * holds on No. 1 weak (the decoy). Off, the defender takes the look to be on the strong No. 1 (body facing); on, on the
 * weak No. 1, and the strong hook defender ends up nearly 2 yd further toward the weak side (off he drifts 3.4 yd strong
 * with the body, on 1.4 yd). Receivers stand; the QB holds the ball. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function play(flag: string, until = 2.4) {
  vi.resetModules();
  vi.stubEnv('EYES_HEAD', flag);
  vi.stubEnv('SEEN_EYES', '1');
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const { seenQbEyes } = await import('../src/sim/behaviors/defense.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(61), 'O', 'EHO', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(62), 'D', 'EHD', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'script' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'spot', label: 'cover3' },
    los: 40, ballY: 26, firstDownX: 50, seed: 9 });
  const s1 = sim.slot(sim.offAlign.numbering.S1!)!, w1 = sim.slot(sim.offAlign.numbering.W1!)!;
  // The QB holds the ball; his head holds on the weak No. 1 (a look-off), his body squares to the strong No. 1.
  sim.qb.behavior = { kind: 'qb', update: () => { sim.qbEyes = w1; return { vel: { x: 0, y: 0 } }; } } as never;
  for (const o of sim.offense) if (!['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(o.slot)) o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  const see = sim.see.bind(sim);
  sim.see = (who, t, delay) => { const v = see(who, t, delay); return t === sim.qb ? { ...v, facing: Math.atan2(s1.pos.y - sim.qb.pos.y, s1.pos.x - sim.qb.pos.x) } : v; };
  const hook = sim.defense.find(d => (d.behavior as unknown as { zone?: string }).zone === 'hook_s')!;
  const towardWeak = Math.sign(w1.pos.y - sim.ballY) || 1;
  const y0 = hook.pos.y;
  let read: unknown = null;
  while (sim.t < until) { sim.tick(); read = seenQbEyes(hook, sim); }
  return { read: read === w1 ? 'weak' : read === s1 ? 'strong' : String(read && (read as { slot: string }).slot), drift: (hook.pos.y - y0) * towardWeak };
}

describe('EYES_HEAD: the look-off moves a zone defender who reads the head', () => {
  it('off, he reads the body facing (strong No. 1); on, the head on the weak No. 1, and he drifts that way', async () => {
    const off = await play('0'), on = await play('1');
    expect(off.read).toBe('strong');
    expect(on.read).toBe('weak');
    expect(on.drift).toBeGreaterThan(off.drift + 0.5);
  });
});

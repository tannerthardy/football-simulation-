/** CURL_FLAT_BACK (defense.ts; experimental, off): with No. 2 not carried vertically, the curl-flat defender breaks on
 * the back he sees showing to the flat on his side; with no back there, nothing changes; a vertical No. 2 is still
 * walled and carried first. Receivers are scripted; the QB holds the ball. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

type Script = 'curl' | 'vertical';
type Back = boolean | 'settled';
async function play(flag: string, two: Script, back: Back, until = 2.6, look?: 'curl' | 'flat') {
  vi.resetModules();
  vi.stubEnv('CURL_FLAT_BACK', flag);
  vi.stubEnv('SEEN_EYES', '1'); // the QB's look as the defender sees it (promoted; the suite runs pre-promotion)
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const sim = new PlaySim({ offense: pickOffense(generateTeam(new Rng(61), 'O', 'CFO', { strength: .55 }), '11'),
    defense: pickDefense(generateTeam(new Rng(62), 'D', 'CFD', { strength: .55 }), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'script' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'cover3' },
    los: 40, ballY: 26, firstDownX: 50, seed: 9 });
  sim.qb.behavior = { kind: 'qb', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  const cf = sim.defense.find(d => (d.behavior as unknown as { zone?: string }).zone === 'curl_flat_s')!;
  const sign = Math.sign(cf.pos.y - sim.ballY) || 1;
  const n2 = sim.slot(sim.offAlign.numbering.S2!)!, rb = sim.slot('RB')!;
  for (const o of sim.offense) if (!['LT', 'LG', 'C', 'RG', 'RT', 'QB'].includes(o.slot) && o !== n2 && o !== rb) o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) } as never;
  // No. 2: a curl (up to 9 yd, then settles) or a vertical; the back: out to the flat on the curl-flat side, or he stays in.
  n2.behavior = { kind: 'route', update: (o: { pos: { x: number } }) => (two === 'vertical' || o.pos.x - sim.los < 9 ? { vel: { x: 7, y: 0 } } : { vel: { x: -0.5, y: 0 } }) } as never;
  // The back: out to the flat (still running), or already settled there from the start (7 yd outside the ball, a yard
  // behind the line, standing: never "showing", only there).
  if (back === 'settled') rb.body.pos = { x: sim.los - sim.attackDir(sim.offense[0].team), y: sim.ballY + sign * 7 };
  rb.behavior = { kind: 'route', update: () => (back === true ? { vel: { x: 0.8, y: sign * 7.5 } } : { vel: { x: 0, y: 0 } }) } as never;
  if (look) {
    // What the defender sees of the QB: facing No. 2's curl or the back in the flat.
    const see = sim.see.bind(sim), aim = look === 'curl' ? n2 : rb;
    sim.see = (who, t, delay) => { const v = see(who, t, delay); return t === sim.qb ? { ...v, facing: Math.atan2(aim.pos.y - sim.qb.pos.y, aim.pos.x - sim.qb.pos.x) } : v; };
  }
  const path: Array<{ t: number; y: number; x: number }> = [];
  while (sim.t < until) { sim.tick(); path.push({ t: sim.t, y: (cf.pos.y - sim.ballY) * sign, x: cf.pos.x - sim.los }); }
  return { path, out: (cf.pos.y - sim.ballY) * sign, rbOut: (rb.pos.y - sim.ballY) * sign, tags: cf.tags, toRb: Math.hypot(cf.pos.x - rb.pos.x, cf.pos.y - rb.pos.y) };
}

describe('CURL_FLAT_BACK: the curl-flat defender breaks on a back to his flat', () => {
  it('No. 2 curls and the back releases to the flat: on, he widens under the curl toward the back (closer to him) without coming down to the flat before the throw', async () => {
    const off = await play('0', 'curl', true, 3.2), on = await play('1', 'curl', true, 3.2);
    expect(on.tags.has('curl-flat-back')).toBe(true);
    expect(off.tags.has('curl-flat-back')).toBe(false);
    expect(on.toRb).toBeLessThan(off.toRb - 1);
    expect(on.path.at(-1)!.x).toBeGreaterThan(2);
  });
  it('no back in the flat: nothing changes', async () => {
    const off = await play('0', 'curl', false), on = await play('1', 'curl', false);
    expect(on.tags.has('curl-flat-back')).toBe(false);
    for (let i = 0; i < off.path.length; i++) expect(on.path[i].y).toBeCloseTo(off.path[i].y, 9);
  });
  it('a vertical No. 2 is still walled first: identical to off until he hands it off', async () => {
    const off = await play('0', 'vertical', true, 1.0), on = await play('1', 'vertical', true, 1.0);
    for (let i = 0; i < off.path.length; i++) expect(on.path[i].y).toBeCloseTo(off.path[i].y, 6);
  });
  it('the QB eyes decide how far he cheats: on the curl he hangs in the window, on the flat he widens', async () => {
    const curl = await play('1', 'curl', true, 3.2, 'curl'), flat = await play('1', 'curl', true, 3.2, 'flat');
    expect(flat.out).toBeGreaterThan(curl.out + 1);
    expect(flat.toRb).toBeLessThan(curl.toRb);
  });
  it('a back already settled in the flat is still his to widen to', async () => {
    const off = await play('0', 'curl', 'settled', 3.4), on = await play('1', 'curl', 'settled', 3.4);
    expect(on.rbOut).toBeGreaterThan(5);
    expect(on.tags.has('curl-flat-back')).toBe(true);
    expect(on.toRb).toBeLessThan(off.toRb - 1);
  });
});

/** CUSHION_BREAK (defense.ts; experimental, off): a deep match corner over a
 * receiver climbing at 6.5 yd/s, square in his pedal. With 3 yd of cushion,
 * off he is already turned to run (the burst term and the depth check open him
 * at 3.5 yd and below); on he keeps his pedal, square to the QB. With the cushion broken (0.4 yd: the receiver
 * reaches his body during his half turn), he opens and runs either way. A carry with help behind him (no deep
 * responsibility) may let the receiver come a body closer before he opens. */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

async function step(flag: string, cushion: number, receiverVx = 6.5, protectDepth = true, backpedal?: number) {
  vi.resetModules();
  vi.stubEnv('CUSHION_BREAK', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { ManCoverage } = await import('../src/sim/behaviors/defense.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(31), 'Break offense', 'BRO', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Break defense', 'BRD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'break' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3_match,
      pressure: null, zoneStyle: 'match', label: 'break' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const a = sim.slot('CB_S')!, r = sim.slot(sim.offAlign.numbering.S1!)!;
  // Receiver 8 yd downfield climbing at 6.5 yd/s; the corner square in his pedal at 5 yd/s, `cushion` yd over him.
  r.body.pos = { x: sim.los + 8, y: r.pos.y }; r.body.vel = { x: receiverVx, y: 0 };
  a.body.pos = { x: r.pos.x + cushion, y: r.pos.y - .7 }; a.body.vel = { x: 5, y: 0 }; a.body.facing = Math.PI;
  a.recog!.read = 'pass';
  if (backpedal !== undefined) { a.body.profile = { ...a.body.profile, backpedal }; (a as { profile: unknown }).profile = a.body.profile; }
  const see = sim.see.bind(sim);
  sim.see = (who, target, delay) => target === r
    ? { pos: { ...r.pos }, vel: { ...r.vel }, facing: 0, stance: null, pose: 'up', carrying: false, age: .2 }
    : see(who, target, delay);
  sim.t = 1.4;
  const behavior = new ManCoverage(a, sim, r, false, 'B', 1,
    { lev: 'outside', overTop: protectDepth, protectDepth, initialPosition: { x: sim.los - 1, y: r.pos.y } });
  behavior.update(a, sim);
  const command = behavior.update(a, sim);
  return { command, hipsOpen: behavior.recordedTechnique().hipsOpen, toQB: Math.atan2(sim.qb.pos.y - a.pos.y, sim.qb.pos.x - a.pos.x) };
}

describe('CUSHION_BREAK: a deep defender stays square until the receiver breaks his cushion', () => {
  it('keeps his pedal with 3 yd of cushion (off: turned to run)', async () => {
    const off = await step('0', 3), on = await step('1', 3);
    expect(off.command.facing).toBeUndefined();
    // On: hips not open, and the QB (toward -x) stays in view: square, or side-on when the pedal cannot keep up.
    expect(on.hipsOpen).toBe(false);
    expect(on.command.facing).toBeDefined();
    expect(Math.cos(on.command.facing! - Math.PI)).toBeGreaterThan(-0.19);
  });
  it('stays square over a receiver who has stopped at 3 yd of cushion', async () => {
    const on = await step('1', 3, 0);
    expect(on.hipsOpen).toBe(false);
    expect(on.command.facing).toBeCloseTo(Math.PI, 1);
  });
  it('opens and runs once the cushion is broken, flag on or off', async () => {
    const off = await step('0', 0.4), on = await step('1', 0.4);
    expect(off.hipsOpen).toBe(true);
    expect(on.hipsOpen).toBe(true);
  });
  it('with help behind him, a carry lets the receiver come closer before he opens', async () => {
    const noHelp = await step('1', 1.0), help = await step('1', 1.0, 6.5, false), past = await step('1', -1.5, 6.5, false);
    expect(noHelp.hipsOpen).toBe(true);
    expect(help.hipsOpen).toBe(false);
    expect(past.hipsOpen).toBe(true);
  });
});

/** Shoulder offset: in a live Cover 3 match play, the boundary corner carrying #1 on four verts plays a shoulder
 * (both bodies plus a reach) off the receiver's line, so when the receiver comes level he passes the shoulder
 * without body contact. */
async function carry(flag: string) {
  vi.resetModules(); vi.stubEnv('CUSHION_BREAK', flag);
  const { Rng } = await import('../src/core/rng.js');
  const { generateTeam, pickDefense, pickOffense } = await import('../src/league/team.js');
  const { PASS_BY_ID } = await import('../src/playbook/concepts.js');
  const { COVERAGE_BY_ID, FRONT_BY_ID } = await import('../src/playbook/defense.js');
  const { FORMATION_BY_ID } = await import('../src/playbook/formations.js');
  const { PlaySim } = await import('../src/sim/playsim.js');
  const offense = generateTeam(new Rng(31), 'Break offense', 'BRO', { strength: .55 });
  const defense = generateTeam(new Rng(32), 'Break defense', 'BRD', { strength: .55 });
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'carry' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3_match,
      pressure: null, zoneStyle: 'match', label: 'carry' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const a = sim.slot('CB_S')!, r = sim.slot(sim.offAlign.numbering.S1!)!;
  let min = Infinity, lateral = NaN;
  while (sim.t < 3.2 && sim.ball.kind !== 'air') {
    sim.tick();
    if (sim.t < 1) continue;
    min = Math.min(min, Math.hypot(a.pos.x - r.pos.x, a.pos.y - r.pos.y));
    if (Number.isNaN(lateral) && r.pos.x >= a.pos.x) lateral = Math.abs(a.pos.y - r.pos.y);
  }
  return { min, lateral, radii: a.profile.radius + r.profile.radius };
}

describe('CUSHION_BREAK: a carry plays a shoulder off the receiver\'s line', () => {
  it('a receiver who comes level passes the shoulder without body contact', async () => {
    const on = await carry('1');
    expect(on.lateral).toBeGreaterThan(on.radii + 0.3);
    expect(on.min).toBeGreaterThan(on.radii + 0.3);
  });
});

describe('CUSHION_BREAK: he opens off the QB only as far as spending his cushion allows', () => {
  // A body whose backpedal is the slowest way back (as under PEDAL_CAP). He
  // spends spare cushion rather than matching the receiver: far over the top
  // he stays near square; as the cushion runs down he opens; a faster receiver
  // opens him sooner; a slow one never takes him past 45 deg.
  const angle = async (vx: number, cushion: number) => {
    const r = await step('1', cushion, vx, true, 0.48);
    if (r.command.facing === undefined) return 180;
    return Math.abs(Math.atan2(Math.sin(r.command.facing - r.toQB), Math.cos(r.command.facing - r.toQB))) * 180 / Math.PI;
  };
  it('opens as the cushion runs down and sooner for a faster receiver; a slow one stays under 45 deg', async () => {
    expect(await angle(3, 3)).toBeLessThanOrEqual(45);
    const far = await angle(7, 6), near = await angle(7, 2.5);
    expect(near).toBeGreaterThan(far);
    expect(await angle(8, 4)).toBeGreaterThan(await angle(5, 4));
  });
});

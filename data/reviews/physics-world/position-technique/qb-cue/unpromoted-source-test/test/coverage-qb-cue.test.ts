import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(71), 'O', 'O', { strength: .6 });
const defense = generateTeam(new Rng(91), 'D', 'D', { strength: .6 });
const cue = (x: number, y: number, vx = 0, vy = 0, facing = 0): Perceived => ({
  pos: { x, y }, vel: { x: vx, y: vy }, facing, stance: null, pose: 'up', age: .2,
});

/** Isolate information from motor capacity: the same ordinary players and
 * consumed delayed pictures are retained across each counterfactual. */
function fixture(zone: ConstructorParameters<typeof ZoneCoverage>[2] = 'hook_mid',
  style: 'spot' | 'match' = 'match') {
  const sim = new PlaySim({
    offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), seed: 3,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4,
      pressure: null, zoneStyle: style, label: '' },
    los: 40, ballY: CENTER_Y, firstDownX: 50,
  });
  const a = sim.slot(zone.startsWith('deep') || zone.startsWith('quarter') ? 'FS' : 'LB_M')!;
  a.body.pos = { x: zone.startsWith('deep') || zone.startsWith('quarter') ? 55 : 50.5, y: CENTER_Y };
  a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI;
  a.recog!.read = 'pass';
  sim.qb.body.pos = { x: 35, y: CENTER_Y }; sim.qb.body.vel = { x: 0, y: 0 };
  const samples = new Map<Agent, Perceived>();
  for (const r of sim.agents) {
    const seen = cue(35, 1);
    samples.set(r, seen);
    if (r !== a && r !== sim.qb) { r.body.pos = { ...seen.pos }; r.body.vel = { ...seen.vel }; }
  }
  samples.set(sim.qb, cue(35, CENTER_Y));
  const spy = vi.spyOn(sim, 'see').mockImplementation((_observer, target) => {
    const seen = samples.get(target)!;
    return { ...seen, pos: { ...seen.pos }, vel: { ...seen.vel } };
  });
  sim.t = 1;
  const behavior = () => new ZoneCoverage(a, sim, zone, 'B', 1, style);
  const set = (r: Agent, seen: Perceived) => {
    samples.set(r, seen); r.body.pos = { ...seen.pos }; r.body.vel = { ...seen.vel }; r.body.facing = seen.facing;
  };
  const observe = () => {
    const b = behavior();
    const command = b.update(a, sim);
    return { command, target: b.target?.idx ?? null };
  };
  return { sim, a, samples, spy, set, behavior, observe, left: sim.slot('X')!, right: sim.slot('H')! };
}

function twoRoutes(f: ReturnType<typeof fixture>, vertical = false) {
  f.set(f.left, cue(48, CENTER_Y - 3, vertical ? 6 : 0));
  f.set(f.right, cue(48, CENTER_Y + 3, vertical ? 6 : 0));
}

function look(f: ReturnType<typeof fixture>, side: -1 | 0 | 1) {
  f.samples.set(f.sim.qb, cue(35, CENTER_Y, 0, 0, Math.atan2(side * 3, 13)));
}

describe('zone coverage uses a bounded delayed QB body-direction cue', () => {
  it.each([
    ['deep_mid', 'match', false], ['deep_mid', 'match', true],
    ['hook_mid', 'match', true], ['hook_mid', 'spot', true],
  ] as const)('ignores hidden read identity and current receiver position in %s %s (routes=%s)', (zone, style, routes) => {
    const f = fixture(zone, style);
    if (routes) twoRoutes(f, zone.startsWith('deep'));
    look(f, -1);
    f.sim.qbEyes = f.left;
    const first = f.observe();
    f.sim.qbEyes = f.right;
    // These current bodies intentionally contradict the fixed consumed images.
    // In particular, there is no legitimate way to follow this hidden target.
    f.left.body.pos = { x: 95, y: 4 };
    f.right.body.pos = { x: 20, y: 49 };
    f.sim.qb.body.facing = 1.7;
    f.sim.qb.body.pos = { x: 32, y: 10 };
    expect(f.observe()).toEqual(first);
    f.sim.qbEyes = null;
    expect(f.observe()).toEqual(first);
  });

  it('prefers the observed QB corridor among otherwise equal underneath threats', () => {
    const f = fixture(); twoRoutes(f);
    f.sim.qbEyes = null;
    look(f, -1); const left = f.observe();
    look(f, 1); const right = f.observe();
    expect(left.target).toBe(f.left.idx);
    expect(right.target).toBe(f.right.idx);
    expect(left.command.vel.y).toBeLessThan(right.command.vel.y);
  });

  it('uses the visible direction to lean between verticals without identifying an internal read', () => {
    const f = fixture('deep_mid'); twoRoutes(f, true);
    f.sim.qbEyes = null;
    look(f, -1); const left = f.observe();
    look(f, 1); const right = f.observe();
    expect(left.command.vel.y).toBeLessThan(0);
    expect(right.command.vel.y).toBeGreaterThan(0);
    expect(left.command.vel.x).toBeCloseTo(right.command.vel.x, 10);
  });

  it.each([['deep_mid', 'match'], ['hook_mid', 'spot']] as const)(
    'keeps equally aligned %s %s threats ambiguous instead of resolving their hidden identities', (zone, style) => {
    const f = fixture(zone, style); twoRoutes(f, zone.startsWith('deep')); look(f, 0);
    f.sim.qbEyes = f.left; const first = f.observe();
    f.sim.qbEyes = f.right; const second = f.observe();
    expect(first.command.vel.y).toBeCloseTo(0, 10);
    expect(second.command).toEqual(first.command);
  });

  it('keeps the installed quarters vertical ahead of an opposite-side QB cue', () => {
    const f = fixture('quarter_w_in');
    const one = f.sim.slot(f.sim.offAlign.numbering.W1!)!;
    const two = f.sim.slot(f.sim.offAlign.numbering.W2!)!;
    f.set(one, cue(49, CENTER_Y - f.sim.offAlign.strongSign * 9, 6));
    f.set(two, cue(48, CENTER_Y - f.sim.offAlign.strongSign * 5, 6));
    f.sim.qbEyes = one;
    f.samples.set(f.sim.qb, cue(35, CENTER_Y, 0, 0, Math.atan2(one.pos.y - CENTER_Y, 14)));
    const first = f.observe();
    expect(first.target).toBe(two.idx);
    f.samples.set(f.sim.qb, cue(35, CENTER_Y, 0, 0, Math.atan2(two.pos.y - CENTER_Y, 13)));
    expect(f.observe().target).toBe(two.idx);
  });

  it.each(['match', 'spot'] as const)('does not infer a new QB direction wholly behind the %s observer', style => {
    const f = fixture('hook_mid', style); twoRoutes(f);
    f.a.body.facing = 0; // QB is directly behind the body's observed field.
    f.sim.qbEyes = f.left; look(f, -1); const first = f.observe();
    f.sim.qbEyes = f.right; look(f, 1);
    expect(f.observe()).toEqual(first);
  });

  it('holds an empty deep-half landmark when a stationary QB and receivers have not declared a release', () => {
    const f = fixture('deep_half_s');
    f.a.body.pos = f.behavior().recordedLandmark();
    f.sim.qbEyes = null;
    // A neutral downfield torso is not evidence to leave a lateral half.
    f.samples.set(f.sim.qb, cue(35, CENTER_Y));
    const request = f.observe();
    expect(request.target).toBeNull();
    expect(request.command.vel).toEqual({ x: 0, y: 0 });
  });

  it('does not use QB orientation to choose between stationary unreleased underneath players', () => {
    const f = fixture('hole');
    f.a.body.pos = f.behavior().recordedLandmark();
    f.set(f.left, cue(f.sim.los, CENTER_Y - 3));
    f.set(f.right, cue(f.sim.los, CENTER_Y + 3));
    f.sim.qbEyes = null;
    f.samples.set(f.sim.qb, cue(35, CENTER_Y, 0, 0, Math.atan2(-3, 5)));
    const left = f.observe();
    f.samples.set(f.sim.qb, cue(35, CENTER_Y, 0, 0, Math.atan2(3, 5)));
    expect(f.observe()).toEqual(left);
  });

  it('holds a settled spot-hook landmark rather than following a bare QB body ray', () => {
    const f = fixture('hook_mid', 'spot');
    f.a.body.pos = f.behavior().recordedLandmark();
    f.set(f.left, cue(f.sim.los, CENTER_Y - 3));
    f.set(f.right, cue(f.sim.los, CENTER_Y + 3));
    f.sim.qbEyes = null; look(f, 1);
    const request = f.observe();
    expect(request.target).toBeNull();
    expect(request.command.vel).toEqual({ x: 0, y: 0 });
  });

  it('changes its route preference only after the release enters the consumed picture', () => {
    const f = fixture('hole');
    f.a.body.pos = f.behavior().recordedLandmark();
    f.set(f.left, cue(f.sim.los, CENTER_Y - 3));
    f.set(f.right, cue(f.sim.los, CENTER_Y + 3));
    f.sim.qbEyes = null;
    const orient = (side: -1 | 1) => f.samples.set(f.sim.qb,
      cue(35, CENTER_Y, 0, 0, Math.atan2(side * 3, 5)));
    orient(-1); const unreleased = f.observe();
    // Hidden current releases cannot justify a preference while the stored
    // visual samples remain stationary at the line.
    f.left.body.vel = f.right.body.vel = { x: 2, y: 0 };
    orient(1); expect(f.observe()).toEqual(unreleased);
    f.samples.set(f.left, cue(f.sim.los, CENTER_Y - 3, 2));
    orient(-1); const left = f.observe();
    f.samples.set(f.left, cue(f.sim.los, CENTER_Y - 3));
    f.samples.set(f.right, cue(f.sim.los, CENTER_Y + 3, 2));
    orient(1); const right = f.observe();
    expect(left.target).toBe(f.left.idx);
    expect(right.target).toBe(f.right.idx);
    expect(left.command.vel.y).toBeLessThan(right.command.vel.y);
  });

  it('waits for an orientation change to reach the real perception buffer', () => {
    const f = fixture(); twoRoutes(f);
    f.spy.mockRestore();
    f.sim.qbEyes = f.right;
    const angle = Math.atan2(3, 13);
    f.sim.qb.body.facing = -angle;
    for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
    const original = f.observe();
    expect(original.target).toBe(f.left.idx);
    f.sim.qb.body.facing = angle;
    // No new snapshot: only hidden current body/read has changed.
    f.sim.qbEyes = f.left;
    expect(f.observe()).toEqual(original);
    for (let k = 0; k < 24; k++) f.sim.perception.record(f.sim.agents);
    expect(f.observe().target).toBe(f.right.idx);
  });
});

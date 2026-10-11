import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { gapY } from '../src/playbook/alignment.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Gap } from '../src/playbook/types.js';
import { ManCoverage, playBall } from '../src/sim/behaviors/defense.js';
import { chase } from '../src/sim/behaviors/common.js';
import { PlaySim } from '../src/sim/playsim.js';
import type { Perceived } from '../src/sim/perception.js';
import type { Read } from '../src/sim/recognition.js';
import type { ReplayLevel } from '../src/sim/types.js';

const offense = generateTeam(new Rng(31), 'Run-fit offense', 'RFO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Run-fit defense', 'RFD', { strength: .55 });

/** Native Duo first-retreat geometry translated to LOS40. The interpreted
 * run/possession picture is explicit; this unit fixture does not claim that
 * recognition or eyes acquired those cues naturally. */
function stage(carrying: Perceived['carrying'] = true, side = 1, read: Read = 'run', targetSlot = 'RB', formationId = 'gun_trey_11', recordLevel?: ReplayLevel) {
  const formation = FORMATION_BY_ID[formationId];
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'Coverage control' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover1_off,
      pressure: null, label: 'Off man' }, los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
    record: !!recordLevel, recordLevel });
  const a = sim.slot('LB_M')!, r = sim.slot(targetSlot)!;
  sim.t = 1.6;
  a.body.pos = { x: 44.08588139441866, y: CENTER_Y + side * -.119785161154757 };
  a.body.vel = { x: -1.5526439808590662, y: side * -.863536808149384 };
  a.body.facing = Math.PI;
  r.body.pos = { x: 36.900000000000006, y: CENTER_Y + side * -.090965714972685 };
  r.body.vel = { x: 3.23, y: side * -.85 };
  a.runFit = { gap: 'B', side, kind: 'insert', technique: 'attack', edge: 'spill', pace: 'stack' };
  a.recog!.read = read;
  // Mirror a single controlled placement error rather than independently
  // sampling execution precision in a symmetry test.
  Object.defineProperty(a.mind, 'placementError', { get: () => side * .05 });
  let picture: Perceived = { pos: { x: 36.83066234224867, y: CENTER_Y + side * -.090965714972685 },
    vel: { x: 3.2259639771256174, y: side * -.8518775575956542 }, stance: null,
    facing: side * -.08953916744793756, pose: 'up', age: .2, carrying };
  const originalSee = sim.see.bind(sim);
  sim.see = (observer, target, delay) => target === r ? picture : originalSee(observer, target, delay);
  const behavior = new ManCoverage(a, sim, r, false, 'B', side);
  a.behavior = behavior;
  return { sim, a, r, behavior, update: () => behavior.update(a, sim),
    picture: () => picture, setPicture: (next: Perceived) => { picture = next; } };
}

describe('inside man players insert from their acquired back possession', () => {
  it.each([-1, 1])('stops maintaining receiver cushion after run plus positive possession, side=%s', side => {
    const f = stage(true, side), unknown = stage(null, side);
    const command = f.update();
    expect(command.vel.x).toBeLessThan(-1);
    expect(unknown.update().vel.x).toBeGreaterThan(0);
    expect(command.facing).toBe(Math.PI);
  });

  it('cannot instantly reverse a late retreat and uses the unchanged World traction budget', () => {
    const f = stage();
    f.a.body.vel = { x: 3.5, y: -.2 };
    const before = structuredClone(f.a.body), command = f.update();
    expect(command.vel.x).toBeLessThan(0);
    expect(f.a.body).toEqual(before);
    const world = new World([f.a.body]);
    const report = world.step([command], .05);
    expect(f.a.vel.x).toBeLessThan(before.vel.x);
    expect(f.a.vel.x).toBeGreaterThan(0);
    expect(f.a.body.support!.state).toBe('up');
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
      .toBeLessThanOrEqual(supportParams(f.a.profile).traction * .05 + 1e-8);
    expect(report.armImpulse[0]).toBe(0);
  });

  it('mirrors both the requested insertion and actual motor response', () => {
    const right = stage(true, 1), left = stage(true, -1);
    const r = right.update(), l = left.update();
    expect(r.vel.x).toBeCloseTo(l.vel.x, 10);
    expect(r.vel.y).toBeCloseTo(-l.vel.y, 10);
    new World([right.a.body]).step([r], .05);
    new World([left.a.body]).step([l], .05);
    expect(right.a.pos.x).toBeCloseTo(left.a.pos.x, 10);
    expect(right.a.pos.y + left.a.pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(right.a.vel.x).toBeCloseTo(left.a.vel.x, 10);
    expect(right.a.vel.y).toBeCloseTo(-left.a.vel.y, 10);
  });

  it('uses its installed insertion gap rather than simply chasing the deep mesh', () => {
    const inside = stage(), outside = stage();
    inside.a.runFit!.gap = 'A'; outside.a.runFit!.gap = 'B';
    const a = inside.update(), b = outside.update();
    expect(a.vel.y).not.toBeCloseTo(b.vel.y, 4);
    expect(a.vel.x).toBeLessThan(0); expect(b.vel.x).toBeLessThan(0);
    expect(a.vel).not.toEqual(chase(inside.sim, inside.a, inside.r).vel);
    expect(b.vel).not.toEqual(chase(outside.sim, outside.a, outside.r).vel);
  });

  it('supports an installed fullback key without relabeling a receiver as a back', () => {
    const f = stage(true, 1, 'run', 'F', 'i_pro_21'), unknown = stage(null, 1, 'run', 'F', 'i_pro_21');
    expect(f.r.player.position).toBe('FB');
    expect(f.sim.offAlign.spots.F.backfield).toBe(true);
    expect(f.update().vel.x).toBeLessThan(-1);
    expect(unknown.update().vel.x).toBeGreaterThan(0);
  });

  it('does not follow hidden current possession, handoff, scramble, call kind or body displacement', () => {
    const one = stage(), two = stage();
    one.sim.ball = { kind: 'held', carrier: one.r }; one.sim.handoffAt = 1.05; one.sim.isPass = false;
    two.sim.ball = { kind: 'held', carrier: two.sim.qb }; two.sim.handoffAt = -1; two.sim.isPass = true;
    two.sim.scrambled = true; two.sim.offCall.kind = 'run';
    two.r.body.pos = { x: 75, y: 2 }; two.r.body.vel = { x: -8, y: 0 };
    expect(one.update()).toEqual(two.update());
    expect(one.sim.rng.nextU32()).toBe(two.sim.rng.nextU32());
  });

  it.each([false, null, undefined])('negative/unknown carrying=%s does not invent a run-fit transition', carrying => {
    const f = stage(carrying), unknown = stage(null);
    if (carrying === undefined) { const { carrying: ignored, ...legacy } = f.picture(); f.setPicture(legacy); void ignored; }
    expect(f.update()).toEqual(unknown.update());
    expect(f.update().vel.x).toBeGreaterThan(0);
  });

  it.each(['unsure', 'pass'] as const)('positive possession does not overwrite a %s interpretation', read => {
    const f = stage(true, 1, read), unknown = stage(null, 1, read);
    expect(f.update()).toEqual(unknown.update());
    expect(f.a.recog!.read).toBe(read);
  });

  it('waits until a changed consumed picture actually carries the possession cue', () => {
    const f = stage(false);
    f.sim.ball = { kind: 'held', carrier: f.r }; f.sim.handoffAt = 1.05;
    expect(f.update().vel.x).toBeGreaterThan(0);
    f.sim.t += .05; f.setPicture({ ...f.picture(), carrying: true });
    expect(f.update().vel.x).toBeLessThan(-1);
  });

  it('keeps an originally split-out back in ordinary man responsibility', () => {
    const f = stage(true, 1, 'run', 'RB', 'gun_empty_11'), unknown = stage(null, 1, 'run', 'RB', 'gun_empty_11');
    expect(f.sim.offAlign.spots.RB.backfield).toBe(false);
    expect(f.update()).toEqual(unknown.update());
  });

  it('preserves outside receiver coverage even when an inside man player reads run', () => {
    const f = stage(true, 1, 'run', 'X'), unknown = stage(null, 1, 'run', 'X');
    expect(f.update()).toEqual(unknown.update());
  });

  it('keeps force/alley contracts outside the new inside-back insertion rule', () => {
    for (const kind of ['force', 'alley', 'cutback'] as const) {
      const f = stage(), unknown = stage(null);
      f.a.runFit!.kind = kind; unknown.a.runFit!.kind = kind;
      expect(f.update()).toEqual(unknown.update());
    }
  });

  it('a fooled man defender stays with a play-action fake absent positive carrying', () => {
    const f = stage(false), unknown = stage(null);
    f.sim.offCall.pass = PASS_BY_ID.pa_post_dig;
    f.sim.ball = { kind: 'held', carrier: f.sim.qb }; f.sim.handoffAt = -1;
    expect(f.a.recog!.read).toBe('run');
    expect(f.update()).toEqual(unknown.update());
    expect(f.update().vel.x).toBeGreaterThan(0);
  });

  it('retains the old visible blocking transition without treating negative possession as a block', () => {
    const f = stage(false);
    f.setPicture({ ...f.picture(), pos: { x: 39.5, y: CENTER_Y }, vel: { x: .6, y: 0 }, stance: 'low' });
    expect(f.update().vel.x).toBeLessThan(0);
    expect(f.sim.ball.kind === 'held' && f.sim.ball.carrier === f.sim.qb).toBe(true);
  });

  it('only attacks a declared observed crease and retains an away-side gap', () => {
    const fit = stage(), crease = stage();
    for (const f of [fit, crease]) f.setPicture({ ...f.picture(), pos: { x: 39, y: gapY(f.sim.offAlign, 'B', 1) } });
    fit.a.runFit!.gap = 'A' as Gap; fit.a.runFit!.side = -1;
    const anchored = fit.update(), attack = crease.update();
    expect(anchored.vel).not.toEqual(attack.vel);
    expect(anchored.vel.y).toBeLessThan(attack.vel.y);
  });

  it('preserves ordinary chase when the acquired marked runner is already past LOS', () => {
    const f = stage(), expected = stage();
    for (const item of [f, expected]) {
      item.setPicture({ ...item.picture(), pos: { x: 42.5, y: CENTER_Y } });
      item.sim.ball = { kind: 'held', carrier: item.r }; item.sim.isPass = false;
    }
    expect(f.update()).toEqual(chase(expected.sim, expected.a, expected.r));
  });

  it('lets the existing ball-in-flight technique own an old positive runner picture', () => {
    const f = stage(), expected = stage();
    for (const item of [f, expected]) {
      item.sim.throwAt = 1.4;
      item.sim.ball = { kind: 'air', flight: { pos: { x: 43, y: CENTER_Y, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
        thrower: item.sim.qb, target: item.r, releaseT: 1.4, releaseX: 35,
        intended: { x: 46, y: CENTER_Y, z: 1.2 }, arrivalT: 1.9, deflected: false, throwaway: false };
      item.sim.ballPath = [{ t: 1.9, x: 46, y: CENTER_Y, z: 1.2 }];
    }
    expect(f.update()).toEqual(playBall(expected.a, expected.sim, expected.r));
    expect(f.sim.rng.nextU32()).toBe(expected.sim.rng.nextU32());
  });

  it.each(['standard', 'full'] as const)('records first actual fit choice once at %s level without changing request or RNG', level => {
    const recorded = stage(true, 1, 'run', 'RB', 'gun_trey_11', level), plain = stage();
    expect(recorded.update()).toEqual(plain.update());
    expect(recorded.update()).toEqual(plain.update());
    const decisions = recorded.sim.trace.data!.decisions.filter(d => d.kind === 'coverage-run-fit');
    expect(decisions).toHaveLength(1);
    expect(decisions[0].cue).toContain('carrying=true in consumed picture');
    expect(decisions[0].detail).toContain('Installed B-gap');
    expect(decisions[0].detail).toContain('picture age 0.20 s');
    expect(decisions[0].detail).toContain('not confirmed live carrier');
    expect(recorded.sim.rng.nextU32()).toBe(plain.sim.rng.nextU32());
  });

  it('does not record fit decisions when its actual positive cue is absent', () => {
    const f = stage(false, 1, 'run', 'RB', 'gun_trey_11', 'full');
    f.update(); f.update();
    expect(f.sim.trace.data!.decisions.filter(d => d.kind === 'coverage-run-fit')).toHaveLength(0);
  });
});

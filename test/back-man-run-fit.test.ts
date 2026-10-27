import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { gapY } from '../src/playbook/alignment.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID, PRESSURE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Gap } from '../src/playbook/types.js';
import { ManCoverage, playBall, runFit, sawThrow } from '../src/sim/behaviors/defense.js';
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

/** G4-P127's first consumed positive-back picture, translated from LOS24
 * to LOS40. The FS keeps the actual Cover0/Under installed man and alley jobs.
 * As above, this controls interpreted cues rather than claiming natural cue
 * acquisition; the separate native witness proves where those cues occurred. */
function alleyStage(carrying: Perceived['carrying'] = true, side = 1, read: Read = 'run',
  targetSlot: 'RB' | 'F' = 'RB', formationId = 'gun_trey_11', recordLevel?: ReplayLevel) {
  const formation = FORMATION_BY_ID[formationId];
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall: { formation, flip: side < 0, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'Alley coverage control' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.under, coverage: COVERAGE_BY_ID.cover0,
      pressure: PRESSURE_BY_ID.zero_6, label: 'Under zero' },
    manPrefs: targetSlot === 'F' || formationId === 'gun_empty_11' ? { overrides: { FS: targetSlot } } : undefined,
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, record: !!recordLevel, recordLevel });
  const a = sim.slot('FS')!, r = sim.slot(targetSlot)!;
  // Capture installed geometry before the saved deep-mesh body staging.
  const installedLongitudinalSeparation = a.pos.x - r.pos.x;
  expect(a.behavior).toBeInstanceOf(ManCoverage);
  const behavior = a.behavior as ManCoverage;
  expect(behavior.target).toBe(r);
  sim.t = 1.3;
  a.body.pos = { x: 45.14624, y: CENTER_Y + side * (27.15307 - CENTER_Y) };
  a.body.vel = { x: -.19228, y: side * -.63923 };
  a.body.facing = Math.PI;
  r.body.pos = { x: 35.78665, y: CENTER_Y + side * (27.5608 - CENTER_Y) };
  r.body.vel = { x: 1.06839, y: side * -.3623 };
  a.recog!.read = read;
  Object.defineProperty(a.mind, 'placementError', { get: () => side * .05 });
  let picture: Perceived = { pos: { ...r.pos }, vel: { ...r.vel }, stance: null,
    facing: 0, pose: 'up', age: .25, carrying };
  const originalSee = sim.see.bind(sim);
  sim.see = (observer, target, delay) => target === r ? picture : originalSee(observer, target, delay);
  return { sim, a, r, behavior, installedLongitudinalSeparation, update: () => behavior.update(a, sim),
    picture: () => picture, setPicture: (next: Perceived) => { picture = next; } };
}

describe('inside man players insert from their acquired back possession', () => {
  it.each([-1, 1])('keeps fitting a visibly leading fullback as he accelerates, side=%s', side => {
    const f = stage(false, side, 'run', 'F', 'i_pro_21');
    for (const speed of [2.8, 3.45, 2.85]) {
      f.setPicture({ ...f.picture(), stance: 'low', vel: { x: speed, y: 0 } });
      expect(f.update().vel.x).toBeLessThan(-1);
      f.sim.t += .1;
    }
  });

  it('does not treat an upright fullback release or a pass interpretation as confirmed lead work', () => {
    for (const [read, stance] of [['run', 'high'], ['pass', 'low']] as const) {
      const f = stage(false, 1, read, 'F', 'i_pro_21');
      f.setPicture({ ...f.picture(), stance, vel: { x: 3.45, y: 0 } });
      expect(f.update().vel.x).toBeGreaterThan(0);
    }
  });

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
      .toBeLessThanOrEqual(report.groundImpulseLimit[0] + 1e-8);
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

  it('force/cutback markers play their own installed fit on the acquired carrying back', () => {
    // Receiver cushion on a ball carrier is a retreat with his back to the
    // ball (film G1-P003/P025, a 59-yd TD in a matched twin). The keyed fit
    // runs his own contract: force stays force, cutback stays cutback.
    for (const kind of ['force', 'cutback'] as const) {
      const f = stage(), expected = stage(), unknown = stage(null);
      for (const item of [f, expected, unknown]) item.a.runFit!.kind = kind;
      expect(f.update()).toEqual(runFit(expected.a, expected.sim, 'B', 1, { target: expected.r, cue: expected.picture() }));
      expect(f.update()).not.toEqual(unknown.update());
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

  it.each([-1, 1])('retains acquired insertion until throw recognition then transfers to the ball, side=%s', side => {
    const held = stage(true, side), f = stage(true, side), expected = stage(true, side);
    for (const item of [f, expected]) {
      item.sim.throwAt = 1.4;
      item.sim.ball = { kind: 'air', flight: { pos: { x: 43, y: CENTER_Y, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
        thrower: item.sim.qb, target: item.r, releaseT: 1.4, releaseX: 35,
        intended: { x: 46, y: CENTER_Y, z: 1.2 }, arrivalT: 1.9, deflected: false, throwaway: false }; item.sim.throwSight.stageRelease(item.sim, item.sim.throwAt);
      item.sim.ballPath = [{ t: 1.9, x: 46, y: CENTER_Y, z: 1.2 }];
    }
    // The fixtures' old .20-second flight is still unrecognized. Hidden
    // release does not cancel positive acquired possession and run belief.
    expect(sawThrow(f.a, f.sim, f.r)).toBe(false);
    expect(f.update()).toEqual(held.update());
    expect(f.sim.rng).toEqual(held.sim.rng);
    f.sim.throwAt = expected.sim.throwAt = .1;
    for (const item of [f, expected]) item.sim.throwSight.stageRelease(item.sim, item.sim.throwAt);
    for (const item of [f, expected]) {
      item.a.tags.add('looking');
      item.sim.ballPath = [{ t: item.sim.t + .1, x: item.a.pos.x - .2, y: item.a.pos.y, z: 1.2 }];
    }
    expect(sawThrow(f.a, f.sim, f.r)).toBe(true);
    expect(f.update()).toEqual(playBall(expected.a, expected.sim, expected.r));
    expect(f.a.tags.has('onBall')).toBe(true);
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

describe('back man markers preserve their installed alley support instead of receiver cushion', () => {
  it('uses the native FS alley cap at the deep mesh, preserving the last defensive level', () => {
    const fit = alleyStage(), man = alleyStage(null);
    expect(fit.a.runFit!.kind).toBe('alley');
    expect(fit.sim.offAlign.spots.RB.backfield).toBe(true);
    expect(fit.behavior.recordedTechnique().initialCushion).toBeCloseTo(fit.installedLongitudinalSeparation, 10);
    const command = fit.update(), ordinary = man.update(), direct = chase(fit.sim, fit.a, fit.r, 3.5);
    // A known runner at a deep mesh is not permission to collapse this FS
    // into the LB insertion or chase the ball directly into the backfield.
    const start = fit.a.pos.x, world = new World([fit.a.body]);
    for (let k = 0; k < 12; k++) {
      const report = world.step([fit.update()], .05);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      fit.sim.t += .05;
    }
    expect(fit.a.pos.x).toBeLessThan(start);
    expect(fit.a.pos.x).toBeGreaterThan(fit.sim.los + 4);
    expect(fit.a.body.support!.state).toBe('up');
    expect(command.vel.x).toBeLessThan(0);
    expect(ordinary.vel.x).toBeGreaterThan(0);
    expect(command.vel.x).toBeGreaterThan(-1);
    expect(command.vel).not.toEqual(direct.vel);
  });

  it('pursues a declared observed crease and brakes a retreat through the same mirrored World limits', () => {
    const right = alleyStage(), left = alleyStage(true, -1);
    for (const [f, side] of [[right, 1], [left, -1]] as const) {
      f.setPicture({ ...f.picture(), pos: { x: 39.2, y: CENTER_Y + side * 6 },
        vel: { x: 3.5, y: side * 1 } });
      f.a.body.vel = { x: 3.5, y: side * .2 };
    }
    const r = right.update(), l = left.update();
    // Request braking from the actual retreat velocity. A positive request
    // can still brake; the World checks below prove achieved deceleration.
    expect(r.vel.x).toBeLessThan(right.a.vel.x);
    expect(r).toEqual(chase(right.sim, right.a, right.r, 3.5));
    expect(r.vel.x).toBeCloseTo(l.vel.x, 10);
    expect(r.vel.y).toBeCloseTo(-l.vel.y, 10);
    for (const [f, command] of [[right, r], [left, l]] as const) {
      const before = structuredClone(f.a.body), world = new World([f.a.body]);
      const report = world.step([command], .05);
      expect(f.a.vel.x).toBeGreaterThan(0);
      expect(f.a.vel.x).toBeLessThan(before.vel.x);
      expect(f.a.body.support!.state).toBe('up');
      expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
        .toBeLessThanOrEqual(report.groundImpulseLimit[0] + 1e-8);
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      expect(report.armImpulse[0]).toBe(0);
    }
    expect(right.a.pos.x).toBeCloseTo(left.a.pos.x, 10);
    expect(right.a.pos.y + left.a.pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(right.a.vel.y).toBeCloseTo(-left.a.vel.y, 10);
    const past = alleyStage(), expected = alleyStage();
    for (const f of [past, expected]) f.setPicture({ ...f.picture(), pos: { x: 42.5, y: CENTER_Y + 3 } });
    expect(past.update()).toEqual(chase(expected.sim, expected.a, expected.r));
  });

  it('waits for personally consumed carrying rather than the hidden handoff or current runner position', () => {
    const f = alleyStage(false), control = alleyStage(false);
    f.sim.ball = { kind: 'held', carrier: f.r }; f.sim.handoffAt = 1.05;
    f.sim.isPass = false; f.sim.scrambled = true;
    f.r.body.pos = { x: 75, y: 3 }; f.r.body.vel = { x: 8, y: 0 };
    expect(f.update()).toEqual(control.update());
    expect(f.sim.rng.nextU32()).toBe(control.sim.rng.nextU32());
    f.sim.t += .05;
    f.setPicture({ ...f.picture(), carrying: true });
    expect(f.update().vel.x).toBeLessThan(0);
    expect(control.update().vel.x).toBeGreaterThan(0);
  });

  it('preserves man responsibility for pass/unsure reads, absent possession, play action, and a split-out back', () => {
    for (const read of ['pass', 'unsure'] as const) {
      const positive = alleyStage(true, 1, read), unknown = alleyStage(null, 1, read);
      expect(positive.update()).toEqual(unknown.update());
      expect(positive.a.recog!.read).toBe(read);
    }
    for (const carrying of [false, null, undefined]) {
      const f = alleyStage(carrying), unknown = alleyStage(null);
      if (carrying === undefined) { const { carrying: ignored, ...legacy } = f.picture(); f.setPicture(legacy); void ignored; }
      f.sim.offCall.pass = PASS_BY_ID.pa_post_dig;
      expect(f.update()).toEqual(unknown.update());
      expect(f.update().vel.x).toBeGreaterThan(0);
    }
    const split = alleyStage(true, 1, 'run', 'RB', 'gun_empty_11');
    const unknown = alleyStage(null, 1, 'run', 'RB', 'gun_empty_11');
    // Hold the valid installed alley job constant so the originally split-out
    // identity, rather than a separately excluded force job, is the control.
    const nativeAlley = alleyStage().a.runFit!;
    split.a.runFit = { ...nativeAlley }; unknown.a.runFit = { ...nativeAlley };
    expect(split.sim.offAlign.spots.RB.backfield).toBe(false);
    expect(split.update()).toEqual(unknown.update());
  });

  it('supports a known backfield FB without reading live possession', () => {
    const one = alleyStage(true, 1, 'run', 'F', 'i_pro_21'), two = alleyStage(true, 1, 'run', 'F', 'i_pro_21');
    expect(one.r.player.position).toBe('FB');
    expect(one.a.runFit!.kind).toBe('alley');
    expect(one.sim.offAlign.spots.F.backfield).toBe(true);
    one.sim.ball = { kind: 'held', carrier: one.r }; one.sim.handoffAt = 1.05; one.sim.isPass = false;
    two.sim.ball = { kind: 'held', carrier: two.sim.qb }; two.sim.handoffAt = -1; two.sim.scrambled = true;
    two.r.body.pos = { x: 75, y: 2 }; two.r.body.vel = { x: -8, y: 0 };
    expect(one.update()).toEqual(two.update());
    expect(one.sim.rng.nextU32()).toBe(two.sim.rng.nextU32());
  });

  it.each([-1, 1])('retains acquired alley support until throw recognition then transfers to the ball, side=%s', side => {
    const held = alleyStage(true, side), air = alleyStage(true, side), expected = alleyStage(true, side);
    for (const f of [air, expected]) {
      f.sim.throwAt = 1.1;
      f.sim.ball = { kind: 'air', flight: { pos: { x: 43, y: CENTER_Y, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
        thrower: f.sim.qb, target: f.r, releaseT: 1.1, releaseX: 35,
        intended: { x: 46, y: CENTER_Y, z: 1.2 }, arrivalT: 1.9, deflected: false, throwaway: false }; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
      f.sim.ballPath = [{ t: 1.9, x: 46, y: CENTER_Y, z: 1.2 }];
    }
    expect(sawThrow(air.a, air.sim, air.r)).toBe(false);
    expect(air.update()).toEqual(held.update());
    expect(air.sim.rng).toEqual(held.sim.rng);
    air.sim.throwAt = expected.sim.throwAt = .1;
    for (const item of [air, expected]) {
      item.sim.throwSight.stageRelease(item.sim, item.sim.throwAt);
      item.a.tags.add('looking');
      item.sim.ballPath = [{ t: item.sim.t + .1, x: item.a.pos.x - .2, y: item.a.pos.y, z: 1.2 }];
    }
    expect(sawThrow(air.a, air.sim, air.r)).toBe(true);
    expect(air.update()).toEqual(playBall(expected.a, expected.sim, expected.r));
    expect(air.a.tags.has('onBall')).toBe(true);
    expect(air.sim.rng.nextU32()).toBe(expected.sim.rng.nextU32());
  });

  it('records the actual alley cue once without changing commands, body state, or the shared random stream', () => {
    for (const level of ['standard', 'full'] as const) {
      const recorded = alleyStage(true, 1, 'run', 'RB', 'gun_trey_11', level), plain = alleyStage();
      const before = recorded.sim.agents.map(a => structuredClone(a.body));
      expect(recorded.update()).toEqual(plain.update());
      expect(recorded.update()).toEqual(plain.update());
      expect(recorded.sim.agents.map(a => a.body)).toEqual(before);
      const decisions = recorded.sim.trace.data!.decisions.filter(d => d.kind === 'coverage-run-fit');
      expect(decisions).toHaveLength(1);
      expect(decisions[0].cue).toContain('carrying=true in consumed picture');
      expect(decisions[0].cue).toContain('installed alley');
      expect(decisions[0].detail).toContain('picture age 0.25 s');
      expect(recorded.sim.rng.nextU32()).toBe(plain.sim.rng.nextU32());
      const unknown = alleyStage(null, 1, 'run', 'RB', 'gun_trey_11', level);
      unknown.update();
      expect(unknown.sim.trace.data!.decisions.filter(d => d.kind === 'coverage-run-fit')).toHaveLength(0);
    }
  });
});

describe('acquired back-man support has no private positive-picture latch', () => {
  it.each(['insert', 'alley'] as const)('uses new sensing and contradictory belief after a positive %s choice', kind => {
    for (const replacement of [null, undefined]) {
      const f = kind === 'insert' ? stage() : alleyStage();
      f.sim.see = PlaySim.prototype.see;
      f.a.mind.observationDelay = () => .1;
      f.a.eyes = { keys: [f.r], peripheral: .15 };
      for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents, f.r.idx);
      expect(f.sim.see(f.a, f.r).carrying).toBe(true);
      const positive = f.update();
      f.a.recog!.read = 'pass';
      const pass = f.update();
      expect(pass).not.toEqual(positive);
      f.a.recog!.read = 'run';
      expect(f.update()).toEqual(positive);

      for (let i = 0; i < 3; i++) {
        f.sim.t += f.sim.dt;
        f.sim.perception.record(f.sim.agents, replacement);
        const cue = f.sim.see(f.a, f.r);
        const buffer = structuredClone(f.sim.perception), rng = structuredClone(f.sim.rng);
        for (let j = 0; j < 4; j++) expect(f.sim.see(f.a, f.r)).toEqual(cue);
        expect(f.sim.perception).toEqual(buffer);
        expect(f.sim.rng).toEqual(rng);
        expect(cue.carrying).toBe(i < 2 ? true : replacement === null ? false : null);
        if (i < 2) f.update();
      }
      expect(f.a.recog!.read).toBe('run');
      f.sim.ball = { kind: 'held', carrier: f.r };
      expect(f.update()).toEqual(new ManCoverage(f.a, f.sim, f.r, false, 'B', 1).update(f.a, f.sim));
      expect(f.sim.see(f.a, f.r).carrying).toBe(replacement === null ? false : null);
    }
  });
});

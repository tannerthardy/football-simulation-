import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { clamp, norm } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import * as RunBlockFit from '../src/sim/run-block-fit.js';
import { supportParams } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';
import { RunBlocker, type RunBlockKind } from '../src/sim/behaviors/blocking.js';
import { goTo, runThrough } from '../src/sim/behaviors/common.js';
import type { Combination } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { chooseRunBlockFit, observedBlockLeverage } from '../src/sim/run-block-fit.js';

const formation = FORMATION_BY_ID.ace_11;
const wideDrive = norm({ x: 1, y: -1.8 });
function stage(kind: RunBlockKind = 'cutoff') {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'Offense', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'Defense', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: false, kind: 'run', run: RUN_BY_ID.wz_strong, label: 'Wide zone' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'Over' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
  });
  const blocker = sim.slot('LT')!, defender = sim.slot('DE_W')!;
  for (const a of sim.agents) {
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
    if (a !== blocker && a !== defender) a.body.pos = { x: 70 + a.idx * 2, y: 3 };
  }
  blocker.body.pos = { x: 40, y: CENTER_Y };
  defender.body.pos = { x: 42, y: CENTER_Y };
  blocker.body.support!.posture = .7;
  blocker.behavior = new RunBlocker({ kind, target: defender, drive: { ...wideDrive } });
  sim.t = .5;
  for (let k = 0; k < 24; k++) sim.perception.record(sim.agents);
  const bodyContact = blocker.profile.radius + defender.profile.radius;
  const contact = bodyContact + .1 + blocker.player.measurables.armIn / 36 * .45;
  return { sim, blocker, defender, bodyContact, contact };
}

function approach(side = 1, placementError = 0) {
  const s = stage(), drive = { x: wideDrive.x, y: side * wideDrive.y };
  const axis = { x: -drive.x, y: -drive.y };
  const seen: Perceived = { pos: { x: 42, y: CENTER_Y }, vel: { x: 0, y: 0 }, facing: Math.PI, stance: null, age: .3 };
  s.blocker.body.pos = { x: seen.pos.x + axis.x * 1.8, y: seen.pos.y + axis.y * 1.8 };
  s.blocker.body.vel = { x: drive.x * 2, y: drive.y * 2 };
  s.blocker.body.facing = Math.atan2(drive.y, drive.x);
  const nominal = { x: seen.pos.x - .3, y: seen.pos.y + drive.y * .6 };
  const aim = { x: nominal.x, y: nominal.y + placementError };
  const original: Intent = { ...runThrough(s.blocker, aim), posture: .7 };
  const choose = () => chooseRunBlockFit(s.blocker, seen, drive, nominal, placementError,
    s.contact, s.bodyContact, original, s.sim.t);
  return { ...s, drive, seen, nominal, original, choose };
}

/** Independent actual-World advance; a saved command does not place a body. */
function execute(body: ReturnType<typeof stage>['blocker']['body'], command: Intent, steps = 8) {
  const moved = structuredClone(body), world = new World([moved]);
  world.time = .5;
  const before = { ...moved.pos }, traction = supportParams(moved.profile).traction;
  for (let k = 0; k < steps; k++) {
    const report = world.step([command], .05);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y)).toBeLessThanOrEqual(traction * .05 + 1e-8);
    expect(report.armImpulse[0]).toBe(0);
  }
  return { moved, before };
}

afterEach(() => vi.restoreAllMocks());

describe('run-block fit choices use observed geometry and ordinary bodies', () => {
  it('keeps a square downhill request and its actual movement unchanged', () => {
    const { blocker, contact, bodyContact } = stage('drive');
    const seen: Perceived = { pos: { x: 42, y: CENTER_Y }, vel: { x: -.5, y: 0 }, facing: Math.PI, stance: null };
    const original: Intent = { vel: { x: 5, y: 0 }, posture: .7 };
    const selected = chooseRunBlockFit(blocker, seen, { x: 1, y: 0 }, { x: 41.7, y: CENTER_Y }, 0,
      contact, bodyContact, original, .5);
    expect(selected).toBe(original);
    expect(execute(blocker.body, selected).moved).toEqual(execute(blocker.body, original).moved);
  });

  it.each(['drive', 'down', 'pull', 'draw'] as RunBlockKind[])(
    'leaves the ordinary %s controller outside corrected fit requests', kind => {
      const { sim, blocker, defender } = stage(kind);
      const fit = vi.spyOn(RunBlockFit, 'chooseRunBlockFit');
      const command = blocker.behavior.update(blocker, sim);
      expect(fit).not.toHaveBeenCalled();
      expect(blocker.engagement).toBeNull();
      const seen = sim.see(blocker, defender);
      const placement = blocker.mind.placementError * (1 - .5 * blocker.r('runBlock'));
      const ordinary: Intent = kind === 'draw'
        ? goTo(blocker, { x: sim.los - 1.2, y: blocker.pos.y }, { speed: .6, facing: 0 })
        : { ...runThrough(blocker, { x: seen.pos.x - (kind === 'down' ? .2 : 0),
          y: clamp(seen.pos.y - (kind === 'down' ? wideDrive.y * .4 : 0) + placement, .5, FIELD_WIDTH - .5) }),
          ...(['drive', 'down'].includes(kind) ? { posture: .7 } : {}) };
      expect(command).toEqual(ordinary);
      expect(execute(blocker.body, command).moved).toEqual(execute(blocker.body, ordinary).moved);
    });

  it('keeps a live planned double outside corrected fit requests', () => {
    const { sim, blocker, defender } = stage('reach'), partner = sim.slot('LG')!;
    const behavior = blocker.behavior as RunBlocker;
    const combination: Combination = { members: [blocker, partner], defender, backer: sim.slot('LB_W')!,
      released: false, secureSince: -1, nextRead: 10 };
    behavior.plan.combination = combination;
    const fit = vi.spyOn(RunBlockFit, 'chooseRunBlockFit');
    const command = behavior.update(blocker, sim);
    expect(fit).not.toHaveBeenCalled();
    expect(behavior.plan.combination).toBe(combination);
    expect(combination.released).toBe(false);
    const moved = execute(blocker.body, command).moved;
    expect(moved.support!.state).toBe('up');
    expect(moved.pos).not.toEqual(blocker.pos);
  });

  it('keeps a body whose hands already belong to a contact constraint outside correction', () => {
    const { sim, blocker, defender } = stage();
    sim.world.joints.push({ kind: 'hands', a: blocker.body, b: defender.body, extension: 1,
      push: 0, hold: 0, steer: 0 });
    const fit = vi.spyOn(RunBlockFit, 'chooseRunBlockFit');
    blocker.behavior.update(blocker, sim);
    expect(fit).not.toHaveBeenCalled();
  });

  it('declines a visibly lost commitment even when the unseen actual shoulder is reachable', () => {
    const { sim, blocker, defender } = stage();
    (blocker.behavior as RunBlocker).plan.drive = { x: 1, y: 0 };
    defender.body.pos = { x: 41, y: CENTER_Y };
    const seen: Perceived = { pos: { x: 39, y: CENTER_Y }, vel: { x: 0, y: 0 }, stance: null, facing: Math.PI, age: .3 };
    vi.spyOn(sim, 'see').mockReturnValue(seen);
    const acquire = vi.spyOn(sim, 'engage');
    blocker.behavior.update(blocker, sim);
    expect(Math.abs(observedBlockLeverage(blocker, seen, { x: 1, y: 0 }))).toBeGreaterThan(1.1);
    expect(acquire).not.toHaveBeenCalled();
    expect(blocker.engagement).toBeNull();
  });

  it('an unseen loss of leverage can still produce a reachable bounded first-contact swipe', () => {
    const { sim, blocker, defender } = stage();
    (blocker.behavior as RunBlocker).plan.drive = { x: 1, y: 0 };
    defender.body.pos = { x: 39, y: CENTER_Y };
    const seen: Perceived = { pos: { x: 41, y: CENTER_Y }, vel: { x: 0, y: 0 }, stance: null, facing: Math.PI, age: .3 };
    const ordinarySee = sim.see.bind(sim);
    vi.spyOn(sim, 'see').mockImplementation((a, b, scale) => a === blocker && b === defender ? seen : ordinarySee(a, b, scale));
    sim.tick();
    expect(blocker.engagement).toBeNull();
    expect(sim.events.some(e => e.type === 'shed' && e.a === defender.idx && e.b === blocker.idx && e.note?.includes('leverage'))).toBe(true);
    const delivered = sim.lastStep!.strikes.filter(s => s.i === defender.idx && s.j === blocker.idx);
    expect(delivered.length).toBeGreaterThan(0);
    expect(delivered.some(s => Math.hypot(s.impulse.x, s.impulse.y) > 0)).toBe(true);
    expect(sim.lastStep!.armImpulse[defender.idx]).toBeLessThanOrEqual(sim.lastStep!.armImpulseLimit[defender.idx] + 1e-8);
    expect(Math.abs(sim.lastStep!.work.residual)).toBeLessThan(1e-8);
  });

  it('brakes before a feasible wide-angle fit through the same movement envelope', () => {
    const s = approach(), selected = s.choose();
    expect(selected).not.toBe(s.original);
    expect(Math.hypot(selected.vel.x, selected.vel.y)).toBeLessThanOrEqual(s.blocker.profile.vmax + 1e-8);
    const baseline = execute(s.blocker.body, s.original).moved;
    const candidate = execute(s.blocker.body, selected).moved;
    // This is deliberately a held empty-space request, not a contact win.
    // Arrival remains within hand reach while preserving more body clearance.
    const clearance = (p: typeof candidate.pos) => Math.hypot(p.x - s.seen.pos.x, p.y - s.seen.pos.y);
    expect(clearance(candidate.pos)).toBeGreaterThan(clearance(baseline.pos));
    expect(clearance(candidate.pos)).toBeGreaterThan(s.bodyContact);
    expect(clearance(candidate.pos)).toBeLessThan(s.contact);
    expect(Math.hypot(candidate.vel.x, candidate.vel.y)).toBeLessThan(Math.hypot(baseline.vel.x, baseline.vel.y));
    expect(candidate.support!.state).toBe('up');
    expect(s.drive).toEqual(wideDrive);
  });

  it('does not call a straight path through a torso an attainable opposite-side fit', () => {
    const { blocker, bodyContact, contact } = stage();
    const drive = { x: 1, y: 0 }, seen: Perceived = { pos: { x: 40, y: CENTER_Y }, vel: { x: 0, y: 0 }, stance: null, facing: Math.PI };
    blocker.body.pos = { x: seen.pos.x + bodyContact + .02, y: CENTER_Y };
    blocker.body.vel = { x: 0, y: 0 };
    const original: Intent = { vel: { x: blocker.profile.vmax, y: 0 }, posture: .7 };
    const chosen = chooseRunBlockFit(blocker, seen, drive, { x: seen.pos.x + .3, y: CENTER_Y }, 0,
      contact, bodyContact, original, .5);
    expect(chosen.vel).toEqual(seen.vel);
    const { moved } = execute(blocker.body, chosen);
    expect(Math.hypot(moved.pos.x - seen.pos.x, moved.pos.y - seen.pos.y)).toBeGreaterThanOrEqual(bodyContact);
    expect(Math.abs(observedBlockLeverage({ pos: moved.pos } as typeof blocker, seen, drive))).toBeGreaterThan(1.1);
  });

  it('requests an oblique recovery around the shoulder, with mirrored actual World movement', () => {
    const trace = (side: number) => {
      const s = stage(), drive = { x: 1, y: 0 };
      const seen: Perceived = { pos: { ...s.defender.pos }, vel: { x: 0, y: 0 }, stance: null, facing: Math.PI };
      s.blocker.body.pos = { x: seen.pos.x + s.bodyContact + .15, y: seen.pos.y + side * .3 };
      s.blocker.body.vel = { x: 0, y: 0 };
      const start = { ...s.blocker.pos }, startPhi = Math.abs(observedBlockLeverage(s.blocker, seen, drive));
      const world = new World([s.blocker.body, s.defender.body]);
      world.time = .5;
      const first = chooseRunBlockFit(s.blocker, seen, drive, { x: seen.pos.x - .3, y: seen.pos.y }, 0,
        s.contact, s.bodyContact, { vel: { x: -s.blocker.profile.vmax, y: 0 }, posture: .7 }, world.time);
      expect(first.vel.y * side).toBeGreaterThan(0);
      for (let k = 0; k < 16; k++) {
        seen.pos = { ...s.defender.pos }; seen.vel = { ...s.defender.vel };
        const request = chooseRunBlockFit(s.blocker, seen, drive, { x: seen.pos.x - .3, y: seen.pos.y }, 0,
          s.contact, s.bodyContact, { ...runThrough(s.blocker, seen.pos), posture: .7 }, world.time);
        const report = world.step([request, { vel: { x: 0, y: 0 }, posture: .7 }], .05);
        expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
        expect(report.armImpulse).toEqual([0, 0]);
        expect(report.maxPenetration).toBeLessThan(.03);
        for (const [i, body] of world.bodies.entries()) {
          expect(Math.hypot(report.groundImpulse[i].x, report.groundImpulse[i].y))
            .toBeLessThanOrEqual(supportParams(body.profile).traction * .05 + 1e-8);
        }
      }
      expect(s.blocker.pos.y * side).toBeGreaterThan(start.y * side);
      expect(Math.abs(observedBlockLeverage(s.blocker, seen, drive))).toBeLessThan(startPhi);
      expect(s.blocker.body.support!.state).toBe('up');
      return s.blocker.body;
    };
    const right = trace(1), left = trace(-1);
    expect(right.pos.x).toBeCloseTo(left.pos.x, 10);
    expect(right.pos.y + left.pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(right.vel.x).toBeCloseTo(left.vel.x, 10);
    expect(right.vel.y).toBeCloseTo(-left.vel.y, 10);
  });

  it('mirrors requests and achieved movement without erasing placement error', () => {
    const right = approach(1, .2), left = approach(-1, -.2);
    const r = right.choose(), l = left.choose();
    expect(r.vel.x).toBeCloseTo(l.vel.x, 10);
    expect(r.vel.y).toBeCloseTo(-l.vel.y, 10);
    expect(r.facing).toBeCloseTo(-l.facing!, 10);
    const rm = execute(right.blocker.body, r).moved, lm = execute(left.blocker.body, l).moved;
    expect(rm.pos.x).toBeCloseTo(lm.pos.x, 10);
    expect(rm.pos.y + lm.pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    expect(rm.vel.x).toBeCloseTo(lm.vel.x, 10);
    expect(rm.vel.y).toBeCloseTo(-lm.vel.y, 10);
    expect(approach(1, -.2).choose().vel).not.toEqual(r.vel);
  });

  it('uses an already dead-reckoned observation once, without body, vision or RNG mutation', () => {
    const s = approach();
    const originalBodies = s.sim.agents.map(a => structuredClone(a.body));
    const originalPerception = structuredClone(s.sim.perception), originalRng = JSON.stringify(s.sim.rng);
    const seenBefore = structuredClone(s.seen), driveBefore = { ...s.drive };
    const random = vi.spyOn(Rng.prototype, 'nextU32'), see = vi.spyOn(s.sim, 'see');
    const selected = s.choose();
    s.seen.age = .8;
    expect(s.choose()).toEqual(selected);
    expect(s.sim.agents.map(a => a.body)).toEqual(originalBodies);
    expect(s.sim.perception).toEqual(originalPerception);
    expect(JSON.stringify(s.sim.rng)).toBe(originalRng);
    expect(random).not.toHaveBeenCalled();
    expect(see).not.toHaveBeenCalled();
    expect(s.drive).toEqual(driveBefore);
    expect({ ...s.seen, age: seenBefore.age }).toEqual(seenBefore);
  });
});

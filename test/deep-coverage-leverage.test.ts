import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { World } from '../src/physics/world.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ManCoverage } from '../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { readFileSync } from 'node:fs';
import type { Agent } from '../src/sim/agent.js';
import { DeepCoverage } from '../src/sim/coverage-leverage.js';
import { track } from '../src/sim/behaviors/common.js';

const offense = generateTeam(new Rng(31), 'Deep offense', 'DPO', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Deep defense', 'DPD', { strength: .55 });
function stage(protectDepth = true, coverage = 'cover3_match') {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'vertical duty' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage],
      pressure: null, zoneStyle: 'match', label: 'vertical duty' }, los: 40, ballY: 26, firstDownX: 50, seed: 3 });
  const a = sim.slot('CB_S')!, r = sim.slot(sim.offAlign.numbering.S1!)!;
  a.body.pos = { x: r.pos.x + 8, y: r.pos.y - .7 };
  a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI;
  a.recog!.read = 'pass';
  const behavior = new ManCoverage(a, sim, r, false, 'B', 1,
    { lev: 'outside', overTop: true, protectDepth, initialPosition: { ...r.pos } });
  return { sim, a, r, behavior };
}

function supplied(f: ReturnType<typeof stage>) {
  let picture: Perceived = { pos: { ...f.r.pos }, vel: { x: 0, y: 0 }, facing: 0,
    stance: null, pose: 'up', carrying: false, age: .2 };
  let queries = 0;
  const original = f.sim.see.bind(f.sim);
  f.sim.see = (a, target, delay) => {
    queries++;
    return target === f.r ? structuredClone(picture) : original(a, target, delay);
  };
  return { set: (p: Partial<Perceived>) => { picture = { ...picture, ...p }; }, queries: () => queries };
}

describe('installed deep coverage uses acquired motion and achievable movement', () => {
  it('starts real braking from the saved acquired P185 plant before the receiver fully stops', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/deep-coverage-plant.json', import.meta.url), 'utf8'));
    const controller = new DeepCoverage();
    let selected, body;
    for (const snap of fixture.snapshots) {
      body = structuredClone(snap.body);
      const a = { body, profile: body.profile, pos: body.pos, vel: body.vel,
        engagement: null, isDown: () => false } as unknown as Agent;
      const original = track(a, snap.goal, snap.targetVelocity, fixture.tracking);
      selected = controller.choose(a, snap.seen, snap.cue, fixture.receiverProfile,
        .8 + .15 * snap.seen.vel.x, original, snap.t, 'center');
    }
    expect(selected!.vel.x).toBeLessThan(body.vel.x);
    const before = body.vel.x, world = new World([body]);
    world.step([selected!], .05);
    expect(body.vel.x).toBeLessThan(before);
  });
  it('holds a waiting receiver without spending the roof or acquiring hidden release', () => {
    const f = stage(), cue = supplied(f);
    f.sim.t = .4;
    f.r.body.pos.x += 30; f.r.body.vel = { x: 9, y: 0 };
    const before = structuredClone(f.a.body), rng = structuredClone(f.sim.rng);
    const command = f.behavior.update(f.a, f.sim);
    expect(command.vel.x).toBeGreaterThanOrEqual(-.4);
    expect(command.facing).toBe(Math.PI);
    expect(f.behavior.recordedTechnique().hipsOpen).toBe(false);
    expect(f.a.body).toEqual(before);
    expect(f.sim.rng).toEqual(rng);
    const legacy = stage(false), legacyCue = supplied(legacy);
    legacy.sim.t = .4; legacy.behavior.update(legacy.a, legacy.sim);
    expect(cue.queries()).toBe(legacyCue.queries());
  });

  it('expires plant extrapolation when the same acquired image ages, then answers a fresh contrary picture', () => {
    const f = JSON.parse(readFileSync(new URL('./fixtures/deep-coverage-plant.json', import.meta.url), 'utf8'));
    const controller = new DeepCoverage();
    const actor = (snap: typeof f) => {
      const body = structuredClone(snap.body);
      return { body, profile: body.profile, pos: body.pos, vel: body.vel,
        engagement: null, isDown: () => false } as unknown as Agent;
    };
    for (const snap of f.snapshots) {
      const a = actor(snap), command = track(a, snap.goal, snap.targetVelocity, f.tracking);
      controller.choose(a, snap.seen, snap.cue, f.receiverProfile, .8 + .15 * snap.seen.vel.x, command, snap.t, 'center');
    }
    const last = f.snapshots.at(-1), a = actor(last);
    const original = track(a, last.goal, last.targetVelocity, f.tracking);
    const stale = { ...last.cue, age: last.cue.age + 1 };
    const expected = new DeepCoverage().choose(a, last.seen, stale, f.receiverProfile,
      .8 + .15 * last.seen.vel.x, original, last.t + 1, 'center');
    expect(controller.choose(a, last.seen, stale, f.receiverProfile,
      .8 + .15 * last.seen.vel.x, original, last.t + 1, 'center')).toEqual(expected);
    const fresh = { ...last.seen, age: .15, vel: { x: 6, y: 0 } };
    const response = controller.choose(a, fresh, fresh, f.receiverProfile, 1.7, original, last.t + 1.05, 'center');
    expect(response.vel.x).toBeGreaterThan(expected.vel.x);
  });

  it('does not let hidden route/body changes or advancing reality snapshots improve the acquired picture', () => {
    const one = stage(), two = stage(), a = supplied(one), b = supplied(two);
    const start = { ...one.r.pos };
    for (let k = 0; k < 12; k++) {
      const t = .4 + k * .05, picture = { pos: { x: start.x + k * .25, y: start.y }, vel: { x: 2 + k * .3, y: 0 } };
      one.sim.t = two.sim.t = t; a.set(picture); b.set(picture);
      two.r.body.pos = { x: 80 + k, y: 2 }; two.r.body.vel = { x: -8, y: 5 };
      two.r.behavior = { kind: 'hidden-cut', update: () => ({ vel: { x: -9, y: 4 } }) };
      one.sim.perception.record(one.sim.agents); two.sim.perception.record(two.sim.agents);
      const before = structuredClone(two.a.body);
      expect(two.behavior.update(two.a, two.sim)).toEqual(one.behavior.update(one.a, one.sim));
      expect(two.behavior.recordedTechnique()).toEqual(one.behavior.recordedTechnique());
      expect(two.a.body).toEqual(before);
      expect(two.sim.rng).toEqual(one.sim.rng);
      expect(b.queries()).toBe(a.queries());
    }
  });

  it('does not manufacture a new burst from repeated queries of the same acquired image', () => {
    const one = stage(), two = stage(), a = supplied(one), b = supplied(two);
    for (const f of [one, two]) f.sim.t = .5;
    a.set({ vel: { x: 3, y: 0 } }); b.set({ vel: { x: 3, y: 0 } });
    one.behavior.update(one.a, one.sim); two.behavior.update(two.a, two.sim);
    for (let k = 0; k < 5; k++) two.behavior.update(two.a, two.sim);
    one.sim.t = two.sim.t = .55;
    a.set({ age: .25 }); b.set({ age: .25 });
    expect(two.behavior.update(two.a, two.sim)).toEqual(one.behavior.update(one.a, one.sim));
    expect(two.sim.rng).toEqual(one.sim.rng);
  });

  it('improves achieved leverage through a real accelerating vertical, without changing either body capacity', () => {
    const run = (deep: boolean) => {
      const f = stage(deep), world = new World([f.a.body, f.r.body]);
      const profiles = [structuredClone(f.a.profile), structuredClone(f.r.profile)];
      for (let k = 0; k < 60; k++) {
        f.sim.t = k * .05; f.sim.perception.record(f.sim.agents); world.time = f.sim.t;
        const command = f.behavior.update(f.a, f.sim);
        world.step([command, { vel: { x: f.r.profile.vmax, y: 0 }, facing: 0 }], .05);
      }
      expect([f.a.profile, f.r.profile]).toEqual(profiles);
      return { f, lead: f.a.pos.x - f.r.pos.x };
    };
    const legacy = run(false), candidate = run(true);
    expect(candidate.lead).toBeGreaterThan(legacy.lead + 1);
    expect(candidate.f.a.vel.x).toBeGreaterThan(5);
  });

  it('answers an acquired stop with downhill movement rather than retaining a vertical timer', () => {
    const f = stage(), cue = supplied(f);
    f.a.body.pos.x = f.r.pos.x + 5;
    f.a.body.vel = { x: 4, y: 0 }; f.a.body.facing = 0;
    f.sim.t = 1; cue.set({ vel: { x: 7, y: 0 } }); f.behavior.update(f.a, f.sim);
    f.sim.t = 1.05; cue.set({ vel: { x: 0, y: 0 }, facing: Math.PI });
    expect(f.behavior.update(f.a, f.sim).vel.x).toBeLessThan(0);
    expect(f.a.vel.x).toBe(4); // A request does not reverse the real body.
  });

  it.each(['cover3_match', 'cover4'])('%s installs deep movement on its corner without changing his run fit', coverage => {
    const f = stage(true, coverage), behavior = f.a.behavior;
    expect(behavior).toBeInstanceOf(CoverageDefender);
    const fit = structuredClone(f.a.runFit);
    supplied(f); f.sim.t = .4;
    expect(behavior.update(f.a, f.sim).vel.x).toBeGreaterThanOrEqual(-.4);
    expect(f.a.runFit).toEqual(fit);
  });

  it('leaves an underneath over-top shoulder on the legacy technique', () => {
    const f = stage(false), cue = supplied(f);
    cue.set({ vel: { x: 0, y: 0 } }); f.sim.t = .4;
    // protectDepth is an installed duty, not a synonym for overTop.
    expect(f.behavior.update(f.a, f.sim).vel.x).toBeLessThan(-3);
  });

  it.each([['cover3_mable', 'CB_W'], ['cover4_poach', 'CB_W'], ['cover4_stubbie', 'CB_S']])(
    '%s gives its solo %s the independent vertical duty', (coverage, slot) => {
      const { sim } = stage(true, coverage), a = sim.slot(slot)!;
      const man = a.behavior as ManCoverage, r = man.target;
      expect(man).toBeInstanceOf(ManCoverage);
      a.body.pos = { x: sim.los + 10, y: r.pos.y + .7 };
      a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI; a.recog!.read = 'pass';
      const original = sim.see.bind(sim);
      sim.see = (observer, target, delay) => target === r
        ? { pos: { x: sim.los + 4, y: r.pos.y }, vel: { x: 5, y: 0 }, facing: 0, age: .2,
          stance: null, pose: 'up', carrying: false } : original(observer, target, delay);
      sim.t = 1;
      expect(man.update(a, sim).vel.x).toBeGreaterThan(0);
    });
});

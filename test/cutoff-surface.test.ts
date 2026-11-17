import { afterEach, describe, expect, it, vi } from 'vitest';
vi.hoisted(() => { process.env.MIRROR_SCATTER = '0'; }); // engine-72: fixture recorded on the old alignment scatter; the lane that owns it re-records with MIRROR_SCATTER on (docs/reviews/2026-11-16-pin-delta-engine72.md)
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { norm, type Vec2 } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { supportParams } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent, Engagement } from '../src/sim/agent.js';
import { RunBlocker, planRunBlocking, type RunBlockPlan } from '../src/sim/behaviors/blocking.js';
import { axisOf, updateEngagements } from '../src/sim/engagement.js';
import { PlaySim } from '../src/sim/playsim.js';
// Scenes recorded, and dice forced, on the play's single random stream (see PlaySim.dice).
PlaySim.recordedSingleStream = true;
// FRONT_ALIGN moves the front off its installed spots; this recorded scene is staged on them.
// SNAP_REACT plans every start from the count; this recorded moment is staged on the installed get-off.
vi.hoisted(() => { process.env.FRONT_ALIGN = '0'; process.env.SNAP_REACT = '0'; });

const offense = generateTeam(new Rng(31), 'Panel offense 1', 'O1', { strength: .55 });
const defense = generateTeam(new Rng(32), 'Panel defense 1', 'D1', { strength: .55 });
type Surface = { axis: Vec2; sealTarget: number };
type FitPlan = RunBlockPlan & { contactFit?: Surface & { target: Agent } };
// C lacks the optional argument. The adapter lets its real contact creation
// run and expose the old frame discrepancy rather than fail on an import.
type SurfaceEngage = (blocker: Agent, defender: Agent, kind: 'run' | 'pass',
  drive: Vec2 | null, surface?: Surface) => Engagement | null;

function natural(run = 'power', front = 'under', flip = true, seed = 3) {
  const formation = FORMATION_BY_ID[run === 'split_zone' ? 'gun_wing_12' : 'ace_11'];
  const personnel = front === 'tite' ? 'base34' : 'base43';
  return new PlaySim({
    offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, personnel),
    offCall: { formation, flip, kind: 'run', run: RUN_BY_ID[run], label: run },
    defCall: { personnel, front: FRONT_BY_ID[front], coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: front },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed,
  });
}

/** Same RT/DE bodies and RNG on both sides. Only explicit geometry,
 * displacement, installed edge duty and signed execution error are reflected. */
function fixture(side = 1, distance = .95) {
  const sim = natural();
  for (const a of sim.agents) {
    a.body.pos = { x: 70 + (a.idx % 5) * 3, y: CENTER_Y + side * (8 + Math.floor(a.idx / 5) * 3) };
    a.body.vel = { x: 0, y: 0 };
    a.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 }, facing: a.facing }) };
  }
  sim.t = sim.world.time = 1;
  const blocker = sim.slot('RT')!, defender = sim.slot('DE_W')!;
  // natural() has the same flip in both controlled islands. Reflect its
  // assigned duty as well as the bodies; otherwise these are different fits.
  defender.runFit = { ...defender.runFit!, side: side * defender.runFit!.side };
  const drive = norm({ x: 1, y: side * .8 });
  const surface: Surface = { axis: norm({ x: -.3, y: drive.y * .6 }), sealTarget: 0 };
  defender.body.pos = { x: 42, y: CENTER_Y - side * 1.3 };
  blocker.body.pos = { x: defender.pos.x + surface.axis.x * distance,
    y: defender.pos.y + surface.axis.y * distance };
  blocker.body.facing = Math.atan2(-surface.axis.y, -surface.axis.x);
  defender.body.facing = Math.atan2(surface.axis.y, surface.axis.x);
  blocker.body.support!.posture = defender.body.support!.posture = .7;
  sim.qb.body.pos = { x: 36, y: CENTER_Y + side * .75 };
  sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y + side * .75 };
  Object.defineProperty(blocker.mind, 'executionError', { value: side * Math.abs(blocker.mind.executionError) });
  const plan: FitPlan = { kind: 'cutoff', target: defender, drive: { ...drive },
    contactFit: { ...surface, axis: { ...surface.axis }, target: defender } };
  const behavior = new RunBlocker(plan); blocker.behavior = behavior;
  const observe = () => { for (let k = 0; k < 24; k++) sim.perception.record(sim.agents); };
  observe();
  const engage = sim.engage.bind(sim) as SurfaceEngage;
  return { sim, blocker, defender, drive, surface, plan, behavior, observe, engage, side };
}

type Fixture = ReturnType<typeof fixture>;
const bodies = (f: Fixture) => f.sim.agents.map(a => structuredClone(a.body));

function step(f: Fixture, decide = true, extra?: Agent) {
  const intents: Intent[] = f.sim.agents.map(a => ({ vel: { x: 0, y: 0 }, facing: a.facing }));
  if (decide) intents[f.blocker.idx] = f.behavior.update(f.blocker, f.sim);
  if (extra) intents[extra.idx] = extra.behavior.update(extra, f.sim);
  updateEngagements(f.sim, intents);
  const report = f.sim.world.step(intents, .05);
  expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  for (const a of f.sim.agents) {
    expect(report.armImpulse[a.idx]).toBeLessThanOrEqual(report.armImpulseLimit[a.idx] + 1e-8);
    expect(report.armWork[a.idx]).toBeLessThanOrEqual(report.armWorkLimit[a.idx] + 1e-8);
    expect(report.supportMotorWork[a.idx]).toBeLessThanOrEqual(report.supportMotorWorkLimit[a.idx] + 1e-8);
    expect(Math.hypot(report.groundImpulse[a.idx].x, report.groundImpulse[a.idx].y))
      .toBeLessThanOrEqual(report.groundImpulseLimit[a.idx] + 1e-8);
  }
  f.sim.t += .05; f.sim.perception.record(f.sim.agents);
  return report;
}

function containment(f: Fixture) {
  // This world-lateral fact is independent of whichever frame e records:
  // the OL must remain between the explicitly outside DE and inside run lane.
  expect((f.blocker.pos.y - f.defender.pos.y) * f.side).toBeGreaterThan(0);
  expect((CENTER_Y + f.side * .75 - f.blocker.pos.y) * f.side).toBeGreaterThan(0);
}

afterEach(() => vi.restoreAllMocks());

describe('cutoff installation distinguishes outside walls from inside collection', () => {
  it.each([false, true])('installs the intended inside shoulder on an ordinary wide Power edge, flip %s', flip => {
    const sim = natural('power', 'under', flip), blocker = sim.slot(flip ? 'RT' : 'LT')!;
    const plan = (blocker.behavior as RunBlocker).plan as FitPlan;
    expect(plan.kind).toBe('cutoff'); expect(plan.target!.slot).toBe('DE_W');
    const before = sim.agents.map(a => structuredClone(a.body));
    const replanned = planRunBlocking(sim, RUN_BY_ID.power).get(blocker)! as FitPlan;
    expect(sim.agents.map(a => a.body)).toEqual(before);
    const fit = replanned.contactFit;
    expect(fit?.target).toBe(replanned.target);
    expect(Math.hypot(fit!.axis.x, fit!.axis.y)).toBeCloseTo(1, 12);
    // A requested point lies on the OL's existing interior side of this DE,
    // while displacement continues in its original run-flow direction.
    expect((blocker.pos.y - replanned.target!.pos.y) * fit!.axis.y).toBeGreaterThan(0);
    expect(fit!.axis.x).toBeLessThan(0); expect(fit!.sealTarget).toBe(0);
    expect(replanned.drive).toEqual(plan.drive);
    expect(fit!.axis.x * -plan.drive.x + fit!.axis.y * -plan.drive.y).toBeLessThan(.1);
  });

  it.each([false, true])('keeps an ordinary Split/Tite inside-shade cutoff in its previous contact frame, flip %s', flip => {
    // Start law (#336): on S3 flipped, the RT now reaches DT_W at 0.60 s (was 0.70) and
    // the DT's arms win the hands (the RT's arm impulse stays 0); panel seed S11 loads both mirrors.
    // With #347's engaged flow on the combined start law + mesh departure, S11 unflipped no longer
    // loads the LT's arms on DT_W within 2 s; S1 loads both mirrors (seeds 1-40: 33 load both).
    const sim = natural('split_zone', 'tite', flip, 1), blocker = sim.slot(flip ? 'RT' : 'LT')!;
    const plan = (blocker.behavior as RunBlocker).plan as FitPlan;
    expect(plan.kind).toBe('cutoff'); expect(plan.target!.slot).toBe('DT_W');
    expect(plan.contactFit).toBeUndefined();
    let loaded: Engagement | null = null;
    while (!loaded && sim.t < 2 && sim.phase !== 'dead') {
      sim.tick();
      const e = blocker.engagement;
      if (e?.defender === plan.target && sim.lastStep!.armImpulse[blocker.idx] > 0) loaded = e;
    }
    expect(loaded).not.toBeNull();
    expect(loaded!.surfaceAxis).toBeUndefined();
    expect(axisOf(sim, loaded!)).toEqual({ x: -plan.drive.x, y: -plan.drive.y });
    expect(Math.abs(loaded!.phi)).toBeLessThan(.55);
    expect(sim.world.joints).toContain(loaded!.hands);
    expect(Math.abs(loaded!.hands!.normalForce ?? 0) + Math.abs(loaded!.hands!.tangentForce ?? 0)).toBeGreaterThan(0);
  });

  it('does not install a different shoulder solely because the down defender has a different roster label', () => {
    const sim = natural(), blocker = sim.slot('RT')!, defender = (blocker.behavior as RunBlocker).target!;
    const before = planRunBlocking(sim, RUN_BY_ID.power).get(blocker)! as FitPlan;
    expect(before.contactFit).toBeDefined();
    const old = defender.player.position;
    defender.player.position = 'LB';
    const after = planRunBlocking(sim, RUN_BY_ID.power).get(blocker)! as FitPlan;
    defender.player.position = old;
    expect(after.target).toBe(before.target);
    expect(after.contactFit).toEqual(before.contactFit);
    expect(after.drive).toEqual(before.drive);
  });

  it('retains the ordinary frame for head-up shades and reserved or shared jobs', () => {
    const sim = natural(), blocker = sim.slot('RT')!, target = (blocker.behavior as RunBlocker).target!;
    target.body.pos.y = blocker.pos.y;
    const plans = planRunBlocking(sim, RUN_BY_ID.power);
    expect((plans.get(blocker)! as FitPlan).contactFit).toBeUndefined();
    for (const [a, p] of plans) if (p.kind !== 'cutoff' || p.combination || !['LT', 'LG', 'C', 'RG', 'RT'].includes(a.slot))
      expect((p as FitPlan).contactFit).toBeUndefined();
    const draw = natural('draw', 'over');
    for (const a of draw.offense) if (a.behavior instanceof RunBlocker)
      expect((a.behavior.plan as FitPlan).contactFit).toBeUndefined();
  });
});

describe('an installed cutoff surface must carry actual bounded contact', () => {
  it('uses the same physical capabilities and displacement on exact reflected walls', () => {
    const trace = (side: number) => {
      const f = fixture(side), before = bodies(f);
      f.behavior.update(f.blocker, f.sim);
      expect(bodies(f)).toEqual(before);
      const e = f.blocker.engagement!;
      expect(e).not.toBeNull();
      expect(e.drive).toEqual(f.drive);
      expect(Math.abs(e.phi)).toBeLessThan(.1);
      const hands = e.hands!, samples = [];
      for (let k = 0; k < 6; k++) {
        const report = step(f);
        containment(f);
        expect(f.blocker.engagement).toBe(e); expect(e.hands).toBe(hands);
        expect(f.sim.world.joints).toContain(hands);
        expect(f.blocker.body.support!.state).toBe('up');
        expect(report.armImpulse[f.blocker.idx]).toBeGreaterThan(0);
        expect(Math.abs(hands.normalForce ?? 0) + Math.abs(hands.tangentForce ?? 0)).toBeGreaterThan(0);
        samples.push({ b: structuredClone(f.blocker.body), d: structuredClone(f.defender.body),
          phi: e.phi, control: e.control, impulse: report.armImpulse[f.blocker.idx],
          normal: hands.normalForce!, tangent: hands.tangentForce! });
      }
      expect(f.sim.events.some(ev => ev.type === 'shed' && ev.b === f.blocker.idx)).toBe(false);
      return samples;
    };
    const r = trace(1), l = trace(-1);
    for (let k = 0; k < r.length; k++) {
      expect(r[k].b.profile).toEqual(l[k].b.profile); expect(r[k].d.profile).toEqual(l[k].d.profile);
      for (const who of ['b', 'd'] as const) {
        expect(r[k][who].pos.x).toBeCloseTo(l[k][who].pos.x, 9);
        expect(r[k][who].pos.y + l[k][who].pos.y).toBeCloseTo(2 * CENTER_Y, 9);
        expect(r[k][who].vel.x).toBeCloseTo(l[k][who].vel.x, 9);
        expect(r[k][who].vel.y).toBeCloseTo(-l[k][who].vel.y, 9);
      }
      expect(r[k].phi).toBeCloseTo(-l[k].phi, 9);
      expect(r[k].control).toBeCloseTo(l[k].control, 9);
      expect(r[k].impulse).toBeCloseTo(l[k].impulse, 9);
      expect(r[k].normal).toBeCloseTo(l[k].normal, 9);
      expect(r[k].tangent).toBeCloseTo(-l[k].tangent, 9);
    }
  });

  it('a far approach preserves useful interior ordering and achieves its hands through World movement', () => {
    const trace = (side: number) => {
      const f = fixture(side, 2), start = { ...f.blocker.pos }, update = f.behavior.update.bind(f.behavior);
      let request: Intent = { vel: { x: 0, y: 0 } };
      vi.spyOn(f.behavior, 'update').mockImplementation((a, sim) => {
        const before = bodies(f); request = update(a, sim) as Intent;
        expect(bodies(f)).toEqual(before); return request;
      });
      let loaded = false;
      const samples = [];
      for (let k = 0; k < 20 && !loaded; k++) {
        const report = step(f);
        if (f.blocker.engagement && report.armImpulse[f.blocker.idx] > 0) loaded = true;
        containment(f);
        samples.push({ pos: { ...f.blocker.pos }, vel: { ...f.blocker.vel }, request: structuredClone(request) });
      }
      expect(loaded).toBe(true);
      expect(f.blocker.pos).not.toEqual(start);
      expect(Math.abs(f.blocker.engagement!.phi)).toBeLessThan(.55);
      expect(f.blocker.engagement!.drive).toEqual(f.drive);
      expect(f.sim.world.joints).toContain(f.blocker.engagement!.hands!);
      return samples;
    };
    const r = trace(1), l = trace(-1);
    expect(r).toHaveLength(l.length);
    for (let k = 0; k < r.length; k++) {
      expect(r[k].pos.x).toBeCloseTo(l[k].pos.x, 9);
      expect(r[k].pos.y + l[k].pos.y).toBeCloseTo(2 * CENTER_Y, 9);
      expect(r[k].vel.x).toBeCloseTo(l[k].vel.x, 9);
      expect(r[k].vel.y).toBeCloseTo(-l[k].vel.y, 9);
      expect(r[k].request.vel.x).toBeCloseTo(l[k].request.vel.x, 9);
      expect(r[k].request.vel.y).toBeCloseTo(-l[k].request.vel.y, 9);
    }
  });

  it.each([-1, 1])('declines a freshly visible wrong-side strike instead of redefining it as square, side %s', side => {
    const f = fixture(side);
    f.blocker.body.pos = { x: f.defender.pos.x - f.surface.axis.x * .95,
      y: f.defender.pos.y - f.surface.axis.y * .95 };
    f.observe();
    const acquire = vi.spyOn(f.sim, 'engage'), before = bodies(f);
    f.behavior.update(f.blocker, f.sim);
    expect(acquire).not.toHaveBeenCalled();
    expect(f.blocker.engagement).toBeNull(); expect(bodies(f)).toEqual(before);
    step(f);
    expect(f.blocker.body.support!.state).toBe('up');
  });

  it('a stale good picture cannot turn an unseen inside crossing into good physical leverage', () => {
    const f = fixture();
    const seen = f.sim.see(f.blocker, f.defender);
    f.defender.body.pos = { x: f.blocker.pos.x + f.surface.axis.x * .95,
      y: f.blocker.pos.y + f.surface.axis.y * .95 };
    expect(f.sim.see(f.blocker, f.defender)).toEqual(seen);
    const before = bodies(f);
    f.behavior.update(f.blocker, f.sim);
    expect(bodies(f)).toEqual(before);
    const e = f.blocker.engagement!;
    expect(e).not.toBeNull();
    step(f, false);
    expect(Math.abs(e.phi)).toBeGreaterThan(1.1);
    expect(axisOf(f.sim, e)).toEqual(f.surface.axis);
    const fairLoss = f.sim.events.some(ev => ev.type === 'shed' && ev.b === f.blocker.idx && ev.note?.includes('leverage'));
    expect(fairLoss || (e.holding && f.sim.penalty?.kind === 'holding')).toBe(true);
  });
});

describe('acquired contact and changed responsibilities have different lifetimes', () => {
  it('new drive instructions and helper joining preserve the original loaded surface and hands', () => {
    const f = fixture();
    const e = f.engage(f.blocker, f.defender, 'run', f.drive, f.surface)!;
    expect(e).not.toBeNull();
    expect(step(f, false).armImpulse[f.blocker.idx]).toBeGreaterThan(0);
    const frame = e.surfaceAxis!, hands = e.hands!, before = bodies(f), control = e.control;
    const wrongSurface = { axis: { x: 1, y: 0 }, sealTarget: .5 };
    expect(f.engage(f.blocker, f.defender, 'run', { x: 1, y: 0 }, wrongSurface)).toBe(e);
    expect(e.surfaceAxis).toBe(frame); expect(e.hands).toBe(hands); expect(e.control).toBe(control);
    expect(bodies(f)).toEqual(before);
    const helper = f.sim.slot('LG')!, lat = { x: -frame.y, y: frame.x };
    helper.body.pos = { x: f.defender.pos.x + frame.x * .8 + lat.x * .55,
      y: f.defender.pos.y + frame.y * .8 + lat.y * .55 };
    const joiningBodies = bodies(f);
    expect(f.engage(helper, f.defender, 'run', { x: 1, y: 0 }, wrongSurface)).toBe(e);
    expect(e.surfaceAxis).toBe(frame); expect(e.hands).toBe(hands); expect(e.control).toBe(control);
    expect(bodies(f)).toEqual(joiningBodies);
    e.drive = { x: 1, y: 0 };
    const report = step(f, false);
    expect(e.surfaceAxis).toBe(frame); expect(e.hands).toBe(hands);
    expect(f.sim.world.joints).toContain(hands);
    expect(report.armImpulse[f.blocker.idx]).toBeGreaterThan(0);
  });

  it('a supplied run surface is copied at creation without rewriting a body', () => {
    const f = fixture(), before = bodies(f);
    const e = f.engage(f.blocker, f.defender, 'run', f.drive, f.surface)!;
    expect(e.surfaceAxis).toEqual(f.surface.axis); expect(e.surfaceAxis).not.toBe(f.surface.axis);
    expect(bodies(f)).toEqual(before);
    f.surface.axis.y = -f.surface.axis.y;
    expect(e.surfaceAxis!.y).not.toBe(f.surface.axis.y);
  });

  it('pass protection ignores a proposed run surface and keeps identical physical contact', () => {
    const plain = fixture(), supplied = fixture();
    const p = plain.engage(plain.blocker, plain.defender, 'pass', null)!;
    const s = supplied.engage(supplied.blocker, supplied.defender, 'pass', null, supplied.surface)!;
    expect(axisOf(plain.sim, p)).toEqual(axisOf(supplied.sim, s));
    expect(s.surfaceAxis).toBeUndefined();
    expect({ control: s.control, phi: s.phi, side: s.side }).toEqual({ control: p.control, phi: p.phi, side: p.side });
    step(plain, false); step(supplied, false);
    expect(bodies(supplied)).toEqual(bodies(plain));
  });

  it('an old wall installation is cleared when the player finds a new second-level job', () => {
    const f = fixture(), backer = f.sim.slot('LB_W')!;
    f.blocker.body.pos.x = 42.1;
    backer.body.pos = { x: 43.15, y: f.blocker.pos.y };
    f.defender.body.support!.state = 'down'; f.observe();
    f.behavior.update(f.blocker, f.sim);
    expect(f.plan.target).toBe(backer); expect(f.plan.kind).toBe('climb');
    expect(f.plan.contactFit).toBeUndefined();
    let loaded = false;
    for (let k = 0; k < 18 && !loaded; k++) {
      const report = step(f);
      loaded = f.blocker.engagement?.defender === backer && report.armImpulse[f.blocker.idx] > 0;
    }
    expect(loaded).toBe(true);
    expect(axisOf(f.sim, f.blocker.engagement!).x).toBe(-1);
    expect(axisOf(f.sim, f.blocker.engagement!).y).toBeCloseTo(0, 12);
  });

  it('passing a crossing threat changes the old cutoff surface into the actual new job', () => {
    const f = fixture(), partner = f.sim.slot('RG')!, backer = f.sim.slot('LB_W')!;
    f.blocker.body.pos = { x: 40, y: CENTER_Y - .65 };
    partner.body.pos = { x: 40, y: CENTER_Y + .65 };
    f.defender.body.pos = { x: 41.8, y: partner.pos.y };
    backer.body.pos = { x: 43, y: f.blocker.pos.y };
    partner.behavior = new RunBlocker({ kind: 'drive', target: backer, drive: { x: 1, y: 0 } });
    f.observe();
    const before = bodies(f);
    f.behavior.update(f.blocker, f.sim);
    expect(f.plan.target).toBe(backer); expect(f.plan.kind).toBe('climb');
    expect(f.plan.drive).toEqual({ x: 1, y: 0 }); expect(f.plan.contactFit).toBeUndefined();
    expect((partner.behavior as RunBlocker).target).toBe(f.defender);
    expect(bodies(f)).toEqual(before);
    expect(f.sim.events.filter(e => e.type === 'block_exchange')).toHaveLength(1);
    let loaded = false;
    for (let k = 0; k < 18 && !loaded; k++) {
      const report = step(f, true, partner);
      loaded = partner.engagement?.defender === f.defender && report.armImpulse[partner.idx] > 0;
    }
    expect(loaded).toBe(true);
    expect(partner.engagement!.surfaceAxis).toBeUndefined();
    expect(f.sim.world.joints).toContain(partner.engagement!.hands!);
  });

  it('an immediate inside penetrator is collected without retaining the previous outside wall', () => {
    const f = fixture(), backer = f.sim.slot('LB_W')!, penetrator = f.sim.slot('DT_W')!;
    f.blocker.body.pos = { x: 39, y: CENTER_Y };
    backer.body.pos = { x: 44, y: CENTER_Y };
    penetrator.body.pos = { x: 39.6, y: CENTER_Y };
    f.plan.kind = 'climb'; f.plan.target = backer; f.observe();
    f.behavior.update(f.blocker, f.sim);
    expect(f.plan.target).toBe(penetrator); expect(f.plan.kind).toBe('drive');
    expect(f.plan.contactFit).toBeUndefined(); expect(f.blocker.tags.has('block-collect')).toBe(true);
    const e = f.blocker.engagement!;
    expect(e.defender).toBe(penetrator);
    expect(e.surfaceAxis).toBeUndefined();
    expect(step(f).armImpulse[f.blocker.idx]).toBeGreaterThan(0);
  });
});

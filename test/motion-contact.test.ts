import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { motionContact, motionContactLoads, type MotionContactInput } from '../src/lab/motion-contact.js';
import type { Body } from '../src/physics/kinematics.js';
import { World } from '../src/physics/world.js';

const fixture: MotionContactInput = { seed: 7, side: 1, geometry: 'wideSurface', initialSpeed: 4, substeps: 12 };
const plain = (r: ReturnType<typeof motionContact>) => ({ history: r.physicalHistory, endpoint: r.endpoint,
  initialContext: r.initialContext, firstAcquisition: r.firstAcquisition, contactMetrics: r.contactMetrics,
  firstContact: r.firstContact && { ...r.firstContact, before: null },
  firstHandBodyContact: r.firstHandBodyContact && { ...r.firstHandBodyContact, before: null },
  falls: r.falls, rngNext: r.rngNext });

const strikeBody = (x: number): Body => ({ pos: { x, y: 0 }, vel: { x: 0, y: 0 }, facing: 0, energy: 1,
  profile: { massKg: 100, radius: .3, reach: 1, heightYd: 2.05,
    vmax: 9, tau: 1.3, brake: 6, lateral: 6, turnRate: 8, backpedal: .6,
    shuffle: .55, maxCatchHeight: 3, reactReach: 2.6, reactionTime: .25,
    power: 100, balance: .5, stepSpeed: 3.4, getUp: .9 } });

describe('reduced split-zone snap-time momentum witness', () => {
  it('rejects invalid physical inputs', () => {
    expect(() => motionContact({ ...fixture, initialSpeed: -1 })).toThrow('Invalid');
    expect(() => motionContact({ ...fixture, initialSpeed: Infinity })).toThrow('Invalid');
    expect(() => motionContact({ ...fixture, substeps: 0 })).toThrow('Invalid');
  });

  it('changes only initial TE movement and counts its real added kinetic energy', () => {
    const stationary = motionContact({ ...fixture, initialSpeed: 0 });
    const moving = motionContact(fixture);
    expect(moving.participants).toEqual(stationary.participants);
    expect(moving.initial.plan).toEqual(stationary.initial.plan);
    expect(moving.initial.readyAt).toEqual(stationary.initial.readyAt);
    expect(moving.initial.end).toEqual(stationary.initial.end);
    expect(moving.initial.te.pos).toEqual(stationary.initial.te.pos);
    expect(moving.initial.te.support).toEqual(stationary.initial.te.support);
    expect(moving.initial.te.vel).toEqual({ x: 0, y: -4 });
    expect(moving.initial.teKineticEnergyKgYd2PerS2).toBeCloseTo(.5 * moving.participants.te.profile.massKg * 16, 10);
    const a = structuredClone(moving.initialContext), b = structuredClone(stationary.initialContext);
    a.agents[moving.participants.te.idx].body.vel = { x: 0, y: 0 };
    expect(a).toEqual(b);
  });

  it('full recording and actual-read instrumentation leave physical history and RNG identical', () => {
    const observed = motionContact(fixture, { observe: true, recording: true });
    const control = motionContact(fixture, { observe: false, recording: false });
    expect(plain(observed)).toEqual(plain(control));
    expect(observed.recording?.frames).toHaveLength(51);
    expect(observed.recording?.telemetry?.frames).toHaveLength(51);
    expect(observed.recording?.frames[0].t).toBe(0);
    expect(observed.recording?.frames.at(-1)?.t).toBe(2.5);
    expect(observed.recording?.telemetry?.frames.some(f => f.perception?.length)).toBe(true);
  });

  it('existing controllers acquire a reachable block with bounded ordinary force/work budgets', () => {
    const r = motionContact({ ...fixture, geometry: 'penetratingEdge' });
    expect(r.initial.initialReachable).toBe(false);
    expect(r.firstAcquisition).not.toBeNull();
    expect(r.firstContact).not.toBeNull();
    expect(r.firstAcquisition.distance).toBeLessThan(1.2);
    expect(r.invariants.momentumResidual).toBeLessThan(1e-8);
    expect(r.invariants.workResidual).toBeLessThan(1e-8);
    expect(r.invariants.armImpulseExcess).toBeLessThan(1e-8);
    expect(r.invariants.armWorkExcess).toBeLessThan(1e-8);
    expect(r.invariants.motorWorkExcess).toBeLessThan(1e-8);
    for (const frame of r.frames) {
      expect(Number.isFinite(frame.after.te.pos.x + frame.after.te.pos.y + frame.after.end.pos.x + frame.after.end.pos.y)).toBe(true);
    }
  });

  it('installs both staged sides consistently and acquires actual loaded contact', () => {
    for (const side of [1, -1] as const) {
      const r = motionContact({ ...fixture, side, initialSpeed: 0 }, { recording: true });
      expect(r.initial.installation).toEqual({ name: 'formation-consistent-v2', formationFlip: side > 0,
        strongSign: side, stagedTESide: side, sliceSign: -side, plannedDriveSign: -side });
      expect(Math.sign(r.initial.te.pos.y - CENTER_Y)).toBe(side);
      expect(Math.sign(r.initial.end.pos.y - CENTER_Y)).toBe(-side);
      // Earlier achieved kick contact need not wait for a later acquired
      // inside crossing. The production log cue is opposed explicitly in
      // puller-kick-transition.test; this reduced witness retains real load.
      expect(r.firstAcquisition).not.toBeNull();
      expect(r.firstHandBodyContact).not.toBeNull();
      expect(r.contactMetrics.engagedHandBodyLoadedDecisionIntervals).toBeGreaterThan(0);
    }
  });

  it('counts a physically delivered strike as actual contact without inventing a held hand/body block', () => {
    const a = strikeBody(0), b = strikeBody(1), world = new World([a, b], { substeps: 12 });
    world.strike(a, b, { x: 5, y: 2 });
    const report = world.step([{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], .05);
    const load = motionContactLoads(report, 0, 1);
    expect(report.contacts).toHaveLength(0);
    expect(report.strikes).toHaveLength(1);
    expect(load.sources).toEqual(['strike']);
    expect(load.loaded).toBe(true);
    expect(load.handBodyLoaded).toBe(false);
    expect(load.strikes[0].impulse.x).toBeGreaterThan(0);
    expect(load.strikes[0].work).toBeCloseTo(report.work.strikes, 10);
    expect(motionContactLoads(report, 0, 2).loaded).toBe(false);
  });

  it('does not turn an unreachable requested strike into a recorded contact', () => {
    const a = strikeBody(0), b = strikeBody(3), world = new World([a, b], { substeps: 12 });
    world.strike(a, b, { x: 5, y: 2 });
    const report = world.step([{ vel: { x: 0, y: 0 }, free: true }, { vel: { x: 0, y: 0 }, free: true }], .05);
    expect(report.strikes).toHaveLength(0);
    expect(motionContactLoads(report, 0, 1).sources).toEqual([]);
    expect(motionContactLoads(report, 0, 1).loaded).toBe(false);
    expect(report.work.strikes).toBe(0);
  });

  it('preserves unreachable high-speed negative instead of prescribing contact', () => {
    const r = motionContact({ ...fixture, geometry: 'initialReachNegative', initialSpeed: 8 });
    expect(r.initial.initialReachable).toBe(false);
    expect(r.negativeControl).toBe(true);
    expect(r.firstAcquisition).toBeNull();
    expect(r.firstContact).toBeNull();
    expect(r.firstHandBodyContact).toBeNull();
    expect(r.contactMetrics.actualLoadedDecisionIntervals).toBe(0);
    expect(r.contactMetrics.strikeImpulseMagnitudeSum).toBe(0);
    expect(r.frames.every(f => f.strikes.length === 0)).toBe(true);
    expect(r.contactClassification).toBe('no-acquisition-within-window');
    expect(r.initial.teKineticEnergyKgYd2PerS2).toBeGreaterThan(0);
  });

  it('mirrors geometric mistakes and actual contact, without changing their magnitude or strengths', () => {
    const right = motionContact(fixture), left = motionContact({ ...fixture, side: -1 });
    expect(left.participants).toEqual(right.participants);
    expect(left.initial.mirroredExecutionErrors.te).toBe(-right.initial.mirroredExecutionErrors.te);
    expect(left.initial.mirroredExecutionErrors.end).toBe(-right.initial.mirroredExecutionErrors.end);
    expect(left.firstContact?.interval).toEqual(right.firstContact?.interval);
    for (const name of ['te', 'end'] as const) {
      expect(left.endpoint[name].pos.x).toBeCloseTo(right.endpoint[name].pos.x, 10);
      expect(left.endpoint[name].pos.y + right.endpoint[name].pos.y).toBeCloseTo(2 * CENTER_Y, 10);
    }
  });
});

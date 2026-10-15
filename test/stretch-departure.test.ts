import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { CENTER_Y } from '../src/core/field.js';
import type { Vec2 } from '../src/core/vec.js';
import type { Body, MoveCommand } from '../src/physics/kinematics.js';
import { World } from '../src/physics/world.js';
import { supportParams } from '../src/physics/support.js';
import { planStretchDeparture, stretchDepartureStep, type DeparturePeer } from '../src/sim/stretch-departure.js';
import { track } from '../src/sim/behaviors/common.js';

const saved = JSON.parse(readFileSync(new URL('./fixtures/stretch-departure-state.json', import.meta.url), 'utf8'));
const BEAT = .25;

function fixture(mirror = false) {
  const value = structuredClone(saved);
  const body = value.body as Body;
  if (body.support?.since === null) body.support.since = -Infinity;
  const reflectPoint = (p: Vec2) => ({ x: p.x, y: 2 * CENTER_Y - p.y });
  const reflectVector = (p: Vec2) => ({ x: p.x, y: -p.y });
  if (mirror) {
    body.pos = reflectPoint(body.pos); body.vel = reflectVector(body.vel); body.facing *= -1;
    if (body.spin !== undefined) body.spin *= -1;
    if (body.squeezeHeading !== undefined) body.squeezeHeading *= -1;
    if (body.support) for (const key of ['xi', 'lean', 'load', 'felt', 'feetVel', 'fall', 'feltTip', 'accel', 'tipAccel'] as const) {
      const vector = body.support[key];
      if (vector) body.support[key] = reflectVector(vector);
    }
    value.exit = reflectPoint(value.exit); value.flow = reflectVector(value.flow);
    value.backer.pos = reflectPoint(value.backer.pos); value.backer.vel = reflectVector(value.backer.vel);
    value.placementError *= -1;
    value.oldCommand.vel = reflectVector(value.oldCommand.vel); value.oldCommand.facing *= -1;
    for (const obstacle of value.obstacles) {
      obstacle.seen.pos = reflectPoint(obstacle.seen.pos);
      obstacle.seen.vel = reflectVector(obstacle.seen.vel);
      obstacle.seen.facing *= -1;
    }
  }
  const peers: DeparturePeer[] = value.obstacles.map((obstacle: any) => ({
    pos: { ...obstacle.seen.pos }, vel: { ...obstacle.seen.vel }, radius: obstacle.radius,
  }));
  return { ...value, body, peers };
}

function goal(f: ReturnType<typeof fixture>, dt = 0): Vec2 {
  return { x: f.exit.x + f.flow.x * dt,
    y: f.exit.y + f.flow.y * dt + f.placementError };
}

function facing(f: ReturnType<typeof fixture>, body = f.body) {
  return Math.atan2(f.backer.pos.y - body.pos.y, f.backer.pos.x - body.pos.x);
}

function command(f: ReturnType<typeof fixture>) {
  return stretchDepartureStep(f.body, goal(f), facing(f), f.peers, f.now, BEAT, f.handContact);
}

function oldCommand(f: ReturnType<typeof fixture>, body = f.body, dt = 0): MoveCommand {
  // The old behavior accepts only these own state fields in track().
  return track({ pos: body.pos, vel: body.vel, body, profile: body.profile } as any,
    goal(f, dt), f.flow, { speed: 1, gain: 3, facing: facing(f, body) });
}

/** Same released body and held acquired cues in both arms. These are empty-
 * space controller steps, with neighboring pictures coasting over one beat;
 * no claim of a naturally reacting native continuation or future LB block. */
function execute(f: ReturnType<typeof fixture>, transit: boolean) {
  const body = structuredClone(f.body), world = new World([body], { handContact: f.handContact });
  world.time = f.now;
  const commands: MoveCommand[] = [];
  for (let i = 0; i < 5; i++) {
    const dt = i * .05;
    const peers = f.peers.map((peer: DeparturePeer) => ({ ...peer,
      pos: { x: peer.pos.x + peer.vel.x * dt, y: peer.pos.y + peer.vel.y * dt } }));
    const choice = transit ? stretchDepartureStep(body, goal(f, dt), facing(f, body), peers,
      f.now + dt, BEAT - dt, f.handContact) : oldCommand(f, body, dt);
    expect(choice).not.toBeNull();
    commands.push(choice!);
    const report = world.step([choice!], .05);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    expect(Math.hypot(report.groundImpulse[0].x, report.groundImpulse[0].y))
      .toBeLessThanOrEqual(supportParams(body.profile).traction * .05 + 1e-8);
    expect(report.armImpulse).toEqual([0]);
    expect(report.supportMotorWork[0]).toBeLessThanOrEqual(report.supportMotorWorkLimit[0] + 1e-8);
    expect(body.support!.state).toBe('up');
  }
  const dx = goal(f).x - f.body.pos.x, dy = goal(f).y - f.body.pos.y, length = Math.hypot(dx, dy);
  return { body, commands, progress: ((body.pos.x - f.body.pos.x) * dx + (body.pos.y - f.body.pos.y) * dy) / length };
}

describe('a released stretch helper travels through the intermediate exit', () => {
  it('pins the exact released body and reproduces its old station-keeping request', () => {
    const f = fixture();
    expect(f.provenance.revision).toBe('42c7095c9519e89a23cc17861d85cec6e008c744');
    expect(f.provenance.sourceSha256).toBe('42ce9955360fbda8a469615e9e3976d34ad5cfd504c74393c1bcf65f188e36d3');
    expect(f.now).toBe(1.15);
    const old = oldCommand(f);
    expect(old.vel.x).toBeCloseTo(f.oldCommand.vel.x, 12);
    expect(old.vel.y).toBeCloseTo(f.oldCommand.vel.y, 12);
    expect(old.facing).toBe(f.oldCommand.facing);
    expect(Math.hypot(old.vel.x, old.vel.y)).toBeCloseTo(.5554145570510935, 12);
  });

  it.each([false, true])('makes useful exit progress from the same own body, mirrored=%s', mirror => {
    const f = fixture(mirror), input = structuredClone(f);
    const candidate = command(f);
    expect(candidate).not.toBeNull();
    expect(candidate!.facing).toBe(facing(f));
    expect(Math.hypot(candidate!.vel.x, candidate!.vel.y)).toBeGreaterThan(1);
    expect(f).toEqual(input);
    const old = execute(f, false), transit = execute(f, true);
    expect(transit.progress).toBeGreaterThan(old.progress);
    console.info('stretch departure same-body control', JSON.stringify({ mirror,
      oldRequest: f.oldCommand.vel, transitRequest: candidate!.vel,
      oldProgress: old.progress, transitProgress: transit.progress,
      oldPos: old.body.pos, transitPos: transit.body.pos }));
  });

  it('preserves the acquired input and own state across previews without RNG draws', () => {
    const f = fixture(), input = structuredClone(f);
    const draw = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const first = command(f);
      expect(command(f)).toEqual(first);
      expect(command(structuredClone(f))).toEqual(first);
      expect(f).toEqual(input);
      expect(draw).not.toHaveBeenCalled();
    } finally { draw.mockRestore(); }
  });
});

describe('the transit request respects real first-beat obstructions', () => {
  it('rejects an acquired torso in the achievable first step', () => {
    const f = fixture();
    const through = command(f)!;
    expect(through).not.toBeNull();
    const worldBody = structuredClone(f.body), world = new World([worldBody], { handContact: f.handContact });
    world.time = f.now;
    world.step([through], .05);
    const blocker = { pos: { ...worldBody.pos }, vel: { x: 0, y: 0 }, radius: .35 };
    expect(stretchDepartureStep(f.body, goal(f), facing(f), [...f.peers, blocker], f.now, BEAT, f.handContact)).toBeNull();
  });

  it('rejects residual momentum into a body despite a geometrically clear requested ray', () => {
    const f = fixture();
    f.body.pos = { x: 40, y: 26 }; f.body.vel = { x: 0, y: 4 }; f.body.facing = 0;
    f.body.support!.lean = { x: 0, y: 0 }; f.body.support!.load = { x: 0, y: 0 };
    const obstacle: DeparturePeer = { pos: { x: 40, y: 26.75 }, vel: { x: 0, y: 0 }, radius: .35 };
    const target = { x: 43, y: 26 };
    // Requested straight line stays .75yd from the torso, outside .716yd.
    expect(obstacle.pos.y - f.body.pos.y).toBeGreaterThan(f.body.profile.radius + obstacle.radius);
    expect(stretchDepartureStep(f.body, target, 0, [obstacle], f.now, BEAT, f.handContact)).toBeNull();
  });

  it('allows existing slight overlap only when the executed first beat moves out', () => {
    const f = fixture();
    f.body.pos = { x: 40, y: 26 }; f.body.vel = { x: -.5, y: 0 }; f.body.facing = Math.PI;
    f.body.support!.lean = { x: 0, y: 0 }; f.body.support!.load = { x: 0, y: 0 };
    const peer: DeparturePeer = { pos: { x: 40.65, y: 26 }, vel: { x: 0, y: 0 }, radius: .35 };
    expect(.65).toBeLessThan(f.body.profile.radius + peer.radius);
    expect(stretchDepartureStep(f.body, { x: 38, y: 26 }, Math.PI, [peer], f.now, BEAT, f.handContact)).not.toBeNull();
    f.body.vel = { x: .5, y: 0 }; f.body.facing = 0;
    expect(stretchDepartureStep(f.body, { x: 42, y: 26 }, 0, [peer], f.now, BEAT, f.handContact)).toBeNull();
  });
});

describe('a complete acquired departure route preserves the safe first beat', () => {
  it.each([false, true])('connects the saved release around both torsos, mirrored=%s', mirror => {
    const f = fixture(mirror), before = structuredClone(f);
    const path = planStretchDeparture(f.body, f.backer.pos, f.peers,
      f.now, BEAT, f.handContact, f.placementError);
    expect(path).not.toBeNull();
    expect(path!.length).toBeGreaterThan(1);
    expect(path!.at(-1)!.x).toBe(f.backer.pos.x);
    expect(path!.at(-1)!.y).toBe(f.backer.pos.y + f.placementError);
    const first = stretchDepartureStep(f.body, path![0], facing(f), f.peers,
      f.now, BEAT, f.handContact, path![1]);
    expect(first).not.toBeNull();
    expect(f).toEqual(before);
    const body = structuredClone(f.body), world = new World([body], { handContact: f.handContact });
    world.time = f.now;
    let previous = { ...body.pos };
    for (let k = 0; k < 5; k++) {
      const report = world.step([first!], .05);
      expect(body.support!.state).toBe('up');
      expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
      for (const peer of f.peers) {
        const radius = Math.min(f.body.profile.radius + peer.radius,
          Math.hypot(f.body.pos.x-peer.pos.x, f.body.pos.y-peer.pos.y));
        const x = previous.x-peer.pos.x-peer.vel.x*k*.05;
        const y = previous.y-peer.pos.y-peer.vel.y*k*.05;
        const dx = body.pos.x-peer.pos.x-peer.vel.x*(k+1)*.05-x;
        const dy = body.pos.y-peer.pos.y-peer.vel.y*(k+1)*.05-y;
        const u = Math.max(0, Math.min(1, -(x*dx+y*dy)/Math.max(1e-12, dx*dx+dy*dy)));
        expect(Math.hypot(x+u*dx,y+u*dy)).toBeGreaterThanOrEqual(radius-1e-9);
      }
      previous = { ...body.pos };
    }
    const dx=path![0].x-f.body.pos.x, dy=path![0].y-f.body.pos.y;
    expect((body.pos.x-f.body.pos.x)*dx+(body.pos.y-f.body.pos.y)*dy).toBeGreaterThan(0);
    console.info('complete stretch departure first beat', JSON.stringify({ mirror, path,
      request:first!.vel, start:f.body.pos, end:body.pos }));
  });

  it('keeps the genuine closing overlap rejected instead of inventing a safe detour', () => {
    const f = fixture(), closing = structuredClone(f.closingState);
    const body = closing.body as Body;
    if (body.support?.since === null) body.support.since = -Infinity;
    const before = structuredClone(closing);
    const down = closing.peers[0];
    const dx=body.pos.x-down.pos.x, dy=body.pos.y-down.pos.y;
    expect(Math.hypot(dx,dy)).toBeLessThan(body.profile.radius+down.radius);
    expect(dx*(body.vel.x-down.vel.x)+dy*(body.vel.y-down.vel.y)).toBeLessThan(0);
    expect(planStretchDeparture(body, closing.target, closing.peers, closing.now, BEAT, f.handContact)).toBeNull();
    expect(closing).toEqual(before);
  });
});

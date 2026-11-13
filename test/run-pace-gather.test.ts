import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import { generateTeam, pickDefense } from '../src/league/team.js';
import type { Body } from '../src/physics/kinematics.js';
import * as Preview from '../src/physics/movement-preview.js';
import type { MovementSample } from '../src/physics/movement-preview.js';
import { newSupport } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { derivePhysical, type PhysicalProfile } from '../src/players/physical.js';
import type { Player } from '../src/players/types.js';
import { Agent, type Engagement } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { spaceTeammates } from '../src/sim/spacing.js';

interface Peer { idx: number; slot: string; profile: PhysicalProfile; seen: Perceived }
interface Fixture {
  actor: { idx: number; slot: string; player: Player };
  t: number; body: Body; raw: Intent; acceptedHalf: Intent; peers: Peer[];
}
const fixture: Fixture = JSON.parse(gunzipSync(readFileSync(
  new URL('./fixtures/run-pace-gather.json.gz', import.meta.url))).toString());

function reflectVector(v: Vec2): void { v.y = -v.y; }
function reflectBody(body: Body): void {
  body.pos.y = 2 * CENTER_Y - body.pos.y;
  reflectVector(body.vel); body.facing = -body.facing;
  if (body.spin !== undefined) body.spin = -body.spin;
  if (body.squeezeHeading !== undefined) body.squeezeHeading = -body.squeezeHeading;
  const support = body.support;
  if (support) {
    for (const key of ['xi', 'lean', 'load', 'felt', 'feetVel', 'fall', 'feltTip', 'accel', 'tipAccel', 'strike'] as const) {
      if (support[key]) reflectVector(support[key]!);
    }
    if (support.yaw !== undefined) support.yaw = -support.yaw;
  }
}

function scene(mirror: number, input: Fixture = fixture) {
  const row = structuredClone(input);
  if (mirror < 0) {
    reflectBody(row.body); reflectVector(row.raw.vel); reflectVector(row.acceptedHalf.vel);
    if (row.raw.facing !== undefined) row.raw.facing = -row.raw.facing;
    if (row.acceptedHalf.facing !== undefined) row.acceptedHalf.facing = -row.acceptedHalf.facing;
    for (const peer of row.peers) {
      peer.seen.pos.y = 2 * CENTER_Y - peer.seen.pos.y;
      reflectVector(peer.seen.vel);
      if (typeof peer.seen.facing === 'number') peer.seen.facing = -peer.seen.facing;
    }
  }
  const a = new Agent(row.actor.idx, 'O', row.actor.slot, row.actor.player,
    row.body.profile, row.body, { kind: 'carrier', update() { throw Error('No new decision'); } });
  const peers = row.peers.map(p => ({ idx: p.idx, team: 'O', profile: p.profile,
    get pos() { throw Error('Private teammate position'); },
    get vel() { throw Error('Private teammate velocity'); },
    get facing() { throw Error('Private teammate facing'); },
    get body() { throw Error('Private teammate body'); },
    get engagement() { throw Error('Private teammate engagement'); },
  } as unknown as Agent));
  const source = structuredClone(a.body), pictures = structuredClone(row.peers);
  const run = (constrained = false) => {
    const commands: Intent[] = [structuredClone(row.raw), ...peers.map(() => ({ vel: { x: 0, y: 0 }, free: true }))];
    spaceTeammates([a, ...peers], commands,
      (_observer, peer) => structuredClone(row.peers.find(p => p.idx === peer.idx)!.seen),
      { now: row.t, constrained: constrained ? new Set([a.body]) : undefined });
    expect(a.body).toEqual(source);
    expect(row.peers).toEqual(pictures);
    return commands[0];
  };
  return { row, a, run };
}

/** Same clear/curved-obstruction setup as spacing-yield.test.ts. This is a
 * declared two-player movement control, not a reduced native football play. */
function curvedScene(mirror: number) {
  const defense = pickDefense(generateTeam(new Rng(20), 'D', 'DEF'), 'nickel');
  const player = defense.FS!, peer = defense.NB!;
  const raw: Intent = { vel: { x: 0, y: 9 }, facing: Math.PI / 2, cutSkill: 1 };
  return scene(mirror, {
    actor: { idx: 0, slot: 'FS', player }, t: 2,
    body: { pos: { x: 50, y: CENTER_Y }, vel: { x: 9, y: 0 }, facing: 0,
      energy: 1, profile: derivePhysical(player), support: newSupport() },
    raw, acceptedHalf: { ...raw, vel: { x: 0, y: 4.5 } },
    peers: [{ idx: 1, slot: 'NB', profile: derivePhysical(peer), seen: {
      pos: { x: 54.3, y: CENTER_Y + 1.1 }, vel: { x: 0, y: 0 },
      stance: null, facing: 0, age: 0, pose: 'up', carrying: false,
    } }],
  });
}

/** Continuous relative segments against the same consumed peer images. This
 * checks achieved free-movement samples, not the requested velocity ray. */
function clearance(body: Body, samples: readonly MovementSample[], peer: Peer): number {
  const touch = .9 * (body.profile.radius + peer.profile.radius);
  let px = body.pos.x - peer.seen.pos.x, py = body.pos.y - peer.seen.pos.y;
  let minimum = Math.hypot(px, py) - touch;
  for (const sample of samples) {
    const rx = sample.pos.x - peer.seen.pos.x - peer.seen.vel.x * sample.t;
    const ry = sample.pos.y - peer.seen.pos.y - peer.seen.vel.y * sample.t;
    const dx = rx - px, dy = ry - py;
    const q = Math.max(0, Math.min(1, -(px * dx + py * dy) / Math.max(1e-12, dx * dx + dy * dy)));
    minimum = Math.min(minimum, Math.hypot(px + q * dx, py + q * dy) - touch);
    px = rx; py = ry;
  }
  return minimum;
}
function evaluate(s: ReturnType<typeof scene>, command: Intent) {
  const samples = Preview.previewFreeMovement(s.a.body, command, s.row.t, 12);
  const minimum = Math.min(...s.row.peers.map(p => clearance(s.a.body, samples, p)));
  const end = samples.at(-1)!;
  const speed = Math.hypot(s.row.raw.vel.x, s.row.raw.vel.y);
  const progress = ((end.pos.x - s.a.pos.x) * s.row.raw.vel.x
    + (end.pos.y - s.a.pos.y) * s.row.raw.vel.y) / speed;
  return { samples, minimum, progress };
}
function fraction(s: ReturnType<typeof scene>, scale: number): Intent {
  return { ...s.row.raw, vel: { x: s.row.raw.vel.x * scale, y: s.row.raw.vel.y * scale } };
}

describe('a moving gather preserves achievable progress through teammate traffic', () => {
  it.each([1, -1])('uses more of a verified clear pace in native mirror %s', mirror => {
    const s = scene(mirror), before = structuredClone(s.a.body);
    const full = evaluate(s, s.row.raw), half = evaluate(s, fraction(s, .5));
    const threeQuarter = evaluate(s, fraction(s, .75));
    expect(full.minimum).toBeLessThan(-.03);
    expect(half.minimum).toBeGreaterThan(.50);
    expect(threeQuarter.minimum).toBeGreaterThan(0);
    const spy = vi.spyOn(Preview, 'previewFreeMovement');
    let chosen: Intent;
    try { chosen = s.run(); expect(spy.mock.calls.length).toBeLessThanOrEqual(5); }
    finally { spy.mockRestore(); }
    expect({ ...chosen!, vel: undefined }).toEqual({ ...s.row.raw, vel: undefined });
    const achieved = evaluate(s, chosen!);
    expect(achieved.minimum).toBeGreaterThanOrEqual(0);
    expect(achieved.samples.every(sample => sample.support === 'up')).toBe(true);
    expect(s.a.body).toEqual(before);
    expect(Math.hypot(chosen!.vel.x, chosen!.vel.y)).toBeGreaterThan(Math.hypot(s.row.acceptedHalf.vel.x, s.row.acceptedHalf.vel.y) + 1e-6);
    expect(achieved.progress).toBeGreaterThan(half.progress + .01);
  });

  it.each([1, -1])('verifies its moving pace against a genuine curved obstruction in mirror %s', mirror => {
    const s = curvedScene(mirror), half = evaluate(s, fraction(s, .5));
    expect(half.minimum).toBeGreaterThan(0);
    expect(evaluate(s, s.row.raw).minimum).toBeLessThan(0);
    const spy = vi.spyOn(Preview, 'previewFreeMovement');
    let chosen: Intent;
    try { chosen = s.run(); expect(spy.mock.calls.length).toBeLessThanOrEqual(5); }
    finally { spy.mockRestore(); }
    const achieved = evaluate(s, chosen!);
    expect(achieved.minimum).toBeGreaterThanOrEqual(0);
    expect(achieved.samples.every(sample => sample.support === 'up')).toBe(true);
    expect(Math.hypot(chosen!.vel.x, chosen!.vel.y)).toBeLessThan(Math.hypot(s.row.raw.vel.x, s.row.raw.vel.y));
  });

  it.each(['engagement', 'tactile constraint'])('keeps %s outside the free-movement selector', kind => {
    const s = scene(1);
    if (kind === 'engagement') s.a.engagement = {} as Engagement;
    const spy = vi.spyOn(Preview, 'previewFreeMovement');
    try {
      expect(s.run(kind === 'tactile constraint')).toEqual(s.row.raw);
      expect(spy).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });

  it.each([1, -1])('never reads private teammate bodies through the production hook in mirror %s', mirror => {
    const s = scene(mirror);
    expect(() => s.run()).not.toThrow();
  });
});

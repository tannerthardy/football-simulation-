import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import type { Body } from '../src/physics/kinematics.js';
import { previewFreeMovement, type MovementSample } from '../src/physics/movement-preview.js';
import type { Intent } from '../src/physics/world.js';
import type { Player } from '../src/players/types.js';
import { Agent } from '../src/sim/agent.js';
import type { Perceived } from '../src/sim/perception.js';
import { chooseComboBlockApproach } from '../src/sim/run-block-fit.js';
import type { TeammatePicture } from '../src/sim/teammate-information.js';

type AvailablePicture = Exclude<TeammatePicture, { source: 'unavailable' }>;
interface Fixture {
  id: string; time: number; ownBody: Body; defender: Perceived;
  owner: { picture: AvailablePicture; radius: number };
  nominalAim: Vec2; placementError: number; bodyContact: number; workingReach: number; original: Intent;
}
const packet = JSON.parse(readFileSync(new URL('../data/reviews/current/wz-combo-approach-state.json', import.meta.url), 'utf8')) as {
  actor: { idx: number; team: 'O'; slot: string; player: Player }; cases: Fixture[];
};

function stage(fixture: Fixture) {
  const f = structuredClone(fixture), body = f.ownBody;
  // JSON cannot encode the ordinary never-fallen support timestamp.
  body.support!.since = -Infinity;
  const r = packet.actor;
  const a = new Agent(r.idx, r.team, r.slot, structuredClone(r.player), body.profile, body,
    { kind: 'fixture', update: () => ({ vel: { x: 0, y: 0 } }) });
  return { f, a };
}
function decide(a: Agent, f: Fixture, owner = f.owner) {
  return chooseComboBlockApproach(a, f.defender, owner, f.nominalAim, f.placementError,
    f.bodyContact, f.original);
}
function clearance(start: Vec2, samples: readonly MovementSample[], picture: Pick<Perceived, 'pos' | 'vel'>,
  radius: number): number {
  let x = start.x - picture.pos.x, y = start.y - picture.pos.y, minimum = Math.hypot(x, y) - radius;
  for (const sample of samples) {
    const nx = sample.pos.x - picture.pos.x - picture.vel.x * sample.t;
    const ny = sample.pos.y - picture.pos.y - picture.vel.y * sample.t;
    const dx = nx - x, dy = ny - y;
    const u = Math.max(0, Math.min(1, -(x * dx + y * dy) / Math.max(1e-12, dx * dx + dy * dy)));
    minimum = Math.min(minimum, Math.hypot(x + u * dx, y + u * dy) - radius);
    x = nx; y = ny;
  }
  return minimum;
}

describe('exposed combo approach from the same acquired state', () => {
  it.each(packet.cases)('$id avoids the known owner while reaching ordinary working distance', fixture => {
    const { f, a } = stage(fixture), command = decide(a, f);
    const raw = previewFreeMovement(a.body, f.original, f.time, 12);
    const candidate = previewFreeMovement(a.body, command, f.time, 12);
    const touch = .9 * (a.profile.radius + f.owner.radius);
    const rawGap = clearance(a.pos, raw, f.owner.picture, touch);
    const candidateGap = clearance(a.pos, candidate, f.owner.picture, touch);
    expect(Math.hypot(f.nominalAim.x - f.owner.picture.pos.x,
      f.nominalAim.y + f.placementError - f.owner.picture.pos.y) - touch).toBeLessThan(0);
    expect(command.vel).not.toEqual(f.original.vel);
    expect(candidate.every(sample => sample.support === 'up')).toBe(true);
    expect(candidateGap).toBeGreaterThanOrEqual(0);
    expect(candidateGap).toBeGreaterThan(rawGap + .05);
    // Reach is measured on achieved COM motion, without an engagement flag
    // or an awarded hand force. The coupled play must still earn its load.
    expect(clearance(a.pos, candidate, f.defender, f.workingReach)).toBeLessThanOrEqual(0);
    expect(candidate.at(-1)!.pos.y).toBeLessThan(a.pos.y);
  });

  it('does not alter a clear opposite-shoulder approach that already reaches the defender', () => {
    const { f, a } = stage(packet.cases[0]);
    f.owner.picture.pos = { x: f.defender.pos.x, y: f.defender.pos.y - f.bodyContact - .15 };
    f.owner.picture.vel = { ...f.defender.vel };
    expect(decide(a, f)).toEqual(f.original);
    const path = previewFreeMovement(a.body, f.original, f.time, 12);
    expect(clearance(a.pos, path, f.owner.picture, .9 * (a.profile.radius + f.owner.radius))).toBeGreaterThan(0);
    expect(clearance(a.pos, path, f.defender, f.workingReach)).toBeLessThanOrEqual(0);
  });

  it('cannot invent an owner picture when the owner is unavailable', () => {
    const { f, a } = stage(packet.cases[0]);
    expect(chooseComboBlockApproach(a, f.defender, undefined, f.nominalAim, f.placementError,
      f.bodyContact, f.original)).toEqual(f.original);
  });

  it('uses copied pictures without hidden owner reads, mutation or randomness', () => {
    const { f, a } = stage(packet.cases[0]), before = structuredClone(f), body = structuredClone(a.body);
    const hidden = { pos: { x: 10, y: 1 }, vel: { x: -9, y: 9 } };
    Object.defineProperty(f.owner, 'body', { get: () => { throw new Error('No remote body in acquired fit'); } });
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      const first = decide(a, f);
      hidden.pos = { x: 99, y: 49 }; hidden.vel = { x: 9, y: -9 };
      expect(decide(a, f)).toEqual(first);
      expect(f).toEqual(before);
      expect(a.body).toEqual(body);
      expect(draws).not.toHaveBeenCalled();
    } finally { draws.mockRestore(); }
  });
});

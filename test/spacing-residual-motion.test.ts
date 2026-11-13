import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import type { Body } from '../src/physics/kinematics.js';
import * as Preview from '../src/physics/movement-preview.js';
import type { Intent } from '../src/physics/world.js';
import { Agent } from '../src/sim/agent.js';
import { spaceTeammates } from '../src/sim/spacing.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/spacing-residual-motion.json.gz', import.meta.url))).toString());
function scene(clear = false) {
  const body: Body = structuredClone(fixture.body);
  const a = new Agent(fixture.actor, 'D', 'SS', fixture.player, body.profile, body, { kind: 'man', update() { throw Error('No decision reevaluation'); } });
  const pictures = new Map<number, { pos: { x: number; y: number }; vel: { x: number; y: number } }>();
  const peers = fixture.peers.map((p: any) => {
    const seen = structuredClone(p.seen); if (clear) seen.pos.x += 20;
    pictures.set(p.idx, seen);
    return { idx: p.idx, team: 'D', profile: p.profile,
      get pos() { throw Error('Private peer position'); }, get vel() { throw Error('Private peer velocity'); } } as unknown as Agent;
  });
  const intents: Intent[] = [structuredClone(fixture.command), ...peers.map(() => ({ vel: { x: 0, y: 0 }, free: true }))];
  const run = () => spaceTeammates([a, ...peers], intents, (_a, b) => pictures.get(b.idx)!, { now: fixture.t });
  return { a, pictures, intents, run };
}
describe('attainable spacing admission instead of requested-turn shortcuts', () => {
  it('checks the exact #81 A044 state even though the requested turn is below one', () => {
    const { a, pictures, intents, run } = scene(), request = structuredClone(intents[0]);
    expect(Math.abs(request.vel.x * a.vel.y - request.vel.y * a.vel.x) / a.speed).toBeCloseTo(.8749657976, 8);
    const source = structuredClone(a.body), peer = pictures.get(15)!;
    const samples = Preview.previewFreeMovement(a.body, request, fixture.t, 12);
    // This is the unchanged physical forecast: a requested direction alone
    // cannot clear the observed robber. A full gather is not declared safe.
    const touch = .9 * (a.profile.radius + fixture.peers.find((p: any) => p.idx === 15).profile.radius);
    expect(Math.min(...samples.map(s => Math.hypot(s.pos.x - peer.pos.x - peer.vel.x * s.t,
      s.pos.y - peer.pos.y - peer.vel.y * s.t))) - touch).toBeLessThan(0);
    const preview = vi.spyOn(Preview, 'previewFreeMovement');
    try {
      run(); expect(preview).toHaveBeenCalled();
      expect(a.body).toEqual(source);
      // Existing alternatives remain insufficient in this state. Admission
      // is corrected without inventing an instant turn or a successful stop.
      expect(intents[0]).toEqual(request);
    } finally { preview.mockRestore(); }
  });
  it('keeps an actually clear route unchanged without a new forecast', () => {
    const { intents, run } = scene(true), request = structuredClone(intents[0]);
    const preview = vi.spyOn(Preview, 'previewFreeMovement');
    try { run(); expect(intents[0]).toEqual(request); expect(preview).not.toHaveBeenCalled(); }
    finally { preview.mockRestore(); }
  });
});

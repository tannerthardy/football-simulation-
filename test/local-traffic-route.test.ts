import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { localPassage } from '../scripts/diag/navigation/local-passage.js';
import { CENTER_Y } from '../src/core/field.js';
import type { Body } from '../src/physics/kinematics.js';
import * as Preview from '../src/physics/movement-preview.js';
import { baseRadiusAt, newSupport, supportParams } from '../src/physics/support.js';
import { World, type Intent } from '../src/physics/world.js';
import { Agent } from '../src/sim/agent.js';
import { track } from '../src/sim/behaviors/common.js';
import { movementObjective, withMovementObjective } from '../src/sim/movement-objective.js';
import type { Perceived } from '../src/sim/perception.js';
import { spaceTeammates } from '../src/sim/spacing.js';
import { localTrafficRoute, type TrafficPeer } from '../src/sim/traffic-route.js';

const fixture = JSON.parse(gunzipSync(readFileSync(new URL('./fixtures/traffic-step.json.gz', import.meta.url))).toString());
const goal = { x: 58, y: CENTER_Y };

function actor() {
  const body: Body = { ...structuredClone(fixture.rows[0].body), pos: { x: 50, y: CENTER_Y },
    vel: { x: 4, y: 0 }, facing: 0, energy: 1, support: newSupport(), spin: 0, squeeze: 0 };
  return new Agent(0, 'D', 'SS', fixture.player, body.profile, body,
    { kind: 'zone', update() { throw Error('The selected football goal is already supplied'); } });
}

function picture(a: Agent): TrafficPeer {
  return { key: 1, pos: { x: 53, y: CENTER_Y }, vel: { x: 0, y: 0 }, age: .05,
    touch: .9 * (a.profile.radius + fixture.rows[0].peers[0].profile.radius) };
}

function request(a: Agent): Intent {
  return { ...track(a, goal, { x: 0, y: 0 }, { speed: .7, gain: 3, facing: 0 }),
    posture: .25, effort: .9, cutSkill: .85 };
}

function achievedPassage(row: ReturnType<typeof localPassage>) {
  // Reaching the far side is achieved movement, not a nominal detour request.
  expect(row.result.progress).toBeGreaterThan(7);
  expect(row.result.goalError).toBeLessThan(1);
  expect(row.states.every(s => s.after[0].state === 'up')).toBe(true);
  expect(row.states.every(s => s.command.facing === s.raw.facing)).toBe(true);
  expect(row.result.maximumWorkResidual).toBeLessThan(1e-8);
}

function usefulPassage(row: ReturnType<typeof localPassage>) {
  achievedPassage(row);
  // A tangent can produce a reported touch with zero delivered impulse.
  // Such a record is not a physical teammate impact or a failed passage.
  expect(row.result.contactIntervals.flatMap(s => s.contacts)
    .every(c => c.impulse <= 1e-8)).toBe(true);
}

function insideBalanceBase(body: Body) {
  const support = body.support!;
  return Math.hypot(support.xi.x, support.xi.y)
    <= baseRadiusAt(supportParams(body.profile), support.posture);
}

describe('local traffic routing preserves an owned goal through achieved movement', () => {
  it('passes head-on traffic without impact and resumes the same goal over three seconds', () => {
    const row = localPassage('head-on');
    usefulPassage(row);
    expect(row.states.some(s => Math.abs(s.after[0].pos.y - row.initial[0].pos.y) > row.initial[0].profile.radius)).toBe(true);
    expect(row.states.every(s => s.raw.objective?.kind === 'moving'
      && s.raw.objective.point.x === row.goal.x && s.raw.objective.point.y === row.goal.y
      && s.raw.objective.velocity?.x === 0 && s.raw.objective.velocity?.y === 0)).toBe(true);
  });

  it('passes the cluster with all bodies inside their balance bases, without claiming contact-free travel', () => {
    const unobserved = localPassage('cluster');
    const step = World.prototype.step;
    const supported: boolean[] = [], stayedUp: boolean[] = [], falls: number[] = [];
    const observer = vi.spyOn(World.prototype, 'step').mockImplementation(function(this: World, intents, dt) {
      const report = step.call(this, intents, dt);
      // One-body unloaded previews are not achieved teammate passage.
      if (this.bodies.length > 1) {
        supported.push(this.bodies.every(insideBalanceBase));
        stayedUp.push(this.bodies.every(b => b.support!.state === 'up'));
        falls.push(...report.falls);
      }
      return report;
    });
    let row: ReturnType<typeof localPassage>;
    try { row = localPassage('cluster'); } finally { observer.mockRestore(); }
    expect(row).toEqual(unobserved);
    expect(supported).toHaveLength(row.states.length);
    expect(supported.every(Boolean)).toBe(true);
    expect(stayedUp.every(Boolean)).toBe(true);
    expect(falls).toEqual([]);
    // A glance cannot grind against the same peer over repeated intervals,
    // even while the individual loads stay inside the support base.
    const contactPairs = row.result.contactIntervals.flatMap(s => s.contacts)
      .map(c => `${Math.min(c.i, c.j)}:${Math.max(c.i, c.j)}`);
    expect(new Set(contactPairs).size).toBe(contactPairs.length);
    achievedPassage(row);
    expect(row.states.some(s => Math.abs(s.after[0].pos.y - row.initial[0].pos.y) > row.initial[0].profile.radius)).toBe(true);
    expect(row.states.every(s => s.raw.objective?.kind === 'moving'
      && s.raw.objective.point.x === row.goal.x && s.raw.objective.point.y === row.goal.y
      && s.raw.objective.velocity?.x === 0 && s.raw.objective.velocity?.y === 0)).toBe(true);
    // The 20 Hz chord forecast is not a continuous contact-clearance proof.
    // Keep native contacts visible; a glance may move the passive peers.
    // This checks the existing physical support base at controller boundaries,
    // not a fitted impulse allowance or harmlessness to a peer's football job.
  });

  it('preserves useful offset passage in both mirrors, allowing harmless touch records', () => {
    const ordinary = localPassage('single'), mirrored = localPassage('mirror');
    usefulPassage(ordinary); usefulPassage(mirrored);
    expect(ordinary.result.progress).toBeCloseTo(mirrored.result.progress, 8);
    expect(ordinary.result.goalError).toBeCloseTo(mirrored.result.goalError, 8);
    for (let i = 0; i < ordinary.states.length; i++) {
      expect(ordinary.states[i].after[0].pos.x).toBeCloseTo(mirrored.states[i].after[0].pos.x, 8);
      expect(ordinary.states[i].after[0].pos.y - CENTER_Y)
        .toBeCloseTo(CENTER_Y - mirrored.states[i].after[0].pos.y, 8);
    }
  });

  it('keeps the clear track unchanged without any movement previews', () => {
    const preview = vi.spyOn(Preview, 'previewFreeMovement');
    try {
      const row = localPassage('clear');
      usefulPassage(row);
      expect(row.states.every(s => s.command.vel.x === s.raw.vel.x && s.command.vel.y === s.raw.vel.y)).toBe(true);
      expect(preview).not.toHaveBeenCalled();
    } finally { preview.mockRestore(); }
  });

  it('uses acquired peer pictures at the production hook while preserving body, pictures and command modifiers', () => {
    const a = actor(), raw = request(a), seen: Perceived = { pos: { x: 53, y: CENTER_Y },
      vel: { x: 0, y: 0 }, age: .05, facing: 0, stance: null };
    const peer = { idx: 1, team: 'D', profile: fixture.rows[0].peers[0].profile,
      get pos() { throw Error('Private peer position'); },
      get vel() { throw Error('Private peer velocity'); },
      get body() { throw Error('Private peer body'); } } as unknown as Agent;
    const beforeBody = structuredClone(a.body), beforePicture = structuredClone(seen);
    const intents: Intent[] = [raw, { vel: { x: 0, y: 0 }, free: true }];
    let reads = 0;
    spaceTeammates([a, peer], intents, (_observer, target) => {
      expect(target).toBe(peer); reads++; return seen;
    }, { now: 2 });
    expect(reads).toBe(1);
    expect(a.body).toEqual(beforeBody); expect(seen).toEqual(beforePicture);
    expect({ ...intents[0], vel: undefined }).toEqual({ ...raw, vel: undefined });
    expect(movementObjective(intents[0])).toEqual(movementObjective(raw));
  });

  it('distinguishes acquired stationary motion from unknown motion, age and objective flow', () => {
    for (const kind of ['known-stationary', 'unknown-motion', 'unknown-age', 'unknown-flow'] as const) {
      const a = actor(), peer = picture(a);
      let raw = request(a);
      if (kind === 'unknown-motion') peer.vel = { x: NaN, y: 0 };
      if (kind === 'unknown-age') delete peer.age;
      if (kind === 'unknown-flow') raw = withMovementObjective(raw, { kind: 'moving', point: goal });
      const ordinary = { ...raw, vel: { x: 4.5, y: 0 } };
      const forecast = vi.fn((command: Intent) => Preview.previewFreeMovement(a.body, command, 2, 12));
      const before = structuredClone({ body: a.body, peer });
      const chosen = localTrafficRoute(a, raw, ordinary, [peer], forecast, true, true);
      if (kind === 'known-stationary') expect(forecast).toHaveBeenCalled();
      else { expect(chosen).toBe(ordinary); expect(forecast).not.toHaveBeenCalled(); }
      expect(a.body).toEqual(before.body); expect(peer).toEqual(before.peer);
    }
  });

  it('leaves an occupied goal and unsupported or constrained action with its ordinary response', () => {
    for (const kind of ['occupied-goal', 'unsupported-role', 'constrained'] as const) {
      const a = actor(), peer = picture(a), raw = request(a);
      if (kind === 'occupied-goal') peer.pos = { ...goal };
      if (kind === 'unsupported-role') a.behavior = { kind: 'idle', update() { throw Error('No new role scope'); } };
      const ordinary = { ...raw, vel: { x: 4.5, y: 0 } };
      const forecast = vi.fn((command: Intent) => Preview.previewFreeMovement(a.body, command, 2, 12));
      expect(localTrafficRoute(a, raw, ordinary, [peer], forecast, kind !== 'constrained', true)).toBe(ordinary);
      expect(forecast).not.toHaveBeenCalled();
    }
  });

  it('retains a real impact when current momentum cannot avoid a close obstruction', () => {
    const a = actor(), body: Body = { pos: { x: a.pos.x + .7, y: CENTER_Y },
      vel: { x: 0, y: 0 }, facing: 0, energy: 1,
      profile: structuredClone(fixture.rows[0].peers[0].profile), support: newSupport(), spin: 0 };
    const peer = new Agent(1, 'D', 'FS', fixture.player, body.profile, body,
      { kind: 'zone', update() { throw Error('Known stationary obstruction'); } });
    const world = new World([a.body, body]); world.time = 2;
    const seen: Perceived = { pos: { ...body.pos }, vel: { x: 0, y: 0 }, age: .05, facing: 0, stance: null };
    const intents: Intent[] = [request(a), { vel: { x: 0, y: 0 }, free: true }];
    spaceTeammates([a, peer], intents, () => seen, { now: 2 });
    const report = world.step(intents, .05);
    expect(report.contacts.some(c => c.impulse > 0)).toBe(true);
    // Staying upright alone cannot qualify an impact as an absorbed glance:
    // this unavoidable collision needs recovery beyond the existing base.
    expect([a.body, body].some(b => !insideBalanceBase(b))).toBe(true);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
  });
  it('reconsiders acquired motion and retires its old detour when the owned goal changes', () => {
    const a = actor(), peer = picture(a), raw = request(a);
    const ordinary = { ...raw, vel: { x: 4.5, y: 0 } };
    const forecast = vi.fn((command: Intent) => Preview.previewFreeMovement(a.body, command, 2, 12));
    const initial = localTrafficRoute(a, raw, ordinary, [peer], forecast, true, true);
    expect(Math.abs(initial.vel.y)).toBeGreaterThan(0);
    expect(movementObjective(initial)).toEqual(movementObjective(raw));

    // This is newly acquired transverse motion, not an unseen future cut or
    // a route read from the teammate. The ordinary request now has room as
    // that picture moves; a retained maneuver must reconsider its command.
    const crossing = { ...peer, vel: { x: 0, y: 4 } };
    const before = structuredClone({ own: a.body, crossing });
    expect(localTrafficRoute(a, raw, raw, [crossing], forecast, true, false)).toBe(raw);
    expect(a.body).toEqual(before.own); expect(crossing).toEqual(before.crossing);

    // The original producer supplies a different legitimate owned goal. This
    // checks goal semantics only; execution of its turn remains with ordinary
    // spacing and World, rather than being certified by this route helper.
    const cut = withMovementObjective({ ...raw, vel: { x: 0, y: Math.hypot(raw.vel.x, raw.vel.y) } },
      { kind: 'moving', point: { x: a.pos.x, y: a.pos.y + 8 }, velocity: { x: 0, y: 0 } });
    const ordinaryCut = { ...cut, vel: { x: 0, y: 1 } };
    forecast.mockClear();
    expect(localTrafficRoute(a, cut, ordinaryCut, [peer], forecast, true, false)).toBe(ordinaryCut);
    expect(forecast).not.toHaveBeenCalled();
    // With starting disallowed, the old maneuver cannot silently reactivate
    // after yielding to the new goal. No fixed hold timer supplies continuity.
    expect(localTrafficRoute(a, raw, ordinary, [peer], forecast, true, false)).toBe(ordinary);
    expect(forecast).not.toHaveBeenCalled();
  });
  it('does not trade shallower predicted overlap for the harder first hit in the saved native encounter', () => {
    const saved = JSON.parse(readFileSync(new URL('./fixtures/traffic-route-impact.json', import.meta.url), 'utf8'));
    const body: Body = structuredClone(saved.body);
    const a = new Agent(saved.idx, 'D', 'LB_M', fixture.player, body.profile, body,
      { kind: 'zone', update() { throw Error('Replay only the already consumed goal'); } });
    const raw: Intent = withMovementObjective(structuredClone(saved.raw.request), structuredClone(saved.raw.goal));
    const ordinary: Intent = structuredClone(saved.ordinary);
    const peers: TrafficPeer[] = structuredClone(saved.peers);
    const before = structuredClone({ body, peers });
    const forecast = vi.fn((command: Intent) => Preview.previewFreeMovement(body, command, saved.t, 12));
    const selected = localTrafficRoute(a, raw, ordinary, peers, forecast, true, true);
    // The saved ordinary preview enters acquired peer13 at .2403s / .825yd/s.
    // Gather has less eventual overlap (-.227 vs -.493yd), but enters earlier
    // and harder (.1769s / 1.335yd/s). The other detours create a peer16 hit.
    // That lesser minimum overlap is not permission for the harder first hit.
    expect(forecast.mock.calls.some(([command]) => command.vel.x === 0 && command.vel.y === 0)).toBe(true);
    expect(selected).toBe(ordinary);
    expect(body).toEqual(before.body); expect(peers).toEqual(before.peers);
  });

  it('permits a shallower, lower-closing glancing forecast instead of banning every overlap', () => {
    const a = actor(), raw = request(a), peer = picture(a);
    peer.pos.x = a.pos.x + 2;
    const ordinary: Intent = { ...raw, vel: { x: 4, y: 0 } };
    // Controlled forecast streams isolate the consumer comparison, not World
    // contact physics. Both move4yd/s forward. The alternative adds an outward
    // lateral curve (4.5yd/s² for.2s, then .9yd/s); at first touch its outward
    // motion reduces normal closing below the ordinary4yd/s. It still overlaps
    // the disc and later leaves it. No body radius or contact law is changed.
    const forecast = (command: Intent) => Array.from({ length: 12 }, (_, k) => {
      const t = (k + 1) * .05;
      const bends = command !== ordinary && Math.abs(command.vel.y) > 0;
      const sign = Math.sign(command.vel.y);
      const lateral = t <= .2 ? .5 * 4.5 * t * t : .09 + .9 * (t - .2);
      return { t, pos: { x: a.pos.x + 4 * t, y: a.pos.y + (bends ? sign * lateral : 0) },
        vel: { x: 4, y: bends ? sign * Math.min(.9, 4.5 * t) : 0 }, support: 'up' as const };
    });
    const selected = localTrafficRoute(a, raw, ordinary, [peer], forecast, true, true);
    expect(selected).not.toBe(ordinary);
    expect(Math.abs(selected.vel.y)).toBeGreaterThan(0);
    const path = forecast(selected), end = path.at(-1)!;
    expect(path.some(sample => Math.hypot(sample.pos.x - peer.pos.x, sample.pos.y - peer.pos.y) < peer.touch)).toBe(true);
    expect(Math.hypot(end.pos.x - peer.pos.x, end.pos.y - peer.pos.y)).toBeGreaterThan(peer.touch);
    expect(movementObjective(selected)).toEqual(movementObjective(raw));
    expect({ ...selected, vel: undefined }).toEqual({ ...raw, vel: undefined });
  });
});

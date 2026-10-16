import { afterEach, describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { norm } from '../src/core/vec.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { RunBlocker, readCombination, type Combination } from '../src/sim/behaviors/blocking.js';
import type { Perceived } from '../src/sim/perception.js';
import { contactFixture } from '../scripts/diag/run-contact-technique.js';

afterEach(() => vi.restoreAllMocks());

/** Real ordinary-profile primary hands, a physically free uncovered player,
 * and explicit delayed body pictures. No World.step, forced hand win, or
 * native play is needed to test the production read/physical revalidation. */
function fixture(side = -1) {
  const f = contactFixture({ type: 'run', runBlock: 60, passBlock: 60, side: -side });
  f.sim.offCall.run = RUN_BY_ID.wz_strong;
  expect(f.sim.offAlign.strongSign).toBe(side);
  const helper = f.sim.slot('LG')!, backer = f.sim.slot('LB_W')!;
  const neighbor = f.sim.slot('DT_S')!, adjacent = f.sim.slot('RG')!;
  // The existing hands are within their actual working extension. They need
  // not be assigned an invented load to be eligible balanced contact.
  f.defender.body.pos = { x: 40.75, y: CENTER_Y - side * .2 };
  helper.body.pos = { x: 39.8, y: CENTER_Y - side * 1.6 };
  f.sim.slot('RB')!.body.pos = { x: 34, y: CENTER_Y };
  const drive = norm({ x: 1, y: side * 1.8 });
  const combo: Combination = { members: [f.blocker, helper], defender: f.defender, backer,
    released: false, secureSince: -1, nextRead: 0, soloKind: 'reach' };
  f.blocker.behavior = new RunBlocker({ kind: 'reach', target: f.defender, drive, combination: combo });
  helper.behavior = new RunBlocker({ kind: 'combo', target: f.defender, drive, combination: combo });
  f.engagement.nextMoveAt = Infinity;
  const pictures = new Map<number, Perceived>(f.sim.agents.map(a => [a.idx, {
    pos: { ...a.pos }, vel: { x: 0, y: 0 }, facing: a.facing,
    age: a.team === 'O' ? .05 : .25, pose: 'up', carrying: false, stance: null,
  }]));
  const down = pictures.get(f.defender.idx)!;
  down.vel.y = side * .8;
  const covered = pictures.get(f.blocker.idx)!;
  covered.facing = Math.atan2(down.pos.y-covered.pos.y, down.pos.x-covered.pos.x);
  const mike = pictures.get(backer.idx)!;
  mike.pos = { x: 45.5, y: CENTER_Y - side * 4 };
  const see = vi.spyOn(f.sim, 'see').mockImplementation((observer, target) => {
    if (observer !== helper) throw new Error('another player consumed the helper read');
    return structuredClone(pictures.get(target.idx)!);
  });
  const read = (observer = helper) => readCombination(observer, f.sim, combo);
  const ownLane = f.sim.offAlign.spots[helper.slot]!.pos.y;
  const nearbyThreat = (penetrating = false) => {
    const seen = pictures.get(neighbor.idx)!;
    seen.pos = { x: penetrating ? f.sim.los-.35 : f.sim.los+.8, y: ownLane };
    seen.vel = { x: penetrating ? -1 : 0, y: 0 };
    const body = pictures.get(adjacent.idx)!;
    body.pos = { x: seen.pos.x-.75, y: seen.pos.y };
    body.facing = 0;
    return { seen, body };
  };
  return { ...f, helper, backer, neighbor, adjacent, combo, side, down, covered, mike,
    pictures, see, read, nearbyThreat };
}

type Fixture = ReturnType<typeof fixture>;

function retained(f: Fixture) {
  expect(f.combo.released).toBe(false);
  expect((f.helper.behavior as RunBlocker).plan.kind).toBe('combo');
  expect((f.helper.behavior as RunBlocker).target).toBe(f.defender);
  expect(f.helper.engagement).toBeNull();
}

function departed(f: Fixture) {
  expect(f.combo.released).toBe(true);
  expect((f.helper.behavior as RunBlocker).plan.kind).toBe('climb');
  expect((f.helper.behavior as RunBlocker).target).toBe(f.backer);
  expect(f.helper.tags.has('combo-check-climb')).toBe(true);
  expect(f.engagement.blocker).toBe(f.blocker);
  expect(f.blocker.engagement).toBe(f.engagement);
}

function unchangedPhysicalRead(f: Fixture, action: () => void) {
  const bodies = f.sim.agents.map(a => structuredClone(a.body));
  const rng = JSON.stringify(f.sim.rng), hands = f.engagement.hands!;
  const jointList = [...f.sim.world.joints];
  const contact = { control: f.engagement.control, phi: f.engagement.phi,
    drive: structuredClone(f.engagement.drive), axis: structuredClone(f.engagement.surfaceAxis),
    hands: structuredClone({ extension: hands.extension, push: hands.push,
      hold: hands.hold, steer: hands.steer, normal: hands.normalForce, tangent: hands.tangentForce }) };
  action();
  expect(f.sim.agents.map(a => a.body)).toEqual(bodies);
  expect(JSON.stringify(f.sim.rng)).toBe(rng);
  expect(f.engagement.hands).toBe(hands);
  expect(f.sim.world.joints).toHaveLength(jointList.length);
  jointList.forEach((joint, index) => expect(f.sim.world.joints[index]).toBe(joint));
  expect({ control: f.engagement.control, phi: f.engagement.phi,
    drive: f.engagement.drive, axis: f.engagement.surfaceAxis,
    hands: { extension: hands.extension, push: hands.push, hold: hands.hold, steer: hands.steer,
      normal: hands.normalForce, tangent: hands.tangentForce } }).toEqual(contact);
}

describe('an acquired away-flow surface preserves the uncovered stretch backer duty', () => {
  it.each([-1, 1])('recognizes a clear installed climb before a stationary backer arrives, side %s', side => {
    const f = fixture(side);
    expect(Math.hypot(f.mike.pos.x-f.helper.pos.x, f.mike.pos.y-f.helper.pos.y)).toBeGreaterThan(4.2);
    expect(f.mike.vel).toEqual({ x: 0, y: 0 });
    unchangedPhysicalRead(f, () => f.read());
    departed(f);
  });

  it.each(['stationary', 'inward'] as const)('retains first-level work for an observed %s DL', motion => {
    const f = fixture();
    f.down.vel.y = motion === 'stationary' ? 0 : -f.side;
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
  });

  it.each(['DL velocity', 'keeper velocity', 'backer velocity', 'DL pose', 'keeper pose', 'age'] as const)(
    'holds this permission for unknown %s rather than using private or stationary state', unknown => {
      const f = fixture();
      if (unknown === 'DL velocity') f.down.vel.y = NaN;
      if (unknown === 'keeper velocity') f.covered.vel.x = NaN;
      if (unknown === 'backer velocity') f.mike.vel.y = NaN;
      if (unknown === 'DL pose') f.down.pose = null;
      if (unknown === 'keeper pose') f.covered.pose = null;
      if (unknown === 'age') f.down.age = undefined;
      unchangedPhysicalRead(f, () => f.read());
      retained(f);
    });

  it('retains a penetrating original DL despite its away velocity and a square keeper picture', () => {
    const f = fixture();
    f.down.pos.x = f.sim.los-.35;
    f.covered.pos.x = f.down.pos.x-.75;
    f.covered.facing = Math.atan2(f.down.pos.y-f.covered.pos.y, f.down.pos.x-f.covered.pos.x);
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
  });

  it.each(['unaccounted', 'penetrating', 'accounted'] as const)(
    'reads an %s neighboring near-lane threat from visible body relationships', kind => {
      const f = fixture(), { body } = f.nearbyThreat(kind === 'penetrating');
      if (kind !== 'accounted') body.facing = Math.PI;
      unchangedPhysicalRead(f, () => f.read());
      if (kind === 'accounted') departed(f);
      else retained(f);
    });

  it('retains a genuine obstruction between the helper and the first backer strike', () => {
    const f = fixture();
    f.mike.pos = { x: 42.5, y: CENTER_Y + f.side * 3 };
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
  });

  it('cannot replace unavailable keeper hands with a convincing stale visual fit', () => {
    const f = fixture();
    f.sim.world.joints = f.sim.world.joints.filter(j => j !== f.engagement.hands);
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
  });

  it('does not detach an actually unsupported keeper despite an upright acquired picture', () => {
    const f = fixture();
    f.blocker.body.support!.state = 'falling';
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
  });

  it('keeps a physically constrained helper under its existing responsibility', () => {
    const f = fixture();
    f.sim.world.joints.push({ kind: 'hands', a: f.helper.body, b: f.adjacent.body,
      extension: 1, push: 0, hold: 0, steer: 0 });
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
    expect(f.see).not.toHaveBeenCalled();
  });
});

describe('the original helper owns its acquired read, not another player\'s private live state', () => {
  it('keeps the decision when hidden current defender velocity and a neighboring engagement flag diverge', () => {
    const a = fixture(), b = fixture();
    b.defender.body.vel = { x: -12, y: 12 };
    b.neighbor.engagement = b.engagement;
    unchangedPhysicalRead(a, () => a.read());
    unchangedPhysicalRead(b, () => b.read());
    departed(a); departed(b);
    expect(b.see.mock.calls.map(([, target]) => target.slot)).toEqual(a.see.mock.calls.map(([, target]) => target.slot));
  });

  it('never reads private current defender motion or neighboring engagement to certify the visible surface', () => {
    const f = fixture();
    const velocity = Object.getOwnPropertyDescriptor(f.defender.body, 'vel')!;
    const engagement = Object.getOwnPropertyDescriptor(f.neighbor, 'engagement')!;
    try {
      Object.defineProperty(f.defender.body, 'vel', { configurable: true, get() { throw new Error('private current velocity'); } });
      Object.defineProperty(f.neighbor, 'engagement', { configurable: true, get() { throw new Error('private neighboring engagement'); } });
      f.read();
    } finally {
      Object.defineProperty(f.defender.body, 'vel', velocity);
      Object.defineProperty(f.neighbor, 'engagement', engagement);
    }
    departed(f);
  });

  it('waits for its ordinary read even when the cue changes and the primary reads first', () => {
    const f = fixture();
    f.down.vel.y = -f.side;
    f.read(); retained(f);
    const next = f.combo.checkNextRead!, count = f.see.mock.calls.length;
    f.down.vel.y = f.side;
    f.sim.t = (f.sim.t+next)/2;
    f.read(f.blocker); f.read();
    retained(f);
    expect(f.combo.checkNextRead).toBe(next);
    expect(f.see).toHaveBeenCalledTimes(count);
    f.sim.t = next;
    f.read(f.blocker);
    expect(f.combo.checkNextRead).toBe(next);
    f.read(); departed(f);
  });

  it('does not let the original primary propose this unjoined helper departure', () => {
    const f = fixture();
    unchangedPhysicalRead(f, () => f.read(f.blocker));
    retained(f);
    expect(f.combo.checkNextRead).toBeUndefined();
    expect(f.see).not.toHaveBeenCalled();
    f.read(); departed(f);
  });

  it.each(['iz_strong', 'duo'])('leaves the existing %s unjoined schedule untouched', concept => {
    const f = fixture();
    f.sim.offCall.run = RUN_BY_ID[concept];
    expect(f.sim.offCall.run).toBeDefined();
    unchangedPhysicalRead(f, () => f.read());
    retained(f);
    expect(f.combo.checkNextRead).toBeUndefined();
    expect(f.see).not.toHaveBeenCalled();
  });
});

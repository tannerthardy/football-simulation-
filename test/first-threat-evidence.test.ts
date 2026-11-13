import { afterEach, describe, expect, it, vi } from 'vitest';
import { firstThreatScene, unseenContact } from './support/first-threat-scene.js';

afterEach(() => vi.restoreAllMocks());

describe('first-threat eligibility belongs to the acquired picture', () => {
  it.each(['lead', 'climb'] as const)('%s ignores a hidden fall through the real update hook', kind => {
    const up = firstThreatScene(kind), hidden = firstThreatScene(kind);
    hidden.threat.body.support!.state = 'down';
    expect(hidden.sim.see(hidden.actor, hidden.threat)).toEqual(up.sim.see(up.actor, up.threat));
    const expected = up.command(), actual = hidden.command();
    expect(up.controller.target).toBe(up.threat);
    expect(hidden.controller.target).toBe(hidden.threat);
    expect(actual).toEqual(expected);
    expect(hidden.sim.events.filter(e => e.type === 'block_threat')).toEqual(up.sim.events.filter(e => e.type === 'block_threat'));
    if (kind === 'climb') expect(hidden.controller.plan.kind).toBe('drive');
    // The acquired responsibility survives its ordinary technique change and
    // another non-reading tick, rather than only winning the selection event.
    up.sim.t += .05; hidden.sim.t += .05;
    expect(hidden.command()).toEqual(up.command());
    expect(hidden.controller.target).toBe(hidden.threat);
  });

  it.each(['lead', 'climb'] as const)('%s ignores hidden third-party hands through the real update hook', kind => {
    const free = firstThreatScene(kind), held = firstThreatScene(kind);
    unseenContact(free, false); unseenContact(held, true);
    expect(held.sim.see(held.actor, held.threat)).toEqual(free.sim.see(free.actor, free.threat));
    expect(held.sim.see(held.actor, held.mate)).toEqual(free.sim.see(free.actor, free.mate));
    const expected = free.command(), actual = held.command();
    expect(free.controller.target).toBe(free.threat);
    expect(held.controller.target).toBe(held.threat);
    expect(actual).toEqual(expected);
    expect(held.actor.engagement).toBeNull();
    expect(held.sim.rng).toEqual(free.sim.rng);
  });

  it.each(['down', 'rising'] as const)('declines an acquired %s candidate even if he is secretly up now', pose => {
    const f = firstThreatScene();
    f.threat.body.support!.state = pose; f.acquire();
    f.threat.body.support!.state = 'up';
    expect(f.sim.see(f.actor, f.threat).pose).toBe(pose);
    f.command();
    expect(f.controller.target).toBe(f.original);
    expect(f.sim.events.some(e => e.type === 'block_threat')).toBe(false);
  });

  it('treats unavailable pose as unknown, not an authoritative down or engagement cue', () => {
    const f = firstThreatScene();
    const states = f.sim.agents.map(a => ({ pos: a.pos, vel: a.vel, facing: a.facing,
      stance: a.stance, pose: a === f.threat ? null : a.pose }));
    for (let i = 0; i < 24; i++) f.sim.perception.record(states, f.rb.idx);
    f.threat.body.support!.state = 'down';
    expect(f.sim.see(f.actor, f.threat).pose).toBeNull();
    f.command();
    expect(f.controller.target).toBe(f.threat);
  });

  it('responds to an acquired recovery on the existing threat-read beat', () => {
    const f = firstThreatScene(), start = f.sim.t, interval = f.actor.mind.decisionInterval;
    f.threat.body.support!.state = 'down'; f.acquire(); f.command();
    expect(f.controller.target).toBe(f.original);
    f.threat.body.support!.state = 'up'; f.acquire();
    f.sim.t = start + interval * .5;
    f.command();
    expect(f.controller.target).toBe(f.original);
    f.sim.t = start + interval;
    f.command();
    expect(f.controller.target).toBe(f.threat);
  });

  it.each(['fall', 'contact'] as const)('keeps hidden %s out of ordinary acquired-work replacement too', state => {
    const free = firstThreatScene(), hidden = firstThreatScene();
    for (const f of [free, hidden]) {
      f.command(); expect(f.controller.target).toBe(f.threat);
      f.threat.body.support!.state = 'down';
      f.sim.slot('LB_W')!.body.pos = { x: 42.8, y: f.rb.pos.y + 1 };
      // No acquired holder: the first-threat selector keeps its installed
      // contract. Only availableTarget/findWork can perform this replacement.
      for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
      f.threat.body.support!.state = 'up';
      f.sim.t += f.actor.mind.decisionInterval + .01;
    }
    const freeWill = free.sim.slot('LB_W')!, hiddenWill = hidden.sim.slot('LB_W')!;
    if (state === 'fall') hiddenWill.body.support!.state = 'down';
    else { unseenContact(free, false, freeWill); unseenContact(hidden, true, hiddenWill); }
    const expected = free.command(), actual = hidden.command();
    expect(free.controller.target).toBe(freeWill);
    expect(hidden.controller.target).toBe(hiddenWill);
    expect(actual).toEqual(expected);
    expect(hidden.sim.events.filter(e => e.type === 'block_threat')).toHaveLength(1);
  });

  it('retains a teammate\'s nearer responsibility without inventing an engagement', () => {
    const f = firstThreatScene();
    f.mate.body.pos = { x: f.threat.pos.x - .4, y: f.threat.pos.y + .1 }; f.acquire();
    f.command();
    expect(f.controller.target).toBe(f.original);
    expect(f.sim.world.joints).toHaveLength(0);
    expect(f.threat.engagement).toBeNull();
  });

  it('does not call nearby bodies a block when the lead has the nearer approach', () => {
    const f = firstThreatScene();
    f.actor.body.pos = { x: f.threat.pos.x - .8, y: f.threat.pos.y };
    f.mate.body.pos = { x: f.threat.pos.x + 1.1, y: f.threat.pos.y }; f.acquire();
    f.command();
    expect(f.controller.target).toBe(f.threat);
    expect(f.sim.events.some(e => e.type === 'block_threat')).toBe(true);
  });

  it('does not abandon the original job for a defender behind a cutback runner', () => {
    const f = firstThreatScene();
    f.threat.body.pos.x = f.rb.pos.x - 1.5; f.acquire();
    f.command();
    expect(f.controller.target).toBe(f.original);
    expect(f.sim.events.some(e => e.type === 'block_threat')).toBe(false);
  });

  it('preserves the blocker\'s own acquired physical contact', () => {
    const f = firstThreatScene();
    f.controller.plan.target = f.threat;
    f.actor.body.pos = { x: f.threat.pos.x - .65, y: f.threat.pos.y };
    const e = f.sim.engage(f.actor, f.threat, 'run', f.controller.plan.drive);
    expect(e).not.toBeNull();
    const hands = [...f.sim.world.joints], rng = structuredClone(f.sim.rng);
    expect(f.command().vel).toEqual({ x: 0, y: 0 });
    expect(f.actor.engagement).toBe(e);
    expect(f.sim.world.joints).toEqual(hands);
    expect(f.sim.rng).toEqual(rng);
    expect(f.sim.events.some(e => e.type === 'block_threat')).toBe(false);
  });

  it('retains acquired eligibility through an empty replacement and the next work read', () => {
    const f = firstThreatScene('climb');
    f.command(); expect(f.controller.target).toBe(f.threat);
    f.threat.body.support!.state = 'down';
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
    f.threat.body.support!.state = 'up';
    f.sim.t += f.actor.mind.decisionInterval + .01;
    f.command(); expect(f.controller.target).toBeNull();
    const will = f.sim.slot('LB_W')!;
    will.body.pos = { x: 42.8, y: f.rb.pos.y + 1 };
    f.threat.body.support!.state = 'down';
    for (let i = 0; i < 24; i++) f.sim.perception.record(f.sim.agents);
    f.threat.body.support!.state = 'up'; will.body.support!.state = 'down';
    f.sim.t += f.actor.mind.decisionInterval + .01;
    f.command(); expect(f.controller.target).toBe(will);
  });

  it('retires acquired eligibility when another installed responsibility replaces it', () => {
    const f = firstThreatScene('climb'); f.command();
    expect(Reflect.get(f.controller, 'acquiredWork').target).toBe(f.threat);
    f.controller.plan.kind = 'down';
    f.controller.plan.target = f.original;
    f.sim.t += .01; f.command();
    expect(Reflect.get(f.controller, 'acquiredWork')).toBeNull();
    expect(f.controller.target).toBe(f.original);
  });

  it.each([1, -1])('consumes the selected request in one ordinary 22-player tick, side %s', side => {
    const f = firstThreatScene('lead', side);
    f.threat.body.support!.state = 'down'; // its fall is not acquired yet
    const trace = f.sim.recordCommands({ actor: { team: 'O', slot: f.actor.slot }, from: f.sim.t, to: f.sim.t + .05 });
    const step = vi.spyOn(f.sim.world, 'step');
    f.sim.tick();
    const frame = trace.steps[0];
    expect(frame.decision!.ownerAfterUpdate.target!.index).toBe(f.threat.idx);
    expect(frame.final!.vel).toEqual(step.mock.calls[0][0][f.actor.idx]!.vel);
    expect(frame.endpointTime).toBeGreaterThan(frame.stepStart);
    const start = frame.start.body.position, end = frame.endpoint!.body.position;
    const v = frame.final!.vel;
    expect((end.x - start.x) * v.x + (end.y - start.y) * v.y).toBeGreaterThan(0);
  });
});

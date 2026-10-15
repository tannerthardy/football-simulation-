import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Intent } from '../src/physics/world.js';
import type { Agent, Engagement } from '../src/sim/agent.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { spaceTeammates } from '../src/sim/spacing.js';
import { installTeammateExpectations } from '../src/sim/teammate-calls.js';
import { TEAMMATE_INFORMATION_LIMITS as LIMITS, TeammateInformation,
  type TeammatePicture } from '../src/sim/teammate-information.js';

function stage(run = false, record = false) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(11), 'O', 'OFF'), '11'),
    defense: pickDefense(generateTeam(new Rng(12), 'D', 'DEF'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false,
      kind: run ? 'run' : 'pass', run: run ? RUN_BY_ID.oz_strong : undefined,
      pass: run ? undefined : PASS_BY_ID.smash, label: 'teammate information' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover1, pressure: null, label: 'teammate information' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 77,
    record, recordLevel: record ? 'full' : 'light',
  });
  const a = sim.slot('RB')!, b = sim.slot('LG')!;
  a.body.pos = { x: 50, y: CENTER_Y };
  a.body.vel = { x: 9, y: 0 };
  a.body.facing = 0;
  b.body.pos = { x: 55, y: CENTER_Y };
  b.body.vel = { x: 0, y: 0 };
  return { sim, a, b };
}

type Stage = ReturnType<typeof stage>;

/** Advance actual physical snapshots, rather than holding a stale buffer. */
function sample(s: Stage, now: number, awareness = s.sim.teammateAwareness) {
  s.sim.t = now;
  s.sim.perception.record(s.sim.agents, s.sim.carrier?.idx ?? null);
  awareness.sense(s.sim.agents, now, s.sim.dt);
  return awareness.query(s.a.idx, s.b.idx, now, s.sim.dt);
}

function available(picture: TeammatePicture) {
  expect(picture.source).not.toBe('unavailable');
  if (picture.source === 'unavailable') throw new Error('Expected acquired or installed information');
  return picture;
}

function deliverInitial(s: Stage) {
  for (let tick = 0; tick <= 12; tick++) sample(s, tick * s.sim.dt);
  return available(s.sim.teammateInformation(s.a, s.b));
}

function spaced(s: Stage, velocity = { x: 9, y: 0 }) {
  const intents: Intent[] = [{ vel: { ...velocity } }, { vel: { x: 0, y: 0 } }];
  spaceTeammates([s.a, s.b], intents, (observer, target) => {
    const picture = s.sim.teammateInformation(observer, target);
    return picture.source === 'unavailable' ? null : picture;
  }, { now: s.sim.t });
  return intents[0];
}

function privateEngagement(blocker: Agent, defender: Agent): Engagement {
  return {
    blocker, defender, helpers: [], start: .2, type: 'run',
    win: 0, control: 0, phi: 0, side: 1, baseB: 1, baseD: 1,
    move: 'bull', moveUntil: .5, moveOk: false, nextMoveAt: .5, pushBoost: 0,
    drive: { x: 1, y: 0 }, sealTarget: 0, repEdge: 0, holding: false,
  };
}

describe('observer-owned teammate information', () => {
  it('keeps hidden motion invariant while both reality histories keep advancing', () => {
    const left = stage(), right = stage();
    expect(deliverInitial(left)).toEqual(deliverInitial(right));
    for (let tick = 13; tick <= 29; tick++) {
      // Neither trajectory presents an acquisition opportunity to this observer.
      left.b.body.pos = { x: 44 - tick * .02, y: CENTER_Y - .1 };
      left.b.body.vel = { x: -7, y: -2 };
      right.b.body.pos = { x: 47 + tick * .01, y: CENTER_Y + .1 };
      right.b.body.vel = { x: 3, y: 4 };
      const now = tick * left.sim.dt;
      expect(sample(left, now)).toEqual(sample(right, now));
      // The underlying reality really differs; neither test freezes the buffer.
      expect(left.sim.perception.perceive(left.b.idx, 0).pos)
        .not.toEqual(right.sim.perception.perceive(right.b.idx, 0).pos);
    }
    expect(left.sim.teammateInformation(left.a, left.b).source).toBe('remembered');
  });

  it('delivers changed visible motion after acquisition latency, including a fresh reacquisition', () => {
    const near = stage(), farther = stage();
    const previous = deliverInitial(near);
    deliverInitial(farther);
    near.b.body.pos = { x: 55, y: CENTER_Y };
    farther.b.body.pos = { x: 58, y: CENTER_Y };
    const firstNear = sample(near, .65), firstFarther = sample(farther, .65);
    expect(firstNear).toEqual(firstFarther);
    expect(available(firstNear).sampledAt).toBeLessThan(.65);
    for (let tick = 14; tick <= 25; tick++) {
      sample(near, tick * near.sim.dt);
      sample(farther, tick * farther.sim.dt);
    }
    const a = available(near.sim.teammateInformation(near.a, near.b));
    const b = available(farther.sim.teammateInformation(farther.a, farther.b));
    expect(a.source).toBe('observed'); expect(b.source).toBe('observed');
    expect(a.sampledAt).toBeGreaterThan(previous.sampledAt);
    expect(a.pos.x).toBe(55); expect(b.pos.x).toBe(58);

    // A later look acquires new evidence; memory cannot permanently freeze him.
    near.a.body.facing = Math.PI;
    near.b.body.pos = { x: 46, y: CENTER_Y };
    for (let tick = 26; tick <= 37; tick++) sample(near, tick * near.sim.dt);
    const fresh = available(near.sim.teammateInformation(near.a, near.b));
    expect(fresh.source).toBe('observed'); expect(fresh.pos.x).toBe(46);
  });

  it('bounds prediction from the last legitimate sighting, then expires memory', () => {
    const s = stage(), awareness = new TeammateInformation(s.sim.agents, new Map());
    s.b.body.vel = { x: 2, y: 1 };
    expect(sample(s, 0, awareness)).toEqual({ source: 'unavailable' });
    s.b.body.pos = { x: 45, y: CENTER_Y }; // Behind from now on.
    s.b.body.vel = { x: -9, y: 4 };
    let remembered: TeammatePicture = { source: 'unavailable' };
    for (let tick = 1; tick <= 15; tick++) remembered = sample(s, tick * s.sim.dt, awareness);
    const last = available(remembered);
    expect(last.source).toBe('remembered'); expect(last.sampledAt).toBe(0);
    expect(last.predictedFor).toBe(LIMITS.prediction);
    expect(last.pos).toEqual({ x: 55 + 2 * LIMITS.prediction, y: CENTER_Y + LIMITS.prediction });
    expect(last.vel).toEqual({ x: 0, y: 0 });
    expect(sample(s, LIMITS.memory + s.sim.dt, awareness)).toEqual({ source: 'unavailable' });
  });

  it('preserves installed coordination without live value or availability oracles', () => {
    const s = stage(true), original = s.b.behavior;
    expect(original).toBeInstanceOf(RunBlocker);
    const getter = vi.spyOn(original as RunBlocker, 'calledMotion')
      .mockImplementation(() => { throw new Error('Must not poll private live execution'); });
    try {
      const calls = installTeammateExpectations(s.sim);
      expect(calls.get(s.b.idx)?.velocity.y).not.toBe(0);
      const awareness = new TeammateInformation(s.sim.agents, calls);
      const before = available(awareness.query(s.a.idx, s.b.idx, .2, s.sim.dt));
      expect(before.source).toBe('called');
      expect(calls.get(s.b.idx)!.origin).toEqual(s.sim.offAlign.spots.LG.pos);
      s.b.body.pos = { x: 10, y: 1 }; s.b.body.vel = { x: -9, y: 6 };
      s.b.engagement = privateEngagement(s.b, s.sim.slot('DT_S')!);
      expect(installTeammateExpectations(s.sim)).toEqual(calls);
      (original as RunBlocker).plan.kind = 'climb';
      s.b.behavior = { kind: 'hidden-live-reassignment',
        calledMotion: () => ({ x: 100, y: -100 }), update: () => ({ vel: { x: 0, y: 0 } }) };
      // Even mutating the supplied installation cannot change observer memory.
      calls.get(s.b.idx)!.origin.x = 999;
      calls.get(s.b.idx)!.velocity.y = 999;
      calls.get(s.b.idx)!.until = 999;
      expect(awareness.query(s.a.idx, s.b.idx, .2, s.sim.dt)).toEqual(before);
      expect(awareness.query(s.a.idx, s.b.idx, LIMITS.zoneExpectation + s.sim.dt, s.sim.dt))
        .toEqual({ source: 'unavailable' });
      expect(getter).not.toHaveBeenCalled();
    } finally { getter.mockRestore(); }
  });

  it('supplies the installed mesh expectation independently of the back’s hidden path or new job', () => {
    const s = stage(true), observer = s.sim.slot('RT')!;
    const before = available(s.sim.teammateAwareness.query(observer.idx, s.a.idx, .4, s.sim.dt));
    expect(before.source).toBe('called');
    expect(before.label).toBe('installed approximate mesh arrival');
    s.a.body.pos = { x: 90, y: 0 }; s.a.body.vel = { x: 9, y: -9 };
    s.a.behavior = { kind: 'carrier', calledMotion: () => null,
      update: () => ({ vel: { x: 0, y: 0 } }) };
    expect(s.sim.teammateAwareness.query(observer.idx, s.a.idx, .4, s.sim.dt)).toEqual(before);
    expect(s.sim.teammateAwareness.query(observer.idx, s.a.idx, RUN_BY_ID.oz_strong.meshTime + .1, s.sim.dt))
      .toEqual({ source: 'unavailable' });
  });

  it('uses bounded installed alignment on both teams without copying hidden motion or defensive scatter', () => {
    const s = stage();
    for (const [observerSlot, targetSlot] of [['RT', 'Y'], ['FS', 'CB_S']] as const) {
      const observer = s.sim.slot(observerSlot)!, target = s.sim.slot(targetSlot)!;
      const nominal = target.team === 'O' ? s.sim.offAlign.spots.Y.pos : s.sim.defAlign.spots.CB_S!.pos;
      const before = available(s.sim.teammateAwareness.query(observer.idx, target.idx, .2, s.sim.dt));
      expect(before.source).toBe('called'); expect(before.label).toBe('installed alignment landmark');
      expect(before.pos).toEqual(nominal); expect(before.vel).toEqual({ x: 0, y: 0 });
      const calls = installTeammateExpectations(s.sim);
      const awareness = new TeammateInformation(s.sim.agents, calls);
      target.body.pos = { x: nominal.x + 7, y: nominal.y - 5 };
      target.body.vel = { x: -8, y: 4 };
      target.engagement = privateEngagement(target, s.sim.opponents(target)[0]);
      target.behavior = { kind: 'hidden-private-reassignment',
        calledMotion: () => { throw new Error('Alignment must not poll live behavior'); },
        update: () => ({ vel: { x: 0, y: 0 } }) };
      // Reinstalling the same nominal call cannot import live scatter/engagement.
      expect(installTeammateExpectations(s.sim)).toEqual(calls);
      expect(s.sim.teammateAwareness.query(observer.idx, target.idx, .2, s.sim.dt)).toEqual(before);
      // The already-installed observer copy does not share mutable map inputs.
      calls.get(target.idx)!.origin.x = 999;
      calls.get(target.idx)!.velocity.y = 999;
      calls.get(target.idx)!.until = 999;
      expect(awareness.query(observer.idx, target.idx, .2, s.sim.dt)).toEqual(before);
      expect(s.sim.teammateAwareness.query(observer.idx, target.idx, .2, s.sim.dt)).toEqual(before);
      expect(s.sim.teammateAwareness.query(observer.idx, target.idx, LIMITS.alignmentExpectation + s.sim.dt, s.sim.dt))
        .toEqual({ source: 'unavailable' });
    }
  });

  it('never falls back to truth when there is no acquired, remembered or installed information', () => {
    const s = stage(), awareness = new TeammateInformation(s.sim.agents, new Map());
    s.b.body.pos = { x: 49, y: CENTER_Y };
    for (let tick = 0; tick <= 24; tick++) {
      s.b.body.vel = { x: tick % 2 ? -8 : 7, y: tick % 2 ? 3 : -2 };
      expect(sample(s, tick * s.sim.dt, awareness)).toEqual({ source: 'unavailable' });
    }
    // The production installation has also expired without any acquired look.
    expect(s.sim.teammateInformation(s.a, s.b)).toEqual({ source: 'unavailable' });
    expect(s.sim.teammateInformation(s.a, s.a)).toEqual({ source: 'unavailable' });
    expect(s.sim.teammateInformation(s.a, s.sim.slot('DT_S')!)).toEqual({ source: 'unavailable' });
    expect(s.sim.teammateAwareness.query(-1, s.b.idx, s.sim.t, s.sim.dt)).toEqual({ source: 'unavailable' });
  });

  it('lets a limited resolved-touch cue oppose unavailability without exposing remote target velocity', () => {
    const s = stage(), awareness = new TeammateInformation(s.sim.agents, new Map());
    s.b.body.pos = { x: 45, y: CENTER_Y }; sample(s, .4, awareness);
    expect(awareness.query(s.a.idx, s.b.idx, .4, s.sim.dt)).toEqual({ source: 'unavailable' });
    const local = { x: 49.4, y: CENTER_Y }, ownVelocity = { x: 1, y: 0 };
    awareness.touched(s.a.idx, s.b.idx, local, ownVelocity, .4);
    const touched = available(awareness.query(s.a.idx, s.b.idx, .4, s.sim.dt));
    expect(touched.source).toBe('tactile'); expect(touched.pos).toEqual(local);
    expect(touched.vel).toEqual(ownVelocity);
    s.b.body.pos = { x: 44, y: CENTER_Y }; s.b.body.vel = { x: -10, y: 5 };
    local.x = 999; ownVelocity.x = 999;
    expect(awareness.query(s.a.idx, s.b.idx, .4, s.sim.dt)).toEqual(touched);
    expect(sample(s, .4 + LIMITS.tactile + s.sim.dt, awareness)).toEqual({ source: 'unavailable' });
  });

  it('cannot acquire extra sightings or consume randomness through duplicate sensing or repeated queries', () => {
    const plain = stage(), extra = stage(false, true);
    const rngBefore = JSON.stringify([extra.sim.rng, ...extra.sim.agents.map(a => a.mind)]);
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      for (let tick = 0; tick <= 16; tick++) {
        const now = tick * plain.sim.dt;
        const expected = sample(plain, now);
        expect(sample(extra, now)).toEqual(expected);
        // Temporarily visible different truth at the same sensing boundary.
        const physical = { pos: { ...extra.b.pos }, vel: { ...extra.b.vel } };
        extra.b.body.pos = { x: 57, y: CENTER_Y + 1 };
        extra.b.body.vel = { x: 2, y: 3 };
        extra.sim.teammateAwareness.sense(extra.sim.agents, now, extra.sim.dt);
        for (let query = 0; query < 12; query++) {
          const picture = extra.sim.teammateInformation(extra.a, extra.b);
          expect(picture).toEqual(expected);
          if (picture.source !== 'unavailable') { picture.pos.x = 999; picture.vel.y = 999; }
        }
        extra.b.body.pos = physical.pos; extra.b.body.vel = physical.vel;
        expect(extra.sim.teammateInformation(extra.a, extra.b)).toEqual(expected);
      }
      expect(draws).not.toHaveBeenCalled();
      expect(JSON.stringify([extra.sim.rng, ...extra.sim.agents.map(a => a.mind)])).toBe(rngBefore);
    } finally { draws.mockRestore(); }
  });

  it('keeps actual spacing requests invariant to diverging hidden motion after a legitimate sighting', () => {
    const left = stage(), right = stage();
    deliverInitial(left); deliverInitial(right);
    expect(spaced(left).vel.x).toBeLessThan(9); // The acquired peer actually shapes this request.
    for (let tick = 13; tick <= 25; tick++) {
      left.b.body.pos = { x: 44 - tick * .02, y: CENTER_Y - .1 };
      left.b.body.vel = { x: -7, y: -2 };
      right.b.body.pos = { x: 47 + tick * .01, y: CENTER_Y + .1 };
      right.b.body.vel = { x: 3, y: 4 };
      sample(left, tick * left.sim.dt); sample(right, tick * right.sim.dt);
      expect(spaced(left)).toEqual(spaced(right));
      expect(spaced(left).vel.x).toBeLessThan(9);
    }
  });

  it('changes actual spacing after new visible evidence rather than immediately from a new true position', () => {
    const near = stage(), farther = stage();
    deliverInitial(near); deliverInitial(farther);
    near.b.body.pos = { x: 55, y: CENTER_Y };
    farther.b.body.pos = { x: 60, y: CENTER_Y };
    sample(near, .65); sample(farther, .65);
    expect(spaced(near)).toEqual(spaced(farther));
    for (let tick = 14; tick <= 25; tick++) {
      sample(near, tick * near.sim.dt); sample(farther, tick * farther.sim.dt);
    }
    expect(spaced(near).vel.x).toBeLessThan(spaced(farther).vel.x);
    expect(spaced(near).vel.x).toBeLessThan(9);
  });

  it('does not substitute truth in spacing when information is unavailable, while a touch cue can shape it', () => {
    const s = stage();
    s.a.body.vel = { x: 0, y: 0 };
    s.b.body.pos = { x: 49.4, y: CENTER_Y };
    sample(s, LIMITS.alignmentExpectation + s.sim.dt);
    const request = { x: -9, y: 0 };
    expect(spaced(s, request).vel).toEqual(request);
    const noObserver: Intent[] = [{ vel: { ...request } }, { vel: { x: 0, y: 0 } }];
    spaceTeammates([s.a, s.b], noObserver);
    expect(noObserver[0].vel).toEqual(request);
    s.sim.teammateAwareness.touched(s.a.idx, s.b.idx, { x: 49.4, y: CENTER_Y }, s.a.vel, s.sim.t);
    expect(spaced(s, request).vel.x).toBeGreaterThan(-9);
  });
});

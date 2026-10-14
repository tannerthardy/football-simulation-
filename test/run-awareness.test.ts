import { describe, expect, it, vi } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { angleDiff, type Vec2 } from '../src/core/vec.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { newSupport } from '../src/physics/support.js';
import type { Intent } from '../src/physics/world.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent, Engagement } from '../src/sim/agent.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import { PlaySim } from '../src/sim/playsim.js';
import { RUN_ATTENTION_LIMITS as LIMITS, type RunAwarenessMode } from '../src/sim/run-awareness.js';
import { spaceTeammates } from '../src/sim/spacing.js';
import type { TeammatePicture } from '../src/sim/teammate-information.js';

function make(mode: RunAwarenessMode = 'glance', concept = 'wz_strong',
  kind: 'run' | 'pass' = 'run', coverage = 'cover3') {
  const formation = FORMATION_BY_ID.ace_12;
  return new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'O', { strength: .55 }), formation.personnel),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D', { strength: .55 }), 'base43'),
    offCall: { formation, flip: true, kind, run: kind === 'run' ? RUN_BY_ID[concept] : undefined,
      pass: kind === 'pass' ? PASS_BY_ID.four_verts : undefined, label: kind === 'run' ? concept : 'four_verts' },
    defCall: { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage],
      pressure: null, label: 'run attention control' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3, runAwareness: mode,
  });
}

/** Only own contact is supplied: this fixture does not claim a physical hold
 * acquisition or run World. The installed opponent key must match the hold. */
function ownContact(blocker: Agent, defender: Agent): Engagement {
  return { blocker, defender, helpers: [], start: 0, type: 'run', win: 0, control: 0,
    phi: 0, side: 1, baseB: 1, baseD: 1, move: 'bull', moveUntil: .5,
    moveOk: false, nextMoveAt: .5, pushBoost: 0, drive: { x: 1, y: 0 },
    sealTarget: 0, repEdge: 0, holding: false };
}

function stage(mode: RunAwarenessMode = 'glance') {
  const sim = make(mode), observer = sim.slot('RT')!, runner = sim.slot('RB')!;
  const installed = sim.runAwareness.installed(observer);
  if (installed?.team !== 'O' || !installed.lane) throw new Error('Missing installed offensive lane');
  const recorded = sim.runAwareness.recorded(observer);
  if (!recorded) throw new Error('RT must acquire its installed key before snap');
  const key = sim.agents[recorded.key], lane = installed.lane;
  const length = Math.hypot(lane.press.x - lane.mesh.x, lane.press.y - lane.mesh.y);
  const u = { x: (lane.press.x - lane.mesh.x) / length, y: (lane.press.y - lane.mesh.y) / length };
  const n = { x: -u.y, y: u.x };
  const crossing = { x: lane.mesh.x + u.x * length * .55, y: lane.mesh.y + u.y * length * .55 };
  for (const a of sim.agents) {
    a.body.pos = { x: 5, y: 1 + a.idx * 2 };
    a.body.vel = { x: 0, y: 0 };
    a.body.support = newSupport();
  }
  observer.body.pos = { x: crossing.x + n.x * 1.5, y: crossing.y + n.y * 1.5 };
  const expected = sim.runAwareness.expectedLane(observer, lane.meshTime)!;
  const bearing = Math.atan2(expected.lookPoint.y - observer.pos.y, expected.lookPoint.x - observer.pos.x);
  observer.body.facing = bearing - Math.PI / 2; // Expected traffic is 90° off the torso.
  key.body.pos = { x: observer.pos.x + Math.cos(observer.facing), y: observer.pos.y + Math.sin(observer.facing) };
  key.body.facing = observer.facing + Math.PI;
  runner.body.pos = { ...expected.lookPoint };
  const contact = ownContact(observer, key);
  observer.engagement = key.engagement = contact;
  observer.mind.focus = 1;
  const previous: Intent[] = sim.agents.map(() => ({ vel: { x: 0, y: 0 } }));
  previous[observer.idx] = { vel: { x: -n.x * 4, y: -n.y * 4 } };
  const now = Math.ceil(expected.arrival.earliest / sim.dt) * sim.dt;
  return { sim, observer, runner, key, previous, now, expected };
}
type Stage = ReturnType<typeof stage>;

/** Advance actual scene/history each boundary; never refresh from a query. */
function advance(s: Stage, now: number) {
  s.sim.t = now;
  s.sim.perception.record(s.sim.agents, s.sim.carrier?.idx ?? null);
  s.sim.runAwareness.prepare(s.sim.agents, s.previous, s.sim.teammateAwareness, now, s.sim.dt);
  const attention = new Map(s.sim.agents.flatMap(a => {
    const view = s.sim.runAwareness.visualAttention(a);
    return view ? [[a.idx, view] as const] : [];
  }));
  s.sim.teammateAwareness.sense(s.sim.agents, now, s.sim.dt, attention);
  return s.sim.teammateInformation(s.observer, s.runner);
}

function picture(p: TeammatePicture) {
  if (p.source === 'unavailable') throw new Error('Expected an acquired runner picture');
  return p;
}

function spacingRequest(s: Stage) {
  const intents: Intent[] = [{ ...s.previous[s.observer.idx], vel: { ...s.previous[s.observer.idx].vel } },
    { vel: { x: 0, y: 0 } }];
  spaceTeammates([s.observer, s.runner], intents, (a, b) => {
    const seen = s.sim.teammateInformation(a, b);
    return seen.source === 'unavailable' ? null : seen;
  }, { now: s.sim.t, constrained: new Set([s.observer.body]) });
  return intents[0];
}

function atBearing(s: Stage, bodyAngle: number, distance = 3): Vec2 {
  return { x: s.observer.pos.x + Math.cos(s.observer.facing + bodyAngle) * distance,
    y: s.observer.pos.y + Math.sin(s.observer.facing + bodyAngle) * distance };
}

describe('installed knowledge and acquired run attention', () => {
  it('keeps shared installed value and availability independent of hidden handoff, path and live jobs', () => {
    const s = stage(), before = s.sim.runAwareness.installed(s.observer);
    const early = s.sim.runAwareness.expectedLane(s.observer, s.now);
    expect(early).not.toBeNull();
    s.sim.handoffAt = s.now - .2;
    s.sim.ball = { kind: 'held', carrier: s.runner };
    s.runner.body.pos = { x: 90, y: 1 }; s.runner.body.vel = { x: -9, y: 8 };
    s.runner.behavior = { kind: 'hidden-cut', update: () => ({ vel: { x: -9, y: 8 } }) };
    s.runner.engagement = ownContact(s.runner, s.key);
    (s.observer.behavior as RunBlocker).plan.kind = 'climb';
    expect(s.sim.runAwareness.installed(s.observer)).toEqual(before);
    expect(s.sim.runAwareness.expectedLane(s.observer, s.now)).toEqual(early);
    // Returned installation is a copy, not a mutable coaching channel.
    if (before?.team === 'O' && before.lane) {
      before.role = 'corrupted'; before.lane.mesh.x = 999; before.lane.meshTime = 999;
    }
    expect(s.sim.runAwareness.installed(s.observer)).not.toEqual(before);
    expect(s.sim.runAwareness.expectedLane(s.observer, s.now)).toEqual(early);
  });

  it('gives defenders their own fit rather than the opposing scheme or runner lane', () => {
    const wide = make('off', 'wz_strong'), inside = make('off', 'iz_strong'), pass = make('off', 'wz_strong', 'pass');
    for (const defender of wide.defense) {
      const known = wide.runAwareness.installed(defender);
      expect(known?.team).toBe('D');
      expect(known).not.toHaveProperty('scheme'); expect(known).not.toHaveProperty('lane');
      expect(wide.runAwareness.expectedLane(defender, 2)).toBeNull();
      expect(known).toEqual(inside.runAwareness.installed(inside.slot(defender.slot)!));
      expect(known).toEqual(pass.runAwareness.installed(pass.slot(defender.slot)!));
      expect(pass.runAwareness.expectedLane(pass.slot(defender.slot)!, 2)).toBeNull();
    }
  });

  it('keeps the nested defensive inside fit installed after its live counterpart changes', () => {
    // Buzz gives a curl-flat linebacker an installed inside bubble as well as
    // outside force duty; this is existing native coordination, not a fake job.
    const sim = make('off', 'wz_strong', 'run', 'cover3_buzz');
    const observer = sim.defense.find(a => !!a.runFit?.inside);
    expect(observer).toBeDefined();
    if (!observer?.runFit?.inside) throw new Error('Control requires a native nested inside fit');
    const before = sim.runAwareness.installed(observer);
    expect(before?.team).toBe('D');
    if (before?.team !== 'D' || !before.fit?.inside) throw new Error('Missing installed inside fit');
    observer.runFit.inside.gap = before.fit.inside.gap === 'A' ? 'B' : 'A';
    observer.runFit.inside.side *= -1;
    expect(sim.runAwareness.installed(observer)).toEqual(before);
    // Mutating the returned nested copy must also leave the installation alone.
    before.fit.inside.gap = 'D'; before.fit.inside.side *= -1;
    expect(sim.runAwareness.installed(observer)).not.toEqual(before);
  });

  it('represents a growing uncertain corridor without supplying post-mesh traffic to spacing', () => {
    const s = stage(), before = s.sim.runAwareness.expectedLane(s.observer, s.expected.meshTime)!;
    const later = s.sim.runAwareness.expectedLane(s.observer, s.expected.meshTime + 1)!;
    expect(later.halfWidth).toBeGreaterThan(before.halfWidth);
    expect(later.arrival.latest).toBeGreaterThan(later.arrival.earliest);
    expect(later.mesh).toEqual(before.mesh); expect(later.press).toEqual(before.press);
    expect(later).not.toHaveProperty('pos'); expect(later).not.toHaveProperty('vel');
    // Asking where to look cannot create a current runner point.
    s.sim.t = s.now;
    expect(s.sim.teammateInformation(s.observer, s.runner)).toEqual({ source: 'unavailable' });
    expect(spacingRequest(s).vel).toEqual(s.previous[s.observer.idx].vel);
  });

  it('chooses the same possibly wrong glance for stalled mesh and hidden movement', () => {
    const stalled = stage(), moving = stage();
    stalled.runner.body.pos = atBearing(stalled, Math.PI, 4);
    moving.runner.body.pos = atBearing(moving, -Math.PI * .85, 7);
    moving.sim.ball = { kind: 'held', carrier: moving.runner }; moving.sim.handoffAt = .9;
    stalled.sim.handoffAt = -1;
    advance(stalled, stalled.now); advance(moving, moving.now);
    expect(stalled.sim.runAwareness.recorded(stalled.observer)?.choice).toBe('lane');
    expect(stalled.sim.runAwareness.visualAttention(stalled.observer))
      .toEqual(moving.sim.runAwareness.visualAttention(moving.observer));
    expect(stalled.sim.teammateInformation(stalled.observer, stalled.runner)).toEqual({ source: 'unavailable' });
    expect(moving.sim.teammateInformation(moving.observer, moving.runner)).toEqual({ source: 'unavailable' });
  });

  it('triggers from own crossing movement, and retains the key when that movement is absent', () => {
    const crossing = stage(), stationary = stage();
    stationary.previous[stationary.observer.idx] = { vel: { x: 0, y: 0 } };
    advance(crossing, crossing.now); advance(stationary, stationary.now);
    expect(crossing.sim.runAwareness.visualAttention(crossing.observer)).not.toBeNull();
    expect(stationary.sim.runAwareness.visualAttention(stationary.observer)).toBeNull();
    expect(stationary.sim.runAwareness.recorded(stationary.observer)?.choice).toBe('primary');
  });

  it('retains and acquires the primary key when its eligible installed lane look is physically unattainable', () => {
    const left = stage(), right = stage();
    for (const s of [left, right]) {
      const intended = Math.atan2(s.expected.lookPoint.y - s.observer.pos.y,
        s.expected.lookPoint.x - s.observer.pos.x);
      s.observer.body.facing = intended - 150 * Math.PI / 180;
      // The original key remains 60° off this achieved torso, so retaining it
      // supplies a legitimate visual opportunity while the lane point cannot.
      expect(Math.abs(angleDiff(s.observer.facing, intended)))
        .toBeGreaterThan(LIMITS.gazeYaw + LIMITS.glanceHalfAngle);
      const expected = s.sim.runAwareness.expectedLane(s.observer, s.now)!;
      expect(s.now).toBeGreaterThanOrEqual(expected.arrival.earliest);
      expect(s.now).toBeLessThan(expected.arrival.latest);
      expect(Math.hypot(s.previous[s.observer.idx].vel.x,
        s.previous[s.observer.idx].vel.y)).toBeGreaterThan(1);
    }
    // Different unseen real paths cannot make an impossible coached look useful.
    left.runner.body.pos = atBearing(left, Math.PI, 4);
    right.runner.body.pos = atBearing(right, -150 * Math.PI / 180, 7);
    for (const s of [left, right]) {
      expect(advance(s, s.now)).toEqual({ source: 'unavailable' });
      const chosen = s.sim.runAwareness.recorded(s.observer)!;
      expect(chosen.choice).toBe('primary');
      expect(chosen.queuedSamples).toBeGreaterThan(0);
      expect(s.sim.runAwareness.visualAttention(s.observer)).toBeNull();
      const delivery = s.now + Math.ceil((s.observer.mind.observationDelay(s.observer.profile.reactionTime)
        - 1e-9) / s.sim.dt) * s.sim.dt;
      advance(s, delivery);
      expect(s.sim.runAwareness.recorded(s.observer)?.sampledAt).toBeCloseTo(s.now, 12);
      expect(s.sim.see(s.observer, s.key).pos).toEqual(s.key.pos);
    }
    expect(left.sim.runAwareness.recorded(left.observer)).toEqual(right.sim.runAwareness.recorded(right.observer));
  });

  it('bounds the installed timing opportunity even if the true mesh is indefinitely stalled', () => {
    const s = stage(); s.sim.handoffAt = -1;
    s.runner.body.pos = atBearing(s, Math.PI, 7);
    advance(s, s.now);
    expect(s.sim.runAwareness.recorded(s.observer)?.choice).toBe('lane');
    const afterWindow = Math.ceil(s.expected.arrival.latest / s.sim.dt) * s.sim.dt + s.sim.dt;
    advance(s, afterWindow);
    expect(s.sim.runAwareness.visualAttention(s.observer)).toBeNull();
    expect(s.sim.runAwareness.recorded(s.observer)?.choice).toBe('primary');
    expect(s.sim.teammateInformation(s.observer, s.runner)).toEqual({ source: 'unavailable' });
  });

  it('preserves ordinary occupied field limits in the primary-only opposing control', () => {
    const s = stage('primary');
    // Exactly the runner traffic the explicit glance can acquire remains
    // outside the unchanged 75° occupied opportunity without that look.
    for (let tick = 0; tick < 12; tick++) {
      expect(advance(s, s.now + tick * s.sim.dt)).toEqual({ source: 'unavailable' });
      expect(s.sim.runAwareness.visualAttention(s.observer)).toBeNull();
    }
    expect(s.sim.runAwareness.primaryPicture(s.observer, s.key, s.sim.t)).not.toBeNull();
  });

  it('keeps estimates and actual spacing requests invariant as hidden wrong cuts advance reality', () => {
    const left = stage(), right = stage();
    for (let tick = 0; tick < 12; tick++) {
      left.runner.body.pos = atBearing(left, Math.PI, 4 + tick * .02);
      right.runner.body.pos = atBearing(right, -Math.PI * .85, 7 - tick * .02);
      left.runner.body.vel = { x: -7, y: 2 }; right.runner.body.vel = { x: 8, y: -3 };
      const now = left.now + tick * left.sim.dt;
      expect(advance(left, now)).toEqual(advance(right, now));
      expect(left.sim.perception.perceive(left.runner.idx, 0))
        .not.toEqual(right.sim.perception.perceive(right.runner.idx, 0));
      expect(left.sim.runAwareness.recorded(left.observer)).toEqual(right.sim.runAwareness.recorded(right.observer));
      expect(spacingRequest(left)).toEqual(spacingRequest(right));
    }
    expect(left.sim.teammateInformation(left.observer, left.runner)).toEqual({ source: 'unavailable' });
  });

  it('delivers a visible runner contradiction only after the acquired sample latency', () => {
    const s = stage();
    // Off the exact installed look point, but legitimately inside the glance.
    const bearing = Math.atan2(s.expected.lookPoint.y - s.observer.pos.y,
      s.expected.lookPoint.x - s.observer.pos.x) + .20;
    s.runner.body.pos = { x: s.observer.pos.x + Math.cos(bearing) * .85,
      y: s.observer.pos.y + Math.sin(bearing) * .85 };
    s.runner.body.vel = { x: 0, y: 0 };
    const observedPosition = { ...s.runner.pos };
    expect(advance(s, s.now)).toEqual({ source: 'unavailable' });
    const beforeAcquisition = spacingRequest(s);
    expect(s.sim.runAwareness.recorded(s.observer)?.choice).toBe('lane');
    const delivery = s.now + Math.ceil((s.observer.mind.observationDelay(s.observer.profile.reactionTime) - 1e-9) / s.sim.dt) * s.sim.dt;
    for (let tick = 1; s.now + tick * s.sim.dt < delivery - 1e-9; tick++) {
      expect(advance(s, s.now + tick * s.sim.dt)).toEqual({ source: 'unavailable' });
    }
    const seen = picture(advance(s, delivery));
    expect(seen.sampledAt).toBeCloseTo(s.now, 12);
    expect(seen.availableAt).toBeCloseTo(delivery, 12);
    expect(seen.pos).toEqual(observedPosition);
    expect(seen.pos).not.toEqual(s.expected.lookPoint);
    expect(spacingRequest(s).vel, JSON.stringify({ observedPosition, ownPosition: s.observer.pos,
      request: s.previous[s.observer.idx].vel, touch: .9 * (s.observer.profile.radius + s.runner.profile.radius),
      sample: seen })).not.toEqual(beforeAcquisition.vel);
    const nextRead = Math.ceil(s.sim.runAwareness.recorded(s.observer)!.nextReadAt / s.sim.dt) * s.sim.dt;
    advance(s, nextRead);
    const read = s.sim.runAwareness.recorded(s.observer)!;
    if (read.choice === 'lane') {
      // An already-aged delivery can motivate another check. That check must
      // use the acquired contradiction, rather than silently restoring design.
      expect(read.lookPoint).toEqual(observedPosition);
    } else expect(s.sim.runAwareness.visualAttention(s.observer)).toBeNull();
  });

  it.each(['occluded', 'outside yaw', 'outside chosen cone'] as const)(
    'does not turn a %s runner into acquired evidence', (control) => {
      const s = stage();
      if (control === 'occluded') {
        const other = s.sim.slot('Y')!;
        other.body.pos = { x: (s.observer.pos.x + s.runner.pos.x) / 2,
          y: (s.observer.pos.y + s.runner.pos.y) / 2 };
      } else s.runner.body.pos = atBearing(s, control === 'outside yaw' ? Math.PI : -Math.PI / 2);
      for (let tick = 0; tick < 12; tick++)
        expect(advance(s, s.now + tick * s.sim.dt)).toEqual({ source: 'unavailable' });
    });

  it('reclamps a held glance when the achieved torso turns', () => {
    const s = stage(); advance(s, s.now);
    const first = s.sim.runAwareness.visualAttention(s.observer)!;
    expect(Math.abs(angleDiff(s.observer.facing, first.bearing))).toBeCloseTo(Math.PI / 2, 12);
    s.observer.body.facing -= Math.PI / 2;
    const held = s.sim.runAwareness.visualAttention(s.observer)!;
    expect(Math.abs(angleDiff(s.observer.facing, held.bearing))).toBeCloseTo(LIMITS.gazeYaw, 12);
    expect(held.halfAngle).toBe(LIMITS.glanceHalfAngle);
    expect(held.maximumBodyAngle).toBe(LIMITS.gazeYaw + LIMITS.glanceHalfAngle);
  });

  it('spends the primary visual opportunity while pending samples remain legitimate and a return reacquires', () => {
    const s = stage();
    const crossingRequest = s.previous[s.observer.idx];
    s.previous[s.observer.idx] = { vel: { x: 0, y: 0 } };
    const start = s.now;
    advance(s, start);
    const oldKeyPosition = { ...s.key.pos };
    const pending = s.sim.runAwareness.recorded(s.observer)!;
    expect(pending.choice).toBe('primary'); expect(pending.queuedSamples).toBe(1);
    s.previous[s.observer.idx] = crossingRequest;
    const lookAt = Math.ceil(pending.nextReadAt / s.sim.dt) * s.sim.dt;
    s.runner.body.pos = atBearing(s, Math.PI, 6); // No glimpse ends the look early.
    advance(s, lookAt);
    expect(s.sim.runAwareness.recorded(s.observer)?.choice).toBe('lane');
    s.key.body.pos = { x: s.key.pos.x + .3, y: s.key.pos.y + .1 };
    s.key.body.vel = { x: 2, y: 1 };
    const delivery = start + Math.ceil((s.observer.mind.observationDelay(s.observer.profile.reactionTime) - 1e-9) / s.sim.dt) * s.sim.dt;
    advance(s, delivery);
    const pendingDelivered = s.sim.see(s.observer, s.key);
    expect(pendingDelivered.pos).toEqual(oldKeyPosition);
    expect(s.sim.runAwareness.recorded(s.observer)?.sampledAt).toBeCloseTo(start, 12);
    const returnAt = Math.ceil(s.sim.runAwareness.recorded(s.observer)!.nextReadAt / s.sim.dt) * s.sim.dt;
    const beforeReturn = returnAt - s.sim.dt;
    advance(s, beforeReturn);
    expect(s.sim.see(s.observer, s.key).age).toBeGreaterThan(pendingDelivered.age!);
    expect(s.sim.runAwareness.recorded(s.observer)?.sampledAt).toBeCloseTo(start, 12);
    advance(s, returnAt);
    expect(s.sim.runAwareness.recorded(s.observer)?.choice).toBe('primary');
    const freshAt = returnAt + Math.ceil((s.observer.mind.observationDelay(s.observer.profile.reactionTime) - 1e-9) / s.sim.dt) * s.sim.dt;
    advance(s, freshAt);
    expect(s.sim.runAwareness.recorded(s.observer)?.sampledAt).toBeCloseTo(returnAt, 12);
    expect(s.sim.see(s.observer, s.key).vel).toEqual({ x: 2, y: 1 });
    expect(s.sim.see(s.observer, s.key).pos).not.toEqual(oldKeyPosition);
  });

  it('leaves RNG, acquisition and held attention unchanged by duplicate preparation and copied diagnostic queries', () => {
    const plain = stage(), inspected = stage();
    const snapshot = (s: Stage) => JSON.stringify({ rng: s.sim.rng, minds: s.sim.agents.map(a => a.mind),
      attention: s.sim.runAwareness, peers: s.sim.teammateAwareness },
    (_key, value) => value instanceof Map ? [...value] : value);
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      for (let tick = 0; tick < 8; tick++) {
        const now = plain.now + tick * plain.sim.dt;
        expect(advance(plain, now)).toEqual(advance(inspected, now));
        const before = snapshot(inspected), position = { ...inspected.runner.pos };
        inspected.runner.body.pos = { x: 100, y: 1 };
        inspected.sim.runAwareness.prepare(inspected.sim.agents, inspected.previous,
          inspected.sim.teammateAwareness, now, inspected.sim.dt);
        inspected.sim.teammateAwareness.sense(inspected.sim.agents, now, inspected.sim.dt,
          new Map([[inspected.observer.idx, { bearing: 0, halfAngle: Math.PI, maximumBodyAngle: Math.PI }]]));
        for (let repeat = 0; repeat < 5; repeat++) {
          const installed = inspected.sim.runAwareness.installed(inspected.observer);
          if (installed?.team === 'O' && installed.lane) installed.lane.press.x = 999;
          const expected = inspected.sim.runAwareness.expectedLane(inspected.observer, now)!;
          expected.lookPoint.x = 999; expected.arrival.latest = 999;
          const record = inspected.sim.runAwareness.recorded(inspected.observer);
          if (record?.lookPoint) record.lookPoint.y = 999;
          const primary = inspected.sim.see(inspected.observer, inspected.key);
          primary.pos.x = 999; primary.vel.y = 999;
          const peer = inspected.sim.teammateInformation(inspected.observer, inspected.runner);
          if (peer.source !== 'unavailable') { peer.pos.x = 999; peer.vel.y = 999; }
          inspected.sim.trace.state(inspected.sim);
        }
        inspected.runner.body.pos = position;
        expect(snapshot(inspected)).toBe(before); expect(snapshot(inspected)).toBe(snapshot(plain));
      }
      expect(draws).not.toHaveBeenCalled();
    } finally { draws.mockRestore(); }
  });
});

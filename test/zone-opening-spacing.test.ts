import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import type { Vec2 } from '../src/core/vec.js';
import { alignOffense } from '../src/playbook/alignment.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Body } from '../src/physics/kinematics.js';
import * as MovementPreview from '../src/physics/movement-preview.js';
import { newSupport } from '../src/physics/support.js';
import { newVirtualFoot } from '../src/physics/virtual-foot.js';
import { World, type Intent } from '../src/physics/world.js';
import { Agent } from '../src/sim/agent.js';
import { RunnerToMesh } from '../src/sim/assign.js';
import { RunBlocker } from '../src/sim/behaviors/blocking.js';
import type { PlaySim } from '../src/sim/playsim.js';
import { spaceTeammates, type SpacingContext } from '../src/sim/spacing.js';
import { installTeammateExpectations } from '../src/sim/teammate-calls.js';
import { TeammateInformation, type TeammatePicture } from '../src/sim/teammate-information.js';

type Saved = Record<string, any>;
type Picture = Exclude<TeammatePicture, { source: 'unavailable' }>;
const packet = JSON.parse(gunzipSync(readFileSync(new URL(
  '../docs/reviews/wide-zone-opening/first-breakdown.json.gz', import.meta.url))).toString()) as { cases: Saved[] };

function body(source: Body): Body {
  const result = structuredClone(source);
  if (result.support && result.support.since === null) result.support.since = -Infinity;
  return result;
}

/** Reuse the exact first-action bodies and requests. Only public installation
 * is recomputed: the historical instantaneous nominal-speed call is the defect
 * under test. No behavior updates, sensing, native play or future frames run. */
function stage(saved = packet.cases[0]) {
  const frame = saved.frame;
  const agents: Agent[] = saved.actors.map((a: Saved) => new Agent(a.idx, a.team, a.slot,
    structuredClone(a.player), structuredClone(a.profile), body(frame.beforeBodies[a.idx]),
    { kind: 'fixture', update: () => ({ vel: { x: 0, y: 0 } }) }));
  const revive = (value: any): any => {
    if (Array.isArray(value)) return value.map(revive);
    if (value && typeof value === 'object') {
      if (Object.keys(value).length === 1 && typeof value.agent === 'number') return agents[value.agent];
      return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, revive(v)]));
    }
    return value;
  };
  for (const a of saved.actors) {
    const job = a.initialBehavior;
    if (job.kind === 'run-block') agents[a.idx].behavior = new RunBlocker(revive(job.plan));
    if (job.kind === 'mesh') agents[a.idx].behavior = new RunnerToMesh(
      structuredClone(job.mesh), job.meshTime, structuredClone(job.aim), job.ride);
  }
  const sim = { agents, offense: agents.filter(a => a.team === 'O'),
    offAlign: alignOffense(FORMATION_BY_ID[saved.input.formation], saved.input.flip, 40, 26.666666666666668),
    defAlign: { spots: {} }, offCall: { kind: 'run', run: RUN_BY_ID[saved.input.concept] },
    dt: .05, world: { handContact: 'center' } } as unknown as PlaySim;
  const calls = installTeammateExpectations(sim), awareness = new TeammateInformation(agents, calls);
  const own = agents[2], pictures = new Map<number, Picture>();
  for (const cue of saved.consumed) {
    if (cue.observer !== own.idx || cue.kind !== 'owned-teammate-information') continue;
    const picture = cue.picture.source === 'called'
      ? awareness.query(own.idx, cue.target, frame.t, .05) : structuredClone(cue.picture);
    if (picture.source !== 'unavailable') pictures.set(cue.target, picture);
  }
  return { saved, agents, own, pictures, original: structuredClone(frame.requested[2]) as Intent,
    now: frame.t as number };
}
type Stage = ReturnType<typeof stage>;

function decision(s: Stage, extra: Partial<SpacingContext> = {}, enabled = true): Intent {
  const intents: Intent[] = [];
  intents[s.own.idx] = structuredClone(s.original);
  spaceTeammates(s.agents, intents, (_observer, target) => s.pictures.get(target.idx) ?? null,
    { now: s.now, handContact: 'center', ...(enabled ? { openingTrack: new Set([s.own.body]) } : {}), ...extra });
  return intents[s.own.idx];
}

/** Independent execution through World, rather than calling the controller's
 * preview helper. It preserves support, facing and the ordinary motion law. */
function execute(source: Body, command: Intent, now = .05, steps = 6) {
  const b = body(source), world = new World([b]), samples = [{ t: 0, pos: { ...b.pos }, vel: { ...b.vel } }];
  world.time = now;
  for (let k = 0; k < steps; k++) {
    const report = world.step([command], .05);
    expect(b.support!.state).toBe('up');
    expect(report.contacts).toHaveLength(0);
    expect(Math.abs(report.work.residual)).toBeLessThan(1e-8);
    samples.push({ t: (k + 1) * .05, pos: { ...b.pos }, vel: { ...b.vel } });
  }
  return samples;
}

function peerPosition(picture: Picture, t: number): Vec2 {
  const route = picture.source === 'called' ? picture.forecast?.samples : undefined;
  if (route && route.length > 1) {
    const hi = route.findIndex(s => s.t >= t - 1e-9);
    if (hi < 0) throw new Error('Test route does not cover execution');
    const b = route[hi], a = route[Math.max(0, hi - 1)];
    const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
    return { x: a.pos.x + u * (b.pos.x - a.pos.x), y: a.pos.y + u * (b.pos.y - a.pos.y) };
  }
  return { x: picture.pos.x + picture.vel.x * t, y: picture.pos.y + picture.vel.y * t };
}

function clearance(samples: ReturnType<typeof execute>, picture: Picture, touch: number) {
  let minimum = Infinity;
  for (let k = 1; k < samples.length; k++) {
    const a = samples[k - 1], b = samples[k], pa = peerPosition(picture, a.t), pb = peerPosition(picture, b.t);
    const x = a.pos.x - pa.x, y = a.pos.y - pa.y;
    const dx = b.pos.x - pb.x - x, dy = b.pos.y - pb.y - y;
    const u = Math.max(0, Math.min(1, -(x * dx + y * dy) / Math.max(1e-12, dx * dx + dy * dy)));
    minimum = Math.min(minimum, Math.hypot(x + u * dx, y + u * dy) - touch);
  }
  return minimum;
}

function observed(pos: Vec2, vel: Vec2 = { x: 0, y: 0 }): Picture {
  return { source: 'observed', pos: { ...pos }, vel: { ...vel }, sampledAt: .05,
    availableAt: .05, age: 0, predictedFor: 0 };
}

describe('installed opening routes may veto only a false radial restriction', () => {
  it.each(packet.cases.slice(0, 2))('$input.id clears all acquired neighbors from the saved first-action state', saved => {
    const s = stage(saved), before = structuredClone(s.agents.map(a => a.body));
    const old = decision(s, {}, false), command = decision(s);
    expect(old.vel).not.toEqual(s.original.vel);
    expect(command).toEqual(s.original);
    expect(s.agents.map(a => a.body)).toEqual(before);
    const path = execute(s.own.body, command), restricted = execute(s.own.body, old);
    for (const [idx, picture] of s.pictures) {
      const touch = .9 * (s.own.profile.radius + s.agents[idx].profile.radius);
      expect(clearance(path, picture, touch), `actor ${idx}`).toBeGreaterThan(0);
    }
    expect(path.at(-1)!.pos.y).toBeLessThan(path[0].pos.y);
    expect(path[0].pos.y - path.at(-1)!.pos.y)
      .toBeGreaterThan(restricted[0].pos.y - restricted.at(-1)!.pos.y);
  });

  it('preserves the saved weak RT request with clear achieved movement', () => {
    const s = stage(packet.cases[2]), command = decision(s);
    expect(command).toEqual(s.original);
    const path = execute(s.own.body, command);
    for (const [idx, picture] of s.pictures) {
      expect(clearance(path, picture, .9 * (s.own.profile.radius + s.agents[idx].profile.radius)))
        .toBeGreaterThan(0);
    }
  });

  it('keeps anticipatory braking for a stationary observed obstruction six yards ahead', () => {
    const s = stage(), own = s.agents[6], peer = s.agents[4];
    own.body.pos = { x: 50, y: 26 }; own.body.vel = { x: 9, y: 0 };
    own.body.facing = 0; own.body.support = newSupport();
    peer.body.pos = { x: 56, y: 26 }; peer.body.vel = { x: 0, y: 0 }; peer.body.support = newSupport();
    s.own = own; s.original = { vel: { x: 9, y: 0 } };
    s.pictures = new Map([[peer.idx, observed(peer.pos)]]);
    const old = decision(s, {}, false);
    expect(old.vel.x).toBeGreaterThan(0); expect(old.vel.x).toBeLessThan(9);
    expect(decision(s)).toEqual(old);
    // A clear .30s prefix alone does not authorize release of stopping-distance braking.
    expect(clearance(execute(own.body, s.original), observed(peer.pos),
      .9 * (own.profile.radius + peer.profile.radius))).toBeGreaterThan(0);
    const run = (mode: 'legacy' | 'candidate' | 'stop') => {
      const a = new Agent(own.idx, own.team, own.slot, own.player, own.profile, body(own.body), own.behavior);
      const b = new Agent(peer.idx, peer.team, peer.slot, peer.player, peer.profile, body(peer.body), peer.behavior);
      const arm = { ...s, agents: [...s.agents], own: a, pictures: new Map(s.pictures) };
      arm.agents[a.idx] = a; arm.agents[b.idx] = b;
      const world = new World([a.body, b.body]); world.time = s.now;
      const history = [];
      for (let k = 0; k < 20; k++) {
        arm.now = world.time; arm.pictures.set(b.idx, observed(b.pos, b.vel));
        const command = mode === 'stop' ? { vel: { x: 0, y: 0 } } : decision(arm, {}, mode === 'candidate');
        const report = world.step([command, { vel: { x: 0, y: 0 } }], .05);
        expect(a.body.support!.state).toBe('up');
        history.push({ t: world.time, command, bodies: structuredClone([a.body, b.body]),
          contacts: structuredClone(report.contacts) });
      }
      expect(a.pos.x).toBeGreaterThan(50.5);
      return history;
    };
    const legacy = run('legacy'), candidate = run('candidate'), stop = run('stop');
    // The legacy response itself has a late impact in this control. Require
    // exact physical invariance; do not label that baseline history safe.
    expect(candidate).toEqual(legacy);
    console.info('observed obstruction control', JSON.stringify({
      legacy: legacy.filter(s => s.contacts.length).map(s => ({ t: s.t, contacts: s.contacts })),
      fullStop: stop.filter(s => s.contacts.length).map(s => ({ t: s.t, contacts: s.contacts })),
    }));
  });

  it('does not excuse a genuinely crossing called route', () => {
    const s = stage(), peer = s.agents[7];
    const b = body(peer.body);
    b.pos = { x: s.own.pos.x, y: s.own.pos.y - .8 };
    b.vel = { x: 0, y: 4 }; b.facing = Math.PI / 2; b.support = newSupport(.7);
    const samples = execute(b, { vel: { x: 0, y: 4 }, facing: Math.PI / 2, posture: .7 });
    const picture: Picture = { ...observed(b.pos, b.vel), source: 'called',
      forecast: { validFor: .55, samples } };
    s.pictures.set(peer.idx, picture);
    const path = execute(s.own.body, s.original);
    expect(clearance(path, picture, .9 * (s.own.profile.radius + peer.profile.radius))).toBeLessThan(0);
    expect(decision(s)).toEqual(decision(s, {}, false));
    expect(decision(s)).not.toEqual(s.original);
  });

  it('checks a conflicting acquired peer even when that peer does not bind the requested ray', () => {
    const s = stage(), peer = s.agents[1];
    const picture = observed({ x: s.own.pos.x + 1, y: s.own.pos.y + .2 }, { x: -4, y: 0 });
    s.pictures.set(peer.idx, picture);
    const path = execute(s.own.body, s.original);
    expect(clearance(path, picture, .9 * (s.own.profile.radius + peer.profile.radius))).toBeLessThan(0);
    expect(decision(s)).toEqual(decision(s, {}, false));
  });

  it.each(['short validity', 'truncated samples', 'expired route', 'observed binding peer'] as const)(
    'retains baseline with %s, from the same physical state', kind => {
      const s = stage(), peer = s.agents[7], p = s.pictures.get(peer.idx)!;
      expect(p.forecast!.samples.length).toBeGreaterThan(1);
      if (kind === 'short validity') p.forecast!.validFor = .25;
      if (kind === 'truncated samples') p.forecast!.samples = p.forecast!.samples.filter(x => x.t < .3 - 1e-9);
      if (kind === 'expired route') p.forecast!.validFor = 0;
      if (kind === 'observed binding peer') p.source = 'observed';
      expect(decision(s)).toEqual(decision(s, {}, false));
      expect(decision(s)).not.toEqual(s.original);
    });

  it.each(['outside opening', 'not enrolled', 'joint', 'load', 'lean', 'foot', 'strike'] as const)(
    'retains the ordinary controller with %s', kind => {
      const s = stage(), context: Partial<SpacingContext> = {};
      if (kind === 'outside opening') context.now = .35;
      if (kind === 'not enrolled') context.openingTrack = new Set();
      if (kind === 'joint') context.constrained = new Set([s.own.body]);
      if (kind === 'load') s.own.body.support!.load = { x: 10, y: 0 };
      if (kind === 'lean') s.own.body.support!.lean = { x: 10, y: 0 };
      if (kind === 'foot') s.own.body.support!.foot = newVirtualFoot(s.own.pos);
      if (kind === 'strike') s.own.body.support!.strike = { until: 1 } as any;
      const preview = vi.spyOn(MovementPreview, 'previewFreeMovement');
      try {
        expect(decision(s, context)).toEqual(decision(s, context, false));
        expect(preview).not.toHaveBeenCalled();
      } finally { preview.mockRestore(); }
    });

  it('does not poll hidden teammate motion, support or jobs, mutate state, or draw randomness', () => {
    const s = stage(), expected = decision(s), pictures = structuredClone(s.pictures);
    for (const peer of s.agents) if (peer !== s.own) {
      peer.body.pos = { x: 4, y: 4 }; peer.body.vel = { x: 8, y: -8 };
      peer.body.facing = Math.PI; peer.body.support = newSupport(.1);
      peer.body.support.state = 'down'; peer.body.support.load = { x: 200, y: 100 };
      peer.behavior = { kind: 'hidden-reassignment', update: () => { throw new Error('Private controller'); } };
      peer.engagement = { control: 1, phi: .8 } as any;
    }
    const before = structuredClone(s.agents.map(a => a.body));
    const draws = vi.spyOn(Rng.prototype, 'nextU32');
    try {
      expect(decision(s)).toEqual(expected);
      expect(s.agents.map(a => a.body)).toEqual(before);
      expect(s.pictures).toEqual(pictures);
      expect(draws).not.toHaveBeenCalled();
    } finally { draws.mockRestore(); }
  });
});

import { describe, expect, it } from 'vitest';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { newSupport } from '../src/physics/support.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { PlaySim } from '../src/sim/playsim.js';

function make(record = false) {
  return new PlaySim({
    offense: pickOffense(generateTeam(new Rng(31), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(32), 'D', 'D'), 'nickel'),
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass',
      pass: PASS_BY_ID.four_verts, label: 'information loop' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3,
      pressure: null, label: 'information loop' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, seed: 3,
    record, recordEvery: 1, recordLevel: 'full',
  });
}

const state = (sim: PlaySim) => JSON.stringify({
  t: sim.t, phase: sim.phase, events: sim.events, intents: sim.intents, rng: sim.rng,
  bodies: sim.agents.map(a => a.body), minds: sim.agents.map(a => a.mind),
  awareness: sim.teammateAwareness,
}, (_key, value) => value instanceof Map ? [...value] : value instanceof Set ? [...value] : value);

describe('teammate information at native loop boundaries', () => {
  it('acquires a limited rear tactile cue only after an actual teammate impulse', () => {
    const sim = make(), observer = sim.slot('RT')!, target = sim.slot('RB')!;
    for (const a of sim.agents) {
      a.body.pos = { x: 5, y: 1 + a.idx * 2 };
      a.body.vel = { x: 0, y: 0 }; a.body.support = newSupport();
      a.behavior = { kind: 'fixture', update: () => ({ vel: { x: 0, y: 0 } }) };
      a.snapReadyAt = 0;
    }
    observer.body.pos = { x: 50, y: CENTER_Y }; observer.body.facing = 0;
    const touch = .9 * (observer.profile.radius + target.profile.radius);
    target.body.pos = { x: 50 - touch - .02, y: CENTER_Y };
    target.body.vel = { x: 3, y: 0 }; target.body.facing = 0;
    target.behavior = { kind: 'fixture', update: () => ({ vel: { x: 3, y: 0 } }) };
    expect(sim.teammateInformation(observer, target)).toEqual({ source: 'unavailable' });
    sim.tick();
    expect(sim.lastStep!.contacts.some(c => c.impulse > 0
      && ((c.i === observer.idx && c.j === target.idx) || (c.j === observer.idx && c.i === target.idx)))).toBe(true);
    const cue = sim.teammateInformation(observer, target);
    expect(cue.source).toBe('tactile');
    if (cue.source === 'unavailable') throw new Error('Missing physical touch');
    expect(cue.vel).toEqual(observer.vel);
    expect(Math.hypot(cue.pos.x - observer.pos.x, cue.pos.y - observer.pos.y)).toBeCloseTo(touch, 12);
    target.body.pos = { x: 20, y: 1 }; target.body.vel = { x: -9, y: 9 };
    sim.perception.record(sim.agents);
    sim.trace.state(sim);
    expect(sim.teammateInformation(observer, target)).toEqual(cue);
  });

  it('preserves actual native state and all RNG with full recording and extra information queries', () => {
    const plain = make(), inspected = make(true);
    for (let tick = 0; tick < 18; tick++) {
      expect(plain.phase).toBe('live'); expect(inspected.phase).toBe('live');
      plain.tick(); inspected.tick();
      const before = state(inspected);
      for (let repeat = 0; repeat < 3; repeat++) {
        for (const a of inspected.agents) for (const b of inspected.teammates(a)) {
          const picture = inspected.teammateInformation(a, b);
          if (picture.source !== 'unavailable') { picture.pos.x += 100; picture.vel.y += 100; }
        }
        inspected.trace.state(inspected);
      }
      expect(state(inspected)).toBe(before);
      expect(state(inspected)).toBe(state(plain));
    }
    expect(inspected.trace.data!.frames.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { Agent } from '../src/sim/agent.js';
import { CoverageJudgment, hasVisibleCap } from '../src/sim/coverage/judgment.js';
import { ReleaseReader, type ReceiverRead } from '../src/sim/coverage/reads.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

/** Isolate the consumed picture, not the helper's physical or called job.
 * Using the existing entry point also gives a behavioral before comparison. */
function capFromPicture(picture: {
  depth: number; lateral?: number; receiverVx?: number; helperVx?: number;
  helperVy?: number; age?: number; pose?: Perceived['pose'];
}, mirror = 1) {
  const observer = {
    r: () => 1, mind: { judgment: () => 0, decisionInterval: 0.2 },
  } as unknown as Agent;
  const helper = {} as Agent;
  const seen: Perceived = {
    pos: { x: 40 + picture.depth, y: 20 + mirror * (picture.lateral ?? 0) },
    vel: { x: picture.helperVx ?? 5, y: mirror * (picture.helperVy ?? 0) },
    facing: 0, stance: 'high', pose: picture.pose ?? 'up', age: picture.age ?? 0.05,
  };
  const rd = {
    r: {} as Agent, pos: { x: 40, y: 20 }, vel: { x: picture.receiverVx ?? 6, y: 0 },
  } as ReceiverRead;
  const sim = { defense: [observer, helper], see: () => seen } as unknown as PlaySim;
  return hasVisibleCap(observer, sim, rd);
}

describe('projected visible roof evidence', () => {
  it.each([-1, 1])('keeps an ordinary close co-moving roof, mirrored %i', mirror => {
    expect(capFromPicture({ depth: 2, helperVx: 6, lateral: 0.6 }, mirror)).toBe(true);
  });

  it.each([-1, 1])('rejects a shallow wall whose cushion expires before the next read, mirrored %i', mirror => {
    // Archived Dagger wall picture: level in about 0.101 seconds.
    expect(capFromPicture({ depth: 0.169, receiverVx: 6.216, helperVx: 4.535, lateral: 0.340 }, mirror)).toBe(false);
    // A somewhat larger initial cushion passes the previous 0.4-yard check,
    // but still disappears during the ordinary decision interval.
    expect(capFromPicture({ depth: 0.5, receiverVx: 6, helperVx: 0 }, mirror)).toBe(false);
  });

  it.each([-1, 1])('does not promise a near roof that visibly leaves the corridor, mirrored %i', mirror => {
    expect(capFromPicture({ depth: 2, lateral: 1.4, helperVy: 4 }, mirror)).toBe(false);
  });

  it.each([-1, 1])('keeps the coherent 8.245-yard Smash picture unestablished as far help, mirrored %i', mirror => {
    // Initial lateral + 0.2*vy is the archived 0.697-yard comparison.
    // Its projected encounter is coherent, but a long forecast alone does
    // not establish that the helper can assume this responsibility.
    expect(capFromPicture({ depth: 8.245, receiverVx: 6.386, helperVx: 1.887,
      lateral: 0.6158, helperVy: 0.406 }, mirror)).toBe(false);
  });

  it.each([-1, 1])('rejects the departing 12.073-yard consumed Bunch picture, mirrored %i', mirror => {
    expect(capFromPicture({ depth: 12.073, receiverVx: 3.413, helperVx: 0.365,
      lateral: 0.6286, helperVy: 1.677 }, mirror)).toBe(false);
  });

  it.each([-1, 1])('can trust approaching close help without promoting the same distant motion, mirrored %i', mirror => {
    const same = { depth: 8.245, receiverVx: 6.386, helperVx: 1.887, lateral: 0.6158 };
    expect(capFromPicture({ ...same, depth: 2, helperVy: -0.406 }, mirror)).toBe(true);
    expect(capFromPicture({ ...same, helperVy: -0.406 }, mirror)).toBe(false);
    expect(capFromPicture({ ...same, helperVy: 2 }, mirror)).toBe(false);
  });

  it('does not turn remote, co-moving or separating far pictures into established help', () => {
    expect(capFromPicture({ depth: 30, helperVx: 0 })).toBe(false);
    expect(capFromPicture({ depth: 8, helperVx: 6 })).toBe(false);
    expect(capFromPicture({ depth: 8, helperVx: 7 })).toBe(false);
  });

  it('uses image age as a persistence reserve without reading another state', () => {
    const same = { depth: 0.8, receiverVx: 6, helperVx: 4.5 };
    expect(capFromPicture({ ...same, age: 0.05 })).toBe(true);
    expect(capFromPicture({ ...same, age: 0.1 })).toBe(false);
  });

  it.each(['down', 'rising'] as const)('rejects an observed %s helper even with otherwise useful close motion', pose => {
    expect(capFromPicture({ depth: 2, helperVx: 6, lateral: 0.6, pose })).toBe(false);
  });

  it('retains geometry when historical pose is unknown', () => {
    const observer = { r: () => 1, mind: { judgment: () => 0, decisionInterval: 0.2 } } as unknown as Agent;
    const helper = {} as Agent;
    const seen: Perceived = { pos: { x: 42, y: 20 }, vel: { x: 6, y: 0 }, facing: 0, stance: null, pose: null, age: 0.05 };
    const rd = { r: {} as Agent, pos: { x: 40, y: 20 }, vel: { x: 6, y: 0 } } as ReceiverRead;
    const sim = { defense: [observer, helper], see: () => seen } as unknown as PlaySim;
    expect(hasVisibleCap(observer, sim, rd)).toBe(true);
  });
});

function delayedSetup(pose: 'up' | 'down' = 'up', far = false, near?: { depth: number; helperVx: number }) {
  const sim = new PlaySim({
    offense: pickOffense(generateTeam(new Rng(7), 'O', 'O'), '11'),
    defense: pickDefense(generateTeam(new Rng(19), 'D', 'D'), 'nickel'), seed: 3,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: '' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover4, pressure: null, label: '' },
    los: 40, ballY: 26, firstDownX: 50,
  });
  const a = sim.slot('FS')!, own = sim.slot('X')!, other = sim.slot('H')!, helper = sim.slot('CB_W')!;
  for (const player of sim.agents) {
    player.body.pos = { x: 40, y: 40 }; player.body.vel = { x: 0, y: 0 };
  }
  a.body.pos = { x: 52, y: 20 }; a.body.facing = Math.PI;
  own.body.pos = { x: 48, y: 20 }; own.body.vel = { x: far ? 6.386 : 6, y: 0 };
  other.body.pos = { x: 50, y: 25 }; other.body.vel = { x: 6, y: 0 };
  helper.body.pos = { x: far ? 56.245 : 48 + (near?.depth ?? 2), y: far ? 20.6158 : 20 };
  helper.body.vel = { x: far ? 1.887 : near?.helperVx ?? 6, y: far ? 0.406 : 0 };
  helper.body.support!.state = pose;
  const current = sim.agents.map(player => ({ ...player.pos }));
  // Linear histories make dead-reckoned position match the current geometry
  // despite different actual teammate and receiver sample ages.
  for (let i = 0; i < 24; i++) {
    const back = (23 - i) * sim.dt;
    sim.agents.forEach((player, j) => { player.body.pos = {
      x: current[j].x - player.vel.x * back, y: current[j].y - player.vel.y * back,
    }; });
    sim.perception.record(sim.agents);
  }
  const reader = new ReleaseReader(a, sim), mind = new CoverageJudgment();
  for (const t of [0.1, 0.3]) {
    sim.t = t; reader.read(sim, own); reader.read(sim, other);
  }
  sim.t = 1.15;
  const primary = { t: 'man' as const, r: own, opts: { overTop: true } };
  const choose = (judge = mind) => {
    const d = judge.decide(a, sim, reader, primary, true);
    return d.t === 'man' ? d.r : null;
  };
  const advance = () => {
    sim.t += sim.dt;
    for (const player of sim.agents) {
      player.body.pos.x += player.vel.x * sim.dt;
      player.body.pos.y += player.vel.y * sim.dt;
    }
    sim.perception.record(sim.agents);
  };
  return { sim, a, own, other, helper, reader, mind, choose, advance };
}

describe('projected roofs with ordinary delayed decisions', () => {
  it('retains a primary behind a disappearing shallow wall but can rescue behind co-moving help', () => {
    const disappearing = delayedSetup('up', false, { depth: 0.5, helperVx: 0 });
    expect(hasVisibleCap(disappearing.a, disappearing.sim,
      disappearing.reader.read(disappearing.sim, disappearing.own)!)).toBe(false);
    expect(disappearing.choose()).toBe(disappearing.own);
    expect(disappearing.mind.reason).toBe('rule');
    const coMoving = delayedSetup('up', false, { depth: 0.5, helperVx: 6 });
    expect(hasVisibleCap(coMoving.a, coMoving.sim, coMoving.reader.read(coMoving.sim, coMoving.own)!)).toBe(true);
    expect(coMoving.choose()).toBe(coMoving.other);
  });

  it('retains its primary when a coherent far picture does not establish a handoff', () => {
    const s = delayedSetup('up', true);
    const rd = s.reader.read(s.sim, s.own)!;
    const seen = s.sim.see(s.a, s.helper);
    expect(rd.release).toBe('vertical');
    expect(seen.pos.x - rd.pos.x).toBeCloseTo(8.245, 10);
    expect(hasVisibleCap(s.a, s.sim, rd)).toBe(false);
    expect(s.choose()).toBe(s.own);
    expect(s.mind.reason).toBe('rule');
  });

  it('can trust stale upright help, then waits for its ordinary decision before recovering its primary', () => {
    const s = delayedSetup(), deadline = s.sim.t + s.a.mind.decisionInterval;
    expect(s.choose()).toBe(s.other);
    s.helper.body.support!.state = 'down';
    s.advance();
    expect(s.sim.see(s.a, s.helper).pose).toBe('up');
    expect(s.choose(new CoverageJudgment())).toBe(s.other);
    s.advance();
    expect(s.sim.see(s.a, s.helper).pose).toBe('down');
    expect(hasVisibleCap(s.a, s.sim, s.reader.read(s.sim, s.own)!)).toBe(false);
    expect(s.sim.t).toBeLessThan(deadline);
    expect(s.choose()).toBe(s.other);
    while (s.sim.t < deadline) s.advance();
    expect(s.choose()).toBe(s.own);
  });

  it('requires observed recovery, preserving the stale-down and rising pictures', () => {
    const s = delayedSetup('down');
    expect(s.choose()).toBe(s.own);
    for (const state of ['rising', 'up'] as const) {
      s.helper.body.support!.state = state;
      s.advance();
      expect(s.sim.see(s.a, s.helper).pose).toBe(state === 'rising' ? 'down' : 'rising');
      expect(s.choose(new CoverageJudgment())).toBe(s.own);
      s.advance();
      expect(s.sim.see(s.a, s.helper).pose).toBe(state);
      expect(s.choose(new CoverageJudgment())).toBe(state === 'up' ? s.other : s.own);
    }
  });
});

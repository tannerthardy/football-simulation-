import { describe, expect, it, vi, afterAll } from 'vitest';
// engine-79 (pinned test-only, Rules + Coaching's coverage landing): c3_curl_flat / c3_seam / c2_hook read-release contracts are the pre-engine-79 rules (MATCH_DECLARE's declare phase and re-read; C2_APEX's taught vertical-curl apex). The file's owner to re-record with the rule on.
vi.hoisted(() => { process.env.MATCH_DECLARE = '0'; process.env.C2_APEX = '0'; });
afterAll(() => { delete process.env.MATCH_DECLARE; delete process.env.C2_APEX; });
import { Rng } from '../src/core/rng.js';
import { stepBody } from '../src/physics/kinematics.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { MatchRule } from '../src/playbook/types.js';
import { playBall, runFit, sawThrow } from '../src/sim/behaviors/defense.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(401), 'Release offense', 'RCO', { strength: .6 });
const defense = generateTeam(new Rng(402), 'Release defense', 'RCD', { strength: .6 });
const readRules = ['c3_curl_flat', 'c3_seam', 'q_apex'] as const;

/** Reduced installed #2 conflict. Only observations supplied here are
 * acquired; tests can independently advance/change the underlying reality.
 * No receiver route is executed and no catch/tackle outcome is imposed. */
function stage(rule: MatchRule = 'c3_curl_flat', flip = false) {
  const sim = new PlaySim({
    offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), seed: 41,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'release read' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3_match,
      pressure: null, zoneStyle: 'match', label: 'release read' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false,
  });
  const a = sim.slot('NB')!, r = sim.slot(sim.offAlign.numbering.W2!)!;
  const out = Math.sign(r.pos.y - sim.ballY) || 1;
  const startY = r.pos.y;
  a.body.pos = { x: 46, y: startY - out * .7 };
  a.body.vel = { x: 0, y: 0 }; a.body.facing = Math.PI;
  a.recog!.read = 'pass'; sim.t = .4;
  const pictures = new Map<number, Perceived>();
  for (const body of sim.agents) pictures.set(body.idx, {
    pos: { x: 32, y: 2 + body.idx * 2 }, vel: { x: 0, y: 0 },
    facing: 0, stance: null, pose: 'up', carrying: false, age: .2,
  });
  pictures.set(sim.qb.idx, { ...pictures.get(sim.qb.idx)!, pos: { ...sim.qb.pos } });
  pictures.set(r.idx, { pos: { x: 40, y: startY }, vel: { x: 0, y: 0 },
    facing: 0, stance: null, pose: 'up', carrying: false, age: .2 });
  sim.see = (_observer, target) => pictures.get(target.idx)!;
  const behavior = new CoverageDefender(a, sim, rule, rule === 'q_apex' ? 'hook_w' : 'curl_flat_w', 'match', 'B', -sim.offAlign.strongSign);
  a.behavior = behavior;
  const picture = (change: Partial<Perceived>) => pictures.set(r.idx, { ...pictures.get(r.idx)!, ...change });
  const update = (t = sim.t) => { sim.t = t; return behavior.update(a, sim); };
  return { sim, a, r, out, startY, pictures, behavior, picture, update };
}

function flight(f: ReturnType<typeof stage>, recognized: boolean) {
  f.sim.throwAt = recognized ? .01 : f.sim.t;
  f.sim.ball = { kind: 'air', flight: { pos: { x: 43, y: f.a.pos.y, z: 2 }, vel: { x: 20, y: 0, z: -1 }, drag: 0 },
    thrower: f.sim.qb, target: f.r, releaseT: f.sim.throwAt, releaseX: 35,
    intended: { x: f.a.pos.x - .2, y: f.a.pos.y, z: 1.2 }, arrivalT: f.sim.t + .1,
    deflected: false, throwaway: false }; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
  f.sim.ballPath = [{ t: f.sim.t + .1, x: f.a.pos.x - .2, y: f.a.pos.y, z: 1.2 }];
}

describe('installed release reads preserve cushion without claiming a declared route', () => {
  it.each(readRules)('%s holds its off-man cushion against a waiting upright #2', rule => {
    const f = stage(rule), command = f.update();
    expect(f.behavior.job).toBe(`read:${f.r.slot}`);
    expect(f.behavior.kind).toBe('zone');
    expect(f.behavior.zoneEyes).toBe(true);
    expect(f.behavior.recordedRule(f.sim.t).reads.find(rd => rd.target === f.r.idx)?.release).toBe('none');
    // Permit the ordinary small read step; exclude charging the shallow lane.
    expect(command.vel.x).toBeGreaterThanOrEqual(-.4);
    expect(command.facing).toBe(Math.PI);
    stepBody(f.a.body, command, .05);
    expect(f.a.pos.x - 40).toBeGreaterThan(5.9);
    expect(f.behavior.recordedMan()?.initialCushion).toBe(6);
  });

  it.each(readRules)('%s carries a seen forward stem before its matching depth', rule => {
    const f = stage(rule);
    f.picture({ pos: { x: 41, y: f.startY }, vel: { x: 6, y: 0 } });
    f.update(.4); // First evidence starts the ordinary confirmation period.
    const command = f.update(.6);
    expect(f.behavior.recordedRule(.6).reads.find(rd => rd.target === f.r.idx)?.release).toBe('vertical');
    expect(f.behavior.job).toBe(`read:${f.r.slot}`);
    expect(command.vel.x).toBeGreaterThan(0);
    stepBody(f.a.body, command, .05);
    expect(f.a.vel.x).toBeGreaterThan(0);
    expect(f.behavior.kind).toBe('zone');
  });

  it.each([false, true])('uses the acquired picture despite hidden route/body changes and advancing snapshots, mirror=%s', flip => {
    const reference = stage('c3_curl_flat', flip), changed = stage('c3_curl_flat', flip);
    changed.sim.offCall.pass = PASS_BY_ID.mesh;
    changed.r.behavior = { kind: 'receiver', update: () => ({ vel: { x: -8, y: 9 } }) };
    for (let k = 0; k < 8; k++) {
      changed.r.body.pos = { x: 70 + k, y: 4 + k };
      changed.r.body.vel = { x: -8, y: 9 - k };
      changed.r.body.facing = k * .5;
      reference.sim.perception.record(reference.sim.agents);
      changed.sim.perception.record(changed.sim.agents);
      const before = structuredClone(changed.sim.perception);
      const t = .4 + k * .05;
      expect(changed.update(t)).toEqual(reference.update(t));
      expect(changed.behavior.recordedMan()).toEqual(reference.behavior.recordedMan());
      expect(changed.behavior.recordedRule(t)).toEqual(reference.behavior.recordedRule(t));
      expect(changed.sim.perception).toEqual(before);
      expect(changed.sim.rng).toEqual(reference.sim.rng);
    }
  });

  it('responds to a newly acquired lateral release rather than its hidden continuation', () => {
    const inside = stage(), outside = stage();
    inside.update(); outside.update();
    inside.picture({ vel: { x: 1, y: -inside.out * 5 } });
    outside.picture({ vel: { x: 1, y: outside.out * 5 } });
    const inRequest = inside.update(.45), outRequest = outside.update(.45);
    // Both releases are still unconfirmed. Movement nevertheless responds to
    // the actual picture rather than waiting on a fixed persistence timer.
    expect(inside.behavior.job).toBe(`read:${inside.r.slot}`);
    expect(outside.behavior.job).toBe(`read:${outside.r.slot}`);
    expect(inRequest.vel.y * inside.out).toBeLessThan(0);
    expect(outRequest.vel.y * outside.out).toBeGreaterThan(0);
  });

  it.each(readRules)('%s takes its installed responsibility after acquired under, flat or blocking evidence', rule => {
    for (const declaration of ['under', 'flat', 'block'] as const) {
      const f = stage(rule);
      f.update();
      f.picture(declaration === 'block'
        ? { pos: { x: 40.5, y: f.startY }, vel: { x: 1, y: 0 }, stance: 'low' }
        : { pos: { x: 42, y: f.startY + (declaration === 'flat' ? f.out : -f.out) * 2 },
          vel: { x: 1, y: (declaration === 'flat' ? f.out : -f.out) * 5 } });
      f.update(.6); f.update(.8);
      expect(f.behavior.recordedRule(.8).reads.find(rd => rd.target === f.r.idx)?.release).toBe(declaration);
      if (rule === 'q_apex' && declaration === 'flat') {
        // Quarter-flat matches this route; Palms' corner-owned flat is a
        // separate installed relationship, checked in quarters-flat-wheel.
        expect(f.behavior.job).toBe(`man:${f.r.slot}`);
        expect(f.behavior.recordedMan()?.overTop).toBe(true);
      } else {
        expect(f.behavior.job.startsWith('zone:')).toBe(true);
        expect(f.behavior.recordedMan()).toBeUndefined();
      }
    }
  });

  it.each(['c3_curl_flat', 'c3_seam'] as const)('%s completes the same inside technique without resetting cushion or stem confidence', rule => {
    const f = stage(rule);
    f.update(.4);
    f.picture({ pos: { x: 41, y: f.startY }, vel: { x: 6, y: 0 } });
    f.update(.6); f.update(.8); f.update(1.4);
    const read = f.behavior.recordedMan()!;
    expect(f.behavior.job).toBe(`read:${f.r.slot}`);
    expect(read.initialCushion).toBe(6);
    expect(read.routeRead).toBe(true);
    f.picture({ pos: { x: 44, y: f.startY }, vel: { x: 6, y: 0 } });
    f.update(1.45);
    expect(f.behavior.job).toBe(`man:${f.r.slot}`);
    expect(f.behavior.kind).toBe('man');
    expect(f.behavior.recordedMan()?.initialCushion).toBe(read.initialCushion);
    expect(f.behavior.recordedMan()?.routeRead).toBe(true);
  });

  it.each(['c2_hook', 'invert_safety'] as const)('does not broaden the provisional read to %s', rule => {
    const f = stage(rule);
    f.update();
    expect(f.behavior.job.startsWith('zone:')).toBe(true);
    expect(f.behavior.recordedMan()).toBeUndefined();
  });
});

describe('release movement retains the existing zone/wall priority contract', () => {
  it.each(['insert', 'alley'] as const)('preserves installed %s support and releases it when run belief changes', kind => {
    const f = stage('q_apex'), expected = stage('q_apex');
    for (const x of [f, expected]) {
      x.a.runFit = { gap: 'B', side: -x.sim.offAlign.strongSign, kind, technique: 'attack', edge: 'box', pace: 'stack' };
      x.a.recog!.read = 'run';
    }
    expect(f.update()).toEqual(runFit(expected.a, expected.sim, 'B', -expected.sim.offAlign.strongSign));
    expect(f.behavior.kind).toBe('zone');
    expect(f.behavior.job).toBe(`read:${f.r.slot}`);
    const pass = stage('q_apex');
    f.a.recog!.read = 'pass';
    expect(f.update(.45)).toEqual(pass.update(.45));
    expect(f.a.runFit!.kind).toBe(kind);
  });

  it('keeps acquired release movement through unrecognized flight, then honors a reachable recognized ball contest', () => {
    const held = stage(), unrecognized = stage(), recognized = stage(), expected = stage();
    flight(unrecognized, false); flight(recognized, true); flight(expected, true);
    expect(sawThrow(unrecognized.a, unrecognized.sim, null)).toBe(false);
    expect(unrecognized.update()).toEqual(held.update());
    expect(unrecognized.behavior.kind).toBe('zone');
    expect(sawThrow(recognized.a, recognized.sim, null)).toBe(true);
    expect(recognized.update()).toEqual(playBall(expected.a, expected.sim, null));
    expect(recognized.a.tags.has('onBall')).toBe(true);
    expect(recognized.behavior.kind).toBe('zone');
  });

  it('gives a recognized throw priority over the established run belief', () => {
    const f = stage('q_apex'), expected = stage('q_apex');
    for (const x of [f, expected]) { x.a.recog!.read = 'run'; flight(x, true); }
    expect(sawThrow(f.a, f.sim, null)).toBe(true);
    expect(f.update()).toEqual(playBall(expected.a, expected.sim, null));
    expect(f.a.tags.has('onBall')).toBe(true);
  });
});

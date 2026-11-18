import { describe, expect, it, vi, afterAll } from 'vitest';
// engine-79 (pinned test-only, Rules + Coaching's coverage landing): the seam delivery and zone-off contracts are the pre-engine-79 rules (MATCH_DECLARE delivers by its own re-read; C2_APEX hands off on a seen cap). The file's owner to re-record with the rule on.
vi.hoisted(() => { process.env.MATCH_DECLARE = '0'; process.env.C2_APEX = '0'; });
afterAll(() => { delete process.env.MATCH_DECLARE; delete process.env.C2_APEX; });
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { MatchRule } from '../src/playbook/types.js';
import { playBall, sawThrow } from '../src/sim/behaviors/defense.js';
import { catchSpot } from '../src/sim/behaviors/receiver.js';
import { CoverageDefender } from '../src/sim/coverage/defender.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(501), 'Delivery offense', 'SDO', { strength: .6 });
const defense = generateTeam(new Rng(502), 'Delivery defense', 'SDD', { strength: .6 });

/** A continuous acquired vertical crossing the installed delivery depth.
 * Teammate pictures are independent of current bodies and private jobs. The
 * roof is the existing geometric estimate, never a confirmed assignment. */
function stage(rule: MatchRule = 'c3_curl_flat', flip = false) {
  const sim = new PlaySim({
    offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), seed: 51,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'seam delivery' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3_match,
      pressure: null, zoneStyle: 'match', label: 'seam delivery' },
    los: 40, ballY: 26, firstDownX: 50, audibles: false,
  });
  const a = sim.slot('NB')!, r = sim.slot(sim.offAlign.numbering.W2!)!, helper = sim.slot('FS')!;
  const y = r.pos.y, out = Math.sign(y - sim.ballY) || 1;
  a.body.pos = { x: 52, y: y - out * .7 }; a.body.vel = { x: 6, y: 0 }; a.body.facing = 0;
  a.recog!.read = 'pass';
  const pictures = new Map<number, Perceived>();
  for (const body of sim.agents) pictures.set(body.idx, { pos: { x: 32, y: 2 + body.idx * 2 },
    vel: { x: 0, y: 0 }, facing: 0, stance: null, age: .1, pose: 'up', carrying: false });
  pictures.set(sim.qb.idx, { ...pictures.get(sim.qb.idx)!, pos: { ...sim.qb.pos } });
  pictures.set(r.idx, { pos: { x: 48, y }, vel: { x: 6, y: 0 }, facing: 0,
    stance: null, age: .1, pose: 'up', carrying: false });
  sim.see = (_observer, target) => pictures.get(target.idx)!;
  const behavior = new CoverageDefender(a, sim, rule, 'curl_flat_w', 'match', 'B', -sim.offAlign.strongSign);
  a.behavior = behavior;
  const update = (t: number) => { sim.t = t; return behavior.update(a, sim); };
  const roof = (change: Partial<Perceived> = {}) => pictures.set(helper.idx, {
    pos: { x: 56, y }, vel: { x: 6, y: 0 }, facing: 0,
    stance: null, age: .1, pose: 'up', carrying: false, ...change,
  });
  const establish = () => { update(.5); update(.7); };
  const beyond = () => pictures.set(r.idx, { ...pictures.get(r.idx)!, pos: { x: 54, y } });
  return { sim, a, r, helper, y, out, pictures, behavior, update, roof, establish, beyond };
}

function retained(f: ReturnType<typeof stage>, t = .75) {
  f.beyond();
  const command = f.update(t);
  expect(f.behavior.job).toBe(`man:${f.r.slot}`);
  expect(f.behavior.kind).toBe('man');
  expect(f.behavior.recordedRule(t).mode).toBeNull();
  expect(command.vel.x).toBeGreaterThan(0);
  return command;
}

describe('an installed seam delivery needs a sustainable acquired roof', () => {
  it.each([false, true])('delivers to a co-moving visible roof after the installed depth, mirror=%s', flip => {
    const f = stage('c3_curl_flat', flip);
    f.roof(); f.establish();
    expect(f.behavior.job).toBe(`man:${f.r.slot}`);
    f.beyond(); f.update(.75);
    expect(f.behavior.recordedRule(.75).reads.find(rd => rd.target === f.r.idx)?.release).toBe('vertical');
    expect(f.behavior.recordedRule(.75).mode).toBe('zoned');
    expect(f.behavior.job).toBe('zone:curl_flat_w');
    expect(f.behavior.kind).toBe('zone');
  });

  it.each(['departing', 'down', 'rising', 'retreating'] as const)('retains the acquired seam when the apparent helper is %s', condition => {
    const f = stage();
    if (condition === 'departing') f.roof({ pos: { x: 56, y: f.y + f.out * 2 }, vel: { x: 6, y: f.out * 6 } });
    else if (condition === 'retreating') f.roof({ vel: { x: -2, y: 0 } });
    else f.roof({ pose: condition });
    f.establish();
    retained(f);
  });

  it('requires more reserve from an older closing picture than the same fresh geometry', () => {
    const fresh = stage(), old = stage();
    fresh.roof({ pos: { x: 57, y: fresh.y }, vel: { x: 1, y: 0 }, age: 0 });
    old.roof({ pos: { x: 57, y: old.y }, vel: { x: 1, y: 0 }, age: .65 });
    for (const f of [fresh, old]) { f.establish(); f.beyond(); }
    fresh.update(.75);
    expect(fresh.behavior.job).toBe('zone:curl_flat_w');
    retained(old);
  });

  it('keeps carrying without acquired help, then delivers when a fresh helpful picture arrives', () => {
    const f = stage();
    // A live helper happens to be in position. That is not an observation.
    f.helper.body.pos = { x: 56, y: f.y }; f.helper.body.vel = { x: 6, y: 0 };
    f.establish(); retained(f);
    f.roof(); f.update(.8);
    expect(f.behavior.job).toBe('zone:curl_flat_w');
    expect(f.behavior.recordedRule(.8).mode).toBe('zoned');
  });

  it.each([false, true])('keeps the same carry under hidden helper motion/jobs and advancing reality snapshots, mirror=%s', flip => {
    const reference = stage('c3_curl_flat', flip), changed = stage('c3_curl_flat', flip);
    for (const f of [reference, changed]) { f.establish(); f.beyond(); }
    for (let k = 0; k < 5; k++) {
      changed.helper.body.pos = { x: 56 + k, y: changed.y + k };
      changed.helper.body.vel = { x: 8 - k, y: -6 + k };
      changed.helper.behavior = { kind: k % 2 ? 'man' : 'rush', update: () => ({ vel: { x: -8, y: 5 } }) };
      reference.sim.perception.record(reference.sim.agents);
      changed.sim.perception.record(changed.sim.agents);
      const before = structuredClone(changed.sim.perception), t = .75 + k * .05;
      expect(changed.update(t)).toEqual(reference.update(t));
      expect(changed.behavior.job).toBe(`man:${changed.r.slot}`);
      expect(changed.behavior.recordedRule(t)).toEqual(reference.behavior.recordedRule(t));
      expect(changed.sim.perception).toEqual(before);
      expect(changed.sim.rng).toEqual(reference.sim.rng);
    }
  });

  it('does not consult a hidden private assignment to accept an otherwise valid acquired roof', () => {
    const reference = stage(), changed = stage();
    for (const f of [reference, changed]) { f.roof(); f.establish(); f.beyond(); }
    changed.helper.body.pos = { x: 31, y: 2 };
    changed.helper.body.vel = { x: -7, y: 4 };
    changed.helper.behavior = { kind: 'rush', update: () => ({ vel: { x: -7, y: 4 } }) };
    reference.sim.perception.record(reference.sim.agents);
    changed.sim.perception.record(changed.sim.agents);
    expect(changed.update(.75)).toEqual(reference.update(.75));
    expect(changed.behavior.job).toBe('zone:curl_flat_w');
    // The estimate may be mistaken. This contract asserts available geometry,
    // not that the teammate actually owns or will execute the assignment.
  });

  it.each(['under', 'flat'] as const)('keeps the existing zone-off decision for a genuinely acquired %s release', release => {
    const f = stage();
    f.pictures.set(f.r.idx, { ...f.pictures.get(f.r.idx)!, pos: { x: 42, y: f.y },
      vel: { x: 1, y: (release === 'flat' ? f.out : -f.out) * 5 } });
    f.establish();
    expect(f.behavior.recordedRule(.7).reads.find(rd => rd.target === f.r.idx)?.release).toBe(release);
    expect(f.behavior.job).toBe('zone:curl_flat_w');
    expect(f.behavior.recordedRule(.7).mode).toBe('zoned');
  });

  it('keeps the existing terminal delivery contract when acquired help later leaves', () => {
    const f = stage();
    f.roof(); f.establish(); f.beyond(); f.update(.75);
    f.roof({ pos: { x: 40, y: f.y + 10 }, vel: { x: -4, y: 5 }, pose: 'down' });
    f.update(1);
    expect(f.behavior.job).toBe('zone:curl_flat_w');
    expect(f.behavior.recordedRule(1).mode).toBe('zoned');
    expect(f.behavior.history.filter(h => h.job.startsWith('man:'))).toHaveLength(1);
  });

  it.each(['c3_seam', 'q_apex', 'c2_hook', 'invert_safety'] as const)('does not add the delivery condition to %s', rule => {
    const f = stage(rule);
    f.establish(); f.beyond(); f.update(.75);
    expect(f.behavior.job).toBe(rule === 'c3_seam' ? `man:${f.r.slot}` : 'zone:curl_flat_w');
    expect(f.behavior.recordedRule(.75).mode).toBe(rule === 'c3_seam' ? null : 'zoned');
  });

  it('preserves a reachable recognized ball contest even while the uncapped seam remains assigned', () => {
    const actual = stage(), expected = stage();
    for (const f of [actual, expected]) {
      f.establish(); retained(f);
      f.sim.t = 1.4; f.sim.throwAt = .1; f.a.tags.add('looking');
      f.sim.ball = { kind: 'air', flight: { pos: { x: f.a.pos.x, y: f.a.pos.y, z: 2 },
        vel: { x: 12, y: 0, z: -1 }, drag: 0 }, thrower: f.sim.qb, target: f.r,
        releaseT: .1, releaseX: 35, intended: { x: f.a.pos.x + .2, y: f.a.pos.y, z: 1.2 },
        arrivalT: 1.5, deflected: false, throwaway: false }; f.sim.throwSight.stageRelease(f.sim, f.sim.throwAt);
      f.sim.ballPath = [{ t: 1.5, x: f.a.pos.x + .2, y: f.a.pos.y, z: 1.2 }];
    }
    expect(sawThrow(actual.a, actual.sim, actual.r)).toBe(true);
    expect(catchSpot(actual.a, actual.sim)?.p).toEqual({ x: actual.a.pos.x + .2, y: actual.a.pos.y });
    expect(actual.update(1.4)).toEqual(playBall(expected.a, expected.sim, expected.r));
    expect(actual.a.tags.has('onBall')).toBe(true);
    expect(actual.behavior.job).toBe(`man:${actual.r.slot}`);
    expect(actual.behavior.recordedRule(1.4).mode).toBeNull();
  });
});

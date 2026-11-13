import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { SnapMind } from '../src/sim/mind.js';
import { PerceptionBuffer } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { FRONT_BY_ID, COVERAGE_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import { QBPass } from '../src/sim/behaviors/qb.js';

const home = generateTeam(new Rng(91), 'Home', 'HOM');
const away = generateTeam(new Rng(92), 'Away', 'AWY');
const p = away.roster.find((p) => p.position === 'LB')!;
function sim() {
  const formation = FORMATION_BY_ID.gun_doubles_11;
  return new PlaySim({ offense: pickOffense(home, '11'), defense: pickDefense(away, 'nickel'), seed: 45,
    offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.four_verts, label: 'verts' },
    // dropStart 'early': these scenes stage a pass read and test the drop's technique, not when it starts.
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', dropStart: 'early', label: 'c3' },
    los: 40, ballY: 26, firstDownX: 50 });
}

describe('coherent snap decisions', () => {
  it('is repeatable, varies by snap, and does not consume other random streams', () => {
    const rng = new Rng(11);
    const first = new SnapMind(p, rng.fork('mind'));
    rng.next();
    expect(new SnapMind(p, rng.fork('mind'))).toEqual(first);
    expect(new SnapMind(p, new Rng(12).fork('mind')).executionError).not.toBe(first.executionError);
    expect(first.judgment('LB')).toBe(first.judgment('LB'));
    expect(first.judgment('CB')).not.toBe(first.judgment('LB'));
  });

  it('loses focus under congestion/fatigue, then recovers without frame noise', () => {
    const mind = new SnapMind(p, new Rng(1));
    const fresh = mind.focus;
    for (let i = 0; i < 20; i++) mind.update(2 + i * 0.05, 0.05, 0.4, 1);
    const loaded = mind.focus;
    expect(loaded).toBeLessThan(fresh);
    expect(mind.observationDelay(0.2)).toBeGreaterThan(0.2);
    const precision = Math.abs(mind.placementError);
    for (let i = 0; i < 40; i++) mind.update(4 + i * 0.05, 0.05, 1, 0);
    expect(mind.focus).toBeGreaterThan(loaded);
    expect(Math.abs(mind.placementError)).toBeLessThan(precision);
  });

  it('holds an action briefly instead of chasing each new cue instantly', () => {
    const mind = new SnapMind(p, new Rng(4));
    expect(mind.aim('fit', { x: 1, y: 2 }, 0)).toEqual({ x: 1, y: 2 });
    expect(mind.aim('fit', { x: 1, y: -3 }, 0.01)).toEqual({ x: 1, y: 2 });
    expect(mind.aim('fit', { x: 1, y: -3 }, 1)).toEqual({ x: 1, y: -3 });
  });

  it('discipline moderates aggressive commitment and alignment scatter', () => {
    let disciplined = 0;
    let loose = 0;
    let errorD = 0;
    let errorL = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const d = new SnapMind({ ...p, ratings: { ...p.ratings, discipline: 99 } }, new Rng(seed));
      const l = new SnapMind({ ...p, ratings: { ...p.ratings, discipline: 20 } }, new Rng(seed));
      disciplined += d.urgency;
      loose += l.urgency;
      errorD += Math.abs(d.alignmentError);
      errorL += Math.abs(l.alignmentError);
    }
    expect(loose / 100).toBeGreaterThan(disciplined / 100 + 0.15);
    expect(errorL).toBeGreaterThan(errorD);
  });
});

describe('observations and dynamic recovery', () => {
  it('snapshots visible pad level rather than reading the current stance', () => {
    const buffer = new PerceptionBuffer(1, 0.05);
    const state = { pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 }, stance: 'high' as 'high' | 'low', facing: 0 };
    buffer.record([state]);
    state.stance = 'low';
    state.facing = Math.PI;
    buffer.record([state]);
    expect(buffer.perceive(0, 0.05).stance).toBe('high');
    expect(buffer.perceive(0, 0.05).facing).toBe(0);
    expect(buffer.perceive(0, 0).stance).toBe('low');
    expect(buffer.perceive(0, 0).facing).toBe(Math.PI);
  });

  it('attention latency depends on belief, not the hidden offensive call', () => {
    const s = sim();
    const d = s.defense[0];
    const target = s.slot('X')!;
    for (let i = 0; i < 12; i++) {
      target.body.pos.x += 0.1;
      s.perception.record(s.agents);
    }
    d.recog!.read = 'run';
    s.isPass = true;
    const pass = s.see(d, target);
    s.isPass = false;
    expect(s.see(d, target)).toEqual(pass);
  });

  it('a match defender can hesitate at an exchange and recover, retaining the called technique', () => {
    const s = sim();
    const d = s.defense.find((a) => a.behavior instanceof ZoneCoverage && a.behavior.zone.startsWith('hook'))!;
    const coverage = d.behavior as ZoneCoverage;
    for (const r of s.offense.filter((a) => a.behavior.kind === 'route')) {
      r.body.pos = { x: 45, y: d.pos.y };
      r.body.vel = { x: 5, y: 0 };
    }
    for (let i = 0; i < 20; i++) s.perception.record(s.agents);
    s.t = 1;
    // He has read pass and is in his drop: an undecided box backer stands and reads instead.
    d.recog!.read = 'pass';
    d.mind.focus = 0.25;
    coverage.update(d, s);
    expect(d.tags.has('match-hesitation')).toBe(true);
    expect(coverage.style).toBe('match');
    d.mind.focus = 1;
    s.t = 1.5;
    coverage.update(d, s);
    expect(coverage.target).not.toBeNull();
    expect(coverage.style).toBe('match');
  });

  it('evaluating the same throw twice gives the same judgment without rerolling window risk', () => {
    const s = sim();
    const qb = s.qb;
    const passer = qb.behavior as unknown as { evaluate(a: typeof qb, sim: PlaySim, target: typeof qb, urgency: number): unknown };
    expect(qb.behavior).toBeInstanceOf(QBPass);
    s.t = 2;
    const r = s.offense.find((a) => a.behavior.kind === 'route')!;
    const first = passer.evaluate(qb, s, r, 0);
    expect(first).not.toBeNull();
    expect(passer.evaluate(qb, s, r, 0)).toEqual(first);
  });
});

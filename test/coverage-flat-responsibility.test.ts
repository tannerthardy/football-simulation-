import { describe, expect, it } from 'vitest';
import { CENTER_Y, FIELD_WIDTH } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import { ZoneCoverage } from '../src/sim/behaviors/defense.js';
import type { Perceived } from '../src/sim/perception.js';
import { PlaySim } from '../src/sim/playsim.js';

const offense = generateTeam(new Rng(41), 'Awareness offense', 'AOF', { strength: .55 });
const defense = generateTeam(new Rng(42), 'Awareness defense', 'ADF', { strength: .55 });

/** A retained native conflict at 1.70 s, reduced to the already-acquired
 * pictures and current defender body. Bodies behind those pictures deliberately
 * differ: a controller must use the consumed flat, not the hidden called route. */
function conflict(flip = false, style: 'match' | 'spot' = 'match') {
  const sim = new PlaySim({ offense: pickOffense(offense, '11'), defense: pickDefense(defense, 'nickel'), seed: 3,
    offCall: { formation: FORMATION_BY_ID.gun_doubles_11, flip, kind: 'pass', pass: PASS_BY_ID.curl_flat, label: 'flat conflict' },
    defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: style, label: 'Over Cover3' },
    los: 40, ballY: CENTER_Y, firstDownX: 50, audibles: false, record: true, recordLevel: 'full', recordEvery: 1 });
  const d = sim.slot('NB')!, b = d.behavior as ZoneCoverage;
  const y = (n: number) => flip ? FIELD_WIDTH - n : n;
  const sign = flip ? -1 : 1;
  d.body.pos = { x: 42.307393031340574, y: y(36.10219408555769) };
  d.body.vel = { x: -.773, y: sign * 3.26 };
  d.recog!.read = 'pass'; sim.t = 1.70;
  const one = sim.slot(sim.offAlign.numbering.W1!)!, two = sim.slot(sim.offAlign.numbering.W2!)!;
  // Generic zone scoring also consumes the legacy authoritative QB-eyes ID.
  // Retain that native state here; this repair does not replace that shortcut.
  sim.qbEyes = one; sim.qb.body.pos = { x: 32.319106168438815, y: CENTER_Y };
  const pictures = new Map<number, Perceived>();
  for (const a of sim.agents) pictures.set(a.idx, { pos: { x: 35, y: CENTER_Y }, vel: { x: 0, y: 0 },
    facing: 0, age: .25, stance: null, pose: 'up', carrying: false });
  pictures.set(one.idx, { pos: { x: 45.53782982981703, y: y(44.66666666666667) },
    vel: { x: 5.7115573051021515, y: 0 }, facing: 0, age: .25, stance: null, pose: 'up', carrying: false });
  pictures.set(two.idx, { pos: { x: 42.68824010332392, y: y(38.81006693433198) },
    vel: { x: 2.921031159527994, y: sign * 3.9250964748920185 }, facing: sign * 1.7808880264828335,
    age: .25, stance: null, pose: 'up', carrying: false });
  sim.see = (_observer, target) => pictures.get(target.idx)!;
  const expanded = () => sim.trace.data!.decisions.some(r => r.kind === 'coverage-flat-expand');
  return { sim, d, b, one, two, pictures, sign, y, expanded };
}

describe('a curl-flat player resolves the visible two-receiver conflict', () => {
  it.each([false, true])('widens with acquired #2 instead of duplicating #1, mirror=%s', flip => {
    const { sim, d, b, one, two, sign, expanded } = conflict(flip);
    const beforeRng = { ...sim.rng };
    const command = b.update(d, sim);
    expect(b.target?.idx).toBe(two.idx);
    expect(b.target?.idx).not.toBe(one.idx);
    expect(sign * command.vel.y).toBeGreaterThan(Math.abs(command.vel.x));
    expect(sign * Math.sin(command.facing!)).toBeGreaterThan(.5);
    expect(Math.hypot(command.vel.x, command.vel.y)).toBeLessThanOrEqual(d.profile.vmax);
    expect(expanded()).toBe(true);
    expect({ ...sim.rng }).toEqual(beforeRng);
  });

  it('uses the same acquired flat despite hidden routes, live bodies and ball holder changing', () => {
    const original = conflict(), changed = conflict();
    changed.sim.offCall.pass = PASS_BY_ID.four_verts;
    changed.sim.isPass = false;
    changed.two.body.pos = { x: 70, y: 4 };
    changed.two.body.vel = { x: 8, y: -6 };
    changed.sim.ball = { kind: 'held', carrier: changed.sim.slot('RB')! };
    const originalCommand = original.b.update(original.d, original.sim);
    const changedCommand = changed.b.update(changed.d, changed.sim);
    expect(changedCommand).toEqual(originalCommand);
    expect(changed.b.target?.idx).toBe(changed.two.idx);
  });

  it('can maintain the flat after the receiver visibly settles outside the landmark', () => {
    const { sim, d, b, two, pictures, expanded } = conflict();
    pictures.set(two.idx, { ...pictures.get(two.idx)!, pos: { x: 44, y: 44 }, vel: { x: 0, y: 0 } });
    b.update(d, sim);
    expect(b.target?.idx).toBe(two.idx);
    expect(expanded()).toBe(true);
  });

  it('waits for its own pass belief even when an outside cue is available', () => {
    const { sim, d, b, one, expanded } = conflict();
    d.recog!.read = 'unsure';
    b.update(d, sim);
    expect(b.target?.idx).toBe(one.idx);
    expect(expanded()).toBe(false);
  });

  it('does not exchange its run responsibility for a pass flat after a mistaken run read', () => {
    const { sim, d, b, expanded } = conflict();
    d.recog!.read = 'run';
    b.update(d, sim);
    expect(expanded()).toBe(false);
  });

  it('does not steal the curl while #2 remains inside its visible curl landmark', () => {
    const { sim, d, b, one, two, pictures, expanded } = conflict();
    pictures.set(two.idx, { ...pictures.get(two.idx)!, pos: { x: 42.69, y: 37 } });
    b.update(d, sim);
    expect(b.target?.idx).toBe(one.idx);
    expect(expanded()).toBe(false);
  });

  it('retains the ordinary #2 seam carry instead of anticipating an unseen flat', () => {
    const { sim, d, b, two, pictures, expanded } = conflict();
    pictures.set(two.idx, { ...pictures.get(two.idx)!, pos: { x: 46, y: 39 }, vel: { x: 6, y: 0 }, facing: 0 });
    b.update(d, sim);
    expect(b.target?.idx).toBe(two.idx);
    expect(expanded()).toBe(false);
  });

  it('does not turn a deep #2 out into a shallow-flat replacement', () => {
    const { sim, d, b, two, pictures, expanded } = conflict();
    pictures.set(two.idx, { ...pictures.get(two.idx)!, pos: { x: 50, y: 42 }, vel: { x: 0, y: 5 } });
    b.update(d, sim);
    expect(expanded()).toBe(false);
  });

  it('leaves a three-receiver exchange to its installed coverage rules', () => {
    const { sim, d, b, one, expanded } = conflict();
    sim.offAlign.numbering.W3 = 'Y';
    b.update(d, sim);
    expect(b.target?.idx).toBe(one.idx);
    expect(expanded()).toBe(false);
  });

  it('retains its ordinary choice with an acquired Fast-3 back release', () => {
    const { sim, d, b, one, pictures, expanded } = conflict();
    const back = sim.slot('RB')!;
    pictures.set(back.idx, { pos: { x: 42, y: 36 }, vel: { x: 1, y: 4 }, facing: 1, stance: null, age: .25, pose: 'up' });
    b.update(d, sim);
    expect(b.target?.idx).toBe(one.idx);
    expect(expanded()).toBe(false);
  });

  it('does not give a spot dropper a new pattern-match responsibility', () => {
    const { sim, d, b, expanded } = conflict(false, 'spot');
    b.update(d, sim);
    expect(expanded()).toBe(false);
  });

  it('does not observe the current hidden flat before it enters the historical picture', () => {
    const { sim, d, b, one, two, pictures, expanded } = conflict();
    two.body.pos = { x: 43, y: 50 }; two.body.vel = { x: 0, y: 6 };
    pictures.set(two.idx, { ...pictures.get(two.idx)!, pos: { x: 39, y: 35 }, vel: { x: 0, y: 0 } });
    b.update(d, sim);
    expect(b.target?.idx).toBe(one.idx);
    expect(expanded()).toBe(false);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';
import { CoverageScouting } from '../src/sim/qbmind.js';
import { Recognition, ScoutingReport, gameSense, leaguePassLogOdds, type SnapContext } from '../src/sim/recognition.js';
import type { Perceived } from '../src/sim/perception.js';

const home = generateTeam(new Rng(31), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(new Rng(32), 'Away', 'AWY', { strength: 0.6 });
const formation = FORMATION_BY_ID.ace_12;
const offense = pickOffense(home, formation.personnel);
const defense = pickDefense(away, 'base43');
const defCall: DefensivePlayCall = { personnel: 'base43', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'c3' };

const ctx = (over: Partial<SnapContext> = {}): SnapContext => ({ down: 1, distance: 10, yardline: 35, personnel: '12', qb: 'under', empty: false, hurry: false, ...over });

describe('expectations and learning', () => {
  it('league expectations follow situation and look', () => {
    expect(leaguePassLogOdds(ctx({ down: 3, distance: 10 }))).toBeGreaterThan(leaguePassLogOdds(ctx()) + 1.5);
    expect(leaguePassLogOdds(ctx({ personnel: '11', qb: 'gun', empty: true }))).toBeGreaterThan(leaguePassLogOdds(ctx()) + 1.5);
  });

  it('a scouting report learns tendencies gradually', () => {
    const report = new ScoutingReport();
    const look = ctx();
    const base = report.passLogOdds(look);
    for (let i = 0; i < 3; i++) report.observe(look, false);
    const few = report.passLogOdds(look);
    for (let i = 0; i < 27; i++) report.observe(look, i % 9 === 0);
    const many = report.passLogOdds(look);
    expect(few).toBeLessThan(base);
    expect(base - few).toBeLessThan(0.8);
    expect(many).toBeLessThan(few - 0.5);
  });

  it('game sense grows with recognition, awareness and experience', () => {
    const p = home.roster.find((x) => x.position === 'LB')!;
    const sharp = { ...p, experience: 10, ratings: { ...p.ratings, playRecognition: 95, awareness: 92 } };
    const raw = { ...p, experience: 0, ratings: { ...p.ratings, playRecognition: 40, awareness: 40 } };
    expect(gameSense(sharp)).toBeGreaterThan(gameSense(raw) + 0.4);
  });

  it('an offense learns a defense’s coverage mix and disguise rate', () => {
    const scout = new CoverageScouting();
    const base = scout.frequencies().cover1;
    const call: DefensivePlayCall = { ...defCall, coverage: COVERAGE_BY_ID.cover1, shown: COVERAGE_BY_ID.cover4 };
    for (let i = 0; i < 20; i++) scout.observe(call);
    expect(scout.frequencies().cover1).toBeGreaterThan(base + 0.3);
    expect(scout.disguiseRate()).toBeGreaterThan(0.5);
  });
});

describe('receiver blocking evidence', () => {
  function pictureRead(kind: 'slow' | 'low-pads' | 'contact', hidden = false) {
    const sim = new PlaySim({ offense, defense,
      offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID.hitches, label: 'picture' },
      defCall, los: 40, ballY: HASH_LEFT_Y, firstDownX: 50, seed: 77 });
    const d = sim.slot('CB_W')!, wr = sim.slot('X')!;
    d.body.pos = { x: 42, y: 6 };
    const pictures = new Map(sim.offense.map(o => [o, {
      pos: { x: sim.snapX[o.idx], y: 25 }, vel: { x: 0, y: 0 },
      stance: null, facing: 0, age: .25,
    } as Perceived]));
    pictures.set(sim.qb, { pos: { x: 36.4, y: 25 }, vel: { x: 0, y: 0 }, stance: null, facing: 0 });
    pictures.set(wr, { pos: { x: kind === 'contact' ? 41.4 : 39, y: 6 },
      vel: { x: kind === 'low-pads' ? 1 : 0, y: 0 },
      stance: kind === 'low-pads' ? 'low' : null, facing: 0, age: .25 });
    for (const o of sim.offense) if (o !== wr && o !== sim.qb) pictures.get(o)!.pos.y = 35;
    vi.spyOn(sim, 'see').mockImplementation((_a, target) => {
      const p = pictures.get(target);
      if (!p) throw Error('Receiver recognition must not query remote teammate contact');
      return structuredClone(p);
    });
    if (hidden) {
      wr.body.pos = { x: 80, y: 40 }; wr.body.vel = { x: 9, y: -2 }; wr.stance = 'low';
      for (const other of sim.defense) if (other !== d) other.body.pos = { x: 39, y: 6 };
      sim.offCall = { ...sim.offCall, kind: 'run', pass: undefined, run: RUN_BY_ID.oz_strong };
    }
    const recognition = new Recognition(d, sim, 0);
    for (let k = 0; k < 14; k++) { sim.t = .7 + k * sim.dt; recognition.update(d, sim); }
    return { read: recognition.read, probability: recognition.pPass() };
  }
  it('does not declare run from a nearby slow upright receiver', () => {
    expect(pictureRead('slow').read).not.toBe('run');
  });
  it.each(['low-pads', 'contact'] as const)('retains observable blocking evidence: %s', kind => {
    expect(pictureRead(kind).read).toBe('run');
    expect(pictureRead(kind).probability).toBeLessThan(pictureRead('slow').probability);
  });
  it.each(['slow', 'low-pads', 'contact'] as const)('uses the acquired picture, independent of hidden call/motion: %s', kind => {
    expect(pictureRead(kind, true)).toEqual(pictureRead(kind));
  });
});

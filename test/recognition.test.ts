import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';
import { CoverageScouting } from '../src/sim/qbmind.js';
import { ScoutingReport, gameSense, leaguePassLogOdds, type SnapContext } from '../src/sim/recognition.js';

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

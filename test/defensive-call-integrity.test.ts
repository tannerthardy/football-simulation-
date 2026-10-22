import { describe, expect, it } from 'vitest';
import { HASH_LEFT_Y, HASH_RIGHT_Y, yardlineToX } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { DefensiveCoordinator, type Situation } from '../src/game/playcaller.js';
import { generateTeam, pickOffense, type CoverageSystem, type DefScheme } from '../src/league/team.js';
import { alignDefense, alignOffense, isDeepZone } from '../src/playbook/alignment.js';
import { coverageHasDeepSupport, coverageHasNamedZonePlayers, pressureIsInstallable } from '../src/playbook/call-integrity.js';
import { installCoverage } from '../src/playbook/coverages.js';
import { COVERAGE_BY_ID, COVERAGES, FRONT_BY_ID, FRONTS, PRESSURE_BY_ID, PRESSURES } from '../src/playbook/defense.js';
import { FORMATION_BY_ID, FORMATIONS } from '../src/playbook/formations.js';
import { DEF_PERSONNEL, type Coverage, type DefPersonnelId, type DefSlot, type DefensivePlayCall, type Pressure } from '../src/playbook/types.js';

const present = (personnel: DefPersonnelId) => Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[];
const off = alignOffense(FORMATION_BY_ID.gun_doubles_11, false, 50, HASH_LEFT_Y);

function ledger(personnel: DefPersonnelId, frontId: string, coverageId: string, pressure: Pressure | null) {
  return alignDefense({ personnel, front: FRONT_BY_ID[frontId], coverage: COVERAGE_BY_ID[coverageId], pressure, label: 'installation test' }, off, present(personnel));
}

/** Compare the installed jobs, not just the helper's own eligibility result. */
function expectRequiredRoof(coverage: Coverage, jobs: ReturnType<typeof alignDefense>): void {
  const actual = new Set(Object.values(jobs.spots).flatMap((spot) => spot?.role.kind === 'zone' && isDeepZone(spot.role.zone) ? [spot.role.zone] : []));
  for (const role of Object.values(coverage.roles)) {
    if (role?.kind === 'zone' && isDeepZone(role.zone)) expect(actual.has(role.zone), `${coverage.id}: missing ${role.zone}`).toBe(true);
  }
}

describe('automatic defensive call installation guards', () => {
  it('distinguishes a surviving roof from a missing named goal-line underneath player', () => {
    for (const id of ['cover1', 'cover1_off', 'cover1_robber', 'cover2man', 'cover3', 'cover3_cloud', 'cover2', 'tampa2', 'cover4', 'cover6']) {
      expect(coverageHasDeepSupport('goalline', COVERAGE_BY_ID[id]), id).toBe(false);
    }
    for (const id of ['cover0', 'cover9', 'cover2_invert']) {
      expect(coverageHasDeepSupport('goalline', COVERAGE_BY_ID[id]), id).toBe(true);
      expectRequiredRoof(COVERAGE_BY_ID[id], ledger('goalline', 'bear', id, null));
    }
    expect(coverageHasNamedZonePlayers('goalline', COVERAGE_BY_ID.cover0)).toBe(true);
    for (const id of ['cover9', 'cover2_invert']) {
      expect(coverageHasNamedZonePlayers('goalline', COVERAGE_BY_ID[id]), id).toBe(false);
    }
    // Deep-only checks certify the roof, but are insufficient to approve the
    // absent FS's separately named weak flat in Cover 9/inverted 2.
    expect(ledger('goalline', 'bear', 'cover9', null).spots.FS).toBeUndefined();
  });

  it('rejects fire-zone rotations whose SS owns an essential deep responsibility', () => {
    for (const id of ['cover3_cloud', 'cover9']) {
      expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID[id], PRESSURE_BY_ID.fire_zone), id).toBe(false);
      const broken = ledger('nickel', 'over', id, PRESSURE_BY_ID.fire_zone);
      const missing = id === 'cover9' ? 'deep_mid' : 'deep_third_s';
      expect(Object.values(broken.spots).some((spot) => spot?.role.kind === 'zone' && spot.role.zone === missing)).toBe(false);
    }
  });

  it('retains ordinary nickel fire zones with five rushers and their called deep help', () => {
    for (const id of ['cover3', 'cover3_match', 'cover3_seam', 'cover3_buzz']) {
      expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID[id], PRESSURE_BY_ID.fire_zone), id).toBe(true);
      const installed = ledger('nickel', 'over', id, PRESSURE_BY_ID.fire_zone);
      expect(installed.rushers).toHaveLength(5);
      expect(Object.values(installed.spots).filter((spot) => spot?.role.kind === 'zone' && !isDeepZone(spot.role.zone))).toHaveLength(3);
      expectRequiredRoof(COVERAGE_BY_ID[id], installed);
    }
  });

  it('allows an explicit deep replacement instead of treating every SS blitz as impossible', () => {
    const replacement: Pressure = { ...PRESSURE_BY_ID.fire_zone, id: 'replacement_probe', droppers: { DE_W: 'deep_mid' } };
    expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID.cover9, replacement)).toBe(true);
    expectRequiredRoof(COVERAGE_BY_ID.cover9, ledger('nickel', 'over', 'cover9', replacement));
  });

  it('rejects the six-rusher odd and on-line-Sam variants of the stock five-man fire zone', () => {
    for (const [personnel, front] of [['base34', 'odd'], ['base34', 'tite'], ['base43', 'under']] as const) {
      const oldInstall = ledger(personnel, front, 'cover3', PRESSURE_BY_ID.fire_zone);
      expect(oldInstall.rushers).toHaveLength(6);
      expect(pressureIsInstallable(personnel, FRONT_BY_ID[front], COVERAGE_BY_ID.cover3, PRESSURE_BY_ID.fire_zone)).toBe(false);
    }
    expect(pressureIsInstallable('nickel', FRONT_BY_ID.under, COVERAGE_BY_ID.cover3, PRESSURE_BY_ID.fire_zone)).toBe(true);
    expect(ledger('nickel', 'under', 'cover3', PRESSURE_BY_ID.fire_zone).rushers).toHaveLength(5);
  });

  it('keeps existing man marker and uncalled-edge allocation on odd and Bear fronts', () => {
    for (const [personnel, front, coverage, pressure] of [
      ['base34', 'odd', 'cover1', 'mike_a'], ['base34', 'tite', 'cover0', 'zero_6'], ['goalline', 'bear', 'cover0', 'zero_6'],
    ] as const) {
      expect(pressureIsInstallable(personnel, FRONT_BY_ID[front], COVERAGE_BY_ID[coverage], PRESSURE_BY_ID[pressure])).toBe(true);
      const installed = ledger(personnel, front, coverage, PRESSURE_BY_ID[pressure]);
      expect(installed.rushers).toHaveLength(coverage === 'cover1' ? 5 : 6);
      const targets = new Set(Object.values(installed.spots).flatMap((spot) => spot?.manTarget ? [spot.manTarget] : []));
      for (const receiver of Object.keys(off.refOf)) expect(targets.has(receiver as keyof typeof off.refOf)).toBe(true);
      expectRequiredRoof(COVERAGE_BY_ID[coverage], installed);
    }
  });

  it('rejects missing pressure participants rather than silently converting a six-man call', () => {
    expect(pressureIsInstallable('dime', FRONT_BY_ID.over, COVERAGE_BY_ID.cover0, PRESSURE_BY_ID.zero_6)).toBe(false);
    expect(pressureIsInstallable('dime', FRONT_BY_ID.over, COVERAGE_BY_ID.cover0, PRESSURE_BY_ID.mike_a)).toBe(true);
    const missingDrop: Pressure = { ...PRESSURE_BY_ID.mike_a, droppers: { NT: 'hook_mid' } };
    expect(pressureIsInstallable('nickel', FRONT_BY_ID.over, COVERAGE_BY_ID.cover1, missingDrop)).toBe(false);
    expect(pressureIsInstallable('goalline', FRONT_BY_ID.bear, COVERAGE_BY_ID.cover9, PRESSURE_BY_ID.mike_a)).toBe(false);
  });

  it('checks accepted catalog pressures against the real installer across every compatible front', () => {
    let checked = 0;
    for (const front of FRONTS) for (const personnel of front.personnel) for (const coverage of COVERAGES) for (const pressure of PRESSURES) {
      if (!pressureIsInstallable(personnel, front, coverage, pressure)) continue;
      const jobs = ledger(personnel, front.id, coverage.id, pressure);
      expectRequiredRoof(coverage, jobs);
      if (pressure.id === 'fire_zone') expect(jobs.rushers).toHaveLength(5);
      if (coverage.man) {
        const targets = new Set(Object.values(jobs.spots).flatMap((spot) => spot?.manTarget ? [spot.manTarget] : []));
        for (const receiver of Object.keys(off.refOf)) expect(targets.has(receiver as keyof typeof off.refOf), `${personnel}/${front.id}/${coverage.id}/${pressure.id}`).toBe(true);
      }
      checked++;
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('automatic callers preserve resolved deep jobs and actual pressure participants across situations and coaching trees', () => {
    const schemes: DefScheme[] = ['4-3', '3-4', 'nickel-heavy'];
    const trees: CoverageSystem[] = ['single-high', 'quarters', 'two-high', 'tampa', 'pressure-man'];
    const situations: Situation[] = [
      { down: 1, distance: 10, yardline: 35, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false },
      { down: 3, distance: 27, yardline: 20, quarter: 2, clock: 30, scoreDiff: -14, ballY: HASH_RIGHT_Y, hurry: true },
      { down: 3, distance: 5, yardline: 85, quarter: 4, clock: 100, scoreDiff: 10, ballY: HASH_LEFT_Y, hurry: false },
      { down: 1, distance: 1, yardline: 99, quarter: 4, clock: 45, scoreDiff: -7, ballY: HASH_RIGHT_Y, hurry: true },
    ];
    const offense = generateTeam(new Rng(901), 'Offense', 'OFF', { strength: .55 });
    const seen = new Set<DefPersonnelId>();
    const goalCalls = new Set<string>();
    let checked = 0;
    let fireZones = 0;
    let checkedTrips = 0;
    let zeusCalls = 0;
    let dimeZero = 0;
    for (const scheme of schemes) {
      const defense = generateTeam(new Rng(`defense:${scheme}`), 'Defense', 'DEF', { strength: .55, defScheme: scheme });
      for (const tree of trees) for (const formation of FORMATIONS) for (const s of situations) for (let seed = 0; seed < 4; seed++) {
        const team = { ...defense, coach: { ...defense.coach, coverageSystem: tree, blitzRate: .8, disguise: .9, shadow: true } };
        const coordinator = new DefensiveCoordinator(team, new Rng(`${scheme}:${tree}:${formation.id}:${s.yardline}:${seed}`));
        const selection = coordinator.call(s, formation.personnel, offense, pickOffense(offense, formation.personnel));
        const call = selection.call;
        seen.add(call.personnel);
        if (call.personnel === 'goalline') goalCalls.add(call.coverage.id);
        const aligned = alignOffense(formation, !!(seed % 2), yardlineToX(s.yardline), s.ballY);
        // The production constructor currently resolves Zeus OR a formation
        // check. Preserve that behavior while auditing its resulting roof.
        const installed: DefensivePlayCall = installCoverage(call, aligned);
        if (call.zeus) zeusCalls++;
        if (installed.check) checkedTrips++;
        const jobs = alignDefense(installed, aligned, present(call.personnel), selection.prefs);
        expectRequiredRoof(installed.coverage, jobs);
        if (call.shown) expectRequiredRoof(call.shown, alignDefense({ ...call, coverage: call.shown, pressure: null, shown: undefined }, aligned, present(call.personnel)));
        if (call.pressure) {
          for (const slot of [...Object.keys(call.pressure.blitzers), ...Object.keys(call.pressure.droppers ?? {})]) {
            expect(DEF_PERSONNEL[call.personnel][slot as DefSlot], `${call.personnel}: ${call.pressure.id}/${slot}`).toBeTruthy();
          }
          if (call.pressure.id === 'fire_zone') { expect(jobs.rushers).toHaveLength(5); fireZones++; }
        }
        if (call.coverage.id === 'cover0' && call.personnel === 'dime') {
          expect(call.pressure?.id).toBe('mike_a');
          dimeZero++;
        }
        if (installed.coverage.man) {
          const targets = new Set(Object.values(jobs.spots).flatMap((spot) => spot?.manTarget ? [spot.manTarget] : []));
          for (const receiver of Object.keys(aligned.refOf)) expect(targets.has(receiver as keyof typeof aligned.refOf)).toBe(true);
        }
        checked++;
      }
    }
    expect(checked).toBe(schemes.length * trees.length * FORMATIONS.length * situations.length * 4);
    expect(seen.size).toBe(5);
    expect([...goalCalls]).toEqual(['cover0']);
    expect(fireZones).toBeGreaterThan(0);
    expect(checkedTrips).toBeGreaterThan(0);
    expect(zeusCalls).toBeGreaterThan(0);
    expect(dimeZero).toBeGreaterThan(0);
  });
});

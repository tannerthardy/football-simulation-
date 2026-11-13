/**
 * Static automatic-caller installation audit, not a play-outcome experiment.
 *
 * Run the same file from either repository root; it imports no new guards:
 * node --import tsx scripts/diag/defensive-installation.ts [report.json] [expected-source-prefix]
 *
 * The installer resolves Zeus OR a formation check, exactly as PlaySim does.
 * Named underneath-player debt is reported separately from roof/pressure
 * defects: passing this audit is not proof of complete coverage legality.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import { HASH_LEFT_Y, HASH_RIGHT_Y, yardlineToX } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { DefensiveCoordinator, type Situation } from '../../src/game/playcaller.js';
import { generateTeam, pickDefense, pickOffense, type CoverageSystem, type DefScheme } from '../../src/league/team.js';
import { alignDefense, alignOffense, formationKey, isDeepZone, type DefenseAlignment } from '../../src/playbook/alignment.js';
import { applyCheck, resolveZeus } from '../../src/playbook/coverages.js';
import { FORMATIONS } from '../../src/playbook/formations.js';
import { DEF_PERSONNEL, type Coverage, type DefPersonnelId, type DefSlot, type DefensivePlayCall } from '../../src/playbook/types.js';
import { sourceVersion } from '../source-version.js';

const hash = (data: unknown) => createHash('sha256').update(JSON.stringify(data)).digest('hex');
const fileHash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const present = (personnel: DefPersonnelId) => Object.keys(DEF_PERSONNEL[personnel]) as DefSlot[];

export const DEFENSIVE_INSTALLATION_COHORT = {
  offenseSeed: 901, strength: .55,
  defensiveSchemes: ['4-3', '3-4', 'nickel-heavy'] as DefScheme[],
  coachingTrees: ['single-high', 'quarters', 'two-high', 'tampa', 'pressure-man'] as CoverageSystem[],
  formations: FORMATIONS.map((formation) => formation.id),
  drawSeeds: [0, 1, 2, 3],
  seedRule: 'scheme:tree:formation.id:situation.yardline:drawSeed',
  defenseSeedRule: 'defense:scheme',
  forcedCoach: { blitzRate: .8, disguise: .9, shadow: true },
  situations: [
    { id: 'ordinary-1st10', down: 1, distance: 10, yardline: 35, quarter: 1, clock: 600, scoreDiff: 0, ballY: HASH_LEFT_Y, hurry: false },
    { id: 'hurry-3rd27', down: 3, distance: 27, yardline: 20, quarter: 2, clock: 30, scoreDiff: -14, ballY: HASH_RIGHT_Y, hurry: true },
    { id: 'redzone-3rd5', down: 3, distance: 5, yardline: 85, quarter: 4, clock: 100, scoreDiff: 10, ballY: HASH_LEFT_Y, hurry: false },
    { id: 'goal-1st1', down: 1, distance: 1, yardline: 99, quarter: 4, clock: 45, scoreDiff: -7, ballY: HASH_RIGHT_Y, hurry: true },
  ],
};

function roofAudit(coverage: Coverage, jobs: DefenseAlignment, personnel: DefPersonnelId) {
  const actual = new Set(Object.values(jobs.spots).flatMap((spot) =>
    spot?.role.kind === 'zone' && isDeepZone(spot.role.zone) ? [spot.role.zone] : []));
  const required = Object.entries(coverage.roles).flatMap(([slot, role]) =>
    role?.kind === 'zone' && isDeepZone(role.zone) ? [{ slot, zone: role.zone }] : []);
  return {
    required,
    missingJobs: required.filter((role) => !actual.has(role.zone)),
    absentNamedPlayers: required.filter((role) => !DEF_PERSONNEL[personnel][role.slot as DefSlot]),
  };
}

function rows() {
  const cohort = DEFENSIVE_INSTALLATION_COHORT;
  const offense = generateTeam(new Rng(cohort.offenseSeed), 'Offense', 'OFF', { strength: cohort.strength });
  const offenseRosterSha256 = hash(offense.roster);
  const results = [];
  for (const scheme of cohort.defensiveSchemes) {
    const defense = generateTeam(new Rng(`defense:${scheme}`), 'Defense', 'DEF', { strength: cohort.strength, defScheme: scheme });
    const defenseRosterSha256 = hash(defense.roster);
    for (const tree of cohort.coachingTrees) for (const formation of FORMATIONS) for (const namedSituation of cohort.situations) for (const drawSeed of cohort.drawSeeds) {
      const { id: situationId, ...s } = namedSituation;
      const situation: Situation = s;
      const team = { ...defense, coach: { ...defense.coach, coverageSystem: tree, ...cohort.forcedCoach } };
      const rngSeed = `${scheme}:${tree}:${formation.id}:${s.yardline}:${drawSeed}`;
      const selection = new DefensiveCoordinator(team, new Rng(rngSeed))
        .call(situation, formation.personnel, offense, pickOffense(offense, formation.personnel));
      const call = selection.call;
      const flip = !!(drawSeed % 2);
      const aligned = alignOffense(formation, flip, yardlineToX(s.yardline), s.ballY);
      const installed: DefensivePlayCall = call.zeus
        ? resolveZeus(call, aligned.refOf[call.zeus], Math.min(aligned.counts.S, aligned.counts.W))
        : applyCheck(call, formationKey(aligned));
      const jobs = alignDefense(installed, aligned, present(call.personnel), selection.prefs);
      const playedRoof = roofAudit(installed.coverage, jobs, call.personnel);
      const shownJobs = call.shown ? alignDefense({ ...call, coverage: call.shown, pressure: null, shown: undefined }, aligned, present(call.personnel)) : null;
      const shownRoof = call.shown && shownJobs ? roofAudit(call.shown, shownJobs, call.personnel) : null;
      const pressureParticipants = call.pressure
        ? [...Object.keys(call.pressure.blitzers), ...Object.keys(call.pressure.droppers ?? {})]
        : [];
      const missingPressureParticipants = pressureParticipants.filter((slot) => !DEF_PERSONNEL[call.personnel][slot as DefSlot]);
      const targets = new Set(Object.values(jobs.spots).flatMap((spot) => spot?.role.kind === 'man' && spot.manTarget ? [spot.manTarget] : []));
      const unmarkedReceivers = installed.coverage.man ? Object.keys(aligned.refOf).filter((slot) => !targets.has(slot as keyof typeof aligned.refOf)) : [];
      const namedUnderneathDebt = Object.entries(installed.coverage.roles).flatMap(([slot, role]) =>
        role?.kind === 'zone' && !isDeepZone(role.zone) && !DEF_PERSONNEL[call.personnel][slot as DefSlot] ? [{ slot, zone: role.zone }] : []);
      const actualZones = new Set(Object.values(jobs.spots).flatMap((spot) => spot?.role.kind === 'zone' ? [spot.role.zone] : []));
      const unfilledNamedUnderneathDebt = namedUnderneathDebt.filter((seat) => !actualZones.has(seat.zone));
      const offensePlayers = pickOffense(offense, formation.personnel);
      const defensePlayers = pickDefense(team, call.personnel);
      const actualPlayerIds = [...Object.values(offensePlayers), ...Object.values(defensePlayers)].map((player) => player!.id);
      const playerCount = actualPlayerIds.length;
      const uniquePlayerCount = new Set(actualPlayerIds).size;
      const offenseSpotCount = Object.keys(aligned.spots).length;
      const defenseSpotCount = Object.keys(jobs.spots).length;
      const wrongFireZoneRushCount = call.pressure?.id === 'fire_zone' && jobs.rushers.length !== 5;
      const flags = [
        ...(playedRoof.missingJobs.length ? ['missing_played_deep_job'] : []),
        ...(playedRoof.absentNamedPlayers.length ? ['absent_named_deep_player'] : []),
        ...(shownRoof?.missingJobs.length ? ['missing_shown_deep_job'] : []),
        ...(missingPressureParticipants.length ? ['absent_pressure_participant'] : []),
        ...(wrongFireZoneRushCount ? ['stock_fire_zone_not_five_rushers'] : []),
        ...(unmarkedReceivers.length ? ['unmarked_man_receiver'] : []),
        ...(playerCount !== 22 || uniquePlayerCount !== 22 || offenseSpotCount !== 11 || defenseSpotCount !== 11 ? ['incorrect_player_or_spot_count'] : []),
      ];
      results.push({
        id: `${scheme}/${tree}/${formation.id}/${situationId}/${drawSeed}`,
        scheme, tree, formation: formation.id, situation: situationId, drawSeed, flip, rngSeed,
        inputSha256: hash({ situation, formation, flip, offenseRosterSha256, defenseRosterSha256, coach: team.coach, rngSeed }),
        personnel: call.personnel, front: call.front.id, calledCoverage: call.coverage.id,
        installedCoverage: installed.coverage.id, shownCoverage: call.shown?.id ?? null,
        pressure: call.pressure?.id ?? null, zeus: call.zeus ?? null, formationKey: formationKey(aligned),
        rushers: jobs.rushers, rushCount: jobs.rushers.length,
        playerCount, uniquePlayerCount, offenseSpotCount, defenseSpotCount,
        requiredDeep: playedRoof.required, missingPlayedDeepJobs: playedRoof.missingJobs,
        absentNamedDeepPlayers: playedRoof.absentNamedPlayers,
        missingShownDeepJobs: shownRoof?.missingJobs ?? [],
        missingPressureParticipants, unmarkedReceivers,
        namedUnderneathDebt, unfilledNamedUnderneathDebt, flags,
      });
    }
  }
  if (results.length !== 4320) throw new Error(`Fixed cohort changed: expected 4320 calls, got ${results.length}`);
  return results;
}

function counts(values: string[]): Record<string, number> {
  const answer: Record<string, number> = {};
  for (const value of values) answer[value] = (answer[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(answer).sort(([a], [b]) => a.localeCompare(b)));
}

export function runDefensiveInstallation(output: string, expectedSourcePrefix?: string): void {
  const sourceSha256 = sourceVersion();
  if (expectedSourcePrefix && !sourceSha256.startsWith(expectedSourcePrefix)) throw new Error(`Unexpected source ${sourceSha256}; required ${expectedSourcePrefix}`);
  const calls = rows();
  const violations = calls.filter((call) => call.flags.length);
  const fireZones = calls.filter((call) => call.pressure === 'fire_zone');
  const artifacts = Object.fromEntries([['all-calls', calls], ['violations', violations]].map(([kind, records]) => {
    const file = resolve(output.replace(/\.json$/, '') + `.${kind}.json.gz`);
    const bytes = gzipSync(JSON.stringify(records), { level: 9 });
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, bytes);
    return [kind as string, { file, sha256: fileHash(file), bytes: bytes.length, records: (records as typeof calls).length }];
  }));
  const summary = {
    calls: calls.length, defectCalls: violations.length,
    flags: counts(violations.flatMap((call) => call.flags)),
    missingPlayedDeepJobCalls: calls.filter((call) => call.missingPlayedDeepJobs.length).length,
    absentNamedDeepPlayerCalls: calls.filter((call) => call.absentNamedDeepPlayers.length).length,
    missingShownDeepJobCalls: calls.filter((call) => call.missingShownDeepJobs.length).length,
    absentPressureParticipantCalls: calls.filter((call) => call.missingPressureParticipants.length).length,
    unmarkedManReceiverCalls: calls.filter((call) => call.unmarkedReceivers.length).length,
    fireZoneCalls: fireZones.length, fireZoneRushCounts: counts(fireZones.map((call) => String(call.rushCount))),
    stockFireZoneWrongRushCountCalls: fireZones.filter((call) => call.rushCount !== 5).length,
    personnel: counts(calls.map((call) => call.personnel)),
    goalLineCoverage: counts(calls.filter((call) => call.personnel === 'goalline').map((call) => call.installedCoverage)),
    namedUnderneathPlayerDebtCalls: calls.filter((call) => call.namedUnderneathDebt.length).length,
    unfilledNamedUnderneathDebtCalls: calls.filter((call) => call.unfilledNamedUnderneathDebt.length).length,
    goalLineFSUnderneathDebtCalls: calls.filter((call) => call.personnel === 'goalline' && ['cover9', 'cover2_invert'].includes(call.installedCoverage)
      && call.namedUnderneathDebt.some((seat) => seat.slot === 'FS')).length,
    namedUnderneathDebtByCall: counts(calls.flatMap((call) => call.namedUnderneathDebt.map((seat) => `${call.personnel}/${call.installedCoverage}/${seat.slot}/${seat.zone}`))),
    resolvedChecks: calls.filter((call) => !call.zeus && call.calledCoverage !== call.installedCoverage).length,
    zeusCalls: calls.filter((call) => call.zeus).length,
  };
  const report = {
    schema: 'defensive-installation-observations-v1',
    sourceSha256, expectedSourcePrefix: expectedSourcePrefix ?? null,
    toolSha256: fileHash(fileURLToPath(import.meta.url)),
    sourceVersionToolSha256: fileHash(resolve('scripts/source-version.ts')),
    packageLockSha256: fileHash(resolve('package-lock.json')), nodeVersion: process.version,
    cohort: DEFENSIVE_INSTALLATION_COHORT, cohortSha256: hash(DEFENSIVE_INSTALLATION_COHORT),
    scope: '4320 deterministic automatic-caller selections and static role installations; no play is run.',
    limitations: [
      'Equal designed case counts are not NFL call frequencies or an empirical coach distribution.',
      'Flipped formation cases compare role coverage; they do not assert exact physical mirroring.',
      'Roof and named participant integrity does not certify full underneath, matching, check communication or scheme legality.',
      'Absent named nondeep zone players are recorded separately as debt, even when another player fills the same zone.',
      'Formation declarations may differ across source versions; input hashes expose those differences.',
    ],
    summary, artifacts,
  };
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ output: resolve(output), sourceSha256, toolSha256: report.toolSha256, summary }, null, 2) + '\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runDefensiveInstallation(process.argv[2] ?? 'out/scheme-audit/defense.json', process.argv[3]);
}

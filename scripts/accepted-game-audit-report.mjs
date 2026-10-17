/** Saved-data-only audit preparation. No engine imports, simulation or RNG calls.
 * Usage: node scripts/accepted-game-audit-report.mjs OUT
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {isDeepStrictEqual} from 'node:util';

const [argument, ...extra] = process.argv.slice(2);
assert.ok(argument && !extra.length, 'Usage: node scripts/accepted-game-audit-report.mjs OUT');
const out = resolve(argument), destination = join(out, 'report');
const seed = 'accepted-game-audit-2026-10-16-ordinary-v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const fileHash = path => hash(readFileSync(path));
const readJSON = path => JSON.parse(readFileSync(path, 'utf8'));
const ledgerPath = join(out, 'batch-ledger.json');
const ledger = readJSON(ledgerPath);
assert.ok(ledger.finishedAt, 'Wait until collection has finished; never report a moving batch');
assert.equal(ledger.games.length, 4, 'Expected the declared four-game cohort');
assert.equal(new Set(ledger.games.map(g => g.id)).size, 4, 'Duplicate game identity');
const ranking = (gameId, index) => hash(`${seed}\0${gameId}\0${index}`);
const finite = value => Number.isFinite(value) ? value : null;
const count = rows => Object.fromEntries([...new Set(rows)].sort().map(k => [k, rows.filter(v => v === k).length]));
const sum = (rows, key) => rows.reduce((n, r) => n + (Number.isFinite(r[key]) ? r[key] : 0), 0);
const inputs = [{path: ledgerPath, sha256: fileHash(ledgerPath)}];
const readErrors = [], inventory = [], plays = [], unfinished = [];
const readOptional = (path, gzip = false) => {
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  inputs.push({path, bytes: bytes.length, sha256: hash(bytes)});
  try { return JSON.parse(gzip ? gunzipSync(bytes).toString('utf8') : bytes.toString('utf8')); }
  catch (error) { readErrors.push({path, error: String(error)}); return null; }
};
const readLines = path => {
  if (!existsSync(path)) return [];
  const bytes = readFileSync(path);
  inputs.push({path, bytes: bytes.length, sha256: hash(bytes)});
  const rows = [];
  for (const [line, text] of bytes.toString('utf8').split('\n').entries()) {
    if (!text.trim()) continue;
    try { rows.push(JSON.parse(text)); }
    catch (error) { readErrors.push({path, line: line + 1, error: String(error)}); }
  }
  return rows;
};
const manifestPath = resolve(ledger.input);
const manifest = readOptional(manifestPath);
const manifestValid = !!manifest && fileHash(manifestPath) === ledger.inputSha256;
const manifestWarnings = manifestValid ? [] : ['Frozen input manifest unavailable or does not match batch input hash'];

for (const [gameIndex, game] of ledger.games.entries()) {
  const directory = join(out, 'accepted', game.id);
  const started = readOptional(join(directory, 'started.json'));
  const summary = readOptional(join(directory, 'summary.json'));
  const raw = readOptional(join(directory, 'game.json.gz'), true);
  const logs = raw?.log ?? (summary?.log ?? readLines(join(directory, 'plays.jsonl')));
  const observations = raw?.observations ?? readLines(join(directory, 'observations.jsonl'));
  const provenance = raw?.provenance ?? summary?.provenance ?? started;
  const warnings = [...manifestWarnings], artifactValidation = [];
  if (!provenance && game.status !== 'unrun') warnings.push('Attempted game has no provenance');
  if (provenance && provenance.gameIndex !== gameIndex) warnings.push('Game index differs from declared ledger order');
  if (provenance && provenance.id !== game.id) warnings.push('Provenance game identity differs from ledger');
  if (provenance && manifestValid) {
    const fixture = manifest.fixtures?.[gameIndex];
    for (const [name, actual, expected] of [
      ['accepted commit', provenance.commit, manifest.acceptedDevelop],
      ['accepted source hash', provenance.sourceSha256, manifest.sources?.accepted],
      ['input hash', provenance.inputSha256, ledger.inputSha256],
      ['collector hash', provenance.collectorSha256, ledger.collectorSha256],
      ['game seed', provenance.gameSeed, game.seed],
      ['fixture identity', fixture?.id, game.id],
      ['teams hash', provenance.teamsSha256, fixture?.teamsSha256],
      ['flags', provenance.flags, manifest.flags],
      ['World defaults', provenance.worldDefaults, manifest.worldDefaults],
    ]) if (!isDeepStrictEqual(actual, expected)) warnings.push(`Provenance ${name} mismatch`);
  }
  if (raw && summary && !isDeepStrictEqual(raw.provenance, summary.provenance)) warnings.push('Raw/summary provenance differs');
  if (started && provenance && !isDeepStrictEqual(started, provenance)) warnings.push('Started/final provenance differs');
  if (raw && summary && (raw.log.length !== summary.log.length || raw.complete !== summary.complete)) warnings.push('Raw and summary completeness disagree');
  if (game.summarySha256 && existsSync(join(directory, 'summary.json')) && game.summarySha256 !== fileHash(join(directory, 'summary.json'))) warnings.push('Summary hash differs from frozen batch ledger');
  for (const artifact of summary?.artifacts ?? []) {
    if (!/^[A-Za-z0-9_.-]+$/.test(artifact.path)) { warnings.push('Unsafe artifact path in summary'); continue; }
    const path = join(directory, artifact.path);
    const actual = inputs.find(v => v.path === path)?.sha256 ?? (existsSync(path) ? fileHash(path) : null);
    if (actual && !inputs.some(v => v.path === path)) inputs.push({path, sha256: actual});
    artifactValidation.push({path: artifact.path, expectedSha256: artifact.sha256, actualSha256: actual, matches: actual === artifact.sha256});
    if (actual !== artifact.sha256) warnings.push(`Saved artifact hash mismatch: ${artifact.path}`);
  }
  const seenIndexes = new Set();
  let physicalOrdinal = 0;
  for (const p of logs) {
    assert.ok(Number.isInteger(p.index) && p.index >= 0 && !seenIndexes.has(p.index), `Invalid/duplicate play index in ${game.id}`);
    seenIndexes.add(p.index);
    const physical = !!p.plan || p.kind === 'two';
    let observation = null, joinErrors = [];
    if (physical) {
      const candidate = observations[physicalOrdinal++];
      if (!candidate) joinErrors.push('Missing corresponding physical observation');
      else {
        const expectedKind = p.kind === 'two' ? 'two-point' : 'scrimmage';
        if (candidate.kind !== expectedKind) joinErrors.push('Physical observation kind mismatch');
        const state = candidate.gameState;
        if (state && (state.quarter !== p.quarter || Math.round(state.clock) !== p.clock || state.down !== p.down || Math.abs(state.yardline - p.yardline) > 1e-7)) joinErrors.push('Observation/log start-state mismatch');
        const concept = candidate.call?.kind === 'run' ? candidate.call.run?.scheme : candidate.call?.pass?.id;
        if (p.plan && concept !== p.plan.concept) joinErrors.push('Observation/log called-concept mismatch');
        if (!joinErrors.length) observation = candidate;
      }
    }
    const calledKind = observation?.call?.kind ?? null;
    // Realized p.kind is deliberately not a fallback: a called pass may scramble.
    const classification = p.kind === 'two' ? 'two-point' : !physical ? 'nonphysical' : calledKind === 'run' ? 'designed-run' : calledKind === 'pass' ? 'called-dropback' : 'unknown-call';
    const events = p.replay?.events ?? p.events ?? [];
    const eventCounts = count(events.map(e => e.type));
    const frameCount = p.replay?.frames?.length ?? p.filmFrames ?? 0;
    const filmed = frameCount >= 2;
    const nullified = p.nullified === true;
    const isScrimmage = ['designed-run', 'called-dropback', 'unknown-call'].includes(classification);
    const exclusionReasons = [];
    if (!isScrimmage) exclusionReasons.push(classification === 'two-point' ? 'two-point-try' : 'nonphysical-log-entry');
    if (classification === 'unknown-call') exclusionReasons.push('unverified-called-kind');
    if (nullified) exclusionReasons.push('nullified');
    if (!filmed) exclusionReasons.push('unfilmed');
    if (summary?.artifactError) exclusionReasons.push('film-artifact-error');
    if (warnings.length) exclusionReasons.push('game-provenance-warning');
    if (joinErrors.length) exclusionReasons.push('unverified-observation-join');
    const firstContact = events.find(e => e.type === 'carrier_contact')?.t;
    const stopIndex = events.findLastIndex(e => ['tackle', 'sack'].includes(e.type));
    const stop = stopIndex >= 0 ? events[stopIndex] : null;
    const stopTime = finite(stop?.t);
    const censoredEnding = p.outcome === 'timeout';
    const endpointKnown = isScrimmage && p.outcome != null && !censoredEnding;
    const transfers = new Set(['handoff', 'pitch', 'pitch_catch', 'throw', 'catch', 'interception', 'recovery', 'fumble']);
    const sameCarrierContact = stop && Number.isInteger(stop.b) ? events.find((e, i) => i < stopIndex && e.type === 'carrier_contact' && e.a === stop.b &&
      !events.slice(i + 1, stopIndex).some(v => transfers.has(v.type))) : null;
    const sameCarrierGap = endpointKnown && sameCarrierContact && Number.isFinite(sameCarrierContact.t) && Number.isFinite(stopTime) && stopTime >= sameCarrierContact.t ? stopTime - sameCarrierContact.t : null;
    const lastCarrierTeam = p.segments?.at(-1)?.team ?? null;
    const stats = p.stats ?? {};
    plays.push({
      id: `G${gameIndex + 1}-P${String(p.index + 1).padStart(3, '0')}`, gameId: game.id, gameIndex, index: p.index,
      quarter: p.quarter, clock: p.clock, offense: p.offense, down: p.down, distance: p.distance, yardline: p.yardline,
      call: p.call, defense: p.defense, classification, calledKind, realizedKind: p.kind,
      concept: p.plan?.concept ?? (calledKind === 'run' ? observation?.call?.run?.scheme : observation?.call?.pass?.id) ?? null,
      formation: p.plan?.formation ?? observation?.call?.formation?.id ?? null,
      coverage: p.plan?.coverage ?? observation?.defense?.coverage?.id ?? null,
      coverageFamily: p.plan?.family ?? observation?.defense?.coverage?.family ?? null,
      front: p.plan?.front ?? observation?.defense?.front?.id ?? null,
      pressureCalled: p.plan?.pressure ?? (observation ? !!observation.defense?.pressure : null),
      playAction: p.plan?.playAction ?? (calledKind === 'pass' ? observation?.call?.pass?.family === 'playaction' : false),
      outcome: p.outcome ?? null, nativeYards: finite(p.yards), yards: censoredEnding ? null : finite(p.yards),
      censoredEnding, endpointKnown, duration: finite(p.duration), score: p.score,
      firstDown: p.firstDown === true, nullified, foul: p.foul ?? null, lastCarrierTeam,
      completed: stats.completed === true, attempted: stats.attempted === true, sacked: stats.sacked === true,
      scramble: stats.scramble === true, intercepted: !!stats.interceptedBy, fumbleLost: stats.fumbleLost === true,
      pressured: stats.pressured === true, throwaway: stats.throwaway === true, dropped: stats.dropped === true,
      brokenTackles: finite(stats.brokenTackles), missedTackles: finite(stats.missedTackles),
      retainedSnap: stats.retainedSnap ?? null, nativeYac: finite(stats.yac),
      yac: stats.completed && !censoredEnding ? finite(stats.yac) : null,
      yardsBeforeContact: finite(stats.yardsBeforeContact), timeToThrow: finite(stats.timeToThrow),
      playWideFirstCarrierContact: finite(firstContact), terminalStopTime: stopTime, terminalStopType: stop?.type ?? null,
      terminalCarrierIndex: stop?.b ?? null, sameCarrierFirstContact: finite(sameCarrierContact?.t),
      playWideCarrierContactToTerminalGap: Number.isFinite(firstContact) && Number.isFinite(stopTime) && stopTime >= firstContact ? stopTime - firstContact : null,
      contactToStop: sameCarrierGap, contactToTackle: stop?.type === 'tackle' ? sameCarrierGap : null,
      contactIntervalStatus: censoredEnding ? 'censored-ending' : sameCarrierGap !== null ? 'same-carrier-no-intervening-transfer' : 'unavailable-needs-trace',
      eventCounts, teammateContacts: observation?.teammateContacts?.length ?? null,
      teammateImpulse: finite(observation?.teammateImpulse), worldSteps: finite(observation?.worldSteps),
      observationIndex: observation?.observationIndex ?? null, observationJoinErrors: joinErrors,
      filmed, filmFrames: frameCount, nativeEventsAvailable: !!(p.replay?.events ?? p.events),
      telemetryLevel: p.replay?.telemetry?.level ?? null,
      filmPath: existsSync(join(directory, 'film.html')) ? `../accepted/${game.id}/film.html` : null,
      gameComplete: raw?.complete ?? summary?.complete ?? false, gameCensored: raw?.censored ?? summary?.censored ?? null,
      officialEligible: isScrimmage && !nullified,
      ordinaryEligible: exclusionReasons.length === 0, ordinaryExclusions: exclusionReasons,
      ordinaryRank: ranking(game.id, p.index),
    });
  }
  if (raw?.unfinished) {
    const u = raw.unfinished, o = observations.find(v => v.observationIndex === u.observationIndex);
    unfinished.push({id: `G${gameIndex + 1}-UNFINISHED-O${u.observationIndex}`, gameId: game.id,
      observationIndex: u.observationIndex, kind: u.kind, callKind: u.call?.kind ?? null,
      concept: u.call?.kind === 'run' ? u.call.run?.scheme : u.call?.pass?.id,
      stateAtStart: u.stateAtStart, time: u.t, phase: u.phase, filmFrames: u.frames?.length ?? 0,
      worldSteps: o?.worldSteps ?? null, teammateContacts: o?.teammateContacts?.length ?? null,
      boundary: u.boundary, terminalResult: null, ordinaryExclusion: 'interrupted-not-a-completed-log-play'});
  }
  inventory.push({gameId: game.id, gameIndex, seed: game.seed, ledgerStatus: game.status,
    status: raw?.complete && game.status === 'complete' ? 'complete' : game.status === 'unrun' ? 'unrun' : logs.length ? 'incomplete-prefix' : 'failed-no-completed-prefix',
    complete: raw?.complete ?? summary?.complete ?? false, censored: raw?.censored ?? summary?.censored ?? null,
    error: raw?.error ?? summary?.error ?? game.error ?? null, artifactError: summary?.artifactError ?? null,
    provenance, nativeRawAvailable: !!raw, summaryAvailable: !!summary,
    logEntries: logs.length, observations: observations.length, physicalLogs: physicalOrdinal,
    unmatchedObservationIndexes: observations.slice(physicalOrdinal).map(o => o.observationIndex),
    unfinishedObservation: raw?.unfinished?.observationIndex ?? summary?.unfinishedObservation ?? null,
    finalState: raw?.finalState ?? summary?.finalState ?? null, score: raw?.score ?? summary?.score ?? null,
    quarters: raw?.quarters ?? summary?.quarters ?? null, launcherSeconds: game.launcherSeconds ?? null,
    collectionSeconds: raw?.elapsedSeconds ?? summary?.elapsedSeconds ?? null,
    warnings, artifactValidation, limits: raw?.limitations ?? summary?.limitations ?? ['Only durable prefix evidence available; missing state is not inferred.']});
}

const ordinary = [], ordinaryStrata = [];
for (const game of ledger.games) for (const classification of ['designed-run', 'called-dropback']) {
  const population = plays.filter(p => p.gameId === game.id && p.classification === classification);
  const eligible = population.filter(p => p.ordinaryEligible).sort((a, b) => a.ordinaryRank.localeCompare(b.ordinaryRank));
  const selected = eligible.slice(0, 6);
  ordinary.push(...selected.map(p => p.id));
  ordinaryStrata.push({gameId: game.id, classification, requested: 6, classifiedLoggedSnaps: population.length,
    eligible: eligible.length, selected: selected.length, shortage: 6 - selected.length,
    exclusionCounts: count(population.flatMap(p => p.ordinaryExclusions)),
    selectedIds: selected.map(p => p.id), eligibleRankedIds: eligible.map(p => p.id)});
}
const ordinarySet = new Set(ordinary), tail = [], tailStrata = [];
const available = plays.filter(p => p.ordinaryEligible && !ordinarySet.has(p.id));
const tailDefinitions = [
  {category: 'offensive-explosive', perspective: 'offense', qualifies: p => p.endpointKnown && Number.isFinite(p.yards) && p.yards >= (p.classification === 'designed-run' ? 10 : 20) && !p.intercepted && !p.fumbleLost, score: p => p.yards},
  {category: 'offensive-contact-or-escape', perspective: 'offense', qualifies: p => p.endpointKnown && Number.isFinite(p.yards) && (p.brokenTackles > 0 || p.scramble && p.yards > 0) && !p.fumbleLost, score: p => (p.brokenTackles ?? 0) * 100 + p.yards},
  {category: 'defensive-designed-run-stuff', perspective: 'defense', qualifies: p => p.endpointKnown && Number.isFinite(p.yards) && p.classification === 'designed-run' && p.yards <= 0, score: p => -p.yards},
  {category: 'defensive-sack-or-interception', perspective: 'defense', qualifies: p => p.endpointKnown && Number.isFinite(p.yards) && p.classification === 'called-dropback' && (p.sacked || p.intercepted), score: p => (p.intercepted ? 100 : 0) - p.yards},
  {category: 'teammate-contact', perspective: 'context', qualifies: p => p.teammateContacts > 0, score: p => p.teammateImpulse},
  {category: 'long-same-carrier-contact-to-stop', perspective: 'context', qualifies: p => Number.isFinite(p.contactToStop), score: p => p.contactToStop},
];
const tailSet = new Set();
for (const definition of tailDefinitions) {
  const candidates = available.filter(p => !tailSet.has(p.id) && definition.qualifies(p))
    .sort((a, b) => definition.score(b) - definition.score(a) || a.ordinaryRank.localeCompare(b.ordinaryRank));
  const first = candidates[0];
  const second = first && (candidates.find(p => p.gameId !== first.gameId) ?? candidates[1]);
  const selected = [first, second].filter(Boolean);
  for (const p of selected) { tailSet.add(p.id); tail.push({id: p.id, category: definition.category, perspective: definition.perspective, selectionValue: definition.score(p)}); }
  tailStrata.push({category: definition.category, perspective: definition.perspective, requested: 2,
    availableAfterPriorSelections: candidates.length, selected: selected.length, shortage: 2 - selected.length});
}

const summarize = rows => {
  const official = rows.filter(p => p.officialEligible), runs = official.filter(p => p.classification === 'designed-run');
  const dropbacks = official.filter(p => p.classification === 'called-dropback');
  return {logEntries: rows.length, physicalScrimmageLogs: rows.filter(p => ['designed-run', 'called-dropback', 'unknown-call'].includes(p.classification)).length,
    officialScrimmages: official.length, designedRuns: runs.length, calledDropbacks: dropbacks.length,
    unknownCallScrimmages: official.filter(p => p.classification === 'unknown-call').length,
    throws: dropbacks.filter(p => p.attempted).length, completions: dropbacks.filter(p => p.completed).length,
    sacks: dropbacks.filter(p => p.sacked).length, scrambles: dropbacks.filter(p => p.scramble).length,
    interceptions: official.filter(p => p.intercepted).length, fumblesLost: official.filter(p => p.fumbleLost).length,
    scrimmageTouchdownEndings: official.filter(p => p.outcome === 'touchdown').length,
    offensiveTouchdowns: official.filter(p => p.outcome === 'touchdown' && p.lastCarrierTeam === 'O').length,
    defensiveTouchdowns: official.filter(p => p.outcome === 'touchdown' && p.lastCarrierTeam === 'D').length,
    touchdownScoringSideUnknown: official.filter(p => p.outcome === 'touchdown' && !['O', 'D'].includes(p.lastCarrierTeam)).length,
    endpointKnownCounts: {officialScrimmages: official.filter(p => p.endpointKnown).length,
      designedRuns: runs.filter(p => p.endpointKnown && Number.isFinite(p.yards)).length,
      calledDropbacks: dropbacks.filter(p => p.endpointKnown && Number.isFinite(p.yards)).length,
      completedYac: dropbacks.filter(p => p.completed && p.endpointKnown && Number.isFinite(p.yac)).length,
      unknownOfficialEndings: official.filter(p => !p.endpointKnown).length,
      censoredOfficialEndings: official.filter(p => p.censoredEnding).length},
    designedRunStuffs: runs.filter(p => p.endpointKnown && Number.isFinite(p.yards) && p.yards <= 0).length, designedRunYards: sum(runs.filter(p => p.endpointKnown), 'yards'),
    calledDropbackYards: sum(dropbacks.filter(p => p.endpointKnown), 'yards'), nullified: rows.filter(p => p.nullified).length,
    foulRecorded: rows.filter(p => p.foul).length, filmed: rows.filter(p => p.filmed).length,
    unfilmedPhysical: rows.filter(p => p.classification !== 'nonphysical' && !p.filmed).length,
    ordinaryEligible: rows.filter(p => p.ordinaryEligible).length,
    nativeEventCountsAllPhysicalIncludingNullified: Object.fromEntries([...new Set(rows.flatMap(p => Object.keys(p.eventCounts)))].sort().map(k => [k, rows.reduce((n, p) => n + (p.eventCounts[k] ?? 0), 0)])),
    teammateContactsAllPhysicalIncludingNullified: sum(rows, 'teammateContacts'),
    teammateImpulseAllPhysicalIncludingNullified: sum(rows, 'teammateImpulse'),
    officialEndings: count(official.map(p => p.outcome ?? 'unknown')),
    calledClasses: count(rows.map(p => p.classification)),
  };
};
const grouping = key => Object.fromEntries([...new Set(plays.map(p => p[key] ?? 'unknown'))].sort().map(value => [value, summarize(plays.filter(p => (p[key] ?? 'unknown') === value))]));
const limitations = [
  'Four frozen generated-roster games are diagnostic exposure, not a population estimate or untouched validation set.',
  'Ordinary selection uses called kind from validated chronological observation/log joins, never realized run/pass endings or yardage.',
  'An outcome-blind selection is not a blind model-validation holdout. It includes sacks and scrambles in called dropbacks.',
  'Ordinary eligibility requires a verified filmed nonnullified logged scrimmage snap; capped endings remain labelled prefixes. Nullified, unfilmed, unknown-call and interrupted exposure is enumerated separately.',
  'Tail cases are selected contextual contrasts, not defect labels or frequency estimates; offensive/defensive/contact selection categories can overlap before deduplication.',
  'Whole-game history changes calls, condition and RNG; later plays are not paired counterfactuals of historical builds.',
  'Events, sampled telemetry contacts, every-step observed teammate impulses and physical contact clocks are different measurements.',
  'Recorded body facing does not establish gaze; final requests cannot recover unrecorded producing stages.',
  'Missing terminal gain/YAC/contact is unknown, never zero. Two-point native film/result detail is unavailable through the current Game recording path.',
  'PlaySim timeout endings preserve native administrative yards/YAC but expose terminal yards/YAC as null. Prefix film remains ordinary-eligible with explicit censor labels.',
  'Contact-to-stop requires carrier_contact.a to equal tackle/sack.b and no intervening possession-changing event; the raw play-wide gap is separately labelled and never ranks contact tails.',
  'OfficialEligible means nonnullified scrimmage log, not a guarantee of an uncensored physical ending; timeout endings remain visible.',
];
const report = {schema: 'accepted-game-audit-report-v1', seed, source: {tool: import.meta.filename, toolSha256: fileHash(import.meta.filename), inputs},
  batch: {startedAt: ledger.startedAt, finishedAt: ledger.finishedAt, completed: ledger.completed, attempted: ledger.attempted, elapsedSeconds: ledger.elapsedSeconds, stopReason: ledger.stopReason ?? null, withinBudget: ledger.withinBudget},
  inventory, readErrors, summary: summarize(plays), byGame: grouping('gameId'), byConcept: grouping('concept'), byCoverage: grouping('coverage'),
  nullifiedPlayIds: plays.filter(p => p.nullified).map(p => p.id), foulRecordedPlayIds: plays.filter(p => p.foul).map(p => p.id),
  unfilmedPhysicalPlayIds: plays.filter(p => p.classification !== 'nonphysical' && !p.filmed).map(p => p.id),
  censoredEndingPlayIds: plays.filter(p => p.outcome === 'timeout').map(p => p.id),
  unverifiedObservationPlayIds: plays.filter(p => p.observationJoinErrors.length).map(p => p.id),
  unfinished, limitations, plays};
const panel = {schema: 'accepted-game-audit-panel-v1', seed,
  ordinary: {rule: 'First six SHA256 ranks per declared game and called-run/dropback stratum; UTF8 seed + NUL + gameId + NUL + zero-based native log index, ascending hex digest. No outcome-based replacements.',
    requested: 48, selected: ordinary.length, shortage: 48 - ordinary.length, unit: 'logged scrimmage snaps, including labelled censored prefixes',
    censoredEndingIds: plays.filter(p => ordinarySet.has(p.id) && p.censoredEnding).map(p => p.id),
    reviewOrder: ordinary, strata: ordinaryStrata},
  tail: {rule: 'At most two per stated category, descending stated metric; second prefers a different game. Exclude ordinary/prior-tail IDs. No replacement category when short.',
    maximum: 12, selected: tail.length, cases: tail, strata: tailStrata},
  exclusions: plays.filter(p => !p.ordinaryEligible).map(p => ({id: p.id, classification: p.classification, reasons: p.ordinaryExclusions})),
  interrupted: unfinished, unrunGameIds: inventory.filter(g => g.status === 'unrun').map(g => g.gameId), limitations};
mkdirSync(destination, {recursive: true});
const save = (name, data) => writeFileSync(join(destination, name), JSON.stringify(data, null, 2) + '\n');
save('play-index.json', report);
save('audit-panel.json', panel);
const columns = ['id', 'gameId', 'index', 'quarter', 'clock', 'offense', 'down', 'distance', 'yardline', 'classification', 'calledKind', 'realizedKind', 'concept', 'formation', 'coverage', 'coverageFamily', 'front', 'outcome', 'nativeYards', 'yards', 'nativeYac', 'yac', 'censoredEnding', 'endpointKnown', 'duration', 'nullified', 'completed', 'attempted', 'sacked', 'scramble', 'intercepted', 'fumbleLost', 'playWideFirstCarrierContact', 'sameCarrierFirstContact', 'terminalStopTime', 'terminalStopType', 'contactToStop', 'contactIntervalStatus', 'teammateContacts', 'teammateImpulse', 'filmed', 'filmFrames', 'observationIndex', 'ordinaryEligible', 'ordinaryExclusions', 'filmPath'];
const csv = value => { const text = value == null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; };
writeFileSync(join(destination, 'play-index.csv'), [columns.join(','), ...plays.map(p => columns.map(k => csv(p[k])).join(','))].join('\n') + '\n');
console.log(JSON.stringify({savedDataOnly: true, reportDirectory: destination, games: inventory.length, plays: plays.length, ordinary: ordinary.length, tails: tail.length, readErrors: readErrors.length, observationJoinWarnings: report.unverifiedObservationPlayIds.length}));

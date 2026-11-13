/** Export the fixed full-recording subset from two tackle-timing panels.
 * node --import tsx scripts/export-tackle-timing.ts baseline-film.json candidate-film.json output.html [baseline-brake-film.json candidate-brake-film.json] [--bounded-attachment-comparison]
 * Reads stored recordings only; it never resimulates or selects by outcome.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlayLog } from '../src/game/game.js';
import type { PlayResult } from '../src/sim/types.js';
import type { TimingTackleFilm, TimingTackleFilmPlay } from './diag/tackle-timing-review.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
import { packReplayPlay } from './replay-data.js';

const args = process.argv.slice(2), boundedComparison = args.at(-1) === '--bounded-attachment-comparison';
if (boundedComparison) args.pop();
const [baselinePath, candidatePath, output, baselineBrakePath, candidateBrakePath] = args;
if (!baselinePath || !candidatePath || !output || ![3, 5].includes(args.length))
  throw new Error('Usage: export-tackle-timing.ts baseline-film.json candidate-film.json output.html [baseline-brake-film.json candidate-brake-film.json] [--bounded-attachment-comparison]');
const hashFile = (path: URL): string => createHash('sha256').update(readFileSync(path)).digest('hex');
const preloadPath = 'scripts/diag/enable-bounded-attachment.ts';
const preloadSha256 = boundedComparison ? hashFile(new URL('./diag/enable-bounded-attachment.ts', import.meta.url)) : null;
const films = [baselinePath, candidatePath].map(path => JSON.parse(readFileSync(path, 'utf8')) as TimingTackleFilm);
const concepts = {
  frontalForm: 'Square frontal form',
  imminentCrossing: 'Imminent crossing',
  glancingEscapeReach: 'Glancing escape reach',
  fasterCarrierEscape: 'Faster carrier escape',
  fatiguedCrossing: 'Fatigued crossing',
  recoveringCrossing: 'Off-balance crossing',
  trafficCrossing: 'Crossing through traffic',
};
const expectedIds = Object.keys(concepts).map(geometry => `TT-R1-${geometry}-S83-L`)
  .concat(['TT-W-crossing-S19-L', 'TT-W-crossing-S19-R']);
for (const film of films) {
  if (film.schema !== 'tackle-timing-review-film-v1' || film.sourceBefore !== film.sourceAfter
    || film.plays.map(p => p.id).join('|') !== expectedIds.join('|')
    || film.plays.some(p => !p.recordingVerified || p.sourceSha256 !== film.sourceBefore
      || p.simulationStartedAt !== 2 || !p.profileSha256 || !p.physicalSha256
      || (p.input.group === 'primary' ? p.selection !== 'preselected-primary-subset'
        : p.selection !== 'separate-retrospective-witness')))
    throw new Error('Expected the source-pinned, observer-verified fixed nine-fixture timing film');
}
for (const pin of ['scriptSha256', 'inputSha256', 'cohortSha256', 'profilesSha256'] as const)
  if (films[0][pin] !== films[1][pin]) throw new Error(`Baseline/candidate ${pin} mismatch`);
if (boundedComparison && (films[0].sourceBefore !== films[1].sourceBefore
  || films[0].scriptSha256 !== hashFile(new URL('./diag/tackle-timing-review.ts', import.meta.url))))
  throw new Error('Bounded comparison requires one engine source and the unchanged pinned timing diagnostic');
for (let k = 0; k < expectedIds.length; k++) {
  const a = films[0].plays[k], b = films[1].plays[k];
  if (a.profileSha256 !== b.profileSha256 || JSON.stringify(a.input) !== JSON.stringify(b.input)
    || JSON.stringify(a.players) !== JSON.stringify(b.players))
    throw new Error(`Profile/input mismatch for fixed clip ${expectedIds[k]}`);
}

const round = (x: number) => Math.round(x * 100) / 100;
function relativeReplay(p: Pick<TimingTackleFilmPlay, 'id' | 'result' | 'simulationStartedAt'>): PlayResult {
  const result = structuredClone(p.result), start = p.simulationStartedAt;
  if (!result.frames?.length || result.telemetry?.level !== 'full') throw new Error(`Missing full recording: ${p.id}`);
  result.frames = result.frames.filter(f => f.t >= start).map(f => ({ ...f, t: round(f.t - start) }));
  result.events = result.events.filter(e => e.t >= start).map(e => ({ ...e, t: round(e.t - start) }));
  result.duration = round(result.duration - start);
  result.telemetry.frames = result.telemetry.frames.filter(f => f.t >= start).map(f => ({ ...f, t: round(f.t - start),
    perception: f.perception?.map(o => ({ ...o, t: round(o.t - start) })),
    ball: f.ball && { ...f.ball, arrivalT: f.ball.arrivalT === undefined ? undefined : round(f.ball.arrivalT - start) } }));
  result.telemetry.decisions = result.telemetry.decisions.filter(d => d.t >= start).map(d => ({ ...d, t: round(d.t - start) }));
  if (result.frames.length < 2 || result.frames[0].t !== 0 || result.telemetry.frames[0]?.t !== 0)
    throw new Error(`Missing recorded encounter start: ${p.id}`);
  return result;
}

const labels = boundedComparison ? ['Linear', 'Bounded experiment'] : ['Baseline', 'Candidate'];
const modeFields = (group: number) => boundedComparison
  ? { physicsMode: group === 1, preloadSha256: group === 1 ? preloadSha256 : null,
    modeSelection: group === 1 ? 'explicit-preload diagnostic opt-in at recorded source' : 'recorded source linear default' }
  : {};
const panelPlays = films.flatMap((film, group) => film.plays.map((p, index) => {
  const result = relativeReplay(p), witness = p.input.group !== 'primary';
  const conceptId = witness ? 'retrospectiveCrossingWitness' : p.input.geometry;
  const name = witness ? 'Retrospective crossing witness' : concepts[p.input.geometry];
  const traffic = !witness && p.input.geometry === 'trafficCrossing';
  // A live inspection endpoint has no whistle spot. buildResult's fallback
  // endX=LOS/outcome=timeout is retained in the raw film, not reported as a
  // football gain or a simulation timeout. Read the actual carrier sample.
  const windowCensored = result.outcome === 'timeout';
  const initialCarrier = result.frames![0].carrier;
  const observedX = result.frames!.at(-1)!.agents[initialCarrier * 3];
  const advance = (windowCensored ? observedX : result.endX) - p.initialCarrierPosition.x;
  const text = `${labels[group]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)}`
    + (boundedComparison ? ` · ${group === 1 ? 'bounded attachment explicitly opted in by diagnostic preload at recorded source' : 'linear attachment default at recorded source'}` : '')
    + (windowCensored ? ` · inspection window ended live · ${advance.toFixed(2)} observed yd after staged catch; no credited gain.`
      : ` · ${result.outcome} · ${advance.toFixed(2)} credited yd after staged catch · raw LOS gain ${result.yards.toFixed(2)} yd includes the initial 10 yd lead.`)
    + (witness ? ' Retrospective diagnostic geometry; kept separate from the primary cohort.'
      : ' Fixed primary encounter; roster/seed/mirror selected for film before outcomes.')
    + (traffic ? ' One standing idle tight end occupies the encounter corridor; production spacing, occlusion and collision remain active.'
      : ' One straight runner and one pursuer; 20 other bodies parked.')
    + ' Generated athletic profiles and ordinary tackle execution rolls are unchanged. Physical contact follows each recorded engine version.'
    + ' Viewer clocks subtract 2 s from raw engine labels; geometry and event labels retain the ordinary 50 ms tick convention.';
  const log: PlayLog = { index, quarter: 1, clock: 0, offense: 'OFF', down: 1, distance: 10, yardline: 30,
    call: `${labels[group]} · ${name}`, defense: traffic ? 'One pursuer; idle TE in traffic' : 'One pursuer; bystanders parked',
    text, yards: result.yards, score: { home: 0, away: 0 }, kind: result.kind, stats: result.stats, outcome: result.outcome,
    // Constructor pass/coverage calls only supply roster/setup scaffolding.
    // These labels describe the staged controllers that actually execute.
    plan: { personnel: 'isolation', formation: 'isolated', qb: 'gun', concept: conceptId,
      playAction: false, audible: false, defPersonnel: 'isolation', front: traffic ? 'traffic' : 'isolated',
      coverage: 'isolated_pursuit', family: witness ? 'diagnostic witness' : 'primary tackle encounters',
      shell: traffic ? 'one pursuer plus idle TE' : 'one pursuer; bystanders parked', pressure: false, rushers: 0 },
    replay: { los: 40, firstDownX: 50, flip: false, frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  const packed = packReplayPlay(log, group);
  return { ...packed, id: `${group === 0 ? 'BASE' : 'CAND'}-${p.id}`,
    // Censored windows can still have real contact/broken-hold flags, but
    // fallback zero credited yards is neither a stuff nor a completed gain.
    flags: windowCensored ? { ...packed.flags, big: false, stuff: false, complete: false,
      td: false, to: false, sack: false, oob: false, pressure: false } : { ...packed.flags, pressure: false },
    kindLabel: 'Tackle timing probe', read: undefined,
    concept: { id: conceptId, name, family: witness ? 'diagnostic witness' : 'primary tackle encounters' },
    fixtureId: p.id, fixtureSeed: p.input.seed, sourceLabel: labels[group], sourceSha256: film.sourceBefore,
    ...modeFields(group),
    filmSelection: p.selection, cohortGroup: p.input.group, profileSha256: p.profileSha256,
    postCatchAdvanceYd: round(advance), postCatchAdvanceType: windowCensored ? 'observed-at-window-end' : 'credited-at-whistle',
    windowCensored, rawEngineGainYd: result.yards,
    rawSimulationStartedAt: p.simulationStartedAt, rawSimulationDuration: p.result.duration };
}));
interface BrakeFilmPlay {
  id: string; seed: number; side: number; selection: string; sourceSha256: string; profileSha256: string;
  physicalSha256: string; simulationStartedAt: number; initialCarrierPosition: { x: number; y: number };
  recordingVerified: boolean; result: PlayResult; players: TimingTackleFilmPlay['players'];
}
interface BrakeFilm {
  schema: string; sourceBefore: string; sourceAfter: string; scriptSha256: string; inputSha256: string;
  cohortSha256: string; profilesSha256: string; plays: BrakeFilmPlay[];
}
const brakeFilms: BrakeFilm[] = baselineBrakePath && candidateBrakePath
  ? [baselineBrakePath, candidateBrakePath].map(path => JSON.parse(readFileSync(path, 'utf8')) as BrakeFilm) : [];
if (brakeFilms.length) {
  const expectedBrakeIds = [83, 131].flatMap(seed => ['L', 'R'].map(side => `TB-W-S${seed}-${side}`));
  for (let group = 0; group < 2; group++) {
    const film = brakeFilms[group];
    if (film.schema !== 'tackle-brake-witness-film-v1' || film.sourceBefore !== film.sourceAfter
      || film.sourceBefore !== films[group].sourceBefore
      || film.plays.map(p => p.id).join('|') !== expectedBrakeIds.join('|')
      || film.plays.some(p => !p.recordingVerified || p.sourceSha256 !== film.sourceBefore
        || p.selection !== 'retrospective-command-consistency-witness' || p.simulationStartedAt !== 2))
      throw new Error('Expected the separate observer-verified four-fixture brake witness for each source');
  }
  for (const pin of ['scriptSha256', 'inputSha256', 'cohortSha256', 'profilesSha256'] as const)
    if (brakeFilms[0][pin] !== brakeFilms[1][pin]) throw new Error(`Brake-witness ${pin} mismatch`);
  for (let k = 0; k < expectedBrakeIds.length; k++) {
    const a = brakeFilms[0].plays[k], b = brakeFilms[1].plays[k];
    if (a.profileSha256 !== b.profileSha256 || a.seed !== b.seed || a.side !== b.side
      || JSON.stringify(a.players) !== JSON.stringify(b.players)) throw new Error(`Brake-witness profile/input mismatch: ${a.id}`);
  }
}
const brakePlays = brakeFilms.flatMap((film, group) => film.plays.map((p, index) => {
  const result = relativeReplay(p), advance = result.endX - p.initialCarrierPosition.x;
  const name = 'Retrospective plant/brake witness', conceptId = 'retrospectiveBrakeWitness';
  const text = `${labels[group]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${result.outcome}`
    + (boundedComparison ? ` · ${group === 1 ? 'bounded attachment explicitly opted in by diagnostic preload at recorded source' : 'linear attachment default at recorded source'}` : '')
    + ` · ${advance.toFixed(2)} credited yd after staged catch · raw LOS gain ${result.yards.toFixed(2)} yd includes the initial 10 yd lead.`
    + ' Separate retrospective command-consistency witness: momentum initially closes, but the defender has already requested a plant/brake.'
    + ' Two play seeds and both mirrors share one unedited generated roster pair. Natural execution rolls, strike/grip physics and support remain active.'
    + ' Incoming straight-line perception history ends one tick before the staged state. Viewer subtracts 2 s, preserving ordinary tick labels.';
  const log: PlayLog = { index: panelPlays.length / 2 + index, quarter: 1, clock: 0, offense: 'OFF', down: 1, distance: 10, yardline: 30,
    call: `${labels[group]} · ${name}`, defense: 'One defender planting/braking; bystanders parked', text,
    yards: result.yards, score: { home: 0, away: 0 }, kind: result.kind, stats: result.stats, outcome: result.outcome,
    plan: { personnel: 'isolation', formation: 'isolated', qb: 'gun', concept: conceptId,
      playAction: false, audible: false, defPersonnel: 'isolation', front: 'isolated', coverage: 'plant_brake',
      family: 'diagnostic witness', shell: 'one defender planting/braking', pressure: false, rushers: 0 },
    replay: { los: 40, firstDownX: 50, flip: false, frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  const packed = packReplayPlay(log, group);
  return { ...packed, flags: { ...packed.flags, pressure: false },
    id: `${group === 0 ? 'BASE' : 'CAND'}-${p.id}`, kindLabel: 'Tackle timing probe', read: undefined,
    concept: { id: conceptId, name, family: 'diagnostic witness' }, fixtureId: p.id, fixtureSeed: p.seed,
    sourceLabel: labels[group], sourceSha256: film.sourceBefore, filmSelection: p.selection,
    ...modeFields(group),
    cohortGroup: 'retrospective-brake-witness', profileSha256: p.profileSha256,
    postCatchAdvanceYd: round(advance), postCatchAdvanceType: 'credited-at-whistle', windowCensored: false,
    rawEngineGainYd: result.yards, rawSimulationStartedAt: p.simulationStartedAt, rawSimulationDuration: p.result.duration };
}));
const plays = [...panelPlays, ...brakePlays];
const cohort = (boundedComparison ? '18 paired, fixed isolated tackle clips under one engine source in Linear and Bounded experiment modes: ' : '18 paired, fixed isolated tackle clips under two engine sources: ')
  + 'seven primary encounter geometries and two separate retrospective crossing witnesses. '
  + 'Primary film uses one preselected roster pair/play seed/mirror; the retained panel contains two roster pairs, two play seeds and both mirrors. '
  + 'One straight carrier and one pursuer use the production 22-body tackle/World lifecycle. The traffic clip adds one idle standing tight end; other bystanders are parked. '
  + 'No forced tackle outcomes, edited strength, NFL-rate calibration or future traffic oracle. A live six-second endpoint is a censored inspection window. '
  + 'Raw credited LOS gain includes the staged runner’s existing 10-yard lead; post-catch advance is shown separately. Raw recordings retain absolute time; viewer subtracts 2 s. '
  + 'Live inspection windows have no credited result/gain; their text shows the observed carrier advance, and completed-result filters do not include them. '
  + 'Player assignments/QB beliefs from setup scaffolding are retained state and do not mean a four-vertical/Cover 3 play is executing.'
  + (brakePlays.length ? ` Eight additional clips retain a separate retrospective plant/brake decision witness: two play seeds, both mirrors and both ${boundedComparison ? 'compared recordings' : 'sources'}. Its results are not pooled into the primary cohort.` : '')
  + (boundedComparison ? ` Input order declares Linear followed by the explicit diagnostic preload experiment (${preloadPath}, SHA-256 ${preloadSha256}). The recorded source had a linear default; this controlled comparison predates promotion, which is documented separately in the latest physics review. All mode/default metadata refers to the recorded source. Runtime mode was not recorded by the original film schema; mode labels preserve the declared generation commands, with unchanged source/script/input/cohort/profile checks.` : '');
const data = { meta: { sourceSha256: films[1].sourceBefore,
  sourceComparison: films.map((f, i) => ({ label: labels[i], sourceSha256: f.sourceBefore, ...modeFields(i) })),
  ...(boundedComparison ? { physicsMode: [false, true], preloadPath, preloadSha256, experimentOptIn: true,
    productionEnabled: false, scriptSha256: films[0].scriptSha256, inputSha256: films[0].inputSha256,
    cohortSha256: films[0].cohortSha256, profilesSha256: films[0].profilesSha256 } : {}),
  telemetryLevel: 'full', cohort, seed: 83, final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Isolated Carrier', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
  away: { name: 'Isolated Pursuer', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: films.map((film, group) => ({ seed: 83, label: labels[group], sourceSha256: film.sourceBefore, ...modeFields(group),
    final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { isolated_pursuit: 'One pursuing defender', plant_brake: 'One defender planting/braking' },
    front: { isolated: 'One pursuer; parked bystanders', traffic: 'One pursuer; idle TE in traffic' },
    formation: { isolated: 'Isolated post-catch encounter' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8'), marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
// Customize this exported diagnostic only. Preserve the shared template,
// while giving a censored window an honest list/video caption instead of
// displaying buildResult's zero-yard fallback as a football result.
const cohortTemplate = template.replaceAll('gain(p.yds)', "(p.windowCensored ? 'Live window' : gain(p.yds))");
// Cohort mode hides generic scores. The down-and-distance field is also
// irrelevant for a staged post-catch interaction, so hide it in this export.
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<style>#dd{display:none}</style></head><body>\n'
  + cohortTemplate.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(`Wrote ${plays.length} source-pinned, observer-verified timing clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)} MB.`);

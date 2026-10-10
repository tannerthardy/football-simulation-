/** Offline replay of the predetermined matched run-contact panel film subset.
 * node --import tsx scripts/export-run-contact-review.ts baseline-film.json candidate-film.json output.html [--bounded-attachment-comparison]
 * Reads saved plays only; never resimulates, selects by result, or changes viewer UI.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlayLog } from '../src/game/game.js';
import { RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGES, FRONTS } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import type { PlayResult } from '../src/sim/types.js';
import type { RatingKey } from '../src/players/types.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
import { packReplayPlay } from './replay-data.js';

interface SavedPlay {
  id: string; roster: number; run: string; front: string; seed: number; flip: boolean;
  selection: 'fixed-before-outcomes' | 'diagnostic-rejected-allocation-witness';
  offCall: string; defCall: string; los: number; firstDownX: number; result: PlayResult;
  players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string; weightLb: number; heightIn: number; ratings: Record<RatingKey, number> }>;
}
interface SavedFilm { schema: string; sourceBefore: string; sourceAfter: string; plays: SavedPlay[] }
interface SavedReport {
  schema: string; sourceBefore: string; sourceAfter: string; scriptSha256: string;
  cohort: { rosterSha256: string }; filmIds: string[]; observerVerifiedCount: number;
}
const args = process.argv.slice(2), boundedComparison = args.at(-1) === '--bounded-attachment-comparison';
if (boundedComparison) args.pop();
const [baselinePath, candidatePath, output] = args;
if (!baselinePath || !candidatePath || !output || args.length !== 3)
  throw new Error('Usage: export-run-contact-review.ts baseline-film.json candidate-film.json output.html [--bounded-attachment-comparison]');
const hash = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const preloadPath = 'scripts/diag/enable-bounded-attachment.ts';
const preloadSha256 = boundedComparison ? createHash('sha256').update(readFileSync(new URL('./diag/enable-bounded-attachment.ts', import.meta.url))).digest('hex') : null;
const inputs = [baselinePath, candidatePath].map(path => JSON.parse(readFileSync(path, 'utf8')) as SavedFilm);
for (const film of inputs) {
  if (film.schema !== 'run-contact-review-film-v1' || film.sourceBefore !== film.sourceAfter || film.plays.length !== 13
    || film.plays.filter(p => p.selection === 'fixed-before-outcomes').length !== 12
    || film.plays.filter(p => p.selection === 'diagnostic-rejected-allocation-witness').length !== 1)
    throw new Error('Expected source-pinned12 fixed film fixtures plus one labelled Counter diagnostic');
}
if (inputs[0].plays.map(p => p.id).join('|') !== inputs[1].plays.map(p => p.id).join('|'))
  throw new Error('Baseline/candidate film identities do not match');
// The original run-film schema omits cohort/script pins. In experiment mode,
// require its retained compact panel companions instead of inferring those pins.
const reports = boundedComparison ? [baselinePath, candidatePath].map(path => {
  if (!path.endsWith('-film.json')) throw new Error('Bounded run comparison requires *-film.json and matching *-compact.json');
  return JSON.parse(readFileSync(path.replace(/-film\.json$/, '-compact.json'), 'utf8')) as SavedReport;
}) : [];
if (boundedComparison) {
  if (inputs[0].sourceBefore !== inputs[1].sourceBefore) throw new Error('Bounded comparison requires one engine source');
  const scriptSha256 = createHash('sha256').update(readFileSync(new URL('./diag/run-contact-review.ts', import.meta.url))).digest('hex');
  for (let k = 0; k < inputs.length; k++) {
    const report = reports[k], film = inputs[k];
    if (report.schema !== 'run-contact-review-compact-v1' || report.sourceBefore !== film.sourceBefore
      || report.sourceAfter !== film.sourceBefore || report.scriptSha256 !== scriptSha256
      || report.observerVerifiedCount !== 7 || !report.cohort.rosterSha256
      || report.filmIds.join('|') !== film.plays.map(p => p.id).join('|'))
      throw new Error('Expected unchanged source/script/cohort and seven observer checks from the run panel companion');
  }
  if (JSON.stringify(reports[0].cohort) !== JSON.stringify(reports[1].cohort)) throw new Error('Bounded comparison roster/input cohort mismatch');
  for (let k = 0; k < inputs[0].plays.length; k++) {
    const a = inputs[0].plays[k], b = inputs[1].plays[k];
    for (const key of ['roster', 'run', 'front', 'seed', 'flip', 'selection', 'offCall', 'defCall', 'los', 'firstDownX', 'players'] as const)
      if (JSON.stringify(a[key]) !== JSON.stringify(b[key])) throw new Error(`Bounded comparison profile/input mismatch: ${a.id} ${key}`);
  }
}
const labels = boundedComparison ? ['Linear', 'Bounded experiment'] : ['Baseline', 'Candidate'];
const modeFields = (group: number) => boundedComparison
  ? { physicsMode: group === 1, preloadSha256: group === 1 ? preloadSha256 : null,
    modeSelection: group === 1 ? 'explicit-preload diagnostic opt-in at recorded source' : 'recorded source linear default' }
  : {};
const plays = inputs.flatMap((film, game) => film.plays.map((p, index) => {
  const result = p.result;
  if (!result.frames?.length || !result.telemetry || (boundedComparison && result.telemetry.level !== 'full')) throw new Error(`Missing recorded state for ${p.id}`);
  const log: PlayLog = { index, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10, yardline: p.los - 10,
    call: `${labels[game]}${p.selection === 'diagnostic-rejected-allocation-witness' ? ' diagnostic' : ''} · ${p.offCall}`, defense: p.defCall, kind: 'run', yards: result.offenseYards,
    score: { home: 0, away: 0 }, stats: result.stats, outcome: result.outcome,
    text: `${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${result.outcome} · ${result.offenseYards.toFixed(2)} yd · ${p.selection === 'diagnostic-rejected-allocation-witness' ? 'labelled allocation-failure diagnostic; selected after observing rejected prototype' : 'fixed controlled fixture; selected before outcomes'}`
      + (boundedComparison ? ` · ${game === 1 ? 'bounded attachment explicitly opted in by diagnostic preload at recorded source' : 'linear attachment default at recorded source'}` : ''),
    plan: { personnel: '11', formation: 'ace_11', qb: 'under', concept: RUN_BY_ID[p.run].scheme,
      playAction: false, audible: false, defPersonnel: 'base43', front: p.front, coverage: 'cover3', called: 'cover3',
      family: 'cover3', shell: 'one-high', pressure: false, rushers: 4 },
    replay: { los: p.los, firstDownX: p.firstDownX, flip: p.flip, frames: result.frames, events: result.events, telemetry: result.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, game), id: `${game === 0 ? 'BASE' : 'CAND'}-${p.id}`, fixtureId: p.id,
    fixtureSeed: p.seed, sourceLabel: labels[game], sourceSha256: film.sourceBefore, filmSelection: p.selection, ...modeFields(game) };
}));
const data = {
  meta: { sourceSha256: inputs[1].sourceBefore, sourceComparison: inputs.map((f, i) => ({ label: labels[i], sourceSha256: f.sourceBefore, ...modeFields(i) })),
    ...(boundedComparison ? { physicsMode: [false, true], preloadPath, preloadSha256, experimentOptIn: true,
      productionEnabled: false, scriptSha256: reports[0].scriptSha256, profilesSha256: reports[0].cohort.rosterSha256,
      inputSha256: hash(reports[0].cohort), cohortSha256: hash({ cohort: reports[0].cohort, filmIds: reports[0].filmIds }) } : {}),
    telemetryLevel: 'full', cohort: boundedComparison
      ? `26 matched controlled fixtures: fixed12 inputs plus one explicitly labelled Counter allocation-failure diagnostic, each replayed under one engine source in Linear and Bounded experiment modes; no league estimates. Input order declares Linear followed by the explicit diagnostic preload experiment (${preloadPath}, SHA-256 ${preloadSha256}). The recorded source had a linear default; this controlled comparison predates promotion, which is documented separately in the latest physics review. All mode/default metadata refers to the recorded source. Runtime mode was not recorded by the original film schema; mode labels preserve the declared generation commands. Compact panel companions verify unchanged source/script/input/cohort/profile pins and seven observer checks.`
      : '26 matched controlled fixtures: fixed12 inputs plus one explicitly labelled Counter allocation-failure diagnostic, each replayed under two engine sources; no league estimates.',
    seed: 3, final: { home: 0, away: 0 }, quarters: [],
    home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
    away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: inputs.map((f, i) => ({ seed: 3, label: labels[i], sourceSha256: f.sourceBefore, ...modeFields(i), final: { home: 0, away: 0 }, quarters: [] })),
  plays: compactReplayPlays(plays), catalog: { coverage: Object.fromEntries(COVERAGES.map(c => [c.id, c.name])),
    front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])), formation: Object.fromEntries(FORMATIONS.map(f => [f.id, f.name])) },
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n${template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/'))}\n</body></html>\n`;
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(`Wrote ${plays.length} matched fixed-input full-state clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);

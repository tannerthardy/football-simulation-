/** Offline replay of the predetermined matched run-contact panel film subset.
 * node --import tsx scripts/export-run-contact-review.ts baseline-film.json candidate-film.json output.html
 * Reads saved plays only; never resimulates, selects by result, or changes viewer UI.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const [baselinePath, candidatePath, output] = process.argv.slice(2);
if (!baselinePath || !candidatePath || !output || process.argv.length !== 5)
  throw new Error('Usage: export-run-contact-review.ts baseline-film.json candidate-film.json output.html');
const inputs = [baselinePath, candidatePath].map(path => JSON.parse(readFileSync(path, 'utf8')) as SavedFilm);
for (const film of inputs) {
  if (film.schema !== 'run-contact-review-film-v1' || film.sourceBefore !== film.sourceAfter || film.plays.length !== 13
    || film.plays.filter(p => p.selection === 'fixed-before-outcomes').length !== 12
    || film.plays.filter(p => p.selection === 'diagnostic-rejected-allocation-witness').length !== 1)
    throw new Error('Expected source-pinned12 fixed film fixtures plus one labelled Counter diagnostic');
}
if (inputs[0].plays.map(p => p.id).join('|') !== inputs[1].plays.map(p => p.id).join('|'))
  throw new Error('Baseline/candidate film identities do not match');
const labels = ['Baseline', 'Candidate'];
const plays = inputs.flatMap((film, game) => film.plays.map((p, index) => {
  const result = p.result;
  if (!result.frames?.length || !result.telemetry) throw new Error(`Missing recorded state for ${p.id}`);
  const log: PlayLog = { index, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10, yardline: p.los - 10,
    call: `${labels[game]}${p.selection === 'diagnostic-rejected-allocation-witness' ? ' diagnostic' : ''} · ${p.offCall}`, defense: p.defCall, kind: 'run', yards: result.offenseYards,
    score: { home: 0, away: 0 }, stats: result.stats, outcome: result.outcome,
    text: `${labels[game]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${result.outcome} · ${result.offenseYards.toFixed(2)} yd · ${p.selection === 'diagnostic-rejected-allocation-witness' ? 'labelled allocation-failure diagnostic; selected after observing rejected prototype' : 'fixed controlled fixture; selected before outcomes'}`,
    plan: { personnel: '11', formation: 'ace_11', qb: 'under', concept: RUN_BY_ID[p.run].scheme,
      playAction: false, audible: false, defPersonnel: 'base43', front: p.front, coverage: 'cover3', called: 'cover3',
      family: 'cover3', shell: 'one-high', pressure: false, rushers: 4 },
    replay: { los: p.los, firstDownX: p.firstDownX, flip: p.flip, frames: result.frames, events: result.events, telemetry: result.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, game), id: `${game === 0 ? 'BASE' : 'CAND'}-${p.id}`, fixtureId: p.id,
    fixtureSeed: p.seed, sourceLabel: labels[game], sourceSha256: film.sourceBefore, filmSelection: p.selection };
}));
const data = {
  meta: { sourceSha256: inputs[1].sourceBefore, sourceComparison: inputs.map((f, i) => ({ label: labels[i], sourceSha256: f.sourceBefore })),
    telemetryLevel: 'full', cohort: '26 matched controlled fixtures: fixed12 inputs plus one explicitly labelled Counter allocation-failure diagnostic, each replayed under two engine sources; no league estimates.',
    seed: 3, final: { home: 0, away: 0 }, quarters: [],
    home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
    away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: inputs.map((f, i) => ({ seed: 3, label: labels[i], sourceSha256: f.sourceBefore, final: { home: 0, away: 0 }, quarters: [] })),
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

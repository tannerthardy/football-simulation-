/** Export saved full-state isolated tackles under two engine sources.
 * node --import tsx scripts/export-approach-tackles.ts baseline-film.json candidate-film.json output.html
 * Never resimulates or selects by outcome. Raw absolute-time results stay in
 * the film files; the viewer shifts their recorded clocks by the staged 2 s.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PlayLog } from '../src/game/game.js';
import type { PlayResult } from '../src/sim/types.js';
import type { ApproachTackleFilm, ApproachTackleFilmPlay } from './diag/approach-tackle-review.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';
import { packReplayPlay } from './replay-data.js';

const [baselinePath, candidatePath, output] = process.argv.slice(2);
if (!baselinePath || !candidatePath || !output || process.argv.length !== 5)
  throw new Error('Usage: export-approach-tackles.ts baseline-film.json candidate-film.json output.html');
const films = [baselinePath, candidatePath].map(path => JSON.parse(readFileSync(path, 'utf8')) as ApproachTackleFilm);
const expectedIds = [19, 20, 21, 22].flatMap(seed => ['L', 'R'].map(side => `AT-S${seed}-${side}`));
for (const film of films) {
  if (film.schema !== 'approach-tackle-review-film-v1' || film.sourceBefore !== film.sourceAfter
    || film.plays.map(p => p.id).join('|') !== expectedIds.join('|')
    || film.plays.some(p => !p.recordingVerified || p.sourceSha256 !== film.sourceBefore
      || p.selection !== 'fixed-four-seeds-after-diagnostic-geometry' || p.simulationStartedAt !== 2))
    throw new Error('Expected source-pinned, observer-verified eight-fixture approach-tackle film');
}
if (films[0].inputSha256 !== films[1].inputSha256 || films[0].scriptSha256 !== films[1].scriptSha256)
  throw new Error('Baseline/candidate recording inputs or diagnostic script do not match');

const round = (x: number) => Math.round(x * 100) / 100;
function relativeReplay(p: ApproachTackleFilmPlay): PlayResult {
  const result = structuredClone(p.result), start = p.simulationStartedAt;
  if (!result.frames?.length || result.telemetry?.level !== 'full') throw new Error(`Missing full recording for ${p.id}`);
  result.frames = result.frames.filter(f => f.t >= start).map(f => ({ ...f, t: round(f.t - start) }));
  result.events = result.events.filter(e => e.t >= start).map(e => ({ ...e, t: round(e.t - start) }));
  result.duration = round(result.duration - start);
  result.telemetry.frames = result.telemetry.frames.filter(f => f.t >= start).map(f => ({ ...f, t: round(f.t - start),
    perception: f.perception?.map(o => ({ ...o, t: round(o.t - start) })),
    ball: f.ball && { ...f.ball, arrivalT: f.ball.arrivalT === undefined ? undefined : round(f.ball.arrivalT - start) } }));
  result.telemetry.decisions = result.telemetry.decisions.filter(d => d.t >= start).map(d => ({ ...d, t: round(d.t - start) }));
  if (result.frames.length < 2 || result.frames[0].t !== 0 || result.telemetry.frames[0]?.t !== 0)
    throw new Error(`Missing recorded start of isolated encounter ${p.id}`);
  return result;
}

const labels = ['Baseline', 'Candidate'];
const plays = films.flatMap((film, group) => film.plays.map((p, index) => {
  const result = relativeReplay(p);
  const advance = result.endX - p.initialCarrierPosition.x;
  const text = `${labels[group]} · ${p.id} · source ${film.sourceBefore.slice(0, 12)} · ${result.outcome}`
    + ` · ${advance.toFixed(2)} yd after staged catch · raw engine LOS gain ${result.yards.toFixed(2)} yd includes the initial 10 yd lead.`
    + ' Fixed isolated geometry selected after a diagnostic; four play seeds and their mirrors, not a tackle-rate sample.'
    + ' Viewer clocks subtract 2 s from the raw engine tick labels (50 ms); recorded positions are tick-boundary samples.';
  const log: PlayLog = { index, quarter: 1, clock: 0, offense: 'OFF', down: 1, distance: 10, yardline: 30,
    call: `${labels[group]} · Isolated post-catch crossing`, defense: 'One safety; bystanders parked', text,
    yards: result.yards, score: { home: 0, away: 0 }, kind: result.kind, stats: result.stats, outcome: result.outcome,
    // These labels describe the controls that actually execute. The raw
    // constructor's four-verts/Cover3 call is only a roster/setup scaffold.
    plan: { personnel: 'isolation', formation: 'isolated', qb: 'gun', concept: 'post_catch_crossing',
      playAction: false, audible: false, defPersonnel: 'isolation', front: 'isolated', coverage: 'isolated_pursuit',
      family: 'isolation', shell: 'one safety; bystanders parked', pressure: false, rushers: 0 },
    replay: { los: 40, firstDownX: 50, flip: false, frames: result.frames!, events: result.events, telemetry: result.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey,
        pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn,
        weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, group), id: `${group === 0 ? 'BASE' : 'CAND'}-${p.id}`,
    kindLabel: 'Tackle probe', read: undefined,
    concept: { id: 'post_catch_crossing', name: 'Isolated post-catch crossing', family: 'isolation' },
    fixtureId: p.id, fixtureSeed: p.seed, sourceLabel: labels[group], sourceSha256: film.sourceBefore,
    filmSelection: p.selection, postCatchAdvanceYd: round(advance), rawEngineGainYd: result.yards,
    rawSimulationStartedAt: p.simulationStartedAt, rawSimulationDuration: p.result.duration };
}));
const cohort = '16 matched isolated post-catch tackles: one fixed roster pair, four play seeds and both mirrors under two engine sources. '
  + 'One straight runner and one safety pursue; 20 bystanders are parked. Tackle execution rolls and grip/contact physics are unchanged. '
  + 'The geometry was selected after observing a crossing approach; this is not a random NFL/game cohort. '
  + 'Raw credited LOS gain includes 10 yd already covered by the staged runner. Separate post-catch advance is shown for each clip. '
  + 'Raw absolute-time recordings are preserved in the saved film files; viewer clocks subtract 2 s, retaining 50 ms tick labels. '
  + 'Playbook assignments/QB beliefs retained by the construction scaffold are recorded state, not controls executing a pass play.';
const data = {
  meta: { sourceSha256: films[1].sourceBefore, sourceComparison: films.map((f, i) => ({ label: labels[i], sourceSha256: f.sourceBefore })),
    telemetryLevel: 'full', cohort, seed: 19, final: { home: 0, away: 0 }, quarters: [],
    home: { name: 'Isolated Carrier', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
    away: { name: 'Isolated Safety', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: films.map((f, i) => ({ seed: 19, label: labels[i], sourceSha256: f.sourceBefore,
    final: { home: 0, away: 0 }, quarters: [] })), plays: compactReplayPlays(plays),
  catalog: { coverage: { isolated_pursuit: 'One safety; bystanders parked' },
    front: { isolated: 'One safety; bystanders parked' }, formation: { isolated: 'Isolated running encounter' } },
};
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8'), marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template missing data marker');
// The generic packer requires down/score fields. Cohort mode hides scores;
// this post-catch-only library also hides the irrelevant down-and-distance.
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
  + '<style>#dd{display:none}</style></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, html);
console.log(`Wrote ${plays.length} observer-verified isolated tackle clips to ${output}; ${(html.length / 1024 / 1024).toFixed(2)}MB.`);

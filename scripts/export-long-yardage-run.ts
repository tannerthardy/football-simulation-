/** Export four predetermined stored long-yardage films; no resimulation.
 * node --import tsx scripts/export-long-yardage-run.ts panel.json[.gz] panel-film.json.gz output.html
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import type { PlayLog } from '../src/game/game.js';
import type { RatingKey } from '../src/players/types.js';
import type { PlayResult } from '../src/sim/types.js';
import { packReplayPlay } from './replay-data.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

interface Row {
  id: string; signature: string; observerVerified: boolean | null; distance: number;
  snap: { profileSha256: string; alignedGeometrySha256: string; rushCount: number; coverageCount: number;
    defenders: Array<{ slot: string; depth: number }> };
  defenderReadTiming: Array<{ slot: string; firstRunAt: number | null; firstPassAt: number | null }>;
  yardsBeforePenaltyEnforcement: number; reachesLineToGainBeforePenalties: boolean;
}
interface Panel {
  schema: string; sourceBefore: string; sourceAfter: string; scriptSha256: string; observerVerifiedCount: number;
  cohort: { rosterSha256: string; selectedProfilesSha256: string }; filmIds: string[]; rows: Row[];
}
interface Film {
  schema: string; sourceBefore: string; sourceAfter: string; scriptSha256: string; cohort: Panel['cohort'];
  plays: Array<{ id: string; roster: number; run: 'iz_strong' | 'draw'; situation: string; look: 'rush4' | 'drop3';
    flip: boolean; seed: number; down: number; distance: number; los: number; firstDownX: number;
    offCall: string; defCall: string; selection: string; result: PlayResult; snap: Row['snap'];
    players: Array<{ team: 'O' | 'D'; slot: string; name: string; jersey: number; position: string;
      weightLb: number; heightIn: number; ratings: Record<RatingKey, number> }> }>;
}
const [panelPath, filmPath, output, extra] = process.argv.slice(2);
if (!panelPath || !filmPath || !output || extra)
  throw new Error('Usage: export-long-yardage-run.ts panel.json[.gz] panel-film.json.gz output.html');
const decode = (path: string) => { const bytes = readFileSync(path); return path.endsWith('.gz') ? gunzipSync(bytes) : bytes; };
const panelBytes = decode(panelPath), filmBytes = decode(filmPath);
const panel = JSON.parse(panelBytes.toString()) as Panel, film = JSON.parse(filmBytes.toString()) as Film;
const hash = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
const bytesHash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
if (panel.schema !== 'long-yardage-run-v1' || film.schema !== 'long-yardage-run-film-v1'
  || panel.sourceBefore !== panel.sourceAfter || film.sourceBefore !== film.sourceAfter
  || panel.sourceBefore !== film.sourceBefore || panel.scriptSha256 !== film.scriptSha256
  || hash(panel.cohort) !== hash(film.cohort) || panel.observerVerifiedCount !== 4 || film.plays.length !== 4
  || hash(panel.filmIds) !== hash(film.plays.map(p => p.id))) throw new Error('Expected matching source-pinned four fixed observer-verified recordings');
for (const p of film.plays) {
  const row = panel.rows.find(r => r.id === p.id), rushers = p.look === 'drop3' ? 3 : 4;
  if (!row || !row.observerVerified || hash(row.snap) !== hash(p.snap)
    || p.roster !== 0 || p.flip || p.down !== 3 || p.distance !== 27 || p.situation !== '3rd27'
    || p.players.length !== 22 || p.result.telemetry?.level !== 'full' || !p.result.frames?.length
    || p.result.frames[0].t !== 0 || p.result.outcome === 'timeout'
    || p.snap.rushCount !== rushers || p.snap.coverageCount !== 11 - rushers
    || p.snap.defenders.filter(d => ['FS', 'SS'].includes(d.slot)).some(d => d.depth !== 12))
    throw new Error(`Incomplete or mislabelled full recording ${p.id}`);
}
if (new Set(film.plays.map(p => p.snap.profileSha256)).size !== 1
  || new Set(film.plays.map(p => p.snap.alignedGeometrySha256)).size !== 1)
  throw new Error('The four fixed films must retain matched profiles and starting geometry');

const labels = ['Four rush / seven coverage', 'Three rush / eight coverage'];
const plays = film.plays.map(p => {
  const row = panel.rows.find(r => r.id === p.id)!, group = p.look === 'drop3' ? 1 : 0, r = p.result;
  const reads = ['DE_W', 'LB_M', 'FS', 'SS'].map(slot => {
    const d = row.defenderReadTiming.find(d => d.slot === slot)!;
    return `${slot}: first run read ${d.firstRunAt === null ? 'none before finish' : d.firstRunAt.toFixed(2) + ' s'}`;
  }).join('; ');
  const text = `${p.id} · stock dime Over / spot Quarters · ${labels[group]} · ${r.offenseYards.toFixed(2)} credited yd before penalty enforcement; `
    + `${row.reachesLineToGainBeforePenalties ? 'reaches' : 'does not reach'} the 27-yard line to gain. `
    + 'Actual safeties start 12 yd deep. Four front players remain; the three-rusher look drops DE_W into curl-flat coverage. '
    + `${reads}. These are observed read-event times, not explanations for every move. `
    + 'Same generated players, geometry and play seed; no forced gains, motion or invented prevent depth.';
  const log: PlayLog = { index: p.run === 'draw' ? 1 : 0, quarter: 0, clock: 0, offense: 'OFF', down: p.down,
    distance: p.distance, yardline: p.los - 10, score: { home: 0, away: 0 }, call: p.offCall, defense: p.defCall,
    text, kind: 'run', yards: r.offenseYards, firstDown: row.reachesLineToGainBeforePenalties,
    stats: r.stats, outcome: r.outcome, duration: r.duration,
    plan: { personnel: '11', formation: 'gun_doubles_11', qb: 'gun', concept: p.run === 'draw' ? 'draw' : 'insideZone',
      playAction: false, audible: false, defPersonnel: 'dime', front: 'over', coverage: 'cover4', called: 'cover4',
      family: 'cover4', shell: 'two-high', pressure: p.look === 'drop3', rushers: p.snap.rushCount },
    replay: { los: p.los, firstDownX: p.firstDownX, flip: p.flip, frames: r.frames!, events: r.events, telemetry: r.telemetry,
      players: p.players.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.jersey, pos: a.position, weightLb: a.weightLb })),
      profiles: p.players.map(a => ({ position: a.position, heightIn: a.heightIn, weightLb: a.weightLb, ratings: { ...a.ratings } })) } };
  return { ...packReplayPlay(log, group), id: p.id, fixtureSeed: p.seed, sourceLabel: labels[group],
    sourceSha256: film.sourceBefore, physicalSha256: row.signature, profileSha256: p.snap.profileSha256,
    alignedGeometrySha256: p.snap.alignedGeometrySha256, filmSelection: p.selection };
});
const cohort = 'Four predetermined actual 11-on-11 films: first roster pair, right direction, third & 27, Inside Zone and Draw, both rush counts. '
  + 'The measured panel also contains matched first & 10 controls and mirrored calls using two roster pairs (32 total snaps). '
  + 'Stock dime Over / spot Quarters retains safeties at 12 yd. Three rush/eight cover means a weak edge drops from a four-front-player package; this is not a complete NFL prevent scheme. '
  + 'The third-long situation affects existing run/pass belief; it does not create a deeper shell. Compare read timing, blocking angles, first contact and pursuit. '
  + 'All gains are pre-penalty; field gain and conversion are separate. Full telemetry and player profiles are recorded from the snap; there is no game quarter, clock or score.';
const data = { meta: { sourceSha256: film.sourceBefore, scriptSha256: film.scriptSha256,
  panelInputSha256: bytesHash(panelBytes), filmInputSha256: bytesHash(filmBytes),
  rosterSha256: film.cohort.rosterSha256, selectedProfilesSha256: film.cohort.selectedProfilesSha256,
  seed: 3, telemetryLevel: 'full', cohort, final: { home: 0, away: 0 }, quarters: [],
  home: { name: 'Controlled Offense', abbr: 'OFF', color: '#1d4f91', text: '#ffffff' },
  away: { name: 'Controlled Defense', abbr: 'DEF', color: '#a3302a', text: '#ffffff' } },
  games: labels.map(label => ({ label, seed: 3, sourceSha256: film.sourceBefore, final: { home: 0, away: 0 }, quarters: [] })),
  plays: compactReplayPlays(plays), catalog: { coverage: { cover4: 'Spot Quarters (stock depth)' },
    front: { over: 'Dime Over' }, formation: { gun_doubles_11: 'Gun Doubles' } } };
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null', cardClock = "${esc(p.id)} · ${p.q <= 4 ? 'Q' + p.q : 'OT'} ${clk(p.clk)}";
if (!template.includes(marker) || !template.includes(cardClock)) throw new Error('Replay template markers changed');
template = template.replace(cardClock, '${esc(p.id)} · Controlled 3rd & 27');
const html = '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n'
  + template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
mkdirSync(dirname(output), { recursive: true }); writeFileSync(output, html);
console.log(`Wrote four fixed long-yardage recordings to ${output}; ${(html.length / 1024 / 1024).toFixed(2)} MB.`);

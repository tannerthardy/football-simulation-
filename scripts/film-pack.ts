/** Build an ordinary-first, source-qualified film pack without changing games.
 *   npm run film-pack -- --seed 101 --games 12 --out out/film-pack/seed101
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Rng } from '../src/core/rng.js';
import { simulateGame } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { COVERAGES, FRONTS } from '../src/playbook/defense.js';
import { FORMATIONS } from '../src/playbook/formations.js';
import { packReplayPlay } from './replay-data.js';
import { installPlayArtTap, matchSheets, takeSheets } from './play-art.js';
import { sourceVersion } from './source-version.js';
import { engineSettings } from './scorecard/provenance.js';
import { weirdObserver } from './scorecard/weird/observe.js';
import type { WeirdEvent } from './scorecard/weird/types.js';
import { selectFilmPlays, type SelectionPlay } from './film-pack-selection.js';
import { renderFilmPart, splitFilmParts, type FilmReplayContext, type ReplayClip } from './film-pack-render.js';
import { FILM_PACK_VERSION, type FilmPackManifest } from './film-pack-types.js';
import { retainFilmInputs } from './film-pack-inputs.js';

export function filmPackOptions(args: string[]) {
  let seed = 7, games = 12, out: string | undefined, runOnly = false;
  const seen = new Set<string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--seed', '--games', '--out', '--run-only'].includes(flag) || seen.has(flag)) throw new Error(`Unknown/repeated film-pack argument: ${flag}`);
    seen.add(flag);
    // Every offensive scrimmage call is a designed run (GameOptions.runOnly); takes no value.
    if (flag === '--run-only') { runOnly = true; continue; }
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    if (flag === '--seed') seed = Number(value);
    if (flag === '--games') games = Number(value);
    if (flag === '--out') out = value;
  }
  if (!Number.isSafeInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('--seed must be an integer from 0 to 4294967295');
  if (!Number.isInteger(games) || games < 1 || games > 50) throw new Error('--games must be an integer from 1 to 50');
  if (seed + games - 1 > 0xffffffff) throw new Error('Game seeds exceed 4294967295');
  return { seed, games, out: out ?? `out/film-pack/seed${seed}${runOnly ? '-run' : ''}`, ...(runOnly ? { runOnly: true as const } : {}) };
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Actions' shallow PR checkout need not contain origin/develop. Accept its
 * declared base only when it is the actual first parent of the checked-out
 * merge, with the declared PR head as second parent; never guess from an id.
 */
export function eventDevelopCommit(head: string, commit: string, event: {
  ref?: string; after?: string;
  pull_request?: { base: { ref: string; sha: string }; head: { sha: string } };
}): string | undefined {
  if (event.ref === 'refs/heads/develop' && event.after === head) return head;
  const parents = [...commit.matchAll(/^parent ([a-f0-9]{40})$/gm)].map(m => m[1]);
  const pr = event.pull_request;
  if (pr?.base?.ref === 'develop' && parents.length === 2
    && parents[0] === pr.base.sha && parents[1] === pr.head?.sha) return pr.base.sha;
  return undefined;
}

function developCommit(head: string, git: (...args: string[]) => string): string {
  if (process.env.GITHUB_EVENT_PATH) {
    const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
    const declared = eventDevelopCommit(head, git('cat-file', '-p', 'HEAD'), event);
    if (declared) return declared;
  }
  try { return git('merge-base', 'HEAD', 'origin/develop'); }
  catch { throw new Error('Develop identity unavailable: fetch origin develop with its history before building a film pack.'); }
}

function measurementIdentity() {
  const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true })
    .flatMap(e => e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
  const paths = ['scripts/film-pack.ts', 'scripts/film-pack-types.ts', 'scripts/film-pack-selection.ts',
    'scripts/film-pack-render.ts', 'scripts/film-pack-inputs.ts', 'scripts/diag/saved-play.ts',
    'scripts/replay-data.ts', 'scripts/scorecard/provenance.ts',
    'scripts/source-version.ts', 'viewer/replay.template.html', ...files('scripts/scorecard/weird')];
  const hash = createHash('sha256');
  for (const p of paths.sort()) hash.update(p).update('\0').update(readFileSync(p)).update('\0');
  return hash.digest('hex');
}

/** All game generation matches export-replay.ts: one roster RNG, same names,
 * strengths, team order and consecutive game seeds. The existing observer only
 * reads; selection uses separate streams after all games have finished.
 */
export function buildFilmPack(options: ReturnType<typeof filmPackOptions>, progress = console.log): FilmPackManifest {
  const started = performance.now();
  const out = resolve(options.out);
  mkdirSync(out, { recursive: true });
  // Retain complete original clips for offline inspection; never put them in Git.
  const raw = join(out, 'raw');
  mkdirSync(raw, { recursive: true });
  const rng = new Rng(options.seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const headCommit = git('rev-parse', 'HEAD');
  const source: FilmPackManifest['source'] = {
    developCommit: developCommit(headCommit, git), headCommit,
    engineSha256: sourceVersion(), engineDirty: git('status', '--porcelain', '--', 'src') !== '',
    measurementSha256: measurementIdentity(), lockfileSha256: sha256(readFileSync('package-lock.json', 'utf8')),
    node: process.version, settings: engineSettings(process.env),
    // runOnly joins the hash only when set, so every default pack keeps its identity.
    inputSha256: sha256(JSON.stringify({ seed: options.seed, games: options.games, ...(options.runOnly ? { runOnly: true } : {}), home, away })),
  };
  installPlayArtTap();
  const population: SelectionPlay[] = [], events: WeirdEvent[] = [];
  const games: FilmReplayContext['games'] = [];
  for (let i = 0; i < options.games; i++) {
    const seed = options.seed + i;
    const obs = weirdObserver({ idPrefix: '', game: i + 1, cap: Infinity });
    takeSheets();
    const game = simulateGame(home, away, { seed, record: true, recordLevel: 'light', hooks: obs.hooks, ...(options.runOnly ? { runOnly: true } : {}) });
    events.push(...obs.finish(game).events);
    const quarters = [...game.quarterScores];
    const last = quarters.at(-1);
    if (!last || last.home !== game.score.home || last.away !== game.score.away) quarters.push({ ...game.score });
    games.push({ seed, final: game.score, quarters });
    const art = matchSheets(game.log, takeSheets());
    const clips = game.log.map(p => packReplayPlay(p, i, art.get(p)));
    writeFileSync(join(raw, `game-${i + 1}.json`), JSON.stringify(clips));
    for (const p of clips) population.push({ id: p.id, game: i + 1, kind: p.kind, down: p.down,
      distance: p.dist, yardline: p.yl, call: p.call, defense: p.def, yards: p.yds,
      nullified: p.nullified, filmed: 'frames' in p, flags: p.flags });
    progress(`Game ${i + 1}/${options.games} · seed ${seed}: ${home.name} ${game.score.home} — ${away.name} ${game.score.away}`);
  }
  writeFileSync(join(raw, 'weird-events.json'), JSON.stringify(events));
  const selected = selectFilmPlays(population, events, options.seed);
  const manifest: FilmPackManifest = {
    schemaVersion: 1, selectionVersion: FILM_PACK_VERSION, seed: options.seed, gameCount: options.games,
    ...(options.runOnly ? { runOnly: true as const } : {}),
    source, telemetry: 'light', selection: selected.selection,
    beforeAfter: { status: 'reserved-for-F2', targetPairs: 20, pairs: [],
      note: 'F2 supplies a separate source-qualified pair sidecar; these original selections remain unchanged.' },
    parts: [], plays: selected.plays,
  };
  const wanted = new Set(manifest.plays.map(p => p.id));
  const clips = new Map<string, ReplayClip>();
  for (let i = 0; i < options.games; i++) {
    if (!manifest.plays.some(p => p.game === i + 1)) continue;
    const saved = JSON.parse(readFileSync(join(raw, `game-${i + 1}.json`), 'utf8')) as ReplayClip[];
    for (const clip of saved) if (wanted.has(clip.id)) clips.set(clip.id, clip);
  }
  const context: FilmReplayContext = {
    meta: { ...games[0], sourceSha256: source.engineSha256, telemetryLevel: 'light',
      home: { name: home.name, abbr: home.abbr, color: '#a3302a', alt: '#f4efe6', text: '#ffffff' },
      away: { name: away.name, abbr: away.abbr, color: '#1d4f91', alt: '#f2c14e', text: '#ffffff' } },
    games, catalog: {
      coverage: Object.fromEntries(COVERAGES.map(c => [c.id, c.name])),
      front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])),
      formation: Object.fromEntries(FORMATIONS.map(f => [f.id, `${f.name} · ${f.personnel}`])),
    },
  };
  const template = readFileSync('viewer/replay.template.html', 'utf8');
  const parts = splitFilmParts(manifest.plays.map(selection => ({ selection, clip: clips.get(selection.id)! })),
    items => renderFilmPart(template, context, items));
  parts.forEach((part, i) => {
    const file = `part-${String(i + 1).padStart(2, '0')}.html`;
    writeFileSync(join(out, file), part.html);
    for (const item of part.items) item.selection.part = file;
    manifest.parts.push({ file, bytes: part.bytes, ids: part.items.map(p => p.selection.id) });
  });
  const settings = Object.entries(source.settings);
  const environment = [...settings.filter(([, value]) => value === null).map(([key]) => `-u ${key}`),
    ...settings.filter(([, value]) => value !== null)
      .map(([key, value]) => `${key}=${typeof value === 'boolean' ? Number(value) : value}`)];
  const rebuild = `npm ci --no-audit --no-fund\nenv ${environment.join(' ')} npm run film-pack -- --seed ${options.seed} --games ${options.games}${options.runOnly ? ' --run-only' : ''} --out out/film-pack/seed${options.seed}${options.runOnly ? '-run' : ''}`;
  const index = ['# Film review pack', '', `Seed ${options.seed}; ${options.games} games${options.runOnly ? ' (run-only: every offensive call a designed run)' : ''}; develop ${source.developCommit}.`, '',
    `Engine ${source.engineSha256}; tooling ${source.measurementSha256}; Node ${source.node}.`, '',
    'Watch ordinary, watch-first, then big plays; each part opens in that order. No play is in two groups.', '',
    ...manifest.parts.map(p => `- [${p.file}](${p.file}) — ${p.bytes} bytes: ${p.ids.join(', ')}`), '',
    ...Object.entries(manifest.selection.counts).map(([g, n]) => `${g}: ${n} plays.`), '',
    'Before/after: 20 pair slots reserved for F2; empty in this pack.', '',
    'Selected constructor inputs: [inputs/index.json](inputs/index.json). The F2 saved-path selector is inputs/selection.json.',
    'Inputs are recaptured on this exact engine/settings, checked against the original clips, and kept private alongside the film.', '',
    ...manifest.selection.notes, '',
    'Rebuild with the recorded tooling HEAD (or a descendant with identical engine/tool hashes), Node and engine settings.',
    `HEAD: ${headCommit}. Engine working-tree edits: ${source.engineDirty}. Settings: ${JSON.stringify(source.settings)}.`,
    'Use a fresh output directory. Raw source clips and uncapped detector events are in raw/; only the listed HTML parts are size-limited.', '',
    '```sh', `git checkout ${headCommit}`, rebuild, '```', ''];
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  writeFileSync(join(out, 'index.md'), index.join('\n'));
  const inputs = retainFilmInputs(out);
  progress(`${inputs.captured}/${inputs.requested} selected constructors retained in inputs/`);
  const elapsedSeconds = (performance.now() - started) / 1000;
  writeFileSync(join(out, 'build.json'), JSON.stringify({ elapsedSeconds }, null, 2) + '\n');
  progress(`${manifest.plays.length} selected; ${parts.length} HTML parts; ${elapsedSeconds.toFixed(2)} seconds -> ${out}`);
  for (const note of manifest.selection.notes.slice(3)) progress(note);
  return manifest;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  process.chdir(root);
  buildFilmPack(filmPackOptions(process.argv.slice(2)));
}

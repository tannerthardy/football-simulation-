/** Retain only a frozen film selection, using the existing SavedPlay contract.
 * Selection happens after games finish, so a bounded second prefix avoids
 * serializing every constructor. Original film bytes are never replaced.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize } from 'node:v8';
import { Rng } from '../src/core/rng.js';
import { Game, type GameHooks, type PlayLog, type PlaySetupContext } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import type { PlayResult } from '../src/sim/types.js';
import { bytesHash, captureSetup, copySaved, executionIdentity, firstDifference, initialState,
  type SavedPlay } from './diag/saved-play.js';
import { packReplayPlay } from './replay-data.js';
import type { FilmPackManifest } from './film-pack-types.js';

type Pending = { setup: Buffer; context: PlaySetupContext;
  initial?: ReturnType<typeof initialState>; result?: PlayResult };

/** Read-only instance wrappers, as in #254/#315. Never run a play from a hook. */
export function selectedInputCapture(indices: ReadonlySet<number>) {
  const pending = new Map<number, Pending>();
  let current: Pending | undefined;
  const hooks: GameHooks = {
    playSetup(setup, context) {
      current = context.kind === 'scrimmage' && indices.has(context.index)
        ? { setup: captureSetup(setup), context: copySaved(context) } : undefined;
      if (current) pending.set(context.index, current);
    },
    playResult(sim) {
      const p = current;
      if (!p) return undefined;
      p.initial = initialState(sim);
      const run = sim.run.bind(sim);
      sim.run = () => {
        const result = run();
        p.result = copySaved(result); // Freeze before official bookkeeping mutates stats.
        return result;
      };
      return undefined;
    },
  };
  return { hooks, take(index: number) {
    const p = pending.get(index);
    pending.delete(index);
    return p;
  } };
}

export function savedSelectedInput(p: Pending | undefined, film: PlayLog, identity: SavedPlay['identity'],
  game: SavedPlay['game']): SavedPlay | string {
  if (!p) return 'no scrimmage constructor (kick, scripted pre-snap foul or unsupported entry)';
  if (!p.initial || !p.result) return 'native snap prevented; no executed play to restore';
  if (!film.replay) return 'executed play has no recorded replay';
  return { format: 'constructor-play-v1', identity, game, context: p.context,
    setup: p.setup, setupSha256: bytesHash(p.setup),
    original: { initial: p.initial, result: p.result, replay: copySaved(film.replay) }, film: copySaved(film) };
}

type InputRow = { id: string; status: 'captured'; path: string; sha256: string; setupSha256: string;
  referenceClipSha256: string; nullified: boolean } | { id: string; status: 'unavailable'; reason: string };

/** Accept legacy manifests without a sidecar, but require the original operator
 * context before any recapture. A newer engine never impersonates an old film.
 */
export function retainFilmInputs(packDirectory: string) {
  const pack = resolve(packDirectory), manifestBytes = readFileSync(join(pack, 'manifest.json'));
  const manifest = JSON.parse(manifestBytes.toString()) as FilmPackManifest;
  if (manifest.schemaVersion !== 1 || manifest.selectionVersion !== 'film-pack-v1' || manifest.telemetry !== 'light'
    || !Number.isSafeInteger(manifest.seed) || manifest.seed < 0 || !Number.isInteger(manifest.gameCount)
    || manifest.gameCount < 1 || manifest.gameCount > 50 || manifest.seed + manifest.gameCount - 1 > 0xffffffff
    || (manifest.runOnly !== undefined && manifest.runOnly !== true) || !Array.isArray(manifest.plays))
    throw Error('Unsupported film-pack source/selection contract');
  const identity = executionIdentity();
  const { engineSha256, settings, node, lockfileSha256 } = manifest.source;
  if (firstDifference({ engineSha256, settings, node, lockfileSha256 },
    { engineSha256: identity.engineSha256, settings: identity.settings, node: identity.node, lockfileSha256: identity.lockfileSha256 }))
    throw Error('Film source/settings/Node/lockfile mismatch; use the original source, no replacement capture');
  const rng = new Rng(manifest.seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: .55 });
  const input = JSON.stringify({ seed: manifest.seed, games: manifest.gameCount,
    ...(manifest.runOnly ? { runOnly: true } : {}), home, away });
  if (bytesHash(Buffer.from(input)) !== manifest.source.inputSha256) throw Error('Film roster/settings input identity mismatch');

  const ids = new Set<string>();
  for (const p of manifest.plays) {
    const match = /^G([1-9]\d*)-P(\d{3,})$/.exec(p.id);
    if (!match || Number(match[1]) !== p.game || p.game > manifest.gameCount
      || !Number.isSafeInteger(Number(match[2])) || Number(match[2]) < 1 || ids.has(p.id))
      throw Error(`Invalid or duplicate film selection: ${p.id}`);
    ids.add(p.id);
  }
  const out = join(pack, 'inputs');
  mkdirSync(out, { mode: 0o700 }); // Fresh directory only; never overwrite prior evidence.
  const rows = new Map<string, InputRow>();
  const rawHashes: Record<string, string> = {};
  for (let number = 1; number <= manifest.gameCount; number++) {
    const chosen = manifest.plays.filter(p => p.game === number);
    if (!chosen.length) continue;
    const raw = readFileSync(join(pack, 'raw', `game-${number}.json`));
    rawHashes[`game-${number}.json`] = bytesHash(raw);
    const reference = JSON.parse(raw.toString()) as ReturnType<typeof packReplayPlay>[];
    const wanted = new Map<number, string>();
    for (const p of chosen) {
      const clips = reference.filter(clip => clip.id === p.id);
      const reason = clips.length !== 1 ? 'missing or ambiguous original clip'
        : !('frames' in clips[0]) || !['run', 'pass'].includes(clips[0].kind)
          ? 'no recorded native scrimmage execution in the original clip' : undefined;
      if (reason) rows.set(p.id, { id: p.id, status: 'unavailable', reason });
      else wanted.set(Number(p.id.split('-P')[1]) - 1, p.id);
    }
    if (!wanted.size) continue;
    const capture = selectedInputCapture(new Set(wanted.keys()));
    const gameSeed = manifest.seed + number - 1;
    const game = new Game(home, away, { seed: gameSeed, record: true, recordLevel: 'light',
      ...(manifest.runOnly ? { runOnly: true } : {}), hooks: capture.hooks });
    game.kickoffToStart();
    // Same bounded prefix convention as the existing film-pairs capture worker.
    const maxSteps = Math.max(...wanted.keys()) + 1 + 20;
    for (let step = 1; step <= maxSteps && !game.state.over && wanted.size; step++) {
      game.step();
      for (const film of game.result().log) {
        const id = wanted.get(film.index);
        if (!id) continue;
        wanted.delete(film.index);
        const saved = savedSelectedInput(capture.take(film.index), film, identity,
          { seed: gameSeed, steps: step, complete: game.state.over, playId: id });
        if (typeof saved === 'string') { rows.set(id, { id, status: 'unavailable', reason: saved }); continue; }
        // Compare everything actually retained by the original JSON clip,
        // including its frames/events. This is not a lossless native-state check.
        const expected = reference.find(p => p.id === id);
        const actual = JSON.parse(JSON.stringify(packReplayPlay(film, number - 1)));
        const difference = firstDifference(expected, actual);
        if (difference) {
          rows.set(id, { id, status: 'unavailable', reason: `original clip mismatch at ${difference.path}` });
          continue;
        }
        const bytes = serialize(saved), path = `${id}.bin`;
        writeFileSync(join(out, path), bytes, { mode: 0o600, flag: 'wx' });
        rows.set(id, { id, status: 'captured', path, sha256: bytesHash(bytes), setupSha256: saved.setupSha256,
          referenceClipSha256: bytesHash(Buffer.from(JSON.stringify(expected))), nullified: !!film.nullified });
      }
    }
    for (const id of wanted.values()) rows.set(id, { id, status: 'unavailable', reason: 'game ended or prefix limit reached before selected entry' });
  }
  if (firstDifference(identity, executionIdentity())) throw Error('Capture source/settings changed during retention');
  const plays = manifest.plays.map(p => rows.get(p.id)!);
  const captured = plays.filter((p): p is Extract<InputRow, { status: 'captured' }> => p.status === 'captured');
  const index = { format: 'film-pack-inputs-v1', method: 'selected-prefix-recapture',
    reference: { manifestSha256: bytesHash(manifestBytes), source: manifest.source, rawHashes }, capture: identity,
    verification: 'exact persisted JSON clip; independent native restoration is checked by SavedPlay consumers',
    requested: plays.length, captured: captured.length, unavailable: plays.length - captured.length, plays };
  const write = (path: string, value: unknown) => writeFileSync(join(out, path), JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  write('index.json', index);
  write('selection.json', { format: 'film-pairs-v1', captureRef: identity.commit,
    plays: captured.map(p => ({ id: p.id, path: p.path, sha256: p.sha256 })) });
  if (index.unavailable) throw Error(`${index.unavailable}/${index.requested} selected inputs unavailable; see inputs/index.json (no substitutions)`);
  return index;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw Error('Usage: node --import tsx scripts/film-pack-inputs.ts <film-pack-directory>');
  const index = retainFilmInputs(process.argv[2]);
  console.log(`${index.captured}/${index.requested} selected constructors retained in inputs/; no upload`);
}

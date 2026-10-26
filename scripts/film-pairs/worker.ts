/** Executes imports from a pinned worktree, never from the caller's engine. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { serialize, deserialize } from 'node:v8';
import { isDeepStrictEqual } from 'node:util';
import { digest, setupSchema, type Captured, type Selection, type ArmRecord } from './model.js';
import type { SavedPlay } from '../diag/saved-play.js';

const [mode, requestFile] = process.argv.slice(2);
const request = JSON.parse(readFileSync(requestFile, 'utf8'));
const root = process.cwd();
const load = (p: string) => import(pathToFileURL(resolve(root, p)).href);
const savedApi = await load('scripts/diag/saved-play.ts');
const schema = setupSchema(readFileSync('src/sim/playsim.ts', 'utf8'));
if (process.version !== 'v22.23.3') throw Error('Saved-play pairing requires Node22.23.3');
const write = (p: string, value: unknown) => writeFileSync(p, serialize(value));

if (mode === 'capture') {
  const { Game } = await load('src/game/game.ts');
  const { Rng } = await load('src/core/rng.ts');
  const { generateTeam } = await load('src/league/team.ts');
  const rows: Captured[] = [];
  mkdirSync(request.out, { recursive: true });
  const save = (p: Selection, saved: SavedPlay, bytes: Buffer) => {
    if (!/^[a-f0-9]{40}$/.test(saved.identity.commit)) throw Error(`Invalid saved commit: ${p.id}`);
    if (saved.identity.node !== process.version) throw Error(`Node/schema incompatibility for ${p.id}`);
    const originalSchema = setupSchema(execFileSync('git', ['show', `${saved.identity.commit}:src/sim/playsim.ts`], { encoding: 'utf8' }));
    const file = resolve(request.out, `${rows.length}.bin`);
    writeFileSync(file, bytes);
    rows.push({ id: p.id, note: p.note ?? '', path: file, fileSha256: digest(bytes), setupSha256: saved.setupSha256,
      schemaSha256: originalSchema, captureCommit: saved.identity.commit });
  };
  const wanted: Selection[] = request.plays;
  for (const p of wanted.filter(p => p.path)) {
    const bytes = readFileSync(p.path!);
    if (p.sha256 && digest(bytes) !== p.sha256) throw Error(`Capture file checksum mismatch: ${p.id}`);
    save(p, savedApi.readSavedPlay(p.path), bytes);
  }
  const groups = new Map<string, Selection[]>();
  for (const p of wanted.filter(p => !p.path)) {
    const key = `${p.seed}/${p.game}`;
    groups.set(key, [...groups.get(key) ?? [], p]);
  }
  for (const group of groups.values()) {
    const { seed, game: gameNumber } = group[0];
    const rng = new Rng(seed);
    const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 });
    const away = generateTeam(rng, 'Comets', 'COM', { strength: .55 });
    let pending: { setup: Buffer; context: any; initial?: any; result?: any } | undefined;
    let captures: NonNullable<typeof pending>[] = [];
    const game = new Game(home, away, { seed: seed! + gameNumber! - 1, record: true, recordLevel: 'full', hooks: {
      playSetup(setup: any, context: any) {
        pending = context.kind === 'scrimmage' && group.some(p => p.play === context.index + 1)
          ? { setup: savedApi.captureSetup(setup), context: savedApi.copySaved(context) } : undefined;
        if (pending) captures.push(pending);
      },
      playResult(sim: any) {
        const c = pending;
        if (c) {
          c.initial = savedApi.initialState(sim);
          const run = sim.run.bind(sim);
          sim.run = () => { const result = run(); c.result = savedApi.copySaved(result); return result; };
        }
      },
    } });
    const remaining = new Set(group);
    game.kickoffToStart();
    const maxSteps = Math.max(...group.map(p => p.maxSteps ?? p.play! + 20));
    for (let step = 1; step <= maxSteps && !game.state.over && remaining.size; step++) {
      captures = []; game.step();
      const prefix = game.result();
      for (const c of captures) {
        const film = prefix.log.find((p: any) => p.index === c.context.index);
        if (!film?.replay || !c.initial || !c.result) continue;
        for (const p of remaining) if (p.play === c.context.index + 1) {
          const saved = { format: 'constructor-play-v1', identity: savedApi.executionIdentity(),
            game: { seed: seed! + gameNumber! - 1, steps: step, complete: game.state.over, playId: p.id },
            context: c.context, setup: c.setup, setupSha256: digest(c.setup),
            original: { initial: c.initial, result: c.result, replay: savedApi.copySaved(film.replay) }, film: savedApi.copySaved(film) } as SavedPlay;
          save(p, saved, serialize(saved)); remaining.delete(p);
        }
      }
      for (const p of remaining) if (prefix.log.some((f: any) => f.index + 1 >= p.play!))
        throw Error(`${p.id}: selected log entry did not produce a restorable scrimmage; no substitution`);
    }
    if (remaining.size) throw Error(`Capture limit/finished game before ${[...remaining].map(p => p.id).join(', ')}`);
  }
  rows.sort((a, b) => wanted.findIndex(p => p.id === a.id) - wanted.findIndex(p => p.id === b.id));
  writeFileSync(request.index, JSON.stringify(rows, null, 2));
} else if (mode === 'check' || mode === 'run') {
  const { PlaySim } = await load('src/sim/playsim.ts');
  const records: ArmRecord[] = [];
  for (const row of request.rows as Captured[]) {
    if (schema !== row.schemaSha256) throw Error(`${row.id}: incompatible PlaySetup source contract; explicit conversion required`);
    const bytes = readFileSync(row.path);
    if (digest(bytes) !== row.fileSha256) throw Error(`${row.id}: capture file changed`);
    const saved = savedApi.readSavedPlay(row.path) as SavedPlay;
    if (saved.identity.node !== process.version || digest(saved.setup) !== row.setupSha256) throw Error(`${row.id}: runtime/input identity mismatch`);
    const setup = savedApi.restoreSetup(saved.setup);
    // Rehydrating known classes can change V8 encoding/property allocation
    // without changing values. Check the full decoded graph; authoritative
    // input bytes and raw RNG/personnel digests remain independently fixed.
    if (!isDeepStrictEqual(deserialize(savedApi.captureSetup(setup)), deserialize(saved.setup)))
      throw Error(`${row.id}: setup values changed during class restoration`);
    const input = deserialize(saved.setup);
    const common = { identity: savedApi.executionIdentity(), inputSha256: row.setupSha256,
      inputRngSha256: digest(serialize(input.seed)),
      inputPersonnelSha256: digest(serialize({ offense: input.offense, defense: input.defense })) };
    if (mode === 'check') { records.push(common as ArmRecord); continue; }
    const sim = new PlaySim(setup), initialization = savedApi.initialState(sim);
    const result = sim.run();
    records.push({ ...common, initialization,
      execution: { initial: initialization, result, replay: savedApi.replayState(sim, result, saved.context) } });
  }
  write(request.output, records);
} else throw Error('Unknown film-pair worker mode');

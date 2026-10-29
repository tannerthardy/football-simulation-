import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { deserialize } from 'node:v8';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Rng } from '../src/core/rng.js';
import { Game, type GameHooks, type PlayLog } from '../src/game/game.js';
import { generateTeam } from '../src/league/team.js';
import { PlaySim } from '../src/sim/playsim.js';
import { bytesHash, copySaved, executionIdentity, firstDifference, readSavedPlay, restoreSetup,
  runRestoredPlay, type SavedPlay } from '../scripts/diag/saved-play.js';
import { selectedInputCapture, savedSelectedInput, retainFilmInputs } from '../scripts/film-pack-inputs.js';
import { buildFilmPack } from '../scripts/film-pack.js';
import { selectFilmPlays } from '../scripts/film-pack-selection.js';
import type { FilmPackManifest } from '../scripts/film-pack-types.js';
import { selections } from '../scripts/film-pairs/model.js';
import { packReplayPlay } from '../scripts/replay-data.js';
import { composeHooks } from '../scripts/scorecard/hooks.js';
import { weirdObserver } from '../scripts/scorecard/weird/observe.js';

const seed = 7, number = 2, gameSeed = seed + number - 1;
function teams() {
  const rng = new Rng(seed);
  return { home: generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 }),
    away: generateTeam(rng, 'Comets', 'COM', { strength: .55 }) };
}
function prefix(hooks?: GameHooks, runOnly?: true) {
  const { home, away } = teams();
  const game = new Game(home, away, { seed: gameSeed, record: true, recordLevel: 'light', hooks, ...(runOnly ? { runOnly } : {}) });
  game.kickoffToStart();
  const steps = new Map<number, number>();
  for (let step = 1; step <= 6; step++) {
    game.step();
    for (const p of game.result().log) if (!steps.has(p.index)) steps.set(p.index, step);
  }
  return { game, steps, result: copySaved(game.result()) };
}
function rngStates(game: Game) {
  // No draws: inspect the named game streams including cached normal state.
  return Object.fromEntries(Object.entries(game).filter(([, value]) => value instanceof Rng)
    .map(([key, value]) => [key, { ...value }]));
}

describe('selected film constructor sidecar', () => {
  let reference: ReturnType<typeof prefix>, observed: ReturnType<typeof prefix>;
  let films: PlayLog[], manifest: FilmPackManifest, saved: SavedPlay[];
  beforeAll(() => {
    const scout = weirdObserver({ idPrefix: '', game: number, cap: Infinity });
    reference = prefix(scout.hooks);
    const native = reference.result.log.filter(p => p.replay && !p.nullified && ['run', 'pass'].includes(p.kind));
    expect(native.length).toBeGreaterThanOrEqual(3);
    // Frozen before the capture arm: two endpoints of a six-step prefix (five until the squeeze read,
    // which with the containment bound left two native plays in five steps),
    // leaving a native play unselected. This tests identity, not football merit.
    films = [native[0], native.at(-1)!];
    const capture = selectedInputCapture(new Set(films.map(p => p.index)));
    const observedScout = weirdObserver({ idPrefix: '', game: number, cap: Infinity });
    observed = prefix(composeHooks(capture.hooks, observedScout.hooks));
    expect(observedScout.finish(observed.result).events).toEqual(scout.finish(reference.result).events);
    expect(capture.take(native[1].index)).toBeUndefined();
    const identity = executionIdentity();
    saved = films.map(p => {
      const f = observed.result.log.find(entry => entry.index === p.index)!;
      const value = savedSelectedInput(capture.take(p.index), f, identity,
        { seed: gameSeed, steps: observed.steps.get(p.index)!, complete: false,
          playId: `G${number}-P${String(p.index + 1).padStart(3, '0')}` });
      expect(typeof value).toBe('object');
      return value as SavedPlay;
    });
    const population = films.map(p => ({ id: `G${number}-P${String(p.index + 1).padStart(3, '0')}`,
      game: number, kind: p.kind, down: p.down, distance: p.distance, yardline: p.yardline,
      call: p.call, defense: p.defense, yards: p.yards, nullified: !!p.nullified, filmed: true,
      flags: { big: false, sack: false, to: false } }));
    const selection = selectFilmPlays(population, [], seed, { ordinary: 2, 'watch-first': 0, 'big-plays': 0 });
    const { home, away } = teams();
    manifest = { schemaVersion: 1, selectionVersion: 'film-pack-v1', seed, gameCount: number,
      telemetry: 'light', source: { ...identity, developCommit: identity.commit, headCommit: identity.commit,
        engineDirty: false, measurementSha256: 'declared-six-step-test-fixture',
        inputSha256: bytesHash(Buffer.from(JSON.stringify({ seed, games: number, home, away }))) },
      selection: selection.selection, plays: selection.plays, parts: [],
      beforeAfter: { status: 'reserved-for-F2', targetPairs: 20, pairs: [], note: 'test fixture' } };
  // Two six-step game prefixes: about 8 s alone, past Vitest's default 10 s hook limit under a full parallel run.
  }, 60_000);

  function pack(test: (dir: string) => void, changeManifest?: (m: FilmPackManifest) => void,
    changeClips?: (clips: ReturnType<typeof packReplayPlay>[]) => void) {
    mkdirSync('out', { recursive: true });
    const dir = mkdtempSync('out/film-inputs-test-');
    try {
      mkdirSync(join(dir, 'raw'));
      const m = copySaved(manifest); changeManifest?.(m);
      const clips = reference.result.log.map(p => packReplayPlay(p, number - 1)); changeClips?.(clips);
      writeFileSync(join(dir, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
      writeFileSync(join(dir, 'raw', `game-${number}.json`), JSON.stringify(clips));
      test(dir);
    } finally { rmSync(dir, { recursive: true }); }
  }

  it('preserves every game/result/replay field, detector event and RNG state, including continuation', () => {
    expect(observed.result).toEqual(reference.result);
    expect(observed.game.state).toEqual(reference.game.state);
    expect(rngStates(observed.game)).toEqual(rngStates(reference.game));
    const plain = prefix(); // Both observers absent, same actual game input.
    expect(plain.result).toEqual(reference.result);
    for (const game of [observed.game, reference.game, plain.game]) game.step();
    expect(observed.game.result()).toEqual(reference.game.result());
    expect(observed.game.result()).toEqual(plain.game.result());
    expect(rngStates(observed.game)).toEqual(rngStates(plain.game));
  });

  it('restores the complete native result/events/light replay from actual selected input, trace off and on', () => {
    for (const p of saved) {
      expect(restoreSetup(p.setup).recordLevel).toBe('light');
      expect(p.game.seed).toBe(8); // Game offset is not the roster seed.
      expect(p.game.playId.startsWith('G2-')).toBe(true);
      expect(runRestoredPlay(p).difference).toBeNull();
      expect(runRestoredPlay(p, { actor: { team: 'O', slot: 'QB' }, from: 0, to: .2 }).difference).toBeNull();
    }
  });

  it('adds only selected SavedPlay files and an existing F2 selector to a legacy pack, preserving original bytes', () => {
    pack(dir => {
      const before = readFileSync(join(dir, 'manifest.json'));
      const rawBefore = readFileSync(join(dir, 'raw', 'game-2.json'));
      const index = retainFilmInputs(dir);
      expect(index).toMatchObject({ requested: 2, captured: 2, unavailable: 0, method: 'selected-prefix-recapture' });
      expect(index.reference.manifestSha256).toBe(bytesHash(before));
      expect(readFileSync(join(dir, 'manifest.json'))).toEqual(before);
      expect(readFileSync(join(dir, 'raw', 'game-2.json'))).toEqual(rawBefore);
      const selector = selections(JSON.parse(readFileSync(join(dir, 'inputs', 'selection.json'), 'utf8')));
      expect(selector.plays.map(p => p.id)).toEqual(manifest.plays.map(p => p.id));
      for (const row of selector.plays) {
        const file = resolve(dir, 'inputs', row.path!);
        expect(bytesHash(readFileSync(file))).toBe(row.sha256);
        const p = readSavedPlay(file), prior = saved.find(s => s.game.playId === row.id)!;
        expect(firstDifference(deserialize(p.setup), deserialize(prior.setup))).toBeNull();
        expect(p.original).toEqual(prior.original);
        expect(runRestoredPlay(p).difference).toBeNull();
        expect(statSync(file).mode & 0o777).toBe(0o600);
      }
      expect(statSync(join(dir, 'inputs')).mode & 0o777).toBe(0o700);
      expect(() => retainFilmInputs(dir)).toThrow('EEXIST');
    });
  });

  it('automatically writes the selected sidecar without changing deterministic film selection in a bounded builder fixture', () => {
    // Exercise the real builder/renderer/capture wiring on declared six-step
    // native prefixes. This is not the existing full-game CLI acceptance test.
    const play = vi.spyOn(Game.prototype, 'play').mockImplementation(function (this: Game) {
      this.kickoffToStart();
      for (let step = 0; step < 4; step++) this.step();
      return this.result();
    });
    mkdirSync('out', { recursive: true });
    const root = mkdtempSync('out/film-input-builder-test-');
    try {
      const a = buildFilmPack({ seed, games: 1, out: join(root, 'a') }, () => {});
      const b = buildFilmPack({ seed, games: 1, out: join(root, 'b') }, () => {});
      expect(a.plays.length).toBeGreaterThan(0);
      expect(b).toEqual(a);
      expect(readFileSync(join(root, 'a', 'manifest.json'))).toEqual(readFileSync(join(root, 'b', 'manifest.json')));
      for (const part of a.parts) expect(readFileSync(join(root, 'a', part.file))).toEqual(readFileSync(join(root, 'b', part.file)));
      const inputs = JSON.parse(readFileSync(join(root, 'a', 'inputs', 'index.json'), 'utf8'));
      expect(inputs).toMatchObject({ requested: a.plays.length, captured: a.plays.length, unavailable: 0 });
      expect(inputs.plays.map((p: { id: string }) => p.id)).toEqual(a.plays.map(p => p.id));
    } finally { play.mockRestore(); rmSync(root, { recursive: true }); }
  });

  it.each(['engineSha256', 'node', 'lockfileSha256', 'settings', 'inputSha256'] as const)
    ('refuses incompatible %s before creating a replacement sidecar', field => {
      pack(dir => {
        expect(() => retainFilmInputs(dir)).toThrow(/mismatch/);
        expect(existsSync(join(dir, 'inputs'))).toBe(false);
      }, m => { if (field === 'settings') m.source.settings = {}; else m.source[field] = 'different'; });
    });

  it.each(['frame', 'event'])('retains a failed %s match in counts, exporting no replacement', field => {
    pack(dir => {
      const before = readFileSync(join(dir, 'raw', 'game-2.json'));
      expect(() => retainFilmInputs(dir)).toThrow('1/2 selected inputs unavailable');
      const index = JSON.parse(readFileSync(join(dir, 'inputs', 'index.json'), 'utf8'));
      expect(index).toMatchObject({ requested: 2, captured: 1, unavailable: 1 });
      expect(index.plays).toContainEqual(expect.objectContaining({ id: manifest.plays[0].id,
        status: 'unavailable', reason: expect.stringContaining('original clip mismatch') }));
      expect(existsSync(join(dir, 'inputs', `${manifest.plays[0].id}.bin`))).toBe(false);
      expect(readFileSync(join(dir, 'raw', 'game-2.json'))).toEqual(before);
    }, undefined, clips => {
      const clip = clips.find(p => p.id === manifest.plays[0].id)!;
      if (!('frames' in clip)) throw Error('Native test fixture needs frames');
      if (field === 'frame') clip.frames.p[0] += 1;
      else clip.eventDetails[0].note = 'altered reference';
    });
  });

  it('retains the declared run-only call mode and its distinct roster/input identity', () => {
    const run = prefix(undefined, true);
    const film = run.result.log.find(p => p.replay && !p.nullified && p.kind === 'run')!;
    expect(film).toBeDefined();
    const id = `G2-P${String(film.index + 1).padStart(3, '0')}`;
    pack(dir => {
      const index = retainFilmInputs(dir);
      expect(index).toMatchObject({ requested: 1, captured: 1, unavailable: 0 });
      const p = readSavedPlay(join(dir, 'inputs', `${id}.bin`));
      expect(restoreSetup(p.setup).offCall.kind).toBe('run');
      expect(runRestoredPlay(p).difference).toBeNull();
    }, m => {
      m.runOnly = true;
      m.plays = [{ ...m.plays[0], id, game: 2 }];
      const { home, away } = teams();
      m.source.inputSha256 = bytesHash(Buffer.from(JSON.stringify({ seed, games: number, runOnly: true, home, away })));
    }, clips => { clips.splice(0, clips.length, ...run.result.log.map(p => packReplayPlay(p, number - 1))); });
  });

  it('counts missing and non-executed original entries without substituting other snaps', () => {
    const kickoff = reference.result.log.find(p => p.kind === 'kickoff')!;
    const missingId = 'G2-P999';
    pack(dir => {
      expect(() => retainFilmInputs(dir)).toThrow('2/2 selected inputs unavailable');
      const index = JSON.parse(readFileSync(join(dir, 'inputs', 'index.json'), 'utf8'));
      expect(index).toMatchObject({ requested: 2, captured: 0, unavailable: 2 });
      expect(index.plays).toEqual([
        { id: `G2-P${String(kickoff.index + 1).padStart(3, '0')}`, status: 'unavailable',
          reason: 'no recorded native scrimmage execution in the original clip' },
        { id: missingId, status: 'unavailable', reason: 'missing or ambiguous original clip' },
      ]);
    }, m => { m.plays = [
      { ...m.plays[0], id: `G2-P${String(kickoff.index + 1).padStart(3, '0')}` },
      { ...m.plays[0], id: missingId },
    ]; });
  });

  it('reports an actual prevented constructor without manufacturing a run result', () => {
    // Reuse the existing ledger's historical S7-P029 control, explicitly on
    // its recorded single-stream dice contract. No historical football claim.
    const fixtures = JSON.parse(readFileSync(new URL('./fixtures/responsibility-ledger-cases.json', import.meta.url), 'utf8'));
    const setup = restoreSetup(Buffer.from(fixtures.plays.find((p: { id: string }) => p.id === 'S7-P029').setup, 'base64'));
    const oldMode = PlaySim.recordedSingleStream;
    try {
      PlaySim.recordedSingleStream = true;
      const p = saved[0], capture = selectedInputCapture(new Set([p.context.index]));
      capture.hooks.playSetup!(setup, p.context);
      const sim = new PlaySim(setup);
      expect(sim.snapAssessment.snapPermitted).toBe(false);
      // Game returns before playResult on this branch; there is no native run.
      expect(savedSelectedInput(capture.take(p.context.index), p.film, p.identity, p.game))
        .toContain('native snap prevented; no executed play to restore');
    } finally { PlaySim.recordedSingleStream = oldMode; }
  });

  it('distinguishes an absent/prevented execution and preserves nullified native evidence', () => {
    const p = saved[0], film = copySaved(p.film);
    const capture = selectedInputCapture(new Set([p.context.index]));
    capture.hooks.playSetup!(restoreSetup(p.setup), p.context);
    expect(savedSelectedInput(capture.take(p.context.index), film, p.identity, p.game)).toContain('native snap prevented');
    expect(savedSelectedInput(undefined, film, p.identity, p.game)).toContain('no scrimmage constructor');
    // Explicit synthetic official ruling on an actual native execution. The
    // input collector must retain both the native reference and official status.
    film.nullified = true;
    film.stats = { ...film.stats!, completed: !p.original.result.stats.completed };
    const value = savedSelectedInput({ setup: p.setup, context: p.context,
      initial: p.original.initial, result: p.original.result }, film, p.identity, p.game) as SavedPlay;
    expect(value.film.nullified).toBe(true);
    expect(value.original.result).toEqual(p.original.result);
    expect(value.film.stats!.completed).not.toBe(value.original.result.stats.completed);
    expect(runRestoredPlay(value).difference).toBeNull();
  });

  it('rejects a duplicate or path-like selected ID rather than writing outside the sidecar', () => {
    pack(dir => { expect(() => retainFilmInputs(dir)).toThrow('Invalid or duplicate'); },
      m => { m.plays[0].id = '../../replacement'; });
    pack(dir => { expect(() => retainFilmInputs(dir)).toThrow('Invalid or duplicate'); },
      m => { m.plays.push(m.plays[0]); });
  });
});

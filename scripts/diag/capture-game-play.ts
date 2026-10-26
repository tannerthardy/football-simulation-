/** Capture one ordinary recorded play after a normal, bounded game prefix. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { serialize } from 'node:v8';
import { Rng } from '../../src/core/rng.js';
import { Game, type GameResult, type GameState, type PlaySetupContext } from '../../src/game/game.js';
import { generateTeam } from '../../src/league/team.js';
import type { PlayResult } from '../../src/sim/types.js';
import { packReplayPlay } from '../replay-data.js';
import { compactReplayPlays } from '../replay-telemetry-packing.js';
import { bytesHash, captureSetup, copySaved, executionIdentity, initialState, type SavedPlay } from './saved-play.js';

export interface CaptureGameOptions { seed: number; play: number | 'first-catch'; minPlay: number; maxSteps: number;
  /** With 'first-catch': skip a completed pass this rejects and keep playing the same game. */
  accept?: (saved: SavedPlay) => boolean }
type Candidate = { setup: Buffer; context: PlaySetupContext; initial?: ReturnType<typeof initialState>; result?: PlayResult };

/** Same teams, kickoff, calls and rules as export-replay.ts. No forced call/result/state. */
export function captureOrdinaryPlay(options: CaptureGameOptions): { saved: SavedPlay; prefix: GameResult; endpoint: Readonly<GameState> } {
  const wantedPlay = options.play;
  if (!Number.isSafeInteger(options.seed) || options.seed < 0 || options.seed > 0xffffffff) throw new Error('seed must be a uint32');
  if (![options.minPlay, options.maxSteps].every(n => Number.isInteger(n) && n > 0)) throw new Error('minPlay/maxSteps must be positive integers');
  if (options.play !== 'first-catch' && (!Number.isInteger(options.play) || options.play < 1)) throw new Error('play must be a positive 1-based game log index');
  const identity = executionIdentity(), rng = new Rng(options.seed);
  const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
  const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
  let pending: Candidate | undefined;
  let candidates: Candidate[] = [];
  const game = new Game(home, away, { seed: options.seed, record: true, recordLevel: 'full', hooks: {
    playSetup(setup, context) {
      const eligible = context.kind === 'scrimmage' && (options.play === 'first-catch'
        ? context.index + 1 >= options.minPlay : context.index + 1 === options.play);
      pending = eligible ? { setup: captureSetup(setup), context: copySaved(context) } : undefined;
      if (pending) candidates.push(pending);
    },
    playResult(sim) {
      const current = pending;
      if (!current) return undefined;
      current.initial = initialState(sim);
      const run = sim.run.bind(sim);
      sim.run = () => {
        const result = run();
        current.result = copySaved(result); // Before official game bookkeeping can mutate referenced stats.
        return result;
      };
      return undefined;
    },
  } });
  game.kickoffToStart();
  for (let step = 1; step <= options.maxSteps && !game.state.over; step++) {
    candidates = [];
    game.step();
    const prefix = game.result();
    for (const candidate of candidates) {
      const film = prefix.log.find(p => p.index === candidate.context.index);
      if (!film?.replay || !candidate.initial || !candidate.result) continue;
      if (options.play === 'first-catch' && (!candidate.result.stats.completed || film.nullified)) continue;
      const saved: SavedPlay = { format: 'constructor-play-v1', identity,
        game: { seed: options.seed, steps: step, complete: game.state.over,
          playId: `G1-P${String(film.index + 1).padStart(3, '0')}` },
        context: candidate.context, setup: candidate.setup, setupSha256: bytesHash(candidate.setup),
        original: { initial: candidate.initial, result: candidate.result, replay: copySaved(film.replay) }, film: copySaved(film) };
      if (executionIdentity().engineSha256 !== identity.engineSha256) throw new Error('Source changed during capture');
      if (options.play === 'first-catch' && options.accept && !options.accept(saved)) continue;
      return { saved, prefix, endpoint: copySaved(game.state) };
    }
    if (typeof wantedPlay === 'number' && prefix.log.some(p => p.index + 1 >= wantedPlay))
      throw new Error(`P${options.play} did not produce a recorded native scrimmage play`);
  }
  throw new Error(`No selected play within ${options.maxSteps} normal game steps`);
}

/** Reuse the existing viewer and packing; the film is the original, not a re-simulation. */
export function originalFilm(saved: SavedPlay): string {
  const data = { meta: { seed: saved.game.seed, sourceSha256: saved.identity.engineSha256,
    capture: { play: saved.game.playId, prefixSteps: saved.game.steps, gameComplete: saved.game.complete },
    home: { name: 'Ironmen', abbr: 'IRN', color: '#a3302a', alt: '#f4efe6', text: '#fff' },
    away: { name: 'Comets', abbr: 'COM', color: '#1d4f91', alt: '#f2c14e', text: '#fff' } },
    games: [{ seed: saved.game.seed, final: saved.film.score, quarters: [] }],
    plays: compactReplayPlays([packReplayPlay(saved.film, 0)]), catalog: { coverage: {}, front: {}, formation: {} } };
  const template = readFileSync('viewer/replay.template.html', 'utf8'), marker = '/*__REPLAY_DATA__*/null';
  if (!template.includes(marker)) throw new Error('Replay data marker missing');
  return '<!doctype html>\n<html><head><meta charset="utf-8"></head><body>\n'
    + `<p>Original normal-game film: ${saved.game.playId}, seed ${saved.game.seed}. Prefix stopped after ${saved.game.steps} steps; complete game: ${saved.game.complete}.</p>\n`
    + template.replace('· final score', '· captured prefix score')
      .replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/')) + '\n</body></html>\n';
}

function main() {
  const { values: v } = parseArgs({ options: { seed: { type: 'string', default: '7' }, play: { type: 'string', default: 'first-catch' },
    'min-play': { type: 'string', default: '10' }, 'max-steps': { type: 'string', default: '60' },
    out: { type: 'string', default: 'out/saved-game-play' }, help: { type: 'boolean' } } });
  if (v.help) { console.log('node --import tsx scripts/diag/capture-game-play.ts --seed 7 --play first-catch --min-play 10 --max-steps 60 --out out/saved-game-play\n--play also accepts a 1-based game-log number (e.g. 20), including kicks in the numbering.'); return; }
  const { saved } = captureOrdinaryPlay({ seed: Number(v.seed), play: v.play === 'first-catch' ? v.play : Number(v.play),
    minPlay: Number(v['min-play']), maxSteps: Number(v['max-steps']) });
  mkdirSync(v.out!, { recursive: true });
  writeFileSync(`${v.out}/play.bin`, serialize(saved));
  writeFileSync(`${v.out}/reference.json`, JSON.stringify({ ...saved, setup: { sha256: saved.setupSha256, encoding: 'V8 in play.bin' } }, null, 2) + '\n');
  writeFileSync(`${v.out}/original.html`, originalFilm(saved));
  console.log(`${saved.game.playId}: ${saved.film.call} vs ${saved.film.defense}; ${saved.original.result.outcome}, ${saved.original.result.yards.toFixed(2)} yd.`);
  console.log(`Saved constructor setup + complete original result/replay: ${v.out}/play.bin\nOriginal film: ${v.out}/original.html`);
  console.log(`Normal game prefix: ${saved.game.steps} steps; complete game: ${saved.game.complete}. No calls or outcomes were forced.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();

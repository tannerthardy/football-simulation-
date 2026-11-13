/** Offline replay turning audit; shared numeric operator: data/yaw_measurement.py.
 * node --import tsx scripts/diag/yaw-sim.ts --input out/saved-game.json
 * Historical generation mode remains: [seed] [--games 2]. Tests use saved inputs.
 * Python 3 is required. Body facing and position-derived travel are separate.
 * Operator contract: docs/reviews/turning-measurements.md.
 */
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { wrapAngle } from '../../src/core/vec.js';
import type { PlayLog } from '../../src/game/game.js';
import { sourceVersion } from '../source-version.js';
import { engineSettings } from '../scorecard/provenance.js';

type Replay = NonNullable<PlayLog['replay']>;
type Counts = { eligible: number; excluded: number; unknown: number };
const empty = (): Counts => ({ eligible: 0, excluded: 0, unknown: 0 });
const fingerprint = (path: string) => {
  const bytes = readFileSync(path);
  return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
};
const finite = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function replayPaths(replay: Replay, id: string) {
  if (!Array.isArray(replay.players) || !Array.isArray(replay.frames)) throw new Error('Replay requires players and timed frames');
  for (const frame of replay.frames) {
    if (!Array.isArray(frame.agents) || frame.agents.length !== replay.players.length * 3) {
      throw new Error('Replay agent columns do not match its player roster');
    }
  }
  const eligibility = { paths: empty(), rows: empty() };
  const paths = replay.players.flatMap((player, i) => {
    const state: keyof Counts = player.team === 'O' ? 'excluded' : player.team !== 'D' || typeof player.slot !== 'string' ? 'unknown'
      : /^(CB|SS|FS|S|DB|ILB|MLB|OLB|LB)(_|$)/.test(player.slot) ? 'eligible'
        : /^(DE|DT|NT)(_|$)/.test(player.slot) ? 'excluded' : 'unknown';
    eligibility.paths[state]++;
    eligibility.rows[state] += replay.frames.length;
    if (state !== 'eligible') return [];
    return [{ id: `${id}/${i}:${player.slot}`, deriveMotion: true, afterTime: 0,
      rows: replay.frames.map(frame => {
        const facing = finite(frame.agents[i * 3 + 2]);
        return { t: finite(frame.t), x: finite(frame.agents[i * 3]), y: finite(frame.agents[i * 3 + 1]),
          body: facing === null ? null : (wrapAngle(facing) * 180 / Math.PI + 360) % 360 };
      }) }];
  });
  return { paths, eligibility };
}

export async function main(argv = process.argv.slice(2)) {
  const inputAt = argv.indexOf('--input');
  const inputs: unknown[] = [];
  const eligibility = { paths: empty(), rows: empty() };
  const quality = { playsWithoutReplay: 0 };
  const paths: ReturnType<typeof replayPaths>['paths'] = [];
  let logs: PlayLog[][];
  if (inputAt >= 0) {
    const path = argv[inputAt + 1];
    if (!path) throw new Error('--input needs a saved GameResult JSON path');
    const raw = readFileSync(path), data = JSON.parse(raw.toString()) as { log?: PlayLog[]; meta?: unknown };
    if (!Array.isArray(data.log)) throw new Error('Saved input needs a GameResult log with replay frames; scorecard summaries are incompatible');
    inputs.push({ ...fingerprint(path), recordedProvenance: data.meta ?? null,
      engineIdentity: 'Only embedded provenance identifies the saved engine; current checkout is not its identity.' });
    logs = [data.log];
  } else {
    const at = argv.indexOf('--games');
    const games = at >= 0 ? Number(argv[at + 1]) : 2;
    const seed = Number(argv.find((a, i) => !a.startsWith('--') && (at < 0 || i !== at + 1)) ?? 7);
    if (!Number.isInteger(games) || games < 1 || !Number.isInteger(seed)) throw new Error('Provide integer seed and positive --games');
    const [{ Rng }, { simulateGame }, { generateTeam }] = await Promise.all([
      import('../../src/core/rng.js'), import('../../src/game/game.js'), import('../../src/league/team.js'),
    ]);
    const rng = new Rng(seed), home = generateTeam(rng, 'Ironmen', 'IRN', { strength: .55 });
    const away = generateTeam(rng, 'Comets', 'COM', { strength: .55 });
    inputs.push({ mode: 'generated', engineSha256: sourceVersion(), settings: engineSettings({}), node: process.version, seed, games });
    logs = Array.from({ length: games }, (_, g) => simulateGame(home, away, { seed: seed + g, record: true }).log);
  }
  logs.forEach((log, g) => log.forEach((play, p) => {
    if (play.kind !== 'run' && play.kind !== 'pass') return;
    if (!play.replay) { quality.playsWithoutReplay++; return; }
    const adapted = replayPaths(play.replay, `${g}/${p}`);
    paths.push(...adapted.paths);
    for (const unit of ['rows', 'paths'] as const) for (const state of ['eligible', 'excluded', 'unknown'] as const) {
      eligibility[unit][state] += adapted.eligibility[unit][state];
    }
  }));
  const helper = fileURLToPath(new URL('../data/yaw_measurement.py', import.meta.url));
  const input = { source: 'Simulator recorded replay; explicit defensive LB/DB slots', inputs,
    adapter: { ...fingerprint(fileURLToPath(import.meta.url)), node: process.version,
      angleHelper: fingerprint(fileURLToPath(new URL('../../src/core/vec.ts', import.meta.url))) }, eligibility, quality, paths,
    cadence: { clock: 'Recorded frame.t seconds; no assumed 10Hz multiplier', fallbackSeconds: null },
    comparison: 'NFL uses provider s/o/dir; simulator uses recorded body facing and centered position secants (one-sided at recording/gap edges). Both exclude the snap frame; sim derivatives may use it as a neighbor. Travel heading below 1yd/s is unavailable. Provider smoothing, angle semantics, role labels and recording cutoff differ; these are descriptive observations, not gaze, force or turning capacity.' };
  const result = spawnSync('python3', ['-I', helper], { input: JSON.stringify(input), encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || 'Shared turning operator failed');
  const report = JSON.parse(result.stdout) as { status: string; adapter: unknown };
  report.adapter = input.adapter;
  console.log(JSON.stringify(report, null, 2));
  return report.status === 'unavailable' ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}

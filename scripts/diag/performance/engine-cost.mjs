/** F2 engine cost/parity probe; output stays in out/, never in Git.
 * Run with Node22.23.3 --import tsx. Examples (one simulation worker):
 *   node --import tsx scripts/diag/performance/engine-cost.mjs --mode trace --games 0,3 --out out/perf/trace.json
 *   node --import tsx scripts/diag/performance/engine-cost.mjs --mode scorecard --out out/perf/quick.json
 * --root selects another worktree; --compare checks a saved trace. The seed7,
 * six-game/two-league quick workload comes from existing scorecard definitions.
 * No metric/interface changes; CPU comes from child rusage, not scorecard ms.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { stateBytes } from './state-bytes.mjs';

const args = process.argv.slice(2);
const option = (key, fallback) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback;
const root = resolve(option('--root', '.')), mode = option('--mode', 'trace');
const output = resolve(option('--out', 'out/perf/trace.json'));
const games = option('--games', '0,3').split(',').map(Number);
assert.equal(process.version, 'v22.23.3', 'Use the pinned .nvmrc runtime');
assert(['trace', 'scorecard'].includes(mode));
assert(games.length && games.every(g => Number.isInteger(g) && g >= 0 && g < 6));
mkdirSync(dirname(output), { recursive: true });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const files = path => readdirSync(path, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(resolve(path, e.name)) : [resolve(path, e.name)]);
const sourceFiles = files(resolve(root, 'src')).sort();
const source = createHash('sha256');
for (const file of sourceFiles) source.update(file.slice(root.length + 1)).update('\0').update(readFileSync(file)).update('\0');
const rows = readFileSync(resolve(root, 'docs/FLAGS.md'), 'utf8').split('\n').flatMap(line => {
  const match = line.match(/^\| `([A-Z0-9_]+)` \| ([^|]+) \|/);
  return match ? [[match[1], match[2].trim()]] : [];
});
const inventory = [...new Set(sourceFiles.flatMap(file => [...readFileSync(file, 'utf8')
  .matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(m => m[1])))].sort();
assert.deepEqual(rows.map(([key]) => key).sort(), inventory, 'Flag registry must cover every source read');
// Unset ambient overrides before importing ANY engine module. The registry
// records the resulting code defaults, including numeric identity/CF_FLOW.
for (const key of inventory) delete process.env[key];
const meta = { root, mode, node: process.version, platform: process.platform, arch: process.arch,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceSha256: source.digest('hex'), operatorSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
  stateEncoderSha256: sha(readFileSync(new URL('./state-bytes.mjs', import.meta.url))),
  lockSha256: sha(readFileSync(resolve(root, 'package-lock.json'))), workerCount: 1,
  seed: 7, quickGames: 6, leagues: 2,
  flags: Object.fromEntries(rows.map(([key, value]) => [key, { environment: null, effective: value }])) };

if (mode === 'scorecard') {
  const timing = output + '.time.json';
  const start = performance.now();
  const measure = `import json,resource,subprocess,sys,time
before=resource.getrusage(resource.RUSAGE_CHILDREN)
start=time.perf_counter()
result=subprocess.run(sys.argv[2:])
after=resource.getrusage(resource.RUSAGE_CHILDREN)
with open(sys.argv[1],'w') as f:
 json.dump(dict(elapsedSeconds=time.perf_counter()-start,userSeconds=after.ru_utime-before.ru_utime,systemSeconds=after.ru_stime-before.ru_stime),f)
sys.exit(result.returncode)`;
  const result = spawnSync('python3', ['-c', measure, timing, process.execPath, '--import', 'tsx', resolve(root, 'scripts/scorecard/run.ts'),
    '--tier', 'quick', '--seed', '7', '--workers', '1', '--out', output + '.card.json', '--md', output + '.md'],
  { cwd: root, env: process.env, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  writeFileSync(output + '.log', (result.stdout ?? '') + (result.stderr ?? ''));
  const cost = JSON.parse(readFileSync(timing, 'utf8'));
  const report = { ...meta, workload: 'Existing quick scorecard, six complete games, all default probes',
    wallSeconds: (performance.now() - start) / 1000, cost,
    cpuSeconds: cost.userSeconds + cost.systemSeconds, exitCode: result.status };
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  assert.equal(result.status, 0, result.stderr);
  console.log(JSON.stringify(report));
} else {
  const load = path => import(pathToFileURL(resolve(root, path)).href);
  const { Rng } = await load('src/core/rng.ts');
  const { World } = await load('src/physics/world.ts');
  const { PlaySim } = await load('src/sim/playsim.ts');
  const { movementObjective } = await load('src/sim/movement-objective.ts');
  const { simulateGame } = await load('src/game/game.ts');
  const { makeLeague, gameSpecs } = await load('scripts/scorecard/records.ts');
  const specs = gameSpecs(7, 6, 2), expected = option('--compare') ? JSON.parse(readFileSync(option('--compare'))) : null;
  if (expected) for (const key of ['node', 'platform', 'arch', 'lockSha256', 'operatorSha256', 'stateEncoderSha256', 'workerCount', 'seed', 'flags'])
    assert.deepEqual(meta[key], expected[key], `Incompatible baseline ${key}`);
  let worldHash, tickHash, drawHash, worlds, ticks, draws, bodyVisits;
  const rawStep = World.prototype.step, rawTick = PlaySim.prototype.tick, rawDraw = Rng.prototype.nextU32;
  World.prototype.step = function(...args) {
    const result = rawStep.apply(this, args);
    worlds++; bodyVisits += this.bodies.length;
    // Hash logical double/state values, not V8's packed/holey storage choices.
    worldHash.update(stateBytes({ time: this.time, bodies: this.bodies, joints: this.joints, report: result }));
    return result;
  };
  PlaySim.prototype.tick = function(...args) {
    const result = rawTick.apply(this, args); ticks++;
    // Ball ownership references an Agent; represent that identity explicitly,
    // rather than traversing its behavior's private WeakMap caches.
    const ball = Object.fromEntries(Object.entries(this.ball).map(([key, value]) =>
      [key, value?.body && Number.isInteger(value.idx) ? { agentIndex: value.idx } : value]));
    tickHash.update(stateBytes({ t: this.t, phase: this.phase, ball, carrier: this.carrier?.idx,
      rng: this.rng, minds: this.agents.map(a => a.mind),
      commands: this.cmds, objectives: this.cmds.map(c => movementObjective(c)),
      intents: this.intents, events: this.events }));
    return result;
  };
  Rng.prototype.nextU32 = function() {
    const value = rawDraw.call(this), bytes = Buffer.allocUnsafe(8);
    bytes.writeUInt32LE(this.key, 0); bytes.writeUInt32LE(value, 4); draws++; drawHash.update(bytes);
    return value;
  };
  const records = [];
  try {
    for (const game of games) {
      worldHash = createHash('sha256'); tickHash = createHash('sha256'); drawHash = createHash('sha256');
      worlds = ticks = draws = bodyVisits = 0;
      const spec = specs[game], teams = makeLeague(7, spec.league);
      const inputSha256 = sha(stateBytes({ spec, home: teams[spec.home], away: teams[spec.away] }));
      if (expected) assert.equal(inputSha256, expected.records.find(r => r.spec.game === game)?.inputSha256);
      const start = performance.now(), cpu = process.cpuUsage();
      const result = simulateGame(teams[spec.home], teams[spec.away], { seed: spec.seed, record: false });
      const elapsed = performance.now() - start, usage = process.cpuUsage(cpu);
      const fingerprints = { world: worldHash.digest('hex'), ticks: tickHash.digest('hex'), draws: drawHash.digest('hex'),
        result: sha(stateBytes(result)), worlds, ticksCount: ticks, drawsCount: draws, bodyVisits };
      const record = { spec, inputSha256, fingerprints, plays: result.log.length, wallSeconds: elapsed / 1000,
        cpuSeconds: (usage.user + usage.system) / 1e6 };
      records.push(record);
      writeFileSync(output, JSON.stringify({ ...meta, records, complete: false }, null, 2) + '\n');
      if (expected) assert.deepEqual(fingerprints, expected.records.find(r => r.spec.game === game)?.fingerprints,
        'Trajectory/state/report/command/event/RNG mismatch');
      console.log(JSON.stringify(record));
    }
    writeFileSync(output, JSON.stringify({ ...meta, records, complete: true, matchesBaseline: !!expected }, null, 2) + '\n');
  } finally {
    World.prototype.step = rawStep; PlaySim.prototype.tick = rawTick; Rng.prototype.nextU32 = rawDraw;
  }
}

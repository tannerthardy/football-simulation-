/** Sixteen unchanged-engine snaps, not an NFL replay.
 * node --import tsx scripts/diag/situation-match-pilot.ts out/situation-pilot/inputs.json out/situation-pilot/native.json
 * Three coarse situations x two assumed called directions x two execution draws,
 * plus four neutral midfield/center controls. No NFL post-snap data is read.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { Rng } from '../../src/core/rng.js';
import { CENTER_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FRONT_BY_ID, COVERAGE_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
import { sourceVersion } from '../source-version.js';

type Case = { id: string; down: number; distance: number; los: number; ballY: number; flip: boolean };
const inputPath = process.argv[2], output = process.argv[3];
if (!inputPath || !output) throw new Error('Supply inputs.json and output.json');
const inputs = JSON.parse(readFileSync(inputPath, 'utf8'));
const allowed = ['id', 'down', 'distance', 'los', 'ballY', 'flip'];
if (inputs.schema !== 'g2-coarse-situation-input-v1' || !Array.isArray(inputs.cases)
  || inputs.cases.length !== 3) throw new Error('Expected exactly three qualified cases');
for (const c of inputs.cases) {
  if (JSON.stringify(Object.keys(c).sort()) !== JSON.stringify([...allowed].sort())
    || typeof c.id !== 'string' || typeof c.flip !== 'boolean' || ![1, 2].includes(c.down)
    || ![c.distance, c.los, c.ballY].every(Number.isFinite)
    || c.distance < 7 || c.distance > 10 || c.los <= 10 || c.los >= 110
    || c.ballY < 0 || c.ballY > 160 / 3) throw new Error('Invalid/non-allowlisted pre-snap input');
}
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]).sort();
const flagKeys = [...new Set(files('src').flatMap(f => [...readFileSync(f, 'utf8')
  .matchAll(/process\.env\.([A-Z][A-Z0-9_]*)/g)].map(m => m[1])))].sort();
if (flagKeys.some(k => process.env[k] !== undefined)) throw new Error('Unset source engine flag overrides; pilot uses current code defaults');
const flags = Object.fromEntries(flagKeys.map(k => [k, null]));
const source = sourceVersion(), started = performance.now();
const off = generateTeam(new Rng(3101), 'Pilot offense', 'PO', { strength: .55 });
const def = generateTeam(new Rng(3102), 'Pilot defense', 'PD', { strength: .55, defScheme: 'nickel-heavy' });
const hash = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
const cases: Case[] = [...inputs.cases, { id: 'neutral-concept-control', down: 1, distance: 10, los: 60, ballY: CENTER_Y, flip: false }];
const rows = [];
for (const c of cases) for (const run of ['oz_strong', 'oz_weak']) for (const seed of [1101, 1102]) {
  const setup = { offense: pickOffense(off, '11'), defense: pickDefense(def, 'nickel'),
    offCall: { formation: FORMATION_BY_ID.ace_11, flip: c.flip, kind: 'run' as const,
      run: RUN_BY_ID[run], label: `pilot ace11 ${run} (assumed)` },
    defCall: { personnel: 'nickel' as const, front: FRONT_BY_ID.over,
      coverage: COVERAGE_BY_ID.cover3, pressure: null, label: 'pilot Over Cover3 (assumed)' },
    los: c.los, ballY: c.ballY, firstDownX: Math.min(110, c.los + c.distance),
    down: c.down, seed, record: true, recordEvery: 2 };
  const sim = new PlaySim(setup);
  const snapshot = () => ({ t: sim.t, live: sim.phase === 'live', carrier: sim.carrier?.idx ?? null,
    actors: sim.agents.map(a => ({ id: String(a.idx), playerId: a.player.id, slot: a.slot,
      side: a.team, position: a.player.position,
      pos: [a.pos.x - sim.los, a.pos.y], vel: [a.vel.x, a.vel.y] })) });
  const phases: Record<string, ReturnType<typeof snapshot>> = { '0': snapshot() };
  const original = sim.tick.bind(sim);
  sim.tick = () => {
    original();
    const t = Math.round(sim.t * 20) / 20;
    if ([.5, 1, 2, 3].includes(t)) phases[String(t)] = snapshot();
  };
  const result = sim.run();
  const signature = hash({ result, bodies: sim.agents.map(a => a.body), rng: { ...sim.rng } });
  // One opposing recording control: passive snapshots must not alter execution.
  let passiveVerified: boolean | null = null;
  if (rows.length === 0) {
    const plain = new PlaySim(setup), plainResult = plain.run();
    passiveVerified = signature === hash({ result: plainResult, bodies: plain.agents.map(a => a.body), rng: { ...plain.rng } });
    if (!passiveVerified) throw new Error('Passive extraction changed the native play');
  }
  rows.push({ case: c, run, seed, phases, passiveVerified, signature,
    actualCall: { offense: sim.offCall, defense: sim.defCall },
    result: { outcome: result.outcome, duration: result.duration, yards: result.offenseYards,
      turnover: result.turnover, stats: result.stats, penalties: result.penalties ?? [], events: result.events },
    frames: result.frames });
}
if (sourceVersion() !== source) throw new Error('Engine source changed during pilot');
const report = { schema: 'g2-coarse-situation-native-v1', source,
  commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), node: process.version,
  inputSha256: createHash('sha256').update(readFileSync(inputPath)).digest('hex'),
  toolSha256: createHash('sha256').update(readFileSync('scripts/diag/situation-match-pilot.ts')).digest('hex'),
  flags, rosterSeeds: [3101, 3102], strength: .55, executionSeeds: [1101, 1102],
  settings: { normalPlaySetup: true, audibles: 'default', physics: 'default', noAlignmentBodyEdits: true,
    recordEvery: 2, recordLevel: 'light', callDirections: 'oz_strong and oz_weak; NFL called direction unknown; TE side matched at snap',
    defense: 'assumed nickel Over Sky Cover3, not a recovered NFL call' },
  elapsedSeconds: (performance.now() - started) / 1000, rows };
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify(report));
console.log(JSON.stringify({ output, commit: report.commit, source, elapsedSeconds: report.elapsedSeconds,
  rows: rows.map(r => ({ id: r.case.id, run: r.run, flip: r.case.flip, seed: r.seed, ...r.result, events: undefined, stats: undefined })) }, null, 1));

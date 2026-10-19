/** One bounded geometry-only comparison on frozen ordinary profiles/seed.
 * Default: plan only. Run via baseline.mjs with --run --out PATH.json.
 * Accepted geometry is reconstructed only in the formation input; all other
 * code, calls, players, seeds and settings match. No experimental runtime.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { casesFor, digest, type Fixture } from '../roster-screen.js';
import { sourceVersion } from '../source-version.js';
import { PASS_BY_ID, RUN_BY_ID } from '../../src/playbook/concepts.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { handoffReach } from '../../src/sim/ball-transfer.js';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';

const specs = [
  ['pistol-control', 'pistol_11', 'iz_strong', false],
  ['under-control', 'ace_11', 'oz_strong', false],
  ['empty-control', 'gun_empty_11', 'mesh', false],
  ['gun-iz-across', 'gun_doubles_11', 'iz_strong', false],
  ['gun-iz-own-side', 'gun_doubles_11', 'iz_weak', false],
  ['gun-oz-flipped', 'gun_doubles_11', 'oz_strong', true],
  ['gun-swing', 'gun_doubles_11', 'mesh', false],
  ['gun-protection', 'gun_doubles_11', 'quick_outs', false],
] as const;
const arms = ['accepted-geometry', 'corrected-geometry'] as const;
const plan = specs.flatMap(s => arms.map(arm => `${s[0]}/${arm}`));
const args = process.argv.slice(2);
if (!args.includes('--run')) {
  console.log(JSON.stringify({ planned: plan, attempts: plan.length, engineTicks: 0,
    budget: '30s total, 3s per prefix; at most 2.5s simulation, 0.25s after handoff' }, null, 2));
} else {
  const outIndex = args.indexOf('--out');
  if (outIndex < 0 || !args[outIndex + 1]) throw new Error('Explicit --out required');
  const out = args[outIndex + 1];
  const fixturePath = 'config/roster-screen.json';
  const fixture: Fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const base = casesFor(fixture, ['iz_strong'], ['ordinary'])[0].setup;
  const shaFile = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex');
  const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8'));
  const source = sourceVersion();
  const git = (...a: string[]) => execFileSync('git', a, { encoding: 'utf8' }).trim();
  const start = performance.now();
  const rows: any[] = [], traces: any[] = [];
  let failure: string | null = null;
  const setupFor = (spec: typeof specs[number], arm: typeof arms[number]): PlaySetup => {
    const [, form, call, flip] = spec;
    const formation = structuredClone(FORMATION_BY_ID[form]);
    const rb = formation.slots.RB;
    if (arm === 'accepted-geometry' && formation.qb === 'gun' && rb && typeof rb.split === 'number') {
      rb.split = 1.6; rb.depth = 5.2;
    }
    const setup = structuredClone(base), run = RUN_BY_ID[call];
    setup.offCall = run ? { formation, flip, kind: 'run', run, label: call }
      : { formation, flip, kind: 'pass', pass: PASS_BY_ID[call], label: call };
    return setup;
  };
  for (const spec of specs) {
    for (const arm of arms) {
      const id = `${spec[0]}/${arm}`, wall = performance.now();
      if (wall - start >= 30000) { failure = 'total wall budget'; break; }
      const setup = setupFor(spec, arm), frames: any[] = [];
      const row: any = { id, inputSha256: digest(setup), seed: setup.seed, call: spec[2],
        formation: spec[1], flip: spec[3], handoff: null, attempted: true };
      rows.push(row);
      try {
        const sim = new PlaySim(setup), rb = sim.slot('RB')!;
        const snap = (a: typeof rb) => ({ idx: a.idx, id: a.player.id, slot: a.slot,
          pos: { ...a.pos }, vel: { ...a.vel }, support: a.body.support?.state,
          behavior: a.behavior.kind, finalIntent: structuredClone(sim.intents[a.idx] ?? null) });
        row.initial = { qb: snap(sim.qb), rb: snap(rb), numbering: sim.offAlign.numbering,
          qbToRB: { lateral: Math.abs(rb.pos.y - sim.qb.pos.y), behind: sim.qb.pos.x - rb.pos.x } };
        row.identities = sim.agents.map(a => ({ idx: a.idx, team: a.team, slot: a.slot, id: a.player.id }));
        // Read-only observation at the transfer call, before later physics.
        const handoff = sim.handoff.bind(sim);
        sim.handoff = (from, to) => {
          const distance = Math.hypot(from.pos.x - to.pos.x, from.pos.y - to.pos.y);
          const before = { t: sim.t, distance, reach: handoffReach(from, to),
            qb: snap(from), rb: snap(to), speed: Math.hypot(to.vel.x, to.vel.y) };
          const ok = handoff(from, to);
          if (ok && row.handoff === null) row.handoff = before;
          return ok;
        };
        const signature = createHash('sha256');
        const take = () => {
          const state = { t: sim.t, phase: sim.phase, carrier: sim.carrier?.idx,
            body: sim.agents.map(a => ({ i: a.idx, pos: { ...a.pos }, vel: { ...a.vel },
              support: a.body.support?.state, behavior: a.behavior.kind })), events: sim.events };
          signature.update(JSON.stringify(state));
          frames.push({ t: sim.t, qb: snap(sim.qb), rb: snap(rb) });
        };
        take();
        while (sim.phase === 'live' && sim.t < 2.5 && (sim.handoffAt < 0 || sim.t < sim.handoffAt + .25)) {
          if (performance.now() - wall > 3000 || performance.now() - start > 30000) throw new Error('wall budget exhausted');
          sim.tick(); take();
        }
        row.observedThrough = sim.t;
        row.terminal = sim.phase !== 'live';
        row.ending = row.terminal ? sim.outcome : null;
        row.censorReason = row.terminal ? null : sim.handoffAt >= 0 ? 'handoff-plus-.25s prefix' : '2.5s prefix';
        row.rbFinal = snap(rb);
        row.qbFinal = snap(sim.qb);
        row.events = sim.events;
        row.signature = signature.digest('hex');
        row.status = 'observed';
        traces.push({ id, setup, frames, events: sim.events });
        if (spec[0].endsWith('-control') && arm === 'corrected-geometry') {
          const ref = rows[rows.length - 2];
          row.unchangedControl = row.signature === ref.signature && row.inputSha256 === ref.inputSha256;
          if (!row.unchangedControl) throw new Error('unchanged control diverged');
        }
      } catch (e) {
        row.status = 'failed'; row.error = String(e); failure = `${id}: ${String(e)}`;
        if (!traces.some(t => t.id === id)) traces.push({ id, setup, frames, error: row.error });
      }
      row.wallMs = performance.now() - wall;
      if (failure) break;
    }
    if (failure) break;
  }
  if (source !== sourceVersion()) failure = 'source changed during observation';
  const raw = gzipSync(JSON.stringify(traces));
  const rawPath = out.replace(/\.json$/, '') + '-traces.json.gz';
  const report = { schemaVersion: 1, measurement: 'shotgun-rb-alignment-v1',
    question: 'Formation spacing only: actual mesh motion/reach, pass-role effects, unaffected geometry controls',
    producingCommit: git('rev-parse', 'HEAD'), sourceSha256: source,
    trackedChanges: git('diff', '--name-only', 'HEAD'),
    fixtureSha256: shaFile(fixturePath), collectorSha256: shaFile(import.meta.filename),
    helperSha256: shaFile('scripts/roster-screen.ts'), dependencySha256: shaFile('package-lock.json'),
    node: process.version, platform: process.platform, arch: process.arch,
    flags: Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null])),
    worldDefaults: profile.worldDefaults, acceptedReference: 'f4146275ce7539816bf57b4ed55a0d2be10e48c7',
    comparison: 'Same current code; accepted-geometry arm changes only formation input to the seven original RB slots',
    rawArtifact: { path: rawPath, bytes: raw.length, sha256: createHash('sha256').update(raw).digest('hex') },
    planned: plan, attempted: rows.length, skipped: plan.filter(id => !rows.some(r => r.id === id)),
    status: failure ? 'failed' : 'complete', failure, elapsedMs: performance.now() - start, rows };
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(rawPath, raw);
  writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, attempted: report.attempted, skipped: report.skipped,
    elapsedMs: report.elapsedMs, out, rows: rows.map(r => ({ id: r.id, handoff: r.handoff && {
      t: r.handoff.t, speed: r.handoff.speed, distance: r.handoff.distance, reach: r.handoff.reach },
      unchangedControl: r.unchangedControl, status: r.status, observedThrough: r.observedThrough })) }, null, 2));
  if (failure) process.exitCode = 1;
}

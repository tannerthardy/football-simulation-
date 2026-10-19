/** Record selected lab cases for the replay viewer at the resolved flags
 * (observation only). Run it through scripts/baseline.mjs --candidate so the
 * receipt binds commit, source digest and flags; film-page.ts merges arms.
 * node --import tsx scripts/diag/stretch/film.ts --label LABEL --cases-file FILE --out out/film/x.json.gz
 * FILE: one case id per line (concept/dir/formation/look/roster/seed), with an
 * optional tab-separated note shown on the clip. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { PlayLog } from '../../../src/game/game.js';
import { RUN_BY_ID } from '../../../src/playbook/concepts.js';
import { packReplayPlay } from '../../replay-data.js';
import { makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : undefined; };
const label = arg('--label')!, out = arg('--out')!, casesFile = arg('--cases-file')!;
const lines = readFileSync(casesFile, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
const profile = JSON.parse(readFileSync('config/baseline.json', 'utf8')) as { flags: Record<string, string | null> };
const flags = Object.fromEntries(Object.keys(profile.flags).map(k => [k, process.env[k] ?? null]));
const changed = Object.entries(flags).filter(([k, v]) => v !== profile.flags[k]).map(([k, v]) => `${k}=${v}`);
const R = rosters();
const plays = lines.map((line, index) => {
  const [id, note = ''] = line.split('\t');
  const [concept, dir, formation, look, roster, seed] = id.split('/');
  const c: LabCase = { concept, dir: dir as 'strong' | 'weak', formation, look, roster, seed: +seed };
  const sim = makeSim(c, R, true, 'standard');
  const r = sim.run();
  const run = sim.offCall.run!;
  const log: PlayLog = { index, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10, yardline: 30,
    call: `${label} · ${RUN_BY_ID[run.id]?.name ?? run.name} ${dir}`, defense: `${look}`,
    text: `${label} · ${id}${changed.length ? ' · ' + changed.join(' ') : ' · develop flags'} · ${r.outcome} ${r.yards.toFixed(1)} yd${note ? ' · ' + note : ''}`,
    yards: r.yards, score: { home: 0, away: 0 }, kind: 'run', stats: r.stats, outcome: r.outcome,
    plan: { personnel: sim.offCall.formation.personnel, formation, qb: sim.offCall.formation.qb, concept: run.scheme,
      playAction: false, audible: false, defPersonnel: sim.defCall.personnel, front: sim.defCall.front.id,
      coverage: sim.defCall.coverage.id, called: sim.defCall.coverage.id, family: sim.defCall.coverage.family,
      shell: sim.defCall.coverage.shell, pressure: false },
    replay: { los: 40, firstDownX: 50, flip: false, frames: r.frames!, events: r.events, telemetry: r.telemetry,
      players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
      profiles: sim.agents.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
        weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) } } as PlayLog;
  return { ...packReplayPlay(log, 0), caseId: id, note };
});
const git = (args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const body = JSON.stringify({ label, flags, changed, commit: git(['rev-parse', 'HEAD']),
  dirtyFiles: git(['diff', '--name-only', 'HEAD']).split('\n').filter(Boolean),
  casesSha256: createHash('sha256').update(readFileSync(casesFile)).digest('hex'), plays });
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, gzipSync(body));
console.log(`${label}: ${plays.length} clips -> ${out} (${(body.length / 1024 / 1024).toFixed(2)} MB raw)`);

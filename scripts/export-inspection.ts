/** Six controlled fixtures for full-state inspection, not a game/NFL cohort.
 * node --import tsx scripts/export-inspection.ts [out/inspection-room.html]
 * Normal generated players, decisions and physics; no scripted outcomes.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CENTER_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import type { PlayLog } from '../src/game/game.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGES, COVERAGE_BY_ID, FRONTS, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATIONS, FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';
import { packReplayPlay } from './replay-data.js';
import { sourceVersion } from './source-version.js';
import { compactReplayPlays } from './replay-telemetry-packing.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outPath = resolve(root, process.argv[2] ?? 'out/inspection-room.html');
if (process.argv.length > 3) throw new Error('Usage: export-inspection.ts [output.html]');
const offense = generateTeam(new Rng(21), 'Inspection Offense', 'OFF', { strength: 0.6 });
const defense = generateTeam(new Rng(22), 'Inspection Defense', 'DEF', { strength: 0.6 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const fixtures = [
  ['four_verts', 'cover4_palms', 5], ['iz_weak', 'cover3', 7], ['counter', 'cover1', 9],
  ['stick', 'cover2_match', 11], ['toss', 'cover3', 13], ['mesh', 'cover1', 15],
] as const;
const plays = fixtures.map(([concept, coverage, seed], index) => {
  const kind = RUN_BY_ID[concept] ? 'run' : 'pass';
  const offCall: OffensivePlayCall = { formation, flip: false, kind, run: RUN_BY_ID[concept], pass: PASS_BY_ID[concept],
    label: `${formation.name} · ${RUN_BY_ID[concept]?.name ?? PASS_BY_ID[concept].name}` };
  const defCall = { personnel: 'nickel' as const, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[coverage], pressure: null,
    label: `4-3 Over · ${COVERAGE_BY_ID[coverage].name}` };
  const sim = new PlaySim({ offense: pickOffense(offense, formation.personnel), defense: pickDefense(defense, 'nickel'),
    offCall, defCall, los: 40, ballY: CENTER_Y, firstDownX: 50, seed, record: true, recordLevel: 'full' });
  const r = sim.run();
  const log: PlayLog = { index, quarter: 1, clock: 900, offense: 'OFF', down: 1, distance: 10, yardline: 30,
    call: offCall.label, defense: defCall.label, text: `Controlled inspection fixture · seed ${seed} · ${r.outcome} · ${r.yards.toFixed(1)} yd`,
    yards: r.yards, score: { home: 0, away: 0 }, kind, stats: r.stats, outcome: r.outcome,
    plan: { personnel: formation.personnel, formation: formation.id, qb: formation.qb, concept: kind === 'run' ? RUN_BY_ID[concept].scheme : concept,
      playAction: false, audible: false, defPersonnel: 'nickel', front: 'over', coverage: sim.defCall.coverage.id,
      called: coverage, family: sim.defCall.coverage.family, shell: sim.defCall.coverage.shell, pressure: false, rushers: sim.defAlign.rushers.length },
    replay: { los: 40, firstDownX: 50, flip: false, frames: r.frames!, events: r.events, telemetry: r.telemetry,
      players: sim.agents.map(a => ({ team: a.team, slot: a.slot, name: a.name, jersey: a.player.jersey, pos: a.player.position, weightLb: a.player.measurables.weightLb })),
      profiles: sim.agents.map(a => ({ position: a.player.position, heightIn: a.player.measurables.heightIn,
        weightLb: a.player.measurables.weightLb, ratings: { ...a.player.ratings } })) } };
  return { ...packReplayPlay(log, 0), id: `LAB-P${String(index + 1).padStart(3, '0')}`, fixtureSeed: seed };
});
const data = {
  meta: { sourceSha256: sourceVersion(), telemetryLevel: 'full', cohort: 'Six controlled inspection fixtures, not a simulated game or NFL sample',
    seed: 5, final: { home: 0, away: 0 }, quarters: [],
    home: { name: offense.name, abbr: 'OFF', color: '#a3302a', text: '#ffffff' },
    away: { name: defense.name, abbr: 'DEF', color: '#1d4f91', text: '#ffffff' } },
  games: [{ seed: 5, final: { home: 0, away: 0 }, quarters: [] }], plays: compactReplayPlays(plays),
  catalog: { coverage: Object.fromEntries(COVERAGES.map(c => [c.id, c.name])),
    front: Object.fromEntries(FRONTS.map(f => [f.id, f.name])), formation: Object.fromEntries(FORMATIONS.map(f => [f.id, f.name])) },
};
const template = readFileSync(resolve(root, 'viewer/replay.template.html'), 'utf8');
const marker = '/*__REPLAY_DATA__*/null';
if (!template.includes(marker)) throw new Error('Replay template is missing its data marker');
const html = `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>\n${template.replace(marker, () => JSON.stringify(data).replace(/<\//g, '<\\/'))}\n</body></html>\n`;
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, html);
console.log(`${plays.length} FULL controlled inspection clips; wrote ${outPath} (${(html.length / 1024 / 1024).toFixed(2)} MB); source ${data.meta.sourceSha256}`);

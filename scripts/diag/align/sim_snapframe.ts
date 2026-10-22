/** Every player at the snap in the sim, in the columns of nfl_snapframe.py's
 * extract, so one operator reads both (observation only; flags from the
 * environment). Real coordinators call each snap and a real PlaySim is set
 * up (alignment, checks, stems and creeps to the snap); nothing is ticked
 * after the snap. Situations are the 2022 plays' downs, distances and field
 * positions when data/raw/bdb2025 is present, else a fixed mix.
 *
 *   node --import tsx scripts/diag/align/sim_snapframe.ts [--n 4000] [--seed 1] [--out out/align/sim-snap.csv.gz]
 */
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
import { CENTER_Y, HASH_LEFT_Y, HASH_RIGHT_Y } from '../../../src/core/field.js';
import { Rng } from '../../../src/core/rng.js';
import { DefensiveCoordinator, OffensiveCoordinator, type Situation } from '../../../src/game/playcaller.js';
import { alignStyle, generateTeam, pickDefense, pickOffense, type DefScheme } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const N = Number(arg('n', '4000'));
const SEED = Number(arg('seed', '1'));
const OUT = arg('out', 'out/align/sim-snap.csv.gz');

type Sit = { down: number; togo: number; yardline: number; quarter: number };
function situations(): Sit[] {
  const path = 'data/raw/bdb2025/big-data-bowl-data/plays.csv';
  if (!existsSync(path)) {
    const out: Sit[] = [];
    for (const [down, togo, w] of [[1, 10, 40], [2, 3, 6], [2, 7, 14], [2, 10, 12], [3, 1, 5], [3, 3, 4], [3, 6, 5], [3, 9, 6], [4, 1, 1]])
      for (let i = 0; i < w; i++) out.push({ down, togo, yardline: 20 + (i * 37) % 60, quarter: 1 + i % 4 });
    return out;
  }
  const [head, ...lines] = readFileSync(path, 'utf8').split('\n');
  const cols = parseCsvLine(head);
  const at = (name: string) => cols.indexOf(name);
  const out: Sit[] = [];
  for (const line of lines) {
    if (!line) continue;
    const r = parseCsvLine(line);
    const down = Number(r[at('down')]), togo = Number(r[at('yardsToGo')]);
    // absoluteYardlineNumber counts from the end line of the offense's
    // direction; the field position in yards from the offense's own goal:
    const own = r[at('possessionTeam')], side = r[at('yardlineSide')], num = Number(r[at('yardlineNumber')]);
    const yardline = side === own ? num : 100 - num;
    if (!(down >= 1 && down <= 4 && togo >= 1 && yardline > 0 && yardline < 100)) continue;
    out.push({ down, togo, yardline, quarter: Number(r[at('quarter')]) || 1 });
  }
  return out;
}
function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '', q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true;
    else if (c === ',') { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

const OL: Record<string, string> = { LT: 'T', RT: 'T', LG: 'G', RG: 'G', C: 'C', QB: 'QB', RB: 'RB', F: 'FB' };
function defPosition(slot: string, personnel: string): string {
  if (slot === 'NT') return 'NT';
  if (slot.startsWith('DE')) return personnel === 'base34' ? 'OLB' : 'DE';
  if (slot.startsWith('DT')) return personnel === 'base34' ? 'DE' : 'DT';
  if (slot.startsWith('LB')) return 'LB';
  if (slot === 'FS' || slot === 'SS') return slot;
  return 'CB';
}

const HEAD = ['gameId', 'playId', 'nflId', 'side', 'position', 'x', 'y', 'ball_y', 'down', 'yardsToGo', 'absoluteYardlineNumber',
  'offenseFormation', 'receiverAlignment', 'pff_runConceptPrimary', 'pff_passCoverage', 'pff_manZone', 'isDropback', 'playAction',
  'possessionTeam', 'defensiveTeam', 'quarter', 'routeRan', 'wasRunningRoute', 'pff_defensiveCoverageAssignment', 'inMotionAtBallSnap',
  'wasInitialPassRusher', 'simSlot', 'simFront', 'simDefPersonnel', 'simFormation', 'simCall'];

const rng = new Rng(SEED);
const schemes: DefScheme[] = ['4-3', '3-4', 'nickel-heavy'];
const teams = Array.from({ length: 6 }, (_, i) => generateTeam(rng.fork(`team${i}`), `T${i}`, `T${i}`, { strength: 0.55, defScheme: schemes[i % 3] }));
const sits = situations();
mkdirSync(dirname(OUT), { recursive: true });
const gz = createGzip();
gz.pipe(createWriteStream(OUT));
gz.write(HEAD.join(',') + '\n');
const hashes = [HASH_LEFT_Y, CENTER_Y, HASH_RIGHT_Y, HASH_LEFT_Y, HASH_RIGHT_Y];
for (let k = 0; k < N; k++) {
  const sit0 = sits[rng.int(0, sits.length - 1)];
  const off = teams[rng.int(0, teams.length - 1)];
  let def = teams[rng.int(0, teams.length - 1)];
  if (def === off) def = teams[(teams.indexOf(off) + 1) % teams.length];
  const sit: Situation = { down: sit0.down, distance: sit0.togo, yardline: sit0.yardline, quarter: sit0.quarter, clock: 600,
    scoreDiff: 0, ballY: hashes[k % hashes.length], hurry: false };
  const oc = new OffensiveCoordinator(off, rng.fork(`oc${k}`));
  const dc = new DefensiveCoordinator(def, rng.fork(`dc${k}`));
  const offCall = oc.call(sit, def);
  const offPlayers = pickOffense(off, offCall.formation.personnel);
  const { call: defCall, prefs } = dc.call(sit, offCall.formation.personnel, off, offPlayers, offCall.formation);
  const defPlayers = pickDefense(def, defCall.personnel);
  const los = 10 + sit.yardline;
  let sim: PlaySim;
  try {
    sim = new PlaySim({ offense: offPlayers, defense: defPlayers, offCall, defCall, los, ballY: sit.ballY,
      firstDownX: Math.min(110, los + sit.distance), seed: rng.nextU32(), manPrefs: prefs, down: sit.down,
      offStyle: alignStyle(off), defStyle: alignStyle(def) });
  } catch { continue; }
  const call = sim.offCall;
  const cov = sim.defCall.coverage;
  const play = [sit.down, sit.distance, 110 - los, call.formation.qb === 'gun' ? 'SHOTGUN' : call.formation.qb === 'pistol' ? 'PISTOL' : 'SINGLEBACK',
    '', call.kind === 'run' ? call.run!.scheme : '', cov.family ?? cov.id, cov.man ? 'Man' : 'Zone', call.kind === 'pass' ? 'TRUE' : 'FALSE', 'FALSE',
    off.abbr, def.abbr, sit.quarter];
  for (const a of sim.agents) {
    const position = a.team === 'O' ? OL[a.slot] ?? (a.player.position === 'TE' ? 'TE' : a.player.position === 'FB' ? 'FB' : a.player.position === 'RB' ? 'RB' : 'WR')
      : defPosition(a.slot, sim.defCall.personnel);
    const spot = a.team === 'D' ? sim.defAlign.spots[a.slot as keyof typeof sim.defAlign.spots] : undefined;
    const role = spot?.role;
    const assign = !role ? '' : role.kind === 'zone' ? role.zone : role.kind === 'man' ? 'MAN' : role.kind.toUpperCase();
    gz.write([k, 1, `${a.team}${a.slot}`, a.team, position, (a.pos.x - los).toFixed(2), a.pos.y.toFixed(2), sim.ballY.toFixed(2), ...play,
      '', '', assign, '', a.team === 'D' && (role?.kind === 'rush' || role?.kind === 'blitz') ? 'TRUE' : '',
      a.slot, sim.defCall.front.id, sim.defCall.personnel, call.formation.id, `"${sim.defCall.label.replace(/"/g, "'")}"`].join(',') + '\n');
  }
}
gz.end();

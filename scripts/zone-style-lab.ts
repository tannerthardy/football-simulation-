/**
 * Spot-drop vs pattern-match zone: the same pass concepts against the same
 * zone coverage, played both ways, on paired seeds (play i uses the same
 * seed under each style).
 *   npx tsx scripts/zone-style-lab.ts [coverage] [plays] [seed] [concepts]
 */
import { Rng } from '../src/core/rng.js';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall, ZoneStyle } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';

const [covId = 'cover3', countStr = '300', seedStr = '1', conceptList = 'hitches,stick,curl_flat,flood,four_verts,smash,dagger,levels,y_cross'] = process.argv.slice(2);
const count = Number(countStr);
const rng = new Rng(Number(seedStr));
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const offense = pickOffense(home, formation.personnel);
const defense = pickDefense(away, 'nickel');
const seeds = Array.from({ length: count }, () => rng.nextU32());

interface Row { att: number; comp: number; yards: number; ints: number; pbu: number; sep: number; sepN: number; ttt: number; tttN: number; sacks: number; armBreaks: number; busts: number }

function run(conceptId: string, style: ZoneStyle): Row {
  const offCall: OffensivePlayCall = { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[conceptId], label: conceptId };
  const defCall: DefensivePlayCall = { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[covId], pressure: null, zoneStyle: style, label: covId };
  const row: Row = { att: 0, comp: 0, yards: 0, ints: 0, pbu: 0, sep: 0, sepN: 0, ttt: 0, tttN: 0, sacks: 0, armBreaks: 0, busts: 0 };
  for (const seed of seeds) {
    const sim = new PlaySim({ offense, defense, offCall, defCall, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
    const r = sim.run();
    if (r.stats.sacked) row.sacks++;
    if (r.stats.attempted && !r.stats.throwaway) {
      row.att++;
      if (r.stats.completed && !r.stats.interceptedBy) row.comp++;
      if (r.stats.interceptedBy) row.ints++;
      if (r.stats.passDefendedBy) row.pbu++;
      row.yards += r.turnover ? 0 : r.yards;
      if (r.stats.separation !== undefined) {
        row.sep += r.stats.separation;
        row.sepN++;
      }
    }
    if (r.stats.timeToThrow !== undefined) {
      row.ttt += r.stats.timeToThrow;
      row.tttN++;
    }
    for (const a of sim.defense) {
      if (a.tags.has('readArm')) row.armBreaks++;
      if (a.tags.has('matchBust')) row.busts++;
    }
  }
  return row;
}

const pct = (n: number, d: number) => `${((100 * n) / Math.max(1, d)).toFixed(1)}%`.padStart(7);
console.log(`${COVERAGE_BY_ID[covId].name}, ${count} plays per cell (paired seeds)`);
console.log('concept'.padEnd(12) + 'style'.padEnd(7) + '   cmp%    YPA   INT%   PBU%   sep   ttt  read-arm/play  busts/play');
for (const c of conceptList.split(',')) {
  for (const style of ['match', 'spot'] as const) {
    const r = run(c, style);
    console.log(
      `${(style === 'match' ? c : '').padEnd(12)}${style.padEnd(7)}${pct(r.comp, r.att)}${(r.yards / Math.max(1, r.att)).toFixed(1).padStart(7)}${pct(r.ints, r.att)}${pct(r.pbu, r.att)}${(r.sep / Math.max(1, r.sepN)).toFixed(2).padStart(6)}${(r.ttt / Math.max(1, r.tttN)).toFixed(2).padStart(6)}${(r.armBreaks / count).toFixed(2).padStart(17)}${(r.busts / count).toFixed(2).padStart(12)}`,
    );
  }
}

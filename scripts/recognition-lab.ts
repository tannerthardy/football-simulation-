/**
 * Game-sense lab: how fast and how accurately defenders read run vs. pass,
 * by play and situation, and what it does to the play.
 *   npx tsx scripts/recognition-lab.ts [plays] [seed]
 *
 * For each cell: per position group, the mean time defenders committed to
 * the right read, the share who committed to the wrong one first, and the
 * play's average gain. "scouted" cells give the defense a report saying this
 * offense runs 85% of the time from this look.
 */
import { HASH_LEFT_Y } from '../src/core/field.js';
import { Rng } from '../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { DefensivePlayCall, OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';
import { ScoutingReport } from '../src/sim/recognition.js';

const [countStr = '150', seedStr = '1'] = process.argv.slice(2);
const count = Number(countStr);
const rng = new Rng(Number(seedStr));
const home = generateTeam(rng.fork('home'), 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(rng.fork('away'), 'Away', 'AWY', { strength: 0.6 });

const situations = [
  { name: '1st & 10', down: 1, dist: 10, los: 40 },
  { name: '2nd & 1', down: 2, dist: 1, los: 40 },
  { name: '3rd & 10', down: 3, dist: 10, los: 40 },
];
const plays: Array<{ id: string; form: string }> = [
  { id: 'iz_strong', form: 'ace_12' },
  { id: 'power', form: 'ace_12' },
  { id: 'draw', form: 'gun_doubles_11' },
  { id: 'curl_flat', form: 'ace_12' },
  { id: 'pa_post_dig', form: 'ace_12' },
];

function runCell(playId: string, formId: string, sit: (typeof situations)[number], scouted: boolean) {
  const formation = FORMATION_BY_ID[formId] ?? FORMATION_BY_ID.gun_doubles_11;
  const isRun = !!RUN_BY_ID[playId];
  const offCall: OffensivePlayCall = isRun
    ? { formation, flip: false, kind: 'run', run: RUN_BY_ID[playId], label: playId }
    : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[playId], label: playId };
  const personnel = formation.personnel === '11' || formation.personnel === '10' ? 'nickel' : 'base43';
  const defCall: DefensivePlayCall = { personnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID.cover3, pressure: null, zoneStyle: 'match', label: 'c3' };
  const offense = pickOffense(home, formation.personnel);
  const defense = pickDefense(away, personnel);
  let report: ScoutingReport | undefined;
  const groups: Record<string, { t: number; n: number; wrong: number; all: number }> = {};
  let gain = 0;
  for (let i = 0; i < count; i++) {
    const sim = new PlaySim({ offense, defense, offCall, defCall, los: 10 + sit.los, ballY: HASH_LEFT_Y, firstDownX: 10 + sit.los + sit.dist, seed: 1000 + i, down: sit.down, scouting: report });
    if (scouted && !report) {
      // Thirty snaps of this look, 85% runs: what the defense has seen today.
      report = new ScoutingReport();
      for (let k = 0; k < 30; k++) report.observe(sim.snapContext, k % 7 === 0);
      i--;
      continue;
    }
    const r = sim.run();
    gain += r.turnover ? 0 : r.yards;
    for (const d of sim.defense) {
      const g = d.slot.startsWith('LB') ? 'LB' : d.slot.startsWith('D') || d.slot === 'NT' ? 'DL' : d.slot === 'FS' || d.slot === 'SS' ? 'S' : 'CB';
      const rec = d.recog!;
      const cell = (groups[g] ??= { t: 0, n: 0, wrong: 0, all: 0 });
      cell.all++;
      const truth = isRun ? 'run' : 'pass';
      if (rec.changedMind || (rec.read !== 'unsure' && rec.read !== truth)) cell.wrong++;
      if (rec.read === truth && !rec.changedMind) {
        cell.t += rec.readAt;
        cell.n++;
      }
    }
  }
  const fmt = (g: string) => {
    const c = groups[g];
    if (!c) return ''.padEnd(16);
    return `${(c.t / Math.max(1, c.n)).toFixed(2)}s ${((100 * c.wrong) / c.all).toFixed(0).padStart(3)}%`.padEnd(16);
  };
  return `${fmt('DL')}${fmt('LB')}${fmt('S')}${fmt('CB')}${(gain / count).toFixed(1).padStart(6)}`;
}

console.log(`${count} plays per cell. Per group: mean time of a correct read, % who read it wrong first. Then avg gain.`);
console.log('play'.padEnd(13) + 'situation'.padEnd(18) + 'DL'.padEnd(16) + 'LB'.padEnd(16) + 'S'.padEnd(16) + 'CB'.padEnd(16) + '  gain');
for (const p of plays) {
  for (const sit of situations) console.log(`${p.id.padEnd(13)}${sit.name.padEnd(18)}${runCell(p.id, p.form, sit, false)}`);
  console.log(`${''.padEnd(13)}${'1st & 10 scouted'.padEnd(18)}${runCell(p.id, p.form, situations[0], true)}`);
}

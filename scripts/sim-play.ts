/**
 * Simulate single plays (or a batch) between two generated teams.
 *   npx tsx scripts/sim-play.ts [offConcept] [defCoverage] [count] [seed]
 */
import { Rng } from '../src/core/rng.js';
import { HASH_LEFT_Y } from '../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../src/league/team.js';
import { PASS_BY_ID, RUN_BY_ID } from '../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../src/playbook/formations.js';
import type { OffensivePlayCall } from '../src/playbook/types.js';
import { PlaySim } from '../src/sim/playsim.js';

const [conceptId = 'smash', covId = 'cover3', countStr = '1', seedStr = '1'] = process.argv.slice(2);
const count = Number(countStr);
const rng = new Rng(Number(seedStr));
const home = generateTeam(rng, 'Home', 'HOM', { strength: 0.6 });
const away = generateTeam(rng, 'Away', 'AWY', { strength: 0.6 });

const isRun = !!RUN_BY_ID[conceptId];
const formation = FORMATION_BY_ID[isRun ? 'i_pro_21' : 'gun_doubles_11'];
const offCall: OffensivePlayCall = isRun
  ? { formation, flip: false, kind: 'run', run: RUN_BY_ID[conceptId], label: conceptId }
  : { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[conceptId], label: conceptId };
const defPersonnel = formation.personnel === '21' ? 'base43' : 'nickel';
const defCall = { personnel: defPersonnel, front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[covId], pressure: null, label: covId } as const;

const offense = pickOffense(home, formation.personnel);
const defense = pickDefense(away, defPersonnel);

let yards = 0;
let comp = 0;
let att = 0;
let sacks = 0;
let ints = 0;
const outcomes: Record<string, number> = {};
const yacs: number[] = [];
const contactLag: number[] = [];
const agg = { sheds: 0, pressures: 0, ttt: 0, tttN: 0, yac: 0, yacN: 0, sep: 0, sepN: 0, air: 0, airN: 0, missed: 0, broken: 0, tds: 0, defTds: 0, scrambles: 0, drops: 0, pbu: 0, firstContact: 0, fcN: 0 };
const t0 = performance.now();
for (let i = 0; i < count; i++) {
  const playSeed = rng.nextU32();
  const sim = new PlaySim({ offense, defense, offCall, defCall: { ...defCall }, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed: playSeed, record: count === 1 });
  const r = sim.run();
  if (process.env.LIST) {
    const tgt = r.stats.target ? sim.agents.find((a) => a.player.id === r.stats.target)?.slot : '-';
    const by = r.stats.interceptedBy ? sim.agents.find((a) => a.player.id === r.stats.interceptedBy)?.slot : '';
    console.log(`#${i} ${r.outcome.padEnd(10)} yds ${r.yards.toFixed(1).padStart(6)} tgt ${tgt} air ${r.stats.airYards?.toFixed(1) ?? '-'} ttt ${r.stats.timeToThrow?.toFixed(2) ?? '-'} sep ${r.stats.separation ?? '-'} ${by ? 'INT by ' + by : ''} ${r.possession}`);
  }
  yards += r.yards;
  if (r.stats.attempted) att++;
  if (r.stats.completed) comp++;
  if (r.stats.sacked) sacks++;
  if (r.stats.interceptedBy) ints++;
  outcomes[r.outcome] = (outcomes[r.outcome] ?? 0) + 1;
  agg.sheds += r.events.filter((e) => e.type === 'shed').length;
  if (r.stats.pressured) agg.pressures++;
  if (r.stats.timeToThrow !== undefined) { agg.ttt += r.stats.timeToThrow; agg.tttN++; }
  if (r.stats.yac !== undefined) { agg.yac += r.stats.yac; agg.yacN++; yacs.push(r.stats.yac); }
  {
    const cat = r.events.find((e) => e.type === 'catch');
    const firstTry = r.events.find((e) => cat && e.t >= cat.t && (e.type === 'missed_tackle' || e.type === 'tackle' || e.type === 'hit' || e.type === 'broken_tackle' || e.type === 'out_of_bounds'));
    if (cat && firstTry) contactLag.push(firstTry.t - cat.t);
  }
  if (r.stats.separation !== undefined) { agg.sep += r.stats.separation; agg.sepN++; }
  if (r.stats.airYards !== undefined) { agg.air += r.stats.airYards; agg.airN++; }
  if (r.stats.yardsBeforeContact !== undefined) { agg.firstContact += r.stats.yardsBeforeContact; agg.fcN++; }
  agg.missed += r.stats.missedTackles;
  agg.broken += r.stats.brokenTackles;
  if (r.score?.kind === 'TD') r.score.team === 'O' ? agg.tds++ : agg.defTds++;
  if (r.stats.scramble) agg.scrambles++;
  if (r.stats.dropped) agg.drops++;
  if (r.stats.passDefendedBy) agg.pbu++;
  if (count === 1) {
    for (const e of r.events) {
      const a = e.a !== undefined ? sim.agents[e.a] : null;
      const b = e.b !== undefined ? sim.agents[e.b] : null;
      console.log(`${e.t.toFixed(2).padStart(5)}s ${e.type.padEnd(14)} ${a ? `${a.slot}:${a.name}` : ''} ${b ? `→ ${b.slot}:${b.name}` : ''} ${e.note ?? ''}`);
    }
    console.log(JSON.stringify({ outcome: r.outcome, yards: r.yards, duration: r.duration, stats: r.stats }, null, 1));
  }
}
const ms = performance.now() - t0;
if (count > 1) {
  console.log(`${count} plays of ${conceptId} vs ${covId}: ${(yards / count).toFixed(2)} yds/play, comp ${comp}/${att} (${((comp / Math.max(1, att)) * 100).toFixed(1)}%), sacks ${sacks}, INT ${ints}`);
  console.log('outcomes', outcomes);
  const f = (v: number, n: number) => (n ? (v / n).toFixed(2) : '-');
  yacs.sort((p, q) => p - q);
  contactLag.sort((p, q) => p - q);
  if (yacs.length) console.log(`YAC median ${yacs[Math.floor(yacs.length / 2)].toFixed(1)} p75 ${yacs[Math.floor(yacs.length * 0.75)].toFixed(1)} ≥20: ${((yacs.filter((y) => y >= 20).length / yacs.length) * 100).toFixed(0)}%  catch→first contact median ${contactLag.length ? contactLag[Math.floor(contactLag.length / 2)].toFixed(2) : '-'}s p75 ${contactLag.length ? contactLag[Math.floor(contactLag.length * 0.75)].toFixed(2) : '-'}s`);
  console.log(`sheds/play ${f(agg.sheds, count)} pressure% ${f(agg.pressures * 100, count)} ttt ${f(agg.ttt, agg.tttN)} aDOT ${f(agg.air, agg.airN)} sep ${f(agg.sep, agg.sepN)} YAC ${f(agg.yac, agg.yacN)} YBC ${f(agg.firstContact, agg.fcN)} missed/play ${f(agg.missed, count)} broken/play ${f(agg.broken, count)} TD ${agg.tds} defTD ${agg.defTds} scr ${agg.scrambles} drops ${agg.drops} pbu ${agg.pbu}`);
}
console.log(`${(ms / count).toFixed(2)} ms/play`);

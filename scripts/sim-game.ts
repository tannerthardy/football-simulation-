/**
 * Simulate a full game between two generated teams and print the box score
 * and (optionally) play-by-play.
 *   npx tsx scripts/sim-game.ts [seed] [--pbp]
 */
import { Rng } from '../src/core/rng.js';
import { generateTeam } from '../src/league/team.js';
import { formatClock, simulateGame, situationText } from '../src/game/game.js';

const args = process.argv.slice(2);
const seed = Number(args.find((a) => !a.startsWith('--')) ?? 1);
const showPbp = args.includes('--pbp');
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 });
const away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const t0 = performance.now();
const g = simulateGame(home, away, { seed });
const ms = performance.now() - t0;

if (showPbp) {
  let q = 0;
  for (const p of g.log) {
    if (p.quarter !== q) {
      q = p.quarter;
      console.log(`\n=== ${q <= 4 ? `Quarter ${q}` : 'Overtime'} ===`);
    }
    const sit = p.kind === 'run' || p.kind === 'pass' || p.kind === 'penalty' ? situationText(p).padEnd(22) : ''.padEnd(22);
    console.log(`${formatClock(p.clock).padStart(5)} ${p.offense} ${sit} ${p.text}${p.call && (p.kind === 'run' || p.kind === 'pass') ? `   [${p.call} | ${p.defense}]` : ''}`);
  }
}

console.log(`\nFINAL: ${home.name} ${g.score.home} — ${away.name} ${g.score.away}   (simulated in ${ms.toFixed(0)} ms, ${g.log.length} plays)`);
console.log(`Schemes: ${home.abbr} ${home.offScheme}/${home.defScheme}  ${away.abbr} ${away.offScheme}/${away.defScheme}`);
for (const t of [home, away]) {
  const tl = g.box.team(t.abbr);
  console.log(`\n${t.name} (${t.abbr}): ${tl.totalYds.toFixed(0)} yds (${tl.passYds.toFixed(0)} pass, ${tl.rushYds.toFixed(0)} rush), ${tl.plays} plays, ${tl.firstDowns} 1st downs, 3rd ${tl.thirdConv}/${tl.thirdAtt}, 4th ${tl.fourthConv}/${tl.fourthAtt}, TO ${tl.turnovers}, sacks allowed ${tl.sacksAllowed}, pen ${tl.penalties}-${tl.penaltyYds}, TOP ${formatClock(tl.timeOfPossession)}`);
  const lines = g.box.teamPlayers(t.abbr);
  for (const l of lines.filter((l) => l.att > 0)) console.log(`  PASS ${l.name.padEnd(14)} ${l.cmp}/${l.att} ${l.passYds.toFixed(0)} yds ${l.passTD} TD ${l.int} INT, sacked ${l.sacked}`);
  for (const l of lines.filter((l) => l.rushAtt > 0).sort((a, b) => b.rushYds - a.rushYds)) console.log(`  RUSH ${l.name.padEnd(14)} ${l.rushAtt}-${l.rushYds.toFixed(0)} (${(l.rushYds / l.rushAtt).toFixed(1)}) ${l.rushTD} TD long ${l.rushLong}`);
  for (const l of lines.filter((l) => l.targets > 0).sort((a, b) => b.recYds - a.recYds)) console.log(`  REC  ${l.name.padEnd(14)} ${l.rec}/${l.targets} ${l.recYds.toFixed(0)} yds ${l.recTD} TD long ${l.recLong} YAC ${l.yac.toFixed(0)}`);
  const d = lines.filter((l) => l.tackles > 0 || l.sacks > 0 || l.defInt > 0 || l.pd > 0).sort((a, b) => b.tackles - a.tackles).slice(0, 6);
  for (const l of d) console.log(`  DEF  ${l.name.padEnd(14)} ${l.pos.padEnd(4)} tkl ${l.tackles.toFixed(1)} sacks ${l.sacks.toFixed(1)} INT ${l.defInt} PD ${l.pd} pressures ${l.pressures}`);
  for (const l of lines.filter((l) => l.fga > 0 || l.xpa > 0 || l.punts > 0)) console.log(`  K/P  ${l.name.padEnd(14)} FG ${l.fgm}/${l.fga} XP ${l.xpm}/${l.xpa} punts ${l.punts} avg ${(l.puntYds / Math.max(1, l.punts)).toFixed(1)}`);
}

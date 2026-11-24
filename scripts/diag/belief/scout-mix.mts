/** SCOUT_SEEN (Flex, 2026-11-24): what the offense's in-game coverage scouting believes of a defense's coverage mix against the
 * defense's true mix on that game's pass plays, by pass-play index: total-variation distance between the two family
 * distributions (0 = the same, 1 = disjoint), and the disguise rate it holds against the true one. Run with SCOUT_SEEN=0 and =1.
 * usage: [SCOUT_SEEN=0] node --import tsx scripts/diag/belief/scout-mix.mts [games=4] [seed=901] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { FAMILY_REPRESENTATIVE, familyOf } from '../../../src/playbook/coverages.js';
import { SCOUT_SEEN } from '../../../src/sim/qbmind.js';
import type { CoverageScouting } from '../../../src/sim/qbmind.js';
const games = Number(process.argv[2] ?? 4), seed0 = Number(process.argv[3] ?? 901);
const rng = new Rng(seed0);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
const marks = [5, 10, 20, 30, 40];
const acc = new Map<number, { tv: number; dis: number; disTrue: number; n: number }>();
for (let g = 0; g < games; g++) {
  const truth = new Map<CoverageScouting, { counts: Record<string, number>; n: number; disguised: number }>();
  simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, hooks: {
    playSetup: (setup) => {
      if (setup.offCall.kind !== 'pass' || !setup.coverageScouting) return;
      const sc = setup.coverageScouting, t = truth.get(sc) ?? { counts: {}, n: 0, disguised: 0 };
      truth.set(sc, t);
      // The scouting as it stands before this snap, against the true mix of the snaps before it.
      if (marks.includes(t.n) && t.n > 0) {
        const f = sc.frequencies(), fam: Record<string, number> = {};
        for (const [id, p] of Object.entries(f)) fam[id] = (fam[id] ?? 0) + p;
        const keys = new Set([...Object.keys(fam), ...Object.keys(t.counts)]);
        let tv = 0; for (const k of keys) tv += Math.abs((fam[k] ?? 0) - (t.counts[k] ?? 0) / t.n); tv /= 2;
        const a = acc.get(t.n) ?? { tv: 0, dis: 0, disTrue: 0, n: 0 };
        a.tv += tv; a.dis += sc.disguiseRate(); a.disTrue += t.disguised / t.n; a.n++; acc.set(t.n, a);
      }
      const c = setup.defCall, rep = FAMILY_REPRESENTATIVE[familyOf(c.coverage)] ?? c.coverage.id;
      t.counts[rep] = (t.counts[rep] ?? 0) + 1; t.n++;
      if (c.shown && c.shown.shell !== (c.coverage.look ?? c.coverage.shell)) t.disguised++;
    } } });
}
console.log(`SCOUT_SEEN=${SCOUT_SEEN ? 1 : 0}, ${games} games`);
console.log('| pass plays seen | team-games | TV distance, learned vs true mix | disguise rate held | true disguise rate |');
console.log('|---|---|---|---|---|');
for (const k of marks) { const a = acc.get(k); if (a) console.log(`| ${k} | ${a.n} | ${(a.tv / a.n).toFixed(3)} | ${(a.dis / a.n).toFixed(3)} | ${(a.disTrue / a.n).toFixed(3)} |`); }

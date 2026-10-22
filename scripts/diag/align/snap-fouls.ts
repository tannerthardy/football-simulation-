/** Pre-snap acts and fouls under the current profile: whole games, counted
 * from the play log (penalty entries and live fouls), plus per snap the
 * count's hard counts and early defenders' closest approach to the neutral
 * zone. Observation only.
 * node --import tsx scripts/diag/align/snap-fouls.ts [seed=401] [games=4] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';

const causes = new Map<string, number>();
const seen = new WeakSet<object>();
const build = PlaySim.prototype.buildResult;
PlaySim.prototype.buildResult = function (this: PlaySim, ...args: unknown[]) {
  if (!seen.has(this) && this.snapDead) { seen.add(this); const k = this.snapActs?.cause ?? '?'; causes.set(k, (causes.get(k) ?? 0) + 1); }
  return (build as (...x: unknown[]) => ReturnType<typeof build>).apply(this, args);
} as typeof build;
const seed = Number(process.argv[2] ?? 401), games = Number(process.argv[3] ?? 4);
const rng = new Rng(seed);
const home = generateTeam(rng.fork('home'), 'HOM', 'Home'), away = generateTeam(rng.fork('away'), 'AWY', 'Away');
const fouls = new Map<string, number>();
let snaps = 0, hard = 0, early = 0, crossed = 0;
const margins: number[] = [];
for (let g = 0; g < games; g++) {
  const res = simulateGame(home, away, { seed: seed + g, hooks: {
    playResult: (sim: PlaySim) => {
      snaps++;
      if (sim.snapCount?.hard) hard++;
      for (const d of sim.defense) {
        const p = sim.snapCount?.plans.get(d);
        if (!p || p.go >= 0) continue;
        early++;
        const m = sim.snapX[d.idx] - d.profile.radius - sim.los;
        margins.push(m); if (m < 0) crossed++;
      }
      for (const d of sim.defense) if (sim.snapActs?.inZone.has(d.player.id)) {
        const p = sim.snapCount!.plans.get(d)!;
        console.log(`offside: ${sim.snapCount!.hard ? 'hard count' : 'rhythm'} ${d.slot} go ${p.go.toFixed(3)} stop ${p.stop?.toFixed(3) ?? '-'} down ${sim.snapContext.down} disc ${d.r('discipline').toFixed(2)} antic ${d.r('anticipation').toFixed(2)}`);
      }
      return sim.run();
    } } } as never);
  for (const e of (res as { log: { kind: string; fouls?: { kind: string; accepted?: boolean }[] }[] }).log)
    for (const f of e.fouls ?? []) if (/false_start|offside|encroachment|neutral_zone/.test(f.kind)) fouls.set(f.kind, (fouls.get(f.kind) ?? 0) + 1);
}
const q = (v: number[], f: number) => v.length ? v.slice().sort((a, b) => a - b)[Math.floor(f * (v.length - 1))] : NaN;
console.log(`snaps run ${snaps} | hard counts ${hard} | early defenders ${early}, in the neutral zone at the snap ${crossed}`);
console.log(`early defenders' margin to the neutral zone at the snap p05/25/50 ${[.05, .25, .5].map(f => q(margins, f).toFixed(2)).join('/')} yd`);
console.log(`pre-snap fouls ${[...fouls].map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);
console.log(`dead-ball pre-snap acts by cause ${[...causes].map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}`);

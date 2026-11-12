// Why SHOULDER_READ's lean doesn't engage: on underneath ZoneCoverage defenders, each ZoneCoverage.update call between
// the QB's windup start and the release, which of shoulderLean's gates fails first (sim only). Also counts the
// 'shoulder-read' tag. usage: SHOULDER_READ=1 npx tsx scripts/diag/risk/lean-gates.ts [seed] [games]
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { ZoneCoverage, seenQbEyes } from '../../../src/sim/behaviors/defense.js';
import { hasObservedFlight, observedHolder } from '../../../src/sim/possession-read.js';
const seed = Number(process.argv[2] ?? 11), games = Number(process.argv[3] ?? 4);
const Z: any = ZoneCoverage.prototype, up0 = Z.update;
const fail = new Map<string, number>(); let calls = 0, tagged = 0, plays = new Set<any>(), first: number[] = [];
const bump = (k: string) => fail.set(k, (fail.get(k) ?? 0) + 1);
Z.update = function (a: any, sim: any) {
  const pre = a.tags.has('shoulder-read');
  const r = up0.call(this, a, sim);
  if (!this.deep && sim.windupAt >= 0 && sim.ball.kind !== 'air' && sim.qb.behavior && sim.phase === 'live') {
    calls++; plays.add(sim);
    if (!pre && a.tags.has('shoulder-read')) { tagged++; first.push(sim.t - sim.windupAt); }
    const react = a.mind.observationDelay(a.profile.reactionTime * (1 - 0.4 * a.r('anticipation')));
    const qb = sim.see(a, sim.qb).pos;
    let held = true;
    for (let back = 1; back * sim.dt <= react + 1e-9; back++) {
      const me = sim.perception.recorded(a.idx, back * sim.dt), q = sim.perception.recorded(sim.qb.idx, back * sim.dt);
      if (!me || !q || Math.cos(me.facing - Math.atan2(q.pos.y - me.pos.y, q.pos.x - me.pos.x)) <= -0.2) { held = false; break; }
    }
    const k = hasObservedFlight(a) ? 'observed flight' : observedHolder(a, sim)?.target !== sim.qb ? `holder not QB (${observedHolder(a, sim)?.target?.slot ?? 'none'})`
      : Math.cos(a.body.facing - Math.atan2(qb.y - a.pos.y, qb.x - a.pos.x)) <= -0.2 ? 'not facing QB'
      : sim.t - sim.windupAt < react ? 'react not elapsed' : !held ? 'eyes not held' : !seenQbEyes(a, sim) ? 'seenQbEyes null'
      : a.tags.has('shoulder-read') ? 'lean fired' : 'passed gates, no tag (returned earlier)';
    bump(k);
  }
  return r;
};
const rng = new Rng(seed);
const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed + g), leagueSample(away, seed + g), { seed: seed + g, record: false });
console.log(`seed ${seed}, ${games} games, SHOULDER_READ=${process.env.SHOULDER_READ ?? '0'}: underneath ZoneCoverage.update calls between windup and release ${calls}; newly tagged shoulder-read ${tagged}`);
for (const [k, v] of [...fail].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(40)} ${(100 * v / calls).toFixed(1)}%`);

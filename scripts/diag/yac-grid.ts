// Matched single pass plays (paired-plays grid: fixed rosters, calls, seeds).
// Per completed catch: YAC, catch depth, time to first defender within 1.3 yd,
// and mean speed fraction of defenders >12 yd from the carrier after the catch.
//   node --import tsx scripts/diag/yac-grid.ts OUT.jsonl [reps=1] [shard=0/1]
import { writeFileSync } from 'node:fs';
import { CENTER_Y } from '../../src/core/field.js';
import { Rng } from '../../src/core/rng.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_CONCEPTS } from '../../src/playbook/concepts.js';
import { COVERAGES } from '../../src/playbook/coverages.js';
import { FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';
const [outPath, repsArg, shardArg] = process.argv.slice(2);
const reps = Number(repsArg ?? 1); const [si, sn] = (shardArg ?? '0/1').split('/').map(Number);
const tick = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  tick.call(this);
  if (this.catchAt < 0 || !this.carrier) return;
  const r = (this.__y ??= { ttc: null as number | null, far: 0, farN: 0, near: 0, nearN: 0 });
  const c = this.carrier;
  if (c.team !== 'O' && c.side !== 'O' && this.offense && !this.offense.includes(c)) return;
  for (const d of this.defense) {
    if (d.isDown?.(this.t)) continue;
    const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
    if (r.ttc === null && dist < 1.3) r.ttc = this.t - this.catchAt;
    const f = Math.hypot(d.vel.x, d.vel.y) / (d.profile.vmax * (d.speedScale ?? 1));
    if (dist > 12) { r.far += f; r.farN++; } else if (dist > 3) { r.near += f; r.nearN++; }
  }
};
const forms = ['gun_doubles_11', 'gun_trips_11'], concepts = PASS_CONCEPTS.filter(c => c.family !== 'playaction');
const rows: string[] = []; let i = 0;
for (const cov of COVERAGES) for (const roster of [7, 19, 31]) {
  const lr = new Rng(roster);
  const off = generateTeam(lr.fork('offense'), 'Offense', 'OFF', { strength: 0.55 }), def = generateTeam(lr.fork('defense'), 'Defense', 'DEF', { strength: 0.55 });
  for (const form of forms) for (const concept of concepts) for (const flip of [false, true]) for (let r = 0; r < reps; r++) {
    if (i++ % sn !== si) continue;
    const formation = FORMATION_BY_ID[form];
    const sim: any = new PlaySim({ offense: pickOffense(off, formation.personnel), defense: pickDefense(def, 'nickel'),
      offCall: { formation, flip, kind: 'pass', pass: concept, label: '' },
      defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: cov, pressure: null, zoneStyle: 'match', label: '', checkPick: r % 2 },
      los: 35, ballY: CENTER_Y, firstDownX: 45, seed: 1000 * roster + 17 * r + (flip ? 7 : 0) });
    let res; try { res = sim.run(); } catch { continue; }
    const key = `${cov.id}|${roster}|${form}|${concept.id}|${flip}|${r}`;
    const s = res.stats, y = sim.__y;
    rows.push(JSON.stringify(s.completed && s.yac !== undefined
      ? { key, comp: 1, yac: s.yac, air: s.completedAirYards, yds: res.yards, ttc: y?.ttc ?? null,
          far: y && y.farN ? y.far / y.farN : null, miss: s.missedTackles, broke: s.brokenTackles, td: sim.scoreKind === 'TD', near: y && y.nearN ? y.near / y.nearN : null }
      : { key, comp: 0 }));
  }
}
writeFileSync(outPath, rows.join('\n') + '\n');
console.log(rows.length, 'plays ->', outPath);

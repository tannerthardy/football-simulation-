// Paired single plays (the coverage-matrix grid: fixed rosters, calls, seeds).
// Per play, the defender (not a lineman) nearest the target at the release:
// his distance to the target at the release and at the ball's arrival, his
// depth band, the call's family, plus deep-man depth over the receiver.
//   node --import tsx scripts/diag/paired-plays.ts OUT.jsonl [reps=1] [shard=0/1]   (MAN_ONLY=1: man calls only)
// Compare two arms with scripts/diag/paired-compare.py A.jsonl B.jsonl.
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
const DL = /^(DE|DT|NT|EDGE|DL)/;
const tick = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  tick.call(this);
  const b = this.ball, rec = this.__rec;
  if (!rec && b.kind === 'air' && b.target && !b.throwaway) {
    const T = b.target, D = this.defense.filter((d: any) => !DL.test(d.slot));
    const dist = (d: any) => Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y);
    const d = D.reduce((x: any, y: any) => dist(y) < dist(x) ? y : x);
    this.__rec = { T, d, d0: dist(d), deep: d.pos.x - this.los >= 8, rdeep: T.pos.x - this.los, over: d.pos.x - T.pos.x, arr: b.arrivalT, t0: this.t };
  } else if (rec && rec.d1 === undefined && (this.t >= rec.arr - 1e-9 || b.kind !== 'air')) {
    rec.d1 = Math.hypot(rec.d.pos.x - rec.T.pos.x, rec.d.pos.y - rec.T.pos.y);
  }
};
const forms = ['gun_doubles_11', 'gun_trips_11'], concepts = PASS_CONCEPTS.filter(c => c.family !== 'playaction');
const rows: string[] = []; let i = 0;
for (const cov of COVERAGES.filter(c => !process.env.MAN_ONLY || c.man)) for (const roster of [7, 19, 31]) {
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
    const k = sim.__rec; const key = `${cov.id}|${roster}|${form}|${concept.id}|${flip}|${r}`;
    rows.push(JSON.stringify(k && k.d1 !== undefined
      ? { key, man: !!cov.man, deep: k.deep, rdeep: k.rdeep, over: k.over, d0: k.d0, d1: k.d1, tgt: k.T.slot, def: k.d.slot, comp: !!res.stats.completed, yds: res.stats.completed ? res.yards : 0 }
      : { key, none: true }));
  }
}
writeFileSync(outPath, rows.join('\n') + '\n');
console.log(rows.length, 'plays ->', outPath);

/** Box leak tracer (observation only). For every defender who is downfield of
 * the runner when he crosses the line, the moment the runner draws level with
 * him: blocked (and by whom), on the ground, or free, his lateral position
 * relative to the runner (+ = play side), his flow, and whether he ever got a
 * hand on the runner. Plus the play's gain and first-hold depth.
 *
 * node --import tsx scripts/diag/open-field/box.ts --out out/open-field/box-X.jsonl.gz [lab selection args] [--shard i/n]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import type { Agent } from '../../../src/sim/agent.js';
import { caseId, LOOK_SPECS, makeSim, rosters, type LabCase } from '../zone-lab/lab.js';

const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 ? process.argv[i + 1] : d; };
const list = (n: string, d: string) => arg(n, d).split(',').filter(Boolean);
const r2 = (x: number) => Math.round(x * 100) / 100;

function trace(c: LabCase, R: ReturnType<typeof rosters>) {
  const sim = makeSim(c, R);
  const dir = sim.attackDir('O');
  const ps = c.dir === 'strong' ? sim.offAlign.strongSign : -sim.offAlign.strongSign;
  const depth = (p: { x: number }) => (p.x - sim.los) * dir;
  let crossT = -1; const watch = new Set<Agent>();
  const rec = new Map<Agent, any>();
  const touched = new Set<number>();
  let firstHold: number | null = null;
  while (sim.phase === 'live' && sim.t < 20) {
    sim.tick();
    const car = sim.carrier;
    if (!car || car.team !== 'O' || sim.handoffAt < 0) continue;
    for (const j of sim.world.joints) if (j.kind === 'grasp' && j.b === car.body) {
      const d = sim.agents.find(a => a.body === j.a)!; touched.add(d.idx);
      if (firstHold === null) firstHold = r2(depth(car.pos));
    }
    for (const e of sim.events.slice(-4)) if (e.type === 'missed_tackle' && e.a !== undefined) touched.add(e.a);
    if (crossT < 0 && depth(car.pos) > 0) {
      crossT = sim.t;
      for (const d of sim.defense) if (depth(d.pos) > depth(car.pos)) watch.add(d);
    }
    if (crossT < 0) continue;
    for (const d of watch) {
      if (rec.has(d) || depth(car.pos) < depth(d.pos)) continue;
      const eng = d.engagement;
      rec.set(d, { d: d.slot, t: r2(sim.t), at: r2(depth(car.pos)), lat: r2((d.pos.y - car.pos.y) * ps), dist: r2(Math.hypot(d.pos.x - car.pos.x, d.pos.y - car.pos.y)),
        blocked: eng ? eng.blocker.slot : null, win: eng ? r2(eng.win) : null, down: d.isDown(sim.t), dvy: r2(d.vel.y * ps), cvy: r2(car.vel.y * ps), ds: r2(d.speed), cs: r2(car.speed),
        fit: d.runFit ? `${d.runFit.kind}:${d.runFit.gap}${d.runFit.side * ps > 0 ? '+' : '-'}` : null, k: d.behavior.kind });
    }
  }
  for (const [d, r] of rec) r.touched = touched.has(d.idx);
  const res = sim.buildResult();
  return { id: caseId(c), ...c, gain: r2(res.offenseYards), firstHold, crossT: crossT >= 0 ? r2(crossT) : null, passes: [...rec.values()] };
}

const [si, sn] = arg('--shard', '0/1').split('/').map(Number);
const R = rosters();
const cases: LabCase[] = [];
for (const formation of list('--formations', 'ace_12')) for (const concept of list('--concepts', 'iz,oz,wz'))
  for (const dir of list('--dirs', 'strong,weak') as Array<'strong' | 'weak'>) for (const lk of list('--looks', LOOK_SPECS.map(l => l[0]).join(',')))
    for (const roster of list('--rosters', 'pair11,pair31')) for (const seed of list('--seeds', '77,71001,1,2,3,4,5,6,7,8').map(Number))
      cases.push({ concept, dir, look: lk, roster, seed, formation });
const rows: string[] = [];
for (const c of cases.filter((_, i) => i % sn === si)) {
  try { rows.push(JSON.stringify(trace(c, R))); } catch (e) { rows.push(JSON.stringify({ id: caseId(c), error: String(e) })); }
}
const out = arg('--out', 'out/open-field/box.jsonl.gz');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, gzipSync(rows.join('\n') + '\n'));
console.log(`${rows.length} plays -> ${out}`);

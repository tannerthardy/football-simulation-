/** Does automatic rising undo a ground finish? Re-runs tackle-panel reps and
 * logs, per rep, the holder's support transitions while he has a live grasp on
 * an upright carrier: when he went down holding, when the passive support rule
 * started him rising (still holding), the carrier's speed then, and the ending.
 * Reads reps from a panel JSON (default: its censored reps) or one rep from args.
 * node --import tsx scripts/diag/tackle/ground-rise.ts out/c2/tkd-prod.json [ending=censored] [substeps]
 * node --import tsx scripts/diag/tackle/ground-rise.ts --rep angle speed cut(0|1) side seed [substeps]
 * node --import tsx scripts/diag/tackle/ground-rise.ts --fresh seed0 nseeds [substeps] [--out file.json] (every panel cell, both sides)
 * Flags (LEG_BRACE, TACKLE_ROLL, WRAP_BIND, TACKLE_DROP, ...) come from the environment.
 */
import { readFileSync } from 'node:fs';
import type { Agent } from '../../../src/sim/agent.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { writeFileSync } from 'node:fs';
import { CELLS, rep } from './panel.js';

type Key = { angle: number; speed: number; cut: boolean; side: 1 | -1; seed: number };
const a = process.argv.slice(2).filter((x) => x !== '--stay-down-hook');
if (process.argv.includes('--stay-down-hook')) await import('./stay-down-hook.js');
let keys: Key[], substeps: number | undefined;
const outAt = a.indexOf('--out'), out = outAt >= 0 ? a.splice(outAt, 2)[1] : null;
const quiet = a[0] === '--fresh';
if (a[0] === '--fresh') {
  const [seed0, n] = [+a[1], +a[2]];
  keys = CELLS.flatMap((c) => ([1, -1] as const).flatMap((side) => Array.from({ length: n }, (_, i) => ({ angle: c.angle, speed: c.speed, cut: c.cut, side, seed: seed0 + i }))));
  substeps = a[3] ? +a[3] : undefined;
} else if (a[0] === '--rep') {
  keys = [{ angle: +a[1], speed: +a[2], cut: a[3] === '1', side: +a[4] as 1 | -1, seed: +a[5] }];
  substeps = a[6] ? +a[6] : undefined;
} else {
  const want = a[1] ?? 'censored';
  keys = (JSON.parse(readFileSync(a[0], 'utf8')).rows as (Key & { ending: string })[]).filter((r) => want === 'all' || r.ending === want);
  substeps = a[2] ? +a[2] : undefined;
}

let log: string[] = [], state = '', holding = false, downHolding = 0, risesHolding = 0;
const original = (PlaySim.prototype as any).tick as (this: PlaySim) => void;
(PlaySim.prototype as any).tick = function (this: PlaySim) {
  original.call(this);
  const c = this.slot('RB') as Agent, d = this.defense.find((x: Agent) => x.slot === 'MLB' || x.slot.startsWith('LB')) as Agent;
  const g = this.world.joints.find((j) => j.kind === 'grasp' && j.a === d.body && j.b === c.body && !j.broken) as any;
  const s = d.body.support?.state ?? '?', cs = c.body.support?.state ?? '?';
  const live = !!g && cs === 'up';
  if (live && s === 'down') downHolding += this.dt;
  if (s !== state || live !== holding) {
    if (s === 'rising' && state === 'down' && live) risesHolding++;
    log.push(`${this.t.toFixed(2)} holder ${s}${live ? ` holding (legs ${g.legs.toFixed(2)}, F ${(g.force ?? 0).toFixed(0)})` : g ? ' holding a downed carrier' : ' no grip'}, carrier ${cs} ${Math.hypot(c.vel.x, c.vel.y).toFixed(2)} yd/s`);
    state = s; holding = live;
  }
};
const rows: string[] = [], records: object[] = [];
for (const k of keys) {
  log = []; state = ''; holding = false; downHolding = 0; risesHolding = 0;
  const r = rep({ angle: k.angle, speed: k.speed, cut: k.cut, difficulty: 'difficult' }, k.side, k.seed, { substeps });
  const tag = `${k.angle}/${k.speed}${k.cut ? ' cut' : ''} side ${k.side} seed ${k.seed}`;
  records.push({ ...k, ending: r.ending, endWhy: r.endWhy, afterContact: r.afterContact, risesHolding, downHolding, finish: r.finish });
  if (quiet && !risesHolding) continue;
  console.log(`\n== ${tag}: ${r.ending} (${r.endWhy}), after contact ${(r.afterContact ?? NaN).toFixed(1)} yd; rose while holding ${risesHolding}x; down holding ${downHolding.toFixed(2)} s`);
  for (const l of log) console.log('   ' + l);
  if (risesHolding || !quiet) rows.push(`${tag.padEnd(28)} ${r.ending.padEnd(9)} rises-holding ${risesHolding} down-holding ${downHolding.toFixed(2)} s`);
}
console.log('\n' + rows.join('\n'));
const n = records.length, rises = records.filter((r: any) => r.risesHolding).length;
console.log(`\n${n} reps; ${rises} rose while holding (${records.filter((r: any) => r.risesHolding && r.ending !== 'tackled').length} of them not tackled)`);
if (out) writeFileSync(out, JSON.stringify({ substeps: substeps ?? 'adaptive', rows: records }, null, 1));

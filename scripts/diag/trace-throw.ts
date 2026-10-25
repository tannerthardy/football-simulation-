/** Trace the target and the defenders near it from 0.6 s before the throw to the catch. */
import { Rng } from '../../src/core/rng.js';
import { HASH_LEFT_Y } from '../../src/core/field.js';
import { generateTeam, pickDefense, pickOffense } from '../../src/league/team.js';
import { PASS_BY_ID } from '../../src/playbook/concepts.js';
import { COVERAGE_BY_ID, FRONT_BY_ID } from '../../src/playbook/defense.js';
import { FORMATION_BY_ID } from '../../src/playbook/formations.js';
import { PlaySim } from '../../src/sim/playsim.js';

const [cid = 'comebacks', cov = 'cover1', count = '4', minDepth = '10'] = process.argv.slice(2);
const rng = new Rng(5);
const off = generateTeam(rng, 'O', 'OFF', { strength: 0.55 });
const def = generateTeam(rng, 'D', 'DEF', { strength: 0.55 });
const formation = FORMATION_BY_ID.gun_doubles_11;
const offense = pickOffense(off, formation.personnel);
const defense = pickDefense(def, 'nickel');
let shown = 0;
for (let k = 0; k < 200 && shown < Number(count); k++) {
  const seed = rng.nextU32();
  const mk = () => new PlaySim({ offense, defense, offCall: { formation, flip: false, kind: 'pass', pass: PASS_BY_ID[cid], label: cid }, defCall: { personnel: 'nickel', front: FRONT_BY_ID.over, coverage: COVERAGE_BY_ID[cov], pressure: null, label: '' }, los: 35, ballY: HASH_LEFT_Y, firstDownX: 45, seed });
  const probe = mk().run();
  const th = probe.events.find((e) => e.type === 'throw');
  if (!th || th.b === undefined || probe.stats.throwaway) continue;
  const sim = mk() as any;
  sim.event('snap', sim.slot('C') ?? sim.qb);
  const tgt = sim.agents[th.b];
  let caught = -1;
  const lines: string[] = [];
  while (sim.phase === 'live' && sim.t < 12) {
    sim.tick();
    if (sim.t >= th.t - Number(process.env.BEFORE ?? 0.6) && (caught < 0 || sim.t <= caught + 1.0) && Math.round(sim.t * 20) % Number(process.env.EVERY ?? 2) === 0) {
      const defs = sim.defense.map((d: any) => [d, Math.hypot(d.pos.x - tgt.pos.x, d.pos.y - tgt.pos.y)]).sort((a: any, b: any) => a[1] - b[1]).slice(0, 2);
      lines.push(`  t=${sim.t.toFixed(2)} ${sim.ball.kind.padEnd(4)} ${tgt.slot} (${(tgt.pos.x - 35).toFixed(1)},${tgt.pos.y.toFixed(1)}) v=${tgt.speed.toFixed(1)} ${tgt.behavior.kind.padEnd(12)} | ` + defs.map(([d, dist]: any) => `${d.slot} d=${dist.toFixed(1)} (${(d.pos.x - 35).toFixed(1)},${d.pos.y.toFixed(1)}) v=${d.speed.toFixed(1)} ${d.behavior.kind}${d.tags.has('onBall') ? '*' : ''}`).join(' | '));
    }
    if (caught < 0 && sim.carrier === tgt) caught = sim.t;
  }
  const r = sim.buildResult();
  console.log(`\nseed ${seed}: ${cid} vs ${cov}, target ${tgt.slot}, throw t=${th.t}, completed=${r.stats.completed} yards=${r.yards.toFixed(1)} yac=${r.stats.yac?.toFixed(1)} air=${r.stats.airYards?.toFixed(1)}`);
  if ((r.stats.airYards ?? 0) < Number(minDepth) || (r.stats.yac ?? 0) < Number(process.env.MINYAC ?? -99)) continue;
  shown++;
  console.log(lines.join('\n'));
}

/** One play: the kick puller and his target every 0.1 s: puller pos (depth, lat from snap spot toward the pull), vel,
 * role/target/pullIdx, target pos (same frame), target vel, distance; carrier depth. args: seed index */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, idx] = process.argv.slice(2).map(Number);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O');
const k = sim.offense.find((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull' && o.behavior.plan.pullRole === 'kick');
const ps = Math.sign((k.behavior.plan.pullPath?.at(-1)?.y ?? k.pos.y) - k.pos.y) || 1;
const y0 = k.pos.y, tg0 = k.behavior.plan.target;
console.log(`${sim.offCall.run.scheme} kick ${k.slot} target ${tg0?.slot}; path ${k.behavior.plan.pullPath?.map((w: any) => `(${((w.x - sim.los) * dir).toFixed(1)},${((w.y - y0) * ps).toFixed(1)})`).join(' ')}`);
let next = 0;
while (sim.phase === 'live' && sim.t < 3.2) {
  sim.tick();
  if (sim.t + 1e-9 < next) continue; next += 0.1;
  const b: any = k.behavior, tg = b.plan?.target, c = sim.carrier;
  const f = (a: any) => a ? `(${((a.pos.x - sim.los) * dir).toFixed(1)},${((a.pos.y - y0) * ps).toFixed(1)}) v(${(a.vel.x * dir).toFixed(1)},${(a.vel.y * ps).toFixed(1)})` : '-';
  const eng = sim.engagements.filter((e: any) => e.blocker === k || e.defender === tg).map((e: any) => `${e.blocker.slot}>${e.defender.slot}`).join(',');
  console.log(`t ${sim.t.toFixed(2)} ${b.plan?.kind}/${b.plan?.pullRole} idx ${b.pullIdx} cleared ${b.pullCleared ? 1 : 0} log ${k.tags.has("block-log") ? 1 : 0} | K ${f(k)} | tgt ${tg?.slot} ${f(tg)} d ${tg ? Math.hypot(tg.pos.x - k.pos.x, tg.pos.y - k.pos.y).toFixed(1) : '-'} | eng ${eng || '-'} | carrier ${c && c !== sim.qb ? ((c.pos.x - sim.los) * dir).toFixed(1) + ',' + ((c.pos.y - y0) * ps).toFixed(1) : 'qb'}`);
}

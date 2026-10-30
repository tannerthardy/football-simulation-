/** One play: bodies within 2.5 yd of the kick puller every 0.1 s in [from, to]: slot, relative pos (depth, lat toward
 * the pull), velocity, engagement. args: seed idx from to */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const [seed, idx, from, to] = process.argv.slice(2).map(Number);
const p = (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])[idx];
const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
const dir = sim.attackDir('O');
const k = sim.offense.find((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull' && o.behavior.plan.pullRole === 'kick');
const ps = Math.sign((k.behavior.plan.pullPath?.at(-1)?.y ?? k.pos.y) - k.pos.y) || 1;
let next = from;
while (sim.phase === 'live' && sim.t < to) {
  sim.tick();
  if (sim.t + 1e-9 < next) continue; next += 0.1;
  const near = sim.agents.filter((o: any) => o !== k && Math.hypot(o.pos.x - k.pos.x, o.pos.y - k.pos.y) < 2.5).map((o: any) => {
    const e = sim.engagements.find((x: any) => x.blocker === o || x.defender === o || x.helpers?.includes(o));
    return `${o.team}${o.slot} (${((o.pos.x - k.pos.x) * dir).toFixed(1)},${((o.pos.y - k.pos.y) * ps).toFixed(1)}) v(${(o.vel.x * dir).toFixed(1)},${(o.vel.y * ps).toFixed(1)})${e ? ' eng ' + e.blocker.slot + '>' + e.defender.slot : ''}`;
  });
  console.log(`t ${sim.t.toFixed(2)} | ${near.join(' ; ')}`);
}

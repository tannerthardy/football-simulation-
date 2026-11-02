// Counter back on one captured snap: every 0.1 s pos (depth, lat signed to play side from OL centre), designed flag,
// liveAim y, last read 'aim' preferred/selected, followEnded, carrier status. argv: worktree seed index
import { readFileSync } from 'node:fs';
const W = process.argv[2], seed = process.argv[3], idx = Number(process.argv[4]);
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { runReadObservers } = await import(`${W}/src/sim/run-read-observer.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
const sim: any = new PlaySim(restoreSetup(Buffer.from(snaps[idx].setup, 'base64')));
const los = sim.los, r = (v: number) => v.toFixed(2);
const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)); const cy = ol.reduce((s: number, a: any) => s + a.pos.y, 0) / ol.length;
const pulls = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull');
let last: any = {}; const ev: any[] = [];
runReadObservers.set(sim, (e: any) => { last[e.phase] = e; ev.push(e); });
let ps = 0; const tick = sim.tick.bind(sim); let n = 0;
sim.tick = () => { tick(); n++;
  if (!ps && sim.t > 1.0) ps = Math.sign(pulls.reduce((s: number, a: any) => s + a.pos.y, 0) / pulls.length - cy) || 1;
  if (n % 2 === 0 && sim.t <= 3.2 && ps) {
    const c = sim.carrier; if (!c || c === sim.qb) return;
    const b: any = c.behavior; const aim = last.aim; const L = (y: number) => r((y - cy) * ps);
    const kick = pulls.find((p: any) => p.behavior.plan.pullRole === 'kick'), lead = pulls.find((p: any) => p.behavior.plan.pullRole === 'lead');
    console.log(r(sim.t), `car (${r(c.pos.x - los)},${L(c.pos.y)}) v ${r(Math.hypot(c.vel.x,c.vel.y))} fe ${b.followEnded} pe ${b.pressEntry ? `(${r(b.pressEntry.x-los)},${L(b.pressEntry.y)})` : '-'} pref ${aim?.preferred !== undefined ? L(aim.preferred) : '-'} sel ${aim?.selected ? `(${r(aim.selected.x-los)},${L(aim.selected.y)})` : '-'}`,
      `| kick (${r(kick.pos.x-los)},${L(kick.pos.y)}) lead (${r(lead.pos.x-los)},${L(lead.pos.y)})`);
    last = {};
  } };
sim.run();
console.log('event keys', Object.keys(ev[0] ?? {}));

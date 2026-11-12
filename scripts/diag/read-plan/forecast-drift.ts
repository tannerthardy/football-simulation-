/**
 * How far the QB's pictures of his receivers sit from their installed paths (the receiver forecast's classification,
 * receiver-forecast.ts inferProgress): for every picture acquired on the forced-concept panel, the distance to the
 * nearest installed-path segment, whether his motion runs along it (velocity . segment > 0), his speed, the time,
 * and whether inferProgress placed him (within the body radius) or fell back to observed motion. Passive.
 *   node --import tsx scripts/diag/read-plan/forecast-drift.ts [--seeds 1,2] > out/read-plan/forecast-drift.jsonl
 */
import { MENU_CONCEPTS, PASS_BY_ID } from '../../../src/playbook/concepts.js';
import { pathBreak, ReceiverForecast } from '../../../src/sim/receiver-forecast.js';
import { PlaySim } from '../../../src/sim/playsim.js';
import { nativeTraceSetup } from '../command-trace.js';

const arg = (k: string, d: string) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const seeds = arg('--seeds', '1,2').split(',').map(Number);
const concepts = [...Object.values(PASS_BY_ID).filter((c) => !MENU_CONCEPTS.includes(c)), ...MENU_CONCEPTS];
const F: any = ReceiverForecast.prototype, acq = F.acquire;
let rows: any[] = [], simNow: any = null;
F.acquire = function (p: any) {
  const out = acq.call(this, p);
  const prior = this.prior;
  if (prior?.path?.length && simNow) {
    let prev = prior.start, best = Infinity, along = false, idx = -1, beyond = false, k = 0;
    for (const seg of prior.path) {
      const n = seg.p, dx = n.x - prev.x, dy = n.y - prev.y, L2 = dx * dx + dy * dy;
      const u = L2 ? Math.max(0, Math.min(1, ((p.pos.x - prev.x) * dx + (p.pos.y - prev.y) * dy) / L2)) : 0;
      const e = Math.hypot(p.pos.x - prev.x - u * dx, p.pos.y - prev.y - u * dy);
      if (e < best) { best = e; along = p.vel.x * dx + p.vel.y * dy > 0; idx = k; beyond = k === prior.path.length - 1 && u >= 1; }
      prev = n; k++;
    }
    const brk = pathBreak(prior.path, prior.end);
    const phase = beyond ? 'past end' : brk === null ? 'no break' : idx <= brk ? 'stem' : 'after break';
    const est = this.estimate ?? null;
    rows.push({ t: +simNow.t.toFixed(2), phase, off: +best.toFixed(2), along, speed: +Math.hypot(p.vel.x, p.vel.y).toFixed(1), radius: +prior.profile.radius.toFixed(2),
      placed: est ? est.motion === 'installed-route' : null });
  }
  return out;
};
for (const c of concepts) for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4']) for (const seed of seeds) for (const flip of [false, true]) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept: c.id, seed, roster: seed, formation, flip }));
  simNow = sim; rows = [];
  sim.run();
  for (const r of rows) process.stdout.write(JSON.stringify({ concept: c.id, coverage, ...r }) + '\n');
}

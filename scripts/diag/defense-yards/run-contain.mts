// PURSUIT_FIELD on the fixed run set (Defense, 2026-11-12; report only): per run, the ticks on which a coverage player
// (behaviour kind zone or man) pursued a ball carrier he had seen (pursueIfLive's marked chase), and how many of those
// ticks coverage containment changed his request (> 20 deg turn or zeroed), with his distance to the sideline.
// usage: node scripts/ref.mjs --flag PURSUIT_FIELD=1 -- node --import tsx scripts/diag/defense-yards/run-contain.mts 7 9 11 ...
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { containCoverage, isCarrierPursuit } = await import(`${W}/src/sim/coverage-space.ts`);
(PlaySim as any).recordedSingleStream = true;
const seeds = process.argv.slice(2).map(Number);
const ang = (a: any, b: any) => Math.abs(((Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x)) * 180 / Math.PI + 540) % 360 - 180);
const decide0 = (PlaySim.prototype as any).decide;
let ticks = 0, changed = 0, turned = 0, plays = 0, playsWith = 0, playsTurned = 0; const side: number[] = [];
let cur = { any: false, turned: false };
(PlaySim.prototype as any).decide = function (this: any, i: number, t: number) {
  const a = this.agents[i], b = a.behavior;
  if (a.team !== 'D' || !(b?.kind === 'zone' || b?.kind === 'man')) return decide0.call(this, i, t);
  const up = b.update; let out: any = null;
  b.update = (...args: any[]) => (out = up.apply(b, args));
  try { decide0.call(this, i, t); } finally { b.update = up; }
  if (!out || !isCarrierPursuit(out) || Math.hypot(out.vel.x, out.vel.y) < 1) return;
  ticks++; cur.any = true;
  // what coverage containment would make of the same request without the mark (symbol keys dropped): the flag-off
  // request. Run with PURSUIT_FIELD=1 so the pursuit is marked and can be found.
  const c = containCoverage(a, Object.fromEntries(Object.entries(out)) as any).vel, cs = Math.hypot(c.x, c.y);
  if (Math.hypot(c.x - out.vel.x, c.y - out.vel.y) > 1e-9) {
    changed++;
    if (cs < 1 || ang(out.vel, c) > 20) { turned++; cur.turned = true; side.push(Math.min(a.pos.y, 53.33 - a.pos.y)); }
  }
};
for (const seed of seeds) {
  for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
    const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
    cur = { any: false, turned: false };
    try { sim.run(); } catch { continue; }
    plays++; if (cur.any) playsWith++; if (cur.turned) playsTurned++;
  }
}
const md = side.sort((x, y) => x - y)[Math.floor(side.length / 2)];
console.log(`runs ${plays}; with a coverage player pursuing a seen carrier ${playsWith} (${(100 * playsWith / plays).toFixed(0)}%); pursuit ticks ${ticks}; containment changed ${changed} (${(100 * changed / Math.max(1, ticks)).toFixed(1)}%), turned > 20 deg or zeroed ${turned} (${(100 * turned / Math.max(1, ticks)).toFixed(1)}%) on ${playsTurned} runs (${(100 * playsTurned / plays).toFixed(1)}%); sideline distance p50 ${md?.toFixed(1)} yd`);

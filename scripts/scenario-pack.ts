/** Readiness scenario pack report: the six physical interactions, mirrored,
 * with physical invariants (src/lab/scenarios.ts).
 *   node --import tsx scripts/scenario-pack.ts [out.json] */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { approachTackle, redirect, release, seal, sidewaysHit, squeeze } from '../src/lab/scenarios.js';
const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
const out: Record<string, unknown[]> = {};
const log = (name: string, row: Record<string, unknown>) => { (out[name] ??= []).push(row); console.log(name.padEnd(10), Object.entries(row).map(([k, v]) => `${k}=${typeof v === 'number' ? f(v) : Array.isArray(v) ? `[${v.join(',')}]` : v}`).join(' ')); };
for (const side of [1, -1] as const) {
  for (const bearing of [0, 30, 60, 90, 135, 180]) for (const speed of [4, 7]) {
    const r = approachTackle({ side, bearing, speed });
    log('approach', { side, bearing, speed, tackled: r.tackled, time: r.time, afterContact: r.afterContact, wraps: r.wraps, broken: r.broken, missed: r.missed, endDy: r.endDy, momentumErr: r.momentumError, pen: r.maxPenetration, falls: r.falls });
  }
  for (const hitter of [2, 4, 6, 8]) for (const posture of [0.2, 0.8]) {
    const r = sidewaysHit({ side, hitter, posture });
    log('sideways', { side, hitter, posture, fell: r.fell, peak: r.peak, recovered: r.recovered, pushed: r.pushed, speedAfter: r.speedAfter, timeDown: r.timeDown, momentumErr: r.momentumError, pen: r.maxPenetration });
  }
  for (const rusherPower of [0.7, 1, 1.4]) {
    const r = redirect({ side, rusherPower });
    log('redirect', { side, rusherPower, closest: r.closest, carriedPast: r.carriedPast, corner: r.cornerTurned, peakN: r.peakNormal, peakT: r.peakTangent, momentumErr: r.momentumError, pen: r.maxPenetration, falls: r.falls });
  }
  for (const flow of [1.5, 3, 4.5]) {
    const r = seal({ side, flow });
    log('seal', { side, flow, sealedFor: r.sealedFor, progress: r.progress, ended: r.ended, momentumErr: r.momentumError, pen: r.maxPenetration, falls: r.falls });
  }
  for (const endPower of [0.7, 1, 1.4]) {
    const r = squeeze({ side, endPower });
    log('squeeze', { side, endPower, inside: r.inside, drivenBack: r.drivenBack, ended: r.ended, momentumErr: r.momentumError, pen: r.maxPenetration, falls: r.falls });
  }
}
for (const seed of [3, 5, 7, 9, 11]) {
  const r = release({ seed });
  log('release', { seed, jammed: r.jammed, depth: r.depth, rerouted: r.rerouted, momentumErr: r.momentumError, pen: r.maxPenetration, falls: r.falls });
}
const path = process.argv[2];
if (path) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(out, null, 2) + '\n'); console.log(`Saved ${path}`); }

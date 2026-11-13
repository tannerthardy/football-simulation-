/** Do scenario outcomes converge as the physics substep is refined? (development aid) */
import { approachTackle, redirect, sidewaysHit } from '../../src/lab/scenarios.js';
const f = (x: number) => x.toFixed(3);
for (const [bearing, speed] of [[0, 4], [0, 7], [60, 4], [90, 4], [180, 4]]) {
  const rows = [6, 12, 24, 48].map((n) => { const r = approachTackle({ bearing, speed, substeps: n }); return `${n}:${r.tackled ? 'T' : '-'} t${f(r.time)} end(${f(r.endX)},${f(r.endDy)})`; });
  console.log(`approach b${bearing} v${speed}  ${rows.join('  ')}`);
}
for (const hitter of [4, 6]) {
  const rows = [6, 12, 24, 48].map((n) => { const r = sidewaysHit({ hitter, substeps: n }); return `${n}:peak${f(r.peak)} pushed${f(r.pushed)}`; });
  console.log(`sideways h${hitter}  ${rows.join('  ')}`);
}
const rows = [6, 12, 24, 48].map((n) => { const r = redirect({ substeps: n }); return `${n}:closest${f(r.closest)} past${f(r.carriedPast)}`; });
console.log(`redirect  ${rows.join('  ')}`);

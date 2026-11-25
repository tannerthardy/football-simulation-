/** The seam read (seam_read, key 'middle'; Flex, 2026-11-25, Integration item 3 of the route-read audit): staged only. At
 * the receiver's read, what he answered on where the roof men stand, the roof men's motion in his picture, and what the
 * same rule answers on his picture carried 0.5 s ahead (a what-if, not built). usage: node --import tsx scripts/diag/routes/seam-read-stage.mts */
import { sceneSim } from '../../../src/lab/coverage-scene.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
import { ROUTES } from '../../../src/playbook/routes.js';
import { readRoute } from '../../../src/sim/route-read.js';
import { FIELD_WIDTH } from '../../../src/core/field.js';
type Pic = { id: string; pos: { x: number; y: number }; vel: { x: number; y: number }; age: number };
type Dec = { at: number; choice: { answer: string; reason: string; keys: readonly string[] }; pictures: readonly Pic[] };
const mid = FIELD_WIDTH / 2;
console.log('| formation | runner | coverage | n | answer now (post/under/base) | answer 0.5 s ahead | changed | roof men toward middle >1.5 yd/s | roof men bailing (vx > 3) |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const n of [2] as const) for (const coverage of ['cover2', 'cover4', 'cover6', 'tampa2', 'cover2_invert', 'cover3', 'cover3_buzz', 'cover9', 'cover1']) {
  const now = { post: 0, under: 0, base: 0 } as Record<string, number>, ahead = { post: 0, under: 0, base: 0 } as Record<string, number>;
  let cnt = 0, changed = 0, rot = 0, bail = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const sim = sceneSim({ formation, coverage, strong: { [n]: 'seam_read' }, seed, until: 3 });
    const step = sim as unknown as { tick(): void };
    const R = sim.offense.find((o) => (sim.offAlign.refOf as Record<string, string | undefined>)[o.slot] === `S${n}`);
    if (!R) continue;
    let dec: Dec | null = null, pos = { x: 0, y: 0 };
    while (sim.phase === 'live' && sim.t < 3 && !dec) { step.tick(); const b = R.behavior as unknown as { routeDecision?: Dec | null }; if (b instanceof RouteRunner && b.routeDecision) { dec = b.routeDecision; pos = { ...R.pos }; } }
    if (!dec) continue;
    const b = R.behavior as unknown as { start: { x: number; y: number }; outside: number };
    const ctx = { start: b.start, pos, los: sim.los, middleY: mid, outside: b.outside };
    const proj = dec.pictures.map((p) => ({ ...p, pos: { x: p.pos.x + p.vel.x * 0.5, y: p.pos.y + p.vel.y * 0.5 } }));
    const a2 = readRoute(ROUTES.seam_read.read!, ctx, proj).answer;
    cnt++; now[dec.choice.answer]++; ahead[a2]++; if (a2 !== dec.choice.answer) changed++;
    const roof = dec.pictures.filter((p) => p.pos.x > sim.los + 11 && Math.abs(p.pos.y - mid) < FIELD_WIDTH / 4 + 2);
    rot += roof.filter((p) => -Math.sign(p.pos.y - mid) * p.vel.y > 1.5).length; bail += roof.filter((p) => p.vel.x > 3).length;
  }
  const f = (o: Record<string, number>) => `${o.post}/${o.under}/${o.base}`;
  if (cnt) console.log(`| ${formation} | S${n} | ${coverage} | ${cnt} | ${f(now)} | ${f(ahead)} | ${changed} | ${rot} | ${bail} |`);
}

/** The 'underneath' route read (stick, hook; Flex, 2026-11-24, Integration via Rules' staging): staged in gun_trips_11, the read
 * route on each strong receiver in turn, 12 seeds per coverage. Per cell: how often he takes 'away' and the key's seen speed and
 * its velocity relative to his own at the read (medians), and the reason. Taught: sit against zone, work away from a man.
 * usage: [UNDERNEATH_MOVE=1] node --import tsx scripts/diag/routes/underneath-read-stage.mts */
import { sceneSim } from '../../../src/lab/coverage-scene.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
type Dec = { choice: { answer: string; reason: string; keys: readonly string[] }; pictures: readonly { id: string; pos: { x: number; y: number }; vel: { x: number; y: number } }[] };
const med = (a: number[]) => { const b = a.filter(Number.isFinite).sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)].toFixed(2) : '-'; };
console.log('| route | runner | coverage | away | sit (base) | reasons | key speed | key vs him (yd/s) | key depth past him | key outside him | key vx | key closing laterally |');
console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
for (const route of ['stick', 'hook']) for (const n of [1, 2, 3] as const) for (const coverage of ['cover2', 'cover4', 'cover3', 'cover1', 'cover0']) {
  let away = 0, base = 0; const reasons = new Map<string, number>(); const ks: number[] = [], rel: number[] = [], kdx: number[] = [], kdy: number[] = [], kvx: number[] = [], kvy: number[] = [];
  for (let seed = 1; seed <= 12; seed++) {
    const sim = sceneSim({ formation: 'gun_trips_11', coverage, strong: { [n]: route }, seed, until: 3 });
    const step = sim as unknown as { tick(): void };
    const R = sim.offense.find((o) => (sim.offAlign.refOf as Record<string, string | undefined>)[o.slot] === `S${n}`);
    if (!R) continue;
    let dec: Dec | null = null, vAt = { x: 0, y: 0 }, pAt = { x: 0, y: 0 };
    while (sim.phase === 'live' && sim.t < 3 && !dec) {
      step.tick();
      const b = R.behavior as unknown as { routeDecision?: Dec | null };
      if (b instanceof RouteRunner && b.routeDecision) { dec = b.routeDecision; vAt = { ...R.vel }; pAt = { ...R.pos }; }
    }
    if (!dec) continue;
    if (dec.choice.answer === 'away') away++; else base++;
    reasons.set(dec.choice.reason, (reasons.get(dec.choice.reason) ?? 0) + 1);
    const key = dec.pictures.find((p) => p.id === dec!.choice.keys[0]);
    if (key) { ks.push(Math.hypot(key.vel.x, key.vel.y)); rel.push(Math.hypot(key.vel.x - vAt.x, key.vel.y - vAt.y)); const side = Math.sign(pAt.y - sim.ballY) || 1; kdx.push(key.pos.x - pAt.x); kdy.push((key.pos.y - pAt.y) * side); kvx.push(key.vel.x); kvy.push(-Math.sign(key.pos.y - pAt.y) * key.vel.y); }
  }
  if (away + base) console.log(`| ${route} | S${n} | ${coverage} | ${away} | ${base} | ${[...reasons].map(([k, v]) => `${k} ${v}`).join(', ')} | ${med(ks)} | ${med(rel)} | ${med(kdx)} | ${med(kdy)} | ${med(kvx)} | ${med(kvy)} |`);
}

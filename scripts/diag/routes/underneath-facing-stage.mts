/** What the receiver's own picture shows of his underneath key's eyes and hips at the read (Flex, 2026-11-25): seen head and
 * body facing (delayed, as recorded), as angles off the line from the key to him and to the passer. Truth column: the key's
 * actual behavior class, for validation only. usage: node --import tsx scripts/diag/routes/underneath-facing-stage.mts */
import { sceneSim } from '../../../src/lab/coverage-scene.js';
import { RouteRunner } from '../../../src/sim/behaviors/receiver.js';
type Dec = { choice: { answer: string; reason: string; keys: readonly string[] } };
const ang = (a: number) => Math.abs(Math.atan2(Math.sin(a), Math.cos(a))) * 180 / Math.PI;
const med = (a: number[]) => { const b = a.filter(Number.isFinite).sort((p, q) => p - q); return b.length ? b[Math.floor(b.length / 2)].toFixed(0) : '-'; };
console.log('| route | runner | coverage | n | head off him | head off QB | head nearer him | hips off him | hips off QB | key truly man |');
console.log('|---|---|---|---|---|---|---|---|---|---|');
for (const route of ['stick']) for (const n of [1, 2, 3] as const) for (const coverage of ['cover2', 'cover4', 'cover3', 'cover1', 'cover0']) {
  const hR: number[] = [], hQ: number[] = [], fR: number[] = [], fQ: number[] = []; let nearer = 0, cnt = 0, man = 0;
  for (let seed = 1; seed <= 12; seed++) {
    const sim = sceneSim({ formation: 'gun_trips_11', coverage, strong: { [n]: route }, seed, until: 3 });
    const step = sim as unknown as { tick(): void };
    const R = sim.offense.find((o) => (sim.offAlign.refOf as Record<string, string | undefined>)[o.slot] === `S${n}`);
    if (!R) continue;
    let dec: Dec | null = null;
    while (sim.phase === 'live' && sim.t < 3 && !dec) { step.tick(); const b = R.behavior as unknown as { routeDecision?: Dec | null }; if (b instanceof RouteRunner && b.routeDecision) dec = b.routeDecision; }
    const id = dec?.choice.keys[0]; const K = id ? sim.defense.find((d) => d.player.id === id) : undefined;
    if (!K) continue;
    const p = sim.see(R, K), q = sim.see(R, sim.qb);
    const toR = Math.atan2(R.pos.y - p.pos.y, R.pos.x - p.pos.x), toQ = Math.atan2(q.pos.y - p.pos.y, q.pos.x - p.pos.x);
    const head = p.head ?? p.facing;
    hR.push(ang(head - toR)); hQ.push(ang(head - toQ)); fR.push(ang(p.facing - toR)); fQ.push(ang(p.facing - toQ));
    if (ang(head - toR) < ang(head - toQ)) nearer++;
    cnt++; if (/Man/.test(K.behavior?.constructor?.name ?? '')) man++;
  }
  if (cnt) console.log(`| ${route} | S${n} | ${coverage} | ${cnt} | ${med(hR)} | ${med(hQ)} | ${nearer} | ${med(fR)} | ${med(fQ)} | ${man} |`);
}

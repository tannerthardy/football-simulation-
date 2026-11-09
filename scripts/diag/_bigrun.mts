/** Runs of 20+ yd: every defender who comes within 3 yd of the carrier after the carrier is 2 yd past the LOS. At his
 * closest approach: distance, his downfield offset from the carrier (+ = in front of him, the side the carrier runs to),
 * lateral offset, closing speed, his speed vs the carrier's, behavior kind, and tackle events he was in (attempt/missed/
 * broken). Prints per-run lines and an aggregate by failure kind. usage: <capDir> <minYards> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, minY, ...seeds] = process.argv.slice(2); const K = new Map<string, number>(); let runs = 0;
for (const seed of seeds) (JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]).forEach((p, idx) => {
  if (p.pass) return;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const d2 = sim.attackDir(sim.offense[0].team); const best = new Map<any, any>(); const ev = new Map<any, Set<string>>(); const brk: string[] = []; const grip = new Map<any, any>(); const C2: Record<string, number> = (globalThis as any).__C2 ??= {};
  const e0 = sim.event.bind(sim); sim.event = (type: string, a: any, b: any, note?: string) => {
    if (/tackle/.test(type)) for (const x of [a, b]) if (x && x.team !== sim.offense[0].team) { (ev.get(x) ?? ev.set(x, new Set()).get(x)!).add(type); if (type === 'broken_tackle' && /CB|FS|SS|NB/.test(x.slot)) { const g = grip.get(x); const o = g?.origin || '?'; C2[o] = (C2[o] ?? 0) + 1; brk.push(`${x.slot}@${sim.t.toFixed(2)}s +${((sim.carrier?.pos.x - sim.los) * d2).toFixed(1)}yd origin=${o} hold0=${g?.hold0?.toFixed(2)} reach=${g?.reach?.toFixed(2)} legs=${g?.legs?.toFixed(2)} wrapAt=${g?.t?.toFixed(2)}`); } }
    return e0(type, a, b, note); };
  const t0 = sim.tick.bind(sim);
  sim.tick = () => { t0(); for (const j of sim.world.joints ?? []) if (j.kind === 'grasp' && !j.broken) { const ag = sim.defense.find((x: any) => x.body === j.a); if (ag && (!grip.has(ag) || grip.get(ag).j !== j)) grip.set(ag, { j, origin: j.origin, hold0: j.hold, reach: j.reach, legs: j.legs, t: sim.t }); }
    const c = sim.carrier; if (!c || c === sim.qb || c.team !== sim.offense[0].team) return;
    if ((c.pos.x - sim.los) * d2 < 2) return;
    for (const d of sim.defense) { const dx = d.pos.x - c.pos.x, dy = d.pos.y - c.pos.y, dist = Math.hypot(dx, dy); if (dist > 3) continue;
      const b = best.get(d); if (b && b.dist <= dist) continue;
      const ux = dx / dist, uy = dy / dist, closing = -((d.vel.x - c.vel.x) * ux + (d.vel.y - c.vel.y) * uy);
      const rq = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 }, rs = Math.hypot(rq.x, rq.y), toC = rs > 1e-6 ? -(rq.x * ux + rq.y * uy) / rs : 0;
      best.set(d, { rs, toC, rtag: [...(d.tags ?? [])].slice(-3).join('+'), dist, ahead: dx * d2, lat: Math.abs(dy), closing, dsp: Math.hypot(d.vel.x, d.vel.y), csp: Math.hypot(c.vel.x, c.vel.y), beh: d.behavior?.kind, slot: d.slot, eng: d.engagement ? (d.engagement.blocker?.slot ?? 'yes') : '', down: d.isDown?.(sim.t) ?? false, bond: !!sim.bond, tags: [...(d.tags ?? [])].filter((x: string) => /gather|close|stalk|block|cushion|pursu|alley|force|fit|contain|leverage|break/.test(x)).join('+'), t: sim.t, cx: (c.pos.x - sim.los) * d2 }); } };
  sim.run(); const y = sim.result?.yards ?? sim.stats?.yards ?? ((sim.endSpot?.x ?? sim.los) - sim.los) * d2;
  if (!(y >= +minY)) return; runs++;
  const parts: string[] = [];
  for (const [d, b] of best) { const e = ev.get(d) ?? new Set();
    const why = b.dist < 1.0 && !e.size ? (b.down ? 'down' : b.eng ? 'blocked-by-' + (/^(X|Y|Z|F|H|TE)/.test(b.eng) ? 'receiver' : /RB|FB/.test(b.eng) ? 'back' : 'OL') : b.bond ? 'bond-already' : `free ${b.beh}`) : '';
    if (why) K.set(`  touch-no-attempt why ${why}`, (K.get(`  touch-no-attempt why ${why}`) ?? 0) + 1);
    const kind = e.has('missed_tackle') ? 'missed' : e.has('broken_tackle') ? 'broken' : b.dist < 1.0 ? 'touch-no-attempt' : b.ahead < -0.5 ? 'from-behind' : b.ahead > 0.5 && b.closing < 0.5 ? 'in-front-not-closing' : 'beside';
    K.set(kind, (K.get(kind) ?? 0) + 1); K.set(`${kind} ${/CB|FS|SS|NB/.test(b.slot) ? 'DB' : /LB/.test(b.slot) ? 'LB' : 'DL'}`, (K.get(`${kind} ${/CB|FS|SS|NB/.test(b.slot) ? 'DB' : /LB/.test(b.slot) ? 'LB' : 'DL'}`) ?? 0) + 1);
    parts.push(`${b.slot}:${kind} d${b.dist.toFixed(1)} at+${b.cx.toFixed(0)} ahead${b.ahead.toFixed(1)} close${b.closing.toFixed(1)} sp${b.dsp.toFixed(1)}/${b.csp.toFixed(1)} beh=${b.beh} eng=${b.eng || '-'} req${b.rs.toFixed(1)} toC${b.toC.toFixed(2)} last=${b.rtag}`); }
  if (brk.length) console.log(`BREAK s${seed}-${idx} ${y.toFixed(1)} yd: ${brk.join('; ')}`);
  console.log(`s${seed}-${idx} ${y.toFixed(1)} yd ${p.call.slice(0, 40)} | ${parts.join(' | ') || 'nobody within 3 yd'}`);
});
console.log(`runs ${runs}`); console.log('DB break origins:', JSON.stringify((globalThis as any).__C2 ?? {})); for (const [k, v] of [...K].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);

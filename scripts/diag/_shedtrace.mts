/** Blocked defenders the carrier passes (Defense). Event: first tick the carrier (not the QB) is within 3.0 yd of an
 * engaged defender. Over the next 1.0 s: did he try to shed (tag shed-attempt), did the engagement end, did he reach
 * the carrier (< 1.0 yd centre), and was he ever in arm's reach while still engaged (centre < 1.5 yd).
 * usage: <capDir> <seed>...   (copy into scripts/diag/; pasted by Defense 2026-11-05) */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2);
const C: Record<string, Record<string, number>> = {};
const bump = (g: string, k: string) => { (C[g] ??= {})[k] = (C[g][k] ?? 0) + 1; };
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup);
  const watch = new Map<any, any>();
  const t0 = sim.tick.bind(sim);
  sim.tick = () => {
    t0(); const c = sim.carrier; if (!c || c === sim.qb) return;
    for (const d of sim.defense) {
      const dist = Math.hypot(d.pos.x - c.pos.x, d.pos.y - c.pos.y);
      const w = watch.get(d);
      if (!w && d.engagement && dist < 3.0) watch.set(d, { t: sim.t, blocker: d.engagement.blocker.slot, attempt: false, freed: false, reach: false, armReach: false, kind: d.runFit?.kind ?? '-' });
      else if (w && sim.t <= w.t + 1.0) {
        if (d.tags.has('shed-attempt')) w.attempt = true;
        if (!d.engagement && !w.freed) { w.freed = true; const rs = Math.hypot(c.vel.x, c.vel.y) || 1;
          w.rel = { dist, past: ((d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y) / rs < 0, cs: rs, t: sim.t - w.t, v0: Math.hypot(d.vel.x, d.vel.y),
            wrong: (() => { const ux = c.pos.x - d.pos.x, uy = c.pos.y - d.pos.y; return Math.hypot(d.vel.x, d.vel.y) > .3 ? (d.vel.x * ux + d.vel.y * uy) < 0 : undefined; })(),
            vdir: Math.hypot(d.vel.x, d.vel.y) > .3 ? Math.atan2(d.vel.y, d.vel.x) : undefined }; }
        if (w.freed && !w.after && sim.t >= w.t + (w.rel?.t ?? 0) + 0.3) { const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
          const iv = sim.intents[d.idx]?.vel ?? { x: 0, y: 0 };
          w.after = { speed: Math.hypot(d.vel.x, d.vel.y), close: ((d.vel.x - c.vel.x) * dx + (d.vel.y - c.vel.y) * dy) / dd, beh: d.behavior?.constructor?.name,
            req: Math.hypot(iv.x, iv.y), reqClose: (iv.x * dx + iv.y * dy) / dd, vmax: d.profile.vmax * (d.speedScale ?? 1),
            turn: (() => { const a0 = w.rel?.vdir; if (!a0 || Math.hypot(iv.x, iv.y) < .1) return NaN; return Math.abs(((Math.atan2(iv.y, iv.x) - a0 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI; })(),
            touch: sim.offense.some((o: any) => o !== c && Math.hypot(o.pos.x - d.pos.x, o.pos.y - d.pos.y) < (o.profile.radius + d.profile.radius + 0.15)),
            reeng: !!d.engagement }; }
        if (dist < 1.0) w.reach = true;
        if (d.engagement && dist < 1.5) w.armReach = true;
      }
    }
  };
  sim.run();
  for (const [d, w] of watch) {
    const g = ['DE_S', 'DE_W', 'DT_S', 'DT_W', 'NT'].includes(d.slot) ? 'DL' : d.slot.startsWith('LB') ? 'LB' : 'DB';
    if (w.freed && !w.reach && w.rel) ((globalThis as any).FR ??= []).push({ g, seed, call: p.call, slot: d.slot, t0: w.t, ...w.rel, ...(w.after ?? {}) });
    const cls = w.reach ? 'made the play' : !w.attempt ? 'never tried to shed' : !w.freed ? 'tried, still held' : 'got free, did not reach';
    for (const k of [g, `${g} ${w.kind}`]) { bump(k, cls); bump(k, 'n'); if (w.armReach && !w.reach) bump(k, 'in arm reach while engaged, no play'); }
  }
}
for (const [g, c] of Object.entries(C).sort()) { const n = c.n; if (n < 40) continue;
  console.log(g.padEnd(16), 'n', String(n).padStart(4), '|', ['made the play', 'never tried to shed', 'tried, still held', 'got free, did not reach', 'in arm reach while engaged, no play'].map(k => `${k} ${(100 * (c[k] ?? 0) / n).toFixed(0)}%`).join(' | ')); }
const F: any[] = (globalThis as any).FR ?? []; const qq = (v: number[], f = .5) => { const z = [...v].sort((a, b) => a - b); return z.length ? z[Math.floor(f * (z.length - 1))] : NaN; };
for (const g of ['DL', 'LB', 'DB']) { const R = F.filter(x => x.g === g && x.speed !== undefined); const sp = (f: (x: any) => boolean) => { const z = R.filter(f); return `${qq(z.map(x => x.speed)).toFixed(1)} (n ${z.length})`; };
  console.log(`split ${g}: touching ${sp(x => x.touch)} | free body, turn<=90 ${sp(x => !x.touch && x.turn <= 90)} | free body, turn>90 ${sp(x => !x.touch && x.turn > 90)}`); }
import('node:fs').then(fs => fs.writeFileSync('out/freed-rows.json', JSON.stringify(F)));

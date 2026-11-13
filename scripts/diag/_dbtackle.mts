/** Open-field DB tackle attempts on runs (carrier >= 3 yd past the LOS): at each attempt (missed_tackle or tackle_wrap by
 * a DB), his speed, closing speed on the carrier, approach angle (cosA: +1 head-on, -1 from behind), carrier speed, his
 * 'close-gather' state, and the outcome: missed / wrapped then broken / wrapped and held to the tackle. usage: <capDir> <seed>... */
import { readFileSync } from 'node:fs';
import { PlaySim, type PlaySetup } from '../../src/sim/playsim.js';
import { restoreSetup } from './saved-play.js';
(PlaySim as any).recordedSingleStream = true;
const [dir, ...seeds] = process.argv.slice(2); const R: any[] = [];
const DB = /^(CB|FS|SS|NB|S)/;
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`${dir}/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')) as PlaySetup); const d2 = sim.attackDir(sim.offense[0].team);
  const rows: any[] = []; const hist: any[] = []; const ev0 = sim.event.bind(sim);
  const tk0 = sim.tick.bind(sim); sim.tick = () => { tk0(); const c = sim.carrier; if (c) hist.push({ t: sim.t, c: { x: c.pos.x, y: c.pos.y, vx: c.vel.x, vy: c.vel.y }, d: new Map(sim.defense.filter((d: any) => DB.test(d.slot)).map((d: any) => [d, { x: d.pos.x, y: d.pos.y, sp: Math.hypot(d.vel.x, d.vel.y), g: d.tags.has('close-gather') }])) }); if (hist.length > 40) hist.shift(); };
  sim.event = (type: string, a: any, b: any, note?: string) => {
    if ((type === 'missed_tackle' || type === 'tackle_wrap') && a && b && DB.test(a.slot) && a.team !== b.team) {
      const dx = b.pos.x - a.pos.x, dy = b.pos.y - a.pos.y, dd = Math.hypot(dx, dy) || 1, nx = dx / dd, ny = dy / dd, cs = Math.hypot(b.vel.x, b.vel.y);
      const cosA = cs > .5 ? -((b.vel.x / cs) * nx + (b.vel.y / cs) * ny) : 0;
      const depth = (b.pos.x - sim.los) * d2;
      const h = hist.find((x: any) => Math.abs(x.t - (sim.t - .5)) < .03); const pd = h?.d.get(a); let ahead = NaN, sp5 = NaN, g5 = false, dist5 = NaN;
      if (h && pd) { const cs5 = Math.hypot(h.c.vx, h.c.vy) || 1; ahead = ((pd.x - h.c.x) * h.c.vx + (pd.y - h.c.y) * h.c.vy) / cs5; sp5 = pd.sp; g5 = pd.g; dist5 = Math.hypot(pd.x - h.c.x, pd.y - h.c.y); }
      if (depth >= 3) rows.push({ ahead, sp5, g5, dist5, t: sim.t, type, note, d: a, slot: a.slot, sp: Math.hypot(a.vel.x, a.vel.y), close: (a.vel.x - b.vel.x) * nx + (a.vel.y - b.vel.y) * ny, cosA, cs, depth, gather: a.tags?.has?.('close-gather') ?? false });
    }
    if (type === 'broken_tackle' && b) for (const r of rows) if (r.d === b && r.type === 'tackle_wrap' && !r.broken) r.broken = true;
    return ev0(type, a, b, note);
  };
  const res = sim.run();
  for (const r of rows) R.push({ ...r, d: undefined, out: r.type === 'missed_tackle' ? 'missed' : r.broken ? 'broken' : 'held' });
}
const q = (v: number[]) => { const z = v.filter(Number.isFinite).sort((a, b) => a - b); return z.length ? z[Math.floor((z.length - 1) / 2)].toFixed(2) : '-'; };
console.log(`DB open-field attempts n ${R.length}: ${['missed', 'broken', 'held'].map(o => `${o} ${(100 * R.filter(r => r.out === o).length / R.length).toFixed(0)}%`).join(' ')}`);
for (const o of ['missed', 'broken', 'held']) { const S = R.filter(r => r.out === o); if (!S.length) continue;
  console.log(`  ${o.padEnd(7)} n ${String(S.length).padStart(4)} | DB speed ${q(S.map(r => r.sp))} (>6.5: ${(100 * S.filter(r => r.sp > 6.5).length / S.length).toFixed(0)}%) | closing ${q(S.map(r => r.close))} | cosA ${q(S.map(r => r.cosA))} (from behind <0: ${(100 * S.filter(r => r.cosA < 0).length / S.length).toFixed(0)}%) | carrier speed ${q(S.map(r => r.cs))} | depth ${q(S.map(r => r.depth))} | 0.5 s before: DB ahead of carrier along his run ${(100 * S.filter(r => r.ahead > 0).length / S.length).toFixed(0)}% (by ${q(S.map(r => r.ahead))} yd), dist ${q(S.map(r => r.dist5))}, DB speed ${q(S.map(r => r.sp5))}, gathering ${(100 * S.filter(r => r.g5).length / S.length).toFixed(0)}% | wrap kind ${JSON.stringify(S.reduce((m: any, r) => (m[r.note ?? '-'] = (m[r.note ?? '-'] ?? 0) + 1, m), {}))}`); }

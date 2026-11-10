// Grasps on the carrier over the fixed 1,321 runs, by approach at formation (front / side / behind: the holder's
// bearing from the runner against his travel, 45 deg cones), with the lock at formation, how many break (slide past
// reach), and the median hold age at the end. One arm per process. usage: node --import tsx .../hold-breaks.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const tick = sim.tick.bind(sim); const seen = new Map<any, any>();
  sim.tick = () => { tick(); const c = sim.carrier, w = sim.world; if (!c || !w) return;
    for (const j of w.joints) if (j.kind === 'grasp' && j.b === c.body && !seen.has(j)) {
      const sp = Math.hypot(c.vel.x, c.vel.y), rx = j.a.pos.x - c.pos.x, ry = j.a.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
      const cos = sp > 0.5 ? (rx * c.vel.x + ry * c.vel.y) / (rd * sp) : 1;
      seen.set(j, { from: cos > Math.SQRT1_2 ? 'front' : cos < -Math.SQRT1_2 ? 'behind' : 'side', lock: j.lock ?? NaN, t0: sim.t, broken: false, end: sim.t }); }
    for (const [j, r] of seen) { if (j.broken) r.broken = true; if (w.joints.includes(j)) r.end = sim.t; } };
  sim.run(); for (const r of seen.values()) rows.push(r);
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
for (const from of ['front', 'side', 'behind', 'all']) { const r = rows.filter(x => from === 'all' || x.from === from);
  console.log(`${from.padEnd(6)} ${String(r.length).padStart(5)} holds, lock at formation ${med(r.map(x => x.lock)).toFixed(2)}, broken ${r.filter(x => x.broken).length} (${(100 * r.filter(x => x.broken).length / Math.max(1, r.length)).toFixed(1)}%), age at end ${med(r.map(x => x.end - x.t0)).toFixed(2)} s`); }

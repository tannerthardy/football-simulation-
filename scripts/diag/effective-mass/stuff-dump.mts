// Per-play contact facts for paired stuff analysis (Integration, 2026-11-10): one JSON line per run on the fixed run
// set, for one arm (settings at load). Fields: id, yards; first contact (first defender within 1.0 yd of the carrier
// after the handoff): its x from the LOS (+ = downfield), the hitter's lateral offset from the runner's path, front /
// side / behind, blocked (offensive player within 1.2 yd of the hitter), the line of centres' turn by +0.3 s; the
// runner's speed along his path at +0.3 / +0.6 s; the runner's yards gained from first contact to the end; when a
// second defender comes within 1.0 yd (s after contact, or null); whether the runner is down within 0.6 s; how the
// play ended (the outcome). usage: node --import tsx scripts/diag/effective-mass/stuff-dump.mts > out.jsonl
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
for (let seed = 7; seed <= 29; seed += 2) for (const [i, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); const up = sim.attackDir('O'); const tick = sim.tick.bind(sim);
  let c0: any = null, t0 = -1, hit: any = null, path = 0, a0 = 0, x0 = 0; const o: any = { id: `s${seed}-${i}` };
  sim.tick = () => { tick(); const c = sim.carrier; if (!c || sim.handoffAt < 0) return;
    if (t0 < 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0); if (!d) return;
      t0 = sim.t; hit = d; c0 = c; const sp = Math.hypot(c.vel.x, c.vel.y) || 1, ux = c.vel.x / sp, uy = c.vel.y / sp; path = Math.atan2(uy, ux);
      const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1, cos = (rx * ux + ry * uy) / rd;
      Object.assign(o, { cx: (c.pos.x - sim.los) * up, offset: Math.abs(-rx * uy + ry * ux), approach: cos > Math.SQRT1_2 ? 'front' : cos < -Math.SQRT1_2 ? 'behind' : 'side',
        blocked: sim.offense.some((q: any) => q !== c && Math.hypot(q.pos.x - d.pos.x, q.pos.y - d.pos.y) <= 1.2), speed0: sp, second: null, down06: false });
      a0 = Math.atan2(ry, rx); x0 = c.pos.x; return; }
    if (c !== c0) return; const s = sim.t - t0, ux = Math.cos(path), uy = Math.sin(path);
    if (Math.abs(s - 0.3) < 0.026) { o.v3 = c.vel.x * ux + c.vel.y * uy; const a = Math.atan2(hit.pos.y - c.pos.y, hit.pos.x - c.pos.x); o.turn = Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI; }
    if (Math.abs(s - 0.6) < 0.026) o.v6 = c.vel.x * ux + c.vel.y * uy;
    if (o.second === null && sim.defense.some((a: any) => a !== hit && Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0)) o.second = +s.toFixed(2);
    if (s <= 0.6 && c.body.support?.state !== 'up') o.down06 = true; };
  const r = sim.run();
  o.yards = +r.yards.toFixed(2); o.outcome = r.outcome; if (t0 >= 0 && c0) o.afterContact = +((c0.pos.x - x0) * up).toFixed(2);
  console.log(JSON.stringify(o));
}

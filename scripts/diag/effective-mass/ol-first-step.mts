// OZ first step (Integration, 2026-11-10): does the OL ask for lateral pace from the stance and not get it, or not ask?
// Fixed OZ runs, one arm per process. Per OL and tick from the snap to 0.5 s: the requested velocity's component toward
// the play side (intent vel), the achieved velocity's component, and his ground force against its traction limit and the
// share of his push budget (World), with support state. Play side: the sign of the OL's mean lateral motion over 1.0 s.
// Prints medians per tick. usage: node --import tsx scripts/diag/effective-mass/ol-first-step.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { supportParams } = await import(`${W}/src/physics/support.ts`);
const OL = ['LT', 'LG', 'C', 'RG', 'RT'], OZ = new Set(['outsideZone', 'wideZone']);
const rows: any[][] = Array.from({ length: 11 }, () => []);
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!OZ.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const ol = OL.map(s => sim.offense.find((a: any) => a.slot === s)).filter(Boolean); if (ol.length !== 5) continue;
  const y0 = ol.map((a: any) => a.pos.y); const per: any[] = []; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const k = Math.round(sim.t / sim.dt); if (k < 1 || k > 20) return; const rep = sim.lastStep, dt = sim.dt;
    for (const a of ol) { const it = sim.intents?.[a.idx]; const lim = rep?.groundImpulseLimit?.[a.idx] / dt, g = rep?.groundImpulse?.[a.idx];
      per.push({ k, a, req: it?.vel?.y ?? NaN, reqx: it?.vel?.x ?? NaN, vy: a.vel.y, vx: a.vel.x, gy: g ? g.y / dt : NaN, gm: g ? Math.hypot(g.x, g.y) / dt : NaN, lim, push: supportParams(a.profile).pushForce, up: a.body.support?.state === 'up' }); } };
  sim.run();
  const ps = Math.sign(ol.reduce((s: number, a: any, i: number) => s + 0, 0) || 1);
  const at10 = per.filter(r => r.k === 20); // 1.0 s
  const sgn = Math.sign(at10.reduce((s, r) => s + (r.a.pos.y - y0[ol.indexOf(r.a)]), 0)) || ps;
  for (const r of per) if (r.k <= 10) rows[r.k].push({ req: r.req * sgn, reqfwd: r.reqx, v: r.vy * sgn, gy: r.gy * sgn / r.lim, gm: r.gm / r.lim, pushShare: r.gm / r.push, up: r.up });
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
console.log('tick   n   requested lateral (yd/s)  achieved lateral  | ground force: lateral share / total share of traction limit, total / push budget | up');
for (const [k, r] of rows.entries()) if (r.length) console.log(`+${(k * 0.05).toFixed(2)} ${String(r.length).padStart(4)}  ${med(r.map(x => x.req)).toFixed(2).padStart(6)}  ${med(r.map(x => x.v)).toFixed(2).padStart(15)}  | ${med(r.map(x => x.gy)).toFixed(2)} / ${med(r.map(x => x.gm)).toFixed(2)}, ${med(r.map(x => x.pushShare)).toFixed(2)} | ${(100 * r.filter(x => x.up).length / r.length).toFixed(0)}%`);

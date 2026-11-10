// The first 0.3 s of a front-on hold (Integration, 2026-11-10): what limits the turn once the lock is gone and the
// finish is in. Fixed zone runs (as dump-zone.mts), one arm per process (settings at load). For each run, the first grasp
// on the carrier by a defender within 45 deg ahead of his travel; at each tick from the grasp to +0.3 s:
//   cap      the grasp's capacity (jt.capacity), in g of the runner's weight
//   tension  the force it transmits this tick (jt.force, already a force after the step), in g
//   legs, h  leg share and hold height (share of the runner's stature; NaN = World default)
//   hip      the runner's hip budget used bracing (World hipUsed)
//   turn     the line of centres' turn since the grasp (deg); v the runner's speed along his travel at the grasp
// Prints medians per tick. usage: node --import tsx scripts/diag/effective-mass/hold-onset.mts
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const G = 10.72, ZONE = new Set(['outsideZone', 'wideZone', 'insideZone']);
const rows: any[][] = Array.from({ length: 7 }, () => []);
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!ZONE.has(st.offCall?.run?.scheme)) continue;
  const sim: any = new PlaySim(st); const tick = sim.tick.bind(sim);
  let jt: any = null, t0 = 0, a0 = 0, ux = 0, uy = 0, done = false;
  sim.tick = () => { tick(); const c = sim.carrier, w = sim.world; if (done || !c || sim.handoffAt < 0 || !w) return;
    if (!jt) { const j = w.joints.find((q: any) => q.kind === 'grasp' && q.b === c.body); if (!j) return;
      const d = sim.defense.find((a: any) => a.body === j.a); const sp = Math.hypot(c.vel.x, c.vel.y); if (!d || sp < 0.5) { done = true; return; }
      ux = c.vel.x / sp; uy = c.vel.y / sp; const rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
      if ((rx * ux + ry * uy) / rd < Math.SQRT1_2) { done = true; return; }
      jt = j; t0 = sim.t; a0 = Math.atan2(ry, rx); }
    const k = Math.round((sim.t - t0) / sim.dt); if (k > 6 || !w.joints.includes(jt)) { done = true; return; }
    const m = c.profile.massKg, i = w.indexOf(c.body), a = Math.atan2(jt.a.pos.y - c.pos.y, jt.a.pos.x - c.pos.x);
    rows[k].push({ cap: (jt.capacity ?? 0) / (m * G), ten: (jt.force ?? 0) / (m * G), legs: jt.legs,
      h: jt.height !== undefined ? jt.height / c.profile.heightYd : NaN, hip: w.hipUsed?.[i] ?? 0,
      turn: Math.abs(Math.atan2(Math.sin(a - a0), Math.cos(a - a0))) * 180 / Math.PI, v: c.vel.x * ux + c.vel.y * uy, slip: jt.slipping ? 1 : 0 }); };
  sim.run();
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
console.log('tick  n    cap g  tension g  slipping  legs  height  hip used  turn deg  runner v');
for (const [k, r] of rows.entries()) if (r.length) console.log(`+${(k * 0.05).toFixed(2)} ${String(r.length).padStart(4)}  ${med(r.map(x => x.cap)).toFixed(2).padStart(6)}  ${med(r.map(x => x.ten)).toFixed(2).padStart(8)}  ${(100 * r.filter(x => x.slip).length / r.length).toFixed(0).padStart(6)}%  ${med(r.map(x => x.legs)).toFixed(2)}  ${med(r.map(x => x.h)).toFixed(2).padStart(6)}  ${med(r.map(x => x.hip)).toFixed(2).padStart(8)}  ${med(r.map(x => x.turn)).toFixed(0).padStart(8)}  ${med(r.map(x => x.v)).toFixed(2)}`);

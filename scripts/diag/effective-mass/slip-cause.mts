// Step 2: what stops a front-on pair sliding past each other in the sim? For the front-on first contacts of
// facing-req.mts, every tick from torso distance (<= 0.65 yd) to +0.3 s: the runner's velocity relative to the hitter
// across the line of centres (tangential, |.|) and along it (closing), split by what binds the pair that tick:
//   grasp   a live grasp joint from the hitter on the runner (the hold),
//   touch   torso surfaces in contact (centres within the sum of torso radii x CONTACT_SCALE) and no grasp,
//   apart   neither.
// Also, for the same ticks, the across-the-line part of each man's request relative to the other (does either ask to
// go by?). Diagnostic only. usage: node --import tsx scripts/diag/effective-mass/slip-cause.mts [restage dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { CONTACT_SCALE } = await import(`${W}/src/physics/world.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const rows: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (process.env.DIAG_HAND_PATCH === '1') st.handContact = 'patch'; /* diagnostic: the experimental contact patch */ if (!/Zone/i.test(st.offCall?.run?.scheme ?? '')) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); let prox: number | null = null, front = false, hitter: any = null, t0: number | null = null;
  const buf: any[] = []; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier; if (!c) return;
    if (prox === null && sim.handoffAt >= 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0);
      if (d) { prox = sim.t; hitter = d; const sp = Math.hypot(c.vel.x, c.vel.y), rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
        front = sp > 0.5 && (rx * c.vel.x + ry * c.vel.y) / (rd * sp) > Math.cos(Math.PI / 4) && (c.pos.x - sim.los) * up >= -1 && (c.pos.x - sim.los) * up < 3; } }
    if (hitter && t0 === null && sim.t - prox! <= 0.5 + 1e-9 && Math.hypot(hitter.pos.x - c.pos.x, hitter.pos.y - c.pos.y) <= 0.65) t0 = sim.t;
    if (t0 !== null && sim.t > t0 + 1e-9 && sim.t <= t0 + 0.3 + 1e-9) {
      const nx0 = hitter.pos.x - c.pos.x, ny0 = hitter.pos.y - c.pos.y, d = Math.hypot(nx0, ny0) || 1e-9, nx = nx0 / d, ny = ny0 / d;
      const rx = c.vel.x - hitter.vel.x, ry = c.vel.y - hitter.vel.y;
      const grasp = sim.world.joints.some((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body && j.a === hitter.body);
      const touch = d <= CONTACT_SCALE * (c.profile.radius + hitter.profile.radius) + 1e-6;
      const rq = sim.intents?.[c.idx]?.vel ?? { x: 0, y: 0 }, hq = sim.intents?.[hitter.idx]?.vel ?? { x: 0, y: 0 };
      buf.push({ tang: Math.abs(-rx * ny + ry * nx), closing: rx * nx + ry * ny, state: grasp ? 'grasp' : touch ? 'touch' : 'apart',
        reqTang: Math.abs(-(rq.x - hq.x) * ny + (rq.y - hq.y) * nx), reqClose: (rq.x - hq.x) * nx + (rq.y - hq.y) * ny, k: Math.round((sim.t - t0) / 0.05) }); } };
  sim.run();
  if (front && t0 !== null) rows.push(...buf);
}
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
console.log('front-on first contacts on zone runs, ticks from torso distance to +0.3 s; runner relative to hitter (yd/s, median)');
for (const st of ['grasp', 'touch', 'apart']) {
  const rs = rows.filter(r => r.state === st);
  console.log(`  ${st.padEnd(6)} ${String(rs.length).padStart(5)} ticks (${(100 * rs.length / rows.length).toFixed(0)}%) | tangential ${med(rs.map(r => r.tang)).toFixed(2)}, closing ${med(rs.map(r => r.closing)).toFixed(2)} | requests (runner - hitter): across ${med(rs.map(r => r.reqTang)).toFixed(2)}, closing ${med(rs.map(r => r.reqClose)).toFixed(2)}`);
}
for (const k of [1, 2, 4, 6]) { const rs = rows.filter(r => r.k === k);
  console.log(`  at +${(k * 0.05).toFixed(2)} s: grasp ${(100 * rs.filter(r => r.state === 'grasp').length / Math.max(1, rs.length)).toFixed(0)}%, touch ${(100 * rs.filter(r => r.state === 'touch').length / Math.max(1, rs.length)).toFixed(0)}%, apart ${(100 * rs.filter(r => r.state === 'apart').length / Math.max(1, rs.length)).toFixed(0)}% | tangential ${med(rs.map(r => r.tang)).toFixed(2)} | requests across ${med(rs.map(r => r.reqTang)).toFixed(2)}`); }

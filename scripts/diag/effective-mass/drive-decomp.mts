// Why does a runner's ground force collapse during a front-on contact? For front-on first contacts on zone runs (the
// hitterback / frontcourse definition), every tick of the 0.3 s from first proximity: his downfield ground impulse as
// a share of its limit, and what was acting on him: support state and availability (World alpha), the bond's stride
// hold on his legs (World strideHolds, set only when a holder hangs off his feet), his lean and felt load, and whether
// a grasp is on him at all. Attempt-two decomposition (docs/reviews/effective-mass.md).
// usage: node --import tsx scripts/diag/effective-mass/drive-decomp.mts [restage dir]
import { readFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); (PlaySim as any).recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const DIR = process.argv[2] ?? 'out/matched-restage';
const T: any[] = [];
for (let seed = 7; seed <= 29; seed += 2) { for (const p of JSON.parse(readFileSync(`${DIR}/seed${seed}-run.json`, 'utf8'))) {
  const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); if (!/Zone/i.test(st.offCall?.run?.scheme ?? '')) continue;
  const sim: any = new PlaySim(st); const up = sim.attackDir('O'); let contact: number | null = null, front = false;
  const buf: any[] = []; const tick = sim.tick.bind(sim);
  sim.tick = () => { tick(); const c = sim.carrier; if (!c) return;
    if (contact === null && sim.handoffAt >= 0) { const d = sim.defense.find((a: any) => Math.hypot(a.pos.x - c.pos.x, a.pos.y - c.pos.y) <= 1.0);
      if (d) { contact = sim.t; const sp = Math.hypot(c.vel.x, c.vel.y), rx = d.pos.x - c.pos.x, ry = d.pos.y - c.pos.y, rd = Math.hypot(rx, ry) || 1;
        front = sp > 0.5 && (rx * c.vel.x + ry * c.vel.y) / (rd * sp) > Math.cos(Math.PI / 4) && (c.pos.x - sim.los) * up >= -1 && (c.pos.x - sim.los) * up < 3; } }
    if (contact !== null && sim.t > contact + 1e-9 && sim.t <= contact + 0.3 + 1e-9 && sim.lastStep) {
      const k = c.idx, rep = sim.lastStep, sup = c.body.support, w = sim.world;
      const holds = w.joints.filter((j: any) => j.kind === 'grasp' && !j.broken && j.b === c.body);
      buf.push({ share: rep.groundImpulse[k].x * up / Math.max(1e-9, rep.groundImpulseLimit[k]), state: sup.state, alpha: w.alpha?.[k],
        stride: w.strideHolds?.[k] ?? 0, lean: Math.hypot(sup.lean.x, sup.lean.y), felt: Math.hypot(sup.felt.x, sup.felt.y),
        held: holds.length > 0, legs: holds.reduce((m: number, j: any) => Math.max(m, j.legs ?? 0), 0),
        req: (sim.intents?.[k]?.vel.x ?? NaN) * up, v: c.vel.x * up }); } };
  sim.run();
  if (front) T.push(...buf);
} }
const med = (v: number[]) => { const s = v.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[s.length >> 1] : NaN; };
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
const show = (label: string, rows: any[]) => console.log(`  ${label.padEnd(44)} ticks ${String(rows.length).padStart(4)} (${(100 * rows.length / T.length).toFixed(0).padStart(3)}%) | ground share mean ${mean(rows.map(r => r.share)).toFixed(2)} median ${med(rows.map(r => r.share)).toFixed(2)} | availability ${med(rows.map(r => r.alpha)).toFixed(2)} | request ${med(rows.map(r => r.req)).toFixed(1)} v ${med(rows.map(r => r.v)).toFixed(1)}`);
console.log(`front-on contacts, ticks in the 0.3 s from first proximity: ${T.length}; downfield ground impulse / limit:`);
show('all', T);
show('off his feet (falling / down)', T.filter(r => r.state !== 'up'));
const up = T.filter(r => r.state === 'up');
show('up', up);
show('up, availability < 0.5 (capture point far out)', up.filter(r => r.alpha < 0.5));
show('up, availability >= 0.5', up.filter(r => r.alpha >= 0.5));
show('up, stride hold > 0 (a holder hangs on his legs)', up.filter(r => r.stride > 0));
show('up, held with legs share >= 0.5', up.filter(r => r.held && r.legs >= 0.5));
show('up, held, legs share < 0.5', up.filter(r => r.held && r.legs < 0.5));
show('up, not held', up.filter(r => !r.held));
show('up, availability >= 0.5, not held, request > v + 1', up.filter(r => r.alpha >= 0.5 && !r.held && r.req > r.v + 1));
console.log(`  lean median ${med(up.map(r => r.lean)).toFixed(0)} vs felt median ${med(up.map(r => r.felt)).toFixed(0)} kg yd/s^2 on 'up' ticks`);

/** Plant bench (Tools/Physics, 2026-11-25, measurement only): for a body running at an entry speed, a point d yd away at an angle off its travel: the time and path to reach it
 * (first time within 1 yd of it), by strategy, and the tracks of each leg for the operator (plant_legs.py).
 * Strategies, all through the same World step and the same command shape a pursuer sends (`vel` toward the point, effort 1, cutSkill 1, facing default):
 *   arc          request = top speed toward the point, every tick (the point's bearing rotates as he moves)
 *   plant<v>     request = 0 until his speed is under v (yd/s), then top speed toward the point (brake-plant-reaccelerate); v in 4.5, 3.5, 2.5, 1.5, 0.5
 *   slow<f>      request = f x top speed toward the point (the controller's preview of 0.75 / 0.55 / 0.4 of sprint speed)
 * Also: `brake` tracks (request 0 from the entry speed, to rest) and the first body's `brake-turn` (request 0 until under 1.5 yd/s, then top speed along the new heading).
 *   node --import tsx scripts/diag/pursuit/plant_bench.mts [--out out/pursuit/plant-bench.jsonl.gz] [--csv out/pursuit/plant-composite.csv]
 * Bodies: CB_S, FS, SS, LB_M (a pursuit set), both turn directions. Entry: from rest asked the entry speed for 5 s (a flying start leaves the support state behind). */
import { createWriteStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createGzip } from 'node:zlib';
const stack = JSON.parse(readFileSync('config/reference-stack.json', 'utf8')).flags;
for (const [k, v] of Object.entries(stack)) if (v === 'on' && process.env[k] === undefined) process.env[k] = '1';
const { contactFixture } = await import('../run-contact-technique.js');
const arg = (n: string, d: string) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const out = arg('--out', 'out/pursuit/plant-bench.jsonl.gz'), csv = arg('--csv', 'out/pursuit/plant-composite.csv');
const SCALE = { lateral: Number(arg('--lat', '1')), brake: Number(arg('--brake', '1')), tau: Number(arg('--tau', '1')) }; // sensitivity only: one profile term scaled for every body (a counterfactual on the bench, not a proposal)
mkdirSync(dirname(out), { recursive: true });
const gz = createGzip(); gz.pipe(createWriteStream(out));
const f = contactFixture({ type: 'pass', runBlock: 60, passBlock: 60, side: 1 });
const sim = (f as any).sim;
const slots = ['CB_S', 'FS', 'SS', 'LB_M'];
for (const s of slots) { const pr = sim.slot(s)!.profile; pr.lateral *= SCALE.lateral; pr.brake *= SCALE.brake; pr.tau *= SCALE.tau; }
const ENTRY = [5.5, 7, 8.5], DIST = [6, 9, 12], ANG = [90, 120], SPIN = 5.0, REC = 5.0, DT = 0.1;
type Strat = { name: string; kind: 'arc' | 'plant' | 'slow' | 'brake' | 'braketurn'; v?: number; fr?: number };
const strats: Strat[] = [{ name: 'arc', kind: 'arc' }, ...[4.5, 3.5, 2.5, 1.5, 0.5].map(v => ({ name: `plant${v}`, kind: 'plant' as const, v })), ...[0.75, 0.55, 0.4].map(fr => ({ name: `slow${fr}`, kind: 'slow' as const, fr }))];
const rows: any[] = [], lines = ['slot,v0,dist,ang,strategy,reached,T,path,speedAtReach'];
function run(slot: string, v0: number, st: Strat, point: { x: number; y: number } | null, turnSign: number, th: number) {
  const a = sim.slot(slot)!;
  for (const o of sim.agents) { o.body.pos = { x: 75 + o.idx * 3, y: 10 }; o.body.vel = { x: 0, y: 0 }; o.behavior = { kind: 'idle', update: () => ({ vel: { x: 0, y: 0 } }) }; }
  a.body.pos = { x: 5, y: 26.65 }; a.body.vel = { x: 0, y: 0 }; a.body.facing = 0; a.body.energy = 1; a.body.sprintLoad = 0;
  const vm = a.profile.vmax, X: number[] = [], Y: number[] = [], base = SPIN;
  let t = 0, next = SPIN - 1.5, planted = false, hit = -1, path = 0, last = { x: 0, y: 0 }, spHit = 0, started = false;
  const steps = Math.round((SPIN + REC) / sim.dt);
  for (let k = 0; k <= steps; k++) {
    const sp = Math.hypot(a.body.vel.x, a.body.vel.y);
    if (t >= next - 1e-9) { X.push(+a.body.pos.x.toFixed(3)); Y.push(+a.body.pos.y.toFixed(3)); next += DT; }
    let req = { x: v0, y: 0 };
    if (t >= base - 1e-9) {
      if (!started) { started = true; last = { ...a.body.pos }; }
      // the point is fixed in the world: 'point' is given relative to the position and heading at the moment of the request, so shift it once
      const P = (point as any).abs;
      const dx = P.x - a.body.pos.x, dy = P.y - a.body.pos.y, d = Math.hypot(dx, dy) || 1;
      if (st.kind === 'arc') req = { x: vm * dx / d, y: vm * dy / d };
      else if (st.kind === 'slow') req = { x: st.fr! * vm * dx / d, y: st.fr! * vm * dy / d };
      else if (st.kind === 'plant') { if (!planted && sp <= st.v!) planted = true; req = planted ? { x: vm * dx / d, y: vm * dy / d } : { x: 0, y: 0 }; }
      if (hit < 0) { path += Math.hypot(a.body.pos.x - last.x, a.body.pos.y - last.y); last = { ...a.body.pos }; if (d <= 1.0) { hit = t - base; spHit = sp; } }
    }
    const intents: any[] = sim.agents.map((o: any) => ({ vel: { x: 0, y: 0 }, facing: o.facing }));
    intents[a.idx] = { vel: req, effort: 1, cutSkill: 1 };
    sim.world.step(intents, sim.dt); sim.t += sim.dt; t += sim.dt;
  }
  return { X, Y, hit, path, spHit };
}
for (const slot of slots) for (const v0 of ENTRY) for (const dist of DIST) for (const ang of ANG) for (const sgn of [1, -1]) {
  for (const st of strats) {
    // The point is placed relative to the body's position when the request starts (after the SPIN run): run once to find where he is at SPIN, then place it.
    const a = sim.slot(slot)!;
    const probe = (() => { for (const o of sim.agents) { o.body.pos = { x: 75 + o.idx * 3, y: 10 }; o.body.vel = { x: 0, y: 0 }; } a.body.pos = { x: 5, y: 26.65 }; a.body.vel = { x: 0, y: 0 }; a.body.facing = 0; a.body.energy = 1; a.body.sprintLoad = 0; const steps = Math.round(SPIN / sim.dt); for (let k = 0; k < steps; k++) { const intents: any[] = sim.agents.map((o: any) => ({ vel: { x: 0, y: 0 }, facing: o.facing })); intents[a.idx] = { vel: { x: v0, y: 0 }, effort: 1, cutSkill: 1 }; sim.world.step(intents, sim.dt); sim.t += sim.dt; } return { x: a.body.pos.x, y: a.body.pos.y }; })();
    const th = sgn * ang * Math.PI / 180, point: any = { abs: { x: probe.x + dist * Math.cos(th), y: probe.y + dist * Math.sin(th) } };
    const r = run(slot, v0, st, point, sgn, th);
    lines.push(`${slot},${v0},${dist},${sgn * ang},${st.name},${r.hit >= 0 ? 1 : 0},${r.hit >= 0 ? r.hit.toFixed(2) : ''},${r.hit >= 0 ? r.path.toFixed(2) : ''},${r.hit >= 0 ? r.spHit.toFixed(2) : ''}`);
    if (dist === 9 && st.kind === 'plant' && [1.5, 3.5].includes(st.v!)) rows.push({ src: 'bench', id: `${slot}-${v0}-${sgn * ang}-${st.name}`, slot, v0, ang: sgn * ang, strategy: st.name, t0: 15, x: [r.X], y: [r.Y] });
  }
}
// pure brake tracks and brake-turn: request 0 from the entry speed
for (const slot of slots) for (const v0 of ENTRY) {
  const a = sim.slot(slot)!;
  for (const o of sim.agents) { o.body.pos = { x: 75 + o.idx * 3, y: 10 }; o.body.vel = { x: 0, y: 0 }; }
  a.body.pos = { x: 5, y: 26.65 }; a.body.vel = { x: 0, y: 0 }; a.body.facing = 0; a.body.energy = 1; a.body.sprintLoad = 0;
  const X: number[] = [], Y: number[] = []; let t = 0, next = SPIN - 1.5; const steps = Math.round((SPIN + 3) / sim.dt);
  for (let k = 0; k <= steps; k++) {
    if (t >= next - 1e-9) { X.push(+a.body.pos.x.toFixed(3)); Y.push(+a.body.pos.y.toFixed(3)); next += DT; }
    const intents: any[] = sim.agents.map((o: any) => ({ vel: { x: 0, y: 0 }, facing: o.facing }));
    intents[a.idx] = { vel: t >= SPIN - 1e-9 ? { x: 0, y: 0 } : { x: v0, y: 0 }, effort: 1, cutSkill: 1 };
    sim.world.step(intents, sim.dt); sim.t += sim.dt; t += sim.dt;
  }
  rows.push({ src: 'bench', id: `${slot}-${v0}-brake`, slot, v0, strategy: 'brake', t0: 15, x: [X], y: [Y] });
}
for (const r of rows) gz.write(JSON.stringify(r) + '\n');
gz.end(); writeFileSync(csv, lines.join('\n') + '\n');
console.log(`${lines.length - 1} composite cases, ${rows.length} tracks`);

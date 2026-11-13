/** Pursuit weave attribution (Defense, report only): open-field pursuers (pursuit planner fired, 5-25 yd from the
 * carrier, first 3 s of the open field, as pursuit-planner.mts). Each tick, the rotation of his final request heading
 * (deg/s) is split into:
 *   aim     - rotation of the direction from him to the planner's steering point;
 *   bend    - change in the angle between the final request and that direction (around-bodies, spacing, contact stages);
 * and the aim rotation is attributed to what moved the steering point: the seen carrier heading turning (perceived),
 * the forecast status flipping (feasible meeting <-> least-late fallback), the meeting time jumping (> 0.3 s), the
 * leverage shade changing (> 0.3 yd), or none of these (geometry: he and the carrier moved). Reports mean |rate|
 * share by source and the share of > 20 deg/0.05 s re-aims by source; also true vs seen carrier heading rates.
 * usage: node --import tsx scripts/diag/effective-mass/pursuit-weave.mts [games] [seed] */
import { Rng } from '../../../src/core/rng.js';
import { simulateGame } from '../../../src/game/game.js';
import { generateTeam, leagueSample } from '../../../src/league/team.js';
import { PlaySim } from '../../../src/sim/playsim.js';
const games = Number(process.argv[2] ?? 2), seed0 = Number(process.argv[3] ?? 101);
const rec = new WeakMap<any, any>(); const chaseStage = new WeakMap<any, string>(); const stageH = new WeakMap<any, Record<string, number>>();
const tc0 = PlaySim.prototype.commandTraceFor;
PlaySim.prototype.commandTraceFor = function (this: any, a: any) {
  const inner = tc0.call(this, a) as any;
  return new Proxy(inner ?? {}, { get: (o: any, k) => k === 'pursuit'
    ? (t: any, d: any) => { if (d?.kind === 'intercept') rec.set(a, d); if (d?.kind === 'chase') chaseStage.set(a, d.requests?.at?.(-1)?.stage ?? 'chase'); return o?.pursuit?.(t, d); }
    : typeof o?.[k] === 'function' ? o[k].bind(o) : inner ? o[k] : () => undefined }) as any;
};
const ang = (x: number, y: number) => Math.atan2(y, x);
const wrap = (r: number) => { let d = (r * 180 / Math.PI) % 360; if (d > 180) d -= 360; if (d < -180) d += 360; return d; };
const rows: any[] = []; const St = new WeakMap<any, any>();
const rawH = new WeakMap<any, number>(), cmdH = new WeakMap<any, number>();
const dec0 = (PlaySim.prototype as any).decide;
(PlaySim.prototype as any).decide = function (this: any, i: number, t: number) {
  const a = this.agents[i]; const b = a.behavior;
  if (Object.hasOwn(b, 'update')) return dec0.call(this, i, t);
  const u0 = b.update;
  b.update = function (this: any, ag: any, sim: any) { const c = u0.call(this, ag, sim); if (c?.vel && Math.hypot(c.vel.x, c.vel.y) > 0.5) rawH.set(a, Math.atan2(c.vel.y, c.vel.x)); else rawH.delete(a); return c; };
  try { dec0.call(this, i, t); } finally { delete b.update; }
  const c = this.cmds[i]; if (c?.vel && Math.hypot(c.vel.x, c.vel.y) > 0.5) cmdH.set(a, Math.atan2(c.vel.y, c.vel.x)); else cmdH.delete(a);
};
const tick0 = PlaySim.prototype.tick;
PlaySim.prototype.tick = function (this: any) {
  const sim = this; for (const a of sim.agents) { rec.delete(a); chaseStage.delete(a); stageH.delete(a); }
  if (!sim.__stub) { sim.__stub = true; const prev = sim.responsibility;
    const stageAll = (name: string, intents: any[], ...x: any[]) => { for (const a of sim.agents) { const v = intents[a.idx]?.vel; if (!v || Math.hypot(v.x, v.y) < 0.5) continue; const m = stageH.get(a) ?? {}; m[name] = Math.atan2(v.y, v.x); stageH.set(a, m); } return prev?.stageAll?.(name, intents, ...x); };
    sim.responsibility = new Proxy({}, { get: (_o, k) => k === 'stageAll' ? stageAll : prev && typeof prev[k] === 'function' ? prev[k].bind(prev) : prev ? prev[k] : () => undefined }); }
  tick0.call(this);
  let s = St.get(sim); if (!s) { s = { t0: -1, c: null, prev: new Map() }; St.set(sim, s); }
  if (sim.phase !== 'live') return;
  const c = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!c || c.team !== 'O') return;
  if (s.t0 < 0) { const open = sim.offCall?.kind === 'pass' ? c !== sim.qb : c.pos.x > sim.los; if (!open) return; s.t0 = sim.t; s.c = c; }
  if (c !== s.c || sim.t - s.t0 > 3) return;
  for (const d of sim.defense) {
    const r = rec.get(d), it = sim.intents?.[d.idx]; const P = s.prev.get(d); s.prev.delete(d);
    const dist = Math.hypot(c.pos.x - d.pos.x, c.pos.y - d.pos.y);
    if (!r || !it || dist < 5 || dist > 25 || Math.hypot(it.vel.x, it.vel.y) < 1) continue;
    const sp = r.steeringPoint, aimH = ang(sp.x - d.pos.x, sp.y - d.pos.y), reqH = ang(it.vel.x, it.vel.y);
    const rH = rawH.get(d) ?? reqH, cH = cmdH.get(d) ?? reqH; const sh = stageH.get(d) ?? {};
    const cur = { aimH, reqH, bend: wrap(reqH - aimH), bIn: wrap(rH - aimH), bDec: wrap(cH - rH), bPost: wrap(reqH - cH), cstage: chaseStage.get(d) ?? '?', sh, seenH: ang(r.forecast.heading.x, r.forecast.heading.y), trueH: ang(c.vel.x, c.vel.y),
      status: r.prediction.estimate.status, mt: r.biasedTime, lev: r.leverage, kind: sim.offCall?.kind };
    s.prev.set(d, cur);
    if (!P) continue;
    const dt = sim.dt, req = wrap(cur.reqH - P.reqH), aim = wrap(cur.aimH - P.aimH), bend = cur.bend - P.bend;
    const seen = Math.abs(wrap(cur.seenH - P.seenH)), tru = Math.abs(wrap(cur.trueH - P.trueH));
    const src = cur.status !== P.status ? 'status flip' : Math.abs(cur.mt - P.mt) > 0.3 ? 'meeting jump' : seen / dt > 60 ? 'seen heading turn' : Math.abs(cur.lev - P.lev) > 0.3 ? 'leverage' : 'geometry';
    const post: Record<string, number> = {}; let prevH = cH;
    for (const nm of ['technique-intents', 'engagement', 'tackle-bond', 'spacing', 'snap-guard']) { const h = cur.sh[nm], ph = P.sh?.[nm]; if (h === undefined) continue;
      const pPrev = P.__prevFor?.[nm]; post[nm] = Math.abs(wrap(h - prevH) - (pPrev ?? 0)); (cur as any).__prevFor = { ...(cur as any).__prevFor, [nm]: wrap(h - prevH) }; prevH = h; }
    rows.push({ post, cstage: cur.cstage, dIn: Math.abs(cur.bIn - P.bIn), dDec: Math.abs(cur.bDec - P.bDec), dPost: Math.abs(cur.bPost - P.bPost), kind: cur.kind, req: Math.abs(req) / dt, aim: Math.abs(aim) / dt, bend: Math.abs(bend) / dt, src, big: Math.abs(req) > 20, bigBend: Math.abs(bend) > Math.abs(aim), seen: seen / dt, tru: tru / dt });
  }
};
const rng = new Rng(seed0); const home = generateTeam(rng, 'Ironmen', 'IRN', { strength: 0.55 }), away = generateTeam(rng, 'Comets', 'COM', { strength: 0.55 });
for (let g = 0; g < games; g++) simulateGame(leagueSample(home, seed0 + g), leagueSample(away, seed0 + g), { seed: seed0 + g, record: false });
const q = (v: number[]) => { const w = v.filter(Number.isFinite).sort((a, b) => a - b); return w.length < 5 ? '-' : [.25, .5, .75].map(p => w[Math.floor(p * (w.length - 1))].toFixed(0)).join('/'); };
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / Math.max(1, v.length);
console.log(`pursuit weave (${games} games from ${seed0}): samples ${rows.length}`);
for (const kind of ['run', 'pass']) {
  const X = rows.filter(r => r.kind === kind); if (!X.length) continue;
  console.log(`  ${kind}: request turn ${q(X.map(r => r.req))} deg/s (mean ${mean(X.map(r => r.req)).toFixed(0)}); aim-point turn ${q(X.map(r => r.aim))} (mean ${mean(X.map(r => r.aim)).toFixed(0)}); bend change ${q(X.map(r => r.bend))} (mean ${mean(X.map(r => r.bend)).toFixed(0)}); `
    + `seen carrier heading turn ${q(X.map(r => r.seen))} vs true ${q(X.map(r => r.tru))}`);
  const B = X.filter(r => r.big);
  console.log(`    re-aims > 20 deg in a tick: ${B.length} (${(100 * B.length / X.length).toFixed(1)}% of ticks); bend larger than aim turn in ${(100 * B.filter(r => r.bigBend).length / Math.max(1, B.length)).toFixed(0)}%`);
  for (const src of ['geometry', 'seen heading turn', 'status flip', 'meeting jump', 'leverage']) {
    const Y = X.filter(r => r.src === src), Z = B.filter(r => r.src === src);
    console.log(`    ${src.padEnd(18)} ticks ${(100 * Y.length / X.length).toFixed(0).padStart(3)}%, share of aim-turn ${(100 * Y.reduce((a, r) => a + r.aim, 0) / Math.max(1e-9, X.reduce((a, r) => a + r.aim, 0))).toFixed(0).padStart(3)}%, of big re-aims ${(100 * Z.length / Math.max(1, B.length)).toFixed(0).padStart(3)}% (bend-led ${(100 * Z.filter(r => r.bigBend).length / Math.max(1, Z.length)).toFixed(0)}%)`);
  }
}
for (const kind of ['run', 'pass']) {
  const B = rows.filter(r => r.kind === kind && r.big && r.bigBend); if (!B.length) continue;
  const lab = (r: any) => r.dIn >= r.dDec && r.dIn >= r.dPost ? 'inside chase (around-bodies / gather / bond)' : r.dDec >= r.dPost ? 'containment / orientation / open-to-ball' : 'technique / engagement / tackle bond / spacing';
  const m: Record<string, number> = {}; for (const r of B) m[lab(r)] = (m[lab(r)] ?? 0) + 1;
  const ic = B.filter(r => lab(r).startsWith('inside')), cs: Record<string, number> = {}; for (const r of ic) cs[r.cstage] = (cs[r.cstage] ?? 0) + 1;
  const pc = B.filter(r => lab(r).startsWith('technique')), ps: Record<string, number> = {}; for (const r of pc) { const k = Object.entries(r.post as Record<string, number>).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '?'; ps[k] = (ps[k] ?? 0) + 1; }
  console.log(`    inside chase by chase stage: ${Object.entries(cs).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}; post-decision by stage: ${Object.entries(ps).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ')}`);
  console.log(`  ${kind} bend-led big re-aims ${B.length}: ` + Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(100 * v / B.length).toFixed(0)}%`).join(', '));
}

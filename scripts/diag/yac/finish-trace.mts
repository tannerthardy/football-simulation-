// Zone YAC tail, trace only (Integration, 2026-11-16). For each target (out/diag/yac/targets.json: the closest
// defender on never-reached zone completions, and every defender who reached a carrier moving > 6 yd/s), re-run the
// staged play with the engine's command trace on that defender and record per tick after the catch:
//   aim   - the pursuit planner's steering point vs the true intercept on the carrier's actual path (earliest point he
//           could reach at his own vmax), vs where the carrier truly is, vs where he sees him;
//   speed - decision request, each post-decision stage's rewrite (containment/spacing/...), the chase sub-stages
//           (intercept-sprint / approach-and-gather / around-bodies / close-gather), final command, achieved speed,
//           and the angle between his velocity and the final request (turning);
//   tackle- distance and the tryTackles gates computed from true state (arms, range, dive range, closing, separating,
//           behind), and the attempt events he is named in.
//   node --import tsx scripts/diag/yac/finish-trace.mts [targets.json] [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const targets = JSON.parse(readFileSync(process.argv[2] ?? 'out/diag/yac/targets.json', 'utf8'));
const outPath = process.argv[3] ?? 'out/diag/yac/finish-trace.json';
const ang = (ax: number, ay: number, bx: number, by: number) => { const a = Math.hypot(ax, ay), b = Math.hypot(bx, by); if (a < 1e-6 || b < 1e-6) return NaN; return Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (a * b)))) * 180 / Math.PI; };
const res: any[] = [];
for (const tg of targets) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: tg.coverage, concept: tg.concept, seed: tg.seed, roster: tg.seed, formation: tg.formation, flip: tg.flip }));
  const d = sim.defense.find((x: any) => x.slot === tg.slot);
  const trace = sim.recordCommands({ actor: { team: d.team, slot: d.slot }, from: 0, to: 60 });
  const C: any[] = []; const G: any[] = []; let carrier: any = null, tc = -1, cx0 = 0;
  const dir = sim.attackDir(sim.offense[0].team);
  const tick = sim.tick.bind(sim);
  sim.tick = () => {
    tick();
    if (!carrier && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) { carrier = sim.ball.carrier; tc = sim.t; cx0 = carrier.pos.x; }
    if (carrier && sim.ball.kind === 'held' && sim.ball.carrier === carrier) {
      const c = carrier; C.push({ t: sim.t, x: c.pos.x, y: c.pos.y, vx: c.vel.x, vy: c.vel.y });
      const body = c.profile.radius + d.profile.radius, arms = body + d.profile.reach, range = arms + 0.45;
      const dx = c.pos.x - d.pos.x, dy = c.pos.y - d.pos.y, dd = Math.hypot(dx, dy) || 1;
      const sep = ((c.vel.x - d.vel.x) * dx + (c.vel.y - d.vel.y) * dy) / dd;
      const behind = (d.pos.x - c.pos.x) * c.vel.x + (d.pos.y - c.pos.y) * c.vel.y < 0;
      G.push({ t: sim.t, dd, arms, range, dive: range + 0.3, closing: -sep, sep, behind, down: d.isDown(sim.t), eng: !!d.engagement, next: d.nextTackleAt });
    }
  };
  sim.run();
  if (!carrier) continue;
  const yac = (C[C.length - 1].x - cx0) * dir;
  const steps = trace.steps.filter((s: any) => s.stepStart >= tc - 1e-9 && s.stepStart <= C[C.length - 1].t + 1e-9);
  const ev = sim.events.filter((e: any) => e.t >= tc - 1e-6 && (e.a === d.idx || e.b === d.idx) && /tackle|hit|wrap|dive/.test(e.type)).map((e: any) => ({ t: e.t - tc, type: e.type, note: e.note }));
  const rows: any[] = [];
  for (const s of steps) {
    const k = C.findIndex((c: any) => Math.abs(c.t - s.stepStart) < 1e-6 || c.t > s.stepStart - 1e-9); if (k < 0) continue;
    const p = s.start.body.position, v = s.start.body.velocity, ve = s.endpoint?.body?.velocity ?? v;
    const ic = (s.pursuit ?? []).find((x: any) => x.data.kind === 'intercept')?.data;
    const ch = (s.pursuit ?? []).find((x: any) => x.data.kind === 'chase')?.data;
    const vmax = ic?.pursuer?.capacity?.vmax ?? 9;
    // true intercept: earliest recorded carrier point he could reach at vmax from where he is
    let ti: any = null;
    for (let j = k; j < C.length; j++) { const q = C[j]; if (Math.hypot(q.x - p.x, q.y - p.y) <= vmax * (q.t - s.stepStart) + 0.5) { ti = q; break; } }
    const fin = s.final ?? s.decision?.raw; const raw = s.decision?.raw;
    const fv = fin?.vel ?? { x: 0, y: 0 }, rv = raw?.vel ?? { x: 0, y: 0 };
    const cur = C[k];
    const sp = (c: any) => c ? Math.hypot(c.vel.x, c.vel.y) : NaN;
    const stages: any = {}; for (const r of s.rewrites ?? []) stages[r.stage] = sp(r.command);
    const chs: any = {}; for (const r of ch?.requests ?? []) chs[r.stage] = sp(r.command);
    const g = G.find((x: any) => Math.abs(x.t - s.stepStart) < 1e-6) ?? G[k];
    rows.push({ t: s.stepStart - tc, dist: Math.hypot(cur.x - p.x, cur.y - p.y), csp: Math.hypot(cur.vx, cur.vy), vmax,
      aimTrue: ti ? ang(fv.x, fv.y, ti.x - p.x, ti.y - p.y) : NaN, aimNow: ang(fv.x, fv.y, cur.x - p.x, cur.y - p.y),
      steerTrue: ic && ti ? ang(ic.steeringPoint.x - p.x, ic.steeringPoint.y - p.y, ti.x - p.x, ti.y - p.y) : NaN,
      seenErr: ch?.observed ? Math.hypot(ch.observed.pos.x - cur.x, ch.observed.pos.y - cur.y) : NaN,
      planner: ch?.planner ?? (ic ? 'intercept-only' : 'none'), gather: ch?.gather ?? NaN,
      owner: s.decision?.owner?.kind ?? s.decision?.owner?.name ?? '-', rawSp: Math.hypot(rv.x, rv.y), rawEff: raw?.effort ?? 1,
      finSp: Math.hypot(fv.x, fv.y), finEff: fin?.effort ?? 1, stages, chs, sp: Math.hypot(v.x, v.y), spEnd: Math.hypot(ve.x, ve.y),
      turn: ang(v.x, v.y, fv.x, fv.y), g });
  }
  res.push({ ...tg, yacRe: yac, profile: { radius: d.profile.radius, reach: d.profile.reach }, ev, rows });
}
writeFileSync(outPath, JSON.stringify(res));
console.log(`traced ${res.length}; yac match ${res.filter((r) => Math.abs(r.yacRe - r.yac) < 0.5).length}`);

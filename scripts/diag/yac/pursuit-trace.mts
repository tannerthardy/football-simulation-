// Zone YAC: where a pursuer on a fast carrier loses speed (Integration, 2026-11-16, trace only). Targets
// (out/diag/yac/pursuers.json): defenders 2.5-6 yd from a carrier moving > 6 yd/s, from the side or behind, on staged
// zone completions. Per tick from t0 - 0.2 to t0 + 0.8 s (t0 = first such tick, relative to the catch): the request's
// heading and speed after the decision, each chase sub-stage (intercept-sprint = PURSUIT_SPOT / OPEN_FIELD point,
// approach-and-gather, around-bodies, close-gather) and each post-decision stage, the final command; the body's
// velocity heading and speed at start and end of the step and its facing; the carrier's bearing from him.
//   node --import tsx scripts/diag/yac/pursuit-trace.mts [targets.json] [out.json]
import { readFileSync, writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const targets = JSON.parse(readFileSync(process.argv[2] ?? 'out/diag/yac/pursuers.json', 'utf8'));
const outPath = process.argv[3] ?? 'out/diag/yac/pursuit-trace.json';
const hd = (v: any) => v ? Math.atan2(v.y, v.x) : NaN;
const sp = (v: any) => v ? Math.hypot(v.x, v.y) : NaN;
const res: any[] = [];
for (const tg of targets) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: tg.coverage, concept: tg.concept, seed: tg.seed, roster: tg.seed, formation: tg.formation, flip: tg.flip }));
  const d = sim.defense.find((x: any) => x.slot === tg.slot);
  const trace = sim.recordCommands({ actor: { team: d.team, slot: d.slot }, from: 0, to: 60 });
  const C: any[] = []; let carrier: any = null, tc = -1; const AP = new Map<number, string>(); const SPT = new Map<number, any>();
  const tick = sim.tick.bind(sim);
  sim.tick = () => { const t0 = sim.t; d.__approach = '-'; d.__spot = '-'; tick(); AP.set(Math.round(t0 * 1e4), d.__approach); SPT.set(Math.round(t0 * 1e4), { r: d.__spot, miss: d.__spotMiss, held: d.__spotHeld ? { ...d.__spotHeld } : null });
    if (!carrier && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) { carrier = sim.ball.carrier; tc = sim.t; }
    if (carrier && sim.ball.kind === 'held' && sim.ball.carrier === carrier) C.push({ t: sim.t, x: carrier.pos.x, y: carrier.pos.y, vx: carrier.vel.x, vy: carrier.vel.y }); };
  sim.run();
  if (!carrier) continue;
  const rows: any[] = [];
  for (const s of trace.steps) {
    const rt = s.stepStart - tc; if (rt < tg.t0 - 0.2 || rt > tg.t0 + 0.8) continue;
    const c = C.find((x: any) => x.t >= s.stepStart - 1e-9); if (!c) continue;
    const p = s.start.body.position, v0 = s.start.body.velocity, v1 = s.endpoint?.body?.velocity ?? v0;
    const ch = (s.pursuit ?? []).find((x: any) => x.data.kind === 'chase')?.data;
    const ic = (s.pursuit ?? []).find((x: any) => x.data.kind === 'intercept')?.data;
    const stg: any = {}; for (const r of ch?.requests ?? []) stg[r.stage] = { h: hd(r.command.vel), s: sp(r.command.vel) };
    for (const r of s.rewrites ?? []) stg['post:' + r.stage] = { h: hd(r.command.vel), s: sp(r.command.vel) };
    const raw = s.decision?.raw, fin = s.final ?? raw;
    rows.push({ t: rt, dt: (s.endpointTime ?? s.stepStart + sim.dt) - s.stepStart, dist: Math.hypot(c.x - p.x, c.y - p.y), bearing: Math.atan2(c.y - p.y, c.x - p.x), csp: Math.hypot(c.vx, c.vy), chd: Math.atan2(c.vy, c.vx),
      raw: { h: hd(raw?.vel), s: sp(raw?.vel) }, fin: { h: hd(fin?.vel), s: sp(fin?.vel), e: fin?.effort ?? 1 }, stg, planner: ch?.planner ?? '-', fresh: !!ic, gather: ch?.gather ?? NaN,
      v0: { h: hd(v0), s: sp(v0) }, v1: { h: hd(v1), s: sp(v1) }, facing: s.start.body.facing, down: false, bond: !!s.start.tackleBond, approach: AP.get(Math.round(s.stepStart * 1e4)) ?? '?', spot: SPT.get(Math.round(s.stepStart * 1e4)) ?? null, steer: ic ? ic.steeringPoint : null, fpt: ic ? ic.forecastPoint : null, pos: p, cpos: { x: c.x, y: c.y }, contact: (s.start.lastStepContacts ?? []).length });
  }
  res.push({ ...tg, rows });
}
writeFileSync(outPath, JSON.stringify(res));
console.log(`traced ${res.length}`);

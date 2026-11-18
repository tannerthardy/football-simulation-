// Per play (list from zy-sim3.json never-touched 20+): catcher, route, throw/catch time, catch spot; at the throw each
// defender's job (zone / man target); at the catch: defenders in front (x > carrier x) within 12 yd laterally, the nearest,
// the job owning that area; at +0.5 s the 3 nearest pursuers' lead: angle between his velocity and the line to the carrier now
// vs to the carrier's spot 1 s later (+ = leading).
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { readFileSync } = await import('node:fs');
const rows = JSON.parse(readFileSync(process.argv[2], 'utf8')).filter((r: any) => r.yac >= 20 && !r.contact);
for (const r of rows) {
  const sim: any = new PlaySim(nativeTraceSetup({ coverage: r.cov, concept: r.concept, seed: r.seed, roster: r.seed, formation: r.formation, flip: r.flip }));
  const dir = sim.attackDir(sim.offense[0].team), los = sim.los, N = (p: any) => ({ x: (p.x - los) * dir, y: p.y });
  let C: any = null, tc = -1, thr: any = null, cat: any = null, half: any = null, one: any = null, route = '';
  const tick = sim.tick.bind(sim);
  sim.tick = () => { tick();
    if (!thr && sim.ball.kind === 'air') { const tg = sim.ball.target; route = tg?.behavior?.route?.id ?? tg?.behavior?.routeId ?? ''; thr = { t: sim.t, jobs: sim.defense.map((d: any) => ({ s: d.slot, k: d.behavior?.kind, z: d.behavior?.zone ?? '', m: d.behavior?.man?.slot ?? d.behavior?.target?.slot ?? '', p: N(d.pos) })) }; }
    const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
    if (!C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { C = bc; tc = sim.t; cat = { c: N(C.pos), d: sim.defense.map((d: any) => ({ s: d.slot, p: N(d.pos) })) }; }
    if (C && !half && sim.t >= tc + 0.5) half = { c: N(C.pos), d: sim.defense.map((d: any) => ({ s: d.slot, p: N(d.pos), v: { x: d.vel.x * dir, y: d.vel.y } })) };
    if (C && !one && sim.t >= tc + 1.5) one = { c: N(C.pos) }; };
  try { sim.run(); } catch { continue; }
  if (!cat || !half || !one) continue;
  const c = cat.c, front = cat.d.filter((d: any) => d.p.x > c.x && Math.abs(d.p.y - c.y) < 12);
  const near = [...cat.d].sort((a: any, b: any) => Math.hypot(a.p.x - c.x, a.p.y - c.y) - Math.hypot(b.p.x - c.x, b.p.y - c.y));
  const job = (s: string) => { const j = thr.jobs.find((q: any) => q.s === s); return `${s}:${j.k === 'zone' ? j.z : j.k}${j.m ? '>' + j.m : ''}`; };
  const lead = [...half.d].sort((a: any, b: any) => Math.hypot(a.p.x - half.c.x, a.p.y - half.c.y) - Math.hypot(b.p.x - half.c.x, b.p.y - half.c.y)).slice(0, 3).map((d: any) => {
    const a = (u: any) => Math.atan2(u.y, u.x), ang = (p: any) => { let x = (a(d.v) - a({ x: p.x - d.p.x, y: p.y - d.p.y })) * 180 / Math.PI; while (x > 180) x -= 360; while (x < -180) x += 360; return Math.abs(x); };
    return `${d.s}(now${ang(half.c).toFixed(0)}/ahead${ang(one.c).toFixed(0)} d${Math.hypot(d.p.x - half.c.x, d.p.y - half.c.y).toFixed(1)})`; });
  console.log(`${r.cov} ${r.concept} ${r.formation.slice(4)} s${r.seed}${r.flip ? 'f' : ''} | ${C.slot} ${route} thr${thr.t.toFixed(2)} catch${tc.toFixed(2)} at x${c.x.toFixed(1)} sl${Math.min(c.y, 53.33 - c.y).toFixed(1)} yac${r.yac.toFixed(0)} | front<12: ${front.length} | near ${near.slice(0, 2).map((d: any) => job(d.s) + ' ' + Math.hypot(d.p.x - c.x, d.p.y - c.y).toFixed(1)).join(', ')} | lead ${lead.join(' ')}`);
}

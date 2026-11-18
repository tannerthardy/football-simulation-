// node --import tsx scripts/diag/coverage/cross-trace.mts [seeds] out.jsonl  (NFL side: scripts/diag/coverage/nfl_cross_trace.py)
// Deeper / shallow crosser throws: the underneath defender nearest the catch point at the release, every 0.2 s from
// 1.0 s before the release to it: depth over the target (+ deeper), lateral gap along the target's travel (+ ahead),
// his lateral speed along the target's travel and the target's. JSONL. usage: [flags] node --import tsx out/cross-trace.mts seeds out
import { writeFileSync } from 'node:fs';
const { facingTechnique } = await import(`${process.cwd()}/src/sim/coverage/orientation.ts`);
const W = process.cwd(), seeds = Number(process.argv[2] ?? 2), outp = process.argv[3];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const out: string[] = [];
for (const concept of ['mesh', 'drive', 'y_cross', 'hitch_cross', 'post_cross', 'dagger']) for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6', 'cover3_mable', 'cover9'])
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const hist: any[] = []; const req = new Map<any, any>();
    for (const d of sim.defense) { const b = d.behavior; if (!b?.update) continue; const u = b.update.bind(b); b.update = (a: any, s2: any) => { const c = u(a, s2); req.set(d, c?.vel ? { ...c.vel, lab: facingTechnique(c)?.label ?? ((b as any).job ?? b.constructor.name) } : null); return c; }; }
    const tick = sim.tick.bind(sim); sim.tick = () => { tick(); hist.push({ t: sim.t, p: new Map([...sim.defense, ...sim.offense].map((q: any) => [q, { x: q.pos.x, y: q.pos.y, vx: q.vel.x, vy: q.vel.y, rq: req.get(q)?.y ?? null, lab: req.get(q)?.lab ?? null, fc: q.facing }])) }); };
    let T: any = null, route = '?', aim: any = null, tT = 0;
    const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, target: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !T && target) { T = target; aim = intended; tT = sim.t; route = target.behavior?.route?.id ?? target.behavior?.fallback?.route?.id ?? '?'; } return tb(p, target, v0, intended, ...r); };
    let res: any; try { res = sim.run(); } catch { continue; }
    if (!T || !/cross|shallow|mesh|drag|under|dig|over/.test(route)) continue;
    const up = sim.attackDir('O');
    const at = (dt: number) => hist.reduce((b: any, h: any) => Math.abs(h.t - (tT + dt)) < Math.abs(b.t - (tT + dt)) ? h : b, hist[0]);
    const R = at(0);
    let best: any = null, bd = 1e9;
    for (const d of sim.defense) { const p = R.p.get(d); const dd = (p.x - sim.los) * up; if (dd < 0 || dd > 14 || !/LB|CB|S|DB|NB/.test(d.player.position)) continue; const k = Math.hypot(p.x - aim.x, p.y - aim.y); if (k < bd) { bd = k; best = d; } }
    if (!best) continue;
    const dir = Math.sign(R.p.get(T).vy) || 1;
    const tr = [-1.0, -0.8, -0.6, -0.4, -0.2, 0].map(dt => { const h = at(dt); const t = h.p.get(T), b = h.p.get(best);
      return { deeper: +((b.x - t.x) * up).toFixed(2), ahead: +((b.y - t.y) * dir).toFixed(2), bv: +(b.vy * dir).toFixed(2), rq: b.rq == null ? null : +(b.rq * dir).toFixed(2), lab: b.lab, tv: +(t.vy * dir).toFixed(2) }; });
    out.push(JSON.stringify({ air: +((aim.x - sim.los) * up).toFixed(1), comp: !!res.stats.completed, yds: res.yards ?? 0, tr }));
  }
writeFileSync(outp, out.join('\n') + '\n'); console.log(out.length, '->', outp);

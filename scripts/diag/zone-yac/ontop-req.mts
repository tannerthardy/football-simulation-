const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { onTopPoint } = await import(`${W}/src/sim/open-field.ts`);
const [cov, concept, formation, seed, flip, slot] = process.argv.slice(2);
const sim: any = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed: +seed, roster: +seed, formation, flip: flip === '1' }));
const dir = sim.attackDir(sim.offense[0].team), los = sim.los; let C: any = null, tc = -1, nx = 0;
const tick = sim.tick.bind(sim); let lastReq: any = null, wrapped = false;
const wrap = () => { if (wrapped) return; const d = sim.defense.find((q: any) => q.slot === slot); const b = d.behavior; const u = b.update.bind(b); b.update = (a: any, s: any) => { const c = u(a, s); lastReq = c; return c; }; wrapped = true; };
sim.tick = () => { wrap(); tick(); const bc = sim.ball.kind === 'held' ? sim.ball.carrier : null;
  if (!C && bc && bc.team === sim.offense[0].team && bc !== sim.qb) { C = bc; tc = sim.t; nx = tc; }
  if (C && sim.t >= nx - 1e-9 && sim.t <= tc + 1.6) { nx += 0.2; const d = sim.defense.find((q: any) => q.slot === slot);
    const seen = sim.see(d, C); const p = onTopPoint(sim, d, C, seen, 0);
    const X = (v: number) => ((v - los) * dir).toFixed(1);
    const vh = Math.atan2(d.vel.y, d.vel.x * dir) * 180 / Math.PI;
    const ph = p ? Math.atan2(p.y - d.pos.y, (p.x - d.pos.x) * dir) * 180 / Math.PI : NaN;
    const ih = (() => { // true intercept on a constant-velocity runner at his vmax
      const vm = d.profile.vmax * d.speedScale; let best: any = null; for (let t = 0.1; t < 6; t += 0.05) { const qx = C.pos.x + C.vel.x * t, qy = C.pos.y + C.vel.y * t; if (Math.hypot(qx - d.pos.x, qy - d.pos.y) <= vm * t) { best = { x: qx, y: qy, t }; break; } } return best; })();
    console.log(`+${(sim.t - tc).toFixed(1)} C x${X(C.pos.x)} y${C.pos.y.toFixed(1)} v${Math.hypot(C.vel.x, C.vel.y).toFixed(1)} | ${slot} x${X(d.pos.x)} y${d.pos.y.toFixed(1)} v${Math.hypot(d.vel.x, d.vel.y).toFixed(1)} vmax${(d.profile.vmax * d.speedScale).toFixed(1)} head ${vh.toFixed(0)} | onTop ${p ? `x${X(p.x)} y${p.y.toFixed(1)} head ${ph.toFixed(0)}` : 'none'} | req ${lastReq ? `v${Math.hypot(lastReq.vel.x, lastReq.vel.y).toFixed(1)} head ${(Math.atan2(lastReq.vel.y, lastReq.vel.x * dir) * 180 / Math.PI).toFixed(0)}` : '-'} | intercept ${ih ? `x${X(ih.x)} t${ih.t.toFixed(2)} head ${(Math.atan2(ih.y - d.pos.y, (ih.x - d.pos.x) * dir) * 180 / Math.PI).toFixed(0)}` : 'none'}`); } };
sim.run();

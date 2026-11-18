// QB lane, 2026-11-18: under ROUTE_SHAPE, the QB's receiver forecast against the receiver's real path, at the throw.
//   ROUTE_SHAPE=1 node --import tsx scripts/diag/routes/out-forecast.mts concept coverage formation seed flip
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const [concept, coverage, formation, seedS, flipS] = process.argv.slice(2);
const seed = Number(seedS);
const sim: any = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip: flipS === '1' }));
const dir = sim.attackDir(sim.offense[0].team), X = (p: any) => +((p.x - sim.los) * dir).toFixed(2), Y = (p: any) => +(p.y - sim.ballY).toFixed(2);
let fc: any = null, T: any = null, t0 = 0; const truth: any[] = [];
const tb = sim.throwBall.bind(sim);
sim.throwBall = (p: any, target: any, v0: any, intended: any, arrivalT: number, ...rest: any[]) => {
  if (p === sim.qb && !fc && target) { T = target; t0 = sim.t; const f = p.behavior.receiverForecasts.get(target); const est = f.estimate;
    fc = { t: +sim.t.toFixed(2), route: target.behavior?.route?.id, aim: [X(intended), Y(intended)], arrivalT: +arrivalT.toFixed(2), progress: est?.progress, motion: est?.motion,
      runner: { idx: target.behavior.idx, turn: target.behavior.turn ? { idx: target.behavior.turn.idx, exit: [X(target.behavior.turn.exit), Y(target.behavior.turn.exit)] } : null, plan: target.behavior.plan },
      path: target.behavior.path.map((q: any) => [X(q.p), Y(q.p), q.s, !!q.cut]), at: [X(target.pos), Y(target.pos)], v: [+(target.vel.x * dir).toFixed(1), +target.vel.y.toFixed(1)],
      pred: [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map((k) => { const q = f.predict(sim.t, k); return [k, X(q), Y(q)]; }) }; }
  return tb(p, target, v0, intended, arrivalT, ...rest);
};
const tick = sim.tick.bind(sim);
sim.tick = () => { tick(); if (T && sim.t - t0 <= 1.25) { const k = +(sim.t - t0).toFixed(2); if (Math.abs(k * 5 - Math.round(k * 5)) < 1e-6) { const nd = sim.defense.map((d: any) => [Math.hypot(d.pos.x - T.pos.x, d.pos.y - T.pos.y), d]).sort((a: any, b: any) => a[0] - b[0])[0]; truth.push([k, X(T.pos), Y(T.pos), +Math.hypot(T.vel.x, T.vel.y).toFixed(1), T.behavior?.kind, T.behavior?.idx, !!T.behavior?.turn, +nd[0].toFixed(1), nd[1].slot, (T.contacts?.length ?? 0) || !!T.engagement, (T.tags?.has?.('ball-servo') ? 'servo' : '') + (sim.ballEstimates?.lastSeen?.(T) ? 'seen' : ''), T.behavior?.choice ? [X(T.behavior.choice.p), Y(T.behavior.choice.p), +T.behavior.choice.t.toFixed(2)] : null, (() => { const e = sim.ballEstimates?.estimate?.(T, sim); return e?.length ? [X(e[e.length - 1]), Y(e[e.length - 1]), +e[e.length - 1].t.toFixed(2)] : null; })(), sim.ball.kind === 'air' ? [X(sim.ball.flight.pos), Y(sim.ball.flight.pos), +sim.ball.flight.pos.z.toFixed(1)] : sim.ball.kind]); } } };
const res = sim.run();
console.log(JSON.stringify(fc)); console.log('truth', JSON.stringify(truth)); console.log('comp', !!res.stats.completed);

const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const PLAYS: [string, string, string, boolean][] = [['corner_flat', 'cover3_match', 'gun_doubles_11', false], ['corner_flat', 'cover3_seam', 'gun_doubles_11', false],
  ['slant_flat', 'cover3_match', 'gun_doubles_11', true], ['slant_flat', 'cover3_seam', 'gun_doubles_11', true], ['slant_flat', 'cover3_match', 'gun_trips_11', true], ['slant_flat', 'cover3_buzz', 'gun_trips_11', true]];
for (const [concept, coverage, formation, flip] of PLAYS) {
  let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 1, formation, flip })); } catch (e: any) { console.log(concept, coverage, 'ERR', String(e?.message).slice(0, 80)); continue; }
  let rec: any = null, keyAt: any = null; const tb = sim.throwBall.bind(sim);
  sim.throwBall = (p: any, t: any, v0: any, intended: any, ...r: any[]) => {
    const b: any = p.behavior;
    if (p === sim.qb && !rec && intended) {
      // The nearest defender to the catch point: his believed position and the truth, and his job.
      let near: any = null;
      for (const d of sim.defense) { const dist = Math.hypot(d.pos.x - intended.x, d.pos.y - intended.y); if (!near || dist < near.dist) near = { d, dist }; }
      const e = b.mind.estimate(near.d);
      rec = { t: +sim.t.toFixed(2), target: t?.slot, route: t?.behavior?.route?.id, readIdx: b.readIdx, phase: b.phase, setAt: b.setAt >= 0 ? +b.setAt.toFixed(2) : null,
        P: b.throwRec ? +b.throwRec.P.toFixed(2) : null, iR: b.throwRec ? +b.throwRec.intRisk.toFixed(3) : null, pOpen: b.throwRec?.parts ? +b.throwRec.parts.pOpen.toFixed(2) : null,
        flatMan: near.d.slot, job: near.d.behavior?.kind === 'zone' ? near.d.behavior.zone : near.d.behavior?.kind, trueDist: +near.dist.toFixed(1),
        believedDist: +Math.hypot(e.pos.x - intended.x, e.pos.y - intended.y).toFixed(1), key: b.plan?.key ? { role: b.plan.key.role, man: b.plan.key.man?.slot ?? null, low: b.plan.key.low.slot, high: b.plan.key.high.slot, sits: b.plan.key.sits?.slot ?? null } : null,
        keyRead: b.keyRead ? { at: +b.keyRead.at.toFixed(2), throwTo: b.keyRead.throwTo, s: b.keyRead.s } : null };
    }
    return tb(p, t, v0, intended, ...r);
  };
  sim.run();
  console.log(concept, coverage, formation, flip ? 'flip' : '', JSON.stringify(rec), sim.events.some((e: any) => e.type === 'interception') ? 'INT' : '');
}

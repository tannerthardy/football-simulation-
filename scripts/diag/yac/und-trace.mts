// usage: [DEEP_BREAK=1] node --import tsx scripts/diag/yac/und-trace.mts out.json   (then python3 scripts/diag/yac/und-trace.py out.json)
// Underneath (and deep) man's execution during the flight: per tick the command the World executed (sim.intents), his
// facing, speed and support; then the same command sequence replayed on a lone clone of his body (stepBody) from his
// state at the release. Short zone completions, cover 2/3/4/6.
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { stepBody } = await import(`${W}/src/physics/kinematics.ts`);
const out: any[] = [];
for (const cov of ['cover2', 'cover3', 'cover4', 'cover6']) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage: cov, concept, seed: 1, roster: 1, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team); let rel = -1; const log = new Map<any, any[]>(); let clones: Map<any, any> | null = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => {
      if (rel >= 0 && sim.catchAt < 0) {
        // the command this tick is in sim.intents after decide; record before stepping via a wrapped world.step
      }
      tick();
      if (rel < 0 && sim.throwAt >= 0) { rel = sim.t; clones = new Map(sim.defense.map((d: any) => [d, structuredClone({ pos: d.body.pos, vel: d.body.vel, facing: d.body.facing, support: d.body.support, energy: d.body.energy, spin: d.body.spin })])); }
      if (rel >= 0 && sim.catchAt < 0) for (const d of sim.defense) {
        const it = sim.intents[d.idx]; if (!it) continue;
        (log.get(d) ?? log.set(d, []).get(d)!).push({ t: sim.t - rel, it: structuredClone({ vel: it.vel, facing: it.facing, posture: it.posture, effort: it.effort, cutSkill: it.cutSkill, look: it.look }),
          v: { ...d.vel }, f: d.body.facing, sp: d.speed, sup: d.body.support?.state, post: d.body.support?.posture, x: (d.pos.x - sim.los) * dir, px: d.pos.x, py: d.pos.y, tags: d.tags.has('deep-break') || d.tags.has('deep-top') });
      }
    };
    try { sim.run(); } catch { continue; }
    if (!sim.stats.completed || !clones) continue;
    const C = sim.offense.find((o: any) => sim.events.some((e: any) => e.type === 'catch' && e.a === o.idx));
    if (!C) continue; const cp = { ...C.pos }; if ((cp.x - sim.los) * dir >= 10) continue;
    for (const role of ['und', 'deep']) {
      const pool = sim.defense.filter((d: any) => log.get(d)?.length && (role === 'und' ? log.get(d)![0].x < 10 : log.get(d)![0].x >= 10));
      if (!pool.length) continue;
      const at0 = (d: any) => { const s = log.get(d)![0]; return Math.hypot(s.px - cp.x, s.py - cp.y); };
      const m = pool.sort((a: any, b: any) => at0(a) - at0(b))[0];
      const L = log.get(m)!; const c0 = clones.get(m);
      // replay on a lone clone
      const body: any = { ...m.body, pos: { ...c0.pos }, vel: { ...c0.vel }, facing: c0.facing, support: structuredClone(c0.support), energy: c0.energy, spin: c0.spin };
      const rsp: number[] = [];
      try { for (const s of L) { stepBody(body, s.it, sim.dt); rsp.push(Math.hypot(body.vel.x, body.vel.y)); } } catch (e: any) { rsp.push(NaN); }
      out.push({ cov, role, vmax: m.profile.vmax, L: L.map((s: any) => ({ t: s.t, rv: s.it.vel, rf: s.it.facing, eff: s.it.effort, f: s.f, sp: s.sp, sup: s.sup, post: s.post, db: s.tags })), rsp });
    }
  }
import('node:fs').then(({ writeFileSync }) => writeFileSync(process.argv[2], JSON.stringify(out)));
console.log('rows', out.length);

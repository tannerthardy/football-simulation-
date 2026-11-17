// Zone YAC: what a wrap on a carrier at speed does, per tick (Integration, 2026-11-16, trace only). Staged zone
// completions; every tackle bond formed while the carrier moves > 6 yd/s. Per tick while it lasts (up to 1.0 s):
// the carrier's speed and his ground force along his run (drive, from the step report) against its limit; for each
// holder: the joint's capacity, the force it carried (normalForce) and its component on the carrier along his run,
// grip and control, the holder's support state and his own ground force along the carrier's run (what the turf gives
// against being towed). Forces in kg*yd/s^2 (x 0.9144 for N).
//   node --import tsx scripts/diag/yac/hold-trace.mts [seeds] [out.json]
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 3);
const outPath = process.argv[3] ?? 'out/diag/yac/hold-trace.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const COVS = (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(',');
const out: any[] = []; 
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
    for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
      let C: any = null, bond: any = null, t0 = 0, rows: any[] = [], done = false, v0 = 0;
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        const pre = C ? Math.hypot(C.vel.x, C.vel.y) : 0;
        tick();
        if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) C = sim.ball.carrier;
        if (!C || done) return;
        if (!bond && sim.bond && sim.bond.carrier === C && pre > 6) { bond = sim.bond; t0 = sim.t; v0 = pre; }
        if (!bond) return;
        if (sim.bond !== bond || sim.t - t0 > 1.0 || sim.ball.carrier !== C) { done = true; return; }
        const rep = sim.lastStep; const ci = sim.world.bodies.indexOf(C.body);
        const cs = Math.hypot(C.vel.x, C.vel.y) || 1e-9, ux = C.vel.x / cs, uy = C.vel.y / cs, dt = sim.dt;
        const g = rep?.groundImpulse?.[ci], gl = rep?.groundImpulseLimit?.[ci];
        const H = bond.tacklers.map((d: any) => { const j = bond.holds?.get(d); const di = sim.world.bodies.indexOf(d.body); const dg = rep?.groundImpulse?.[di];
          const L: any = null; const rq = sim.intents[d.idx]?.vel; const dv0 = Math.hypot(d.vel.x, d.vel.y);
          return { L: L ? { speed: L.speed, at0: L.at0, an0: L.an0, At: L.At, An: L.An, k: L.k, at1: L.at1, an1: L.an1, capacity: L.capacity, drive: L.drive, effort: L.effort, rq: rq ? Math.hypot(rq.x, rq.y) : null, rqAng: rq && dv0 > 0.3 ? Math.abs(Math.atan2(rq.x * d.vel.y - rq.y * d.vel.x, rq.x * d.vel.x + rq.y * d.vel.y)) * 180 / Math.PI : null, velAng: dv0 > 0.3 ? Math.abs(Math.atan2(ux * d.vel.y - uy * d.vel.x, ux * d.vel.x + uy * d.vel.y)) * 180 / Math.PI : null, lean: d.body.support?.lean ?? null } : null, cap: j?.capacity ?? 0, nf: j?.normalForce ?? 0, onC: j?.normalForceOnB ? j.normalForceOnB.x * ux + j.normalForceOnB.y * uy : 0, grip: bond.grip?.get(d) ?? 0, ctl: bond.control?.get(d) ?? 0,
            sup: d.body.support?.state ?? '?', dsp: Math.hypot(d.vel.x, d.vel.y), dGround: dg ? (dg.x * ux + dg.y * uy) / dt : 0, mass: d.body.mass ?? d.profile.mass, dist: Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y), broken: !!j?.broken }; });
        rows.push({ t: sim.t - t0, cst: C.body.support?.state ?? '?', cs, drive: g ? (g.x * ux + g.y * uy) / dt : 0, driveLim: gl != null ? gl / dt : null, cmass: C.body.mass ?? C.profile.mass, H });
      };
      sim.run();
      if (bond && rows.length) {
        const ev = (sim.events as any[]).filter((e) => e.t >= t0 - 1e-6 && e.t <= t0 + 1.0 + 1e-6);
        out.push({ concept, coverage, formation, seed, flip, v0, t0, down1: ev.some((e) => e.type === 'tackle' || e.type === 'down'), broken: ev.filter((e) => e.type === 'broken_tackle').length, missed: ev.filter((e) => e.type === 'missed_tackle').length, carrierDown: rows.some((r: any) => r.cst !== 'up' && r.cst !== '?'), rows });
      }
    }
writeFileSync(outPath, JSON.stringify(out));
console.log(`bonds on a carrier > 6 yd/s: ${out.length}`);

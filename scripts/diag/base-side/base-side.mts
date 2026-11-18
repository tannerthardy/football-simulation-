// Usage (repo root): QB_INTENT=1 node --import tsx scripts/diag/base-side/base-side.mts out/base-side-sim.json
// Staged set: cover1/2/3/4/6 x every non-screen concept x gun_doubles_11/gun_trips_11 x seeds 1-2 x flip (1,181 throws
// on defense/C32-qb-body ffb976b5, engine-76 base + QB_INTENT=1, which does not touch the QB).
// Sim side of the base check: per staged dropback, the QB's trunk (body.facing) and head every tick before the
// release while set or loading, the trunk over 0.3-0.6 s before the release, the throw bearing to the target's spot
// when the ball arrives, and the catcher's lateral run over 1.5 s after the catch. Normalised: offense attacks +x,
// +y = QB's left (angles from downfield).
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const out: any[] = [];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
for (const coverage of ['cover1', 'cover2', 'cover3', 'cover4', 'cover6']) for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (let seed = 1; seed <= 2; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const dir = sim.attackDir(sim.offense[0].team), down = dir > 0 ? 0 : Math.PI;
    const N = (p: any) => ({ x: p.x * dir, y: p.y * dir });
    const ticks: any[] = []; let qRel: any = null, arrive: any = null, C: any = null, cAt = -1, c0: any = null, c15: any = null, wasAir = false, tgtAgent: any = null;
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); const q = sim.qb;
      if (sim.throwAt < 0) { ticks.push({ t: sim.t, f: wrap(q.body.facing - down), h: q.head === null ? null : wrap(q.head - down), arm: q.arm ?? null, set: q.arm === 'set' || q.arm === 'load' }); }
      else if (!qRel) { qRel = { t: sim.throwAt, p: N(q.pos) }; }
      if (sim.ball.kind === 'air') { wasAir = true; tgtAgent = sim.ball.target ?? tgtAgent; }
      else if (wasAir && !arrive) { const tg = tgtAgent ?? sim.offense.find((o: any) => o.player.id === sim.stats.target); if (tg) arrive = N(tg.pos); }
      if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== q) { C = sim.ball.carrier; cAt = sim.t; c0 = N(C.pos); }
      if (C && sim.t - cAt <= 1.5) c15 = N(C.pos); };
    try { sim.run(); } catch { continue; }
    if (!qRel || !arrive || !sim.stats.attempted || sim.stats.throwaway) continue;
    const thr = Math.atan2(arrive.y - qRel.p.y, arrive.x - qRel.p.x);
    const win = ticks.filter((k) => k.t >= qRel.t - 0.6 - 1e-9 && k.t <= qRel.t - 0.3 + 1e-9);
    if (win.length < 2) continue;
    const sh = Math.atan2(win.reduce((s, k) => s + Math.sin(k.f), 0), win.reduce((s, k) => s + Math.cos(k.f), 0));
    out.push({ concept, coverage, sh, thr, lat: arrive.y - qRel.p.y, comp: !!sim.stats.completed, run: C && c15 ? c15.y - c0.y : null,
      dis: ticks.filter((k) => k.set && k.h !== null).map((k) => [+k.f.toFixed(3), +k.h.toFixed(3)]) });
  }
writeFileSync(process.argv[2], JSON.stringify(out)); console.log('throws', out.length);

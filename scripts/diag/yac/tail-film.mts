// Never-reached zone completions, every defender deeper than the carrier at the catch, per 0.1 s to the whistle.
// Needs local diagnostic tags in open-field.ts (__onTop) and common.ts chase() (__mode, __modeT). Trace only.
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 3), outPath = process.argv[3];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const COVS = (process.env.COVS ?? 'cover2,cover3,cover4,cover6').split(',');
const out: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of COVS) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
    for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
      const dir = sim.attackDir(sim.offense[0].team); const req = new Map<any, any>(); const looked = new Map<any, any>();
      const la = sim.lookAt.bind(sim); sim.lookAt = (a: any, t: any, ...r: any[]) => { looked.set(a, t); return la(a, t, ...r); };
      let C: any = null, tc = 0, cx0 = 0, k = 0, minD = Infinity; const tr: any[] = []; let deep: any[] = [];
      const tick = sim.tick.bind(sim);
      sim.tick = () => {
        looked.clear(); for (const d of sim.defense) { d.__mode = '-'; d.__onTop = undefined; const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
        tick();
        if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) {
          C = sim.ball.carrier; tc = sim.t; cx0 = C.pos.x; deep = sim.defense.filter((d: any) => (d.pos.x - C.pos.x) * dir > 0); }
        if (C && sim.ball.kind === 'held' && sim.ball.carrier === C) {
          for (const d of sim.defense) minD = Math.min(minD, Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y));
          if (k++ % 3 === 0) tr.push({ t: sim.t - tc, cx: (C.pos.x - sim.los) * dir, cy: C.pos.y, cs: Math.hypot(C.vel.x, C.vel.y), d: deep.map((d: any) => { const r = req.get(d); const e = d.engagement;
            return { slot: d.slot, dist: Math.hypot(d.pos.x - C.pos.x, d.pos.y - C.pos.y), ahead: (d.pos.x - C.pos.x) * dir, sp: Math.hypot(d.vel.x, d.vel.y), cls: d.behavior?.constructor?.name ?? '-',
              lab: (r && facingTechnique(r)?.label) ?? '-', chase: looked.get(d) === C, mode: d.__mode, top: d.__onTop ?? null, eng: e ? (e.blocker?.team === d.team ? 'own' : 'blocked') : null, down: d.isDown(sim.t),
              rq: r ? Math.hypot(r.vel.x, r.vel.y) : 0, look: looked.get(d) ? (looked.get(d) === C ? 'carrier' : (looked.get(d).team === d.team ? 'mate' : 'other-off')) : '-' }; }) });
        }
      };
      sim.run();
      if (!C || !sim.stats.completed || minD <= 1.0 || !tr.length) continue;
      const ends = sim.events.filter((e: any) => ['tackle', 'touchdown', 'out_of_bounds', 'slide'].includes(e.type)).map((e: any) => e.type);
      const evs = sim.events.filter((e: any) => e.t >= tc && ['tackle_wrap', 'missed_tackle', 'broken_tackle', 'hit'].includes(e.type)).map((e: any) => ({ t: e.t - tc, type: e.type, slot: sim.agents[e.a]?.slot, slotB: sim.agents[e.b]?.slot }));
      out.push({ id: `${coverage}/${concept}/${formation}/s${seed}/${flip ? 'f' : 'n'}`, carrier: C.slot, catchX: (cx0 - sim.los) * dir, yac: (tr[tr.length - 1].cx + sim.los * 0) - (cx0 - sim.los) * dir, minD, end: ends[ends.length - 1] ?? 'other', evs, tr });
    }
writeFileSync(outPath, JSON.stringify(out)); console.log(`never-reached zone completions: ${out.length}`);

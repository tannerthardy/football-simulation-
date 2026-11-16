// Same as zone-man-after.mts plus each defender's tryTackles gate per tick (d.__tk), which needs a local diagnostic tag in tackle.ts (not committed).
// Zone YAC vs man YAC (Integration priority #1, 2026-11-16). Staged completions, every non-screen pass concept vs
// Cover 1 (man) and Cover 2/3/4/6 (zone), gun doubles and trips. From the catch to the whistle, per defender: his
// controller class, whether he is chasing the carrier (he looks at the carrier this tick: chase() does), his request
// and achieved speed, closing rate on the carrier, angle off the line to him, leverage (in front of the carrier along
// the attack direction), arrival within 1 yd, and the tackle events he is named in.
//   node --import tsx scripts/diag/yac/zone-man-after.mts [seeds] [out.json]
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/yac/zone-man-after.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const COVS = (process.env.COVS ?? 'cover1,cover2,cover3,cover4,cover6').split(',');
const rows: any[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of COVS)
    for (const formation of ['gun_doubles_11', 'gun_trips_11'])
      for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
        let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
        const dir = sim.attackDir(sim.offense[0].team);
        const req = new Map<any, any>(); const looked = new Map<any, any>();
        const la = sim.lookAt.bind(sim); sim.lookAt = (a: any, t: any, ...r: any[]) => { looked.set(a, t); return la(a, t, ...r); };
        let C: any = null, tc = -1, cx0 = 0; const tr: any[] = []; let k = 0;
        const tick = sim.tick.bind(sim);
        sim.tick = () => {
          looked.clear();
          for (const d of sim.defense) { const b = d.behavior; if (b && !b.__h) { const u = b.update.bind(b); b.update = (...q: any[]) => { const r = u(...q); req.set(d, r); return r; }; b.__h = 1; } }
          tick();
          if (!C && sim.catchAt >= 0 && sim.ball.kind === 'held' && sim.ball.carrier?.team === sim.offense[0].team && sim.ball.carrier !== sim.qb) { C = sim.ball.carrier; tc = sim.t; cx0 = C.pos.x; }
          if (C && sim.ball.kind === 'held' && sim.ball.carrier === C && (k++ % 3 === 0)) {
            tr.push({ t: sim.t - tc, c: { x: C.pos.x, y: C.pos.y, vx: C.vel.x, vy: C.vel.y }, d: sim.defense.map((d: any) => { const r = req.get(d);
              return { i: d.idx, x: d.pos.x, y: d.pos.y, vx: d.vel.x, vy: d.vel.y, rvx: r?.vel?.x ?? 0, rvy: r?.vel?.y ?? 0,
                cls: d.behavior?.constructor?.name ?? '-', lab: (r && facingTechnique(r)?.label) ?? '-', chase: looked.get(d) === C, eng: !!d.engagement, tk: d.__tk ?? '-', dn: d.isDown(sim.t) }; }) });
          }
        };
        sim.run();
        if (!C || !sim.stats.completed || tr.length < 2) continue;
        const last = tr[tr.length - 1];
        const ev = sim.events.filter((e: any) => e.t >= tc - 1e-6).map((e: any) => ({ t: e.t - tc, type: e.type, a: e.a, b: e.b }));
        rows.push({ concept, coverage, formation, seed, flip, dir, catchX: (cx0 - sim.los) * dir, yac: (last.c.x - cx0) * dir, carrier: C.idx, carrierRole: C.slot,
          defPos: Object.fromEntries(sim.defense.map((d: any) => [d.idx, d.slot])), ev, tr });
      }
import('node:fs').then(({ mkdirSync }) => mkdirSync('out/diag/yac', { recursive: true }));
await new Promise((r) => setTimeout(r, 50));
writeFileSync(outPath, JSON.stringify(rows));
const mean = (v: number[]) => v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN;
for (const cov of COVS) { const R = rows.filter((r) => r.coverage === cov); console.log(`${cov}: n ${R.length} YAC mean ${mean(R.map((r) => r.yac)).toFixed(2)} catch depth ${mean(R.map((r) => r.catchX)).toFixed(1)}`); }

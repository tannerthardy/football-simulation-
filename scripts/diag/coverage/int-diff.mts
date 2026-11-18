// node --import tsx scripts/diag/coverage/int-diff.mts out.jsonl
// Per play (honest-after's staged set): interceptions with the interceptor's slot, his zone and his technique label at
// the release, and his distance to the catch point at the release. JSONL. usage: [flags] node --import tsx out/int-diff.mts out.jsonl
import { writeFileSync } from 'node:fs';
const W = process.cwd();
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { facingTechnique } = await import(`${W}/src/sim/coverage/orientation.ts`);
const out: string[] = [];
for (const concept of Object.keys(PASS_BY_ID).filter((id) => !/screen/.test(id)))
  for (const coverage of ['cover2', 'cover3', 'cover4', 'cover6'])
    for (const formation of ['gun_doubles_11', 'gun_trips_11']) for (const flip of [false, true]) {
      let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed: 1, roster: 1, formation, flip })); } catch { continue; }
      const last = new Map<any, string>();
      for (const d of sim.defense) { const b = d.behavior; if (!b?.update) continue; const u = b.update.bind(b); b.update = (a: any, s: any) => { const c = u(a, s); last.set(d, facingTechnique(c)?.label ?? ''); return c; }; }
      let atRel: any = null, aim: any = null, interceptor: any = null, pbu = false;
      const tb = sim.throwBall.bind(sim); sim.throwBall = (p: any, tg: any, v0: any, intended: any, ...r: any[]) => { if (p === sim.qb && !atRel) { aim = intended; atRel = new Map(sim.defense.map((d: any) => [d, { lab: last.get(d), x: d.pos.x, y: d.pos.y }])); } return tb(p, tg, v0, intended, ...r); };
      const ev0 = sim.event.bind(sim); sim.event = (type: string, a?: any, ...r: any[]) => { if (type === 'interception' && !interceptor) interceptor = a; if (type === 'pbu') pbu = true; return ev0(type, a, ...r); };
      try { sim.run(); } catch { continue; }
      if (!atRel) continue;
      const i = interceptor && atRel.get(interceptor);
      out.push(JSON.stringify({ key: `${concept}|${coverage}|${formation}|${flip}`, int: !!interceptor, pbu,
        who: interceptor ? `${interceptor.slot}:${interceptor.behavior?.zone ?? interceptor.behavior?.job ?? ''}` : null, lab: i?.lab ?? null,
        dRel: i ? +Math.hypot(i.x - aim.x, i.y - aim.y).toFixed(1) : null }));
    }
writeFileSync(process.argv[2], out.join('\n') + '\n'); console.log(out.length, 'throws');

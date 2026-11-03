import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const agg: Record<string, Record<string, number>> = {};
const add = (k: string, v: string) => { (agg[k] ??= {})[v] = (agg[k][v] ?? 0) + 1; };
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'power') continue;
    const sim: any = new PlaySim(st); sim.tick();
    const ob = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && (a.behavior.plan.kind === 'pull' || a.behavior.plan.kind === 'lead'));
    const sig = ob.map((a: any) => `${a.slot.replace(/[LR]G/, 'G')}:${a.behavior.plan.pullRole}`).sort().join(' ');
    const called = new Map(ob.map((a: any) => [a, a.behavior.plan.target]));
    const first = new Map<any, string>();
    while (sim.t < 3.5 && sim.phase === 'live') { sim.tick();
      for (const a of ob) if (!first.has(a) && a.engagement) { const d = a.engagement.defender;
        first.set(a, `${d === called.get(a) ? 'called' : /^D[ET]|NT/.test(d.slot) ? 'DL' : /LB/.test(d.slot) ? 'LB' : 'DB'}${a.behavior.plan.pullRole !== (a.behavior.plan.kind==='lead'?'kick':a.behavior.plan.pullRole) ? '' : ''} t${Math.round(sim.t*2)/2}`.replace(/ t.*/, '')); }
    }
    for (const a of ob) add(`${sig} :: ${a.slot.replace(/[LR]G/, 'G')}/${called.get(a)?.slot?.replace(/_[SW]$/, '') ?? '-'}`, first.get(a) ?? 'none');
  }
}
for (const [k, v] of Object.entries(agg).sort()) console.log(k.padEnd(40), JSON.stringify(v));

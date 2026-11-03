import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const dumpOne = process.argv[3] === 'dump';
const agg: Record<string, number[]> = {}; const kinds: Record<string, number> = {};
const put = (k: string, v: number) => (agg[k] ??= []).push(v);
let n = 0;
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'trap') continue;
    const probe: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64'))); probe.tick();
    const tr = probe.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'trap');
    const d = tr?.behavior.plan.target; if (!d) continue;
    const sim: any = new PlaySim(st); const trace = sim.recordCommands({ actor: { team: 'D', slot: d.slot }, from: 0, to: 1.3 });
    const up = -sim.attackDir('O');  // defender's upfield = toward the offense backfield
    while (sim.t < 1.3 && sim.phase === 'live') sim.tick();
    n++;
    if (dumpOne && n === 1) { const s: any = trace.steps[12]; console.log(JSON.stringify({ dec: s.decision, fin: s.final, end: s.endpoint?.velocity ?? s.endpoint }, null, 0).slice(0, 2500)); process.exit(0); }
    for (const s of trace.steps) {
      const t = Math.round(s.stepStart * 20) / 20; if (t < .3 || t > 1.0 || Math.round(t * 10) !== t * 10) continue;
      const raw: any = s.decision?.raw, fin: any = s.final, end: any = s.endpoint;
      const rv = raw?.vel ?? raw?.intent?.vel, fv = fin?.vel ?? fin?.intent?.vel, av = end?.body?.velocity;
      if (rv) put(`t${t.toFixed(1)} requested upfield`, rv.x * up);
      if (fv) put(`t${t.toFixed(1)} final upfield`, fv.x * up);
      if (av) put(`t${t.toFixed(1)} achieved upfield`, av.x * up);
      const own = s.decision?.owner as any; const ob = (s.final as any)?.objective; const kk = `t${t.toFixed(1)} ${own?.controller}/${own?.kind} obj=${ob?.kind}`; kinds[kk] = (kinds[kk] ?? 0) + 1;
    }
  }
}
const med = (v: number[]) => { const s = [...v].sort((a, b) => a - b); return s[Math.floor(s.length / 2)].toFixed(2); };
console.log('trap plays', n);
for (const [k, v] of Object.entries(agg).sort()) console.log(k.padEnd(28), 'p50', med(v), 'n', v.length);
for (const [k, v] of Object.entries(kinds).sort()) if (v > 2) console.log(String(v).padStart(4), k);

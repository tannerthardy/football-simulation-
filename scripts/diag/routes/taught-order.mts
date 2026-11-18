// TAUGHT_ORDER measure (Integration, 2026-11-18): staged dropbacks per concept against cover3/cover4/cover2/cover1
// from gun doubles and trips; per concept: time to throw, the share thrown to the installed plan's first read (either
// half of a key counts), completion, interceptions, and the installed order printed. Run once with TAUGHT_ORDER unset
// and once with TAUGHT_ORDER=1 and compare.
//   node --import tsx scripts/diag/routes/taught-order.mts [seeds] [out.json]
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
const W = process.cwd();
const seeds = Number(process.argv[2] ?? 2);
const outPath = process.argv[3] ?? 'out/diag/routes/taught-order.json';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { nativeTraceSetup } = await import(`${W}/scripts/diag/command-trace.ts`);
const { PASS_BY_ID } = await import(`${W}/src/playbook/concepts.ts`);
const { installedPlan } = await import(`${W}/src/playbook/read-compiler/runtime.ts`);
const concepts = Object.entries(PASS_BY_ID).filter(([id, c]: any) => !/screen/.test(id) && !c.screen).map(([id]) => id);
const rows: any[] = [];
for (const concept of concepts) for (const coverage of ['cover3', 'cover4', 'cover2', 'cover1']) for (const formation of ['gun_doubles_11', 'gun_trips_11'])
  for (let seed = 1; seed <= seeds; seed++) for (const flip of [false, true]) {
    let sim: any; try { sim = new PlaySim(nativeTraceSetup({ coverage, concept, seed, roster: seed, formation, flip })); } catch { continue; }
    const plan: any = installedPlan(PASS_BY_ID[concept], formation);
    const res = sim.run(); const s = res.stats;
    const first = plan ? (plan.key ? [plan.key.high, plan.key.low] : plan.order.slice(0, 1)) : [];
    const n = sim.offAlign?.numbering ?? {};
    const T = s.attempted ? sim.offense.find((r: any) => r.player.id === s.target) : null;
    const tRef = T ? (Object.entries(n).find(([, slot]) => slot === T.slot)?.[0] ?? (T.slot === 'RB' || T.slot === 'FB' ? 'B' : T.slot)) : null;
    rows.push({ concept, coverage, formation, seed, flip, order: plan ? [...plan.order, ...(plan.outlet ? [`(${plan.outlet})`] : [])].join(' ') : '', key: plan?.key ? `${plan.key.high}/${plan.key.low}` : '',
      att: !!s.attempted, tThrow: s.attempted ? +(sim.throwAt ?? 0).toFixed(2) : null, tRef, first: !!(tRef && first.includes(tRef)), comp: !!s.completed, int: !!s.interceptedBy, sack: !!s.sacked, yards: res.yards });
  }
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(rows));
const by: Record<string, any[]> = {};
for (const r of rows) (by[r.concept] ??= []).push(r);
console.log('concept | n | att | t throw (med) | first read | comp/att | int | yd/play | order (doubles / trips)');
for (const [c, v] of Object.entries(by)) {
  const a = v.filter((r) => r.att), t = a.map((r) => r.tThrow).sort((x, y) => x - y);
  const ord = [...new Set(v.map((r) => `${r.order}${r.key ? ' K' + r.key : ''}`))].join(' / ');
  console.log(`${c} | ${v.length} | ${a.length} | ${t.length ? t[Math.floor(t.length / 2)].toFixed(2) : '-'} | ${a.length ? (a.filter((r) => r.first).length / a.length).toFixed(2) : '-'} | ${a.length ? (a.filter((r) => r.comp).length / a.length).toFixed(2) : '-'} | ${a.filter((r) => r.int).length} | ${(v.reduce((x, r) => x + r.yards, 0) / v.length).toFixed(1)} | ${ord}`);
}

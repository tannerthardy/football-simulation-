/** Gap runs (power/counter/trap): the DL lined up over a puller's snap spot (within 1.2 yd laterally, on the line).
 * Who is assigned to him at the snap (plan target), plan kind, when that blocker first engages him, the DL's depth
 * past the LOS (into the backfield) at 0.6/1.0/1.5 s, whether he contacts the carrier first. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1;
const rows: Record<string, number[]> = {}; const push = (k: string, v: number) => (rows[k] ??= []).push(v);
let n = 0, ex = 0;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? ''; if (!/^(power|counter|trap)$/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const dir = sim.attackDir('O');
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const dls = sim.defense.filter((d: any) => /^(DE|DT|NT)/.test(d.slot) && pullers.some((pu: any) => Math.abs(d.pos.y - pu.pos.y) < 1.2));
  if (!dls.length) continue;
  const assigned = new Map<any, any[]>();
  for (const d of dls) assigned.set(d, sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.target === d).map((o: any) => ({ slot: o.slot, kind: o.behavior.plan.kind })));
  const first = new Map<any, number>(), deep: Record<string, number> = {};
  while (sim.phase === 'live' && sim.t < 3) {
    sim.tick();
    for (const d of dls) {
      if (!first.has(d) && d.engagement) first.set(d, sim.t);
      for (const t of [0.6, 1.0, 1.5]) if (Math.abs(sim.t - t) < 1e-6) deep[`${d.idx}:${t}`] = (d.pos.x - sim.los) * -dir;
    }
  }
  const fc = sim.events.find((e: any) => e.type === 'carrier_contact');
  for (const d of dls) {
    n++;
    const as = assigned.get(d)!;
    const who = as.length ? as.map((o: any) => `${o.slot}:${o.kind}`).join('+') : 'nobody';
    const kinds = as.length ? as.map((o: any) => o.kind).sort().join('+') : 'nobody';
    add(`${sch} assigned: ${kinds}`);
    const t1 = first.get(d);
    const eng = d.engagement ?? null;
    push(`${sch} first engaged`, t1 ?? 9);
    for (const t of [0.6, 1.0, 1.5]) push(`${sch} depth into backfield ${t}`, deep[`${d.idx}:${t}`] ?? NaN);
    const hitFirst = fc && sim.agents[fc.a]?.team === 'D' ? fc.a === d.idx : fc && fc.b === d.idx;
    if (hitFirst) add(`${sch} this DL makes first carrier contact (assigned ${kinds})`);
    if ((deep[`${d.idx}:1.0`] ?? 0) > 1 && ex < 6) { ex++; console.log(`ex ${sch} ${d.slot} over ${pullers.map((x: any) => x.slot).join('/')} assigned ${who}, first engaged ${t1?.toFixed(2)}, depth 0.6/1.0/1.5 ${[0.6, 1, 1.5].map(t => (deep[`${d.idx}:${t}`] ?? NaN).toFixed(2)).join('/')}`); }
  }
}
const md = (a: number[]) => [...a].filter(x => !isNaN(x)).sort((x, y) => x - y)[a.length >> 1];
console.log(`DL over a puller's spot: ${n}`);
for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${v}  ${k}`);
for (const [k, v] of Object.entries(rows).sort()) console.log(`  ${k}: med ${md(v)?.toFixed(2)}, >1 yd ${(v.filter(x => x > 1).length / v.length).toFixed(2)}`);

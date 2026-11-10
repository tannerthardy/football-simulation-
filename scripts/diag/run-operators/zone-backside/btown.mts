// Uncovered backside tackle on a solo cutoff of a wide end: who owns the second-level man within 1.5 yd across of him (plan after tick 1).
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`); const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1;
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const sc = st.offCall?.run?.scheme;
  const con = sc === 'insideZone' ? 'IZ' : ['outsideZone', 'wideZone'].includes(sc) ? 'OZ' : null; if (!con) continue;
  const sim: any = new PlaySim(st); const dir = sim.attackDir('O'); sim.tick(); if (!sim.offCall.run) continue; const ps = playSideSign(sim, sim.offCall.run);
  const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)).sort((a: any, b: any) => (a.pos.y - b.pos.y) * ps);
  const bt = ol[0]; const dep = (d: any) => (d.pos.x - sim.los) * dir;
  if (sim.defense.some((d: any) => dep(d) < 1.6 && Math.abs(d.pos.y - bt.pos.y) <= 1.0)) continue;
  const pl = bt.behavior?.plan; if (pl?.kind !== "cutoff" || pl.combination || ((pl.target.pos.y - bt.pos.y) * ps) > -1.5) continue;
  const near = sim.defense.filter((d: any) => dep(d) > 1.6 && dep(d) <= 6.5 && Math.abs(d.pos.y - bt.pos.y) <= 1.5).sort((a: any, b: any) => Math.abs(a.pos.y - bt.pos.y) - Math.abs(b.pos.y - bt.pos.y))[0];
  if (!near) { inc(`${con} no man near`); continue; }
  const owners = sim.offense.filter((o: any) => { const q = o.behavior?.plan; return q && (q.target === near || q.climbTo === near || q.combination?.backer === near); })
    .map((o: any) => `${o === ol[1] ? 'BG' : o === ol[2] ? 'C' : o === ol[3] ? 'PG' : o === ol[4] ? 'PT' : o.slot}:${o.behavior.plan.kind}${o.behavior.plan.combination ? '+combo' : ''}`);
  const bg = ol[1], gq = bg.behavior?.plan; inc(`${con} BG ${gq?.kind}${gq?.combination ? (gq.combination.members.includes(ol[2]) ? "+combo-with-C" : gq.combination.members.includes(bt) ? "+combo-with-BT" : "+combo-other") : ""} target ${gq?.target ? gq.target.slot.replace(/_.*/, "") : "none"}`);
  inc(`${con} near ${near.slot.replace(/_.*/, '')} owned by ${owners.join(',') || 'nobody'}`); }
for (const k of Object.keys(C).sort()) console.log(k.padEnd(60), C[k]);

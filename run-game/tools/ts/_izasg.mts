// IZ saved snaps: snap assignment table + box: defenders in the box (within 6 yd of ball laterally, < 8 deep),
// each offensive blocker's plan (kind/target/climbTo), and which box LBs are nobody's target/climb/combo backer.
import { readFileSync } from 'node:fs';
const W = process.argv[2], scheme = process.argv[3] ?? 'insideZone';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1; let n = 0, shown = 0;
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== scheme) continue; n++;
    const sim: any = new PlaySim(st); const dir = sim.attackDir('O');
    const box = sim.defense.filter((d: any) => Math.abs(d.pos.y - sim.ballY) < 6 && (d.pos.x - sim.los) * dir < 8);
    const dl = box.filter((d: any) => (d.pos.x - sim.los) * dir < 1.6), lbs = box.filter((d: any) => (d.pos.x - sim.los) * dir >= 1.6 && /^LB/.test(d.slot));
    const blockers = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && Math.abs(a.pos.y - sim.ballY) < 7);
    const acc = new Set<any>(); for (const b of blockers) { const pl = b.behavior.plan; acc.add(pl.target); acc.add(pl.climbTo); acc.add(pl.combination?.backer); }
    const freeLB = lbs.filter((l: any) => !acc.has(l)), freeDL = dl.filter((d: any) => !acc.has(d));
    const key = `DL ${dl.length} LB ${lbs.length} vs ${blockers.filter((b: any) => !['X','Z','H'].includes(b.slot) || Math.abs(b.pos.y - sim.ballY) < 5).length} blockers -> free LB ${freeLB.length}`;
    inc(key);
    const combos = [...new Set(blockers.map((b: any) => b.behavior.plan.combination).filter(Boolean))];
    for (const c of combos as any[]) { const g = !c.backer ? 'none' : /^LB/.test(c.backer.slot) ? 'LB' : 'DB'; inc(`  combo backer ${g}` + (g !== 'LB' && freeLB.length ? ' while a box LB is free' : '')); }
    const dlBlk = dl.filter((d: any) => blockers.some((b: any) => b.behavior.plan.target === d && !b.behavior.plan.combination)).length;
    if (freeLB.length) inc(`  free LB: all ${dl.length} DL blocked solo-or-double (DL with a single blocker: ${dlBlk})`);
    if (freeLB.length && shown < 0) { shown++; console.log(`--- ${key} front ${st.defCall?.front?.id ?? '?'} formation ${st.offCall?.formation?.id}`);
      for (const b of blockers) { const pl = b.behavior.plan; console.log(`   ${b.slot.padEnd(3)} y${(b.pos.y - sim.ballY).toFixed(1).padStart(5)} ${pl.kind.padEnd(7)} ${pl.target?.slot ?? '-'} ${pl.climbTo ? '^' + pl.climbTo.slot : ''} ${pl.combination ? 'combo->' + pl.combination.backer?.slot : ''}`); }
      for (const d of box) console.log(`      D ${d.slot.padEnd(5)} y${(d.pos.y - sim.ballY).toFixed(1).padStart(5)} x${((d.pos.x - sim.los) * dir).toFixed(1)} ${acc.has(d) ? '' : 'FREE'}`); }
  }
}
console.log(n, 'plays'); for (const [k, v] of Object.entries(C).sort((a, b) => b[1] - a[1]).slice(0, 18)) console.log(String(v).padStart(4), k);

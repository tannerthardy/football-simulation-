// IZ/OZ: backside tackle with no front defender (<1.6 yd deep) within 1.0 yd laterally at the snap. His plan after the first tick
// (kind -> target group, lateral offset of target, combination), plan at 0.6 s, and whether he touches anyone (<=1.0 yd) by 2.0 s.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`); const { playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1;
const grp = (d: any) => !d ? 'none' : /^(DE|DT|NT)/.test(d.slot) ? 'DL' : /LB/.test(d.slot) ? 'LB' : 'DB';
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const sc = st.offCall?.run?.scheme;
  const con = sc === 'insideZone' ? 'IZ' : ['outsideZone', 'wideZone'].includes(sc) ? 'OZ' : null; if (!con) continue;
  const sim: any = new PlaySim(st); const dir = sim.attackDir('O'); sim.tick(); if (!sim.offCall.run) continue; const ps = playSideSign(sim, sim.offCall.run);
  const ol = sim.offense.filter((a: any) => ['LT','LG','C','RG','RT'].includes(a.slot)).sort((a: any, b: any) => (a.pos.y - b.pos.y) * ps);
  const bt = ol[0]; const front = sim.defense.filter((d: any) => (d.pos.x - sim.los) * dir < 1.6);
  if (front.some((d: any) => Math.abs(d.pos.y - bt.pos.y) <= 1.0)) continue;
  const desc = (pl: any) => { const t = pl?.target; const lat = t ? ((t.pos.y - bt.pos.y) * ps).toFixed(0) : ''; return `${pl?.kind}->${grp(t)}${t ? `(lat ${lat})` : ''}${pl?.combination && !pl.combination.released ? '+combo' : ''}${pl?.climbTo ? '+climbTo' : ''}`; };
  inc(`${con} n`); { const q = bt.behavior?.plan; const t = q?.target; bt.__p0 = q?.combination ? (q.kind === "combo" ? "helper" : "double-keeper") : q?.kind === "climb" ? "climb" : t && ((t.pos.y - bt.pos.y) * ps) < -1.5 ? "solo-wide-end" : "solo-other"; }
  let touched: any = null, p6 = '';
  while (sim.phase === 'live' && sim.t < 2.0) { sim.tick(); if (!p6 && sim.t >= .6) p6 = desc(bt.behavior?.plan);
    if (!touched) touched = sim.defense.find((d: any) => Math.hypot(d.pos.x - bt.pos.x, d.pos.y - bt.pos.y) <= 1.0); }
  const p0 = bt.__p0; inc(`${con} ${p0} -> ${touched ? grp(touched) : "nobody"}`); }
for (const k of Object.keys(C).sort()) console.log(k.padEnd(60), C[k]);

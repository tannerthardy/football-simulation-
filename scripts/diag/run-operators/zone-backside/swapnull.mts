// Zone plans after tick 1: doubles by climb target (backer / none), and play-side box LBs nobody owns, per concept.
import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`); PlaySim.recordedSingleStream = true;
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`); const B = await import(`${W}/src/sim/behaviors/blocking.ts`);
const C: Record<string, number> = {}; const inc = (k: string) => C[k] = (C[k] ?? 0) + 1;
for (let seed = 7; seed <= 29; seed += 2) for (const p of JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'))) {
  if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64')); const sc = st.offCall?.run?.scheme;
  const con = sc === 'insideZone' ? 'IZ' : ['outsideZone', 'wideZone'].includes(sc) ? 'OZ' : null; if (!con) continue;
  const sim: any = new PlaySim(st); sim.tick(); if (!sim.offCall.run) continue; const ps = B.playSideSign(sim, sim.offCall.run); const dir = sim.attackDir('O');
  const plans = sim.offense.map((o: any) => o.behavior?.plan).filter(Boolean); inc(`${con} n`);
  const combos = new Set(plans.map((q: any) => q.combination).filter((c: any) => c && !c.released));
  for (const c of combos as Set<any>) inc(`${con} double ${(c.defender.pos.y - sim.ballY) * ps >= 0 ? 'playside' : 'backside'} backer ${c.backer ? 'yes' : 'none'}`);
  const owned = new Set(plans.flatMap((q: any) => [q.target, q.climbTo, q.combination?.backer]));
  for (const d of sim.defense) { const dep = (d.pos.x - sim.los) * dir; if (dep < 1.6 || dep > 6.5 || Math.abs(d.pos.y - sim.ballY) > 5) continue;
    inc(`${con} box LB ${(d.pos.y - sim.ballY) * ps >= 0 ? 'playside' : 'backside'} ${owned.has(d) ? 'owned' : 'unowned'}`); } }
for (const k of Object.keys(C).sort()) console.log(k.padEnd(44), C[k]);

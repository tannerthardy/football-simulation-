import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker, playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const agg: Record<string, number> = {};
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'power') continue;
    const sim: any = new PlaySim(st); sim.tick();
    const ps = playSideSign(sim, sim.offCall.run), lat = (a: any) => (a.pos.y - sim.ballY) * ps;
    const g = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull' && a.behavior.plan.pullRole === 'kick');
    const e = g?.behavior.plan.target; if (!e) continue;
    const tes = sim.offense.filter((o: any) => sim.offAlign.spots[o.slot]?.inline && !/^(L|R)(T|G)$|^C$/.test(o.slot) && lat(o) > 0).sort((a: any, b: any) => lat(a) - lat(b));
    const te = tes[0]; if (!te) { agg['no playside inline TE'] = (agg['no playside inline TE'] ?? 0) + 1; continue; }
    const off = lat(e) - lat(te), b = off < -.75 ? 'inside' : off > .75 ? 'outside' : 'head-up';
    const pl = te.behavior?.plan; const tgt = pl?.target;
    const k = `${b}: TE ${pl?.kind}${pl?.pullRole ? '/' + pl.pullRole : ''} -> ${!tgt ? '-' : tgt === e ? 'EMLOS' : (tgt.pos.x - sim.los) * sim.attackDir('O') < 2 ? (lat(tgt) < lat(te) ? 'line inside' : 'line outside') : 'LB/DB'}`;
    agg[k] = (agg[k] ?? 0) + 1;
  }
}
for (const [k, v] of Object.entries(agg).sort()) console.log(String(v).padStart(4), k);

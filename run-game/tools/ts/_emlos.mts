import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunBlocker, playSideSign } = await import(`${W}/src/sim/behaviors/blocking.ts`);
const f = (v: number) => v.toFixed(1);
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (!['power', 'counter'].includes(st.offCall?.run?.scheme)) continue;
    const sim: any = new PlaySim(st); sim.tick();
    const ps = playSideSign(sim, sim.offCall.run), lat = (y: number) => (y - sim.ballY) * ps;
    const k = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.pullRole === 'kick');
    const t = k?.behavior.plan.target; if (!t || /^D[ET]|NT/.test(t.slot)) continue;
    const edge = lat(sim.offAlign.strongSign === ps ? sim.offAlign.coreEdge.S : sim.offAlign.coreEdge.W);
    const dls = sim.defense.filter((d: any) => /^D[ET]|NT/.test(d.slot)).map((d: any) => `${d.slot}@${f(lat(d.pos.y))}`).join(' ');
    const offs = sim.offense.filter((o: any) => lat(o.pos.y) > edge - .5).map((o: any) => `${o.slot}@${f(lat(o.pos.y))}`).join(' ');
    console.log(`${seed} ${sim.offCall.run.scheme} ${k.slot}->${t.slot} @lat ${f(lat(t.pos.y))} dep ${f(t.pos.x - sim.los)} | edge ${f(edge)} | DL ${dls} | off outside ${offs}`);
  }
}

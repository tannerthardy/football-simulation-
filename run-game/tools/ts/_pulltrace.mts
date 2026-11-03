import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { playSideSign, RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
let shown = 0; const f = (v: number) => v == null ? '  -  ' : v.toFixed(2);
for (let seed = 7; seed <= 29 && shown < 4; seed += 6) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (shown >= 4) break; if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'power') continue;
    const sim: any = new PlaySim(st); const ps = playSideSign(sim, sim.offCall.run), lat = (y: number) => (y - sim.ballY) * ps, dep = (x: number) => (x - sim.los) * sim.attackDir('O');
    shown++; console.log(`--- seed ${seed} ${sim.offCall.run.name ?? ''} ${st.formation ?? ''}`);
    let next = 0;
    while (sim.t < 2.6 && !sim.over) {
      sim.tick();
      if (sim.t + 1e-6 < next) continue; next += .2;
      const lead = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull' && (a.slot === 'LG' || a.slot === 'RG'));
      const kick = sim.offense.find((a: any) => a.behavior instanceof RunBlocker && a.behavior.plan.kind === 'pull' && a.behavior.plan.pullRole === 'kick');
      const rb = sim.ball?.carrier ?? sim.slot('RB');
      if (!lead) { console.log(` t=${f(sim.t)} no lead`); continue; }
      const b: any = lead.behavior, path = b.plan.pullPath?.map((w: any) => `(${f(dep(w.x))},${f(lat(w.y))})`).join(' ');
      console.log(` t=${f(sim.t)} ${lead.slot}/${b.plan.pullRole} (${f(dep(lead.pos.x))},${f(lat(lead.pos.y))}) v(${f(lead.vel.x*sim.attackDir('O'))},${f(lead.vel.y*ps)}) idx ${b.pullIdx} clr ${b.pullCleared ? 1 : 0} cx ${f(b.pullRead?.clearanceX != null ? dep(b.pullRead.clearanceX) : null)} tgt ${b.plan.target?.slot ?? '-'} eng ${lead.engagement?.defender.slot ?? '-'} path ${path} | kick ${kick ? `${kick.slot}(${f(dep(kick.pos.x))},${f(lat(kick.pos.y))})` : '-'} | car ${rb.slot}(${f(dep(rb.pos.x))},${f(lat(rb.pos.y))})`);
    }
  }
}

import { readFileSync } from 'node:fs';
const W = process.argv[2];
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { playSideSign, RunBlocker } = await import(`${W}/src/sim/behaviors/blocking.ts`);
let shown = 0; const f = (v: number) => v == null ? '  -  ' : v.toFixed(2);
const roles = { n: 0 } as any;
for (let seed = 7; seed <= 29; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== 'power') continue;
    const sim: any = new PlaySim(st); const ps = playSideSign(sim, sim.offCall.run), lat = (y: number) => (y - sim.ballY) * ps, dep = (x: number) => (x - sim.los) * sim.attackDir('O');
    sim.tick();
    const ob = sim.offense.filter((a: any) => a.behavior instanceof RunBlocker && (a.behavior.plan.kind === 'pull' || a.behavior.plan.kind === 'lead'));
    const sig = ob.map((a: any) => `${a.slot}:${a.behavior.plan.kind}/${a.behavior.plan.pullRole}->${a.behavior.plan.target?.slot ?? '-'}`).join(' ');
    roles[sig.replace(/->\S+/g, '')] = (roles[sig.replace(/->\S+/g, '')] ?? 0) + 1;
    if (!ob.some((a: any) => a.behavior.plan.kind === 'lead') || shown >= 6) continue;
    shown++; console.log(`--- seed ${seed} ${sig} form ${sim.formation?.name ?? st.formation ?? ''}`);
    let next = .2;
    while (sim.t < 2.9 && sim.phase === 'live') { sim.tick(); if (sim.t + 1e-6 < next) continue; next += .25;
      const car = sim.ball?.carrier ?? sim.slot('RB'); const lead = ob.find((a: any) => a.behavior.plan.kind === 'pull');
      const near = sim.defense.filter((d: any) => d !== lead.behavior.plan.target && Math.hypot(d.pos.x - lead.pos.x, d.pos.y - lead.pos.y) < 4).map((d: any) => `${d.slot}(${f(dep(d.pos.x))},${f(lat(d.pos.y))})${d.engagement ? '*' : ''}`).join(' ');
      console.log(` t=${f(sim.t)} car(${f(dep(car.pos.x))},${f(lat(car.pos.y))}) v${f(Math.hypot(lead.vel.x, lead.vel.y))} idx ${lead.behavior.pullIdx} ` + ob.map((a: any) => `${a.slot}/${a.behavior.plan.pullRole}(${f(dep(a.pos.x))},${f(lat(a.pos.y))}) tgt ${a.behavior.plan.target?.slot ?? a.behavior.target?.slot ?? '-'} eng ${a.engagement?.defender.slot ?? '-'}`).join(' | ')
        + ' | near ' + near);
    }
  }
}
console.log(roles);

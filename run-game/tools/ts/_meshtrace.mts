import { readFileSync } from 'node:fs';
const W = process.argv[2], want = process.argv[3] ?? 'insideZone', fam = process.argv[4] ?? 'gun_doubles_11';
const { PlaySim } = await import(`${W}/src/sim/playsim.ts`);
const { restoreSetup } = await import(`${W}/scripts/diag/saved-play.ts`);
const { RunnerToMesh } = await import(`${W}/src/sim/assign.ts`);
let done = 0;
for (let seed = 7; seed <= 29 && done < 2; seed += 2) {
  const snaps = JSON.parse(readFileSync(`${W}/out/matched-restage/seed${seed}-run.json`, 'utf8'));
  for (const p of snaps) { if (done >= 2 || p.pass) continue; const st: any = restoreSetup(Buffer.from(p.setup, 'base64'));
    if (st.offCall?.run?.scheme !== want || st.offCall?.formation?.id !== fam) continue; done++;
    const sim: any = new PlaySim(st); const rb = sim.slot('RB'), b: any = rb.behavior;
    console.log(`--- seed ${seed} meshTime ${b.meshTime} ride ${b.ride} mesh (${(b.mesh.x - sim.los).toFixed(2)},${(b.mesh.y - sim.ballY).toFixed(2)}) RB vmax ${rb.profile.vmax.toFixed(2)}`);
    const tick = sim.tick.bind(sim);
    sim.tick = () => { tick(); if (Math.abs(sim.t * 10 - Math.round(sim.t * 10)) > 1e-6 || sim.t > 1.5) return;
      const beh: any = rb.behavior; const isMesh = beh instanceof RunnerToMesh;
      const d = isMesh ? Math.hypot(beh.mesh.x - rb.pos.x, beh.mesh.y - rb.pos.y) : NaN;
      const req = sim.intents[rb.idx]?.vel ?? { x: 0, y: 0 };
      console.log(`t=${sim.t.toFixed(1)} ${beh.kind} departed=${isMesh ? Reflect.get(beh, 'departed') : '-'} d=${d.toFixed(2)} req ${Math.hypot(req.x, req.y).toFixed(2)} got ${Math.hypot(rb.vel.x, rb.vel.y).toFixed(2)} QB (${(sim.qb.pos.x - sim.los).toFixed(2)},${(sim.qb.pos.y - sim.ballY).toFixed(2)}) RB (${(rb.pos.x - sim.los).toFixed(2)},${(rb.pos.y - sim.ballY).toFixed(2)}) ball ${sim.ball.kind}`); };
    try { sim.run(); } catch {} }
}

/** Gun/pistol/under zone backs on run-only captures: per tick to the handoff, speed and the ride state. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunnerToMesh } = await import(root + '/src/sim/assign.ts');
const [seed, maxPlays, schemeRe] = [process.argv[2], Number(process.argv[3] ?? 3), new RegExp(process.argv[4] ?? 'insideZone')];
let shown = 0;
for (const [i, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass || shown >= maxPlays) continue;
  const gunOnly = process.argv[5] === "gun";
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!schemeRe.test(sim.offCall.run?.scheme ?? '')) continue;
  const rb = sim.slot('RB'); if (!(rb.behavior instanceof RunnerToMesh)) continue;
  const b: any = rb.behavior;
  if (gunOnly && (sim.qb.pos.x - sim.los) * sim.attackDir("O") > -4.5) continue;
  shown++;
  const qd = (sim.qb.pos.x - sim.los) * sim.attackDir('O');
  console.log(`#${i} ${sim.offCall.label} qb depth ${qd.toFixed(1)} meshTime ${b.meshTime} ride ${b.ride} mesh ${b.mesh.x.toFixed(1)},${b.mesh.y.toFixed(1)} rb ${rb.pos.x.toFixed(1)},${rb.pos.y.toFixed(1)} vmax ${rb.profile.vmax.toFixed(1)}`);
  while (sim.phase === 'live' && sim.t < 2.5 && rb.behavior === b) {
    const qb = sim.qb, d = Math.hypot(b.mesh.x - rb.pos.x, b.mesh.y - rb.pos.y), dq = Math.hypot(qb.pos.x - b.mesh.x, qb.pos.y - b.mesh.y);
    const iv = sim.intents?.[rb.idx]?.vel;
    if (Math.round(sim.t * 100) % 10 === 0) console.log(`  ${sim.t.toFixed(2)} spd ${Math.hypot(rb.vel.x, rb.vel.y).toFixed(2)} req ${iv ? Math.hypot(iv.x, iv.y).toFixed(2) : '-'} dMesh ${d.toFixed(2)} qbToMesh ${dq.toFixed(2)} departed ${b.departed} passed ${b.passed}`);
    sim.tick();
  }
  console.log(`  handoff ${sim.events.find((e: any) => e.type === 'handoff')?.t} speed then ${Math.hypot(rb.vel.x, rb.vel.y).toFixed(2)}`);
}

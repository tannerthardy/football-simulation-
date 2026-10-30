// From a worktree root: print the back's start, mesh, first-read preview and departure for the first few runs of a family.
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const fam = process.argv[2]; let n = 0;
for (const p of JSON.parse(readFileSync(root + '/out/matched-restage/seed7-run.json', 'utf8'))) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!new RegExp(fam).test(sim.offCall.run?.scheme ?? '')) continue;
  const rb = sim.slot('RB'), b: any = rb.behavior; if (!b?.mesh) continue;
  const start = { ...rb.pos }; let dep = null;
  while (sim.phase === 'live' && sim.t < 1.6) { sim.tick(); if (dep === null && b.departed) dep = sim.t; }
  const rel = (v: any) => `${(v.x - sim.los).toFixed(1)},${(v.y - sim.ballY).toFixed(1)}`;
  console.log(sim.offCall.formation.qb, sim.offCall.run.scheme, 'start', rel(start), 'mesh', rel(b.mesh), 'meshTime', b.meshTime, 'ride', b.ride, 'departed', dep?.toFixed(2), 'interval', rb.mind.decisionInterval.toFixed(2));
  if (++n >= 6) break;
}

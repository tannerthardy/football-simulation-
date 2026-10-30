import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
let reqs = new Map<any, any>();
(globalThis as any).__SPCLOG = (a: any, req: any, post: any) => reqs.set(a, { req: JSON.parse(JSON.stringify(req)), post: JSON.parse(JSON.stringify(post)) });
let shown = 0;
for (const seed of ['7', '9']) for (const [pi, p] of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]).entries()) {
  if (p.pass || shown >= 2) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (sim.offCall.run?.scheme !== 'counter') continue;
  shown++;
  const dir = sim.attackDir('O'); const ps = Math.sign(sim.offense.find((o: any) => o.behavior?.plan?.kind === 'pull')?.behavior.plan.drive.y ?? 1);
  const kick = sim.offense.find((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.pullRole === 'kick');
  console.log(`== s${seed}#${pi} kick ${kick.slot} los ${sim.los.toFixed(2)}`);
  while (sim.phase === 'live' && sim.t < 1.6) {
    reqs = new Map(); sim.tick();
    if (Math.round(sim.t * 20) % 2 || sim.t < .2) continue;
    const r = reqs.get(kick), b: any = kick.behavior, wp = b.plan.pullPath?.[b.pullIdx];
    const f = (v: any) => v ? `(${(-v.x * dir).toFixed(2)} deep, ${(v.y * ps).toFixed(2)} lat)` : '-';
    console.log(`${sim.t.toFixed(2)} depth ${((sim.los - kick.pos.x) * dir).toFixed(2)} wp ${wp ? ((sim.los - wp.x) * dir).toFixed(2) : '-'} req ${f(r?.req.vel)} speed? ${r?.req.speed ?? ''} post ${f(r?.post.vel)} body ${f(kick.vel)} facing ${(kick.facing * 180 / Math.PI).toFixed(0)} keys ${r ? Object.keys(r.req).join(',') : ''}`);
  }
}

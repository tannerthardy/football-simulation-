/** Counter/power pullers 0.3-1.8 s: depth (yd behind LOS, +), current waypoint depth, request vs post-spacing vs
 * achieved depth velocity (+ = deeper), pull path index, cleared flag. Aggregated by 0.3 s bucket. args: seeds */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker } = await import(root + '/src/sim/behaviors/blocking.ts');
const T: Record<string, number[]> = {}; const push = (k: string, v: number) => (T[k] ??= []).push(v);
let reqs = new Map<any, any>();
(globalThis as any).__SPCLOG = (a: any, req: any, post: any) => reqs.set(a, { req: { ...req }, post: { ...post } });
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme;
  if (!['counter', 'power'].includes(sch) || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  const dir = sim.attackDir('O');
  const pullers = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const role0 = new Map(pullers.map((o: any) => [o, o.behavior.plan.pullRole]));
  while (sim.phase === 'live' && sim.t < 1.85) {
    reqs = new Map(); sim.tick();
    if (sim.t < .3) continue;
    const tb = `${sch} ${(Math.floor(sim.t / .3) * .3).toFixed(1)}`;
    for (const o of pullers) {
      const b: any = o.behavior, pl = b?.plan; if (!pl || pl.kind !== 'pull') continue;
      const role = role0.get(o);
      const depth = (sim.los - o.pos.x) * dir;
      const wp = pl.pullPath?.[b.pullIdx];
      push(`${tb} ${role} depth`, depth);
      if (wp) push(`${tb} ${role} waypoint depth`, (sim.los - wp.x) * dir);
      const r = reqs.get(o);
      if (r) { push(`${tb} ${role} req deeper`, -r.req.x * dir); push(`${tb} ${role} post deeper`, -r.post.x * dir);
        push(`${tb} ${role} spacing changed`, Math.hypot(r.post.x - r.req.x, r.post.y - r.req.y) > .3 ? 1 : 0); }
      push(`${tb} ${role} achieved deeper`, -o.vel.x * dir);
      push(`${tb} ${role} path idx`, b.pullIdx ?? -1);
    }
  }
}
const m = (a?: number[]) => a && a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : '-';
const keys = [...new Set(Object.keys(T).map(k => k.split(' ').slice(0, 3).join(' ')))].sort();
for (const k of keys) console.log(`${k.padEnd(20)} depth ${m(T[k + ' depth'])} | waypoint ${m(T[k + ' waypoint depth'])} | deeper: req ${m(T[k + ' req deeper'])} post ${m(T[k + ' post deeper'])} achieved ${m(T[k + ' achieved deeper'])} | spacing changed ${m(T[k + ' spacing changed'])} | idx ${m(T[k + ' path idx'])}`);

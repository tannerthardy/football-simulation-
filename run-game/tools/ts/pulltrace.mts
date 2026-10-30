/** Power/counter pullers: installed hole (last waypoint y), role; time each waypoint index is reached; lateral
 * position relative to the installed hole (+ = beyond, toward the outside) and x relative to the LOS at 0.8/1.2/1.6/2.0 s;
 * when he first crosses the LOS and where; first engagement time and whom; events (pull_turn_up). */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker, playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const rows: Record<string, number[]> = {}; const push = (k: string, v: number) => (rows[k] ??= []).push(v);
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1;
let ex = 0;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? ''; if (!/^(power|counter)$/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('O');
  const ps0 = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  const W = ps0.map((a: any) => ({ a, role: a.behavior.plan.pullRole, hole: a.behavior.plan.pullPath.at(-1).y, wpT: [] as number[], cross: -1, crossRel: 0, eng: -1, engWho: '', lines: [] as string[] }));
  while (sim.phase === 'live' && sim.t < 3.0) {
    sim.tick();
    for (const w of W) {
      const b: any = w.a.behavior, idx = b.pullIdx ?? 0;
      while (w.wpT.length < idx) w.wpT.push(sim.t);
      const rel = (w.a.pos.y - w.hole) * ps, x = (w.a.pos.x - sim.los) * dir;
      if (w.cross < 0 && x > 0) { w.cross = sim.t; w.crossRel = rel; }
      if (w.eng < 0 && w.a.engagement) { w.eng = sim.t; w.engWho = w.a.engagement.defender.slot; }
      for (const t of [0.8, 1.2, 1.6, 2.0]) if (Math.abs(sim.t - t) < 1e-6) { push(`${sch} ${w.role} rel hole ${t}`, rel); push(`${sch} ${w.role} x ${t}`, x); }
      if (Math.round(sim.t * 100) % 10 === 0 && sim.t >= 1.5) w.lines.push(`${sim.t.toFixed(1)} idx ${idx} plan ${b.plan?.kind}/${b.plan?.pullRole ?? ""}->${b.plan?.target?.slot ?? "-"} rel ${rel.toFixed(2)} x ${x.toFixed(2)} v ${Math.hypot(w.a.vel.x, w.a.vel.y).toFixed(1)} cmd (${(sim.intents[w.a.idx].vel.x * dir).toFixed(1)},${(sim.intents[w.a.idx].vel.y * ps).toFixed(1)}) tgt@ ${b.plan?.target ? (((b.plan.target.pos.x - sim.los) * dir).toFixed(1) + ',' + ((b.plan.target.pos.y - w.hole) * ps).toFixed(1) + (b.plan.target.engagement ? ' blocked by ' + b.plan.target.engagement.blocker.slot : ' free') + ' d ' + Math.hypot(b.plan.target.pos.x - w.a.pos.x, b.plan.target.pos.y - w.a.pos.y).toFixed(1)) : '-'} | carrier ${sim.carrier ? (((sim.carrier.pos.x - sim.los) * dir).toFixed(1) + ',' + ((sim.carrier.pos.y - w.hole) * ps).toFixed(1)) : '-'}${w.a.engagement ? ' ENG ' + w.a.engagement.defender.slot : ''}`);
    }
  }
  for (const w of W) {
    const k = `${sch} ${w.role}`;
    add(`${k} n`);
    for (let i = 0; i < 3; i++) push(`${k} reaches wp${i + 1}`, w.wpT[i] ?? 9);
    push(`${k} crosses LOS`, w.cross < 0 ? 9 : w.cross); if (w.cross >= 0) push(`${k} rel hole at crossing`, w.crossRel);
    push(`${k} first engaged`, w.eng < 0 ? 9 : w.eng);
    if (sim.events.some((e: any) => e.type === 'pull_turn_up' && e.a === w.a.idx)) add(`${k} turn-up event (kick man behind runner)`);
    if (w.a.tags.has('wrap-log')) add(`${k} wrap-log`);
    if (ex < 4 && w.role === "lead" && w.eng < 0) { ex++; console.log(`ex ${sch} ${w.a.slot} lead, hole y-rel 0, waypoints at ${w.wpT.map(t => t.toFixed(2)).join('/')}, engaged ${w.eng.toFixed(2)} ${w.engWho}`); console.log(w.lines.join('\n')); }
  }
}
const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k}: ${v}`);
for (const [k, v] of Object.entries(rows).sort()) console.log(`  ${k}: med ${md(v).toFixed(2)}${v.some(x => x === 9) ? `, never ${(v.filter(x => x === 9).length / v.length).toFixed(2)}` : ''}`);

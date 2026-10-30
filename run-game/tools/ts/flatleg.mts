/** Power/counter pullers on the flat leg (pullIdx 1, not engaged), 0.6-2.4 s: requested lateral speed toward the hole
 * and requested depth velocity (+ = toward the LOS), achieved lateral, |v| achieved, distance to wp1, and whether
 * a teammate OL is within 1.2 yd in front of him (the near-wall rule) or the observed-corner clearance applies. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker, playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const rows: Record<string, number[]> = {}; const push = (k: string, v: number) => (rows[k] ??= []).push(v);
const tally: Record<string, number> = {}; const add = (k: string) => tally[k] = (tally[k] ?? 0) + 1; let ticks = 0;
for (const seed of process.argv.slice(2)) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const sch = sim.offCall.run?.scheme ?? ''; if (!/^(power|counter)$/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const ps = playSideSign(sim, sim.offCall.run), dir = sim.attackDir('O');
  const P = sim.offense.filter((o: any) => o.behavior instanceof RunBlocker && o.behavior.plan.kind === 'pull');
  while (sim.phase === 'live' && sim.t < 2.4) {
    sim.tick();
    if (sim.t < .6) continue;
    for (const a of P) {
      const b: any = a.behavior; if (!b.plan || b.plan.kind !== 'pull' || b.pullIdx !== 1 || a.engagement) continue;
      ticks++;
      const role = b.plan.pullRole, wp = b.plan.pullPath[1], I = sim.intents[a.idx].vel;
      push(`${role} req lateral`, I.y * ps); push(`${role} req toward LOS`, I.x * dir); push(`${role} ach lateral`, a.vel.y * ps);
      push(`${role} |v|`, Math.hypot(a.vel.x, a.vel.y)); push(`${role} |req|`, Math.hypot(I.x, I.y)); push(`${role} dist to wp1`, Math.hypot(wp.x - a.pos.x, wp.y - a.pos.y));
      push(`${role} depth behind LOS`, (sim.los - a.pos.x) * dir);
      const wall = sim.offense.some((o: any) => o !== a && ['LT', 'LG', 'C', 'RG', 'RT', 'Y'].includes(o.slot) && Math.hypot(o.pos.x - a.pos.x, o.pos.y - a.pos.y) < 1.2 && (o.pos.x - a.pos.x) * dir > 0);
      add(`${role} ${wall ? 'teammate within 1.2 in front (near-wall)' : 'clear'} | req toward LOS ${I.x * dir < -.3 ? 'away (deepening)' : I.x * dir > .3 ? 'toward' : 'level'}`);
    }
  }
}
const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(`flat-leg ticks ${ticks}`);
for (const [k, v] of Object.entries(rows).sort()) console.log(`  ${k}: med ${md(v).toFixed(2)}`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${(100 * v / ticks).toFixed(0)}%  ${k}`);

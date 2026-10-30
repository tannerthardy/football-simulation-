/** Joined zone doubles (both members engaged with the doubled DL), per tick before release: each body's requested and
 * achieved lateral velocity, signed to the play side (+ = toward the play), and agreement. */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
const { RunBlocker, playSideSign } = await import(root + '/src/sim/behaviors/blocking.ts');
const fam = process.argv[2], seeds = process.argv.slice(3);
const rows: Record<string, number[][]> = {}; let ticks = 0; const agree: Record<string, number> = {};
const push = (k: string, v: number[]) => (rows[k] ??= []).push(v);
for (const seed of seeds) for (const p of JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[]) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  const run = sim.offCall.run, sch = run?.scheme ?? '';
  if (fam === 'OZ' ? !/outsideZone|wideZone/.test(sch) : !/insideZone|splitZone/.test(sch)) continue;
  if (sim.snapAssessment && !sim.snapAssessment.snapPermitted) continue;
  const side = playSideSign(sim, run);
  while (sim.phase === 'live' && sim.t < 2.5) {
    sim.tick();
    const seen = new Set<any>();
    for (const o of sim.offense) {
      const b: any = o.behavior;
      if (!(b instanceof RunBlocker) || !b.plan.combination) continue;
      const cb = b.plan.combination; if (seen.has(cb) || cb.released) continue; seen.add(cb);
      const e = cb.defender.engagement;
      if (!e || !cb.members.every((m: any) => m.engagement === e)) continue;
      ticks++;
      const [owner, helper] = cb.members, d = cb.defender;
      const req = (a: any) => sim.intents[a.idx].vel.y * side, ach = (a: any) => a.vel.y * side;
      const mag = (a: any) => Math.hypot(sim.intents[a.idx].vel.x, sim.intents[a.idx].vel.y), spd = (a: any) => Math.hypot(a.vel.x, a.vel.y);
      const all = req(owner) > .5 && req(helper) > .5 && req(d) > .5;
      for (const [nm, a] of [['owner', owner], ['helper', helper], ['DL', d]] as const) { push('|v| ' + nm, [mag(a), spd(a)]); if (all) push('agree ' + nm, [req(a), ach(a)]); }
      push('owner (covered)', [req(owner), ach(owner)]); push('helper (uncovered)', [req(helper), ach(helper)]); push('doubled DL', [req(d), ach(d)]);
      const s = (v: number) => v > .5 ? '+' : v < -.5 ? '-' : '0';
      const k = `owner ${s(req(owner))} helper ${s(req(helper))} DL ${s(req(d))}`; agree[k] = (agree[k] ?? 0) + 1;
    }
  }
}
const md = (a: number[]) => [...a].sort((x, y) => x - y)[a.length >> 1];
console.log(`${fam}: joined double ticks ${ticks} (lateral, + = play side; request / achieved median, share requesting > +0.5)`);
for (const [k, v] of Object.entries(rows)) console.log(`  ${k}: ${md(v.map(x => x[0])).toFixed(2)} / ${md(v.map(x => x[1])).toFixed(2)} yd/s | toward play ${(v.filter(x => x[0] > .5).length / v.length).toFixed(2)} | away ${(v.filter(x => x[0] < -.5).length / v.length).toFixed(2)}`);
for (const [k, v] of Object.entries(agree).sort((a, b) => b[1] - a[1]).slice(0, 8)) console.log(`  ${(100 * v / ticks).toFixed(0)}%  ${k}`);

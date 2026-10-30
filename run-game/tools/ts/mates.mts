/** Run plays, snap to 4 s: ticks with a body contact between teammates (World contacts), split offense/defense,
 * per play; and contact impulse proxy (relative closing speed at contact). args: seeds... */
import { readFileSync } from 'node:fs';
const root = process.cwd();
const { PlaySim } = await import(root + '/src/sim/playsim.ts');
const { restoreSetup } = await import(root + '/scripts/diag/saved-play.ts');
let plays = 0, oo = 0, dd = 0, ooHard = 0, ddHard = 0, ooPlays = 0;
for (const seed of process.argv.slice(2)) for (const p of (JSON.parse(readFileSync(`out/matched-restage/seed${seed}-run.json`, 'utf8')) as any[])) {
  if (p.pass) continue;
  const sim: any = new PlaySim(restoreSetup(Buffer.from(p.setup, 'base64')));
  if (!sim.offCall.run || (sim.snapAssessment && !sim.snapAssessment.snapPermitted)) continue;
  plays++; let any = false;
  while (sim.phase === 'live' && sim.t < 4) {
    sim.tick();
    for (const c of sim.lastStep?.contacts ?? []) {
      const a = sim.agents[c.i], b = sim.agents[c.j]; if (!a || !b || a.team !== b.team) continue;
      const nx = b.pos.x - a.pos.x, ny = b.pos.y - a.pos.y, n = Math.hypot(nx, ny) || 1;
      const closing = ((a.vel.x - b.vel.x) * nx + (a.vel.y - b.vel.y) * ny) / n;
      if (a.team === 'O') { oo++; any = true; if (closing > 1.5) ooHard++; } else { dd++; if (closing > 1.5) ddHard++; }
    }
  }
  if (any) ooPlays++;
}
console.log(`plays ${plays} | O-O contact ticks/play ${(oo / plays).toFixed(1)} (closing >1.5 yd/s ${(ooHard / plays).toFixed(2)}) plays with any ${(ooPlays / plays).toFixed(2)} | D-D contact ticks/play ${(dd / plays).toFixed(1)} (closing >1.5 ${(ddHard / plays).toFixed(2)})`);
